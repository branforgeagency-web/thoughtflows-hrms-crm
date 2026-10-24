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
  LayoutGrid,
  Lock,
  KeyRound,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import TrainingDepartmentDashboard from './TrainingDepartmentDashboard';
import TrainerRoleDashboard from './TrainerRoleDashboard';
import TrainerHeadDashboard from './TrainerHeadDashboard';
import TrainerOrgHierarchyChart from './TrainerOrgHierarchyChart';
import TrainerRoleLoginModal from './TrainerRoleLoginModal';
import {
  TRAINER_HIERARCHY,
  ALL_HIERARCHY_TRAINERS
} from '../constants/trainerHierarchy';
import {
  getTrainerSettings,
  getBatches,
  getStudents,
  getDemos,
  getBranches,
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
    ring: 'hover:border-blue-400',
    accountHint: 'Manoj · Pan-India'
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
    ring: 'hover:border-teal-400',
    accountHint: 'Keerthi (TN/KL) & Pavithra (AP/TS)'
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
    ring: 'hover:border-emerald-400',
    accountHint: 'Ram Balaji, Vaishna & Mounika'
  },
  {
    key: 'trainer',
    tier: 'FACULTY DESK',
    name: 'Trainers',
    desc: 'Run daily batches, live class rooms, attendance, demos, doubt resolutions & test builder.',
    scope: 'ACTIVE FACULTY · ALL BRANCHES',
    icon: GraduationCap,
    gradient: 'linear-gradient(135deg, #38BDF8, #2563EB)',
    accentText: 'text-sky-700',
    ring: 'hover:border-sky-400',
    accountHint: 'Individual Trainer Credentials'
  }
];

export default function TrainersDepartmentHub({
  onClose,
  currentUser,
  onLogout,
  onTrainerLogout,
  onSwitchDepartment,
  theme = 'classic'
}) {
  // Authenticated Trainer Department User
  const [activeTrainerUser, setActiveTrainerUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('thoughtflows_trainer_user');
      if (saved) return JSON.parse(saved);
      if (currentUser?.trainerRole || currentUser?.trainerId || currentUser?.department === 'training') return currentUser;
    } catch (_) {}
    return null;
  });

  const [selectedRole, setSelectedRole] = useState(() => {
    try {
      const savedRole = sessionStorage.getItem('thoughtflows_trainer_role');
      if (savedRole) return savedRole;
      const trainerUser = JSON.parse(sessionStorage.getItem('thoughtflows_trainer_user') || 'null') || (
        currentUser?.trainerRole || currentUser?.trainerId || currentUser?.department === 'training' ? currentUser : null
      );
      if (trainerUser?.trainerRole) return trainerUser.trainerRole;
      if (trainerUser?.trainerId) return 'trainer';
      const roleStr = String(trainerUser?.role || '').toLowerCase();
      if (/head of trainer|chief trainer|chief faculty|training head/i.test(roleStr)) return 'head';
      if (/manager/i.test(roleStr)) return 'manager';
      if (/team lead|\btl\b/i.test(roleStr)) return 'tl';
      if (/trainer|faculty/i.test(roleStr)) return 'trainer';
    } catch (_) {}
    return null;
  });

  const [selectedLeaderId, setSelectedLeaderId] = useState(() => {
    try {
      const savedLeader = sessionStorage.getItem('thoughtflows_trainer_leader_id');
      if (savedLeader) return savedLeader;
      const trainerUser = JSON.parse(sessionStorage.getItem('thoughtflows_trainer_user') || 'null') || (
        currentUser?.trainerRole || currentUser?.trainerId || currentUser?.department === 'training' ? currentUser : null
      );
      if (trainerUser?.leaderId) return trainerUser.leaderId;
    } catch (_) {}
    return null;
  });

  const [selectedTrainerUser, setSelectedTrainerUser] = useState(() => {
    try {
      const savedSelected = sessionStorage.getItem('thoughtflows_trainer_selected_user');
      if (savedSelected) return JSON.parse(savedSelected);
      const trainerUser = JSON.parse(sessionStorage.getItem('thoughtflows_trainer_user') || 'null') || (
        currentUser?.trainerRole || currentUser?.trainerId || currentUser?.department === 'training' ? currentUser : null
      );
      if (trainerUser?.trainerId || trainerUser?.trainerRole === 'trainer') return trainerUser;
    } catch (_) {}
    return null;
  });

  const [hubTab, setHubTab] = useState('roles'); // 'roles' | 'org'
  const [loginModalRole, setLoginModalRole] = useState(null);

  // Sync state changes with sessionStorage across browser reloads
  useEffect(() => {
    try {
      if (selectedRole) {
        sessionStorage.setItem('thoughtflows_trainer_role', selectedRole);
      } else {
        sessionStorage.removeItem('thoughtflows_trainer_role');
      }
    } catch (_) {}
  }, [selectedRole]);

  useEffect(() => {
    try {
      if (selectedLeaderId) {
        sessionStorage.setItem('thoughtflows_trainer_leader_id', selectedLeaderId);
      } else {
        sessionStorage.removeItem('thoughtflows_trainer_leader_id');
      }
    } catch (_) {}
  }, [selectedLeaderId]);

  useEffect(() => {
    try {
      if (selectedTrainerUser) {
        sessionStorage.setItem('thoughtflows_trainer_selected_user', JSON.stringify(selectedTrainerUser));
      } else {
        sessionStorage.removeItem('thoughtflows_trainer_selected_user');
      }
    } catch (_) {}
  }, [selectedTrainerUser]);

  useEffect(() => {
    try {
      if (activeTrainerUser) {
        sessionStorage.setItem('thoughtflows_trainer_user', JSON.stringify(activeTrainerUser));
      } else {
        sessionStorage.removeItem('thoughtflows_trainer_user');
      }
    } catch (_) {}
  }, [activeTrainerUser]);

  // Sync with incoming currentUser prop if activeTrainerUser is not yet set
  useEffect(() => {
    if (currentUser?.trainerRole || currentUser?.trainerId || currentUser?.department === 'training') {
      setActiveTrainerUser(prev => prev || currentUser);
      try {
        sessionStorage.setItem('thoughtflows_trainer_user', JSON.stringify(currentUser));
      } catch (_) {}

      setSelectedRole(prevRole => {
        if (prevRole) return prevRole;
        const targetRole = currentUser.trainerRole || (currentUser.trainerId ? 'trainer' : null);
        if (targetRole) {
          try { sessionStorage.setItem('thoughtflows_trainer_role', targetRole); } catch (_) {}
          return targetRole;
        }
        const roleStr = String(currentUser.role || '').toLowerCase();
        let inferred = null;
        if (/head of trainer|chief trainer|chief faculty|training head/i.test(roleStr)) inferred = 'head';
        else if (/manager/i.test(roleStr)) inferred = 'manager';
        else if (/team lead|\btl\b/i.test(roleStr)) inferred = 'tl';
        else if (/trainer|faculty/i.test(roleStr)) inferred = 'trainer';
        if (inferred) {
          try { sessionStorage.setItem('thoughtflows_trainer_role', inferred); } catch (_) {}
          return inferred;
        }
        return prevRole;
      });

      if (currentUser.leaderId) {
        setSelectedLeaderId(prevLeader => {
          if (prevLeader) return prevLeader;
          try { sessionStorage.setItem('thoughtflows_trainer_leader_id', currentUser.leaderId); } catch (_) {}
          return currentUser.leaderId;
        });
      }

      if (currentUser.trainerId || currentUser.trainerRole === 'trainer') {
        setSelectedTrainerUser(prevUser => {
          if (prevUser) return prevUser;
          try { sessionStorage.setItem('thoughtflows_trainer_selected_user', JSON.stringify(currentUser)); } catch (_) {}
          return currentUser;
        });
      }
    }
  }, [currentUser]);

  const [trainers, setTrainers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [demos, setDemos] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHubStats = useCallback(() => {
    Promise.all([
      getTrainerSettings().catch(() => []),
      getBatches().catch(() => []),
      getStudents().catch(() => []),
      getDemos().catch(() => []),
      getBranches().catch(() => [])
    ])
      .then(([tData, bData, sData, dData, brData]) => {
        setTrainers(Array.isArray(tData) ? tData : []);
        setBatches(Array.isArray(bData) ? bData : []);
        setStudents(Array.isArray(sData) ? sData : []);
        setDemos(Array.isArray(dData) ? dData : []);
        setBranches(Array.isArray(brData) ? brData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadHubStats();
    const unsub = onDataUpdate((entity) => {
      if (['trainers', 'batches', 'students', 'demos', 'branches'].includes(entity)) {
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

  // Handle clicking a role card
  const handleRoleCardClick = (roleKey) => {
    // If user is already authenticated in this session for this role, enter directly
    if (activeTrainerUser && (activeTrainerUser.trainerRole === roleKey || (roleKey === 'trainer' && activeTrainerUser.trainerId))) {
      setSelectedLeaderId(activeTrainerUser.leaderId || null);
      if (roleKey === 'trainer') {
        setSelectedTrainerUser(activeTrainerUser);
      }
      setSelectedRole(roleKey);
      return;
    }

    // Otherwise, trigger the separate login modal for this specific role
    setLoginModalRole(roleKey);
  };

  // Handle successful login from modal
  const handleLoginSuccess = (user) => {
    setActiveTrainerUser(user);
    try {
      sessionStorage.setItem('thoughtflows_user', JSON.stringify(user));
      sessionStorage.setItem('thoughtflows_trainer_user', JSON.stringify(user));
    } catch (_) {}

    const targetRole = user.trainerRole || loginModalRole || 'head';
    const leaderId = user.leaderId || null;
    setSelectedLeaderId(leaderId);
    try {
      if (leaderId) sessionStorage.setItem('thoughtflows_trainer_leader_id', leaderId);
      sessionStorage.setItem('thoughtflows_trainer_role', targetRole);
    } catch (_) {}

    if (targetRole === 'trainer' || user.trainerId) {
      setSelectedTrainerUser(user);
      try {
        sessionStorage.setItem('thoughtflows_trainer_selected_user', JSON.stringify(user));
      } catch (_) {}
      setSelectedRole('trainer');
    } else {
      setSelectedRole(targetRole);
    }
    setLoginModalRole(null);
  };

  // Logout trainer session
  const handleTrainerLogout = () => {
    try {
      sessionStorage.removeItem('thoughtflows_trainer_user');
      sessionStorage.removeItem('thoughtflows_trainer_role');
      sessionStorage.removeItem('thoughtflows_trainer_leader_id');
      sessionStorage.removeItem('thoughtflows_trainer_selected_user');
      sessionStorage.removeItem('thoughtflows_trainer_faculty_nav');
      sessionStorage.removeItem('thoughtflows_trainer_tab_head');
      sessionStorage.removeItem('thoughtflows_trainer_tab_manager');
      sessionStorage.removeItem('thoughtflows_trainer_tab_tl');
      sessionStorage.removeItem('tf_picked_trainer_identity');
      const currentRaw = sessionStorage.getItem('thoughtflows_user');
      if (currentRaw) {
        const u = JSON.parse(currentRaw);
        if (u?.trainerRole || u?.trainerId || u?.department === 'training') {
          sessionStorage.removeItem('thoughtflows_user');
        }
      }
    } catch (_) {}
    setActiveTrainerUser(null);
    setSelectedRole(null);
    setSelectedLeaderId(null);
    setSelectedTrainerUser(null);
    if (onTrainerLogout) {
      onTrainerLogout();
    }
  };

  // Handle clicking a node directly from the interactive Organization Chart
  const handleSelectHierarchyNode = (node) => {
    const roleKey = node.roleType;
    if (activeTrainerUser && activeTrainerUser.trainerRole === roleKey) {
      setSelectedLeaderId(node.id);
      setSelectedRole(roleKey);
    } else {
      setLoginModalRole(roleKey);
    }
  };

  // Render individual Trainer Dashboard (reusing existing component)
  // When logged in, no back button without logout (user stays on dashboard across refresh)
  if (selectedRole === 'trainer') {
    return (
      <TrainingDepartmentDashboard
        onClose={onClose}
        currentUser={selectedTrainerUser || activeTrainerUser || currentUser}
        onLogout={handleTrainerLogout}
        onSwitchDepartment={onSwitchDepartment}
        theme={theme}
        onBackToRoles={null}
      />
    );
  }

  // Render Head, Manager, or Team Lead Dashboard (All using the identical 8-point dashboard architecture)
  // When logged in, no back button without logout (user stays on dashboard across refresh)
  if (selectedRole === 'head' || selectedRole === 'manager' || selectedRole === 'tl') {
    return (
      <TrainerHeadDashboard
        roleType={selectedRole}
        initialLeaderId={selectedLeaderId || activeTrainerUser?.leaderId}
        onBack={null}
        currentUser={activeTrainerUser || currentUser}
        onLogout={handleTrainerLogout}
        onSwitchDepartment={onSwitchDepartment}
        onClose={onClose}
      />
    );
  }

  // Main Hub Landing View
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F8FAFC] font-sans text-slate-800 animate-fadeIn">
      {/* Role-Specific Login Modal */}
      <TrainerRoleLoginModal
        isOpen={Boolean(loginModalRole)}
        roleKey={loginModalRole || 'head'}
        onClose={() => setLoginModalRole(null)}
        onLoginSuccess={handleLoginSuccess}
      />

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
          {activeTrainerUser ? (
            <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 rounded-full pl-2 pr-3 py-1">
              <span className="w-7 h-7 rounded-full grid place-items-center text-xs font-bold text-white bg-emerald-600 shadow-xs">
                {(activeTrainerUser.name || 'U')[0]}
              </span>
              <div className="text-left">
                <div className="text-xs font-bold text-white leading-tight">
                  {activeTrainerUser.name}
                </div>
                <div className="text-[9px] font-bold tracking-wider text-emerald-200 uppercase">
                  {activeTrainerUser.role || activeTrainerUser.trainerRole}
                </div>
              </div>
              <button
                type="button"
                onClick={handleTrainerLogout}
                className="ml-1 text-[10px] text-emerald-200 hover:text-white underline cursor-pointer"
                title="Sign out of current account"
              >
                Sign out
              </button>
            </div>
          ) : (
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
          )}

          {(onLogout || onClose) && (
            <button
              onClick={activeTrainerUser ? handleTrainerLogout : (onLogout || onClose)}
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
              <ShieldCheck className="w-3.5 h-3.5 text-sky-300" />
              Role-Based Authentication · Trainers Department
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-[1.1] tracking-tight">
              Trainers Department
              <br />
              <span className="text-sky-300">Executive &amp; Faculty Portals</span>
            </h2>
            <p className="text-slate-300 text-sm mt-4 max-w-lg leading-relaxed">
              Each role desk has a dedicated login flow. Authenticate as Trainer Head, Trainer Manager, Trainer TL, or Trainer to view your assigned branch &amp; faculty data.
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
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Select Your Role Desk</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click a role card below to log in with individual credentials and view your authorized dashboard.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Individual Credentials Required
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {TRAINER_ROLES.map((role) => {
                const Icon = role.icon;
                const isCurrentActive = activeTrainerUser && (activeTrainerUser.trainerRole === role.key || (role.key === 'trainer' && activeTrainerUser.trainerId));
                return (
                  <button
                    type="button"
                    key={role.key}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRoleCardClick(role.key);
                    }}
                    className={`text-left bg-white border-2 border-slate-200 ${role.ring} rounded-[22px] p-6 min-h-[250px] flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group cursor-pointer relative overflow-hidden`}
                  >
                    {isCurrentActive && (
                      <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Active Session
                      </div>
                    )}

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

                    <div className="mt-5 pt-3.5 border-t border-slate-100">
                      <div className="text-[10.5px] font-semibold text-slate-400 mb-2 truncate">
                        👤 {role.accountHint}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold tracking-wide uppercase ${role.accentText}`}>
                          {role.scope}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[13px] font-extrabold text-slate-600 group-hover:text-blue-600 group-hover:translate-x-1 transition-all">
                          {isCurrentActive ? 'Enter Dashboard →' : 'Sign In →'}
                        </span>
                      </div>
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
              <div className="text-[11px] text-slate-500">
                {branches.length ? `Across ${branches.length} branches nationwide` : 'Across branches nationwide'}
              </div>
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
              <div className="text-[11px] text-slate-500">
                {Array.from(new Set(batches.map((b) => b.course).filter(Boolean))).slice(0, 5).join(', ') || 'Active courses in session'}
              </div>
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
