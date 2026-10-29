import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Search, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Save, 
  Check, 
  Lock, 
  Eye, 
  Users, 
  ShieldCheck, 
  Briefcase,
  Filter
} from 'lucide-react';
import { getTeam, setTeamMemberShift, onDataUpdate } from '../services/api';
import { getCurrentWeekScheduleDays } from '../utils/dateUtils';

export default function TeamRosterBoard({ 
  customMembers = null, 
  onRosterChange = null,
  departmentCode = 'DEP-HR-001',
  managerLabel = 'Head of HR',
  onBack = null,
  allowedNames = null,
  readOnly = false,
  readOnlyNotice = '',
  editorRole = 'head',
  currentUser = null,
  showRoleFilter = false
}) {
  const [members, setMembers] = useState(customMembers || []);
  const allowedNamesKey = useMemo(
    () => (Array.isArray(allowedNames) && allowedNames.length
      ? allowedNames.map(n => String(n || '').trim().toLowerCase()).filter(Boolean).sort().join('|')
      : ''),
    [allowedNames]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleCategoryFilter, setRoleCategoryFilter] = useState('All'); // 'All' | 'Leadership' | 'Trainers'
  const [branchFilter, setBranchFilter] = useState('All');
  const [shiftFilter, setShiftFilter] = useState('All');
  const [toastMessage, setToastMessage] = useState(null);

  // Modal for Weekly Roster Allocation / View
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
      const data = await getTeam({ departmentCode });
      if (Array.isArray(data)) {
        const allowSet = Array.isArray(allowedNames) && allowedNames.length
          ? new Set(allowedNames.map(n => String(n || '').trim().toLowerCase()))
          : null;
        const mapped = data
          .filter(m => !allowSet || allowSet.has(String(m.name || '').trim().toLowerCase()))
          .map(m => ({
            id: m._id || m.id,
            name: m.name,
            role: m.role || 'Staff',
            branchName: m.branchName || '',
            assignedCount: m.assigned || 0,
            pendingCount: m.pending || 0,
            status: m.available !== false ? 'Available' : 'On Leave',
            shift: m.shift || 'General Shift',
            weeklySchedule: m.weeklySchedule || null
          }));
        setMembers(mapped);
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
  }, [customMembers, departmentCode, allowedNamesKey]);

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

  const leadershipCount = useMemo(() => {
    return members.filter(m => /head|manager|team lead|\btl\b/i.test(m.role || '')).length;
  }, [members]);

  const trainersCount = useMemo(() => {
    return members.filter(m => !/head|manager|team lead|\btl\b/i.test(m.role || '')).length;
  }, [members]);

  const uniqueBranches = useMemo(() => {
    return Array.from(new Set(members.map(m => m.branchName).filter(Boolean))).sort();
  }, [members]);

  const uniqueShifts = useMemo(() => {
    return Array.from(new Set(members.map(m => m.shift).filter(Boolean))).sort();
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchSearch = 
        (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.branchName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.shift || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchSearch) return false;

      if (statusFilter === 'Available' && m.status !== 'Available') return false;
      if (statusFilter === 'On Leave' && m.status !== 'On Leave') return false;

      if (branchFilter !== 'All' && String(m.branchName || '').toLowerCase() !== branchFilter.toLowerCase()) {
        return false;
      }

      if (shiftFilter !== 'All' && String(m.shift || '').toLowerCase() !== shiftFilter.toLowerCase()) {
        return false;
      }

      if (roleCategoryFilter === 'Leadership') {
        return /head|manager|team lead|\btl\b/i.test(m.role || '');
      }
      if (roleCategoryFilter === 'Trainers') {
        return !/head|manager|team lead|\btl\b/i.test(m.role || '');
      }

      return true;
    });
  }, [members, searchQuery, statusFilter, roleCategoryFilter, branchFilter, shiftFilter]);

  // Open Weekly Roster Allocation Modal
  const handleOpenScheduleModal = (member) => {
    setScheduleModalMember(member);
    const existing = Array.isArray(member.weeklySchedule) && member.weeklySchedule.length ? member.weeklySchedule : null;
    setEditingSchedule(existing || getCurrentWeekScheduleDays());
  };

  // Change single day schedule in modal
  const handleDayTimingChange = (index, newTiming) => {
    if (readOnly) return;
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

  // Save allocated weekly roster (Head of Trainer only)
  const handleSaveWeeklySchedule = async (e) => {
    e?.preventDefault();
    if (!scheduleModalMember || readOnly) return;
    setIsSaving(true);

    try {
      const primaryTiming = editingSchedule.find(d => !d.isOff && d.timing !== 'Week Off')?.timing || 'General Shift';
      await setTeamMemberShift(scheduleModalMember.id, {
        name: scheduleModalMember.name,
        role: scheduleModalMember.role,
        shift: primaryTiming,
        weeklySchedule: editingSchedule,
        editorRole: editorRole || 'head'
      });

      setMembers(prev => prev.map(m => {
        if (m.id === scheduleModalMember.id) {
          return { ...m, weeklySchedule: editingSchedule, shift: primaryTiming };
        }
        return m;
      }));

      showToast(`✓ Weekly schedule allocated for ${scheduleModalMember.name}`);
      if (onRosterChange) onRosterChange();
    } catch (err) {
      console.error('Failed to save weekly schedule:', err);
      showToast(`⚠ Could not save the schedule: ${err?.response?.data?.error || err.message}`);
    } finally {
      setIsSaving(false);
      setScheduleModalMember(null);
    }
  };

  // Toggle Availability (Head of Trainer only)
  const handleToggleStatus = async (id, currentStatus) => {
    if (readOnly) {
      showToast('🔒 Read-Only: Availability and rosters can only be updated by the Head of Trainer.');
      return;
    }

    const nextStatus = currentStatus === 'Available' ? 'On Leave' : 'Available';
    const nextAvailable = nextStatus === 'Available';

    setMembers(prev => prev.map(m => {
      if (m.id === id) {
        return { ...m, status: nextStatus };
      }
      return m;
    }));

    try {
      await setTeamMemberShift(id, { available: nextAvailable, editorRole: editorRole || 'head' }).catch(() => {});
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

      {/* Authority Notice Banners */}
      {readOnly ? (
        <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-center gap-3 text-xs text-amber-900 font-medium shadow-2xs">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <div className="flex-1">
            <strong className="font-extrabold text-amber-950">Read-Only Roster:</strong> {readOnlyNotice || 'All training shift rosters and availability are updated exclusively by the Head of Trainer. You can view schedules, work shifts, and availability.'}
          </div>
          <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
            Head Managed
          </span>
        </div>
      ) : departmentCode === 'ACAD' ? (
        <div className="mb-5 p-3.5 bg-sky-50 border border-sky-200/90 rounded-2xl flex items-center justify-between gap-3 text-xs text-sky-900 font-medium shadow-2xs flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
            <span><strong className="font-extrabold text-sky-950">Head of Trainer Exclusive Command:</strong> You have full authority to update shifts, week offs, and availability for all faculty, managers, and team leads.</span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-sky-100 text-sky-900 border border-sky-300 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Edit Authority
          </span>
        </div>
      ) : null}

      {/* Main Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 mb-2 cursor-pointer"
            >
              ← Back
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <span className="text-xl sm:text-2xl select-none">📅</span>
            <h3 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
              {readOnly ? 'Training Department Roster & Shifts' : 'Team Roster & Weekly Schedule Allocator'}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1 font-medium pl-0.5">
            {managerLabel} Console &middot; {readOnly ? 'View daily work shifts and week offs for your team' : 'Allocate work days, shift timings, and week offs'}
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
              placeholder="Search member, role, branch..."
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

      {/* Role Category Filter Tabs (For Academics / Training Department) */}
      {(showRoleFilter || departmentCode === 'ACAD') && (
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Filter Role:</span>
          <button
            type="button"
            onClick={() => setRoleCategoryFilter('All')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              roleCategoryFilter === 'All'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Staff ({members.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleCategoryFilter('Leadership')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              roleCategoryFilter === 'Leadership'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Leadership (Managers &amp; TLs) ({leadershipCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setRoleCategoryFilter('Trainers')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              roleCategoryFilter === 'Trainers'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Faculty Trainers ({trainersCount})</span>
          </button>
        </div>
      )}

      {/* Column Filters Bar: Branch, Shift, and Status */}
      <div className="flex items-center gap-2.5 mb-4 flex-wrap bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200/70 text-xs">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter Columns:
        </span>

        {/* Branch Filter Dropdown */}
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] font-bold text-slate-600">Branch:</label>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 outline-none focus:border-purple-500"
          >
            <option value="All">All Branches ({members.length})</option>
            {uniqueBranches.map(b => (
              <option key={b} value={b}>{b} ({members.filter(m => m.branchName === b).length})</option>
            ))}
          </select>
        </div>

        {/* Shift Filter Dropdown */}
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] font-bold text-slate-600">Shift:</label>
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 outline-none focus:border-purple-500"
          >
            <option value="All">All Shifts ({members.length})</option>
            {uniqueShifts.map(s => (
              <option key={s} value={s}>{s} ({members.filter(m => m.shift === s).length})</option>
            ))}
          </select>
        </div>

        <span className="text-[11px] font-bold text-slate-400 ml-auto mr-1">
          Showing {filteredMembers.length} of {members.length}
        </span>

        {(branchFilter !== 'All' || shiftFilter !== 'All' || roleCategoryFilter !== 'All' || statusFilter !== 'All' || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setBranchFilter('All');
              setShiftFilter('All');
              setRoleCategoryFilter('All');
              setStatusFilter('All');
              setSearchQuery('');
            }}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
          >
            ✕ Reset Filters
          </button>
        )}
      </div>

      {/* List of Roster Member Rows */}
      <div className="space-y-3">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1.5">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              {members.length === 0 ? 'No credentialed staff found for this department' : 'No team members match the current filter'}
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {members.length === 0 
                ? 'Only real staff accounts created by an Admin with active credentials will appear in the team roster.'
                : 'Try adjusting your search keywords, role, branch, or shift filters.'}
            </p>
            {members.length > 0 && (
              <button 
                onClick={() => { setSearchQuery(''); setStatusFilter('All'); setRoleCategoryFilter('All'); setBranchFilter('All'); setShiftFilter('All'); }}
                className="mt-2 text-xs text-purple-600 hover:underline font-bold cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          filteredMembers.map((m) => {
            const isAvailable = m.status === 'Available';
            const isLeadershipRole = /head|manager|team lead|\btl\b/i.test(m.role || '');

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
                    title={isAvailable ? 'Available' : 'On Leave'}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-bold text-[#0f172a] tracking-tight group-hover:text-purple-900 transition-colors">
                        {m.name}
                      </h4>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                        isLeadershipRole
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-teal-50 text-teal-700 border-teal-200'
                      }`}>
                        {m.role}
                      </span>
                      {m.branchName && (
                        <span className="text-[11px] font-medium text-slate-500">
                          📍 {m.branchName}
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-slate-400 font-semibold">
                        Shift: {m.shift}
                      </span>
                    </div>

                    {/* 7-Day Mini Schedule Preview */}
                    <div className="mt-2 flex items-center gap-1 overflow-x-auto py-0.5">
                      {(Array.isArray(m.weeklySchedule) && m.weeklySchedule.length ? m.weeklySchedule : getCurrentWeekScheduleDays()).map((dayItem, dIdx) => {
                        const isOff = dayItem.timing === 'Week Off' || dayItem.timing === 'On Leave' || dayItem.type === 'off' || dayItem.isOff;
                        return (
                          <span
                            key={dIdx}
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                              dayItem.isToday
                                ? 'bg-teal-600 text-white border-teal-700 ring-1 ring-teal-400 shadow-2xs'
                                : isOff
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                            title={`${dayItem.day || dayItem.dayName || ''}: ${dayItem.timing || (isOff ? 'Week Off' : 'Work')}`}
                          >
                            {String(dayItem.day || dayItem.dayName || '').slice(0, 3)}: {isOff ? 'OFF' : (dayItem.timing || '10–7')}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-wrap justify-end">
                  {readOnly ? (
                    /* Read-Only: View Schedule Modal */
                    <button
                      type="button"
                      onClick={() => handleOpenScheduleModal(m)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>View Schedule</span>
                    </button>
                  ) : (
                    /* Head of Trainer: Allocate Weekly Roster Button */
                    <button
                      type="button"
                      onClick={() => handleOpenScheduleModal(m)}
                      className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/90 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Calendar className="w-3.5 h-3.5 text-purple-600" />
                      <span>Allocate Roster</span>
                    </button>
                  )}

                  {/* Availability Pill: Toggleable only by Head of Trainer */}
                  {readOnly ? (
                    <span 
                      className={`inline-block text-[11px] sm:text-xs font-semibold px-3.5 py-1 rounded-full tracking-wide select-none ${
                        isAvailable 
                          ? 'bg-[#dcfce7] text-[#16a34a] border border-[#bbf7d0]' 
                          : 'bg-[#ffe4e6] text-[#e11d48] border border-[#fecdd3]'
                      }`}
                      title="Availability set by Head of Trainer"
                    >
                      {isAvailable ? 'Available' : 'On Leave'}
                    </span>
                  ) : (
                    <button
                      type="button"
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
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal for Allocating / Viewing Weekly Roster */}
      {scheduleModalMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📅</span>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {readOnly ? 'Weekly Schedule' : 'Allocate Weekly Schedule'}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Member: <strong className="text-purple-700">{scheduleModalMember.name}</strong> ({scheduleModalMember.role})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setScheduleModalMember(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {readOnly ? (
              <p className="text-xs text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200/70 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span><strong>Read-Only View:</strong> This weekly schedule is managed and updated by Head of Trainer only.</span>
              </p>
            ) : (
              <p className="text-xs text-slate-600 bg-purple-50 p-3 rounded-xl border border-purple-200/70">
                ⚡ <strong>{managerLabel} Control:</strong> Set work shift timings or assign <strong>Week Off</strong> for each day. This updates {scheduleModalMember.name}&apos;s schedule in real time.
              </p>
            )}

            {/* 7 Days Allocation Grid */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {editingSchedule.map((item, idx) => {
                const isOff = item.timing === 'Week Off' || item.timing === 'On Leave' || item.type === 'off' || item.isOff;

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

                    {/* Shift Selector Pill Buttons (Only in Edit mode) */}
                    {!readOnly ? (
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
                    ) : (
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold ${
                        isOff ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isOff ? 'Week Off' : item.timing}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              {readOnly ? (
                <button
                  type="button"
                  onClick={() => setScheduleModalMember(null)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Close Schedule
                </button>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
