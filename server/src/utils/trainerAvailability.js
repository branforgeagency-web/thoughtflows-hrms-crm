// Trainer availability engine (pure functions — no database access).
// Used by the Head of Trainer Calendar, Availability finder, Consultations
// booking links and 1:1 Sessions. A trainer is busy when any of these overlap:
//   • outside their shift / on a week-off day / on leave (not rejected)
//   • an active batch's class time (Batch.scheduledTime on its days)
//   • a class in their weekly timetable (Trainer.scheduledClasses)
//   • a booked/confirmed demo (same slot can take up to DEMO_GROUP_CAPACITY)
//   • a scheduled/live 1:1 session

export const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DEMO_GROUP_CAPACITY = 6;
export const APP_TZ = process.env.APP_TZ || 'Asia/Kolkata';
const norm = (s = '') => String(s).trim().toLowerCase();
export const batchKey = (name = '') => String(name).toLowerCase().replace(/[^a-z0-9]/g, '');

// ---- dates & clock ---------------------------------------------------------
export function weekdayOf(date) {
  return WEEK[new Date(`${String(date).slice(0, 10)}T12:00:00Z`).getUTCDay()];
}

export function addDays(date, n) {
  const d = new Date(`${String(date).slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function dateRange(from, to, max = 62) {
  const out = [];
  for (let d = from; d <= to && out.length < max; d = addDays(d, 1)) out.push(d);
  return out;
}

// { date: 'YYYY-MM-DD', min } of a JS Date in the academy's time zone
export function zonedParts(when = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(when).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
}

export function fmtMin(m) {
  const mm = ((Math.round(m) % 1440) + 1440) % 1440;
  const h = Math.floor(mm / 60), mi = mm % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mi).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export const fmtSlot = (startMin, endMin) => `${fmtMin(startMin)}–${fmtMin(endMin)}`;

// "Weekdays", "Weekend", "Mon-Fri", "Mon - Sat", "Mon,Wed,Fri", "Daily", "" (= every day)
export function daysInclude(spec, wd) {
  const s = norm(spec);
  if (!s || /daily|all ?days|every ?day/.test(s)) return true;
  if (/weekday/.test(s)) return !['Sat', 'Sun'].includes(wd);
  if (/weekend/.test(s)) return ['Sat', 'Sun'].includes(wd);
  const idx = (t) => WEEK.findIndex((w) => norm(w) === norm(t).slice(0, 3));
  let any = false;
  for (const part of s.split(/[,/&]| and /)) {
    const range = part.split(/\s*(?:-|–|to)\s*/).map((x) => x.trim()).filter(Boolean);
    if (range.length === 2 && idx(range[0]) >= 0 && idx(range[1]) >= 0) {
      any = true;
      let i = idx(range[0]);
      const end = idx(range[1]);
      for (let k = 0; k < 7; k++) { if (WEEK[i] === wd) return true; if (i === end) break; i = (i + 1) % 7; }
    } else if (range.length === 1 && idx(range[0]) >= 0) {
      any = true;
      if (WEEK[idx(range[0])] === wd) return true;
    }
  }
  return !any; // unrecognised text → don't block
}

// "9-11 AM", "11.30- 01.30 PM", "6:00–8:00 AM", "2.30-4.30 PM", "10 AM - 12 PM", "9:30AM-KERALA"
export function parseRange(str, defaultMinutes = 120) {
  if (!str) return null;
  const s = String(str).replace(/(\d)\.(\d{2})/g, '$1:$2').replace(/[–—]/g, '-');
  const tok = '(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm|a\\.m\\.|p\\.m\\.)?';
  const toMin = (h, m, p) => {
    let hh = Number(h) % 12;
    if (p === 'pm') hh += 12;
    return hh * 60 + Number(m || 0);
  };
  const per = (p) => (p ? (p[0].toLowerCase() === 'p' ? 'pm' : 'am') : '');
  const two = s.match(new RegExp(`${tok}\\s*(?:-|to)\\s*${tok}`, 'i'));
  if (two) {
    let [, h1, m1, p1, h2, m2, p2] = two;
    p1 = per(p1); p2 = per(p2);
    if (!p1 && !p2) { const guess = Number(h1) < 7 || Number(h1) === 12 ? 'pm' : 'am'; p1 = guess; p2 = Number(h2) < 8 || Number(h2) === 12 ? 'pm' : guess; }
    if (!p2) p2 = p1;
    let start, end = toMin(h2, m2, p2);
    if (p1) start = toMin(h1, m1, p1);
    else {
      start = toMin(h1, m1, p2);
      if (start >= end) start = toMin(h1, m1, 'am');
    }
    if (end <= start) end = start + defaultMinutes;
    return { startMin: start, endMin: end };
  }
  const one = s.match(new RegExp(tok, 'i'));
  if (one && one[1]) {
    const p = per(one[3]) || (Number(one[1]) < 7 ? 'pm' : 'am');
    const start = toMin(one[1], one[2], p);
    return { startMin: start, endMin: start + defaultMinutes };
  }
  return null;
}

// ---- trainer facts ----------------------------------------------------------
export function trainerOnLeave(t, date) {
  const d = String(date || '').slice(0, 10);
  return (t.leaves || []).some((l) => l.from && l.status !== 'rejected' && d >= l.from && d <= (l.to || l.from));
}

export function trainerShift(t) {
  const start = Number.isFinite(t.shiftStartMin) ? t.shiftStartMin : 0;
  const end = Number.isFinite(t.shiftEndMin) ? t.shiftEndMin : 1440;
  return { start, end, label: t.shift || (start === 0 && end === 1440 ? 'Full day' : fmtSlot(start, end)) };
}

export function trainerTags(t) {
  const courses = [t.expertCourse, t.courseKey, t.specialization, ...(t.skills || []).map((s) => s.name)]
    .map((c) => String(c || '').trim()).filter(Boolean);
  return { courses: [...new Set(courses)], languages: t.languages || [], branch: t.branchName || '' };
}

// tags: { courses: [], languages: [], branches: [] } — every non-empty group must match
export function matchesTags(t, tags = {}) {
  const tt = trainerTags(t);
  const has = (list, want) => list.some((x) => { const a = norm(x), b = norm(want); return a && b && (a === b || a.includes(b) || b.includes(a)); });
  if ((tags.courses || []).length && !(tags.courses || []).some((c) => has(tt.courses, c))) return false;
  if ((tags.languages || []).length && !(tags.languages || []).some((l) => has(tt.languages, l))) return false;
  if ((tags.branches || []).length && !(tags.branches || []).some((b) => has([tt.branch], b))) return false;
  return true;
}

// Everything that keeps a trainer busy on one date.
// ctx: { batches: Batch[], demos: Demo[], sessions: OneOnOneSession[] } (any trainers / dates; filtered here)
export function trainerDayBusy(t, date, ctx = {}) {
  const wd = weekdayOf(date);
  const busy = [];
  const myBatches = (ctx.batches || []).filter((b) => b.trainerId === t.trainerId && ['active', 'forming', ''].includes(norm(b.status)));
  const batchNames = new Set(myBatches.map((b) => norm(b.batchName)));
  for (const b of myBatches) {
    if (b.startDate && String(b.startDate).slice(0, 10) > date) continue;
    if (!daysInclude(b.days, wd)) continue;
    const r = parseRange(b.scheduledTime);
    if (r) busy.push({ ...r, type: 'class', label: b.batchName || 'Batch class', batch: b.batchName, course: b.course || '' });
  }
  for (const c of t.scheduledClasses || []) {
    if (c.batch && batchNames.has(norm(c.batch))) continue; // already counted from the batch itself
    // Leftover entry of a batch that was deleted / completed / archived / emptied
    if (c.batch && ctx.staleBatchKeys && ctx.staleBatchKeys.has(batchKey(c.batch))) continue;
    if (!daysInclude(c.days || t.workingDays, wd)) continue;
    const r = Number.isFinite(c.startMin) && Number.isFinite(c.endMin) && c.endMin > c.startMin
      ? { startMin: c.startMin, endMin: c.endMin }
      : parseRange(c.timeSlot);
    if (r) busy.push({ ...r, type: 'class', label: c.batch || c.name || 'Class', batch: c.batch || c.name || '' });
  }
  const slots = {};
  for (const d of ctx.demos || []) {
    if (d.trainerId !== t.trainerId || d.preferredDate !== date) continue;
    if (!['booked', 'confirmed'].includes(norm(d.status))) continue;
    const key = d.timeSlot || d.time || '';
    const r = parseRange(key, 60);
    if (!r) continue;
    if (!slots[key]) { slots[key] = { ...r, type: 'demo', label: 'Demo', slotKey: key, count: 0 }; busy.push(slots[key]); }
    slots[key].count += 1;
  }
  for (const s of ctx.sessions || []) {
    if (s.trainerId !== t.trainerId || s.date !== date) continue;
    if (!['scheduled', 'live'].includes(s.status)) continue;
    busy.push({ startMin: s.startMin, endMin: s.endMin, type: 'one_on_one', label: `1:1 · ${s.studentName || 'Student'}` });
  }
  busy.sort((a, b) => a.startMin - b.startMin);
  return busy;
}

// Is the trainer free for [startMin, endMin) on date?
// opts.demoSlotKey: when booking a demo, an existing demo group at exactly this
// slot (below capacity) counts as free — the candidate joins that group.
export function checkTrainerFree(t, date, startMin, endMin, ctx = {}, opts = {}) {
  if (t.active === false) return { free: false, reason: 'Inactive' };
  if (trainerOnLeave(t, date)) return { free: false, reason: 'On leave' };
  const wd = weekdayOf(date);
  if (t.workingDays && !daysInclude(t.workingDays, wd)) return { free: false, reason: `Week off (${wd})` };
  const sh = trainerShift(t);
  const inShift = sh.end > sh.start
    ? startMin >= sh.start && endMin <= sh.end
    : startMin >= sh.start || endMin <= sh.end;
  if (!inShift) return { free: false, reason: `Outside shift (${sh.label})` };
  let joinsGroup = false;
  for (const b of trainerDayBusy(t, date, ctx)) {
    if (Math.max(b.startMin, startMin) >= Math.min(b.endMin, endMin)) continue;
    if (b.type === 'demo' && opts.demoSlotKey && b.slotKey === opts.demoSlotKey && b.count < DEMO_GROUP_CAPACITY) { joinsGroup = true; continue; }
    if (b.type === 'demo' && b.count >= DEMO_GROUP_CAPACITY) return { free: false, reason: `Demo group full ${fmtSlot(b.startMin, b.endMin)}` };
    return { free: false, reason: `${b.label} ${fmtSlot(b.startMin, b.endMin)}` };
  }
  return { free: true, reason: '', joinsGroup };
}
