// Helpers for the Attendance & Leave desk
const pad = (n) => String(n).padStart(2, '0');
export const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const addDays = (k, n) => { const d = new Date(`${k}T00:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const prettyDate = (k, o = { day: 'numeric', month: 'short', year: 'numeric' }) => (k ? new Date(`${k}T00:00:00`).toLocaleDateString('en-IN', o) : '');
export const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '');
export const fmtMin = (m) => {
  if (!Number.isFinite(m)) return '';
  const h = Math.floor(m / 60) % 24, mi = m % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(mi)} ${h < 12 ? 'AM' : 'PM'}`;
};
export const fmtHours = (mins) => (mins ? `${Math.floor(mins / 60)}h ${pad(mins % 60)}m` : '');
export const errMsg = (e) => e?.response?.data?.error || e?.message || 'Something went wrong';

export const CODE_STYLE = {
  P: { label: 'Present', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  HD: { label: 'Half day', cls: 'bg-lime-100 text-lime-800 border-lime-200' },
  HL: { label: 'Half-day leave', cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  L: { label: 'Leave', cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  A: { label: 'Absent', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  WO: { label: 'Week off', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  H: { label: 'Holiday', cls: 'bg-violet-100 text-violet-700 border-violet-200' },
  NY: { label: 'Not yet in', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  '': { label: '', cls: 'bg-white text-slate-300 border-slate-100' }
};

export const LEAVE_STATUS = {
  pending_head: { label: 'Waiting for head', cls: 'bg-amber-100 text-amber-800' },
  pending_hr: { label: 'Waiting for HR', cls: 'bg-orange-100 text-orange-800' },
  approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Rejected', cls: 'bg-rose-100 text-rose-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500' }
};

// Download rows as a CSV file (opens in Excel)
export function downloadCsv(filename, columns, rows) {
  const esc = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [columns.map((c) => esc(c.label)).join(','), ...rows.map((r) => columns.map((c) => esc(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(','))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
