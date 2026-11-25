import mongoose from 'mongoose';
import User from '../models/User.js';
import Trainer from '../models/Trainer.js';
import Attendance from '../models/Attendance.js';
import AppSetting from '../models/AppSetting.js';
import LeaveRequest from '../models/LeaveRequest.js';
import { zonedParts, addDays, weekdayOf } from '../utils/trainerAvailability.js';
import { registerPayrollRoutes, payrollAccess } from './payroll.js';

// ============================================================================
// ATTENDANCE & LEAVE — one desk for every employee (Trainers, HR, Marketing,
// CCCP, Admin, Leadership).
//   Attendance: the login / logout attendance already recorded for every staff
//               login (Attendance collection) — today board, log, monthly register.
//   Leave:      LeaveRequest for all non-trainer staff (apply → reporting head →
//               HR). Trainers keep their existing leave flow (Trainer.leaves);
//               it is shown here read-only.
// Visibility: Admin / Leadership / HR heads → everyone; other heads → their own
// department; everyone else → only their own leave (My Leave).
// ============================================================================

const POLICY_KEY = 'leave_policy';
export const DEFAULT_POLICY = {
  types: [
    { code: 'CL', name: 'Casual Leave', perYear: 12 },
    { code: 'SL', name: 'Sick Leave', perYear: 6 },
    { code: 'LOP', name: 'Loss of Pay', perYear: null }
  ],
  allowHalfDay: true,
  weeklyOff: ['Sun'],
  holidays: [], // [{ date: 'YYYY-MM-DD', name }]
  officeStartMin: 9 * 60 + 30,
  graceMin: 15,
  halfDayMinutes: 240
};

const HEAD_RX = /head|manager|\blead\b|team lead|\btl\b|chief|director|supervisor/i;
const ORG_RX = /admin|founder|ceo|director|super/i;
const norm = (s = '') => String(s || '').trim().toLowerCase();
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
const httpErr = (status, message) => Object.assign(new Error(message), { status });
const fail = (res, e) => res.status(e.status || 500).json({ error: e.message });
const branchKey = (b) => norm(b).replace(/[^a-z0-9]/g, '');

// Department from the staff record (department field first, role as fallback)
export function deptOf(u = {}) {
  const d = norm(u.department), r = norm(u.role);
  if (/student|scholar/.test(d)) return 'student';
  if (/admin|management|mis/.test(d)) return 'admin';
  if (/leadership|operations/.test(d)) return 'leadership';
  if (/\bhr\b|human|counsel|admission/.test(d) || d === 'hr') return 'hr';
  if (/training|trainer|faculty/.test(d)) return 'training';
  if (/cccp|placement/.test(d)) return 'cccp';
  if (/market|growth/.test(d)) return 'marketing';
  if (/wiseapp/.test(d)) return 'wiseapp';
  if (/admin/.test(r)) return 'admin';
  if (/trainer|faculty/.test(r)) return 'training';
  if (/\bhr\b|counsel|advisor/.test(r)) return 'hr';
  if (/placement|cccp/.test(r)) return 'cccp';
  if (/market/.test(r)) return 'marketing';
  return d || 'other';
}
export const DEPT_LABEL = { hr: 'HR & Admissions', training: 'Training', cccp: 'CCCP', marketing: 'Marketing', admin: 'Admin', leadership: 'Leadership', wiseapp: 'WiseApp', other: 'Other' };

const isOrg = (u = {}) => ['admin', 'leadership'].includes(deptOf(u)) || ORG_RX.test(u.role || '');
const isHead = (u = {}) => HEAD_RX.test(u.role || '');
// Final (HR) approval: HR Department Head / Business Lead / HR Manager, Admin, Leadership.
// HR Branch Heads and HR TLs approve the first (reporting-head) step only.
const HR_FINAL_RX = /dept\.? head|department head|hr head|head of hr|hr manager|business lead|\bhr admin\b/i;
export const isHrApprover = (u = {}) => isOrg(u) || (deptOf(u) === 'hr' && HR_FINAL_RX.test(u.role || ''));
// all | department | self
export function viewScope(u = {}) {
  if (isOrg(u) || isHrApprover(u)) return 'all';
  if (isHead(u)) return 'department';
  return 'self';
}
function canHeadApprove(approver, leave) {
  if (isOrg(approver)) return true;
  if (!isHead(approver) || deptOf(approver) !== leave.department) return false;
  if (norm(approver.email) === norm(leave.email)) return false;
  const sameBranch = !leave.branch || !approver.branch || branchKey(approver.branch) === branchKey(leave.branch);
  return sameBranch || /department head|dept head|head of|manager|director/i.test(approver.role || '');
}

async function loadPolicy() {
  const doc = await AppSetting.findOne({ key: POLICY_KEY }).lean();
  const v = doc?.value || {};
  return { ...DEFAULT_POLICY, ...v, types: Array.isArray(v.types) && v.types.length ? v.types : DEFAULT_POLICY.types };
}

// Working days in a leave (week-offs and holidays don't count)
export function leaveDays(policy, from, to, halfDay = '') {
  if (!isDate(from) || !isDate(to) || to < from) return 0;
  if (halfDay && from === to) return 0.5;
  const hol = new Set((policy.holidays || []).map((h) => h.date));
  let n = 0;
  for (let d = from, i = 0; d <= to && i < 400; d = addDays(d, 1), i++) {
    if ((policy.weeklyOff || []).includes(weekdayOf(d)) || hol.has(d)) continue;
    n += 1;
  }
  return n;
}

const minutesOf = (date) => (date ? zonedParts(new Date(date)).min : null);
function attMinutes(a) {
  if (!a) return 0;
  if (a.workingMinutes) return a.workingMinutes;
  if (a.hoursWorked) return Math.round(a.hoursWorked * 60);
  const s = a.loginTime || a.workStartTime, e = a.logoutTime || a.workEndTime;
  return s && e ? Math.max(0, Math.round((new Date(e) - new Date(s)) / 60000) - (a.breakMinutes || 0)) : 0;
}

export function registerStaffDeskRoutes(router, { pushNotification }) {
  const notify = (p) => Promise.resolve().then(() => pushNotification(p)).catch(() => {});

  async function me(req) {
    const u = req.user || {};
    let rec = null;
    if (u.id && mongoose.isValidObjectId(u.id)) rec = await User.findById(u.id).select('name email role department branch').lean();
    if (!rec && u.email) rec = await User.findOne({ email: norm(u.email) }).select('name email role department branch').lean();
    const base = { name: u.name || rec?.name || '', email: norm(u.email || rec?.email), role: u.role || rec?.role || '', department: u.department || rec?.department || '', branch: u.branch || rec?.branch || '', id: String(u.id || rec?._id || '') };
    if (!base.email) throw httpErr(400, 'Your login has no email, so attendance and leave cannot be matched to you.');
    return { ...base, dept: deptOf(base) };
  }

  // Active staff (not students), limited to what the viewer may see
  async function employeesFor(viewer) {
    const users = (await User.find().select('name email role department branch status').lean())
      .filter((u) => u.email && deptOf(u) !== 'student' && !/inactive|disabled|left|resigned/i.test(u.status || ''));
    const scope = viewScope(viewer);
    const list = scope === 'all' ? users : scope === 'department' ? users.filter((u) => deptOf(u) === viewer.dept) : users.filter((u) => norm(u.email) === viewer.email);
    return list.map((u) => ({ email: norm(u.email), name: u.name, role: u.role || '', dept: deptOf(u), branch: u.branch || '', id: String(u._id) }))
      .sort((a, b) => a.dept.localeCompare(b.dept) || a.name.localeCompare(b.name));
  }

  // Everything needed to work out each person's day(s)
  async function dayContext(employees, from, to) {
    const emails = employees.map((e) => e.email);
    const names = employees.map((e) => norm(e.name));
    const [policy, att, leaves, trainers] = await Promise.all([
      loadPolicy(),
      Attendance.find({ date: { $gte: from, $lte: to } }).lean(),
      LeaveRequest.find({ email: { $in: emails }, status: { $in: ['approved', 'pending_head', 'pending_hr'] }, from: { $lte: to }, to: { $gte: from } }).lean(),
      Trainer.find({ email: { $in: emails } }).select('email trainerName leaves shiftStartMin shiftEndMin').lean()
    ]);
    const attBy = new Map();
    for (const a of att) {
      const key = a.userEmail && emails.includes(norm(a.userEmail)) ? norm(a.userEmail) : names.includes(norm(a.employeeName)) ? `name:${norm(a.employeeName)}` : null;
      if (key) attBy.set(`${key}|${a.date}`, a);
    }
    return { policy, attBy, leaves, trainerBy: new Map(trainers.map((t) => [norm(t.email), t])), holidays: new Map((policy.holidays || []).map((h) => [h.date, h.name])) };
  }

  function dayStatus(emp, date, ctx, now = zonedParts()) {
    const { policy } = ctx;
    const a = ctx.attBy.get(`${emp.email}|${date}`) || ctx.attBy.get(`name:${norm(emp.name)}|${date}`) || null;
    const tr = ctx.trainerBy.get(emp.email);
    const lr = ctx.leaves.find((l) => l.email === emp.email && l.status === 'approved' && l.from <= date && l.to >= date);
    const tl = tr && (tr.leaves || []).find((l) => l.status !== 'rejected' && l.status !== 'pending' && l.from && date >= l.from && date <= (l.to || l.from));
    const pending = ctx.leaves.find((l) => l.email === emp.email && l.status !== 'approved' && l.from <= date && l.to >= date);
    const login = a ? (a.loginTime || a.workStartTime) : null;
    const logout = a ? (a.logoutTime || a.workEndTime) : null;
    const loginMin = minutesOf(login);
    const startMin = tr && Number(tr.shiftStartMin) > 0 ? tr.shiftStartMin : policy.officeStartMin;
    const late = loginMin !== null && loginMin > startMin + (policy.graceMin || 0);
    const mins = attMinutes(a);
    const out = {
      date, login, logout, loginMin, logoutMin: minutesOf(logout), minutes: mins, late, lateBy: late ? loginMin - startMin : 0,
      loginAddress: a?.loginAddress || a?.loginLocation?.address || '', loginMap: a?.loginLocation?.mapsUrl || '',
      logoutAddress: a?.logoutAddress || a?.logoutLocation?.address || '', breakMinutes: a?.breakMinutes || 0,
      leaveType: lr?.leaveType || (tl ? 'Trainer leave' : ''), pendingLeave: pending ? pending.leaveType : ''
    };
    const working = Boolean(login && !logout);
    if (lr && !lr.halfDay) return { ...out, code: 'L', label: `${lr.leaveType} leave` };
    if (tl) return { ...out, code: 'L', label: 'Leave (trainer)' };
    if (ctx.holidays.has(date) && !login) return { ...out, code: 'H', label: ctx.holidays.get(date) || 'Holiday' };
    if ((policy.weeklyOff || []).includes(weekdayOf(date)) && !login) return { ...out, code: 'WO', label: 'Week off' };
    if (login) {
      if (lr && lr.halfDay) return { ...out, code: 'HL', label: `Half-day ${lr.leaveType}`, working };
      if (!working && mins > 0 && mins < (policy.halfDayMinutes || 240)) return { ...out, code: 'HD', label: 'Half day', working };
      return { ...out, code: 'P', label: working ? 'Working' : 'Present', working };
    }
    if (lr && lr.halfDay) return { ...out, code: 'HL', label: `Half-day ${lr.leaveType}` };
    if (date > now.date) return { ...out, code: '', label: '' };
    if (date === now.date && now.min < startMin + (policy.graceMin || 0)) return { ...out, code: 'NY', label: 'Not yet in' };
    return { ...out, code: 'A', label: 'Absent' };
  }

  // ---- who am I / what may I see ----
  router.get('/staff-desk/me', async (req, res) => {
    try {
      const m = await me(req);
      const policy = await loadPolicy();
      res.json({ me: m, scope: viewScope(m), canOpenDesk: viewScope(m) !== 'self', isHrApprover: isHrApprover(m), canEditPolicy: isHrApprover(m), usesTrainerLeave: m.dept === 'training', policy, deptLabels: DEPT_LABEL, payroll: payrollAccess(m) });
    } catch (e) { fail(res, e); }
  });

  router.get('/staff-desk/policy', async (req, res) => {
    try { res.json(await loadPolicy()); } catch (e) { fail(res, e); }
  });

  router.put('/staff-desk/policy', async (req, res) => {
    try {
      const m = await me(req);
      if (!isHrApprover(m)) throw httpErr(403, 'Only HR heads, Admin or Leadership can change the leave policy.');
      const b = req.body || {};
      const types = (Array.isArray(b.types) ? b.types : []).map((t) => ({
        code: String(t.code || '').trim().toUpperCase().slice(0, 6), name: String(t.name || '').trim().slice(0, 40),
        perYear: t.perYear === null || t.perYear === '' || t.perYear === undefined ? null : Math.max(0, Math.min(365, Number(t.perYear) || 0))
      })).filter((t) => t.code && t.name);
      if (!types.length) throw httpErr(400, 'Add at least one leave type');
      const value = {
        types,
        allowHalfDay: b.allowHalfDay !== false,
        weeklyOff: (Array.isArray(b.weeklyOff) ? b.weeklyOff : []).filter((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].includes(d)),
        holidays: (Array.isArray(b.holidays) ? b.holidays : []).filter((h) => isDate(h?.date)).map((h) => ({ date: h.date, name: String(h.name || 'Holiday').slice(0, 60) })).sort((x, y) => (x.date < y.date ? -1 : 1)),
        officeStartMin: Math.max(0, Math.min(1439, Number(b.officeStartMin) || DEFAULT_POLICY.officeStartMin)),
        graceMin: Math.max(0, Math.min(180, Number(b.graceMin) || 0)),
        halfDayMinutes: Math.max(30, Math.min(720, Number(b.halfDayMinutes) || DEFAULT_POLICY.halfDayMinutes))
      };
      await AppSetting.findOneAndUpdate({ key: POLICY_KEY }, { $set: { value, updatedBy: m.name } }, { upsert: true });
      res.json(value);
    } catch (e) { fail(res, e); }
  });

  // ---- attendance ----
  router.get('/staff-desk/day', async (req, res) => {
    try {
      const m = await me(req);
      const date = isDate(req.query.date) ? req.query.date : zonedParts().date;
      const employees = await employeesFor(m);
      const ctx = await dayContext(employees, date, date);
      const rows = employees.map((e) => ({ ...e, deptLabel: DEPT_LABEL[e.dept] || e.dept, ...dayStatus(e, date, ctx) }));
      res.json({ date, scope: viewScope(m), rows });
    } catch (e) { fail(res, e); }
  });

  router.get('/staff-desk/log', async (req, res) => {
    try {
      const m = await me(req);
      const today = zonedParts().date;
      let from = isDate(req.query.from) ? req.query.from : addDays(today, -6);
      let to = isDate(req.query.to) ? req.query.to : today;
      if (to < from) [from, to] = [to, from];
      if ((new Date(to) - new Date(from)) / 864e5 > 62) from = addDays(to, -62);
      let employees = await employeesFor(m);
      if (req.query.email) employees = employees.filter((e) => e.email === norm(req.query.email));
      const ctx = await dayContext(employees, from, to);
      const rows = [];
      for (let d = to; d >= from; d = addDays(d, -1)) {
        for (const e of employees) {
          const s = dayStatus(e, d, ctx);
          if (s.login || ['L', 'HL', 'A'].includes(s.code)) rows.push({ ...e, deptLabel: DEPT_LABEL[e.dept] || e.dept, ...s });
        }
      }
      res.json({ from, to, rows: rows.slice(0, 3000) });
    } catch (e) { fail(res, e); }
  });

  router.get('/staff-desk/register', async (req, res) => {
    try {
      const m = await me(req);
      const month = /^\d{4}-\d{2}$/.test(String(req.query.month || '')) ? req.query.month : zonedParts().date.slice(0, 7);
      const from = `${month}-01`;
      const [y, mo] = month.split('-').map(Number);
      const to = `${month}-${String(new Date(Date.UTC(y, mo, 0)).getUTCDate()).padStart(2, '0')}`;
      const employees = await employeesFor(m);
      const ctx = await dayContext(employees, from, to);
      const dates = [];
      for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d);
      const now = zonedParts();
      const rows = employees.map((e) => {
        const days = dates.map((d) => { const s = dayStatus(e, d, ctx, now); return { code: s.code, late: s.late, label: s.label }; });
        const t = { P: 0, HD: 0, HL: 0, L: 0, A: 0, late: 0 };
        days.forEach((x) => { if (t[x.code] !== undefined) t[x.code] += 1; if (x.late) t.late += 1; });
        return { ...e, deptLabel: DEPT_LABEL[e.dept] || e.dept, days, totals: { ...t, present: t.P + t.HD * 0.5 + t.HL * 0.5, leave: t.L + t.HL * 0.5 } };
      });
      res.json({ month, dates, rows, holidays: ctx.policy.holidays.filter((h) => h.date >= from && h.date <= to), weeklyOff: ctx.policy.weeklyOff });
    } catch (e) { fail(res, e); }
  });

  // ---- leave ----
  const leaveView = (l) => ({
    id: String(l._id), email: l.email, employeeName: l.employeeName, department: l.department, deptLabel: DEPT_LABEL[l.department] || l.department,
    role: l.role, branch: l.branch, leaveType: l.leaveType, from: l.from, to: l.to, halfDay: l.halfDay, days: l.days, reason: l.reason,
    status: l.status, headDecision: l.headDecision, hrDecision: l.hrDecision, createdAt: l.createdAt
  });

  async function balancesFor(emails, year, policy) {
    const list = await LeaveRequest.find({ email: { $in: emails }, status: { $in: ['approved', 'pending_head', 'pending_hr'] }, from: { $gte: `${year}-01-01`, $lte: `${year}-12-31` } }).lean();
    const out = {};
    for (const e of emails) out[e] = Object.fromEntries(policy.types.map((t) => [t.code, { name: t.name, perYear: t.perYear, used: 0, pending: 0, remaining: t.perYear }]));
    for (const l of list) {
      const b = out[l.email]?.[l.leaveType];
      if (!b) continue;
      if (l.status === 'approved') b.used += l.days; else b.pending += l.days;
    }
    for (const e of emails) for (const b of Object.values(out[e])) if (b.perYear !== null && b.perYear !== undefined) b.remaining = Math.max(0, b.perYear - b.used - b.pending);
    return out;
  }

  router.get('/staff-desk/balances', async (req, res) => {
    try {
      const m = await me(req);
      const year = /^\d{4}$/.test(String(req.query.year || '')) ? req.query.year : zonedParts().date.slice(0, 4);
      const policy = await loadPolicy();
      const employees = req.query.mine ? [{ email: m.email, name: m.name, dept: m.dept, role: m.role, branch: m.branch }] : await employeesFor(m);
      const bal = await balancesFor(employees.map((e) => e.email), year, policy);
      res.json({ year, types: policy.types, rows: employees.map((e) => ({ ...e, deptLabel: DEPT_LABEL[e.dept] || e.dept, balance: bal[e.email] })) });
    } catch (e) { fail(res, e); }
  });

  router.get('/staff-desk/leaves', async (req, res) => {
    try {
      const m = await me(req);
      const view = String(req.query.view || 'mine');
      let list;
      if (view === 'mine') {
        list = await LeaveRequest.find({ email: m.email }).sort({ from: -1 }).limit(200).lean();
      } else {
        const scope = viewScope(m);
        const q = {};
        if (scope === 'department') q.department = m.dept;
        if (scope === 'self') q.email = m.email;
        if (view === 'approvals') q.status = { $in: ['pending_head', 'pending_hr'] };
        else if (req.query.status) q.status = String(req.query.status);
        list = await LeaveRequest.find(q).sort({ createdAt: -1 }).limit(500).lean();
        if (view === 'approvals') {
          list = list.filter((l) => norm(l.email) !== m.email && (
            (l.status === 'pending_head' && canHeadApprove(m, l)) || (l.status === 'pending_hr' && isHrApprover(m))
          ));
        }
      }
      // Trainers' leave (their own flow) shown alongside, read-only
      let trainerLeaves = [];
      if (view === 'all' && viewScope(m) !== 'self' && (viewScope(m) === 'all' || m.dept === 'training')) {
        const ts = await Trainer.find({ 'leaves.0': { $exists: true } }).select('trainerName email branchName leaves').lean();
        trainerLeaves = ts.flatMap((t) => (t.leaves || []).map((l) => ({
          id: `t-${t.email}-${l.from}`, employeeName: t.trainerName, email: t.email || '', department: 'training', deptLabel: 'Training',
          branch: t.branchName || '', leaveType: 'Trainer leave', from: l.from, to: l.to || l.from, days: null, reason: l.reason || '',
          status: l.status === 'rejected' ? 'rejected' : l.status === 'pending' ? 'pending_head' : 'approved', trainerFlow: true,
          headDecision: l.decidedBy ? { by: l.decidedBy, at: l.decidedAt, note: l.decisionNote } : null, createdAt: l.createdAt
        }))).sort((a, b) => (a.from < b.from ? 1 : -1)).slice(0, 300);
      }
      res.json({ leaves: list.map(leaveView), trainerLeaves });
    } catch (e) { fail(res, e); }
  });

  router.post('/staff-desk/leaves', async (req, res) => {
    try {
      const m = await me(req);
      if (m.dept === 'training' && !isHead(m)) throw httpErr(400, 'Trainers apply for leave from their Trainer dashboard (Shift & Leave).');
      const b = req.body || {};
      const policy = await loadPolicy();
      const type = policy.types.find((t) => t.code === String(b.leaveType || '').toUpperCase());
      if (!type) throw httpErr(400, 'Choose a leave type');
      const from = String(b.from || ''), to = String(b.to || b.from || '');
      if (!isDate(from) || !isDate(to) || to < from) throw httpErr(400, 'Choose valid From and To dates');
      const halfDay = policy.allowHalfDay && from === to && ['first', 'second'].includes(b.halfDay) ? b.halfDay : '';
      const days = leaveDays(policy, from, to, halfDay);
      if (days <= 0) throw httpErr(400, 'Those dates are only week-offs / holidays — no leave needed.');
      const reason = String(b.reason || '').trim().slice(0, 500);
      if (!reason) throw httpErr(400, 'Please give a reason');
      const clash = await LeaveRequest.findOne({ email: m.email, status: { $in: ['approved', 'pending_head', 'pending_hr'] }, from: { $lte: to }, to: { $gte: from } }).lean();
      if (clash) throw httpErr(409, `You already have leave from ${clash.from} to ${clash.to} (${clash.status.replace('_', ' ')}).`);
      if (type.perYear !== null && type.perYear !== undefined) {
        const bal = (await balancesFor([m.email], from.slice(0, 4), policy))[m.email][type.code];
        if (days > bal.remaining) throw httpErr(400, `Only ${bal.remaining} day(s) of ${type.name} left this year. Apply the rest as Loss of Pay.`);
      }
      // A head with nobody above them in the department goes straight to HR
      const status = isHead(m) || isOrg(m) ? 'pending_hr' : 'pending_head';
      const l = await LeaveRequest.create({
        email: m.email, userId: m.id, employeeName: m.name, department: m.dept, role: m.role, branch: m.branch,
        leaveType: type.code, from, to, halfDay, days, reason, status,
        history: [{ by: m.name, byEmail: m.email, at: new Date(), action: 'applied', note: reason }]
      });
      notify({
        audience: status === 'pending_hr' ? 'hr' : m.dept, type: 'leave',
        title: `Leave request: ${m.name}`, message: `${type.name} · ${from}${to !== from ? ` to ${to}` : ''} (${days} day${days === 1 ? '' : 's'}) — waiting for ${status === 'pending_hr' ? 'HR' : 'reporting head'} approval.`,
        createdBy: m.name
      });
      res.status(201).json(leaveView(l.toObject()));
    } catch (e) { fail(res, e); }
  });

  router.post('/staff-desk/leaves/:id/decision', async (req, res) => {
    try {
      const m = await me(req);
      if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(400, 'Invalid leave');
      const l = await LeaveRequest.findById(req.params.id);
      if (!l) throw httpErr(404, 'Leave request not found');
      if (norm(l.email) === m.email) throw httpErr(403, 'You cannot approve your own leave.');
      const action = req.body?.action === 'reject' ? 'reject' : 'approve';
      const note = String(req.body?.note || '').slice(0, 300);
      const d = { by: m.name, byEmail: m.email, at: new Date(), note, action };
      if (l.status === 'pending_head') {
        if (!canHeadApprove(m, l)) throw httpErr(403, 'Only the reporting head of this department can approve this step.');
        l.headDecision = d;
        // An HR approver at the head step completes both steps
        l.status = action === 'reject' ? 'rejected' : isHrApprover(m) ? 'approved' : 'pending_hr';
        if (action === 'approve' && isHrApprover(m)) l.hrDecision = d;
      } else if (l.status === 'pending_hr') {
        if (!isHrApprover(m)) throw httpErr(403, 'Only HR heads, Admin or Leadership give the final approval.');
        l.hrDecision = d;
        l.status = action === 'reject' ? 'rejected' : 'approved';
      } else throw httpErr(409, `This leave is already ${l.status.replace('_', ' ')}.`);
      l.history.push(d);
      await l.save();
      notify({
        audience: l.department, recipientName: l.employeeName, type: 'leave',
        title: `Leave ${l.status === 'approved' ? 'approved' : l.status === 'rejected' ? 'rejected' : 'approved by head'}: ${l.employeeName}`,
        message: `${l.leaveType} · ${l.from}${l.to !== l.from ? ` to ${l.to}` : ''} — ${l.status === 'pending_hr' ? 'now waiting for HR' : l.status} by ${m.name}${note ? `: ${note}` : ''}`,
        createdBy: m.name
      });
      if (l.status === 'pending_hr') notify({ audience: 'hr', type: 'leave', title: `Leave to approve: ${l.employeeName}`, message: `${l.leaveType} · ${l.from}${l.to !== l.from ? ` to ${l.to}` : ''} — approved by ${m.name}, waiting for HR.`, createdBy: m.name });
      res.json(leaveView(l.toObject()));
    } catch (e) { fail(res, e); }
  });

  router.post('/staff-desk/leaves/:id/cancel', async (req, res) => {
    try {
      const m = await me(req);
      if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(400, 'Invalid leave');
      const l = await LeaveRequest.findById(req.params.id);
      if (!l) throw httpErr(404, 'Leave request not found');
      const own = norm(l.email) === m.email;
      if (!own && !isHrApprover(m)) throw httpErr(403, 'Only the employee or HR can cancel this leave.');
      if (['rejected', 'cancelled'].includes(l.status)) throw httpErr(409, `This leave is already ${l.status}.`);
      if (own && l.status === 'approved' && l.from <= zonedParts().date) throw httpErr(400, 'Leave that has already started can only be cancelled by HR.');
      l.status = 'cancelled';
      l.history.push({ by: m.name, byEmail: m.email, at: new Date(), action: 'cancelled', note: String(req.body?.note || '').slice(0, 300) });
      await l.save();
      res.json(leaveView(l.toObject()));
    } catch (e) { fail(res, e); }
  });

  // Payroll (salary structures, monthly runs, payslips) — uses this desk's attendance engine
  registerPayrollRoutes(router, { me, dayContext, dayStatus, deptOf, DEPT_LABEL, notify });
}
