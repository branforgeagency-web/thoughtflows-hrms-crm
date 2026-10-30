import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Users,
  Briefcase,
  Crown,
  GraduationCap,
  Sparkles,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Search,
  Filter,
  Plus,
  Edit3,
  Check,
  X,
  RefreshCw,
  Download,
  AlertCircle,
  HelpCircle,
  Coffee,
  CalendarDays,
  UserCheck,
  Building2,
  Layers,
  ArrowRight,
  CheckSquare,
  FileText
} from 'lucide-react';
import {
  getTrainerUtilization,
  saveTrainerHourlyPlan,
  updateTrainerSlotActual,
  bulkSaveTrainerHourlyPlans,
  setTrainerLeave,
  getTrainerUtilizationReport,
  onDataUpdate
} from '../services/api';
import { localDateKey } from '../utils/dateUtils';
import { ALL_HIERARCHY_TRAINERS, TRAINER_HIERARCHY } from '../constants/trainerHierarchy';

// Standard 8-Hour Workday Slots (+ 1 Lunch Break)
const DEFAULT_SLOT_TEMPLATES = [
  { slotIndex: 0, timeSlot: '09:00 AM - 10:00 AM', slotType: 'working', label: 'Slot 1' },
  { slotIndex: 1, timeSlot: '10:00 AM - 11:00 AM', slotType: 'working', label: 'Slot 2' },
  { slotIndex: 2, timeSlot: '11:00 AM - 12:00 PM', slotType: 'working', label: 'Slot 3' },
  { slotIndex: 3, timeSlot: '12:00 PM - 01:00 PM', slotType: 'working', label: 'Slot 4' },
  { slotIndex: 4, timeSlot: '01:00 PM - 02:00 PM', slotType: 'break', label: 'Lunch Break' },
  { slotIndex: 5, timeSlot: '02:00 PM - 03:00 PM', slotType: 'working', label: 'Slot 5' },
  { slotIndex: 6, timeSlot: '03:00 PM - 04:00 PM', slotType: 'working', label: 'Slot 6' },
  { slotIndex: 7, timeSlot: '04:00 PM - 05:00 PM', slotType: 'working', label: 'Slot 7' },
  { slotIndex: 8, timeSlot: '05:00 PM - 06:00 PM', slotType: 'working', label: 'Slot 8' }
];

const PRESET_TASK_TEMPLATES = [
  { task: 'Live Batch Lecture & Practical Demonstration', entityType: 'batch' },
  { task: 'Student Doubt Resolution & 1-on-1 Mentoring', entityType: 'student' },
  { task: 'Prospective Candidate Demo Session & Skill Evaluation', entityType: 'student' },
  { task: 'Daily Student Attendance & LMS Progress Audit', entityType: 'batch' },
  { task: 'Assessment Test Evaluation & Viva Voce', entityType: 'student' },
  { task: 'Remedial Support for At-Risk / Weak Students', entityType: 'student' },
  { task: 'Curriculum & Question Bank Preparation', entityType: 'general' },
  { task: 'Faculty Squad Sync & Operational Review', entityType: 'trainer' }
];

export default function UtilizationDashboard({
  roleType = 'trainer', // 'trainer' | 'tl' | 'manager' | 'head'
  currentUser,
  currentLeader,
  scopedTrainers = [],
  batches = [],
  students = [],
  trainerProfile,
  pickedIdentity
}) {
  // Normalize identity
  const effectiveUserId = useMemo(() => {
    return (
      currentUser?.trainerId ||
      currentUser?.leaderId ||
      currentUser?.id ||
      currentUser?._id ||
      trainerProfile?.trainerId ||
      pickedIdentity?.trainerId ||
      (roleType === 'head' ? 'manoj' : roleType === 'manager' ? 'keerthi' : roleType === 'tl' ? 'ram_balaji' : 'TR-TN-01')
    );
  }, [currentUser, trainerProfile, pickedIdentity, roleType]);

  const effectiveUserName = useMemo(() => {
    return (
      currentUser?.name ||
      currentUser?.userName ||
      trainerProfile?.trainerName ||
      pickedIdentity?.trainerName ||
      currentLeader?.name ||
      (roleType === 'head' ? 'Manoj' : roleType === 'manager' ? 'Keerthi' : roleType === 'tl' ? 'Ram Balaji' : 'Faculty Member')
    );
  }, [currentUser, trainerProfile, pickedIdentity, currentLeader, roleType]);

  // Selected date
  const [selectedDate, setSelectedDate] = useState(() => localDateKey());
  const [activeSubTab, setActiveSubTab] = useState(() => {
    if (roleType === 'trainer') return 'my_tracker';
    if (roleType === 'tl') return 'team_planner';
    return 'monitoring';
  });

  // Data states
  const [workLogs, setWorkLogs] = useState([]);
  const [stats, setStats] = useState({
    totalPlannedHours: 0,
    totalActualHours: 0,
    overallUtilization: 0,
    totalCompleted: 0,
    totalPending: 0,
    totalInProgress: 0,
    totalDelayed: 0,
    leaveCount: 0,
    staffTracked: 0
  });
  const [teamSummaries, setTeamSummaries] = useState([]);
  const [managerSummaries, setManagerSummaries] = useState([]);
  const [delayedActivities, setDelayedActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedTlFilter, setSelectedTlFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTrainerForPlan, setSelectedTrainerForPlan] = useState('');

  // Modals
  const [editingSlotModal, setEditingSlotModal] = useState(null); // { log, slot, isPlanMode }
  const [bulkPlanModalOpen, setBulkPlanModalOpen] = useState(false);
  const [leaveModalUser, setLeaveModalUser] = useState(null); // log or user to mark leave

  // Fetch live utilization data
  const loadUtilizationData = useCallback(async () => {
    try {
      setLoading(true);
      const callerParams = {
        date: selectedDate,
        callerId: effectiveUserId,
        callerName: effectiveUserName,
        callerRole: roleType
      };

      const res = await getTrainerUtilization(callerParams);
      if (res && res.success) {
        setWorkLogs(res.workLogs || []);
        setStats(res.stats || {});
        setTeamSummaries(res.teamSummaries || []);
        setManagerSummaries(res.managerSummaries || []);
        setDelayedActivities(res.delayedActivities || []);

        // Default selected trainer for TL planning
        if (!selectedTrainerForPlan && res.workLogs?.length > 0) {
          const firstTrainer = res.workLogs.find((l) => l.userRole === 'trainer');
          if (firstTrainer) setSelectedTrainerForPlan(firstTrainer.userId);
        }
      }
    } catch (err) {
      console.error('Failed to load utilization data:', err);
      setMessage({ type: 'error', text: 'Failed to load live utilization data. Please check network connection.' });
    } finally {
      setLoading(false);
    }
  }, [selectedDate, effectiveUserId, effectiveUserName, roleType, selectedTrainerForPlan]);

  useEffect(() => {
    loadUtilizationData();
    const unsub = onDataUpdate((entity) => {
      if (entity === 'trainer_utilization') loadUtilizationData();
    });
    return () => unsub();
  }, [loadUtilizationData]);

  // Flash message clear
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: '', text: '' }), 4500);
      return () => clearInterval(timer);
    }
  }, [message]);

  // Current user's own work log
  const myWorkLog = useMemo(() => {
    return workLogs.find(
      (l) => l.userId.toLowerCase() === effectiveUserId.toLowerCase() ||
             (effectiveUserName && l.userName.toLowerCase() === effectiveUserName.toLowerCase())
    );
  }, [workLogs, effectiveUserId, effectiveUserName]);

  // Trainers available for planning / review
  const subordinateTrainers = useMemo(() => {
    if (roleType === 'trainer') return [];
    if (roleType === 'tl') {
      const myTlId = effectiveUserId.toLowerCase();
      return workLogs.filter(
        (l) => l.userRole === 'trainer' &&
               (l.teamLeadId.toLowerCase() === myTlId || l.teamLeadName.toLowerCase().includes(effectiveUserName.toLowerCase()))
      );
    }
    if (roleType === 'manager') {
      const myMgrId = effectiveUserId.toLowerCase();
      return workLogs.filter(
        (l) => l.userRole === 'trainer' &&
               (l.managerId.toLowerCase() === myMgrId || l.managerName.toLowerCase().includes(effectiveUserName.toLowerCase()))
      );
    }
    // Head sees all trainers
    return workLogs.filter((l) => l.userRole === 'trainer');
  }, [workLogs, roleType, effectiveUserId, effectiveUserName]);

  // Currently inspected log in Team Planner
  const targetPlanningLog = useMemo(() => {
    if (roleType === 'trainer') return myWorkLog;
    if (selectedTrainerForPlan) {
      return workLogs.find((l) => l.userId === selectedTrainerForPlan) || subordinateTrainers[0] || null;
    }
    return subordinateTrainers[0] || null;
  }, [selectedTrainerForPlan, workLogs, subordinateTrainers, roleType, myWorkLog]);

  // Filtered logs for Monitoring Desk
  const filteredMonitoringLogs = useMemo(() => {
    return workLogs.filter((log) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = (log.userName || '').toLowerCase().includes(q);
        const matchesRole = (log.userRole || '').toLowerCase().includes(q);
        const matchesBranch = (log.branchName || '').toLowerCase().includes(q);
        const matchesTask = (log.slots || []).some((s) => (s.plannedTask || '').toLowerCase().includes(q) || (s.actualWork || '').toLowerCase().includes(q));
        if (!matchesName && !matchesRole && !matchesBranch && !matchesTask) return false;
      }
      if (selectedZone !== 'all' && log.zone !== selectedZone) return false;
      if (selectedTlFilter !== 'all' && log.teamLeadId !== selectedTlFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'delayed' && !(log.delayedTasksCount > 0)) return false;
        if (statusFilter === 'pending' && !(log.pendingTasksCount > 0)) return false;
        if (statusFilter === 'completed' && !(log.completedTasksCount >= 8)) return false;
        if (statusFilter === 'leave' && !log.isLeave) return false;
      }
      return true;
    });
  }, [workLogs, searchQuery, selectedZone, selectedTlFilter, statusFilter]);

  // Lookup trainer -> course / state info from the hierarchy (used by the Utilization Sheet)
  const trainerInfoLookup = useMemo(() => {
    const map = {};
    ALL_HIERARCHY_TRAINERS.forEach((t) => {
      map[t.trainerId] = t;
    });
    return map;
  }, []);

  const ZONE_STATE_LABELS = { TN: 'Tamil Nadu', KL: 'Kerala', 'AP / TS': 'Andhra Pradesh & Telangana' };
  const ZONE_ORDER = ['TN', 'KL', 'AP / TS'];

  // Group Monitoring Desk logs into State -> Trainer-row sections, Excel-sheet style
  const utilizationSheetSections = useMemo(() => {
    const groups = {};
    filteredMonitoringLogs.forEach((log) => {
      const zoneKey = log.zone || trainerInfoLookup[log.userId]?.zone || 'Other';
      if (!groups[zoneKey]) groups[zoneKey] = [];
      groups[zoneKey].push(log);
    });
    const zoneKeys = Object.keys(groups).sort((a, b) => {
      const ai = ZONE_ORDER.indexOf(a);
      const bi = ZONE_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return zoneKeys.map((zoneKey) => ({
      zoneKey,
      zoneLabel: ZONE_STATE_LABELS[zoneKey] || trainerInfoLookup[groups[zoneKey][0]?.userId]?.zoneLabel || zoneKey,
      rows: groups[zoneKey]
    }));
  }, [filteredMonitoringLogs, trainerInfoLookup]);

  // Merge consecutive identical slot cells so the sheet reads like the Excel tracker
  const buildMergedSlotCells = (slots) => {
    const source = slots && slots.length ? slots : DEFAULT_SLOT_TEMPLATES;
    const list = source.map((s) => {
      const isBreak = s.slotType === 'break';
      const text = (s.actualWork || s.plannedTask || (isBreak ? 'Lunch Break' : '')).trim();
      return {
        timeSlot: s.timeSlot,
        text: text || '—',
        status: s.status || (isBreak ? 'Break' : 'Pending'),
        isBreak
      };
    });
    const merged = [];
    list.forEach((cell) => {
      const prev = merged[merged.length - 1];
      if (prev && cell.text !== '—' && prev.text === cell.text && prev.isBreak === cell.isBreak) {
        prev.span += 1;
      } else {
        merged.push({ ...cell, span: 1 });
      }
    });
    return merged;
  };

  const getSheetSlotColor = (status, isBreak) => {
    if (isBreak) return 'bg-slate-100 text-slate-500';
    if (status === 'Completed') return 'bg-emerald-50 text-emerald-800';
    if (status === 'In Progress') return 'bg-sky-50 text-sky-800';
    if (status === 'Delayed') return 'bg-rose-50 text-rose-800';
    return 'bg-white text-slate-600';
  };

  const getSessionStatusBadge = (log) => {
    if (log.isLeave) return { label: 'ON LEAVE', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (log.delayedTasksCount > 0) return { label: 'DELAYED', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
    if (log.inProgressTasksCount > 0) return { label: 'IN PROGRESS', cls: 'bg-sky-50 text-sky-700 border-sky-200' };
    if (log.pendingTasksCount > 0) return { label: 'PENDING', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'COMPLETED', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const getTaskStatusBadge = (log) => {
    const total = (log.slots && log.slots.length ? log.slots : DEFAULT_SLOT_TEMPLATES).filter((s) => s.slotType !== 'break').length;
    const done = log.completedTasksCount || 0;
    if (log.isLeave) return { label: 'ON LEAVE', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (done >= total && total > 0) return { label: 'COMPLETED', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (done > 0) return { label: `${done}/${total} DONE`, cls: 'bg-sky-50 text-sky-700 border-sky-200' };
    return { label: 'PENDING', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  };

  // Handle Quick Date Jumps
  const handleJumpDate = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setSelectedDate(localDateKey(d));
  };

  const isToday = selectedDate === localDateKey();
  const isTomorrow = (() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return selectedDate === localDateKey(tomorrow);
  })();

  // Handle Slot Actual Update
  const handleSaveActualSlot = async (slotIndex, payload) => {
    try {
      setSaving(true);
      const res = await updateTrainerSlotActual({
        userId: payload.userId,
        date: selectedDate,
        slotIndex,
        actualWork: payload.actualWork,
        status: payload.status,
        remarks: payload.remarks,
        relatedEntity: payload.relatedEntity,
        relatedEntityType: payload.relatedEntityType,
        callerId: effectiveUserId,
        callerName: effectiveUserName,
        callerRole: roleType
      });

      if (res && res.success) {
        setMessage({ type: 'success', text: `Slot ${slotIndex + 1} updated to ${payload.status}!` });
        setEditingSlotModal(null);
        await loadUtilizationData();
      } else {
        setMessage({ type: 'error', text: res?.error || 'Failed to update slot progress.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update slot.' });
    } finally {
      setSaving(false);
    }
  };

  // Handle Planning a Slot
  const handleSavePlanSlot = async (slotIndex, payload) => {
    try {
      setSaving(true);
      const log = workLogs.find((l) => l.userId === payload.userId) || targetPlanningLog;
      if (!log) return;

      const updatedSlots = (log.slots || DEFAULT_SLOT_TEMPLATES).map((s, idx) => {
        if (idx === slotIndex) {
          return {
            ...s,
            plannedTask: payload.plannedTask,
            relatedEntity: payload.relatedEntity,
            relatedEntityType: payload.relatedEntityType,
            slotType: payload.slotType || (idx === 4 ? 'break' : 'working'),
            plannedHours: payload.slotType === 'break' ? 0 : 1
          };
        }
        return s;
      });

      const res = await saveTrainerHourlyPlan({
        userId: log.userId,
        userName: log.userName,
        userRole: log.userRole,
        teamLeadId: log.teamLeadId,
        teamLeadName: log.teamLeadName,
        managerId: log.managerId,
        managerName: log.managerName,
        branchName: log.branchName,
        zone: log.zone,
        date: selectedDate,
        slots: updatedSlots,
        callerId: effectiveUserId,
        callerName: effectiveUserName,
        callerRole: roleType
      });

      if (res && res.success) {
        setMessage({ type: 'success', text: `Work plan for ${log.userName} on ${selectedDate} updated!` });
        setEditingSlotModal(null);
        await loadUtilizationData();
      } else {
        setMessage({ type: 'error', text: res?.error || 'Failed to save plan.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save plan.' });
    } finally {
      setSaving(false);
    }
  };

  // Quick 1-Click Status Toggle for a slot
  const handleQuickStatusChange = async (log, slot, newStatus) => {
    // Permission: Only self or TL planning for their assigned trainer
    const isSelf = log.userId.toLowerCase() === effectiveUserId.toLowerCase();
    const isMySubordinate = roleType === 'tl' && (
      log.teamLeadId.toLowerCase() === effectiveUserId.toLowerCase() ||
      ALL_HIERARCHY_TRAINERS.some((t) => t.trainerId === log.userId && t.teamLeadId === effectiveUserId)
    );

    if (!isSelf && !isMySubordinate && roleType !== 'head' && roleType !== 'manager') {
      setMessage({ type: 'error', text: 'You can update only your own hourly work progress.' });
      return;
    }

    let defaultRemarks = slot.remarks;
    let actualWorkText = slot.actualWork || slot.plannedTask || 'Completed assigned slot activities.';

    if (newStatus === 'Delayed' && !defaultRemarks) {
      defaultRemarks = 'Student doubt spillover / rescheduled session.';
    }

    await handleSaveActualSlot(slot.slotIndex, {
      userId: log.userId,
      actualWork: actualWorkText,
      status: newStatus,
      remarks: defaultRemarks,
      relatedEntity: slot.relatedEntity,
      relatedEntityType: slot.relatedEntityType
    });
  };

  // Export utilization report to CSV
  const handleExportCSV = () => {
    if (!workLogs.length) return;
    const headers = ['User ID', 'Name', 'Role', 'Zone', 'Branch', 'Team Lead', 'Manager', 'Date', 'Planned Hours', 'Actual Hours', 'Utilization %', 'Completed Tasks', 'Pending Tasks', 'Delayed Tasks', 'On Leave'];
    const rows = workLogs.map((l) => [
      l.userId,
      `"${l.userName}"`,
      l.userRole,
      l.zone,
      `"${l.branchName}"`,
      `"${l.teamLeadName}"`,
      `"${l.managerName}"`,
      l.date,
      l.totalPlannedHours,
      l.totalActualHours,
      `${l.utilizationPercentage}%`,
      l.completedTasksCount,
      l.pendingTasksCount,
      l.delayedTasksCount,
      l.isLeave ? 'Yes' : 'No'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Thoughtflows_Utilization_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format Helper for badge colors
  const getUtilizationBadge = (pct, isLeave) => {
    if (isLeave) {
      return { label: 'ON LEAVE', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
    }
    if (pct >= 85) {
      return { label: `${pct}% OPTIMAL`, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
    }
    if (pct >= 70) {
      return { label: `${pct}% MODERATE`, bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
    }
    if (pct >= 50) {
      return { label: `${pct}% UNDERUTILIZED`, bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
    }
    return { label: `${pct}% CRITICAL LOW`, bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return { label: 'Completed', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
      case 'In Progress':
        return { label: 'In Progress', bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: Clock };
      case 'Delayed':
        return { label: 'Delayed', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertTriangle };
      case 'Break':
        return { label: 'Lunch / Break', bg: 'bg-slate-100 text-slate-600 border-slate-200', icon: Coffee };
      case 'Leave':
        return { label: 'Leave', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: CalendarDays };
      default:
        return { label: 'Pending', bg: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock };
    }
  };

  return (
    <div className="space-y-6 text-slate-800 font-sans animate-fadeIn">
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 via-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
              <Clock className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  8-Hour Working Day Tracking
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {roleType === 'head' ? 'Department Head Command' : roleType === 'manager' ? 'Trainer Manager Desk' : roleType === 'tl' ? 'Training Team Lead Command' : 'Faculty Work Desk'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Utilization & Hourly Work Tracker
              </h1>
            </div>
          </div>

          {/* Date Picker & Jump Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => handleJumpDate(-1)}
                className="px-2.5 py-1 rounded-lg hover:bg-white hover:text-slate-900 transition-all cursor-pointer"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => handleJumpDate(0)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${isToday ? 'bg-white text-teal-700 shadow-xs font-bold' : 'hover:bg-white'}`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleJumpDate(1)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${isTomorrow ? 'bg-white text-teal-700 shadow-xs font-bold' : 'hover:bg-white'}`}
              >
                Tomorrow (Plan)
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={loadUtilizationData}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Global Notification Banner */}
        {message.text && (
          <div
            className={`mt-4 px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between animate-fadeIn ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage({ type: '', text: '' })} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Top 4 Real-Time Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-5">
          <div className="bg-gradient-to-br from-slate-50 to-teal-50/40 p-4 rounded-2xl border border-teal-100/80 shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Planned Hours</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {stats.totalPlannedHours || 0} <span className="text-xs font-medium text-slate-500">hrs</span>
            </div>
            <span className="text-[11px] text-teal-700 font-semibold mt-1 inline-block">
              8 hrs / day baseline
            </span>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-sky-50/40 p-4 rounded-2xl border border-sky-100/80 shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Actual Hours Recorded</span>
            <div className="text-2xl font-black text-sky-700 mt-0.5">
              {stats.totalActualHours || 0} <span className="text-xs font-medium text-slate-500">hrs</span>
            </div>
            <span className="text-[11px] text-sky-600 font-semibold mt-1 inline-block">
              {stats.totalCompleted || 0} completed tasks
            </span>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/40 p-4 rounded-2xl border border-emerald-100/80 shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Overall Utilization</span>
            <div className="text-2xl font-black text-emerald-700 mt-0.5">
              {stats.overallUtilization || 0}%
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold mt-1 inline-block">
              Calculated on actual data
            </span>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-amber-50/40 p-4 rounded-2xl border border-amber-100/80 shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Pending / Delayed</span>
            <div className="text-2xl font-black text-amber-700 mt-0.5">
              {stats.totalPending || 0} <span className="text-xs font-semibold text-rose-600">({stats.totalDelayed || 0} delayed)</span>
            </div>
            <span className="text-[11px] text-amber-700 font-semibold mt-1 inline-block">
              {stats.leaveCount || 0} staff on leave
            </span>
          </div>
        </div>
      </div>

      {/* Role-Based Nav Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* For Trainer */}
          {roleType === 'trainer' && (
            <>
              <button
                type="button"
                onClick={() => setActiveSubTab('my_tracker')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSubTab === 'my_tracker'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>My 8-Hour Work Plan & Progress</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('my_history')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSubTab === 'my_history'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>My Utilization History</span>
              </button>
            </>
          )}

          {/* For TL */}
          {roleType === 'tl' && (
            <>
              <button
                type="button"
                onClick={() => setActiveSubTab('team_planner')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSubTab === 'team_planner'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Team Trainers Work Planner ({subordinateTrainers.length} Faculty)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('my_work')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSubTab === 'my_work'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>My Own TL Work Updates</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('team_report')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSubTab === 'team_report'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Squad Utilization Report</span>
              </button>
            </>
          )}

          {/* For Manager */}
          {roleType === 'manager' && (
            <>
              <button
                type="button"
                onClick={() => setActiveSubTab('monitoring')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSubTab === 'monitoring'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>TL & Faculty Team Monitoring Desk</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('my_work')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSubTab === 'my_work'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>My Own Manager Work Updates</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('manager_report')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSubTab === 'manager_report'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Regional Utilization Summary</span>
              </button>
            </>
          )}

          {/* For Trainer Head */}
          {roleType === 'head' && (
            <>
              <button
                type="button"
                onClick={() => setActiveSubTab('monitoring')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSubTab === 'monitoring'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Crown className="w-4 h-4" />
                <span>Department Hourly Command (All Roles)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('my_work')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSubTab === 'my_work'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>My Department Head Hourly Work</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('head_report')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSubTab === 'head_report'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Academy-Wide Utilization Rollup</span>
              </button>
            </>
          )}
        </div>

        {/* Clear Rules Guidance Tooltip */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/60">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>Rules: Breaks & approved leaves do not count as working penalties. Tasks count only when marked Completed.</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: TRAINER WORK TRACKER (TRAINER VIEW OR MY OWN WORK)                */}
      {/* ========================================================================= */}
      {(activeSubTab === 'my_tracker' || activeSubTab === 'my_work') && (
        <div className="space-y-5">
          {myWorkLog ? (
            <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 space-y-6">
              {/* Header profile info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 font-black text-lg">
                    {myWorkLog.userName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900">{myWorkLog.userName}</h2>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        {myWorkLog.userRole}
                      </span>
                      {myWorkLog.isLeave && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                          On Leave
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {myWorkLog.branchName || 'Academy Desk'} · Zone: {myWorkLog.zone || 'General'}
                      {myWorkLog.teamLeadName ? ` · Team Lead: ${myWorkLog.teamLeadName}` : ''}
                      {myWorkLog.managerName ? ` · Manager: ${myWorkLog.managerName}` : ''}
                    </p>
                  </div>
                </div>

                {/* Individual Utilization Gauge */}
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Daily Utilization</span>
                    <div className="text-xl font-black text-slate-900 leading-tight">
                      {myWorkLog.utilizationPercentage}%
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-slate-200 flex items-center justify-center font-bold text-xs" style={{ borderColor: myWorkLog.utilizationPercentage >= 85 ? '#10b981' : myWorkLog.utilizationPercentage >= 70 ? '#0284c7' : '#f59e0b' }}>
                    {myWorkLog.totalActualHours}h
                  </div>
                </div>
              </div>

              {/* 8-Hour Grid / Slots List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-teal-600" />
                    <span>Hourly Work Execution Plan ({selectedDate})</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Click &ldquo;Update Actual&rdquo; to record work completed or reasons for incomplete work
                  </span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden">
                  {(myWorkLog.slots || DEFAULT_SLOT_TEMPLATES).map((slot, idx) => {
                    const statusBadge = getStatusBadge(slot.status);
                    const StatusIcon = statusBadge.icon;
                    const isBreak = slot.slotType === 'break';

                    return (
                      <div
                        key={slot.slotIndex ?? idx}
                        className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isBreak ? 'bg-slate-50/70' : slot.status === 'Completed' ? 'bg-emerald-50/20' : 'bg-white hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Time slot & Basic info */}
                        <div className="flex items-start gap-3.5 min-w-[220px]">
                          <div className={`p-2.5 rounded-xl border shrink-0 ${statusBadge.bg}`}>
                            <StatusIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">{slot.timeSlot}</span>
                              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${statusBadge.bg}`}>
                                {statusBadge.label}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {isBreak ? '1 hr Non-working break' : '1 hr working slot'}
                            </span>
                          </div>
                        </div>

                        {/* Planned vs Actual content */}
                        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 min-w-0">
                          {/* Planned Task */}
                          <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                              Planned Task (by {slot.plannedBy || 'Team Lead'})
                            </span>
                            <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                              {slot.plannedTask || (isBreak ? 'Lunch & Personal Break' : 'No specific task planned yet')}
                            </p>
                            {slot.relatedEntity && (
                              <span className="mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                                {slot.relatedEntityType === 'batch' ? 'Batch: ' : slot.relatedEntityType === 'student' ? 'Student: ' : 'Related: '}
                                {slot.relatedEntity}
                              </span>
                            )}
                          </div>

                          {/* Actual Work Completed */}
                          <div className={`p-2.5 rounded-xl border ${slot.actualWork ? 'bg-sky-50/40 border-sky-100' : 'bg-slate-50/40 border-slate-200/40'}`}>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                              Actual Work Completed
                            </span>
                            <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                              {slot.actualWork || (isBreak ? 'Lunch Break taken' : 'Not updated yet')}
                            </p>
                            {slot.remarks && (
                              <div className="mt-1 text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>Reason: {slot.remarks}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {!isBreak && (
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Fast Action: Mark Completed */}
                            {slot.status !== 'Completed' && (
                              <button
                                type="button"
                                onClick={() => handleQuickStatusChange(myWorkLog, slot, 'Completed')}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Done</span>
                              </button>
                            )}

                            {/* Edit / Detail Modal */}
                            <button
                              type="button"
                              onClick={() => setEditingSlotModal({ log: myWorkLog, slot, isPlanMode: false })}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Update</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No work log initialized yet</h3>
              <p className="text-xs text-slate-500 mt-1">
                Click refresh above or contact your Team Lead to initialize your 8-hour plan.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: TEAM TRAINERS WORK PLANNER (FOR TRAINING TEAM LEAD)             */}
      {/* ========================================================================= */}
      {roleType === 'tl' && activeSubTab === 'team_planner' && (
        <div className="space-y-6">
          {/* TL Action Header */}
          <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-3xl p-5 sm:p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/20 text-white mb-2 inline-block">
                TL Planning Responsibility
              </span>
              <h2 className="text-xl font-black">Plan Next-Day & Today&apos;s Work for Your Team</h2>
              <p className="text-xs text-emerald-100 mt-1 max-w-xl">
                Create the hour-by-hour work plan for every trainer under your squad. Trainers will update actual progress against tasks assigned by you.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkPlanModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-white text-emerald-900 font-extrabold text-xs shadow-sm hover:bg-emerald-50 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Bulk Plan All {subordinateTrainers.length} Trainers</span>
              </button>
            </div>
          </div>

          {/* Trainer Selector Tabs */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200 flex items-center gap-2 overflow-x-auto shadow-xs">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider px-2">Trainers:</span>
            {subordinateTrainers.map((tr) => {
              const isSelected = targetPlanningLog?.userId === tr.userId;
              const badge = getUtilizationBadge(tr.utilizationPercentage, tr.isLeave);

              return (
                <button
                  key={tr.userId}
                  type="button"
                  onClick={() => setSelectedTrainerForPlan(tr.userId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{tr.userName}</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : badge.bg}`}>
                    {badge.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Trainer Planning Canvas */}
          {targetPlanningLog ? (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">{targetPlanningLog.userName}</h3>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                      {targetPlanningLog.branchName || 'Branch Faculty'}
                    </span>
                    {targetPlanningLog.isLeave && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                        Marked On Leave
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Date: <span className="font-bold text-slate-700">{selectedDate}</span> · Assigned TL: {effectiveUserName}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveModalUser(targetPlanningLog)}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>{targetPlanningLog.isLeave ? 'Edit Leave' : 'Mark Leave'}</span>
                  </button>
                </div>
              </div>

              {/* Slots List for TL to Plan */}
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden">
                {(targetPlanningLog.slots || DEFAULT_SLOT_TEMPLATES).map((slot, idx) => {
                  const statusBadge = getStatusBadge(slot.status);
                  const StatusIcon = statusBadge.icon;
                  const isBreak = slot.slotType === 'break';

                  return (
                    <div
                      key={slot.slotIndex ?? idx}
                      className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isBreak ? 'bg-slate-50/70' : 'bg-white hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-[200px]">
                        <div className={`p-2.5 rounded-xl border shrink-0 ${statusBadge.bg}`}>
                          <StatusIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-900 block">{slot.timeSlot}</span>
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.2 rounded-md border ${statusBadge.bg}`}>
                            {statusBadge.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Assigned Work Plan:
                          </span>
                          {slot.relatedEntity && (
                            <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                              {slot.relatedEntity}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">
                          {slot.plannedTask || (isBreak ? 'Lunch & Personal Break' : 'Pending TL Assignment')}
                        </p>
                        {slot.actualWork && (
                          <p className="text-[11px] text-sky-700 font-semibold mt-1">
                            Trainer Progress: {slot.actualWork}
                          </p>
                        )}
                        {slot.remarks && (
                          <p className="text-[11px] text-rose-600 font-semibold mt-0.5">
                            Delay Remark: {slot.remarks}
                          </p>
                        )}
                      </div>

                      {!isBreak && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingSlotModal({ log: targetPlanningLog, slot, isPlanMode: true })}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Plan Slot</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No trainers assigned under your pod yet</h3>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: MONITORING COMMAND DESK (MANAGER & HEAD VIEWS)                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'monitoring' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff, task, branch, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-800 placeholder-slate-400 outline-none w-full"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* Zone Filter */}
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Zones</option>
                <option value="TN">Tamil Nadu (TN)</option>
                <option value="KL">Kerala (KL)</option>
                <option value="AP / TS">Andhra & Telangana</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="delayed">Has Delayed Tasks</option>
                <option value="pending">Has Pending Tasks</option>
                <option value="completed">100% Completed (8h)</option>
                <option value="leave">On Leave</option>
              </select>
            </div>
          </div>

          {/* Delayed Activities Alert Bar if any */}
          {delayedActivities.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs mb-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Delayed or Incomplete Activities Identified ({delayedActivities.length} Slots)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {delayedActivities.slice(0, 6).map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-rose-100 shadow-xs text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900">{item.userName} ({item.userRole})</span>
                      <span className="text-[10px] text-slate-400 font-bold">{item.timeSlot}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium line-clamp-1">{item.plannedTask || 'Assigned task'}</p>
                    <p className="text-[11px] text-rose-700 font-semibold bg-rose-50/70 p-1 rounded-md">
                      Remark: {item.remarks || 'No reason provided'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Utilization Sheet — Excel-style roster: State -> Trainer rows -> hourly columns */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900">Utilization Sheet</h3>
                <p className="text-xs text-slate-500">
                  {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · Grouped by state, one row per trainer
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Showing {filteredMonitoringLogs.length} Staff Members
              </span>
            </div>

            {(() => {
              let sheetSno = 0;
              const timeColumns = DEFAULT_SLOT_TEMPLATES;
              return (
                <div className="overflow-x-auto">
                  {utilizationSheetSections.length === 0 && (
                    <div className="py-10 text-center text-xs font-bold text-slate-400">No staff logs found for this date / filter.</div>
                  )}
                  {utilizationSheetSections.map((section) => (
                    <table key={section.zoneKey} className="w-full text-left border-collapse text-[11px] mb-1">
                      <thead>
                        <tr>
                          <th
                            colSpan={5 + timeColumns.length}
                            className="bg-slate-900 text-white text-xs font-black uppercase tracking-wider py-2.5 px-4"
                          >
                            {section.zoneLabel}
                          </th>
                        </tr>
                        <tr className="bg-sky-50 text-[10px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200">
                          <th className="py-2.5 px-2 text-center w-10">SNO</th>
                          <th className="py-2.5 px-3">Trainer Name</th>
                          <th className="py-2.5 px-3">Course</th>
                          <th className="py-2.5 px-3">Part Time / Full Time</th>
                          {timeColumns.map((tc) => (
                            <th key={tc.slotIndex} className="py-2.5 px-2 text-center whitespace-nowrap">
                              {tc.timeSlot}
                            </th>
                          ))}
                          <th className="py-2.5 px-3 text-center">Session Status</th>
                          <th className="py-2.5 px-3 text-center">Task Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {section.rows.map((log) => {
                          const info = trainerInfoLookup[log.userId];
                          const course = log.course || info?.course || '—';
                          const employmentType = log.employmentType || 'Full Time';
                          const mergedCells = buildMergedSlotCells(log.slots);
                          const sessionBadge = getSessionStatusBadge(log);
                          const taskBadge = getTaskStatusBadge(log);
                          sheetSno += 1;

                          return (
                            <tr
                              key={log.userId}
                              className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                              onClick={() => {
                                if (roleType === 'tl') {
                                  setSelectedTrainerForPlan(log.userId);
                                  setActiveSubTab('team_planner');
                                } else {
                                  setEditingSlotModal({ log, slot: log.slots?.[0] || DEFAULT_SLOT_TEMPLATES[0], isPlanMode: false });
                                }
                              }}
                            >
                              <td className="py-2 px-2 text-center text-slate-400 font-bold">{sheetSno}</td>
                              <td className="py-2 px-3">
                                <div className="font-extrabold text-slate-900">{log.userName}</div>
                                <span className="text-[9px] text-slate-400">{log.branchName || info?.branchName || 'Academy Desk'}</span>
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-700 uppercase">{course}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                    employmentType === 'Part Time'
                                      ? 'bg-violet-50 text-violet-700 border-violet-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {employmentType}
                                </span>
                              </td>
                              {mergedCells.map((cell, idx) => (
                                <td
                                  key={idx}
                                  colSpan={cell.span}
                                  title={`${cell.timeSlot}: ${cell.text} (${cell.status})`}
                                  className={`py-2 px-2 text-center font-semibold truncate max-w-[140px] ${getSheetSlotColor(cell.status, cell.isBreak)}`}
                                >
                                  {cell.isBreak ? 'Lunch Break' : cell.text}
                                </td>
                              ))}
                              <td className="py-2 px-3 text-center">
                                <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full border ${sessionBadge.cls}`}>
                                  {sessionBadge.label}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full border ${taskBadge.cls}`}>
                                  {taskBadge.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: UTILIZATION REPORTS (TEAM, MANAGER, HEAD)                         */}
      {/* ========================================================================= */}
      {(activeSubTab === 'team_report' || activeSubTab === 'manager_report' || activeSubTab === 'head_report') && (
        <div className="space-y-6">
          {/* Summary Rollup Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {teamSummaries.map((team) => (
              <div key={team.teamLeadId} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      Squad: {team.zoneLabel}
                    </span>
                    <h4 className="text-base font-black text-slate-900 mt-1">{team.teamLeadName}&apos;s Team</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-emerald-700">{team.utilizationPercentage}%</span>
                    <span className="text-[10px] block text-slate-400">Team Rate</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Planned Hours</span>
                    <span className="font-extrabold text-slate-900">{team.totalPlannedHours}h</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Actual Completed</span>
                    <span className="font-extrabold text-sky-700">{team.totalActualHours}h</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Completed Tasks</span>
                    <span className="font-extrabold text-emerald-600">{team.completedTasks}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Pending / Delayed</span>
                    <span className="font-extrabold text-amber-600">{team.pendingTasks} ({team.delayedTasks})</span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  Reporting Manager: <span className="font-bold text-slate-700">{team.managerName}</span> ({team.memberCount} members)
                </div>
              </div>
            ))}
          </div>

          {/* Manager Level Summaries for Head */}
          {roleType === 'head' && managerSummaries.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-900">Regional Training Manager Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {managerSummaries.map((m) => (
                  <div key={m.managerId} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-900">{m.managerName} — {m.zoneLabel}</h4>
                      <span className="text-base font-black text-teal-700">{m.utilizationPercentage}%</span>
                    </div>
                    <div className="text-xs text-slate-600 flex items-center justify-between">
                      <span>Planned: {m.totalPlannedHours}h · Actual: {m.totalActualHours}h</span>
                      <span>Staff Supervised: {m.staffCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: UPDATE ACTUAL PROGRESS FOR A SLOT (TRAINER OR LEADER)           */}
      {/* ========================================================================= */}
      {editingSlotModal && !editingSlotModal.isPlanMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 text-left space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                  {editingSlotModal.slot.timeSlot}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Update Hourly Work: {editingSlotModal.log.userName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSlotModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target;
                handleSaveActualSlot(editingSlotModal.slot.slotIndex, {
                  userId: editingSlotModal.log.userId,
                  actualWork: form.actualWork.value,
                  status: form.status.value,
                  remarks: form.remarks.value,
                  relatedEntity: form.relatedEntity.value,
                  relatedEntityType: form.relatedEntityType.value
                });
              }}
              className="space-y-4 text-xs font-semibold text-slate-700"
            >
              {/* Planned Task Display */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                  Assigned Planned Task
                </span>
                <p className="text-xs font-bold text-slate-800">
                  {editingSlotModal.slot.plannedTask || 'No specific task set by TL.'}
                </p>
              </div>

              {/* Actual Work Completed */}
              <div className="space-y-1">
                <label className="block text-slate-800 font-bold">
                  Actual Work Completed: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  name="actualWork"
                  required
                  defaultValue={editingSlotModal.slot.actualWork || editingSlotModal.slot.plannedTask || ''}
                  rows={3}
                  placeholder="Detail the exact topics covered, demos completed, batches mentored, or doubt queries resolved..."
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-teal-600 outline-none text-xs"
                />
              </div>

              {/* Status Selector */}
              <div className="space-y-1">
                <label className="block text-slate-800 font-bold">
                  Task Execution Status: <span className="text-rose-500">*</span>
                </label>
                <select
                  name="status"
                  defaultValue={editingSlotModal.slot.status || 'Completed'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-teal-600 outline-none text-xs font-bold bg-white"
                >
                  <option value="Completed">Completed (1.0 hr actual work)</option>
                  <option value="In Progress">In Progress (0.5 hr partial)</option>
                  <option value="Delayed">Delayed / Blocked (0.0 hr — requires remark)</option>
                  <option value="Pending">Pending (0.0 hr)</option>
                </select>
              </div>

              {/* Remarks / Reasons for incomplete work */}
              <div className="space-y-1">
                <label className="block text-slate-800 font-bold">
                  Remarks / Reasons for Incomplete or Delayed Work:
                </label>
                <input
                  type="text"
                  name="remarks"
                  defaultValue={editingSlotModal.slot.remarks || ''}
                  placeholder="e.g. Student absent, LMS server maintenance, Zoom link issue..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-teal-600 outline-none text-xs"
                />
              </div>

              {/* Related Entity (Batch or Student) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-800 font-bold">Related Type:</label>
                  <select
                    name="relatedEntityType"
                    defaultValue={editingSlotModal.slot.relatedEntityType || 'batch'}
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none text-xs bg-white"
                  >
                    <option value="batch">Batch Class</option>
                    <option value="student">Student / Demo</option>
                    <option value="trainer">Trainer Squad</option>
                    <option value="general">General Academy Work</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-800 font-bold">Related Batch / Student:</label>
                  <input
                    type="text"
                    name="relatedEntity"
                    defaultValue={editingSlotModal.slot.relatedEntity || ''}
                    placeholder="e.g. CPC · Morning Batch, John Doe"
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSlotModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-black shadow-sm transition-colors cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Actual Work'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PLAN SLOT (TL PLANNING A SPECIFIC SLOT)                         */}
      {/* ========================================================================= */}
      {editingSlotModal && editingSlotModal.isPlanMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 text-left space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  TL Slot Planner · {editingSlotModal.slot.timeSlot}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Plan Slot for {editingSlotModal.log.userName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSlotModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target;
                handleSavePlanSlot(editingSlotModal.slot.slotIndex, {
                  userId: editingSlotModal.log.userId,
                  plannedTask: form.plannedTask.value,
                  relatedEntity: form.relatedEntity.value,
                  relatedEntityType: form.relatedEntityType.value,
                  slotType: form.slotType.value
                });
              }}
              className="space-y-4 text-xs font-semibold text-slate-700"
            >
              {/* Quick Template Picker */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Quick Preset Templates:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_TASK_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('plannedTaskInput');
                        if (input) input.value = tmpl.task;
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-[10px] font-bold text-slate-600 transition-colors cursor-pointer border border-slate-200"
                    >
                      {tmpl.task.slice(0, 32)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Planned Task */}
              <div className="space-y-1">
                <label className="block text-slate-800 font-bold">
                  Assigned Planned Task: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="plannedTaskInput"
                  name="plannedTask"
                  required
                  defaultValue={editingSlotModal.slot.plannedTask || ''}
                  rows={2}
                  placeholder="Describe the target activity, syllabus chapter, or demo assignment..."
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-emerald-600 outline-none text-xs"
                />
              </div>

              {/* Slot Type */}
              <div className="space-y-1">
                <label className="block text-slate-800 font-bold">Slot Type:</label>
                <select
                  name="slotType"
                  defaultValue={editingSlotModal.slot.slotType || 'working'}
                  className="w-full p-2.5 rounded-xl border border-slate-300 outline-none text-xs bg-white font-bold"
                >
                  <option value="working">Working Slot (1 Planned Hour)</option>
                  <option value="break">Lunch / Scheduled Break (0 Planned Hours)</option>
                  <option value="meeting">Team Sync / Pod Meeting</option>
                </select>
              </div>

              {/* Related Entity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-800 font-bold">Related Entity Type:</label>
                  <select
                    name="relatedEntityType"
                    defaultValue={editingSlotModal.slot.relatedEntityType || 'batch'}
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none text-xs bg-white"
                  >
                    <option value="batch">Batch</option>
                    <option value="student">Student</option>
                    <option value="trainer">Trainer</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-800 font-bold">Related Batch or Student Name:</label>
                  <input
                    type="text"
                    name="relatedEntity"
                    defaultValue={editingSlotModal.slot.relatedEntity || ''}
                    placeholder="e.g. CPC · Batch 14, Anita R"
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSlotModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-sm transition-colors cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Confirm Plan Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: BULK PLAN NEXT DAY (FOR TL)                                      */}
      {/* ========================================================================= */}
      {bulkPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-left space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Bulk Squad Work Planner
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Initialize Next-Day 8-Hour Work Plan for All Trainers
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBulkPlanModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Apply standard 8-hour schedule across all <span className="font-bold text-slate-900">{subordinateTrainers.length} trainers</span> for target date: <span className="font-bold text-emerald-800">{selectedDate}</span>.
            </p>

            <div className="space-y-3">
              <span className="text-xs font-extrabold text-slate-800 block">Default 8-Hour Slots Structure:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DEFAULT_SLOT_TEMPLATES.map((tmpl, idx) => (
                  <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                    <span className="text-[10px] font-black text-slate-400 block">{tmpl.label}</span>
                    <span className="font-bold text-slate-800">{tmpl.timeSlot}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBulkPlanModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  try {
                    setSaving(true);
                    const plans = subordinateTrainers.map((tr) => ({
                      userId: tr.userId,
                      userName: tr.userName,
                      userRole: 'trainer',
                      teamLeadId: tr.teamLeadId,
                      teamLeadName: tr.teamLeadName,
                      managerId: tr.managerId,
                      managerName: tr.managerName,
                      branchName: tr.branchName,
                      zone: tr.zone,
                      slots: DEFAULT_SLOT_TEMPLATES.map((tmpl, sIdx) => ({
                        slotIndex: sIdx,
                        timeSlot: tmpl.timeSlot,
                        slotType: tmpl.slotType,
                        plannedTask: tmpl.slotType === 'break' ? 'Lunch & Personal Break' : `Conduct Batch / Mentoring Slot ${sIdx + 1}`,
                        relatedEntity: tr.branchName || 'Academy Batch',
                        relatedEntityType: 'batch',
                        status: tmpl.slotType === 'break' ? 'Break' : 'Pending',
                        plannedHours: tmpl.slotType === 'break' ? 0 : 1,
                        plannedBy: effectiveUserName
                      }))
                    }));

                    const res = await bulkSaveTrainerHourlyPlans({ date: selectedDate, plans });
                    if (res && res.success) {
                      setMessage({ type: 'success', text: `Next-day work plan generated for all ${subordinateTrainers.length} trainers!` });
                      setBulkPlanModalOpen(false);
                      await loadUtilizationData();
                    }
                  } catch (err) {
                    console.error(err);
                    setMessage({ type: 'error', text: 'Bulk plan generation failed.' });
                  } finally {
                    setSaving(false);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-md transition-colors cursor-pointer"
              >
                {saving ? 'Generating...' : `Confirm Bulk Plan (${subordinateTrainers.length} Trainers)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: MARK APPROVED LEAVE                                             */}
      {/* ========================================================================= */}
      {leaveModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 text-left space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  Leave Management
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Mark Leave for {leaveModalUser.userName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLeaveModalUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target;
                try {
                  setSaving(true);
                  const res = await setTrainerLeave({
                    userId: leaveModalUser.userId,
                    date: selectedDate,
                    isLeave: form.isLeave.checked,
                    leaveReason: form.leaveReason.value
                  });
                  if (res && res.success) {
                    setMessage({ type: 'success', text: `Leave record updated for ${leaveModalUser.userName} on ${selectedDate}.` });
                    setLeaveModalUser(null);
                    await loadUtilizationData();
                  }
                } catch (err) {
                  console.error(err);
                  setMessage({ type: 'error', text: 'Failed to update leave.' });
                } finally {
                  setSaving(false);
                }
              }}
              className="space-y-4 text-xs font-semibold text-slate-700"
            >
              <div className="flex items-center gap-2 bg-amber-50 p-3 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  name="isLeave"
                  id="leaveCheck"
                  defaultChecked={leaveModalUser.isLeave !== false}
                  className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                />
                <label htmlFor="leaveCheck" className="text-xs font-bold text-amber-900 cursor-pointer">
                  Mark full day as Approved Leave (0 Planned Hours, Non-working)
                </label>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-800 font-bold">Leave Reason / Approval Reference:</label>
                <input
                  type="text"
                  name="leaveReason"
                  defaultValue={leaveModalUser.leaveReason || 'Approved Casual / Sick Leave'}
                  placeholder="e.g. Medical leave, annual leave..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 outline-none text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLeaveModalUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-black shadow-sm transition-colors cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Leave Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
