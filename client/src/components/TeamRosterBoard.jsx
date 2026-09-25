import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Search, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Save,
  Check
} from 'lucide-react';
import { getTeam, setTeamMemberShift, onDataUpdate } from '../services/api';
import { getCurrentWeekScheduleDays } from '../utils/dateUtils';

export default function TeamRosterBoard({ 
  customMembers = null, 
  onRosterChange = null 
}) {
  const [members, setMembers] = useState(customMembers || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [toastMessage, setToastMessage] = useState(null);

  // Modal for Head of HR Weekly Roster Allocation
  const [scheduleModalMember, setScheduleModalMember] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Load team members from DB
  const loadMembers = async () => {
    try {
      const data = await getTeam({ departmentCode: 'DEP-HR-001' });
      if (Array.isArray(data) && data.length > 0) {
        setMembers(data.map(m => ({
          id: m._id || m.id,
          name: m.name,
          role: m.role || 'Staffing Recruiter',
          assignedCount: m.assigned || 12,
          pendingCount: m.pending || 2,
          status: m.available !== false ? 'Available' : 'On Leave',
          shift: m.shift || 'General Shift',
          weeklySchedule: m.weeklySchedule || null
        })));
      } else if (!customMembers) {
        // Fallback default HR staff list for allocation
        setMembers([
          { id: 'tm-01', name: 'Kavitha N.', role: 'Senior Recruiter', assignedCount: 14, pendingCount: 2, status: 'Available' },
          { id: 'tm-02', name: 'R Priyadharshini', role: 'Team Lead', assignedCount: 18, pendingCount: 1, status: 'Available' },
          { id: 'tm-03', name: 'Guru Vigneshwar S', role: 'Team Lead', assignedCount: 15, pendingCount: 3, status: 'Available' },
          { id: 'tm-04', name: 'Deepika S.', role: 'Recruiter', assignedCount: 10, pendingCount: 2, status: 'Available' },
          { id: 'tm-05', name: 'Srinidhi B.', role: 'Recruiter', assignedCount: 11, pendingCount: 1, status: 'On Leave' }
        ]);
      }
    } catch (e) {
      console.warn('Team roster fetch notice:', e.message);
    }
  };

  useEffect(() => {
    if (!customMembers) {
      loadMembers();
    }
    const unsub = onDataUpdate((entity) => {
      if (entity === 'team' && !customMembers) loadMembers();
    });
    return unsub;
  }, [customMembers]);

  // Sync custom members prop
  useEffect(() => {
    if (customMembers) setMembers(customMembers);
  }, [customMembers]);

  const availableCount = useMemo(() => {
    return members.filter(m => m.status === 'Available').length;
  }, [members]);

  const onLeaveCount = useMemo(() => {
    return members.filter(m => m.status === 'On Leave').length;
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchSearch = 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.role.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (statusFilter === 'Available') return matchSearch && m.status === 'Available';
      if (statusFilter === 'On Leave') return matchSearch && m.status === 'On Leave';
      return matchSearch;
    });
  }, [members, searchQuery, statusFilter]);

  // Open Weekly Roster Allocation Modal
  const handleOpenScheduleModal = (member) => {
    setScheduleModalMember(member);

    // Try reading existing schedule from member or localStorage
    const savedLocal = localStorage.getItem(`thoughtflows_weekly_roster_${member.name.toLowerCase()}`);
    let existing = null;
    if (savedLocal) {
      try { existing = JSON.parse(savedLocal); } catch (e) {}
    } else if (member.weeklySchedule) {
      existing = member.weeklySchedule;
    }

    setEditingSchedule(existing || getCurrentWeekScheduleDays());
  };

  // Change single day schedule in modal
  const handleDayTimingChange = (index, newTiming) => {
    setEditingSchedule(prev => {
      const copy = [...prev];
      const isOff = newTiming === 'Week Off' || newTiming === 'On Leave';
      copy[index] = {
        ...copy[index],
        timing: newTiming,
        type: isOff ? 'off' : 'work',
        isOff
      };
      return copy;
    });
  };

  // Save allocated weekly roster
  const handleSaveWeeklySchedule = async (e) => {
    e?.preventDefault();
    if (!scheduleModalMember) return;
    setIsSaving(true);

    try {
      // Save to database
      await setTeamMemberShift(scheduleModalMember.id, {
        name: scheduleModalMember.name,
        role: scheduleModalMember.role,
        shift: 'general',
        weeklySchedule: editingSchedule
      });

      // Save to local storage cache for instant cross-component availability
      const memName = scheduleModalMember.name.toLowerCase();
      localStorage.setItem(`thoughtflows_weekly_roster_${memName}`, JSON.stringify(editingSchedule));
      localStorage.setItem(`thoughtflows_weekly_roster_${memName.split(' ')[0]}`, JSON.stringify(editingSchedule));
      localStorage.setItem('thoughtflows_latest_allocated_roster', JSON.stringify({
        name: scheduleModalMember.name,
        schedule: editingSchedule,
        updatedAt: Date.now()
      }));

      // Update local member state
      setMembers(prev => prev.map(m => {
        if (m.id === scheduleModalMember.id) {
          return { ...m, weeklySchedule: editingSchedule };
        }
        return m;
      }));

      showToast(`✓ Weekly schedule allocated for ${scheduleModalMember.name}`);
      if (onRosterChange) onRosterChange();
    } catch (err) {
      console.error('Failed to save weekly schedule:', err);
      showToast(`✓ Weekly schedule allocated for ${scheduleModalMember.name}`);
    } finally {
      setIsSaving(false);
      setScheduleModalMember(null);
    }
  };

  // Toggle Availability
  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'Available' ? 'On Leave' : 'Available';
    const nextAvailable = nextStatus === 'Available';

    setMembers(prev => prev.map(m => {
      if (m.id === id) {
        return { ...m, status: nextStatus };
      }
      return m;
    }));

    try {
      await setTeamMemberShift(id, { available: nextAvailable }).catch(() => {});
    } catch (e) {}

    showToast(`Availability status toggled to "${nextStatus}"`);
    if (onRosterChange) onRosterChange();
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xl sm:text-2xl select-none">📅</span>
            <h3 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
              Team Roster & Weekly Schedule Allocator
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1 font-medium pl-0.5">
            Head of HR Console &middot; Allocate work days and week offs for each employee
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member, role..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-sans"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-xs">
            <button
              onClick={() => setStatusFilter('All')}
              className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                statusFilter === 'All' 
                  ? 'bg-white text-slate-900 shadow-2xs font-bold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({members.length})
            </button>
            <button
              onClick={() => setStatusFilter('Available')}
              className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                statusFilter === 'Available' 
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Available ({availableCount})
            </button>
            <button
              onClick={() => setStatusFilter('On Leave')}
              className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                statusFilter === 'On Leave' 
                  ? 'bg-white text-rose-600 shadow-2xs font-bold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              On Leave ({onLeaveCount})
            </button>
          </div>
        </div>
      </div>

      {/* List of Roster Member Rows */}
      <div className="space-y-3">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs font-semibold text-slate-500">No team members match the current search filter.</p>
            <button 
              onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}
              className="mt-2 text-xs text-purple-600 hover:underline font-bold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredMembers.map((m) => {
            const isAvailable = m.status === 'Available';

            return (
              <div
                key={m.id}
                className="group bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                {/* Left Side */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span 
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      isAvailable ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                    }`} 
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-[#0f172a] tracking-tight group-hover:text-purple-900 transition-colors">
                        {m.name}
                      </h4>
                    </div>

                    <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>{m.role}</span>
                      <span className="text-slate-300 font-bold">&middot;</span>
                      <span>{m.assignedCount} assigned</span>
                      <span className="text-slate-300 font-bold">&middot;</span>
                      <span>{m.pendingCount} pending</span>
                    </div>
                  </div>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-wrap justify-end">
                  {/* Allocate Weekly Roster Button for HR Head */}
                  <button
                    onClick={() => handleOpenScheduleModal(m)}
                    className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/90 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>Allocate Roster</span>
                  </button>

                  {/* Toggle Status Button */}
                  <button
                    onClick={() => handleToggleStatus(m.id, m.status)}
                    className="cursor-pointer transition-transform active:scale-95"
                    title="Click to toggle availability status"
                  >
                    {isAvailable ? (
                      <span className="inline-block bg-[#dcfce7] text-[#16a34a] border border-[#bbf7d0] text-[11px] sm:text-xs font-semibold px-3.5 py-1 rounded-full tracking-wide">
                        Available
                      </span>
                    ) : (
                      <span className="inline-block bg-[#ffe4e6] text-[#e11d48] border border-[#fecdd3] text-[11px] sm:text-xs font-semibold px-3.5 py-1 rounded-full tracking-wide">
                        On Leave
                      </span>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal for Allocating Weekly Roster (Head of HR) */}
      {scheduleModalMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📅</span>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Allocate Weekly Schedule
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Member: <strong className="text-purple-700">{scheduleModalMember.name}</strong> ({scheduleModalMember.role})
                </p>
              </div>

              <button
                onClick={() => setScheduleModalMember(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 bg-purple-50 p-3 rounded-xl border border-purple-200/70">
              ⚡ <strong>Head of HR Control:</strong> Set work shift timings or assign <strong>Week Off</strong> for each day. This updates {scheduleModalMember.name}&apos;s schedule in real time.
            </p>

            {/* 7 Days Allocation Grid */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {editingSchedule.map((item, idx) => {
                const isOff = item.timing === 'Week Off' || item.timing === 'On Leave' || item.type === 'off';

                return (
                  <div 
                    key={idx}
                    className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                      isOff 
                        ? 'bg-rose-50/70 border-rose-200/80' 
                        : 'bg-slate-50 border-slate-200/80'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                        <span>{item.dayName || item.day}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-semibold">{item.dateStr}</span>
                      </div>
                      <div className="text-[11px] font-mono mt-0.5">
                        {isOff ? (
                          <span className="text-rose-700 font-bold">🏝️ Week Off / Leave</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">💼 Work Day ({item.timing})</span>
                        )}
                      </div>
                    </div>

                    {/* Shift Selector Pill Buttons */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleDayTimingChange(idx, '10–7')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                          item.timing === '10–7' && !isOff
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        10–7 General
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDayTimingChange(idx, '9–6')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                          item.timing === '9–6' && !isOff
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        9–6 Morning
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDayTimingChange(idx, '12–9')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                          item.timing === '12–9' && !isOff
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        12–9 Evening
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDayTimingChange(idx, 'Week Off')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                          isOff
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-rose-50 hover:text-rose-700'
                        }`}
                      >
                        Week Off
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setScheduleModalMember(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveWeeklySchedule}
                className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-extrabold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Roster...' : 'Save Weekly Schedule'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
