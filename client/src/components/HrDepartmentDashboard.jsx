import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Bell, 
  Coffee, 
  LogOut, 
  Phone, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Award,
  TrendingUp,
  Home,
  Filter,
  Monitor,
  GraduationCap,
  Target,
  BarChart2,
  BookOpen,
  IndianRupee,
  Repeat,
  ChevronLeft,
  ChevronRight,
  Palette,
  RefreshCw,
  PhoneCall
} from 'lucide-react';
import HrPipelineView from './HrPipelineView';
import HrFollowUpBoard from './HrFollowUpBoard';
import HrDemoDesk from './HrDemoDesk';
import HrAdmittedStudentsCrm from './HrAdmittedStudentsCrm';
import HrMyTargets from './HrMyTargets';
import HrMySchedule from './HrMySchedule';
import HrLmsSection from './HrLmsSection';
import HrStudentFeesCrm from './HrStudentFeesCrm';
import HrHandoverDesk from './HrHandoverDesk';
import HrReportsView from './HrReportsView';
import HrCallRecordingsTable from './HrCallRecordingsTable';
import LeadCallModal from './LeadCallModal';
import BookNewDemoModal from './BookNewDemoModal';
import AddLeadModal from './AddLeadModal';
import { getStudents, getLeads, createLead, updateLead, getDemos, createDemo, onDataUpdate } from '../services/api';
import { redirectToWhatsAppWeb } from '../utils/whatsapp';

export default function HrDepartmentDashboard({ onClose, currentUser, onLogout, onSwitchDepartment, theme = 'classic' }) {
  // Persist active tab across browser refresh
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem('thoughtflows_hr_active_tab') || 'Home';
    } catch {
      return 'Home';
    }
  });

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    try {
      localStorage.setItem('thoughtflows_hr_active_tab', tabName);
    } catch (e) {
      console.warn('Could not save active tab to localStorage', e);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [closureSubmitted, setClosureSubmitted] = useState(false);
  const [dashMenuOpen, setDashMenuOpen] = useState(false);
  const [barTheme, setBarTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('thoughtflows_hr_theme');
      return saved && saved !== 'clay' ? saved : 'turquoise';
    } catch {
      return 'turquoise';
    }
  }); // 'turquoise' | 'slate' | 'teal' | 'light'

  const handleCycleTheme = () => {
    setBarTheme(prev => {
      const next = prev === 'turquoise' ? 'slate' : prev === 'slate' ? 'teal' : prev === 'teal' ? 'light' : 'turquoise';
      try {
        localStorage.setItem('thoughtflows_hr_theme', next);
      } catch (e) {
        console.warn('Failed to save theme to localStorage', e);
      }
      return next;
    });
  };
  const [selectedCallLead, setSelectedCallLead] = useState(null);
  const [showBookDemoModal, setShowBookDemoModal] = useState(false);
  const [bookDemoInitialData, setBookDemoInitialData] = useState(null);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [studentLogin, setStudentLogin] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Real database states
  const [students, setStudents] = useState([]);
  const [leads, setLeads] = useState([]);
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Elevated user check (Admin / Super Admin / Leadership can toggle All vs My Leads)
  const isElevatedUser = currentUser?.role === 'Super Admin' ||
    currentUser?.role === 'Admin' ||
    currentUser?.department === 'admin' ||
    currentUser?.department === 'leadership';

  const [scopeMode, setScopeMode] = useState('mine'); // 'mine' | 'all'

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      const counselorFilter = currentUser?.name?.trim();
      const shouldFilterOnServer = counselorFilter && (!isElevatedUser || scopeMode === 'mine');
      const [stRes, ldRes, dmRes] = await Promise.all([
        getStudents(shouldFilterOnServer ? { hrName: counselorFilter } : undefined),
        getLeads(shouldFilterOnServer ? { counselor: counselorFilter } : undefined),
        getDemos()
      ]);
      setStudents(Array.isArray(stRes) ? stRes : []);
      setLeads(ldRes?.leads || []);
      setDemos(Array.isArray(dmRes) ? dmRes : []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching HR CRM live data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const unsub = onDataUpdate((entity) => {
      if (entity === 'leads' || entity === 'students' || entity === 'demos') {
        loadAllData();
      }
    });
    return unsub;
  }, [scopeMode, currentUser?.name]);

  const handleAddLeadSubmit = async (leadData) => {
    try {
      const payload = {
        ...leadData,
        fullName: leadData.fullName || leadData.name,
        counselorAssigned: currentUser?.name || 'Kavitha N.'
      };
      const created = await createLead(payload);
      setLeads(prev => [created, ...prev]);
      setShowAddLeadModal(false);
      if (created.studentLogin?.password) setStudentLogin({ name: created.fullName, phone: created.phone, ...created.studentLogin });
      showToast(created.studentLogin?.existing ? `✓ Added lead: ${created.fullName} (login already exists for this email)` : `✓ Added real lead: ${created.fullName}`);
    } catch (err) {
      console.error('Failed to create lead:', err);
      showToast('Error saving lead to database');
    }
  };

  const handleBookDemoSubmit = async (demoData) => {
    try {
      const created = await createDemo(demoData);
      setDemos(prev => [created, ...prev]);
      setShowBookDemoModal(false);
      if (created.notificationSent) {
        showToast(`✓ Booked demo for ${created.candidateName}! Notification sent to ${created.trainer}`);
      } else {
        showToast(`✓ Booked demo for ${created.candidateName}. Notification not sent: ${created.notificationBlockReason || 'Conditions not met'}`);
      }
    } catch (err) {
      console.error('Failed to book demo:', err);
      showToast('Error saving demo to database');
    }
  };

  const userName = currentUser?.name || 'Kavitha N.';
  const userFirstName = userName.split(' ')[0] || 'Kavitha';
  const branchName = currentUser?.branch || 'Saravanampatti Branch (CBE)';

  // Counselor Scoping: Strictly filter leads, students, and demos for the logged-in counselor
  const scopedLeads = useMemo(() => {
    if (scopeMode === 'all' && isElevatedUser) return leads;
    const target = (currentUser?.name || '').trim().toLowerCase();
    if (!target) return leads;
    return leads.filter(l => {
      const assigned = (l.counselorAssigned || l.allocatedTo || '').trim().toLowerCase();
      return assigned === target || assigned.includes(target) || target.includes(assigned);
    });
  }, [leads, scopeMode, isElevatedUser, currentUser?.name]);

  const scopedStudents = useMemo(() => {
    if (scopeMode === 'all' && isElevatedUser) return students;
    const target = (currentUser?.name || '').trim().toLowerCase();
    if (!target) return students;
    return students.filter(s => {
      const hr = (s.hrName || '').trim().toLowerCase();
      return hr === target || hr.includes(target) || target.includes(hr);
    });
  }, [students, scopeMode, isElevatedUser, currentUser?.name]);

  const scopedDemos = useMemo(() => {
    if (scopeMode === 'all' && isElevatedUser) return demos;
    const target = (currentUser?.name || '').trim().toLowerCase();
    const leadPhones = new Set(
      scopedLeads.map(l => (l.phone || '').replace(/\D/g, '').slice(-10)).filter(Boolean)
    );
    return demos.filter(d => {
      const ph = (d.phone || '').replace(/\D/g, '').slice(-10);
      const isLeadCandidate = leadPhones.has(ph);
      const isTrainerOrCounselor = target && (
        (d.counselor || '').toLowerCase().includes(target) ||
        (d.bookedBy || '').toLowerCase().includes(target)
      );
      return isLeadCandidate || isTrainerOrCounselor;
    });
  }, [demos, scopedLeads, scopeMode, isElevatedUser, currentUser?.name]);

  // End of day numbers (real calculations from scoped data)
  const closureMetrics = useMemo(() => {
    const admittedCount = scopedStudents.length;
    const demosCount = scopedDemos.length;
    const pendingCount = scopedLeads.filter(l => l.stage !== 'admitted' && l.stage !== 'closed').length;
    return {
      callsMade: scopedLeads.reduce((acc, l) => acc + (l.callCount || 0), 0),
      connected: scopedLeads.filter(l => l.stage !== 'new').length,
      demosBooked: demosCount,
      admissions: admittedCount,
      feesCollected: `₹${(admittedCount * 21000).toLocaleString('en-IN')}`,
      pendingFus: pendingCount
    };
  }, [scopedStudents, scopedDemos, scopedLeads]);

  // Dynamic Navigation Tabs with real database counts
  const NAV_TABS = useMemo(() => {
    const pipelineCount = scopedLeads.length.toString();
    const followUpCount = scopedLeads.filter(l => l.stage !== 'admitted' && l.stage !== 'closed').length.toString();
    const admittedCount = scopedStudents.length.toString();
    const handoverCount = scopedStudents.filter(s => s.handoverStatus !== 'Sent').length.toString();

    return [
      { name: 'Home', badge: null, icon: Home, iconBg: 'bg-[#0e6977]', color: 'teal' },
      { name: 'Pipeline & Follow-ups', badge: pipelineCount, icon: Filter, iconBg: 'bg-[#7c3aed]', badgeBg: 'bg-rose-500', color: 'purple' },
      { name: 'Demo Desk', badge: scopedDemos.length > 0 ? scopedDemos.length.toString() : null, icon: Monitor, iconBg: 'bg-cyan-600', color: 'cyan' },
      { name: 'Admitted Students', badge: admittedCount, icon: GraduationCap, iconBg: 'bg-emerald-600', badgeBg: 'bg-emerald-500', color: 'emerald' },
      { name: 'Call Recordings', badge: null, icon: PhoneCall, iconBg: 'bg-[#0e6977]', color: 'teal' },
      { name: 'My Targets', badge: null, icon: Target, iconBg: 'bg-rose-500', color: 'pink' },
      { name: 'Reports', badge: null, icon: BarChart2, iconBg: 'bg-amber-600', color: 'amber' },
      { name: 'My Schedule', badge: null, icon: Calendar, iconBg: 'bg-blue-500', color: 'blue' },
      { name: 'LMS', badge: 'Learn', isPillBadge: true, icon: BookOpen, iconBg: 'bg-yellow-700', color: 'green' },
      { name: 'Fees', badge: null, icon: IndianRupee, iconBg: 'bg-teal-600', color: 'teal' },
      { name: 'Handover', badge: handoverCount, icon: Repeat, iconBg: 'bg-orange-600', badgeBg: 'bg-orange-500', color: 'orange' },
    ];
  }, [scopedLeads, scopedStudents, scopedDemos]);

  // Dynamic Priority Queue from real leads
  const priorityQueue = useMemo(() => {
    if (scopedLeads.length === 0) return [];
    return scopedLeads.slice(0, 6).map((lead, idx) => {
      const isNow = idx === 0 || lead.followUpTime === 'NOW';
      let actionText = 'CALL NOW';
      let actionStyle = 'bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-extrabold';
      if (lead.stage === 'demo_booked') {
        actionText = 'DEMO TODAY';
        actionStyle = 'bg-purple-50 text-purple-700 border border-purple-200 font-bold';
      } else if (lead.stage === 'demo_attended' || lead.stage === 'fee_followup') {
        actionText = 'FEE PITCH';
        actionStyle = 'bg-amber-50 text-amber-800 border border-amber-200 font-bold';
      }
      return {
        id: lead._id || lead.id,
        time: lead.followUpTime || (idx === 0 ? 'NOW' : `${10 + idx}:00`),
        isNow,
        name: `${lead.fullName || lead.name} — ${lead.stage === 'new' ? 'First Call' : lead.stage.replace('_', ' ').toUpperCase()}`,
        details: `${lead.sourceName || lead.source || 'Direct'} • ${lead.category || 'Candidate'} • ${lead.gender?.[0] || 'F'} • ${lead.location || 'Coimbatore'}`,
        leadData: lead,
        actionText,
        actionStyle
      };
    });
  }, [scopedLeads]);

  // Dynamic Real Activity Feed
  const recentActivities = useMemo(() => {
    const list = [];
    scopedStudents.slice(0, 3).forEach((s, idx) => {
      list.push({
        time: `1${5 - idx}:${42 - idx * 10}`,
        primary: `${s.name} enrolled (${s.feeAmount || '₹25,000'})`,
        secondary: `${s.course} • ID: ${s.studentId}`,
        tag: 'ADMITTED',
        tagStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      });
    });
    scopedDemos.slice(0, 2).forEach((d, idx) => {
      list.push({
        time: `1${4 - idx}:${18 - idx * 8}`,
        primary: `${d.candidateName} demo ${d.status}`,
        secondary: `${d.course} with ${d.trainer}`,
        tag: 'DEMO',
        tagStyle: 'bg-blue-50 text-blue-700 border-blue-200'
      });
    });
    scopedLeads.slice(0, 2).forEach((l, idx) => {
      list.push({
        time: `1${2 - idx}:${52 - idx * 7}`,
        primary: `New Lead: ${l.fullName || l.name}`,
        secondary: `${l.sourceName || l.source || 'Direct'} • ${l.category || 'General'}`,
        tag: 'NEW LEAD',
        tagStyle: 'bg-cyan-50 text-cyan-700 border-cyan-200'
      });
    });
    return list;
  }, [scopedStudents, scopedDemos, scopedLeads]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f0faf8] font-sans text-slate-800 animate-fadeIn">
      {/* Top Main Navigation Bar */}
      <header className={`sticky top-0 z-30 transition-colors duration-200 px-4 sm:px-6 lg:px-8 py-2.5 shadow-md flex items-center justify-between gap-3 flex-wrap ${
        barTheme === 'clay'
          ? 'bg-white text-[#073734] border-b border-[#cce8e4] shadow-[0_6px_20px_rgba(7,55,52,0.06),inset_0_2px_4px_rgba(255,255,255,0.95)]'
          : barTheme === 'turquoise'
            ? 'bg-[#73C1CC] text-[#073138] border-b border-[#5cb6c2] shadow-sm'
            : barTheme === 'slate'
              ? 'bg-[#0f172a] text-slate-100 border-b border-slate-800'
              : barTheme === 'teal'
                ? 'bg-gradient-to-r from-[#042f2e] via-[#064e3b] to-[#042f2e] text-white border-b border-teal-800/60'
                : 'bg-white/95 backdrop-blur-md text-slate-800 border-b border-slate-200/90'
      }`}>
        {/* Left: Logo Pill */}
        <div className="flex items-center gap-2.5 sm:gap-3">

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl shadow-xs border ${
            barTheme === 'clay'
              ? 'clay-pill text-[#073734]'
              : barTheme === 'turquoise'
                ? 'bg-white/90 border-white/70 text-[#073138]'
                : barTheme === 'slate'
                  ? 'bg-slate-800/90 border-slate-700/80 text-white'
                  : barTheme === 'teal'
                    ? 'bg-white/15 border-white/20 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <img 
              src="/thoughtflows-logo.png" 
              alt="Thoughtflows" 
              className="h-5 w-auto object-contain bg-white rounded px-1 py-0.5" 
            />
            <span className="text-[11px] font-bold tracking-tight hidden xs:inline">
              Thoughtflows 2.0 <span className={
                barTheme === 'clay'
                  ? 'text-[#0d9488] font-extrabold'
                  : barTheme === 'turquoise' 
                    ? 'text-[#0e6977] font-extrabold' 
                    : barTheme === 'slate' 
                      ? 'text-teal-400' 
                      : barTheme === 'teal' 
                        ? 'text-teal-200' 
                        : 'text-[#00897b]'
              }>• HR</span>
            </span>
          </div>
        </div>

        {/* Center: Search & Add Lead */}
        <div className="flex items-center gap-2 flex-1 max-w-md mx-auto justify-center">
          <div className="relative w-full max-w-xs">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
              barTheme === 'clay' ? 'text-teal-600' : barTheme === 'turquoise' ? 'text-[#1e606a]' : 'text-slate-400'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads, students..."
              className={`w-full rounded-xl pl-8 pr-12 py-1.5 text-xs outline-none transition-all ${
                barTheme === 'clay'
                  ? 'clay-input text-[#073138] placeholder-[#1e606a]/70'
                  : barTheme === 'turquoise'
                    ? 'bg-white/90 border border-white/70 text-[#073138] placeholder-[#1e606a]/70 focus:bg-white focus:border-[#0e6977] shadow-xs'
                    : barTheme === 'slate'
                      ? 'bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-400 focus:border-teal-400 focus:bg-slate-800'
                      : barTheme === 'teal'
                        ? 'bg-white/15 border border-white/20 text-white placeholder-teal-200/70 focus:bg-white/25 focus:border-teal-300'
                        : 'bg-slate-100/90 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-teal-500'
              }`}
            />
            <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono px-1.5 py-0.5 rounded ${
              barTheme === 'clay'
                ? 'clay-pill text-[#073138] font-bold'
                : barTheme === 'turquoise'
                  ? 'bg-[#73C1CC]/25 text-[#073138] font-bold'
                  : barTheme === 'light'
                    ? 'bg-slate-200 text-slate-600'
                    : 'bg-white/10 text-white/80'
            }`}>
              ⌘K
            </span>
          </div>

          <button 
            onClick={() => setShowAddLeadModal(true)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold transition-all flex-shrink-0 active:scale-95 cursor-pointer ${
            barTheme === 'clay'
              ? 'clay-btn clay-btn-primary'
              : barTheme === 'turquoise'
                ? 'rounded-xl bg-[#08363e] hover:bg-[#052329] text-white shadow-sm font-extrabold'
                : barTheme === 'slate'
                  ? 'rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white'
                  : barTheme === 'teal'
                    ? 'rounded-xl bg-white hover:bg-teal-50 text-[#042f2e]'
                    : 'rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white'
          }`}>
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Lead</span>
          </button>

          <button className={`p-2 rounded-xl transition-colors relative flex-shrink-0 ${
            barTheme === 'clay'
              ? 'clay-btn clay-btn-secondary text-[#073734]'
              : barTheme === 'turquoise'
                ? 'border bg-white/90 hover:bg-white border-white/70 text-[#073138] shadow-xs'
                : barTheme === 'slate'
                  ? 'border bg-slate-800/90 hover:bg-slate-700 border-slate-700/80 text-slate-300'
                  : barTheme === 'teal'
                    ? 'border bg-white/15 hover:bg-white/25 border-white/20 text-white'
                    : 'border bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
          }`}>
            <Bell className="w-3.5 h-3.5" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-1.5 right-1.5" />
          </button>
        </div>

        {/* Right: Quick Controls & Session Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">



          {/* Theme Switcher Button */}
          <button
            onClick={handleCycleTheme}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              barTheme === 'clay'
                ? 'clay-btn clay-btn-secondary text-[#0b6b66] border-teal-100'
                : barTheme === 'turquoise'
                  ? 'border bg-white/90 hover:bg-white border-white/70 text-[#073138] shadow-xs'
                  : barTheme === 'slate'
                    ? 'border bg-slate-800/90 hover:bg-slate-700 border-slate-700/80 text-teal-400'
                    : barTheme === 'teal'
                      ? 'border bg-white/15 hover:bg-white/25 border-white/20 text-teal-200'
                      : 'border bg-slate-100 hover:bg-slate-200 border-slate-200 text-teal-700'
            }`}
            title={`Current theme: ${barTheme}. Click to switch theme.`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden xl:inline capitalize">{barTheme} Theme</span>
          </button>

          {/* User Profile */}
          <div className={`flex items-center gap-2.5 px-3 py-1 rounded-xl ${
            barTheme === 'clay'
              ? 'clay-pill text-[#073734]'
              : barTheme === 'turquoise'
                ? 'border bg-white/90 border-white/70 text-[#073138] shadow-xs'
                : barTheme === 'slate'
                  ? 'border bg-slate-800/90 border-slate-700/80 text-slate-100'
                  : barTheme === 'teal'
                    ? 'border bg-white/15 border-white/20 text-white'
                    : 'border bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shadow-xs ${
              barTheme === 'clay'
                ? 'clay-squircle bg-teal-600 text-white'
                : barTheme === 'turquoise'
                  ? 'bg-[#08363e] text-[#73C1CC]'
                  : 'bg-gradient-to-br from-teal-400 to-emerald-600 text-white'
            }`}>
              {userFirstName[0]}
            </div>
            <div className="text-left text-[11px] leading-tight hidden sm:block">
              <div className="font-bold">{userName}</div>
              <div className={`text-[9.5px] uppercase tracking-wider flex items-center gap-1 mt-0.5 ${
                barTheme === 'clay'
                  ? 'text-teal-700 font-semibold'
                  : barTheme === 'turquoise'
                    ? 'text-[#185d68]'
                    : barTheme === 'light'
                      ? 'text-slate-500'
                      : 'text-slate-400'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SARAVANAMPATTI
              </div>
            </div>
          </div>

          {/* Break Button */}
          <button
            onClick={() => setIsOnBreak(!isOnBreak)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isOnBreak 
                ? 'bg-amber-400 border-amber-300 text-amber-950 font-black shadow-xs' 
                : barTheme === 'clay'
                  ? 'clay-btn clay-btn-secondary text-[#073734]'
                  : barTheme === 'turquoise'
                    ? 'border bg-white/90 hover:bg-white border-white/70 text-[#073138] shadow-xs'
                    : barTheme === 'slate'
                      ? 'border bg-slate-800/90 hover:bg-slate-700 border-slate-700/80 text-slate-200'
                      : barTheme === 'teal'
                        ? 'border bg-white/15 hover:bg-white/25 border-white/20 text-white'
                        : 'border bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isOnBreak ? 'On Break' : 'Start Break'}</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout || onClose}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              barTheme === 'clay'
                ? 'clay-btn clay-btn-danger'
                : barTheme === 'turquoise'
                  ? 'border bg-white/90 hover:bg-rose-50 hover:text-rose-600 border-white/70 text-[#073138] shadow-xs'
                  : barTheme === 'slate'
                    ? 'border bg-slate-800/90 hover:bg-rose-900/40 hover:text-rose-300 hover:border-rose-500/40 border-slate-700/80 text-slate-400'
                    : barTheme === 'teal'
                      ? 'border bg-white/15 hover:bg-rose-50 hover:text-white border-white/20 text-white'
                      : 'border bg-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border-slate-200 text-slate-600'
            }`}
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Sub-Header Navigation Tabs Bar */}
      <div className={`border-b px-4 sm:px-6 lg:px-8 py-2 relative z-20 transition-all ${
        barTheme === 'clay'
          ? 'bg-[#f4fcfb] border-teal-100 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9)]'
          : barTheme === 'turquoise'
            ? 'bg-[#f0fafb] border-[#c2e8ee] shadow-xs'
            : barTheme === 'teal'
              ? 'bg-[#f0faf8] border-teal-200/80 shadow-xs'
              : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div className="w-full flex items-center gap-2">
          {/* Scroll Left */}
          <button 
            onClick={() => {
              const el = document.getElementById('hr-nav-tabs-container');
              if (el) el.scrollLeft -= 220;
            }}
            className={`w-7 h-7 flex items-center justify-center text-xs flex-shrink-0 transition-colors ${
              barTheme === 'clay'
                ? 'clay-btn clay-btn-secondary'
                : 'rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800'
            }`}
            title="Scroll Left"
          >
            ◀
          </button>

          {/* Scrollable Tabs */}
          <div 
            id="hr-nav-tabs-container"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none scroll-smooth flex-1 py-0.5"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.name;
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.name}
                  onClick={() => handleTabChange(tab.name)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs transition-all flex-shrink-0 ${
                    isActive
                      ? barTheme === 'clay'
                        ? 'clay-btn clay-btn-primary text-white font-bold'
                        : barTheme === 'turquoise'
                          ? 'bg-[#08363e] text-white font-bold shadow-xs border border-[#08363e]'
                          : barTheme === 'teal'
                            ? 'bg-[#00796b] text-white font-bold shadow-xs border border-[#00695c]'
                            : 'bg-slate-900 text-white font-bold shadow-xs border border-slate-900'
                      : barTheme === 'clay'
                        ? 'clay-btn clay-btn-secondary text-[#073734] hover:text-[#0b6b66] font-semibold'
                        : barTheme === 'turquoise'
                          ? 'bg-white/90 hover:bg-[#e4f5f8] text-slate-700 hover:text-[#08363e] border border-slate-200/70 font-semibold'
                          : 'bg-slate-50/90 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/70 font-semibold'
                  }`}
                >
                  {/* Clean Unified Icon */}
                  {IconComp && (
                    <IconComp className={`w-3.5 h-3.5 ${
                      isActive 
                        ? barTheme === 'clay'
                          ? 'text-teal-200 stroke-[2.4]'
                          : barTheme === 'turquoise'
                            ? 'text-[#73C1CC] stroke-[2.4]'
                            : 'text-teal-400 stroke-[2.4]' 
                        : 'text-slate-400 group-hover:text-slate-600 stroke-[2]'
                    }`} />
                  )}
                  <span>{tab.name}</span>

                  {/* Clean Unified Badge */}
                  {tab.badge && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : tab.isPillBadge
                          ? 'bg-amber-100 text-amber-800'
                          : tab.badgeBg || 'bg-slate-200 text-slate-700'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Scroll Right */}
          <button 
            onClick={() => {
              const el = document.getElementById('hr-nav-tabs-container');
              if (el) el.scrollLeft += 220;
            }}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs flex-shrink-0 transition-colors"
            title="Scroll Right"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {activeTab === 'My Schedule' ? (
          <HrMySchedule isOnBreak={isOnBreak} setIsOnBreak={setIsOnBreak} />
        ) : activeTab === 'My Targets' ? (
          <HrMyTargets students={scopedStudents} currentUser={currentUser} />
        ) : activeTab === 'Admitted Students' ? (
          <HrAdmittedStudentsCrm 
            students={scopedStudents} 
            onRefreshStudents={loadAllData} 
            currentUser={currentUser} 
          />
        ) : activeTab === 'Call Recordings' ? (
          <HrCallRecordingsTable currentUser={currentUser} />
        ) : activeTab === 'Demo Desk' ? (
          <HrDemoDesk 
            demos={scopedDemos} 
            onRefreshDemos={loadAllData} 
            onBookDemoClick={() => setShowBookDemoModal(true)} 
          />
        ) : (activeTab === 'Pipeline & Follow-ups' || activeTab === 'My Pipeline' || activeTab === 'Follow-up Board') ? (
          <HrPipelineView 
            leads={scopedLeads} 
            onRefreshLeads={loadAllData} 
            onAddLeadClick={() => setShowAddLeadModal(true)} 
            initialViewMode={activeTab === 'Follow-up Board' ? 'followup' : 'kanban'}
            currentUser={currentUser}
          />
        ) : activeTab === 'LMS' ? (
          <HrLmsSection currentUser={currentUser} />
        ) : activeTab === 'Fees' ? (
          <HrStudentFeesCrm 
            students={scopedStudents} 
            onRefreshStudents={loadAllData} 
            currentUser={currentUser} 
          />
        ) : activeTab === 'Handover' ? (
          <HrHandoverDesk 
            students={scopedStudents} 
            onRefreshStudents={loadAllData} 
            currentUser={currentUser} 
          />
        ) : activeTab === 'Reports' ? (
          <HrReportsView
            leads={scopedLeads}
            students={scopedStudents}
            demos={scopedDemos}
            currentUser={currentUser}
          />
        ) : activeTab === 'Home' ? (
          <>
        
        {/* Greeting & Quick Context */}
        <div className="text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Good afternoon, <span className="text-[#0e6977]">{userFirstName}</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Mon • 21 May 2026 • {branchName} • You have <strong className="text-slate-800 font-semibold">{closureMetrics.pendingFus} pending follow-ups</strong> in your pipeline
              </p>
            </div>
            {/* Scoping status pill */}
            <div className="flex items-center gap-2">
              {isElevatedUser ? (
                <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-xs text-xs font-bold">
                  <button
                    onClick={() => setScopeMode('mine')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      scopeMode === 'mine' ? 'bg-[#0e6977] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    👤 My Leads ({scopedLeads.length})
                  </button>
                  <button
                    onClick={() => setScopeMode('all')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      scopeMode === 'all' ? 'bg-[#0e6977] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🌐 All Leads ({leads.length})
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>My Workspace: {scopedLeads.length} Leads • {scopedStudents.length} Students</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Golden Target Progress Banner */}
        <div className="bg-gradient-to-r from-[#fff9eb] via-[#fffbeb] to-[#fef3c7] border border-[#fde68a] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-300/60 flex items-center justify-center text-amber-700 flex-shrink-0">
              <Award className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full border border-amber-300/50">
                MONTHLY TARGET • CURRENT CYCLE
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                Target 25 admissions • {scopedStudents.length} closed
              </h3>
              <p className="text-xs text-amber-900/80">
                {scopedStudents.length >= 25 
                  ? `Goal achieved! ${scopedStudents.length - 25} surplus admissions qualify for performance incentive.` 
                  : `${25 - scopedStudents.length} more to hit your target — then each extra admission earns incentive.`}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-64 flex flex-col items-end">
            <div className="flex items-center justify-between w-full text-xs font-extrabold text-slate-800 mb-1">
              <span>{scopedStudents.length} / 25</span>
              <span className="text-amber-700">{Math.min(100, Math.round((scopedStudents.length / 25) * 100))}%</span>
            </div>
            <div className="w-full h-2.5 bg-amber-200/60 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-[#73C1CC] rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.round((scopedStudents.length / 25) * 100))}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-amber-800 mt-1 uppercase tracking-wider">
              FEES COLLECTED: <strong className="text-emerald-700">{closureMetrics.feesCollected}</strong>
            </span>
          </div>
        </div>

        {/* 4 Metric Cards in a Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1 */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#73C1CC]/70 transition-all flex flex-col justify-between text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                CALLS LOGGED
              </span>
              <div className="w-7 h-7 rounded-full bg-[#e6f7f9] text-[#0e6977] flex items-center justify-center">
                <Phone className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{closureMetrics.callsMade}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">{closureMetrics.connected} connected</div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-400/50 transition-all flex flex-col justify-between text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                FOLLOW-UPS DUE
              </span>
              <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-amber-600">{closureMetrics.pendingFus}</div>
            <div className="text-xs text-rose-500 mt-1 font-bold">Active in pipeline</div>
          </div>

          {/* Card 3 */}
          <div 
            onClick={() => {
              setBookDemoInitialData(null);
              setShowBookDemoModal(true);
            }}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#73C1CC]/80 transition-all flex flex-col justify-between text-left cursor-pointer group"
            title="Click to schedule a new demo"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                DEMOS BOOKED
              </span>
              <div className="w-7 h-7 rounded-full bg-[#e6f7f9] text-[#0e6977] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{scopedDemos.length}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">{scopedDemos.filter(d => d.status === 'booked').length} upcoming · {scopedDemos.filter(d => d.status === 'attended').length} attended</div>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#73C1CC]/70 transition-all flex flex-col justify-between text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                ADMISSIONS • LIVE
              </span>
              <div className="w-7 h-7 rounded-full bg-[#e6f7f9] text-[#0e6977] flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0e6977]">{scopedStudents.length}</div>
            <div className="text-xs text-[#0e6977] mt-1 font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Live Enrolled Students
            </div>
          </div>
        </div>

        {/* Two Column Middle Section: Priority Queue & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left: Today's Priority Queue (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between relative">
            
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0e6977] animate-pulse" />
                  <h3 className="text-sm font-bold text-slate-900">Today's Priority Queue</h3>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {closureMetrics.pendingFus} pending in pipeline
                </span>
              </div>

              {/* Queue Items */}
              <div className="space-y-2.5">
                {priorityQueue.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    No urgent calls in queue. Click "+ Add Lead" above to record a new student enquiry.
                  </div>
                ) : (
                  priorityQueue.map((item, idx) => (
                    <div 
                      key={item.id || idx}
                      className="p-3 rounded-xl bg-slate-50/60 hover:bg-[#f0fafb] border border-slate-100 hover:border-[#bde6ed] transition-all flex items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold flex-shrink-0 ${
                          item.isNow 
                            ? 'bg-[#0e6977] text-white' 
                            : 'bg-slate-200/70 text-slate-700'
                        }`}>
                          {item.time}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {item.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            📞 {item.details}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const rawName = item.name.split('—')[0].trim();
                          if (item.actionText.includes('DEMO')) {
                            setBookDemoInitialData({
                              studentName: rawName,
                              mobile: item.leadData?.phone || '+919876500000',
                              course: item.leadData?.course || 'CPC',
                              mode: item.actionText.includes('CLOSE') ? 'Classroom (Saravanampatti)' : 'Online'
                            });
                            setShowBookDemoModal(true);
                          } else {
                            setSelectedCallLead({
                              id: item.leadData?._id || item.leadData?.id,
                              name: rawName,
                              details: item.details,
                              phone: item.leadData?.phone || '',
                              source: item.leadData?.sourceName || 'Direct',
                              stage: item.leadData?.stage,
                              callCount: item.leadData?.callCount || 0,
                              counselorAssigned: item.leadData?.counselorAssigned
                            });
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-[10.5px] tracking-wide flex-shrink-0 transition-all cursor-pointer active:scale-95 ${item.actionStyle}`}
                      >
                        {item.actionText}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Recent Activity (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
                <span className="text-xs text-slate-500 font-medium">Live CRM Feed</span>
              </div>

              {/* Timeline Items */}
              <div className="space-y-3">
                {recentActivities.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No recent activity recorded yet.
                  </div>
                ) : (
                  recentActivities.map((act, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2.5 text-left text-xs">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="text-[11px] font-mono text-slate-400 mt-0.5 flex-shrink-0">
                          {act.time}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 leading-snug truncate">
                            {act.primary}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {act.secondary}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-extrabold flex-shrink-0 uppercase border ${act.tagStyle}`}>
                        {act.tag}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Banner: End-of-Day Closure Card */}
        <div className="bg-[#082228] text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-[#12424b] text-left">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base">🌙</span>
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                  End-of-Day Closure
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Submit your day before logging out. This rolls up to your Branch Manager's Command Center.
              </p>
            </div>
          </div>

          {/* 6 Metric Boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-[#73C1CC]">
                {closureMetrics.callsMade}
              </div>
              <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">
                CALLS MADE
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-[#73C1CC]">
                {closureMetrics.connected}
              </div>
              <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">
                CONNECTED
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-[#73C1CC]">
                {closureMetrics.demosBooked}
              </div>
              <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">
                DEMOS BOOKED
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-[#73C1CC]">
                {closureMetrics.admissions}
              </div>
              <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">
                ADMISSIONS
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-white">
                {closureMetrics.feesCollected}
              </div>
              <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">
                FEES COLLECTED
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-amber-400">
                {closureMetrics.pendingFus}
              </div>
              <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">
                PENDING FUS
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs">
            <div className="text-slate-400 flex items-center gap-1.5">
              <span>✏️</span>
              <span>Tap any number to correct it before submitting.</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setClosureSubmitted(true)}
                disabled={closureSubmitted}
                className="px-4 py-2 rounded-xl bg-[#0e6977] hover:bg-[#0a4f5a] text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-[0.98]"
              >
                <span>{closureSubmitted ? 'Closure Submitted ✓' : "Submit Today's Closure →"}</span>
              </button>
              <span className="text-[11px] text-slate-400">
                Tomorrow's priority: 6 overdue follow-ups + 2 fee-pending students
              </span>
            </div>
          </div>
        </div>
        </>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto text-2xl font-bold">
              📂
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">{activeTab}</h2>
              <p className="text-xs text-slate-500 mt-1">
                This module is integrated with the Central Academic & Counselling Network.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setActiveTab('Pipeline & Follow-ups')}
                className="px-4 py-2 rounded-xl bg-[#7c3aed] text-white text-xs font-bold shadow-xs hover:bg-[#6d28d9] transition-all"
              >
                Open Pipeline & Follow-ups ({scopedLeads.length} Leads)
              </button>
              <button
                onClick={() => setActiveTab('Home')}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Back to Home Dashboard
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Lead Call Modal */}
      <LeadCallModal
        isOpen={Boolean(selectedCallLead)}
        onClose={() => setSelectedCallLead(null)}
        leadData={selectedCallLead}
        currentUser={currentUser}
        onSave={async (data) => {
          const leadId = selectedCallLead?._id || selectedCallLead?.id;
          if (!leadId) {
            showToast('Could not save — this lead has no database record yet.');
            return;
          }
          const update = {
            callCount: (selectedCallLead.callCount || 0) + 1,
            lastCallTime: new Date().toISOString(),
            notes: data.notes || undefined,
            followUpNote: data.notes || undefined,
            followUpDate: data.followUpDate || undefined,
            followUpTime: data.followUpTime || undefined,
            ...(data.leadForm ? {
              fullName: data.leadForm.name,
              name: data.leadForm.name,
              phone: data.leadForm.phone,
              whatsappNumber: data.leadForm.whatsappNumber,
              age: data.leadForm.age,
              gender: data.leadForm.gender,
              education: data.leadForm.education,
              currentRole: data.leadForm.currentRole,
              experienceYrs: data.leadForm.experienceYrs,
              location: data.leadForm.location,
              course: data.leadForm.course,
              budget: data.leadForm.budget,
              batchTiming: data.leadForm.batchTiming,
              decisionStatus: data.leadForm.decisionStatus,
            } : {})
          };
          if (data.stage) update.stage = data.stage;
          // Strip undefined keys so we never overwrite real saved values with nothing
          Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

          const updated = await updateLead(leadId, update);
          setLeads((prev) => prev.map((l) => ((l._id || l.id) === leadId ? updated : l)));
          showToast(`✓ Call outcome saved for ${data.leadForm?.name || selectedCallLead.name} (${data.outcome}, ${Math.round(data.durationSeconds)}s)`);
        }}
      />

      {/* Book New Demo Modal */}
      <BookNewDemoModal
        isOpen={showBookDemoModal}
        onClose={() => setShowBookDemoModal(false)}
        initialData={bookDemoInitialData}
        onConfirm={handleBookDemoSubmit}
      />

      {/* Add New Lead Modal */}
      {studentLogin && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Student login created</h3>
            <p className="text-xs text-slate-500">{studentLogin.name} has been added to Users. Share these dashboard credentials with the student.</p>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1.5 font-mono">
              <div><span className="text-slate-400">Email: </span><span className="font-bold text-slate-900">{studentLogin.email}</span></div>
              <div><span className="text-slate-400">Password: </span><span className="font-bold text-slate-900">{studentLogin.password}</span></div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { try { navigator.clipboard.writeText(`Email: ${studentLogin.email}\nPassword: ${studentLogin.password}`); } catch (_) {} }}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
              >Copy</button>
              <button
                onClick={() => {
                  const text = `Hi ${studentLogin.name}, welcome to Thoughtflows! Your student dashboard login\nEmail: ${studentLogin.email}\nPassword: ${studentLogin.password}`;
                  redirectToWhatsAppWeb(studentLogin.phone, text);
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >Send via WhatsApp</button>
            </div>
            <button onClick={() => setStudentLogin(null)} className="w-full py-2 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold">Done</button>
          </div>
        </div>
      )}

      <AddLeadModal
        isOpen={showAddLeadModal}
        onClose={() => setShowAddLeadModal(false)}
        onAddLead={handleAddLeadSubmit}
      />
    </div>
  );
}
