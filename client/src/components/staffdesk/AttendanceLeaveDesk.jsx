import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, RefreshCw, Download, Search, MapPin, Check, Ban, Plus, Trash2, Users, LogIn, Clock, CalendarX, AlertTriangle, UserX } from 'lucide-react';
import {
  getStaffDay, getStaffLog, getStaffRegister, getStaffBalances, getStaffLeaves, decideStaffLeave, cancelStaffLeave, saveLeavePolicy
} from '../../services/api';
import MyLeavePanel from './MyLeavePanel';
const PayrollDesk = React.lazy(() => import('./PayrollDesk'));
const MyPayslips = React.lazy(() => import('./MyPayslips'));
import { todayKey, addDays, prettyDate, fmtTime, fmtMin, fmtHours, errMsg, CODE_STYLE, LEAVE_STATUS, downloadCsv } from './deskUtils';

// Attendance & Leave — one dashboard for Trainers, HR, Marketing, CCCP, Admin
// and Leadership. Scope comes from the server: all staff / own department / self.
export default function AttendanceLeaveDesk({ info, onClose, onChanged }) {
  const team = info?.scope !== 'self';
  const tabs = [
    ...(team ? [['today', 'Today'], ['log', 'Login / Logout'], ['register', 'Monthly Register'], ['approvals', 'Leave Approvals'], ['leaves', 'All Leave'], ['balances', 'Leave Balances']] : []),
    ...(info?.payroll?.canPrepare ? [['payroll', 'Payroll']] : []),
    ...(info?.canEditPolicy ? [['policy', 'Policy & Holidays']] : []),
    // Trainers keep their own leave flow — they only get payslips here
    ...(info?.scope === 'self' && info?.usesTrainerLeave ? [] : [['mine', 'My Leave']]),
    ['payslips', 'My Payslips']
  ];
  const [tab, setTab] = useState(tabs[0][0]);
  const scopeLabel = info?.scope === 'all' ? 'All employees' : info?.scope === 'department' ? `${info?.deptLabels?.[info?.me?.dept] || info?.me?.dept} team` : 'Only you';

  return (
    <div className="fixed inset-0 z-[90] bg-[#f4f8f8] flex flex-col">
      <div className="px-4 sm:px-6 py-3 bg-[#0f212d] text-white flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold">Attendance, Leave &amp; Payroll</div>
          <div className="text-xs text-slate-300">{info?.me?.name} · {scopeLabel} · Trainers, HR, Marketing, CCCP &amp; all staff</div>
        </div>
        <button onClick={onClose} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold flex items-center gap-1.5 cursor-pointer"><X className="w-4 h-4" />Close</button>
      </div>
      <div className="px-4 sm:px-6 bg-white border-b border-slate-200 flex gap-1 overflow-x-auto">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3.5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 cursor-pointer ${tab === k ? 'border-[#00897b] text-[#00695c]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{l}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-[1500px] mx-auto">
          {tab === 'today' && <TodayTab />}
          {tab === 'log' && <LogTab />}
          {tab === 'register' && <RegisterTab />}
          {tab === 'approvals' && <LeavesTab mode="approvals" onChanged={onChanged} />}
          {tab === 'leaves' && <LeavesTab mode="all" onChanged={onChanged} canCancel={info?.isHrApprover} />}
          {tab === 'balances' && <BalancesTab />}
          {tab === 'policy' && <PolicyTab policy={info?.policy} />}
          {tab === 'payroll' && <React.Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Opening payroll…</div>}><PayrollDesk /></React.Suspense>}
          {tab === 'payslips' && <React.Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading payslips…</div>}><MyPayslips /></React.Suspense>}
          {tab === 'mine' && <MyLeavePanel me={info?.me} policy={info?.policy} usesTrainerLeave={info?.usesTrainerLeave && info?.scope === 'self'} />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- shared bits
const Card = ({ children, className = '' }) => <div className={`bg-white rounded-2xl border border-slate-200 ${className}`}>{children}</div>;
const Err = ({ e }) => (e ? <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{e}</div> : null);
const Code = ({ code, title }) => <span title={title || CODE_STYLE[code]?.label} className={`inline-flex items-center justify-center min-w-[28px] px-1.5 h-6 rounded-md border text-[11px] font-black ${CODE_STYLE[code]?.cls || ''}`}>{code}</span>;

function useFilters(rows) {
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('');
  const [branch, setBranch] = useState('');
  const depts = useMemo(() => [...new Map(rows.map((r) => [r.dept, r.deptLabel])).entries()], [rows]);
  const branches = useMemo(() => [...new Set(rows.map((r) => r.branch).filter(Boolean))].sort(), [rows]);
  const ql = q.trim().toLowerCase();
  const filtered = rows.filter((r) => (!dept || r.dept === dept) && (!branch || r.branch === branch) && (!ql || `${r.name} ${r.email} ${r.role}`.toLowerCase().includes(ql)));
  const bar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or role" className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm w-52 bg-white" />
      </div>
      <select value={dept} onChange={(e) => setDept(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white">
        <option value="">All departments</option>
        {depts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      {branches.length > 0 && (
        <select value={branch} onChange={(e) => setBranch(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white">
          <option value="">All branches</option>
          {branches.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      )}
    </div>
  );
  return { filtered, bar };
}

// ---------------------------------------------------------------- Today
function TodayTab() {
  const [date, setDate] = useState(todayKey());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chip, setChip] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getStaffDay(date)); setError(''); } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  }, [date]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (date !== todayKey()) return undefined; const t = setInterval(load, 60000); return () => clearInterval(t); }, [load, date]);

  const rows = data?.rows || [];
  const { filtered, bar } = useFilters(rows);
  const count = (fn) => filtered.filter(fn).length;
  const kpis = [
    ['', 'Total staff', Users, 'text-slate-700', filtered.length],
    ['in', 'Present', LogIn, 'text-emerald-600', count((r) => ['P', 'HD', 'HL'].includes(r.code) && r.login)],
    ['working', 'Working now', Clock, 'text-teal-600', count((r) => r.working)],
    ['late', 'Late', AlertTriangle, 'text-amber-600', count((r) => r.late)],
    ['leave', 'On leave', CalendarX, 'text-sky-600', count((r) => ['L', 'HL'].includes(r.code))],
    ['absent', 'Absent / not in', UserX, 'text-rose-600', count((r) => ['A', 'NY'].includes(r.code))]
  ];
  const chipFilter = {
    in: (r) => ['P', 'HD', 'HL'].includes(r.code) && r.login, working: (r) => r.working, late: (r) => r.late,
    leave: (r) => ['L', 'HL'].includes(r.code), absent: (r) => ['A', 'NY'].includes(r.code)
  }[chip];
  const shown = chipFilter ? filtered.filter(chipFilter) : filtered;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white" />
          {date !== todayKey() && <button onClick={() => setDate(todayKey())} className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold bg-white cursor-pointer">Today</button>}
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {bar}
          <button onClick={() => downloadCsv(`attendance-${date}.csv`, [
            { label: 'Name', key: 'name' }, { label: 'Department', key: 'deptLabel' }, { label: 'Role', key: 'role' }, { label: 'Branch', key: 'branch' },
            { label: 'Status', key: 'label' }, { label: 'Login', get: (r) => fmtTime(r.login) }, { label: 'Logout', get: (r) => fmtTime(r.logout) },
            { label: 'Worked', get: (r) => fmtHours(r.minutes) }, { label: 'Late (min)', get: (r) => (r.late ? r.lateBy : '') }, { label: 'Login location', key: 'loginAddress' }
          ], shown)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer"><Download className="w-4 h-4" />Excel</button>
        </div>
      </div>
      <Err e={error} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(([k, label, Icon, tone, v]) => (
          <button key={label} onClick={() => setChip(chip === k ? '' : k)} className={`p-3.5 rounded-2xl border text-left cursor-pointer ${chip === k && k ? 'border-[#00897b] ring-2 ring-teal-100 bg-white' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <div className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1"><Icon className={`w-3.5 h-3.5 ${tone}`} />{label}</div>
            <div className={`text-2xl font-black ${tone}`}>{v}</div>
          </button>
        ))}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[980px]">
          <thead className="bg-slate-50 text-xs text-slate-600"><tr>{['Employee', 'Department', 'Branch', 'Login', 'Logout', 'Worked', 'Status'].map((h) => <th key={h} className="text-left px-4 py-2.5 font-bold">{h}</th>)}</tr></thead>
          <tbody>
            {shown.length === 0 && !loading && <tr><td colSpan={7} className="py-10 text-center text-slate-400">Nobody here.</td></tr>}
            {shown.map((r) => (
              <tr key={r.email} className="border-t border-slate-100 align-top">
                <td className="px-4 py-2.5"><div className="font-semibold text-slate-900">{r.name}</div><div className="text-[11px] text-slate-500">{r.role}</div></td>
                <td className="px-4 py-2.5 text-slate-700">{r.deptLabel}</td>
                <td className="px-4 py-2.5 text-slate-600">{r.branch || '—'}</td>
                <td className="px-4 py-2.5">
                  {r.login ? <>
                    <div className={`font-semibold ${r.late ? 'text-amber-700' : 'text-slate-900'}`}>{fmtTime(r.login)}{r.late && <span className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100">LATE {r.lateBy}m</span>}</div>
                    {(r.loginAddress || r.loginMap) && (r.loginMap
                      ? <a href={r.loginMap} target="_blank" rel="noreferrer" className="text-[11px] text-teal-700 hover:underline flex items-center gap-0.5 max-w-[220px] truncate"><MapPin className="w-3 h-3 shrink-0" />{r.loginAddress || 'View on map'}</a>
                      : <div className="text-[11px] text-slate-500 flex items-center gap-0.5 max-w-[220px] truncate"><MapPin className="w-3 h-3 shrink-0" />{r.loginAddress}</div>)}
                  </> : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-2.5">{r.logout ? fmtTime(r.logout) : r.working ? <span className="text-teal-700 font-semibold text-xs">● Working</span> : <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-2.5 text-slate-700">{fmtHours(r.minutes) || '—'}{r.breakMinutes ? <div className="text-[11px] text-slate-400">{r.breakMinutes}m break</div> : null}</td>
                <td className="px-4 py-2.5"><Code code={r.code} /> <span className="text-xs text-slate-600 ml-1">{r.label}</span>{r.pendingLeave && <div className="text-[11px] text-amber-700">Leave request pending ({r.pendingLeave})</div>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-[11px] text-slate-500">Login / logout are recorded automatically when staff sign in and out of the portal. Late = after office start + grace (trainers: after their shift start).</p>
    </div>
  );
}

// ---------------------------------------------------------------- Login / Logout log
function LogTab() {
  const [from, setFrom] = useState(addDays(todayKey(), -6));
  const [to, setTo] = useState(todayKey());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getStaffLog({ from, to })); setError(''); } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  }, [from, to]);
  useEffect(() => { load(); }, [load]);
  const { filtered, bar } = useFilters(data?.rows || []);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white" />
          <span className="text-slate-400">to</span>
          <input type="date" value={to} min={from} max={todayKey()} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white" />
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {bar}
          <button onClick={() => downloadCsv(`login-logout-${from}-to-${to}.csv`, [
            { label: 'Date', key: 'date' }, { label: 'Name', key: 'name' }, { label: 'Department', key: 'deptLabel' }, { label: 'Branch', key: 'branch' },
            { label: 'Login', get: (r) => fmtTime(r.login) }, { label: 'Logout', get: (r) => fmtTime(r.logout) }, { label: 'Worked', get: (r) => fmtHours(r.minutes) },
            { label: 'Late (min)', get: (r) => (r.late ? r.lateBy : '') }, { label: 'Status', key: 'label' }, { label: 'Login location', key: 'loginAddress' }, { label: 'Logout location', key: 'logoutAddress' }
          ], filtered)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer"><Download className="w-4 h-4" />Excel</button>
        </div>
      </div>
      <Err e={error} />
      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead className="bg-slate-50 text-xs text-slate-600"><tr>{['Date', 'Employee', 'Department', 'Login', 'Logout', 'Worked', 'Status', 'Location'].map((h) => <th key={h} className="text-left px-4 py-2.5 font-bold">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.length === 0 && !loading && <tr><td colSpan={8} className="py-10 text-center text-slate-400">No records in this period.</td></tr>}
            {filtered.map((r, i) => (
              <tr key={`${r.email}-${r.date}-${i}`} className="border-t border-slate-100">
                <td className="px-4 py-2 whitespace-nowrap text-slate-700">{prettyDate(r.date, { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                <td className="px-4 py-2"><div className="font-semibold">{r.name}</div><div className="text-[11px] text-slate-500">{r.role}</div></td>
                <td className="px-4 py-2 text-slate-600">{r.deptLabel}</td>
                <td className={`px-4 py-2 ${r.late ? 'text-amber-700 font-semibold' : ''}`}>{fmtTime(r.login) || '—'}{r.late ? ` (+${r.lateBy}m)` : ''}</td>
                <td className="px-4 py-2">{fmtTime(r.logout) || (r.working ? 'Working' : '—')}</td>
                <td className="px-4 py-2">{fmtHours(r.minutes) || '—'}</td>
                <td className="px-4 py-2"><Code code={r.code} /> <span className="text-xs text-slate-600">{r.label}</span></td>
                <td className="px-4 py-2 text-[11px] text-slate-500 max-w-[220px] truncate" title={r.loginAddress}>{r.loginAddress || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- Monthly register
function RegisterTab() {
  const [month, setMonth] = useState(todayKey().slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getStaffRegister(month)); setError(''); } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  }, [month]);
  useEffect(() => { load(); }, [load]);
  const { filtered, bar } = useFilters(data?.rows || []);
  const dates = data?.dates || [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white" />
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {bar}
          <button onClick={() => downloadCsv(`attendance-register-${month}.csv`, [
            { label: 'Name', key: 'name' }, { label: 'Department', key: 'deptLabel' }, { label: 'Branch', key: 'branch' },
            ...dates.map((d, i) => ({ label: d.slice(8), get: (r) => r.days[i]?.code || '' })),
            { label: 'Present days', get: (r) => r.totals.present }, { label: 'Leave days', get: (r) => r.totals.leave }, { label: 'Absent', get: (r) => r.totals.A }, { label: 'Late', get: (r) => r.totals.late }
          ], filtered)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer"><Download className="w-4 h-4" />Excel</button>
        </div>
      </div>
      <Err e={error} />
      <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
        {['P', 'HD', 'L', 'HL', 'A', 'WO', 'H'].map((c) => <span key={c} className="flex items-center gap-1"><Code code={c} />{CODE_STYLE[c].label}</span>)}
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />late</span>
      </div>
      <Card className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600">
              <th className="sticky left-0 z-10 bg-slate-50 text-left px-3 py-2 font-bold min-w-[180px]">Employee</th>
              {dates.map((d) => <th key={d} className="px-0.5 py-2 font-bold text-center min-w-[30px]">{Number(d.slice(8))}<div className="text-[9px] font-normal text-slate-400">{new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'narrow' })}</div></th>)}
              {['Present', 'Leave', 'Absent', 'Late'].map((h) => <th key={h} className="px-2 py-2 font-bold text-center">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && !loading && <tr><td colSpan={dates.length + 5} className="py-10 text-center text-slate-400">No employees.</td></tr>}
            {filtered.map((r) => (
              <tr key={r.email} className="border-t border-slate-100">
                <td className="sticky left-0 z-10 bg-white px-3 py-1.5"><div className="font-semibold text-slate-900 truncate max-w-[180px]">{r.name}</div><div className="text-[10px] text-slate-500">{r.deptLabel}</div></td>
                {r.days.map((d, i) => (
                  <td key={i} className="px-0.5 py-1 text-center relative">
                    {d.code ? <Code code={d.code} title={`${dates[i]} · ${d.label}${d.late ? ' · late' : ''}`} /> : null}
                    {d.late && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />}
                  </td>
                ))}
                <td className="px-2 text-center font-bold text-emerald-700">{r.totals.present}</td>
                <td className="px-2 text-center font-bold text-sky-700">{r.totals.leave}</td>
                <td className="px-2 text-center font-bold text-rose-600">{r.totals.A}</td>
                <td className="px-2 text-center font-bold text-amber-600">{r.totals.late}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- Leave lists
function LeavesTab({ mode, onChanged, canCancel }) {
  const [data, setData] = useState({ leaves: [], trainerLeaves: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getStaffLeaves({ view: mode, status: status || undefined })); setError(''); } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  }, [mode, status]);
  useEffect(() => { load(); }, [load]);

  const act = async (l, action) => {
    const note = action === 'reject' ? window.prompt('Reason for rejecting (shown to the employee):', '') : window.prompt('Note (optional):', '');
    if (note === null) return;
    setBusy(l.id);
    try { await decideStaffLeave(l.id, action, note); await load(); onChanged?.(); } catch (e) { setError(errMsg(e)); } finally { setBusy(''); }
  };
  const cancel = async (l) => {
    const note = window.prompt(`Cancel ${l.employeeName}'s leave? Reason:`, '');
    if (note === null) return;
    try { await cancelStaffLeave(l.id, note); load(); } catch (e) { setError(errMsg(e)); }
  };

  const ql = q.trim().toLowerCase();
  const all = [...(data.leaves || []), ...(mode === 'all' ? (data.trainerLeaves || []).filter((l) => !status || l.status === status) : [])]
    .filter((l) => !ql || `${l.employeeName} ${l.deptLabel} ${l.leaveType} ${l.reason}`.toLowerCase().includes(ql));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-600">{mode === 'approvals' ? 'Leave requests waiting for your decision' : 'Every leave in your scope (trainers’ leave is managed in the Trainer dashboards)'}</div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative"><Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm w-48 bg-white" /></div>
          {mode === 'all' && (
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white">
              <option value="">All statuses</option>
              {Object.entries(LEAVE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          )}
          {mode === 'all' && <button onClick={() => downloadCsv('leave-list.csv', [
            { label: 'Employee', key: 'employeeName' }, { label: 'Department', key: 'deptLabel' }, { label: 'Type', key: 'leaveType' },
            { label: 'From', key: 'from' }, { label: 'To', key: 'to' }, { label: 'Days', key: 'days' }, { label: 'Status', get: (l) => LEAVE_STATUS[l.status]?.label },
            { label: 'Reason', key: 'reason' }, { label: 'Head', get: (l) => l.headDecision?.by || '' }, { label: 'HR', get: (l) => l.hrDecision?.by || '' }
          ], all)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer"><Download className="w-4 h-4" />Excel</button>}
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />}
        </div>
      </div>
      <Err e={error} />
      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead className="bg-slate-50 text-xs text-slate-600"><tr>{['Employee', 'Type', 'Dates', 'Days', 'Reason', 'Status', ''].map((h) => <th key={h} className="text-left px-4 py-2.5 font-bold">{h}</th>)}</tr></thead>
          <tbody>
            {all.length === 0 && !loading && <tr><td colSpan={7} className="py-10 text-center text-slate-400">{mode === 'approvals' ? 'Nothing waiting for you. 🎉' : 'No leave found.'}</td></tr>}
            {all.map((l) => (
              <tr key={l.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-2.5"><div className="font-semibold text-slate-900">{l.employeeName}</div><div className="text-[11px] text-slate-500">{l.deptLabel}{l.branch ? ` · ${l.branch}` : ''}</div></td>
                <td className="px-4 py-2.5 font-bold">{l.leaveType}{l.trainerFlow && <div className="text-[10px] font-semibold text-slate-400">Trainer flow</div>}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">{prettyDate(l.from)}{l.to !== l.from ? ` – ${prettyDate(l.to)}` : ''}{l.halfDay ? ` · ${l.halfDay} half` : ''}</td>
                <td className="px-4 py-2.5">{l.days ?? '—'}</td>
                <td className="px-4 py-2.5 text-slate-600 max-w-[260px]">{l.reason}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${LEAVE_STATUS[l.status]?.cls}`}>{LEAVE_STATUS[l.status]?.label}</span>
                  {l.headDecision?.by && <div className="text-[11px] text-slate-500 mt-0.5">Head: {l.headDecision.by}{l.headDecision.note ? ` — “${l.headDecision.note}”` : ''}</div>}
                  {l.hrDecision?.by && <div className="text-[11px] text-slate-500">HR: {l.hrDecision.by}{l.hrDecision.note ? ` — “${l.hrDecision.note}”` : ''}</div>}
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  {mode === 'approvals' && (
                    <>
                      <button disabled={busy === l.id} onClick={() => act(l, 'approve')} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"><Check className="w-3.5 h-3.5" />Approve</button>{' '}
                      <button disabled={busy === l.id} onClick={() => act(l, 'reject')} className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"><Ban className="w-3.5 h-3.5" />Reject</button>
                    </>
                  )}
                  {mode === 'all' && canCancel && !l.trainerFlow && !['rejected', 'cancelled'].includes(l.status) && (
                    <button onClick={() => cancel(l)} className="text-xs font-bold text-rose-600 hover:underline cursor-pointer">Cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- Balances
function BalancesTab() {
  const [year, setYear] = useState(todayKey().slice(0, 4));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    setLoading(true);
    getStaffBalances({ year }).then((d) => { if (alive) { setData(d); setError(''); } }).catch((e) => alive && setError(errMsg(e))).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [year]);
  const { filtered, bar } = useFilters(data?.rows || []);
  const types = data?.types || [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select value={year} onChange={(e) => setYear(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white">
            {[0, 1, 2].map((i) => { const y = String(Number(todayKey().slice(0, 4)) - i); return <option key={y} value={y}>{y}</option>; })}
          </select>
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {bar}
          <button onClick={() => downloadCsv(`leave-balances-${year}.csv`, [
            { label: 'Name', key: 'name' }, { label: 'Department', key: 'deptLabel' },
            ...types.flatMap((t) => [{ label: `${t.code} used`, get: (r) => r.balance?.[t.code]?.used ?? 0 }, ...(t.perYear !== null && t.perYear !== undefined ? [{ label: `${t.code} left`, get: (r) => r.balance?.[t.code]?.remaining ?? '' }] : [])])
          ], filtered)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer"><Download className="w-4 h-4" />Excel</button>
        </div>
      </div>
      <Err e={error} />
      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="text-left px-4 py-2.5 font-bold">Employee</th>{types.map((t) => <th key={t.code} className="text-left px-4 py-2.5 font-bold">{t.name}{t.perYear !== null && t.perYear !== undefined ? ` (${t.perYear}/yr)` : ''}</th>)}</tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.email} className="border-t border-slate-100">
                <td className="px-4 py-2.5"><div className="font-semibold">{r.name}</div><div className="text-[11px] text-slate-500">{r.deptLabel}</div></td>
                {types.map((t) => {
                  const b = r.balance?.[t.code] || {};
                  const limited = t.perYear !== null && t.perYear !== undefined;
                  return (
                    <td key={t.code} className="px-4 py-2.5">
                      {r.dept === 'training' ? <span className="text-[11px] text-slate-400">Trainer leave flow</span> : limited
                        ? <><b className={b.remaining <= 1 ? 'text-rose-600' : 'text-teal-700'}>{b.remaining}</b> left <span className="text-[11px] text-slate-400">· {b.used} used{b.pending ? ` · ${b.pending} waiting` : ''}</span></>
                        : <><b>{b.used || 0}</b> <span className="text-[11px] text-slate-400">day(s){b.pending ? ` · ${b.pending} waiting` : ''}</span></>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- Policy
function PolicyTab({ policy }) {
  const [p, setP] = useState(() => JSON.parse(JSON.stringify(policy || {})));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [hol, setHol] = useState({ date: '', name: '' });
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));
  const save = async () => {
    setSaving(true); setMsg('');
    try { const v = await saveLeavePolicy(p); setP(v); setMsg('✓ Saved'); } catch (e) { setMsg(errMsg(e)); } finally { setSaving(false); }
  };
  const toInput = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-5 space-y-3">
        <div className="font-extrabold text-slate-900">Leave types &amp; yearly balance</div>
        {(p.types || []).map((t, i) => (
          <div key={i} className="grid grid-cols-[80px_1fr_120px_32px] gap-2 items-center">
            <input value={t.code} onChange={(e) => set('types', p.types.map((x, k) => (k === i ? { ...x, code: e.target.value.toUpperCase() } : x)))} className="px-2 py-2 rounded-lg border border-slate-200 text-sm font-bold" />
            <input value={t.name} onChange={(e) => set('types', p.types.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} className="px-2 py-2 rounded-lg border border-slate-200 text-sm" />
            <input type="number" min={0} placeholder="No limit" value={t.perYear ?? ''} onChange={(e) => set('types', p.types.map((x, k) => (k === i ? { ...x, perYear: e.target.value === '' ? null : Number(e.target.value) } : x)))} className="px-2 py-2 rounded-lg border border-slate-200 text-sm" />
            <button onClick={() => set('types', p.types.filter((_, k) => k !== i))} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer" title="Remove"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        <button onClick={() => set('types', [...(p.types || []), { code: '', name: '', perYear: null }])} className="text-sm font-bold text-teal-700 flex items-center gap-1 cursor-pointer"><Plus className="w-4 h-4" />Add leave type</button>
        <p className="text-[11px] text-slate-500">Empty yearly balance = no limit (e.g. Loss of Pay).</p>
        <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer"><input type="checkbox" checked={p.allowHalfDay !== false} onChange={(e) => set('allowHalfDay', e.target.checked)} />Allow half-day leave</label>
      </Card>
      <Card className="p-5 space-y-3">
        <div className="font-extrabold text-slate-900">Office timing &amp; week-off</div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <label className="space-y-1"><span className="text-xs font-semibold text-slate-600">Office starts</span><input type="time" value={toInput(p.officeStartMin ?? 570)} onChange={(e) => { const [h, m] = e.target.value.split(':').map(Number); set('officeStartMin', h * 60 + m); }} className="w-full px-2 py-2 rounded-lg border border-slate-200" /></label>
          <label className="space-y-1"><span className="text-xs font-semibold text-slate-600">Grace (min)</span><input type="number" min={0} value={p.graceMin ?? 15} onChange={(e) => set('graceMin', Number(e.target.value))} className="w-full px-2 py-2 rounded-lg border border-slate-200" /></label>
          <label className="space-y-1"><span className="text-xs font-semibold text-slate-600">Half day if under (min)</span><input type="number" min={30} value={p.halfDayMinutes ?? 240} onChange={(e) => set('halfDayMinutes', Number(e.target.value))} className="w-full px-2 py-2 rounded-lg border border-slate-200" /></label>
        </div>
        <p className="text-[11px] text-slate-500">Late after {fmtMin((p.officeStartMin ?? 570) + (p.graceMin ?? 0))}. Trainers are measured against their own shift start.</p>
        <div className="flex flex-wrap gap-1.5">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => {
            const on = (p.weeklyOff || []).includes(d);
            return <button key={d} onClick={() => set('weeklyOff', on ? p.weeklyOff.filter((x) => x !== d) : [...(p.weeklyOff || []), d])} className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${on ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600'}`}>{d}{on ? ' · off' : ''}</button>;
          })}
        </div>
      </Card>
      <Card className="p-5 space-y-3 lg:col-span-2">
        <div className="font-extrabold text-slate-900">Holidays</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="date" value={hol.date} onChange={(e) => setHol((h) => ({ ...h, date: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          <input value={hol.name} onChange={(e) => setHol((h) => ({ ...h, name: e.target.value }))} placeholder="e.g. Pongal" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          <button disabled={!hol.date} onClick={() => { set('holidays', [...(p.holidays || []).filter((x) => x.date !== hol.date), { date: hol.date, name: hol.name || 'Holiday' }].sort((a, b) => (a.date < b.date ? -1 : 1))); setHol({ date: '', name: '' }); }} className="px-3 py-2 rounded-lg bg-teal-600 text-white text-sm font-bold disabled:opacity-50 cursor-pointer">Add holiday</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(p.holidays || []).length === 0 && <span className="text-sm text-slate-400">No holidays added.</span>}
          {(p.holidays || []).map((h) => (
            <span key={h.date} className="px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-200 text-violet-800 text-xs font-semibold flex items-center gap-1.5">
              {prettyDate(h.date, { day: 'numeric', month: 'short' })} · {h.name}
              <button onClick={() => set('holidays', p.holidays.filter((x) => x.date !== h.date))} className="cursor-pointer"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      </Card>
      <div className="lg:col-span-2 flex items-center justify-end gap-3">
        {msg && <span className={`text-sm font-semibold ${msg.startsWith('✓') ? 'text-emerald-700' : 'text-rose-600'}`}>{msg}</span>}
        <button onClick={save} disabled={saving} className="px-6 py-2.5 rounded-xl bg-[#00897b] text-white font-bold disabled:opacity-60 cursor-pointer">{saving ? 'Saving…' : 'Save policy'}</button>
      </div>
    </div>
  );
}
