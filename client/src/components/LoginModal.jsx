import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';

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



export const BRANCH_LOGIN_PROFILES = [
  { name: 'Gandhipuram', code: 'CBE-GPM', city: 'Coimbatore', email: 'gandhipuram@thoughtflows.in', manager: 'Sindhu S', pass: 'Gandhipuram@123' },
  { name: 'Saravanampatti', code: 'CBE-SVM', city: 'Coimbatore', email: 'saravanampatti@thoughtflows.in', manager: 'Gayathri B', pass: 'Saravanampatti@123' },
  { name: 'Hopes', code: 'CBE-HPS', city: 'Coimbatore', email: 'hopes@thoughtflows.in', manager: 'Sruthi G', pass: 'Hopes@123' },
  { name: 'Salem', code: 'TND-SLM', city: 'Salem', email: 'salem@thoughtflows.in', manager: 'Salem Manager', pass: 'Salem@123' },
  { name: 'Kochi', code: 'KER-KOC', city: 'Kochi', email: 'kochi@thoughtflows.in', manager: 'Kochi Manager', pass: 'Kochi@123' },
  { name: 'Trivandrum', code: 'KER-TRV', city: 'Trivandrum', email: 'trivandrum@thoughtflows.in', manager: 'Trivandrum Manager', pass: 'Trivandrum@123' },
  { name: 'Trichy', code: 'TND-TRY', city: 'Trichy', email: 'trichy@thoughtflows.in', manager: 'Trichy Manager', pass: 'Trichy@123' },
  { name: 'Ameerpet', code: 'HYD-AMP', city: 'Hyderabad', email: 'ameerpet@thoughtflows.in', manager: 'Ameerpet Manager', pass: 'Ameerpet@123' },
  { name: 'Dilsukhnagar', code: 'HYD-DSN', city: 'Hyderabad', email: 'dilsukhnagar@thoughtflows.in', manager: 'Dilsukhnagar Manager', pass: 'Dilsukhnagar@123' },
  { name: 'Madhapur', code: 'HYD-MDP', city: 'Hyderabad', email: 'madhapur@thoughtflows.in', manager: 'Madhapur Manager', pass: 'Madhapur@123' },
  { name: 'Tirupati', code: 'AND-TPT', city: 'Tirupati', email: 'tirupati@thoughtflows.in', manager: 'Tirupati Manager', pass: 'Tirupati@123' },
  { name: 'Vizag', code: 'AND-VZG', city: 'Visakhapatnam', email: 'vizag@thoughtflows.in', manager: 'Vizag Manager', pass: 'Vizag@123' },
  { name: 'Kollapur', code: 'MAH-KLP', city: 'Kolhapur', email: 'kollapur@thoughtflows.in', manager: 'Kollapur Manager', pass: 'Kollapur@123' },
  { name: 'Pune', code: 'MAH-PUN', city: 'Pune', email: 'pune@thoughtflows.in', manager: 'Pune Manager', pass: 'Pune@123' },
  { name: 'Theni', code: 'TND-THN', city: 'Theni', email: 'theni@thoughtflows.in', manager: 'Theni Manager', pass: 'Theni@123' }
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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset inputs when modal opens or initialDepartment changes
  useEffect(() => {
    if (isOpen) {
      const dept = DEPARTMENTS.find(d => d.id === initialDepartment) || DEPARTMENTS[1];
      setActiveDeptId(dept.id);
      if (dept.id === 'leadership') {
        setEmail('leadership@thoughtflows.in');
        setPassword('Leadership@123');
      } else {
        setEmail('');
        setPassword('');
      }
      setShowPassword(false);
      setError('');
    }
  }, [isOpen, initialDepartment]);

  const activeDept = DEPARTMENTS.find(d => d.id === activeDeptId) || DEPARTMENTS[0];

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
                      setEmail('');
                      setPassword('');
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



        {error && (
          <div className="p-2.5 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium">
            {error}
          </div>
        )}



        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="text-left space-y-3.5">

          <div>
            <label className="block text-[11px] font-extrabold tracking-wider text-[#00695c] uppercase mb-1">
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email address"
              autoComplete="off"
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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className={`w-full px-3.5 py-2.5 pr-10 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all ${
                  isClay
                    ? 'clay-input'
                    : 'bg-[#f8fafc] border border-slate-200 rounded-xl focus:border-[#00897b] focus:bg-white font-medium'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
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
