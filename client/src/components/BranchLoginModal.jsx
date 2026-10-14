import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Building2, 
  Lock, 
  Eye, 
  EyeOff, 
  KeyRound, 
  CheckCircle2, 
  AlertTriangle, 
  X,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

// Master mapping of standard branch login credentials for easy reference & quick fill
export const BRANCH_CREDENTIALS_MAP = {
  'gandhipuram': { email: 'gandhipuram@thoughtflows.in', pass: 'Gandhipuram@123', manager: 'Sindhu S', code: 'CBE-GPM' },
  'saravanampatti': { email: 'saravanampatti@thoughtflows.in', pass: 'Saravanampatti@123', manager: 'Gayathri B', code: 'CBE-SVM' },
  'hopes': { email: 'hopes@thoughtflows.in', pass: 'Hopes@123', manager: 'Sruthi G', code: 'CBE-HPS' },
  'salem': { email: 'salem@thoughtflows.in', pass: 'Salem@123', manager: 'Salem Manager', code: 'TND-SLM' },
  'tiruppur': { email: 'tiruppur@thoughtflows.in', pass: 'Tiruppur@123', manager: 'Tiruppur Manager', code: 'CBE-TPR' },
  'erode': { email: 'erode@thoughtflows.in', pass: 'Erode@123', manager: 'Erode Manager', code: 'CBE-ERD' },
  'karur': { email: 'karur@thoughtflows.in', pass: 'Karur@123', manager: 'Karur Manager', code: 'CBE-KRR' },
  'kochi': { email: 'kochi@thoughtflows.in', pass: 'Kochi@123', manager: 'Kochi Manager', code: 'KER-KOC' },
  'trivandrum': { email: 'trivandrum@thoughtflows.in', pass: 'Trivandrum@123', manager: 'Trivandrum Manager', code: 'KER-TRV' },
  'ameerpet': { email: 'ameerpet@thoughtflows.in', pass: 'Ameerpet@123', manager: 'Ameerpet Manager', code: 'HYD-AMP' },
  'dilsukhnagar': { email: 'dilsukhnagar@thoughtflows.in', pass: 'Dilsukhnagar@123', manager: 'Dilsukhnagar Manager', code: 'HYD-DSN' },
  'vijayawada': { email: 'vijayawada@thoughtflows.in', pass: 'Vijayawada@123', manager: 'Vijayawada Manager', code: 'AND-VJA' },
  'vizag': { email: 'vizag@thoughtflows.in', pass: 'Vizag@123', manager: 'Vizag Manager', code: 'AND-VZG' },
  'trichy': { email: 'trichy@thoughtflows.in', pass: 'Trichy@123', manager: 'Trichy Manager', code: 'TND-TRY' },
  'tirupati': { email: 'tirupati@thoughtflows.in', pass: 'Tirupati@123', manager: 'Tirupati Manager', code: 'AND-TPT' },
  'kollapur': { email: 'kollapur@thoughtflows.in', pass: 'Kollapur@123', manager: 'Kollapur Manager', code: 'MAH-KLP' },
  'pune': { email: 'pune@thoughtflows.in', pass: 'Pune@123', manager: 'Pune Manager', code: 'MAH-PUN' },
  'theni': { email: 'theni@thoughtflows.in', pass: 'Theni@123', manager: 'Theni Manager', code: 'TND-THN' }
};

export function getBranchCredentials(branch) {
  if (!branch) return null;
  const name = String(branch.name || '').trim();
  const rawKey = name.replace(/^(cbe|tnd|ker|hyd|and|mah)-?/i, '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const codeKey = String(branch.code || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  if (BRANCH_CREDENTIALS_MAP[rawKey]) {
    return { ...BRANCH_CREDENTIALS_MAP[rawKey], branchName: name };
  }

  // Check aliases or partial match
  for (const [k, v] of Object.entries(BRANCH_CREDENTIALS_MAP)) {
    if (rawKey.includes(k) || k.includes(rawKey) || codeKey.includes(v.code.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
      return { ...v, branchName: name };
    }
  }

  // Fallback pattern
  const cap = rawKey.charAt(0).toUpperCase() + rawKey.slice(1);
  return {
    email: `${rawKey || 'branch'}@thoughtflows.in`,
    pass: `${cap || 'Branch'}@123`,
    manager: `${name} Manager`,
    code: branch.code || 'BRN',
    branchName: name
  };
}

export default function BranchLoginModal({
  isOpen,
  branch,
  onClose,
  onSuccess,
  currentUser = null
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const credentials = getBranchCredentials(branch);

  useEffect(() => {
    if (isOpen && branch) {
      const creds = getBranchCredentials(branch);
      setEmail(creds?.email || '');
      setPassword('');
      setShowPassword(false);
      setError('');
    }
  }, [isOpen, branch]);

  if (!isOpen || !branch) return null;

  const branchDisplayName = branch.name || 'Campus';
  const branchCity = branch.city || '';
  const branchState = branch.state || '';
  const branchCode = branch.code || credentials?.code || 'BRN';

  const handleQuickFill = () => {
    if (credentials) {
      setEmail(credentials.email);
      setPassword(credentials.pass);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const normEmail = email.trim().toLowerCase();
    if (!normEmail) {
      setError('Please enter a branch manager email.');
      return;
    }
    if (!password) {
      setError('Please enter the password for this branch.');
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post('/api/auth/login', {
        email: normEmail,
        password,
        department: 'leadership'
      });

      if (res.data?.success && res.data?.user) {
        const authUser = res.data.user;

        // Verify that the authenticated user is authorized for THIS branch
        const userRole = String(authUser.role || '').toLowerCase();
        const isSuperRole = /admin|operational|founder|director|operations/i.test(userRole);

        if (!isSuperRole) {
          const authBranchNorm = String(authUser.branch || authUser.branchName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const targetBranchNorm = String(branch.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const targetCodeNorm = String(branch.code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const authCodeNorm = String(authUser.branchCode || '').toLowerCase().replace(/[^a-z0-9]/g, '');

          const matchesBranch = 
            authBranchNorm.includes(targetBranchNorm) || 
            targetBranchNorm.includes(authBranchNorm) ||
            (targetCodeNorm && authCodeNorm && targetCodeNorm === authCodeNorm);

          if (!matchesBranch) {
            setLoading(false);
            setError(`Access Denied: These credentials belong to ${authUser.branch || 'another branch'}. Please enter credentials for ${branchDisplayName}.`);
            return;
          }
        }

        setLoading(false);
        onSuccess(authUser, branch);
        return;
      }

      setLoading(false);
      setError(res.data?.message || 'Invalid credentials for this branch.');
    } catch (err) {
      setLoading(false);
      const msg = err.response?.data?.message || 'Authentication failed. Please verify branch email and password.';
      setError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden text-left animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Gradient Header */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white/90 hover:text-white transition-colors cursor-pointer"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold text-white mb-2">
            <Lock className="w-3 h-3 text-orange-200" />
            <span>CAMPUS SECURITY AUTHENTICATION</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-extrabold text-sm shadow-inner">
              {branchCode}
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight leading-tight">
                {branchDisplayName}
              </h3>
              <p className="text-xs text-orange-100 font-medium">
                {branchCity} {branchState ? `· ${branchState}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          <div className="text-xs text-slate-600 font-medium leading-relaxed">
            Enter login details for <strong className="text-slate-900">{branchDisplayName}</strong> branch to unlock and view its Branch Manager dashboard.
          </div>

          {/* Quick Demo Credentials Pill */}
          {credentials && (
            <div className="p-3 rounded-2xl bg-orange-50/80 border border-orange-200/80 flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5 truncate">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-800 uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
                  Branch Credentials
                </div>
                <div className="font-mono text-[11px] text-slate-700 truncate" title={credentials.email}>
                  {credentials.email}
                </div>
              </div>

              <button
                type="button"
                onClick={handleQuickFill}
                className="px-2.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] transition-all flex items-center gap-1 shadow-2xs whitespace-nowrap cursor-pointer active:scale-95"
                title="Fill credentials automatically"
              >
                <Sparkles className="w-3 h-3 text-amber-200" />
                Quick Fill
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-fadeIn font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-extrabold tracking-wider text-slate-600 uppercase mb-1">
                Branch Manager Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. branch@thoughtflows.in"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold tracking-wider text-slate-600 uppercase mb-1">
                Branch Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter branch password"
                  required
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <span>Verifying...</span>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Unlock Dashboard →</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
