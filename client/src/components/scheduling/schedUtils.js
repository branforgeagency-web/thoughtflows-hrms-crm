// Shared helpers for the Head of Trainer scheduling sections
export const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEK_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function fmtMin(m) {
  if (!Number.isFinite(m)) return '';
  const mm = ((Math.round(m) % 1440) + 1440) % 1440;
  const h = Math.floor(mm / 60), mi = mm % 60;
  return `${String(h % 12 === 0 ? 12 : h % 12).padStart(2, '0')}:${String(mi).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
export const fmtSlot = (s, e) => `${fmtMin(s)} – ${fmtMin(e)}`;

const pad = (n) => String(n).padStart(2, '0');
export const toDateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDateKey = (k) => new Date(`${k}T00:00:00`);
export const addDays = (k, n) => { const d = parseDateKey(k); d.setDate(d.getDate() + n); return toDateKey(d); };
export const weekdayOf = (k) => WEEK[parseDateKey(k).getDay()];
export const todayKey = () => toDateKey(new Date());
export const prettyDate = (k, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  (k ? parseDateKey(k).toLocaleDateString('en-IN', opts) : '');

// Monday on/before the date
export const startOfWeek = (k) => { const wd = parseDateKey(k).getDay(); return addDays(k, wd === 0 ? -6 : 1 - wd); };

export const timeOptions = (step = 15, from = 0, to = 1440) => {
  const out = [];
  for (let m = from; m < to; m += step) out.push({ value: m, label: fmtMin(m) });
  return out;
};

export const DURATIONS = [
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' }
];

export const errMsg = (e) => e?.response?.data?.error || e?.message || 'Something went wrong';

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (_) { return false; }
}

// Wise-style pastel chips — same title always gets the same colour
const PALETTE = [
  'bg-violet-50 border-violet-200 text-violet-800',
  'bg-cyan-50 border-cyan-200 text-cyan-800',
  'bg-indigo-50 border-indigo-200 text-indigo-800',
  'bg-amber-50 border-amber-200 text-amber-800',
  'bg-emerald-50 border-emerald-200 text-emerald-800',
  'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800',
  'bg-sky-50 border-sky-200 text-sky-800',
  'bg-lime-50 border-lime-200 text-lime-800'
];
export function colorFor(event) {
  if (event?.type === 'demo') return 'bg-rose-50 border-rose-200 text-rose-700';
  if (event?.type === 'one_on_one') return 'bg-teal-50 border-teal-300 text-teal-800';
  const key = String(event?.course || event?.title || '').toLowerCase().replace(/\(.*?\)/g, '').trim();
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export const STATUS_LABEL = {
  scheduled: 'Scheduled', live: 'Live now', done: 'Held', missed: 'Not held', leave: 'Trainer on leave',
  booked: 'Booked', confirmed: 'Confirmed', cancelled: 'Cancelled',
  completed: 'Completed', no_show: 'Student no-show'
};
