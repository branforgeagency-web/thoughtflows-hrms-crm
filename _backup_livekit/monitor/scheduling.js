import mongoose from 'mongoose';
import { randomInt } from 'crypto';
import Trainer from '../models/Trainer.js';
import Batch from '../models/Batch.js';
import Demo from '../models/Demo.js';
import LiveClassSession from '../models/LiveClassSession.js';
import BookingLink from '../models/BookingLink.js';
import OneOnOneEnrollment from '../models/OneOnOneEnrollment.js';
import OneOnOneSession from '../models/OneOnOneSession.js';
import * as A from '../utils/trainerAvailability.js';
import { livekitConfigured, livekitUrl, livekitToken, endLivekitRoom, LIVEKIT_NOT_CONFIGURED } from '../utils/livekit.js';

// ============================================================================
// HEAD OF TRAINER — SCHEDULING (Wise-style)
//   Calendar        GET  /scheduling/calendar
//   Availability    GET  /scheduling/tags · POST /scheduling/availability
//   Consultations   /booking-links (Head) · /public/booking/:slug (candidate, no login)
//   1:1 Sessions    /one-on-one/* (Head) · /trainer/one-on-one/* (trainer) · /public/session/:code (student)
// ============================================================================

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randCode = (n = 10) => Array.from({ length: n }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
async function uniqueCode(Model, field, n = 10) {
  for (let i = 0; i < 8; i++) {
    const c = randCode(n);
    if (!(await Model.exists({ [field]: c }))) return c;
  }
  throw new Error('Could not generate a link, please try again');
}
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
const toInt = (v, d) => (v !== '' && v !== null && Number.isFinite(Number(v)) ? Math.round(Number(v)) : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const norm = (s = '') => String(s).trim().toLowerCase();
const looseEq = (a, b) => { const x = norm(a), y = norm(b); return Boolean(x && y && (x === y || x.includes(y) || y.includes(x))); };
const digits = (p) => String(p || '').replace(/\D/g, '');
const httpErr = (status, message, extra) => Object.assign(new Error(message), { status, extra });
const fail = (res, e) => res.status(e.status || 500).json({ error: e.message, ...(e.extra || {}) });
const DONE_DEMO = ['attended', 'missed', 'cancelled', 'no-show', 'noshow'];
const LIVE_WINDOW_MS = 4 * 36e5;
const TRAINER_FIELDS = 'trainerId trainerName branchName expertCourse courseKey specialization skills languages shift shiftStartMin shiftEndMin workingDays leaves scheduledClasses active';

export function registerSchedulingRoutes(router, deps) {
  const { createDemoRecord, ensureDemoClassroom, publicAppBase, pushNotification, sessionTrainerId, trainerOwnsRecord, isTrainerLeader, NOT_YOUR_RECORD } = deps;
  const requireLeader = (req) => { if (!isTrainerLeader(req)) throw httpErr(403, 'Only the Head of Trainer can do this.'); };
  const notify = (payload) => Promise.resolve().then(() => pushNotification(payload)).catch(() => {});

  async function loadCtx({ trainerIds, dates }) {
    const [batches, demos, sessions] = await Promise.all([
      Batch.find({ trainerId: { $in: trainerIds } }).select('batchName course trainerId scheduledTime days startDate status').lean(),
      Demo.find({ preferredDate: { $in: dates }, status: { $in: ['booked', 'confirmed'] } }).select('trainerId preferredDate timeSlot time status').lean(),
      OneOnOneSession.find({ date: { $in: dates }, status: { $in: ['scheduled', 'live'] } }).select('trainerId date startMin endMin status studentName').lean()
    ]);
    return { batches, demos, sessions };
  }
  const activeTrainers = () => Trainer.find({ active: { $ne: false } }).select(TRAINER_FIELDS).lean();

  // --------------------------------------------------------------------------
  // CALENDAR — classes (held / missed / upcoming), demos, 1:1 sessions
  // --------------------------------------------------------------------------
  router.get('/scheduling/calendar', async (req, res) => {
    try {
      const today = A.zonedParts();
      let from = isDate(req.query.from) ? req.query.from : today.date;
      let to = isDate(req.query.to) ? req.query.to : A.addDays(from, 6);
      if (to < from) [from, to] = [to, from];
      const dates = A.dateRange(from, to, 62);
      to = dates[dates.length - 1];
      const trainerId = String(req.query.trainerId || '');
      const branch = String(req.query.branch || '');
      const course = String(req.query.course || '');
      const types = String(req.query.types || 'class,demo,one_on_one').split(',');

      let trainers = await activeTrainers();
      if (trainerId) trainers = trainers.filter((t) => t.trainerId === trainerId);
      if (branch) trainers = trainers.filter((t) => A.matchesTags(t, { branches: [branch] }));
      const ids = trainers.map((t) => t.trainerId);
      const byId = new Map(trainers.map((t) => [t.trainerId, t]));

      const [batches, live, demos, sessions] = await Promise.all([
        Batch.find({ trainerId: { $in: ids } }).select('batchName course trainerId scheduledTime days startDate status').lean(),
        LiveClassSession.find({
          trainerId: { $in: ids },
          startedAt: { $gte: new Date(`${A.addDays(from, -1)}T00:00:00Z`), $lte: new Date(`${A.addDays(to, 1)}T23:59:59Z`) }
        }).select('trainerId trainerName batch course topic startedAt endedAt isLive').lean(),
        Demo.find({ preferredDate: { $gte: from, $lte: to } }).select('candidateName course trainerId trainer preferredDate timeSlot time status bookingLinkId').lean(),
        OneOnOneSession.find({ date: { $gte: from, $lte: to }, trainerId: { $in: ids } }).lean()
      ]);

      const events = [];
      if (types.includes('class')) {
        const held = live
          .map((l) => ({ ...l, z: A.zonedParts(new Date(l.startedAt)) }))
          .filter((l) => l.z.date >= from && l.z.date <= to);
        const used = new Set();
        for (const t of trainers) {
          for (const d of dates) {
            const onLeave = A.trainerOnLeave(t, d);
            for (const o of A.trainerDayBusy(t, d, { batches }).filter((b) => b.type === 'class')) {
              const match = held.find((l) => !used.has(String(l._id)) && l.trainerId === t.trainerId && l.z.date === d && looseEq(l.batch, o.batch));
              if (match) used.add(String(match._id));
              let status = 'scheduled';
              if (match) status = match.isLive && !match.endedAt ? 'live' : 'done';
              else if (onLeave) status = 'leave';
              else if (d < today.date || (d === today.date && today.min > o.endMin)) status = 'missed';
              events.push({
                id: `c-${t.trainerId}-${d}-${o.startMin}-${o.batch}`, type: 'class', date: d,
                startMin: match ? match.z.min : o.startMin, endMin: o.endMin,
                title: o.batch || o.label, course: o.course || '', trainerId: t.trainerId, trainerName: t.trainerName, status
              });
            }
          }
        }
        for (const l of held) {
          if (used.has(String(l._id))) continue;
          events.push({
            id: `l-${l._id}`, type: 'class', date: l.z.date, startMin: l.z.min, endMin: l.z.min + 120,
            title: l.batch || l.topic || 'Class', course: l.course || '', trainerId: l.trainerId,
            trainerName: l.trainerName || byId.get(l.trainerId)?.trainerName || '', status: l.isLive && !l.endedAt ? 'live' : 'done'
          });
        }
      }

      if (types.includes('demo')) {
        const groups = new Map();
        for (const d of demos) {
          if (d.trainerId && !byId.has(d.trainerId)) continue;
          if (!d.trainerId && (trainerId || branch)) continue;
          const slot = d.timeSlot || d.time || '';
          const key = `${d.trainerId || '-'}|${d.preferredDate}|${slot}`;
          if (!groups.has(key)) groups.set(key, { list: [], d, slot });
          groups.get(key).list.push(d);
        }
        for (const [key, g] of groups) {
          const r = A.parseRange(g.slot, 60) || { startMin: 0, endMin: 60 };
          const st = g.list.map((x) => norm(x.status));
          let status = 'booked';
          if (st.every((s) => s === 'attended')) status = 'done';
          else if (st.every((s) => DONE_DEMO.includes(s))) status = st.some((s) => s === 'attended') ? 'done' : 'missed';
          else if (st.some((s) => s === 'confirmed')) status = 'confirmed';
          events.push({
            id: `d-${key}`, type: 'demo', date: g.d.preferredDate, startMin: r.startMin, endMin: r.endMin,
            title: g.list.length > 1 ? `DEMO · ${g.list.length} candidates` : `DEMO · ${g.d.candidateName || ''}`,
            course: g.d.course || '', trainerId: g.d.trainerId || '', trainerName: g.d.trainer || byId.get(g.d.trainerId)?.trainerName || 'Unassigned',
            status, count: g.list.length, candidates: g.list.map((x) => x.candidateName)
          });
        }
      }

      if (types.includes('one_on_one')) {
        for (const s of sessions) {
          events.push({
            id: `o-${s._id}`, type: 'one_on_one', date: s.date, startMin: s.startMin, endMin: s.endMin,
            title: `1:1 · ${s.studentName || 'Student'}`, course: s.course || '', trainerId: s.trainerId, trainerName: s.trainerName,
            status: { completed: 'done', no_show: 'missed', cancelled: 'cancelled', live: 'live' }[s.status] || 'scheduled'
          });
        }
      }

      const filtered = course ? events.filter((e) => looseEq(e.course, course) || looseEq(e.title, course)) : events;
      filtered.sort((a, b) => (a.date === b.date ? a.startMin - b.startMin : a.date < b.date ? -1 : 1));
      res.json({
        from, to, today: today.date, events: filtered,
        trainers: trainers.map((t) => ({ trainerId: t.trainerId, trainerName: t.trainerName, branchName: t.branchName || '' }))
      });
    } catch (e) { fail(res, e); }
  });

  // --------------------------------------------------------------------------
  // AVAILABILITY — find trainers free for one or more sessions
  // --------------------------------------------------------------------------
  router.get('/scheduling/tags', async (req, res) => {
    try {
      const trainers = await activeTrainers();
      const uniq = (arr) => [...new Map(arr.filter(Boolean).map((x) => [norm(x), String(x).trim()])).values()].sort((a, b) => a.localeCompare(b));
      res.json({
        courses: uniq(trainers.flatMap((t) => A.trainerTags(t).courses)),
        languages: uniq(trainers.flatMap((t) => t.languages || [])),
        branches: uniq(trainers.map((t) => t.branchName)),
        trainers: trainers.map((t) => ({ trainerId: t.trainerId, trainerName: t.trainerName, branchName: t.branchName || '', expertCourse: t.expertCourse || '', languages: t.languages || [] }))
          .sort((a, b) => String(a.trainerName).localeCompare(String(b.trainerName)))
      });
    } catch (e) { fail(res, e); }
  });

  router.post('/scheduling/availability', async (req, res) => {
    try {
      const { tags = {}, durationMin = 60, sessions = [] } = req.body || {};
      const dur = clamp(toInt(durationMin, 60), 15, 480);
      const list = (Array.isArray(sessions) ? sessions : [])
        .filter((s) => isDate(s?.date) && Number.isFinite(Number(s?.startMin)))
        .slice(0, 60)
        .map((s) => ({ date: s.date, startMin: Number(s.startMin), endMin: Number(s.startMin) + dur }));
      if (!list.length) throw httpErr(400, 'Add at least one session (date and start time).');
      const trainers = (await activeTrainers()).filter((t) => A.matchesTags(t, tags));
      const ctx = await loadCtx({ trainerIds: trainers.map((t) => t.trainerId), dates: [...new Set(list.map((s) => s.date))] });
      const out = trainers.map((t) => {
        const results = list.map((s) => { const r = A.checkTrainerFree(t, s.date, s.startMin, s.endMin, ctx); return { ...s, free: r.free, reason: r.reason }; });
        const tg = A.trainerTags(t);
        return {
          trainerId: t.trainerId, trainerName: t.trainerName, branchName: tg.branch, courses: tg.courses, languages: tg.languages,
          shift: A.trainerShift(t).label, workingDays: t.workingDays || '',
          freeCount: results.filter((r) => r.free).length, total: list.length, results
        };
      }).sort((a, b) => b.freeCount - a.freeCount || String(a.trainerName).localeCompare(String(b.trainerName)));
      res.json({ durationMin: dur, sessions: list, trainers: out });
    } catch (e) { fail(res, e); }
  });

  // --------------------------------------------------------------------------
  // CONSULTATIONS — booking links (Head) + public booking page
  // --------------------------------------------------------------------------
  const linkView = (l, base, stats = {}) => ({
    id: String(l._id), slug: l.slug, name: l.name, durationMin: l.durationMin, courses: l.courses || [], languages: l.languages || [],
    branch: l.branch || '', hostMode: l.hostMode, trainerId: l.trainerId || '', trainerName: l.trainerName || '',
    days: l.days || [], windowStartMin: l.windowStartMin, windowEndMin: l.windowEndMin, minNoticeHours: l.minNoticeHours,
    maxDaysAhead: l.maxDaysAhead, active: l.active !== false, url: `${base}/book/${l.slug}`,
    upcoming: stats.upcoming || 0, total: stats.total || 0, createdAt: l.createdAt
  });

  async function cleanLinkInput(b = {}) {
    const out = {};
    if (b.name !== undefined) { out.name = String(b.name).trim().slice(0, 120); if (!out.name) throw httpErr(400, 'Give the booking link a name'); }
    if (b.durationMin !== undefined) out.durationMin = clamp(toInt(b.durationMin, 60), 15, 240);
    if (b.courses !== undefined) out.courses = (Array.isArray(b.courses) ? b.courses : []).map((c) => String(c).trim()).filter(Boolean).slice(0, 40);
    if (b.languages !== undefined) out.languages = (Array.isArray(b.languages) ? b.languages : []).map((c) => String(c).trim()).filter(Boolean).slice(0, 10);
    if (b.branch !== undefined) out.branch = String(b.branch || '').trim();
    if (b.days !== undefined) out.days = (Array.isArray(b.days) ? b.days : []).filter((d) => A.WEEK.includes(d));
    if (b.windowStartMin !== undefined) out.windowStartMin = clamp(toInt(b.windowStartMin, 600), 0, 1439);
    if (b.windowEndMin !== undefined) out.windowEndMin = clamp(toInt(b.windowEndMin, 1080), 1, 1440);
    if (b.minNoticeHours !== undefined) out.minNoticeHours = clamp(toInt(b.minNoticeHours, 2), 0, 168);
    if (b.maxDaysAhead !== undefined) out.maxDaysAhead = clamp(toInt(b.maxDaysAhead, 14), 1, 90);
    if (b.active !== undefined) out.active = Boolean(b.active);
    if (b.hostMode !== undefined) {
      out.hostMode = b.hostMode === 'trainer' ? 'trainer' : 'auto';
      if (out.hostMode === 'trainer') {
        const t = await Trainer.findOne({ trainerId: String(b.trainerId || '') }).select('trainerId trainerName').lean();
        if (!t) throw httpErr(400, 'Choose the trainer who hosts this link');
        out.trainerId = t.trainerId; out.trainerName = t.trainerName;
      } else { out.trainerId = ''; out.trainerName = ''; }
    }
    if (out.days && !out.days.length) throw httpErr(400, 'Pick at least one day');
    if (out.windowStartMin !== undefined && out.windowEndMin !== undefined && out.windowEndMin <= out.windowStartMin) throw httpErr(400, 'The end time must be after the start time');
    return out;
  }

  router.get('/booking-links', async (req, res) => {
    try {
      const links = await BookingLink.find().sort({ createdAt: -1 }).lean();
      const today = A.zonedParts().date;
      const demos = await Demo.find({ bookingLinkId: { $in: links.map((l) => String(l._id)) } }).select('bookingLinkId preferredDate status').lean();
      const stats = {};
      for (const d of demos) {
        const s = (stats[d.bookingLinkId] ||= { total: 0, upcoming: 0 });
        s.total += 1;
        if (d.preferredDate >= today && !DONE_DEMO.includes(norm(d.status))) s.upcoming += 1;
      }
      const base = publicAppBase(req);
      res.json(links.map((l) => linkView(l, base, stats[String(l._id)])));
    } catch (e) { fail(res, e); }
  });

  router.post('/booking-links', async (req, res) => {
    try {
      requireLeader(req);
      const data = await cleanLinkInput({ hostMode: 'auto', ...req.body });
      if (!data.name) throw httpErr(400, 'Give the booking link a name');
      const link = await BookingLink.create({ ...data, slug: await uniqueCode(BookingLink, 'slug', 10), createdBy: req.user?.name || '' });
      res.status(201).json(linkView(link.toObject(), publicAppBase(req)));
    } catch (e) { fail(res, e); }
  });

  router.put('/booking-links/:id', async (req, res) => {
    try {
      requireLeader(req);
      if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(400, 'Invalid link');
      const data = await cleanLinkInput(req.body || {});
      const current = await BookingLink.findById(req.params.id).lean();
      if (!current) throw httpErr(404, 'Booking link not found');
      const ws = data.windowStartMin ?? current.windowStartMin;
      const we = data.windowEndMin ?? current.windowEndMin;
      if (we <= ws) throw httpErr(400, 'The end time must be after the start time');
      const link = await BookingLink.findByIdAndUpdate(req.params.id, { $set: data }, { new: true }).lean();
      res.json(linkView(link, publicAppBase(req)));
    } catch (e) { fail(res, e); }
  });

  router.delete('/booking-links/:id', async (req, res) => {
    try {
      requireLeader(req);
      if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(400, 'Invalid link');
      await BookingLink.deleteOne({ _id: req.params.id });
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });

  router.get('/booking-links/bookings', async (req, res) => {
    try {
      const today = A.zonedParts().date;
      const scope = req.query.scope === 'past' ? 'past' : 'upcoming';
      const q = { bookingLinkId: req.query.linkId ? String(req.query.linkId) : { $nin: ['', null] } };
      const demos = await Demo.find(q).sort({ preferredDate: scope === 'past' ? -1 : 1, createdAt: -1 }).limit(500)
        .select('candidateName phone email course language preferredDate timeSlot trainer trainerId status link bookingLinkId createdAt').lean();
      const links = new Map((await BookingLink.find().select('name').lean()).map((l) => [String(l._id), l.name]));
      const isUpcoming = (d) => d.preferredDate >= today && !DONE_DEMO.includes(norm(d.status));
      res.json(demos.filter((d) => (scope === 'upcoming' ? isUpcoming(d) : !isUpcoming(d))).map((d) => ({
        id: String(d._id), candidateName: d.candidateName, phone: d.phone, email: d.email, course: d.course, language: d.language,
        date: d.preferredDate, timeSlot: d.timeSlot, trainerName: d.trainer || 'Unassigned', status: d.status,
        joinLink: d.link || '', linkName: links.get(d.bookingLinkId) || 'Deleted link', bookedAt: d.createdAt
      })));
    } catch (e) { fail(res, e); }
  });

  // ---- public booking page (no login) ----
  async function linkBySlug(slug) {
    const l = await BookingLink.findOne({ slug: String(slug) }).lean();
    if (!l || l.active === false) throw httpErr(404, 'This booking link is not active. Please contact Thoughtflows Academy.');
    return l;
  }
  function linkDates(l) {
    const now = A.zonedParts();
    const out = [];
    for (let i = 0; i <= (l.maxDaysAhead || 14); i++) {
      const d = A.addDays(now.date, i);
      if ((l.days || []).includes(A.weekdayOf(d))) out.push(d);
    }
    return out;
  }
  async function linkPool(l, course, language) {
    const trainers = await activeTrainers();
    if (l.hostMode === 'trainer') return trainers.filter((t) => t.trainerId === l.trainerId);
    return trainers.filter((t) => A.matchesTags(t, {
      courses: course ? [course] : [], languages: language ? [language] : [], branches: l.branch ? [l.branch] : []
    }));
  }
  function earliestStart(l, date) {
    const now = A.zonedParts();
    const dayDiff = Math.round((new Date(`${date}T12:00:00Z`) - new Date(`${now.date}T12:00:00Z`)) / 864e5);
    return now.min + (l.minNoticeHours || 0) * 60 - dayDiff * 1440;
  }
  function linkSlots(l, date, pool, ctx) {
    const dur = l.durationMin || 60;
    const minStart = earliestStart(l, date);
    const out = [];
    for (let m = l.windowStartMin; m + dur <= l.windowEndMin; m += dur) {
      if (m < minStart) continue;
      const slotKey = A.fmtSlot(m, m + dur);
      const free = pool.filter((t) => A.checkTrainerFree(t, date, m, m + dur, ctx, { demoSlotKey: slotKey }).free);
      out.push({ startMin: m, label: A.fmtMin(m), timeSlot: slotKey, available: free.length > 0 });
    }
    return out;
  }
  function pickTrainer(pool, date, m, dur, ctx) {
    const slotKey = A.fmtSlot(m, m + dur);
    const cands = pool
      .map((t) => ({ t, r: A.checkTrainerFree(t, date, m, m + dur, ctx, { demoSlotKey: slotKey }), load: A.trainerDayBusy(t, date, ctx).length }))
      .filter((x) => x.r.free)
      .sort((a, b) => (b.r.joinsGroup === true) - (a.r.joinsGroup === true) || a.load - b.load);
    return cands[0]?.t || null;
  }

  router.get('/public/booking/:slug', async (req, res) => {
    try {
      const l = await linkBySlug(req.params.slug);
      res.json({
        name: l.name, durationMin: l.durationMin, courses: l.courses || [], languages: l.languages || [],
        branch: l.branch || '', hostName: l.hostMode === 'trainer' ? l.trainerName : '', dates: linkDates(l)
      });
    } catch (e) { fail(res, e); }
  });

  router.get('/public/booking/:slug/slots', async (req, res) => {
    try {
      const l = await linkBySlug(req.params.slug);
      const date = String(req.query.date || '');
      if (!linkDates(l).includes(date)) return res.json({ date, slots: [] });
      const pool = await linkPool(l, String(req.query.course || ''), String(req.query.language || ''));
      const ctx = await loadCtx({ trainerIds: pool.map((t) => t.trainerId), dates: [date] });
      res.json({ date, slots: linkSlots(l, date, pool, ctx) });
    } catch (e) { fail(res, e); }
  });

  router.post('/public/booking/:slug', async (req, res) => {
    try {
      const l = await linkBySlug(req.params.slug);
      const b = req.body || {};
      const name = String(b.name || '').trim().slice(0, 80);
      const phone = digits(b.phone).slice(-12);
      const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
      const course = String(b.course || (l.courses || [])[0] || '').trim();
      const language = String(b.language || (l.languages || [])[0] || 'Tamil').trim();
      const date = String(b.date || '');
      const startMin = toInt(b.startMin, -1);
      if (name.length < 2) throw httpErr(400, 'Please enter your name');
      if (phone.length < 10) throw httpErr(400, 'Please enter a valid mobile number');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpErr(400, 'Please enter a valid email or leave it empty');
      if (!course) throw httpErr(400, 'Please choose a course');
      if ((l.courses || []).length && !l.courses.some((c) => norm(c) === norm(course))) throw httpErr(400, 'Please choose a course');
      if (!linkDates(l).includes(date)) throw httpErr(400, 'Please choose an available date');
      const dur = l.durationMin || 60;
      if (startMin < l.windowStartMin || startMin + dur > l.windowEndMin || startMin < earliestStart(l, date)) throw httpErr(400, 'Please choose an available time');
      const timeSlot = A.fmtSlot(startMin, startMin + dur);

      const already = await Demo.findOne({ bookingLinkId: String(l._id), preferredDate: date, timeSlot, phone: new RegExp(`${phone.slice(-10)}$`) }).lean();
      if (already) return res.json({ ok: true, joinLink: already.link, date, timeSlot, trainerName: already.trainer, course: already.course, existing: true });

      const pool = await linkPool(l, course, language);
      const ctx = await loadCtx({ trainerIds: pool.map((t) => t.trainerId), dates: [date] });
      const trainer = pickTrainer(pool, date, startMin, dur, ctx);
      if (!trainer) throw httpErr(409, 'Sorry, that time was just taken. Please pick another slot.');

      const demo = await createDemoRecord({
        candidateName: name, phone, email, course, language,
        location: l.branch || trainer.branchName || '', branch: l.branch || trainer.branchName || '',
        preferredDate: date, timeSlot, trainer: trainer.trainerName, trainerId: trainer.trainerId,
        bookedBy: `Booking link · ${l.name}`, status: 'booked', source: 'booking_link', bookingLinkId: String(l._id)
      }, req);
      const withRoom = await ensureDemoClassroom(demo, publicAppBase(req));
      notify({
        audience: 'trainer', recipientId: trainer.trainerId, recipientName: trainer.trainerName, type: 'demo',
        title: `New demo booked: ${name}`, message: `${course} · ${date} ${timeSlot} — booked through "${l.name}".`,
        demoId: String(demo._id), createdBy: 'Booking link'
      });
      res.status(201).json({ ok: true, joinLink: withRoom.link, date, timeSlot, trainerName: trainer.trainerName, course });
    } catch (e) { fail(res, e); }
  });

  // --------------------------------------------------------------------------
  // 1:1 SESSIONS
  // --------------------------------------------------------------------------
  const sessionView = (s, base) => ({
    id: String(s._id), enrollmentId: s.enrollmentId, studentName: s.studentName, phone: s.phone || '', course: s.course,
    trainerId: s.trainerId, trainerName: s.trainerName, date: s.date, startMin: s.startMin, endMin: s.endMin,
    timeSlot: A.fmtSlot(s.startMin, s.endMin), topic: s.topic || '', status: s.status, creditCharged: Boolean(s.creditCharged),
    joinLink: s.joinCode ? `${base}/join/session/${s.joinCode}` : '', studentJoinedAt: s.studentJoinedAt, endedAt: s.endedAt
  });
  const enrollmentView = (e, sessions = []) => {
    const pending = sessions.filter((s) => ['scheduled', 'live'].includes(s.status));
    const today = A.zonedParts().date;
    const next = pending.filter((s) => s.date >= today).sort((a, b) => (a.date === b.date ? a.startMin - b.startMin : a.date < b.date ? -1 : 1))[0];
    return {
      id: String(e._id), studentId: e.studentId || '', studentName: e.studentName, phone: e.phone || '', email: e.email || '',
      course: e.course || '', trainerId: e.trainerId, trainerName: e.trainerName, totalCredits: e.totalCredits, usedCredits: e.usedCredits,
      remainingCredits: Math.max(0, e.totalCredits - e.usedCredits), scheduledCount: pending.length,
      canSchedule: Math.max(0, e.totalCredits - e.usedCredits - pending.length), sessionMinutes: e.sessionMinutes,
      status: e.status, notes: e.notes || '', nextSession: next ? { date: next.date, timeSlot: A.fmtSlot(next.startMin, next.endMin) } : null,
      completedCount: sessions.filter((s) => s.status === 'completed').length, createdAt: e.createdAt
    };
  };

  // Credits: completed / no-show use one credit; anything else gives it back
  async function setSessionStatus(sess, status) {
    const charge = ['completed', 'no_show'].includes(status);
    if (charge && !sess.creditCharged) {
      await OneOnOneEnrollment.updateOne({ _id: sess.enrollmentId }, { $inc: { usedCredits: 1 } });
      sess.creditCharged = true;
    } else if (!charge && status !== 'live' && sess.creditCharged) {
      await OneOnOneEnrollment.updateOne({ _id: sess.enrollmentId, usedCredits: { $gt: 0 } }, { $inc: { usedCredits: -1 } });
      sess.creditCharged = false;
    }
    if (sess.status === 'live' && status !== 'live') {
      await endLivekitRoom(sess.roomName);
      sess.endedAt = new Date();
    }
    sess.status = status;
  }

  router.get('/one-on-one/enrollments', async (req, res) => {
    try {
      const q = {};
      if (req.query.trainerId) q.trainerId = String(req.query.trainerId);
      const list = await OneOnOneEnrollment.find(q).sort({ createdAt: -1 }).lean();
      const sessions = await OneOnOneSession.find({ enrollmentId: { $in: list.map((e) => String(e._id)) } }).select('enrollmentId date startMin endMin status').lean();
      const by = {};
      sessions.forEach((s) => { (by[s.enrollmentId] ||= []).push(s); });
      res.json(list.map((e) => enrollmentView(e, by[String(e._id)])));
    } catch (e) { fail(res, e); }
  });

  router.post('/one-on-one/enrollments', async (req, res) => {
    try {
      requireLeader(req);
      const b = req.body || {};
      const studentName = String(b.studentName || '').trim();
      if (!studentName) throw httpErr(400, 'Student name is required');
      const t = await Trainer.findOne({ trainerId: String(b.trainerId || '') }).select('trainerId trainerName').lean();
      if (!t) throw httpErr(400, 'Choose a trainer');
      const e = await OneOnOneEnrollment.create({
        studentId: String(b.studentId || ''), studentName, phone: digits(b.phone), email: String(b.email || '').trim(),
        course: String(b.course || '').trim(), trainerId: t.trainerId, trainerName: t.trainerName,
        totalCredits: clamp(toInt(b.totalCredits, 10), 1, 500), sessionMinutes: clamp(toInt(b.sessionMinutes, 60), 15, 240),
        notes: String(b.notes || '').slice(0, 1000), createdBy: req.user?.name || ''
      });
      notify({ audience: 'trainer', recipientId: t.trainerId, recipientName: t.trainerName, type: 'one_on_one', title: `New 1:1 student: ${studentName}`, message: `${e.course || 'Course'} · ${e.totalCredits} sessions assigned to you.`, createdBy: req.user?.name || '' });
      res.status(201).json(enrollmentView(e.toObject(), []));
    } catch (e) { fail(res, e); }
  });

  router.put('/one-on-one/enrollments/:id', async (req, res) => {
    try {
      requireLeader(req);
      if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(400, 'Invalid enrollment');
      const e = await OneOnOneEnrollment.findById(req.params.id);
      if (!e) throw httpErr(404, 'Enrollment not found');
      const b = req.body || {};
      if (b.trainerId && b.trainerId !== e.trainerId) {
        const t = await Trainer.findOne({ trainerId: String(b.trainerId) }).select('trainerId trainerName').lean();
        if (!t) throw httpErr(400, 'Trainer not found');
        e.trainerId = t.trainerId; e.trainerName = t.trainerName;
        // Upcoming sessions move to the new trainer
        await OneOnOneSession.updateMany({ enrollmentId: String(e._id), status: 'scheduled' }, { $set: { trainerId: t.trainerId, trainerName: t.trainerName } });
      }
      if (b.totalCredits !== undefined) e.totalCredits = clamp(toInt(b.totalCredits, e.totalCredits), e.usedCredits, 500);
      if (b.sessionMinutes !== undefined) e.sessionMinutes = clamp(toInt(b.sessionMinutes, 60), 15, 240);
      if (b.status && ['active', 'paused', 'completed'].includes(b.status)) e.status = b.status;
      if (b.notes !== undefined) e.notes = String(b.notes).slice(0, 1000);
      if (b.course !== undefined) e.course = String(b.course).trim();
      await e.save();
      const sessions = await OneOnOneSession.find({ enrollmentId: String(e._id) }).select('date startMin endMin status').lean();
      res.json(enrollmentView(e.toObject(), sessions));
    } catch (e) { fail(res, e); }
  });

  router.get('/one-on-one/sessions', async (req, res) => {
    try {
      const q = {};
      if (req.query.enrollmentId) q.enrollmentId = String(req.query.enrollmentId);
      if (req.query.trainerId) q.trainerId = String(req.query.trainerId);
      if (isDate(req.query.from) || isDate(req.query.to)) {
        q.date = {};
        if (isDate(req.query.from)) q.date.$gte = req.query.from;
        if (isDate(req.query.to)) q.date.$lte = req.query.to;
      }
      const list = await OneOnOneSession.find(q).sort({ date: 1, startMin: 1 }).limit(500).lean();
      const base = publicAppBase(req);
      res.json(list.map((s) => sessionView(s, base)));
    } catch (e) { fail(res, e); }
  });

  router.post('/one-on-one/enrollments/:id/sessions', async (req, res) => {
    try {
      requireLeader(req);
      if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(400, 'Invalid enrollment');
      const e = await OneOnOneEnrollment.findById(req.params.id).lean();
      if (!e) throw httpErr(404, 'Enrollment not found');
      if (e.status !== 'active') throw httpErr(400, `This enrollment is ${e.status}. Set it to active to schedule sessions.`);
      const b = req.body || {};
      const dur = e.sessionMinutes || 60;
      const list = (Array.isArray(b.sessions) ? b.sessions : [])
        .filter((s) => isDate(s?.date) && Number.isFinite(Number(s?.startMin)))
        .slice(0, 100)
        .map((s) => { const st = clamp(Number(s.startMin), 0, 1440 - dur); return { date: s.date, startMin: st, endMin: st + dur }; });
      if (!list.length) throw httpErr(400, 'Pick a date and time');
      const pendingCount = await OneOnOneSession.countDocuments({ enrollmentId: String(e._id), status: { $in: ['scheduled', 'live'] } });
      const canSchedule = e.totalCredits - e.usedCredits - pendingCount;
      if (list.length > canSchedule) throw httpErr(400, `Only ${Math.max(0, canSchedule)} credit(s) left to schedule. Add credits first.`);
      const t = await Trainer.findOne({ trainerId: e.trainerId }).select(TRAINER_FIELDS).lean();
      if (!t) throw httpErr(400, 'The assigned trainer no longer exists. Change the trainer first.');
      if (!b.force) {
        const ctx = await loadCtx({ trainerIds: [t.trainerId], dates: [...new Set(list.map((s) => s.date))] });
        const conflicts = list.map((s) => ({ ...s, ...A.checkTrainerFree(t, s.date, s.startMin, s.endMin, ctx) })).filter((r) => !r.free)
          .map((r) => ({ date: r.date, startMin: r.startMin, timeSlot: A.fmtSlot(r.startMin, r.endMin), reason: r.reason }));
        if (conflicts.length) throw httpErr(409, `${t.trainerName} is busy for ${conflicts.length} of these session(s).`, { conflicts });
      }
      const created = [];
      for (const s of list) {
        const doc = new OneOnOneSession({
          enrollmentId: String(e._id), studentId: e.studentId, studentName: e.studentName, phone: e.phone, course: e.course,
          trainerId: e.trainerId, trainerName: e.trainerName, ...s, topic: String(b.topic || '').slice(0, 200),
          joinCode: await uniqueCode(OneOnOneSession, 'joinCode', 10), createdBy: req.user?.name || ''
        });
        doc.roomName = `tf-1on1-${doc._id}`;
        await doc.save();
        created.push(doc.toObject());
      }
      notify({
        audience: 'trainer', recipientId: e.trainerId, recipientName: e.trainerName, type: 'one_on_one',
        title: `1:1 scheduled: ${e.studentName}`,
        message: `${created.length} session(s) from ${created[0].date} ${A.fmtSlot(created[0].startMin, created[0].endMin)}. Start them from Class Session Room → 1:1 Sessions.`,
        createdBy: req.user?.name || ''
      });
      const base = publicAppBase(req);
      res.status(201).json(created.map((s) => sessionView(s, base)));
    } catch (e) { fail(res, e); }
  });

  router.put('/one-on-one/sessions/:id', async (req, res) => {
    try {
      requireLeader(req);
      if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(400, 'Invalid session');
      const sess = await OneOnOneSession.findById(req.params.id);
      if (!sess) throw httpErr(404, 'Session not found');
      const b = req.body || {};
      if (isDate(b.date) || b.startMin !== undefined) {
        if (sess.status !== 'scheduled') throw httpErr(400, 'Only a scheduled session can be moved');
        const len = sess.endMin - sess.startMin;
        const date = isDate(b.date) ? b.date : sess.date;
        const startMin = b.startMin !== undefined ? clamp(toInt(b.startMin, sess.startMin), 0, 1440 - len) : sess.startMin;
        const endMin = startMin + len;
        if (!b.force) {
          const t = await Trainer.findOne({ trainerId: sess.trainerId }).select(TRAINER_FIELDS).lean();
          const ctx = await loadCtx({ trainerIds: [sess.trainerId], dates: [date] });
          ctx.sessions = ctx.sessions.filter((x) => String(x._id) !== String(sess._id));
          const r = t ? A.checkTrainerFree(t, date, startMin, endMin, ctx) : { free: true };
          if (!r.free) throw httpErr(409, `${sess.trainerName} is busy: ${r.reason}`, { conflicts: [{ date, startMin, timeSlot: A.fmtSlot(startMin, endMin), reason: r.reason }] });
        }
        Object.assign(sess, { date, startMin, endMin });
      }
      if (b.topic !== undefined) sess.topic = String(b.topic).slice(0, 200);
      if (b.status && ['scheduled', 'completed', 'no_show', 'cancelled'].includes(b.status)) await setSessionStatus(sess, b.status);
      await sess.save();
      res.json(sessionView(sess.toObject(), publicAppBase(req)));
    } catch (e) { fail(res, e); }
  });

  // ---- trainer conducts the session ----
  router.get('/trainer/one-on-one', async (req, res) => {
    try {
      const trainerId = sessionTrainerId(req);
      if (!trainerId) return res.json([]);
      const today = A.zonedParts().date;
      const list = await OneOnOneSession.find({
        trainerId,
        $or: [{ status: { $in: ['scheduled', 'live'] }, date: { $gte: A.addDays(today, -1) } }, { date: today }]
      }).sort({ date: 1, startMin: 1 }).limit(60).lean();
      const base = publicAppBase(req);
      res.json(list.map((s) => sessionView(s, base)));
    } catch (e) { fail(res, e); }
  });

  router.get('/trainer/one-on-one/:id/join', async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(400, 'Invalid session');
      const sess = await OneOnOneSession.findById(req.params.id);
      if (!sess) throw httpErr(404, 'Session not found');
      if (!trainerOwnsRecord(req, sess)) return res.status(403).json(NOT_YOUR_RECORD);
      if (!['scheduled', 'live'].includes(sess.status)) throw httpErr(409, `This session is already ${sess.status.replace('_', ' ')}.`);
      if (!livekitConfigured()) throw httpErr(503, LIVEKIT_NOT_CONFIGURED);
      if (!sess.roomName) sess.roomName = `tf-1on1-${sess._id}`;
      sess.status = 'live';
      sess.liveAt = new Date();
      await sess.save();
      const token = livekitToken({ room: sess.roomName, identity: `trainer-${sess.trainerId}`, name: sess.trainerName || 'Trainer', host: true, metadata: { oneOnOneId: String(sess._id) } });
      res.json({ provider: 'livekit', serverUrl: livekitUrl(), token, roomName: sess.roomName });
    } catch (e) { fail(res, e); }
  });

  router.post('/trainer/one-on-one/:id/end', async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) throw httpErr(400, 'Invalid session');
      const sess = await OneOnOneSession.findById(req.params.id);
      if (!sess) throw httpErr(404, 'Session not found');
      if (!trainerOwnsRecord(req, sess)) return res.status(403).json(NOT_YOUR_RECORD);
      const outcome = req.body?.outcome === 'no_show' ? 'no_show' : 'completed';
      if (['scheduled', 'live'].includes(sess.status)) await setSessionStatus(sess, outcome);
      await endLivekitRoom(sess.roomName);
      if (!sess.endedAt) sess.endedAt = new Date();
      await sess.save();
      res.json(sessionView(sess.toObject(), publicAppBase(req)));
    } catch (e) { fail(res, e); }
  });

  // ---- student joins with the no-login link ----
  const sessionLive = (s) => s.status === 'live' && s.liveAt && (Date.now() - new Date(s.liveAt).getTime()) < LIVE_WINDOW_MS;

  router.get('/public/session/:code', async (req, res) => {
    try {
      const s = await OneOnOneSession.findOne({ joinCode: String(req.params.code) }).lean();
      if (!s) throw httpErr(404, 'This class link is not valid. Please ask Thoughtflows Academy for a new link.');
      res.json({
        candidateName: s.studentName, course: s.course, trainer: s.trainerName, preferredDate: s.date,
        timeSlot: A.fmtSlot(s.startMin, s.endMin), isLive: sessionLive(s),
        ended: ['completed', 'no_show', 'cancelled'].includes(s.status), cancelled: s.status === 'cancelled'
      });
    } catch (e) { fail(res, e); }
  });

  router.post('/public/session/:code/join', async (req, res) => {
    try {
      if (!livekitConfigured()) throw httpErr(503, 'The classroom is temporarily unavailable. Please contact your trainer.');
      const s = await OneOnOneSession.findOne({ joinCode: String(req.params.code) });
      if (!s) throw httpErr(404, 'This class link is not valid. Please ask Thoughtflows Academy for a new link.');
      if (!sessionLive(s)) throw httpErr(409, 'Your trainer has not started the class yet. Keep this page open — it will let you in as soon as it starts.', { waiting: true });
      if (!s.studentJoinedAt) { s.studentJoinedAt = new Date(); await s.save(); }
      const token = livekitToken({ room: s.roomName, identity: `student1on1-${s.enrollmentId}`, name: s.studentName || 'Student', host: false, metadata: { oneOnOneId: String(s._id) } });
      res.json({ provider: 'livekit', serverUrl: livekitUrl(), token, roomName: s.roomName });
    } catch (e) { fail(res, e); }
  });
}
