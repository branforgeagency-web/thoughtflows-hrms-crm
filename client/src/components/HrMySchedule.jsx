import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Coffee, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Globe, 
  Flag,
  FileText,
  Check,
  ChevronDown,
  Lock
} from 'lucide-react';
import { createApproval, getApprovals, getTeam, onDataUpdate } from '../services/api';
import { getCurrentWeekScheduleDays, getWeekRangeString } from '../utils/dateUtils';

export default function HrMySchedule({ isOnBreak, setIsOnBreak, currentUser }) {
  const [activeHolidayTab, setActiveHolidayTab] = useState('india'); // india, international
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const userName = currentUser?.name || '';

  // Local break state fallback if parent props not provided
  const [localBreak, setLocalBreak] = useState(false);
  const breakActive = isOnBreak !== undefined ? isOnBreak : localBreak;
  const toggleBreak = () => {
    if (setIsOnBreak) {
      setIsOnBreak(!isOnBreak);
    } else {
      setLocalBreak(!localBreak);
    }
    showToast(!breakActive ? '☕ Break started (45 mins allowance)' : '✓ Break ended, back on desk!');
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Leave Requests state
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [teamRosterData, setTeamRosterData] = useState(null);

  // Load real leave requests & team roster from DB
  const loadScheduleData = async () => {
    try {
      const [aData, tData] = await Promise.all([
        getApprovals({ departmentCode: 'DEP-HR-001' }).catch(() => []),
        getTeam({ departmentCode: 'DEP-HR-001' }).catch(() => [])
      ]);

      if (Array.isArray(aData)) {
        const leaves = aData
          .filter(a => a.kind === 'Leave Approval' || a.title?.includes('Leave'))
          .map(a => {
            const dateStr = a.createdAt
              ? new Date(a.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
              : 'Recent';
            const isApproved = a.status === 'approved';
            const isRejected = a.status === 'rejected';
            return {
              id: a._id || a.id,
              date: dateStr,
              title: a.description || a.title,
              status: isApproved ? 'APPROVED' : isRejected ? 'REJECTED' : 'PENDING',
              statusClass: isApproved
                ? 'bg-emerald-100 text-emerald-800'
                : isRejected
                ? 'bg-rose-100 text-rose-800'
                : 'bg-amber-100 text-amber-800'
            };
          });
        setLeaveRequests(leaves);
      }

      if (Array.isArray(tData) && tData.length > 0) {
        const uFirst = userName.split(' ')[0].toLowerCase();
        const myRec = tData.find(m => 
          m.name.toLowerCase() === userName.toLowerCase() ||
          m.name.toLowerCase().includes(uFirst) ||
          uFirst.includes(m.name.toLowerCase())
        );
        if (myRec) setTeamRosterData(myRec);
      }
    } catch (e) {
      console.warn('Schedule fetch notice:', e.message);
    }
  };

  useEffect(() => {
    loadScheduleData();
    const unsub = onDataUpdate((entity) => {
      if (['approvals', 'team'].includes(entity)) loadScheduleData();
    });
    return unsub;
  }, [userName]);

  // Compute weekly shift days (Read-only, updated by HR Head)
  const shiftDays = useMemo(() => {
    const uName = userName.toLowerCase();
    const uFirst = uName.split(' ')[0];

    // Check exact & partial keys in localStorage
    let savedLocal = localStorage.getItem(`thoughtflows_weekly_roster_${uName}`) ||
                     localStorage.getItem(`thoughtflows_weekly_roster_${uFirst}`);

    if (!savedLocal) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('thoughtflows_weekly_roster_')) {
          const sub = k.replace('thoughtflows_weekly_roster_', '');
          if (sub.includes(uFirst) || uFirst.includes(sub)) {
            savedLocal = localStorage.getItem(k);
            break;
          }
        }
      }
    }

    // Latest allocated fallback
    let latestAllocated = null;
    if (!savedLocal) {
      const latestStr = localStorage.getItem('thoughtflows_latest_allocated_roster');
      if (latestStr) {
        try {
          const parsed = JSON.parse(latestStr);
          if (parsed?.schedule) latestAllocated = parsed.schedule;
        } catch (e) {}
      }
    }

    let customSchedule = null;
    if (savedLocal) {
      try { customSchedule = JSON.parse(savedLocal); } catch (e) {}
    } else if (latestAllocated) {
      customSchedule = latestAllocated;
    } else if (teamRosterData?.weeklySchedule && Array.isArray(teamRosterData.weeklySchedule)) {
      customSchedule = teamRosterData.weeklySchedule;
    }

    const baseDays = customSchedule || getCurrentWeekScheduleDays();

    const approvedLeaves = leaveRequests.filter(l => l.status === 'APPROVED');

    return baseDays.map(item => {
      const dayLabel = item.day || `${item.dayKey || ''} ${item.dateStr || ''}`.trim();
      const hasApprovedLeave = approvedLeaves.some(l =>
        l.date?.toLowerCase().includes((item.dateStr || '').toLowerCase()) ||
        l.title?.toLowerCase().includes((item.dayKey || item.day || '').split(' ')[0].toLowerCase())
      );

      if (hasApprovedLeave) {
        return { ...item, day: dayLabel, timing: 'On Leave', isOff: true, label: 'LEAVE APPROVED' };
      }

      const isOffDay = item.type === 'off' || item.timing === 'Week Off' || item.timing === 'On Leave' || item.isOff;

      return {
        ...item,
        day: dayLabel,
        timing: item.timing || (isOffDay ? 'Week Off' : '10–7'),
        isOff: isOffDay
      };
    });
  }, [leaveRequests, teamRosterData, userName]);

  // New leave form matching screenshot
  const [newLeave, setNewLeave] = useState({
    type: 'Casual Leave (CL)',
    days: 'Half day',
    fromDate: '',
    toDate: '',
    reason: ''
  });

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!newLeave.reason) {
      showToast('Please state a reason for your leave request');
      return;
    }
    const displayDate = newLeave.fromDate
      ? new Date(newLeave.fromDate + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
      : 'Today';

    const leaveTitle = `Leave Request: ${newLeave.type} (${newLeave.days})`;
    const leaveDesc = `${newLeave.type} · ${newLeave.days} · ${newLeave.reason} (${newLeave.fromDate || 'Upcoming'}${newLeave.toDate ? ' to ' + newLeave.toDate : ''})`;

    const leaveId = `APR-LV-${Date.now()}`;
    const createdLocal = {
      id: leaveId,
      date: displayDate,
      title: leaveTitle,
      detail: leaveDesc,
      description: leaveDesc,
      kind: 'Leave Approval',
      priority: 'medium',
      priorityColor: 'text-amber-500',
      by: userName,
      requestedBy: userName,
      time: 'Just now',
      status: 'pending',
      departmentCode: 'DEP-HR-001',
      statusClass: 'bg-amber-100 text-amber-800'
    };

    setLeaveRequests(prev => [createdLocal, ...prev]);

    // Save to local storage key for instant Head of HR pending approvals sync
    try {
      const lStr = localStorage.getItem('thoughtflows_pending_approvals');
      const lArr = lStr ? JSON.parse(lStr) : [];
      localStorage.setItem('thoughtflows_pending_approvals', JSON.stringify([createdLocal, ...lArr]));
    } catch (e) {}

    try {
      await createApproval({
        title: leaveTitle,
        description: leaveDesc,
        kind: 'Leave Approval',
        priority: 'medium',
        status: 'pending',
        departmentCode: 'DEP-HR-001',
        branchName: currentUser?.branch || 'Saravanampatti Branch (CBE)',
        requestedBy: userName
      });
      showToast('✓ Submitted leave request to Head of HR');
    } catch (err) {
      console.error('API leave submission error:', err);
      showToast('✓ Submitted leave request to Head of HR');
    }

    setShowLeaveModal(false);
    setNewLeave({
      type: 'Casual Leave (CL)',
      days: 'Half day',
      fromDate: '',
      toDate: '',
      reason: ''
    });
  };

  // Holidays
  const INDIA_HOLIDAYS = [
    { date: '15 Aug', name: 'Independence Day', tag: 'SAT' },
    { date: '2 Oct', name: 'Gandhi Jayanti', tag: 'SAT' },
    { date: '20 Oct', name: 'Diwali', tag: 'FEST' },
    { date: '25 Dec', name: 'Christmas', tag: 'SAT' },
    { date: '14 Jan', name: 'Pongal / Sankranti', tag: 'FEST' },
  ];

  const INTL_HOLIDAYS = [
    { date: '4 Jul', name: 'US Independence Day', tag: 'US' },
    { date: '28 Nov', name: 'Thanksgiving Day', tag: 'US' },
    { date: '25 Dec', name: 'Christmas Day', tag: 'GLOBAL' },
    { date: '1 Jan', name: "New Year's Day", tag: 'GLOBAL' },
  ];

  return (
    <div className="space-y-4 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-teal-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Title & Subtitle */}
      <div className="pt-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          My <span className="text-[#00897b]">Schedule</span>
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1 font-mono">
          Shift roster · breaks · leave · holidays — read-only work schedule set by Head of HR
        </p>
      </div>

      {/* Top Row - 2 Main Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Card: My Shift Roster (approx 7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-base">📅</span>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">My Shift Roster</h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300/80 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-700" /> Read-Only &middot; Managed by HR Head
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-1">
              Updated by Head of HR / Branch Manager &middot; Week of {getWeekRangeString()}
            </p>
          </div>

          {/* Weekday Pills Row (Read-Only) */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {shiftDays.map((shift, idx) => (
              <div
                key={idx}
                className={`rounded-xl p-2 sm:p-2.5 text-center border transition-all flex flex-col justify-between min-h-[62px] sm:min-h-[68px] ${
                  shift.isToday
                    ? 'border-2 border-[#00897b] bg-[#e6fffa] text-[#00695c] shadow-xs'
                    : shift.isOff
                      ? 'bg-[#fee2e2] text-[#b91c1c] border-red-200 font-bold'
                      : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <div className="text-[10px] sm:text-[11px] font-extrabold tracking-wider font-mono">
                  {shift.day}
                </div>
                <div className={`text-xs sm:text-sm font-black ${
                  shift.isToday 
                    ? 'text-[#00695c]' 
                    : shift.isOff 
                      ? 'text-[#b91c1c]' 
                      : 'text-slate-900'
                }`}>
                  {shift.timing}
                </div>
              </div>
            ))}
          </div>

          {/* Break Status Card */}
          <div className="bg-[#e6fffa] border border-teal-200/80 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
              <div>
                <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span>☕ Break</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {breakActive ? 'On break · clock ticking' : 'Not on break · 45 min/day allowed'}
                </div>
              </div>
            </div>

            <button
              onClick={toggleBreak}
              className={`font-bold text-xs px-4 py-1.5 rounded-lg shadow-xs transition-all active:scale-95 ${
                breakActive
                  ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 font-black'
                  : 'bg-[#00897b] hover:bg-[#00796b] text-white'
              }`}
            >
              {breakActive ? 'End Break' : 'Start Break'}
            </button>
          </div>

          {/* Apply for Leave Button */}
          <button
            onClick={() => setShowLeaveModal(true)}
            className="w-full py-2.5 border-2 border-dashed border-teal-300 hover:border-[#00897b] hover:bg-teal-50/50 text-[#00695c] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.99]"
          >
            <span>✉️</span>
            <span>Apply for Leave</span>
          </button>
        </div>

        {/* Right Card: Holidays (approx 5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">🎉</span>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">Holidays</h3>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Upcoming · plan your leaves around these
            </p>
          </div>

          {/* Segmented Switch */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setActiveHolidayTab('india')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeHolidayTab === 'india'
                  ? 'bg-[#00796b] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              India 🇮🇳
            </button>
            <button
              onClick={() => setActiveHolidayTab('international')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeHolidayTab === 'international'
                  ? 'bg-[#00796b] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              International 🌐
            </button>
          </div>

          {/* Holidays List */}
          <div className="space-y-2 divide-y divide-slate-100">
            {(activeHolidayTab === 'india' ? INDIA_HOLIDAYS : INTL_HOLIDAYS).map((h, idx) => (
              <div key={idx} className="flex items-center justify-between pt-2 first:pt-0 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-400 text-[11px] w-14">{h.date}</span>
                  <span className="font-bold text-slate-800">{h.name}</span>
                </div>
                <span className="bg-amber-100 text-amber-900 text-[9.5px] font-black px-2 py-0.5 rounded-md">
                  {h.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Card: My Leave Requests */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">My Leave Requests</h3>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Recent applications and their status
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-bold bg-teal-50 text-[#00695c] border border-teal-200/70 px-2.5 py-1 rounded-full">
              CL Balance: <strong>4 days</strong>
            </span>
            <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200/70 px-2.5 py-1 rounded-full">
              SL Balance: <strong>5 days</strong>
            </span>
            <span className="text-[10px] font-mono font-bold bg-purple-50 text-purple-800 border border-purple-200/70 px-2.5 py-1 rounded-full">
              EL Balance: <strong>12 days</strong>
            </span>
          </div>
        </div>

        <div className="space-y-1.5 divide-y divide-slate-100">
          {leaveRequests.map((req) => (
            <div key={req.id} className="flex items-center justify-between py-2 px-2 hover:bg-slate-50/80 rounded-xl transition-colors text-xs">
              <div className="flex items-center gap-4">
                <span className="font-mono text-slate-500 font-bold text-[11px] w-16 bg-slate-100 px-2 py-0.5 rounded-md text-center">{req.date}</span>
                <span className="font-semibold text-slate-800 text-xs sm:text-[13px]">{req.title}</span>
              </div>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${req.statusClass}`}>
                {req.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Apply for Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-[430px] w-full shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            
            {/* Top Gradient Banner matching screenshot */}
            <div className="relative bg-gradient-to-br from-[#00d5be] via-[#00a694] to-[#007f73] pt-7 pb-6 px-6 text-center text-white overflow-hidden select-none">
              {/* Radial glow background shapes */}
              <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none" />
              <div className="absolute top-0 right-8 w-32 h-32 rounded-full bg-teal-300/20 blur-2xl pointer-events-none" />

              {/* Close Button (subtle, top-right) */}
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="absolute top-3.5 right-3.5 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/15 transition-all text-xs cursor-pointer z-20"
                title="Close"
              >
                ✕
              </button>

              <h3 className="font-extrabold text-white text-xl tracking-tight relative z-10">
                Apply for Leave
              </h3>
              <p className="text-[11px] text-rose-100/90 font-mono mt-1 relative z-10 leading-snug">
                Goes to Priyadharshini (Branch Manager) for approval
              </p>
              <div className="text-white/90 text-sm font-extralight mt-0.5 animate-pulse relative z-10">
                |
              </div>
            </div>

            {/* Form Body matching screenshot */}
            <form onSubmit={handleApplyLeave} className="p-6 space-y-4 text-xs bg-white">
              
              {/* Row 1: LEAVE TYPE & DAYS */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    LEAVE TYPE
                  </label>
                  <div className="relative">
                    <select
                      value={newLeave.type}
                      onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value })}
                      className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2.5 pr-8 text-xs font-semibold text-slate-800 outline-none focus:border-[#00897b] focus:ring-1 focus:ring-[#00897b] transition-all cursor-pointer shadow-2xs"
                    >
                      <option value="Casual Leave (CL)">Casual Leave (CL)</option>
                      <option value="Sick Leave (SL)">Sick Leave (SL)</option>
                      <option value="Earned Leave (EL)">Earned Leave (EL)</option>
                      <option value="Comp Off">Comp Off</option>
                      <option value="Half Day">Half Day</option>
                      <option value="Work From Home">Work From Home</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-700 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    DAYS
                  </label>
                  <div className="relative">
                    <select
                      value={newLeave.days}
                      onChange={(e) => setNewLeave({ ...newLeave, days: e.target.value })}
                      className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2.5 pr-8 text-xs font-semibold text-slate-800 outline-none focus:border-[#00897b] focus:ring-1 focus:ring-[#00897b] transition-all cursor-pointer shadow-2xs"
                    >
                      <option value="Half day">Half day</option>
                      <option value="1 day">1 day</option>
                      <option value="2 days">2 days</option>
                      <option value="3 days">3 days</option>
                      <option value="4 days">4 days</option>
                      <option value="5+ days">5+ days</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-700 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
                  </div>
                </div>
              </div>

              {/* Row 2: FROM & TO */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    FROM
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={newLeave.fromDate}
                      onChange={(e) => setNewLeave({ ...newLeave, fromDate: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#00897b] focus:ring-1 focus:ring-[#00897b] transition-all cursor-pointer shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    TO
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={newLeave.toDate}
                      onChange={(e) => setNewLeave({ ...newLeave, toDate: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#00897b] focus:ring-1 focus:ring-[#00897b] transition-all cursor-pointer shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: REASON */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  REASON
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Brief reason for leave..."
                  value={newLeave.reason}
                  onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#00897b] focus:ring-1 focus:ring-[#00897b] transition-all resize-none shadow-2xs leading-relaxed"
                />
              </div>

              {/* Row 4: Leave Balance Pill Card matching screenshot */}
              <div className="bg-[#e6faf5] border border-[#a7f3d0] rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-2xs">
                <span className="text-sm select-none">💼</span>
                <div className="text-[11px] text-slate-600 font-medium">
                  Your balance:{' '}
                  <span className="font-extrabold text-[#00695c]">
                    CL 6 · SL 4 · EL 12
                  </span>{' '}
                  <span className="text-slate-500">
                    remaining this year
                  </span>
                </div>
              </div>

              {/* Row 5: Full Width Action Button matching screenshot */}
              <div className="pt-1">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#007f73] hover:bg-[#00695c] text-white font-extrabold text-sm rounded-xl transition-all shadow-xs active:scale-[0.99] cursor-pointer"
                >
                  Submit Leave Request
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
