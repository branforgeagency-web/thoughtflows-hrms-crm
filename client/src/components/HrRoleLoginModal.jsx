import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  PhoneCall,
  Users,
  Building2,
  Crown,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  X,
  ArrowRight
} from 'lucide-react';

// The four HR Department role desks (order = card order on the HR hub)
export const HR_ROLE_META = {
  hr: {
    key: 'hr',
    tier: 'COUNSELLOR DESK',
    name: 'HR',
    title: 'HR Sign In',
    subtitle: 'Academic Counsellors · Calls, Follow-ups & Admissions',
    desc: 'Lead calls, follow-ups, demo booking, admissions, student fees & your daily EOD report.',
    scope: 'COUNSELLORS · ALL BRANCHES',
    icon: PhoneCall,
    gradient: 'linear-gradient(135deg, #e11d48, #f97316)',
    accentText: 'text-rose-700',
    ring: 'hover:border-rose-400',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    adminRole: 'HR',
    emailLabel: 'Account Email',
    emailPlaceholder: 'Enter your HR email address'
  },
  tl: {
    key: 'tl',
    tier: 'TEAM LEADERSHIP',
    name: 'HR Team Lead',
    title: 'HR Team Lead Sign In',
    subtitle: 'Counsellor Squad Leaders · Calls, Conversions & Daily Tracker',
    desc: 'The HR dashboard with every lead, follow-up, demo, admission & fee of the HRs in your team.',
    scope: 'HR TEAMS · BRANCH SQUADS',
    icon: Users,
    gradient: 'linear-gradient(135deg, #2e7d32, #16a34a)',
    accentText: 'text-emerald-700',
    ring: 'hover:border-emerald-400',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    adminRole: 'HR TL',
    emailLabel: 'Team Lead Email',
    emailPlaceholder: 'Enter HR Team Lead email'
  },
  branch: {
    key: 'branch',
    tier: 'BRANCH OPERATIONS',
    name: 'Branch Head',
    title: 'Branch Head Sign In',
    subtitle: 'Branch-scoped HR, admissions & operations',
    desc: 'The HR dashboard for your whole branch — every HR\'s leads, follow-ups, demos, admissions & fees.',
    scope: '14 BRANCHES · ONE LOGIN EACH',
    icon: Building2,
    gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    accentText: 'text-purple-700',
    ring: 'hover:border-purple-400',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    adminRole: 'BRANCH HEAD',
    emailLabel: 'Branch Account Email',
    emailPlaceholder: 'e.g. gandhipuram@thoughtflows.in'
  },
  head: {
    key: 'head',
    tier: 'EXECUTIVE LEADERSHIP',
    name: 'HR Department Head',
    title: 'HR Department Head Sign In',
    subtitle: 'Department-wide HR command · All branches',
    desc: 'The HR dashboard across all branches — every HR\'s leads, follow-ups, demos, admissions & fees.',
    scope: 'ALL BRANCHES · DEP-HR-001',
    icon: Crown,
    gradient: 'linear-gradient(135deg, #005a9c, #0284c7)',
    accentText: 'text-blue-700',
    ring: 'hover:border-blue-400',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    adminRole: 'HR DEPARTMENT HEAD',
    emailLabel: 'HR Department Head Email',
    emailPlaceholder: 'Enter HR Department Head email'
  }
};

export const HR_ROLE_ORDER = ['hr', 'tl', 'branch', 'head'];

const lc = (v) => String(v || '').toLowerCase();
const isBranchHeadRole = (role) => /branch\s*(manager|head)/i.test(role || '');
const isAdminUser = (u) => {
  const r = lc(u?.role);
  const d = lc(u?.department);
  return d === 'admin' || /super admin|^admin$|management|operational head|regional manager/.test(r);
};
const isHrUser = (u) => lc(u?.department) === 'hr' || /\bhr\b/i.test(u?.role || '');

// Which HR desk a signed-in user belongs to (null = not an HR Department user)
export function inferHrRole(u) {
  if (!u) return null;
  const role = String(u.role || '');
  if (u.hrRole && HR_ROLE_META[u.hrRole]) return u.hrRole;
  if (isBranchHeadRole(role)) return 'branch';
  if (!isHrUser(u)) return null;
  if (/\bhead\b|\bhod\b/i.test(role)) return 'head';
  if (/\btl\b|team\s*lead/i.test(role)) return 'tl';
  return 'hr';
}

// Can this account open the given role desk?
export function hrRoleAllows(roleKey, u) {
  if (!u) return false;
  if (isAdminUser(u)) return true;
  const role = String(u.role || '');
  switch (roleKey) {
    case 'hr':
      return isHrUser(u);
    case 'tl':
      return isHrUser(u) && /\btl\b|team\s*lead|\bhead\b|\bhod\b/i.test(role);
    case 'branch':
      return isBranchHeadRole(role);
    case 'head':
      return isHrUser(u) && /\bhead\b|\bhod\b/i.test(role);
    default:
      return false;
  }
}

export default function HrRoleLoginModal({ isOpen, roleKey = 'hr', onClose, onLoginSuccess }) {
  const meta = HR_ROLE_META[roleKey] || HR_ROLE_META.hr;
  const Icon = meta.icon;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setError('');
      setShowPassword(false);
    }
  }, [isOpen, roleKey]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/login', { email: email.trim(), password, role: roleKey });
      const authedUser = res.data?.user;
      if (res.data?.success && authedUser) {
        if (!hrRoleAllows(roleKey, authedUser)) {
          setError(`This account (${authedUser.role || 'no role'}) is not a ${meta.name} account. Ask Admin to create a user with role "${meta.adminRole}".`);
          return;
        }
        onLoginSuccess({ ...authedUser, hrRole: roleKey });
        return;
      }
      setError(res.data?.message || 'Login failed. Please verify your credentials.');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-[500px] bg-white rounded-[28px] p-6 sm:p-8 shadow-2xl border border-slate-100 my-auto text-left">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          title="Close Login"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-13 h-13 rounded-2xl grid place-items-center text-white shadow-md shrink-0 p-3" style={{ background: meta.gradient }}>
            <Icon className="w-7 h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border mb-1 ${meta.badgeBg}`}>
              {meta.tier}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">{meta.title}</h2>
            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{meta.subtitle}</p>
          </div>
        </div>

        <div className="mb-5 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-800 block mb-0.5">Admin-Created Account Required</span>
            {roleKey === 'branch'
              ? 'Sign in with your branch account (e.g. gandhipuram@thoughtflows.in) or a user created in Admin with role "BRANCH HEAD".'
              : `Sign in with the account created for you in Admin Management with role "${meta.adminRole}".`}
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
            <span className="font-bold">⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {meta.emailLabel}
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={meta.emailPlaceholder}
              required
              autoFocus
              autoComplete="username"
              className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 font-medium outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 pr-10 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 font-medium outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-5 rounded-xl text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-70"
            style={{ background: meta.gradient }}
          >
            <span>{loading ? 'Authenticating...' : `Access ${meta.name} Dashboard`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Role-Based API Guard Enforced</span>
          </div>
          <span className="font-mono text-[10px]">Thoughtflows Security</span>
        </div>
      </div>
    </div>
  );
}
