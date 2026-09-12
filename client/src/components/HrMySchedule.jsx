import React, { useState } from 'react';
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
  Check
} from 'lucide-react';

export default function HrMySchedule({ isOnBreak, setIsOnBreak }) {
  const [activeHolidayTab, setActiveHolidayTab] = useState('india'); // india, international
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [showCatalogModal, setShowCatalogModal] = useState(false);

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
  const [leaveRequests, setLeaveRequests] = useState([
    {
      id: 'l1',
      date: '12 May',
      title: 'Casual Leave · 1 day · personal work',
      status: 'APPROVED',
      statusClass: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 'l2',
      date: '28 Apr',
      title: 'Sick Leave · 2 days · fever',
      status: 'APPROVED',
      statusClass: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 'l3',
      date: '2 Jun',
      title: 'Earned Leave · 3 days · family function',
      status: 'PENDING',
      statusClass: 'bg-amber-100 text-amber-800'
    }
  ]);

  // New leave form
  const [newLeave, setNewLeave] = useState({
    type: 'Casual Leave',
    days: '1 day',
    date: '10 Jun',
    reason: ''
  });

  const handleApplyLeave = (e) => {
    e.preventDefault();
    if (!newLeave.reason) {
      showToast('Please state a reason for your leave request');
      return;
    }
    const created = {
      id: `l-${Date.now()}`,
      date: newLeave.date,
      title: `${newLeave.type} · ${newLeave.days} · ${newLeave.reason}`,
      status: 'PENDING',
      statusClass: 'bg-amber-100 text-amber-800'
    };
    setLeaveRequests([created, ...leaveRequests]);
    setShowLeaveModal(false);
    setNewLeave({
      type: 'Casual Leave',
      days: '1 day',
      date: '10 Jun',
      reason: ''
    });
    showToast('✓ Submitted leave request to Priyadharshini');
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

  // Shift days
  const SHIFT_DAYS = [
    { day: 'MON 19', timing: '10–7' },
    { day: 'TUE 20', timing: '10–7' },
    { day: 'WED 21', timing: '10–7', isToday: true },
    { day: 'THU 22', timing: '10–7' },
    { day: 'FRI 23', timing: '12–9' },
    { day: 'SAT 24', timing: '12–9' },
    { day: 'SUN 25', timing: 'Week Off', isOff: true },
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
          Shift roster · breaks · leave · holidays — everything about your work time
        </p>
      </div>

      {/* Top Row - 2 Main Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Card: My Shift Roster (approx 7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">📅</span>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">My Shift Roster</h3>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Set by Priyadharshini (Branch Manager) · Week of 19–25 May
            </p>
          </div>

          {/* Weekday Pills Row */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {SHIFT_DAYS.map((shift, idx) => (
              <div
                key={idx}
                className={`rounded-xl p-2 text-center border transition-all flex flex-col justify-between min-h-[58px] ${
                  shift.isToday
                    ? 'border-2 border-[#00897b] bg-[#e6fffa] text-[#00695c] shadow-xs'
                    : shift.isOff
                      ? 'bg-[#fee2e2] text-[#b91c1c] border-red-200 font-bold'
                      : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <div className="text-[9.5px] font-extrabold tracking-wider font-mono">
                  {shift.day}
                </div>
                <div className={`text-[11px] font-black ${
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
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">My Leave Requests</h3>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Recent applications and their status
          </p>
        </div>

        <div className="space-y-2 divide-y divide-slate-100">
          {leaveRequests.map((req) => (
            <div key={req.id} className="flex items-center justify-between pt-2.5 first:pt-0 text-xs">
              <div className="flex items-center gap-4">
                <span className="font-mono text-slate-400 text-[11px] w-14">{req.date}</span>
                <span className="font-semibold text-slate-800">{req.title}</span>
              </div>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider ${req.statusClass}`}>
                {req.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Course Catalog Button */}
      <div className="pt-2">
        <button
          onClick={() => setShowCatalogModal(true)}
          className="flex items-center gap-2 bg-[#fef3c7] hover:bg-[#fde68a] text-[#92400e] border border-amber-300 font-bold text-xs py-2.5 px-4 rounded-full shadow-sm transition-all hover:scale-[1.02] active:scale-95"
        >
          <span>💡</span>
          <span>Course Catalog</span>
        </button>
      </div>

      {/* Apply for Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">✉️</span>
                <h3 className="font-extrabold text-slate-900 text-base">Apply for Leave</h3>
              </div>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Leave Type</label>
                <select
                  value={newLeave.type}
                  onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-[#00897b] focus:bg-white text-xs"
                >
                  <option value="Casual Leave">Casual Leave (CL)</option>
                  <option value="Sick Leave">Sick Leave (SL)</option>
                  <option value="Earned Leave">Earned Leave (EL)</option>
                  <option value="Comp Off">Compensatory Off</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Duration</label>
                  <select
                    value={newLeave.days}
                    onChange={(e) => setNewLeave({ ...newLeave, days: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 outline-none focus:border-[#00897b] focus:bg-white text-xs"
                  >
                    <option value="1 day">1 day</option>
                    <option value="2 days">2 days</option>
                    <option value="3 days">3 days</option>
                    <option value="Half day (Morning)">Half day (Morning)</option>
                    <option value="Half day (Evening)">Half day (Evening)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Date</label>
                  <input
                    type="text"
                    placeholder="e.g. 10 Jun"
                    value={newLeave.date}
                    onChange={(e) => setNewLeave({ ...newLeave, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 outline-none focus:border-[#00897b] focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Reason</label>
                <textarea
                  rows="2"
                  required
                  placeholder="e.g. Family function, personal work, doctor appointment"
                  value={newLeave.reason}
                  onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-[#00897b] focus:bg-white text-xs"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#00897b] hover:bg-[#00796b] text-white font-bold rounded-xl text-xs transition-all shadow-sm"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Catalog Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-amber-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💡</span>
                <h3 className="font-extrabold text-slate-900 text-base">Thoughtflows Medical Coding Catalog</h3>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200">
                <div className="font-bold text-teal-950 text-sm">CPC Intensive (AAPC Certified)</div>
                <div className="text-teal-700 mt-0.5">Duration: 3 Months • Anatomy, ICD-10-CM, CPT, HCPCS Level II</div>
                <div className="text-teal-900 font-black mt-1">Fee: ₹25,000</div>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200">
                <div className="font-bold text-purple-950 text-sm">Comprehensive Medical Coding + Live Hospital Internship</div>
                <div className="text-purple-700 mt-0.5">Duration: 4.5 Months • US Healthcare RCM + Live EHR charting</div>
                <div className="text-purple-900 font-black mt-1">Fee: ₹32,000 (100% Placement Guarantee)</div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="font-bold text-amber-950 text-sm">Fast-Track Weekend Batch for Life Science Graduates</div>
                <div className="text-amber-700 mt-0.5">Duration: 8 Weeks • Saturday & Sunday • Mock Tests & AAPC Exam Prep</div>
                <div className="text-amber-900 font-black mt-1">Fee: ₹21,000</div>
              </div>
            </div>

            <button
              onClick={() => setShowCatalogModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all"
            >
              Close Catalog
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
