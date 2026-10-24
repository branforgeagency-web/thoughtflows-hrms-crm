import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Crown,
  Briefcase,
  Users,
  GraduationCap,
  LogOut,
  Sparkles,
  ChevronRight,
  Radio,
  BookOpen,
  Calendar,
  CheckCircle2,
  Award,
  Network,
  LayoutGrid
} from 'lucide-react';
import DashboardNavSwitcher from './DashboardNavSwitcher';
import TrainingDepartmentDashboard from './TrainingDepartmentDashboard';
import TrainerRoleDashboard from './TrainerRoleDashboard';
import TrainerOrgHierarchyChart from './TrainerOrgHierarchyChart';
import {
  TRAINER_HIERARCHY,
  ALL_HIERARCHY_TRAINERS
} from '../constants/trainerHierarchy';
import {
  getTrainerSettings,
  getBatches,
  getStudents,
  getDemos,
  onDataUpdate
} from '../services/api';

const TRAINER_ROLES = [
  {
    key: 'head',
    tier: 'EXECUTIVE LEADERSHIP',
    name: 'Trainer Head',
    desc: 'Zonal faculty command, demo reassignment, syllabus definition & multi-branch allocation.',
    scope: 'ALL REGIONS · TN, KL, AP & TS',
    icon: Crown,
    gradient: 'linear-gradient(135deg, #005a9c, #0284c7)',
    accentText: 'text-blue-700',
    ring: 'hover:border-blue-400'
  },
  {
    key: 'manager',
    tier: 'OPERATIONS MANAGEMENT',
    name: 'Trainer Manager',
    desc: 'Supervise trainer shifts, manage batch assignments, track student allocations & operational demos.',
    scope: 'TN / KL & AP / TS · 2 MANAGERS',
    icon: Briefcase,
    gradient: 'linear-gradient(135deg, #00828a, #0d9488)',
    accentText: 'text-teal-700',
    ring: 'hover:border-teal-400'
  },
  {
    key: 'tl',
    tier: 'TEAM LEADERSHIP',
    name: 'Trainer Team Lead (TL)',
    desc: 'Lead faculty squads, monitor daily class coverage, handle demo scheduling & student progress.',
    scope: '3 TEAMS · TN, KL & AP/TS SQUADS',
    icon: Users,
    gradient: 'linear-gradient(135deg, #2e7d32, #16a34a)',
    accentText: 'text-emerald-700',
    ring: 'hover:border-emerald-400'
  },
  {
    key: 'trainer',
    tier: 'FACULTY DESK',
    name: 'Trainer',
    desc: 'Run daily batches, live class rooms, attendance, demos, doubt resolutions & test builder.',
    scope: '25 FACULTY DESKS · 12 BRANCHES',
    icon: GraduationCap,
    gradient: 'linear-gradient(135deg, #38BDF8, #2563EB)',
    accentText: 'text-sky-700',
    ring: 'hover:border-sky-400'
  }
];

export default function TrainersDepartmentHub({
  onClose,
  currentUser,
  onLogout,
  onSwitchDepartment,
  theme = 'classic'
}) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedLeaderId, setSelectedLeaderId] = useState(null);
  const [selectedTrainerUser, setSelectedTrainerUser] = useState(null);
  const [hubTab, setHubTab] = useState('roles'); // 'roles' | 'org'

  const [trainers, setTrainers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHubStats = useCallback(() => {
    Promise.all([
      getTrainerSettings().catch(() => []),
      getBatches().catch(() => []),
      getStudents().catch(() => []),
      getDemos().catch(() => [])
    ])
      .then(([tData, bData, sData, dData]) => {
        const merged = [...(Array.isArray(tData) ? tData : [])];
        ALL_HIERARCHY_TRAINERS.forEach((ht) => {
          if (!merged.some((m) => (m.trainerName || m.name || '').toLowerCase() === ht.name.toLowerCase() || m.trainerId === ht.id)) {
            merged.push(ht);
          }
        });
        setTrainers(merged);
        setBatches(Array.isArray(bData) ? bData : []);
        setStudents(Array.isArray(sData) ? sData : []);
        setDemos(Array.isArray(dData) ? dData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadHubStats();
    const unsub = onDataUpdate((entity) => {
      if (['trainers', 'batches', 'students', 'demos'].includes(entity)) {
        loadHubStats();
      }
    });
    return () => unsub();
  }, [loadHubStats]);

  const activeTrainersCount = useMemo(() => {
    return trainers.filter((t) => t.active !== false).length;
  }, [trainers]);

  const pendingAllocationCount = useMemo(() => {
    return students.filter((st) => {
      const isHandedOver = st.handoverStatus === 'Handed Over to Head of Trainer' || (st.handoverStatus === 'Sent to Training' && !st.trainerId);
      return isHandedOver && !st.trainerId;
    }).length;
  }, [students]);

  const upcomingDemosCount = useMemo(() => {
    return demos.filter((d) => ['booked', 'confirmed'].includes(String(d.status || '').toLowerCase())).length;
  }, [demos]);

  // Handle clicking a node directly from the interactive Organization Chart
  const handleSelectHierarchyNode = (node) => {
    if (node.roleType === 'head') {
      setSelectedLeaderId('manoj');
      setSelectedRole('head');
    } else if (node.roleType === 'manager') {
      setSelectedLeaderId(node.id);
      setSelectedRole('manager');
    } else if (node.roleType === 'tl') {
      setSelectedLeaderId(node.id);
      setSelectedRole('tl');
    } else if (node.roleType === 'trainer') {
      const found = ALL_HIERARCHY_TRAINERS.find((t) => t.id === node.id || t.name === node.name);
      setSelectedTrainerUser({
        trainerId: found?.id || node.id,
        trainerName: found?.name || node.name,
        name: found?.name || node.name,
        userName: found?.name || node.name,
        role: 'Faculty',
        branch: found?.branch || 'Coimbatore',
        courseKey: found?.course || 'CPC'
      });
      setSelectedRole('trainer');
    }
  };

  // Render individual Trainer Dashboard (reusing existing component)
  if (selectedRole === 'trainer') {
    return (
      <TrainingDepartmentDashboard
        onClose={onClose}
        currentUser={selectedTrainerUser || currentUser}
        onLogout={onLogout}
        onSwitchDepartment={onSwitchDepartment}
        theme={theme}
        onBackToRoles={() => {
          setSelectedRole(null);
          setSelectedTrainerUser(null);
        }}
      />
    );
  }

  // Render Head, Manager, or Team Lead Dashboard
  if (selectedRole === 'head' || selectedRole === 'manager' || selectedRole === 'tl') {
    return (
      <TrainerRoleDashboard
        roleType={selectedRole}
        initialLeaderId={selectedLeaderId}
        onBack={() => {
          setSelectedRole(null);
          setSelectedLeaderId(null);
        }}
        currentUser={currentUser}
        onLogout={onLogout}
        onSwitchDepartment={onSwitchDepartment}
        onClose={onClose}
      />
    );
  }

  // Main Hub Landing View
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F8FAFC] font-sans text-slate-800 animate-fadeIn">
      {/* Top Navbar */}
      <header
        className="sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 flex-wrap shadow-md"
        style={{ background: 'linear-gradient(90deg, #0F172A, #1E293B 55%, #334155)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/90 hover:bg-white text-slate-800 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Portal Home
          </button>
          <div className="bg-white rounded-xl px-2.5 py-1.5 shadow-sm hidden sm:block">
            <img src="/thoughtflows-logo.png" alt="Thoughtflows" className="h-6 w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white leading-tight">Trainers Department</h1>
            <p className="text-[10px] font-bold tracking-[0.2em] text-slate-300 uppercase">
              Thoughtflows Medical Coding Academy · Operations &amp; Faculty
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSwitchDepartment && (
            <DashboardNavSwitcher
              currentDepartment="training"
              onSwitchDepartment={onSwitchDepartment}
            />
          )}

          <div className="flex items-center gap-2 bg-white/10 rounded-full pl-2 pr-4 py-1.5">
            <span className="w-8 h-8 rounded-full grid place-items-center text-xs font-bold text-white bg-gradient-to-br from-sky-400 to-blue-600 shadow-xs">
              {(currentUser?.name || 'T')[0]}
            </span>
            <div>
              <div className="text-xs font-bold text-white leading-tight">
                {currentUser?.name || 'Trainers Department'}
              </div>
              <div className="text-[9px] font-bold tracking-[0.15em] text-slate-300 uppercase">
                {hubTab === 'roles' ? '4 Role Desks' : 'Org Hierarchy'}
              </div>
            </div>
          </div>

          {(onLogout || onClose) && (
            <button
              onClick={onLogout || onClose}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white border border-rose-400/30 text-xs font-bold transition-all cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div
          className="rounded-3xl p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 items-center relative overflow-hidden shadow-lg"
          style={{ background: 'linear-gradient(120deg, #0F172A, #1E293B 60%, #1E40AF)' }}
        >
          <div
            className="absolute -right-16 -top-16 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.25), transparent 70%)' }}
          />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[11px] font-bold tracking-[0.2em] text-sky-300 uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5 text-sky-300" />
              NO:1 Medical Coding Academy · Training Hub
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-[1.1] tracking-tight">
              Trainers Department
              <br />
              <span className="text-sky-300">Executive &amp; Faculty Hierarchy</span>
            </h2>
            <p className="text-slate-300 text-sm mt-4 max-w-lg leading-relaxed">
              Manoj (Head of Training) · Keerthi &amp; Pavithra (Managers) · Ram Balaji, Vaishna &amp; Mounika (Team Leads) · 25 Specialized Faculty Desks.
            </p>

            {/* View Switcher Tabs */}
            <div className="inline-flex items-center p-1 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 mt-6 gap-1">
              <button
                onClick={() => setHubTab('roles')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  hubTab === 'roles'
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>4 Role Desks</span>
              </button>
              <button
                onClick={() => setHubTab('org')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  hubTab === 'org'
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                <Network className="w-4 h-4" />
                <span>Department Hierarchy Chart</span>
              </button>
            </div>
          </div>

          {/* Quick Snapshot KPIs */}
          <div className="relative z-10 grid grid-cols-2 gap-3.5">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="text-2xl font-black text-white">{loading ? '…' : trainers.length}</div>
              <div className="text-[10px] font-bold tracking-wider text-sky-200 uppercase mt-0.5">Faculty Members</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="text-2xl font-black text-emerald-300">{loading ? '…' : activeTrainersCount}</div>
              <div className="text-[10px] font-bold tracking-wider text-emerald-200 uppercase mt-0.5">Available On Duty</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="text-2xl font-black text-white">{loading ? '…' : batches.length}</div>
              <div className="text-[10px] font-bold tracking-wider text-sky-200 uppercase mt-0.5">Active Batches</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="text-2xl font-black text-blue-300">{loading ? '…' : upcomingDemosCount}</div>
              <div className="text-[10px] font-bold tracking-wider text-blue-200 uppercase mt-0.5">Upcoming Demos</div>
            </div>
          </div>
        </div>

        {/* Dynamic Section: Either 4 Role Desks OR the Visual Organization Chart */}
        {hubTab === 'roles' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Select Your Role</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose a role card below to access its specialized dashboard, data, and permissions.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                4 Roles Configured
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {TRAINER_ROLES.map((role) => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.key}
                    onClick={() => {
                      setSelectedLeaderId(null);
                      setSelectedRole(role.key);
                    }}
                    className={`text-left bg-white border-2 border-slate-200 ${role.ring} rounded-[22px] p-6 min-h-[230px] flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group cursor-pointer`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span
                          className="w-[52px] h-[52px] rounded-2xl grid place-items-center shadow-md text-white"
                          style={{ background: role.gradient }}
                        >
                          <Icon className="w-6 h-6" />
                        </span>
                        <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                          {role.tier}
                        </span>
                      </div>

                      <div className="text-lg font-extrabold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                        {role.name}
                      </div>
                      <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">
                        {role.desc}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-5 pt-3.5 border-t border-slate-100">
                      <span className={`text-[10px] font-bold tracking-wide uppercase ${role.accentText}`}>
                        {role.scope}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[13px] font-extrabold text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all">
                        Open →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-fadeIn">
            <TrainerOrgHierarchyChart onSelectNode={handleSelectHierarchyNode} />
          </div>
        )}

        {/* Live Operational Snapshot Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Duty Status</div>
              <div className="text-sm font-extrabold text-slate-900">
                {loading ? '…' : `${activeTrainersCount} Faculty Active`}
              </div>
              <div className="text-[11px] text-slate-500">Across 12 branches nationwide</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batches Running</div>
              <div className="text-sm font-extrabold text-slate-900">
                {loading ? '…' : `${batches.length} Live Batches`}
              </div>
              <div className="text-[11px] text-slate-500">CPC, CIC, CPB, CPMA, CRC</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upcoming Demos</div>
              <div className="text-sm font-extrabold text-slate-900">
                {loading ? '…' : `${upcomingDemosCount} Demos Scheduled`}
              </div>
              <div className="text-[11px] text-slate-500">Booked &amp; confirmed demos</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Allocations</div>
              <div className={`text-sm font-extrabold ${pendingAllocationCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {loading ? '…' : `${pendingAllocationCount} Students Waiting`}
              </div>
              <div className="text-[11px] text-slate-500">Awaiting trainer assignment</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
