// ============================================================================
// ATTENDANCE SHEET IMPORT — turns the monthly LOGIN / LOGOUT / EOD sheet that
// branches keep in Excel / Google Sheets into per-day attendance codes that
// payroll understands (P, HD, HL, L, A, WO, H, '' = month not over yet).
//
// Expected layout (the same as the November sheet):
//   header row  : DATE | DAY | NAME 1 |  |  | NAME 2 |  |  | ...
//   sub-header  :      |     | LOGIN | LOGOUT | EOD | LOGIN | LOGOUT | EOD ...
//   day rows    : Nov 1 | Sunday | 9.00 AM | 6.00 PM | Done | WEEKOFF | | | ...
// A name may sit on its LOGIN column or one or two columns to the right.
// Cell words understood: WEEKOFF / WEEK OFF, ... HOLIDAY, LEAVE, ML,
// MEDICAL LEAVE, HALF DAY LEAVE, HALF DAY ML, DISCONTINUED, ABSENT.
// ============================================================================

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const up = (v) => clean(v).toUpperCase();
const pad = (n) => String(n).padStart(2, '0');
const isLoginHead = (v) => /^LOG\s*-?\s*IN$/.test(up(v));
const isLogoutHead = (v) => /^LOG\s*-?\s*OUT$/.test(up(v));
const isEodHead = (v) => /^E\.?O\.?D\.?$/.test(up(v));
const hhmm = (m) => (m === null || m === undefined ? '' : `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`);

export const DEFAULT_IMPORT_OPTIONS = {
  leave: 'unpaid', // "LEAVE" cells: 'unpaid' (LOP) | 'paid'
  ml: 'paid', //      "ML" / medical leave: 'paid' | 'unpaid'
  blank: 'absent', // empty cell on a day that is over: 'absent' (LOP) | 'present'
  halfDayMinutes: 240 // logged-in time below this = half day
};

// First time in a cell → minutes after midnight. kind: 'in' | 'out'
export function parseTime(text, kind = 'in', loginMin = null) {
  const s = clean(text).toUpperCase();
  const m = s.match(/(\d{1,2})\s*[.:]+\s*(\d{2})(?:\s*:\s*\d{2})?\s*(AM|PM|A\.M\.?|P\.M\.?)?/) || s.match(/(\d{1,2})()\s*(AM|PM)/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const ap = (m[3] || '').replace(/\./g, '');
  if (h > 23 || min > 59) return null;
  if (kind === 'in') {
    if (h >= 13) return h * 60 + min; // 24-hour clock
    if (h === 12) return (ap === 'AM' ? 0 : 12) * 60 + min;
    // "9:48 PM" as a login is a typing slip — mornings are 6–11
    if (h >= 6) return h * 60 + min;
    return (h + 12) * 60 + min; // 1–5 → afternoon login
  }
  let v = h >= 13 ? h * 60 + min : (h % 12 + (ap === 'PM' ? 12 : 0)) * 60 + min;
  if (loginMin !== null && v <= loginMin && v + 720 < 24 * 60) v += 720; // "6:30" or "7:03 AM" after a 9 AM login
  else if (loginMin !== null && !ap && h < 12 && v - loginMin < 180) v += 720; // "1:10" with no AM/PM = afternoon
  return v;
}

// One sheet date cell → 'YYYY-MM-DD' (the month comes from the chosen month when missing)
export function parseSheetDate(cell, month) {
  const [Y, M] = month.split('-').map(Number);
  const s = clean(cell);
  if (!s) return '';
  let y = Y, mo = M, d;
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/))) { d = +m[1]; mo = +m[2]; y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; }
  else if ((m = s.match(/^([A-Za-z]{3,9})\.?\s*[-/ ]?\s*(\d{1,2})(?:st|nd|rd|th)?(?:[,\s-]+(\d{4}))?$/))) { mo = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1; d = +m[2]; if (m[3]) y = +m[3]; }
  else if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s*[-/ ]\s*([A-Za-z]{3,9})\.?(?:[,\s-]+(\d{2,4}))?$/))) { d = +m[1]; mo = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1; if (m[3]) y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; }
  else if ((m = s.match(/^(\d{1,2})$/))) { d = +m[1]; }
  else return '';
  if (!mo || mo < 1 || mo > 12 || !d || d < 1 || d > 31) return '';
  return `${y}-${pad(mo)}-${pad(d)}`;
}

// login / logout / eod cells of one person on one date → day record (code '' = no data)
export function classifyDay(loginCell, logoutCell, eodCell, opts = DEFAULT_IMPORT_OPTIONS) {
  const L = clean(loginCell), O = clean(logoutCell), E = clean(eodCell);
  const LU = L.toUpperCase(), OU = O.toUpperCase();
  const raw = [L, O].filter(Boolean).join(' / ');
  const leaveTypeOf = (isMl) => (isMl ? (opts.ml === 'unpaid' ? 'LOP' : 'ML') : opts.leave === 'paid' ? 'Leave' : 'LOP');
  const base = { raw, eod: E, login: '', logout: '', minutes: 0, leaveType: '', note: '' };
  const loginMin = parseTime(L, 'in');
  const both = `${LU} ${OU}`;

  if (loginMin === null) {
    if (!L && !O) return { ...base, code: '' };
    if (/WEEK\s*-?\s*OFF|^W\s*\/?\s*O$|^WO$/.test(both)) return { ...base, code: 'WO', label: 'Week off' };
    if (/HOLIDAY|^H$/.test(both)) return { ...base, code: 'H', label: L || O };
    if (/DISCONT/.test(both)) return { ...base, code: 'A', label: 'Discontinued', discontinued: true };
    const isMl = /\bML\b|MEDICAL/.test(both);
    // Half-day leave: the other half of the day is taken as worked
    if (/HALF\s*-?\s*DAY/.test(both)) return { ...base, code: 'HL', label: isMl ? 'Half-day ML' : 'Half-day leave', leaveType: leaveTypeOf(isMl), worked: true };
    if (isMl) return { ...base, code: 'L', label: 'ML', leaveType: leaveTypeOf(true) };
    if (/LEAVE|^LOP$|^CL$|^SL$/.test(both)) return { ...base, code: 'L', label: 'Leave', leaveType: leaveTypeOf(false) };
    if (/ABSENT|^A$/.test(both)) return { ...base, code: 'A', label: 'Absent' };
    return { ...base, code: '?', label: 'Not understood', note: `"${raw}" is not a time or a known word` };
  }

  const login = hhmm(loginMin);
  // Logged in, then left on half-day leave ("HALF DAY ML", "Half day leave", "1.58PM HALFDAY")
  if (/HALF\s*-?\s*DAY/.test(OU) || (/LEAVE|\bML\b/.test(OU) && parseTime(O, 'out', loginMin) === null)) {
    const isMl = /\bML\b|MEDICAL/.test(OU);
    const outMin = parseTime(O, 'out', loginMin);
    return { ...base, code: 'HL', label: isMl ? 'Half-day ML' : 'Half-day leave', leaveType: leaveTypeOf(isMl), login, logout: hhmm(outMin), minutes: outMin !== null ? Math.max(0, outMin - loginMin) : 0, note: /HALF/.test(OU) ? '' : `Logout cell says "${O}" — counted as half-day leave` };
  }
  const outMin = parseTime(O, 'out', loginMin);
  if (outMin === null) return { ...base, code: 'P', label: 'Present', login, note: O ? `Logout "${O}" not understood` : 'No logout time' };
  const minutes = Math.max(0, outMin - loginMin);
  const note = minutes > 14 * 60 ? `Very long day (${Math.round(minutes / 60)} h) — check the times` : '';
  if (minutes < (opts.halfDayMinutes || 240)) return { ...base, code: 'HD', label: 'Half day', login, logout: hhmm(outMin), minutes, note };
  return { ...base, code: 'P', label: 'Present', login, logout: hhmm(outMin), minutes, note };
}

// 2-D grid (rows of cell strings) → { columns, dates, warnings }
export function parseAttendanceGrid(grid, month, options = {}, today = '') {
  const opts = { ...DEFAULT_IMPORT_OPTIONS, ...options };
  const rows = (Array.isArray(grid) ? grid : []).slice(0, 400).map((r) => (Array.isArray(r) ? r.slice(0, 600).map((c) => String(c ?? '')) : []));
  const warnings = [];
  const subIdx = rows.findIndex((r) => r.filter(isLoginHead).length >= 1);
  if (subIdx < 0) throw Object.assign(new Error('Could not find the LOGIN / LOGOUT / EOD header row in this sheet.'), { status: 400 });
  const sub = rows[subIdx];
  const loginCols = sub.map((c, i) => (isLoginHead(c) ? i : -1)).filter((i) => i >= 0);
  const loginSet = new Set(loginCols);

  // Names: the nearest non-empty row above the LOGIN row
  let head = [];
  for (let r = subIdx - 1; r >= 0; r--) { if (rows[r].some((c) => clean(c))) { head = rows[r]; break; } }
  const nameAt = (i) => clean(head[i]);
  const columns = loginCols.map((c, n) => {
    const next = loginCols[n + 1] ?? Infinity;
    let header = nameAt(c);
    for (let k = 1; !header && k <= 2 && c + k < next; k++) header = nameAt(c + k);
    if (!header && c - 1 >= 0 && !loginSet.has(c - 1) && !isLogoutHead(sub[c - 1]) && !isEodHead(sub[c - 1])) header = nameAt(c - 1);
    const outCol = isLogoutHead(sub[c + 1]) ? c + 1 : c + 1;
    const eodCol = isEodHead(sub[c + 2]) ? c + 2 : -1;
    return { col: c, outCol, eodCol, header: header || `Column ${n + 1}` };
  });

  // Day rows: a date in the cells before the first LOGIN column
  const firstLogin = loginCols[0];
  const [Y, M] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(Y, M, 0)).getUTCDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => `${month}-${pad(i + 1)}`);
  const rowByDate = new Map();
  let outOfMonth = 0;
  for (let r = subIdx + 1; r < rows.length; r++) {
    let date = '';
    for (let k = 0; k < firstLogin && !date; k++) date = parseSheetDate(rows[r][k], month);
    if (!date) continue;
    if (!date.startsWith(month)) { outOfMonth += 1; continue; }
    if (!rowByDate.has(date)) rowByDate.set(date, rows[r]);
  }
  if (!rowByDate.size) throw Object.assign(new Error(`No dates of ${month} were found in the first columns of the sheet. Check the month you picked.`), { status: 400 });
  if (outOfMonth) warnings.push(`${outOfMonth} row(s) have dates outside the chosen month and were skipped.`);
  const missing = dates.filter((d) => !rowByDate.has(d));

  // Last date that has a login time anywhere → later blanks are "not over yet"
  let lastData = '';
  for (const [date, row] of rowByDate) {
    if (columns.some((c) => parseTime(row[c.col], 'in') !== null) && date > lastData) lastData = date;
  }
  if (today && lastData > today) lastData = today;

  const out = columns.map((c) => {
    let discontinued = false;
    const issues = [];
    const days = dates.map((date) => {
      const row = rowByDate.get(date);
      let d = row ? classifyDay(row[c.col], row[c.outCol], c.eodCol >= 0 ? row[c.eodCol] : '', opts) : { code: '', raw: '', eod: '', login: '', logout: '', minutes: 0, leaveType: '', note: '' };
      if (discontinued) d = { ...d, code: 'A', label: 'Discontinued', note: '' };
      if (d.discontinued) discontinued = true;
      if (d.code === '?') { issues.push({ date, msg: d.note }); d = { ...d, code: '' }; }
      else if (d.note && !(today && date >= today && /No logout/.test(d.note))) issues.push({ date, msg: d.note });
      if (!d.code) {
        const over = lastData && date <= lastData;
        if (over) d = opts.blank === 'present' ? { ...d, code: 'P', label: 'Blank → present', blank: true } : { ...d, code: 'A', label: 'Blank → absent', blank: true };
        else d = { ...d, code: '', label: 'Not over yet' };
      }
      d.unpaid = (d.code === 'L' || d.code === 'HL') && d.leaveType === 'LOP';
      return { date, code: d.code, label: d.label || '', login: d.login || '', logout: d.logout || '', minutes: d.minutes || 0, leaveType: d.leaveType || '', unpaid: Boolean(d.unpaid), blank: Boolean(d.blank), worked: Boolean(d.code === 'HL' && (d.login || d.worked)), eod: d.eod || '', raw: d.raw || '' };
    });
    return { col: c.col, header: c.header, days, issues: issues.slice(0, 40), discontinued };
  });
  if (missing.length && missing.some((d) => d <= lastData)) warnings.push(`The sheet has no row for ${missing.filter((d) => d <= lastData).map((d) => Number(d.slice(8))).join(', ')} — those days use the "blank" rule.`);
  return { columns: out, dates, lastDataDate: lastData, warnings };
}

// Small per-person summary for the preview table
export function sheetSummary(days) {
  const s = { present: 0, halfDays: 0, leave: 0, ml: 0, lop: 0, weekOffs: 0, holidays: 0, blanks: 0, pending: 0, minutes: 0, eodNotDone: 0, absent: 0 };
  for (const d of days) {
    s.minutes += d.minutes || 0;
    if (/NOT\s*DONE/i.test(d.eod || '')) s.eodNotDone += 1;
    if (d.blank) s.blanks += 1;
    if (d.code === 'P') s.present += 1;
    else if (d.code === 'HD') { s.present += 0.5; s.halfDays += 1; s.lop += 0.5; }
    else if (d.code === 'HL') { if (d.worked) s.present += 0.5; else s.lop += 0.5; if (d.leaveType === 'ML') s.ml += 0.5; else s.leave += 0.5; }
    else if (d.code === 'L') { if (d.leaveType === 'ML') s.ml += 1; else s.leave += 1; }
    else if (d.code === 'WO') s.weekOffs += 1;
    else if (d.code === 'H') s.holidays += 1;
    else if (d.code === 'A') s.absent += 1;
    if (d.code === 'A') s.lop += 1;
    if (d.unpaid) s.lop += d.code === 'HL' ? 0.5 : 1;
    else if (!d.code) s.pending += 1;
  }
  s.hours = Math.round((s.minutes / 60) * 10) / 10;
  delete s.minutes;
  return s;
}

// ---- matching sheet names to staff ------------------------------------------
const letters = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
const words = (s) => String(s || '').toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter((w) => w.length >= 2);
export const headerKey = (h) => clean(h).toLowerCase().replace(/\s+/g, ' ');
const HINTS = { hr: /\bhr\b|human|admission|counsel/, dm: /market|digital|\bdm\b/, mis: /\bmis\b|admin/, trainer: /train|faculty/, tl: /\btl\b|lead/, ta: /talent|\bta\b|recruit/, oa: /\boa\b|odm|operat/, finance: /financ|account/, salem: /salem/ };

export function matchHeaders(columns, staff, remembered = {}) {
  const taken = new Set();
  const scored = columns.map((c) => {
    const header = c.header;
    const base = header.split(/[-–(]/)[0];
    const suffix = header.slice(base.length).toLowerCase();
    const hb = letters(base), hf = letters(header), btoks = words(base);
    const cands = staff.map((e) => {
      const n = letters(e.name), etoks = words(e.name);
      let s = 0;
      if (n && n === hf) s = 100;
      else if (n && n === hb) s = 95;
      else if (hb.length >= 4 && n.length >= 4 && (n.startsWith(hb) || hb.startsWith(n))) s = 75;
      else if (btoks.length && btoks.filter((t) => t.length >= 3).every((t) => etoks.includes(t)) && btoks.some((t) => t.length >= 3)) s = 72;
      else if (btoks[0] && btoks[0].length >= 3 && etoks[0] === btoks[0]) s = 55;
      if (s && suffix) {
        const info = `${e.role} ${e.dept} ${e.deptLabel || ''} ${e.branch}`.toLowerCase();
        for (const [k, rx] of Object.entries(HINTS)) if (new RegExp(`\\b${k}\\b`).test(suffix) && rx.test(info)) s += 8;
      }
      return { email: e.email, name: e.name, score: s };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
    return { ...c, cands };
  });
  // Remembered mappings first, then the most certain matches
  const result = new Map();
  for (const c of scored) {
    const r = remembered[headerKey(c.header)];
    if (r && staff.some((e) => e.email === r) && !taken.has(r)) { result.set(c.col, { email: r, how: 'remembered' }); taken.add(r); }
  }
  const order = scored.filter((c) => !result.has(c.col)).sort((a, b) => (b.cands[0]?.score || 0) - (a.cands[0]?.score || 0));
  for (const c of order) {
    const free = c.cands.filter((x) => !taken.has(x.email));
    const [a, b] = free;
    if (a && a.score >= 70 && (!b || b.score < a.score)) { result.set(c.col, { email: a.email, how: 'auto' }); taken.add(a.email); }
    else result.set(c.col, { email: '', how: '' });
  }
  return scored.map((c) => ({ col: c.col, ...result.get(c.col), suggestions: c.cands.slice(0, 4).map(({ email, name }) => ({ email, name })) }));
}
