import React, { useState } from 'react';
import { 
  ArrowLeft, 
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
  ChevronRight
} from 'lucide-react';
import HrPipelineView from './HrPipelineView';
import HrFollowUpBoard from './HrFollowUpBoard';
import HrDemoDesk from './HrDemoDesk';
import HrAdmittedStudentsCrm from './HrAdmittedStudentsCrm';
import HrMyTargets from './HrMyTargets';
import HrMySchedule from './HrMySchedule';

export default function HrDepartmentDashboard({ onClose, currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('My Schedule');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [closureSubmitted, setClosureSubmitted] = useState(false);

  // End of day numbers (interactive)
  const [closureMetrics, setClosureMetrics] = useState({
    callsMade: 48,
    connected: 31,
    demosBooked: 5,
    admissions: 2,
    feesCollected: '₹0',
    pendingFus: 6
  });

  const userName = currentUser?.name || 'Kavitha N.';
  const userFirstName = userName.split(' ')[0] || 'Kavitha';
  const branchName = currentUser?.branch || 'Saravanampatti Branch';

  const NAV_TABS = [
    { name: 'Home', badge: null, icon: Home, iconBg: 'bg-[#00897b]', color: 'teal' },
    { name: 'My Pipeline', badge: '47', icon: Filter, iconBg: 'bg-[#7c3aed]', badgeBg: 'bg-rose-500', color: 'purple' },
    { name: 'Follow-up Board', badge: '3', icon: Clock, iconBg: 'bg-amber-500', badgeBg: 'bg-rose-500', color: 'orange' },
    { name: 'Demo Desk', badge: null, icon: Monitor, iconBg: 'bg-cyan-600', color: 'cyan' },
    { name: 'Admitted Students', badge: '23', icon: GraduationCap, iconBg: 'bg-emerald-600', badgeBg: 'bg-emerald-500', color: 'emerald' },
    { name: 'My Targets', badge: null, icon: Target, iconBg: 'bg-rose-500', color: 'pink' },
    { name: 'Reports', badge: null, icon: BarChart2, iconBg: 'bg-amber-600', color: 'amber' },
    { name: 'My Schedule', badge: null, icon: Calendar, iconBg: 'bg-blue-500', color: 'blue' },
    { name: 'LMS', badge: 'Learn', isPillBadge: true, icon: BookOpen, iconBg: 'bg-yellow-700', color: 'green' },
    { name: 'Fees', badge: null, icon: IndianRupee, iconBg: 'bg-teal-600', color: 'teal' },
    { name: 'Handover', badge: '4', icon: Repeat, iconBg: 'bg-orange-600', badgeBg: 'bg-orange-500', color: 'orange' },
  ];

  const PRIORITY_QUEUE = [
    {
      time: 'NOW',
      isNow: true,
      name: 'Priya R. — First Call',
      details: 'Google Calls • BPO Reject • 24F • Coimbatore',
      actionText: 'CALL NOW',
      actionStyle: 'bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-extrabold'
    },
    {
      time: '12:30',
      name: 'Karthik V. — FU1 Call',
      details: 'Referral • Demo booked • BCom • 22M',
      actionText: 'DEMO TODAY 4 PM',
      actionStyle: 'bg-purple-50 text-purple-700 border border-purple-200 font-bold'
    },
    {
      time: '14:00',
      name: 'Sneha P. — FU2 + Pitch',
      details: 'WhatsApp • Final Year BCom • 21F',
      actionText: 'FOLLOW-UP',
      actionStyle: 'bg-slate-100 text-slate-700 border border-slate-200 font-semibold'
    },
    {
      time: '15:30',
      name: 'Manoj K. — FU3 (last attempt)',
      details: 'Justdial • Career Gap • 25M',
      actionText: 'DECIDING',
      actionStyle: 'bg-slate-100 text-slate-700 border border-slate-200 font-semibold'
    },
    {
      time: '16:30',
      name: 'Lakshmi N. — Demo + Tour',
      details: 'Walk-in • Allied Health • 25F • ₹21K ready',
      actionText: 'DEMO + CLOSE',
      actionStyle: 'bg-purple-50 text-purple-700 border border-purple-200 font-bold'
    }
  ];

  const RECENT_ACTIVITIES = [
    {
      time: '15:42',
      primary: 'Pooja R. paid ₹21,000',
      secondary: 'CPC Inter confirmed • ID: TFSC0Y9824',
      tag: 'ADMITTED',
      tagStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      time: '14:18',
      primary: 'Karthik V. confirmed demo',
      secondary: 'for today 4 PM',
      tag: 'DEMO',
      tagStyle: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      time: '13:55',
      primary: 'Audit feedback from Priyadharshini',
      secondary: 'Sneha P. call ★★★★★',
      tag: 'AUDIT',
      tagStyle: 'bg-slate-100 text-slate-600 border-slate-200'
    },
    {
      time: '12:52',
      primary: '5 new leads allocated',
      secondary: 'by Priyadharshini • Google + Referral',
      tag: 'ALLOCATED',
      tagStyle: 'bg-slate-100 text-slate-600 border-slate-200'
    },
    {
      time: '11:48',
      primary: 'Bharath M. opened WhatsApp brochure',
      secondary: '3rd interaction',
      tag: 'WARM',
      tagStyle: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
      time: '11:10',
      primary: 'Demo no-show: Suresh P.',
      secondary: 'Reschedule needed',
      tag: 'FOLLOW-UP',
      tagStyle: 'bg-slate-100 text-slate-600 border-slate-200'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f0faf8] font-sans text-slate-800 animate-fadeIn">
      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#00897b] text-white px-4 sm:px-6 py-2.5 shadow-md flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Portal Home & Logo Pill */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-sm transition-all active:scale-[0.97]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Portal Home</span>
          </button>

          <div className="flex items-center gap-2 bg-white/95 px-3 py-1 rounded-full shadow-sm text-slate-800">
            <img 
              src="/thoughtflows-logo.png" 
              alt="Thoughtflows" 
              className="h-5 w-auto object-contain" 
            />
            <span className="text-[11px] font-bold text-[#00695c]">
              Thoughtflows 2.0 • HR Department
            </span>
          </div>
        </div>

        {/* Center: Search & Add Lead */}
        <div className="flex items-center gap-2 flex-1 max-w-md mx-auto justify-center">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-white/70 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads, students..."
              className="w-full bg-white/15 border border-white/25 rounded-full pl-8 pr-12 py-1 text-xs text-white placeholder-white/70 outline-none focus:bg-white/25 transition-all"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono bg-white/20 px-1.5 py-0.5 rounded text-white/90">
              ⌘K
            </span>
          </div>

          <button className="flex items-center gap-1 px-3 py-1 rounded-full bg-white text-[#00695c] hover:bg-teal-50 text-xs font-bold shadow-sm transition-all flex-shrink-0">
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Lead</span>
          </button>

          <button className="p-1.5 rounded-full hover:bg-white/15 text-white transition-colors relative flex-shrink-0">
            <Bell className="w-4 h-4" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-1 right-1" />
          </button>
        </div>

        {/* Right: User Profile, Break, Logout */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white/10 px-2.5 py-1 rounded-full">
            <div className="w-6 h-6 rounded-full bg-white text-[#00695c] font-bold text-xs flex items-center justify-center">
              {userFirstName[0]}
            </div>
            <div className="text-left text-[11px] leading-tight hidden sm:block">
              <div className="font-bold text-white">{userName}</div>
              <div className="text-[9.5px] text-teal-100 uppercase tracking-wider">
                SARAVANAMPATTI • <span className="text-emerald-300">Logged in - 11:12</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsOnBreak(!isOnBreak)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
              isOnBreak 
                ? 'bg-amber-400 text-amber-950 font-bold' 
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isOnBreak ? 'On Break' : 'Start Break'}</span>
          </button>

          <button
            onClick={onLogout || onClose}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 hover:bg-rose-500 hover:text-white text-white text-xs font-semibold transition-all"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Sub-Header Navigation Tabs Bar */}
      <div className="bg-white border-b border-slate-200/80 px-2 sm:px-4 py-1.5 shadow-xs relative">
        <div className="max-w-[1360px] mx-auto flex items-center gap-1.5">
          {/* Scroll Left */}
          <button 
            onClick={() => {
              const el = document.getElementById('hr-nav-tabs-container');
              if (el) el.scrollLeft -= 200;
            }}
            className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs flex-shrink-0 transition-colors"
            title="Scroll Left"
          >
            ◀
          </button>

          {/* Scrollable Tabs */}
          <div 
            id="hr-nav-tabs-container"
            className="flex items-center gap-1.5 overflow-x-auto scrollbar-none scroll-smooth flex-1 py-1"
          >
            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.name;
              const IconComp = tab.icon;
              return (
                <div key={tab.name} className="flex-shrink-0 relative">
                  <button
                    onClick={() => setActiveTab(tab.name)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? tab.color === 'purple'
                          ? 'bg-[#7c3aed] text-white shadow-sm'
                          : tab.color === 'orange'
                            ? 'bg-[#d97706] text-white shadow-sm'
                            : tab.color === 'emerald'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : tab.color === 'pink'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : tab.color === 'blue'
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'bg-[#00897b] text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                    }`}
                  >
                    {/* Icon in circle */}
                    {IconComp && (
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-white/20 text-white' : `${tab.iconBg} text-white`
                      }`}>
                        <IconComp className="w-2.5 h-2.5" />
                      </span>
                    )}
                    <span>{tab.name}</span>

                    {/* Badge */}
                    {tab.badge && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isActive 
                          ? 'bg-white/25 text-white' 
                          : tab.isPillBadge
                            ? 'bg-amber-300 text-amber-950 text-[9px]'
                            : tab.badgeBg 
                              ? `${tab.badgeBg} text-white`
                              : 'bg-slate-200 text-slate-700'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>

                  {/* Active bottom indicator line */}
                  {isActive && (
                    <div className={`absolute -bottom-2.5 left-2 right-2 h-0.5 rounded-full ${
                      tab.color === 'purple' 
                        ? 'bg-[#7c3aed]' 
                        : tab.color === 'orange'
                          ? 'bg-[#d97706]'
                          : tab.color === 'emerald'
                            ? 'bg-emerald-600'
                            : tab.color === 'pink'
                              ? 'bg-rose-500'
                              : tab.color === 'blue'
                                ? 'bg-blue-600'
                                : 'bg-[#00897b]'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Scroll Right */}
          <button 
            onClick={() => {
              const el = document.getElementById('hr-nav-tabs-container');
              if (el) el.scrollLeft += 200;
            }}
            className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs flex-shrink-0 transition-colors"
            title="Scroll Right"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="max-w-[1360px] mx-auto p-4 sm:p-6 space-y-5">
        {activeTab === 'My Schedule' ? (
          <HrMySchedule isOnBreak={isOnBreak} setIsOnBreak={setIsOnBreak} />
        ) : activeTab === 'My Targets' ? (
          <HrMyTargets />
        ) : activeTab === 'Admitted Students' ? (
          <HrAdmittedStudentsCrm />
        ) : activeTab === 'Demo Desk' ? (
          <HrDemoDesk />
        ) : activeTab === 'Follow-up Board' ? (
          <HrFollowUpBoard />
        ) : activeTab === 'My Pipeline' ? (
          <HrPipelineView />
        ) : activeTab === 'Home' ? (
          <>
        
        {/* Greeting & Quick Context */}
        <div className="text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Good afternoon, <span className="text-[#00897b]">{userFirstName}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Mon • 21 May 2026 • {branchName} • You have <strong className="text-slate-800 font-semibold">12 calls</strong> to make today
          </p>
        </div>

        {/* Golden Target Progress Banner */}
        <div className="bg-gradient-to-r from-[#fff9eb] via-[#fffbeb] to-[#fef3c7] border border-[#fde68a] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-300/60 flex items-center justify-center text-amber-700 flex-shrink-0">
              <Award className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full border border-amber-300/50">
                MONTHLY TARGET • MAY
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                Target 25 admissions • 23 closed
              </h3>
              <p className="text-xs text-amber-900/80">
                2 more to hit your target — then each extra admission earns incentive (from ₹500).
              </p>
            </div>
          </div>

          <div className="w-full sm:w-64 flex flex-col items-end">
            <div className="flex items-center justify-between w-full text-xs font-extrabold text-slate-800 mb-1">
              <span>23 / 25</span>
              <span className="text-amber-700">92%</span>
            </div>
            <div className="w-full h-2.5 bg-amber-200/60 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-[#00897b] rounded-full w-[92%]" />
            </div>
            <span className="text-[10px] font-bold text-amber-800 mt-1 uppercase tracking-wider">
              MAY MTD EARNED: <strong className="text-emerald-700">₹0</strong>
            </span>
          </div>
        </div>

        {/* 4 Metric Cards in a Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1 */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#00897b]/50 transition-all flex flex-col justify-between text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                CALLS TODAY
              </span>
              <div className="w-7 h-7 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
                <Phone className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">12</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">6 done • 6 pending</div>
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
            <div className="text-3xl font-extrabold text-amber-600">8</div>
            <div className="text-xs text-rose-500 mt-1 font-bold">3 overdue • act now</div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-cyan-400/50 transition-all flex flex-col justify-between text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                DEMOS TODAY
              </span>
              <div className="w-7 h-7 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">5</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">1 done • 4 upcoming</div>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-400/50 transition-all flex flex-col justify-between text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                ADMISSIONS • MTD
              </span>
              <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#00897b]">23</div>
            <div className="text-xs text-emerald-600 mt-1 font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> ↑ 12% vs last month
            </div>
          </div>
        </div>

        {/* Two Column Middle Section: Priority Queue & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left: Today's Priority Queue (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between relative">
            
            {/* Floating Course Catalog Pill Badge */}
            <div className="absolute -left-3 top-2/3 -translate-y-1/2 hidden md:block">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 text-xs font-extrabold shadow-md transition-transform hover:scale-105">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Course Catalog</span>
              </button>
            </div>

            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00897b] animate-pulse" />
                  <h3 className="text-sm font-bold text-slate-900">Today's Priority Queue</h3>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  12 tasks • 8 done • 4 pending
                </span>
              </div>

              {/* Queue Items */}
              <div className="space-y-2.5">
                {PRIORITY_QUEUE.map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50/60 hover:bg-teal-50/40 border border-slate-100 hover:border-teal-200 transition-all flex items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold flex-shrink-0 ${
                        item.isNow 
                          ? 'bg-[#00897b] text-white' 
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

                    <button className={`px-3 py-1 rounded-full text-[10.5px] tracking-wide flex-shrink-0 transition-all ${item.actionStyle}`}>
                      {item.actionText}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Recent Activity (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
                <span className="text-xs text-slate-500 font-medium">Last 4 hrs</span>
              </div>

              {/* Timeline Items */}
              <div className="space-y-3">
                {RECENT_ACTIVITIES.map((act, idx) => (
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
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Banner: End-of-Day Closure Card */}
        <div className="bg-[#0b1f36] text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-800 text-left">
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
              <div className="text-xl sm:text-2xl font-extrabold text-teal-300">
                {closureMetrics.callsMade}
              </div>
              <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">
                CALLS MADE
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-teal-300">
                {closureMetrics.connected}
              </div>
              <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">
                CONNECTED
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-teal-300">
                {closureMetrics.demosBooked}
              </div>
              <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">
                DEMOS BOOKED
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">
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
                className="px-4 py-2 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-[0.98]"
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
                onClick={() => setActiveTab('My Pipeline')}
                className="px-4 py-2 rounded-xl bg-[#7c3aed] text-white text-xs font-bold shadow-xs hover:bg-[#6d28d9] transition-all"
              >
                Open My Pipeline (47 Leads)
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
    </div>
  );
}
