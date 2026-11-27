import mongoose from 'mongoose';
import User from '../models/User.js';
import AppSetting from '../models/AppSetting.js';
import SalaryStructure from '../models/SalaryStructure.js';
import Payslip from '../models/Payslip.js';
import { BRANCH_MASTER } from '../constants/org.js';
import { zonedParts, addDays } from '../utils/trainerAvailability.js';
import AttendanceSheet from '../models/AttendanceSheet.js';
import { parseAttendanceGrid, sheetSummary, matchHeaders, headerKey, DEFAULT_IMPORT_OPTIONS } from '../utils/attendanceSheet.js';

// ============================================================================
// PAYROLL — monthly pay for every staff employee, worked out from the
// Attendance & Leave register (same day codes: P, HD, HL, L, A, WO, H).
//
// Who manages it
//   Department Head / Admin / Founder / Leadership heads → every employee,
//       every branch. Prepare, approve, mark paid, payroll settings.
//   Branch Head / Business Lead → every employee, every branch (never their own
//       salary). Set salaries, generate the month, add incentives / deductions,
//       submit for approval.
//   Everyone else → "My Payslips" (approved / paid payslips only).
//
// Flow per payslip: draft → submitted → approved → paid
// ============================================================================

const SETTINGS_KEY = 'payroll_policy';

// Professional tax: monthly slabs on the month's gross, by branch state.
// These are starting values — check them with your accountant and edit them
// in Payroll → Settings.
export const DEFAULT_PAYROLL_SETTINGS = {
  lopBasis: 'calendar', // per-day rate = monthly ÷ calendar days ('working' = ÷ working days)
  unpaidLeaveCodes: ['LOP'],
  // EPF Scheme 2026: 12% of PF wages, compulsory up to the wage ceiling
  // (₹25,000 from 17 Sep 2026 — was ₹15,000). PF wages = Basic + DA, at least
  // 50% of total salary (Code on Social Security 50% wage rule).
  pfRate: 12,
  pfWageCap: 25000,
  pfRestrictToCeiling: true,
  pf50Rule: true,
  epsRate: 8.33,
  edliRate: 0.5,
  pfAdminRate: 0.5,
  esiRate: 0.75,
  esiGrossLimit: 21000,
  defaultState: 'Tamil Nadu',
  ptSlabs: {
    'Tamil Nadu': [{ upto: 3500, amount: 0 }, { upto: 5000, amount: 30 }, { upto: 7500, amount: 71 }, { upto: 10000, amount: 155 }, { upto: 12500, amount: 171 }, { upto: null, amount: 208 }],
    Kerala: [{ upto: 1999, amount: 0 }, { upto: 2999, amount: 20 }, { upto: 4999, amount: 30 }, { upto: 7499, amount: 50 }, { upto: 9999, amount: 75 }, { upto: 12499, amount: 100 }, { upto: 16666, amount: 125 }, { upto: 20833, amount: 167 }, { upto: null, amount: 208 }],
    Telangana: [{ upto: 15000, amount: 0 }, { upto: 20000, amount: 150 }, { upto: null, amount: 200 }],
    'Andhra Pradesh': [{ upto: 15000, amount: 0 }, { upto: 20000, amount: 150 }, { upto: null, amount: 200 }],
    Maharashtra: [{ upto: 7500, amount: 0 }, { upto: 10000, amount: 175 }, { upto: null, amount: 200 }]
  }
};

const norm = (s = '') => String(s || '').trim().toLowerCase();
const httpErr = (status, message) => Object.assign(new Error(message), { status });
const fail = (res, e) => res.status(e.status || 500).json({ error: e.message });
const money = (n) => Math.max(0, Math.round(Number(n) || 0));
const num = (v, max = 1e8) => Math.max(0, Math.min(max, Number(v) || 0));
const isMonth = (m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(m || ''));
const branchKey = (b) => norm(b).replace(/\b(branch|hq)\b|\(.*?\)/g, '').replace(/[^a-z0-9]/g, '');
const sameBranch = (a, b) => {
  const x = branchKey(a), y = branchKey(b);
  return Boolean(x && y) && (x === y || x.includes(y) || y.includes(x));
};

// ---- roles ------------------------------------------------------------------
const BRANCH_ROLE_RX = /branch|business\s*(lead|head)|\bbm\b/i; // same rule as api.js (e.g. "Branch HR Head")
const DEPT_HEAD_RX = /department\s*head|dept\.?\s*head|\bhead\s+of\b|\bhod\b/i;
const ORG_ROLE_RX = /\badmin\b|founder|\bceo\b|director|super|management|operational head|operations head|regional head/i;
const isBranchRole = (role) => BRANCH_ROLE_RX.test(role || '') && !ORG_ROLE_RX.test(role || '');
const isDeptHead = (role) => DEPT_HEAD_RX.test(role || '') && !BRANCH_ROLE_RX.test(role || '');
const isOrgRole = (u) => !isBranchRole(u.role) && (ORG_ROLE_RX.test(u.role || '') || isDeptHead(u.role) || u.dept === 'admin');
// People a Branch Head / Business Lead may never see or pay
const isManagerial = (u) => isBranchRole(u.role) || isDeptHead(u.role) || ORG_ROLE_RX.test(u.role || '') || u.dept === 'admin';

// Who may approve an employee's request to download a payslip:
// Admin / Founder / Leadership → anyone; a Department Head → own department only.
export function canDecideDownloadOf(v = {}, slip = {}) {
  if (!slip || norm(slip.email) === norm(v.email)) return false;
  if (!isBranchRole(v.role) && (ORG_ROLE_RX.test(v.role || '') || ['admin', 'leadership'].includes(v.dept))) return true;
  return isDeptHead(v.role) && v.dept === slip.department;
}
export const canDecideDownloads = (v = {}) => !isBranchRole(v.role) && (ORG_ROLE_RX.test(v.role || '') || ['admin', 'leadership'].includes(v.dept) || isDeptHead(v.role));

export function payrollAccess(m = {}) {
  // Branch Head / Business Lead: every employee (all branches) — prepare, adjust and
  // submit; approval and marking paid stay with the Department Head / Admin.
  if (isBranchRole(m.role)) {
    return { scope: 'org', branch: m.branch || '', canPrepare: true, canApprove: false, canEditSettings: false };
  }
  if (isOrgRole(m)) return { scope: 'org', branch: '', canPrepare: true, canApprove: true, canEditSettings: true };
  return { scope: 'self', branch: '', canPrepare: false, canApprove: false, canEditSettings: false };
}

// ---- calculation (pure) -----------------------------------------------------
export function stateOfBranch(branch, fallback) {
  const v = norm(branch);
  if (v) {
    const hit = BRANCH_MASTER.find((b) => [b.name, b.code, b.city, ...(b.aliases || [])].filter(Boolean).some((k) => v.includes(norm(k))));
    if (hit) return hit.state;
    if (/online/.test(v)) return fallback;
  }
  return fallback;
}

export function ptFor(gross, slabs = []) {
  const sorted = [...slabs].sort((a, b) => (a.upto === null ? 1 : b.upto === null ? -1 : a.upto - b.upto));
  const slab = sorted.find((s) => s.upto === null || gross <= s.upto);
  return slab ? money(slab.amount) : 0;
}

// days: [{ code, late, minutes, leaveType, login, pendingLeave }] for each date of the month
export function summariseAttendance(days, settings) {
  const unpaid = new Set((settings.unpaidLeaveCodes || []).map((c) => String(c).toUpperCase()));
  const isUnpaid = (t) => unpaid.has(String(t || '').toUpperCase());
  const a = { daysInMonth: days.length, present: 0, halfDays: 0, paidLeave: 0, unpaidLeave: 0, absent: 0, weekOffs: 0, holidays: 0, lateMarks: 0, pendingDays: 0, pendingLeaveDays: 0, minutes: 0 };
  for (const d of days) {
    a.minutes += Number(d.minutes) || 0;
    if (d.late) a.lateMarks += 1;
    if (d.pendingLeave && d.code === 'A') a.pendingLeaveDays += 1;
    switch (d.code) {
      case 'P': a.present += 1; break;
      case 'HD': a.present += 0.5; a.halfDays += 1; a.absent += 0.5; break;
      case 'HL':
        if (d.unpaid || isUnpaid(d.leaveType)) a.unpaidLeave += 0.5; else a.paidLeave += 0.5;
        if (d.login) a.present += 0.5; else a.absent += 0.5;
        break;
      case 'L': if (d.unpaid || isUnpaid(d.leaveType)) a.unpaidLeave += 1; else a.paidLeave += 1; break;
      case 'A': a.absent += 1; break;
      case 'WO': a.weekOffs += 1; break;
      case 'H': a.holidays += 1; break;
      default: a.pendingDays += 1; // NY / future — month not over yet, counted as paid
    }
  }
  a.latePenaltyDays = 0; // salary is cut only for LOP days (absent, half days, unpaid leave)
  a.workingDays = a.daysInMonth - a.weekOffs - a.holidays;
  a.attendanceLop = a.absent + a.unpaidLeave + a.latePenaltyDays;
  a.hours = Math.round((a.minutes / 60) * 100) / 100;
  return a;
}

export function computePay(structure, att, adjustments = {}, settings = DEFAULT_PAYROLL_SETTINGS, state = '') {
  const s = structure || {};
  const adj = adjustments || {};
  // LOP: per-day salary = monthly ÷ calendar days (or working days) — salary cut = per-day × LOP days
  const basisDays = settings.lopBasis === 'working' ? Math.max(1, att.workingDays) : Math.max(1, att.daysInMonth);
  const lopDays = adj.lopOverride !== null && adj.lopOverride !== undefined && adj.lopOverride !== ''
    ? Math.min(basisDays, num(adj.lopOverride, 31))
    : Math.min(basisDays, att.attendanceLop);
  const paidDays = Math.max(0, basisDays - lopDays);
  const f = paidDays / basisDays;

  const parts = [['BASIC', 'Basic', s.basic], ['DA', 'Dearness allowance', s.da], ['HRA', 'HRA', s.hra], ['CONV', 'Conveyance', s.conveyance], ['SPL', 'Special allowance', s.special], ['OTH', 'Other allowance', s.otherAllowance]];
  const earnings = [];
  let fullGross = 0;
  for (const [code, label, full] of parts) {
    if (!num(full)) continue;
    fullGross += money(full);
    earnings.push({ code, label, amount: money(num(full) * f) });
  }
  const fixedEarned = earnings.reduce((t, e) => t + e.amount, 0);
  const lopAmount = Math.max(0, fullGross - fixedEarned);
  for (const [code, label, key] of [['INC', 'Incentive', 'incentive'], ['BON', 'Bonus', 'bonus'], ['ARR', 'Arrears', 'arrears'], ['OE', 'Other earning', 'otherEarning']]) {
    if (num(adj[key])) earnings.push({ code, label, amount: money(adj[key]) });
  }
  const gross = earnings.reduce((t, e) => t + e.amount, 0);

  // PF (EPF Scheme 2026 / Code on Social Security): PF wages = Basic + DA, but not
  // less than 50% of the fixed monthly salary; prorated for LOP; 12% up to the ceiling.
  const deductions = [];
  const employer = [];
  let pf = { wage: 0, wageFull: 0, employee: 0 };
  if (s.pfApplicable) {
    const basicDa = num(s.basic) + num(s.da);
    const wageFull = settings.pf50Rule !== false ? Math.max(basicDa, fullGross / 2) : basicDa;
    const earnedWage = money(wageFull * f);
    const ceiling = num(settings.pfWageCap) || Infinity;
    const wage = settings.pfRestrictToCeiling !== false ? Math.min(earnedWage, ceiling) : earnedWage;
    const employee = money(wage * (num(settings.pfRate) / 100));
    const epsWage = Math.min(wage, ceiling);
    const eps = money(epsWage * (num(settings.epsRate) / 100));
    const employerTotal = money(wage * (num(settings.pfRate) / 100));
    pf = { wage, wageFull: money(wageFull), employee, earnedWage };
    if (employee) deductions.push({ code: 'PF', label: `Employee PF (${settings.pfRate}% of ₹${wage.toLocaleString('en-IN')})`, amount: employee });
    if (employerTotal) {
      employer.push({ code: 'EPF_ER', label: `Employer EPF (${(num(settings.pfRate) - num(settings.epsRate)).toFixed(2)}%)`, amount: Math.max(0, employerTotal - eps) });
      employer.push({ code: 'EPS', label: `Employer EPS (${settings.epsRate}%)`, amount: eps });
    }
    const edli = money(Math.min(wage, ceiling) * (num(settings.edliRate) / 100));
    if (edli) employer.push({ code: 'EDLI', label: `EDLI (${settings.edliRate}%)`, amount: edli });
    const admin = money(wage * (num(settings.pfAdminRate) / 100));
    if (admin) employer.push({ code: 'PFADM', label: `PF admin charges (${settings.pfAdminRate}%)`, amount: admin });
  }
  if (s.esiApplicable && fullGross <= num(settings.esiGrossLimit)) {
    const esi = Math.ceil(gross * (num(settings.esiRate) / 100));
    if (esi) deductions.push({ code: 'ESI', label: `ESI (${settings.esiRate}%)`, amount: esi });
  }
  if (s.ptApplicable) {
    const pt = ptFor(gross, (settings.ptSlabs || {})[state] || []);
    if (pt) deductions.push({ code: 'PT', label: `Professional tax${state ? ` (${state})` : ''}`, amount: pt });
  }
  if (num(s.tdsMonthly)) deductions.push({ code: 'TDS', label: 'TDS', amount: money(s.tdsMonthly) });
  if (num(adj.advance)) deductions.push({ code: 'ADV', label: 'Advance recovery', amount: money(adj.advance) });
  if (num(adj.otherDeduction)) deductions.push({ code: 'OD', label: 'Other deduction', amount: money(adj.otherDeduction) });
  const totalDeductions = deductions.reduce((t, d) => t + d.amount, 0);
  const employerTotal = employer.reduce((t, e) => t + e.amount, 0);
  return {
    basisDays, lopDays, paidDays, perDay: money(fullGross / basisDays), lopAmount, earnings, deductions, employer, employerTotal, pf,
    fullGross, gross, totalDeductions, net: Math.max(0, gross - totalDeductions), ctc: fullGross + employerTotal
  };
}

// ---- routes -----------------------------------------------------------------
export function registerPayrollRoutes(router, { me, dayContext, dayStatus, deptOf, DEPT_LABEL, notify }) {
  async function loadSettings() {
    const doc = await AppSetting.findOne({ key: SETTINGS_KEY }).lean();
    const v = doc?.value || {};
    return { ...DEFAULT_PAYROLL_SETTINGS, ...v, ptSlabs: { ...DEFAULT_PAYROLL_SETTINGS.ptSlabs, ...(v.ptSlabs || {}) } };
  }

  async function viewer(req) {
    const m = await me(req);
    return { ...m, access: payrollAccess(m) };
  }

  // Employees this viewer may manage (never themselves)
  async function managedEmployees(v, branchFilter = '') {
    if (!['org', 'branch'].includes(v.access.scope)) return [];
    const users = (await User.find().select('name email role department branch status').lean())
      .filter((u) => u.email && deptOf(u) !== 'student' && !/inactive|disabled|left|resigned/i.test(u.status || '') && u.active !== false);
    return users
      .map((u) => ({ email: norm(u.email), name: u.name, role: u.role || '', dept: deptOf(u), branch: u.branch || '', id: String(u._id) }))
      .filter((e) => e.email !== v.email)
      .filter((e) => v.access.scope === 'org' || (sameBranch(e.branch, v.access.branch) && !isManagerial(e)))
      .filter((e) => !branchFilter || branchFilter === 'all' || (branchFilter === 'none' ? !e.branch : sameBranch(e.branch, branchFilter)))
      .map((e) => ({ ...e, deptLabel: DEPT_LABEL[e.dept] || e.dept }))
      .sort((a, b) => (a.branch || '').localeCompare(b.branch || '') || a.name.localeCompare(b.name));
  }

  async function assertManages(v, email) {
    const list = await managedEmployees(v);
    const e = list.find((x) => x.email === norm(email));
    if (!e) throw httpErr(403, 'This employee is not in your payroll scope.');
    return e;
  }

  const monthRange = (month) => {
    const [y, mo] = month.split('-').map(Number);
    const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
  };

  const downloadView = (d) => {
    if (!d || !d.status || d.status === 'none') return { status: 'none' };
    const expired = d.status === 'approved' && d.validUntil && new Date(d.validUntil) < new Date();
    return { status: expired ? 'expired' : d.status, reason: d.reason || '', requestedAt: d.requestedAt, decidedBy: d.decidedBy || '', decidedAt: d.decidedAt, note: d.note || '', validUntil: d.validUntil, count: d.count || 0 };
  };

  const slipView = (p) => ({
    id: String(p._id), month: p.month, email: p.email, employeeName: p.employeeName, employeeCode: p.employeeCode, department: p.department,
    deptLabel: DEPT_LABEL[p.department] || p.department, role: p.role, designation: p.designation, branch: p.branch, payType: p.payType,
    structure: p.structure, attendance: p.attendance, earnings: p.earnings, deductions: p.deductions, employer: p.employer || [], employerTotal: p.employerTotal || 0, pf: p.pf || {}, lopAmount: p.lopAmount || 0, perDay: p.perDay || 0, ctc: p.ctc || 0, adjustments: p.adjustments,
    fullGross: p.fullGross, gross: p.gross, totalDeductions: p.totalDeductions, net: p.net, provisional: p.provisional, warnings: p.warnings,
    status: p.status, paidOn: p.paidOn, paymentRef: p.paymentRef, download: downloadView(p.download), generatedBy: p.generatedBy, generatedAt: p.generatedAt, history: p.history, updatedAt: p.updatedAt
  });

  // Recalculate one draft payslip from attendance (keeps its adjustments)
  // sheet: the month's uploaded attendance sheet (or null); sheetCol: this employee's column in it
  function buildSlip({ emp, structure, month, ctx, dates, settings, now, existing, by, sheet = null, sheetCol = null }) {
    const sheetDay = sheetCol ? new Map((sheetCol.days || []).map((d) => [d.date, d])) : null;
    const days = dates.map((d) => {
      if (sheetDay) {
        const x = sheetDay.get(d) || { code: '' };
        return { code: x.code || '', late: false, minutes: x.minutes || 0, leaveType: x.leaveType || '', unpaid: Boolean(x.unpaid), login: Boolean(x.login || x.worked), pendingLeave: '', blank: Boolean(x.blank), eodNotDone: /NOT\s*DONE/i.test(x.eod || '') };
      }
      const s = dayStatus(emp, d, ctx, now);
      return { code: s.code, late: s.late, minutes: s.minutes, leaveType: s.leaveType, login: Boolean(s.login), pendingLeave: s.pendingLeave };
    });
    // Days before joining are not paid
    if (structure.joiningDate && structure.joiningDate > dates[0]) {
      dates.forEach((d, i) => { if (d < structure.joiningDate) days[i] = { code: 'A', minutes: 0, beforeJoining: true }; });
    }
    const att = summariseAttendance(days, settings);
    att.source = sheetCol ? 'sheet' : 'app';
    if (sheetCol) { att.blankDays = days.filter((d) => d.blank).length; att.eodNotDone = days.filter((d) => d.eodNotDone).length; att.sheetName = sheetCol.header; }
    att.beforeJoiningDays = days.filter((d) => d.beforeJoining).length;
    const state = stateOfBranch(emp.branch || structure.branch, settings.defaultState);
    const adjustments = existing?.adjustments ? (existing.adjustments.toObject ? existing.adjustments.toObject() : existing.adjustments) : {};
    const pay = computePay(structure, att, adjustments, settings, state);
    const warnings = [];
    if (att.pendingDays > 0) warnings.push(`${att.pendingDays} day(s) not over yet — counted as paid. Recalculate after month end.`);
    if (sheet && !sheetCol) warnings.push('Not in the uploaded attendance sheet — the app login register was used.');
    if (att.blankDays > 0) warnings.push(`${att.blankDays} blank day(s) in the attendance sheet counted as ${sheet?.options?.blank === 'present' ? 'present' : 'absent (LOP)'}.`);
    if (sheetCol?.discontinued) warnings.push('Marked "Discontinued" in the attendance sheet — days after that are LOP.');
    if (att.pendingLeaveDays > 0) warnings.push(`${att.pendingLeaveDays} absent day(s) have a leave request still waiting for approval.`);
    const snap = { payType: 'monthly', basic: structure.basic, da: structure.da || 0, hra: structure.hra, conveyance: structure.conveyance, special: structure.special, otherAllowance: structure.otherAllowance, rate: structure.rate, pfApplicable: structure.pfApplicable, esiApplicable: structure.esiApplicable, ptApplicable: structure.ptApplicable, tdsMonthly: structure.tdsMonthly, payMode: structure.payMode };
    return {
      month, email: emp.email, employeeName: emp.name, employeeCode: structure.employeeCode || '', department: emp.dept, role: emp.role,
      designation: structure.designation || emp.role, branch: emp.branch || structure.branch || '', payType: 'monthly',
      structure: snap, attendance: { ...att, state, basisDays: pay.basisDays, lopDays: pay.lopDays, paidDays: pay.paidDays },
      earnings: pay.earnings, deductions: pay.deductions, employer: pay.employer, employerTotal: pay.employerTotal, pf: pay.pf, lopAmount: pay.lopAmount, perDay: pay.perDay, ctc: pay.ctc,
      fullGross: pay.fullGross, gross: pay.gross, totalDeductions: pay.totalDeductions, net: pay.net,
      provisional: att.pendingDays > 0, warnings, generatedBy: by.name, generatedAt: new Date()
    };
  }

  const canTouch = (v, slip) => v.access.scope === 'org' || (v.access.scope === 'branch' && sameBranch(slip.branch, v.access.branch) && !isManagerial({ role: slip.role, dept: slip.department }) && norm(slip.email) !== v.email);

  // ---- who am I ----
  router.get('/payroll/me', async (req, res) => {
    try {
      const v = await viewer(req);
      const settings = await loadSettings();
      res.json({ me: { name: v.name, email: v.email, role: v.role, branch: v.branch, dept: v.dept }, ...v.access, canDecideDownloads: canDecideDownloads(v), settings, branches: BRANCH_MASTER.map((b) => b.name) });
    } catch (e) { fail(res, e); }
  });

  router.put('/payroll/settings', async (req, res) => {
    try {
      const v = await viewer(req);
      if (!v.access.canEditSettings) throw httpErr(403, 'Only a Department Head or Admin can change payroll settings.');
      const b = req.body || {};
      const slabs = {};
      for (const [state, list] of Object.entries(b.ptSlabs || {})) {
        if (!Array.isArray(list)) continue;
        slabs[String(state).slice(0, 40)] = list.map((s) => ({ upto: s.upto === null || s.upto === '' || s.upto === undefined ? null : num(s.upto), amount: num(s.amount, 5000) })).slice(0, 20);
      }
      const value = {
        lopBasis: b.lopBasis === 'working' ? 'working' : 'calendar',
        unpaidLeaveCodes: (Array.isArray(b.unpaidLeaveCodes) ? b.unpaidLeaveCodes : ['LOP']).map((c) => String(c).trim().toUpperCase()).filter(Boolean).slice(0, 10),
        latesPerHalfDay: 0,
        pfRate: num(b.pfRate, 30), pfWageCap: num(b.pfWageCap, 1e6),
        pfRestrictToCeiling: b.pfRestrictToCeiling !== false, pf50Rule: b.pf50Rule !== false,
        epsRate: num(b.epsRate, 30), edliRate: num(b.edliRate, 10), pfAdminRate: num(b.pfAdminRate, 10),
        esiRate: num(b.esiRate, 10), esiGrossLimit: num(b.esiGrossLimit, 1e6),
        defaultState: String(b.defaultState || DEFAULT_PAYROLL_SETTINGS.defaultState).slice(0, 40),
        ptSlabs: Object.keys(slabs).length ? slabs : DEFAULT_PAYROLL_SETTINGS.ptSlabs
      };
      await AppSetting.findOneAndUpdate({ key: SETTINGS_KEY }, { $set: { value, updatedBy: v.name } }, { upsert: true });
      res.json(await loadSettings());
    } catch (e) { fail(res, e); }
  });

  // ---- salary structures ----
  router.get('/payroll/structures', async (req, res) => {
    try {
      const v = await viewer(req);
      if (!v.access.canPrepare) throw httpErr(403, v.access.noBranch ? 'No branch is set on your account. Ask Admin to set it.' : 'Only Branch Heads, Business Leads and Department Heads manage payroll.');
      const employees = await managedEmployees(v, String(req.query.branch || ''));
      const docs = await SalaryStructure.find({ email: { $in: employees.map((e) => e.email) } }).lean();
      const by = new Map(docs.map((d) => [d.email, d]));
      res.json({ rows: employees.map((e) => ({ ...e, structure: by.get(e.email) ? { ...by.get(e.email), history: undefined } : null })) });
    } catch (e) { fail(res, e); }
  });

  router.put('/payroll/structures/:email', async (req, res) => {
    try {
      const v = await viewer(req);
      if (!v.access.canPrepare) throw httpErr(403, 'Only Branch Heads, Business Leads and Department Heads manage salaries.');
      const emp = await assertManages(v, req.params.email);
      const b = req.body || {};
      const payType = 'monthly'; // monthly salary only (LOP-based)
      const set = {
        employeeName: emp.name, department: emp.dept, role: emp.role, branch: emp.branch, payType,
        employeeCode: String(b.employeeCode || '').trim().slice(0, 30), designation: String(b.designation || '').trim().slice(0, 60),
        joiningDate: /^\d{4}-\d{2}-\d{2}$/.test(String(b.joiningDate || '')) ? b.joiningDate : '',
        basic: num(b.basic), da: num(b.da), hra: num(b.hra), conveyance: num(b.conveyance), special: num(b.special), otherAllowance: num(b.otherAllowance),
        rate: 0, pfApplicable: Boolean(b.pfApplicable), esiApplicable: Boolean(b.esiApplicable), ptApplicable: b.ptApplicable !== false,
        tdsMonthly: num(b.tdsMonthly), payMode: String(b.payMode || 'Bank transfer').slice(0, 40), active: b.active !== false, updatedBy: v.name
      };
      if (!set.basic) throw httpErr(400, 'Enter the monthly Basic salary.');
      const doc = await SalaryStructure.findOneAndUpdate(
        { email: emp.email },
        { $set: set, $push: { history: { $each: [{ by: v.name, byEmail: v.email, at: new Date(), note: String(b.note || '').slice(0, 200), snapshot: set }], $slice: -24 } } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
      res.json({ ...doc, history: undefined });
    } catch (e) { fail(res, e); }
  });

  // ---- monthly run ----
  router.get('/payroll/run', async (req, res) => {
    try {
      const v = await viewer(req);
      if (!v.access.canPrepare) throw httpErr(403, v.access.noBranch ? 'No branch is set on your account. Ask Admin to set it.' : 'Only Branch Heads, Business Leads and Department Heads manage payroll.');
      const month = isMonth(req.query.month) ? req.query.month : zonedParts().date.slice(0, 7);
      const employees = await managedEmployees(v, String(req.query.branch || ''));
      const emails = employees.map((e) => e.email);
      const [slips, structures, sheet] = await Promise.all([
        Payslip.find({ month, email: { $in: emails } }).lean(),
        SalaryStructure.find({ email: { $in: emails }, active: { $ne: false } }).select('email').lean(),
        AttendanceSheet.findOne({ month }).select('fileName uploadedBy updatedAt lastDataDate columns.email').lean()
      ]);
      const hasStructure = new Set(structures.map((s) => s.email));
      const slipEmails = new Set(slips.map((s) => s.email));
      const totals = { employees: employees.length, payslips: slips.length, gross: 0, deductions: 0, net: 0, draft: 0, submitted: 0, approved: 0, paid: 0 };
      for (const s of slips) { totals.gross += s.gross; totals.deductions += s.totalDeductions; totals.net += s.net; totals[s.status] += 1; }
      res.json({
        month, totals,
        sheet: sheet ? { fileName: sheet.fileName, uploadedBy: sheet.uploadedBy, updatedAt: sheet.updatedAt, lastDataDate: sheet.lastDataDate, columns: sheet.columns.length, mapped: sheet.columns.filter((c) => c.email).length } : null,
        payslips: slips.map(slipView).sort((a, b) => (a.branch || '').localeCompare(b.branch || '') || a.employeeName.localeCompare(b.employeeName)),
        noStructure: employees.filter((e) => !hasStructure.has(e.email)),
        notGenerated: employees.filter((e) => hasStructure.has(e.email) && !slipEmails.has(e.email))
      });
    } catch (e) { fail(res, e); }
  });

  router.post('/payroll/run/generate', async (req, res) => {
    try {
      const v = await viewer(req);
      if (!v.access.canPrepare) throw httpErr(403, 'Only Branch Heads, Business Leads and Department Heads run payroll.');
      const month = String(req.body?.month || '');
      if (!isMonth(month)) throw httpErr(400, 'Choose a month');
      const now = zonedParts();
      if (month > now.date.slice(0, 7)) throw httpErr(400, 'You cannot run payroll for a future month.');
      let employees = await managedEmployees(v, String(req.body?.branch || ''));
      if (Array.isArray(req.body?.emails) && req.body.emails.length) {
        const want = new Set(req.body.emails.map(norm));
        employees = employees.filter((e) => want.has(e.email));
      }
      const structures = await SalaryStructure.find({ email: { $in: employees.map((e) => e.email) }, active: { $ne: false } }).lean();
      const sBy = new Map(structures.map((s) => [s.email, s]));
      employees = employees.filter((e) => sBy.has(e.email));
      if (!employees.length) throw httpErr(400, 'No employee in this list has a salary set. Add salaries in "Salary Structures" first.');
      const { from, to } = monthRange(month);
      const dates = [];
      for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d);
      const [ctx, settings, existing, sheet] = await Promise.all([
        dayContext(employees, from, to),
        loadSettings(),
        Payslip.find({ month, email: { $in: employees.map((e) => e.email) } }),
        AttendanceSheet.findOne({ month }).lean()
      ]);
      const sheetBy = new Map((sheet?.columns || []).filter((c) => c.email).map((c) => [c.email, c]));
      const exBy = new Map(existing.map((p) => [p.email, p]));
      let created = 0, updated = 0, locked = 0;
      for (const emp of employees) {
        const ex = exBy.get(emp.email);
        if (ex && ex.status !== 'draft') { locked += 1; continue; }
        const data = buildSlip({ emp, structure: sBy.get(emp.email), month, ctx, dates, settings, now, existing: ex, by: v, sheet, sheetCol: sheetBy.get(emp.email) || null });
        if (ex) {
          Object.assign(ex, data);
          ex.history.push({ by: v.name, byEmail: v.email, at: new Date(), action: 'recalculated' });
          await ex.save(); updated += 1;
        } else {
          await Payslip.create({ ...data, status: 'draft', history: [{ by: v.name, byEmail: v.email, at: new Date(), action: 'generated' }] });
          created += 1;
        }
      }
      res.json({ month, created, updated, locked });
    } catch (e) { fail(res, e); }
  });

  router.put('/payroll/payslips/:id/adjustments', async (req, res) => {
    try {
      const v = await viewer(req);
      if (!v.access.canPrepare) throw httpErr(403, 'Not allowed');
      if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(400, 'Invalid payslip');
      const p = await Payslip.findById(req.params.id);
      if (!p || !canTouch(v, p)) throw httpErr(404, 'Payslip not found');
      if (p.status !== 'draft') throw httpErr(409, 'Only draft payslips can be changed. Send it back to draft first.');
      const b = req.body || {};
      const adj = {
        incentive: num(b.incentive), bonus: num(b.bonus), arrears: num(b.arrears), otherEarning: num(b.otherEarning),
        advance: num(b.advance), otherDeduction: num(b.otherDeduction),
        lopOverride: b.lopOverride === null || b.lopOverride === '' || b.lopOverride === undefined ? null : num(b.lopOverride, 31),
        note: String(b.note || '').slice(0, 300)
      };
      const settings = await loadSettings();
      const pay = computePay(p.structure, p.attendance, adj, settings, p.attendance?.state || '');
      p.adjustments = adj;
      p.earnings = pay.earnings; p.deductions = pay.deductions; p.employer = pay.employer; p.employerTotal = pay.employerTotal; p.pf = pay.pf; p.lopAmount = pay.lopAmount; p.perDay = pay.perDay; p.ctc = pay.ctc; p.gross = pay.gross; p.totalDeductions = pay.totalDeductions; p.net = pay.net; p.fullGross = pay.fullGross;
      p.attendance = { ...p.attendance, lopDays: pay.lopDays, paidDays: pay.paidDays, basisDays: pay.basisDays };
      p.markModified('attendance');
      p.history.push({ by: v.name, byEmail: v.email, at: new Date(), action: 'adjusted', note: adj.note });
      await p.save();
      res.json(slipView(p.toObject()));
    } catch (e) { fail(res, e); }
  });

  // submit | approve | reject (back to draft) | paid | reopen
  async function act(v, p, action, b) {
    const step = { by: v.name, byEmail: v.email, at: new Date(), action, note: String(b.note || '').slice(0, 300) };
    if (action === 'submit') {
      if (p.status !== 'draft') throw httpErr(409, `Already ${p.status}`);
      p.status = 'submitted';
    } else if (action === 'approve') {
      if (!v.access.canApprove) throw httpErr(403, 'Only a Department Head or Admin can approve payroll.');
      if (!['draft', 'submitted'].includes(p.status)) throw httpErr(409, `Already ${p.status}`);
      p.status = 'approved';
    } else if (action === 'reject') {
      if (!v.access.canApprove) throw httpErr(403, 'Only a Department Head or Admin can send payroll back.');
      if (!['submitted', 'approved'].includes(p.status)) throw httpErr(409, `It is ${p.status}`);
      p.status = 'draft';
    } else if (action === 'reopen') {
      // Branch Head may pull back their own submission before it is approved
      if (p.status !== 'submitted' && !(v.access.canApprove && p.status === 'approved')) throw httpErr(409, `It is ${p.status}`);
      p.status = 'draft';
    } else if (action === 'paid') {
      if (!v.access.canApprove) throw httpErr(403, 'Only a Department Head or Admin can mark salary as paid.');
      if (p.status !== 'approved') throw httpErr(409, 'Approve the payslip before marking it paid.');
      p.status = 'paid';
      p.paidOn = /^\d{4}-\d{2}-\d{2}$/.test(String(b.paidOn || '')) ? b.paidOn : zonedParts().date;
      p.paymentRef = String(b.paymentRef || '').slice(0, 80);
    } else throw httpErr(400, 'Unknown action');
    p.history.push(step);
    await p.save();
  }

  router.post('/payroll/payslips/:id/action', async (req, res) => {
    try {
      const v = await viewer(req);
      if (!v.access.canPrepare) throw httpErr(403, 'Not allowed');
      if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(400, 'Invalid payslip');
      const p = await Payslip.findById(req.params.id);
      if (!p || !canTouch(v, p)) throw httpErr(404, 'Payslip not found');
      const action = String(req.body?.action || '');
      await act(v, p, action, req.body || {});
      if (action === 'submit') notify({ audience: 'leadership', type: 'payroll', title: `Payroll to approve: ${p.employeeName}`, message: `${p.month} · net ₹${p.net.toLocaleString('en-IN')} — submitted by ${v.name}`, createdBy: v.name });
      if (['approve', 'paid'].includes(action)) notify({ audience: p.department, recipientName: p.employeeName, type: 'payroll', title: action === 'paid' ? `Salary paid for ${p.month}` : `Payslip ready for ${p.month}`, message: action === 'paid' ? `Net ₹${p.net.toLocaleString('en-IN')} paid on ${p.paidOn}.` : 'Your payslip is approved. Open Attendance & Leave → My Payslips.', createdBy: v.name });
      res.json(slipView(p.toObject()));
    } catch (e) { fail(res, e); }
  });

  router.post('/payroll/run/bulk-action', async (req, res) => {
    try {
      const v = await viewer(req);
      if (!v.access.canPrepare) throw httpErr(403, 'Not allowed');
      const action = String(req.body?.action || '');
      const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter((id) => mongoose.isValidObjectId(id)).slice(0, 1000);
      if (!ids.length) throw httpErr(400, 'Select payslips first');
      const slips = await Payslip.find({ _id: { $in: ids } });
      let done = 0; const skipped = [];
      for (const p of slips) {
        if (!canTouch(v, p)) { skipped.push(`${p.employeeName}: not in your scope`); continue; }
        try { await act(v, p, action, req.body || {}); done += 1; } catch (e) { skipped.push(`${p.employeeName}: ${e.message}`); }
      }
      if (done && action === 'submit') notify({ audience: 'leadership', type: 'payroll', title: `Payroll to approve (${done})`, message: `${slips[0]?.month} — ${done} payslip(s) submitted by ${v.name}${v.access.branch ? ` · ${v.access.branch}` : ''}`, createdBy: v.name });
      res.json({ done, skipped });
    } catch (e) { fail(res, e); }
  });

  router.delete('/payroll/payslips/:id', async (req, res) => {
    try {
      const v = await viewer(req);
      if (!v.access.canPrepare) throw httpErr(403, 'Not allowed');
      if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(400, 'Invalid payslip');
      const p = await Payslip.findById(req.params.id);
      if (!p || !canTouch(v, p)) throw httpErr(404, 'Payslip not found');
      if (p.status !== 'draft') throw httpErr(409, 'Only draft payslips can be removed.');
      await p.deleteOne();
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });

  // ---- monthly attendance sheet (LOGIN / LOGOUT / EOD) upload ----
  // The browser reads the Excel / CSV file into a grid of cells; the server
  // parses it, matches sheet names to staff and stores the per-day codes.
  const SHEET_NAMES_KEY = 'attendance_sheet_names'; // remembered "sheet name → staff email"

  async function sheetStaff() {
    const users = (await User.find().select('name email role department branch status active').lean())
      .filter((u) => u.email && deptOf(u) !== 'student' && !/inactive|disabled|left|resigned/i.test(u.status || '') && u.active !== false);
    return users.map((u) => ({ email: norm(u.email), name: u.name || u.email, role: u.role || '', dept: deptOf(u), deptLabel: DEPT_LABEL[deptOf(u)] || deptOf(u), branch: u.branch || '' }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function readImportBody(b) {
    const month = String(b.month || '');
    if (!isMonth(month)) throw httpErr(400, 'Choose the month of this sheet.');
    if (month > zonedParts().date.slice(0, 7)) throw httpErr(400, 'You cannot upload attendance for a future month.');
    if (!Array.isArray(b.grid) || !b.grid.length) throw httpErr(400, 'The sheet is empty.');
    const o = b.options || {};
    const options = {
      leave: o.leave === 'paid' ? 'paid' : 'unpaid',
      ml: o.ml === 'unpaid' ? 'unpaid' : 'paid',
      blank: o.blank === 'present' ? 'present' : 'absent',
      halfDayMinutes: Math.max(60, Math.min(480, Number(o.halfDayMinutes) || DEFAULT_IMPORT_OPTIONS.halfDayMinutes))
    };
    return { month, options, parsed: parseAttendanceGrid(b.grid, month, options, zonedParts().date) };
  }

  const sheetColView = (c) => ({
    col: c.col, header: c.header, email: c.email || '', how: c.how || '', suggestions: c.suggestions || [], employeeName: c.employeeName || '',
    discontinued: Boolean(c.discontinued), issues: c.issues || [], summary: sheetSummary(c.days || []),
    days: (c.days || []).map((d) => ({ date: d.date, code: d.code, label: d.label, login: d.login, logout: d.logout, raw: d.raw, eod: d.eod, leaveType: d.leaveType, unpaid: d.unpaid, blank: d.blank }))
  });

  router.post('/payroll/attendance-sheet/preview', async (req, res) => {
    try {
      const v = await viewer(req);
      if (!v.access.canPrepare) throw httpErr(403, 'Only Branch Heads, Business Leads and Department Heads upload attendance.');
      const { month, options, parsed } = readImportBody(req.body || {});
      const [staff, remembered, existing] = await Promise.all([
        sheetStaff(),
        AppSetting.findOne({ key: SHEET_NAMES_KEY }).lean(),
        AttendanceSheet.findOne({ month }).select('fileName uploadedBy updatedAt columns.header columns.email').lean()
      ]);
      // A re-upload keeps this month's earlier mapping, then the remembered names
      const prev = { ...(remembered?.value || {}) };
      for (const c of existing?.columns || []) if (c.email) prev[headerKey(c.header)] = c.email;
      const matches = new Map(matchHeaders(parsed.columns, staff, prev).map((m) => [m.col, m]));
      res.json({
        month, options, lastDataDate: parsed.lastDataDate, warnings: parsed.warnings, dates: parsed.dates,
        columns: parsed.columns.map((c) => sheetColView({ ...c, ...matches.get(c.col) })),
        staff: staff.map(({ email, name, role, deptLabel, branch }) => ({ email, name, role, deptLabel, branch })),
        existing: existing ? { fileName: existing.fileName, uploadedBy: existing.uploadedBy, updatedAt: existing.updatedAt } : null
      });
    } catch (e) { fail(res, e); }
  });

  router.post('/payroll/attendance-sheet', async (req, res) => {
    try {
      const v = await viewer(req);
      if (!v.access.canPrepare) throw httpErr(403, 'Only Branch Heads, Business Leads and Department Heads upload attendance.');
      const b = req.body || {};
      const { month, options, parsed } = readImportBody(b);
      const staff = await sheetStaff();
      const byEmail = new Map(staff.map((e) => [e.email, e]));
      const mapping = b.mapping && typeof b.mapping === 'object' ? b.mapping : {};
      const used = new Map();
      const columns = parsed.columns.map((c) => {
        const email = norm(mapping[c.col] || '');
        if (email && !byEmail.has(email)) throw httpErr(400, `"${c.header}" is mapped to ${email}, who is not an active staff member.`);
        if (email && used.has(email)) throw httpErr(400, `"${c.header}" and "${used.get(email)}" are both mapped to ${byEmail.get(email).name}. Each person can have only one column.`);
        if (email) used.set(email, c.header);
        return { header: c.header, email, employeeName: email ? byEmail.get(email).name : '', discontinued: c.discontinued, issues: c.issues, days: c.days };
      });
      if (!used.size) throw httpErr(400, 'Map at least one sheet name to an employee before saving.');
      const doc = await AttendanceSheet.findOneAndUpdate(
        { month },
        { $set: { fileName: String(b.fileName || '').slice(0, 120), options, lastDataDate: parsed.lastDataDate, warnings: parsed.warnings, columns, uploadedBy: v.name, uploadedByEmail: v.email } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
      // Remember the names for next month's upload
      const rem = (await AppSetting.findOne({ key: SHEET_NAMES_KEY }).lean())?.value || {};
      for (const c of columns) if (c.email) rem[headerKey(c.header)] = c.email;
      await AppSetting.findOneAndUpdate({ key: SHEET_NAMES_KEY }, { $set: { value: rem, updatedBy: v.name } }, { upsert: true });
      const drafts = await Payslip.countDocuments({ month, status: 'draft' });
      res.json({ month, saved: columns.filter((c) => c.email).length, ignored: columns.filter((c) => !c.email).length, draftsToRecalculate: drafts, updatedAt: doc.updatedAt });
    } catch (e) { fail(res, e); }
  });

  router.get('/payroll/attendance-sheet', async (req, res) => {
    try {
      const v = await viewer(req);
      if (!v.access.canPrepare) throw httpErr(403, 'Not allowed');
      const month = isMonth(req.query.month) ? req.query.month : zonedParts().date.slice(0, 7);
      const doc = await AttendanceSheet.findOne({ month }).lean();
      if (!doc) return res.json({ month, sheet: null });
      res.json({
        month,
        sheet: {
          fileName: doc.fileName, uploadedBy: doc.uploadedBy, updatedAt: doc.updatedAt, options: doc.options, lastDataDate: doc.lastDataDate, warnings: doc.warnings,
          columns: doc.columns.map((c, i) => sheetColView({ ...c, col: i, how: c.email ? 'saved' : '' }))
        }
      });
    } catch (e) { fail(res, e); }
  });

  router.delete('/payroll/attendance-sheet', async (req, res) => {
    try {
      const v = await viewer(req);
      if (!v.access.canPrepare) throw httpErr(403, 'Not allowed');
      const month = String(req.query.month || '');
      if (!isMonth(month)) throw httpErr(400, 'Choose a month');
      await AttendanceSheet.deleteOne({ month });
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });

  // ---- employee self-service ----
  router.get('/payroll/my-payslips', async (req, res) => {
    try {
      const m = await me(req);
      const list = await Payslip.find({ email: m.email, status: { $in: ['approved', 'paid'] } }).sort({ month: -1 }).limit(36).lean();
      res.json({ payslips: list.map((p) => ({ ...slipView(p), history: undefined, generatedBy: undefined })) });
    } catch (e) { fail(res, e); }
  });

  // ---- payslip downloads: employee requests → Head of Department approves ----
  const DOWNLOAD_HOURS = 48;

  router.post('/payroll/my-payslips/:id/download-request', async (req, res) => {
    try {
      const m = await me(req);
      if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(400, 'Invalid payslip');
      const p = await Payslip.findById(req.params.id);
      if (!p || norm(p.email) !== m.email || !['approved', 'paid'].includes(p.status)) throw httpErr(404, 'Payslip not found');
      const cur = downloadView(p.download);
      if (cur.status === 'pending') throw httpErr(409, 'Your request is already waiting for approval.');
      if (cur.status === 'approved') throw httpErr(409, 'Download is already approved — use the Download button.');
      const reason = String(req.body?.reason || '').trim().slice(0, 300);
      if (reason.length < 3) throw httpErr(400, 'Tell your Head of Department why you need the payslip (e.g. bank loan, visa).');
      p.download = { status: 'pending', reason, requestedAt: new Date(), count: p.download?.count || 0 };
      p.markModified('download');
      p.history.push({ by: m.name, byEmail: m.email, at: new Date(), action: 'download-requested', note: reason });
      await p.save();
      // Tell the heads of this employee's department (and leadership)
      const heads = (await User.find().select('name role department email').lean()).filter((u) => canDecideDownloadOf({ ...u, email: norm(u.email), dept: deptOf(u) }, p) && isDeptHead(u.role));
      const msg = { type: 'payroll', title: `Payslip download request: ${p.employeeName}`, message: `${p.month} payslip — "${reason}". Approve in Payroll → Download Requests.`, createdBy: m.name };
      for (const h of heads) notify({ ...msg, audience: deptOf(h), recipientName: h.name });
      notify({ ...msg, audience: 'leadership' });
      res.json(slipView(p.toObject()));
    } catch (e) { fail(res, e); }
  });

  // Approved → returns the payslip for printing / PDF and logs the download
  router.post('/payroll/my-payslips/:id/download', async (req, res) => {
    try {
      const m = await me(req);
      if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(400, 'Invalid payslip');
      const p = await Payslip.findById(req.params.id);
      if (!p || norm(p.email) !== m.email || !['approved', 'paid'].includes(p.status)) throw httpErr(404, 'Payslip not found');
      const cur = downloadView(p.download);
      if (cur.status !== 'approved') throw httpErr(403, cur.status === 'expired' ? 'Your download approval has expired. Request again.' : 'Download needs approval from your Head of Department.');
      p.download = { ...p.download, count: (p.download.count || 0) + 1, lastAt: new Date() };
      p.markModified('download');
      p.history.push({ by: m.name, byEmail: m.email, at: new Date(), action: 'downloaded' });
      await p.save();
      res.json(slipView(p.toObject()));
    } catch (e) { fail(res, e); }
  });

  router.get('/payroll/download-requests', async (req, res) => {
    try {
      const v = await viewer(req);
      if (!canDecideDownloads(v)) throw httpErr(403, 'Only a Head of Department or Admin approves payslip downloads.');
      const status = String(req.query.status || 'pending');
      const q = status === 'pending' ? { 'download.status': 'pending' } : { 'download.status': { $in: ['pending', 'approved', 'rejected'] } };
      const list = (await Payslip.find(q).sort({ updatedAt: -1 }).limit(300).lean()).filter((p) => canDecideDownloadOf(v, p));
      res.json({ requests: list.map((p) => ({ id: String(p._id), month: p.month, employeeName: p.employeeName, email: p.email, deptLabel: DEPT_LABEL[p.department] || p.department, designation: p.designation || p.role, branch: p.branch, net: p.net, download: downloadView(p.download) })) });
    } catch (e) { fail(res, e); }
  });

  router.post('/payroll/download-requests/:id/decision', async (req, res) => {
    try {
      const v = await viewer(req);
      if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(400, 'Invalid payslip');
      const p = await Payslip.findById(req.params.id);
      if (!p || !canDecideDownloadOf(v, p)) throw httpErr(404, 'Request not found');
      const decision = req.body?.decision === 'approve' ? 'approved' : req.body?.decision === 'reject' ? 'rejected' : '';
      if (!decision) throw httpErr(400, 'Choose approve or reject');
      if (!p.download || !['pending', 'approved'].includes(p.download.status)) throw httpErr(409, 'There is no open request for this payslip.');
      const now = new Date();
      p.download = { ...p.download, status: decision, decidedBy: v.name, decidedByEmail: v.email, decidedAt: now, note: String(req.body?.note || '').slice(0, 300), validUntil: decision === 'approved' ? new Date(now.getTime() + DOWNLOAD_HOURS * 3600000) : null };
      p.markModified('download');
      p.history.push({ by: v.name, byEmail: v.email, at: now, action: `download-${decision}`, note: p.download.note });
      await p.save();
      notify({ audience: p.department, recipientName: p.employeeName, type: 'payroll', title: decision === 'approved' ? `Payslip download approved (${p.month})` : `Payslip download not approved (${p.month})`, message: decision === 'approved' ? `You can download it for the next ${DOWNLOAD_HOURS} hours from My Payslips.` : (p.download.note || 'Contact your Head of Department.'), createdBy: v.name });
      res.json({ ok: true, download: downloadView(p.download) });
    } catch (e) { fail(res, e); }
  });

  router.get('/payroll/payslips/:id', async (req, res) => {
    try {
      const v = await viewer(req);
      if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(400, 'Invalid payslip');
      const p = await Payslip.findById(req.params.id).lean();
      const own = p && norm(p.email) === v.email && ['approved', 'paid'].includes(p.status);
      if (!p || (!own && !(v.access.canPrepare && canTouch(v, p)))) throw httpErr(404, 'Payslip not found');
      res.json(slipView(p));
    } catch (e) { fail(res, e); }
  });
}

