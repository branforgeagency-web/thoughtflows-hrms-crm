import React, { useState } from 'react';
import {
  ChevronLeft,
  ArrowLeftRight,
  PhoneCall,
  Calendar,
  BookOpen,
  Users,
  AlertTriangle,
  UserCheck,
  Target,
  GraduationCap,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Check,
  Clock,
  Send,
  Plus
} from 'lucide-react';

export default function BranchManagerDashboard({
  branch = null,
  onBack,
  allBranches = [],
  onSwitchBranch,
  currentUser = null
}) {
  // Fallback / default data based on CBE-Gandhipuram screenshot
  const branchName = branch?.name || 'CBE-Gandhipuram';
  const branchCode = branch?.code || branch?.id || 'GPM';
  const branchCity = branch?.city || 'Coimbatore';
  const hrsCount = branch?.hrs || branch?.staffCount || 4;
  const activeLeadsCount = branch?.leads || branch?.activeStudents || 41;
  const rawCleanName = branchName.replace(/^(cbe|tnd|ker|hyd|and|mah)-?/i, '').trim().toLowerCase().replace(/[^a-z]/g, '');
  const activeEmail = currentUser?.email || `${rawCleanName || 'gandhipuram'}@thoughtflows.in`;

  // Active sidebar menu tab
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);

  // Allocate new call form state
  const [allocateForm, setAllocateForm] = useState({
    studentName: '',
    mobileNumber: '',
    source: 'Google Calls / GMB',
    language: 'Language (for matching)...'
  });
  const [toastMessage, setToastMessage] = useState(null);
  const [leadsList, setLeadsList] = useState(activeLeadsCount);

  // Leave approvals state
  const [approvals, setApprovals] = useState([
    {
      id: 1,
      staffName: 'Kavitha N.',
      leaveType: 'Earned Leave',
      duration: '3 days',
      date: '2 Jun',
      reason: 'family function',
      status: 'pending'
    }
  ]);

  // Demo Bookings State
  const [demos, setDemos] = useState([
    { id: 'D2003', student: 'Ramesh Kumar', course: 'CPC', trainer: 'Rajesh M.', dateTime: 'Sat · 11:00 AM', bookedBy: 'Kavitha N.', source: 'Phone/online', status: 'Booked' },
    { id: 'D2002', student: 'Sneha P.', course: 'CCS', trainer: 'Lavanya K.', dateTime: 'Today · 4:30 PM', bookedBy: 'Meera R.', source: 'Walk-in', status: 'Attended' },
    { id: 'D2001', student: 'Karthik R.', course: 'Medical Coding Foundation', trainer: 'Rajesh M.', dateTime: 'Yesterday · 5:00 PM', bookedBy: 'Divya P.', source: 'Phone/online', status: 'Converted' }
  ]);

  // Daily Roster State
  const [roster, setRoster] = useState([
    { name: 'Kavitha N.', initial: 'K', bg: 'bg-emerald-500', shift: 'General · 10-6', quota: 20, allocated: 1, status: 'GENERAL' },
    { name: 'Meera R.', initial: 'M', bg: 'bg-teal-500', shift: 'General · 10-6', quota: 20, allocated: 1, status: 'GENERAL' },
    { name: 'Anitha S.', initial: 'A', bg: 'bg-amber-500', shift: 'General · 10-6', quota: 20, allocated: 0, status: 'GENERAL' },
    { name: 'Suresh M.', initial: 'S', bg: 'bg-slate-400', shift: 'Off today', quota: 20, allocated: 0, status: 'OFF' }
  ]);

  // Attendance State
  const [attendanceData, setAttendanceData] = useState([
    { name: 'Kavitha N.', login: '09:05 AM', logout: '—', break: '15m', hours: '5.5 hrs', status: 'ON DUTY' },
    { name: 'Meera R.', login: '09:12 AM', logout: '—', break: '0m', hours: '5.3 hrs', status: 'ON DUTY' },
    { name: 'Anitha S.', login: '09:00 AM', logout: '—', break: '30m', hours: '5.2 hrs', status: 'ON DUTY' },
    { name: 'Suresh M.', login: '—', logout: '—', break: '—', hours: '0.0 hrs', status: 'OFF TODAY' }
  ]);

  // Selected Person Modal state
  const [selectedPerson, setSelectedPerson] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleAllocate = (e) => {
    e.preventDefault();
    if (!allocateForm.mobileNumber) {
      showToast('⚠️ Please enter a mobile number to allocate');
      return;
    }
    setLeadsList((prev) => prev + 1);
    showToast(`✅ Call allocated for ${allocateForm.studentName || 'Student'} (${allocateForm.mobileNumber}) to available HR counsellor!`);
    setAllocateForm({
      studentName: '',
      mobileNumber: '',
      source: 'Google Calls / GMB',
      language: 'Language (for matching)...'
    });
  };

  const handleApprovalDecision = (id, newStatus) => {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    showToast(newStatus === 'approved' ? '✅ Leave request approved' : '❌ Leave request rejected');
  };

  const handleDemoStatusChange = (id, nextStatus) => {
    setDemos(prev => prev.map(d => d.id === id ? { ...d, status: nextStatus } : d));
    showToast(`✅ Demo ${id} updated to ${nextStatus}`);
  };

  // Mock Counsellors data
  const counsellors = [
    { name: 'Kavitha N.', initial: 'K', bg: 'bg-emerald-500', calls: 12, pickup: '96%', barWidth: 'w-[96%]', barColor: 'bg-emerald-500', count: 12 },
    { name: 'Meera R.', initial: 'M', bg: 'bg-teal-500', calls: 10, pickup: '88%', barWidth: 'w-[88%]', barColor: 'bg-emerald-500', count: 10 },
    { name: 'Anitha S.', initial: 'A', bg: 'bg-amber-500', calls: 18, pickup: '91%', barWidth: 'w-[91%]', barColor: 'bg-amber-500', count: 18 },
    { name: 'Suresh M.', initial: 'S', bg: 'bg-slate-400', calls: 8, pickup: '0%', barWidth: 'w-[5%]', barColor: 'bg-slate-300', count: 0 }
  ];

  // Mock HR Team Leads data
  const teamLeads = [
    { name: 'Kalaiselvi C', initial: 'KC', bg: 'bg-purple-600', counsellors: 6, code: 'TF88591' },
    { name: 'Punitha', initial: 'P', bg: 'bg-teal-600', counsellors: 5, code: 'TF88593' },
    { name: 'R Priyadharshini', initial: 'RP', bg: 'bg-blue-600', counsellors: 5, code: 'TF88703' },
    { name: 'Guru Vigneshwar S', initial: 'GS', bg: 'bg-amber-600', counsellors: 4, code: 'TF88697' },
    { name: 'Sindhuja Erothu', initial: 'SE', bg: 'bg-rose-600', counsellors: 5, code: 'TF88637' },
    { name: 'Anakha Suresh M', initial: 'AM', bg: 'bg-emerald-600', counsellors: 4, code: 'TF88575' },
    { name: 'Peemuthannagari Supraja', initial: 'PS', bg: 'bg-purple-700', counsellors: 4, code: 'TF88643' }
  ];

  return (
    <div className="w-full min-h-screen bg-[#f4f6fa] p-3 sm:p-5 lg:p-6 font-sans text-slate-800 animate-fadeIn">
      <div className="max-w-[1550px] mx-auto space-y-4">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onBack && onBack()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
            All branches
          </button>

          {toastMessage && (
            <div className="px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-lg animate-bounce">
              {toastMessage}
            </div>
          )}
        </div>

        {/* Main 2-Column Dashboard Container */}
        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-5 items-start">
          
          {/* LEFT SIDEBAR */}
          <div className="space-y-4">
            {/* Branch Card Header */}
            <div className="relative bg-gradient-to-br from-purple-700 via-indigo-700 to-purple-800 rounded-2xl p-4 text-white shadow-md overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-extrabold text-xs tracking-tight border border-white/30 text-white">
                    {branchCode}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold tracking-tight leading-tight">
                      {branchName.replace(' Branch', '')}
                    </h3>
                    <p className="text-[11px] text-purple-200 font-medium">Your branch</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsSwitchModalOpen(true)}
                  className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center transition-colors text-white cursor-pointer"
                  title="Switch branch"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Login Credentials & Active Session Info */}
              <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center justify-between text-[10px]">
                <div className="text-purple-100 font-mono truncate max-w-[140px]" title={activeEmail}>
                  🔑 {activeEmail}
                </div>
                <span className="bg-emerald-400/25 text-emerald-200 px-1.5 py-0.5 rounded-full font-extrabold tracking-wide border border-emerald-300/40">
                  Manager Session
                </span>
              </div>
            </div>

            {/* Menu Items Box */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs space-y-1">
              <div className="text-[10px] font-extrabold text-slate-400 font-mono tracking-wider uppercase px-3 py-1.5">
                MENU
              </div>

              {[
                { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
                { id: 'attendance', label: 'Attendance', icon: UserCheck },
                { id: 'hr_calls', label: 'HR Calls', icon: PhoneCall, badge: 3 },
                { id: 'demo_bookings', label: 'Demo Bookings', icon: BookOpen, badge: 3 },
                { id: 'at_risk', label: 'At-Risk Students', icon: AlertTriangle, badge: 0 },
                { id: 'roster', label: 'Daily Roster', icon: Calendar },
                { id: 'targets', label: 'Team Targets', icon: Target },
                { id: 'lms', label: 'LMS', icon: GraduationCap }
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-purple-100/70 text-purple-900 border border-purple-200/60 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-purple-700' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>

                    {typeof item.badge === 'number' && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isActive
                            ? 'bg-purple-700 text-white'
                            : item.badge > 0
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-600 text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT MAIN CONTENT AREA */}
          <div className="space-y-5">
            {/* Header Title & Meta */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>{branchName}</span>
                <span className="text-purple-600">Branch</span>
              </h1>
              <p className="text-xs font-mono text-slate-500 mt-1 tracking-wide">
                {branchCode} &nbsp;·&nbsp; {branchCity} &nbsp;·&nbsp; {hrsCount} HR counsellors &nbsp;·&nbsp; {leadsList} active leads
              </p>
            </div>

            {/* TAB 1: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-5 animate-fadeIn">
                {/* 1. TOP PURPLE BANNER CARD: Branch Health */}
                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                        <span>Branch Health</span>
                        <span>·</span>
                        <span className="text-purple-200">{branchCode}</span>
                      </h2>
                      <p className="text-xs text-purple-200/90 font-mono mt-0.5">
                        May 2026 &nbsp;·&nbsp; Live snapshot for the branch head
                      </p>
                    </div>

                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-extrabold text-white self-start sm:self-auto">
                      89% to monthly target
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-100 p-4 sm:p-5 bg-white gap-4 md:gap-0">
                    <div className="md:px-4 text-left">
                      <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">ADMISSIONS</div>
                      <div className="text-2xl font-black text-slate-900 mt-1 tracking-tight">89 / 100</div>
                      <div className="text-[11px] font-semibold text-slate-500 mt-1">89% of branch target</div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div className="bg-purple-600 h-full rounded-full w-[89%]" />
                      </div>
                    </div>

                    <div className="md:px-4 text-left">
                      <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">FEES COLLECTED</div>
                      <div className="text-2xl font-black text-emerald-600 mt-1 tracking-tight">₹11.2L</div>
                      <div className="text-[11px] font-semibold text-slate-500 mt-1">₹7.5L pending</div>
                    </div>

                    <div className="md:px-4 text-left">
                      <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">DEMO CONVERSION</div>
                      <div className="text-2xl font-black text-blue-600 mt-1 tracking-tight">26%</div>
                      <div className="text-[11px] font-semibold text-slate-500 mt-1">1 joined from demos</div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full w-[26%]" />
                      </div>
                    </div>

                    <div className="md:px-4 text-left">
                      <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">TEAM ACTIVE NOW</div>
                      <div className="text-2xl font-black text-amber-600 mt-1 tracking-tight">2 / 4</div>
                      <div className="text-[11px] font-semibold text-slate-500 mt-1">counsellors on the floor</div>
                    </div>

                    <div className="md:px-4 text-left">
                      <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">INCENTIVE · MTD</div>
                      <div className="text-2xl font-black text-amber-600 mt-1 tracking-tight">₹4k</div>
                      <div className="text-[11px] font-semibold text-slate-500 mt-1">payable to team</div>
                    </div>
                  </div>
                </div>

                {/* 2. ALLOCATE A NEW CALL BOX */}
                <div className="bg-white border border-purple-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span className="text-purple-700">🧮</span> Allocate a New Call
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Got a number from any source? Enter it and assign it to your team.
                    </p>
                  </div>

                  <form onSubmit={handleAllocate} className="flex flex-wrap lg:flex-nowrap items-center gap-3 pt-1">
                    <input
                      type="text"
                      placeholder="Student name (optional)"
                      value={allocateForm.studentName}
                      onChange={(e) => setAllocateForm({ ...allocateForm, studentName: e.target.value })}
                      className="flex-1 min-w-[160px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-600 bg-slate-50/50"
                    />

                    <input
                      type="text"
                      placeholder="Mobile number"
                      value={allocateForm.mobileNumber}
                      onChange={(e) => setAllocateForm({ ...allocateForm, mobileNumber: e.target.value })}
                      className="flex-1 min-w-[160px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-600 bg-slate-50/50"
                    />

                    <select
                      value={allocateForm.source}
                      onChange={(e) => setAllocateForm({ ...allocateForm, source: e.target.value })}
                      className="flex-1 min-w-[160px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-purple-600 bg-slate-50/50"
                    >
                      <option value="Google Calls / GMB">Google Calls / GMB</option>
                      <option value="Meta Ads">Meta Ads</option>
                      <option value="Direct Walk-in">Direct Walk-in</option>
                      <option value="Website Lead">Website Lead</option>
                      <option value="Referral">Referral</option>
                    </select>

                    <select
                      value={allocateForm.language}
                      onChange={(e) => setAllocateForm({ ...allocateForm, language: e.target.value })}
                      className="flex-1 min-w-[160px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-purple-600 bg-slate-50/50"
                    >
                      <option value="Language (for matching)...">Language (for matching)...</option>
                      <option value="Tamil">Tamil</option>
                      <option value="English">English</option>
                      <option value="Malayalam">Malayalam</option>
                      <option value="Telugu">Telugu</option>
                      <option value="Hindi">Hindi</option>
                    </select>

                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer whitespace-nowrap"
                    >
                      Allocate →
                    </button>
                  </form>
                </div>

                {/* 3. ROW OF 4 KPI SUMMARY CARDS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">ACTIVE LEADS</div>
                    <div className="text-3xl font-black text-purple-700 tracking-tight mt-1">{leadsList}</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">in pipeline</div>
                  </div>

                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">ADMISSIONS · MAY</div>
                    <div className="text-3xl font-black text-blue-600 tracking-tight mt-1">48</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">this branch</div>
                  </div>

                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">CONVERSION</div>
                    <div className="text-3xl font-black text-teal-600 tracking-tight mt-1">34%</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">lead → admit</div>
                  </div>

                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">HR COUNSELLORS</div>
                    <div className="text-3xl font-black text-amber-500 tracking-tight mt-1">4</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">active team</div>
                  </div>
                </div>

                {/* 4. TEAM PERFORMANCE · MAY */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span className="text-purple-600">📊</span> Team Performance · May
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Each counsellor's calls and pickup rate — tap a name for their full card
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {counsellors.map((c) => (
                      <div
                        key={c.name}
                        onClick={() => setSelectedPerson(c)}
                        className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-purple-300 transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-full ${c.bg} text-white font-extrabold text-sm flex items-center justify-center flex-shrink-0 shadow-2xs`}>
                            {c.initial}
                          </div>

                          <div>
                            <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors">
                              {c.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {c.calls} calls today &nbsp;·&nbsp; {c.pickup} pickup
                            </p>

                            <div className="w-24 bg-slate-200 rounded-full h-1 mt-1.5 overflow-hidden">
                              <div className={`h-full rounded-full ${c.barColor} ${c.barWidth}`} />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-bold text-slate-700 group-hover:text-purple-700">
                          <span>{c.count}</span>
                          <span className="text-slate-400 group-hover:text-purple-500">›</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. HR TEAM LEADS */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span>👥 HR Team Leads</span>
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" title="Your team leads - each runs a group of counsellors" />
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Your team leads — each runs a group of counsellors. Tap a lead to see their team.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {teamLeads.map((lead) => (
                      <div
                        key={lead.name}
                        onClick={() => setSelectedPerson(lead)}
                        className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-purple-300 transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-full ${lead.bg} text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs`}>
                            {lead.initial}
                          </div>

                          <div>
                            <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors">
                              {lead.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Team Lead &nbsp;·&nbsp; {lead.counsellors} counsellors &nbsp;·&nbsp; <span className="font-mono text-slate-400">{lead.code}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-bold text-slate-700 group-hover:text-purple-700">
                          <span>{lead.counsellors}</span>
                          <span className="text-slate-400 group-hover:text-purple-500">›</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6. LMS — LEARNING */}
                <div className="bg-[#fffdf0] border border-amber-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span className="text-amber-600">📚</span> LMS — Learning
                    </h3>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">
                      The full HR LMS + your responsibilities + your team's course completion. Modules gate which leads each HR can take.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="bg-white border border-amber-200/60 rounded-xl p-4 text-center shadow-2xs">
                      <div className="text-2xl font-black text-purple-700">78%</div>
                      <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider mt-1">TEAM AVG</div>
                    </div>

                    <div className="bg-white border border-amber-200/60 rounded-xl p-4 text-center shadow-2xs">
                      <div className="text-2xl font-black text-amber-600">1</div>
                      <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider mt-1">BEHIND &lt;70%</div>
                    </div>

                    <div className="bg-white border border-amber-200/60 rounded-xl p-4 text-center shadow-2xs">
                      <div className="text-2xl font-black text-purple-700">0</div>
                      <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider mt-1">CERTIFIED</div>
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={() => setActiveTab('lms')}
                      className="px-5 py-2 rounded-xl bg-[#856404] hover:bg-[#6d5203] text-white text-xs font-extrabold transition-all cursor-pointer"
                    >
                      Open LMS →
                    </button>
                  </div>
                </div>

                {/* 7. PENDING APPROVALS */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span className="text-emerald-600">✅</span> Pending Approvals
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">Leave requests waiting on you</p>
                  </div>

                  {approvals.map((ap) => (
                    <div
                      key={ap.id}
                      className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">{ap.staffName} · {ap.leaveType}</h4>
                        <p className="text-xs text-slate-600 mt-0.5">{ap.duration} &nbsp;·&nbsp; {ap.date} &nbsp;·&nbsp; {ap.reason}</p>
                      </div>

                      {ap.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprovalDecision(ap.id, 'approved')}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleApprovalDecision(ap.id, 'rejected')}
                            className="px-4 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className={`text-xs font-bold px-3 py-1 rounded-md ${ap.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {ap.status.toUpperCase()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: ATTENDANCE */}
            {activeTab === 'attendance' && (
              <div className="space-y-5 animate-fadeIn">
                {/* 4 Metric Cards Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border-2 border-purple-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">LOGGED IN</div>
                    <div className="text-3xl font-black text-purple-700 tracking-tight mt-1">3</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">of 4 team</div>
                  </div>

                  <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">LATE TODAY</div>
                    <div className="text-3xl font-black text-blue-600 tracking-tight mt-1">0</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">after 09:15</div>
                  </div>

                  <div className="bg-white border border-teal-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">ABSENT</div>
                    <div className="text-3xl font-black text-teal-600 tracking-tight mt-1">1</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">no login yet</div>
                  </div>

                  <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">AVG HOURS</div>
                    <div className="text-3xl font-black text-amber-500 tracking-tight mt-1">5.3</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">worked today</div>
                  </div>
                </div>

                {/* Attendance Table Card */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span>⏱️</span> Employee Login / Logout — Friday 9 Oct
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-1 leading-relaxed">
                      Live login and logout times for your team. Shift starts 09:00 — anyone clocking in after 09:15 is flagged late. These hours roll up to the Operational Head across all branches.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/80 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                          <th className="py-2.5 px-3">Employee</th>
                          <th className="py-2.5 px-3">Login</th>
                          <th className="py-2.5 px-3">Logout</th>
                          <th className="py-2.5 px-3">Break</th>
                          <th className="py-2.5 px-3">Hours</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attendanceData.map((row) => (
                          <tr key={row.name} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-extrabold text-slate-900">{row.name}</td>
                            <td className="py-3 px-3 text-slate-600 font-mono">{row.login}</td>
                            <td className="py-3 px-3 text-slate-600 font-mono">{row.logout}</td>
                            <td className="py-3 px-3 text-slate-600 font-mono">{row.break}</td>
                            <td className="py-3 px-3 font-bold text-slate-900 font-mono">{row.hours}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.status === 'ON DUTY' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => showToast(`Clocked action simulated for ${row.name}`)}
                                className="px-2.5 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-[10px]"
                              >
                                Clock
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 text-[11px] text-slate-500 font-mono leading-relaxed">
                    In the live system, employees clock in/out themselves (web or biometric) and these times sync in real time. Here you can simulate it with the buttons. The daily totals feed the Operational Head's org-wide attendance view.
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: HR CALLS */}
            {activeTab === 'hr_calls' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border-2 border-purple-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">CALLS ALLOCATED</div>
                    <div className="text-3xl font-black text-purple-700 tracking-tight mt-1">3</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">today</div>
                  </div>

                  <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">COMPLETED</div>
                    <div className="text-3xl font-black text-blue-600 tracking-tight mt-1">3</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">HR entered details</div>
                  </div>

                  <div className="bg-white border border-teal-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">CONVERTED</div>
                    <div className="text-3xl font-black text-teal-600 tracking-tight mt-1">1</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">demo/will-join</div>
                  </div>

                  <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">AWAITING</div>
                    <div className="text-3xl font-black text-amber-500 tracking-tight mt-1">0</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">not done yet</div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span>📋</span> HR Calls — Allocated & Returned
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      Every call you allocate shows here. When the HR finishes and enters details, the remark + outcome come back to you.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/80 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                          <th className="py-2.5 px-3">Time</th>
                          <th className="py-2.5 px-3">Lead</th>
                          <th className="py-2.5 px-3">Number</th>
                          <th className="py-2.5 px-3">Source</th>
                          <th className="py-2.5 px-3">HR</th>
                          <th className="py-2.5 px-3">Mode</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Remark</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono text-slate-500">10:42 AM</td>
                          <td className="py-3 px-3 font-extrabold text-slate-900">Ramesh Kumar</td>
                          <td className="py-3 px-3 font-mono text-slate-600">98*** 41828</td>
                          <td className="py-3 px-3 text-slate-600">WhatsApp</td>
                          <td className="py-3 px-3 font-extrabold text-slate-900">Kavitha N.</td>
                          <td className="py-3 px-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">👆 Manual</span></td>
                          <td className="py-3 px-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Demo Booked</span></td>
                          <td className="py-3 px-3 text-slate-600">Wants CPC online · demo Sat 11am</td>
                          <td className="py-3 px-3 text-right text-emerald-600 font-bold">✓ returned</td>
                        </tr>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono text-slate-500">10:15 AM</td>
                          <td className="py-3 px-3 font-extrabold text-slate-900">Sneha P.</td>
                          <td className="py-3 px-3 font-mono text-slate-600">73*** 88210</td>
                          <td className="py-3 px-3 text-slate-600">Website</td>
                          <td className="py-3 px-3 font-extrabold text-slate-900">Meera R.</td>
                          <td className="py-3 px-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">⚡ Auto</span></td>
                          <td className="py-3 px-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Follow-up</span></td>
                          <td className="py-3 px-3 text-slate-600">Asked fees & EMI · will confirm tmrw</td>
                          <td className="py-3 px-3 text-right text-emerald-600 font-bold">✓ returned</td>
                        </tr>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono text-slate-500">09:50 AM</td>
                          <td className="py-3 px-3 font-extrabold text-slate-900">Arjun V.</td>
                          <td className="py-3 px-3 font-mono text-slate-600">98*** 33145</td>
                          <td className="py-3 px-3 text-slate-600">Referral</td>
                          <td className="py-3 px-3 font-extrabold text-slate-900">Divya P.</td>
                          <td className="py-3 px-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">👆 Manual</span></td>
                          <td className="py-3 px-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">Not Reachable</span></td>
                          <td className="py-3 px-3 text-slate-600">No answer · retry afternoon</td>
                          <td className="py-3 px-3 text-right text-emerald-600 font-bold">✓ returned</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: DEMO BOOKINGS */}
            {activeTab === 'demo_bookings' && (
              <div className="space-y-5 animate-fadeIn">
                {/* Marketing Summary Card */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span>📣</span> Marketing Summary
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      The branch's demo & walk-in numbers, packaged for the marketing team.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 text-center">
                      <div className="text-2xl font-black text-purple-700">3</div>
                      <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider mt-1">DEMOS BOOKED</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 text-center">
                      <div className="text-2xl font-black text-purple-700">2</div>
                      <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider mt-1">DEMOS ATTENDED</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 text-center">
                      <div className="text-2xl font-black text-emerald-600">1</div>
                      <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider mt-1">CONVERTED</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 text-center">
                      <div className="text-2xl font-black text-amber-600">1</div>
                      <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider mt-1">WALK-INS</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-dashed border-purple-300 bg-purple-50/40 text-xs text-purple-900 space-y-1 font-mono">
                    <p>📢 Send to the Marketing team: 3 demos booked, 2 attended, 1 converted - 1 walk-in - 0 no-shows.</p>
                    <p>🎯 Show-up rate 67% · Demo-conversion 50%.</p>
                  </div>

                  <button
                    onClick={() => showToast('✅ Marketing snapshot sent to Marketing Department!')}
                    className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send snapshot to Marketing
                  </button>
                </div>

                {/* Main Demo Bookings Table */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <span>🎓</span> Demo Bookings — booked by HR
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Every demo your HR team books shows here: student · course · trainer · date/time · status. It all rolls up to you.
                      </p>
                    </div>

                    <button
                      onClick={() => showToast('Demo booking simulation opened')}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer whitespace-nowrap self-start sm:self-auto"
                    >
                      + simulate HR booking a demo
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/80 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                          <th className="py-2.5 px-3">Ref</th>
                          <th className="py-2.5 px-3">Student</th>
                          <th className="py-2.5 px-3">Course</th>
                          <th className="py-2.5 px-3">Trainer</th>
                          <th className="py-2.5 px-3">Date / Time</th>
                          <th className="py-2.5 px-3">Booked by</th>
                          <th className="py-2.5 px-3">Source</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {demos.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-mono text-slate-400">{d.id}</td>
                            <td className="py-3 px-3 font-extrabold text-slate-900">{d.student}</td>
                            <td className="py-3 px-3 font-semibold text-slate-700">{d.course}</td>
                            <td className="py-3 px-3 font-semibold text-slate-700">{d.trainer}</td>
                            <td className="py-3 px-3 font-mono text-slate-600">{d.dateTime}</td>
                            <td className="py-3 px-3 font-extrabold text-slate-900">{d.bookedBy}</td>
                            <td className="py-3 px-3">
                              {d.source === 'Walk-in' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">🚶 Walk-in</span>
                              ) : (
                                <span className="text-slate-500">Phone/online</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                d.status === 'Booked' ? 'bg-blue-100 text-blue-800' :
                                d.status === 'Attended' ? 'bg-emerald-100 text-emerald-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {d.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              {d.status === 'Booked' && (
                                <button onClick={() => handleDemoStatusChange(d.id, 'Attended')} className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px]">
                                  mark attended
                                </button>
                              )}
                              {d.status === 'Attended' && (
                                <button onClick={() => handleDemoStatusChange(d.id, 'Converted')} className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px]">
                                  mark converted
                                </button>
                              )}
                              {d.status === 'Converted' && (
                                <span className="text-emerald-600 font-bold">✓ done</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: AT-RISK STUDENTS */}
            {activeTab === 'at_risk' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border-2 border-purple-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">AT RISK</div>
                    <div className="text-3xl font-black text-purple-700 tracking-tight mt-1">0</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">need follow-up</div>
                  </div>

                  <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">HIGH (DROPOUT)</div>
                    <div className="text-3xl font-black text-rose-600 tracking-tight mt-1">0</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">5+ misses / &lt;50%</div>
                  </div>

                  <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">MEDIUM</div>
                    <div className="text-3xl font-black text-amber-500 tracking-tight mt-1">0</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">needs a call</div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-12 shadow-2xs text-center space-y-2">
                  <p className="text-sm font-bold text-slate-700">
                    No at-risk students right now — attendance is healthy across the branch. ✅
                  </p>
                </div>
              </div>
            )}

            {/* TAB 6: DAILY ROSTER */}
            {activeTab === 'roster' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border-2 border-purple-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">ON SHIFT TODAY</div>
                    <div className="text-3xl font-black text-purple-700 tracking-tight mt-1">3</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">of 4 counsellors</div>
                  </div>

                  <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">OFF TODAY</div>
                    <div className="text-3xl font-black text-blue-600 tracking-tight mt-1">1</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">skipped by allocation</div>
                  </div>

                  <div className="bg-white border border-teal-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">TOTAL LEAD QUOTA</div>
                    <div className="text-3xl font-black text-teal-600 tracking-tight mt-1">60</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">capacity for today</div>
                  </div>

                  <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">CALLS ALLOCATED</div>
                    <div className="text-3xl font-black text-amber-500 tracking-tight mt-1">3</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">against quota</div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span>📅</span> Daily Roster — Friday 9 Oct
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      Set who works which shift and each person's lead quota. Allocation reads this for availability — "Off today" HRs are skipped and Auto allocation respects remaining quota.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/80 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                          <th className="py-2.5 px-3">Counsellor</th>
                          <th className="py-2.5 px-3">Shift</th>
                          <th className="py-2.5 px-3">Lead quota</th>
                          <th className="py-2.5 px-3">Allocated today</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {roster.map((row, idx) => (
                          <tr key={row.name} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-extrabold text-slate-900 flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-full ${row.bg} text-white font-extrabold text-xs flex items-center justify-center`}>
                                {row.initial}
                              </div>
                              <span>{row.name}</span>
                            </td>
                            <td className="py-3 px-3">
                              <select
                                value={row.shift}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setRoster(prev => prev.map((r, i) => i === idx ? { ...r, shift: val, status: val === 'Off today' ? 'OFF' : 'GENERAL' } : r));
                                }}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-800"
                              >
                                <option value="General · 10-6">General · 10-6</option>
                                <option value="Morning · 9-5">Morning · 9-5</option>
                                <option value="Off today">Off today</option>
                              </select>
                            </td>
                            <td className="py-3 px-3">
                              <input
                                type="number"
                                value={row.quota}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 0;
                                  setRoster(prev => prev.map((r, i) => i === idx ? { ...r, quota: val } : r));
                                }}
                                className="w-16 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-mono font-bold"
                              />
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-700 font-bold">{row.allocated} / {row.quota}</span>
                                <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-purple-600 h-full rounded-full" style={{ width: `${Math.min(100, (row.allocated / (row.quota || 1)) * 100)}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.status === 'GENERAL' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                    <button
                      onClick={() => showToast('🔮 Daily roster saved successfully!')}
                      className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-xs cursor-pointer"
                    >
                      🔮 Save roster
                    </button>
                    <p className="text-[11px] text-slate-500 font-mono">
                      This is what Allocate a New Call reads when deciding who's available. Off-shift counsellors won't be offered, and Auto allocation factors in each person's remaining quota.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: TEAM TARGETS */}
            {activeTab === 'targets' && (
              <div className="space-y-5 animate-fadeIn">
                {/* 4 Metric Cards Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border-2 border-purple-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">DEFAULT TARGET</div>
                    <div className="text-3xl font-black text-purple-700 tracking-tight mt-1">25</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">from management</div>
                  </div>

                  <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">HIT TARGET</div>
                    <div className="text-3xl font-black text-blue-600 tracking-tight mt-1">2</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">of 4 HRs</div>
                  </div>

                  <div className="bg-white border border-teal-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">TEAM INCENTIVE · MTD</div>
                    <div className="text-3xl font-black text-teal-600 tracking-tight mt-1">₹4.3k</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">payable this month</div>
                  </div>

                  <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">BANDS</div>
                    <div className="text-3xl font-black text-amber-500 tracking-tight mt-1">3</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">editable below</div>
                  </div>
                </div>

                {/* Main Card 1: Team Targets & Incentives */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span>🎯</span> Team Targets & Incentives
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-1 leading-relaxed">
                      Set each HR's monthly target. Incentive applies only past the target, progressively — ₹500 → ₹750 → ₹1000 per lead. You own the targets and can tune the incentive slabs below.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/80 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                          <th className="py-2.5 px-3">HR Counsellor</th>
                          <th className="py-2.5 px-3">Closed</th>
                          <th className="py-2.5 px-3">Target</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Incentive (MTD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-extrabold text-slate-900 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center">K</div>
                            <span>Kavitha N.</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">23</td>
                          <td className="py-3 px-3">
                            <input type="number" defaultValue={25} className="w-16 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-mono font-bold" />
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">2 to go</span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-500">₹0</td>
                        </tr>

                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-extrabold text-slate-900 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-teal-500 text-white font-extrabold text-xs flex items-center justify-center">M</div>
                            <span>Meera R.</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">31</td>
                          <td className="py-3 px-3">
                            <input type="number" defaultValue={25} className="w-16 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-mono font-bold" />
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">+6 past</span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">₹3,250</td>
                        </tr>

                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-extrabold text-slate-900 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-extrabold text-xs flex items-center justify-center">A</div>
                            <span>Anitha S.</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">27</td>
                          <td className="py-3 px-3">
                            <input type="number" defaultValue={25} className="w-16 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-mono font-bold" />
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">+2 past</span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">₹1,000</td>
                        </tr>

                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-extrabold text-slate-900 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-400 text-white font-extrabold text-xs flex items-center justify-center">S</div>
                            <span>Suresh M.</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">8</td>
                          <td className="py-3 px-3">
                            <input type="number" defaultValue={25} className="w-16 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-mono font-bold" />
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">17 to go</span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-500">₹0</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono">
                    Bands (per lead, past target): 1-5 past target = ₹500 · 6-10 past target = ₹750 · 11-15 past target = ₹1000. Change a target above and the incentive recalculates instantly.
                  </div>
                </div>

                {/* Main Card 2: Incentive Slabs */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span>💸</span> Incentive Slabs — per lead, past target
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      The first slab (1-5 past target) is the standard ₹500 default. You can edit the higher slabs to suit your branch — changes recalculate every counsellor's incentive instantly.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-600 text-white font-bold text-xs flex items-center justify-center">1</div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">1-5 past target</h4>
                        <p className="text-[11px] text-slate-500">Standard default - kept fixed</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 font-mono text-xs font-bold">
                      <span className="text-slate-400">₹</span>
                      <input type="number" defaultValue={500} disabled className="w-20 px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-bold" />
                      <span className="text-slate-400">/lead</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 8: LMS */}
            {activeTab === 'lms' && (
              <div className="space-y-5 animate-fadeIn">
                {/* 4 Metric Cards Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border-2 border-purple-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">TEAM LMS AVG</div>
                    <div className="text-3xl font-black text-purple-700 tracking-tight mt-1">78%</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">across 4 course tracks</div>
                  </div>

                  <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">BEHIND (&lt;70%)</div>
                    <div className="text-3xl font-black text-blue-600 tracking-tight mt-1">1</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">need a nudge</div>
                  </div>

                  <div className="bg-white border border-teal-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">FULLY CERTIFIED</div>
                    <div className="text-3xl font-black text-teal-600 tracking-tight mt-1">0</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">of 4 counsellors</div>
                  </div>

                  <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">COURSE TRACKS</div>
                    <div className="text-3xl font-black text-amber-500 tracking-tight mt-1">4</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">in the HR LMS</div>
                  </div>
                </div>

                {/* Main Card 1: My Responsibilities · LMS */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span>🧩</span> My Responsibilities · LMS
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      What you own as Branch Manager for your team's learning.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">✓</div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">Ensure every counsellor completes mandatory modules</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Brand, SOP, payment & placement modules gate lead access — no one should be stuck.</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">📈</div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">Keep the branch team above 70% completion</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Below 70% on a course means that counsellor can't take its leads — it shrinks your pool.</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">🔔</div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">Nudge anyone falling behind</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Use the team table below to send reminders; escalate to the team lead if it persists.</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">🏅</div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">Approve Level 1–2 internal certifications</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Branch-level sign-off on counsellor certification before management reviews L3–L5.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Card 2: Team LMS Progress */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <span>👥</span> Team LMS Progress
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">1 behind</span>
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Course completion for every counsellor on your team. Modules gate which leads they can take — anyone under 70% needs a push.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/80 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                          <th className="py-2.5 px-3">Counsellor</th>
                          <th className="py-2.5 px-3">CPC</th>
                          <th className="py-2.5 px-3">Medical Billing</th>
                          <th className="py-2.5 px-3">AR Calling</th>
                          <th className="py-2.5 px-3">RCM</th>
                          <th className="py-2.5 px-3">Avg</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-extrabold text-slate-900 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center">K</div>
                            <span>Kavitha N.</span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-[11px] font-mono font-bold">72%</div>
                            <div className="w-20 bg-slate-100 rounded-full h-1 overflow-hidden mt-0.5"><div className="bg-emerald-600 h-full w-[72%]" /></div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-[11px] font-mono font-bold">78%</div>
                            <div className="w-20 bg-slate-100 rounded-full h-1 overflow-hidden mt-0.5"><div className="bg-emerald-600 h-full w-[78%]" /></div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-[11px] font-mono font-bold">78%</div>
                            <div className="w-20 bg-slate-100 rounded-full h-1 overflow-hidden mt-0.5"><div className="bg-emerald-600 h-full w-[78%]" /></div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-[11px] font-mono font-bold">78%</div>
                            <div className="w-20 bg-slate-100 rounded-full h-1 overflow-hidden mt-0.5"><div className="bg-emerald-600 h-full w-[78%]" /></div>
                          </td>
                          <td className="py-3 px-3 font-bold font-mono text-slate-900">71%</td>
                          <td className="py-3 px-3 text-right">
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">✓ ON TRACK</span>
                          </td>
                        </tr>

                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-extrabold text-slate-900 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-teal-500 text-white font-extrabold text-xs flex items-center justify-center">M</div>
                            <span>Meera R.</span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-[11px] font-mono font-bold">99%</div>
                            <div className="w-20 bg-slate-100 rounded-full h-1 overflow-hidden mt-0.5"><div className="bg-emerald-600 h-full w-[99%]" /></div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-[11px] font-mono font-bold">98%</div>
                            <div className="w-20 bg-slate-100 rounded-full h-1 overflow-hidden mt-0.5"><div className="bg-emerald-600 h-full w-[98%]" /></div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-[11px] font-mono font-bold">97%</div>
                            <div className="w-20 bg-slate-100 rounded-full h-1 overflow-hidden mt-0.5"><div className="bg-emerald-600 h-full w-[97%]" /></div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-[11px] font-mono font-bold">96%</div>
                            <div className="w-20 bg-slate-100 rounded-full h-1 overflow-hidden mt-0.5"><div className="bg-emerald-600 h-full w-[96%]" /></div>
                          </td>
                          <td className="py-3 px-3 font-bold font-mono text-slate-900">98%</td>
                          <td className="py-3 px-3 text-right">
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">✓ ON TRACK</span>
                          </td>
                        </tr>

                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-extrabold text-slate-900 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-extrabold text-xs flex items-center justify-center">A</div>
                            <span>Anitha S.</span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-[11px] font-mono font-bold">98%</div>
                            <div className="w-20 bg-slate-100 rounded-full h-1 overflow-hidden mt-0.5"><div className="bg-emerald-600 h-full w-[98%]" /></div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-[11px] font-mono font-bold">81%</div>
                            <div className="w-20 bg-slate-100 rounded-full h-1 overflow-hidden mt-0.5"><div className="bg-emerald-600 h-full w-[81%]" /></div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-[11px] font-mono font-bold">95%</div>
                            <div className="w-20 bg-slate-100 rounded-full h-1 overflow-hidden mt-0.5"><div className="bg-emerald-600 h-full w-[95%]" /></div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-[11px] font-mono font-bold">78%</div>
                            <div className="w-20 bg-slate-100 rounded-full h-1 overflow-hidden mt-0.5"><div className="bg-emerald-600 h-full w-[78%]" /></div>
                          </td>
                          <td className="py-3 px-3 font-bold font-mono text-slate-900">88%</td>
                          <td className="py-3 px-3 text-right">
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">✓ ON TRACK</span>
                          </td>
                        </tr>

                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-extrabold text-slate-900 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-400 text-white font-extrabold text-xs flex items-center justify-center">S</div>
                            <span>Suresh M.</span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-[11px] font-mono font-bold">72%</div>
                            <div className="w-20 bg-slate-100 rounded-full h-1 overflow-hidden mt-0.5"><div className="bg-emerald-600 h-full w-[72%]" /></div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-[11px] font-mono font-bold text-amber-700">59%</div>
                            <div className="w-20 bg-slate-100 rounded-full h-1 overflow-hidden mt-0.5"><div className="bg-amber-500 h-full w-[59%]" /></div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-[11px] font-mono font-bold text-amber-700">48%</div>
                            <div className="w-20 bg-slate-100 rounded-full h-1 overflow-hidden mt-0.5"><div className="bg-amber-500 h-full w-[48%]" /></div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-[11px] font-mono font-bold text-rose-600">37%</div>
                            <div className="w-20 bg-slate-100 rounded-full h-1 overflow-hidden mt-0.5"><div className="bg-rose-500 h-full w-[37%]" /></div>
                          </td>
                          <td className="py-3 px-3 font-bold font-mono text-rose-600">54%</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => showToast('🔔 Nudge notification sent to Suresh M.!')}
                              className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-700"
                            >
                              Nudge
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Main Card 3: Embedded HR Learning Management System */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span>📊</span> HR Learning Management System — <span className="text-slate-400 font-normal">same as the HR portal</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      The exact LMS your counsellors use — every module, script, assessment and certification. Browse it here so you know what your team is learning.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 pt-2 border-t border-slate-100">
                    {/* LMS Sub Sidebar */}
                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider mb-1.5">LEARNING SYSTEM</div>
                        <div className="space-y-1">
                          <button className="w-full text-left px-3 py-2 rounded-xl bg-amber-600 text-white font-bold">Home</button>
                          <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold">My HR Profile</button>
                          <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold">Course Eligibility</button>
                          <button className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold">My Learning</button>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider mb-1.5">MANDATORY MODULES</div>
                        <div className="space-y-1 text-slate-600">
                          <div className="px-3 py-1.5 flex justify-between items-center"><span>Brand Training</span><span>🔒</span></div>
                          <div className="px-3 py-1.5 flex justify-between items-center"><span>Career Basics</span><span>🔒</span></div>
                          <div className="px-3 py-1.5 flex justify-between items-center font-bold text-slate-900"><span>Lead Handling SOP</span><span>🔒</span></div>
                          <div className="px-3 py-1.5 flex justify-between items-center"><span>Payment & Admission SOP</span><span>🔒</span></div>
                          <div className="px-3 py-1.5 flex justify-between items-center"><span>Placement Explanation</span><span>🔒</span></div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider mb-1.5">GUIDES</div>
                        <div className="space-y-1 text-slate-600">
                          <div className="px-3 py-1.5">Course Recommendation</div>
                          <div className="px-3 py-1.5">Demo Booking & Handover</div>
                          <div className="px-3 py-1.5 flex justify-between items-center"><span>Certification Explanation</span><span>🔒</span></div>
                        </div>
                      </div>
                    </div>

                    {/* LMS Portal Body */}
                    <div className="space-y-4">
                      {/* Good afternoon Banner */}
                      <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-amber-700 rounded-2xl p-5 text-white flex justify-between items-center">
                        <div>
                          <h2 className="text-xl font-black">Good afternoon, Kavitha</h2>
                          <p className="text-xs text-teal-100 mt-0.5">CBE-Saravanampatti · Complete your modules to unlock more courses</p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-black">2</div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-amber-200">CERT LEVEL</div>
                        </div>
                      </div>

                      {/* 4 Cards */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                          <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">LMS COMPLETION</div>
                          <div className="text-2xl font-black text-slate-900 mt-1">68%</div>
                          <div className="text-[10px] text-slate-500">11 of 18 modules</div>
                        </div>

                        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                          <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">COURSE KNOWLEDGE</div>
                          <div className="text-2xl font-black text-amber-600 mt-1">82%</div>
                          <div className="text-[10px] text-slate-500">avg test score</div>
                        </div>

                        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                          <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">CALL AUDIT</div>
                          <div className="text-2xl font-black text-blue-600 mt-1">91%</div>
                          <div className="text-[10px] text-slate-500">last review</div>
                        </div>

                        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                          <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">CONVERSION</div>
                          <div className="text-2xl font-black text-slate-400 mt-1">—</div>
                          <div className="text-[10px] text-slate-500">this month</div>
                        </div>
                      </div>

                      {/* Mandatory Pending Modules Box */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span className="text-amber-500">⚠️</span> Mandatory Pending Modules
                          </h4>
                          <p className="text-[11px] text-slate-500">Complete these — some leads are locked until you do</p>
                        </div>

                        <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white font-bold text-xs flex items-center justify-center">⏳</div>
                            <div>
                              <h5 className="text-xs font-extrabold text-slate-900">Lead Handling SOP</h5>
                              <p className="text-[10px] text-slate-500">11 videos · 6 PDFs · test</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">88%</span>
                            <button onClick={() => showToast('Resumed Lead Handling SOP module')} className="px-3 py-1 rounded-lg bg-teal-700 text-white font-bold text-[10px] hover:bg-teal-800">Resume</button>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white font-bold text-xs flex items-center justify-center">🔒</div>
                            <div>
                              <h5 className="text-xs font-extrabold text-slate-900">Placement Explanation (strict)</h5>
                              <p className="text-[10px] text-slate-500">policy + test · 88% to pass</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">NOT STARTED</span>
                            <button onClick={() => showToast('Started Placement Explanation module')} className="px-3 py-1 rounded-lg bg-teal-700 text-white font-bold text-[10px] hover:bg-teal-800">Start</button>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white font-bold text-xs flex items-center justify-center">🔒</div>
                            <div>
                              <h5 className="text-xs font-extrabold text-slate-900">Payment & Admission SOP</h5>
                              <p className="text-[10px] text-slate-500">6 docs + quiz</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">NOT STARTED</span>
                            <button onClick={() => showToast('Started Payment & Admission SOP module')} className="px-3 py-1 rounded-lg bg-teal-700 text-white font-bold text-[10px] hover:bg-teal-800">Start</button>
                          </div>
                        </div>
                      </div>

                      {/* Course Eligibility Summary Box */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span>📋</span> Course Eligibility Summary
                          </h4>
                          <p className="text-[11px] text-slate-500">What you can counsel right now</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div>
                            <div className="text-2xl font-black text-emerald-600">6</div>
                            <div className="text-[11px] text-slate-600 font-semibold">✓ Courses you can counsel</div>
                          </div>
                          <div>
                            <div className="text-2xl font-black text-rose-600">14</div>
                            <div className="text-[11px] text-slate-600 font-semibold">🔒 Locked — finish the module first</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Switch Branch Modal */}
      {isSwitchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Switch Branch</h3>
              <button
                onClick={() => setIsSwitchModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(allBranches.length > 0
                ? allBranches
                : [
                    { name: 'CBE-Gandhipuram', city: 'Coimbatore', code: 'GPM' },
                    { name: 'CBE-Saravanampatti', city: 'Coimbatore', code: 'SAR' },
                    { name: 'Salem', city: 'Tamil Nadu', code: 'SLM' },
                    { name: 'CBE-Tiruppur', city: 'Tiruppur', code: 'TPR' },
                    { name: 'CBE-Erode', city: 'Erode', code: 'ERD' }
                  ]
              ).map((b) => (
                <button
                  key={b.name}
                  onClick={() => {
                    if (onSwitchBranch) onSwitchBranch(b);
                    setIsSwitchModalOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                    b.name === branchName
                      ? 'border-purple-600 bg-purple-50/60 text-purple-900 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-extrabold">{b.name}</div>
                    <div className="text-[10px] text-slate-400">{b.city}</div>
                  </div>
                  {b.name === branchName && <Check className="w-4 h-4 text-purple-700" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal when clicking Counsellor / Lead */}
      {selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">{selectedPerson.name}</h3>
              <button
                onClick={() => setSelectedPerson(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2 text-slate-600">
              {selectedPerson.code && (
                <div className="p-2 rounded bg-slate-50 border border-slate-100 font-mono">
                  ID Code: {selectedPerson.code}
                </div>
              )}
              {selectedPerson.calls !== undefined && (
                <div>Dials Today: <strong>{selectedPerson.calls} calls</strong> ({selectedPerson.pickup} pickup rate)</div>
              )}
              {selectedPerson.counsellors !== undefined && (
                <div>Assigned Counsellors: <strong>{selectedPerson.counsellors} team members</strong></div>
              )}
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                Active in {branchName} branch floor operations.
              </div>
            </div>

            <button
              onClick={() => setSelectedPerson(null)}
              className="w-full py-2 rounded-xl bg-purple-700 text-white text-xs font-bold cursor-pointer hover:bg-purple-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
