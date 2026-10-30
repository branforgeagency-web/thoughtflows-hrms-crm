import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Home,
  PlayCircle,
  CheckSquare,
  AtSign,
  MessageSquare,
  Award,
  Users,
  LayoutGrid,
  GraduationCap,
  AlertTriangle,
  ListChecks,
  UserPlus,
  Network,
  LogOut,
  ArrowLeft,
  Bell,
  Search,
  CheckCircle2,
  Calendar,
  Clock,
  Shuffle,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Filter,
  X,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Crown,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Send,
  Check,
  Menu
} from 'lucide-react';
import TeamRosterBoard from './TeamRosterBoard';
import CourseSyllabusBoard from './CourseSyllabusBoard';
import TrainerOrgHierarchyChart from './TrainerOrgHierarchyChart';
import {
  getTrainerCredentials,
  getTrainerSettings,
  getBatches,
  getBranches,
  getStudents,
  getDemos,
  reassignDemo,
  bulkReassignDemos,
  rescheduleDemo,
  allocateTrainerToStudent,
  recordTrainerAttendance,
  getTrainerDoubts,
  markSyllabusComplete,
  onDataUpdate,
  updateStudent
} from '../services/api';
import { localDateKey } from '../utils/dateUtils';
import { redirectToWhatsAppWeb } from '../utils/whatsapp';

export default function TrainerRoleDashboard({
  roleType = 'head', // 'head' | 'manager' | 'tl'
  initialLeaderId = null,
  onBack,
  currentUser,
  onLogout,
  onSwitchDepartment,
  onClose
}) {
  const [activeNav, setActiveNav] = useState('home');
  const isHeadRole = roleType === 'head';

  useEffect(() => {
    if (!isHeadRole && (activeNav === 'weak_students' || activeNav === 'doubts')) {
      setActiveNav('home');
    }
  }, [isHeadRole, activeNav]);
  const [navOpen, setNavOpen] = useState(false);
  const [trainersList, setTrainersList] = useState([]);
  const [batchesList, setBatchesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [demosList, setDemosList] = useState([]);
  const [doubtsList, setDoubtsList] = useState([]);
  const [trainerCredentials, setTrainerCredentials] = useState({ head: [], managers: [], teamLeads: [], faculty: [] });
  const [loading, setLoading] = useState(true);

  // Active Leader Selection
  const [activeLeaderId, setActiveLeaderId] = useState(() => {
    if (initialLeaderId) return initialLeaderId;
    return currentUser?._id || currentUser?.id || currentUser?.userName || currentUser?.name || 'leader';
  });

  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Reassignment & Reschedule State
  const [reassignToast, setReassignToast] = useState('');
  const flashToast = (m, ms = 4000) => { setReassignToast(m); setTimeout(() => setReassignToast(''), ms); };
  const [reassignDemoTarget, setReassignDemoTarget] = useState(null);
  const [reassignForm, setReassignForm] = useState({ toTrainerId: '', reason: '' });
  const [reassigning, setReassigning] = useState(false);
  const [bulkReassignOpen, setBulkReassignOpen] = useState(false);
  const [bulkReassignForm, setBulkReassignForm] = useState({ fromTrainerId: '', toTrainerId: '', date: '', reason: '' });
  const [bulkReassigning, setBulkReassigning] = useState(false);
  const [rescheduleDemoTarget, setRescheduleDemoTarget] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ preferredDate: '', timeSlot: '', toTrainerId: '', reason: '' });
  const [rescheduling, setRescheduling] = useState(false);

  // Attendance Tab State (matching user's screenshot)
  const todayKey = localDateKey();
  const [attendanceBatch, setAttendanceBatch] = useState('');
  const [attendanceTopic, setAttendanceTopic] = useState('');
  const [attendanceMarks, setAttendanceMarks] = useState({}); // studentId -> 'present' | 'absent' | 'late'
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceSavedToast, setAttendanceSavedToast] = useState('');

  // Allocation Tab State
  const [allocatingStudent, setAllocatingStudent] = useState(null);
  const [allocationTargetTrainer, setAllocationTargetTrainer] = useState('');
  const [allocationSaving, setAllocationSaving] = useState(false);

  // Close mobile nav on nav switch
  useEffect(() => { setNavOpen(false); }, [activeNav]);

  const loadData = useCallback(() => {
    Promise.all([
      getTrainerSettings().catch(() => []),
      getBatches().catch(() => []),
      getBranches().catch(() => []),
      getStudents().catch(() => []),
      getDemos().catch(() => []),
      getTrainerDoubts().catch(() => []),
      getTrainerCredentials().catch(() => ({ head: [], managers: [], teamLeads: [], faculty: [] }))
    ]).then(([tData, bData, brData, sData, dData, dbtData, credData]) => {
      // Pure Real Data: Use trainers returned directly from database / API
      const realTrainers = [...(Array.isArray(tData) ? tData : [])];
      const knownNames = new Set(realTrainers.map((t) => String(t.trainerName || t.name || '').toLowerCase()).filter(Boolean));
      (Array.isArray(bData) ? bData : []).forEach((b) => {
        const bTrName = b.trainer || b.faculty || b.trainerName;
        if (bTrName && !knownNames.has(bTrName.toLowerCase())) {
          knownNames.add(bTrName.toLowerCase());
          realTrainers.push({
            trainerId: b.trainerId || `tr_${bTrName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            trainerName: bTrName,
            branchName: b.branch || '',
            courseKey: b.course || '',
            role: 'Faculty Trainer',
            active: true
          });
        }
      });

      setTrainersList(realTrainers);
      setBatchesList(Array.isArray(bData) ? bData : []);
      setBranchesList(Array.isArray(brData) ? brData : []);
      setStudentsList(Array.isArray(sData) ? sData : []);
      setDemosList(Array.isArray(dData) ? dData : []);
      setDoubtsList(Array.isArray(dbtData) ? dbtData : []);
      if (credData) setTrainerCredentials(credData);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadData();
    const unsub = onDataUpdate((entity) => {
      if (['students', 'trainers', 'batches', 'demos', 'doubts', 'trainer_attendance'].includes(entity)) {
        loadData();
      }
    });
    return () => unsub();
  }, [loadData]);

  // Current Role & Active Leader Configuration — Dynamically derived 100% from authenticated profile
  const currentLeader = useMemo(() => {
    const rawName = currentUser?.name || currentUser?.userName || '';
    const userRole = currentUser?.role || currentUser?.trainerRole || '';
    const initialBadge = rawName ? rawName.slice(0, 2).toUpperCase() : (roleType === 'head' ? 'HT' : roleType === 'manager' ? 'TM' : 'TL');

    if (roleType === 'head') {
      return {
        id: currentUser?._id || currentUser?.id || 'head',
        name: rawName || 'Department Head',
        roleTitle: 'Department Head of Training',
        badge: initialBadge,
        scopeLabel: `Consolidated Academy · ${trainersList.length} Faculty`,
        zone: 'All Regions (Nationwide)',
        topBarGrad: 'linear-gradient(135deg, #005a9c, #0284c7)',
        managerLabel: 'Department Head of Training'
      };
    }
    if (roleType === 'manager') {
      return {
        id: currentUser?._id || currentUser?.id || 'manager',
        name: rawName || 'Training Manager',
        roleTitle: userRole || 'Training Manager',
        badge: initialBadge,
        scopeLabel: `Assigned Department · ${trainersList.length} Faculty`,
        zone: currentUser?.zone || currentUser?.branch || 'Assigned Region',
        topBarGrad: 'linear-gradient(135deg, #00828a, #0d9488)',
        managerLabel: 'Training Manager'
      };
    }
    // Team Lead
    return {
      id: currentUser?._id || currentUser?.id || 'tl',
      name: rawName || 'Team Lead',
      roleTitle: userRole || 'Training Team Lead',
      badge: initialBadge,
      scopeLabel: `Assigned Pod · ${trainersList.length} Faculty`,
      zone: currentUser?.zone || currentUser?.branch || 'Assigned Pod',
      topBarGrad: 'linear-gradient(135deg, #2e7d32, #16a34a)',
      managerLabel: 'Training Team Lead'
    };
  }, [roleType, currentUser, trainersList]);

  // Scoped Trainers based on real database associations and user permissions
  const scopedTrainers = useMemo(() => {
    let list = trainersList;

    if (roleType === 'head') {
      // Head sees all trainers
    } else if (currentUser?.supervisedTrainers && Array.isArray(currentUser.supervisedTrainers) && currentUser.supervisedTrainers.length > 0) {
      list = list.filter((t) => currentUser.supervisedTrainers.includes(t.trainerId || t.id));
    } else if (currentUser?.branches && Array.isArray(currentUser.branches) && currentUser.branches.length > 0) {
      const lowerB = currentUser.branches.map((b) => b.toLowerCase());
      list = list.filter((t) => lowerB.includes(String(t.branchName || t.branch || '').toLowerCase()));
    } else if (roleType === 'manager') {
      if (activeLeaderId === 'keerthi') {
        list = list.filter((t) => t.managerId === 'keerthi' || ['TN', 'KL'].includes(t.zone) || /tamil|kerala|coimbatore|kochi|trivandrum|salem|trichy/i.test(`${t.branchName || ''} ${t.branch || ''}`));
      } else if (activeLeaderId === 'pavithra') {
        list = list.filter((t) => t.managerId === 'pavithra' || ['AP / TS', 'AP', 'TS'].includes(t.zone) || /telangana|andhra|hyderabad|ameerpet|dilsukhnagar|tirupati|vizag/i.test(`${t.branchName || ''} ${t.branch || ''}`));
      }
    } else if (roleType === 'tl') {
      if (activeLeaderId === 'ram_balaji') {
        list = list.filter((t) => t.teamLeadId === 'ram_balaji' || t.zone === 'TN');
      } else if (activeLeaderId === 'vaishna') {
        list = list.filter((t) => t.teamLeadId === 'vaishna' || t.zone === 'KL');
      } else if (activeLeaderId === 'mounika') {
        list = list.filter((t) => t.teamLeadId === 'mounika' || t.zone === 'AP / TS');
      }
    }

    if (selectedBranchFilter !== 'all') {
      list = list.filter((t) => String(t.branchName || t.branch || '').toLowerCase().includes(selectedBranchFilter.toLowerCase()));
    }
    return list;
  }, [trainersList, roleType, currentUser, activeLeaderId, selectedBranchFilter]);

  const scopedTrainerNames = useMemo(() => {
    return scopedTrainers.map((t) => t.trainerName || t.name).filter(Boolean);
  }, [scopedTrainers]);

  const scopedTrainerIds = useMemo(() => {
    return scopedTrainers.map((t) => t.trainerId || t.id).filter(Boolean);
  }, [scopedTrainers]);

  // Scoped Demos
  const scopedDemos = useMemo(() => {
    if (roleType === 'head') return demosList;
    return demosList.filter((d) => {
      const tName = String(d.trainer || d.trainerMapping || '').toLowerCase();
      return scopedTrainerNames.some((stn) => tName.includes(stn.toLowerCase()));
    });
  }, [demosList, roleType, scopedTrainerNames]);

  // Scoped Batches
  const scopedBatches = useMemo(() => {
    if (roleType === 'head') return batchesList;
    return batchesList.filter((b) => {
      const bTrainer = String(b.trainer || b.faculty || '').toLowerCase();
      return scopedTrainerNames.some((stn) => bTrainer.includes(stn.toLowerCase()));
    });
  }, [batchesList, roleType, scopedTrainerNames]);

  // Scoped Students
  const scopedStudents = useMemo(() => {
    if (roleType === 'head') return studentsList;
    return studentsList.filter((st) => {
      if (st.trainerId && scopedTrainerIds.includes(st.trainerId)) return true;
      const tName = String(st.trainer || st.faculty || '').toLowerCase();
      if (scopedTrainerNames.some((stn) => tName.includes(stn.toLowerCase()))) return true;
      const bName = String(st.batch || st.batchName || '').toLowerCase();
      return scopedBatches.some((sb) => String(sb.name || sb.batchId || '').toLowerCase() === bName);
    });
  }, [studentsList, roleType, scopedTrainerIds, scopedTrainerNames, scopedBatches]);

  // Scoped Doubts
  const scopedDoubts = useMemo(() => {
    if (roleType === 'head') return doubtsList;
    return doubtsList.filter((d) => {
      if (d.trainerId && scopedTrainerIds.includes(d.trainerId)) return true;
      const tName = String(d.trainerName || d.trainer || '').toLowerCase();
      return scopedTrainerNames.some((stn) => tName.includes(stn.toLowerCase()));
    });
  }, [doubtsList, roleType, scopedTrainerIds, scopedTrainerNames]);

  // Pending Allocation Students
  const pendingAllocationStudents = useMemo(() => {
    const list = studentsList.filter((st) => {
      const isHandedOver = st.handoverStatus === 'Handed Over to Head of Trainer' || (st.handoverStatus === 'Sent to Training' && !st.trainerId);
      return isHandedOver && !st.trainerId;
    });
    if (roleType === 'head') return list;
    return list.filter((st) => {
      const text = `${st.branch || ''} ${st.state || ''} ${st.location || ''}`.toLowerCase();
      if (activeLeaderId === 'keerthi' || activeLeaderId === 'ram_balaji') return /tamil|coimbatore|salem|trichy/i.test(text);
      if (activeLeaderId === 'vaishna') return /kerala|kochi|trivandrum/i.test(text);
      if (activeLeaderId === 'pavithra' || activeLeaderId === 'mounika') return /telangana|andhra|hyderabad/i.test(text);
      return true;
    });
  }, [studentsList, roleType, activeLeaderId]);

  // Weak Students (<75% attendance or low score)
  const weakStudents = useMemo(() => {
    return scopedStudents.filter((st) => {
      const att = Number(st.attendancePercentage ?? st.attendance ?? 85);
      const score = Number(st.averageScore ?? st.score ?? 80);
      return att < 75 || score < 60 || st.isWeak === true;
    });
  }, [scopedStudents]);

  // Auto-select attendance batch
  useEffect(() => {
    if (!attendanceBatch && scopedBatches.length > 0) {
      setAttendanceBatch(scopedBatches[0].batchId || scopedBatches[0].name || '');
    }
  }, [scopedBatches, attendanceBatch]);

  // Students in selected attendance batch
  const attendanceStudents = useMemo(() => {
    if (!attendanceBatch) return [];
    return scopedStudents.filter((st) => {
      const b = String(st.batch || st.batchName || st.batchId || '').toLowerCase();
      return b === String(attendanceBatch).toLowerCase();
    });
  }, [scopedStudents, attendanceBatch]);

  // Handle Attendance Save
  const handleSaveAttendance = async () => {
    if (!attendanceBatch) {
      flashToast('⚠ Please select a batch first');
      return;
    }
    setAttendanceSaving(true);
    try {
      const marksPayload = attendanceStudents.map((st) => ({
        studentId: st.studentId || st._id,
        name: st.name,
        status: attendanceMarks[st.studentId || st._id] || 'present',
        durationMinutes: 110 // Online session compliance duration (>105 min rule)
      }));

      await recordTrainerAttendance({
        batchId: attendanceBatch,
        topic: attendanceTopic || 'Regular Curriculum Module',
        date: todayKey,
        students: marksPayload,
        markedBy: currentLeader.name,
        role: currentLeader.roleTitle
      });

      // Also tick batch syllabus if topic is provided
      if (attendanceTopic) {
        markSyllabusComplete(attendanceBatch, { topic: attendanceTopic, date: todayKey }).catch(() => {});
      }

      setAttendanceSavedToast(`✓ Attendance recorded for ${marksPayload.length} student(s) in ${attendanceBatch}`);
      setTimeout(() => setAttendanceSavedToast(''), 4500);
      loadData();
    } catch (e) {
      flashToast(`⚠ Failed to record attendance: ${e?.response?.data?.error || e.message}`);
    } finally {
      setAttendanceSaving(false);
    }
  };

  // Demo Actions
  const openReassign = (demo) => {
    setReassignDemoTarget(demo);
    setReassignForm({ toTrainerId: '', reason: '' });
  };

  const confirmReassignOne = async () => {
    if (!reassignDemoTarget || !reassignForm.toTrainerId) return;
    setReassigning(true);
    try {
      await reassignDemo(reassignDemoTarget._id, { toTrainerId: reassignForm.toTrainerId, reason: reassignForm.reason });
      const toName = scopedTrainers.find((t) => (t.trainerId || t.id) === reassignForm.toTrainerId)?.name || 'the new trainer';
      flashToast(`✓ ${reassignDemoTarget.candidateName}'s demo reassigned to ${toName}`);
      setReassignDemoTarget(null);
      loadData();
    } catch (e) {
      flashToast(`⚠ ${e?.response?.data?.error || e.message || 'Could not reassign this demo'}`, 5000);
    } finally {
      setReassigning(false);
    }
  };

  const confirmBulkReassign = async () => {
    const { fromTrainerId, toTrainerId, date, reason } = bulkReassignForm;
    if (!fromTrainerId || !toTrainerId) { flashToast('⚠ Pick both trainers first', 3000); return; }
    if (fromTrainerId === toTrainerId) { flashToast('⚠ Pick two different trainers', 3000); return; }
    setBulkReassigning(true);
    try {
      const res = await bulkReassignDemos({ fromTrainerId, toTrainerId, date, reason });
      const count = res?.reassigned || 0;
      if (count === 0) {
        flashToast('No upcoming demos found for that trainer' + (date ? ` on ${date}` : '') + '.', 4000);
      } else {
        const fromName = scopedTrainers.find((t) => (t.trainerId || t.id) === fromTrainerId)?.name || 'the trainer';
        const toName = scopedTrainers.find((t) => (t.trainerId || t.id) === toTrainerId)?.name || 'the new trainer';
        flashToast(`✓ ${count} demo${count === 1 ? '' : 's'} moved from ${fromName} to ${toName}`);
        setBulkReassignForm({ fromTrainerId: '', toTrainerId: '', date: '', reason: '' });
        setBulkReassignOpen(false);
      }
      loadData();
    } catch (e) {
      flashToast(`⚠ ${e?.response?.data?.error || e.message || 'Bulk reassignment failed'}`, 5000);
    } finally {
      setBulkReassigning(false);
    }
  };

  const openReschedule = (demo) => {
    setRescheduleDemoTarget(demo);
    setRescheduleForm({
      preferredDate: demo.preferredDate || '',
      timeSlot: demo.timeSlot || demo.preferredTime || '',
      toTrainerId: demo.trainerId || '',
      reason: ''
    });
  };

  const confirmReschedule = async () => {
    if (!rescheduleDemoTarget || !rescheduleForm.preferredDate) return;
    setRescheduling(true);
    try {
      await rescheduleDemo(rescheduleDemoTarget._id, {
        preferredDate: rescheduleForm.preferredDate,
        timeSlot: rescheduleForm.timeSlot,
        toTrainerId: rescheduleForm.toTrainerId || undefined,
        reason: rescheduleForm.reason
      });
      flashToast(`✓ Demo for ${rescheduleDemoTarget.candidateName} rescheduled to ${rescheduleForm.preferredDate}`);
      setRescheduleDemoTarget(null);
      loadData();
    } catch (e) {
      flashToast(`⚠ ${e?.response?.data?.error || e.message || 'Reschedule failed'}`);
    } finally {
      setRescheduling(false);
    }
  };

  // Student Allocation Action
  const handleConfirmAllocation = async () => {
    if (!allocatingStudent || !allocationTargetTrainer) return;
    setAllocationSaving(true);
    try {
      const tr = scopedTrainers.find((t) => (t.trainerId || t.id) === allocationTargetTrainer);
      await allocateTrainerToStudent(allocatingStudent.studentId || allocatingStudent._id, {
        trainerId: allocationTargetTrainer,
        trainerName: tr?.trainerName || tr?.name || 'Faculty',
        handoverStatus: 'Allocated to Trainer'
      });
      flashToast(`✓ ${allocatingStudent.name} allocated to ${tr?.name || 'Faculty'}`);
      setAllocatingStudent(null);
      setAllocationTargetTrainer('');
      loadData();
    } catch (e) {
      flashToast(`⚠ Allocation failed: ${e?.response?.data?.error || e.message}`);
    } finally {
      setAllocationSaving(false);
    }
  };

  // Nav Title Helper
  const getNavTitle = () => {
    switch (activeNav) {
      case 'home': return `${roleType === 'head' ? 'Executive Command' : roleType === 'manager' ? 'Regional Operations' : 'Pod Operations'} Desk`;
      case 'session_room': return 'Class Session Room & Live Class Monitoring';
      case 'batch_desk': return 'Syllabus & Announcements';
      case 'attendance': return 'Daily Student Attendance';
      case 'demos': return 'Demos & Faculty Reassignment';
      case 'doubts': return 'Student Doubt Box & Escalations';
      case 'scorecard': return 'Faculty Scorecard & Incentive Ledger';
      case 'allocation': return 'Student Handover & Trainer Allocation Desk';
      case 'batches': return 'Batches & Faculty Distribution';
      case 'students': return 'Supervised Students';
      case 'weak_students': return 'Weak Students & Remedial Interventions';
      case 'roster': return 'Trainer Roster & Shift Allocations';
      case 'org_tree': return 'Organization Hierarchy Chart';
      default: return 'Trainer Portal';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-[#0d1a24] text-slate-100 font-sans antialiased overflow-hidden animate-fadeIn">
      {/* Toast Bar */}
      {reassignToast && (
        <div className="fixed top-4 right-4 z-[999] px-4 py-3 rounded-2xl bg-slate-900 border border-teal-500/50 text-white text-xs font-bold shadow-2xl animate-bounce flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{reassignToast}</span>
        </div>
      )}

      {/* Mobile Drawer Overlay */}
      {navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* ================= LEFT SIDEBAR (Dark Theme #0b1720) ================= */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-[#0b1720] border-r border-[#152a36] shrink-0 flex flex-col transition-transform duration-300 ${
          navOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-[#152a36] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/thoughtflows-logo.png"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              alt="Thoughtflows"
              className="h-7 w-auto object-contain"
            />
            <div className="leading-tight">
              <div className="text-white text-xs font-black tracking-wider">THOUGHTFLOWS</div>
              <div className="text-[9.5px] text-[#00897b] font-bold tracking-widest uppercase">
                {roleType === 'head' ? 'DEPARTMENT HEAD OF TRAINING' : roleType === 'manager' ? 'TRAINER MANAGER' : 'TRAINING TEAM LEAD'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setNavOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Back Button: All Trainer Roles */}
        {onBack && (
          <div className="px-3 pt-3 pb-1">
            <button
              type="button"
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
              title="Back to all Trainer Department roles"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-teal-400" />
              <span>All Trainer Roles</span>
            </button>
          </div>
        )}

        {/* Who's this? Identity Picker Card (Role-Specific) */}
        <div className="px-3 py-2">
          <div className="bg-[#162734] border border-[#213a4d] rounded-2xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-white text-[11px] font-bold">Who's this?</span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-[#00897b]/20 text-[#00897b] border border-[#00897b]/30">
                {roleType === 'head' ? 'Head of Faculty' : roleType === 'manager' ? 'Manager' : 'Team Lead'}
              </span>
            </div>

            {roleType === 'head' ? (
              <div className="flex items-center gap-2.5 bg-[#0c1921] border border-[#213a4d] rounded-xl p-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                  {(currentUser?.name || 'H').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white text-xs font-bold truncate">
                    {currentUser?.name || 'Head of Training'}
                  </div>
                  <div className="text-[#649297] text-[10px] font-medium truncate">
                    Head of Training · {trainersList.length} Faculty
                  </div>
                </div>
              </div>
            ) : roleType === 'manager' ? (
              <div className="space-y-2">
                <div className="text-[#649297] text-[10px] leading-snug">
                  Select active regional manager.
                </div>
                <select
                  value={activeLeaderId}
                  onChange={(e) => setActiveLeaderId(e.target.value)}
                  className="w-full bg-[#0c1921] border border-[#213a4d] text-white text-xs font-semibold rounded-xl px-2.5 py-2 outline-none focus:border-[#00897b] cursor-pointer"
                >
                  {(trainerCredentials?.managers || []).length > 0 ? (
                    trainerCredentials.managers.map((m) => (
                      <option key={m.id || m.leaderId} value={m.id || m.leaderId}>
                        {m.name} · {m.zone || m.branch || 'Region'}
                      </option>
                    ))
                  ) : (
                    <option value={activeLeaderId}>{currentUser?.name || 'Assigned Manager'}</option>
                  )}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-[#649297] text-[10px] leading-snug">
                  Select active team lead.
                </div>
                <select
                  value={activeLeaderId}
                  onChange={(e) => setActiveLeaderId(e.target.value)}
                  className="w-full bg-[#0c1921] border border-[#213a4d] text-white text-xs font-semibold rounded-xl px-2.5 py-2 outline-none focus:border-[#00897b] cursor-pointer"
                >
                  {(trainerCredentials?.teamLeads || []).length > 0 ? (
                    trainerCredentials.teamLeads.map((tl) => (
                      <option key={tl.id || tl.leaderId} value={tl.id || tl.leaderId}>
                        {tl.name} · {tl.zone || tl.branch || 'Pod'}
                      </option>
                    ))
                  ) : (
                    <option value={activeLeaderId}>{currentUser?.name || 'Assigned Team Lead'}</option>
                  )}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Nav List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-800">
          {/* DAILY */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-[#476b74]">
              DAILY
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActiveNav('home')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                  activeNav === 'home'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <Home className="w-4 h-4 shrink-0" />
                <span>Home</span>
              </button>

              <button
                onClick={() => setActiveNav('session_room')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                  activeNav === 'session_room'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <PlayCircle className="w-4 h-4 shrink-0" />
                <span>Class Session Room</span>
              </button>

              <button
                onClick={() => setActiveNav('batch_desk')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                  activeNav === 'batch_desk'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>{roleType === 'manager' ? 'Add / Manage Course Syllabus' : 'Course Syllabus (View)'}</span>
              </button>

              <button
                onClick={() => setActiveNav('attendance')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all ${
                  activeNav === 'attendance'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-4 h-4 shrink-0" />
                  <span>Attendance</span>
                </div>
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Live
                </span>
              </button>

              <button
                onClick={() => setActiveNav('demos')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all ${
                  activeNav === 'demos'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AtSign className="w-4 h-4 shrink-0" />
                  <span>Demos</span>
                </div>
                {scopedDemos.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300">
                    {scopedDemos.length}
                  </span>
                )}
              </button>

              {isHeadRole && (
                <button
                  onClick={() => setActiveNav('doubts')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeNav === 'doubts'
                      ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                      : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span>Doubt Box</span>
                  </div>
                  {scopedDoubts.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300">
                      {scopedDoubts.length}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* GROWTH */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-[#476b74]">
              GROWTH
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActiveNav('scorecard')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                  activeNav === 'scorecard'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <Award className="w-4 h-4 shrink-0" />
                <span>My Scorecard & Incentive Ledger</span>
              </button>
            </div>
          </div>

          {/* ACADEMIC */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-[#476b74]">
              ACADEMIC
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActiveNav('allocation')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all ${
                  activeNav === 'allocation'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span>Student Allocation</span>
                </div>
                {pendingAllocationStudents.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-900">
                    {pendingAllocationStudents.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveNav('batches')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                  activeNav === 'batches'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span>My Batches</span>
              </button>

              <button
                onClick={() => setActiveNav('students')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                  activeNav === 'students'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>My Students</span>
              </button>

              {isHeadRole && (
                <button
                  onClick={() => setActiveNav('weak_students')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeNav === 'weak_students'
                      ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                      : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Weak Students</span>
                  </div>
                  {weakStudents.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                      {weakStudents.length}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => setActiveNav('roster')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all ${
                  activeNav === 'roster'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Trainer Roster</span>
                </div>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-300">
                  {scopedTrainers.length}
                </span>
              </button>
            </div>
          </div>

          {/* ORGANIZATION */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-[#476b74]">
              ORGANIZATION
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActiveNav('org_tree')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                  activeNav === 'org_tree'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <Network className="w-4 h-4 shrink-0" />
                <span>Org Hierarchy Tree</span>
              </button>
            </div>
          </div>
        </div>

        {/* Logout Bottom Action */}
        <div className="p-3 border-t border-[#172d3b]">
          <button
            onClick={() => (onLogout ? onLogout() : onClose ? onClose() : null)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 hover:text-white hover:bg-rose-900/60 transition-all text-xs font-semibold cursor-pointer shadow-xs"
            title="Sign Out of Trainer Portal"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className="flex-1 min-w-0 bg-[#f4f7f8] overflow-y-auto flex flex-col">
        {/* Sticky Top Header */}
        <header className="px-4 sm:px-6 py-4 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm sticky top-0 z-20 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setNavOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-[#0f242d] tracking-tight truncate">
                {getNavTitle()}
              </h1>
              <p className="text-xs text-slate-500 font-medium truncate">
                Thoughtflows Medical Coding Academy · {currentLeader.name} ({currentLeader.roleTitle})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => flashToast(`Logged in as ${currentLeader.name} · ${currentLeader.scopeLabel}`)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Back to all Trainer Department roles"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Trainer Roles</span>
              </button>
            )}

            {(onLogout || onClose) && (
              <button
                onClick={onLogout || onClose}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-xs transition-all cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1720px] w-full mx-auto">
          {/* ================= VIEW: ATTENDANCE (MATCHES USER SCREENSHOT) ================= */}
          {activeNav === 'attendance' && (
            <div className="space-y-6">
              {attendanceSavedToast && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{attendanceSavedToast}</span>
                </div>
              )}

              {/* Main Panel Card */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-6">
                {/* Header Badge */}
                <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-emerald-600 text-white grid place-items-center">
                      <Check className="w-4 h-4" />
                    </span>
                    <h2 className="text-base font-extrabold text-slate-900">
                      Live Attendance · {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500">Batch:</span>
                    <select
                      value={attendanceBatch}
                      onChange={(e) => setAttendanceBatch(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 outline-none focus:border-[#00897b]"
                    >
                      {scopedBatches.map((b) => (
                        <option key={b.batchId || b.name} value={b.batchId || b.name}>
                          {b.name || b.batchId} ({b.course || 'CPC'} · {b.trainer || 'Faculty'})
                        </option>
                      ))}
                      {scopedBatches.length === 0 && <option value="">No active batches</option>}
                    </select>
                  </div>
                </div>

                {/* Policy Alert Banner (Exact wording from screenshot) */}
                <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 text-teal-950 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-extrabold text-teal-900">
                    <ShieldCheck className="w-4 h-4 text-teal-700" />
                    <span>Online Attendance & Syllabus Policy</span>
                  </div>
                  <ul className="text-slate-700 text-[11.5px] leading-relaxed space-y-1 pl-4 list-disc">
                    <li>
                      <strong>Online Attendance Rule:</strong> For online sessions, the option to mark attendance as Present becomes available <strong>only after the student attends at least 1 hour and 45 minutes (105 mins)</strong>.
                    </li>
                    <li>
                      <strong>Syllabus Tracker:</strong> Saving attendance with a session topic automatically marks and updates that module in the batch syllabus tracker.
                    </li>
                  </ul>
                </div>

                {/* Session Topic Input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold tracking-wider text-slate-600 uppercase">
                    TODAY'S SESSION TOPIC / MODULE
                  </label>
                  <input
                    type="text"
                    value={attendanceTopic}
                    onChange={(e) => setAttendanceTopic(e.target.value)}
                    placeholder="Select from syllabus or type e.g. CPT Surgery — Integumentary system"
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3.5 py-2.5 outline-none focus:border-[#00897b] placeholder:text-slate-400"
                  />
                  <p className="text-[10.5px] text-slate-400">
                    Saving attendance will automatically tick this module in the batch syllabus tracker for this corresponding session.
                  </p>
                </div>

                <div className="text-[11.5px] text-slate-500 leading-relaxed">
                  Mark today's class. Each mark is saved to the student record and recalculates attendance % on the student's dashboard, the HR's student CRM and the Leadership dropout-risk view. HR is alerted automatically when a student drops below 75%.
                </div>

                {/* Student Attendance List */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Students in Batch ({attendanceStudents.length})</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          const allP = {};
                          attendanceStudents.forEach((st) => { allP[st.studentId || st._id] = 'present'; });
                          setAttendanceMarks(allP);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 cursor-pointer"
                      >
                        Mark All Present
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const allA = {};
                          attendanceStudents.forEach((st) => { allA[st.studentId || st._id] = 'absent'; });
                          setAttendanceMarks(allA);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 cursor-pointer"
                      >
                        Mark All Absent
                      </button>
                    </div>
                  </div>

                  {attendanceStudents.length === 0 ? (
                    <div className="p-8 text-center text-xs font-medium text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No students allocated to this batch yet.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {attendanceStudents.map((st) => {
                        const sid = st.studentId || st._id;
                        const mark = attendanceMarks[sid] || 'present';
                        const attPct = Math.round(Number(st.attendancePercentage ?? st.attendance ?? 85));
                        const isRisk = attPct < 75;

                        return (
                          <div
                            key={sid}
                            className="p-3.5 flex items-center justify-between flex-wrap gap-3 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 font-bold text-xs text-slate-700 grid place-items-center">
                                {st.name?.charAt(0) || 'S'}
                              </div>
                              <div>
                                <div className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                                  <span>{st.name}</span>
                                  {isRisk && (
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                                      Dropout Risk ({attPct}%)
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10.5px] text-slate-400">
                                  {st.studentId || 'ID-N/A'} · {st.phone || 'No phone'} · Cumulative: {attPct}%
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setAttendanceMarks((prev) => ({ ...prev, [sid]: 'present' }))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  mark === 'present'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => setAttendanceMarks((prev) => ({ ...prev, [sid]: 'late' }))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  mark === 'late'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Late
                              </button>
                              <button
                                type="button"
                                onClick={() => setAttendanceMarks((prev) => ({ ...prev, [sid]: 'absent' }))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  mark === 'absent'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Absent
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Submit Attendance Button */}
                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      disabled={attendanceSaving || attendanceStudents.length === 0}
                      onClick={handleSaveAttendance}
                      className="px-6 py-2.5 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white text-xs font-black shadow-md shadow-[#00897b]/30 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{attendanceSaving ? 'Saving...' : 'Save & Record Attendance'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW: HOME (OVERVIEW & COCKPIT) ================= */}
          {activeNav === 'home' && (
            <div className="space-y-6">
              {/* 5 KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                    Supervised Trainers
                  </div>
                  <div className="text-2xl font-black text-slate-900">{scopedTrainers.length}</div>
                  <div className="text-[10.5px] font-semibold text-emerald-600 mt-1">
                    {scopedTrainers.filter((t) => t.active !== false).length} active now
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                    Active Demos
                  </div>
                  <div className="text-2xl font-black text-slate-900">{scopedDemos.length}</div>
                  <div className="text-[10.5px] font-semibold text-cyan-600 mt-1">
                    {scopedDemos.filter((d) => ['booked', 'confirmed'].includes(String(d.status || '').toLowerCase())).length} upcoming
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                    Running Batches
                  </div>
                  <div className="text-2xl font-black text-slate-900">{scopedBatches.length}</div>
                  <div className="text-[10.5px] font-semibold text-blue-600 mt-1">
                    {scopedStudents.length} enrolled students
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                    Handover Pending
                  </div>
                  <div className="text-2xl font-black text-slate-900">{pendingAllocationStudents.length}</div>
                  <div className="text-[10.5px] font-semibold text-amber-600 mt-1">
                    Needs trainer allocation
                  </div>
                </div>

                {isHeadRole && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                      Weak / At Risk
                    </div>
                    <div className="text-2xl font-black text-rose-600">{weakStudents.length}</div>
                    <div className="text-[10.5px] font-semibold text-rose-500 mt-1">
                      Attendance &lt; 75%
                    </div>
                  </div>
                )}
              </div>

              {/* Demos Reassignment Quick Desk */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <AtSign className="w-4 h-4 text-cyan-600" />
                      <span>Active Demos Desk · 1-Click Reassignment</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Reassign or reschedule demos when a trainer is unavailable or on leave.
                    </p>
                  </div>
                  <button
                    onClick={() => setBulkReassignOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Bulk Reassign Demos</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Candidate</th>
                        <th className="py-2.5 px-3">Course</th>
                        <th className="py-2.5 px-3">Scheduled</th>
                        <th className="py-2.5 px-3">Assigned Trainer</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {scopedDemos.slice(0, 6).map((dm) => (
                        <tr key={dm._id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {dm.candidateName || 'Candidate'}
                            <div className="text-[10px] text-slate-400 font-normal">{dm.phone}</div>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-teal-700">{dm.course || 'CPC'}</td>
                          <td className="py-2.5 px-3">
                            {dm.preferredDate || 'TBD'}
                            <div className="text-[10px] text-slate-400">{dm.timeSlot || 'General'}</div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {dm.trainer || dm.trainerMapping || 'Unassigned'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                              {dm.status || 'booked'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => openReassign(dm)}
                                className="px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10.5px] border border-blue-200 cursor-pointer"
                              >
                                Reassign
                              </button>
                              <button
                                onClick={() => openReschedule(dm)}
                                className="px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[10.5px] border border-amber-200 cursor-pointer"
                              >
                                Reschedule
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {scopedDemos.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                            No demos booked under this team yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Supervised Faculty Roster Grid */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-600" />
                    <span>Supervised Faculty ({scopedTrainers.length})</span>
                  </h3>
                  <button
                    onClick={() => setActiveNav('roster')}
                    className="text-xs font-bold text-[#00897b] hover:underline"
                  >
                    View Full Roster →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {scopedTrainers.map((tr) => (
                    <div
                      key={tr.trainerId || tr.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-teal-600 text-white font-bold text-xs grid place-items-center shrink-0">
                        {(tr.trainerName || tr.name || 'T').charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {tr.trainerName || tr.name}
                        </div>
                        <div className="text-[10.5px] text-slate-500 truncate">
                          {tr.courseKey || tr.course || 'CPC'} · {tr.branchName || tr.branch || 'TN'}
                        </div>
                        <div className="text-[9.5px] text-slate-400 font-medium">
                          Shift: {tr.shift || 'General'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW: DEMOS ================= */}
          {activeNav === 'demos' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Demos Desk & Allocation</h2>
                    <p className="text-xs text-slate-400">Total {scopedDemos.length} demos assigned across your supervised faculty.</p>
                  </div>
                  <button
                    onClick={() => setBulkReassignOpen(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Bulk Reassign Demos</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Candidate</th>
                        <th className="py-3 px-3">Phone</th>
                        <th className="py-3 px-3">Course</th>
                        <th className="py-3 px-3">Date & Slot</th>
                        <th className="py-3 px-3">Faculty</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {scopedDemos.map((dm) => (
                        <tr key={dm._id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-bold text-slate-900">{dm.candidateName || 'Candidate'}</td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-600">{dm.phone || 'N/A'}</td>
                          <td className="py-3 px-3 font-semibold text-teal-700">{dm.course || 'CPC'}</td>
                          <td className="py-3 px-3">
                            <span className="font-medium text-slate-900">{dm.preferredDate || 'TBD'}</span>
                            <span className="text-[10px] text-slate-400 block">{dm.timeSlot || 'General'}</span>
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-900">{dm.trainer || dm.trainerMapping || 'Unassigned'}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                              {dm.status || 'booked'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => openReassign(dm)}
                                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 cursor-pointer"
                              >
                                Reassign
                              </button>
                              <button
                                onClick={() => openReschedule(dm)}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 cursor-pointer"
                              >
                                Reschedule
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {scopedDemos.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                            No demos booked in your scope.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW: CLASS SESSION ROOM ================= */}
          {activeNav === 'session_room' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Live Class Sessions & Meeting Links</h2>
                    <p className="text-xs text-slate-400">Real-time monitoring of Zoom and Google Meet classrooms conducted by your team.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scopedBatches.map((b) => (
                    <div key={b.batchId || b.name} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">{b.name || b.batchId}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          {b.course || 'CPC'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        <div><strong>Faculty:</strong> {b.trainer || b.faculty || 'Unassigned'}</div>
                        <div><strong>Timing:</strong> {b.timing || '10:00 AM - 12:00 PM'}</div>
                        <div><strong>Branch:</strong> {b.branch || 'Coimbatore'}</div>
                      </div>
                      <div className="pt-2 flex items-center gap-2">
                        <a
                          href={b.classLink || 'https://meet.google.com'}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 text-center py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
                        >
                          Join Live Room
                        </a>
                      </div>
                    </div>
                  ))}
                  {scopedBatches.length === 0 && (
                    <div className="col-span-full py-8 text-center text-xs text-slate-400">
                      No active class batches found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW: COURSE SYLLABUS ================= */}
          {activeNav === 'batch_desk' && (
            <div className="space-y-6">
              <CourseSyllabusBoard
                currentUser={currentUser}
                roleType={roleType}
                courseOptions={['CPC', 'AMCT Beginner', 'AMCT Intermediate', 'AMCT Advanced', 'CIC', 'CPMA', 'CRC', 'Surgery', 'Anatomy', 'ED', 'EM']}
              />
            </div>
          )}

          {/* ================= VIEW: DOUBTS ================= */}
          {activeNav === 'doubts' && isHeadRole && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Student Doubt Box & Escalations</h2>
                    <p className="text-xs text-slate-400">Review and verify replies to academic queries raised by students.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {scopedDoubts.map((d) => (
                    <div key={d._id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{d.studentName || 'Student'} ({d.course})</span>
                        <span className="text-[10px] text-slate-400">{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : ''}</span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">{d.question || d.doubtText}</p>
                      {d.reply && (
                        <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900">
                          <strong>Faculty Reply:</strong> {d.reply}
                        </div>
                      )}
                    </div>
                  ))}
                  {scopedDoubts.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No escalated doubts currently pending.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW: SCORECARD ================= */}
          {activeNav === 'scorecard' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Faculty Scorecards & Quality Audit</h2>
                    <p className="text-xs text-slate-400">Track trainer ratings, demo conversions, and attendance consistency.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scopedTrainers.map((tr) => {
                    const tName = String(tr.trainerName || tr.name || '').toLowerCase();
                    const trBatches = batchesList.filter((b) => (b.trainerId && b.trainerId === tr.trainerId) || (b.trainer && String(b.trainer).toLowerCase() === tName));
                    const trDemos = demosList.filter((d) => (d.trainerId && d.trainerId === tr.trainerId) || (d.trainer && String(d.trainer).toLowerCase() === tName));
                    const convertedDemos = trDemos.filter((d) => ['completed', 'converted', 'admitted'].includes(String(d.status || '').toLowerCase())).length;
                    const convRate = trDemos.length ? Math.round((convertedDemos / trDemos.length) * 100) : 0;
                    const trStudents = studentsList.filter((s) => (s.trainerId && s.trainerId === tr.trainerId) || (s.trainer && String(s.trainer).toLowerCase() === tName)).length;

                    return (
                      <div key={tr.trainerId || tr.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900">{tr.trainerName || tr.name}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                            {trStudents} Students
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 space-y-1">
                          <div><strong>Branch:</strong> {tr.branchName || tr.branch || '—'}</div>
                          <div><strong>Batches Running:</strong> {trBatches.length} active</div>
                          <div><strong>Demo Success Rate:</strong> {trDemos.length ? `${convRate}% (${convertedDemos}/${trDemos.length})` : 'No demos tracked'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW: STUDENT ALLOCATION ================= */}
          {activeNav === 'allocation' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Student Handover & Trainer Allocation</h2>
                    <p className="text-xs text-slate-400">Assign newly enrolled students received from HR Counsellors to your faculty.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800">
                    {pendingAllocationStudents.length} Pending
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Student</th>
                        <th className="py-3 px-3">Course</th>
                        <th className="py-3 px-3">Branch</th>
                        <th className="py-3 px-3">Enrollment Date</th>
                        <th className="py-3 px-3 text-right">Assign Faculty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {pendingAllocationStudents.map((st) => (
                        <tr key={st.studentId || st._id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-bold text-slate-900">
                            {st.name}
                            <div className="text-[10.5px] text-slate-400 font-normal">{st.phone}</div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-teal-700">{st.course || 'CPC'}</td>
                          <td className="py-3 px-3">{st.branch || st.location || 'Coimbatore'}</td>
                          <td className="py-3 px-3">{st.createdAt ? new Date(st.createdAt).toLocaleDateString() : 'Recent'}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                setAllocatingStudent(st);
                                setAllocationTargetTrainer(scopedTrainers[0]?.trainerId || scopedTrainers[0]?.id || '');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#00897b] hover:bg-[#00796b] text-white text-xs font-bold shadow-xs cursor-pointer"
                            >
                              Allocate Trainer
                            </button>
                          </td>
                        </tr>
                      ))}
                      {pendingAllocationStudents.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                            All students have been allocated to faculty!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW: BATCHES ================= */}
          {activeNav === 'batches' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Supervised Batches ({scopedBatches.length})</h2>
                    <p className="text-xs text-slate-400">Overview of batches running under your assigned faculty.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scopedBatches.map((b) => (
                    <div key={b.batchId || b.name} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">{b.name || b.batchId}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          {b.course || 'CPC'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 space-y-0.5">
                        <div><strong>Faculty:</strong> {b.trainer || b.faculty || 'Unassigned'}</div>
                        <div><strong>Timing:</strong> {b.timing || 'Regular Shift'}</div>
                        <div><strong>Branch:</strong> {b.branch || 'Coimbatore'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW: STUDENTS ================= */}
          {activeNav === 'students' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Enrolled Students ({scopedStudents.length})</h2>
                    <p className="text-xs text-slate-400">All students mapped under your supervised trainers.</p>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by student name or phone..."
                    className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-1.5 outline-none focus:border-[#00897b]"
                  />
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Student ID</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Course</th>
                        <th className="py-2.5 px-3">Batch</th>
                        <th className="py-2.5 px-3">Assigned Faculty</th>
                        <th className="py-2.5 px-3">Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {scopedStudents
                        .filter((st) => !searchQuery || String(st.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || String(st.phone || '').includes(searchQuery))
                        .slice(0, 20)
                        .map((st) => (
                          <tr key={st.studentId || st._id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono text-teal-700 font-bold">{st.studentId || 'N/A'}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{st.name}</td>
                            <td className="py-2.5 px-3">{st.course || 'CPC'}</td>
                            <td className="py-2.5 px-3">{st.batch || st.batchName || 'General'}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-800">{st.trainer || st.faculty || 'Assigned'}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                Number(st.attendancePercentage ?? 85) < 75 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {st.attendancePercentage ?? 85}%
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW: WEAK STUDENTS ================= */}
          {activeNav === 'weak_students' && isHeadRole && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-500" />
                      <span>Weak Students & Remedial Interventions ({weakStudents.length})</span>
                    </h2>
                    <p className="text-xs text-slate-400">Students with attendance &lt; 75% or test scores below target.</p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Student</th>
                        <th className="py-3 px-3">Course</th>
                        <th className="py-3 px-3">Attendance</th>
                        <th className="py-3 px-3">Faculty</th>
                        <th className="py-3 px-3">Issue</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {weakStudents.map((st) => (
                        <tr key={st.studentId || st._id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-bold text-slate-900">
                            {st.name}
                            <div className="text-[10px] text-slate-400">{st.phone}</div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-teal-700">{st.course || 'CPC'}</td>
                          <td className="py-3 px-3 font-black text-rose-600">{st.attendancePercentage ?? st.attendance ?? 65}%</td>
                          <td className="py-3 px-3 font-medium text-slate-800">{st.trainer || st.faculty || 'Faculty'}</td>
                          <td className="py-3 px-3 text-rose-600 font-bold text-[11px]">Low Attendance / Dropout Risk</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => redirectToWhatsAppWeb(st.phone)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 cursor-pointer"
                            >
                              WhatsApp Alert
                            </button>
                          </td>
                        </tr>
                      ))}
                      {weakStudents.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                            No students flagged with low attendance!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW: ROSTER ================= */}
          {activeNav === 'roster' && (
            <div className="space-y-6">
              <TeamRosterBoard
                trainers={scopedTrainers}
                currentUser={currentUser}
                onRefresh={loadData}
              />
            </div>
          )}

          {/* ================= VIEW: ORG TREE ================= */}
          {activeNav === 'org_tree' && (
            <div className="space-y-6">
              <TrainerOrgHierarchyChart
                onSelectNode={(node) => {
                  if (node.roleType === 'head') setActiveLeaderId('manoj');
                  else if (node.roleType === 'manager') setActiveLeaderId(node.id);
                  else if (node.roleType === 'tl') setActiveLeaderId(node.id);
                }}
              />
            </div>
          )}
        </div>
      </main>

      {/* ================= MODAL: 1-CLICK REASSIGN DEMO ================= */}
      {reassignDemoTarget && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">Reassign Demo</h3>
              <button onClick={() => setReassignDemoTarget(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div><strong>Candidate:</strong> {reassignDemoTarget.candidateName}</div>
              <div><strong>Course:</strong> {reassignDemoTarget.course}</div>
              <div><strong>Current Faculty:</strong> {reassignDemoTarget.trainer || 'Unassigned'}</div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Select New Faculty</label>
              <select
                value={reassignForm.toTrainerId}
                onChange={(e) => setReassignForm((p) => ({ ...p, toTrainerId: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:border-[#00897b]"
              >
                <option value="">Choose trainer...</option>
                {scopedTrainers.map((tr) => (
                  <option key={tr.trainerId || tr.id} value={tr.trainerId || tr.id}>
                    {tr.trainerName || tr.name} ({tr.courseKey || tr.course || 'CPC'} · {tr.branchName || tr.branch || 'TN'})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Reason</label>
              <input
                type="text"
                value={reassignForm.reason}
                onChange={(e) => setReassignForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="e.g. Trainer on leave / slot clash"
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-[#00897b]"
              />
            </div>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setReassignDemoTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                disabled={reassigning || !reassignForm.toTrainerId}
                onClick={confirmReassignOne}
                className="px-4 py-2 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {reassigning ? 'Reassigning...' : 'Confirm Reassign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: BULK REASSIGN DEMOS ================= */}
      {bulkReassignOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-blue-600" />
                <span>Bulk Reassign Faculty Demos</span>
              </h3>
              <button onClick={() => setBulkReassignOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">From Faculty</label>
                <select
                  value={bulkReassignForm.fromTrainerId}
                  onChange={(e) => setBulkReassignForm((p) => ({ ...p, fromTrainerId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:border-[#00897b]"
                >
                  <option value="">Select source...</option>
                  {scopedTrainers.map((tr) => (
                    <option key={tr.trainerId || tr.id} value={tr.trainerId || tr.id}>
                      {tr.trainerName || tr.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">To Faculty</label>
                <select
                  value={bulkReassignForm.toTrainerId}
                  onChange={(e) => setBulkReassignForm((p) => ({ ...p, toTrainerId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:border-[#00897b]"
                >
                  <option value="">Select target...</option>
                  {scopedTrainers.map((tr) => (
                    <option key={tr.trainerId || tr.id} value={tr.trainerId || tr.id}>
                      {tr.trainerName || tr.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Specific Date (Optional)</label>
              <input
                type="date"
                value={bulkReassignForm.date}
                onChange={(e) => setBulkReassignForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-[#00897b]"
              />
            </div>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setBulkReassignOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                disabled={bulkReassigning || !bulkReassignForm.fromTrainerId || !bulkReassignForm.toTrainerId}
                onClick={confirmBulkReassign}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {bulkReassigning ? 'Reassigning...' : 'Transfer All Demos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ALLOCATE STUDENT TO TRAINER ================= */}
      {allocatingStudent && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">Allocate Student to Faculty</h3>
              <button onClick={() => setAllocatingStudent(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div><strong>Student Name:</strong> {allocatingStudent.name}</div>
              <div><strong>Course:</strong> {allocatingStudent.course}</div>
              <div><strong>Branch / Location:</strong> {allocatingStudent.branch || allocatingStudent.location || 'Coimbatore'}</div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Assign to Faculty</label>
              <select
                value={allocationTargetTrainer}
                onChange={(e) => setAllocationTargetTrainer(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:border-[#00897b]"
              >
                {scopedTrainers.map((tr) => (
                  <option key={tr.trainerId || tr.id} value={tr.trainerId || tr.id}>
                    {tr.trainerName || tr.name} ({tr.courseKey || tr.course || 'CPC'} · {tr.branchName || tr.branch || 'TN'})
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setAllocatingStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                disabled={allocationSaving || !allocationTargetTrainer}
                onClick={handleConfirmAllocation}
                className="px-4 py-2 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {allocationSaving ? 'Allocating...' : 'Confirm Allocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
