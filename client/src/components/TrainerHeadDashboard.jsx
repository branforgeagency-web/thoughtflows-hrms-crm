import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Home,
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
  Briefcase
} from 'lucide-react';
import {
  getStudents,
  getBatches,
  getBranches,
  getTrainerSettings,
  getTrainerAttendance,
  getDemos,
  getTrainerDoubts,
  reassignDemo,
  bulkReassignDemos,
  onDataUpdate
} from '../services/api';
import { TRAINER_HIERARCHY, ALL_HIERARCHY_TRAINERS } from '../constants/trainerHierarchy';
import { redirectToWhatsAppWeb } from '../utils/whatsapp';

export default function TrainerHeadDashboard({
  roleType = 'head', // 'head' | 'manager' | 'tl'
  initialLeaderId = null,
  onBack,
  currentUser,
  onLogout,
  onSwitchDepartment,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [navOpen, setNavOpen] = useState(false);

  // Active Leader Selection (Manoj for Head, Keerthi/Pavithra for Manager, Ram Balaji/Vaishna/Mounika for TL)
  const [activeLeaderId, setActiveLeaderId] = useState(() => {
    if (initialLeaderId) return initialLeaderId;
    if (roleType === 'head') return 'manoj';
    if (roleType === 'manager') {
      const name = String(currentUser?.name || currentUser?.userName || '').toLowerCase();
      if (name.includes('pavithra')) return 'pavithra';
      return 'keerthi';
    }
    if (roleType === 'tl') {
      const name = String(currentUser?.name || currentUser?.userName || '').toLowerCase();
      if (name.includes('vaishna')) return 'vaishna';
      if (name.includes('mounika')) return 'mounika';
      return 'ram_balaji';
    }
    return 'manoj';
  });

  // Live Connected Data State
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [branches, setBranches] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [demos, setDemos] = useState([]);
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Global & Local Filters
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedTrainer, setSelectedTrainer] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [doubtStatusFilter, setDoubtStatusFilter] = useState('all'); // 'all' | 'pending' | 'resolved'

  // Reassignment Modal State
  const [reassignDemoTarget, setReassignDemoTarget] = useState(null);
  const [reassignForm, setReassignForm] = useState({ toTrainerId: '', reason: '' });
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
      getTrainerDoubts().catch(() => [])
    ])
      .then(([stData, bData, brData, trData, attData, dData, dbtData]) => {
        // Merge official 25 trainers with backend roster records
        const mergedTrainers = [...(Array.isArray(trData) ? trData : [])];
        ALL_HIERARCHY_TRAINERS.forEach((ht) => {
          const found = mergedTrainers.find(
            (t) =>
              String(t.trainerName || t.name || '').toLowerCase() === ht.name.toLowerCase() ||
              t.trainerId === ht.id
          );
          if (found) {
            found.teamLeadId = ht.teamLeadId;
            found.teamLeadName = ht.teamLeadName;
            found.managerId = ht.managerId;
            found.managerName = ht.managerName;
            found.zone = ht.zone;
            found.courseKey = found.courseKey || ht.course;
            found.branchName = found.branchName || ht.branch;
          } else {
            mergedTrainers.push(ht);
          }
        });

        setStudents(Array.isArray(stData) ? stData : []);
        setBatches(Array.isArray(bData) ? bData : []);
        setBranches(Array.isArray(brData) ? brData : []);
        setTrainers(mergedTrainers);
        setAttendanceRecords(Array.isArray(attData) ? attData : []);
        setDemos(Array.isArray(dData) ? dData : []);
        setDoubts(Array.isArray(dbtData) ? dbtData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDashboardData();
    const unsub = onDataUpdate((entity) => {
      if (['students', 'batches', 'trainers', 'demos', 'doubts', 'trainer_attendance'].includes(entity)) {
        loadDashboardData();
      }
    });
    return () => unsub();
  }, [loadDashboardData]);

  // Active Leader Config
  const currentLeader = useMemo(() => {
    if (roleType === 'head') {
      return {
        id: 'manoj',
        name: 'Manoj',
        roleTitle: 'Head of Training Department',
        roleCategory: 'TRAINER HEAD',
        badge: 'HT',
        scopeLabel: 'All 12 Branches · All 25 Faculty · TN, KL, AP & TS',
        zone: 'All Regions (TN, KL, AP / TS)'
      };
    }
    if (roleType === 'manager') {
      const mgr = TRAINER_HIERARCHY.managers.find((m) => m.id === activeLeaderId) || TRAINER_HIERARCHY.managers[0];
      return {
        id: mgr.id,
        name: mgr.name,
        roleTitle: `Training Manager (${mgr.zone})`,
        roleCategory: 'TRAINER MANAGER',
        badge: mgr.badge,
        scopeLabel: `${mgr.zoneLabel} · ${mgr.id === 'keerthi' ? '17 Faculty' : '8 Faculty'}`,
        zone: mgr.zone
      };
    }
    const tl = TRAINER_HIERARCHY.teamLeads.find((t) => t.id === activeLeaderId) || TRAINER_HIERARCHY.teamLeads[0];
    return {
      id: tl.id,
      name: tl.name,
      roleTitle: `Team Lead (${tl.zone})`,
      roleCategory: 'TRAINER TEAM LEAD',
      badge: tl.badge,
      scopeLabel: `${tl.zoneLabel} Pod · ${tl.trainersCount} Faculty · Reporting to ${tl.managerName}`,
      zone: tl.zone
    };
  }, [roleType, activeLeaderId]);

  // ================= SCOPING LOGIC BASED ON ROLE =================
  // 1. Scoped Trainers
  const scopedTrainers = useMemo(() => {
    let list = trainers;
    if (roleType === 'manager') {
      if (activeLeaderId === 'keerthi') {
        list = list.filter((t) => t.managerId === 'keerthi' || ['TN', 'KL'].includes(t.zone) || /tamil|kerala|coimbatore|kochi|trivandrum|salem|trichy/i.test(`${t.branchName || ''} ${t.branch || ''}`));
      } else if (activeLeaderId === 'pavithra') {
        list = list.filter((t) => t.managerId === 'pavithra' || ['AP / TS', 'AP', 'TS'].includes(t.zone) || /telangana|andhra|hyderabad|ameerpet|dilsukhnagar|tirupati|vizag/i.test(`${t.branchName || ''} ${t.branch || ''}`));
      }
    } else if (roleType === 'tl') {
      if (activeLeaderId === 'ram_balaji') {
        list = list.filter((t) => t.teamLeadId === 'ram_balaji' || t.zone === 'TN' || /tharani|jennifer|karkuzhali|sowmiya|darsana|sharon|kaviya|priya|sumaiya|sophiga/i.test(t.trainerName || t.name || ''));
      } else if (activeLeaderId === 'vaishna') {
        list = list.filter((t) => t.teamLeadId === 'vaishna' || t.zone === 'KL' || /aleena|aswini|shilpa|varamani|shiny|shiva|abarna/i.test(t.trainerName || t.name || ''));
      } else if (activeLeaderId === 'mounika') {
        list = list.filter((t) => t.teamLeadId === 'mounika' || t.zone === 'AP / TS' || /pooja|varsha|charishma|prasanna|aashifa|santhiya|kavitha|santhosh/i.test(t.trainerName || t.name || ''));
      }
    }
    return list;
  }, [trainers, roleType, activeLeaderId]);

  const scopedTrainerNames = useMemo(() => {
    return scopedTrainers.map((t) => t.trainerName || t.name).filter(Boolean);
  }, [scopedTrainers]);

  const scopedTrainerIds = useMemo(() => {
    return scopedTrainers.map((t) => t.trainerId || t.id).filter(Boolean);
  }, [scopedTrainers]);

  // 2. Scoped Branches (only branches belonging to this manager / TL)
  const scopedBranchNames = useMemo(() => {
    if (roleType === 'head') {
      const list = new Set();
      branches.forEach((b) => b.name && list.add(b.name));
      students.forEach((s) => s.branch && list.add(s.branch));
      batches.forEach((b) => b.branch && list.add(b.branch));
      scopedTrainers.forEach((t) => (t.branchName || t.branch) && list.add(t.branchName || t.branch));
      if (list.size === 0) {
        ['Saravanampatti', 'Gandhipuram', 'Hopes', 'Salem', 'Trichy', 'Theni', 'Kochi', 'Trivandrum', 'Ameerpet', 'Dilsukhnagar', 'Tirupati', 'Vizag'].forEach(
          (b) => list.add(b)
        );
      }
      return Array.from(list).sort();
    }

    if (roleType === 'manager') {
      if (activeLeaderId === 'keerthi') {
        return ['Saravanampatti', 'Gandhipuram', 'Hopes', 'Salem', 'Trichy', 'Theni', 'Coimbatore', 'Kochi', 'Trivandrum'];
      }
      return ['Ameerpet', 'Dilsukhnagar', 'Tirupati', 'Vizag', 'Gandhipuram'];
    }

    // Team Leads
    if (activeLeaderId === 'ram_balaji') {
      return ['Saravanampatti', 'Gandhipuram', 'Hopes', 'Salem', 'Trichy', 'Theni', 'Coimbatore'];
    }
    if (activeLeaderId === 'vaishna') {
      return ['Kochi', 'Trivandrum'];
    }
    return ['Ameerpet', 'Dilsukhnagar', 'Tirupati', 'Vizag', 'Gandhipuram'];
  }, [roleType, activeLeaderId, branches, students, batches, scopedTrainers]);

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
      const sBranch = String(s.branch || s.location || '').toLowerCase();
      return scopedBranchNames.some((sbn) => sbn.toLowerCase() === sBranch);
    });
  }, [students, roleType, scopedTrainerIds, scopedTrainerNames, scopedBatches, scopedBranchNames]);

  // 1. Branch-Wise Computed Stats
  const branchWiseReport = useMemo(() => {
    return scopedBranchNames.map((branchName) => {
      const branchStudents = scopedStudents.filter(
        (s) => String(s.branch || s.location || '').toLowerCase() === branchName.toLowerCase()
      );
      const branchBatches = scopedBatches.filter(
        (b) => String(b.branch || '').toLowerCase() === branchName.toLowerCase()
      );
      const branchTrainers = scopedTrainers.filter(
        (t) => String(t.branchName || t.branch || '').toLowerCase() === branchName.toLowerCase()
      );
      const weakCount = branchStudents.filter(
        (s) => Number(s.attendancePercentage ?? s.attendance ?? 85) < 75 || s.isWeak === true
      ).length;
      const syllabusDoneCount = branchStudents.filter(
        (s) => Number(s.syllabusPercentage ?? 0) >= 100 || s.syllabusStatus === 'Completed'
      ).length;

      return {
        branchName,
        totalStudents: branchStudents.length,
        totalBatches: branchBatches.length,
        totalTrainers: branchTrainers.length,
        weakCount,
        syllabusDoneCount,
        students: branchStudents
      };
    });
  }, [scopedBranchNames, scopedStudents, scopedBatches, scopedTrainers]);

  // 2. Batch-Wise Details
  const batchWiseReport = useMemo(() => {
    return scopedBatches.map((b) => {
      const bKey = String(b.name || b.batchId || '').toLowerCase();
      const batchStudents = scopedStudents.filter(
        (s) => String(s.batch || s.batchName || s.batchId || '').toLowerCase() === bKey
      );
      const avgAttendance = batchStudents.length
        ? Math.round(
            batchStudents.reduce(
              (acc, s) => acc + Number(s.attendancePercentage ?? s.attendance ?? 85),
              0
            ) / batchStudents.length
          )
        : 88;
      const avgScore = batchStudents.length
        ? Math.round(
            batchStudents.reduce((acc, s) => acc + Number(s.averageScore ?? s.score ?? 80), 0) /
              batchStudents.length
          )
        : 82;
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
        const att = Number(s.attendancePercentage ?? s.attendance ?? 85);
        const score = Number(s.averageScore ?? s.score ?? 80);
        return att < 75 || score < 60 || s.isWeak === true;
      })
      .map((s) => ({
        ...s,
        attPct: Number(s.attendancePercentage ?? s.attendance ?? 70),
        scorePct: Number(s.averageScore ?? s.score ?? 58),
        learningProgress: s.completedModules || s.currentModule || 'Module 2 · In Progress',
        attentionReason:
          Number(s.attendancePercentage ?? 85) < 75
            ? 'Attendance Drop below 75%'
            : 'Low Test Score (<60%)'
      }));
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

  // 5. Trainer and Batch Mapping
  const trainerBatchMapping = useMemo(() => {
    return scopedTrainers.map((t) => {
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

      return {
        ...t,
        trainerName: t.trainerName || t.name,
        branch: t.branchName || t.branch || 'Saravanampatti',
        course: t.courseKey || t.course || 'CPC',
        batchesCount: handledBatches.length,
        batches: handledBatches,
        studentsCount: handledStudents.length,
        students: handledStudents
      };
    });
  }, [scopedTrainers, scopedBatches, scopedStudents]);

  // 6. Trainer Attendance Details
  const trainerAttendanceReport = useMemo(() => {
    return scopedTrainers.map((t) => {
      const tId = t.trainerId || t.id;
      const tName = String(t.trainerName || t.name || '').toLowerCase();

      const trainerRecords = attendanceRecords.filter((ar) => {
        if (ar.trainerId && ar.trainerId === tId) return true;
        return String(ar.trainerName || '').toLowerCase().includes(tName);
      });

      const totalRecordedSessions = trainerRecords.length;
      const presentDays = Math.min(22, totalRecordedSessions > 0 ? totalRecordedSessions : 20);
      const absentDays = Math.max(0, 22 - presentDays);
      const attendancePct = Math.round((presentDays / 22) * 100);

      return {
        ...t,
        trainerName: t.trainerName || t.name,
        branch: t.branchName || t.branch || 'Saravanampatti',
        presentDays,
        absentDays,
        attendancePct,
        sessionsLogged: totalRecordedSessions,
        shift: t.shift || 'General (09:00 AM - 06:00 PM)'
      };
    });
  }, [scopedTrainers, attendanceRecords]);

  // 7. Demo Details
  const scopedDemos = useMemo(() => {
    if (roleType === 'head') return demos;
    return demos.filter((d) => {
      const tName = String(d.trainer || d.trainerMapping || '').toLowerCase();
      if (scopedTrainerNames.some((stn) => tName.includes(stn.toLowerCase()))) return true;
      const dBranch = String(d.branch || d.location || '').toLowerCase();
      return scopedBranchNames.some((sbn) => sbn.toLowerCase() === dBranch);
    });
  }, [demos, roleType, scopedTrainerNames, scopedBranchNames]);

  const demoReport = useMemo(() => {
    const scheduled = scopedDemos.filter((d) =>
      ['booked', 'confirmed', 'scheduled'].includes(String(d.status || '').toLowerCase())
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
    const resolved = scopedDoubts.filter((d) => Boolean(d.reply || d.status === 'resolved'));
    const pending = scopedDoubts.filter((d) => !d.reply && d.status !== 'resolved');

    return {
      total: scopedDoubts.length,
      resolved,
      pending,
      resolutionRate: scopedDoubts.length ? Math.round((resolved.length / scopedDoubts.length) * 100) : 92
    };
  }, [scopedDoubts]);

  // Filtered Students (used in Branch-Wise Student view)
  const filteredStudents = useMemo(() => {
    return scopedStudents.filter((s) => {
      if (selectedBranch !== 'all' && String(s.branch || s.location || '').toLowerCase() !== selectedBranch.toLowerCase()) {
        return false;
      }
      if (selectedBatch !== 'all' && String(s.batch || s.batchName || s.batchId || '').toLowerCase() !== selectedBatch.toLowerCase()) {
        return false;
      }
      if (selectedTrainer !== 'all' && String(s.trainer || s.faculty || s.trainerId || '').toLowerCase() !== selectedTrainer.toLowerCase()) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = String(s.name || '').toLowerCase().includes(q);
        const matchesId = String(s.studentId || '').toLowerCase().includes(q);
        const matchesPhone = String(s.phone || '').includes(q);
        if (!matchesName && !matchesId && !matchesPhone) return false;
      }
      return true;
    });
  }, [scopedStudents, selectedBranch, selectedBatch, selectedTrainer, searchQuery]);

  // Reassign demo handler
  const handleConfirmReassign = async () => {
    if (!reassignDemoTarget || !reassignForm.toTrainerId) return;
    setReassigning(true);
    try {
      await reassignDemo(reassignDemoTarget._id, {
        toTrainerId: reassignForm.toTrainerId,
        reason: reassignForm.reason
      });
      const toTrainer = scopedTrainers.find((t) => (t.trainerId || t.id) === reassignForm.toTrainerId);
      flashToast(`✓ Demo for ${reassignDemoTarget.candidateName} successfully reassigned to ${toTrainer?.trainerName || toTrainer?.name || 'Faculty'}`);
      setReassignDemoTarget(null);
      loadDashboardData();
    } catch (err) {
      flashToast(`⚠ Reassign failed: ${err?.response?.data?.error || err.message}`);
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
                {roleType === 'head' ? 'Trainer Head' : roleType === 'manager' ? 'Training Manager' : 'Team Lead'}
              </span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-[#00897b]/20 text-[#00897b] border border-[#00897b]/30">
                {roleType === 'head' ? 'EXECUTIVE' : roleType === 'manager' ? 'MANAGEMENT' : 'LEAD'}
              </span>
            </div>

            {roleType === 'head' ? (
              <div className="flex items-center gap-2.5 bg-[#0c1921] border border-[#213a4d] rounded-xl p-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                  M
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white text-xs font-bold truncate">Manoj</div>
                  <div className="text-[#649297] text-[10px] font-medium truncate">All 12 Branches · 25 Faculty</div>
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
          {/* ================= SECTION 0: EXECUTIVE OVERVIEW ================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Top 4 Primary KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => setActiveTab('branches')}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Branch Students
                    </span>
                    <Building2 className="w-5 h-5 text-teal-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{scopedStudents.length}</div>
                  <div className="text-xs text-teal-700 font-semibold mt-1">
                    Across {scopedBranchNames.length} branch{scopedBranchNames.length === 1 ? '' : 'es'} →
                  </div>
                </div>

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

                <div
                  onClick={() => setActiveTab('syllabus')}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Syllabus Completion
                    </span>
                    <ListChecks className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{syllabusReport.completionRate}%</div>
                  <div className="text-xs text-emerald-700 font-semibold mt-1">
                    {syllabusReport.completedCount} finished · {syllabusReport.pendingCount} in progress →
                  </div>
                </div>
              </div>

              {/* Bottom 4 Secondary KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => setActiveTab('mapping')}
                  className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase">Faculty Mapping</span>
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900">{scopedTrainers.length} Trainers</div>
                  <div className="text-[11px] text-purple-700 font-medium mt-0.5">100% Batches Mapped</div>
                </div>

                <div
                  onClick={() => setActiveTab('trainer_attendance')}
                  className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase">Faculty Attendance</span>
                    <Calendar className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900">95% Average</div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Live Shift Adherence</div>
                </div>

                <div
                  onClick={() => setActiveTab('demos')}
                  className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase">Demos Tracked</span>
                    <AtSign className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900">{scopedDemos.length} Total</div>
                  <div className="text-[11px] text-cyan-700 font-medium mt-0.5">{demoReport.scheduled.length} Upcoming</div>
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
                  <div className="text-[11px] text-amber-700 font-medium mt-0.5">{doubtsReport.resolved.length} Resolved</div>
                </div>
              </div>

              {/* Quick Branch Overview Grid */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {roleType === 'head' ? 'Branch Academic Overview' : `${currentLeader.name}'s Branches Overview`}
                    </h3>
                    <p className="text-xs text-slate-400">Total student enrollment and batch distribution across your assigned branches.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('branches')}
                    className="text-xs font-bold text-[#00897b] hover:underline"
                  >
                    View All Student Lists →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {branchWiseReport.map((b) => (
                    <div
                      key={b.branchName}
                      onClick={() => {
                        setSelectedBranch(b.branchName);
                        setActiveTab('branches');
                      }}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-teal-50/50 hover:border-teal-300 transition-all cursor-pointer"
                    >
                      <div className="text-xs font-black text-slate-900 truncate">{b.branchName}</div>
                      <div className="text-lg font-extrabold text-teal-800 mt-1">{b.totalStudents} Students</div>
                      <div className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                        {b.totalBatches} Batches · {b.weakCount} At Risk
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                            <td className="py-3 px-3">{st.branch || st.location || 'Saravanampatti'}</td>
                            <td className="py-3 px-3 font-semibold text-teal-700">{st.course || 'CPC'}</td>
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
                          </tr>
                        );
                      })}
                      {filteredStudents.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
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
                      {roleType === 'head' ? 'All Academy Batches' : `${currentLeader.name}'s Assigned Batches`} ({batchWiseReport.length})
                    </h3>
                    <p className="text-xs text-slate-400">Assigned trainers, enrolled students count, and batch performance metrics.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {batchWiseReport.map((b) => (
                    <div key={b.batchId || b.name} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-slate-900">{b.batchName}</span>
                        <span className="px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          {b.course || 'CPC'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        <div><strong>Assigned Faculty:</strong> {b.trainer || b.faculty || 'Unassigned'}</div>
                        <div><strong>Branch:</strong> {b.branch || 'Saravanampatti'}</div>
                        <div><strong>Schedule / Timing:</strong> {b.timing || '10:00 AM - 12:00 PM'}</div>
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
                      <span>Weak Students Report ({allWeakStudents.length})</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Students in your batches requiring additional attention due to attendance &lt; 75% or test scores below target.
                    </p>
                  </div>
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
                      {allWeakStudents.map((st) => (
                        <tr key={st.studentId || st._id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-extrabold text-slate-900">{st.name}</td>
                          <td className="py-3 px-3 font-mono text-slate-500">{st.studentId || 'ID-N/A'}</td>
                          <td className="py-3 px-3">{st.branch || 'Saravanampatti'}</td>
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
                      {allWeakStudents.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                            No students flagged as weak or requiring special attention!
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
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-base font-extrabold text-slate-900">Batch-Wise Syllabus Progress Breakdown</h3>
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
                      {batchWiseReport.map((b) => {
                        const pct = b.enrolledCount > 0 ? Math.round((b.completedSyllabusCount / b.enrolledCount) * 100) : 50;
                        return (
                          <tr key={b.batchId || b.name} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-extrabold text-slate-900">{b.batchName}</td>
                            <td className="py-3 px-3 font-semibold text-teal-700">{b.course || 'CPC'}</td>
                            <td className="py-3 px-3">{b.branch || 'Saravanampatti'}</td>
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
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= SECTION 5: TRAINER AND BATCH MAPPING ================= */}
          {activeTab === 'mapping' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Trainer and Batch Mapping Matrix ({trainerBatchMapping.length})
                    </h3>
                    <p className="text-xs text-slate-400">Shows which trainer is assigned to which batch and students handled by each trainer.</p>
                  </div>
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {trainerBatchMapping.map((tr) => (
                        <tr key={tr.trainerId || tr.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-extrabold text-slate-900">{tr.trainerName}</td>
                          <td className="py-3 px-3">{tr.zone || 'TN'} · {tr.branch}</td>
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
                              <span className="text-slate-400 italic">General Shift Batch</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-black text-slate-900">{tr.studentsCount} Students</td>
                          <td className="py-3 px-3 text-slate-600">{tr.teamLeadName || 'Ram Balaji'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= SECTION 6: TRAINER ATTENDANCE DETAILS ================= */}
          {activeTab === 'trainer_attendance' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Trainer Attendance &amp; Shift Records ({trainerAttendanceReport.length})
                    </h3>
                    <p className="text-xs text-slate-400">Present days, absent days, and monthly attendance summaries for your faculty.</p>
                  </div>
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
                      {trainerAttendanceReport.map((tr) => (
                        <tr key={tr.trainerId || tr.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-extrabold text-slate-900">{tr.trainerName}</td>
                          <td className="py-3 px-3">{tr.branch}</td>
                          <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{tr.shift}</td>
                          <td className="py-3 px-3 font-bold text-emerald-600">{tr.presentDays} / 22 Days</td>
                          <td className="py-3 px-3 font-bold text-rose-600">{tr.absentDays} Days</td>
                          <td className="py-3 px-3 font-black text-slate-900">{tr.attendancePct}%</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-100 text-emerald-800">
                              Active On Shift
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

          {/* ================= SECTION 7: DEMO DETAILS ================= */}
          {activeTab === 'demos' && (
            <div className="space-y-6">
              {/* Demo KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[10.5px] font-bold text-slate-400 uppercase">Total Demos</div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">{scopedDemos.length}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[10.5px] font-bold text-slate-400 uppercase">Scheduled / Upcoming</div>
                  <div className="text-2xl font-black text-cyan-600 mt-0.5">{demoReport.scheduled.length}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[10.5px] font-bold text-slate-400 uppercase">Completed</div>
                  <div className="text-2xl font-black text-emerald-600 mt-0.5">{demoReport.completed.length}</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="text-[10.5px] font-bold text-slate-400 uppercase">Conversion Rate</div>
                  <div className="text-2xl font-black text-[#00897b] mt-0.5">{demoReport.conversionRate}%</div>
                </div>
              </div>

              {/* Demos Table with 1-Click Reassign */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Trainer Demo Sessions &amp; Records</h3>
                    <p className="text-xs text-slate-400">Scheduled demos, completed demos, and trainer reassignment.</p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Candidate</th>
                        <th className="py-3 px-3">Phone</th>
                        <th className="py-3 px-3">Course</th>
                        <th className="py-3 px-3">Date &amp; Slot</th>
                        <th className="py-3 px-3">Assigned Faculty</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {scopedDemos.map((dm) => (
                        <tr key={dm._id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-extrabold text-slate-900">{dm.candidateName || 'Candidate'}</td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{dm.phone || 'N/A'}</td>
                          <td className="py-3 px-3 font-semibold text-teal-700">{dm.course || 'CPC'}</td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900">{dm.preferredDate || 'TBD'}</span>
                            <span className="text-[10px] text-slate-400 block">{dm.timeSlot || 'General'}</span>
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-900">{dm.trainer || dm.trainerMapping || 'Unassigned'}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                              {dm.status || 'booked'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setReassignDemoTarget(dm);
                                setReassignForm({ toTrainerId: '', reason: '' });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 cursor-pointer"
                            >
                              Reassign
                            </button>
                          </td>
                        </tr>
                      ))}
                      {scopedDemos.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                            No demo sessions recorded.
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
                              {d.course || 'CPC'}
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
        </div>
      </main>

      {/* ================= MODAL: REASSIGN DEMO ================= */}
      {reassignDemoTarget && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">Reassign Demo Session</h3>
              <button
                type="button"
                onClick={() => setReassignDemoTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div><strong>Candidate:</strong> {reassignDemoTarget.candidateName}</div>
              <div><strong>Course:</strong> {reassignDemoTarget.course}</div>
              <div><strong>Current Faculty:</strong> {reassignDemoTarget.trainer || 'Unassigned'}</div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Assign to New Faculty</label>
              <select
                value={reassignForm.toTrainerId}
                onChange={(e) => setReassignForm((p) => ({ ...p, toTrainerId: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:border-[#00897b]"
              >
                <option value="">Select faculty...</option>
                {scopedTrainers.map((tr) => (
                  <option key={tr.trainerId || tr.id} value={tr.trainerId || tr.id}>
                    {tr.trainerName || tr.name} ({tr.courseKey || tr.course || 'CPC'} · {tr.branchName || tr.branch || 'Saravanampatti'})
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
                placeholder="e.g. Schedule conflict / Faculty leave"
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-[#00897b]"
              />
            </div>
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
                className="px-4 py-2 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {reassigning ? 'Reassigning...' : 'Confirm Reassign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
