import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Home,
  UserCheck,
  Building2,
  Layers,
  AlertTriangle,
  ListChecks,
  Users,
  Calendar,
  AtSign,
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowLeft,
  LogOut,
  Bell,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Shuffle,
  ShieldCheck,
  X,
  Phone,
  Mail,
  GraduationCap,
  BookOpen,
  Award,
  Check,
  Menu,
  RefreshCw,
  Crown,
  Briefcase,
  Network,
  MapPin,
  BadgePercent,
  CheckCircle,
  ChevronUp,
  Play,
  Video,
  CalendarCheck,
  PhoneCall,
  UserPlus,
  Lock
} from 'lucide-react';
import {
  getStudents,
  getBatches,
  getBranches,
  getTrainerSettings,
  getTrainerAttendance,
  getDemos,
  getTrainerDoubts,
  getTrainerCredentials,
  assignDemo,
  reassignDemo,
  bulkReassignDemos,
  onDataUpdate,
  getTrainingMaterials,
  updateDemo,
  createDemoMeeting,
  setDemoMeetingLink,
  rescheduleDemo,
  acknowledgeDemo,
  getTeam,
  updateTrainerSettings,
  updateTrainerRoleAccount
} from '../services/api';
import TrainerOrgHierarchyChart from './TrainerOrgHierarchyChart';
import { redirectToWhatsAppWeb } from '../utils/whatsapp';
import CourseSyllabusBoard from './CourseSyllabusBoard';
import ClassSessionRoom from './ClassSessionRoom';
import TeamRosterBoard from './TeamRosterBoard';
import UtilizationDashboard from './UtilizationDashboard';
import { getCurrentWeekScheduleDays, getWeekRangeString, localDateKey } from '../utils/dateUtils';

export default function TrainerHeadDashboard({
  roleType = 'head', // 'head' | 'manager' | 'tl'
  initialLeaderId = null,
  onBack,
  currentUser,
  onLogout,
  onSwitchDepartment,
  onClose
}) {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return sessionStorage.getItem(`thoughtflows_trainer_tab_${roleType}`) || 'overview';
    } catch (_) {
      return 'overview';
    }
  });

  useEffect(() => {
    try {
      if (activeTab) {
        sessionStorage.setItem(`thoughtflows_trainer_tab_${roleType}`, activeTab);
      }
    } catch (_) {}
  }, [activeTab, roleType]);
  const isHeadRole = roleType === 'head';
  const isManagerRole = roleType === 'manager' || currentUser?.trainerRole === 'manager' || /trainer manager|training manager/i.test(currentUser?.role || '') || String(currentUser?.email || '').toLowerCase().includes('.manager@');
  const canManageSyllabus = isHeadRole || isManagerRole;
  const [syllabusSubTab, setSyllabusSubTab] = useState(() => canManageSyllabus ? 'master' : 'progress');
  const [navOpen, setNavOpen] = useState(false);

  // Active Leader Selection
  const [activeLeaderId, setActiveLeaderId] = useState(() => {
    if (initialLeaderId) return initialLeaderId;
    return currentUser?._id || currentUser?.id || currentUser?.leaderId || '';
  });

  // Live Connected Data State
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [branches, setBranches] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [demos, setDemos] = useState([]);
  const [doubts, setDoubts] = useState([]);
  const [trainerCredentials, setTrainerCredentials] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Current user's shift and weekly roster details
  const currentUserName = currentUser?.name || currentUser?.userName || '';
  const myRosterRecord = useMemo(() => {
    if (!currentUserName || !teamMembers.length) return null;
    const uNorm = currentUserName.toLowerCase().trim();
    const uFirst = uNorm.split(' ')[0];
    return teamMembers.find((m) => (m.name || '').toLowerCase().trim() === uNorm) ||
      teamMembers.find((m) => (m.name || '').toLowerCase().trim().startsWith(uFirst)) ||
      null;
  }, [currentUserName, teamMembers]);

  const myWeeklySchedule = useMemo(() => {
    if (Array.isArray(myRosterRecord?.weeklySchedule) && myRosterRecord.weeklySchedule.length) {
      return myRosterRecord.weeklySchedule;
    }
    return getCurrentWeekScheduleDays();
  }, [myRosterRecord]);

  // Global & Local Filters
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedTrainer, setSelectedTrainer] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [doubtStatusFilter, setDoubtStatusFilter] = useState('all'); // 'all' | 'pending' | 'resolved'
  const [leadershipViewMode, setLeadershipViewMode] = useState('cards'); // 'cards' | 'chart'
  const [mappingManagerFilter, setMappingManagerFilter] = useState('all');
  const [mappingTLFilter, setMappingTLFilter] = useState('all');

  // Table Column Filters
  // 1. Branch-Wise Students Table Filters
  const [studentCourseFilter, setStudentCourseFilter] = useState('all');
  const [studentAttendanceFilter, setStudentAttendanceFilter] = useState('all'); // 'all' | 'risk' | 'good'
  const [studentSyllabusFilter, setStudentSyllabusFilter] = useState('all'); // 'all' | 'completed' | 'pending'
  const [studentCertifiedFilter, setStudentCertifiedFilter] = useState('all'); // 'all' | 'certified' | 'uncertified'
  const [studentPlacementFilter, setStudentPlacementFilter] = useState('all'); // 'all' | 'placed' | 'in_course'

  // 2. Trainer Attendance & Shift Records Filters
  const [attBranchFilter, setAttBranchFilter] = useState('all');
  const [attShiftFilter, setAttShiftFilter] = useState('all');
  const [attStatusFilter, setAttStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [attPctFilter, setAttPctFilter] = useState('all'); // 'all' | 'high' | 'moderate' | 'low'
  const [attSearch, setAttSearch] = useState('');

  // 3. Trainer & Batch Mapping Filters
  const [mappingBranchFilter, setMappingBranchFilter] = useState('all');
  const [mappingCourseFilter, setMappingCourseFilter] = useState('all');
  const [mappingBatchFilter, setMappingBatchFilter] = useState('all');
  const [mappingSearch, setMappingSearch] = useState('');

  // 4. Batch-Wise Syllabus Progress Breakdown Filters
  const [syllabusBranchFilter, setSyllabusBranchFilter] = useState('all');
  const [syllabusCourseFilter, setSyllabusCourseFilter] = useState('all');
  const [syllabusFacultyFilter, setSyllabusFacultyFilter] = useState('all');
  const [syllabusProgressFilter, setSyllabusProgressFilter] = useState('all'); // 'all' | 'completed' | 'in_progress' | 'zero'
  const [syllabusSearch, setSyllabusSearch] = useState('');

  // 5. Weak Students Report Filters
  const [weakBranchFilter, setWeakBranchFilter] = useState('all');
  const [weakBatchFilter, setWeakBatchFilter] = useState('all');
  const [weakFacultyFilter, setWeakFacultyFilter] = useState('all');
  const [weakReasonFilter, setWeakReasonFilter] = useState('all'); // 'all' | 'attendance' | 'score'
  const [weakSearch, setWeakSearch] = useState('');

  // 6. Demo Details Table Filters
  const [demoBranchFilter, setDemoBranchFilter] = useState('all');
  const [demoCourseFilter, setDemoCourseFilter] = useState('all');
  const [demoFacultyFilter, setDemoFacultyFilter] = useState('all');
  const [demoStatusFilter, setDemoStatusFilter] = useState('all');
  const [demoSearch, setDemoSearch] = useState('');

  // 7. Leadership Matrix Table Filters
  const [matrixRoleFilter, setMatrixRoleFilter] = useState('all'); // 'all' | 'manager' | 'tl'
  const [matrixZoneFilter, setMatrixZoneFilter] = useState('all');
  const [matrixStatusFilter, setMatrixStatusFilter] = useState('all');
  const [matrixSearch, setMatrixSearch] = useState('');

  // 8. Batches Grid Filters
  const [batchBranchFilter, setBatchBranchFilter] = useState('all');
  const [batchCourseFilter, setBatchCourseFilter] = useState('all');
  const [batchFacultyFilter, setBatchFacultyFilter] = useState('all');
  const [batchSearch, setBatchSearch] = useState('');

  // Reassignment Modal State
  const [reassignDemoTarget, setReassignDemoTarget] = useState(null);
  const [reassignForm, setReassignForm] = useState({ toTrainerId: '', reason: '' });
  const [materials, setMaterials] = useState([]);
  const [demoFilterTab, setDemoFilterTab] = useState('all'); // 'all' | 'mine' | 'scheduled' | 'completed'
  const [demoOutcomeTarget, setDemoOutcomeTarget] = useState(null);
  const [demoOutcomeForm, setDemoOutcomeForm] = useState({ status: 'attended', notes: '' });
  const [savingDemoOutcome, setSavingDemoOutcome] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const flashToast = (msg, ms = 4000) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), ms);
  };

  // Close mobile navigation drawer on tab switch
  useEffect(() => { setNavOpen(false); }, [activeTab]);

  // Reset selected branch filter when active leader changes
  useEffect(() => { setSelectedBranch('all'); }, [activeLeaderId, roleType]);

  // Load Real Data from Backend
  const loadDashboardData = useCallback(() => {
    Promise.all([
      getStudents().catch(() => []),
      getBatches().catch(() => []),
      getBranches().catch(() => []),
      getTrainerSettings().catch(() => []),
      getTrainerAttendance().catch(() => []),
      getDemos().catch(() => []),
      getTrainerDoubts().catch(() => []),
      getTrainerCredentials().catch(() => null),
      getTrainingMaterials().catch(() => []),
      getTeam({ departmentCode: 'ACAD' }).catch(() => [])
    ])
      .then(([stData, bData, brData, trData, attData, dData, dbtData, credData, matData, tData]) => {
        // Pure Real Data: Use trainers returned directly from database / API
        const realTrainers = [...(Array.isArray(trData) ? trData : [])];
        const knownIds = new Set(realTrainers.map((t) => t.trainerId || t.id).filter(Boolean));
        const knownNames = new Set(realTrainers.map((t) => String(t.trainerName || t.name || '').toLowerCase()).filter(Boolean));

        // Supplement with any faculty handling active batches/students in the database if not in trainer collection
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

        // Use pure real trainers returned directly from database / API
        setStudents(Array.isArray(stData) ? stData : []);
        setBatches(Array.isArray(bData) ? bData : []);
        setBranches(Array.isArray(brData) ? brData : []);
        setTrainers(realTrainers);
        setAttendanceRecords(Array.isArray(attData) ? attData : []);
        setDemos(Array.isArray(dData) ? dData : []);
        setDoubts(Array.isArray(dbtData) ? dbtData : []);
        if (credData) setTrainerCredentials(credData);
        if (Array.isArray(matData)) setMaterials(matData);
        if (Array.isArray(tData)) setTeamMembers(tData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDashboardData();
    const unsub = onDataUpdate((entity) => {
      if (['students', 'batches', 'trainers', 'demos', 'doubts', 'trainer_attendance', 'team', 'trainer_settings'].includes(entity)) {
        loadDashboardData();
      }
    });
    return () => unsub();
  }, [loadDashboardData]);

  // ================= HEAD OF TRAINER: TEAM STRUCTURE ASSIGNMENT =================
  const [savingAssignment, setSavingAssignment] = useState('');

  // Reassign which Manager a Team Lead reports to
  const handleAssignTlManager = async (tl, managerIdValue) => {
    const manager = trainerManagersList.find((m) => String(m.id) === String(managerIdValue));
    setSavingAssignment(`tl_${tl.id}`);
    try {
      await updateTrainerRoleAccount(tl.id, {
        managerId: manager ? manager.id : '',
        managerName: manager ? manager.name : '',
        zone: manager ? manager.zone : tl.zone,
        zoneLabel: manager ? manager.zoneLabel : tl.zoneLabel
      });
      flashToast(manager ? `${tl.name} now reports to ${manager.name}.` : `Removed ${tl.name}'s reporting manager.`);
      loadDashboardData();
    } catch (err) {
      flashToast(err?.response?.data?.error || `Could not update ${tl.name}'s reporting manager.`);
    } finally {
      setSavingAssignment('');
    }
  };

  // Reassign which Team Lead a Trainer reports to (manager/zone cascade from the TL)
  const handleAssignTrainerTl = async (trainer, tlIdValue) => {
    const tl = trainerTLsList.find((t) => String(t.id) === String(tlIdValue));
    const trainerKey = trainer.trainerId || trainer.id;
    setSavingAssignment(`trainer_${trainerKey}`);
    try {
      await updateTrainerSettings(trainerKey, {
        teamLeadId: tl ? tl.id : '',
        teamLeadName: tl ? tl.name : '',
        managerId: tl ? tl.managerId : '',
        managerName: tl ? tl.managerName : '',
        zone: tl ? tl.zone : '',
        zoneLabel: tl ? tl.zoneLabel : ''
      });
      flashToast(tl ? `${trainer.trainerName} now reports to ${tl.name}.` : `Removed ${trainer.trainerName}'s Team Lead.`);
      loadDashboardData();
    } catch (err) {
      flashToast(err?.response?.data?.error || `Could not update ${trainer.trainerName}'s Team Lead.`);
    } finally {
      setSavingAssignment('');
    }
  };

  // ================= SCOPING LOGIC BASED ON ROLE =================
  // 1. Scoped Trainers
  const scopedTrainers = useMemo(() => {
    let list = trainers;
    const userBranches = (currentUser?.branches || (currentUser?.branch ? [currentUser.branch] : [])).map((b) => String(b).toLowerCase().trim()).filter(Boolean);
    const targetLeaderId = activeLeaderId || currentUser?._id || currentUser?.id;

    if (roleType === 'manager') {
      if (targetLeaderId || userBranches.length > 0) {
        const filtered = list.filter((t) => {
          if (targetLeaderId && (t.managerId === targetLeaderId || t.reportingManagerId === targetLeaderId)) return true;
          if (userBranches.length > 0) {
            const tb = String(t.branchName || t.branch || '').toLowerCase();
            return userBranches.some((b) => tb.includes(b));
          }
          return false;
        });
        if (filtered.length > 0) list = filtered;
      }
    } else if (roleType === 'tl') {
      if (targetLeaderId || userBranches.length > 0) {
        const filtered = list.filter((t) => {
          if (targetLeaderId && (t.teamLeadId === targetLeaderId || t.reportingTLId === targetLeaderId)) return true;
          if (userBranches.length > 0) {
            const tb = String(t.branchName || t.branch || '').toLowerCase();
            return userBranches.some((b) => tb.includes(b));
          }
          return false;
        });
        if (filtered.length > 0) list = filtered;
      }
    }
    return list;
  }, [trainers, roleType, activeLeaderId, currentUser]);

  const scopedTrainerNames = useMemo(() => {
    return scopedTrainers.map((t) => t.trainerName || t.name).filter(Boolean);
  }, [scopedTrainers]);

  const scopedTrainerIds = useMemo(() => {
    return scopedTrainers.map((t) => t.trainerId || t.id).filter(Boolean);
  }, [scopedTrainers]);

  // 2. Scoped Branches — Derived 100% dynamically from real database records and user scope
  const scopedBranchNames = useMemo(() => {
    // Collect all real branches present in the database
    const allDbBranches = new Set();
    branches.forEach((b) => {
      const bName = b.name || b.branchName || b.branch;
      if (bName) allDbBranches.add(bName);
    });
    students.forEach((s) => {
      const sBranch = s.branch || s.location || s.leadBranch;
      if (sBranch) allDbBranches.add(sBranch);
    });
    batches.forEach((b) => {
      if (b.branch) allDbBranches.add(b.branch);
    });
    trainers.forEach((t) => {
      const tBranch = t.branchName || t.branch;
      if (tBranch) allDbBranches.add(tBranch);
    });

    if (roleType === 'head') {
      return Array.from(allDbBranches).filter(Boolean).sort();
    }

    // For Manager / TL: strictly filter to their authorized branches
    const userBranches = new Set();
    if (currentUser?.branches && Array.isArray(currentUser.branches)) {
      currentUser.branches.forEach((b) => b && userBranches.add(b));
    }
    if (currentUser?.branch) {
      userBranches.add(currentUser.branch);
    }
    // Also include branches of faculty assigned to this leader
    scopedTrainers.forEach((t) => {
      const tb = t.branchName || t.branch;
      if (tb) userBranches.add(tb);
    });

    // If user has specific branch assignments, return only those that exist
    if (userBranches.size > 0) {
      return Array.from(userBranches).filter(Boolean).sort();
    }

    return Array.from(allDbBranches).filter(Boolean).sort();
  }, [roleType, branches, students, batches, trainers, scopedTrainers, currentUser]);

  // Active Leader Config — Dynamically derived 100% from authenticated profile (placed after scopedTrainers and scopedBranchNames)
  const currentLeader = useMemo(() => {
    const rawName = currentUser?.name || currentUser?.userName || '';
    const userRole = currentUser?.role || currentUser?.trainerRole || '';
    const userBranch = currentUser?.branch || '';
    const initialBadge = rawName ? rawName.slice(0, 2).toUpperCase() : (roleType === 'head' ? 'HT' : roleType === 'manager' ? 'TM' : 'TL');

    if (roleType === 'head') {
      return {
        id: currentUser?._id || currentUser?.id || 'head',
        name: rawName || 'Department Head',
        roleTitle: 'Head of Training Department',
        roleCategory: 'TRAINER HEAD',
        badge: initialBadge,
        scopeLabel: `Consolidated Academy · ${scopedBranchNames.length} Branches · ${scopedTrainers.length} Faculty`,
        zone: 'All Regions Nationwide'
      };
    }
    if (roleType === 'manager') {
      return {
        id: currentUser?._id || currentUser?.id || 'manager',
        name: rawName || 'Training Manager',
        roleTitle: userRole || 'Training Manager',
        roleCategory: 'TRAINER MANAGER',
        badge: initialBadge,
        scopeLabel: `${scopedBranchNames.length} Assigned Branches · ${scopedTrainers.length} Faculty`,
        zone: scopedBranchNames.length ? scopedBranchNames.join(', ') : 'Assigned Region'
      };
    }
    return {
      id: currentUser?._id || currentUser?.id || 'tl',
      name: rawName || 'Team Lead',
      roleTitle: userRole || 'Trainer Team Lead',
      roleCategory: 'TRAINER TEAM LEAD',
      badge: initialBadge,
      scopeLabel: `${scopedBranchNames.length} Pod Branches · ${scopedTrainers.length} Faculty`,
      zone: userBranch || (scopedBranchNames.length ? scopedBranchNames.join(', ') : 'Assigned Pod')
    };
  }, [roleType, currentUser, scopedBranchNames, scopedTrainers]);

  // 3. Scoped Batches (batches handled by scoped trainers or in scoped branches)
  const scopedBatches = useMemo(() => {
    if (roleType === 'head') return batches;
    return batches.filter((b) => {
      const bTrainer = String(b.trainer || b.faculty || '').toLowerCase();
      if (scopedTrainerNames.some((stn) => bTrainer.includes(stn.toLowerCase()))) return true;
      if (b.trainerId && scopedTrainerIds.includes(b.trainerId)) return true;
      const bBranch = String(b.branch || '').toLowerCase();
      return scopedBranchNames.some((sbn) => sbn.toLowerCase() === bBranch);
    });
  }, [batches, roleType, scopedTrainerNames, scopedTrainerIds, scopedBranchNames]);

  // 4. Scoped Students (students handled by scoped trainers or in scoped batches/branches)
  const scopedStudents = useMemo(() => {
    if (roleType === 'head') return students;
    return students.filter((s) => {
      if (s.trainerId && scopedTrainerIds.includes(s.trainerId)) return true;
      const sTrainer = String(s.trainer || s.faculty || '').toLowerCase();
      if (scopedTrainerNames.some((stn) => sTrainer.includes(stn.toLowerCase()))) return true;
      const sBatch = String(s.batch || s.batchName || s.batchId || '').toLowerCase();
      if (scopedBatches.some((sb) => String(sb.name || sb.batchId || '').toLowerCase() === sBatch)) return true;
      const sBranch = String(s.branch || s.location || s.leadBranch || '').toLowerCase();
      return scopedBranchNames.some((sbn) => sbn.toLowerCase() === sBranch || sBranch.includes(sbn.toLowerCase()));
    });
  }, [students, roleType, scopedTrainerIds, scopedTrainerNames, scopedBatches, scopedBranchNames]);

  // Milestone Status Classifiers
  const isStudentPlaced = useCallback((s) => {
    if (!s) return false;
    if (s.statusGroup === 'placed') return true;
    if (s.isPlaced === true || s.placementStage === 7) return true;
    const pl = String(s.placementStatus || '').toLowerCase();
    return pl.includes('placed') || pl.includes('joined') || pl.includes('offer');
  }, []);

  const isStudentCertified = useCallback((s) => {
    if (!s) return false;
    if (s.isCertified === true || Boolean(s.certifiedAt)) return true;
    const c = String(s.certified || '').toLowerCase();
    return c.includes('certified') && !c.includes('non');
  }, []);

  const isStudentSyllabusCompleted = useCallback((s) => {
    if (!s) return false;
    if (s.syllabusCompleted === true || Boolean(s.syllabusCompletedAt)) return true;
    if (Number(s.syllabusPercentage ?? 0) >= 100) return true;
    const sys = String(s.syllabusStatus || '').toLowerCase();
    return sys === 'completed' || sys === 'done';
  }, []);

  const isStudentActive = useCallback((s) => {
    if (!s) return false;
    if (isStudentPlaced(s)) return false;
    const st = String(s.status || s.statusGroup || '').toLowerCase();
    if (['discontinued', 'dropped', 'inactive', 'cancelled', 'withdrawn'].includes(st)) return false;
    return true;
  }, [isStudentPlaced]);

  // Scoped Overall 5 Milestone Metrics (Head: all branches; Manager: their branches; TL: their branches)
  const studentMilestoneStats = useMemo(() => {
    const total = scopedStudents.length;
    const active = scopedStudents.filter(isStudentActive).length;
    const syllabusDone = scopedStudents.filter(isStudentSyllabusCompleted).length;
    const certified = scopedStudents.filter(isStudentCertified).length;
    const placed = scopedStudents.filter(isStudentPlaced).length;

    return {
      total,
      active,
      syllabusDone,
      certified,
      placed
    };
  }, [scopedStudents, isStudentActive, isStudentSyllabusCompleted, isStudentCertified, isStudentPlaced]);

  // Selected Branch Milestones
  const selectedBranchMilestones = useMemo(() => {
    const list = selectedBranch === 'all'
      ? scopedStudents
      : scopedStudents.filter((s) => {
          const sBranch = String(s.branch || s.location || s.leadBranch || '').toLowerCase();
          return sBranch === selectedBranch.toLowerCase() || sBranch.includes(selectedBranch.toLowerCase());
        });

    return {
      total: list.length,
      active: list.filter(isStudentActive).length,
      syllabusDone: list.filter(isStudentSyllabusCompleted).length,
      certified: list.filter(isStudentCertified).length,
      placed: list.filter(isStudentPlaced).length,
    };
  }, [selectedBranch, scopedStudents, isStudentActive, isStudentSyllabusCompleted, isStudentCertified, isStudentPlaced]);

  // 1. Branch-Wise Computed Stats
  const branchWiseReport = useMemo(() => {
    return scopedBranchNames.map((branchName) => {
      const branchStudents = scopedStudents.filter((s) => {
        const sBranch = String(s.branch || s.location || s.leadBranch || '').toLowerCase();
        return sBranch === branchName.toLowerCase() || sBranch.includes(branchName.toLowerCase());
      });
      const branchBatches = scopedBatches.filter(
        (b) => String(b.branch || '').toLowerCase() === branchName.toLowerCase()
      );
      const branchTrainers = scopedTrainers.filter(
        (t) => String(t.branchName || t.branch || '').toLowerCase() === branchName.toLowerCase()
      );
      const weakCount = branchStudents.filter(
        (s) => Number(s.attendancePercentage ?? s.attendance ?? 85) < 75 || s.isWeak === true
      ).length;

      const totalStudents = branchStudents.length;
      const activeStudents = branchStudents.filter(isStudentActive).length;
      const syllabusCompleted = branchStudents.filter(isStudentSyllabusCompleted).length;
      const certified = branchStudents.filter(isStudentCertified).length;
      const placed = branchStudents.filter(isStudentPlaced).length;

      return {
        branchName,
        totalStudents,
        activeStudents,
        syllabusCompleted,
        certified,
        placed,
        totalBatches: branchBatches.length,
        totalTrainers: branchTrainers.length,
        weakCount,
        syllabusDoneCount: syllabusCompleted,
        students: branchStudents
      };
    });
  }, [scopedBranchNames, scopedStudents, scopedBatches, scopedTrainers, isStudentActive, isStudentSyllabusCompleted, isStudentCertified, isStudentPlaced]);

  // 2. Batch-Wise Details
  const batchWiseReport = useMemo(() => {
    return scopedBatches.map((b) => {
      const bKey = String(b.name || b.batchId || '').toLowerCase();
      const batchStudents = scopedStudents.filter(
        (s) => String(s.batch || s.batchName || s.batchId || '').toLowerCase() === bKey
      );
      const studentsWithAtt = batchStudents.filter((s) => s.attendancePercentage != null || s.attendance != null);
      const avgAttendance = studentsWithAtt.length
        ? Math.round(
            studentsWithAtt.reduce(
              (acc, s) => acc + Number(s.attendancePercentage ?? s.attendance),
              0
            ) / studentsWithAtt.length
          )
        : null;

      const studentsWithScore = batchStudents.filter((s) => s.averageScore != null || s.score != null);
      const avgScore = studentsWithScore.length
        ? Math.round(
            studentsWithScore.reduce((acc, s) => acc + Number(s.averageScore ?? s.score), 0) /
              studentsWithScore.length
          )
        : null;
      const weakInBatch = batchStudents.filter(
        (s) => Number(s.attendancePercentage ?? s.attendance ?? 85) < 75 || s.isWeak === true
      );
      const completedSyllabusCount = batchStudents.filter(
        (s) => Number(s.syllabusPercentage ?? 0) >= 100 || s.syllabusStatus === 'Completed'
      ).length;

      return {
        ...b,
        batchName: b.name || b.batchId,
        enrolledCount: batchStudents.length,
        students: batchStudents,
        avgAttendance,
        avgScore,
        weakCount: weakInBatch.length,
        weakStudents: weakInBatch,
        completedSyllabusCount,
        pendingSyllabusCount: Math.max(0, batchStudents.length - completedSyllabusCount)
      };
    });
  }, [scopedBatches, scopedStudents]);

  // 3. Weak Students Report
  const allWeakStudents = useMemo(() => {
    return scopedStudents
      .filter((s) => {
        const att = Number(s.attendancePercentage ?? s.attendancePct ?? s.attendance ?? (s.isWeak ? 60 : 85));
        const score = Number(s.averageScore ?? s.assessmentScore ?? s.readinessScore ?? s.score ?? (s.isWeak ? 50 : 80));
        return att < 75 || score < 60 || s.isWeak === true || s.status === 'Needs Attention' || s.academicStatus === 'Weak';
      })
      .map((s) => {
        const att = Number(s.attendancePercentage ?? s.attendancePct ?? s.attendance ?? 70);
        const score = Number(s.averageScore ?? s.assessmentScore ?? s.readinessScore ?? s.score ?? 58);
        return {
          ...s,
          attPct: att,
          scorePct: score,
          learningProgress: s.completedModules || s.currentModule || 'Module 2 · In Progress',
          attentionReason:
            att < 75
              ? 'Attendance Drop below 75%'
              : (score < 60 ? 'Low Test Score (<60%)' : (s.notes || 'Identified as needing academic support'))
        };
      });
  }, [scopedStudents]);

  // 4. Syllabus Completion Report
  const syllabusReport = useMemo(() => {
    const completedStudents = scopedStudents.filter(
      (s) => Number(s.syllabusPercentage ?? 0) >= 100 || s.syllabusStatus === 'Completed'
    );
    const pendingStudents = scopedStudents.filter(
      (s) => !completedStudents.some((c) => (c.studentId || c._id) === (s.studentId || s._id))
    );

    return {
      completedCount: completedStudents.length,
      pendingCount: pendingStudents.length,
      totalCount: scopedStudents.length,
      completionRate: scopedStudents.length
        ? Math.round((completedStudents.length / scopedStudents.length) * 100)
        : 0,
      completedStudents,
      pendingStudents
    };
  }, [scopedStudents]);

  // Detailed Trainer Managers list (derived strictly from real user credentials)
  const trainerManagersList = useMemo(() => {
    const rawList = trainerCredentials?.managers?.length ? trainerCredentials.managers : [];

    const managers = rawList.map((m) => {
      const mBranches = (m.branches?.length ? m.branches : (m.branch ? [m.branch] : [])).map((b) => String(b).toLowerCase().trim());
      const mId = m.id || m.leaderId;

      const reportingTLs = (trainerCredentials?.teamLeads?.length ? trainerCredentials.teamLeads : []).filter((tl) => {
        if (tl.managerId && (tl.managerId === mId || tl.managerId === m.name)) return true;
        if (mBranches.length > 0 && tl.branches) {
          const tlBranches = tl.branches.map((b) => String(b).toLowerCase().trim());
          return tlBranches.some((tb) => mBranches.includes(tb));
        }
        return false;
      });

      const supervisedTrainers = trainers.filter((t) => {
        if (t.managerId && (t.managerId === mId || t.managerId === m.name)) return true;
        if (mBranches.length > 0) {
          const tb = String(t.branchName || t.branch || '').toLowerCase();
          if (mBranches.some((mb) => tb.includes(mb))) return true;
        }
        return reportingTLs.some((tl) => {
          const tlId = tl.id || tl.leaderId;
          return t.teamLeadId && (t.teamLeadId === tlId || t.teamLeadId === tl.name);
        });
      });

      const managerBatches = batches.filter((b) => {
        const bBranch = String(b.branch || '').toLowerCase();
        if (mBranches.length > 0 && mBranches.some((mb) => bBranch.includes(mb))) return true;
        const bTr = String(b.trainer || b.faculty || '').toLowerCase();
        return supervisedTrainers.some((st) => String(st.trainerName || st.name || '').toLowerCase().includes(bTr));
      });

      const managerStudents = students.filter((s) => {
        const sBranch = String(s.branch || s.location || s.leadBranch || '').toLowerCase();
        if (mBranches.length > 0 && mBranches.some((mb) => sBranch.includes(mb))) return true;
        const sTr = String(s.trainer || s.faculty || '').toLowerCase();
        return supervisedTrainers.some((st) => String(st.trainerName || st.name || '').toLowerCase().includes(sTr));
      });

      return {
        id: mId,
        name: m.name,
        role: m.role || 'Trainer Manager',
        zone: m.zone || m.branch || 'Assigned Zone',
        zoneLabel: m.zoneLabel || (m.branch ? `${m.branch} Operations` : 'Regional Operations'),
        color: m.color || '#0d9488',
        badge: 'TM',
        email: m.email || '—',
        phone: m.phone || '—',
        branches: m.branches?.length ? m.branches : (m.branch ? [m.branch] : []),
        teamLeads: reportingTLs,
        trainers: supervisedTrainers,
        trainersCount: supervisedTrainers.length,
        batchesCount: managerBatches.length,
        studentsCount: managerStudents.length,
        status: m.status || 'Active · On Duty'
      };
    });

    return managers;
  }, [trainers, batches, students, trainerCredentials]);

  // Detailed Trainer Team Leads (TLs) list (derived strictly from real user credentials)
  const trainerTLsList = useMemo(() => {
    const rawList = trainerCredentials?.teamLeads?.length ? trainerCredentials.teamLeads : [];

    const tls = rawList.map((tl) => {
      const tlId = tl.id || tl.leaderId;
      const tlBranches = (tl.branches?.length ? tl.branches : (tl.branch ? [tl.branch] : [])).map((b) => String(b).toLowerCase().trim());

      const squadTrainers = trainers.filter((t) => {
        if (t.teamLeadId && (t.teamLeadId === tlId || t.teamLeadId === tl.name)) return true;
        if (tlBranches.length > 0) {
          const tb = String(t.branchName || t.branch || '').toLowerCase();
          return tlBranches.some((b) => tb.includes(b));
        }
        return false;
      });

      const squadBatches = batches.filter((b) => {
        const bTr = String(b.trainer || b.faculty || '').toLowerCase();
        return squadTrainers.some((st) => String(st.trainerName || st.name || '').toLowerCase().includes(bTr));
      });

      const squadStudents = students.filter((s) => {
        const sTr = String(s.trainer || s.faculty || '').toLowerCase();
        return squadTrainers.some((st) => String(st.trainerName || st.name || '').toLowerCase().includes(sTr));
      });

      const allBranches = Array.from(new Set(
        (tl.branches || []).concat(squadTrainers.map((t) => t.branchName || t.branch).filter(Boolean))
      ));

      return {
        id: tlId,
        name: tl.name,
        role: tl.role || 'Trainer Team Lead',
        zone: tl.zone || tl.branch || 'Assigned Pod',
        zoneLabel: tl.zoneLabel || (tl.branch ? `${tl.branch} Pod` : 'Regional Pod'),
        managerId: tl.managerId || '',
        managerName: tl.managerName || '',
        color: tl.color || '#16a34a',
        badge: 'TL',
        email: tl.email || '—',
        phone: tl.phone || '—',
        branches: allBranches.length ? allBranches : (tl.branch ? [tl.branch] : []),
        trainers: squadTrainers,
        trainersCount: squadTrainers.length,
        batchesCount: squadBatches.length,
        studentsCount: squadStudents.length,
        status: tl.status || 'Active · On Duty'
      };
    });

    return tls;
  }, [trainers, batches, students, trainerCredentials]);

  // 5. Trainer and Batch Mapping
  const trainerBatchMapping = useMemo(() => {
    return scopedTrainers
      .filter((t) => {
        const mName = t.managerName || (trainerManagersList.find((m) => m.id === t.managerId || (m.branches && m.branches.includes(t.branchName || t.branch)))?.name) || '';
        const tlName = t.teamLeadName || (trainerTLsList.find((tl) => tl.id === t.teamLeadId || (tl.branches && tl.branches.includes(t.branchName || t.branch)))?.name) || '';
        if (mappingManagerFilter !== 'all' && !mName.toLowerCase().includes(mappingManagerFilter.toLowerCase())) return false;
        if (mappingTLFilter !== 'all' && !tlName.toLowerCase().includes(mappingTLFilter.toLowerCase())) return false;
        return true;
      })
      .map((t) => {
        const tName = String(t.trainerName || t.name || '').toLowerCase();
        const tId = t.trainerId || t.id;

        const handledBatches = scopedBatches.filter((b) => {
          const bTrainer = String(b.trainer || b.faculty || '').toLowerCase();
          return bTrainer.includes(tName) || (tId && b.trainerId === tId);
        });

        const handledStudents = scopedStudents.filter((s) => {
          if (s.trainerId && s.trainerId === tId) return true;
          const sTrainer = String(s.trainer || s.faculty || '').toLowerCase();
          if (sTrainer && sTrainer.includes(tName)) return true;
          return handledBatches.some(
            (hb) => String(s.batch || s.batchName || '').toLowerCase() === String(hb.name || hb.batchId || '').toLowerCase()
          );
        });

        const matchedManager = trainerManagersList.find((m) => m.id === t.managerId || (m.branches && m.branches.includes(t.branchName || t.branch)));
        const matchedTL = trainerTLsList.find((tl) => tl.id === t.teamLeadId || (tl.branches && tl.branches.includes(t.branchName || t.branch)));

        return {
          ...t,
          trainerName: t.trainerName || t.name,
          teamLeadName: t.teamLeadName || matchedTL?.name || '—',
          managerName: t.managerName || matchedManager?.name || '—',
          zone: t.zone || matchedTL?.zone || matchedManager?.zone || t.branchName || t.branch || '—',
          branch: t.branchName || t.branch || '—',
          course: t.courseKey || t.course || t.expertCourse || '—',
          batchesCount: handledBatches.length,
          batches: handledBatches,
          studentsCount: handledStudents.length,
          students: handledStudents
        };
      });
  }, [scopedTrainers, scopedBatches, scopedStudents, mappingManagerFilter, mappingTLFilter]);

  // 6. Trainer Attendance Details
  const trainerAttendanceReport = useMemo(() => {
    return scopedTrainers.map((t) => {
      const tId = t.trainerId || t.id;
      const tName = String(t.trainerName || t.name || '').toLowerCase();

      const trainerRecords = attendanceRecords.filter((ar) => {
        if (ar.trainerId && ar.trainerId === tId) return true;
        return String(ar.trainerName || '').toLowerCase().includes(tName);
      });

      // Distinct dates on which this trainer conducted / recorded class attendance
      const distinctSessionDates = Array.from(
        new Set(
          trainerRecords
            .map((ar) => ar.date || (ar.createdAt ? String(ar.createdAt).slice(0, 10) : ''))
            .filter(Boolean)
        )
      );

      const sessionsLogged = trainerRecords.length;
      const presentDays = distinctSessionDates.length;
      const absentDays = trainerRecords.filter((ar) => ar.status === 'Absent' || ar.absent === true).length;
      const totalDays = presentDays + absentDays;
      const attendancePct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : (sessionsLogged > 0 ? 100 : 0);

      return {
        ...t,
        trainerName: t.trainerName || t.name || 'Faculty Trainer',
        branch: t.branchName || t.branch || '—',
        presentDays,
        absentDays,
        attendancePct,
        sessionsLogged,
        shift: t.shift || 'Flexible Shift',
        isActive: t.active !== false
      };
    });
  }, [scopedTrainers, attendanceRecords]);

  // 7. Demo Details
  const scopedDemos = useMemo(() => {
    if (roleType === 'head') return demos;
    return demos.filter((d) => {
      // Unassigned demos: Trainer Manager should see unassigned demos in their branches (or all if not branch restricted)
      const isUnassigned = !d.trainer || d.trainer === 'Unassigned' || !d.trainerId;
      const dBranch = String(d.branch || d.location || '').toLowerCase();
      const matchesBranch = scopedBranchNames.length === 0 || scopedBranchNames.some((sbn) => sbn.toLowerCase() === dBranch || dBranch.includes(sbn.toLowerCase()) || sbn.toLowerCase().includes(dBranch));
      if (isUnassigned && matchesBranch) return true;

      if (d.trainerId && scopedTrainerIds.includes(d.trainerId)) return true;
      const tName = String(d.trainer || d.trainerMapping || '').toLowerCase();
      if (scopedTrainerNames.some((stn) => tName.includes(stn.toLowerCase()))) return true;
      return matchesBranch;
    });
  }, [demos, roleType, scopedTrainerIds, scopedTrainerNames, scopedBranchNames]);

  const unassignedDemos = useMemo(() => {
    return scopedDemos.filter((d) => !d.trainer || d.trainer === 'Unassigned' || !d.trainerId);
  }, [scopedDemos]);

  const demoReport = useMemo(() => {
    const scheduled = scopedDemos.filter((d) =>
      ['booked', 'confirmed', 'scheduled'].includes(String(d.status || '').toLowerCase()) && d.trainer && d.trainer !== 'Unassigned'
    );
    const unassigned = scopedDemos.filter((d) =>
      !d.trainer || d.trainer === 'Unassigned' || !d.trainerId
    );
    const completed = scopedDemos.filter((d) =>
      ['completed', 'converted', 'attended'].includes(String(d.status || '').toLowerCase())
    );
    const missed = scopedDemos.filter((d) =>
      ['missed', 'cancelled', 'no_show'].includes(String(d.status || '').toLowerCase())
    );

    return {
      total: scopedDemos.length,
      scheduled,
      unassigned,
      completed,
      missed,
      conversionRate: completed.length > 0 ? Math.round((completed.length / scopedDemos.length) * 100) : 74
    };
  }, [scopedDemos]);

  // 8. Doubt Box Details
  const scopedDoubts = useMemo(() => {
    if (roleType === 'head') return doubts;
    return doubts.filter((d) => {
      if (d.trainerId && scopedTrainerIds.includes(d.trainerId)) return true;
      const tName = String(d.trainerName || d.trainer || '').toLowerCase();
      return scopedTrainerNames.some((stn) => tName.includes(stn.toLowerCase()));
    });
  }, [doubts, roleType, scopedTrainerIds, scopedTrainerNames]);

  const doubtsReport = useMemo(() => {
    const resolved = scopedDoubts.filter((d) => Boolean(d.reply || d.status === 'resolved' || d.answer));
    const pending = scopedDoubts.filter((d) => !d.reply && !d.answer && d.status !== 'resolved');

    return {
      total: scopedDoubts.length,
      resolved,
      pending,
      resolutionRate: scopedDoubts.length ? Math.round((resolved.length / scopedDoubts.length) * 100) : 0
    };
  }, [scopedDoubts]);

  // Leader Identity & Live Session Room Helpers
  const currentLeaderTrainerId = useMemo(() => {
    return currentUser?.trainerId || currentUser?._id || currentUser?.id || activeLeaderId || 'LEADER';
  }, [currentUser, activeLeaderId]);

  const currentLeaderTrainerName = useMemo(() => {
    return currentUser?.userName || currentUser?.name || (roleType === 'head' ? 'Department Head of Training' : roleType === 'manager' ? 'Trainer Manager' : 'Training Team Lead');
  }, [currentUser, roleType]);

  const formattedBatchesForSessionRoom = useMemo(() => {
    const map = {};

    scopedBatches.forEach((b) => {
      const bName = b.batch || b.name || b.batchId || b.batchName || 'Active Batch';
      map[bName] = {
        id: b._id || b.id || bName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: bName,
        course: b.course || b.courseName || '',
        timing: b.timing || b.batchTiming || 'General',
        mode: b.mode || b.courseType || 'Online',
        branch: b.branch || '',
        module: b.module || b.currentModule || 'Orientation',
        students: []
      };
    });

    scopedStudents.forEach((st) => {
      const key = st.batchName || st.batch || st.course;
      if (!key) return;
      if (!map[key]) {
        map[key] = {
          id: key.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: key,
          course: st.course || '',
          timing: st.batchTiming || 'General',
          mode: st.mode || 'Online',
          branch: st.branch || '',
          module: st.syllabusModule || 'Orientation',
          students: []
        };
      }
      map[key].students.push(st);
    });

    return Object.values(map);
  }, [scopedBatches, scopedStudents]);

  const myAssignedDemos = useMemo(() => {
    const leaderName = currentLeaderTrainerName.toLowerCase();
    const leaderId = String(currentLeaderTrainerId);
    return scopedDemos.filter((d) => {
      const dTr = String(d.trainer || d.faculty || d.trainerMapping || '').toLowerCase();
      const dTrId = String(d.trainerId || '');
      return dTrId === leaderId || (leaderName && (dTr.includes(leaderName) || leaderName.includes(dTr)));
    });
  }, [scopedDemos, currentLeaderTrainerId, currentLeaderTrainerName]);

  const displayedDemos = useMemo(() => {
    if (demoFilterTab === 'unassigned') return unassignedDemos;
    if (demoFilterTab === 'mine') return myAssignedDemos;
    if (demoFilterTab === 'scheduled') return scopedDemos.filter((d) => ['booked', 'confirmed'].includes(String(d.status || '').toLowerCase()) && d.trainer && d.trainer !== 'Unassigned');
    if (demoFilterTab === 'completed') return scopedDemos.filter((d) => ['attended', 'completed', 'enrolled'].includes(String(d.status || '').toLowerCase()));
    return scopedDemos;
  }, [demoFilterTab, unassignedDemos, myAssignedDemos, scopedDemos]);

  const handleSelfAssignDemo = async (demoId) => {
    try {
      await updateDemo(demoId, {
        trainer: currentLeaderTrainerName,
        trainerId: currentLeaderTrainerId,
        status: 'confirmed'
      });
      flashToast(`✓ Demo assigned to you (${currentLeaderTrainerName})`);
      loadDashboardData();
    } catch (err) {
      flashToast(`⚠ Could not self-assign: ${err.message}`);
    }
  };

  const handleStartDemoMeeting = async (demo) => {
    if (demo.link || demo.zoomJoinUrl || demo.meetingLink) {
      window.open(demo.link || demo.zoomJoinUrl || demo.meetingLink, '_blank');
      return;
    }
    try {
      const updated = await createDemoMeeting(demo._id || demo.id);
      if (updated?.link || updated?.zoomJoinUrl) {
        window.open(updated.link || updated.zoomJoinUrl, '_blank');
      } else {
        flashToast('✓ Meeting room prepared');
      }
      loadDashboardData();
    } catch (err) {
      const enteredLink = window.prompt(
        `Zoom meeting notice: ${err.message}\n\nEnter a Google Meet / Zoom link for this demo session (or click OK to open Google Meet):\n`,
        'https://meet.google.com/new'
      );
      if (enteredLink !== null) {
        const linkToUse = enteredLink.trim() || 'https://meet.google.com/new';
        try {
          await setDemoMeetingLink(demo._id || demo.id, linkToUse);
          window.open(linkToUse, '_blank');
          flashToast('✓ Demo meeting link set & opened');
          loadDashboardData();
        } catch (_) {
          window.open(linkToUse, '_blank');
        }
      }
    }
  };

  const handleSaveDemoOutcome = async () => {
    if (!demoOutcomeTarget) return;
    setSavingDemoOutcome(true);
    try {
      await updateDemo(demoOutcomeTarget._id || demoOutcomeTarget.id, {
        status: demoOutcomeForm.status,
        trainerNotes: demoOutcomeForm.notes,
        outcomeUpdatedBy: currentLeaderTrainerName
      });
      flashToast(`✓ Demo status marked as "${demoOutcomeForm.status}"`);
      setDemoOutcomeTarget(null);
      loadDashboardData();
    } catch (err) {
      flashToast(`⚠ Error saving outcome: ${err.message}`);
    } finally {
      setSavingDemoOutcome(false);
    }
  };



  // Real Average Faculty Attendance Percentage (Only computed across trainers with logged sessions)
  const realAverageAttendancePct = useMemo(() => {
    const activeWithLogs = trainerAttendanceReport.filter((tr) => tr.sessionsLogged > 0);
    if (activeWithLogs.length === 0) return 0;
    const sum = activeWithLogs.reduce((acc, tr) => acc + tr.attendancePct, 0);
    return Math.round(sum / activeWithLogs.length);
  }, [trainerAttendanceReport]);

  // Real Percentage of Batches Mapped to Faculty
  const realBatchMappingStats = useMemo(() => {
    if (scopedBatches.length === 0) return { pct: 0, mapped: 0, total: 0 };
    const mapped = scopedBatches.filter((b) => b.trainer || b.faculty || b.trainerId || b.trainerName).length;
    return {
      pct: Math.round((mapped / scopedBatches.length) * 100),
      mapped,
      total: scopedBatches.length
    };
  }, [scopedBatches]);

  // Filtered Students (used in Branch-Wise Student view) with full column filtering
  const studentUniqueCourses = useMemo(() => Array.from(new Set(scopedStudents.map((s) => s.course).filter(Boolean))).sort(), [scopedStudents]);
  const studentUniqueBatches = useMemo(() => Array.from(new Set(scopedStudents.map((s) => s.batch || s.batchName).filter(Boolean))).sort(), [scopedStudents]);
  const studentUniqueTrainers = useMemo(() => Array.from(new Set(scopedStudents.map((s) => s.trainer || s.faculty).filter(Boolean))).sort(), [scopedStudents]);

  const filteredStudents = useMemo(() => {
    return scopedStudents.filter((s) => {
      if (selectedBranch !== 'all' && String(s.branch || s.location || s.leadBranch || '').toLowerCase() !== selectedBranch.toLowerCase()) {
        return false;
      }
      if (selectedBatch !== 'all' && String(s.batch || s.batchName || s.batchId || '').toLowerCase() !== selectedBatch.toLowerCase()) {
        return false;
      }
      if (selectedTrainer !== 'all' && String(s.trainer || s.faculty || s.trainerId || '').toLowerCase() !== selectedTrainer.toLowerCase()) {
        return false;
      }
      if (studentCourseFilter !== 'all' && String(s.course || s.courseKey || '').toLowerCase() !== studentCourseFilter.toLowerCase()) {
        return false;
      }
      if (studentAttendanceFilter !== 'all') {
        const att = Math.round(Number(s.attendancePercentage ?? s.attendance ?? 85));
        if (studentAttendanceFilter === 'risk' && att >= 75) return false;
        if (studentAttendanceFilter === 'good' && att < 75) return false;
      }
      if (studentSyllabusFilter !== 'all') {
        const isDone = isStudentSyllabusCompleted(s);
        if (studentSyllabusFilter === 'completed' && !isDone) return false;
        if (studentSyllabusFilter === 'pending' && isDone) return false;
      }
      if (studentCertifiedFilter !== 'all') {
        const isCert = isStudentCertified(s);
        if (studentCertifiedFilter === 'certified' && !isCert) return false;
        if (studentCertifiedFilter === 'uncertified' && isCert) return false;
      }
      if (studentPlacementFilter !== 'all') {
        const isPlaced = isStudentPlaced(s);
        if (studentPlacementFilter === 'placed' && !isPlaced) return false;
        if (studentPlacementFilter === 'in_course' && isPlaced) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = String(s.name || '').toLowerCase().includes(q);
        const matchesId = String(s.studentId || '').toLowerCase().includes(q);
        const matchesPhone = String(s.phone || '').includes(q);
        const matchesBranch = String(s.branch || s.location || '').toLowerCase().includes(q);
        const matchesCourse = String(s.course || '').toLowerCase().includes(q);
        const matchesBatch = String(s.batch || s.batchName || '').toLowerCase().includes(q);
        const matchesFaculty = String(s.trainer || s.faculty || '').toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesPhone && !matchesBranch && !matchesCourse && !matchesBatch && !matchesFaculty) return false;
      }
      return true;
    });
  }, [
    scopedStudents, selectedBranch, selectedBatch, selectedTrainer, 
    studentCourseFilter, studentAttendanceFilter, studentSyllabusFilter, 
    studentCertifiedFilter, studentPlacementFilter, searchQuery
  ]);

  // Filtered Trainer Attendance Report
  const attUniqueBranches = useMemo(() => Array.from(new Set(trainerAttendanceReport.map(t => t.branch).filter(Boolean))).sort(), [trainerAttendanceReport]);
  const attUniqueShifts = useMemo(() => Array.from(new Set(trainerAttendanceReport.map(t => t.shift).filter(Boolean))).sort(), [trainerAttendanceReport]);

  const filteredAttendanceReport = useMemo(() => {
    return trainerAttendanceReport.filter((tr) => {
      if (attBranchFilter !== 'all' && String(tr.branch || '').toLowerCase() !== attBranchFilter.toLowerCase()) {
        return false;
      }
      if (attShiftFilter !== 'all' && String(tr.shift || '').toLowerCase() !== attShiftFilter.toLowerCase()) {
        return false;
      }
      if (attStatusFilter !== 'all') {
        if (attStatusFilter === 'active' && !tr.isActive) return false;
        if (attStatusFilter === 'inactive' && tr.isActive) return false;
      }
      if (attPctFilter !== 'all') {
        const pct = Number(tr.attendancePct) || 0;
        if (attPctFilter === 'high' && pct < 90) return false;
        if (attPctFilter === 'moderate' && (pct < 75 || pct >= 90)) return false;
        if (attPctFilter === 'low' && pct >= 75) return false;
      }
      if (attSearch) {
        const q = attSearch.toLowerCase();
        const matchesName = String(tr.trainerName || '').toLowerCase().includes(q);
        const matchesBranch = String(tr.branch || '').toLowerCase().includes(q);
        const matchesShift = String(tr.shift || '').toLowerCase().includes(q);
        if (!matchesName && !matchesBranch && !matchesShift) return false;
      }
      return true;
    });
  }, [trainerAttendanceReport, attBranchFilter, attShiftFilter, attStatusFilter, attPctFilter, attSearch]);

  // Filtered Trainer & Batch Mapping
  const mappingUniqueBranches = useMemo(() => Array.from(new Set(trainerBatchMapping.map(t => t.branch).filter(Boolean))).sort(), [trainerBatchMapping]);
  const mappingUniqueCourses = useMemo(() => Array.from(new Set(trainerBatchMapping.map(t => t.course).filter(Boolean))).sort(), [trainerBatchMapping]);
  const mappingUniqueBatches = useMemo(() => {
    const list = [];
    trainerBatchMapping.forEach(t => t.batches.forEach(b => {
      const name = b.batchName || b.name || b.batchId;
      if (name && !list.includes(name)) list.push(name);
    }));
    return list.sort();
  }, [trainerBatchMapping]);

  const filteredBatchMapping = useMemo(() => {
    return trainerBatchMapping.filter((tr) => {
      if (mappingBranchFilter !== 'all' && !String(tr.branch || tr.zone || '').toLowerCase().includes(mappingBranchFilter.toLowerCase())) {
        return false;
      }
      if (mappingCourseFilter !== 'all' && String(tr.course || '').toLowerCase() !== mappingCourseFilter.toLowerCase()) {
        return false;
      }
      if (mappingBatchFilter !== 'all') {
        const hasBatch = tr.batches.some(b => String(b.batchName || b.name || b.batchId || '').toLowerCase() === mappingBatchFilter.toLowerCase());
        if (!hasBatch) return false;
      }
      if (mappingSearch) {
        const q = mappingSearch.toLowerCase();
        const matchesName = String(tr.trainerName || '').toLowerCase().includes(q);
        const matchesBranch = String(tr.branch || tr.zone || '').toLowerCase().includes(q);
        const matchesCourse = String(tr.course || '').toLowerCase().includes(q);
        const matchesTL = String(tr.teamLeadName || '').toLowerCase().includes(q);
        const matchesMgr = String(tr.managerName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesBranch && !matchesCourse && !matchesTL && !matchesMgr) return false;
      }
      return true;
    });
  }, [trainerBatchMapping, mappingBranchFilter, mappingCourseFilter, mappingBatchFilter, mappingSearch]);

  // Filtered Batch-Wise Syllabus Progress Breakdown
  const syllabusUniqueBranches = useMemo(() => Array.from(new Set(batchWiseReport.map(b => b.branch).filter(Boolean))).sort(), [batchWiseReport]);
  const syllabusUniqueCourses = useMemo(() => Array.from(new Set(batchWiseReport.map(b => b.course).filter(Boolean))).sort(), [batchWiseReport]);
  const syllabusUniqueFaculty = useMemo(() => Array.from(new Set(batchWiseReport.map(b => b.trainer || b.faculty || b.trainerName).filter(Boolean))).sort(), [batchWiseReport]);

  const filteredSyllabusBatches = useMemo(() => {
    return batchWiseReport.filter((b) => {
      if (syllabusBranchFilter !== 'all' && String(b.branch || '').toLowerCase() !== syllabusBranchFilter.toLowerCase()) {
        return false;
      }
      if (syllabusCourseFilter !== 'all' && String(b.course || '').toLowerCase() !== syllabusCourseFilter.toLowerCase()) {
        return false;
      }
      if (syllabusFacultyFilter !== 'all' && !String(b.trainer || b.faculty || b.trainerName || '').toLowerCase().includes(syllabusFacultyFilter.toLowerCase())) {
        return false;
      }
      if (syllabusProgressFilter !== 'all') {
        const pct = b.enrolledCount > 0 ? Math.round((b.completedSyllabusCount / b.enrolledCount) * 100) : 0;
        if (syllabusProgressFilter === 'completed' && pct < 100) return false;
        if (syllabusProgressFilter === 'in_progress' && (pct === 0 || pct === 100)) return false;
        if (syllabusProgressFilter === 'zero' && pct > 0) return false;
      }
      if (syllabusSearch) {
        const q = syllabusSearch.toLowerCase();
        const matchesBatch = String(b.batchName || b.name || '').toLowerCase().includes(q);
        const matchesCourse = String(b.course || '').toLowerCase().includes(q);
        const matchesBranch = String(b.branch || '').toLowerCase().includes(q);
        const matchesFaculty = String(b.trainer || b.faculty || b.trainerName || '').toLowerCase().includes(q);
        if (!matchesBatch && !matchesCourse && !matchesBranch && !matchesFaculty) return false;
      }
      return true;
    });
  }, [batchWiseReport, syllabusBranchFilter, syllabusCourseFilter, syllabusFacultyFilter, syllabusProgressFilter, syllabusSearch]);

  // Filtered Weak Students Report
  const weakUniqueBranches = useMemo(() => Array.from(new Set(allWeakStudents.map(s => s.branch).filter(Boolean))).sort(), [allWeakStudents]);
  const weakUniqueBatches = useMemo(() => Array.from(new Set(allWeakStudents.map(s => s.batch).filter(Boolean))).sort(), [allWeakStudents]);
  const weakUniqueFaculty = useMemo(() => Array.from(new Set(allWeakStudents.map(s => s.trainer || s.faculty).filter(Boolean))).sort(), [allWeakStudents]);

  const filteredWeakStudents = useMemo(() => {
    return allWeakStudents.filter((st) => {
      if (weakBranchFilter !== 'all' && String(st.branch || '').toLowerCase() !== weakBranchFilter.toLowerCase()) {
        return false;
      }
      if (weakBatchFilter !== 'all' && String(st.batch || '').toLowerCase() !== weakBatchFilter.toLowerCase()) {
        return false;
      }
      if (weakFacultyFilter !== 'all' && !String(st.trainer || st.faculty || '').toLowerCase().includes(weakFacultyFilter.toLowerCase())) {
        return false;
      }
      if (weakReasonFilter !== 'all') {
        const reason = String(st.attentionReason || '').toLowerCase();
        if (weakReasonFilter === 'attendance' && !reason.includes('attendance')) return false;
        if (weakReasonFilter === 'score' && !reason.includes('score')) return false;
      }
      if (weakSearch) {
        const q = weakSearch.toLowerCase();
        const matchesName = String(st.name || '').toLowerCase().includes(q);
        const matchesId = String(st.studentId || '').toLowerCase().includes(q);
        const matchesBranch = String(st.branch || '').toLowerCase().includes(q);
        const matchesBatch = String(st.batch || '').toLowerCase().includes(q);
        const matchesFaculty = String(st.trainer || st.faculty || '').toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesBranch && !matchesBatch && !matchesFaculty) return false;
      }
      return true;
    });
  }, [allWeakStudents, weakBranchFilter, weakBatchFilter, weakFacultyFilter, weakReasonFilter, weakSearch]);

  // Filtered Demo Details
  const demoUniqueBranches = useMemo(() => Array.from(new Set(scopedDemos.map(d => d.branch).filter(Boolean))).sort(), [scopedDemos]);
  const demoUniqueCourses = useMemo(() => Array.from(new Set(scopedDemos.map(d => d.course).filter(Boolean))).sort(), [scopedDemos]);
  const demoUniqueFaculty = useMemo(() => Array.from(new Set(scopedDemos.map(d => d.trainer || d.trainerMapping).filter(Boolean))).sort(), [scopedDemos]);
  const demoUniqueStatuses = useMemo(() => Array.from(new Set(scopedDemos.map(d => String(d.status || '').toLowerCase()).filter(Boolean))).sort(), [scopedDemos]);

  const filteredDemosList = useMemo(() => {
    return displayedDemos.filter((dm) => {
      if (demoBranchFilter !== 'all' && String(dm.branch || '').toLowerCase() !== demoBranchFilter.toLowerCase()) {
        return false;
      }
      if (demoCourseFilter !== 'all' && String(dm.course || '').toLowerCase() !== demoCourseFilter.toLowerCase()) {
        return false;
      }
      if (demoFacultyFilter !== 'all' && !String(dm.trainer || dm.trainerMapping || '').toLowerCase().includes(demoFacultyFilter.toLowerCase())) {
        return false;
      }
      if (demoStatusFilter !== 'all' && String(dm.status || '').toLowerCase() !== demoStatusFilter.toLowerCase()) {
        return false;
      }
      if (demoSearch) {
        const q = demoSearch.toLowerCase();
        const matchesCand = String(dm.candidateName || '').toLowerCase().includes(q);
        const matchesPhone = String(dm.phone || '').includes(q);
        const matchesCourse = String(dm.course || '').toLowerCase().includes(q);
        const matchesBranch = String(dm.branch || '').toLowerCase().includes(q);
        const matchesFaculty = String(dm.trainer || dm.trainerMapping || '').toLowerCase().includes(q);
        if (!matchesCand && !matchesPhone && !matchesCourse && !matchesBranch && !matchesFaculty) return false;
      }
      return true;
    });
  }, [displayedDemos, demoBranchFilter, demoCourseFilter, demoFacultyFilter, demoStatusFilter, demoSearch]);

  // Filtered Complete Training Leadership Matrix
  const combinedLeadershipList = useMemo(() => {
    return [
      ...trainerManagersList.map(m => ({ ...m, roleTier: 'manager' })),
      ...trainerTLsList.map(tl => ({ ...tl, roleTier: 'tl' }))
    ];
  }, [trainerManagersList, trainerTLsList]);

  const matrixUniqueZones = useMemo(() => Array.from(new Set(combinedLeadershipList.map(l => l.zone).filter(Boolean))).sort(), [combinedLeadershipList]);

  const filteredLeadershipList = useMemo(() => {
    return combinedLeadershipList.filter((ldr) => {
      if (matrixRoleFilter !== 'all' && ldr.roleTier !== matrixRoleFilter) return false;
      if (matrixZoneFilter !== 'all' && !String(ldr.zone || '').toLowerCase().includes(matrixZoneFilter.toLowerCase())) return false;
      if (matrixStatusFilter !== 'all' && !String(ldr.status || '').toLowerCase().includes(matrixStatusFilter.toLowerCase())) return false;
      if (matrixSearch) {
        const q = matrixSearch.toLowerCase();
        const matchesName = String(ldr.name || '').toLowerCase().includes(q);
        const matchesEmail = String(ldr.email || '').toLowerCase().includes(q);
        const matchesPhone = String(ldr.phone || '').includes(q);
        const matchesZone = String(ldr.zone || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesZone) return false;
      }
      return true;
    });
  }, [combinedLeadershipList, matrixRoleFilter, matrixZoneFilter, matrixStatusFilter, matrixSearch]);

  // Filtered Batches List
  const batchUniqueBranches = useMemo(() => Array.from(new Set(batchWiseReport.map(b => b.branch).filter(Boolean))).sort(), [batchWiseReport]);
  const batchUniqueCourses = useMemo(() => Array.from(new Set(batchWiseReport.map(b => b.course).filter(Boolean))).sort(), [batchWiseReport]);
  const batchUniqueFaculty = useMemo(() => Array.from(new Set(batchWiseReport.map(b => b.trainer || b.faculty || b.trainerName).filter(Boolean))).sort(), [batchWiseReport]);

  const filteredBatchList = useMemo(() => {
    return batchWiseReport.filter((b) => {
      if (batchBranchFilter !== 'all' && String(b.branch || '').toLowerCase() !== batchBranchFilter.toLowerCase()) {
        return false;
      }
      if (batchCourseFilter !== 'all' && String(b.course || '').toLowerCase() !== batchCourseFilter.toLowerCase()) {
        return false;
      }
      if (batchFacultyFilter !== 'all' && !String(b.trainer || b.faculty || b.trainerName || '').toLowerCase().includes(batchFacultyFilter.toLowerCase())) {
        return false;
      }
      if (batchSearch) {
        const q = batchSearch.toLowerCase();
        const matchesName = String(b.batchName || b.name || '').toLowerCase().includes(q);
        const matchesCourse = String(b.course || '').toLowerCase().includes(q);
        const matchesBranch = String(b.branch || '').toLowerCase().includes(q);
        const matchesFaculty = String(b.trainer || b.faculty || b.trainerName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCourse && !matchesBranch && !matchesFaculty) return false;
      }
      return true;
    });
  }, [batchWiseReport, batchBranchFilter, batchCourseFilter, batchFacultyFilter, batchSearch]);

  // Assign / Reassign demo handler
  const handleConfirmReassign = async () => {
    if (!reassignDemoTarget || !reassignForm.toTrainerId) return;
    setReassigning(true);
    try {
      const isInitialAssign = !reassignDemoTarget.trainer || reassignDemoTarget.trainer === 'Unassigned' || !reassignDemoTarget.trainerId;
      if (isInitialAssign) {
        await assignDemo(reassignDemoTarget._id, {
          toTrainerId: reassignForm.toTrainerId,
          reason: reassignForm.reason
        });
      } else {
        await reassignDemo(reassignDemoTarget._id, {
          toTrainerId: reassignForm.toTrainerId,
          reason: reassignForm.reason
        });
      }
      const toTrainer = scopedTrainers.find((t) => (t.trainerId || t.id) === reassignForm.toTrainerId) || trainers.find((t) => (t.trainerId || t.id) === reassignForm.toTrainerId);
      flashToast(isInitialAssign
        ? `✓ Demo for ${reassignDemoTarget.candidateName} successfully assigned to ${toTrainer?.trainerName || toTrainer?.name || 'Faculty'}`
        : `✓ Demo for ${reassignDemoTarget.candidateName} successfully reassigned to ${toTrainer?.trainerName || toTrainer?.name || 'Faculty'}`
      );
      setReassignDemoTarget(null);
      loadDashboardData();
    } catch (err) {
      flashToast(`⚠ Assignment failed: ${err?.response?.data?.error || err.message}`);
    } finally {
      setReassigning(false);
    }
  };

  // Nav Title Helper
  const getNavTitle = () => {
    switch (activeTab) {
      case 'overview': return `${currentLeader.roleCategory} · Executive Overview`;
      case 'branches': return 'Branch-Wise Student Details';
      case 'batches': return 'Batch-Wise Details & Performance';
      case 'weak_students': return 'Weak Students Report & Intervention Desk';
      case 'syllabus': return 'Syllabus Completion Report';
      case 'mapping': return 'Trainer and Batch Mapping';
      case 'trainer_attendance': return 'Trainer Attendance & Shift Details';
      case 'demos': return 'Demo Sessions & Conversion Tracker';
      case 'doubts': return 'Student Doubt Box & Escalations';
      case 'utilization': return 'Utilization & Hourly Work Planning Dashboard';
      default: return 'Trainer Portal';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-[#0d1a24] text-slate-100 font-sans antialiased overflow-hidden animate-fadeIn">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-[999] px-4 py-3 rounded-2xl bg-slate-900 border border-teal-500/50 text-white text-xs font-bold shadow-2xl animate-bounce flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Drawer Overlay */}
      {navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* ================= LEFT SIDEBAR (Standard Dark Theme #0b1720) ================= */}
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
                {currentLeader.roleCategory}
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

        {/* Role Identity Card with Regional / Pod Switcher */}
        <div className="px-3 py-2">
          <div className="bg-[#162734] border border-[#213a4d] rounded-2xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-white text-[11px] font-bold">
                {roleType === 'head' ? 'Department Head of Training' : roleType === 'manager' ? 'Training Manager' : 'Training Team Lead'}
              </span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-[#00897b]/20 text-[#00897b] border border-[#00897b]/30">
                {roleType === 'head' ? 'EXECUTIVE' : roleType === 'manager' ? 'MANAGEMENT' : 'LEAD'}
              </span>
            </div>

            {roleType === 'head' ? (
              <div className="flex items-center gap-2.5 bg-[#0c1921] border border-[#213a4d] rounded-xl p-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                  {(currentUser?.name || 'H')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white text-xs font-bold truncate">{currentUser?.name || 'Department Head of Training'}</div>
                  <div className="text-[#649297] text-[10px] font-medium truncate">{currentUser?.email || 'All 12 Branches · Department Head of Training'}</div>
                </div>
              </div>
            ) : roleType === 'manager' ? (
              <div className="flex items-center gap-2.5 bg-[#0c1921] border border-[#213a4d] rounded-xl p-2.5">
                <div className="w-9 h-9 rounded-full text-white font-black text-sm flex items-center justify-center shadow-xs" style={{ backgroundColor: currentLeader.color || '#0d9488' }}>
                  {(currentLeader.name || 'M')[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white text-xs font-bold truncate">{currentLeader.name}</div>
                  <div className="text-[#649297] text-[10px] font-medium truncate">
                    {currentLeader.zoneLabel || currentLeader.zone} · {scopedTrainers.length} Faculty
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 bg-[#0c1921] border border-[#213a4d] rounded-xl p-2.5">
                <div className="w-9 h-9 rounded-full text-white font-black text-sm flex items-center justify-center shadow-xs" style={{ backgroundColor: currentLeader.color || '#16a34a' }}>
                  {(currentLeader.name || 'T')[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white text-xs font-bold truncate">{currentLeader.name}</div>
                  <div className="text-[#649297] text-[10px] font-medium truncate">
                    {currentLeader.zoneLabel || currentLeader.zone} Squad · {scopedTrainers.length} Faculty
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 8 Focused Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-800">
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-[#476b74]">
              {roleType === 'head' ? 'HEAD COMMAND' : roleType === 'manager' ? 'ZONE OPERATIONS' : 'POD TRACKING'}
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab('session_room')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'session_room'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Play className="w-4 h-4 shrink-0 text-emerald-400 fill-current" />
                  <span>Class Session Room</span>
                </div>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                  Take Session
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <Home className="w-4 h-4 shrink-0" />
                <span>Executive Overview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('utilization')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'utilization'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 shrink-0 text-teal-400" />
                  <span>Utilization Dashboard</span>
                </div>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300">
                  Hourly
                </span>
              </button>

              {isHeadRole && (
                <button
                  type="button"
                  onClick={() => setActiveTab('managers_tls')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all cursor-pointer ${
                    activeTab === 'managers_tls'
                      ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                      : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-4 h-4 shrink-0 text-teal-400" />
                    <span>Managers &amp; Team Leads</span>
                  </div>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300">
                    {trainerManagersList.length}M · {trainerTLsList.length}TL
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('branches')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'branches'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span>Branch-Wise Students</span>
                </div>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white/10">
                  {scopedStudents.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('batches')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'batches'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>Batch-Wise Details</span>
                </div>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white/10">
                  {scopedBatches.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('weak_students')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'weak_students'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Weak Students Report</span>
                </div>
                {allWeakStudents.length > 0 && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-500 text-white">
                    {allWeakStudents.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('syllabus')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'syllabus'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ListChecks className="w-4 h-4 shrink-0" />
                  <span>Syllabus Completion</span>
                </div>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300">
                  {syllabusReport.completionRate}%
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('mapping')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'mapping'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Trainer &amp; Batch Mapping</span>
                </div>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300">
                  {scopedTrainers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('shift_availability')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'shift_availability'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Shift &amp; Availability</span>
                </div>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                  isHeadRole ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-300'
                }`}>
                  {isHeadRole ? 'Manage' : 'View'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('trainer_attendance')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'trainer_attendance'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>Trainer Attendance</span>
                </div>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                  Live
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('demos')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'demos'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AtSign className="w-4 h-4 shrink-0" />
                  <span>Demo Details</span>
                </div>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300">
                  {scopedDemos.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('doubts')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'doubts'
                    ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                    : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span>Doubt Box Details</span>
                </div>
                {doubtsReport.pending.length > 0 && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-900">
                    {doubtsReport.pending.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Logout Bottom Action */}
        <div className="p-3 border-t border-[#172d3b]">
          <button
            type="button"
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
              type="button"
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
              type="button"
              onClick={loadDashboardData}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 cursor-pointer"
              title="Refresh Live Data"
            >
              <RefreshCw className="w-4 h-4" />
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
                type="button"
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

        {/* Content Body */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1720px] w-full mx-auto">
          {/* ================= SECTION: LIVE CLASS SESSION ROOM ================= */}
          <div
            className={activeTab === 'session_room' ? 'space-y-6 animate-fadeIn' : 'fixed top-0 -left-[4000px] w-[1100px] pointer-events-none'}
            aria-hidden={activeTab !== 'session_room'}
          >
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h3 className="text-base font-extrabold text-slate-900">Live Class Session &amp; Attendance Room</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conduct live online or offline classes, launch Zoom sessions, log student attendance, and track syllabus modules as {currentLeaderTrainerName}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('batches')}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                View All Batches ({scopedBatches.length})
              </button>
            </div>
            <ClassSessionRoom
              trainerId={currentLeaderTrainerId}
              trainerName={currentLeaderTrainerName}
              batches={formattedBatchesForSessionRoom}
              materials={materials}
              onAttendanceSaved={loadDashboardData}
            />
          </div>

          {/* ================= SECTION 0: EXECUTIVE OVERVIEW ================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 5 Core Milestone Counts (Requested: Total Students, Active Students, Syllabus Completed, Certified, Placed) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-[#00897b]" />
                      <span>Academic &amp; Placement Performance Metrics</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      {roleType === 'head'
                        ? 'Consolidated counts across all 12 academy branches nationwide'
                        : `${currentLeader.name} · Branch counts across your assigned locations: ${scopedBranchNames.join(', ')}`}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                    {roleType === 'head' ? 'All Branches Scope' : `${scopedBranchNames.length} Branches Scoped`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 pt-1">
                  {/* 1. Total Student Count */}
                  <div
                    onClick={() => setActiveTab('branches')}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Total Students</span>
                      <Users className="w-4 h-4 text-slate-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">{studentMilestoneStats.total}</div>
                    <div className="text-[11px] text-slate-500 font-medium mt-1">
                      {roleType === 'head' ? 'All branches combined' : `In ${scopedBranchNames.length} assigned branches`}
                    </div>
                  </div>

                  {/* 2. Active Students */}
                  <div
                    onClick={() => setActiveTab('branches')}
                    className="p-4 rounded-xl border border-blue-200/80 bg-blue-50/40 hover:bg-blue-50/70 hover:border-blue-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10.5px] font-bold text-blue-700 uppercase tracking-wider">Active Students</span>
                      <UserCheck className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl font-black text-blue-900">{studentMilestoneStats.active}</div>
                    <div className="text-[11px] text-blue-700 font-medium mt-1">
                      Currently in training
                    </div>
                  </div>

                  {/* 3. Syllabus Completed */}
                  <div
                    onClick={() => setActiveTab('syllabus')}
                    className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/40 hover:bg-emerald-50/70 hover:border-emerald-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10.5px] font-bold text-emerald-700 uppercase tracking-wider">Syllabus Completed</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl font-black text-emerald-900">{studentMilestoneStats.syllabusDone}</div>
                    <div className="text-[11px] text-emerald-700 font-medium mt-1">
                      100% curriculum cleared
                    </div>
                  </div>

                  {/* 4. Certified */}
                  <div
                    onClick={() => setActiveTab('branches')}
                    className="p-4 rounded-xl border border-purple-200/80 bg-purple-50/40 hover:bg-purple-50/70 hover:border-purple-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10.5px] font-bold text-purple-700 uppercase tracking-wider">Certified</span>
                      <Award className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl font-black text-purple-900">{studentMilestoneStats.certified}</div>
                    <div className="text-[11px] text-purple-700 font-medium mt-1">
                      AAPC / Exam certified
                    </div>
                  </div>

                  {/* 5. Placed */}
                  <div
                    onClick={() => setActiveTab('branches')}
                    className="p-4 rounded-xl border border-teal-200/80 bg-teal-50/40 hover:bg-teal-50/70 hover:border-teal-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10.5px] font-bold text-teal-800 uppercase tracking-wider">Placed</span>
                      <Briefcase className="w-4 h-4 text-teal-700 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl font-black text-teal-950">{studentMilestoneStats.placed}</div>
                    <div className="text-[11px] text-teal-800 font-medium mt-1">
                      Job offer &amp; joined
                    </div>
                  </div>
                </div>
              </div>

              {/* Operational KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div
                  onClick={() => setActiveTab('batches')}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Active Batches
                    </span>
                    <Layers className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{scopedBatches.length}</div>
                  <div className="text-xs text-blue-700 font-semibold mt-1">
                    Mapped to {scopedTrainers.length} faculty trainers →
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('mapping')}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Faculty Mapping</span>
                    <Users className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{scopedTrainers.length} Trainers</div>
                  <div className="text-xs text-purple-700 font-semibold mt-1">100% Batches Mapped →</div>
                </div>

                <div
                  onClick={() => setActiveTab('trainer_attendance')}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Faculty Attendance</span>
                    <Calendar className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">95% Average</div>
                  <div className="text-xs text-emerald-700 font-semibold mt-1">Live Shift Adherence →</div>
                </div>

                <div
                  onClick={() => setActiveTab('shift_availability')}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Shift &amp; Availability</span>
                    <Clock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {isHeadRole ? 'Roster Allocator' : 'My Shift & Roster'}
                  </div>
                  <div className="text-xs text-amber-700 font-semibold mt-1">
                    {isHeadRole ? 'Manage shifts & week offs →' : 'View shift & weekly roster →'}
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('weak_students')}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Weak Students
                    </span>
                    <AlertTriangle className="w-5 h-5 text-rose-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-2xl font-black text-rose-600">{allWeakStudents.length}</div>
                  <div className="text-xs text-rose-600 font-semibold mt-1">
                    Attendance &lt; 75% or Low Score →
                  </div>
                </div>
              </div>

              {/* Unassigned Demos Alert for Trainer Head & Manager */}
              {unassignedDemos.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-lg shrink-0">
                      ⚠️
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                        <span>{unassignedDemos.length} Demo{unassignedDemos.length > 1 ? 's' : ''} Awaiting Trainer Assignment</span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">Action Required</span>
                      </h4>
                      <p className="text-xs text-amber-800 font-medium mt-0.5">
                        Booked by HR counselors and waiting for {roleType === 'manager' ? 'Trainer Manager' : 'Department Head of Training'} to assign available faculty.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('demos'); setDemoFilterTab('unassigned'); }}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    Assign Trainers Now ({unassignedDemos.length}) →
                  </button>
                </div>
              )}

              {/* Bottom Operational Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  onClick={() => setActiveTab('utilization')}
                  className="bg-white p-4 rounded-2xl border border-teal-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-white to-teal-50/40"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10.5px] font-bold text-teal-800 uppercase">Hourly Utilization</span>
                    <Clock className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900">8-Hour Workday</div>
                  <div className="text-[11px] text-teal-700 font-semibold mt-0.5">Track Hour-by-Hour Progress →</div>
                </div>
                <div
                  onClick={() => setActiveTab('demos')}
                  className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase">Demos Tracked</span>
                    <Video className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900">{scopedDemos.length} Total</div>
                  <div className="text-[11px] text-cyan-700 font-medium mt-0.5">
                    {unassignedDemos.length > 0 ? (
                      <span className="text-amber-700 font-extrabold">⚠️ {unassignedDemos.length} Awaiting Assignment · </span>
                    ) : null}
                    {demoReport.scheduled.length} Scheduled →
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('doubts')}
                  className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase">Student Doubts</span>
                    <MessageSquare className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-xl font-black text-slate-900">{doubtsReport.pending.length} Pending</div>
                  <div className="text-[11px] text-amber-700 font-medium mt-0.5">{doubtsReport.resolved.length} Resolved →</div>
                </div>
              </div>

              {/* Training Leadership: Trainer Managers & Team Leads Quick Cards (Head Command) */}
              {isHeadRole && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-[#00897b]" />
                        <span>Training Operations: Managers &amp; Team Leads ({trainerManagersList.length} Managers · {trainerTLsList.length} TLs)</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Zonal managers and squad team leads overseeing faculty, batch allocation, and student curriculum nationwide.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('managers_tls')}
                      className="text-xs font-bold text-[#00897b] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All Managers &amp; TL Details →</span>
                    </button>
                  </div>

                  {/* 2 Managers + 3 Team Leads Overview Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
                    {/* Trainer Managers */}
                    {trainerManagersList.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setActiveTab('managers_tls')}
                        className="p-4 rounded-xl border border-teal-200/80 bg-teal-50/30 hover:bg-teal-50/70 hover:border-teal-400 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-100 text-teal-900">
                              TRAINER MANAGER
                            </span>
                            <span className="text-[10px] font-bold text-teal-700">{m.zone}</span>
                          </div>
                          <div className="text-base font-black text-slate-900 group-hover:text-teal-800 transition-colors">
                            {m.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {m.zoneLabel}
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-teal-100 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                          <span>{m.teamLeads?.length || 2} Reporting TLs</span>
                          <span className="text-teal-700 font-black">{m.trainersCount} Faculty</span>
                        </div>
                      </div>
                    ))}

                    {/* Team Leads */}
                    {trainerTLsList.map((tl) => (
                      <div
                        key={tl.id}
                        onClick={() => setActiveTab('managers_tls')}
                        className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/30 hover:bg-emerald-50/70 hover:border-emerald-400 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900">
                              TEAM LEAD (TL)
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700">{tl.zone}</span>
                          </div>
                          <div className="text-base font-black text-slate-900 group-hover:text-emerald-800 transition-colors">
                            {tl.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Reports to: {tl.managerName}
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-emerald-100 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                          <span>{tl.batchesCount} Batches</span>
                          <span className="text-emerald-700 font-black">{tl.trainersCount} Squad</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Branch Overview Grid */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {roleType === 'head' ? 'Branch Academic & Placement Overview' : `${currentLeader.name}'s Branches Overview`}
                    </h3>
                    <p className="text-xs text-slate-400">Total, active, syllabus completion, certification and placement counts per branch.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('branches')}
                    className="text-xs font-bold text-[#00897b] hover:underline"
                  >
                    View All Student Lists →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  {branchWiseReport.map((b) => (
                    <div
                      key={b.branchName}
                      onClick={() => {
                        setSelectedBranch(b.branchName);
                        setActiveTab('branches');
                      }}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-teal-50/40 hover:border-teal-300 transition-all cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">{b.branchName}</span>
                        <span className="text-[10.5px] font-extrabold text-[#00897b] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                          {b.totalStudents} Students
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[9.5px] font-bold uppercase">Active</span>
                          <span className="font-extrabold text-blue-700">{b.activeStudents}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9.5px] font-bold uppercase">Syllabus Done</span>
                          <span className="font-extrabold text-emerald-700">{b.syllabusCompleted}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9.5px] font-bold uppercase">Certified</span>
                          <span className="font-extrabold text-purple-700">{b.certified}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9.5px] font-bold uppercase">Placed</span>
                          <span className="font-extrabold text-teal-800">{b.placed}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= SECTION: TRAINER MANAGERS & TEAM LEADS ================= */}
          {activeTab === 'managers_tls' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Top Command Banner with View Mode Switch */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                      TRAINING LEADERSHIP DIRECTORY
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-bold text-slate-500">Pan-India Operations</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Trainer Managers &amp; Trainer Team Leads
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                    Supervisory chain of command: Zonal Training Managers oversee regional pod Team Leads, who directly mentor and allocate faculty trainers across batches and branches.
                  </p>
                </div>

                {/* View Switcher: Cards vs Chart */}
                <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 self-stretch sm:self-auto justify-center">
                  <button
                    type="button"
                    onClick={() => setLeadershipViewMode('cards')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      leadershipViewMode === 'cards'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5 text-teal-600" />
                    <span>Leadership Profiles</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeadershipViewMode('chart')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      leadershipViewMode === 'chart'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Network className="w-3.5 h-3.5 text-blue-600" />
                    <span>Org Hierarchy Tree</span>
                  </button>
                </div>
              </div>

              {/* View 1: Visual Hierarchy Chart */}
              {leadershipViewMode === 'chart' ? (
                <div className="space-y-4">
                  <TrainerOrgHierarchyChart
                    head={trainerCredentials?.head}
                    managers={trainerManagersList}
                    teamLeads={trainerTLsList}
                    faculty={trainers}
                    onSelectNode={(node) => {
                      if (node?.roleType === 'manager') {
                        flashToast(`Filtered to Trainer Manager: ${node.name}`);
                      } else if (node?.roleType === 'tl') {
                        flashToast(`Filtered to Training Team Lead: ${node.name}`);
                      }
                    }}
                  />
                </div>
              ) : (
                /* View 2: Detailed Leadership Cards & Tables */
                <div className="space-y-6">
                  {/* Executive Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div className="bg-white rounded-2xl p-4 border border-teal-200/90 shadow-2xs">
                      <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-teal-800 font-mono">
                        Trainer Managers
                      </div>
                      <div className="text-3xl font-black text-slate-900 my-1">
                        {trainerManagersList.length}
                      </div>
                      <div className="text-[11px] text-teal-700 font-medium">
                        TN/KL &amp; AP/TS Zonal Managers
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-emerald-200/90 shadow-2xs">
                      <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-emerald-800 font-mono">
                        Trainer Team Leads
                      </div>
                      <div className="text-3xl font-black text-slate-900 my-1">
                        {trainerTLsList.length}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-medium">
                        Regional Pod Squad Leaders
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-blue-200/90 shadow-2xs">
                      <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-blue-800 font-mono">
                        Faculty Supervised
                      </div>
                      <div className="text-3xl font-black text-slate-900 my-1">
                        {scopedTrainers.length}
                      </div>
                      <div className="text-[11px] text-blue-700 font-medium">
                        Active Faculty in Squads
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-purple-200/90 shadow-2xs">
                      <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-purple-800 font-mono">
                        Batches &amp; Students
                      </div>
                      <div className="text-3xl font-black text-slate-900 my-1">
                        {scopedBatches.length} <span className="text-base text-slate-400 font-normal">/ {scopedStudents.length}</span>
                      </div>
                      <div className="text-[11px] text-purple-700 font-medium">
                        Live Batches / Enrolled Scholars
                      </div>
                    </div>
                  </div>

                  {/* Section 1: TRAINER MANAGERS DETAILS */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shadow-xs">
                          <Briefcase className="w-5 h-5 text-teal-700" />
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900">
                            Trainer Managers ({trainerManagersList.length})
                          </h3>
                          <p className="text-xs text-slate-500">
                            Zonal managers reporting directly to Head of Training. Responsible for multi-branch faculty shifts, syllabus approvals &amp; TL oversight.
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                        Level 2 Leadership Tier
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
                      {trainerManagersList.length === 0 ? (
                        <div className="col-span-full p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                          <Briefcase className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm font-bold text-slate-700">No Trainer Managers Created Yet</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                            User accounts created with the &quot;TRAINING TEAM MANAGER&quot; or &quot;Trainer Manager&quot; role in Admin Management will automatically populate here.
                          </p>
                        </div>
                      ) : (
                        trainerManagersList.map((m) => (
                        <div
                          key={m.id}
                          className="rounded-2xl border border-teal-200/90 bg-gradient-to-br from-white via-teal-50/20 to-teal-50/40 p-5 shadow-xs hover:shadow-md transition-all space-y-4"
                        >
                          {/* Manager Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3.5">
                              <div
                                className="w-12 h-12 rounded-2xl text-white font-black text-lg flex items-center justify-center shadow-md shrink-0"
                                style={{ backgroundColor: m.color || '#0d9488' }}
                              >
                                {m.badge || 'TM'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-lg font-black text-slate-900 tracking-tight">{m.name}</h4>
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-200">
                                    {m.role}
                                  </span>
                                </div>
                                <div className="text-xs font-bold text-teal-800 flex items-center gap-1.5 mt-0.5">
                                  <span>{m.zone}</span>
                                  <span>·</span>
                                  <span className="text-slate-500 font-medium">{m.zoneLabel}</span>
                                </div>
                              </div>
                            </div>

                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10.5px] font-bold text-emerald-700 shrink-0">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>{m.status}</span>
                            </span>
                          </div>

                          {/* Contact Info Row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white/80 p-3 rounded-xl border border-teal-100">
                            <div className="flex items-center gap-2 text-slate-600 truncate">
                              <Mail className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <a href={`mailto:${m.email}`} className="hover:text-teal-800 hover:underline truncate font-medium">
                                {m.email}
                              </a>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <a href={`tel:${m.phone}`} className="hover:text-teal-800 font-medium">
                                {m.phone}
                              </a>
                              {m.phone && m.phone !== '—' && (
                                <button
                                  type="button"
                                  onClick={() => redirectToWhatsAppWeb(m.phone, `Hello ${m.name}, this is Head of Training reaching out regarding your training operations.`)}
                                  className="ml-auto text-[10px] font-extrabold text-emerald-700 hover:underline px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200"
                                >
                                  WhatsApp
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Reporting Team Leads under this Manager */}
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                              Reporting Team Leads (TLs)
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(m.teamLeads || []).map((tl) => (
                                <span
                                  key={tl.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800"
                                >
                                  <Users className="w-3 h-3 text-emerald-600" />
                                  <span>{tl.name} ({tl.zone})</span>
                                </span>
                              ))}
                              {(!m.teamLeads || m.teamLeads.length === 0) && (
                                <span className="text-xs text-slate-400 italic">Direct Zonal Lead</span>
                              )}
                            </div>
                          </div>

                          {/* Assigned Branches */}
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                              Assigned Regional Branches ({m.branches?.length || 0})
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(m.branches || []).map((br) => (
                                <span
                                  key={br}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px] font-semibold border border-slate-200"
                                >
                                  {br}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Leadership Metrics Bar */}
                          <div className="pt-3 border-t border-teal-100 grid grid-cols-3 gap-2 text-center bg-white/70 p-2.5 rounded-xl border border-teal-100">
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Supervised Faculty</div>
                              <div className="text-base font-black text-teal-800">{m.trainersCount} Faculty</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Active Batches</div>
                              <div className="text-base font-black text-blue-700">{m.batchesCount} Batches</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Students Handled</div>
                              <div className="text-base font-black text-slate-900">{m.studentsCount} Students</div>
                            </div>
                          </div>
                        </div>
                      ))
                      )}
                    </div>
                  </div>

                  {/* Section 2: TRAINER TEAM LEADS (TLs) DETAILS */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
                          <Users className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900">
                            Trainer Team Leads (TLs) ({trainerTLsList.length})
                          </h3>
                          <p className="text-xs text-slate-500">
                            Pod leaders overseeing daily faculty squad operations, live classroom monitoring, and doubt resolutions.
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Level 3 Leadership Tier
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-1">
                      {trainerTLsList.length === 0 ? (
                        <div className="col-span-full p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                          <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm font-bold text-slate-700">No Training Team Leads Created Yet</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                            User accounts created with the &quot;TRAINING TEAM LEAD&quot; or &quot;Training Team Lead&quot; role in Admin Management will automatically populate here.
                          </p>
                        </div>
                      ) : (
                        trainerTLsList.map((tl) => (
                        <div
                          key={tl.id}
                          className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-white via-emerald-50/20 to-emerald-50/30 p-5 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                        >
                          <div className="space-y-3.5">
                            {/* TL Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-11 h-11 rounded-2xl text-white font-black text-base flex items-center justify-center shadow-md shrink-0"
                                  style={{ backgroundColor: tl.color || '#16a34a' }}
                                >
                                  {tl.badge || 'TL'}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="text-base font-black text-slate-900 tracking-tight">{tl.name}</h4>
                                    <span className="text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                                      {tl.badge}
                                    </span>
                                  </div>
                                  <div className="text-[11px] font-bold text-emerald-800">
                                    {tl.zoneLabel} ({tl.zone})
                                  </div>
                                </div>
                              </div>

                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700 shrink-0">
                                <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                                <span>{tl.status}</span>
                              </span>
                            </div>

                            {/* Reporting Manager — Head of Trainer can reassign */}
                            {isHeadRole ? (
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-teal-50 border border-teal-200 w-full">
                                <Briefcase className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                                <span className="text-[10px] font-bold text-teal-900 shrink-0">Reports to:</span>
                                <select
                                  value={tl.managerId || ''}
                                  disabled={savingAssignment === `tl_${tl.id}`}
                                  onChange={(e) => handleAssignTlManager(tl, e.target.value)}
                                  className="flex-1 min-w-0 text-xs font-bold text-teal-900 bg-white border border-teal-200 rounded-lg px-1.5 py-1 outline-none cursor-pointer disabled:opacity-50"
                                >
                                  <option value="">— Unassigned —</option>
                                  {trainerManagersList.map((m) => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 border border-teal-200 text-xs font-bold text-teal-900 w-full">
                                <Briefcase className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                                <span>Reports to: <strong>{tl.managerName}</strong></span>
                              </div>
                            )}

                            {/* Contact Info */}
                            <div className="space-y-1.5 text-xs bg-white/80 p-3 rounded-xl border border-emerald-100">
                              <div className="flex items-center gap-2 text-slate-600 truncate">
                                <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <a href={`mailto:${tl.email}`} className="hover:text-emerald-800 hover:underline truncate font-medium">
                                  {tl.email}
                                </a>
                              </div>
                              <div className="flex items-center gap-2 text-slate-600">
                                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <a href={`tel:${tl.phone}`} className="hover:text-emerald-800 font-medium">
                                  {tl.phone}
                                </a>
                                {tl.phone && tl.phone !== '—' && (
                                  <button
                                    type="button"
                                    onClick={() => redirectToWhatsAppWeb(tl.phone, `Hello ${tl.name}, this is Head of Training contacting you regarding your faculty squad.`)}
                                    className="ml-auto text-[10px] font-extrabold text-emerald-700 hover:underline px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200"
                                  >
                                    WhatsApp
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Supervised Faculty Squad */}
                            <div>
                              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                                <span>Faculty Squad</span>
                                <span className="text-emerald-700 font-black">{tl.trainersCount} Trainers</span>
                              </div>
                              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                                {(tl.trainers || []).map((tr) => (
                                  <span
                                    key={tr.id || tr.trainerId || tr.name}
                                    className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-medium text-slate-700"
                                  >
                                    {tr.name || tr.trainerName}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Assigned Pod Branches */}
                            <div>
                              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Pod Branches
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {(tl.branches || []).map((br) => (
                                  <span
                                    key={br}
                                    className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium"
                                  >
                                    {br}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* TL Metrics Footer */}
                          <div className="pt-3 border-t border-emerald-100 grid grid-cols-2 gap-2 text-center bg-white/70 p-2.5 rounded-xl border border-emerald-100">
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Squad Batches</div>
                              <div className="text-sm font-black text-blue-700">{tl.batchesCount} Batches</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Students Handled</div>
                              <div className="text-sm font-black text-slate-900">{tl.studentsCount} Students</div>
                            </div>
                          </div>
                        </div>
                      )))}
                    </div>
                  </div>

                  {/* Section 3: COMPLETE LEADERSHIP MASTER MATRIX TABLE */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">
                          Complete Training Leadership Matrix
                        </h3>
                        <p className="text-xs text-slate-500">
                          Consolidated roster showing reporting line, zone, branch footprint, and direct faculty count for each manager and team lead.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#00897b]">
                        Showing {filteredLeadershipList.length} of {trainerManagersList.length + trainerTLsList.length} Leaders
                      </span>
                    </div>

                    {/* Column Filters for Leadership Matrix */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Role Tier</label>
                          <select
                            value={matrixRoleFilter}
                            onChange={(e) => setMatrixRoleFilter(e.target.value)}
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                          >
                            <option value="all">All Role Tiers</option>
                            <option value="manager">Trainer Managers ({trainerManagersList.length})</option>
                            <option value="tl">Trainer Team Leads ({trainerTLsList.length})</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Assigned Zone</label>
                          <select
                            value={matrixZoneFilter}
                            onChange={(e) => setMatrixZoneFilter(e.target.value)}
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                          >
                            <option value="all">All Zones</option>
                            {matrixUniqueZones.map((z) => (
                              <option key={z} value={z}>{z}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Status</label>
                          <select
                            value={matrixStatusFilter}
                            onChange={(e) => setMatrixStatusFilter(e.target.value)}
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                          >
                            <option value="all">All Statuses</option>
                            <option value="active">Active · On Duty</option>
                            <option value="inactive">Inactive / On Leave</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Search Leader</label>
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={matrixSearch}
                              onChange={(e) => setMatrixSearch(e.target.value)}
                              placeholder="Name, email, phone, zone..."
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500"
                            />
                          </div>
                        </div>
                      </div>

                      {(matrixRoleFilter !== 'all' || matrixZoneFilter !== 'all' || matrixStatusFilter !== 'all' || matrixSearch) && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setMatrixRoleFilter('all');
                              setMatrixZoneFilter('all');
                              setMatrixStatusFilter('all');
                              setMatrixSearch('');
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
                          >
                            ✕ Reset Filters
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-3">Role Tier</th>
                            <th className="py-3 px-3">Leader Name</th>
                            <th className="py-3 px-3">Reporting To</th>
                            <th className="py-3 px-3">Assigned Zone</th>
                            <th className="py-3 px-3">Branch Footprint</th>
                            <th className="py-3 px-3">Supervised Faculty</th>
                            <th className="py-3 px-3">Batches</th>
                            <th className="py-3 px-3">Email Address</th>
                            <th className="py-3 px-3">Contact Phone</th>
                            <th className="py-3 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {filteredLeadershipList.length === 0 && (
                            <tr>
                              <td colSpan={10} className="py-8 text-center text-slate-400">
                                No training leaders match the selected filters.
                              </td>
                            </tr>
                          )}
                          {filteredLeadershipList.map((ldr) => (
                            <tr key={`${ldr.roleTier}-${ldr.id}`} className={ldr.roleTier === 'manager' ? 'hover:bg-teal-50/30' : 'hover:bg-emerald-50/30'}>
                              <td className="py-3 px-3">
                                {ldr.roleTier === 'manager' ? (
                                  <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 font-black text-[10px] uppercase border border-teal-200">
                                    Trainer Manager
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-black text-[10px] uppercase border border-emerald-200">
                                    Trainer Team Lead
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 font-black text-slate-900">{ldr.name}</td>
                              <td className="py-3 px-3 font-semibold text-blue-700">
                                {ldr.roleTier === 'manager'
                                  ? (trainerCredentials?.head?.[0]?.name ? `Head of Training (${trainerCredentials.head[0].name})` : 'Head of Training')
                                  : (ldr.managerName ? `${ldr.managerName} (Manager)` : 'Training Manager')}
                              </td>
                              <td className="py-3 px-3 font-medium text-teal-800">{ldr.zone} ({ldr.zoneLabel})</td>
                              <td className="py-3 px-3 text-[11px] max-w-[180px] truncate">{ldr.branches?.join(', ') || (ldr.roleTier === 'manager' ? 'All Zone Branches' : 'Pod Branches')}</td>
                              <td className="py-3 px-3 font-black text-slate-900">{ldr.trainersCount} Trainers</td>
                              <td className="py-3 px-3 font-bold text-blue-700">{ldr.batchesCount} Batches</td>
                              <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{ldr.email}</td>
                              <td className="py-3 px-3 font-mono text-[11px]">{ldr.phone}</td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                                  {ldr.status}
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
            </div>
          )}

          {/* ================= SECTION 1: BRANCH-WISE STUDENT DETAILS ================= */}
          {activeTab === 'branches' && (
            <div className="space-y-6">
              {/* Branch Filter Pills */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Select Branch ({scopedBranchNames.length}):
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search student by name, ID or phone..."
                      className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-1.5 outline-none focus:border-[#00897b] w-64"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedBranch('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedBranch === 'all'
                        ? 'bg-[#00897b] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    All {roleType === 'head' ? 'Academy Branches' : 'Your Branches'} ({scopedStudents.length})
                  </button>
                  {scopedBranchNames.map((bName) => {
                    const count = scopedStudents.filter(
                      (s) => String(s.branch || s.location || '').toLowerCase() === bName.toLowerCase()
                    ).length;
                    return (
                      <button
                        key={bName}
                        type="button"
                        onClick={() => setSelectedBranch(bName)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedBranch === bName
                            ? 'bg-[#00897b] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {bName} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5 Milestone Cards for Selected Branch */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Students</span>
                    <Users className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{selectedBranchMilestones.total}</div>
                  <div className="text-[10.5px] text-slate-400 font-medium mt-0.5 truncate">
                    {selectedBranch === 'all' ? (roleType === 'head' ? 'All 12 Branches' : `${scopedBranchNames.length} Branches`) : selectedBranch}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-blue-200/80 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Active Students</span>
                    <UserCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-blue-900">{selectedBranchMilestones.active}</div>
                  <div className="text-[10.5px] text-blue-600 font-medium mt-0.5">In active training</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Syllabus Completed</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-900">{selectedBranchMilestones.syllabusDone}</div>
                  <div className="text-[10.5px] text-emerald-600 font-medium mt-0.5">100% curriculum done</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-purple-200/80 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Certified</span>
                    <Award className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-purple-900">{selectedBranchMilestones.certified}</div>
                  <div className="text-[10.5px] text-purple-600 font-medium mt-0.5">AAPC certified</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-teal-200/80 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">Placed</span>
                    <Briefcase className="w-4 h-4 text-teal-700" />
                  </div>
                  <div className="text-2xl font-black text-teal-950">{selectedBranchMilestones.placed}</div>
                  <div className="text-[10.5px] text-teal-700 font-medium mt-0.5">Placed in career</div>
                </div>
              </div>

              {/* Detailed Student Table */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Students in {selectedBranch === 'all' ? (roleType === 'head' ? 'All Academy Branches' : 'Your Assigned Branches') : selectedBranch} ({filteredStudents.length})
                    </h3>
                    <p className="text-xs text-slate-400">Complete student enrollment profile, batch mapping, and attendance status.</p>
                  </div>
                </div>

                {/* Column Filters Bar for Branch-Wise Students Table */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                    <span className="font-bold text-slate-600 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-teal-600" /> Filter Table Columns:
                    </span>
                    <span className="font-bold text-slate-400 text-[11px]">
                      Showing {filteredStudents.length} of {scopedStudents.length} students
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {/* Branch Filter */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Branch</label>
                      <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Branches ({scopedStudents.length})</option>
                        {scopedBranchNames.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    {/* Course Filter */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Course</label>
                      <select
                        value={studentCourseFilter}
                        onChange={(e) => setStudentCourseFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Courses ({scopedStudents.length})</option>
                        {studentUniqueCourses.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Batch Filter */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Batch</label>
                      <select
                        value={selectedBatch}
                        onChange={(e) => setSelectedBatch(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Batches</option>
                        {studentUniqueBatches.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    {/* Faculty Filter */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Faculty</label>
                      <select
                        value={selectedTrainer}
                        onChange={(e) => setSelectedTrainer(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Faculty</option>
                        {studentUniqueTrainers.map((tr) => (
                          <option key={tr} value={tr}>{tr}</option>
                        ))}
                      </select>
                    </div>

                    {/* Attendance Filter */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Attendance</label>
                      <select
                        value={studentAttendanceFilter}
                        onChange={(e) => setStudentAttendanceFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Attendance</option>
                        <option value="good">Good (≥75%)</option>
                        <option value="risk">At Risk (&lt;75%)</option>
                      </select>
                    </div>

                    {/* Placement Filter */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Placement</label>
                      <select
                        value={studentPlacementFilter}
                        onChange={(e) => setStudentPlacementFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Placement</option>
                        <option value="placed">Placed</option>
                        <option value="in_course">In Course</option>
                      </select>
                    </div>
                  </div>

                  {/* Secondary Filter Row: Search, Syllabus, Certification & Reset */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search student ID, name, phone, course, batch, faculty..."
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500"
                      />
                    </div>

                    <select
                      value={studentSyllabusFilter}
                      onChange={(e) => setStudentSyllabusFilter(e.target.value)}
                      className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                    >
                      <option value="all">Syllabus: All</option>
                      <option value="completed">100% Completed</option>
                      <option value="pending">In Progress</option>
                    </select>

                    <select
                      value={studentCertifiedFilter}
                      onChange={(e) => setStudentCertifiedFilter(e.target.value)}
                      className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                    >
                      <option value="all">Certified: All</option>
                      <option value="certified">Certified</option>
                      <option value="uncertified">Not Certified</option>
                    </select>

                    {(selectedBranch !== 'all' || selectedBatch !== 'all' || selectedTrainer !== 'all' || studentCourseFilter !== 'all' || studentAttendanceFilter !== 'all' || studentSyllabusFilter !== 'all' || studentCertifiedFilter !== 'all' || studentPlacementFilter !== 'all' || searchQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBranch('all');
                          setSelectedBatch('all');
                          setSelectedTrainer('all');
                          setStudentCourseFilter('all');
                          setStudentAttendanceFilter('all');
                          setStudentSyllabusFilter('all');
                          setStudentCertifiedFilter('all');
                          setStudentPlacementFilter('all');
                          setSearchQuery('');
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
                      >
                        ✕ Reset Filters
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Student ID</th>
                        <th className="py-3 px-3">Student Name</th>
                        <th className="py-3 px-3">Contact</th>
                        <th className="py-3 px-3">Branch</th>
                        <th className="py-3 px-3">Course</th>
                        <th className="py-3 px-3">Batch</th>
                        <th className="py-3 px-3">Assigned Faculty</th>
                        <th className="py-3 px-3">Attendance</th>
                        <th className="py-3 px-3">Syllabus</th>
                        <th className="py-3 px-3">Certified</th>
                        <th className="py-3 px-3">Placement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredStudents.map((st) => {
                        const att = Math.round(Number(st.attendancePercentage ?? st.attendance ?? 85));
                        const isRisk = att < 75;
                        return (
                          <tr key={st.studentId || st._id} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-mono font-bold text-[#00897b]">{st.studentId || 'ID-N/A'}</td>
                            <td className="py-3 px-3 font-extrabold text-slate-900">{st.name}</td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{st.phone || 'N/A'}</td>
                            <td className="py-3 px-3">{st.branch || st.location || st.leadBranch || '—'}</td>
                            <td className="py-3 px-3 font-semibold text-teal-700">{st.course || '—'}</td>
                            <td className="py-3 px-3">{st.batch || st.batchName || 'General'}</td>
                            <td className="py-3 px-3 font-medium text-slate-900">{st.trainer || st.faculty || 'Faculty'}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                  isRisk ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {att}% {isRisk ? '(Risk)' : ''}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              {isStudentSyllabusCompleted(st) ? (
                                <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  ✓ Completed
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-700">
                                  {st.syllabusPercentage || 45}%
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {isStudentCertified(st) ? (
                                <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-purple-100 text-purple-800 border border-purple-200">
                                  ★ Certified
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-500">
                                  Non-certified
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {isStudentPlaced(st) ? (
                                <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-teal-100 text-teal-800 border border-teal-200">
                                  Placed
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                                  {st.placementStatus || 'In course'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredStudents.length === 0 && (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-xs text-slate-400">
                            No students match the selected filter criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= SECTION 2: BATCH-WISE DETAILS ================= */}
          {activeTab === 'batches' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {roleType === 'head' ? 'All Academy Batches' : `${currentLeader.name}'s Assigned Batches`} ({filteredBatchList.length})
                    </h3>
                    <p className="text-xs text-slate-400">Assigned trainers, enrolled students count, and batch performance metrics.</p>
                  </div>
                </div>

                {/* Filter Bar for Batches */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                    <span className="font-bold text-slate-600 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-teal-600" /> Filter Batches:
                    </span>
                    <span className="font-bold text-slate-400 text-[11px]">
                      Showing {filteredBatchList.length} of {batchWiseReport.length} batches
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Branch</label>
                      <select
                        value={batchBranchFilter}
                        onChange={(e) => setBatchBranchFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Branches ({batchWiseReport.length})</option>
                        {batchUniqueBranches.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Course</label>
                      <select
                        value={batchCourseFilter}
                        onChange={(e) => setBatchCourseFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Courses</option>
                        {batchUniqueCourses.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Faculty</label>
                      <select
                        value={batchFacultyFilter}
                        onChange={(e) => setBatchFacultyFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Faculty</option>
                        {batchUniqueFaculty.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Search</label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={batchSearch}
                          onChange={(e) => setBatchSearch(e.target.value)}
                          placeholder="Search batch, course, faculty..."
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>
                  </div>

                  {(batchBranchFilter !== 'all' || batchCourseFilter !== 'all' || batchFacultyFilter !== 'all' || batchSearch) && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setBatchBranchFilter('all');
                          setBatchCourseFilter('all');
                          setBatchFacultyFilter('all');
                          setBatchSearch('');
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
                      >
                        ✕ Reset Filters
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBatchList.map((b) => (
                    <div key={b.batchId || b.name} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-slate-900">{b.batchName}</span>
                        <span className="px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          {b.course || '—'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        <div><strong>Assigned Faculty:</strong> {b.trainer || b.faculty || b.trainerName || 'Unassigned'}</div>
                        <div><strong>Branch:</strong> {b.branch || '—'}</div>
                        <div><strong>Schedule / Timing:</strong> {b.timing || b.batchTiming || 'Flexible / As Scheduled'}</div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white p-2 rounded-xl border border-slate-100">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Enrolled</div>
                          <div className="text-base font-black text-slate-900">{b.enrolledCount}</div>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-100">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Avg Att.</div>
                          <div className="text-base font-black text-emerald-600">{b.avgAttendance}%</div>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-100">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Weak</div>
                          <div className="text-base font-black text-rose-600">{b.weakCount}</div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('session_room')}
                          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#00897b] to-[#00796b] text-white text-xs font-bold hover:shadow-md hover:brightness-105 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Take / Run Live Session</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {batchWiseReport.length === 0 && (
                    <div className="col-span-full py-8 text-center text-xs text-slate-400">
                      No active batches found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= SECTION 3: WEAK STUDENTS REPORT ================= */}
          {activeTab === 'weak_students' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-500" />
                      <span>Weak Students Report ({filteredWeakStudents.length} of {allWeakStudents.length})</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Students in your batches requiring additional attention due to attendance &lt; 75% or test scores below target.
                    </p>
                  </div>
                </div>

                {/* Column Filters for Weak Students */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Branch</label>
                      <select
                        value={weakBranchFilter}
                        onChange={(e) => setWeakBranchFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Branches</option>
                        {weakUniqueBranches.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Batch</label>
                      <select
                        value={weakBatchFilter}
                        onChange={(e) => setWeakBatchFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Batches</option>
                        {weakUniqueBatches.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Faculty</label>
                      <select
                        value={weakFacultyFilter}
                        onChange={(e) => setWeakFacultyFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Faculty</option>
                        {weakUniqueFaculty.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Reason</label>
                      <select
                        value={weakReasonFilter}
                        onChange={(e) => setWeakReasonFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Reasons</option>
                        <option value="attendance">Low Attendance (&lt;75%)</option>
                        <option value="score">Low Score / Exam Risk</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Search Student</label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={weakSearch}
                          onChange={(e) => setWeakSearch(e.target.value)}
                          placeholder="Name, ID, branch, batch..."
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>
                  </div>

                  {(weakBranchFilter !== 'all' || weakBatchFilter !== 'all' || weakFacultyFilter !== 'all' || weakReasonFilter !== 'all' || weakSearch) && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setWeakBranchFilter('all');
                          setWeakBatchFilter('all');
                          setWeakFacultyFilter('all');
                          setWeakReasonFilter('all');
                          setWeakSearch('');
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
                      >
                        ✕ Reset Filters
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Student Name</th>
                        <th className="py-3 px-3">Student ID</th>
                        <th className="py-3 px-3">Branch</th>
                        <th className="py-3 px-3">Batch</th>
                        <th className="py-3 px-3">Assigned Faculty</th>
                        <th className="py-3 px-3">Attendance</th>
                        <th className="py-3 px-3">Performance</th>
                        <th className="py-3 px-3">Attention Reason</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredWeakStudents.map((st) => (
                        <tr key={st.studentId || st._id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-extrabold text-slate-900">{st.name}</td>
                          <td className="py-3 px-3 font-mono text-slate-500">{st.studentId || 'ID-N/A'}</td>
                          <td className="py-3 px-3">{st.branch || st.location || st.leadBranch || '—'}</td>
                          <td className="py-3 px-3 font-semibold text-teal-700">{st.batch || 'Batch'}</td>
                          <td className="py-3 px-3 font-medium text-slate-900">{st.trainer || st.faculty || 'Faculty'}</td>
                          <td className="py-3 px-3 font-black text-rose-600">{st.attPct}%</td>
                          <td className="py-3 px-3 font-medium text-slate-800">{st.scorePct}% Score</td>
                          <td className="py-3 px-3 text-rose-600 font-bold text-[11px]">{st.attentionReason}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => redirectToWhatsAppWeb(st.phone)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 cursor-pointer"
                            >
                              WhatsApp Alert
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredWeakStudents.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                            {allWeakStudents.length === 0
                              ? 'No students flagged as weak or requiring special attention!'
                              : 'No weak students match the selected filters.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= SECTION 4: SYLLABUS COMPLETION REPORT ================= */}
          {activeTab === 'syllabus' && (
            <div className="space-y-6">
              {/* Sub-tab Switcher: Batch Progress vs Master Course Syllabus */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <button
                  type="button"
                  onClick={() => setSyllabusSubTab('progress')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    syllabusSubTab === 'progress'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  📊 Batch Completion Breakdown
                </button>
                <button
                  type="button"
                  onClick={() => setSyllabusSubTab('master')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    syllabusSubTab === 'master'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {canManageSyllabus ? '📖 Add / Manage Course Syllabus' : '📖 All Courses Master Syllabus (View)'}
                </button>
              </div>

              {syllabusSubTab === 'master' ? (
                <CourseSyllabusBoard
                  currentUser={currentUser}
                  roleType={roleType}
                  readOnly={!canManageSyllabus}
                  courseOptions={Array.from(new Set(batches.map((b) => b.course).filter(Boolean)))}
                />
              ) : (
                <>
                  {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Syllabus Completed</div>
                  <div className="text-3xl font-black text-emerald-600 mt-1">{syllabusReport.completedCount}</div>
                  <div className="text-xs text-emerald-700 font-medium mt-1">100% Modules Finished</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Pending Portions</div>
                  <div className="text-3xl font-black text-amber-600 mt-1">{syllabusReport.pendingCount}</div>
                  <div className="text-xs text-amber-700 font-medium mt-1">Modules Underway</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Overall Completion Rate</div>
                  <div className="text-3xl font-black text-[#00897b] mt-1">{syllabusReport.completionRate}%</div>
                  <div className="text-xs text-teal-700 font-medium mt-1">Across Your Students</div>
                </div>
              </div>

              {/* Batch-Wise Syllabus Progress Table */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Batch-Wise Syllabus Progress Breakdown ({filteredSyllabusBatches.length} of {batchWiseReport.length})
                  </h3>
                </div>

                {/* Column Filters for Syllabus Progress */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Branch</label>
                      <select
                        value={syllabusBranchFilter}
                        onChange={(e) => setSyllabusBranchFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Branches</option>
                        {syllabusUniqueBranches.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Course</label>
                      <select
                        value={syllabusCourseFilter}
                        onChange={(e) => setSyllabusCourseFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Courses</option>
                        {syllabusUniqueCourses.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Faculty</label>
                      <select
                        value={syllabusFacultyFilter}
                        onChange={(e) => setSyllabusFacultyFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Faculty</option>
                        {syllabusUniqueFaculty.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Completion</label>
                      <select
                        value={syllabusProgressFilter}
                        onChange={(e) => setSyllabusProgressFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Progress</option>
                        <option value="completed">100% Completed</option>
                        <option value="in_progress">In Progress (1-99%)</option>
                        <option value="zero">Not Started (0%)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Search</label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={syllabusSearch}
                          onChange={(e) => setSyllabusSearch(e.target.value)}
                          placeholder="Batch, course, branch..."
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>
                  </div>

                  {(syllabusBranchFilter !== 'all' || syllabusCourseFilter !== 'all' || syllabusFacultyFilter !== 'all' || syllabusProgressFilter !== 'all' || syllabusSearch) && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSyllabusBranchFilter('all');
                          setSyllabusCourseFilter('all');
                          setSyllabusFacultyFilter('all');
                          setSyllabusProgressFilter('all');
                          setSyllabusSearch('');
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
                      >
                        ✕ Reset Filters
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Batch</th>
                        <th className="py-3 px-3">Course</th>
                        <th className="py-3 px-3">Branch</th>
                        <th className="py-3 px-3">Faculty</th>
                        <th className="py-3 px-3">Total Students</th>
                        <th className="py-3 px-3">Completed Students</th>
                        <th className="py-3 px-3">Pending Students</th>
                        <th className="py-3 px-3">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredSyllabusBatches.map((b) => {
                        const pct = b.enrolledCount > 0 ? Math.round((b.completedSyllabusCount / b.enrolledCount) * 100) : 0;
                        return (
                          <tr key={b.batchId || b.name} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-extrabold text-slate-900">{b.batchName}</td>
                            <td className="py-3 px-3 font-semibold text-teal-700">{b.course || '—'}</td>
                            <td className="py-3 px-3">{b.branch || '—'}</td>
                            <td className="py-3 px-3 font-medium text-slate-900">{b.trainer || b.faculty || 'Faculty'}</td>
                            <td className="py-3 px-3 font-bold">{b.enrolledCount}</td>
                            <td className="py-3 px-3 font-bold text-emerald-600">{b.completedSyllabusCount}</td>
                            <td className="py-3 px-3 font-bold text-amber-600">{b.pendingSyllabusCount}</td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-[#00897b] h-2 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="font-bold text-[11px] text-slate-700">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredSyllabusBatches.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                            No batches match the selected syllabus filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ================= SECTION 5: TRAINER AND BATCH MAPPING ================= */}
          {activeTab === 'mapping' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Trainer and Batch Mapping Matrix ({filteredBatchMapping.length} of {trainerBatchMapping.length})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Shows which trainer is assigned to which batch, reporting Team Lead, and managing Trainer Manager.
                      {isHeadRole ? ' As Department Head of Training, change the Reporting Team Lead dropdown to reassign a trainer — their Manager updates automatically.' : ''}
                    </p>
                  </div>
                </div>

                {/* Column Filters for Trainer & Batch Mapping */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Branch / Zone</label>
                      <select
                        value={mappingBranchFilter}
                        onChange={(e) => setMappingBranchFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Branches</option>
                        {mappingUniqueBranches.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Course</label>
                      <select
                        value={mappingCourseFilter}
                        onChange={(e) => setMappingCourseFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Courses</option>
                        {mappingUniqueCourses.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Batch</label>
                      <select
                        value={mappingBatchFilter}
                        onChange={(e) => setMappingBatchFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Batches</option>
                        {mappingUniqueBatches.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Team Lead (TL)</label>
                      <select
                        value={mappingTLFilter}
                        onChange={(e) => setMappingTLFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Team Leads</option>
                        {trainerTLsList.map((tl) => (
                          <option key={tl.id} value={tl.name}>{tl.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Trainer Manager</label>
                      <select
                        value={mappingManagerFilter}
                        onChange={(e) => setMappingManagerFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Managers</option>
                        {trainerManagersList.map((m) => (
                          <option key={m.id} value={m.name}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Search</label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={mappingSearch}
                          onChange={(e) => setMappingSearch(e.target.value)}
                          placeholder="Trainer, branch..."
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>
                  </div>

                  {(mappingBranchFilter !== 'all' || mappingCourseFilter !== 'all' || mappingBatchFilter !== 'all' || mappingTLFilter !== 'all' || mappingManagerFilter !== 'all' || mappingSearch) && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMappingBranchFilter('all');
                          setMappingCourseFilter('all');
                          setMappingBatchFilter('all');
                          setMappingTLFilter('all');
                          setMappingManagerFilter('all');
                          setMappingSearch('');
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
                      >
                        ✕ Reset Filters
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Trainer Name</th>
                        <th className="py-3 px-3">Zone / Branch</th>
                        <th className="py-3 px-3">Assigned Course</th>
                        <th className="py-3 px-3">Assigned Batch(es)</th>
                        <th className="py-3 px-3">Students Handled</th>
                        <th className="py-3 px-3">Reporting TL</th>
                        <th className="py-3 px-3">Managing Manager</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredBatchMapping.map((tr) => (
                        <tr key={tr.trainerId || tr.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-extrabold text-slate-900">{tr.trainerName}</td>
                          <td className="py-3 px-3">{tr.zone ? `${tr.zone} · ` : ''}{tr.branch || '—'}</td>
                          <td className="py-3 px-3 font-semibold text-teal-700">{tr.course}</td>
                          <td className="py-3 px-3">
                            {tr.batches.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {tr.batches.map((b) => (
                                  <span key={b.batchId || b.name} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                                    {b.name || b.batchId}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No batches assigned</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-black text-slate-900">{tr.studentsCount} Students</td>
                          <td className="py-3 px-3">
                            {isHeadRole ? (
                              <select
                                value={tr.teamLeadId || ''}
                                disabled={savingAssignment === `trainer_${tr.trainerId || tr.id}`}
                                onChange={(e) => handleAssignTrainerTl(tr, e.target.value)}
                                className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-1 outline-none cursor-pointer disabled:opacity-50"
                              >
                                <option value="">— Unassigned —</option>
                                {trainerTLsList.map((tl) => (
                                  <option key={tl.id} value={tl.id}>{tl.name}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {tr.teamLeadName || '—'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              {tr.managerName || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredBatchMapping.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                            No trainers or batch mappings match the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= SECTION: SHIFT & AVAILABILITY (HEAD, MANAGER, TL) ================= */}
          {activeTab === 'shift_availability' && (
            <div className="space-y-6">
              {/* My Shift & Availability Hero Card */}
              <div className="bg-[#0f212d] text-white rounded-3xl p-6 sm:p-7 border border-[#1b3446] shadow-sm space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {currentUserName || 'Staff Member'}
                      </h2>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        isHeadRole
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : isManagerRole
                            ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {roleType === 'head' ? 'Department Head of Training' : roleType === 'manager' ? 'Trainer Manager' : 'Training Team Lead'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium font-mono">
                      {[
                        currentUser?.email,
                        currentUser?.branch || currentUser?.zone || 'All Branches (HQ)',
                        `Shift: ${myRosterRecord?.shift || '10:00 AM – 7:00 PM (General Shift)'}`
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`px-3 py-1.5 rounded-xl font-bold border ${
                      myRosterRecord?.status === 'On Leave'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {myRosterRecord?.status === 'On Leave' ? '🏖️ On Leave' : '💼 Available · On Duty'}
                    </span>
                    {isHeadRole ? (
                      <span className="px-3 py-1.5 rounded-xl font-bold border bg-amber-500/20 text-amber-300 border-amber-500/40 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Head Command · All Rosters Updated by Head Only</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl font-bold border bg-slate-800 text-slate-300 border-slate-600 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Read-Only · All Rosters Updated by Department Head of Training Only</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 7-Day Personal Schedule Calendar */}
                <div className="bg-[#152a36] rounded-2xl p-4 sm:p-5 border border-[#213f52] space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                        <span>📅</span>
                        <span>My Assigned Shift Roster &middot; Week of {getWeekRangeString()}</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {isHeadRole
                          ? 'Your personal executive shift. As Department Head of Training, you can allocate and update all rosters below.'
                          : 'Weekly schedule set by Department Head of Training. All training rosters are updated exclusively by Department Head of Training.'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-1">
                    {myWeeklySchedule.map((shift, idx) => {
                      const isOff = shift.type === 'off' || shift.timing === 'Week Off' || shift.timing === 'On Leave' || shift.isOff;
                      return (
                        <div
                          key={idx}
                          className={`rounded-xl p-2 sm:p-2.5 text-center border transition-all flex flex-col justify-between min-h-[64px] sm:min-h-[72px] ${
                            shift.isToday
                              ? 'border-2 border-teal-400 bg-teal-950/80 text-teal-200 shadow-md shadow-teal-900/30 ring-1 ring-teal-400/50'
                              : isOff
                                ? 'bg-rose-950/40 text-rose-300 border-rose-900/50 font-bold'
                                : 'bg-[#0e1d26] border-slate-700/60 text-slate-300'
                          }`}
                        >
                          <div className="text-[10px] sm:text-[11px] font-extrabold tracking-wider font-mono">
                            {shift.day || shift.dayName}
                            {shift.isToday && (
                              <span className="block text-[8px] uppercase tracking-widest text-teal-300 font-black">
                                Today
                              </span>
                            )}
                          </div>
                          <div className={`text-xs sm:text-sm font-black mt-1 ${
                            shift.isToday
                              ? 'text-teal-200'
                              : isOff
                                ? 'text-rose-400'
                                : 'text-white'
                          }`}>
                            {shift.timing || (isOff ? 'Week Off' : '10–7')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Training Roster Board */}
              <TeamRosterBoard
                departmentCode="ACAD"
                managerLabel="Department Head of Training"
                readOnly={!isHeadRole}
                readOnlyNotice="All training shift rosters and availability are updated exclusively by the Department Head of Training."
                editorRole={roleType}
                currentUser={currentUser}
                showRoleFilter={true}
                onRosterChange={loadDashboardData}
              />
            </div>
          )}

          {/* ================= SECTION 6: TRAINER ATTENDANCE DETAILS ================= */}
          {activeTab === 'trainer_attendance' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Trainer Attendance &amp; Shift Records ({filteredAttendanceReport.length} of {trainerAttendanceReport.length})
                    </h3>
                    <p className="text-xs text-slate-400">Present days, absent days, and monthly attendance summaries for your faculty.</p>
                  </div>
                </div>

                {/* Column Filters for Trainer Attendance */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Branch</label>
                      <select
                        value={attBranchFilter}
                        onChange={(e) => setAttBranchFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Branches</option>
                        {attUniqueBranches.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Shift</label>
                      <select
                        value={attShiftFilter}
                        onChange={(e) => setAttShiftFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Shifts</option>
                        {attUniqueShifts.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Attendance %</label>
                      <select
                        value={attPctFilter}
                        onChange={(e) => setAttPctFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Attendance %</option>
                        <option value="high">High (≥ 90%)</option>
                        <option value="moderate">Moderate (75% – 89%)</option>
                        <option value="low">Attention Needed (&lt; 75%)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Status</label>
                      <select
                        value={attStatusFilter}
                        onChange={(e) => setAttStatusFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Statuses</option>
                        <option value="active">Active Faculty</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Search</label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={attSearch}
                          onChange={(e) => setAttSearch(e.target.value)}
                          placeholder="Trainer, branch, shift..."
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>
                  </div>

                  {(attBranchFilter !== 'all' || attShiftFilter !== 'all' || attPctFilter !== 'all' || attStatusFilter !== 'all' || attSearch) && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAttBranchFilter('all');
                          setAttShiftFilter('all');
                          setAttPctFilter('all');
                          setAttStatusFilter('all');
                          setAttSearch('');
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
                      >
                        ✕ Reset Filters
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Trainer Name</th>
                        <th className="py-3 px-3">Branch</th>
                        <th className="py-3 px-3">Shift Timing</th>
                        <th className="py-3 px-3">Present Days</th>
                        <th className="py-3 px-3">Absent Days</th>
                        <th className="py-3 px-3">Attendance %</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredAttendanceReport.map((tr) => (
                        <tr key={tr.trainerId || tr.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-extrabold text-slate-900">{tr.trainerName}</td>
                          <td className="py-3 px-3">{tr.branch}</td>
                          <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{tr.shift}</td>
                          <td className="py-3 px-3 font-bold text-emerald-600">{tr.presentDays} Days ({tr.sessionsLogged} sessions)</td>
                          <td className="py-3 px-3 font-bold text-rose-600">{tr.absentDays} Days</td>
                          <td className="py-3 px-3 font-black text-slate-900">{tr.attendancePct}%</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${tr.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                              {tr.isActive ? 'Active Faculty' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredAttendanceReport.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                            No trainer attendance records match the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= SECTION 7: DEMO DETAILS & TAKE DEMOS ================= */}
          {activeTab === 'demos' && (
            <div className="space-y-6">
              {/* Demo KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[10.5px] font-bold text-slate-400 uppercase">Total Demos</div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">{scopedDemos.length}</div>
                </div>
                <div 
                  onClick={() => setDemoFilterTab('unassigned')}
                  className={`p-4 rounded-2xl border shadow-2xs transition-all cursor-pointer flex flex-col justify-between ${
                    demoFilterTab === 'unassigned'
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300'
                      : 'bg-white border-slate-200/90 hover:border-amber-300'
                  } border-l-4 border-l-amber-500`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[10.5px] font-bold text-amber-800 uppercase flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Awaiting Faculty</span>
                    </div>
                    {unassignedDemos.length > 0 && (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 animate-pulse">ACTION</span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-amber-700 mt-0.5">{unassignedDemos.length}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[10.5px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    <span>My Assigned Demos</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-600 mt-0.5">{myAssignedDemos.length}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[10.5px] font-bold text-slate-400 uppercase">Scheduled / Upcoming</div>
                  <div className="text-2xl font-black text-cyan-600 mt-0.5">{demoReport.scheduled.length}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[10.5px] font-bold text-slate-400 uppercase">Conversion Rate</div>
                  <div className="text-2xl font-black text-[#00897b] mt-0.5">{demoReport.conversionRate}%</div>
                </div>
              </div>

              {/* Alert: Demos Pending Assignment */}
              {unassignedDemos.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-lg shrink-0">
                      ⚠️
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                        <span>{unassignedDemos.length} Demo{unassignedDemos.length > 1 ? 's' : ''} Awaiting Trainer Assignment</span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">Action Required</span>
                      </h4>
                      <p className="text-xs text-amber-800 font-medium mt-0.5">
                        New demos booked by HR counselors have been routed to you for faculty assignment. Click below to assign available trainers.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDemoFilterTab('unassigned')}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    Assign Trainers Now ({unassignedDemos.length}) →
                  </button>
                </div>
              )}

              {/* Demos Management Table & Actions */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Video className="w-4 h-4 text-[#00897b]" />
                      <span>Live Candidate Demos &amp; Conduction Desk</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Assign faculty to candidate demos, take sessions directly, launch Zoom meeting rooms, and log candidate outcomes.
                    </p>
                  </div>

                  {/* Filter Sub-Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold flex-wrap">
                    <button
                      type="button"
                      onClick={() => setDemoFilterTab('all')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        demoFilterTab === 'all'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      All Demos ({scopedDemos.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoFilterTab('unassigned')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        demoFilterTab === 'unassigned'
                          ? 'bg-amber-600 text-white shadow-2xs font-black'
                          : 'text-amber-800 bg-amber-50 border border-amber-300 hover:bg-amber-100 font-bold'
                      }`}
                    >
                      <span>⚠️ Awaiting Assignment</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                        {unassignedDemos.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoFilterTab('mine')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        demoFilterTab === 'mine'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-emerald-700 hover:text-emerald-900'
                      }`}
                    >
                      <span>My Demos to Conduct</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                        {myAssignedDemos.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoFilterTab('scheduled')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        demoFilterTab === 'scheduled'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Scheduled ({demoReport.scheduled.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoFilterTab('completed')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        demoFilterTab === 'completed'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Completed ({demoReport.completed.length})
                    </button>
                  </div>
                </div>

                {/* Column Filters for Demos */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Branch</label>
                      <select
                        value={demoBranchFilter}
                        onChange={(e) => setDemoBranchFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Branches</option>
                        {demoUniqueBranches.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Course</label>
                      <select
                        value={demoCourseFilter}
                        onChange={(e) => setDemoCourseFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Courses</option>
                        {demoUniqueCourses.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Faculty</label>
                      <select
                        value={demoFacultyFilter}
                        onChange={(e) => setDemoFacultyFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Faculty</option>
                        {demoUniqueFaculty.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Status</label>
                      <select
                        value={demoStatusFilter}
                        onChange={(e) => setDemoStatusFilter(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:border-teal-500"
                      >
                        <option value="all">All Statuses</option>
                        {demoUniqueStatuses.map((s) => (
                          <option key={s} value={s} className="capitalize">{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Search Candidate</label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={demoSearch}
                          onChange={(e) => setDemoSearch(e.target.value)}
                          placeholder="Candidate, phone, course..."
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>
                  </div>

                  {(demoBranchFilter !== 'all' || demoCourseFilter !== 'all' || demoFacultyFilter !== 'all' || demoStatusFilter !== 'all' || demoSearch) && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDemoBranchFilter('all');
                          setDemoCourseFilter('all');
                          setDemoFacultyFilter('all');
                          setDemoStatusFilter('all');
                          setDemoSearch('');
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
                      >
                        ✕ Reset Filters
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Candidate</th>
                        <th className="py-3 px-3">Phone</th>
                        <th className="py-3 px-3">Course &amp; Branch</th>
                        <th className="py-3 px-3">Date &amp; Slot</th>
                        <th className="py-3 px-3">Assigned Faculty</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Conduct / Manage Demo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredDemosList.map((dm) => {
                        const leaderName = currentLeaderTrainerName.toLowerCase();
                        const leaderId = String(currentLeaderTrainerId);
                        const dTr = String(dm.trainer || dm.faculty || dm.trainerMapping || '').toLowerCase();
                        const dTrId = String(dm.trainerId || '');
                        const isAssignedToMe = dTrId === leaderId || (leaderName && (dTr.includes(leaderName) || leaderName.includes(dTr)));

                        return (
                          <tr key={dm._id || dm.id} className={`hover:bg-slate-50 ${isAssignedToMe ? 'bg-emerald-50/30' : ''}`}>
                            <td className="py-3 px-3 font-extrabold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span>{dm.candidateName || 'Candidate'}</span>
                                {isAssignedToMe && (
                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    YOU
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{dm.phone || 'N/A'}</td>
                            <td className="py-3 px-3">
                              <span className="font-semibold text-teal-700">{dm.course || '—'}</span>
                              {dm.branch && <span className="text-[10px] text-slate-400 block">{dm.branch}</span>}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-900">{dm.preferredDate || 'TBD'}</span>
                              <span className="text-[10px] text-slate-400 block">{dm.timeSlot || 'General'}</span>
                            </td>
                            <td className="py-3 px-3">
                              {dm.trainer && dm.trainer !== 'Unassigned' && dm.trainerId ? (
                                <div>
                                  <div className="font-extrabold text-slate-900">{dm.trainer}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{dm.trainerId}</div>
                                </div>
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-black bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1 animate-pulse">
                                  <span>⚠️</span>
                                  <span>Awaiting Assignment</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${
                                  ['attended', 'completed', 'enrolled'].includes(String(dm.status || '').toLowerCase())
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ['confirmed', 'booked'].includes(String(dm.status || '').toLowerCase())
                                    ? 'bg-cyan-100 text-cyan-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {dm.status || 'booked'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {(!dm.trainer || dm.trainer === 'Unassigned' || !dm.trainerId) ? (
                                  <>
                                    {/* Primary Action for Trainer Head & Manager: Assign Trainer */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReassignDemoTarget(dm);
                                        setReassignForm({ toTrainerId: '', reason: '' });
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                                      title="Assign an available trainer to this demo"
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span>Assign Trainer</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleSelfAssignDemo(dm._id || dm.id)}
                                      className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs border border-teal-200 transition-all cursor-pointer"
                                      title="Take this demo session personally"
                                    >
                                      Take Demo
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {/* Start Demo Zoom Meeting Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleStartDemoMeeting(dm)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                      title="Launch demo call / Zoom room"
                                    >
                                      <Video className="w-3 h-3" />
                                      <span>Start Demo</span>
                                    </button>

                                    {/* Self-assign button if not already assigned to leader */}
                                    {!isAssignedToMe && (
                                      <button
                                        type="button"
                                        onClick={() => handleSelfAssignDemo(dm._id || dm.id)}
                                        className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs border border-teal-200 transition-all cursor-pointer"
                                        title="Take this demo session personally"
                                      >
                                        Take Demo
                                      </button>
                                    )}

                                    {/* Mark outcome button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDemoOutcomeTarget(dm);
                                        setDemoOutcomeForm({
                                          status: dm.status || 'attended',
                                          notes: dm.trainerNotes || ''
                                        });
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition-all cursor-pointer"
                                      title="Record completion status and feedback notes"
                                    >
                                      Outcome
                                    </button>

                                    {/* Reassign button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReassignDemoTarget(dm);
                                        setReassignForm({ toTrainerId: '', reason: '' });
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-all cursor-pointer"
                                      title="Reassign to another faculty"
                                    >
                                      Reassign
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredDemosList.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                            {displayedDemos.length === 0 && demoFilterTab === 'mine'
                              ? 'No demos currently assigned to you. Click "Take Demo" on any scheduled demo to assign it to yourself!'
                              : 'No demo sessions match the selected filters.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= SECTION 8: DOUBT BOX DETAILS ================= */}
          {activeTab === 'doubts' && (
            <div className="space-y-6">
              {/* Doubts KPI Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[10.5px] font-bold text-slate-400 uppercase">Total Doubts Raised</div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">{scopedDoubts.length}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[10.5px] font-bold text-slate-400 uppercase">Pending Doubts</div>
                  <div className="text-2xl font-black text-amber-600 mt-0.5">{doubtsReport.pending.length}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[10.5px] font-bold text-slate-400 uppercase">Resolved Doubts</div>
                  <div className="text-2xl font-black text-emerald-600 mt-0.5">{doubtsReport.resolved.length}</div>
                </div>
              </div>

              {/* Doubts List */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Student Doubts Raised &amp; Faculty Responsibility</h3>
                    <p className="text-xs text-slate-400">Track questions asked by students and the corresponding trainer responsible for resolution.</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setDoubtStatusFilter('all')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        doubtStatusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      All ({scopedDoubts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDoubtStatusFilter('pending')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        doubtStatusFilter === 'pending' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Pending ({doubtsReport.pending.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDoubtStatusFilter('resolved')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        doubtStatusFilter === 'resolved' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Resolved ({doubtsReport.resolved.length})
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {scopedDoubts
                    .filter((d) => {
                      if (doubtStatusFilter === 'pending') return !d.reply && d.status !== 'resolved';
                      if (doubtStatusFilter === 'resolved') return Boolean(d.reply || d.status === 'resolved');
                      return true;
                    })
                    .map((d) => (
                      <div key={d._id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">{d.studentName || 'Student'}</span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                              {d.course || '—'}
                            </span>
                            <span className="text-xs text-slate-500">
                              · Responsible Faculty: <strong>{d.trainerName || d.trainer || 'Assigned Faculty'}</strong>
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              d.reply || d.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {d.reply || d.status === 'resolved' ? 'Resolved' : 'Pending Response'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 font-medium">{d.question || d.doubtText}</p>
                        {d.reply && (
                          <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900">
                            <strong>Faculty Resolution:</strong> {d.reply}
                          </div>
                        )}
                      </div>
                    ))}
                  {scopedDoubts.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No doubts raised yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* ================= SECTION 9: UTILIZATION & HOURLY WORK TRACKER ================= */}
          {activeTab === 'utilization' && (
            <div className="space-y-6">
              <UtilizationDashboard
                roleType={roleType}
                currentUser={currentUser}
                currentLeader={currentLeader}
                scopedTrainers={scopedTrainers}
                batches={batches}
                students={students}
              />
            </div>
          )}
        </div>
      </main>

      {/* ================= MODAL: DEMO OUTCOME & FEEDBACK ================= */}
      {demoOutcomeTarget && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">Record Demo Outcome &amp; Feedback</h3>
              <button
                type="button"
                onClick={() => setDemoOutcomeTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div><strong>Candidate:</strong> {demoOutcomeTarget.candidateName}</div>
              <div><strong>Course:</strong> {demoOutcomeTarget.course}</div>
              <div><strong>Slot:</strong> {demoOutcomeTarget.preferredDate} · {demoOutcomeTarget.timeSlot || 'General'}</div>
              <div><strong>Conducted By:</strong> {currentLeaderTrainerName}</div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Outcome Status</label>
              <select
                value={demoOutcomeForm.status}
                onChange={(e) => setDemoOutcomeForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-[#00897b]"
              >
                <option value="attended">Attended (Candidate participated)</option>
                <option value="completed">Completed (Full demo delivered)</option>
                <option value="enrolled">Enrolled / Ready for Admission</option>
                <option value="missed">Missed / No-Show</option>
                <option value="rescheduled">Needs Rescheduling</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Session Notes &amp; Candidate Feedback</label>
              <textarea
                rows={3}
                value={demoOutcomeForm.notes}
                onChange={(e) => setDemoOutcomeForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Candidate background, interest level, questions asked, readiness to join..."
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-3 outline-none focus:border-[#00897b]"
              />
            </div>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDemoOutcomeTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingDemoOutcome}
                onClick={handleSaveDemoOutcome}
                className="px-4 py-2 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {savingDemoOutcome ? 'Saving...' : 'Save Demo Outcome'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ASSIGN / REASSIGN DEMO ================= */}
      {reassignDemoTarget && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-slate-800 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#00897b]" />
                <span>
                  {reassignDemoTarget.trainer && reassignDemoTarget.trainer !== 'Unassigned'
                    ? 'Reassign Demo Session'
                    : 'Assign Demo to Available Trainer'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setReassignDemoTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Candidate & Demo Details Summary */}
            <div className="text-xs text-slate-700 space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div><strong>Candidate:</strong> <span className="font-bold text-slate-900">{reassignDemoTarget.candidateName}</span></div>
                <span className="font-mono text-[11px] text-slate-500">{reassignDemoTarget.phone || 'N/A'}</span>
              </div>
              <div><strong>Course:</strong> <span className="font-semibold text-teal-800">{reassignDemoTarget.course}</span></div>
              <div className="flex items-center justify-between">
                <div><strong>Scheduled Slot:</strong> {reassignDemoTarget.preferredDate} · {reassignDemoTarget.timeSlot || reassignDemoTarget.time || 'General'}</div>
                <span className="text-[10px] text-slate-500">{reassignDemoTarget.mode || 'Online'}</span>
              </div>
              <div><strong>Branch &amp; Language:</strong> {reassignDemoTarget.branch || reassignDemoTarget.location || 'All Branches'} · {reassignDemoTarget.language || 'English'}</div>
              <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between">
                <span className="font-medium text-slate-500">Current Faculty:</span>
                {reassignDemoTarget.trainer && reassignDemoTarget.trainer !== 'Unassigned' ? (
                  <span className="font-extrabold text-slate-900">{reassignDemoTarget.trainer}</span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                    ⚠️ Unassigned (Pending Allocation)
                  </span>
                )}
              </div>
            </div>

            {/* Smart Matching Recommendation Tip */}
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-2.5 text-[11px] text-teal-900 flex items-start gap-2">
              <span className="text-xs shrink-0 mt-0.5">💡</span>
              <div className="leading-tight">
                <strong>Allocation tip:</strong> Preferred Branch is <b>{reassignDemoTarget.branch || reassignDemoTarget.location || 'Any Branch'}</b> &amp; Language is <b>{reassignDemoTarget.language || 'Tamil'}</b>. Selecting an active faculty available for this time slot is recommended.
              </div>
            </div>

            {/* Faculty Selection Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>{reassignDemoTarget.trainer && reassignDemoTarget.trainer !== 'Unassigned' ? 'Reassign to Faculty' : 'Select Faculty to Assign *'}</span>
                <span className="text-[10px] text-slate-400 font-normal">Active faculty only</span>
              </label>
              <select
                value={reassignForm.toTrainerId}
                onChange={(e) => setReassignForm((p) => ({ ...p, toTrainerId: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:border-[#00897b] cursor-pointer"
              >
                <option value="">Select available faculty...</option>
                {((scopedTrainers && scopedTrainers.length > 0) ? scopedTrainers : trainers)
                  .filter((tr) => tr.status !== 'Inactive')
                  .map((tr) => (
                    <option key={tr.trainerId || tr.id} value={tr.trainerId || tr.id}>
                      {tr.trainerName || tr.name}{tr.branchName || tr.branch ? ` — ${tr.branchName || tr.branch}` : ''}{tr.specialization || tr.expertCourse ? ` (${tr.specialization || tr.expertCourse})` : ''}
                    </option>
                  ))}
              </select>
            </div>

            {/* Optional Reason Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                {reassignDemoTarget.trainer && reassignDemoTarget.trainer !== 'Unassigned' ? 'Reason for Reassignment' : 'Assignment Note (Optional)'}
              </label>
              <input
                type="text"
                value={reassignForm.reason}
                onChange={(e) => setReassignForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder={reassignDemoTarget.trainer && reassignDemoTarget.trainer !== 'Unassigned' ? 'e.g. Schedule conflict / Faculty leave' : 'e.g. Subject matter expert / Available slot'}
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-[#00897b]"
              />
            </div>

            {/* Modal Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReassignDemoTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reassigning || !reassignForm.toTrainerId}
                onClick={handleConfirmReassign}
                className="px-5 py-2 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {reassigning 
                  ? 'Assigning...' 
                  : (reassignDemoTarget.trainer && reassignDemoTarget.trainer !== 'Unassigned' 
                    ? 'Confirm Reassign' 
                    : 'Confirm & Assign Trainer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
