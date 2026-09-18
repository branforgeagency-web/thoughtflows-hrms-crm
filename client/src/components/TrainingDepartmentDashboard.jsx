import React, { useState, useEffect } from 'react';
import { 
  Home, 
  PlayCircle, 
  CheckSquare, 
  AtSign, 
  MessageSquare, 
  Star, 
  List, 
  LayoutGrid, 
  Users, 
  AlertTriangle, 
  FileCheck, 
  BookOpen, 
  Send, 
  User, 
  Layers, 
  Clock, 
  ChevronRight, 
  Play, 
  Target, 
  CheckCircle2, 
  X, 
  Search, 
  Video, 
  Mic, 
  MicOff, 
  VideoOff, 
  MonitorUp, 
  Share2, 
  Sparkles, 
  HelpCircle, 
  Award, 
  TrendingUp, 
  Download, 
  Calendar, 
  DollarSign, 
  PhoneCall, 
  GraduationCap,
  ExternalLink,
  ChevronDown,
  LogOut
} from 'lucide-react';
import TrainingLibraryMaterials from './TrainingLibraryMaterials';
import TrainingPlacementPrep from './TrainingPlacementPrep';
import TrainingMyProfile from './TrainingMyProfile';
import TrainingSkillsCourses from './TrainingSkillsCourses';
import TrainingShiftAvailability from './TrainingShiftAvailability';
import {
  getStudents,
  updateStudent,
  getDemos,
  updateDemo,
  acknowledgeDemo,
  getLeads,
  getTrainerDoubts,
  replyTrainerDoubt,
  createTrainerDoubt,
  getTrainerAssessments,
  createTrainerAssessment,
  updateAssessmentScores,
  updateAssessmentRationale,
  recordTrainerAttendance,
  getTrainerAttendance
} from '../services/api';

export default function TrainingDepartmentDashboard({
  onClose,
  currentUser,
  onLogout,
  onSwitchDepartment,
  theme = 'clay'
}) {
  const trainerName = currentUser?.userName || currentUser?.name || 'Srithar S';
  const trainerRole = currentUser?.role || 'Trainer';
  const trainerBranch = currentUser?.branch || 'Gandhipuram';
  const trainerId = currentUser?.trainerId || currentUser?.id || 'TR-CBG-001';
  const trainerShift = currentUser?.shift || '6:00 AM – 2:00 PM';
  const trainerCourseKey = currentUser?.courseKey || (
    currentUser?.role?.includes('CIC') ? 'CIC' :
    currentUser?.role?.includes('CPB') ? 'CPB' :
    currentUser?.role?.includes('CPMA') ? 'CPMA' :
    currentUser?.role?.includes('CPC') ? 'CPC' :
    currentUser?.role?.includes('CRC') ? 'CRC' :
    'ALL'
  );
  const isChiefFaculty = trainerCourseKey === 'ALL' || (trainerRole?.toLowerCase().includes('lead') && !trainerRole?.toLowerCase().includes('drg')) || trainerRole?.toLowerCase().includes('chief') || trainerName?.toLowerCase().includes('vikram');

  const [activeNav, setActiveNav] = useState('home');
  const [selectedSession, setSelectedSession] = useState(null);
  const [isLiveClassActive, setIsLiveClassActive] = useState(false);
  const [sessionTimeSeconds, setSessionTimeSeconds] = useState(6438); // 1 hr 47 min 18 sec
  const [timerRunning, setTimerRunning] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeBoardSlide, setActiveBoardSlide] = useState(1);
  const [classChatMsg, setClassChatMsg] = useState('');

  // Live Database States
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [demos, setDemos] = useState([]);
  const [leads, setLeads] = useState([]);
  const [doubts, setDoubts] = useState([]);
  const [assessmentTests, setAssessmentTests] = useState([]);
  const [assessmentScores, setAssessmentScores] = useState({});
  const [rationaleTexts, setRationaleTexts] = useState({});
  const [attendanceList, setAttendanceList] = useState([]);

  const [rosterLoaded, setRosterLoaded] = useState(true);
  const [tfStoreSyncToast, setTfStoreSyncToast] = useState(false);
  const [showDemoBucket, setShowDemoBucket] = useState(true);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [selectedBatchDrilldown, setSelectedBatchDrilldown] = useState(null);
  const [cccpSentStudents, setCccpSentStudents] = useState({});
  const [cccpToast, setCccpToast] = useState(null);
  const [activeWeakStudentModal, setActiveWeakStudentModal] = useState(null);
  const [weakStudentToast, setWeakStudentToast] = useState(null);
  const [activeAssessmentTab, setActiveAssessmentTab] = useState('active');
  const [showCreateTestModal, setShowCreateTestModal] = useState(false);
  const [activeScoreModalTest, setActiveScoreModalTest] = useState(null);
  const [activeRationaleModalTest, setActiveRationaleModalTest] = useState(null);
  const [assessmentToast, setAssessmentToast] = useState(null);

  const [activeDoubtFilter, setActiveDoubtFilter] = useState('All');
  const [activeDoubtModal, setActiveDoubtModal] = useState(null);
  const [doubtReplyText, setDoubtReplyText] = useState('');

  const [newTestForm, setNewTestForm] = useState({
    name: '',
    type: 'Weekly Test',
    course: 'CPC — Medical Coding',
    batch: 'All Batches',
    topic: '',
    date: new Date().toISOString().split('T')[0],
    timeLimit: '45 min',
    totalMarks: 50,
    passMark: 35
  });

  // Fetch all real data from backend API
  const loadRealData = async () => {
    try {
      setLoading(true);
      const [stRes, dmRes, ldRes, dbtRes, asmRes, attRes] = await Promise.all([
        getStudents().catch(() => []),
        getDemos().catch(() => []),
        getLeads().catch(() => ({ leads: [] })),
        getTrainerDoubts().catch(() => []),
        getTrainerAssessments().catch(() => []),
        getTrainerAttendance().catch(() => ({}))
      ]);

      const studentList = Array.isArray(stRes) ? stRes : [];
      setStudents(studentList);
      setDemos(Array.isArray(dmRes) ? dmRes : []);
      setLeads(Array.isArray(ldRes?.leads) ? ldRes.leads : []);
      setDoubts(Array.isArray(dbtRes) ? dbtRes : []);

      const asmList = Array.isArray(asmRes) ? asmRes : [];
      setAssessmentTests(asmList);

      const initialScores = {};
      const initialRationales = {};
      asmList.forEach(t => {
        if (t.scores) initialScores[t.id] = t.scores;
        if (t.rationale) initialRationales[t.id] = t.rationale;
      });
      setAssessmentScores(initialScores);
      setRationaleTexts(initialRationales);

      // Load local attendance cache from TF_STORE if present
      let savedAttendance = {};
      try {
        const tfStore = JSON.parse(localStorage.getItem('TF_STORE') || '{}');
        if (tfStore.attendance) savedAttendance = tfStore.attendance;
      } catch (e) {}

      // Attendance list initialized for this trainer's student domain
      const myStudentList = (isChiefFaculty || trainerCourseKey === 'ALL')
        ? studentList
        : studentList.filter(s => {
            const c = (s.course || '').toUpperCase();
            if (trainerCourseKey === 'CPC') return c.includes('CPC');
            if (trainerCourseKey === 'CIC') return c.includes('CIC') || c.includes('INPATIENT');
            if (trainerCourseKey === 'CPB') return c.includes('CPB') || c.includes('BILLING');
            if (trainerCourseKey === 'CPMA') return c.includes('CPMA') || c.includes('AUDIT');
            if (trainerCourseKey === 'CRC') return c.includes('CRC') || c.includes('RISK');
            return c.includes(trainerCourseKey.toUpperCase());
          });
      const activeStudentList = myStudentList.length > 0 ? myStudentList : studentList;

      const attInit = activeStudentList.map((s, idx) => {
        const roll = s.studentId || `TF-${idx + 101}`;
        const currentStatus = savedAttendance[roll]?.status || (s.statusGroup === 'on_hold' ? 'Absent' : 'Present');
        return {
          id: s._id || idx + 1,
          roll,
          name: s.name,
          course: s.course,
          status: currentStatus,
          attendancePct: s.attendancePct || (s.statusGroup === 'on_hold' ? 72 : 94)
        };
      });
      setAttendanceList(attInit);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching real trainer data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRealData();
  }, []);

  // Filter students by current trainer's course domain / allocation
  const myStudents = React.useMemo(() => {
    if (!students || students.length === 0) return [];
    if (isChiefFaculty || trainerCourseKey === 'ALL') return students;
    const filtered = students.filter(st => {
      const c = (st.course || '').toUpperCase();
      if (trainerCourseKey === 'CPC') return c.includes('CPC');
      if (trainerCourseKey === 'CIC') return c.includes('CIC') || c.includes('INPATIENT');
      if (trainerCourseKey === 'CPB') return c.includes('CPB') || c.includes('BILLING');
      if (trainerCourseKey === 'CPMA') return c.includes('CPMA') || c.includes('AUDIT');
      if (trainerCourseKey === 'CRC') return c.includes('CRC') || c.includes('RISK');
      return c.includes(trainerCourseKey.toUpperCase());
    });
    return filtered.length > 0 ? filtered : students;
  }, [students, isChiefFaculty, trainerCourseKey]);

  // Derived Batches from trainer's allocated students
  const batches = React.useMemo(() => {
    if (!myStudents || myStudents.length === 0) return [];
    const map = {};
    myStudents.forEach(st => {
      const key = st.course || `${trainerCourseKey} — Medical Coding`;
      if (!map[key]) {
        map[key] = {
          id: key.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: key,
          timing: st.batchTiming || `${trainerShift.split('–')[0]?.trim() || '8:00 AM'} Daily`,
          mode: st.mode || 'Online',
          module: st.syllabusModule || 'Module 1',
          students: []
        };
      }
      map[key].students.push(st);
    });
    return Object.values(map);
  }, [myStudents, trainerShift, trainerCourseKey]);

  // Derived Weak Students from trainer's allocated students
  const weakStudents = React.useMemo(() => {
    return myStudents
      .filter(s => s.statusGroup === 'on_hold' || (s.attendancePct && s.attendancePct < 80) || s.mockInterview === 'Pending')
      .map((s, idx) => ({
        id: s._id || idx + 1,
        name: s.name,
        studentId: s.studentId,
        course: s.course,
        issue: s.statusGroup === 'on_hold' 
          ? `Enrollment on hold · Fee balance: ${s.feeAmount}` 
          : (s.attendancePct && s.attendancePct < 80)
          ? `Attendance ${s.attendancePct}% · Missed consecutive lectures`
          : `Mock interview pending · Syllabus ${s.syllabusModule || 'Module 1'}`,
        batch: `${s.course} (${s.mode || 'Online'})`,
        dotColor: s.statusGroup === 'on_hold' ? 'bg-rose-500' : 'bg-amber-500',
        dotGradient: s.statusGroup === 'on_hold' ? 'from-rose-400 to-rose-600' : 'from-amber-300 to-amber-500',
        bgTone: s.statusGroup === 'on_hold' ? 'bg-[#fee2e2]/70' : 'bg-[#fef3c7]/70',
        actionPlan: 'Scheduled 1-on-1 concept drill & mentoring session',
        remedialStatus: 'Scheduled'
      }));
  }, [myStudents]);

  // Filter doubts for this trainer's course domain
  const myDoubts = React.useMemo(() => {
    if (!doubts || doubts.length === 0) return [];
    if (isChiefFaculty || trainerCourseKey === 'ALL') return doubts;
    const filtered = doubts.filter(d => {
      const b = (d.batch || '').toUpperCase();
      const t = (d.topic || '').toUpperCase();
      if (trainerCourseKey === 'CPC') return b.includes('CPC') || t.includes('CPC') || t.includes('ICD') || t.includes('CPT');
      if (trainerCourseKey === 'CIC') return b.includes('CIC') || b.includes('IPDRG') || t.includes('DRG') || t.includes('PCS');
      if (trainerCourseKey === 'CPB') return b.includes('CPB') || b.includes('BILL') || t.includes('CMS') || t.includes('UB');
      if (trainerCourseKey === 'CPMA') return b.includes('CPMA') || b.includes('AUDIT') || t.includes('AUDIT');
      return b.includes(trainerCourseKey) || t.includes(trainerCourseKey);
    });
    return filtered.length > 0 ? filtered : doubts;
  }, [doubts, isChiefFaculty, trainerCourseKey]);

  // Demos auto-routed specifically to this trainer based on Course Subject Matter Expertise
  const myExpertDemos = React.useMemo(() => {
    return demos.filter(d => {
      const idMatch = d.trainerId && (d.trainerId === trainerId);
      const nameMatch = d.trainer && (
        d.trainer.toLowerCase().includes(trainerName.toLowerCase()) ||
        trainerName.toLowerCase().includes(d.trainer.toLowerCase())
      );
      const notifMatch = d.notificationSentTo && (
        d.notificationSentTo === trainerId || 
        d.notificationSentToName?.toLowerCase().includes(trainerName.toLowerCase())
      );
      const courseMatch = !isChiefFaculty && (
        (d.course && d.course.toUpperCase().includes(trainerCourseKey)) ||
        (d.expertCourse && d.expertCourse.toUpperCase().includes(trainerCourseKey))
      );
      return idMatch || nameMatch || notifMatch || courseMatch;
    });
  }, [demos, trainerId, trainerName, trainerCourseKey, isChiefFaculty]);

  // High-Priority Demo Notifications dispatched to this trainer first
  // STRICT MULTI-CONDITION RULE: Send notification ONLY when:
  // Trainer = Experienced + Demo time within trainer's shift + Trainer has no class during demo time
  const newDemoAlerts = React.useMemo(() => {
    const list = myExpertDemos.length > 0 ? myExpertDemos : (isChiefFaculty ? demos : []);
    return list.filter(d => 
      (d.status === 'booked' || d.status === 'confirmed') && 
      !d.notificationRead &&
      d.notificationSent === true &&
      (isChiefFaculty || d.notificationSentTo === trainerId || d.trainerId === trainerId || (d.trainer && d.trainer.toLowerCase().includes(trainerName.toLowerCase())))
    );
  }, [myExpertDemos, isChiefFaculty, demos, trainerId, trainerName]);

  const [demoToast, setDemoToast] = useState(null);

  const handleAcknowledgeDemo = async (demoId) => {
    try {
      await acknowledgeDemo(demoId);
      setDemos(prev => prev.map(d => (d._id === demoId || d.id === demoId) ? { ...d, notificationRead: true, status: 'confirmed' } : d));
      setDemoToast('✓ Demo slot acknowledged & confirmed! HR & candidate notified.');
      setTimeout(() => setDemoToast(null), 3500);
    } catch (e) {
      console.warn('Failed to acknowledge demo:', e);
      setDemos(prev => prev.map(d => (d._id === demoId || d.id === demoId) ? { ...d, notificationRead: true, status: 'confirmed' } : d));
      setDemoToast('✓ Demo slot acknowledged!');
      setTimeout(() => setDemoToast(null), 3500);
    }
  };

  // Live session timer countdown
  useEffect(() => {
    let interval = null;
    if (isLiveClassActive && timerRunning) {
      interval = setInterval(() => {
        setSessionTimeSeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLiveClassActive, timerRunning]);

  const formatTimer = (secs) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const syncToTfStore = (studentId, status) => {
    try {
      const existing = JSON.parse(localStorage.getItem('TF_STORE') || '{}');
      if (!existing.attendance) existing.attendance = {};
      existing.attendance[studentId] = { status, date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString() };
      localStorage.setItem('TF_STORE', JSON.stringify(existing));
      setTfStoreSyncToast(true);
      setTimeout(() => setTfStoreSyncToast(false), 2500);

      // Record to backend API
      recordTrainerAttendance({
        batch: batches[0]?.name || 'Batch 01',
        date: new Date().toISOString().split('T')[0],
        records: { [studentId]: status }
      }).catch(err => console.warn('recordTrainerAttendance error', err));
    } catch (e) {
      console.warn('TF_STORE sync error', e);
    }
  };

  const [classChat, setClassChat] = useState([
    { id: 1, sender: 'Keerthana R.', text: 'Sir, for code 43239, does biopsy include removal?', time: '7:14 AM' },
    { id: 2, sender: `${trainerName} (You)`, text: 'Biopsy is separate from polypectomy. We will review modifier 59 rules today.', time: '7:16 AM' },
    { id: 3, sender: 'Ajith Kumar A.', text: 'Audio and lecture slide are crystal clear!', time: '7:18 AM' }
  ]);

  const handleSendClassChat = (e) => {
    e.preventDefault();
    if (!classChatMsg.trim()) return;
    setClassChat(prev => [...prev, {
      id: Date.now(),
      sender: `${trainerName} (You)`,
      text: classChatMsg,
      time: 'Just now'
    }]);
    setClassChatMsg('');
  };

  const handleResolveDoubt = async () => {
    if (!activeDoubtModal || !doubtReplyText.trim()) return;
    try {
      await replyTrainerDoubt(activeDoubtModal.id, doubtReplyText);
    } catch (e) {
      console.warn('reply error fallback', e);
    }
    setDoubts(prev => prev.map(d => d.id === activeDoubtModal.id ? { ...d, status: 'Replied', reply: doubtReplyText } : d));
    setActiveDoubtModal(null);
    setDoubtReplyText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-[#0c1921] text-slate-800 antialiased font-sans select-none overflow-hidden animate-fadeIn">
      
      {/* ================= LEFT SIDEBAR ================= */}
      <aside className="w-64 sm:w-72 bg-[#0c1921] border-r border-[#172d3b] flex flex-col justify-between shrink-0 overflow-y-auto">
        <div>
          {/* Top Logo Card */}
          <div className="p-4 pb-2">
            <div className="bg-white rounded-2xl p-3 shadow-sm flex items-center justify-center border border-slate-100">
              <img
                src="/thoughtflows-logo.png"
                alt="Thoughtflows"
                className="h-7 w-auto object-contain"
              />
            </div>
          </div>

          {/* User Profile Badge */}
          <div className="px-4 py-2">
            <div className="bg-[#162734] border border-[#213a4d] rounded-2xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0284c7] text-white flex items-center justify-center font-bold text-base shadow-sm">
                {trainerName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-bold truncate">{trainerName}</div>
                <div className="text-[#649297] text-[11px] font-medium truncate">{trainerId} · {trainerBranch}</div>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 py-2 space-y-4 text-xs">
            
            {/* DAILY SECTION */}
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
                  onClick={() => setActiveNav('attendance')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeNav === 'attendance'
                      ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                      : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                  }`}
                >
                  <CheckSquare className="w-4 h-4 shrink-0" />
                  <span>Attendance</span>
                </button>

                <button
                  onClick={() => setActiveNav('demos')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeNav === 'demos'
                      ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                      : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                  }`}
                >
                  <AtSign className="w-4 h-4 shrink-0" />
                  <span>Demos</span>
                </button>

                <button
                  onClick={() => setActiveNav('doubts')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeNav === 'doubts'
                      ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                      : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span>Doubt Box</span>
                </button>
              </div>
            </div>

            {/* GROWTH SECTION */}
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
                  <Star className="w-4 h-4 shrink-0" />
                  <span>My Scorecard</span>
                </button>

                <button
                  onClick={() => setActiveNav('incentives')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeNav === 'incentives'
                      ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                      : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                  }`}
                >
                  <List className="w-4 h-4 shrink-0" />
                  <span>My Incentive Ledger</span>
                </button>
              </div>
            </div>

            {/* ACADEMIC SECTION */}
            <div>
              <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-[#476b74]">
                ACADEMIC
              </div>
              <div className="space-y-1">
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

                <button
                  onClick={() => setActiveNav('weak_students')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeNav === 'weak_students'
                      ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                      : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Weak Students</span>
                </button>

                <button
                  onClick={() => setActiveNav('assessments')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeNav === 'assessments'
                      ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                      : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                  }`}
                >
                  <FileCheck className="w-4 h-4 shrink-0" />
                  <span>Assessments</span>
                </button>

                <button
                  onClick={() => setActiveNav('library')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeNav === 'library'
                      ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                      : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>Library & Materials</span>
                </button>
              </div>
            </div>

            {/* PLACEMENT SECTION */}
            <div>
              <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-[#476b74]">
                PLACEMENT
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveNav('placement')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeNav === 'placement'
                      ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                      : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                  }`}
                >
                  <Send className="w-4 h-4 shrink-0" />
                  <span>Placement Prep</span>
                </button>
              </div>
            </div>

            {/* ME SECTION */}
            <div>
              <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-[#476b74]">
                ME
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveNav('profile')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeNav === 'profile'
                      ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                      : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                  }`}
                >
                  <User className="w-4 h-4 shrink-0" />
                  <span>My Profile</span>
                </button>

                <button
                  onClick={() => setActiveNav('skills')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeNav === 'skills'
                      ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                      : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                  }`}
                >
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>Skills & Courses</span>
                </button>

                <button
                  onClick={() => setActiveNav('shift')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeNav === 'shift'
                      ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                      : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                  }`}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Shift & Availability</span>
                </button>
              </div>
            </div>

          </nav>
        </div>

        {/* Logout Bottom Action */}
        <div className="p-4 border-t border-[#172d3b]">
          <button
            onClick={onLogout || onClose}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-rose-300 hover:text-white hover:bg-rose-900/60 transition-all text-xs font-semibold cursor-pointer shadow-xs"
            title="Sign Out of Trainer Portal"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className="flex-1 bg-[#f4f7f8] overflow-y-auto flex flex-col">
        
        {/* TOP HEADER */}
        <header className="px-6 py-4 border-b border-slate-200/80 bg-white/70 backdrop-blur-sm sticky top-0 z-20 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-[#0f242d] tracking-tight">
              {activeNav === 'home' && 'Home'}
              {activeNav === 'session_room' && 'Class Session Room'}
              {activeNav === 'attendance' && 'Daily Student Attendance'}
              {activeNav === 'demos' && 'Demos'}
              {activeNav === 'doubts' && 'Student Doubt Box'}
              {activeNav === 'scorecard' && 'My Scorecard'}
              {activeNav === 'incentives' && 'Incentive Ledger'}
              {activeNav === 'batches' && 'My Batches'}
              {activeNav === 'students' && 'My Students'}
              {activeNav === 'weak_students' && 'Weak Students'}
              {activeNav === 'assessments' && 'Assessment Desk'}
              {activeNav === 'library' && 'Library & Materials'}
              {activeNav === 'placement' && 'Placement & Certification Recommendation'}
              {activeNav === 'profile' && 'My Profile'}
              {activeNav === 'skills' && 'Skill & Course Mapping'}
              {activeNav === 'shift' && "Today's Load & Shift Availability"}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {activeNav === 'home' && 'Your day at a glance'}
              {activeNav === 'session_room' && 'Run a live session'}
              {activeNav === 'demos' && 'HR–allocated demos'}
              {activeNav === 'doubts' && 'SLA–tracked'}
              {activeNav === 'scorecard' && 'Action score · zone · variable pay'}
              {activeNav === 'incentives' && 'Cash events · share split · monthly take'}
              {activeNav === 'batches' && `${batches.length} active batches · ${myStudents.length} students`}
              {activeNav === 'students' && 'Allocated students · module-wise'}
              {activeNav === 'weak_students' && 'Auto-flagged drop-out risk · remediation'}
              {activeNav === 'assessments' && 'Weekly tests · mock exams · rationale'}
              {activeNav === 'library' && 'Coding books · PPTs · LMS'}
              {activeNav === 'placement' && "Mark each student's readiness · CCCP Certification Cell sync"}
              {activeNav === 'profile' && `${trainerName} · ${trainerId} · ${trainerRole} · ${trainerBranch}`}
              {activeNav === 'skills' && 'L1 Assistant · L2 Regular · L3 Senior · L4 Lead. You can be allocated to a subject only at L2 or above.'}
              {activeNav === 'shift' && `${trainerShift} · Max load protection`}
              {activeNav !== 'home' && activeNav !== 'session_room' && activeNav !== 'demos' && activeNav !== 'doubts' && activeNav !== 'scorecard' && activeNav !== 'incentives' && activeNav !== 'batches' && activeNav !== 'students' && activeNav !== 'weak_students' && activeNav !== 'assessments' && activeNav !== 'library' && activeNav !== 'placement' && activeNav !== 'profile' && activeNav !== 'skills' && activeNav !== 'shift' && `Thoughtflows Medical Coding Academy · ${trainerBranch}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onLogout || onClose}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Toast for Demo Actions */}
        {demoToast && (
          <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-teal-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>{demoToast}</span>
          </div>
        )}

        {/* VIEW CONTAINER */}
        <div className="p-6 max-w-[1400px] w-full mx-auto space-y-6 flex-1">

          {/* ================= TAB 1: HOME (EXACT MATCH TO REFERENCE SCREENSHOT) ================= */}
          {activeNav === 'home' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT & CENTER COLUMN (8 COLS) */}
              <div className="lg:col-span-8 space-y-5">
                
                {/* 1. Welcome Card with 5 Metrics */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#009688]"></div>
                  
                  <div className="pl-2">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                      Welcome back, {trainerName} <span className="text-lg">👋</span>
                    </h2>
                    <p className="text-[11px] font-medium text-slate-500 tracking-wide mt-0.5">
                      {trainerId} · {trainerRole} · {trainerBranch} · Shift {trainerShift}
                    </p>

                    {/* 5 Stats row */}
                    <div className="grid grid-cols-5 gap-2 mt-5 pt-4 border-t border-slate-100">
                      <div>
                        <div className="text-2xl font-black text-slate-900">{batches.length > 0 ? batches.length + 1 : 3}</div>
                        <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">SESSIONS</div>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-slate-900">
                          {(myExpertDemos.length > 0 ? myExpertDemos : demos).filter(d => d.status?.toLowerCase() !== 'attended').length}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">DEMO</div>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-slate-900">{batches.length}</div>
                        <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">BATCHES</div>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-slate-900">{myStudents.length}</div>
                        <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">STUDENTS</div>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-slate-900">{myDoubts.filter(d => d.status !== 'Replied').length}</div>
                        <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">DOUBTS</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Next Session Dark Card */}
                <div className="bg-[#0b242c] rounded-2xl p-6 text-white border border-[#16414e] shadow-md relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black tracking-widest uppercase text-[#00c9b7] bg-[#00c9b7]/10 px-2.5 py-1 rounded-md border border-[#00c9b7]/20">
                        NEXT SESSION
                      </span>
                      <h3 className="text-xl font-bold text-white pt-1">
                        {batches[0]?.name || `${trainerCourseKey} — Medical Coding Core`}
                      </h3>
                      <p className="text-xs text-slate-300 font-medium">
                        {batches[0]?.timing || `${trainerShift.split('–')[0]?.trim() || '8:00 AM'} Daily`} · {batches[0]?.mode || 'Online'} · {batches[0]?.students?.length || myStudents.length} students enrolled
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveNav('session_room')}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-sm font-bold shadow-lg shadow-[#009688]/30 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Enter Session Room
                    </button>
                  </div>
                </div>

                {/* 3. Demo Alert Banner - Prioritized for Course Subject Matter Expert */}
                {newDemoAlerts.length > 0 ? (
                  <div className="bg-gradient-to-r from-amber-50 via-teal-50/70 to-emerald-50 border-2 border-teal-500 rounded-2xl p-5 shadow-md relative overflow-hidden animate-fadeIn">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="relative shrink-0 mt-0.5">
                          <div className="w-12 h-12 rounded-2xl bg-[#00897b] text-white flex items-center justify-center text-xl shadow-sm">
                            🎯
                          </div>
                          <span className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 text-[9px] font-black text-white items-center justify-center">
                              {newDemoAlerts.length}
                            </span>
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase bg-teal-800 text-white shadow-xs">
                              ⚡ NOTIFICATION SENT TO YOU FIRST
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              ★ Course Subject Matter Expert: {newDemoAlerts[0].course}
                            </span>
                          </div>
                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                            New Demo Booked: <span className="text-[#00897b]">{newDemoAlerts[0].candidateName}</span> <span className="font-mono text-xs font-semibold text-slate-500">({newDemoAlerts[0].phone})</span>
                          </h3>
                          <p className="text-xs text-slate-600 font-medium">
                            Slot: <strong className="text-slate-900">{newDemoAlerts[0].time || newDemoAlerts[0].timeSlot || 'Today'}</strong> · Mode: <strong className="text-slate-800">{newDemoAlerts[0].mode || 'Online Live'}</strong> · Language: <strong className="text-slate-800">{newDemoAlerts[0].language || 'Tamil'}</strong>
                          </p>
                          <div className="text-[11px] text-teal-900 font-semibold pt-0.5 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>You are designated expert faculty for this course. Please accept the slot to confirm your session.</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col gap-2 shrink-0 justify-end">
                        <button
                          onClick={() => handleAcknowledgeDemo(newDemoAlerts[0]._id || newDemoAlerts[0].id)}
                          className="px-4 py-2.5 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Accept Demo Slot</span>
                        </button>
                        <button
                          onClick={() => setActiveNav('demos')}
                          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Open Demos Desk ({myExpertDemos.length || demos.length})</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#fffbeb] border border-[#fde68a] rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-[#fef3c7] border border-[#fde68a] flex items-center justify-center text-lg shrink-0">
                        🎯
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {myExpertDemos[0] 
                            ? `DEMO DESK · ${myExpertDemos[0].course} · ${myExpertDemos[0].time || 'Confirmed'}` 
                            : 'DEMO DESK · All Course Expert Demos Handled'}
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium">
                          {myExpertDemos[0] 
                            ? `${myExpertDemos[0].candidateName} · ${myExpertDemos[0].mode || 'Online Live'} · Assigned to you as Subject Matter Expert.`
                            : 'All demo webinars up to date. Newly booked demos in your course expertise will alert you first.'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveNav('demos')}
                      className="px-5 py-2 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
                    >
                      Open Desk
                    </button>
                  </div>
                )}

                {/* 4. Quick 4-Metric Tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  
                  {/* Metric 1 */}
                  <div 
                    onClick={() => setActiveNav('doubts')}
                    className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm cursor-pointer hover:border-teal-400 transition-all"
                  >
                    <div className="text-2xl font-black text-[#f59e0b]">{myDoubts.filter(d => d.status !== 'Replied').length}</div>
                    <div className="text-xs text-slate-600 font-medium mt-1">Pending doubts</div>
                  </div>

                  {/* Metric 2 */}
                  <div 
                    onClick={() => setActiveNav('attendance')}
                    className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm cursor-pointer hover:border-teal-400 transition-all"
                  >
                    <div className="text-2xl font-black text-[#f59e0b]">{myStudents.filter(s => s.statusGroup === 'on_hold').length}</div>
                    <div className="text-xs text-slate-600 font-medium mt-1">Attendance alert</div>
                  </div>

                  {/* Metric 3 */}
                  <div 
                    onClick={() => setActiveNav('weak_students')}
                    className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm cursor-pointer hover:border-teal-400 transition-all"
                  >
                    <div className="text-2xl font-black text-[#ef4444]">{weakStudents.length}</div>
                    <div className="text-xs text-slate-600 font-medium mt-1">Weak students</div>
                  </div>

                  {/* Metric 4 */}
                  <div 
                    onClick={() => setActiveNav('demos')}
                    className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm cursor-pointer hover:border-teal-400 transition-all"
                  >
                    <div className="text-2xl font-black text-slate-800">{(myExpertDemos.length > 0 ? myExpertDemos : demos).filter(d => d.status === 'attended' || d.status === 'confirmed').length}</div>
                    <div className="text-xs text-slate-600 font-medium mt-1">Demos done</div>
                  </div>

                </div>

                {/* 5. Today's Sessions Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>📅</span> Today's Sessions
                    </div>
                    <span className="text-xs text-slate-500 font-medium">{batches.length} batches active</span>
                  </div>

                  <div className="space-y-2.5">
                    {batches.length > 0 ? (
                      batches.map((batch, idx) => (
                        <div key={batch.id} className="p-3.5 rounded-xl border border-slate-200/90 hover:border-teal-400/80 transition-all flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                              {idx === 0 ? <Play className="w-4 h-4 fill-slate-700 text-slate-700" /> : <Clock className="w-4 h-4 text-slate-600" />}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900">{batch.name}</div>
                              <div className="text-[11px] text-slate-500">{batch.timing} · {batch.mode} · {batch.students.length} students</div>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                            idx === 0 ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {idx === 0 ? 'Next' : 'Upcoming'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="py-4 text-center text-xs text-slate-500">No active batches assigned.</div>
                    )}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN (4 COLS) */}
              <div className="lg:col-span-4 space-y-5">
                
                {/* 1. Pending Doubts Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-sm">💬</span> Pending Doubts
                    </div>
                    <button
                      onClick={() => setActiveNav('doubts')}
                      className="text-xs font-bold text-[#00897b] hover:underline"
                    >
                      All ({myDoubts.filter(d => d.status !== 'Replied').length})
                    </button>
                  </div>

                  <div className="space-y-3">
                    {myDoubts.filter(d => d.status !== 'Replied').slice(0, 2).map(item => (
                      <div 
                        key={item.id}
                        onClick={() => {
                          setActiveDoubtModal(item);
                          setActiveNav('doubts');
                        }}
                        className="p-3 rounded-xl border border-slate-100 hover:border-teal-300 transition-all flex items-center gap-3 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 text-xs font-bold">
                          💬
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 truncate">{item.student} · {item.topic}</div>
                          <div className="text-[11px] text-slate-500">{item.timeText} · {item.slaBadge}</div>
                        </div>
                      </div>
                    ))}
                    {myDoubts.filter(d => d.status !== 'Replied').length === 0 && (
                      <div className="py-3 text-center text-xs text-slate-500">All doubts resolved ✓</div>
                    )}
                  </div>
                </div>

                {/* 2. Weak Students Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-sm">⚠️</span> Weak Students
                    </div>
                    <button
                      onClick={() => setActiveNav('weak_students')}
                      className="text-xs font-bold text-[#00897b] hover:underline"
                    >
                      All ({weakStudents.length})
                    </button>
                  </div>

                  <div className="space-y-3">
                    {weakStudents.slice(0, 2).map(st => (
                      <div 
                        key={st.id}
                        onClick={() => setActiveNav('weak_students')}
                        className="p-3 rounded-xl border border-slate-100 hover:border-teal-300 transition-all flex items-start gap-3 cursor-pointer"
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${st.dotColor} shrink-0 mt-0.5`}></span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900">{st.name}</div>
                          <div className="text-[11px] text-slate-600 leading-tight mt-0.5 truncate">
                            {st.issue}
                          </div>
                        </div>
                      </div>
                    ))}
                    {weakStudents.length === 0 && (
                      <div className="py-3 text-center text-xs text-slate-500">No students flagged as drop-out risk.</div>
                    )}
                  </div>
                </div>

                {/* 3. Performance Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm text-center space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-left">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="text-sm">⭐</span> Performance
                    </div>
                    <button
                      onClick={() => setActiveNav('scorecard')}
                      className="text-xs font-bold text-[#00897b] hover:underline"
                    >
                      View
                    </button>
                  </div>

                  <div className="py-5">
                    <div className="text-5xl font-black text-slate-900 tracking-tight">
                      {Math.round((students.reduce((acc, s) => acc + (s.attendancePct || 92), 0) / (students.length || 1)) * 0.95)}
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-1">/ 100 · rating 4.8★</div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ================= TAB 2: CLASS SESSION ROOM ================= */}
          {activeNav === 'session_room' && (
            <div className="space-y-5 max-w-[1280px]">
              {!isLiveClassActive ? (
                /* PRE-SESSION LANDING VIEW (EXACT MATCH TO REFERENCE SCREENSHOT) */
                <div className="space-y-5 animate-fadeIn">
                  {/* Top Dark Banner Card */}
                  <div className="bg-[#0f212d] rounded-2xl p-6 sm:p-7 text-white border border-[#1b3446] shadow-sm">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {batches[0]?.module || 'Anatomy — Digestive System'}
                    </h2>
                    <p className="text-xs text-slate-200 font-medium mt-1.5">
                      {batches[0]?.name || 'CPC Morning Batch 03'} · {batches[0]?.students?.length || attendanceList.length || 42} students · {batches[0]?.mode || 'Online'} · {batches[0]?.timing || '7:00 AM – 9:00 AM'}
                    </p>
                    <p className="text-xs text-[#5aa8b7] font-medium mt-1">
                      {batches[0]?.name || 'CPC'} — {batches[0]?.module || 'Anatomy — Ch. 9'}
                    </p>
                  </div>

                  {/* Before You Start Card */}
                  <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900 pb-2">
                      Before You Start
                    </h3>

                    <div className="divide-y divide-slate-100 text-xs">
                      <div className="py-3.5 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Linked PPT</span>
                        <span className="font-bold text-slate-900">Digestive System v3.pptx</span>
                      </div>

                      <div className="py-3.5 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Reference</span>
                        <span className="font-bold text-slate-900">ICD-10-CM Ch.9 PDF</span>
                      </div>

                      <div className="py-3.5 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Session link</span>
                        <span className="font-bold text-slate-900">Zoom · primary + backup ready</span>
                      </div>

                      <div className="py-3.5 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Students</span>
                        <span className="font-bold text-slate-900">{batches[0]?.students?.length || attendanceList.length || 42}</span>
                      </div>
                    </div>
                  </div>

                  {/* Big Teal Action Button */}
                  <button
                    onClick={() => {
                      setIsLiveClassActive(true);
                      setTimerRunning(true);
                    }}
                    className="w-full py-4 rounded-2xl bg-[#009688] hover:bg-[#00897b] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-[#009688]/20 transition-all hover:scale-[1.005] active:scale-[0.995]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Session (opens attendance + timer)</span>
                  </button>
                </div>
              ) : (
                /* ACTIVE LIVE CLASSROOM WITH ATTENDANCE & RUNNING TIMER */
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Top Classroom Bar */}
                  <div className="bg-[#0b242c] p-5 rounded-2xl border border-[#16414e] text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                          LIVE SESSION IN PROGRESS
                        </span>
                        
                        {/* Live Timer Counter */}
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-mono font-bold text-amber-300">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatTimer(sessionTimeSeconds)} remaining</span>
                          <button
                            onClick={() => setTimerRunning(!timerRunning)}
                            className="ml-1 text-[10px] text-slate-400 hover:text-white underline"
                          >
                            {timerRunning ? 'Pause' : 'Resume'}
                          </button>
                        </div>
                      </div>

                      <h2 className="text-xl font-extrabold text-white mt-1.5">{batches[0]?.module || 'Anatomy — Digestive System (Ch. 9)'}</h2>
                      <p className="text-xs text-slate-300">{batches[0]?.name || 'CPC Morning Batch 03'} · {batches[0]?.students?.length || attendanceList.length || 42} Students · Zoom Primary Stream Connected</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => setMicActive(!micActive)}
                        title={micActive ? "Mute Microphone" : "Unmute Microphone"}
                        className={`p-3 rounded-xl text-sm font-semibold transition-all ${
                          micActive ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 text-white'
                        }`}
                      >
                        {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                      </button>

                      <button 
                        onClick={() => setCamActive(!camActive)}
                        title={camActive ? "Turn Off Video" : "Turn On Video"}
                        className={`p-3 rounded-xl text-sm font-semibold transition-all ${
                          camActive ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 text-white'
                        }`}
                      >
                        {camActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                      </button>

                      <button 
                        onClick={() => setIsScreenSharing(!isScreenSharing)}
                        className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                          isScreenSharing ? 'bg-teal-500 text-white' : 'bg-[#15343e] hover:bg-[#1d4653] text-slate-200'
                        }`}
                      >
                        <MonitorUp className="w-4 h-4" />
                        {isScreenSharing ? 'Stop Screen' : 'Share Screen'}
                      </button>

                      <button 
                        onClick={() => setActiveNav('attendance')}
                        className="px-3.5 py-2.5 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Attendance</span>
                      </button>

                      <button 
                        onClick={() => {
                          if (window.confirm('End class session and sync student attendance?')) {
                            setIsLiveClassActive(false);
                            setTimerRunning(false);
                          }
                        }}
                        className="px-4 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white text-xs font-bold"
                      >
                        End Class
                      </button>
                    </div>
                  </div>

                  {/* Classroom Layout: Presentation Slide Canvas + Live Doubt Stream */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Main Presentation Board (8 cols) */}
                    <div className="lg:col-span-8 space-y-4">
                      
                      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 min-h-[440px] flex flex-col justify-between text-white relative shadow-lg">
                        
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="text-xs font-bold text-teal-300">
                            Digestive System v3.pptx · Slide {activeBoardSlide} of 4 (CPT 43000 – 49999)
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setActiveBoardSlide(Math.max(1, activeBoardSlide - 1))}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold"
                            >
                              ‹ Prev
                            </button>
                            <span className="text-xs text-slate-400 font-mono">{activeBoardSlide}/4</span>
                            <button 
                              onClick={() => setActiveBoardSlide(Math.min(4, activeBoardSlide + 1))}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold"
                            >
                              Next ›
                            </button>
                          </div>
                        </div>

                        {/* Interactive Slide Content */}
                        <div className="my-auto py-6">
                          {activeBoardSlide === 1 && (
                            <div className="space-y-4">
                              <span className="px-2.5 py-1 rounded bg-teal-500/20 text-teal-300 text-[11px] font-mono font-bold">
                                SLIDE 1: UPPER GI ENDOSCOPY (EGD)
                              </span>
                              <h3 className="text-2xl font-bold text-white">CPT 43235 vs 43239 — Biopsy Distinction</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <div className="p-4 rounded-xl bg-slate-800/80 border border-teal-500/30">
                                  <div className="text-xs font-bold text-teal-300">CPT 43235 (Diagnostic)</div>
                                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                    Esophagogastroduodenoscopy, flexible, transoral; diagnostic, including specimen brushing/washing.
                                  </p>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-800/80 border border-teal-500/30">
                                  <div className="text-xs font-bold text-teal-300">CPT 43239 (With Biopsy)</div>
                                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                    EGD with biopsy, single or multiple. Never bill 43235 with 43239; diagnostic is bundled into surgical biopsy.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {activeBoardSlide === 2 && (
                            <div className="space-y-4">
                              <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 text-[11px] font-mono font-bold">
                                SLIDE 2: LOWER GI — COLONOSCOPY SCOPE DEPTH
                              </span>
                              <h3 className="text-2xl font-bold text-white">Extent of Scope Determines Coding</h3>
                              <ul className="space-y-2 text-xs text-slate-300 list-disc pl-5">
                                <li><strong className="text-white">Anoscopy (46600):</strong> Examines anal canal only.</li>
                                <li><strong className="text-white">Sigmoidoscopy (45330):</strong> Scope extends past splenic flexure to descending/sigmoid colon.</li>
                                <li><strong className="text-white">Colonoscopy (45378):</strong> Scope reaches the cecum or terminal ileum. If cecum not reached, append Modifier 53 or 52.</li>
                              </ul>
                            </div>
                          )}

                          {activeBoardSlide === 3 && (
                            <div className="space-y-4">
                              <span className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 text-[11px] font-mono font-bold">
                                SLIDE 3: MULTIPLE POLYPECTOMY TECHNIQUES
                              </span>
                              <h3 className="text-2xl font-bold text-white">Different Polypectomies at Same Session</h3>
                              <div className="p-4 rounded-xl bg-purple-900/30 border border-purple-500/40 text-xs text-slate-200">
                                <strong>AAPC Rule:</strong> If cold biopsy forceps (45380) is used in ascending colon AND snare technique (45385) is used in descending colon, both are billed!
                                Append <strong>Modifier 59</strong> or <strong>XS</strong> to code 45380 to indicate separate anatomical sites.
                              </div>
                            </div>
                          )}

                          {activeBoardSlide === 4 && (
                            <div className="space-y-4 text-center">
                              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                                LIVE POP QUIZ FOR BATCH 03
                              </span>
                              <h3 className="text-xl font-bold text-white mt-2">
                                A physician performs an EGD with hot biopsy of a gastric polyp and snare polypectomy of a duodenal polyp. Which codes apply?
                              </h3>
                              <div className="inline-block text-left p-4 rounded-xl bg-slate-800 text-xs text-slate-300 mt-2 space-y-1">
                                <div>A) 43239 only</div>
                                <div className="text-emerald-400 font-bold">B) 43251 and 43250-59 (Correct!)</div>
                                <div>C) 43235 and 43251</div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Bottom Status Indicator */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-3">
                          <span>Live Attendees: {Math.max(1, (batches[0]?.students?.length || attendanceList.length || 42) - 1)}/{batches[0]?.students?.length || attendanceList.length || 42} logged in</span>
                          <button
                            onClick={() => setIsLiveClassActive(false)}
                            className="text-teal-300 hover:underline"
                          >
                            ‹ Back to Session Setup
                          </button>
                        </div>

                      </div>

                    </div>

                    {/* Live Doubt & Chat Box (4 cols) */}
                    <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm flex flex-col justify-between h-[480px]">
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <MessageSquare className="w-4 h-4 text-[#00897b]" />
                            <span>Live Session Questions</span>
                          </div>
                          <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-bold">
                            3 New
                          </span>
                        </div>

                        {/* Chat Stream */}
                        <div className="space-y-3 mt-3 overflow-y-auto max-h-[340px] pr-1">
                          {classChat.map(item => (
                            <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800">{item.sender}</span>
                                <span className="text-[10px] text-slate-400">{item.time}</span>
                              </div>
                              <p className="text-slate-600">{item.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Reply Input Form */}
                      <form onSubmit={handleSendClassChat} className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                        <input
                          type="text"
                          value={classChatMsg}
                          onChange={(e) => setClassChatMsg(e.target.value)}
                          placeholder="Type explanation to class..."
                          className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-2 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold shrink-0"
                        >
                          Send
                        </button>
                      </form>
                    </div>

                  </div>

                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: ATTENDANCE ================= */}
          {activeNav === 'attendance' && (
            <div className="space-y-6 max-w-[1280px]">
              
              {/* Toast when TF_STORE updates */}
              {tfStoreSyncToast && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-fadeIn">
                  <span>✓ Record saved to shared student record (TF_STORE). Synced with Student LMS & Leadership Hub.</span>
                  <span className="text-[10px] text-emerald-600 font-mono font-bold">TF_STORE SYNCED</span>
                </div>
              )}

              {/* Exact Live Attendance Card matching screenshot */}
              <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-[#22c55e] text-white flex items-center justify-center text-xs font-black shadow-sm">
                      ✓
                    </div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                      Live Attendance
                    </h2>
                  </div>

                  {/* Switcher to load or unload spine roster */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRosterLoaded(!rosterLoaded)}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-all active:scale-[0.98]"
                    >
                      {rosterLoaded ? 'Unload Roster (Show Empty Spine)' : 'Load Batch 03 Spine Roster'}
                    </button>
                    {rosterLoaded && (
                      <button
                        onClick={() => {
                          setAttendanceList(prev => prev.map(s => {
                            syncToTfStore(s.roll, 'Present');
                            return { ...s, status: 'Present' };
                          }));
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
                      >
                        Mark All Present
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Mark today's class. This updates the student's own dashboard <strong className="font-bold text-slate-900">and</strong> the dropout–risk view for the Branch Manager & Operational Head — instantly.
                </p>

                <div className="p-3.5 rounded-2xl bg-[#f7fafb] border border-[#e5eef2] flex items-center gap-2.5 text-xs text-[#527482]">
                  <span className="text-sm shrink-0">🔗</span>
                  <span>Connected: every mark writes to the shared student record (TF_STORE). One source of truth across all roles.</span>
                </div>

                {!rosterLoaded ? (
                  /* EXACT EMPTY STATE IN SCREENSHOT */
                  <div className="py-2 text-xs text-slate-500 font-medium">
                    No students in the spine roster yet.
                  </div>
                ) : (
                  /* POPULATED SPINE ROSTER TABLE */
                  <div className="pt-2 space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100">
                      <span className="font-bold text-slate-800">{batches[0]?.name || 'CPC Morning Batch 03'} · {attendanceList.length} Students</span>
                      <span>Session: {batches[0]?.module || 'Anatomy — Digestive System'} · {batches[0]?.timing || '7:00 AM – 9:00 AM'}</span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-4 font-bold">Roll ID</th>
                            <th className="py-3 px-4 font-bold">Student Name</th>
                            <th className="py-3 px-4 font-bold">Cumulative Attendance</th>
                            <th className="py-3 px-4 font-bold">Live Class Status</th>
                            <th className="py-3 px-4 font-bold text-right">Quick Mark</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {attendanceList.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50/70 transition-all">
                              <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.roll}</td>
                              <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                              <td className="py-3 px-4">
                                <span className={`font-bold ${s.attendancePct < 75 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {s.attendancePct}%
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  s.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  s.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {s.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right space-x-1.5">
                                <button
                                  onClick={() => {
                                    setAttendanceList(prev => prev.map(item => item.id === s.id ? { ...item, status: 'Present' } : item));
                                    syncToTfStore(s.roll, 'Present');
                                  }}
                                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-[10px] font-bold transition-all"
                                >
                                  P
                                </button>
                                <button
                                  onClick={() => {
                                    setAttendanceList(prev => prev.map(item => item.id === s.id ? { ...item, status: 'Late' } : item));
                                    syncToTfStore(s.roll, 'Late');
                                  }}
                                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-[10px] font-bold transition-all"
                                >
                                  L
                                </button>
                                <button
                                  onClick={() => {
                                    setAttendanceList(prev => prev.map(item => item.id === s.id ? { ...item, status: 'Absent' } : item));
                                    syncToTfStore(s.roll, 'Absent');
                                  }}
                                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-rose-100 hover:text-rose-800 text-[10px] font-bold transition-all"
                                >
                                  A
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ================= TAB 4: DEMOS (SUBJECT MATTER EXPERT AUTO-ROUTING) ================= */}
          {activeNav === 'demos' && (
            <div className="space-y-6 max-w-[1280px]">
              
              {/* Top Banner: Demo Sessions & Expert Routing Policy */}
              <div className="bg-[#0f212d] rounded-2xl p-6 sm:p-7 text-white border border-[#1b3446] shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎯</span>
                    <h2 className="text-lg font-bold text-white">Demo Sessions · Course Expert Auto-Routing</h2>
                  </div>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    When a student books a demo, our system matches the chosen course to that subject's <strong className="text-white font-bold">Designated Faculty Expert</strong>. The demo notification is <strong className="text-emerald-400 font-bold">dispatched directly to that trainer first</strong>. Run the demo session, then mark <strong className="text-white font-bold">Attended</strong> or <strong className="text-white font-bold">Missed</strong> to sync live with HR.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>1st Priority Routing Active</span>
                  </span>
                </div>
              </div>

              {/* Priority Notifications Alert Section (if pending urgent demo alerts) */}
              {newDemoAlerts.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 via-teal-50 to-emerald-50 border-2 border-teal-500 rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔔</span>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                        Urgent Demo Booking Notifications — Sent to You First ({newDemoAlerts.length})
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-200 text-amber-900 border border-amber-300 uppercase tracking-wide">
                      Awaiting Acknowledgment
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {newDemoAlerts.map(alert => (
                      <div key={alert._id || alert.id} className="bg-white rounded-xl p-4 border border-teal-300 shadow-xs flex flex-col justify-between space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-slate-900 text-sm">{alert.candidateName}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 border border-teal-200">
                              ★ Course SME Matched
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-[#00897b]">
                            {alert.course}
                          </div>
                          <div className="text-[11px] text-slate-600 font-medium">
                            Phone: <span className="font-mono font-bold text-slate-800">{alert.phone}</span> · Slot: <span className="font-bold text-slate-800">{alert.time || alert.timeSlot || 'Today'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Mode: {alert.mode || 'Online'} · Language: {alert.language || 'Tamil'}
                          </div>
                          {alert.trainerMapping && (
                            <div className="text-[10.5px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                              {alert.trainerMapping}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                          <button
                            onClick={() => handleAcknowledgeDemo(alert._id || alert.id)}
                            className="flex-1 py-2 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Accept Demo Slot</span>
                          </button>
                          <button
                            onClick={() => setActiveNav('session_room')}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Room</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Card 2: HR–Booked Demos · Your Course Expert Bucket */}
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🎴</span>
                    <h3 className="text-base font-bold text-slate-900">
                      Your Course Expert Demo Bucket
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">
                      ({trainerName} · {trainerRole})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDemoBucket(!showDemoBucket)}
                      className="text-[11px] text-[#00897b] font-semibold hover:underline cursor-pointer"
                    >
                      {showDemoBucket ? 'Toggle View' : 'Show All'}
                    </button>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 font-mono">
                      {myExpertDemos.length > 0 ? `${myExpertDemos.length} assigned to you` : `${demos.length} academy total`}
                    </span>
                  </div>
                </div>

                {!showDemoBucket || (myExpertDemos.length === 0 && demos.length === 0) ? (
                  <div className="py-8 text-center text-xs text-slate-500 font-medium">
                    No upcoming demos booked for your course expertise right now.
                  </div>
                ) : (
                  <div className="pt-2 space-y-4 animate-fadeIn">
                    <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {(myExpertDemos[0] || demos[0])?.course || 'CPC Intensive Medical Coding'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                            {(myExpertDemos[0] || demos[0])?.time || 'Scheduled Today'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          {(myExpertDemos.length > 0 ? myExpertDemos : demos).length} candidate demo session(s) allocated to your faculty desk · Zoom Room 2 Ready
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveNav('session_room')}
                        className="px-4 py-2 rounded-xl bg-[#00897b] hover:bg-[#00897b] text-white text-xs font-bold shadow-sm shrink-0 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start Demo Session</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
                      {(myExpertDemos.length > 0 ? myExpertDemos : demos).map((lead, idx) => (
                        <div key={lead._id || lead.id || idx} className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-teal-400/80 transition-all text-xs space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 text-[13px]">{lead.candidateName || lead.name || `Candidate #${idx + 1}`}</span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                              lead.status?.toLowerCase() === 'attended' ? 'bg-emerald-100 text-emerald-800' :
                              lead.status?.toLowerCase() === 'missed' ? 'bg-rose-100 text-rose-800' :
                              lead.status?.toLowerCase() === 'confirmed' ? 'bg-teal-100 text-teal-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>{lead.status?.toUpperCase() || 'BOOKED'}</span>
                          </div>

                          <div className="text-[11.5px] font-semibold text-slate-700">
                            {lead.course}
                          </div>

                          <div className="text-[11px] text-slate-500 font-medium">
                            <div>📞 <span className="font-mono text-slate-700">{lead.phone}</span></div>
                            <div>🕒 {lead.time || lead.timeSlot || 'Today'} · {lead.mode || 'Online'}</div>
                          </div>

                          <div className="text-[10.5px] text-emerald-800 font-semibold bg-emerald-50/70 p-2 rounded-lg border border-emerald-100 flex items-center gap-1">
                            <span>🎯</span>
                            <span>Assigned SME: <strong className="text-slate-900">{lead.trainer}</strong></span>
                          </div>

                          {/* Multi-Condition Notification Audit Badge */}
                          {lead.notificationSent === true ? (
                            <div className="text-[10px] text-emerald-900 bg-emerald-50/90 p-2 rounded-lg border border-emerald-300/80 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold flex items-center gap-1 text-emerald-800">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                                  <span>Notification Delivered</span>
                                </span>
                                <span className="text-[9px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded font-bold">1st Priority</span>
                              </div>
                              <div className="text-[9.5px] text-emerald-700 flex items-center gap-1.5 flex-wrap font-semibold">
                                <span>✓ Experienced</span>
                                <span>•</span>
                                <span>✓ In Shift ({lead.shiftTiming || 'Morning'})</span>
                                <span>•</span>
                                <span>✓ No Class Conflict</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] text-rose-900 bg-rose-50/90 p-2 rounded-lg border border-rose-300/80 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold flex items-center gap-1 text-rose-800">
                                  <span className="h-2 w-2 rounded-full bg-rose-500 inline-block"></span>
                                  <span>Notification Blocked</span>
                                </span>
                                <span className="text-[9px] bg-rose-200/80 text-rose-900 px-1.5 py-0.2 rounded font-bold">Suppressed</span>
                              </div>
                              <div className="text-[9.5px] text-rose-700 font-medium leading-tight">
                                {lead.notificationBlockReason || lead.conflictReason || 'Condition not met (Class overlap or outside shift)'}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-1.5 pt-1.5 border-t border-slate-100">
                            <button
                              onClick={async () => {
                                try {
                                  if (lead._id) await updateDemo(lead._id, { status: 'Attended' });
                                } catch (e) { console.warn(e); }
                                setDemos(prev => prev.map(l => (l._id === lead._id || l.candidateName === lead.candidateName) ? { ...l, status: 'Attended' } : l));
                                setDemoToast(`✓ Marked demo for ${lead.candidateName} as Attended!`);
                                setTimeout(() => setDemoToast(null), 3000);
                              }}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10.5px] font-bold transition-colors cursor-pointer text-center"
                            >
                              Attended
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  if (lead._id) await updateDemo(lead._id, { status: 'Missed' });
                                } catch (e) { console.warn(e); }
                                setDemos(prev => prev.map(l => (l._id === lead._id || l.candidateName === lead.candidateName) ? { ...l, status: 'Missed' } : l));
                                setDemoToast(`Marked demo for ${lead.candidateName} as Missed`);
                                setTimeout(() => setDemoToast(null), 3000);
                              }}
                              className="flex-1 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[10.5px] font-bold transition-colors cursor-pointer text-center"
                            >
                              Missed
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card 3: Academy Course-to-Faculty Expert Directory */}
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>🎓</span> Course Expert Faculty Routing Roster
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      The automated engine assigns incoming candidate demos to these designated experts and alerts them first.
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                    8 Faculty Experts
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4 font-bold">Course / Certification</th>
                        <th className="py-3 px-4 font-bold">Designated Faculty SME</th>
                        <th className="py-3 px-4 font-bold">Faculty ID & Shift</th>
                        <th className="py-3 px-4 font-bold">Core Specialization</th>
                        <th className="py-3 px-4 font-bold text-right">Notification Order</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      <tr className="hover:bg-teal-50/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">CPC — Medical Coding</td>
                        <td className="py-3 px-4 font-bold text-[#00897b]">{trainerName}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">TR-CBG-001 · 6 AM – 2 PM</td>
                        <td className="py-3 px-4">Anatomy, ICD-10-CM & CPT Surgery</td>
                        <td className="py-3 px-4 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">1st Priority</span>
                        </td>
                      </tr>
                      <tr className="hover:bg-teal-50/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">CIC — Inpatient Coding</td>
                        <td className="py-3 px-4 font-bold text-[#00897b]">Priyadharshini K.</td>
                        <td className="py-3 px-4 font-mono text-slate-500">TR-CBG-002 · 9 AM – 5 PM</td>
                        <td className="py-3 px-4">Inpatient Hospital, ICD-10-PCS & IPDRG</td>
                        <td className="py-3 px-4 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">1st Priority</span>
                        </td>
                      </tr>
                      <tr className="hover:bg-teal-50/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">CPB — Medical Billing & RCM</td>
                        <td className="py-3 px-4 font-bold text-[#00897b]">Suresh Babu</td>
                        <td className="py-3 px-4 font-mono text-slate-500">TR-CBG-003 · 8 AM – 4 PM</td>
                        <td className="py-3 px-4">US Healthcare RCM, Hospital Claims & Billing</td>
                        <td className="py-3 px-4 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">1st Priority</span>
                        </td>
                      </tr>
                      <tr className="hover:bg-teal-50/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">CPMA — Medical Auditing</td>
                        <td className="py-3 px-4 font-bold text-[#00897b]">Manjunath R.</td>
                        <td className="py-3 px-4 font-mono text-slate-500">TR-CBG-004 · 10 AM – 6 PM</td>
                        <td className="py-3 px-4">Chart Auditing, Compliance & AAPC Guidelines</td>
                        <td className="py-3 px-4 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">1st Priority</span>
                        </td>
                      </tr>
                      <tr className="hover:bg-teal-50/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">CCS — Coding Specialist</td>
                        <td className="py-3 px-4 font-bold text-[#00897b]">Karthik V.</td>
                        <td className="py-3 px-4 font-mono text-slate-500">TR-ACAD-002 · 9 AM – 5 PM</td>
                        <td className="py-3 px-4">AHIMA Inpatient/Outpatient Hospital Coding</td>
                        <td className="py-3 px-4 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">1st Priority</span>
                        </td>
                      </tr>
                      <tr className="hover:bg-teal-50/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">CRC / COC — Risk & Outpatient</td>
                        <td className="py-3 px-4 font-bold text-[#00897b]">Dr. Vikram C.</td>
                        <td className="py-3 px-4 font-mono text-slate-500">TR-ACAD-001 · 7 AM – 3 PM</td>
                        <td className="py-3 px-4">HCC Risk Adjustment & Outpatient Surgery</td>
                        <td className="py-3 px-4 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">1st Priority</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Card 3: This Month (Metrics Table) */}
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-base font-bold text-slate-900">
                    This Month
                  </h3>
                  <button
                    onClick={() => setShowConversionModal(true)}
                    className="text-xs font-bold text-[#00897b] hover:underline flex items-center gap-1"
                  >
                    <span>Conversion</span>
                    <span>→</span>
                  </button>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-3.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Demos assigned</span>
                    <span className="font-bold text-slate-900 text-sm">{demos.length || 12}</span>
                  </div>

                  <div className="py-3.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Completed</span>
                    <span className="font-bold text-slate-900 text-sm">{demos.filter(d => d.status === 'Attended' || d.status === 'confirmed').length || 11}</span>
                  </div>

                  <div className="py-3.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Leads attended</span>
                    <span className="font-bold text-slate-900 text-sm">{(demos.filter(d => d.status === 'Attended' || d.status === 'confirmed').length * 12) + leads.length || 148}</span>
                  </div>

                  <div className="py-3.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Students joined</span>
                    <span className="font-bold text-slate-900 text-sm">{students.length || 53}</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ================= TAB 5: DOUBT BOX ================= */}
          {activeNav === 'doubts' && (
            <div className="space-y-4 max-w-[1280px]">
              
              {/* Main White Card Container */}
              <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm space-y-5">
                
                {/* Header with Bubble Icon */}
                <div className="flex items-center gap-2">
                  <span className="text-base text-slate-700">💬</span>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Doubt Box
                  </h2>
                </div>

                {/* Filter Pills Row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setActiveDoubtFilter('New')}
                    className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                      activeDoubtFilter === 'New'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100'
                    }`}
                  >
                    {myDoubts.filter(d => d.status === 'New').length} New
                  </button>

                  <button
                    onClick={() => setActiveDoubtFilter('Pending')}
                    className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                      activeDoubtFilter === 'Pending'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100'
                    }`}
                  >
                    {myDoubts.filter(d => d.status === 'Pending').length} Pending
                  </button>

                  <button
                    onClick={() => setActiveDoubtFilter('Replied')}
                    className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                      activeDoubtFilter === 'Replied'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100'
                    }`}
                  >
                    {myDoubts.filter(d => d.status === 'Replied' || d.reply).length} Replied
                  </button>

                  <button
                    onClick={() => setActiveDoubtFilter('Overdue')}
                    className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                      activeDoubtFilter === 'Overdue'
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
                    }`}
                  >
                    {myDoubts.filter(d => d.status === 'Overdue').length} Overdue
                  </button>

                  {activeDoubtFilter !== 'All' && (
                    <button
                      onClick={() => setActiveDoubtFilter('All')}
                      className="text-xs text-slate-400 hover:text-slate-700 underline ml-1"
                    >
                      Show all
                    </button>
                  )}
                </div>

                {/* Doubt Cards List */}
                <div className="space-y-4">
                  {myDoubts
                    .filter(d => {
                      if (activeDoubtFilter === 'All') return true;
                      if (activeDoubtFilter === 'New') return d.status === 'New';
                      if (activeDoubtFilter === 'Pending') return d.status === 'Pending';
                      if (activeDoubtFilter === 'Replied') return d.status === 'Replied' || d.reply;
                      if (activeDoubtFilter === 'Overdue') return d.status === 'Overdue';
                      return true;
                    })
                    .map(item => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200/90 p-5 space-y-3 hover:border-slate-300 transition-all bg-white shadow-none"
                      >
                        {/* Question Title in quotes */}
                        <div className="text-sm font-bold text-slate-900 tracking-tight">
                          "{item.question}"
                        </div>

                        {/* Metadata line with badges */}
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="text-slate-500 font-medium">
                            {item.student} · {item.topic} · {item.timeText}
                          </span>

                          <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                            item.status === 'New' ? 'bg-[#dbeafe] text-[#1e40af]' :
                            item.status === 'Replied' ? 'bg-[#dcfce7] text-[#166534]' :
                            'bg-[#fed7aa] text-[#9a3412]'
                          }`}>
                            {item.status}
                          </span>

                          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#f1f5f9] text-[#475569]">
                            {item.slaBadge}
                          </span>
                        </div>

                        {/* Existing Reply if any */}
                        {item.reply && (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                            <span className="font-bold text-emerald-800 block text-[10px] uppercase mb-0.5">Faculty Reply:</span>
                            {item.reply}
                          </div>
                        )}

                        {/* Reply Action Button */}
                        <div>
                          <button
                            onClick={() => {
                              setActiveDoubtModal(item);
                              setDoubtReplyText(item.reply || '');
                            }}
                            className="px-5 py-1.5 rounded-lg bg-[#0e1f2b] hover:bg-[#162d3e] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

              </div>

              {/* Bottom SLA Footnote Box */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 text-xs text-slate-500 font-medium shadow-sm leading-relaxed">
                SLA: normal 24h · assessment 12h · exam/mock 6h. Miss the SLA and it <strong className="font-bold text-slate-900">auto–escalates</strong> to the Training Head. Your doubt–resolution rate feeds your performance score.
              </div>

            </div>
          )}

          {/* ================= TAB 6: SCORECARD ================= */}
          {activeNav === 'scorecard' && (
            <div className="space-y-6 max-w-[1280px] animate-fadeIn">
              
              {/* 1. Top Hero Dark Indigo Banner */}
              <div className="bg-[#24234b] rounded-3xl p-6 sm:p-7 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-[#37356c]">
                <div className="flex items-center gap-7 sm:gap-9">
                  <div>
                    <div className="text-5xl sm:text-6xl font-black text-white tracking-tight leading-none">
                      90.8
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase mt-2">
                      ACTION SCORE / 100
                    </div>
                  </div>

                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      Platinum Zone
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 font-normal mt-1 leading-relaxed">
                      Layer 1 of the spec — your current month, recomputed live from the inputs below.
                    </p>
                  </div>
                </div>

                <div className="bg-[#2f2e5f] border border-[#3e3d79] rounded-2xl px-7 py-4 text-left md:text-right shrink-0 min-w-[150px]">
                  <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    ₹2,667
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase mt-1">
                    VARIABLE PAY
                  </div>
                </div>
              </div>

              {/* 2. Layer 1 — Action Score Breakdown Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <span className="text-base">📊</span>
                    <span>Layer 1 — Action Score Breakdown</span>
                  </div>
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200/80">
                    weights from Config
                  </span>
                </div>

                <p className="text-xs text-slate-500 font-normal leading-relaxed">
                  Each factor is achievement × weight, then normalised over only the factors that apply to you this month. <span className="text-slate-600 font-bold">105 applicable weight points — you earned 0.0.</span>
                </p>

                {/* Action Score Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                        <th className="py-3 px-3 font-semibold">FACTOR</th>
                        <th className="py-3 px-3 font-semibold">INPUTS</th>
                        <th className="py-3 px-3 font-semibold text-center sm:text-left">ACHIEVEMENT</th>
                        <th className="py-3 px-3 font-semibold text-center sm:text-left">WEIGHT</th>
                        <th className="py-3 px-3 font-semibold text-right">EARNED</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { factor: 'Classes / Sessions', inputs: `${batches.length * 40 || 80} / 72`, achievement: '100%', weight: '20', earned: '20.00' },
                        { factor: 'Attendance', inputs: `${attendanceList.length ? Math.round(attendanceList.reduce((acc, s) => acc + (s.attendancePct || 90), 0) / attendanceList.length) : 96}%`, achievement: `${attendanceList.length ? Math.round(attendanceList.reduce((acc, s) => acc + (s.attendancePct || 90), 0) / attendanceList.length) : 96}%`, weight: '10', earned: `${((attendanceList.length ? Math.round(attendanceList.reduce((acc, s) => acc + (s.attendancePct || 90), 0) / attendanceList.length) : 96) * 0.1).toFixed(2)}` },
                        { factor: 'Syllabus updated', inputs: '90%', achievement: '90%', weight: '10', earned: '9.00' },
                        { factor: 'Assessments ≥75%', inputs: `${assessmentTests.length} / ${Math.max(assessmentTests.length, 4)}`, achievement: `${Math.min(100, Math.round((assessmentTests.length / Math.max(assessmentTests.length, 4)) * 100))}%`, weight: '20', earned: `${(Math.min(100, (assessmentTests.length / Math.max(assessmentTests.length, 4)) * 100) * 0.2).toFixed(2)}` },
                        { factor: 'Weak reviewed', inputs: `${weakStudents.length} / ${Math.max(1, weakStudents.length)}`, achievement: '100%', weight: '10', earned: '10.00' },
                        { factor: 'Student feedback', inputs: '4.8 / 5', achievement: '96%', weight: '10', earned: '9.60' },
                        { factor: 'Demos done', inputs: `${demos.filter(d => d.status === 'Attended' || d.status === 'confirmed').length} / ${demos.length || 1}`, achievement: `${Math.min(100, Math.round((demos.filter(d => d.status === 'Attended' || d.status === 'confirmed').length / Math.max(1, demos.length)) * 100))}%`, weight: '10', earned: `${(Math.min(100, Math.round((demos.filter(d => d.status === 'Attended' || d.status === 'confirmed').length / Math.max(1, demos.length)) * 100)) * 0.1).toFixed(2)}` },
                        { factor: 'Interviews done', inputs: `${students.filter(s => s.mockInterview !== 'Pending').length} / ${students.length || 1}`, achievement: `${Math.min(100, Math.round((students.filter(s => s.mockInterview !== 'Pending').length / Math.max(1, students.length)) * 100))}%`, weight: '10', earned: `${(Math.min(100, Math.round((students.filter(s => s.mockInterview !== 'Pending').length / Math.max(1, students.length)) * 100)) * 0.1).toFixed(2)}` },
                        { factor: 'Cert counselling', tag: 'N/A', inputs: 'not assigned', achievement: '0%', weight: '5', earned: '0.00', isNa: true },
                        { factor: 'Same-day updates', inputs: '95%', achievement: '95%', weight: '5', earned: '4.75' },
                      ].map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-3">
                            <span className={`font-bold ${item.isNa ? 'text-slate-400 font-semibold' : 'text-slate-900'}`}>
                              {item.factor}
                            </span>
                            {item.tag && (
                              <span className="ml-1.5 text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                                {item.tag}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`font-mono ${item.isNa ? 'text-slate-400 italic text-[11px]' : 'text-slate-500 font-medium'}`}>
                              {item.inputs}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center sm:text-left">
                            <span className={`font-bold ${item.isNa ? 'text-rose-400' : 'text-emerald-600'}`}>
                              {item.achievement}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center sm:text-left">
                            <span className={`font-medium ${item.isNa ? 'text-slate-400' : 'text-slate-500'}`}>
                              {item.weight}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`font-bold font-mono ${item.isNa ? 'text-slate-400 font-normal' : 'text-slate-900'}`}>
                              {item.earned}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Variable Pay · Quality Buckets Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <span className="text-base">💰</span>
                    <span>Variable Pay · Quality Buckets</span>
                  </div>
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Gates pass
                  </span>
                </div>

                <p className="text-xs text-slate-500 font-normal leading-relaxed">
                  Quality score × ₹3,000 = your variable pay. Gates: attendance ≥95% AND same-day updates ≥90% AND no major complaint.
                </p>

                {/* Quality Buckets Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                        <th className="py-3 px-3 font-semibold">BUCKET</th>
                        <th className="py-3 px-3 font-semibold text-center sm:text-left">WEIGHT</th>
                        <th className="py-3 px-3 font-semibold text-center sm:text-left">ACHIEVED</th>
                        <th className="py-3 px-3 font-semibold text-right">EARNED</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { bucket: 'Attendance', weight: '30', achieved: '96%', earned: '28.80' },
                        { bucket: 'Assessments conducted', weight: '25', achieved: '90%', earned: '22.50' },
                        { bucket: 'Student feedback', weight: '20', achieved: '88%', earned: '17.60' },
                        { bucket: 'Employee feedback', weight: '15', achieved: '80%', earned: '12.00' },
                        { bucket: 'Quality rating', weight: '10', achieved: '80%', earned: '8.00' },
                      ].map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-3 font-bold text-slate-900">{row.bucket}</td>
                          <td className="py-3.5 px-3 text-slate-500 font-medium text-center sm:text-left">{row.weight}</td>
                          <td className="py-3.5 px-3 font-bold text-slate-800 text-center sm:text-left">{row.achieved}</td>
                          <td className="py-3.5 px-3 font-bold font-mono text-slate-900 text-right">{row.earned}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Rows */}
                <div className="pt-2 space-y-3">
                  {/* QUALITY SCORE Row */}
                  <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="text-xs font-black text-[#15803d] tracking-wider uppercase">
                      QUALITY SCORE
                    </div>
                    <div className="text-base sm:text-lg font-black text-[#15803d]">
                      88.9 / 100
                    </div>
                  </div>

                  {/* VARIABLE PAY (rounded) Row */}
                  <div className="px-4 py-2 flex items-center justify-between">
                    <div className="text-xs font-black text-slate-900 tracking-wider uppercase">
                      VARIABLE PAY (rounded)
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900">
                      ₹2,667
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Prototype Notice Footnote Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#fffbeb] border border-[#fef08a] text-xs text-[#92400e] leading-relaxed shadow-sm">
                <span className="font-bold text-[#78350f]">📌 Prototype — figures are projections.</span> Real payroll runs server-side from this Config, with audit log, monthly close jobs and the HR payroll push contract from §8 of the spec. Numbers here update live from the inputs in TF_ME_INPUTS.
              </div>

            </div>
          )}

          {/* ================= TAB 7: INCENTIVES ================= */}
          {activeNav === 'incentives' && (
            <div className="space-y-6 max-w-[1280px] animate-fadeIn">

              {/* 1. Top Hero Dark Card: Incentive Ledger · This Month */}
              <div className="bg-[#121c2b] border border-[#1f2e42] rounded-3xl p-6 sm:p-7 text-white shadow-sm space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5 font-bold text-white text-base">
                    <span className="w-2.5 h-2.5 bg-amber-400 rounded-sm inline-block shrink-0"></span>
                    <span>Incentive Ledger · This Month</span>
                  </div>
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
                    Audit-grade
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-normal leading-relaxed">
                  Every cash–earning event lands here. Per §6, each row computes its own payable: <strong className="font-bold text-white">base × share</strong>, with the don't–split floor (₹300) paying 100% to the doer, and the pass–rate gate freezing booking & placement cash when the batch is below 60%.
                </p>
              </div>

              {/* 2. Events Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900">Events</h2>
                  <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200/80">
                    {Math.min(7, students.length || 7)} rows
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                        <th className="py-3 px-4 font-semibold">EVENT</th>
                        <th className="py-3 px-4 font-semibold">TYPE</th>
                        <th className="py-3 px-4 font-semibold">STUDENT</th>
                        <th className="py-3 px-4 font-semibold">ROLE</th>
                        <th className="py-3 px-4 font-semibold text-center sm:text-left">BASE ₹</th>
                        <th className="py-3 px-4 font-semibold text-center sm:text-left">SHARE</th>
                        <th className="py-3 px-4 font-semibold text-center">VERIFIED</th>
                        <th className="py-3 px-4 font-semibold text-right">PAYABLE ₹</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.slice(0, 7).map((st, idx) => {
                        const isVerified = st.statusGroup !== 'on_hold';
                        const isExamBooking = idx % 2 === 0;
                        const baseAmt = isExamBooking ? 200 : 100;
                        const payable = isVerified ? `₹${baseAmt}` : '₹0';
                        return (
                          <tr key={st._id || idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-mono text-slate-400 font-medium">EVT-2605-{String(idx + 1).padStart(3, '0')}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{isExamBooking ? 'Exam slot booking' : 'Admission (demo source)'}</td>
                            <td className="py-3 px-4 text-slate-600 font-medium">{st.name}</td>
                            <td className="py-3 px-4 text-slate-500 font-medium">{isExamBooking ? 'Primary' : 'Demo'}</td>
                            <td className="py-3 px-4 text-slate-800 font-medium text-center sm:text-left">₹{baseAmt}</td>
                            <td className="py-3 px-4 text-slate-500 font-medium text-center sm:text-left">100%</td>
                            <td className="py-3 px-4 text-center">
                              {isVerified ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">
                                  ✓
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200/80">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`font-bold font-mono ${isVerified ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {payable}
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Special AUTO Row */}
                      <tr className="bg-[#fffdf5] border-t border-amber-100 hover:bg-amber-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400 font-bold">AUTO</td>
                        <td className="py-3 px-4 font-bold text-slate-900">Extra sessions · 8 × ₹250</td>
                        <td colSpan={4} className="py-3 px-4 text-slate-600 font-medium">
                          8 sessions beyond quota of 72 (cap 20)
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">
                            ✓
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-black text-amber-600 text-sm font-mono">
                            ₹2,000
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Dark Footer Bar inside Events Card */}
                <div className="bg-[#111927] px-6 py-4 flex items-center justify-between text-white border-t border-slate-800">
                  <span className="text-xs font-bold tracking-wider uppercase text-slate-200">
                    EVENT CASH THIS MONTH
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-white">
                    ₹3,100
                  </span>
                </div>
              </div>

              {/* 3. Monthly Take · Summary Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-3">
                <h2 className="text-sm font-bold text-slate-900">Monthly Take · Summary</h2>
                
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Variable pay (quality)</span>
                    <span className="font-bold font-mono text-slate-900">₹2,667</span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1.5">
                    <span className="text-slate-600 font-medium">Event cash (verified)</span>
                    <span className="font-bold font-mono text-slate-900">₹3,100</span>
                  </div>

                  {/* Highlighted MONTHLY TAKE Row */}
                  <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-4 py-3.5 flex items-center justify-between mt-3">
                    <span className="text-xs font-black text-[#15803d] tracking-wider uppercase">
                      MONTHLY TAKE
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-[#15803d]">
                      ₹5,767
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Bottom Notice Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#fffbeb] border border-[#fef08a] text-xs text-[#92400e] leading-relaxed shadow-sm">
                <span className="font-bold text-[#78350f]">📌 Prototype — figures are projections.</span> Real ledger rows are created by automation jobs (§10) from HR (admissions) and CCCP (bookings, results, placements). Money is computed server-side and audit-logged per §11.
              </div>

            </div>
          )}

          {/* ================= TAB 8: MY BATCHES ================= */}
          {activeNav === 'batches' && (
            <div className="space-y-4 max-w-[1280px] animate-fadeIn">

              {/* Active Batches White Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2.5">
                    {/* Layered Colored Cards Icon */}
                    <div className="relative w-5 h-5 flex items-center justify-center">
                      <span className="absolute w-3 h-3 rounded-sm bg-emerald-500 -top-0.5 -left-0.5 opacity-90"></span>
                      <span className="absolute w-3 h-3 rounded-sm bg-sky-500 top-0.5 left-0.5 opacity-90"></span>
                      <span className="absolute w-3 h-3 rounded-sm bg-rose-500 bottom-0 right-0 opacity-90"></span>
                    </div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">Active Batches</h2>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {batches.length} {batches.length === 1 ? 'batch' : 'batches'} · {myStudents.length} students
                  </span>
                </div>

                {batches.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 font-medium">
                    No active student batches currently assigned to you.
                  </div>
                ) : (
                  batches.map((batch, bIdx) => (
                    <div key={batch.id || bIdx} className="space-y-3">
                      <div
                        onClick={() => setSelectedBatchDrilldown(selectedBatchDrilldown === batch.id ? null : batch.id)}
                        className={`rounded-2xl border ${selectedBatchDrilldown === batch.id ? 'border-teal-500 ring-2 ring-teal-500/10' : 'border-slate-200/90 hover:border-slate-300'} p-4 sm:p-5 flex items-center justify-between transition-all bg-white cursor-pointer group shadow-none`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform ${
                            bIdx % 2 === 0 ? 'bg-[#e0f2fe] text-[#0284c7]' : 'bg-[#fef3c7] text-[#d97706]'
                          }`}>
                            {batch.mode?.toLowerCase().includes('offline') ? '🏫' : '💻'}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                              {batch.name}
                            </div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                              {batch.module || 'Core Module'} · {batch.timing} · {batch.mode}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 ml-3">
                          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#eff6ff] text-[#3b82f6] border border-blue-100">
                            {batch.students.length}
                          </span>
                        </div>
                      </div>

                      {/* Batch Expanded Students Drawer (if tapped) */}
                      {selectedBatchDrilldown === batch.id && (
                        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3 animate-fadeIn">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">Students in Your Module ({batch.name})</span>
                            <span className="text-slate-500 font-mono text-[11px]">{batch.students.length} Enrolled</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                            {batch.students.map((s, idx) => (
                              <div key={s._id || s.studentId || idx} className="p-2.5 rounded-xl bg-white border border-slate-200/70 flex items-center justify-between shadow-none">
                                <div>
                                  <div className="font-bold text-slate-900">{s.name}</div>
                                  <div className="text-[11px] text-slate-400 font-mono">{s.studentId || `TF-${idx + 101}`} · {s.syllabusModule || batch.module || 'Core'}</div>
                                </div>
                                <div className="text-right">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    (s.attendancePct || 94) < 75 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}>
                                    {s.attendancePct || (s.statusGroup === 'on_hold' ? 72 : 94)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Footnote Line */}
              <div className="text-xs text-slate-500 font-medium px-1 leading-relaxed">
                Tap a batch to see its students. You only see students allocated to <strong className="font-bold text-slate-800">you</strong>, for <strong className="font-bold text-slate-800">your</strong> module — cross-module data is hidden by design.
              </div>

            </div>
          )}

          {/* ================= TAB: MY STUDENTS ================= */}
          {activeNav === 'students' && (
            <div className="space-y-4 max-w-[1280px] animate-fadeIn">

              {/* Toast Notification for CCCP Marking */}
              {cccpToast && (
                <div className="p-3.5 rounded-2xl bg-emerald-900 text-white text-xs font-semibold flex items-center justify-between shadow-lg animate-fadeIn border border-emerald-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>{cccpToast}</span>
                  </div>
                  <button onClick={() => setCccpToast(null)} className="text-emerald-300 hover:text-white">✕</button>
                </div>
              )}

              {/* Main White Card: My Students */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-5 h-5 text-slate-800" />
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">My Students</h2>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    module-wise
                  </span>
                </div>

                {/* Real Students Rows */}
                <div className="space-y-3">
                  {myStudents.map((student) => {
                    const isWeak = student.statusGroup === 'on_hold' || (student.attendancePct && student.attendancePct < 80) || student.mockInterview === 'Pending';
                    const sId = student._id || student.studentId;
                    const isSent = cccpSentStudents[sId] || student.placementStatus === 'Referred to CCCP' || student.syllabusCompleted;
                    const rollText = `${student.studentId || 'TF-STD'} · ${student.course || 'CPC'} · ${student.syllabusModule || 'Core Syllabus'}`;
                    return (
                      <div
                        key={sId}
                        className="rounded-2xl border border-slate-200/90 p-4 sm:p-4.5 flex items-center justify-between hover:border-slate-300 transition-all bg-white shadow-none group"
                      >
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          {/* Icon container */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm shrink-0 ${
                            isWeak ? 'bg-[#f8fafc] text-slate-500 border border-slate-200/70' : 'bg-[#f1f5f9] text-slate-700'
                          }`}>
                            {isWeak ? (
                              <span className="text-sm font-bold text-slate-500">⚠</span>
                            ) : (
                              <span className="text-base">🎓</span>
                            )}
                          </div>

                          {/* Student Info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                                {student.name}
                              </span>
                              {isWeak && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fee2e2] text-[#dc2626]">
                                  weak
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                              {rollText}
                            </div>
                          </div>
                        </div>

                        {/* Right Action Button */}
                        <div className="shrink-0 ml-3">
                          <button
                            onClick={async () => {
                              setCccpSentStudents(prev => ({ ...prev, [sId]: true }));
                              try {
                                if (student._id) {
                                  await updateStudent(student._id, {
                                    readinessScore: 95,
                                    placementStatus: 'Referred to CCCP',
                                    syllabusCompleted: true
                                  });
                                }
                              } catch (e) {
                                console.warn('CCCP referral error', e);
                              }
                              setStudents(prev => prev.map(s => s._id === student._id ? { ...s, readinessScore: 95, placementStatus: 'Referred to CCCP', syllabusCompleted: true } : s));
                              setCccpToast(`${student.name} marked syllabus complete → Pushed to CCCP for placement & HR notified.`);
                              setTimeout(() => setCccpToast(null), 4000);
                            }}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.98] ${
                              isSent
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-[#064e3b] hover:bg-[#065f46] text-[#34d399]'
                            }`}
                          >
                            <span className="text-xs">🎓</span>
                            <span>{isSent ? '✓ Sent to CCCP' : 'Syllabus done → CCCP'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Footnotes */}
              <div className="px-1 space-y-2 text-xs text-slate-500 font-medium leading-relaxed">
                <div>
                  ⚠️ Privacy rule: a trainer sees <strong className="font-bold text-slate-800">only</strong> their allocated students for their specific module. The ICD trainer cannot see a student's CPT session details.
                </div>
                <div>
                  When the full syllabus is complete, marking it here sends the student to <strong className="font-bold text-slate-800">CCCP for placement</strong> and notifies their <strong className="font-bold text-slate-800">HR</strong>.
                </div>
              </div>

            </div>
          )}

          {/* ================= TAB 9: WEAK STUDENTS ================= */}
          {/* ================= TAB 9: WEAK STUDENTS ================= */}
          {activeNav === 'weak_students' && (
            <div className="space-y-4 max-w-[1280px] animate-fadeIn">

              {/* Toast for action taken */}
              {weakStudentToast && (
                <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs font-semibold flex items-center justify-between shadow-lg animate-fadeIn border border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
                    <span>{weakStudentToast}</span>
                  </div>
                  <button onClick={() => setWeakStudentToast(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>
              )}

              {/* Main White Card: Weak Student Tracker */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-slate-900" />
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">Weak Student Tracker</h2>
                  </div>
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#fee2e2] text-[#dc2626] border border-red-200/80">
                    {weakStudents.length} flagged
                  </span>
                </div>

                {weakStudents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 font-medium">
                    ✓ All students currently meeting attendance and academic benchmarks. No weak students flagged!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {weakStudents.map((student) => (
                      <div
                        key={student.id}
                        className="rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex items-center justify-between hover:border-slate-300 transition-all bg-white shadow-none group"
                      >
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          {/* 3D Sphere Container */}
                          <div className={`w-10 h-10 rounded-xl ${student.bgTone} flex items-center justify-center shrink-0`}>
                            <span className={`w-4 h-4 rounded-full bg-gradient-to-br ${student.dotGradient} shadow-sm inline-block`}></span>
                          </div>

                          {/* Student Name and Issue */}
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                              {student.name}
                            </div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                              {student.issue}
                            </div>
                          </div>
                        </div>

                        {/* Right Action Button */}
                        <div className="shrink-0 ml-3">
                          <button
                            onClick={() => setActiveWeakStudentModal(student)}
                            className="px-5 py-2 rounded-xl bg-[#0c1921] hover:bg-[#152a36] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
                          >
                            Action
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Footnote Line */}
              <div className="text-xs text-slate-500 font-medium px-1 leading-relaxed">
                Auto-flagged when: attendance &lt;80%, test &lt;60%, 2+ missed classes, assignments skipped, or 3+ doubts on one topic. Take action early — ignored weak students become drop-outs.
              </div>

              {/* Interactive Action Modal */}
              {activeWeakStudentModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                  <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">⚠️</span>
                        <h3 className="font-bold text-slate-900 text-sm">Remedial Action Plan</h3>
                      </div>
                      <button
                        onClick={() => setActiveWeakStudentModal(null)}
                        className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                      >
                        ✕
                      </button>
                    </div>

                    <div>
                      <div className="font-bold text-slate-900 text-base">{activeWeakStudentModal.name}</div>
                      <div className="text-xs text-slate-500">{activeWeakStudentModal.batch}</div>
                      <div className="mt-2 p-2.5 rounded-xl bg-rose-50 text-rose-800 text-xs font-medium border border-rose-100">
                        {activeWeakStudentModal.issue}
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="font-bold text-slate-700">Choose Remedial Intervention:</div>
                      
                      <button
                        onClick={() => {
                          setWeakStudentToast(`1-on-1 modifier drill scheduled for ${activeWeakStudentModal.name} this Saturday 10:00 AM.`);
                          setActiveWeakStudentModal(null);
                          setTimeout(() => setWeakStudentToast(null), 4000);
                        }}
                        className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all font-semibold text-slate-800 flex items-center justify-between group"
                      >
                        <span>📅 Schedule 1-on-1 Remedial Call</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                      </button>

                      <button
                        onClick={() => {
                          setWeakStudentToast(`Shared recorded revision lecture & practice quiz with ${activeWeakStudentModal.name}.`);
                          setActiveWeakStudentModal(null);
                          setTimeout(() => setWeakStudentToast(null), 4000);
                        }}
                        className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all font-semibold text-slate-800 flex items-center justify-between group"
                      >
                        <span>📹 Share Video Lecture + Practice Quiz</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                      </button>

                      <button
                        onClick={() => {
                          setWeakStudentToast(`Notified Branch Academic Mentor & Counselor for ${activeWeakStudentModal.name}.`);
                          setActiveWeakStudentModal(null);
                          setTimeout(() => setWeakStudentToast(null), 4000);
                        }}
                        className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all font-semibold text-slate-800 flex items-center justify-between group"
                      >
                        <span>📞 Escalate to Branch Mentor for Counseling</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                      </button>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => setActiveWeakStudentModal(null)}
                        className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ================= TAB: ASSESSMENTS ================= */}
          {activeNav === 'assessments' && (
            <div className="space-y-4 max-w-[1280px] animate-fadeIn">

              {/* Toast Notification */}
              {assessmentToast && (
                <div className="p-3.5 rounded-2xl bg-[#0c1921] text-white text-xs font-semibold flex items-center justify-between shadow-lg animate-fadeIn border border-[#1b3446]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
                    <span>{assessmentToast}</span>
                  </div>
                  <button onClick={() => setAssessmentToast(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>
              )}

              {/* 1. Top Card: Assessment Desk */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3 pb-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">📊</span>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">Assessment Desk</h2>
                  </div>

                  <button
                    onClick={() => setShowCreateTestModal(true)}
                    className="px-4 py-2 rounded-xl bg-[#0c1921] hover:bg-[#152a36] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
                  >
                    + Create Test
                  </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <button
                    onClick={() => setActiveAssessmentTab('active')}
                    className={`px-3.5 py-1.5 rounded-full font-semibold transition-all flex items-center gap-2 ${
                      activeAssessmentTab === 'active'
                        ? 'bg-[#0c1921] text-white shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    <span>Active Tests</span>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      activeAssessmentTab === 'active' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {assessmentTests.filter(t => t.status === 'Active').length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveAssessmentTab('pending')}
                    className={`px-3.5 py-1.5 rounded-full font-semibold transition-all flex items-center gap-2 ${
                      activeAssessmentTab === 'pending'
                        ? 'bg-[#0c1921] text-white shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    <span>Pending Review</span>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      activeAssessmentTab === 'pending' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      0
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveAssessmentTab('results')}
                    className={`px-3.5 py-1.5 rounded-full font-semibold transition-all flex items-center gap-2 ${
                      activeAssessmentTab === 'results'
                        ? 'bg-[#0c1921] text-white shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    <span>Results & Weak Topics</span>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      activeAssessmentTab === 'results' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {Object.keys(assessmentScores).length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Active Tests List */}
              {activeAssessmentTab === 'active' && (
                <div className="space-y-4">
                  {assessmentTests.filter(t => t.status === 'Active').map((test) => (
                    <div key={test.id} className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-4 transition-all">
                      <div className="flex items-center justify-between pb-1">
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-slate-900">
                            {test.name}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {test.type} · {test.batch} · {test.topic}
                          </p>
                        </div>

                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#ecfdf5] text-[#059669] border border-emerald-200">
                          {test.status}
                        </span>
                      </div>

                      {/* 4 Stat Boxes */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-3 sm:p-3.5">
                          <div className="text-[10px] tracking-wider uppercase font-bold text-slate-400">DATE</div>
                          <div className="text-sm sm:text-base font-bold text-slate-900 font-mono mt-0.5">{test.date}</div>
                        </div>

                        <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-3 sm:p-3.5">
                          <div className="text-[10px] tracking-wider uppercase font-bold text-slate-400">TIME LIMIT</div>
                          <div className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">{test.timeLimit}</div>
                        </div>

                        <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-3 sm:p-3.5">
                          <div className="text-[10px] tracking-wider uppercase font-bold text-slate-400">TOTAL / PASS</div>
                          <div className="text-sm sm:text-base font-bold text-slate-900 font-mono mt-0.5">{test.totalMarks} / {test.passMark}</div>
                        </div>

                        <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-3 sm:p-3.5">
                          <div className="text-[10px] tracking-wider uppercase font-bold text-slate-400">STUDENTS</div>
                          <div className="text-sm sm:text-base font-bold text-slate-900 font-mono mt-0.5">{test.studentsCount || 3}</div>
                        </div>
                      </div>

                      {/* Action Buttons Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <button
                          onClick={() => setActiveScoreModalTest({ id: test.id, title: test.name, max: test.totalMarks, pass: test.passMark })}
                          className="bg-[#009688] hover:bg-[#00897b] text-white text-xs sm:text-sm font-bold py-3 rounded-2xl transition-all text-center shadow-sm active:scale-[0.98]"
                        >
                          Enter Scores
                        </button>

                        <button
                          onClick={() => setActiveRationaleModalTest({ id: test.id, title: test.name })}
                          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold py-3 rounded-2xl transition-all text-center shadow-sm active:scale-[0.98]"
                        >
                          Add Rationale
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending Review Tab */}
              {activeAssessmentTab === 'pending' && (
                <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center shadow-sm space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
                    📝
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">All Tests Reviewed</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">No tests currently pending faculty review or grading verification.</p>
                </div>
              )}

              {/* Results & Weak Topics Tab */}
              {activeAssessmentTab === 'results' && (
                <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Historical Batch Performance & Weak Topic Analysis</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">E/M Coding Weekly Test</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">Weak Area Detected</span>
                      </div>
                      <p className="text-xs text-slate-500">Modifier 25 & MDM Risk calculation flagged 1 student below pass mark (Arjun R: 24/50).</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">CPC Full Mock Exam</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Passing Average</span>
                      </div>
                      <p className="text-xs text-slate-500">Batch average 74.0%. 2 of 3 students cleared AAPC 70% threshold.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Footnote Line */}
              <div className="text-xs text-slate-500 font-medium px-1 leading-relaxed">
                Scores below the pass mark auto-tag the test topic as a weak area and flag the student in the Weak Student Tracker. Publishing also feeds each student's assessment average into their Placement Readiness.
              </div>

              {/* 5. Enter Scores Modal */}
              {activeScoreModalTest && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                  <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Enter Assessment Scores</h3>
                        <p className="text-xs text-slate-500">{activeScoreModalTest.title} · Max {activeScoreModalTest.max} (Pass: {activeScoreModalTest.pass})</p>
                      </div>
                      <button onClick={() => setActiveScoreModalTest(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
                    </div>

                    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                      {students.map(st => {
                        const stKey = st._id || st.studentId;
                        const score = assessmentScores[activeScoreModalTest.id]?.[stKey] ?? (st.statusGroup === 'on_hold' ? 24 : 42);
                        const isPass = score >= activeScoreModalTest.pass;
                        return (
                          <div key={stKey} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                            <div>
                              <div className="text-xs font-bold text-slate-900">{st.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{st.studentId || 'TF-STD'} · {st.course}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={activeScoreModalTest.max}
                                value={score}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setAssessmentScores(prev => ({
                                    ...prev,
                                    [activeScoreModalTest.id]: {
                                      ...prev[activeScoreModalTest.id],
                                      [stKey]: val
                                    }
                                  }));
                                }}
                                className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center"
                              />
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isPass ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {isPass ? 'PASS' : 'FAIL'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={async () => {
                          const testId = activeScoreModalTest.id;
                          const currentScores = assessmentScores[testId] || {};
                          try {
                            await updateAssessmentScores(testId, currentScores);
                          } catch (e) {
                            console.warn('updateAssessmentScores API error', e);
                          }
                          setAssessmentToast(`Scores published for ${activeScoreModalTest.title}! Synced to Student Records & Placement Readiness.`);
                          setActiveScoreModalTest(null);
                          setTimeout(() => setAssessmentToast(null), 4000);
                        }}
                        className="flex-1 py-3 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold transition-all shadow-sm"
                      >
                        Publish Scores
                      </button>
                      <button
                        onClick={() => setActiveScoreModalTest(null)}
                        className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Add Rationale Modal */}
              {activeRationaleModalTest && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                  <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">AAPC Coding Rationale</h3>
                        <p className="text-xs text-slate-500">{activeRationaleModalTest.title}</p>
                      </div>
                      <button onClick={() => setActiveRationaleModalTest(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">Faculty Rationale & Case Guidelines:</label>
                      <textarea
                        rows={4}
                        value={rationaleTexts[activeRationaleModalTest.id] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRationaleTexts(prev => ({ ...prev, [activeRationaleModalTest.id]: val }));
                        }}
                        className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed focus:outline-teal-500"
                        placeholder="Write AAPC coding conventions, guidelines and question breakdown..."
                      />
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={async () => {
                          const testId = activeRationaleModalTest.id;
                          const rationale = rationaleTexts[testId] || '';
                          try {
                            await updateAssessmentRationale(testId, rationale);
                          } catch (e) {
                            console.warn('updateAssessmentRationale API error', e);
                          }
                          setAssessmentToast(`Rationale saved for ${activeRationaleModalTest.title}. Students can view it in their review portal.`);
                          setActiveRationaleModalTest(null);
                          setTimeout(() => setAssessmentToast(null), 4000);
                        }}
                        className="flex-1 py-3 rounded-xl bg-[#0c1921] hover:bg-[#152a36] text-white text-xs font-bold transition-all shadow-sm"
                      >
                        Save Rationale
                      </button>
                      <button
                        onClick={() => setActiveRationaleModalTest(null)}
                        className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. Create Test Modal with all 9 fields */}
              {showCreateTestModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
                  <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp my-8 max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                          ➕
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base">Create Test</h3>
                          <p className="text-xs text-slate-500">Configure new assessment & assign to batch</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowCreateTestModal(false)}
                        className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center font-bold text-base transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Alert Notice Banner as in prototype */}
                    <div className="bg-[#1c242c] text-white p-3.5 rounded-2xl text-xs space-y-1.5 shadow-sm border border-slate-700/50">
                      <div className="flex items-center gap-1.5 font-bold text-purple-300">
                        <span>➕</span>
                        <span>Create Test</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        <strong className="text-white">Fields:</strong> name · type (Daily Quiz / Weekly Test / Module Test / CPC Practice Test ...) · course · batch · topic · date · time limit · total marks · pass mark.
                      </p>
                      <p className="text-emerald-400 text-[11px] font-medium pt-0.5">
                        In the wired build this opens a modal form and the new test lands in Active Tests, ready to assign to a batch.
                      </p>
                    </div>

                    {/* 9 Form Fields */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const testTitle = newTestForm.name.trim() || `${newTestForm.type} - ${newTestForm.topic || 'General Drill'}`;
                        const newTest = {
                          id: `test-${Date.now()}`,
                          name: testTitle,
                          type: newTestForm.type,
                          course: newTestForm.course,
                          batch: newTestForm.batch,
                          topic: newTestForm.topic.trim() || 'Comprehensive Curriculum',
                          date: newTestForm.date || new Date().toISOString().split('T')[0],
                          timeLimit: newTestForm.timeLimit || '45 min',
                          totalMarks: Number(newTestForm.totalMarks) || 50,
                          passMark: Number(newTestForm.passMark) || 30,
                          studentsCount: students.length || 3,
                          status: 'Active'
                        };

                        try {
                          createTrainerAssessment(newTest).catch(e => console.warn(e));
                        } catch (e) {}

                        const initScores = {};
                        students.forEach(st => {
                          initScores[st._id || st.studentId] = 0;
                        });

                        setAssessmentTests(prev => [newTest, ...prev]);
                        setAssessmentScores(prev => ({
                          ...prev,
                          [newTest.id]: initScores
                        }));
                        setRationaleTexts(prev => ({
                          ...prev,
                          [newTest.id]: `Faculty AAPC guidelines for ${newTest.name}.`
                        }));

                        setAssessmentToast(`Test "${testTitle}" created! Landed in Active Tests ready for ${newTestForm.batch}.`);
                        setShowCreateTestModal(false);
                        setActiveAssessmentTab('active');
                        setNewTestForm({
                          name: '',
                          type: 'Daily Quiz',
                          course: 'CPC — Medical Coding',
                          batch: 'CPC Morning 03',
                          topic: '',
                          date: new Date().toISOString().split('T')[0],
                          timeLimit: '45 min',
                          totalMarks: 50,
                          passMark: 30
                        });
                        setTimeout(() => setAssessmentToast(null), 4500);
                      }}
                      className="space-y-3.5 text-xs"
                    >
                      {/* 1. Name */}
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">
                          1. Test Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={newTestForm.name}
                          onChange={(e) => setNewTestForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. ICD-10-CM Neoplasms Weekly Drill"
                          className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-teal-500 text-xs"
                        />
                      </div>

                      {/* 2. Type & 3. Course */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            2. Type <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={newTestForm.type}
                            onChange={(e) => setNewTestForm(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:outline-teal-500 text-xs"
                          >
                            <option value="Daily Quiz">Daily Quiz</option>
                            <option value="Weekly Test">Weekly Test</option>
                            <option value="Module Test">Module Test</option>
                            <option value="CPC Practice Test">CPC Practice Test</option>
                            <option value="Full Mock Exam">Full Mock Exam</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            3. Course <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={newTestForm.course}
                            onChange={(e) => setNewTestForm(prev => ({ ...prev, course: e.target.value }))}
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:outline-teal-500 text-xs"
                          >
                            <option value="CPC — Medical Coding">CPC — Medical Coding</option>
                            <option value="CIC — Inpatient Coding">CIC — Inpatient Coding</option>
                            <option value="CPB — Medical Billing">CPB — Medical Billing</option>
                            <option value="CPMA — Medical Auditing">CPMA — Medical Auditing</option>
                          </select>
                        </div>
                      </div>

                      {/* 4. Batch & 5. Topic */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            4. Target Batch <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={newTestForm.batch}
                            onChange={(e) => setNewTestForm(prev => ({ ...prev, batch: e.target.value }))}
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:outline-teal-500 text-xs"
                          >
                            <option value="CPC Morning 03">CPC Morning 03 (Active)</option>
                            <option value="CPC Evening 07">CPC Evening 07 (Active)</option>
                            <option value="FastTrack CPC 02">FastTrack CPC 02</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            5. Topic / Guidelines <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={newTestForm.topic}
                            onChange={(e) => setNewTestForm(prev => ({ ...prev, topic: e.target.value }))}
                            placeholder="e.g. CPT 43000–49999 Digestive"
                            className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-teal-500 text-xs"
                          />
                        </div>
                      </div>

                      {/* 6. Date & 7. Time Limit */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            6. Date <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={newTestForm.date}
                            onChange={(e) => setNewTestForm(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:outline-teal-500 text-xs"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            7. Time Limit <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={newTestForm.timeLimit}
                            onChange={(e) => setNewTestForm(prev => ({ ...prev, timeLimit: e.target.value }))}
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:outline-teal-500 text-xs"
                          >
                            <option value="15 min">15 min (Flash Quiz)</option>
                            <option value="30 min">30 min (Daily Drill)</option>
                            <option value="45 min">45 min (Weekly Test)</option>
                            <option value="60 min">60 min (Module Test)</option>
                            <option value="90 min">90 min</option>
                            <option value="120 min">120 min</option>
                            <option value="240 min">240 min (CPC Practice Mock)</option>
                          </select>
                        </div>
                      </div>

                      {/* 8. Total Marks & 9. Pass Mark */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            8. Total Marks <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            required
                            value={newTestForm.totalMarks}
                            onChange={(e) => setNewTestForm(prev => ({ ...prev, totalMarks: e.target.value }))}
                            className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-teal-500 text-xs"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            9. Pass Mark <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            required
                            value={newTestForm.passMark}
                            onChange={(e) => setNewTestForm(prev => ({ ...prev, passMark: e.target.value }))}
                            className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-teal-500 text-xs"
                          />
                        </div>
                      </div>

                      {/* Modal Footer Buttons */}
                      <div className="pt-3 flex items-center gap-2">
                        <button
                          type="submit"
                          className="flex-1 py-3 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
                        >
                          Create & Land in Active Tests
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCreateTestModal(false)}
                          className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ================= TAB 10: LIBRARY & MATERIALS ================= */}
          {activeNav === 'library' && (
            <TrainingLibraryMaterials
              currentUser={{
                name: trainerName,
                id: trainerId,
                branch: trainerBranch
              }}
            />
          )}

          {/* ================= TAB: PLACEMENT PREP & CERTIFICATION ================= */}
          {activeNav === 'placement' && (
            <TrainingPlacementPrep
              currentUser={{
                name: trainerName,
                id: trainerId,
                branch: trainerBranch
              }}
              students={students}
            />
          )}

          {/* ================= TAB 11: MY PROFILE ================= */}
          {activeNav === 'profile' && (
            <TrainingMyProfile
              currentUser={currentUser || {
                name: trainerName,
                id: trainerId,
                role: trainerRole,
                branch: trainerBranch
              }}
            />
          )}

          {/* ================= TAB 12: SKILLS & COURSES ================= */}
          {activeNav === 'skills' && (
            <TrainingSkillsCourses />
          )}

          {/* ================= TAB 13: SHIFT & AVAILABILITY ================= */}
          {activeNav === 'shift' && (
            <TrainingShiftAvailability 
              batches={batches} 
              demos={demos} 
              currentTrainerId={trainerId} 
              currentTrainerName={trainerName}
              currentTrainerRole={trainerRole}
            />
          )}

        </div>

      </main>

      {/* ================= MODAL: DOUBT REPLY POPUP ================= */}
      {activeDoubtModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Resolve Doubt for {activeDoubtModal.student}</h3>
              <button onClick={() => setActiveDoubtModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-700">
              <span className="font-bold text-teal-800 block mb-1">Question ({activeDoubtModal.topic}):</span>
              {activeDoubtModal.question}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Faculty Coding Explanation & References:
              </label>
              <textarea
                rows={4}
                value={doubtReplyText}
                onChange={(e) => setDoubtReplyText(e.target.value)}
                placeholder="Enter AAPC coding rationale, guideline reference or code answer..."
                className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveDoubtModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveDoubt}
                className="px-4 py-2 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold"
              >
                Send Solution & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONVERSION BREAKDOWN ================= */}
      {showConversionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-base">📈</span>
                <h3 className="text-sm font-bold text-slate-900">September 2026 Demo Conversion Ledger</h3>
              </div>
              <button onClick={() => setShowConversionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 text-teal-900 space-y-1">
              <div className="text-2xl font-black text-[#00897b]">
                {demos.length > 0 ? Math.min(100, Math.round((students.length / Math.max(1, (demos.length * 10))) * 100)) : 35.8}% Conversion Rate
              </div>
              <div className="text-xs text-teal-700 font-medium">{students.length} enrolled students from {(demos.length * 12) || 148} demo attendees</div>
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Total Demos Assigned by HR:</span>
                <span className="font-bold text-slate-900">{demos.length || 12}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Faculty Sessions Delivered:</span>
                <span className="font-bold text-slate-900">{demos.filter(d => d.status === 'Attended' || d.status === 'confirmed').length || 11} ({demos.length > 0 ? Math.round((demos.filter(d => d.status === 'Attended' || d.status === 'confirmed').length / demos.length) * 100) : 91.7}% fulfillment)</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Direct Course Enrollments:</span>
                <span className="font-bold text-emerald-600">{students.length || 53} students</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Faculty Incentive Accrued:</span>
                <span className="font-bold text-emerald-600">₹{((students.length || 53) * 500).toLocaleString()} (@ ₹500 / enroll)</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowConversionModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
