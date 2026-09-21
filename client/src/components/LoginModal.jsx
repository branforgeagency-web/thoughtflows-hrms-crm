import React, { useState, useEffect } from 'react';
import axios from 'axios';

export const TRAINER_PROFILES = [
  {
    trainerId: 'TR-CBG-001',
    name: 'Srithar S',
    email: 'srithar.brandforge@gmail.com',
    password: 'Thoughtflows@2026',
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
    password: 'hr123',
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
    password: 'Thoughtflows@2026',
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
    password: 'cccp123',
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
    password: 'mkt123',
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
    password: 'lead123',
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
    password: 'stu123',
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
    password: 'admin123',
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

    // 2. Client-side authentication using the Admin Registered User Accounts table
    setLoading(false);

    let registeredAccounts = [];
    try {
      const saved = localStorage.getItem('thoughtflows_admin_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          registeredAccounts = parsed;
        }
      }
    } catch (err) {
      console.warn('Error reading thoughtflows_admin_users', err);
    }

    // Find account in registered users table
    const matchedAccount = registeredAccounts.find(
      u => u.email?.trim().toLowerCase() === normalizedEmail
    );

    // Admin & Management authentication (handles admin@thoughtflows.in, admin, or activeDeptId admin)
    if (activeDeptId === 'admin' || normalizedEmail === 'admin@thoughtflows.in' || normalizedEmail === 'admin') {
      const validAdminPasswords = ['admin123', 'Admin@2026', 'Admin@HQ2026'];
      const accountPwd = matchedAccount?.password;
      const isValid = validAdminPasswords.includes(password) || (accountPwd && password === accountPwd);

      if (!isValid) {
        setError('Invalid admin password. Default password is admin123');
        return;
      }

      const adminUser = {
        id: matchedAccount?.id || 'usr_1',
        name: matchedAccount?.name || 'Executive Founders Desk',
        userName: matchedAccount?.name || 'Executive Founders Desk',
        email: 'admin@thoughtflows.in',
        department: 'admin',
        departmentCode: 'ADM',
        departmentName: 'Admin & Management',
        role: 'Super Admin',
        branch: matchedAccount?.branch || 'Thoughtflows Group HQ',
        color: '#4338ca',
        token: 'jwt_tf_admin_token'
      };
      onLoginSuccess(adminUser);
      onClose();
      return;
    }

    // Helper to map account role to target department
    const mapAccountToDept = (account) => {
      const role = (account?.role || '').toLowerCase();
      const dept = (account?.department || '').toLowerCase();

      if (role.includes('trainer') || role.includes('faculty') || dept.includes('faculty') || dept.includes('training')) {
        return {
          department: 'training',
          departmentCode: 'ACAD',
          departmentName: 'Training & Faculty Department',
          color: '#00897b'
        };
      }
      if (role.includes('admin') || dept.includes('admin')) {
        return {
          department: 'admin',
          departmentCode: 'ADM',
          departmentName: 'Admin & Management',
          color: '#4338ca'
        };
      }
      if (role.includes('counsel') || dept.includes('admission') || dept === 'hr') {
        return {
          department: 'hr',
          departmentCode: 'HR',
          departmentName: 'HR & Counseling',
          color: '#ea580c'
        };
      }
      if (role.includes('placement') || dept.includes('placement') || dept.includes('cccp')) {
        return {
          department: 'cccp',
          departmentCode: 'CCCP',
          departmentName: 'Corporate Career & Placement Cell (CCCP)',
          color: '#059669'
        };
      }
      if (role.includes('growth') || role.includes('marketing') || dept.includes('marketing')) {
        return {
          department: 'marketing',
          departmentCode: 'MKT',
          departmentName: 'Growth & Digital Marketing',
          color: '#9333ea'
        };
      }
      if (role.includes('regional') || role.includes('operations') || role.includes('leadership') || dept.includes('leadership')) {
        return {
          department: 'leadership',
          departmentCode: 'LEAD',
          departmentName: 'Leadership Hub',
          color: '#ea580c'
        };
      }
      if (role.includes('student') || role.includes('scholar') || dept.includes('student')) {
        return {
          department: 'student',
          departmentCode: 'STU',
          departmentName: 'Student Learning & Exam Portal',
          color: '#0d9488'
        };
      }
      return null;
    };

    // If not found in localStorage, check built-in department default credentials
    if (!matchedAccount) {
      const matchedDept = DEPARTMENTS.find(d => d.email.toLowerCase() === normalizedEmail) ||
        (normalizedEmail === activeDept.email.toLowerCase() ? activeDept : null);

      if (matchedDept) {
        const isPwdValid = (
          password === matchedDept.password || 
          password === 'Thoughtflows@2026' || 
          password === 'admin123' ||
          password === '123456'
        );
        if (!isPwdValid) {
          setError(`Invalid password for ${matchedDept.title}. Default password is ${matchedDept.password}`);
          return;
        }

        const deptUser = {
          id: matchedDept.trainerId || matchedDept.studentId || `usr_${matchedDept.id}_${Date.now()}`,
          trainerId: matchedDept.trainerId,
          studentId: matchedDept.studentId,
          name: matchedDept.staffName,
          userName: matchedDept.staffName,
          email: matchedDept.email,
          department: matchedDept.id,
          departmentCode: matchedDept.code,
          departmentName: matchedDept.title,
          role: matchedDept.roleName,
          branch: matchedDept.branch,
          color: matchedDept.color,
          courseKey: 'CPC',
          expertCourse: 'CPC — Certified Professional Coder',
          shift: matchedDept.shift || '9:00 AM – 6:00 PM',
          token: `jwt_tf_${matchedDept.id}_token`
        };
        onLoginSuccess(deptUser);
        onClose();
        return;
      }

      setError('Access denied. This account is not registered in Academy User Accounts.');
      return;
    }

    // Verify password
    const expectedPassword = matchedAccount.password || 'Thoughtflows@2026';
    if (password !== expectedPassword) {
      setError('Invalid password. Please check your credentials and try again.');
      return;
    }

    const deptMapping = mapAccountToDept(matchedAccount) || {
      department: activeDept.id,
      departmentCode: activeDept.code,
      departmentName: activeDept.title,
      color: activeDept.color
    };

    const authenticatedUser = {
      id: matchedAccount.id || `usr_${Date.now()}`,
      name: matchedAccount.name,
      userName: matchedAccount.name,
      email: matchedAccount.email,
      department: deptMapping.department,
      departmentCode: deptMapping.departmentCode,
      departmentName: deptMapping.departmentName,
      role: matchedAccount.role || activeDept.roleName,
      branch: matchedAccount.branch || activeDept.branch,
      color: deptMapping.color,
      courseKey: matchedAccount.courseKey || 'CPC',
      expertCourse: matchedAccount.expertCourse || 'CPC — Certified Professional Coder',
      shift: matchedAccount.shift || '6:00 AM – 2:00 PM',
      token: `jwt_tf_${matchedAccount.id || 'usr'}_mock`
    };
    onLoginSuccess(authenticatedUser);
    onClose();
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
                      setEmail(dept.email);
                      setPassword(dept.password);
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-extrabold tracking-wider text-[#00695c] uppercase">
                EMAIL ADDRESS
              </label>
              <button
                type="button"
                onClick={() => {
                  setEmail(activeDept.email);
                  setPassword(activeDept.password);
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
              placeholder={activeDeptId === 'admin' ? 'Enter admin password (e.g. admin123)' : 'Enter your password'}
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
