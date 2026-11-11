import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getStaffAttendance, onDataUpdate } from '../services/api';
import { localDateKey } from '../utils/dateUtils';

// Login / logout attendance for training staff. Login = check-in, logout =
// check-out; recorded automatically by the server. The server scopes rows:
// Head → everyone, Manager → self + TLs & trainers, TL → self + trainers,
// Trainer → self only.
const ROLE_LABEL = { head: 'Head', manager: 'Manager', tl: 'Team Lead', trainer: 'Trainer', part_time: 'Part-time' };

const daysAgoKey = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateKey(d);
};

const fmtTime = (v, fallback) => {
  if (v) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  }
  return fallback || '—';
};

export default function StaffLoginAttendance({ title = 'Login Attendance', selfOnly = false }) {
  const today = localDateKey();
  const [range, setRange] = useState(selfOnly ? '30' : 'today'); // 'today' | '7' | '30' | 'date'
  const [pickDate, setPickDate] = useState(today);
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const params = useMemo(() => {
    if (range === 'today') return { from: today, to: today };
    if (range === 'date') return { from: pickDate, to: pickDate };
    return { from: daysAgoKey(Number(range) - 1), to: today };
  }, [range, pickDate, today]);

  const load = useCallback(() => {
    setLoading(true);
    getStaffAttendance(params)
      .then((d) => { setRows(Array.isArray(d) ? d : []); setError(''); })
      .catch((e) => setError(e?.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    load();
    const unsub = onDataUpdate((entity) => { if (entity === 'attendance') load(); });
    const timer = setInterval(load, 60000); // live hours for people still logged in
    return () => { unsub(); clearInterval(timer); };
  }, [load]);

  const visible = rows.filter((r) => (roleFilter === 'all' || (r.staffRole || 'trainer') === roleFilter)
    && (!search.trim() || String(r.employeeName || '').toLowerCase().includes(search.trim().toLowerCase())));
  const todayRows = rows.filter((r) => r.date === today);
  const loggedInNow = todayRows.filter((r) => r.sessionStatus === 'In Progress').length;
  const loggedOut = todayRows.filter((r) => r.sessionStatus === 'Completed').length;

  const statusBadge = (s) => {
    if (s === 'In Progress') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Logged in</span>;
    if (s === 'Completed') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">Logged out</span>;
    if (s === 'Logout missing') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">No logout</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">{s || 'Absent'}</span>;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-base font-black text-slate-900">{title}</h3>
          <p className="text-[11px] text-slate-500">Recorded automatically — login time is check-in, logout time is check-out.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {['today', '7', '30', 'date'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-xl font-bold border ${range === r ? 'bg-[#0f212d] text-white border-[#0f212d]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {r === 'today' ? 'Today' : r === 'date' ? 'Pick date' : `Last ${r} days`}
            </button>
          ))}
          {range === 'date' && (
            <input type="date" value={pickDate} max={today} onChange={(e) => setPickDate(e.target.value || today)} className="px-2 py-1.5 rounded-xl border border-slate-200" />
          )}
        </div>
      </div>

      {!selfOnly && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold">Logged in now: {loggedInNow}</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold">Logged out today: {loggedOut}</span>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-2 py-1.5 rounded-xl border border-slate-200">
            <option value="all">All roles</option>
            {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name" className="px-3 py-1.5 rounded-xl border border-slate-200" />
        </div>
      )}

      {error ? (
        <div className="text-xs text-rose-600">{error}</div>
      ) : loading && !rows.length ? (
        <div className="text-xs text-slate-500 py-6 text-center">Loading…</div>
      ) : !visible.length ? (
        <div className="text-xs text-slate-500 py-6 text-center">No login attendance for this period.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-slate-700">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-2 pr-3 font-bold">Date</th>
                {!selfOnly && <th className="py-2 pr-3 font-bold">Name</th>}
                {!selfOnly && <th className="py-2 pr-3 font-bold">Role</th>}
                <th className="py-2 pr-3 font-bold">Branch</th>
                <th className="py-2 pr-3 font-bold">Login</th>
                <th className="py-2 pr-3 font-bold">Logout</th>
                <th className="py-2 pr-3 font-bold">Hours</th>
                <th className="py-2 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((r) => (
                <tr key={r._id || `${r.employeeName}-${r.date}`}>
                  <td className="py-2 pr-3 whitespace-nowrap text-slate-700">{r.date}</td>
                  {!selfOnly && <td className="py-2 pr-3 font-bold text-slate-900">{r.employeeName}</td>}
                  {!selfOnly && <td className="py-2 pr-3 text-slate-700">{ROLE_LABEL[r.staffRole] || 'Trainer'}</td>}
                  <td className="py-2 pr-3 text-slate-700">{r.branchName || '—'}</td>
                  <td className="py-2 pr-3 whitespace-nowrap font-semibold text-emerald-700">{fmtTime(r.workStartTime, r.checkIn)}</td>
                  <td className="py-2 pr-3 whitespace-nowrap font-semibold text-rose-700">{r.workEndTime ? fmtTime(r.workEndTime, r.checkOut) : <span className="text-slate-400">—</span>}</td>
                  <td className="py-2 pr-3 whitespace-nowrap font-semibold text-slate-800">{r.durationText || '—'}</td>
                  <td className="py-2">{statusBadge(r.sessionStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
