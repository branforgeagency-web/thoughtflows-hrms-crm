import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  LogOut,
  Lock,
  CheckCircle2,
  ShieldCheck,
  Radio,
  PhoneCall,
  Calendar,
  Building2
} from 'lucide-react';
import HrDepartmentDashboard from './HrDepartmentDashboard';
import HrRoleLoginModal, { HR_ROLE_META, HR_ROLE_ORDER, inferHrRole, hrRoleAllows } from './HrRoleLoginModal';
import { getHrHubSummary, getHrMyTeam, onDataUpdate } from '../services/api';

const SS_USER = 'thoughtflows_hr_user';
const SS_ROLE = 'thoughtflows_hr_role';

const readJson = (key) => {
  try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (_) { return null; }
};
// A saved HR desk session is only valid while the API login token is still there
const readHrSession = () => {
  const u = readJson(SS_USER);
  const apiUser = readJson('thoughtflows_user');
  if (u && !apiUser?.token) {
    try { sessionStorage.removeItem(SS_USER); sessionStorage.removeItem(SS_ROLE); } catch (_) {}
    return null;
  }
  return u;
};
const isHrDeptUser = (u) => Boolean(u) && String(u.department || '').toLowerCase() === 'hr';

export default function HrDepartmentHub({ onClose, currentUser, onLogout, onHrAuth, onHrRoleChange, onSwitchDepartment, theme = 'classic' }) {
  const [activeHrUser, setActiveHrUser] = useState(() => readHrSession() || (isHrDeptUser(currentUser) ? currentUser : null));
  const [selectedRole, setSelectedRole] = useState(() => {
    const u = readHrSession() || (isHrDeptUser(currentUser) ? currentUser : null);
    if (!u) return null;
    try {
      const saved = sessionStorage.getItem(SS_ROLE);
      if (saved && HR_ROLE_META[saved]) return saved;
    } catch (_) {}
    return inferHrRole(u);
  });
  const [loginModalRole, setLoginModalRole] = useState(null);

  // Persist role across refresh
  useEffect(() => {
    try {
      if (selectedRole) sessionStorage.setItem(SS_ROLE, selectedRole);
      else sessionStorage.removeItem(SS_ROLE);
    } catch (_) {}
    if (onHrRoleChange) onHrRoleChange(selectedRole);
  }, [selectedRole]); // eslint-disable-line react-hooks/exhaustive-deps

  // An HR user who signed in from the main login lands straight on their desk
  useEffect(() => {
    if (!activeHrUser && isHrDeptUser(currentUser)) {
      setActiveHrUser(currentUser);
      setSelectedRole((prev) => prev || inferHrRole(currentUser));
    }
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- HR Team Lead: the counsellors who report to them ----
  const [teamNames, setTeamNames] = useState([]);
  const [teamSource, setTeamSource] = useState('');
  const [teamLoaded, setTeamLoaded] = useState(false);
  const [teamError, setTeamError] = useState(false);
  useEffect(() => {
    if (selectedRole !== 'tl') return undefined;
    let alive = true;
    setTeamLoaded(false);
    setTeamError(false);
    getHrMyTeam()
      .then((d) => {
        if (!alive) return;
        setTeamNames((d?.members || []).map((m) => m.name).filter(Boolean));
        setTeamSource(d?.source || '');
      })
      .catch(() => { if (alive) { setTeamNames([]); setTeamSource(''); setTeamError(true); } })
      .finally(() => { if (alive) setTeamLoaded(true); });
    return () => { alive = false; };
  }, [selectedRole, activeHrUser?.name]);

  // ---- Landing KPIs (public counts-only endpoint, works before sign-in) ----
  const [stats, setStats] = useState(null);
  const loadStats = useCallback(() => {
    getHrHubSummary()
      .then((d) => setStats(d && typeof d === 'object' ? d : null))
      .catch(() => setStats(null));
  }, []);

  useEffect(() => {
    if (selectedRole) return undefined; // only the landing page shows these
    loadStats();
    const unsub = onDataUpdate((entity) => {
      if (['team', 'leads', 'demos', 'branches'].includes(entity)) loadStats();
    });
    const t = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) loadStats();
    }, 60000);
    return () => { unsub(); clearInterval(t); };
  }, [loadStats, selectedRole]);

  const show = (v) => (v === null || v === undefined ? '—' : String(v));

  // ---- Auth handlers ----
  const handleRoleCardClick = (roleKey) => {
    const u = activeHrUser || currentUser;
    if (u && hrRoleAllows(roleKey, u)) {
      if (!activeHrUser) {
        const withRole = { ...u, hrRole: roleKey };
        setActiveHrUser(withRole);
        try { sessionStorage.setItem(SS_USER, JSON.stringify(withRole)); } catch (_) {}
      }
      setSelectedRole(roleKey);
      return;
    }
    setLoginModalRole(roleKey);
  };

  const handleLoginSuccess = (user) => {
    const roleKey = user.hrRole || loginModalRole || 'hr';
    try {
      sessionStorage.setItem('thoughtflows_user', JSON.stringify(user)); // API token
      sessionStorage.setItem(SS_USER, JSON.stringify(user));
      sessionStorage.setItem(SS_ROLE, roleKey);
    } catch (_) {}
    setActiveHrUser(user);
    setSelectedRole(roleKey);
    setLoginModalRole(null);
    if (onHrAuth) onHrAuth(user, roleKey);
  };

  const handleHrLogout = () => {
    try {
      sessionStorage.removeItem(SS_USER);
      sessionStorage.removeItem(SS_ROLE);
      sessionStorage.removeItem('thoughtflows_user');
      sessionStorage.removeItem('thoughtflows_hr_active_tab');
    } catch (_) {}
    setActiveHrUser(null);
    setSelectedRole(null);
    if (onHrAuth) onHrAuth(null, null);
  };

  // ---- Role desks ----
  if (selectedRole === 'hr') {
    return (
      <HrDepartmentDashboard
        onClose={onClose}
        currentUser={activeHrUser || currentUser}
        onLogout={handleHrLogout}
        onSwitchDepartment={onSwitchDepartment}
        theme={theme}
      />
    );
  }

  if (selectedRole === 'tl' || selectedRole === 'head' || selectedRole === 'branch') {
    const user = activeHrUser || currentUser || {};
    const branchLabel = String(user.branch || '').replace(/\s*branch\b.*$/i, '').trim();
    const viewScope = selectedRole === 'tl'
      ? {
        mode: 'team',
        names: teamNames,
        label: teamError
          ? 'My Team · could not load your team — showing only your own records (refresh to retry)'
          : teamNames.length === 0
            ? 'My Team · no HRs report to you yet — ask Admin to set "Reports to"'
            : `My Team (${teamNames.length} HR${teamNames.length === 1 ? '' : 's'}${teamSource === 'branch' ? ` · ${branchLabel || 'branch'} (no one assigned to you yet)` : ''})`
      }
      : selectedRole === 'branch'
        ? { mode: 'branch', branch: user.branch || '', label: `${branchLabel || 'Branch'} Branch · All HRs` }
        : { mode: 'all', label: 'All Branches · All HRs' };
    if (selectedRole === 'tl' && !teamLoaded) {
      return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#F8FAFC] text-sm font-bold text-slate-500">
          Loading your team…
        </div>
      );
    }
    return (
      <HrDepartmentDashboard
        key={selectedRole}
        onClose={onClose}
        currentUser={selectedRole === 'branch' ? { ...user, isBranchManager: true } : user}
        onLogout={handleHrLogout}
        onSwitchDepartment={onSwitchDepartment}
        theme={theme}
        viewScope={viewScope}
      />
    );
  }

  // ---- Landing: 4 role cards ----
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F8FAFC] font-sans text-slate-800 animate-fadeIn">
      <HrRoleLoginModal
        isOpen={Boolean(loginModalRole)}
        roleKey={loginModalRole || 'hr'}
        onClose={() => setLoginModalRole(null)}
        onLoginSuccess={handleLoginSuccess}
      />

      <header
        className="sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 flex-wrap shadow-md"
        style={{ background: 'linear-gradient(90deg, #0F172A, #1E293B 55%, #334155)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/90 hover:bg-white text-slate-800 text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Portal Home
          </button>
          <div className="bg-white rounded-xl px-2.5 py-1.5 shadow-sm hidden sm:block">
            <img src="/thoughtflows-logo.png" alt="Thoughtflows" className="h-6 w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white leading-tight">HR Department</h1>
            <p className="text-[10px] font-bold tracking-[0.2em] text-slate-300 uppercase">
              Thoughtflows Medical Coding Academy · Admissions &amp; Counselling
            </p>
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
      </header>

      <main className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero */}
        <div
          className="rounded-3xl p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 items-center relative overflow-hidden shadow-lg"
          style={{ background: 'linear-gradient(120deg, #0F172A, #1E293B 60%, #9F1239)' }}
        >
          <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(251,113,133,0.25), transparent 70%)' }} />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[11px] font-bold tracking-[0.2em] text-rose-300 uppercase mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-300" />
              Role-Based Authentication · HR Department
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-[1.1] tracking-tight">
              HR Department
              <br />
              <span className="text-rose-300">Counsellor &amp; Leadership Portals</span>
            </h2>
            <p className="text-slate-300 text-sm mt-4 max-w-lg leading-relaxed">
              Each role desk has its own login. Sign in as HR, HR Team Lead, Branch Head or HR Department Head to open your dashboard.
            </p>
          </div>
          <div className="relative z-10 grid grid-cols-2 gap-3.5">
            <Kpi value={show(stats?.team)} label="HR Team Members" />
            <Kpi value={show(stats?.available)} label="Available Today" tone="text-emerald-300" />
            <Kpi value={show(stats?.leadsToday)} label="New Leads Today" />
            <Kpi value={show(stats?.demos)} label="Upcoming Demos" tone="text-rose-300" />
          </div>
        </div>

        {/* 4 Role Cards */}
        <div>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Select Your Role Desk</h3>
              <p className="text-xs text-slate-500 mt-0.5">Click a role card to sign in with your own credentials and open your dashboard.</p>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Individual Credentials Required
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {HR_ROLE_ORDER.map((key) => {
              const role = HR_ROLE_META[key];
              const Icon = role.icon;
              const u = activeHrUser || currentUser;
              const canEnter = Boolean(u) && hrRoleAllows(key, u);
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => handleRoleCardClick(key)}
                  className={`text-left bg-white border-2 border-slate-200 ${role.ring} rounded-[22px] p-6 min-h-[250px] flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group cursor-pointer relative overflow-hidden`}
                >
                  {canEnter && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Active Session
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="w-[52px] h-[52px] rounded-2xl grid place-items-center shadow-md text-white" style={{ background: role.gradient }}>
                        <Icon className="w-6 h-6" />
                      </span>
                      <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">{role.tier}</span>
                    </div>
                    <div className="text-lg font-extrabold text-slate-900 tracking-tight group-hover:text-rose-600 transition-colors">{role.name}</div>
                    <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">{role.desc}</p>
                  </div>
                  <div className="mt-5 pt-3.5 border-t border-slate-100">
                    <div className="text-[10.5px] font-semibold text-slate-400 mb-2 truncate flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>Admin role: {role.adminRole}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold tracking-wide uppercase ${role.accentText}`}>{role.scope}</span>
                      <span className="inline-flex items-center gap-1 text-[13px] font-extrabold text-slate-600 group-hover:text-rose-600 group-hover:translate-x-1 transition-all whitespace-nowrap">
                        {canEnter ? 'Enter Dashboard →' : 'Sign In →'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Snapshot strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Strip icon={Radio} iconCls="bg-emerald-50 text-emerald-600" title="Counsellors On Duty" value={`${show(stats?.available)} Available`} sub="HR team not on leave today" />
          <Strip icon={PhoneCall} iconCls="bg-rose-50 text-rose-600" title="Lead Inflow" value={`${show(stats?.leadsToday)} New Today`} sub="Enquiries captured today" />
          <Strip icon={Calendar} iconCls="bg-amber-50 text-amber-600" title="Upcoming Demos" value={`${show(stats?.demos)} Scheduled`} sub="Booked & confirmed demos" />
          <Strip icon={Building2} iconCls="bg-purple-50 text-purple-600" title="Branch Network" value={`${show(stats?.branches)} Branches`} sub="Each with its own Branch Head login" />
        </div>
      </main>
    </div>
  );
}

function Kpi({ value, label, tone = 'text-white' }) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
      <div className={`text-2xl font-black ${tone}`}>{value}</div>
      <div className="text-[10px] font-bold tracking-wider text-rose-100 uppercase mt-0.5">{label}</div>
    </div>
  );
}

function Strip({ icon: Icon, iconCls, title, value, sub }) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconCls}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</div>
        <div className="text-sm font-extrabold text-slate-900">{value}</div>
        <div className="text-[11px] text-slate-500">{sub}</div>
      </div>
    </div>
  );
}
