import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Crown,
  Briefcase,
  Users,
  GraduationCap,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  X,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';

const ROLE_META = {
  head: {
    key: 'head',
    tier: 'EXECUTIVE LEADERSHIP',
    title: 'Trainer Head Sign In',
    subtitle: 'Manoj · All 12 Branches · Pan-India Training Command',
    icon: Crown,
    gradient: 'linear-gradient(135deg, #005a9c, #0284c7)',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    color: '#005a9c',
    accounts: [
      {
        label: 'Manoj (Head of Training)',
        email: 'manoj.head@thoughtflows.in',
        pass: 'Head@123',
        scope: 'All 12 Branches · 25 Faculty'
      }
    ]
  },
  manager: {
    key: 'manager',
    tier: 'OPERATIONS MANAGEMENT',
    title: 'Trainer Manager Sign In',
    subtitle: 'Regional Training Managers · TN / KL & AP / TS',
    icon: Briefcase,
    gradient: 'linear-gradient(135deg, #00828a, #0d9488)',
    badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
    color: '#0d9488',
    accounts: [
      {
        label: 'Keerthi (TN & KL Region)',
        email: 'keerthi.manager@thoughtflows.in',
        pass: 'Keerthi@123',
        scope: '9 Branches · 17 Faculty (TN & KL)'
      },
      {
        label: 'Pavithra (AP & TS Region)',
        email: 'pavithra.manager@thoughtflows.in',
        pass: 'Pavithra@123',
        scope: '5 Branches · 8 Faculty (AP & TS)'
      }
    ]
  },
  tl: {
    key: 'tl',
    tier: 'TEAM LEADERSHIP',
    title: 'Trainer Team Lead (TL) Sign In',
    subtitle: 'Faculty Squad Leaders · Tamil Nadu, Kerala & AP/TS',
    icon: Users,
    gradient: 'linear-gradient(135deg, #2e7d32, #16a34a)',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    color: '#16a34a',
    accounts: [
      {
        label: 'Ram Balaji (TN Pod)',
        email: 'rambalaji.tl@thoughtflows.in',
        pass: 'RamBalaji@123',
        scope: '7 TN Branches · 10 Faculty'
      },
      {
        label: 'Vaishna (Kerala Pod)',
        email: 'vaishna.tl@thoughtflows.in',
        pass: 'Vaishna@123',
        scope: '2 KL Branches · 7 Faculty'
      },
      {
        label: 'Mounika (AP / TS Pod)',
        email: 'mounika.tl@thoughtflows.in',
        pass: 'Mounika@123',
        scope: '5 AP/TS Branches · 8 Faculty'
      }
    ]
  },
  trainer: {
    key: 'trainer',
    tier: 'FACULTY DESK',
    title: 'Trainer & Faculty Sign In',
    subtitle: '25 Specialized Medical Coding Faculty Desks Across 12 Branches',
    icon: GraduationCap,
    gradient: 'linear-gradient(135deg, #38BDF8, #2563EB)',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
    color: '#0284c7',
    accounts: [
      {
        label: 'Srithar S (TR-CBG-001 · CPC)',
        email: 'srithar.brandforge@gmail.com',
        pass: 'Srithar@123',
        scope: 'Gandhipuram · CPC Lead Faculty'
      },
      {
        label: 'Tharani shri (TR-TN-01 · CPC)',
        email: 'tharanishri.trainer@thoughtflows.in',
        pass: 'Trainer@123',
        scope: 'Saravanampatti · CPC Faculty'
      },
      {
        label: 'Aleena (TR-KL-01 · CPC)',
        email: 'aleena.trainer@thoughtflows.in',
        pass: 'Trainer@123',
        scope: 'Kochi · Kerala Faculty'
      },
      {
        label: 'Pooja (TR-AP-01 · CPC)',
        email: 'pooja.trainer@thoughtflows.in',
        pass: 'Trainer@123',
        scope: 'Ameerpet · Hyderabad Faculty'
      }
    ]
  }
};

export default function TrainerRoleLoginModal({
  isOpen,
  roleKey = 'head',
  onClose,
  onLoginSuccess
}) {
  const meta = ROLE_META[roleKey] || ROLE_META.head;
  const Icon = meta.icon;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // When opened or roleKey changes, pre-fill with the first account for that role
  useEffect(() => {
    if (isOpen && meta.accounts?.[0]) {
      setEmail(meta.accounts[0].email);
      setPassword(meta.accounts[0].pass);
      setError('');
      setShowPassword(false);
    }
  }, [isOpen, roleKey]);

  if (!isOpen) return null;

  const handleSelectAccount = (acc) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email / Trainer ID and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/auth/login', {
        email: email.trim(),
        password,
        role: roleKey
      });

      if (res.data?.success && res.data?.user) {
        const authedUser = res.data.user;

        // Persist session to sessionStorage
        try {
          sessionStorage.setItem('thoughtflows_user', JSON.stringify(authedUser));
          sessionStorage.setItem('thoughtflows_trainer_user', JSON.stringify(authedUser));
        } catch (_) {}

        setLoading(false);
        onLoginSuccess(authedUser);
        return;
      }
      setError(res.data?.message || 'Login failed. Please verify your credentials.');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Authentication failed. Please verify credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-[500px] bg-white rounded-[28px] p-6 sm:p-8 shadow-2xl border border-slate-100 my-auto text-left transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          title="Close Login"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Role Header Banner */}
        <div className="flex items-center gap-3.5 mb-5">
          <div
            className="w-13 h-13 rounded-2xl grid place-items-center text-white shadow-md shrink-0"
            style={{ background: meta.gradient }}
          >
            <Icon className="w-7 h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border mb-1 ${meta.badgeBg}`}>
              {meta.tier}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              {meta.title}
            </h2>
            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
              {meta.subtitle}
            </p>
          </div>
        </div>

        {/* 1-Click Fast Credentials Selector for Testing & Evaluation */}
        <div className="mb-5 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              1-Click Account Switcher
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">
              {meta.accounts.length} {meta.accounts.length === 1 ? 'Account' : 'Accounts'}
            </span>
          </div>

          <div className="space-y-1.5">
            {meta.accounts.map((acc, idx) => {
              const isSelected = email.toLowerCase() === acc.email.toLowerCase();
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleSelectAccount(acc)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-white border-teal-500 text-slate-900 shadow-xs ring-1 ring-teal-500/30'
                      : 'bg-white/70 hover:bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold truncate">{acc.label}</div>
                    <div className="text-[10.5px] text-slate-500 font-mono truncate">{acc.email}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${isSelected ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}`}>
                    {isSelected ? 'Selected' : 'Use →'}
                  </span>
                </button>
              );
            })}
          </div>

          {roleKey === 'trainer' && (
            <p className="text-[10.5px] text-slate-500 mt-2 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              You can also type any faculty ID (e.g. <code className="font-mono bg-slate-200/80 px-1 rounded">TR-TN-02</code>) or email with password <code className="font-mono bg-slate-200/80 px-1 rounded">Trainer@123</code>.
            </p>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <span className="font-bold">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {roleKey === 'trainer' ? 'Email or Faculty ID' : 'Account Email'}
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={roleKey === 'trainer' ? 'e.g. TR-TN-01 or tharanishri.trainer@thoughtflows.in' : 'Enter email'}
              required
              autoFocus
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-5 rounded-xl text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-70"
            style={{ background: meta.gradient }}
          >
            <span>{loading ? 'Authenticating...' : `Access ${meta.title.replace(' Sign In', '')} Dashboard`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Security & Access Notice */}
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
