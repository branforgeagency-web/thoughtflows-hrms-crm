import React, { useEffect, useMemo, useState } from 'react';
import { Target, Plus, Trash2, Calendar, Users, CheckCircle2, X, Download } from 'lucide-react';
import {
  getHrTargetProgress, createHrTarget, deleteHrTarget, logHrTargetProgress, getTeam, onDataUpdate
} from '../services/api';

// Monthly targets & tasks for branch HRs.
//   Branch Head / HR Department Head → assign tasks month-wise and track every HR
//   HR counsellor / Team Lead          → see their own tasks, week by week
// Progress is counted live from the HR's own records (admissions, fees, demos,
// calls, leads); "Custom" tasks are logged by the HR with "+ Log".

const METRICS = [
  { key: 'admissions', label: 'Admissions' },
  { key: 'fees', label: 'Fees Collected (₹)' },
  { key: 'demos', label: 'Demos Booked' },
  { key: 'calls', label: 'Calls Made' },
  { key: 'leads', label: 'Leads Added' },
  { key: 'custom', label: 'Custom Task (HR logs it)' }
];
const norm = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
const isHeadRole = (r) => /\bhead\b|\bhod\b|manager|business\s*lead|director|founder|admin/i.test(r || '');
const istNow = () => new Date(Date.now() + 330 * 60000);
const thisMonthKey = () => istNow().toISOString().slice(0, 7);
const todayKey = () => istNow().toISOString().slice(0, 10);
const fmtNum = (n, unit) => (unit === '₹' ? `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}` : (Number(n) || 0).toLocaleString('en-IN'));
const fmtDay = (k) => new Date(`${k}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const monthLabel = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const pctTone = (p) => (p >= 100 ? 'bg-emerald-500' : p >= 60 ? 'bg-teal-500' : p >= 30 ? 'bg-amber-500' : 'bg-rose-500');

export default function HrMonthlyTasks({ currentUser, scopeKind = null, branch = '' }) {
  const isManagerView = scopeKind === 'branch' || scopeKind === 'all';
  const [month, setMonth] = useState(thisMonthKey());
  const [branchFilter, setBranchFilter] = useState(branch || '');
  const [data, setData] = useState({ weeks: [], rows: [], canAssign: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roster, setRoster] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ assignedTo: 'All HR', metric: 'admissions', title: '', target: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [logFor, setLogFor] = useState(null); // row being logged
  const [logCount, setLogCount] = useState('1');
  const [logDate, setLogDate] = useState(todayKey());
  const [toast, setToast] = useState('');

  const say = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };
  const activeBranch = scopeKind === 'branch' ? (branch || currentUser?.branch || '') : branchFilter;

  const load = () => {
    setLoading(true);
    return getHrTargetProgress({ month, ...(activeBranch ? { branch: activeBranch } : {}) })
      .then((res) => { setData(res || { weeks: [], rows: [] }); setError(''); })
      .catch((e) => setError(e?.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    const off = onDataUpdate((e) => { if (['targets', 'students', 'demos', 'leads', 'calls'].includes(e)) load(); });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, activeBranch]);

  // Branch HRs for the "Assign to" list
  useEffect(() => {
    if (!isManagerView) return;
    getTeam({ departmentCode: 'DEP-HR-001', ...(activeBranch ? { branchName: activeBranch } : {}) })
      .then((rows) => setRoster((Array.isArray(rows) ? rows : []).filter((r) => r.name && !isHeadRole(r.role))))
      .catch(() => setRoster([]));
  }, [isManagerView, activeBranch]);

  const branches = useMemo(() => Array.from(new Set(roster.map((r) => r.branchName).filter(Boolean))).sort(), [roster]);
  const canAssign = Boolean(data.canAssign) && isManagerView;
  const curWeek = month === thisMonthKey() ? Math.min(5, Math.floor((Number(todayKey().slice(8, 10)) - 1) / 7) + 1) : null;

  // Group rows by HR
  const groups = useMemo(() => {
    const map = new Map();
    (data.rows || []).forEach((r) => {
      const k = norm(r.hr);
      if (!map.has(k)) map.set(k, { hr: r.hr, branch: r.hrBranch, rows: [] });
      map.get(k).rows.push(r);
    });
    return [...map.values()]
      .map((g) => ({ ...g, pct: g.rows.length ? Math.round(g.rows.reduce((a, r) => a + Math.min(100, r.percent), 0) / g.rows.length) : 0 }))
      .sort((a, b) => b.pct - a.pct || a.hr.localeCompare(b.hr));
  }, [data.rows]);

  const summary = useMemo(() => {
    const rows = data.rows || [];
    const met = rows.filter((r) => r.target && r.monthDone >= r.target).length;
    const avg = rows.length ? Math.round(rows.reduce((a, r) => a + Math.min(100, r.percent), 0) / rows.length) : 0;
    return { tasks: new Set(rows.map((r) => r.taskId)).size, hrs: groups.length, met, total: rows.length, avg };
  }, [data.rows, groups.length]);

  const submit = async (e) => {
    e.preventDefault();
    const target = Number(form.target);
    if (!target || target < 0) return say('Enter the target number');
    if (form.metric === 'custom' && !form.title.trim()) return say('Enter the task name');
    setSaving(true);
    try {
      await createHrTarget({
        month,
        metric: form.metric,
        title: form.title.trim() || METRICS.find((m) => m.key === form.metric)?.label.replace(/ \(.*\)$/, ''),
        target,
        unit: form.metric === 'fees' ? '₹' : 'Count',
        assignedTo: form.assignedTo,
        branch: activeBranch,
        notes: form.notes.trim()
      });
      say(`✓ Task assigned for ${monthLabel(month)}`);
      setForm((f) => ({ ...f, title: '', target: '', notes: '' }));
      setShowForm(false);
      load();
    } catch (err) {
      say(`⚠ ${err?.response?.data?.error || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    const who = /^all\s*hr$/i.test(row.assignedTo) ? 'ALL HRs' : row.assignedTo;
    if (!window.confirm(`Delete "${row.title}" (assigned to ${who}) for ${monthLabel(month)}?`)) return;
    try { await deleteHrTarget(row.taskId); say('Task deleted'); load(); } catch (err) { say(`⚠ ${err?.response?.data?.error || err.message}`); }
  };

  const saveLog = async () => {
    const n = Number(logCount);
    if (!n) return say('Enter how many you completed');
    try {
      await logHrTargetProgress(logFor.taskId, { count: n, date: logDate, ...(isManagerView ? { hr: logFor.hr } : {}) });
      say('✓ Progress logged');
      setLogFor(null);
      setLogCount('1');
      load();
    } catch (err) {
      say(`⚠ ${err?.response?.data?.error || err.message}`);
    }
  };

  const weeks = data.weeks || [];

  // Download the targets sheet (opens in Excel / Google Sheets)
  const downloadSheet = () => {
    const rows = groups.flatMap((g) => g.rows);
    if (!rows.length) return say('No tasks to download for this month');
    const esc = (v) => {
      const t = String(v ?? '');
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const head = [
      'HR', 'Branch', 'Task', 'Task Type', 'Assigned To', 'Assigned By', 'Notes', 'Monthly Target',
      ...weeks.map((w) => `Week ${w.week} (${fmtDay(w.from)} - ${fmtDay(w.to)})`),
      'Month Done', 'Completion %', 'Status'
    ];
    const lines = rows.map((r) => [
      r.hr,
      r.hrBranch || r.taskBranch || '',
      r.title,
      r.metricLabel,
      /^all\s*hr$/i.test(r.assignedTo) ? 'All HRs' : r.assignedTo,
      r.assignedBy,
      r.notes,
      r.target,
      ...weeks.map((w, i) => r.weeks[i] || 0),
      r.monthDone,
      `${r.percent}%`,
      r.target && r.monthDone >= r.target ? 'Completed' : (curWeek ? 'In progress' : 'Not completed')
    ]);
    const title = [`HR Monthly Targets - ${monthLabel(month)}${activeBranch ? ` - ${activeBranch}` : ''}`];
    const csv = [title, [], head, ...lines].map((l) => l.map(esc).join(',')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HR_Targets_${(activeBranch || 'All_Branches').replace(/[^a-zA-Z0-9]+/g, '_')}_${month}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const input = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500';

  return (
    <div className="space-y-4 text-left">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500 text-white grid place-items-center"><Target className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 leading-tight">
                {isManagerView ? 'Monthly Targets & Tasks' : 'My Monthly Tasks'}
              </h2>
              <p className="text-xs text-slate-500">
                {isManagerView
                  ? `Assign month-wise tasks to ${activeBranch ? `${activeBranch} branch` : 'your'} HRs · weekly & monthly completion`
                  : 'Assigned by your Branch Head / HR Head · weekly & monthly completion'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {scopeKind === 'all' && (
              <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700">
                <option value="">All branches</option>
                {branches.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="bg-transparent outline-none" />
            </label>
            <button type="button" onClick={downloadSheet} disabled={!groups.length}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold disabled:opacity-50 cursor-pointer">
              <Download className="w-4 h-4" /> Download Sheet
            </button>
            {canAssign && (
              <button type="button" onClick={() => setShowForm((s) => !s)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#00897b] hover:bg-[#00796b] text-white text-sm font-bold cursor-pointer">
                {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {showForm ? 'Close' : 'Assign Task'}
              </button>
            )}
          </div>
        </div>

        {/* Assign form */}
        {canAssign && showForm && (
          <form onSubmit={submit} className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Assign to</label>
              <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className={input}>
                <option value="All HR">{activeBranch ? `All HRs · ${activeBranch}` : 'All HRs (every branch)'}</option>
                {roster.map((r) => <option key={r._id || r.name} value={r.name}>{r.name}{r.branchName && !activeBranch ? ` · ${r.branchName}` : ''}</option>)}
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Task type</label>
              <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} className={input}>
                {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Task name {form.metric === 'custom' ? '' : '(optional)'}</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={input}
                placeholder={form.metric === 'custom' ? 'e.g. College visits, Walk-in follow-ups' : METRICS.find((m) => m.key === form.metric)?.label} />
            </div>
            <div className="md:col-span-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Monthly target {form.metric === 'fees' ? '(₹)' : ''}</label>
              <input type="number" min="1" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className={input} placeholder="e.g. 20" />
            </div>
            <button type="submit" disabled={saving} className="md:col-span-1 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold disabled:opacity-60 cursor-pointer">
              {saving ? 'Saving…' : `Assign for ${new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })}`}
            </button>
            <div className="md:col-span-6">
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={input} placeholder="Notes for the HR (optional)" />
              <p className="text-[11px] text-slate-500 mt-1.5">
                {form.metric === 'custom'
                  ? 'Custom tasks are updated by the HR with "+ Log".'
                  : 'Counted automatically from the HR\'s own records — no manual update needed.'}
              </p>
            </div>
          </form>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: isManagerView ? 'Tasks assigned' : 'My tasks', value: summary.tasks },
          { label: isManagerView ? 'HRs with tasks' : 'Month', value: isManagerView ? summary.hrs : new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) },
          { label: 'Targets completed', value: `${summary.met} / ${summary.total}` },
          { label: 'Average completion', value: `${summary.avg}%` }
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs border-l-4 border-l-[#00897b]">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">{c.label}</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Weekly / monthly table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-x-auto">
        {loading && !data.rows?.length ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading tasks…</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-rose-600">⚠ {error}</div>
        ) : !groups.length ? (
          <div className="p-10 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700 mt-2">No tasks for {monthLabel(month)}</div>
            <div className="text-xs text-slate-500 mt-1">
              {canAssign ? 'Use "Assign Task" to set this month\'s targets for your HRs.' : 'Your Branch Head has not assigned tasks for this month yet.'}
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="text-left font-bold px-4 py-3">Task</th>
                <th className="text-right font-bold px-3 py-3">Monthly target</th>
                {weeks.map((w) => (
                  <th key={w.week} className={`text-center font-bold px-2 py-3 whitespace-nowrap ${curWeek === w.week ? 'text-teal-700 bg-teal-50' : ''}`}>
                    Week {w.week}
                    <div className="text-[10px] font-medium normal-case text-slate-400">{fmtDay(w.from)} – {fmtDay(w.to)}</div>
                  </th>
                ))}
                <th className="text-center font-bold px-3 py-3">This month</th>
                <th className="text-left font-bold px-3 py-3 min-w-[140px]">Progress</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <React.Fragment key={g.hr}>
                  {isManagerView && (
                    <tr className="bg-slate-50/70 border-t border-slate-200">
                      <td colSpan={weeks.length + 5} className="px-4 py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-900">{g.hr}{g.branch ? <span className="text-xs font-medium text-slate-500"> · {g.branch}</span> : null}</span>
                          <span className="text-xs font-bold text-slate-600">{g.pct}% overall</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {g.rows.map((r) => (
                    <tr key={`${r.taskId}-${r.hr}`} className="border-t border-slate-100">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-800">{r.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {r.metricLabel}{/^all\s*hr$/i.test(r.assignedTo) ? ' · all HRs' : ''}{r.assignedBy ? ` · by ${r.assignedBy}` : ''}
                          {r.notes ? ` · ${r.notes}` : ''}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-800 whitespace-nowrap">{fmtNum(r.target, r.unit)}</td>
                      {weeks.map((w, i) => (
                        <td key={w.week} className={`px-2 py-2.5 text-center whitespace-nowrap ${curWeek === w.week ? 'bg-teal-50/40' : ''}`}>
                          <span className={`inline-block px-2 py-0.5 rounded-md font-bold ${r.weeks[i] ? 'text-slate-900' : 'text-slate-300'}`}>
                            {fmtNum(r.weeks[i], r.unit)}
                          </span>
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <span className="font-black text-slate-900">{fmtNum(r.monthDone, r.unit)}</span>
                        <span className="text-slate-400"> / {fmtNum(r.target, r.unit)}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pctTone(r.percent)}`} style={{ width: `${Math.min(100, r.percent)}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-700 w-10 text-right">{r.percent}%</span>
                          {r.target > 0 && r.monthDone >= r.target && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap text-right">
                        {r.metric === 'custom' && (
                          <button type="button" onClick={() => { setLogFor(r); setLogDate(month === thisMonthKey() ? todayKey() : `${month}-01`); }}
                            className="px-2 py-1 rounded-md text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 cursor-pointer mr-1">+ Log</button>
                        )}
                        {canAssign && (
                          <button type="button" onClick={() => remove(r)} title="Delete task" className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Log progress for a custom task */}
      {logFor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900">Log progress</h3>
              <button type="button" onClick={() => setLogFor(null)} className="p-1 rounded-md hover:bg-slate-100 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="text-sm text-slate-600"><b>{logFor.title}</b>{isManagerView ? ` · ${logFor.hr}` : ''}</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Completed</label>
                <input type="number" value={logCount} onChange={(e) => setLogCount(e.target.value)} className={input} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Date</label>
                <input type="date" value={logDate} min={`${month}-01`} max={weeks.length ? weeks[weeks.length - 1].to : undefined} onChange={(e) => setLogDate(e.target.value)} className={input} />
              </div>
            </div>
            <button type="button" onClick={saveLog} className="w-full py-2.5 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white text-sm font-bold cursor-pointer">Save</button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold shadow-lg">{toast}</div>
      )}
    </div>
  );
}
