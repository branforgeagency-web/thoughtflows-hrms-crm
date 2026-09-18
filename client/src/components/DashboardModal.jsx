import React, { useEffect, useState } from 'react';
import { 
  X, 
  TrendingUp, 
  Users, 
  MapPin, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  DollarSign, 
  Award, 
  Activity,
  GraduationCap,
  PenTool,
  Volume2,
  BookOpen,
  Crown,
  Shield,
  Briefcase,
  PhoneCall,
  Calendar,
  LogOut,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';

import HrDepartmentDashboard from './HrDepartmentDashboard';
import StudentPortalDashboard from './StudentPortalDashboard';
import AdminManagementDashboard from './AdminManagementDashboard';
import TrainingDepartmentDashboard from './TrainingDepartmentDashboard';
import CccpDashboard from './CccpDashboard';
import MarketingDepartmentDashboard from './MarketingDepartmentDashboard';
import LeadershipHubDashboard from './LeadershipHubDashboard';

export default function DashboardModal({ 
  isOpen, 
  onClose, 
  selectedDashboard, 
  currentUser,
  onSwitchDepartment,
  onSignOut,
  theme = 'clay'
}) {
  const isClay = theme === 'clay';
  const [branches, setBranches] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [activeTab, setActiveTab] = useState('dept-view');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setActiveTab('dept-view');
    Promise.all([
      axios.get('/api/branches'),
      axios.get('/api/leads/pipeline')
    ]).then(([branchesRes, pipelineRes]) => {
      setBranches(branchesRes.data || []);
      setPipeline(pipelineRes.data?.stages || []);
      setLoading(false);
    }).catch(err => {
      console.warn('Dashboard data fetch error', err);
      setLoading(false);
    });
  }, [isOpen, selectedDashboard]);

  let userDept = currentUser?.department;
  if (!userDept || userDept === 'Medical Coding Faculty') userDept = 'training';

  const deptId = (currentUser && currentUser.department !== 'admin')
    ? userDept
    : (selectedDashboard?.id || userDept || 'hr');

  if (deptId === 'training') {
    return (
      <TrainingDepartmentDashboard
        onClose={onClose}
        currentUser={currentUser}
        onLogout={onSignOut}
        onSwitchDepartment={onSwitchDepartment}
        theme={theme}
      />
    );
  }

  if (deptId === 'hr') {
    return (
      <HrDepartmentDashboard
        onClose={onClose}
        currentUser={currentUser}
        onLogout={onSignOut}
        onSwitchDepartment={onSwitchDepartment}
        theme={theme}
      />
    );
  }

  if (deptId === 'student') {
    return (
      <StudentPortalDashboard
        onClose={onClose}
        currentUser={currentUser}
        onLogout={onSignOut || onSwitchDepartment}
        onSwitchDepartment={onSwitchDepartment}
        theme={theme}
      />
    );
  }

  if (deptId === 'admin') {
    return (
      <AdminManagementDashboard
        onClose={onClose}
        currentUser={currentUser}
        onLogout={onSignOut}
        onSwitchDepartment={onSwitchDepartment}
        theme={theme}
      />
    );
  }

  if (deptId === 'cccp') {
    return (
      <CccpDashboard
        onClose={onClose}
        currentUser={currentUser}
        onLogout={onSignOut}
        onSwitchDepartment={onSwitchDepartment}
        theme={theme}
      />
    );
  }

  if (deptId === 'marketing') {
    return (
      <MarketingDepartmentDashboard
        onClose={onClose}
        currentUser={currentUser}
        onLogout={onSignOut}
        onSwitchDepartment={onSwitchDepartment}
        theme={theme}
      />
    );
  }

  if (deptId === 'leadership') {
    return (
      <LeadershipHubDashboard
        onClose={onClose}
        currentUser={currentUser}
      />
    );
  }

  // Department-specific render helpers
  const renderDepartmentContent = () => {
    switch(deptId) {
      case 'hr':
        return (
          <div className="space-y-6">
            {/* HR Header */}
            <div className="bg-gradient-to-r from-rose-950/60 to-slate-900/60 p-4 rounded-xl border border-rose-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
                  HR & Admissions Command
                </span>
                <h3 className="text-base font-bold text-white mt-1">Lead Conversion & Academic Counselling Funnel</h3>
                <p className="text-xs text-rose-200/70">Tracking inbound student enquiries, daily counsellor calls & enrolments across 12 branches.</p>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-xl font-bold text-rose-400">487</div>
                <div className="text-[10px] text-slate-300">Active Leads Today</div>
              </div>
            </div>

            {/* Pipeline Stage Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {pipeline.map((stage, idx) => (
                <div key={stage.key} className="p-4 rounded-xl bg-white/[0.04] border border-white/10 hover:border-rose-400/40 transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-rose-300/80 mb-2">
                    <span className="font-mono">STAGE 0{idx + 1}</span>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                  </div>
                  <div className="text-sm font-semibold text-white">{stage.label}</div>
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-end justify-between">
                    <span className="text-xs text-slate-300">Candidates</span>
                    <span className="text-lg font-bold text-rose-300">{stage.count}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Counsellor metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-white/10">
                <div className="text-xs text-slate-400">Daily Tele-Counselor Dials</div>
                <div className="text-xl font-bold text-white mt-1">1,240 calls</div>
                <div className="text-[10px] text-emerald-400 mt-1">▲ 88.4% reach rate</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-white/10">
                <div className="text-xs text-slate-400">Walk-in Campus Visits</div>
                <div className="text-xl font-bold text-rose-300 mt-1">76 visits</div>
                <div className="text-[10px] text-teal-300 mt-1">Across all 12 hubs</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-white/10">
                <div className="text-xs text-slate-400">Conversion from Inquiry to Enroll</div>
                <div className="text-xl font-bold text-white mt-1">32.8%</div>
                <div className="text-[10px] text-emerald-400 mt-1">Top Hub: Chennai Guindy</div>
              </div>
            </div>
          </div>
        );

      case 'training':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-sky-950/60 to-slate-900/60 p-4 rounded-xl border border-sky-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-500/30">
                  Faculty & Training Command
                </span>
                <h3 className="text-base font-bold text-white mt-1">12-Branch Batch Delivery & Mastery Tracking</h3>
                <p className="text-xs text-sky-200/70">AAPC-certified faculty running ICD-10-CM, CPT, and HCPCS medical coding batches.</p>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-xl font-bold text-sky-400">38 Batches</div>
                <div className="text-[10px] text-slate-300">42 Trainers Active</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-sky-500/20">
                <div className="text-xs text-sky-300">Medical Terminology & Anatomy</div>
                <div className="text-2xl font-bold text-white mt-1">100%</div>
                <div className="text-[10px] text-emerald-400 mt-1">Module 1 Baseline</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-sky-500/20">
                <div className="text-xs text-sky-300">ICD-10-CM Diagnostics</div>
                <div className="text-2xl font-bold text-sky-300 mt-1">89.4%</div>
                <div className="text-[10px] text-slate-300 mt-1">Average Batch Score</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-sky-500/20">
                <div className="text-xs text-sky-300">CPT-4 Surgical & Modifiers</div>
                <div className="text-2xl font-bold text-white mt-1">84.2%</div>
                <div className="text-[10px] text-slate-300 mt-1">Mock Exam Accuracy</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-sky-500/20">
                <div className="text-xs text-sky-300">HCPCS Level II Supply Codes</div>
                <div className="text-2xl font-bold text-teal-300 mt-1">91.0%</div>
                <div className="text-[10px] text-emerald-400 mt-1">Readiness for CPC</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-6 h-6 text-sky-400" />
                <div>
                  <div className="text-xs font-bold text-white">Daily Faculty Attendance Check</div>
                  <div className="text-[11px] text-sky-200/80">42/42 trainers marked on-duty across all offline classrooms & virtual webinars.</div>
                </div>
              </div>
              <span className="text-xs font-bold text-sky-300 bg-sky-500/20 px-3 py-1 rounded-full border border-sky-500/30">100% ACTIVE</span>
            </div>
          </div>
        );

      case 'cccp':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900/60 p-4 rounded-xl border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  CCCP 3-Cell Hub
                </span>
                <h3 className="text-base font-bold text-white mt-1">Placement Cell • Exam Cell • Company Cell</h3>
                <p className="text-xs text-emerald-200/70">Connecting CPC-certified coders with 140+ US Healthcare RCM corporations.</p>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-xl font-bold text-emerald-400">156</div>
                <div className="text-[10px] text-slate-300">Job-Ready Students</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-emerald-500/30">
                <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2">1. Placement Cell</div>
                <div className="text-2xl font-bold text-white">140+</div>
                <p className="text-[11px] text-slate-300 mt-1">US Healthcare RCM Partners (Episource, AGS Health, Omega, Access, CorroHealth)</p>
                <div className="mt-3 pt-2 border-t border-white/5 text-[11px] text-emerald-400">98.4% Placement Record</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-emerald-500/30">
                <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2">2. AAPC Exam Cell</div>
                <div className="text-2xl font-bold text-white">118</div>
                <p className="text-[11px] text-slate-300 mt-1">Students scheduled for AAPC CPC Certification exam this upcoming cycle</p>
                <div className="mt-3 pt-2 border-t border-white/5 text-[11px] text-teal-300">96.8% First-Attempt Pass Rate</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-emerald-500/30">
                <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2">3. College & Company Cell</div>
                <div className="text-2xl font-bold text-white">28 MOUs</div>
                <p className="text-[11px] text-slate-300 mt-1">Active life science & pharmacy college institutional partnership agreements</p>
                <div className="mt-3 pt-2 border-t border-white/5 text-[11px] text-emerald-400">Campus Drives Ongoing</div>
              </div>
            </div>
          </div>
        );

      case 'marketing':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-950/60 to-slate-900/60 p-4 rounded-xl border border-purple-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
                  Growth & Marketing Command
                </span>
                <h3 className="text-base font-bold text-white mt-1">Multi-Channel Lead Sourcing & Performance Marketing</h3>
                <p className="text-xs text-purple-200/70">Meta ads, Google search campaigns, educational webinars & billboard campaigns.</p>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-xl font-bold text-purple-400">₹142</div>
                <div className="text-[10px] text-slate-300">Average Blended CPL</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-purple-500/20">
                <div className="text-xs text-purple-300">Meta (IG / FB) Leads</div>
                <div className="text-xl font-bold text-white mt-1">2,140</div>
                <div className="text-[10px] text-emerald-400 mt-1">₹118 CPL</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-purple-500/20">
                <div className="text-xs text-purple-300">Google Ads (Search)</div>
                <div className="text-xl font-bold text-white mt-1">1,490</div>
                <div className="text-[10px] text-emerald-400 mt-1">High Intent (41% convert)</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-purple-500/20">
                <div className="text-xs text-purple-300">College Seminars</div>
                <div className="text-xl font-bold text-white mt-1">620</div>
                <div className="text-[10px] text-purple-300 mt-1">Life Science grads</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-purple-500/20">
                <div className="text-xs text-purple-300">Organic & Referrals</div>
                <div className="text-xl font-bold text-emerald-300 mt-1">890</div>
                <div className="text-[10px] text-emerald-400 mt-1">₹0 CPL • Word of mouth</div>
              </div>
            </div>
          </div>
        );

      case 'student':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-teal-950/60 to-slate-900/60 p-4 rounded-xl border border-teal-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-500/20 px-2 py-0.5 rounded-full border border-teal-500/30">
                  Student Scholar Portal
                </span>
                <h3 className="text-base font-bold text-white mt-1">Welcome, Pooja J. (Batch TF-CPC-2026-B1)</h3>
                <p className="text-xs text-teal-200/70">Chennai - Anna Nagar Campus • AAPC CPC Fast-Track Certification Track</p>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-xl font-bold text-emerald-400">94.8%</div>
                <div className="text-[10px] text-slate-300">Overall Attendance</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-teal-500/20">
                <div className="text-xs text-teal-300 font-semibold">Syllabus Progress</div>
                <div className="text-2xl font-bold text-white mt-1">86%</div>
                <p className="text-[10px] text-slate-300 mt-1">Anatomy (100%), ICD-10 (92%), CPT (74%)</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-teal-500/20">
                <div className="text-xs text-teal-300 font-semibold">Mock Exam Score (Avg)</div>
                <div className="text-2xl font-bold text-emerald-300 mt-1">88 / 100</div>
                <p className="text-[10px] text-emerald-400 mt-1">AAPC Benchmark: 70% required to pass</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-teal-500/20">
                <div className="text-xs text-teal-300 font-semibold">Placement Status</div>
                <div className="text-2xl font-bold text-teal-300 mt-1">ELIGIBLE</div>
                <p className="text-[10px] text-slate-300 mt-1">Qualified for 4 campus drives next week</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="text-xs font-bold text-white">Upcoming Schedule & Actions</div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-between">
                  <span>📅 Live Doubt Clearing with Dr. Vikram C.</span>
                  <span className="text-teal-300 font-semibold">Today, 4:30 PM</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                  <span>📝 Mock Examination #4 (100 Questions)</span>
                  <span className="text-slate-300">Saturday, 10:00 AM</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'admin':
      default:
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-950/60 to-slate-900/60 p-4 rounded-xl border border-indigo-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Admin & Management Desk
                </span>
                <h3 className="text-base font-bold text-white mt-1">Enterprise Command Bridge & Executive Security</h3>
                <p className="text-xs text-indigo-200/70">Full visibility over all 7 departments, 12 branches, and 3,970 active students.</p>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-xl font-bold text-indigo-400">280+ Staff</div>
                <div className="text-[10px] text-slate-300">12 Hubs Connected</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-indigo-500/20">
                <div className="text-xs text-indigo-300">Active Students</div>
                <div className="text-2xl font-bold text-white mt-1">3,970</div>
                <div className="text-[10px] text-emerald-400 mt-1">+14.2% MTD</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-indigo-500/20">
                <div className="text-xs text-indigo-300">Placement Rate</div>
                <div className="text-2xl font-bold text-indigo-300 mt-1">98.4%</div>
                <div className="text-[10px] text-teal-300 mt-1">140+ Corporate Partners</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-indigo-500/20">
                <div className="text-xs text-indigo-300">Department Portals</div>
                <div className="text-2xl font-bold text-white mt-1">7 Active</div>
                <div className="text-[10px] text-emerald-400 mt-1">Dedicated Logins Enabled</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-indigo-500/20">
                <div className="text-xs text-indigo-300">Network Hubs</div>
                <div className="text-2xl font-bold text-indigo-300 mt-1">12 Centers</div>
                <div className="text-[10px] text-slate-300 mt-1">South India Network</div>
              </div>
            </div>

            {/* Quick Department Portals Status */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="text-xs font-bold text-white mb-2">Department Portals Status</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <span className="p-2 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20">● HR Portal: Live</span>
                <span className="p-2 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/20">● Training: Live</span>
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">● CCCP: Live</span>
                <span className="p-2 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">● Marketing: Live</span>
                <span className="p-2 rounded-lg bg-orange-500/10 text-orange-300 border border-orange-500/20">● Leadership: Live</span>
                <span className="p-2 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20">● Student Portal: Live</span>
                <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">● Admin: Master</span>
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">● MongoDB: Synced</span>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md transition-all animate-fadeIn">
      <div className={`relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-[#073c3b]/95 border border-teal-400/30 overflow-hidden text-white transition-all ${
        isClay
          ? 'rounded-[32px] shadow-[24px_36px_70px_rgba(0,0,0,0.55),inset_2px_2px_4px_rgba(255,255,255,0.22),inset_-3px_-3px_6px_rgba(0,0,0,0.4)]'
          : 'rounded-2xl shadow-2xl shadow-black/80'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-teal-400/20 bg-teal-950/60">
          <div className="flex items-center gap-3">
            <div className={`px-2.5 py-1 rounded-xl shadow-sm border border-white/60 ${isClay ? 'clay-card' : 'bg-white'}`}>
              <img src="/thoughtflows-logo.png" alt="Thoughtflows" className="h-6 w-auto object-contain" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {selectedDashboard ? selectedDashboard.title : 'Thoughtflows Department Operations'}
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                  isClay 
                    ? 'clay-pill bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {selectedDashboard?.status ? selectedDashboard.status : 'ACTIVE'}
                </span>
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-teal-200/70">
                  {selectedDashboard ? selectedDashboard.description : 'Dedicated Departmental Portal & Workflow Control'}
                </p>
                {currentUser && (
                  <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/20 px-2 py-0.2 rounded border border-amber-500/30 hidden sm:inline-block">
                    Auth: {currentUser.name} ({currentUser.role})
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Logout Button */}
            <button
              onClick={() => {
                if (onSignOut) {
                  onSignOut();
                } else if (onClose) {
                  onClose();
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                isClay
                  ? 'clay-btn clay-btn-danger text-rose-100 hover:text-white'
                  : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 hover:text-white border border-rose-500/30'
              }`}
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-teal-500/20 px-6 gap-2 bg-teal-950/30 text-xs">
          <button
            onClick={() => setActiveTab('dept-view')}
            className={`py-3 px-4 font-semibold border-b-2 transition-all ${
              activeTab === 'dept-view'
                ? 'border-teal-400 text-teal-200 bg-teal-500/10'
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            {selectedDashboard ? `${selectedDashboard.title} Operational View` : 'Department Workspace'}
          </button>
          <button
            onClick={() => setActiveTab('branches')}
            className={`py-3 px-4 font-semibold border-b-2 transition-all ${
              activeTab === 'branches'
                ? 'border-teal-400 text-teal-200 bg-teal-500/10'
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            12 Branch Network & Capacity
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-16 text-center text-teal-300">Loading department live operational data...</div>
          ) : activeTab === 'dept-view' ? (
            renderDepartmentContent()
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {branches.map((b) => (
                <div
                  key={b.id || b.name}
                  className={`p-4 rounded-2xl transition-all ${
                    isClay
                      ? 'bg-white/[0.05] border border-white/10 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.15),inset_-2px_-2px_4px_rgba(0,0,0,0.25)] hover:border-teal-400/40'
                      : 'bg-white/[0.03] border border-white/10 hover:border-teal-400/30'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-white">{b.name}</h4>
                      <p className="text-[10px] text-teal-200/70">{b.city}, {b.state}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/5 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Students</span>
                      <strong className="text-teal-300">{b.activeStudents}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Staff</span>
                      <strong className="text-white">{b.staffCount}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-teal-500/20 bg-teal-950/60 flex items-center justify-between text-xs text-teal-200/70">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Authenticated Scope: <strong>{selectedDashboard?.title || 'Department'}</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className={`px-5 py-2 text-xs font-bold text-white transition-all ${
                isClay
                  ? 'clay-btn clay-btn-primary'
                  : 'rounded-lg bg-teal-600 hover:bg-teal-500'
              }`}
            >
              Close Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
