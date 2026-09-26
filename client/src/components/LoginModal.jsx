import React, { useState, useEffect } from 'react';
import axios from 'axios';

export const TRAINER_PROFILES = [
  {
    trainerId: 'TR-CBG-001',
    name: 'Srithar S',
    email: 'srithar.brandforge@gmail.com',
    role: 'Trainer',
    courseKey: 'CPC',
    expertCourse: 'CPC — Certified Professional Coder',
    branch: 'Gandhipuram',
    shift: '6:00 AM – 2:00 PM',
    avatar: '👨‍🏫',
    badge: 'Shift 6 AM – 2 PM'
  }
];

export const DEPARTMENTS = [
  {
    id: 'hr',
    title: 'HR Department',
    code: 'HR',
    shortName: 'HR',
    icon: '👔',
    subtitle: 'Lead capture, follow-ups & admissions',
    roleName: 'HR & Academic Counselling Lead',
    staffName: 'Balaji R.',
    branch: 'Chennai - Guindy (HQ)',
    email: 'hr@thoughtflows.in',
    color: '#ef4444',
    badgeClassLight: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    id: 'training',
    title: 'Training Department',
    code: 'ACAD',
    shortName: 'Training',
    icon: '🎓',
    subtitle: '12-branch trainer & batch management',
    roleName: 'Trainer',
    staffName: 'Srithar S',
    trainerId: 'TR-CBG-001',
    branch: 'Gandhipuram',
    shift: '6:00 AM – 2:00 PM',
    email: 'srithar.brandforge@gmail.com',
    color: '#00897b',
    badgeClassLight: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    id: 'cccp',
    title: 'CCCP Dashboard',
    code: 'CCCP',
    shortName: 'CCCP',
    icon: '🤝',
    subtitle: 'Placement · Exam · Company Cells',
    roleName: 'Placements & Corporate Relations Head',
    staffName: 'Meenakshi R.',
    branch: 'Bangalore - Indiranagar',
    email: 'cccp@thoughtflows.in',
    color: '#059669',
    badgeClassLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'marketing',
    title: 'Marketing Department',
    code: 'MKT',
    shortName: 'Marketing',
    icon: '📢',
    subtitle: 'Ad campaigns, social & lead sources',
    roleName: 'Head of Growth & Lead Generation',
    staffName: 'Priya R.',
    branch: 'Hyderabad - Madhapur',
    email: 'marketing@thoughtflows.in',
    color: '#9333ea',
    badgeClassLight: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    id: 'leadership',
    title: 'Leadership Hub',
    code: 'LEAD',
    shortName: 'Leadership',
    icon: '🏛️',
    subtitle: 'Operational, Regional & Branch Heads',
    roleName: 'Regional Operations Director',
    staffName: 'Ganesh N.',
    branch: '12 Hubs (HQ Overseer)',
    email: 'leadership@thoughtflows.in',
    color: '#ea580c',
    badgeClassLight: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    id: 'student',
    title: 'Student Dashboard',
    code: 'STU',
    shortName: 'Student',
    icon: '🎒',
    subtitle: 'AAPC CPC preparation & attendance tracking',
    roleName: 'Certified CPC Student Scholar',
    staffName: 'Keerthana R.',
    studentId: 'TF-CBE-CPC-07-2026-3062',
    branch: 'Coimbatore - Gandhipuram',
    email: 'student@thoughtflows.in',
    color: '#0d9488',
    badgeClassLight: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    id: 'admin',
    title: 'Admin & Management',
    code: 'ADM',
    shortName: 'Admin',
    icon: '⚙️',
    subtitle: 'Executive strategy, P&L & admin settings',
    roleName: 'Managing Director & Executive Admin',
    staffName: 'Executive Founders Desk',
    branch: 'Thoughtflows Group HQ',
    email: 'admin@thoughtflows.in',
    color: '#4338ca',
    badgeClassLight: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  }
];

export default function LoginModal({ 
  isOpen, 
  onClose, 
  onLoginSuccess, 
  initialDepartment = 'training', 
  showDepartmentSelector = false,
  theme = 'classic' 
}) {
  const isClay = theme === 'clay';
  const [activeDeptId, setActiveDeptId] = useState(initialDepartment);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Development only: built-in account passwords from the local server (.env DEV_LOGIN_AUTOFILL=true)
  const [devAccounts, setDevAccounts] = useState({});
  const [devList, setDevList] = useState([]);
  const [devGroup, setDevGroup] = useState('hr');
  const [devSearch, setDevSearch] = useState('');
  const [devPick, setDevPick] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    axios.get('/api/auth/dev-accounts')
      .then((r) => { setDevAccounts(r.data?.builtin || {}); setDevList(Array.isArray(r.data?.accounts) ? r.data.accounts : []); })
      .catch(() => { setDevAccounts({}); setDevList([]); });
  }, [isOpen]);
  const devEnabled = Object.keys(devAccounts).length > 0 || devList.length > 0;
  const DEV_GROUPS = [['hr', 'HR'], ['training', 'Trainers'], ['student', 'Students'], ['other', 'Others']];
  const devFiltered = devList.filter((a) => {
    const g = ['hr', 'training', 'student'].includes(a.group) ? a.group : 'other';
    if (g !== devGroup) return false;
    const q = devSearch.trim().toLowerCase();
    return !q || [a.name, a.email, a.detail].some((v) => String(v || '').toLowerCase().includes(q));
  });
  const handleDevLogin = async () => {
    const acc = devList.find((a) => `${a.kind}:${a.id}` === devPick);
    if (!acc) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/dev-login', { kind: acc.kind, id: acc.id });
      if (res.data?.success && res.data?.user) {
        onLoginSuccess(res.data.user);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Dev login failed');
    } finally {
      setLoading(false);
    }
  };
  const devPassword = (deptId) => devAccounts[deptId]?.password || '';
  const devEmail = (dept) => devAccounts[dept.id]?.email || dept.email;

  // Reset inputs when modal opens or initialDepartment changes
  useEffect(() => {
    if (isOpen) {
      const dept = DEPARTMENTS.find(d => d.id === initialDepartment) || DEPARTMENTS[1];
      setActiveDeptId(dept.id);
      setEmail('');
      setPassword('');
      setError('');
    }
  }, [isOpen, initialDepartment]);

  const activeDept = DEPARTMENTS.find(d => d.id === activeDeptId) || DEPARTMENTS[0];

  // Dev auto-fill: pre-fill the selected account as soon as the dev passwords load
  useEffect(() => {
    if (!isOpen || !devAccounts[activeDeptId] || email) return;
    setEmail(devAccounts[activeDeptId].email);
    setPassword(devAccounts[activeDeptId].password);
  }, [devAccounts, activeDeptId, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Try server-side authentication first
    try {
      const res = await axios.post('/api/auth/login', { 
        email: normalizedEmail, 
        password,
        department: activeDept.id
      });
      if (res.data?.success && res.data?.user) {
        setLoading(false);
        onLoginSuccess(res.data.user);
        onClose();
        return;
      }
    } catch (err) {
      // If server explicitly returned an error message (e.g. 401 Unauthorized)
      if (err.response?.data?.message) {
        setLoading(false);
        setError(err.response.data.message);
        return;
      }
    }

    // Server is the only place accounts are checked
    setLoading(false);
    setError('Could not reach the login server. Check your connection and try again.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[6px] animate-fadeIn overflow-y-auto">
      {/* Modal Card */}
      <div className={`relative w-full max-w-[460px] p-6 sm:p-7 text-center my-auto transition-all ${
        isClay
          ? 'clay-modal'
          : 'bg-white rounded-[32px] shadow-[0_24px_70px_rgba(0,0,0,0.22)] border border-slate-100/80'
      }`}>
        
        {/* Top Actions: Back to Portal */}
        <div className="flex items-center justify-start mb-3">
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              isClay
                ? 'clay-btn clay-btn-secondary'
                : 'rounded-full border border-slate-200/90 text-slate-600 hover:text-slate-900 hover:bg-slate-50 active:scale-[0.97]'
            }`}
          >
            ‹ Back to portal
          </button>
        </div>

        {/* Thoughtflows Logo */}
        <div className="flex justify-center mb-3">
          <img
            src="/thoughtflows-logo.png"
            alt="Thoughtflows Medical Coding Academy"
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Header Titles */}
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Sign In to Portal
        </h2>
        <p className="text-xs text-slate-500 mt-0.5 mb-3 font-medium">
          {activeDept.title} · {activeDept.subtitle}
        </p>

        {/* 7 Dashboard Options as Selectable Buttons - Only shown for Open My Dashboard and Sign In */}
        {showDepartmentSelector && (
          <div className="mb-4">
            <div className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-slate-500 uppercase mb-2 flex items-center justify-between px-1">
              <span>Select Dashboard</span>
              <span className="text-[10px] font-bold text-[#00897b] bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                7 Options
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 p-2 bg-slate-50/80 rounded-2xl border border-slate-200/60">
              {DEPARTMENTS.map((dept) => {
                const isSelected = activeDeptId === dept.id;
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => {
                      setActiveDeptId(dept.id);
                      setEmail(devEmail(dept));
                      setPassword(devPassword(dept.id));
                      setError('');
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                      isClay
                        ? isSelected
                          ? 'clay-pill text-white shadow-md ring-2 ring-[#00897b] scale-[1.03]'
                          : 'clay-btn clay-btn-secondary text-slate-600 hover:text-slate-900'
                        : isSelected
                          ? 'text-white shadow-md shadow-slate-900/15 scale-[1.04] ring-2 ring-offset-1 ring-slate-400'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs active:scale-[0.97]'
                    }`}
                    style={isSelected ? { backgroundColor: dept.color } : {}}
                    title={dept.title}
                  >
                    <span className="text-xs">{dept.icon}</span>
                    <span>{dept.shortName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {devEnabled && (
          <div className="mb-4 p-3 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-extrabold tracking-wider text-amber-800 uppercase">Developer quick login</span>
              <span className="text-[10px] text-amber-700">{devList.length} accounts · dev only</span>
            </div>
            <div className="flex gap-1.5">
              {DEV_GROUPS.map(([id, label]) => (
                <button key={id} type="button" onClick={() => { setDevGroup(id); setDevPick(''); }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${devGroup === id ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-amber-800 border-amber-200'}`}>
                  {label} ({devList.filter((a) => (['hr', 'training', 'student'].includes(a.group) ? a.group : 'other') === id).length})
                </button>
              ))}
            </div>
            <input value={devSearch} onChange={(e) => setDevSearch(e.target.value)} placeholder="Search name, email or ID…"
              className="w-full px-3 py-1.5 rounded-lg border border-amber-200 bg-white text-xs" />
            <div className="flex gap-2">
              <select value={devPick} onChange={(e) => setDevPick(e.target.value)} className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-amber-200 bg-white text-xs">
                <option value="">{devFiltered.length ? 'Select an account…' : 'No accounts in this group'}</option>
                {devFiltered.map((a) => (
                  <option key={`${a.kind}:${a.id}`} value={`${a.kind}:${a.id}`}>
                    {a.name}{a.email ? ` — ${a.email}` : ''}{a.detail ? ` (${a.detail})` : ''}
                  </option>
                ))}
              </select>
              <button type="button" onClick={handleDevLogin} disabled={!devPick || loading}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-50">
                Login as
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-2.5 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="text-left space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-extrabold tracking-wider text-[#00695c] uppercase">
                EMAIL ADDRESS
              </label>
              <button
                type="button"
                onClick={() => {
                  setEmail(devEmail(activeDept));
                  setPassword(devPassword(activeDept.id));
                  setError('');
                }}
                className="text-[10.5px] font-bold text-[#00897b] hover:underline cursor-pointer"
              >
                Auto-fill {activeDept.shortName}
              </button>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={
                activeDeptId === 'admin' 
                  ? 'admin@thoughtflows.in' 
                  : activeDeptId === 'training' 
                  ? 'srithar.brandforge@gmail.com' 
                  : activeDept.email || 'you@thoughtflows.in'
              }
              className={`w-full px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all ${
                isClay
                  ? 'clay-input'
                  : 'bg-white border-2 border-[#00897b] rounded-xl shadow-xs focus:ring-2 focus:ring-[#00897b]/20 font-medium'
              }`}
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold tracking-wider text-[#00695c] uppercase mb-1">
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className={`w-full px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all ${
                isClay
                  ? 'clay-input'
                  : 'bg-[#f8fafc] border border-slate-200 rounded-xl focus:border-[#00897b] focus:bg-white font-medium'
              }`}
            />
          </div>

          {/* Sign in Button */}
          <div className="pt-1.5">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-6 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isClay
                  ? 'clay-btn clay-btn-primary'
                  : 'rounded-xl bg-[#00897b] hover:bg-[#00796b] active:bg-[#00695c] text-white shadow-sm active:scale-[0.98]'
              }`}
            >
              <span>{loading ? 'Authenticating...' : 'Sign In →'}</span>
            </button>
          </div>
        </form>

        {/* Footer info */}
        <div className="text-center mt-4">
          <div className="text-[11px] text-slate-500 font-normal flex items-center justify-center gap-1.5">
            <span>Department:</span>
            <span 
              className="font-bold px-2 py-0.5 rounded-md text-white text-[10.5px] shadow-xs"
              style={{ backgroundColor: activeDept.color }}
            >
              {activeDept.icon} {activeDept.title}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
