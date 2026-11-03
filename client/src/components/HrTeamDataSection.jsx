import React, { useEffect, useMemo, useState } from 'react';
import { Users, Search, ChevronLeft, ChevronRight, Phone, Monitor, GraduationCap, AlertTriangle, PhoneCall } from 'lucide-react';
import { getTeam, onDataUpdate } from '../services/api';
import { localDateKey } from '../utils/dateUtils';

// HR-wise breakdown for HR Team Lead, Branch Head & HR Department Head.
// Works on the records the HR dashboard already loaded for that desk's scope,
// grouped by the counsellor who owns each record.
const norm = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
const leadOwner = (l) => l.counselorAssigned || l.allocatedTo || l.spokenBy || '';
const demoOwner = (d) => d.counselor || d.bookedBy || d.hrName || d.counselorAssigned || d.allocatedTo || '';
const studentOwner = (s) => s.hrName || s.counselor || s.counselorName || s.allocatedTo || '';
const dayKey = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : localDateKey(d);
};
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const isOpenLead = (l) => l.stage !== 'admitted' && l.stage !== 'closed';
const STAGE_LABEL = {
  new: 'New', contacted: 'Contacted', demo_booked: 'Demo Booked', demo_attended: 'Demo Attended',
  fee_followup: 'Fee Discussion', admitted: 'Admitted', closed: 'Closed', not_mentioned: 'Not Mentioned'
};

export default function HrTeamDataSection({
  leads = [],
  students = [],
  demos = [],
  recordings = [],
  scopeKind = 'all',      // 'team' | 'branch' | 'all'
  scopeNames = null,      // team names (Team Lead)
  branch = '',            // branch name (Branch Head)
  scopeLabel = '',
  matchesName             // (recordOwner, memberName) => boolean
}) {
  const todayKey = localDateKey();
  const monthKey = todayKey.slice(0, 7);
  const same = matchesName || ((a, b) => norm(a) === norm(b));

  // HR roster for this scope, so counsellors with zero records still show up
  const [roster, setRoster] = useState([]);
  useEffect(() => {
    const load = () => getTeam({ departmentCode: 'DEP-HR-001', ...(scopeKind === 'branch' && branch ? { branchName: branch } : {}) })
      .then((rows) => setRoster(Array.isArray(rows) ? rows : []))
      .catch(() => setRoster([]));
    load();
    const off = onDataUpdate((e) => { if (e === 'team') load(); });
    return off;
  }, [scopeKind, branch]);

  const members = useMemo(() => {
    const list = [];
    const add = (name, extra = {}) => {
      if (!name || !String(name).trim()) return;
      if (list.some((m) => same(name, m.name) || same(m.name, name))) return;
      list.push({ name: String(name).trim(), role: extra.role || 'HR', branch: extra.branch || '' });
    };
    if (scopeKind === 'team') {
      (scopeNames || []).forEach((n) => {
        const r = roster.find((x) => norm(x.name) === norm(n));
        add(n, { role: r?.role, branch: r?.branchName });
      });
    } else {
      roster.filter((r) => !/head/i.test(r.role || '')).forEach((r) => add(r.name, { role: r.role, branch: r.branchName }));
      // Owners present in the data but not on the roster (older / bulk-uploaded names)
      [...leads.map(leadOwner), ...students.map(studentOwner), ...demos.map(demoOwner)].forEach((n) => add(n));
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, scopeKind, (scopeNames || []).join('|'), leads, students, demos]);

  const rows = useMemo(() => members.map((m) => {
    const own = (owner) => owner && same(owner, m.name);
    const myLeads = leads.filter((l) => own(leadOwner(l)));
    const myStudents = students.filter((s) => own(studentOwner(s)));
    const myDemos = demos.filter((d) => own(demoOwner(d)));
    const myCalls = recordings.filter((r) => own(r.counselorName));
    const open = myLeads.filter(isOpenLead);
    const feesMonth = myStudents.reduce((acc, s) => {
      const receipts = Array.isArray(s.receipts) ? s.receipts : [];
      if (!receipts.length) return acc + (dayKey(s.admissionDate || s.createdAt).startsWith(monthKey) ? Number(s.paidAmount) || 0 : 0);
      return acc + receipts
        .filter((r) => String(r.date || dayKey(r.at)).startsWith(monthKey))
        .reduce((a, r) => a + (Number(r.amount) || 0), 0);
    }, 0);
    const admissionsMonth = myStudents.filter((s) => dayKey(s.admissionDate || s.createdAt).startsWith(monthKey)).length;
    const balance = myStudents.reduce((acc, s) => {
      const bal = s.pendingBalance != null && !isNaN(Number(s.pendingBalance)) ? Number(s.pendingBalance) : Math.max(0, (Number(s.courseFee) || 0) - (Number(s.paidAmount) || 0));
      return acc + bal;
    }, 0);
    return {
      ...m,
      leads: myLeads,
      students: myStudents,
      demos: myDemos,
      calls: myCalls,
      totalLeads: myLeads.length,
      newToday: myLeads.filter((l) => dayKey(l.createdAt) === todayKey).length,
      dueToday: open.filter((l) => l.followUpDate === todayKey).length,
      overdue: open.filter((l) => l.followUpDate && l.followUpDate < todayKey).length,
      demosBooked: myDemos.length,
      demosToday: myDemos.filter((d) => dayKey(d.createdAt) === todayKey).length,
      admissionsMonth,
      admissionsTotal: myStudents.length,
      feesMonth,
      balance,
      callsToday: myCalls.filter((r) => dayKey(r.createdAt) === todayKey).length,
      conversion: myLeads.length ? Math.round((myStudents.length / myLeads.length) * 100) : 0
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [members, leads, students, demos, recordings, todayKey, monthKey]);

  const unassignedLeads = useMemo(() => leads.filter((l) => !leadOwner(l)).length, [leads]);

  const [query, setQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [sortKey, setSortKey] = useState('totalLeads');
  const [selected, setSelected] = useState(null);

  const branches = useMemo(() => Array.from(new Set(rows.map((r) => r.branch).filter(Boolean))).sort(), [rows]);
  const visible = useMemo(() => rows
    .filter((r) => !query || norm(r.name).includes(norm(query)) || norm(r.branch).includes(norm(query)))
    .filter((r) => branchFilter === 'All' || r.branch === branchFilter)
    .sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0)), [rows, query, branchFilter, sortKey]);

  const totals = useMemo(() => visible.reduce((t, r) => ({
    totalLeads: t.totalLeads + r.totalLeads,
    newToday: t.newToday + r.newToday,
    overdue: t.overdue + r.overdue,
    demosBooked: t.demosBooked + r.demosBooked,
    admissionsMonth: t.admissionsMonth + r.admissionsMonth,
    feesMonth: t.feesMonth + r.feesMonth,
    callsToday: t.callsToday + r.callsToday
  }), { totalLeads: 0, newToday: 0, overdue: 0, demosBooked: 0, admissionsMonth: 0, feesMonth: 0, callsToday: 0 }), [visible]);

  const current = selected ? rows.find((r) => r.name === selected) : null;
  if (current) return <HrDrillDown row={current} todayKey={todayKey} onBack={() => setSelected(null)} />;

  const COLS = [
    { key: 'totalLeads', label: 'Leads' },
    { key: 'newToday', label: 'New Today' },
    { key: 'dueToday', label: 'F/U Today' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'callsToday', label: 'Calls Today' },
    { key: 'demosBooked', label: 'Demos' },
    { key: 'admissionsMonth', label: 'Admits (Month)' },
    { key: 'feesMonth', label: 'Fees (Month)', money: true },
    { key: 'balance', label: 'Fee Balance', money: true },
    { key: 'conversion', label: 'Conv. %', pct: true }
  ];

  return (
    <div className="space-y-5 text-left">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white grid place-items-center"><Users className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 leading-tight">HR-wise Data</h2>
              <p className="text-xs text-slate-500">{scopeLabel || 'Your HRs'} · {visible.length} HR{visible.length === 1 ? '' : 's'} · click an HR to open their full data</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search HR or branch" className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-indigo-400 w-48" />
            </div>
            {branches.length > 1 && (
              <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-semibold">
                <option value="All">All branches</option>
                {branches.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-4">
          <Tile label="Total Leads" value={totals.totalLeads} />
          <Tile label="New Today" value={totals.newToday} tone="text-sky-600" />
          <Tile label="Overdue F/U" value={totals.overdue} tone={totals.overdue ? 'text-rose-600' : 'text-emerald-600'} />
          <Tile label="Calls Today" value={totals.callsToday} tone="text-teal-600" />
          <Tile label="Demos" value={totals.demosBooked} tone="text-purple-600" />
          <Tile label="Admits (Month)" value={totals.admissionsMonth} tone="text-emerald-600" />
          <Tile label="Fees (Month)" value={inr(totals.feesMonth)} tone="text-amber-600" />
        </div>
        {unassignedLeads > 0 && (
          <p className="mt-3 text-[11px] font-semibold text-amber-700 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> {unassignedLeads} lead{unassignedLeads === 1 ? '' : 's'} not allocated to any HR yet
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
              <th className="text-left px-4 py-3 font-extrabold">HR</th>
              {COLS.map((c) => (
                <th key={c.key} className="px-3 py-3 font-extrabold text-right whitespace-nowrap">
                  <button onClick={() => setSortKey(c.key)} className={`cursor-pointer ${sortKey === c.key ? 'text-indigo-700' : 'hover:text-slate-800'}`}>
                    {c.label}{sortKey === c.key ? ' ↓' : ''}
                  </button>
                </th>
              ))}
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.name} onClick={() => setSelected(r.name)} className="border-t border-slate-100 hover:bg-indigo-50/40 cursor-pointer">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-[#0e6977] text-white grid place-items-center font-bold text-[11px]">{(r.name || '?')[0].toUpperCase()}</span>
                    <div>
                      <div className="font-bold text-slate-900">{r.name}</div>
                      <div className="text-[10px] text-slate-400">{[r.role, r.branch].filter(Boolean).join(' · ')}</div>
                    </div>
                  </div>
                </td>
                {COLS.map((c) => (
                  <td key={c.key} className={`px-3 py-3 text-right font-bold ${c.key === 'overdue' && r.overdue ? 'text-rose-600' : 'text-slate-800'}`}>
                    {c.money ? inr(r[c.key]) : c.pct ? `${r[c.key]}%` : r[c.key]}
                  </td>
                ))}
                <td className="px-3 py-3 text-slate-400"><ChevronRight className="w-4 h-4" /></td>
              </tr>
            ))}
            {!visible.length && (
              <tr><td colSpan={COLS.length + 2} className="px-4 py-10 text-center text-slate-400">
                {scopeKind === 'team' ? 'No HRs report to you yet — ask Admin to set "Reports to (HR Team Lead)" on your HRs.' : 'No HRs found for this scope.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Tile({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
      <div className={`text-xl font-extrabold leading-none ${tone}`}>{value}</div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">{label}</div>
    </div>
  );
}

function HrDrillDown({ row, todayKey, onBack }) {
  const [tab, setTab] = useState('followups');
  const followups = row.leads
    .filter(isOpenLead)
    .sort((a, b) => String(a.followUpDate || '9999').localeCompare(String(b.followUpDate || '9999')));
  const TABS = [
    { key: 'followups', label: `Follow-ups (${followups.length})`, icon: Phone },
    { key: 'leads', label: `All Leads (${row.leads.length})`, icon: Users },
    { key: 'demos', label: `Demos (${row.demos.length})`, icon: Monitor },
    { key: 'admissions', label: `Admissions (${row.students.length})`, icon: GraduationCap },
    { key: 'calls', label: `Calls (${row.calls.length})`, icon: PhoneCall }
  ];
  const fmt = (v) => {
    const k = dayKey(v);
    return k ? new Date(`${k}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
  };

  return (
    <div className="space-y-4 text-left">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer">
        <ChevronLeft className="w-3.5 h-3.5" /> All HRs
      </button>

      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-full bg-[#0e6977] text-white grid place-items-center font-extrabold">{(row.name || '?')[0].toUpperCase()}</span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 leading-tight">{row.name}</h2>
            <p className="text-xs text-slate-500">{[row.role, row.branch].filter(Boolean).join(' · ') || 'HR'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-4">
          <Tile label="Leads" value={row.totalLeads} />
          <Tile label="New Today" value={row.newToday} tone="text-sky-600" />
          <Tile label="F/U Today" value={row.dueToday} tone="text-amber-600" />
          <Tile label="Overdue" value={row.overdue} tone={row.overdue ? 'text-rose-600' : 'text-emerald-600'} />
          <Tile label="Calls Today" value={row.callsToday} tone="text-teal-600" />
          <Tile label="Demos" value={row.demosBooked} tone="text-purple-600" />
          <Tile label="Admits (Month)" value={row.admissionsMonth} tone="text-emerald-600" />
          <Tile label="Fees (Month)" value={inr(row.feesMonth)} tone="text-amber-600" />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${tab === t.key ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-x-auto">
        {(tab === 'followups' || tab === 'leads') && (
          <Table
            head={['Lead', 'Phone', 'Course', 'Branch', 'Stage', 'Follow-up', 'Added']}
            rows={(tab === 'followups' ? followups : row.leads).map((l) => [
              l.fullName || l.name || '—',
              l.phone || '—',
              l.course || '—',
              l.branch || l.location || '—',
              STAGE_LABEL[l.stage] || l.stage || '—',
              <span className={l.followUpDate && l.followUpDate < todayKey && isOpenLead(l) ? 'text-rose-600 font-bold' : l.followUpDate === todayKey ? 'text-amber-600 font-bold' : ''}>{l.followUpDate ? fmt(l.followUpDate) : '—'}</span>,
              fmt(l.createdAt)
            ])}
            empty="No leads"
          />
        )}
        {tab === 'demos' && (
          <Table
            head={['Candidate', 'Phone', 'Course', 'Demo Date', 'Slot', 'Trainer', 'Status']}
            rows={row.demos.map((d) => [d.candidateName || '—', d.phone || '—', d.course || '—', d.preferredDate ? fmt(d.preferredDate) : '—', d.timeSlot || d.time || '—', d.trainer || '—', d.status || '—'])}
            empty="No demos"
          />
        )}
        {tab === 'admissions' && (
          <Table
            head={['Student', 'ID', 'Course', 'Admitted', 'Fee', 'Paid', 'Balance']}
            rows={row.students.map((s) => {
              const fee = Number(s.courseFee) || 0;
              const paid = Number(s.paidAmount) || 0;
              const bal = s.pendingBalance != null && !isNaN(Number(s.pendingBalance)) ? Number(s.pendingBalance) : Math.max(0, fee - paid);
              return [s.name || '—', s.studentId || '—', s.course || '—', fmt(s.admissionDate || s.createdAt), inr(fee), inr(paid), <span className={bal > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>{inr(bal)}</span>];
            })}
            empty="No admissions"
          />
        )}
        {tab === 'calls' && (
          <Table
            head={['Lead', 'Phone', 'Outcome', 'Date', 'Notes']}
            rows={row.calls.map((r) => [r.leadName || '—', r.leadPhone || '—', r.outcome || '—', fmt(r.createdAt), r.notes || '—'])}
            empty="No call recordings"
          />
        )}
      </div>
    </div>
  );
}

function Table({ head, rows, empty }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
          {head.map((h) => <th key={h} className="text-left px-4 py-3 font-extrabold whitespace-nowrap">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, i) => (
          <tr key={i} className="border-t border-slate-100">
            {cells.map((c, j) => <td key={j} className="px-4 py-2.5 text-slate-700 whitespace-nowrap max-w-[260px] truncate">{c}</td>)}
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={head.length} className="px-4 py-8 text-center text-slate-400">{empty}</td></tr>}
      </tbody>
    </table>
  );
}
