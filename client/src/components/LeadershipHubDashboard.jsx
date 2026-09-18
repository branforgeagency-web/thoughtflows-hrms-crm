import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ArrowLeft,
  MapPin,
  Building2,
  Users,
  Award,
  Briefcase,
  GraduationCap,
  HeartHandshake,
  Server,
  PieChart,
  PhoneCall,
  Settings,
  LayoutGrid,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Trophy,
  Radio,
  Video,
  FileText,
  Filter,
  GitBranch,
  Activity,
  Wallet,
  ClipboardList
} from 'lucide-react';
import {
  getBranches,
  getDepartments,
  getLeadershipSummary,
  getApprovals,
  decideApproval,
  getEscalations,
  updateEscalationStatus,
  getTeam,
  setTeamMemberShift,
  getBranchAttendance,
  getOrgAttendanceSummary,
  getAttendanceByBranch,
  clockIn,
  clockOut,
  setAttendanceBreak,
  getLeads,
  getDemos,
  getStudents
} from '../services/api';

const DEPT_ICONS = { PhoneCall, GraduationCap, HeartHandshake, Award, Briefcase, Users, Server, PieChart };
const SHIFTS = { morning: 'Morning', general: 'General', evening: 'Evening', off: 'Off today' };

// Exact gradient family from the original Leadership Hub design, one per tier.
const ACCENTS = {
  operational: { grad: 'linear-gradient(135deg,#A78BFA,#6D28D9)', text: 'text-violet-700', soft: 'bg-violet-50', border: 'border-violet-200', ring: 'hover:border-violet-300' },
  department: { grad: 'linear-gradient(135deg,#34D399,#059669)', text: 'text-emerald-700', soft: 'bg-emerald-50', border: 'border-emerald-200', ring: 'hover:border-emerald-300' },
  regional: { grad: 'linear-gradient(135deg,#60A5FA,#2563EB)', text: 'text-blue-700', soft: 'bg-blue-50', border: 'border-blue-200', ring: 'hover:border-blue-300' },
  branch: { grad: 'linear-gradient(135deg,#FBBF24,#D97706)', text: 'text-orange-700', soft: 'bg-orange-50', border: 'border-orange-200', ring: 'hover:border-orange-300' }
};

const TIERS = [
  {
    key: 'operational',
    tier: 'TIER 1',
    name: 'Operational Head',
    desc: 'Top of the chain — full visibility across every region, department & branch.',
    scope: 'ALL OF THOUGHTFLOWS',
    icon: Settings
  },
  {
    key: 'department',
    tier: 'TIER 2',
    name: 'Department Head',
    desc: 'Leads all the heads in a function — sets the priorities that flow down to regions & branches.',
    scope: 'A DEPARTMENT · ALL REGIONS',
    icon: LayoutGrid
  },
  {
    key: 'regional',
    tier: 'TIER 3',
    name: 'Regional Manager',
    desc: 'Owns one specific location — the branches in that region report to them.',
    scope: 'ONE REGION',
    icon: MapPin
  },
  {
    key: 'branch',
    tier: 'TIER 4',
    name: 'Branch Manager',
    desc: 'Runs one branch — allocates leads to HRs and monitors them.',
    scope: 'ONE BRANCH',
    icon: Building2
  }
];

const OP_TABS = [
  { key: 'command', label: 'Command Desk', icon: Settings },
  { key: 'connectivity', label: 'Connectivity Board', icon: GitBranch },
  { key: 'branches', label: 'Branch Ops', icon: Building2 },
  { key: 'departments', label: 'Department Coordination', icon: LayoutGrid },
  { key: 'students', label: 'Student Movement', icon: Activity },
  { key: 'handover', label: 'Admission → Training', icon: HeartHandshake },
  { key: 'escalations', label: 'Escalation Desk', icon: AlertTriangle, badgeKey: 'openEscalations' },
  { key: 'approvals', label: 'Approvals', icon: CheckCircle2, badgeKey: 'pendingApprovals' },
  { key: 'feerisk', label: 'Fee Risk', icon: Wallet },
  { key: 'training', label: 'Training Progress', icon: GraduationCap },
  { key: 'placement', label: 'Placement Readiness', icon: Briefcase },
  { key: 'staff', label: 'Staff & Attendance', icon: Clock },
  { key: 'reports', label: 'Reports & Summary', icon: ClipboardList }
];

const DEPT_TABS = [
  { key: 'desk', label: 'My Desk' },
  { key: 'team', label: 'Team' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'escalations', label: 'Escalations' },
  { key: 'sop', label: 'SOP Hub' },
  { key: 'reports', label: 'Reports' }
];

const BRANCH_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'leads', label: 'Leads' },
  { key: 'team', label: 'Team & Roster' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'escalations', label: 'Escalations' }
];

/**
 * Counts pending approvals & open escalations for a given scope (department
 * or branch), by fetching those two live collections filtered server-side.
 * Shared by the Department Head "My Desk" tab and the Branch Manager
 * "Overview" tab so both show real, live numbers instead of placeholders.
 */
function useDeskCounts(filter) {
  const key = JSON.stringify(filter || {});
  const [approvals, setApprovals] = useState(null);
  const [escalations, setEscalations] = useState(null);

  useEffect(() => {
    const f = JSON.parse(key);
    getApprovals(f).then((a) => setApprovals(Array.isArray(a) ? a : [])).catch(() => setApprovals([]));
    getEscalations(f).then((e) => setEscalations(Array.isArray(e) ? e : [])).catch(() => setEscalations([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    approvals,
    escalations,
    pendingApprovals: approvals ? approvals.filter((a) => a.status === 'pending').length : null,
    openEscalations: escalations ? escalations.filter((e) => !['resolved', 'closed'].includes(e.status)).length : null
  };
}

/**
 * Leadership Hub — full-page dashboard (mirrors the original prototype's
 * landing design: gradient hero, four-tier role picker, live snapshot
 * strip) wired to real data. Each tier is its own tabbed "desk" — Command
 * Desk / Department Head Desk / Regional view / Branch Manager Desk — all
 * drawing on live collections (branches, departments, students, leads,
 * demos, approvals, escalations, team, attendance). Nothing shown here is
 * fabricated: every figure traces back to a real MongoDB collection.
 */
export default function LeadershipHubDashboard({ onClose, currentUser }) {
  const [view, setView] = useState('landing');
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [summary, setSummary] = useState({ pendingApprovals: 0, openEscalations: 0 });
  const [orgAttendance, setOrgAttendance] = useState(null);

  useEffect(() => {
    Promise.all([getBranches(), getDepartments()])
      .then(([b, d]) => {
        setBranches(Array.isArray(b) ? b : []);
        setDepartments(Array.isArray(d) ? d : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    getLeadershipSummary().then(setSummary).catch(() => {});
    getOrgAttendanceSummary().then(setOrgAttendance).catch(() => {});
  }, []);

  const regions = useMemo(() => {
    const map = {};
    branches.forEach((b) => {
      const key = b.state || 'Unmapped';
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return Object.entries(map)
      .map(([state, list]) => ({
        state,
        branches: list,
        totalStudents: list.reduce((s, b) => s + (b.activeStudents || 0), 0),
        totalStaff: list.reduce((s, b) => s + (b.staffCount || 0), 0)
      }))
      .sort((a, b) => b.branches.length - a.branches.length);
  }, [branches]);

  const totals = useMemo(
    () => ({
      branches: branches.length,
      students: branches.reduce((s, b) => s + (b.activeStudents || 0), 0),
      staff: branches.reduce((s, b) => s + (b.staffCount || 0), 0),
      departments: departments.length
    }),
    [branches, departments]
  );

  const topBranch = useMemo(
    () => (branches.length ? [...branches].sort((a, b) => (b.activeStudents || 0) - (a.activeStudents || 0))[0] : null),
    [branches]
  );
  const weakBranch = useMemo(
    () => (branches.length ? [...branches].sort((a, b) => (a.activeStudents || 0) - (b.activeStudents || 0))[0] : null),
    [branches]
  );

  function backToLanding() {
    setView('landing');
    setSelectedDept(null);
    setSelectedRegion(null);
    setSelectedBranch(null);
  }

  function refreshSummary() {
    getLeadershipSummary().then(setSummary).catch(() => {});
  }

  function openBranch(b) {
    setSelectedBranch(b);
    setView('branch');
  }
  function openDept(d) {
    setSelectedDept(d);
    setView('department');
  }
  function openRegion(r) {
    setSelectedRegion(r);
    setView('regional');
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F5F5FA] font-sans text-slate-800">
      {/* Top navbar */}
      <header
        className="sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 flex-wrap shadow-md"
        style={{ background: 'linear-gradient(90deg,#1E1B4B,#2E2A72 55%,#3730A3)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/90 hover:bg-white text-slate-700 text-xs font-bold transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Portal Home
          </button>
          <div className="bg-white rounded-xl px-2.5 py-1.5 shadow-sm hidden sm:block">
            <img src="/thoughtflows-logo.png" alt="Thoughtflows" className="h-6 w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white leading-tight">Leadership Hub</h1>
            <p className="text-[10px] font-bold tracking-[0.2em] text-indigo-200/70 uppercase">Allocate · Monitor · Approve</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/10 rounded-full pl-2 pr-4 py-1.5">
          <span className="w-8 h-8 rounded-full grid place-items-center text-xs font-bold text-white bg-gradient-to-br from-violet-400 to-indigo-600 flex-shrink-0">
            {(currentUser?.name || 'L')[0]}
          </span>
          <div>
            <div className="text-xs font-bold text-white leading-tight">Leadership</div>
            <div className="text-[9px] font-bold tracking-[0.15em] text-indigo-200/70 uppercase">
              {view === 'landing' ? 'Select a role' : TIERS.find((t) => t.key === view)?.name || 'Browsing'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {view !== 'landing' && (
          <button
            onClick={backToLanding}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Leadership Hub
          </button>
        )}

        {view === 'landing' && (
          <>
            {/* Hero */}
            <div
              className="rounded-3xl p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 items-center relative overflow-hidden"
              style={{ background: 'linear-gradient(120deg,#1E1B4B,#312E81 60%,#4338CA)' }}
            >
              <div
                className="absolute -right-16 -top-16 w-80 h-80 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.35), transparent 70%)' }}
              />
              <div className="relative z-10">
                <div className="text-[11px] font-bold tracking-[0.25em] text-violet-300 uppercase mb-3">Leadership Control Centre</div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-[1.05] tracking-tight">
                  Run every branch
                  <br />
                  <span className="text-violet-300">from one place.</span>
                </h2>
                <p className="text-indigo-100/80 text-sm mt-4 max-w-md">
                  Allocate work, monitor every branch &amp; department live, clear approvals and escalations — all from one console.
                </p>
              </div>
              <div className="relative z-10 grid grid-cols-2 gap-3.5">
                <HeroStat value={loading ? '…' : totals.branches} label="Branches" />
                <HeroStat value={loading ? '…' : totals.departments} label="Departments" />
                <HeroStat value={loading ? '…' : totals.students.toLocaleString()} label="Active Students" />
                <HeroStat value={loading ? '…' : totals.staff} label="Total Staff" />
              </div>
            </div>

            {/* Role picker */}
            <div>
              <div className="text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3">Select Your Role</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {TIERS.map((t) => {
                  const Icon = t.icon;
                  const accent = ACCENTS[t.key];
                  return (
                    <button
                      key={t.key}
                      onClick={() => setView(t.key)}
                      className={`text-left bg-white border-2 border-slate-200 ${accent.ring} rounded-[20px] p-6 min-h-[210px] flex flex-col transition-all hover:-translate-y-1 hover:shadow-xl group`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="w-[54px] h-[54px] rounded-2xl grid place-items-center shadow-md" style={{ background: accent.grad }}>
                          <Icon className="w-[27px] h-[27px] text-white" />
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">{t.tier}</span>
                      </div>
                      <div className="text-lg font-extrabold text-slate-900 tracking-tight">{t.name}</div>
                      <p className="text-[13px] text-slate-500 mt-1.5 flex-1">{t.desc}</p>
                      <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-slate-100">
                        <span className={`text-[10px] font-bold tracking-wide ${accent.text}`}>{t.scope}</span>
                        <span className="text-[13px] font-extrabold text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all">Open →</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live snapshot strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <LiveCard
                icon={<Radio className="w-3.5 h-3.5 text-emerald-500" />}
                label="Live Now"
                value={orgAttendance ? `${orgAttendance.present} on duty` : '…'}
                sub={orgAttendance ? `across all branches · ${orgAttendance.absent} not logged in` : 'loading…'}
              />
              <LiveCard
                icon={<Trophy className="w-3.5 h-3.5 text-amber-500" />}
                label="Top Branch"
                value={topBranch ? topBranch.name : '—'}
                sub={topBranch ? `${topBranch.activeStudents} students · ${topBranch.staffCount} staff` : 'loading…'}
              />
              <LiveCard
                icon={<Zap className="w-3.5 h-3.5 text-orange-500" />}
                label="Needs Attention"
                value={weakBranch ? weakBranch.name : '—'}
                sub={weakBranch ? `${weakBranch.activeStudents} students · ${weakBranch.staffCount} staff` : 'loading…'}
              />
              <LiveCard
                icon={<CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                label="Pending Approvals"
                value={summary.pendingApprovals + summary.openEscalations}
                sub="approvals & escalations waiting"
              />
            </div>
          </>
        )}

        {view === 'operational' && (
          <OperationalView
            totals={totals}
            departments={departments}
            branches={branches}
            regions={regions}
            summary={summary}
            currentUser={currentUser}
            onSelectDept={openDept}
            onSelectRegion={openRegion}
            onSelectBranch={openBranch}
            onChanged={refreshSummary}
          />
        )}

        {view === 'department' && !selectedDept && (
          <DeptPicker departments={departments} loading={loading} onSelect={setSelectedDept} />
        )}
        {view === 'department' && selectedDept && (
          <DeptDetail department={selectedDept} onBack={() => setSelectedDept(null)} onChanged={refreshSummary} />
        )}

        {view === 'regional' && !selectedRegion && <RegionPicker regions={regions} onSelect={setSelectedRegion} />}
        {view === 'regional' && selectedRegion && (
          <RegionDetail region={selectedRegion} onBack={() => setSelectedRegion(null)} onSelectBranch={openBranch} />
        )}

        {view === 'branch' && !selectedBranch && <BranchPicker branches={branches} onSelect={setSelectedBranch} />}
        {view === 'branch' && selectedBranch && (
          <BranchDetail branch={selectedBranch} onBack={() => setSelectedBranch(null)} onChanged={refreshSummary} />
        )}
      </main>
    </div>
  );
}

function HeroStat({ value, label }) {
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-3.5">
      <div className="text-3xl font-extrabold text-white leading-none">{value}</div>
      <div className="text-[10px] font-bold text-indigo-200/80 tracking-wide uppercase mt-1.5">{label}</div>
    </div>
  );
}

function LiveCard({ icon, label, value, sub }) {
  return (
    <div className="bg-white border border-slate-200 rounded-[18px] px-5 py-4">
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-500 tracking-wide uppercase">
        {icon} {label}
      </div>
      <div className="text-xl font-extrabold text-slate-900 mt-2.5 tracking-tight">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="p-3 rounded-xl bg-white border border-slate-200 text-center">
      <div className={`text-xl font-extrabold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function SectionCard({ title, action, children }) {
  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-slate-900">{title}</h4>
        {action && (
          <button onClick={action.onClick} className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800">
            {action.label} <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function TabBar({ tabs, active, onChange, accent, badges }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto flex-wrap pb-1 -mx-1 px-1">
      {tabs.map((t) => {
        const isActive = t.key === active;
        const Icon = t.icon;
        const badgeVal = badges && t.badgeKey ? badges[t.badgeKey] : null;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all border ${
              isActive ? `${accent.soft} ${accent.text} ${accent.border}` : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
            }`}
          >
            {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
            {t.label}
            {typeof badgeVal === 'number' && badgeVal > 0 ? (
              <span className="ml-0.5 text-[9px] font-extrabold bg-rose-500 text-white rounded-full w-4 h-4 grid place-items-center flex-shrink-0">
                {badgeVal}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function DeskHeader({ icon: Icon, iconBg, title, subtitleParts, stat }) {
  return (
    <div className="relative bg-white border border-slate-200 rounded-2xl p-5 pl-6 flex items-center justify-between gap-4 overflow-hidden flex-wrap">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: iconBg }} />
      <div className="flex items-center gap-3.5 min-w-0">
        <span className="w-12 h-12 rounded-xl grid place-items-center flex-shrink-0" style={{ background: iconBg }}>
          <Icon className="w-6 h-6 text-white" />
        </span>
        <div className="min-w-0">
          <div className="text-lg font-extrabold text-slate-900 truncate">{title}</div>
          <div className="text-xs text-slate-500 mt-0.5 truncate">{(subtitleParts || []).filter(Boolean).join(' · ')}</div>
        </div>
      </div>
      {stat && (
        <div className="text-right flex-shrink-0">
          <div className="text-3xl font-extrabold leading-none" style={{ color: stat.color || '#D97706' }}>{stat.value}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-1">{stat.label}</div>
        </div>
      )}
    </div>
  );
}

// ---- Approvals & Escalations (reused org-wide, per-department, per-branch) ----

function ApprovalsDesk({ filter, scopeLabel, accent, onChanged }) {
  const a = accent || ACCENTS.department;
  const key = JSON.stringify(filter || {});
  const [approvals, setApprovals] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    getApprovals(JSON.parse(key))
      .then((data) => setApprovals(Array.isArray(data) ? data : []))
      .catch(() => setApprovals([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { load(); }, [load]);

  async function decide(id, action) {
    setBusyId(id);
    try {
      await decideApproval(id, action);
      load();
      onChanged && onChanged();
    } finally {
      setBusyId(null);
    }
  }

  if (approvals === null) return <div className="py-8 text-center text-slate-500 text-xs">Loading approvals…</div>;

  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200">
      <h4 className="text-xs font-bold text-slate-900 mb-1">✅ Approvals — {scopeLabel}</h4>
      <p className="text-[10px] text-slate-500 mb-3">{approvals.filter((x) => x.status === 'pending').length} pending</p>
      {approvals.length === 0 ? (
        <div className="text-[11px] text-slate-400 py-4 text-center">Nothing here yet.</div>
      ) : (
        <div className="space-y-2">
          {approvals.map((ap) => (
            <div key={ap._id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 truncate">{ap.title}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {ap.kind} · {ap.departmentCode}{ap.branchName ? ` · ${ap.branchName}` : ''} · requested by {ap.requestedBy}
                </div>
              </div>
              {ap.status === 'pending' ? (
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    disabled={busyId === ap._id}
                    onClick={() => decide(ap._id, 'approved')}
                    className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busyId === ap._id}
                    onClick={() => decide(ap._id, 'rejected')}
                    className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded-md flex-shrink-0 ${
                    ap.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {ap.status.toUpperCase()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EscalationsDesk({ filter, scopeLabel, accent, onChanged }) {
  const key = JSON.stringify(filter || {});
  const [escalations, setEscalations] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    getEscalations(JSON.parse(key))
      .then((data) => setEscalations(Array.isArray(data) ? data : []))
      .catch(() => setEscalations([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { load(); }, [load]);

  async function resolve(id) {
    setBusyId(id);
    try {
      await updateEscalationStatus(id, 'resolved');
      load();
      onChanged && onChanged();
    } finally {
      setBusyId(null);
    }
  }

  if (escalations === null) return <div className="py-8 text-center text-slate-500 text-xs">Loading escalations…</div>;
  const open = escalations.filter((e) => !['resolved', 'closed'].includes(e.status));

  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200">
      <h4 className="text-xs font-bold text-slate-900 mb-1">🚨 Escalation Desk — {scopeLabel}</h4>
      <p className="text-[10px] text-slate-500 mb-3">{open.length} open</p>
      {escalations.length === 0 ? (
        <div className="text-[11px] text-slate-400 py-4 text-center">No escalations — good.</div>
      ) : (
        <div className="space-y-2">
          {escalations.map((e) => (
            <div key={e._id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  {e.priority === 'urgent' && !['resolved', 'closed'].includes(e.status) ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  ) : null}
                  {e.title}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {e.type} · {e.departmentCode}{e.branchName ? ` · ${e.branchName}` : ''} · raised by {e.raisedBy}
                </div>
              </div>
              {!['resolved', 'closed'].includes(e.status) ? (
                <button
                  disabled={busyId === e._id}
                  onClick={() => resolve(e._id)}
                  className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 flex-shrink-0"
                >
                  Resolve
                </button>
              ) : (
                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 flex-shrink-0">RESOLVED</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Leads, Demos & Student Watch (real StudentLead / Demo / Student collections) ----

const STAGE_COLORS = {
  new: '#0f172a',
  contacted: '#0284c7',
  demo_booked: '#7c3aed',
  demo_attended: '#059669',
  fee_followup: '#ea580c',
  admitted: '#10b981',
  closed: '#94a3b8'
};

function LeadsPanel({ branchName, accent }) {
  const a = accent || ACCENTS.operational;
  const [data, setData] = useState(null);

  useEffect(() => {
    getLeads()
      .then((d) => setData(d && Array.isArray(d.leads) ? d : { leads: [], stages: [], totalCount: 0 }))
      .catch(() => setData({ leads: [], stages: [], totalCount: 0 }));
  }, []);

  if (!data) return <div className="py-8 text-center text-slate-500 text-xs">Loading leads…</div>;

  const leads = branchName ? data.leads.filter((l) => l.branch === branchName) : data.leads;
  const counts = {};
  leads.forEach((l) => { counts[l.stage] = (counts[l.stage] || 0) + 1; });
  const stages = (data.stages.length ? data.stages : Object.keys(STAGE_COLORS).map((k) => ({ key: k, label: k }))).map((s) => ({
    ...s,
    count: counts[s.key] || 0
  }));

  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200">
      <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
        <Filter className={`w-3.5 h-3.5 ${a.text}`} /> Lead Pipeline{branchName ? ` — ${branchName}` : ' — Org-wide'}
      </h4>
      <p className="text-[10px] text-slate-500 mb-3">{leads.length} lead{leads.length === 1 ? '' : 's'} on record</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        {stages.map((s) => (
          <div key={s.key} className="p-2.5 rounded-lg text-center" style={{ background: `${s.color || STAGE_COLORS[s.key] || '#64748B'}14` }}>
            <div className="text-lg font-extrabold" style={{ color: s.color || STAGE_COLORS[s.key] || '#334155' }}>{s.count}</div>
            <div className="text-[9px] text-slate-500 mt-0.5 leading-tight">{(s.label || s.key).replace(/^\d+\.\s*/, '')}</div>
          </div>
        ))}
      </div>
      {leads.length === 0 ? (
        <div className="text-[11px] text-slate-400 py-4 text-center">No leads recorded{branchName ? ' for this branch' : ''} yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-slate-500 text-left">
                <th className="pb-2 font-semibold">Name</th>
                {!branchName && <th className="pb-2 font-semibold">Branch</th>}
                <th className="pb-2 font-semibold">Course</th>
                <th className="pb-2 font-semibold">Stage</th>
                <th className="pb-2 font-semibold">Source</th>
                <th className="pb-2 font-semibold">Counsellor</th>
                <th className="pb-2 font-semibold">Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l._id} className="border-t border-slate-100">
                  <td className="py-2 font-semibold text-slate-900">{l.fullName}</td>
                  {!branchName && <td className="py-2 text-slate-500">{l.branch}</td>}
                  <td className="py-2 text-slate-600">{l.course}</td>
                  <td className="py-2">
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${STAGE_COLORS[l.stage] || '#64748B'}18`, color: STAGE_COLORS[l.stage] || '#334155' }}
                    >
                      {(l.stage || '').replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 text-slate-500">{l.sourceName}</td>
                  <td className="py-2 text-slate-500">{l.counselorAssigned}</td>
                  <td className="py-2 text-slate-500">{l.followUpDate || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DemosPanel() {
  const [demos, setDemos] = useState(null);

  useEffect(() => {
    getDemos().then((d) => setDemos(Array.isArray(d) ? d : [])).catch(() => setDemos([]));
  }, []);

  if (!demos) return <div className="py-8 text-center text-slate-500 text-xs">Loading demos…</div>;

  const statusCounts = {};
  demos.forEach((d) => { statusCounts[d.status] = (statusCounts[d.status] || 0) + 1; });

  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200">
      <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
        <Video className="w-3.5 h-3.5 text-purple-600" /> Demo Bookings — Org-wide
      </h4>
      <p className="text-[10px] text-slate-500 mb-3">{demos.length} demo{demos.length === 1 ? '' : 's'} on record</p>
      {Object.keys(statusCounts).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <span key={status} className="text-[10px] font-bold px-2 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
              {count} {status}
            </span>
          ))}
        </div>
      )}
      {demos.length === 0 ? (
        <div className="text-[11px] text-slate-400 py-4 text-center">No demos booked yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-slate-500 text-left">
                <th className="pb-2 font-semibold">Candidate</th>
                <th className="pb-2 font-semibold">Course</th>
                <th className="pb-2 font-semibold">Mode</th>
                <th className="pb-2 font-semibold">When</th>
                <th className="pb-2 font-semibold">Trainer</th>
                <th className="pb-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {demos.map((d) => (
                <tr key={d._id} className="border-t border-slate-100">
                  <td className="py-2 font-semibold text-slate-900">{d.candidateName}</td>
                  <td className="py-2 text-slate-600">{d.course}</td>
                  <td className="py-2 text-slate-500">{d.mode}</td>
                  <td className="py-2 text-slate-500">{d.preferredDate} · {d.timeSlot || d.time}</td>
                  <td className="py-2 text-slate-500">{d.trainer}</td>
                  <td className="py-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">{(d.status || '').toUpperCase()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const AT_RISK_THRESHOLD = 80;

function StudentMovementSection({ students }) {
  if (students === null) return <div className="py-8 text-center text-slate-500 text-xs">Loading student records…</div>;
  const atRisk = students
    .filter((s) => typeof s.attendancePct === 'number' && s.attendancePct < AT_RISK_THRESHOLD)
    .sort((a, b) => a.attendancePct - b.attendancePct);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="At-Risk Students" value={atRisk.length} color="text-rose-600" />
        <Stat label="Total on Record" value={students.length} color="text-slate-700" />
      </div>
      <SectionCard title={`⚠️ Student Movement — Attendance below ${AT_RISK_THRESHOLD}%`}>
        {atRisk.length === 0 ? (
          <div className="text-[11px] text-slate-400 py-3 text-center">No students below the attendance threshold — good.</div>
        ) : (
          <div className="space-y-2">
            {atRisk.map((s) => (
              <div key={s._id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900">{s.name} <span className="text-slate-400 font-normal">· {s.studentId}</span></div>
                  <div className="text-[10px] text-slate-500">{s.course} · HR: {s.hrName} · {s.location}</div>
                </div>
                <span className="text-xs font-extrabold text-rose-600 flex-shrink-0">{s.attendancePct}%</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function HandoverSection({ students }) {
  if (students === null) return <div className="py-8 text-center text-slate-500 text-xs">Loading student records…</div>;
  const handoverPending = students.filter((s) => s.handoverStatus === 'Pending Handover');
  const ready = students.filter((s) => s.handoverStatus && s.handoverStatus !== 'Pending Handover');
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Pending Handover" value={handoverPending.length} color="text-orange-600" />
        <Stat label="Ready / Sent" value={ready.length} color="text-emerald-600" />
      </div>
      <SectionCard title="🤝 Admission → Training Handover">
        {handoverPending.length === 0 ? (
          <div className="text-[11px] text-slate-400 py-3 text-center">Nothing pending handover.</div>
        ) : (
          <div className="space-y-2">
            {handoverPending.map((s) => {
              const items = s.checklist ? Object.values(s.checklist) : [];
              const done = items.filter(Boolean).length;
              return (
                <div key={s._id} className="p-2.5 rounded-lg bg-orange-50 border border-orange-200">
                  <div className="text-xs font-semibold text-slate-900">{s.name} <span className="text-slate-400 font-normal">· {s.studentId}</span></div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{s.course} · {done}/{items.length || 10} checklist items ready</div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function FeeRiskSection({ students }) {
  if (students === null) return <div className="py-8 text-center text-slate-500 text-xs">Loading student records…</div>;
  const feeRisk = students.filter((s) => s.feeStatus && s.feeStatus !== 'Fully Paid');
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Fee Follow-up" value={feeRisk.length} color="text-amber-600" />
        <Stat label="Fully Paid" value={students.length - feeRisk.length} color="text-emerald-600" />
      </div>
      <SectionCard title="💰 Fee & Revenue Risk Monitor">
        {feeRisk.length === 0 ? (
          <div className="text-[11px] text-slate-400 py-3 text-center">All students fully paid — good.</div>
        ) : (
          <div className="space-y-2">
            {feeRisk.map((s) => (
              <div key={s._id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900">{s.name} <span className="text-slate-400 font-normal">· {s.studentId}</span></div>
                  <div className="text-[10px] text-slate-500">{s.course} · HR: {s.hrName}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[10px] font-bold text-amber-700">{s.feeStatus}</div>
                  <div className="text-[10px] text-slate-500">{s.feeAmount}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function PlacementReadinessSection({ students }) {
  if (students === null) return <div className="py-8 text-center text-slate-500 text-xs">Loading student records…</div>;
  const placementWatch = students
    .filter((s) => s.statusGroup !== 'placed' && typeof s.readinessScore === 'number')
    .sort((a, b) => a.readinessScore - b.readinessScore);
  const placed = students.filter((s) => s.statusGroup === 'placed');
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Placed" value={placed.length} color="text-emerald-600" />
        <Stat label="In Course" value={placementWatch.length} color="text-blue-600" />
      </div>
      <SectionCard title="🎯 Placement Readiness Monitor">
        {placementWatch.length === 0 ? (
          <div className="text-[11px] text-slate-400 py-3 text-center">Nothing flagged for placement follow-up.</div>
        ) : (
          <div className="space-y-2">
            {placementWatch.map((s) => (
              <div key={s._id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900">{s.name}</div>
                  <div className="text-[10px] text-slate-500">{s.course} · {s.placementStatus}</div>
                </div>
                <span className="text-xs font-extrabold text-blue-600 flex-shrink-0">{s.readinessScore}%</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function TrainingProgressPanel({ demos }) {
  if (demos === null) return <div className="py-8 text-center text-slate-500 text-xs">Loading training data…</div>;
  const byCourse = {};
  demos.forEach((d) => {
    const key = d.course || 'Unspecified';
    if (!byCourse[key]) byCourse[key] = { course: key, total: 0, attended: 0, converted: 0 };
    byCourse[key].total += 1;
    if (d.status === 'attended' || d.status === 'converted') byCourse[key].attended += 1;
    if (d.status === 'converted') byCourse[key].converted += 1;
  });
  const rows = Object.values(byCourse);
  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200">
      <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
        <GraduationCap className="w-3.5 h-3.5 text-emerald-600" /> Training Progress Monitor
      </h4>
      <p className="text-[10px] text-slate-500 mb-3">Demo-to-conversion progress by course</p>
      {rows.length === 0 ? (
        <div className="text-[11px] text-slate-400 py-4 text-center">No training demo data recorded yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-slate-500 text-left">
                <th className="pb-2 font-semibold">Course</th>
                <th className="pb-2 font-semibold">Demos</th>
                <th className="pb-2 font-semibold">Attended</th>
                <th className="pb-2 font-semibold">Converted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.course} className="border-t border-slate-100">
                  <td className="py-2 font-semibold text-slate-900">{r.course}</td>
                  <td className="py-2 text-slate-500">{r.total}</td>
                  <td className="py-2 text-blue-600">{r.attended}</td>
                  <td className="py-2 text-emerald-600">{r.converted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BranchOpsGrid({ branches, onSelect }) {
  const [leadsData, setLeadsData] = useState(null);
  const [attendanceRows, setAttendanceRows] = useState(null);

  useEffect(() => {
    getLeads().then((d) => setLeadsData(d && Array.isArray(d.leads) ? d.leads : [])).catch(() => setLeadsData([]));
    getAttendanceByBranch().then((d) => setAttendanceRows(Array.isArray(d?.rows) ? d.rows : [])).catch(() => setAttendanceRows([]));
  }, []);

  const rows = useMemo(() => {
    return (branches || []).map((b) => {
      const matchedLeads = (leadsData || []).filter((l) => l.branch && l.branch.toLowerCase().includes(b.name.toLowerCase()));
      const admittedLeads = matchedLeads.filter((l) => l.stage === 'admitted').length;
      const convPct = matchedLeads.length ? Math.round((admittedLeads / matchedLeads.length) * 100) : null;
      const attRow = (attendanceRows || []).find((r) => r.branchName === b.name);
      const attRate = attRow ? attRow.rate : null;
      const health = (attRate !== null && attRate < 70) || (convPct !== null && convPct < 20) ? 'attention' : 'good';
      return { branch: b, leadsCount: matchedLeads.length, convPct, health };
    });
  }, [branches, leadsData, attendanceRows]);

  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200">
      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
        <Building2 className="w-4 h-4 text-violet-700" /> Branch Operations
      </h4>
      <p className="text-[10px] text-slate-500 mt-1 mb-4">{(branches || []).length} branches · health from admissions, attendance &amp; leads</p>
      {leadsData === null || attendanceRows === null ? (
        <div className="text-[11px] text-slate-400 py-6 text-center">Loading branch health…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(({ branch: b, leadsCount, convPct, health }) => (
            <button
              key={b._id || b.name}
              onClick={() => onSelect(b)}
              className="text-left p-4 rounded-xl bg-white border-2 transition-all hover:shadow-md"
              style={{
                borderColor: health === 'attention' ? '#FED7AA' : '#DBEAFE',
                borderTopColor: health === 'attention' ? '#F59E0B' : '#3B82F6',
                borderTopWidth: 3
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <h5 className="text-xs font-bold text-slate-900">{b.name}</h5>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                    health === 'attention' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {health === 'attention' ? 'Needs Attention' : 'Good'}
                </span>
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                {b.city}{b.state ? `, ${b.state}` : ''}
              </div>
              <div className="text-[11px] text-slate-600 mt-2.5">
                Adm {b.activeStudents} · Leads {leadsCount} · Conv {convPct !== null ? `${convPct}%` : '—'}
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] font-bold text-slate-500">View Branch →</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StaffAttendancePanel() {
  const [rows, setRows] = useState(null);
  const [orgAttendance, setOrgAttendance] = useState(null);

  useEffect(() => {
    getAttendanceByBranch().then((d) => setRows(Array.isArray(d?.rows) ? d.rows : [])).catch(() => setRows([]));
    getOrgAttendanceSummary().then(setOrgAttendance).catch(() => setOrgAttendance(null));
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Logged In" value={orgAttendance ? orgAttendance.present : '…'} color="text-emerald-600" />
        <Stat label="Not Logged In" value={orgAttendance ? orgAttendance.absent : '…'} color="text-rose-600" />
        <Stat label="Total Team" value={orgAttendance ? orgAttendance.total : '…'} color="text-slate-700" />
        <Stat label="Attendance Rate" value={orgAttendance ? `${orgAttendance.attendanceRate}%` : '…'} color="text-blue-600" />
      </div>
      <div className="p-4 rounded-xl bg-white border border-slate-200">
        <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-orange-500" /> Attendance by Branch — Today
        </h4>
        {rows === null ? (
          <div className="text-[11px] text-slate-400 py-3 text-center">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-[11px] text-slate-400 py-3 text-center">No team members recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-slate-500 text-left">
                  <th className="pb-2 font-semibold">Branch</th>
                  <th className="pb-2 font-semibold">Team</th>
                  <th className="pb-2 font-semibold">Present</th>
                  <th className="pb-2 font-semibold">Absent</th>
                  <th className="pb-2 font-semibold">Rate</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.branchName} className="border-t border-slate-100">
                    <td className="py-2 font-semibold text-slate-900">{r.branchName}</td>
                    <td className="py-2 text-slate-500">{r.total}</td>
                    <td className="py-2 text-emerald-600">{r.present}</td>
                    <td className="py-2 text-rose-600">{r.absent}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${r.rate}%` }} />
                        </div>
                        <span className="text-slate-600 font-semibold">{r.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Operational Head — Command Desk (tabbed) ----

function OperationalView({ totals, departments, branches, regions, summary, currentUser, onSelectDept, onSelectRegion, onSelectBranch, onChanged }) {
  const accent = ACCENTS.operational;
  const [tab, setTab] = useState('command');
  const counts = useDeskCounts({});
  const [students, setStudents] = useState(null);
  const [demos, setDemos] = useState(null);

  useEffect(() => {
    getStudents().then((s) => setStudents(Array.isArray(s) ? s : [])).catch(() => setStudents([]));
    getDemos().then((d) => setDemos(Array.isArray(d) ? d : [])).catch(() => setDemos([]));
  }, []);

  const atRiskCount = useMemo(
    () => (students || []).filter((s) => typeof s.attendancePct === 'number' && s.attendancePct < AT_RISK_THRESHOLD).length,
    [students]
  );
  const feeRiskCount = useMemo(() => (students || []).filter((s) => s.feeStatus && s.feeStatus !== 'Fully Paid').length, [students]);

  const needsAttentionTotal = students === null ? null : summary.pendingApprovals + summary.openEscalations + atRiskCount + feeRiskCount;
  const badges = { pendingApprovals: summary.pendingApprovals, openEscalations: summary.openEscalations };

  return (
    <div className="space-y-4">
      <DeskHeader
        icon={Settings}
        iconBg={accent.grad}
        title="Operations Command Desk"
        subtitleParts={[currentUser?.name, 'Operational Head', `${totals.branches} branches`, `${totals.departments} departments`]}
        stat={{ value: needsAttentionTotal ?? '…', label: 'Needs Attention', color: '#D97706' }}
      />

      <TabBar tabs={OP_TABS} active={tab} onChange={setTab} accent={accent} badges={badges} />

      {tab === 'command' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Branches" value={totals.branches} color={accent.text} />
            <Stat label="Departments" value={totals.departments} color="text-emerald-600" />
            <Stat label="Active Students" value={totals.students.toLocaleString()} color="text-blue-600" />
            <Stat label="Total Staff" value={totals.staff} color="text-orange-600" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTab('approvals')}
              className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-left hover:border-amber-300 transition-all"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-700">Approvals</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{summary.pendingApprovals}</div>
              <div className="text-[10px] text-amber-700/70 mt-0.5">pending, org-wide</div>
            </button>
            <button
              onClick={() => setTab('escalations')}
              className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-left hover:border-rose-300 transition-all"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span className="text-xs font-bold text-rose-700">Escalations</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{summary.openEscalations}</div>
              <div className="text-[10px] text-rose-700/70 mt-0.5">open, org-wide</div>
            </button>
          </div>

          <SectionCard title="🔥 Priority Queue" action={{ label: 'Approvals tab', onClick: () => setTab('approvals') }}>
            {counts.approvals === null || counts.escalations === null ? (
              <div className="text-[11px] text-slate-400 py-3 text-center">Loading…</div>
            ) : (
              (() => {
                const items = [
                  ...counts.approvals.filter((a) => a.status === 'pending').map((a) => ({ ...a, _kind: 'approval' })),
                  ...counts.escalations.filter((e) => !['resolved', 'closed'].includes(e.status)).map((e) => ({ ...e, _kind: 'escalation' }))
                ]
                  .sort((a, b) => {
                    const wa = a._kind === 'escalation' && a.priority === 'urgent' ? 0 : a._kind === 'approval' && a.priority === 'high' ? 1 : 2;
                    const wb = b._kind === 'escalation' && b.priority === 'urgent' ? 0 : b._kind === 'approval' && b.priority === 'high' ? 1 : 2;
                    return wa - wb;
                  })
                  .slice(0, 6);
                if (items.length === 0) return <div className="text-[11px] text-slate-400 py-3 text-center">Nothing urgent — all clear.</div>;
                return (
                  <div className="space-y-1.5">
                    {items.map((it) => (
                      <div key={`${it._kind}-${it._id}`} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                            it._kind === 'escalation' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {it._kind === 'escalation' ? 'ESCALATION' : 'APPROVAL'}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 truncate flex-1">{it.title}</span>
                        <span className="text-[10px] text-slate-500 flex-shrink-0">{it.departmentCode}{it.branchName ? ` · ${it.branchName}` : ''}</span>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </SectionCard>

          <SectionCard title="🧭 Regional Zones" action={{ label: 'Open Regional Directors', onClick: () => onSelectRegion(regions[0]) }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {regions.map((r) => (
                <button key={r.state} onClick={() => onSelectRegion(r)} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center hover:border-blue-300">
                  <div className="text-xs font-semibold text-slate-900">{r.state}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{r.branches.length} branches</div>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === 'connectivity' && (
        <div className="space-y-4">
          <LeadsPanel accent={accent} />
          <DemosPanel />
        </div>
      )}

      {tab === 'branches' && <BranchOpsGrid branches={branches} onSelect={onSelectBranch} />}

      {tab === 'departments' && <DeptPicker departments={departments} loading={false} onSelect={onSelectDept} />}

      {tab === 'students' && <StudentMovementSection students={students} />}

      {tab === 'handover' && <HandoverSection students={students} />}

      {tab === 'escalations' && <EscalationsDesk filter={{}} scopeLabel="Org-wide" accent={accent} onChanged={onChanged} />}
      {tab === 'approvals' && <ApprovalsDesk filter={{}} scopeLabel="Org-wide" accent={accent} onChanged={onChanged} />}

      {tab === 'feerisk' && <FeeRiskSection students={students} />}

      {tab === 'training' && <TrainingProgressPanel demos={demos} />}

      {tab === 'placement' && <PlacementReadinessSection students={students} />}

      {tab === 'staff' && <StaffAttendancePanel />}

      {tab === 'reports' && (
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <h4 className="text-xs font-bold text-slate-900 mb-3">📋 Leadership Summary</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <ReportRow label="Branches" value={totals.branches} />
            <ReportRow label="Departments" value={totals.departments} />
            <ReportRow label="Active Students" value={totals.students.toLocaleString()} />
            <ReportRow label="Total Staff" value={totals.staff} />
            <ReportRow label="Pending Approvals" value={summary.pendingApprovals} />
            <ReportRow label="Open Escalations" value={summary.openEscalations} />
            <ReportRow label="Students At-Risk (Attendance)" value={atRiskCount} />
            <ReportRow label="Students — Fee Follow-up" value={feeRiskCount} />
          </div>
        </div>
      )}
    </div>
  );
}
function ReportRow({ label, value }) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-900">{value}</span>
    </div>
  );
}

// ---- Department tier (tabbed Department Head Desk) ----

function DeptPicker({ departments, loading, onSelect }) {
  const accent = ACCENTS.department;
  if (loading) return <div className="py-10 text-center text-slate-500 text-xs">Loading departments…</div>;
  if (!departments.length) return <div className="py-10 text-center text-slate-400 text-xs">No departments found.</div>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {departments.map((d) => {
        const Icon = DEPT_ICONS[d.icon] || Briefcase;
        return (
          <button
            key={d._id || d.code}
            onClick={() => onSelect(d)}
            className={`text-left p-4 rounded-xl bg-white border border-slate-200 ${accent.ring} transition-all`}
            style={{ borderTopColor: d.color, borderTopWidth: 3 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: d.color || '#64748B' }}>
                <Icon className="w-4 h-4 text-white" />
              </span>
              <span className="text-[10px] font-mono text-slate-400">{d.code}</span>
            </div>
            <div className="text-sm font-bold text-slate-900">{d.name}</div>
            <div className="text-[10px] text-slate-500 mt-1">{d.head} · {d.memberCount} members</div>
            <p className="text-[10px] text-slate-500 mt-2 line-clamp-2">{d.description}</p>
          </button>
        );
      })}
    </div>
  );
}

const SOP_DOCS = [
  { title: 'Department SOP', desc: 'Day-to-day operating procedure for this department.' },
  { title: 'Team Responsibilities', desc: 'Who owns what across the team.' },
  { title: 'Approval Rules', desc: 'What needs sign-off, and from whom, before it moves.' },
  { title: 'Escalation Rules', desc: 'When to raise, to whom, and how urgency is set.' },
  { title: 'Reporting Format', desc: 'The shape of the reports this desk sends upward.' }
];

function DeptDetail({ department: d, onBack, onChanged }) {
  const accent = ACCENTS.department;
  const Icon = DEPT_ICONS[d.icon] || Briefcase;
  const [tab, setTab] = useState('desk');
  const [team, setTeam] = useState(null);
  const counts = useDeskCounts({ departmentCode: d.code });

  useEffect(() => {
    getTeam({ departmentCode: d.code })
      .then((data) => setTeam(Array.isArray(data) ? data : []))
      .catch(() => setTeam([]));
  }, [d.code]);

  const avgQuality = team && team.length ? Math.round(team.reduce((s, m) => s + (m.quality || 0), 0) / team.length) : null;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className={`flex items-center gap-1.5 text-xs font-semibold ${accent.text}`}>
        <ArrowLeft className="w-3.5 h-3.5" /> Departments
      </button>
      <DeskHeader
        icon={Icon}
        iconBg={d.color || '#64748B'}
        title="Department Head Desk"
        subtitleParts={[d.name, `Head: ${d.head}`, `${d.memberCount} members`]}
        stat={{
          value: counts.pendingApprovals !== null && counts.openEscalations !== null ? counts.pendingApprovals + counts.openEscalations : '…',
          label: 'Needs Attention',
          color: '#059669'
        }}
      />
      <p className="text-xs text-slate-600 px-1">{d.description}</p>

      <TabBar tabs={DEPT_TABS} active={tab} onChange={setTab} accent={accent} />

      {tab === 'desk' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Pending Approvals" value={counts.pendingApprovals ?? '…'} color="text-amber-600" />
            <Stat label="Open Escalations" value={counts.openEscalations ?? '…'} color="text-rose-600" />
            <Stat label="Team Size" value={d.memberCount} color="text-emerald-600" />
            <Stat label="Avg Quality" value={avgQuality !== null ? `${avgQuality}%` : '…'} color="text-blue-600" />
          </div>
          <SectionCard title="🔥 What Needs You Now">
            {counts.approvals === null || counts.escalations === null ? (
              <div className="text-[11px] text-slate-400 py-3 text-center">Loading…</div>
            ) : (
              (() => {
                const items = [
                  ...counts.approvals.filter((a) => a.status === 'pending').map((a) => ({ ...a, _kind: 'approval' })),
                  ...counts.escalations.filter((e) => !['resolved', 'closed'].includes(e.status)).map((e) => ({ ...e, _kind: 'escalation' }))
                ].slice(0, 6);
                if (items.length === 0) return <div className="text-[11px] text-slate-400 py-3 text-center">Nothing urgent — all clear.</div>;
                return (
                  <div className="space-y-1.5">
                    {items.map((it) => (
                      <button
                        key={`${it._kind}-${it._id}`}
                        onClick={() => setTab(it._kind === 'escalation' ? 'escalations' : 'approvals')}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-left hover:border-emerald-300"
                      >
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                            it._kind === 'escalation' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {it._kind === 'escalation' ? 'ESCALATION' : 'APPROVAL'}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 truncate flex-1">{it.title}</span>
                      </button>
                    ))}
                  </div>
                );
              })()
            )}
          </SectionCard>
        </div>
      )}

      {tab === 'team' && (
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <h4 className="text-xs font-bold text-slate-900 mb-3">📊 Team Performance</h4>
          {team === null ? (
            <div className="text-[11px] text-slate-400 py-3 text-center">Loading team…</div>
          ) : team.length === 0 ? (
            <div className="text-[11px] text-slate-400 py-3 text-center">No team members recorded for this department yet.</div>
          ) : (
            <div className="space-y-2">
              {team.map((m) => (
                <div key={m._id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="w-8 h-8 rounded-full grid place-items-center bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0">
                    {m.name[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 truncate">{m.name}</div>
                    <div className="text-[10px] text-slate-500">{m.role} · {m.branchName || 'HQ'} · {m.completed}/{m.assigned} done · {m.pending} pending</div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 flex-shrink-0">{m.quality}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'approvals' && <ApprovalsDesk filter={{ departmentCode: d.code }} scopeLabel={d.name} accent={accent} onChanged={onChanged} />}
      {tab === 'escalations' && <EscalationsDesk filter={{ departmentCode: d.code }} scopeLabel={d.name} accent={accent} onChanged={onChanged} />}

      {tab === 'sop' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SOP_DOCS.map((s) => (
            <div key={s.title} className="p-4 rounded-xl bg-white border border-slate-200 flex items-start gap-3">
              <FileText className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900">{s.title}</div>
                <p className="text-[10px] text-slate-500 mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'reports' && (
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <h4 className="text-xs font-bold text-slate-900 mb-3">📋 {d.name} — Summary</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <ReportRow label="Team Size" value={d.memberCount} />
            <ReportRow label="Avg Quality" value={avgQuality !== null ? `${avgQuality}%` : '…'} />
            <ReportRow label="Pending Approvals" value={counts.pendingApprovals ?? '…'} />
            <ReportRow label="Open Escalations" value={counts.openEscalations ?? '…'} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Regional tier ----

function RegionPicker({ regions, onSelect }) {
  const accent = ACCENTS.regional;
  if (!regions.length) return <div className="py-10 text-center text-slate-400 text-xs">No branch data found.</div>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {regions.map((r) => (
        <button
          key={r.state}
          onClick={() => onSelect(r)}
          className={`text-left p-4 rounded-xl bg-white border border-slate-200 ${accent.ring} transition-all`}
        >
          <div className="flex items-center gap-2">
            <MapPin className={`w-4 h-4 ${accent.text}`} />
            <span className="text-sm font-bold text-slate-900">{r.state}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
            <div>
              <div className={`text-sm font-bold ${accent.text}`}>{r.branches.length}</div>
              <div className="text-[9px] text-slate-500">Branches</div>
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-600">{r.totalStudents}</div>
              <div className="text-[9px] text-slate-500">Students</div>
            </div>
            <div>
              <div className="text-sm font-bold text-orange-600">{r.totalStaff}</div>
              <div className="text-[9px] text-slate-500">Staff</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function RegionDetail({ region, onBack, onSelectBranch }) {
  const accent = ACCENTS.regional;
  const branchNames = useMemo(() => new Set(region.branches.map((b) => b.name)), [region]);
  const [approvals, setApprovals] = useState(null);
  const [escalations, setEscalations] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    getApprovals().then((a) => setApprovals(Array.isArray(a) ? a.filter((x) => branchNames.has(x.branchName)) : [])).catch(() => setApprovals([]));
    getEscalations().then((e) => setEscalations(Array.isArray(e) ? e.filter((x) => branchNames.has(x.branchName)) : [])).catch(() => setEscalations([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  useEffect(() => { load(); }, [load]);

  async function decide(id, action) {
    setBusyId(id);
    try { await decideApproval(id, action); load(); } finally { setBusyId(null); }
  }
  async function resolve(id) {
    setBusyId(id);
    try { await updateEscalationStatus(id, 'resolved'); load(); } finally { setBusyId(null); }
  }

  const pendingApprovals = approvals ? approvals.filter((a) => a.status === 'pending') : null;
  const openEscalations = escalations ? escalations.filter((e) => !['resolved', 'closed'].includes(e.status)) : null;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className={`flex items-center gap-1.5 text-xs font-semibold ${accent.text}`}>
        <ArrowLeft className="w-3.5 h-3.5" /> Regions
      </button>
      <DeskHeader
        icon={MapPin}
        iconBg={accent.grad}
        title="Regional Manager Desk"
        subtitleParts={[region.state, `${region.branches.length} branches`]}
        stat={{
          value: pendingApprovals !== null && openEscalations !== null ? pendingApprovals.length + openEscalations.length : '…',
          label: 'Needs Attention',
          color: '#2563EB'
        }}
      />

      <div className="p-4 rounded-xl bg-white border border-slate-200">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <MapPin className={`w-4 h-4 ${accent.text}`} /> {region.state}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <Stat label="Branches" value={region.branches.length} color={accent.text} />
          <Stat label="Students" value={region.totalStudents} color="text-emerald-600" />
          <Stat label="Staff" value={region.totalStaff} color="text-orange-600" />
          <Stat label="Pending / Open" value={`${pendingApprovals?.length ?? '…'} / ${openEscalations?.length ?? '…'}`} color="text-rose-600" />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 text-left">
                <th className="pb-2 font-semibold">Branch</th>
                <th className="pb-2 font-semibold">City</th>
                <th className="pb-2 font-semibold">Students</th>
                <th className="pb-2 font-semibold">Staff</th>
                <th className="pb-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {region.branches.map((b) => (
                <tr key={b._id || b.name} className="border-t border-slate-100">
                  <td className="py-2 font-semibold text-slate-900">{b.name}</td>
                  <td className="py-2 text-slate-500">{b.city}</td>
                  <td className="py-2 text-emerald-600">{b.activeStudents}</td>
                  <td className="py-2 text-orange-600">{b.staffCount}</td>
                  <td className="py-2">
                    <button
                      onClick={() => onSelectBranch(b)}
                      className={`text-[10px] font-bold ${accent.text} flex items-center gap-0.5`}
                    >
                      Open <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="✅ Region Approvals">
          {pendingApprovals === null ? (
            <div className="text-[11px] text-slate-400 py-3 text-center">Loading…</div>
          ) : pendingApprovals.length === 0 ? (
            <div className="text-[11px] text-slate-400 py-3 text-center">Nothing pending in this region.</div>
          ) : (
            <div className="space-y-2">
              {pendingApprovals.map((ap) => (
                <div key={ap._id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">{ap.title}</div>
                    <div className="text-[10px] text-slate-500">{ap.branchName} · {ap.requestedBy}</div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button disabled={busyId === ap._id} onClick={() => decide(ap._id, 'approved')} className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">Approve</button>
                    <button disabled={busyId === ap._id} onClick={() => decide(ap._id, 'rejected')} className="px-2 py-1 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="🚨 Region Escalations">
          {openEscalations === null ? (
            <div className="text-[11px] text-slate-400 py-3 text-center">Loading…</div>
          ) : openEscalations.length === 0 ? (
            <div className="text-[11px] text-slate-400 py-3 text-center">No open escalations in this region.</div>
          ) : (
            <div className="space-y-2">
              {openEscalations.map((e) => (
                <div key={e._id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">{e.title}</div>
                    <div className="text-[10px] text-slate-500">{e.branchName} · {e.raisedBy}</div>
                  </div>
                  <button disabled={busyId === e._id} onClick={() => resolve(e._id)} className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 flex-shrink-0">Resolve</button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ---- Branch tier ----

function BranchPicker({ branches, onSelect }) {
  const accent = ACCENTS.branch;
  if (!branches || !branches.length) return <div className="py-10 text-center text-slate-400 text-xs">No branches found.</div>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {branches.map((b) => (
        <button
          key={b._id || b.name}
          onClick={() => onSelect(b)}
          className={`text-left p-4 rounded-2xl bg-white border border-slate-200 ${accent.ring} transition-all`}
        >
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-900">{b.name}</h4>
              <p className="text-[10px] text-slate-500">{b.city}, {b.state}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">Students</span>
              <strong className="text-emerald-600">{b.activeStudents}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Staff</span>
              <strong className="text-slate-900">{b.staffCount}</strong>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function BranchDetail({ branch: b, onBack, onChanged }) {
  const accent = ACCENTS.branch;
  const [tab, setTab] = useState('overview');
  const [team, setTeam] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [busyName, setBusyName] = useState(null);
  const counts = useDeskCounts({ branchName: b.name });

  const loadAttendance = useCallback(() => {
    getBranchAttendance(b.name)
      .then(setAttendance)
      .catch(() => setAttendance(null));
  }, [b.name]);

  useEffect(() => {
    getTeam({ branchName: b.name })
      .then((data) => setTeam(Array.isArray(data) ? data : []))
      .catch(() => setTeam([]));
    loadAttendance();
  }, [b.name, loadAttendance]);

  async function handleShift(id, shift) {
    await setTeamMemberShift(id, shift);
    getTeam({ branchName: b.name }).then((data) => setTeam(Array.isArray(data) ? data : []));
  }

  async function handleClockIn(name) {
    setBusyName(name);
    try {
      await clockIn(b.name, name);
      loadAttendance();
    } finally {
      setBusyName(null);
    }
  }
  async function handleClockOut(name) {
    setBusyName(name);
    try {
      await clockOut(b.name, name);
      loadAttendance();
    } finally {
      setBusyName(null);
    }
  }
  async function handleBreak(name, onBreak) {
    setBusyName(name);
    try {
      await setAttendanceBreak(b.name, name, onBreak);
      loadAttendance();
    } finally {
      setBusyName(null);
    }
  }

  const avgQuality = team && team.length ? Math.round(team.reduce((s, m) => s + (m.quality || 0), 0) / team.length) : null;
  const onBreakCount = attendance ? attendance.rows.filter((r) => r.status === 'break').length : null;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className={`flex items-center gap-1.5 text-xs font-semibold ${accent.text}`}>
        <ArrowLeft className="w-3.5 h-3.5" /> Branches
      </button>
      <DeskHeader
        icon={MapPin}
        iconBg={accent.grad}
        title="Branch Manager Desk"
        subtitleParts={[b.name, `${b.city}, ${b.state}`]}
        stat={{
          value: counts.pendingApprovals !== null && counts.openEscalations !== null ? counts.pendingApprovals + counts.openEscalations : '…',
          label: 'Needs Attention',
          color: '#D97706'
        }}
      />

      <TabBar tabs={BRANCH_TABS} active={tab} onChange={setTab} accent={accent} />

      {tab === 'overview' && (
        <div className="space-y-4">
          <div
            className="rounded-2xl p-5 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#FBBF24,#D97706)' }}
          >
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-extrabold">{b.activeStudents}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide opacity-80 mt-1">Active Students</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold">{b.staffCount}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide opacity-80 mt-1">Staff on Record</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold">{avgQuality !== null ? `${avgQuality}%` : '…'}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide opacity-80 mt-1">Team Quality</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold">{onBreakCount ?? '…'}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide opacity-80 mt-1">On Break Now</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setTab('approvals')} className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-left hover:border-amber-300 transition-all">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-700">Approvals</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{counts.pendingApprovals ?? '…'}</div>
              <div className="text-[10px] text-amber-700/70 mt-0.5">pending, this branch</div>
            </button>
            <button onClick={() => setTab('escalations')} className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-left hover:border-rose-300 transition-all">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span className="text-xs font-bold text-rose-700">Escalations</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{counts.openEscalations ?? '…'}</div>
              <div className="text-[10px] text-rose-700/70 mt-0.5">open, this branch</div>
            </button>
          </div>
        </div>
      )}

      {tab === 'leads' && <LeadsPanel branchName={b.name} accent={accent} />}

      {tab === 'team' && (
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <h4 className="text-xs font-bold text-slate-900 mb-3">🗓️ Team Roster</h4>
          {team === null ? (
            <div className="text-[11px] text-slate-400 py-3 text-center">Loading roster…</div>
          ) : team.length === 0 ? (
            <div className="text-[11px] text-slate-400 py-3 text-center">No team members recorded for this branch yet.</div>
          ) : (
            <div className="space-y-2">
              {team.map((m) => (
                <div key={m._id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="w-8 h-8 rounded-full grid place-items-center bg-orange-100 text-orange-700 text-xs font-bold flex-shrink-0">
                    {m.name[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 truncate">{m.name}</div>
                    <div className="text-[10px] text-slate-500">{m.role} · Quality {m.quality}%</div>
                  </div>
                  <select
                    value={m.shift}
                    onChange={(e) => handleShift(m._id, e.target.value)}
                    className="text-[10px] bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-700 flex-shrink-0"
                  >
                    {Object.entries(SHIFTS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'attendance' && (
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-orange-500" /> Attendance — Today
          </h4>
          {attendance ? (
            <p className="text-[10px] text-slate-500 mb-3">{attendance.date} · {attendance.present} in of {attendance.total} team members</p>
          ) : null}
          {attendance === null ? (
            <div className="text-[11px] text-slate-400 py-3 text-center">Loading attendance…</div>
          ) : attendance.rows.length === 0 ? (
            <div className="text-[11px] text-slate-400 py-3 text-center">No roster to track attendance for yet.</div>
          ) : (
            <div className="space-y-2">
              {attendance.rows.map((r) => (
                <div key={r.employeeName} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 truncate">{r.employeeName}</div>
                    <div className="text-[10px] text-slate-500">
                      {r.status === 'absent' ? 'Not logged in' : `In ${r.checkIn || '—'}${r.checkOut ? ` · Out ${r.checkOut}` : ''}`}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {r.status === 'absent' || r.status === 'out' ? (
                      <button
                        disabled={busyName === r.employeeName}
                        onClick={() => handleClockIn(r.employeeName)}
                        className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200"
                      >
                        Clock In
                      </button>
                    ) : null}
                    {r.status === 'in' ? (
                      <>
                        <button
                          disabled={busyName === r.employeeName}
                          onClick={() => handleBreak(r.employeeName, true)}
                          className="px-2 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200"
                        >
                          Break
                        </button>
                        <button
                          disabled={busyName === r.employeeName}
                          onClick={() => handleClockOut(r.employeeName)}
                          className="px-2 py-1 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200"
                        >
                          Clock Out
                        </button>
                      </>
                    ) : null}
                    {r.status === 'break' ? (
                      <button
                        disabled={busyName === r.employeeName}
                        onClick={() => handleBreak(r.employeeName, false)}
                        className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200"
                      >
                        End Break
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'approvals' && <ApprovalsDesk filter={{ branchName: b.name }} scopeLabel={b.name} accent={accent} onChanged={onChanged} />}
      {tab === 'escalations' && <EscalationsDesk filter={{ branchName: b.name }} scopeLabel={b.name} accent={accent} onChanged={onChanged} />}
    </div>
  );
}
