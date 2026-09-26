import React, { useState, useEffect } from 'react';
import ZoomMeeting, { parseZoomLink } from './ZoomMeeting';
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
  Bell,
  ExternalLink,
  ChevronDown,
  LogOut
} from 'lucide-react';
import TrainingLibraryMaterials from './TrainingLibraryMaterials';
import TrainingPlacementPrep from './TrainingPlacementPrep';
import TrainingMyProfile from './TrainingMyProfile';
import TrainingSkillsCourses from './TrainingSkillsCourses';
import TrainingShiftAvailability from './TrainingShiftAvailability';
import TrainerStudentDesk from './TrainerStudentDesk';
import ClassSessionRoom from './ClassSessionRoom';
import {
  getStudents,
  updateStudent,
  getDemos,
  updateDemo,
  acknowledgeDemo,
  createDemoMeeting,
  endDemoMeeting,
  sendDemoLinkEmail,
  getLeads,
  getTrainerDoubts,
  replyTrainerDoubt,
  createTrainerDoubt,
  getTrainerAssessments,
  createTrainerAssessment,
  updateAssessmentScores,
  updateAssessmentRationale,
  recordTrainerAttendance,
  getTrainerAttendance,
  getTrainerProfile,
  getTrainerSettings,
  getTrainingMaterials,
  trainingMaterialFileUrl,
  markSyllabusComplete,
  logRemedialAction,
  getNotifications,
  markNotificationRead,
  onDataUpdate,
  notifyDataUpdate
} from '../services/api';
import { TRAINER_COURSES } from '../constants/courses';
import { redirectToWhatsAppWeb } from '../utils/whatsapp';

export default function TrainingDepartmentDashboard({
  onClose,
  currentUser,
  onLogout,
  onSwitchDepartment,
  theme = 'classic'
}) {
  const [dashMenuOpen, setDashMenuOpen] = useState(false);

  // ---- Trainer identity: the Trainer roster record (admin-managed) is the source of truth ----
  const [trainerProfile, setTrainerProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [trainerRoster, setTrainerRoster] = useState([]);
  const trainerName = trainerProfile?.trainerName || currentUser?.userName || currentUser?.name || '';
  const trainerRole = trainerProfile?.role || trainerProfile?.specialization || currentUser?.role || '';
  const trainerBranch = trainerProfile?.branchName || currentUser?.branch || '';
  const trainerId = trainerProfile?.trainerId || currentUser?.trainerId || currentUser?.id || '';
  const trainerShift = trainerProfile?.shift || currentUser?.shift || '';
  const trainerCourseKey = String(trainerProfile?.courseKey || currentUser?.courseKey || '').toUpperCase();
  const trainerEmail = trainerProfile?.email || currentUser?.email || '';
  const isChiefFaculty = trainerCourseKey === 'ALL' || /chief|training head|head of training/i.test(trainerRole || '');

  const courseMatches = React.useCallback((text) => {
    if (!trainerCourseKey || trainerCourseKey === 'ALL') return false;
    const c = String(text || '').toUpperCase();
    if (trainerCourseKey === 'CIC') return c.includes('CIC') || c.includes('INPATIENT');
    if (trainerCourseKey === 'CPB') return c.includes('CPB') || c.includes('BILLING');
    if (trainerCourseKey === 'CPMA') return c.includes('CPMA') || c.includes('AUDIT');
    if (trainerCourseKey === 'CRC') return c.includes('CRC') || c.includes('RISK');
    return c.includes(trainerCourseKey);
  }, [trainerCourseKey]);

  const todayKey = new Date().toISOString().split('T')[0];
  const monthKey = todayKey.slice(0, 7);
  const monthStartKey = `${monthKey}-01`;
  const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const studentKeyOf = (s) => String(s?.studentId || s?._id || '');
  const lc = (v) => String(v || '').toLowerCase();

  const [activeNav, setActiveNav] = useState('home');
  // Restored after a page refresh so the trainer is put straight back into the demo (a refresh always drops the Zoom connection)
  const [demoRoom, setDemoRoom] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('tf_demo_room') || 'null'); } catch (_) { return null; }
  });
  const [demoMin, setDemoMin] = useState(false);

  useEffect(() => {
    try {
      if (demoRoom) sessionStorage.setItem('tf_demo_room', JSON.stringify(demoRoom));
      else sessionStorage.removeItem('tf_demo_room');
    } catch (_) {}
    if (!demoRoom) return undefined;
    // Ask before refresh/close while a demo is live
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [demoRoom]);

  // Live Database States
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [demos, setDemos] = useState([]);
  const [leads, setLeads] = useState([]);
  const [doubts, setDoubts] = useState([]);
  const [assessmentTests, setAssessmentTests] = useState([]);
  const [assessmentScores, setAssessmentScores] = useState({});
  const [rationaleTexts, setRationaleTexts] = useState({});
  const [attendanceSessions, setAttendanceSessions] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [trainerNotifications, setTrainerNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [attendanceBatchId, setAttendanceBatchId] = useState('');
  const [attendanceSavedToast, setAttendanceSavedToast] = useState(null);
  const [showDemoBucket, setShowDemoBucket] = useState(true);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [selectedBatchDrilldown, setSelectedBatchDrilldown] = useState(null);
  const [cccpToast, setCccpToast] = useState(null);
  const [activeWeakStudentModal, setActiveWeakStudentModal] = useState(null);
  const [remedialNote, setRemedialNote] = useState('');
  const [weakStudentToast, setWeakStudentToast] = useState(null);
  const [activeAssessmentTab, setActiveAssessmentTab] = useState('active');
  const [showCreateTestModal, setShowCreateTestModal] = useState(false);
  const [activeScoreModalTest, setActiveScoreModalTest] = useState(null);
  const [activeRationaleModalTest, setActiveRationaleModalTest] = useState(null);
  const [assessmentToast, setAssessmentToast] = useState(null);

  const [activeDoubtFilter, setActiveDoubtFilter] = useState('All');
  const [activeDoubtModal, setActiveDoubtModal] = useState(null);
  const [doubtReplyText, setDoubtReplyText] = useState('');

  const emptyTestForm = () => ({
    name: '',
    type: 'Weekly Test',
    course: '',
    batch: '',
    topic: '',
    date: new Date().toISOString().split('T')[0],
    timeLimit: '45 min',
    totalMarks: 50,
    passMark: 35
  });
  const [newTestForm, setNewTestForm] = useState(emptyTestForm);

  // Resolve the trainer's roster record once per login
  useEffect(() => {
    let alive = true;
    const email = currentUser?.email;
    const tid = currentUser?.trainerId || '';
    const name = currentUser?.userName || currentUser?.name;
    if (!email && !tid && !name) { setProfileError('No signed-in trainer'); return undefined; }
    getTrainerProfile({ trainerId: tid || undefined, email, name })
      .then(p => { if (alive) { setTrainerProfile(p); setProfileError(''); } })
      .catch(err => { if (alive) setProfileError(err?.response?.data?.error || 'Trainer roster record not found'); });
    return () => { alive = false; };
  }, [currentUser?.email, currentUser?.trainerId, currentUser?.name, currentUser?.userName]);

  // Fetch all real data from backend API
  const loadRealData = async () => {
    try {
      setLoading(true);
      const [stRes, dmRes, ldRes, dbtRes, asmRes, attRes, rosterRes, matRes] = await Promise.all([
        getStudents().catch(() => []),
        getDemos().catch(() => []),
        getLeads().catch(() => ({ leads: [] })),
        getTrainerDoubts().catch(() => []),
        getTrainerAssessments().catch(() => []),
        trainerId ? getTrainerAttendance({ trainerId, from: monthStartKey }).catch(() => []) : Promise.resolve([]),
        getTrainerSettings().catch(() => []),
        getTrainingMaterials().catch(() => [])
      ]);

      setStudents(Array.isArray(stRes) ? stRes : []);
      setDemos(Array.isArray(dmRes) ? dmRes : []);
      setLeads(Array.isArray(ldRes?.leads) ? ldRes.leads : (Array.isArray(ldRes) ? ldRes : []));
      setDoubts(Array.isArray(dbtRes) ? dbtRes : []);
      setTrainerRoster(Array.isArray(rosterRes) ? rosterRes : []);
      setMaterials(Array.isArray(matRes) ? matRes : []);
      setAttendanceSessions(Array.isArray(attRes) ? attRes : []);

      // Only this trainer's tests (plus legacy tests saved before trainer ownership existed)
      const asmList = (Array.isArray(asmRes) ? asmRes : []).filter(t => !t.trainerId || t.trainerId === trainerId);
      setAssessmentTests(asmList);
      const initialScores = {};
      const initialRationales = {};
      asmList.forEach(t => {
        if (t.scores) initialScores[t.id] = t.scores;
        if (t.rationale) initialRationales[t.id] = t.rationale;
      });
      setAssessmentScores(initialScores);
      setRationaleTexts(initialRationales);
    } catch (err) {
      console.error('Error fetching real trainer data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    if (!trainerId) return;
    try {
      const list = await getNotifications({ audience: 'trainer', recipientId: trainerId, recipientName: trainerName });
      setTrainerNotifications(Array.isArray(list) ? list : []);
    } catch (_) {}
  };

  useEffect(() => {
    loadRealData();
    loadNotifications();
    const unsub = onDataUpdate((entity) => {
      if (['students', 'doubts', 'assessments', 'leads', 'demos', 'trainer_attendance', 'materials', 'trainer_settings'].includes(entity)) {
        loadRealData();
      }
      if (entity === 'notifications' || entity === 'students' || entity === 'demos') loadNotifications();
    });
    // Poll so HR handovers / new demos made on other machines reach the trainer
    const poll = setInterval(() => { loadNotifications(); }, 60000);
    return () => { unsub(); clearInterval(poll); };
  }, [trainerId]);

  // Students allocated to this trainer by HR at handover. Legacy students that
  // were "Sent to Training" before trainer allocation existed fall back to course match.
  const myStudents = React.useMemo(() => {
    if (!students || students.length === 0 || !trainerId) return [];
    return students.filter(st => {
      if (st.trainerId) return st.trainerId === trainerId;
      if (st.handoverStatus !== 'Sent to Training') return false;
      return isChiefFaculty || courseMatches(st.course);
    });
  }, [students, trainerId, isChiefFaculty, courseMatches]);

  // Batches = HR-assigned batch names of the trainer's students
  const batches = React.useMemo(() => {
    const map = {};
    myStudents.forEach(st => {
      const key = st.batchName || st.course || 'Unassigned batch';
      if (!map[key]) {
        map[key] = {
          id: key.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: key,
          course: st.course || '',
          timing: st.batchTiming || '',
          mode: st.mode || '',
          modules: {},
          zoomLink: trainerProfile?.classZoomLink || '',
          students: []
        };
      }
      map[key].students.push(st);
      if (st.syllabusModule) map[key].modules[st.syllabusModule] = (map[key].modules[st.syllabusModule] || 0) + 1;
    });
    return Object.values(map).map(b => ({
      ...b,
      module: Object.entries(b.modules).sort((a, c) => c[1] - a[1])[0]?.[0] || ''
    }));
  }, [myStudents, trainerProfile?.classZoomLink]);

  useEffect(() => {
    if (!attendanceBatchId && batches[0]) setAttendanceBatchId(batches[0].id);
  }, [batches, attendanceBatchId]);
  const attendanceBatch = batches.find(b => b.id === attendanceBatchId) || batches[0] || null;

  // Today's saved marks for the selected batch (from the server)
  const todaysSession = React.useMemo(() => (
    attendanceBatch ? attendanceSessions.find(a => a.batch === attendanceBatch.name && a.date === todayKey) : null
  ), [attendanceSessions, attendanceBatch, todayKey]);

  const attendanceList = React.useMemo(() => (
    (attendanceBatch?.students || []).map(s => {
      const roll = studentKeyOf(s);
      return {
        id: s._id || roll,
        roll,
        name: s.name,
        course: s.course,
        status: todaysSession?.records?.[roll] || 'Unmarked',
        attendancePct: typeof s.attendancePct === 'number' ? s.attendancePct : null
      };
    })
  ), [attendanceBatch, todaysSession]);

  const myStudentKeys = React.useMemo(() => new Set(myStudents.map(studentKeyOf)), [myStudents]);

  // Derived Weak Students — only from real signals (attendance, test average, hold)
  const weakStudents = React.useMemo(() => {
    return myStudents
      .map((s) => {
        const reasons = [];
        if (s.statusGroup === 'on_hold') reasons.push(`Enrollment on hold${s.pendingBalance ? ` · balance ₹${Number(s.pendingBalance).toLocaleString('en-IN')}` : ''}`);
        if (typeof s.attendancePct === 'number' && s.attendancePct < 80) reasons.push(`Attendance ${s.attendancePct}%`);
        if (typeof s.assessmentScore === 'number' && s.assessmentScore < 60) reasons.push(`Test average ${s.assessmentScore}%`);
        if (!reasons.length) return null;
        const actions = Array.isArray(s.remedialActions) ? s.remedialActions : [];
        const lastAction = actions[actions.length - 1];
        const severe = s.statusGroup === 'on_hold' || reasons.length > 1;
        return {
          id: s._id || studentKeyOf(s),
          realId: s._id || s.studentId,
          name: s.name,
          studentId: s.studentId,
          course: s.course,
          issue: reasons.join(' · '),
          batch: `${s.batchName || s.course}${s.mode ? ` (${s.mode})` : ''}`,
          dotColor: severe ? 'bg-rose-500' : 'bg-amber-500',
          dotGradient: severe ? 'from-rose-400 to-rose-600' : 'from-amber-300 to-amber-500',
          bgTone: severe ? 'bg-[#fee2e2]/70' : 'bg-[#fef3c7]/70',
          lastAction,
          reviewed: Boolean(lastAction)
        };
      })
      .filter(Boolean);
  }, [myStudents]);

  // Doubts routed to this trainer (legacy unrouted doubts: my students or my course)
  const myDoubts = React.useMemo(() => (
    doubts.filter(d => {
      if (d.trainerId) return d.trainerId === trainerId;
      if (d.studentId && myStudentKeys.has(String(d.studentId))) return true;
      return isChiefFaculty || courseMatches(`${d.course || ''} ${d.batch || ''}`);
    })
  ), [doubts, trainerId, myStudentKeys, isChiefFaculty, courseMatches]);

  // Demos routed to this trainer: ONLY those the server notified them about
  // (language + location + free time match) or that are assigned to them.
  const myExpertDemos = React.useMemo(() => {
    if (!trainerId) return [];
    return demos.filter(d => (
      (Array.isArray(d.notifiedTrainerIds) && d.notifiedTrainerIds.includes(trainerId)) ||
      d.notificationSentTo === trainerId ||
      (d.trainerId && d.trainerId === trainerId)
    ));
  }, [demos, trainerId]);

  // New demo alerts — notified to me, not yet accepted by anyone
  const newDemoAlerts = React.useMemo(() => (
    myExpertDemos.filter(d => lc(d.status) === 'booked' && !d.notificationRead && d.notificationSent === true)
  ), [myExpertDemos]);

  const inThisMonth = (d) => String(d?.preferredDate || d?.createdAt || '').slice(0, 7) === monthKey;
  const myMonthDemos = React.useMemo(() => myExpertDemos.filter(inThisMonth), [myExpertDemos, monthKey]);
  const isAttended = (d) => lc(d.status) === 'attended';

  // Admissions that came from demos I delivered (matched on phone / email)
  const convertedStudents = React.useMemo(() => {
    const digits = (p) => String(p || '').replace(/\D/g, '').slice(-10);
    const attended = myExpertDemos.filter(isAttended);
    const phones = new Set(attended.map(d => digits(d.phone)).filter(p => p.length === 10));
    const emails = new Set(attended.map(d => lc(d.email)).filter(Boolean));
    return students.filter(s => phones.has(digits(s.phone)) || (s.email && emails.has(lc(s.email))));
  }, [myExpertDemos, students]);

  // Scorecard — every factor is computed from recorded data; factors with no
  // data yet are shown as N/A and excluded (score is normalised over the rest)
  const scorecardMetrics = React.useMemo(() => {
    const today = new Date();
    let workingDays = 0;
    for (let d = 1; d <= today.getDate(); d++) {
      const day = new Date(today.getFullYear(), today.getMonth(), d).getDay();
      if (day !== 0) workingDays += 1;
    }
    const weeksElapsed = Math.max(1, Math.ceil(today.getDate() / 7));
    const pct = (a, b) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);
    const factor = (name, weight, achieved, inputs, applicable = true) => ({
      factor: name,
      weight: String(weight),
      inputs: applicable ? inputs : 'no data yet',
      achievement: applicable ? `${achieved}%` : '—',
      earned: applicable ? ((achieved * weight) / 100).toFixed(2) : '0.00',
      applicable,
      isNa: !applicable,
      tag: applicable ? undefined : 'N/A'
    });

    const monthSessions = attendanceSessions.filter(a => String(a.date || '') >= monthStartKey);
    const sessionsTarget = batches.length * workingDays;
    const sessionsDone = monthSessions.length;

    const attValues = myStudents.map(s => s.attendancePct).filter(v => typeof v === 'number');
    const avgAtt = attValues.length ? Math.round(attValues.reduce((a, b) => a + b, 0) / attValues.length) : 0;

    const monthTests = assessmentTests.filter(t => String(t.date || t.createdAt || '').slice(0, 7) === monthKey);
    const testsTarget = batches.length * weeksElapsed;

    const weakReviewed = weakStudents.filter(w => w.reviewed).length;

    const repliedInSla = myDoubts.filter(d => d.status === 'Replied' && d.repliedAt && d.createdAt && (new Date(d.repliedAt) - new Date(d.createdAt)) <= 24 * 36e5).length;

    const demosClosed = myMonthDemos.filter(d => ['attended', 'missed'].includes(lc(d.status)));
    const demosDone = demosClosed.filter(isAttended).length;

    const interviewed = myStudents.filter(s => typeof s.mockScore === 'number').length;

    const sameDay = monthSessions.filter(a => a.createdAt && String(a.createdAt).slice(0, 10) === a.date).length;

    const factors = [
      factor('Classes / Sessions', 20, pct(sessionsDone, sessionsTarget), `${sessionsDone} / ${sessionsTarget}`, sessionsTarget > 0),
      factor('Attendance', 10, avgAtt, `${avgAtt}% avg`, attValues.length > 0),
      factor('Syllabus completed', 10, pct(myStudents.filter(s => s.syllabusCompleted).length, myStudents.length), `${myStudents.filter(s => s.syllabusCompleted).length} / ${myStudents.length}`, myStudents.some(s => s.syllabusCompleted)),
      factor('Assessments Conducted', 20, pct(monthTests.length, testsTarget), `${monthTests.length} / ${testsTarget}`, batches.length > 0),
      factor('Weak reviewed', 10, weakStudents.length ? pct(weakReviewed, weakStudents.length) : 100, `${weakReviewed} / ${weakStudents.length}`, myStudents.length > 0),
      factor('Doubts resolved in SLA', 10, pct(repliedInSla, myDoubts.length), `${repliedInSla} / ${myDoubts.length}`, myDoubts.length > 0),
      factor('Demos done', 10, pct(demosDone, demosClosed.length), `${demosDone} / ${demosClosed.length}`, demosClosed.length > 0),
      factor('Mock interviews done', 10, pct(interviewed, myStudents.length), `${interviewed} / ${myStudents.length}`, interviewed > 0),
      factor('Cert counselling', 5, 0, '', false),
      factor('Same-day updates', 5, pct(sameDay, monthSessions.length), `${sameDay} / ${monthSessions.length}`, monthSessions.length > 0)
    ];
    const applicableWeight = factors.filter(f => f.applicable).reduce((a, f) => a + Number(f.weight), 0);
    const earnedTotal = factors.reduce((a, f) => a + parseFloat(f.earned), 0);
    const actionScore = applicableWeight > 0 ? parseFloat(((earnedTotal / applicableWeight) * 100).toFixed(1)) : 0;

    let zone = applicableWeight > 0 ? 'Needs Improvement' : 'No data yet';
    if (actionScore >= 90) zone = 'Platinum Zone';
    else if (actionScore >= 80) zone = 'Gold Zone';
    else if (actionScore >= 70) zone = 'Silver Zone';
    else if (actionScore >= 60) zone = 'Bronze Zone';

    const bucket = (name, weight, achieved, applicable) => ({
      bucket: name,
      weight: String(weight),
      achieved: applicable ? `${achieved}%` : 'N/A',
      earned: applicable ? ((achieved * weight) / 100).toFixed(2) : '—',
      applicable,
      raw: applicable ? (achieved * weight) / 100 : 0
    });
    const assessmentAch = testsTarget > 0 ? pct(monthTests.length, testsTarget) : 0;
    const qualityBuckets = [
      bucket('Attendance', 30, avgAtt, attValues.length > 0),
      bucket('Assessments conducted', 25, assessmentAch, batches.length > 0),
      bucket('Student feedback (doubt SLA)', 20, pct(repliedInSla, myDoubts.length), myDoubts.length > 0),
      bucket('Employee feedback', 15, 0, false),
      bucket('Quality rating', 10, 0, false)
    ];
    const qWeight = qualityBuckets.filter(b => b.applicable).reduce((a, b) => a + Number(b.weight), 0);
    const qualityScore = qWeight > 0 ? parseFloat(((qualityBuckets.reduce((a, b) => a + b.raw, 0) / qWeight) * 100).toFixed(1)) : 0;

    const gatesPass = attValues.length === 0 || avgAtt >= 75;
    const payBase = Number(trainerProfile?.variablePayBase) || 0;
    const variablePay = gatesPass && payBase > 0 ? Math.round((qualityScore / 100) * payBase) : 0;

    return { actionScore, zone, variablePay, payBase, qualityScore, gatesPass, factors, qualityBuckets };
  }, [batches, attendanceSessions, assessmentTests, weakStudents, myDoubts, myMonthDemos, myStudents, trainerProfile, monthKey, monthStartKey]);

  // Incentive events — demos I delivered this month + admissions converted from my demos
  const incentiveEvents = React.useMemo(() => {
    const demoRate = Number(trainerProfile?.demoIncentive) || 0;
    const admRate = Number(trainerProfile?.admissionIncentive) || 0;
    const events = [];
    myMonthDemos.forEach((d, idx) => {
      const verified = isAttended(d);
      events.push({
        id: d._id || `DEMO-${idx + 1}`,
        code: `DEMO-${String(idx + 1).padStart(3, '0')}`,
        type: 'Course Demo Session',
        candidate: d.candidateName,
        role: 'Demo Trainer',
        baseAmt: demoRate,
        share: '100%',
        isVerified: verified,
        payable: verified ? demoRate : 0
      });
    });
    convertedStudents.filter(s => String(s.createdAt || '').slice(0, 7) === monthKey).forEach((s, idx) => {
      const verified = s.statusGroup !== 'on_hold';
      events.push({
        id: s._id || `ADM-${idx + 1}`,
        code: `ADM-${String(idx + 1).padStart(3, '0')}`,
        type: 'Admission from my demo',
        candidate: s.name,
        role: 'Demo Trainer',
        baseAmt: admRate,
        share: '100%',
        isVerified: verified,
        payable: verified ? admRate : 0
      });
    });
    return events;
  }, [myMonthDemos, convertedStudents, trainerProfile, monthKey]);

  const incentivesConfigured = Number(trainerProfile?.demoIncentive) > 0 || Number(trainerProfile?.admissionIncentive) > 0;

  const totalEventCash = React.useMemo(() => {
    return incentiveEvents.reduce((acc, ev) => acc + (ev.isVerified ? ev.payable : 0), 0);
  }, [incentiveEvents]);

  const monthlyTake = (scorecardMetrics.variablePay || 0) + totalEventCash;

  // Materials the trainer has pushed to a batch (shown in the session room)
  const materialsForBatch = (batchName) => materials.filter(m => (m.assignments || []).some(a => a.batch === batchName));

  const [demoToast, setDemoToast] = useState(null);
  const flashDemoToast = (msg, ms = 3500) => { setDemoToast(msg); setTimeout(() => setDemoToast(null), ms); };

  const handleAcknowledgeDemo = async (demoId) => {
    try {
      const updated = await acknowledgeDemo(demoId, { trainerId, trainerName });
      setDemos(prev => prev.map(d => (d._id === demoId || d.id === demoId) ? { ...d, ...updated } : d));
      flashDemoToast('✓ Demo slot accepted — the HR who booked it has been notified.');
    } catch (e) {
      flashDemoToast(e?.response?.data?.error || 'Could not accept this demo slot', 5000);
    }
  };

  const setDemoOutcome = async (lead, status) => {
    try {
      if (!lead._id) throw new Error('Demo is not saved');
      const updated = await updateDemo(lead._id, { status, updatedBy: 'trainer' });
      setDemos(prev => prev.map(l => l._id === lead._id ? { ...l, ...updated } : l));
      flashDemoToast(status === 'attended'
        ? `✓ ${lead.candidateName} marked Attended · lead moved to Demo Attended · HR notified`
        : `${lead.candidateName} marked No-show · HR notified to reschedule`);
    } catch (e) {
      flashDemoToast(e?.response?.data?.error || e.message || 'Could not update demo', 5000);
    }
  };

  // ---- Demo Zoom: create a unique meeting per booked demo, send link to student, join embedded ----
  const handleCreateDemoMeeting = async (lead) => {
    if (!lead._id) { flashDemoToast('This demo is not saved in the database yet'); return null; }
    try {
      setDemoToast('Creating Zoom meeting…');
      const updated = await createDemoMeeting(lead._id);
      setDemos(prev => prev.map(l => l._id === lead._id ? { ...l, ...updated } : l));
      flashDemoToast('✓ Zoom meeting created', 3000);
      return { ...lead, ...updated };
    } catch (e) {
      flashDemoToast(e?.response?.data?.error || 'Could not create Zoom meeting', 5000);
      return null;
    }
  };

  const handleSendDemoLink = async (lead) => {
    let d = lead;
    if (!d.zoomMeetingId) { d = await handleCreateDemoMeeting(lead); if (!d) return; }
    let phone = String(lead.phone || '').replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;
    const when = [lead.preferredDate, lead.timeSlot || lead.time].filter(Boolean).join(' ');
    const text = `Hi ${lead.candidateName}, your ${lead.course} demo class with ${trainerName} is scheduled for ${when}. Join here: ${d.link}`;
    try { await navigator.clipboard.writeText(d.link); } catch (_) {}
    redirectToWhatsAppWeb(phone, text);
    flashDemoToast('Link copied · WhatsApp Web opened with the message', 3000);
  };

  const handleEmailDemoLink = async (lead) => {
    if (!lead.email) { flashDemoToast('No student email on this demo'); return; }
    let d = lead;
    if (!d.zoomMeetingId) { d = await handleCreateDemoMeeting(lead); if (!d) return; }
    try {
      setDemoToast('Sending email…');
      await sendDemoLinkEmail(d._id);
      flashDemoToast(`✓ Zoom link emailed to ${lead.email}`, 5000);
    } catch (e) {
      // Email service not set up (or failed): open the trainer's own mail app with the message ready
      const when = [lead.preferredDate, lead.timeSlot || lead.time].filter(Boolean).join(' ');
      const subject = `Your ${lead.course} demo class link – Thoughtflows Academy`;
      const body = `Hi ${lead.candidateName},\n\nYour ${lead.course} demo class with ${trainerName} is scheduled for ${when}.\n\nJoin on Zoom: ${d.link}\n\nPlease join 5 minutes early.`;
      window.open(`mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_self');
      flashDemoToast((e?.response?.data?.error || 'Email failed') + ' — opened your mail app instead', 5000);
    }
  };

  // End the live demo: mark it Attended (server also moves the lead to "Demo Attended" and notifies HR) and leave Zoom
  const endDemo = async (room) => {
    try { if (room?._id) await endDemoMeeting(room._id); } catch (e) { console.warn(e); }
    if (room?._id) await setDemoOutcome(room, 'attended');
    setDemoRoom(null);
    setDemoMin(false);
  };

  const handleJoinDemo = async (lead) => {
    let d = lead;
    if (!d.zoomMeetingId) { d = await handleCreateDemoMeeting(lead); if (!d) return; }
    setDemoMin(false);
    setDemoRoom(d);
  };

  // Save attendance marks to the server — updates each student's attendance %,
  // their own dashboard, the Leadership risk view and alerts HR below 75%
  const saveAttendanceMarks = async (records) => {
    if (!attendanceBatch) return;
    const optimistic = { ...(todaysSession?.records || {}), ...records };
    setAttendanceSessions(prev => {
      const others = prev.filter(a => !(a.batch === attendanceBatch.name && a.date === todayKey));
      return [{ ...(todaysSession || { batch: attendanceBatch.name, date: todayKey, createdAt: new Date().toISOString() }), records: optimistic }, ...others];
    });
    try {
      const res = await recordTrainerAttendance({
        trainerId,
        trainerName,
        batch: attendanceBatch.name,
        date: todayKey,
        topic: attendanceBatch.module,
        records
      });
      if (res?.data) {
        setAttendanceSessions(prev => [res.data, ...prev.filter(a => !(a.batch === res.data.batch && a.date === res.data.date))]);
      }
      setAttendanceSavedToast('✓ Attendance saved to the student record · attendance % updated for student, HR & Leadership');
    } catch (e) {
      setAttendanceSavedToast(`⚠ Could not save attendance: ${e?.response?.data?.error || e.message}`);
    }
    setTimeout(() => setAttendanceSavedToast(null), 3000);
  };

  const handleResolveDoubt = async () => {
    if (!activeDoubtModal || !doubtReplyText.trim()) return;
    try {
      const updated = await replyTrainerDoubt(activeDoubtModal.id, doubtReplyText);
      setDoubts(prev => prev.map(d => d.id === activeDoubtModal.id ? { ...d, ...updated } : d));
      setActiveDoubtModal(null);
      setDoubtReplyText('');
    } catch (e) {
      flashDemoToast(e?.response?.data?.error || 'Could not send the reply', 5000);
    }
  };

  const unreadNotifs = trainerNotifications.filter(n => !n.read);
  const handleOpenNotification = async (n) => {
    if (!n.read) {
      try { await markNotificationRead(n._id); } catch (_) {}
      setTrainerNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
    }
    if (n.type === 'demo') setActiveNav('demos');
    else if (n.type === 'doubt') setActiveNav('doubts');
    else if (n.type === 'handover') setActiveNav('students');
    setShowNotifPanel(false);
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

                <button
                  onClick={() => setActiveNav('student_desk')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeNav === 'student_desk'
                      ? 'bg-[#00897b] text-white shadow-md shadow-[#00897b]/30'
                      : 'text-[#92afb4] hover:text-white hover:bg-[#152a36]'
                  }`}
                >
                  <FileCheck className="w-4 h-4 shrink-0" />
                  <span>Submissions & Requests</span>
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
            onClick={() => (onLogout ? onLogout() : onClose ? onClose() : null)}
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
              {activeNav === 'student_desk' && 'Student Submissions & Requests'}
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
              {activeNav === 'student_desk' && 'Assignments, resumes, video intros · mock interview & 1-on-1 requests'}
              {activeNav === 'placement' && "Mark each student's readiness · CCCP Certification Cell sync"}
              {activeNav === 'profile' && `${trainerName} · ${trainerId} · ${trainerRole} · ${trainerBranch}`}
              {activeNav === 'skills' && 'L1 Assistant · L2 Regular · L3 Senior · L4 Lead. You can be allocated to a subject only at L2 or above.'}
              {activeNav === 'shift' && `${trainerShift} · Max load protection`}
              {activeNav !== 'home' && activeNav !== 'session_room' && activeNav !== 'demos' && activeNav !== 'doubts' && activeNav !== 'scorecard' && activeNav !== 'incentives' && activeNav !== 'batches' && activeNav !== 'students' && activeNav !== 'weak_students' && activeNav !== 'assessments' && activeNav !== 'library' && activeNav !== 'placement' && activeNav !== 'profile' && activeNav !== 'skills' && activeNav !== 'shift' && `Thoughtflows Medical Coding Academy · ${trainerBranch}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowNotifPanel(v => !v)}
                className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 cursor-pointer"
                title="Notifications from HR & students"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifs.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center">{unreadNotifs.length}</span>
                )}
              </button>
              {showNotifPanel && (
                <div className="absolute right-0 mt-2 w-80 max-h-[420px] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl z-40">
                  <div className="px-4 py-3 border-b border-slate-100 text-xs font-bold text-slate-900">Notifications</div>
                  {trainerNotifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-slate-400">No notifications yet.</div>
                  ) : trainerNotifications.map(n => (
                    <button
                      key={n._id}
                      onClick={() => handleOpenNotification(n)}
                      className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 ${n.read ? '' : 'bg-teal-50/60'}`}
                    >
                      <div className="text-xs font-bold text-slate-900">{n.title}</div>
                      <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{n.message}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => (onLogout ? onLogout() : onClose ? onClose() : null)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {profileError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
            {profileError}. Your shift, course, pay and class link come from the trainer roster — ask the admin to link your login email to your trainer record in Trainer Settings.
          </div>
        )}

        {/* Demo Zoom room – lives at page level so it stays connected while the trainer browses other sections */}
        {demoRoom && (
          <>
            {demoMin && (
              <div className="fixed bottom-4 right-4 z-[80] bg-[#0f212d] text-white rounded-2xl border border-teal-500/60 shadow-2xl px-4 py-3 flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span></span>
                <div className="leading-tight">
                  <div className="text-xs font-bold">Demo live · {demoRoom.candidateName}</div>
                  <div className="text-[10px] text-slate-300">Zoom still connected</div>
                </div>
                <button onClick={() => setDemoMin(false)} className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-[11px] font-bold">Expand</button>
                <button onClick={() => endDemo(demoRoom)} className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-[11px] font-bold">End</button>
              </div>
            )}
            <div className={demoMin ? 'fixed top-0 -left-[4000px] w-[1100px] pointer-events-none' : 'fixed inset-0 z-[80] bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto'}>
              <div className="bg-[#0f212d] rounded-2xl w-full max-w-6xl p-4 sm:p-5 space-y-3 border border-[#1b3446] shadow-2xl">
                <div className="flex items-center justify-between gap-3 text-white">
                  <div>
                    <div className="text-sm sm:text-base font-extrabold">Demo · {demoRoom.candidateName}</div>
                    <div className="text-xs text-slate-300">{demoRoom.course} · {demoRoom.time || demoRoom.timeSlot}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEmailDemoLink(demoRoom)} className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all cursor-pointer">Email link to student</button>
                    <button onClick={() => setDemoMin(true)} className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all cursor-pointer">Minimize</button>
                    <button onClick={() => endDemo(demoRoom)} className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer">End Demo</button>
                  </div>
                </div>
                <ZoomMeeting demoId={demoRoom._id} userName={trainerName} height={580} />
              </div>
            </div>
          </>
        )}

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
                      {[trainerId, trainerRole, trainerBranch, trainerShift && `Shift ${trainerShift}`].filter(Boolean).join(' · ')}
                    </p>

                    {/* 5 Stats row */}
                    <div className="grid grid-cols-5 gap-2 mt-5 pt-4 border-t border-slate-100">
                      <div>
                        <div className="text-2xl font-black text-slate-900">{batches.length}</div>
                        <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">SESSIONS</div>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-slate-900">
                          {myExpertDemos.filter(d => ['booked', 'confirmed'].includes(lc(d.status))).length}
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
                        {batches[0]?.name || 'No batch allocated yet'}
                      </h3>
                      <p className="text-xs text-slate-300 font-medium">
                        {batches[0]
                          ? [batches[0].timing, batches[0].mode, `${batches[0].students.length} students enrolled`].filter(Boolean).join(' · ')
                          : 'HR allocates students to you from the Handover Desk.'}
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
                            Slot: <strong className="text-slate-900">{[newDemoAlerts[0].preferredDate, newDemoAlerts[0].timeSlot || newDemoAlerts[0].time].filter(Boolean).join(' ') || '—'}</strong> · Mode: <strong className="text-slate-800">{newDemoAlerts[0].mode || '—'}</strong> · Language: <strong className="text-slate-800">{newDemoAlerts[0].language || '—'}</strong>
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
                          <span>Open Demos Desk ({myExpertDemos.length})</span>
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
                            ? `DEMO DESK · ${myExpertDemos[0].course} · ${[myExpertDemos[0].preferredDate, myExpertDemos[0].timeSlot].filter(Boolean).join(' ') || myExpertDemos[0].status}` 
                            : 'DEMO DESK · All Course Expert Demos Handled'}
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium">
                          {myExpertDemos[0] 
                            ? `${myExpertDemos[0].candidateName}${myExpertDemos[0].mode ? ` · ${myExpertDemos[0].mode}` : ''} · Routed to you by the demo engine.`
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
                    <div className="text-2xl font-black text-[#f59e0b]">{myStudents.filter(s => typeof s.attendancePct === 'number' && s.attendancePct < 75).length}</div>
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
                    <div className="text-2xl font-black text-slate-800">{myExpertDemos.filter(isAttended).length}</div>
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
                              <div className="text-[11px] text-slate-500">{[batch.timing, batch.mode, `${batch.students.length} students`].filter(Boolean).join(' · ')}</div>
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
                      {scorecardMetrics.actionScore}
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-1">/ 100 · {scorecardMetrics.zone}</div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ================= TAB 2: CLASS SESSION ROOM ================= */}
          {activeNav === 'session_room' && (
            <ClassSessionRoom
              trainerId={trainerId}
              trainerName={trainerName}
              batches={batches}
              materials={materials}
              onAttendanceSaved={loadRealData}
            />
          )}

          {/* ================= TAB 3: ATTENDANCE ================= */}
          {activeNav === 'attendance' && (
            <div className="space-y-6 max-w-[1280px]">
              {attendanceSavedToast && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-fadeIn">
                  {attendanceSavedToast}
                </div>
              )}

              <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-[#22c55e] text-white flex items-center justify-center text-xs font-black shadow-sm">✓</div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">Live Attendance · {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {batches.length > 1 && (
                      <select
                        value={attendanceBatch?.id || ''}
                        onChange={(e) => setAttendanceBatchId(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                      >
                        {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    )}
                    {attendanceList.length > 0 && (
                      <button
                        onClick={() => saveAttendanceMarks(Object.fromEntries(attendanceList.map(s => [s.roll, 'Present'])))}
                        className="px-3.5 py-1.5 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
                      >
                        Mark All Present
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Mark today's class. Each mark is saved to the student record and recalculates attendance % on the student's dashboard, the HR's student CRM and the Leadership dropout-risk view. HR is alerted automatically when a student drops below 75%.
                </p>

                {attendanceList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 font-medium">
                    No students allocated to you yet.
                  </div>
                ) : (
                  <div className="pt-2 space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100">
                      <span className="font-bold text-slate-800">{attendanceBatch?.name} · {attendanceList.length} Students</span>
                      <span>{[attendanceBatch?.module, attendanceBatch?.timing].filter(Boolean).join(' · ')}</span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-4 font-bold">Student ID</th>
                            <th className="py-3 px-4 font-bold">Student Name</th>
                            <th className="py-3 px-4 font-bold">Cumulative Attendance</th>
                            <th className="py-3 px-4 font-bold">Today</th>
                            <th className="py-3 px-4 font-bold text-right">Quick Mark</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {attendanceList.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50/70 transition-all">
                              <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.roll}</td>
                              <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                              <td className="py-3 px-4">
                                {s.attendancePct === null ? (
                                  <span className="text-slate-400">—</span>
                                ) : (
                                  <span className={`font-bold ${s.attendancePct < 75 ? 'text-rose-600' : 'text-emerald-600'}`}>{s.attendancePct}%</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  s.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  s.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  s.status === 'Absent' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                  'bg-slate-50 text-slate-500 border border-slate-200'
                                }`}>
                                  {s.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right space-x-1.5">
                                {[['Present', 'P', 'hover:bg-emerald-100 hover:text-emerald-800'], ['Late', 'L', 'hover:bg-amber-100 hover:text-amber-800'], ['Absent', 'A', 'hover:bg-rose-100 hover:text-rose-800']].map(([status, label, cls]) => (
                                  <button
                                    key={status}
                                    onClick={() => saveAttendanceMarks({ [s.roll]: status })}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${s.status === status ? 'bg-slate-800 text-white' : `bg-slate-100 ${cls}`}`}
                                  >
                                    {label}
                                  </button>
                                ))}
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
                            Phone: <span className="font-mono font-bold text-slate-800">{alert.phone}</span> · Slot: <span className="font-bold text-slate-800">{[alert.preferredDate, alert.timeSlot || alert.time].filter(Boolean).join(' ') || '—'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Mode: {alert.mode || '—'} · Language: {alert.language || '—'}{alert.bookedBy ? ` · Booked by ${alert.bookedBy}` : ''}
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
                      {`${myExpertDemos.length} assigned to you`}
                    </span>
                  </div>
                </div>

                {!showDemoBucket || myExpertDemos.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 font-medium">
                    No upcoming demos booked for your course expertise right now.
                  </div>
                ) : (
                  <div className="pt-2 space-y-4 animate-fadeIn">
                    {(() => {
                      const upcoming = myExpertDemos
                        .filter(d => lc(d.status) === 'confirmed' && (!d.trainerId || d.trainerId === trainerId))
                        .sort((x, y) => String(x.preferredDate).localeCompare(String(y.preferredDate)))[0];
                      if (!upcoming) return null;
                      return (
                        <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">Next confirmed demo · {upcoming.candidateName}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                                {[upcoming.preferredDate, upcoming.timeSlot].filter(Boolean).join(' ')}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-1">{upcoming.course}{upcoming.mode ? ` · ${upcoming.mode}` : ''}</div>
                          </div>
                          <button
                            onClick={() => handleJoinDemo(upcoming)}
                            className="px-4 py-2 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white text-xs font-bold shadow-sm shrink-0 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Start Demo (Zoom)</span>
                          </button>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
                      {myExpertDemos.map((lead, idx) => (
                        <div key={lead._id || lead.id || idx} className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-teal-400/80 transition-all text-xs space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 text-[13px]">{lead.candidateName}</span>
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
                            {lead.email && <div>✉️ <span className="text-slate-700">{lead.email}</span></div>}
                            <div>🕒 {[lead.preferredDate, lead.timeSlot || lead.time].filter(Boolean).join(' ') || '—'}{lead.mode ? ` · ${lead.mode}` : ''}</div>
                            {lead.language && <div>🗣 {lead.language}{lead.location ? ` · ${lead.location}` : ''}</div>}
                            {lead.bookedBy && <div>👤 Booked by {lead.bookedBy}</div>}
                          </div>

                          <div className="text-[10.5px] text-emerald-800 font-semibold bg-emerald-50/70 p-2 rounded-lg border border-emerald-100 flex items-center gap-1">
                            <span>🎯</span>
                            <span>Assigned trainer: <strong className="text-slate-900">{lead.trainer || 'Awaiting acceptance'}</strong></span>
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
                                <span>✓ In Shift{lead.shiftTiming ? ` (${lead.shiftTiming})` : ''}</span>
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

                          {lc(lead.status) === 'attended' ? (
                            <div className="mt-1 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold text-center">
                              ✓ Demo Completed
                            </div>
                          ) : lc(lead.status) === 'missed' ? (
                            <div className="mt-1 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold text-center">
                              No-show · HR notified to reschedule
                            </div>
                          ) : (lead.trainerId && lead.trainerId !== trainerId && lc(lead.status) === 'confirmed') ? (
                            <div className="mt-1 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-bold text-center">
                              Accepted by {lead.trainer}
                            </div>
                          ) : lc(lead.status) === 'booked' ? (
                            <button
                              onClick={() => handleAcknowledgeDemo(lead._id)}
                              className="w-full py-2 rounded-lg bg-[#00897b] hover:bg-[#00796b] text-white text-[11px] font-bold cursor-pointer"
                            >
                              Accept Demo Slot
                            </button>
                          ) : (
                            <>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleJoinDemo(lead)}
                              className="flex-1 py-1.5 rounded-lg bg-[#009688] hover:bg-[#00897b] text-white text-[10.5px] font-bold transition-colors cursor-pointer text-center"
                            >
                              ▶ Start Demo (Zoom)
                            </button>
                            <button
                              onClick={() => handleEmailDemoLink(lead)}
                              className="flex-1 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[10.5px] font-bold transition-colors cursor-pointer text-center"
                            >
                              ✉️ Email Link
                            </button>
                            <button
                              onClick={() => handleSendDemoLink(lead)}
                              title="Send via WhatsApp"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10.5px] font-bold transition-colors cursor-pointer"
                            >
                              WhatsApp
                            </button>
                          </div>

                          <div className="flex gap-1.5 pt-1.5 border-t border-slate-100">
                            <button
                              onClick={() => setDemoOutcome(lead, 'attended')}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10.5px] font-bold transition-colors cursor-pointer text-center"
                            >
                              Attended
                            </button>
                            <button
                              onClick={() => setDemoOutcome(lead, 'missed')}
                              className="flex-1 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[10.5px] font-bold transition-colors cursor-pointer text-center"
                            >
                              No-show
                            </button>
                          </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card 3: Trainer roster (live from Trainer Settings) */}
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>🎓</span> Demo Routing Roster
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Live trainer roster. A demo is routed to trainers matching the student's language and branch who are in shift and free at the slot.
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                    {trainerRoster.filter(t => t.active !== false).length} active trainers
                  </span>
                </div>

                {trainerRoster.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">No trainers configured in Trainer Settings yet.</div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4 font-bold">Trainer</th>
                          <th className="py-3 px-4 font-bold">Course</th>
                          <th className="py-3 px-4 font-bold">Branch & Shift</th>
                          <th className="py-3 px-4 font-bold">Languages</th>
                          <th className="py-3 px-4 font-bold text-right">Demo status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {trainerRoster.map(t => (
                          <tr key={t.trainerId} className={`hover:bg-teal-50/40 transition-colors ${t.trainerId === trainerId ? 'bg-teal-50/50' : ''}`}>
                            <td className="py-3 px-4 font-bold text-[#00897b]">{t.trainerName}{t.trainerId === trainerId ? ' (You)' : ''}<div className="font-mono text-[10px] text-slate-400">{t.trainerId}</div></td>
                            <td className="py-3 px-4">{t.expertCourse || t.courseKey || '—'}</td>
                            <td className="py-3 px-4">{[t.branchName, t.shift].filter(Boolean).join(' · ') || '—'}</td>
                            <td className="py-3 px-4">{(t.languages || []).join(', ') || '—'}</td>
                            <td className="py-3 px-4 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.active === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-800'}`}>
                                {t.active === false ? 'Inactive' : 'Receives demos'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Card 3: This Month (Metrics Table) */}
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-base font-bold text-slate-900">
                    This Month · {monthLabel}
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
                  {[
                    ['Demos routed to you', myMonthDemos.length],
                    ['Accepted', myMonthDemos.filter(d => ['confirmed', 'attended', 'missed'].includes(lc(d.status)) && d.trainerId === trainerId).length],
                    ['Completed (attended)', myMonthDemos.filter(isAttended).length],
                    ['No-shows', myMonthDemos.filter(d => lc(d.status) === 'missed').length],
                    ['Admissions from your demos', convertedStudents.filter(st => String(st.createdAt || '').slice(0, 7) === monthKey).length]
                  ].map(([label, value]) => (
                    <div key={label} className="py-3.5 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">{label}</span>
                      <span className="font-bold text-slate-900 text-sm">{value}</span>
                    </div>
                  ))}
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
                      {scorecardMetrics.actionScore}
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase mt-2">
                      ACTION SCORE / 100
                    </div>
                  </div>

                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      {scorecardMetrics.zone}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 font-normal mt-1 leading-relaxed">
                      Layer 1 metric — computed live from your active attendance, assessments, doubt SLA, and demo sessions.
                    </p>
                  </div>
                </div>

                <div className="bg-[#2f2e5f] border border-[#3e3d79] rounded-2xl px-7 py-4 text-left md:text-right shrink-0 min-w-[150px]">
                  <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    {scorecardMetrics.payBase > 0 ? `₹${scorecardMetrics.variablePay.toLocaleString()}` : '—'}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase mt-1">
                    {scorecardMetrics.payBase > 0 ? 'VARIABLE PAY' : 'PAY NOT CONFIGURED'}
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
                    Dynamic Weights
                  </span>
                </div>

                <p className="text-xs text-slate-500 font-normal leading-relaxed">
                  Each factor is computed as achievement × weight, normalised over all active performance indicators. <span className="text-slate-600 font-bold">Total applicable score earned: {scorecardMetrics.actionScore} / 100.</span>
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
                      {scorecardMetrics.factors.map((item, idx) => (
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
                  <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                    scorecardMetrics.gatesPass 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {scorecardMetrics.gatesPass ? 'Gates pass' : 'Gates pending'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 font-normal leading-relaxed">
                  {scorecardMetrics.payBase > 0
                    ? `Quality score × ₹${scorecardMetrics.payBase.toLocaleString()} = your variable pay. Gate: batch attendance ≥75%.`
                    : 'Variable pay base is not configured on your trainer profile yet (admin → Trainer Settings).'} Buckets marked N/A have no data source yet and are excluded from the score.
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
                      {scorecardMetrics.qualityBuckets.map((row, idx) => (
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
                      {scorecardMetrics.qualityScore} / 100
                    </div>
                  </div>

                  {/* VARIABLE PAY (rounded) Row */}
                  <div className="px-4 py-2 flex items-center justify-between">
                    <div className="text-xs font-black text-slate-900 tracking-wider uppercase">
                      VARIABLE PAY (rounded)
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900">
                      {scorecardMetrics.payBase > 0 ? `₹${scorecardMetrics.variablePay.toLocaleString()}` : '—'}
                    </div>
                  </div>
                </div>
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
                    Verified Ledger
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-normal leading-relaxed">
                  Demos you delivered this month and admissions that came from your demos (matched on the candidate's phone / email).{!incentivesConfigured && ' Incentive rates are not configured on your trainer profile yet — amounts show ₹0 until admin sets them.'}
                </p>
              </div>

              {/* 2. Events Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900">Events</h2>
                  <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200/80">
                    {incentiveEvents.length} {incentiveEvents.length === 1 ? 'row' : 'rows'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                        <th className="py-3 px-4 font-semibold">EVENT</th>
                        <th className="py-3 px-4 font-semibold">TYPE</th>
                        <th className="py-3 px-4 font-semibold">STUDENT / CANDIDATE</th>
                        <th className="py-3 px-4 font-semibold">ROLE</th>
                        <th className="py-3 px-4 font-semibold text-center sm:text-left">BASE ₹</th>
                        <th className="py-3 px-4 font-semibold text-center sm:text-left">SHARE</th>
                        <th className="py-3 px-4 font-semibold text-center">VERIFIED</th>
                        <th className="py-3 px-4 font-semibold text-right">PAYABLE ₹</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {incentiveEvents.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-xs text-slate-400 font-medium">
                            No cash-earning events recorded yet for this month.
                          </td>
                        </tr>
                      ) : (
                        incentiveEvents.map((ev) => (
                          <tr key={ev.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-mono text-slate-400 font-medium">{ev.code}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{ev.type}</td>
                            <td className="py-3 px-4 text-slate-600 font-medium">{ev.candidate}</td>
                            <td className="py-3 px-4 text-slate-500 font-medium">{ev.role}</td>
                            <td className="py-3 px-4 text-slate-800 font-medium text-center sm:text-left">₹{ev.baseAmt}</td>
                            <td className="py-3 px-4 text-slate-500 font-medium text-center sm:text-left">{ev.share}</td>
                            <td className="py-3 px-4 text-center">
                              {ev.isVerified ? (
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
                              <span className={`font-bold font-mono ${ev.isVerified ? 'text-emerald-600' : 'text-slate-400'}`}>
                                ₹{ev.payable}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Dark Footer Bar inside Events Card */}
                <div className="bg-[#111927] px-6 py-4 flex items-center justify-between text-white border-t border-slate-800">
                  <span className="text-xs font-bold tracking-wider uppercase text-slate-200">
                    EVENT CASH THIS MONTH
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-white">
                    ₹{totalEventCash.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 3. Monthly Take · Summary Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-3">
                <h2 className="text-sm font-bold text-slate-900">Monthly Take · Summary</h2>
                
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Variable pay (quality)</span>
                    <span className="font-bold font-mono text-slate-900">₹{scorecardMetrics.variablePay.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1.5">
                    <span className="text-slate-600 font-medium">Event cash (verified)</span>
                    <span className="font-bold font-mono text-slate-900">₹{totalEventCash.toLocaleString()}</span>
                  </div>

                  {/* Highlighted MONTHLY TAKE Row */}
                  <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-4 py-3.5 flex items-center justify-between mt-3">
                    <span className="text-xs font-black text-[#15803d] tracking-wider uppercase">
                      MONTHLY TAKE
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-[#15803d]">
                      ₹{monthlyTake.toLocaleString()}
                    </span>
                  </div>
                </div>
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
                              {[batch.course, batch.module, batch.timing, batch.mode].filter(Boolean).join(' · ')}
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
                                  <div className="text-[11px] text-slate-400 font-mono">{studentKeyOf(s)}{s.syllabusModule ? ` · ${s.syllabusModule}` : ''}</div>
                                </div>
                                <div className="text-right">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    typeof s.attendancePct !== 'number' ? 'bg-slate-50 text-slate-500 border border-slate-200' : s.attendancePct < 75 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}>
                                    {typeof s.attendancePct === 'number' ? `${s.attendancePct}%` : 'No classes yet'}
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
                  {myStudents.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-500">No students allocated to you yet. HR allocates students from the Handover Desk.</div>
                  )}
                  {myStudents.map((student) => {
                    const weakInfo = weakStudents.find(w => w.id === (student._id || studentKeyOf(student)));
                    const isWeak = Boolean(weakInfo);
                    const sId = student._id || student.studentId;
                    const isSent = student.syllabusCompleted;
                    const rollText = [student.studentId, student.course, student.batchName, student.syllabusModule].filter(Boolean).join(' · ');
                    return (
                      <div
                        key={sId}
                        className="rounded-2xl border border-slate-200/90 p-4 sm:p-4.5 flex items-center justify-between hover:border-slate-300 transition-all bg-white shadow-none group"
                      >
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm shrink-0 ${
                            isWeak ? 'bg-[#f8fafc] text-slate-500 border border-slate-200/70' : 'bg-[#f1f5f9] text-slate-700'
                          }`}>
                            {isWeak ? <span className="text-sm font-bold text-slate-500">⚠</span> : <span className="text-base">🎓</span>}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate">{student.name}</span>
                              {isWeak && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fee2e2] text-[#dc2626]">weak</span>}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5 truncate">{rollText}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {[
                                typeof student.attendancePct === 'number' ? `Attendance ${student.attendancePct}%` : null,
                                typeof student.assessmentScore === 'number' ? `Tests ${student.assessmentScore}%` : null,
                                student.hrName ? `HR: ${student.hrName}` : null
                              ].filter(Boolean).join(' · ')}
                            </div>
                            {student.trainerNote && (
                              <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 mt-1.5">HR note: {student.trainerNote}</div>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 ml-3">
                          <button
                            disabled={isSent}
                            onClick={async () => {
                              try {
                                const updated = await markSyllabusComplete(sId, { trainerId, trainerName });
                                setStudents(prev => prev.map(x => x._id === updated._id ? { ...x, ...updated } : x));
                                setCccpToast(`${student.name} marked syllabus complete → sent to CCCP · ${student.hrName || 'HR'} notified.`);
                              } catch (e) {
                                setCccpToast(`Could not update ${student.name}: ${e?.response?.data?.error || e.message}`);
                              }
                              setTimeout(() => setCccpToast(null), 4000);
                            }}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.98] ${
                              isSent
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
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
                            {student.lastAction && (
                              <div className="text-[11px] text-teal-700 mt-0.5 truncate">✓ {student.lastAction.action.replace('_', ' ')} · {new Date(student.lastAction.at).toLocaleDateString('en-IN')}</div>
                            )}
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
                Auto-flagged from real records: attendance &lt;80%, test average &lt;60%, or enrollment on hold. Every action you log is saved on the student and sent to their HR.
              </div>

              {/* Interactive Action Modal — every action is saved on the student and sent to their HR */}
              {activeWeakStudentModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                  <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">⚠️</span>
                        <h3 className="font-bold text-slate-900 text-sm">Remedial Action Plan</h3>
                      </div>
                      <button onClick={() => setActiveWeakStudentModal(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
                    </div>

                    <div>
                      <div className="font-bold text-slate-900 text-base">{activeWeakStudentModal.name}</div>
                      <div className="text-xs text-slate-500">{activeWeakStudentModal.batch}</div>
                      <div className="mt-2 p-2.5 rounded-xl bg-rose-50 text-rose-800 text-xs font-medium border border-rose-100">{activeWeakStudentModal.issue}</div>
                      {activeWeakStudentModal.lastAction && (
                        <div className="mt-2 text-[11px] text-slate-500">
                          Last action: <strong>{activeWeakStudentModal.lastAction.action}</strong>{activeWeakStudentModal.lastAction.note ? ` — ${activeWeakStudentModal.lastAction.note}` : ''} ({new Date(activeWeakStudentModal.lastAction.at).toLocaleDateString('en-IN')})
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-xs">
                      <label className="font-bold text-slate-700 block">Details (date/time, topic, what was shared):</label>
                      <textarea
                        rows={2}
                        value={remedialNote}
                        onChange={(e) => setRemedialNote(e.target.value)}
                        placeholder="e.g. 1-on-1 on modifiers, Sat 10 AM"
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-500"
                      />
                      <div className="font-bold text-slate-700 pt-1">Choose Remedial Intervention:</div>
                      {[
                        ['remedial_call', '📅 Schedule 1-on-1 Remedial Session'],
                        ['shared_material', '📹 Share Revision Material + Practice Quiz'],
                        ['escalate', '📞 Escalate to HR / Branch Mentor for Counselling']
                      ].map(([action, label]) => (
                        <button
                          key={action}
                          onClick={async () => {
                            const target = activeWeakStudentModal;
                            try {
                              const updated = await logRemedialAction(target.realId, { action, note: remedialNote.trim() || label.replace(/^\S+\s/, ''), trainerName });
                              setStudents(prev => prev.map(x => x._id === updated._id ? { ...x, ...updated } : x));
                              setWeakStudentToast(`${label.replace(/^\S+\s/, '')} logged for ${target.name} · HR notified.`);
                            } catch (e) {
                              setWeakStudentToast(`Could not save action: ${e?.response?.data?.error || e.message}`);
                            }
                            setRemedialNote('');
                            setActiveWeakStudentModal(null);
                            setTimeout(() => setWeakStudentToast(null), 4000);
                          }}
                          className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all font-semibold text-slate-800 flex items-center justify-between group"
                        >
                          <span>{label}</span>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                        </button>
                      ))}
                    </div>

                    <div className="pt-2">
                      <button onClick={() => setActiveWeakStudentModal(null)} className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all">Close</button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ================= TAB: ASSESSMENTS ================= */}
          {activeNav === 'assessments' && (() => {
            const scoresOf = (t) => assessmentScores[t.id] || {};
            const hasScores = (t) => Object.keys(scoresOf(t)).length > 0;
            const activeTests = assessmentTests.filter(t => !hasScores(t) && t.date >= todayKey);
            const pendingTests = assessmentTests.filter(t => !hasScores(t) && t.date < todayKey);
            const scoredTests = assessmentTests.filter(hasScores);
            const studentsForTest = (t) => {
              const inBatch = myStudents.filter(st => (st.batchName || st.course) === t.batch);
              return inBatch.length ? inBatch : myStudents;
            };
            const nameOf = (key) => students.find(st => studentKeyOf(st) === key || st._id === key)?.name || key;
            const testCard = (test) => (
              <div key={test.id} className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-4 transition-all">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">{test.name}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{[test.type, test.batch, test.topic].filter(Boolean).join(' · ')}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${test.date < todayKey ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-[#ecfdf5] text-[#059669] border-emerald-200'}`}>
                    {test.date < todayKey ? 'Awaiting scores' : 'Upcoming'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {[['DATE', test.date], ['TIME LIMIT', test.timeLimit], ['TOTAL / PASS', `${test.totalMarks} / ${test.passMark}`], ['STUDENTS', studentsForTest(test).length]].map(([k, v]) => (
                    <div key={k} className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-3 sm:p-3.5">
                      <div className="text-[10px] tracking-wider uppercase font-bold text-slate-400">{k}</div>
                      <div className="text-sm sm:text-base font-bold text-slate-900 font-mono mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() => setActiveScoreModalTest({ id: test.id, title: test.name, max: test.totalMarks, pass: test.passMark, batch: test.batch, test })}
                    className="bg-[#009688] hover:bg-[#00897b] text-white text-xs sm:text-sm font-bold py-3 rounded-2xl transition-all text-center shadow-sm active:scale-[0.98]"
                  >
                    Enter Scores
                  </button>
                  <button
                    onClick={() => setActiveRationaleModalTest({ id: test.id, title: test.name })}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold py-3 rounded-2xl transition-all text-center shadow-sm active:scale-[0.98]"
                  >
                    {rationaleTexts[test.id] ? 'Edit Rationale' : 'Add Rationale'}
                  </button>
                </div>
              </div>
            );
            return (
            <div className="space-y-4 max-w-[1280px] animate-fadeIn">
              {assessmentToast && (
                <div className="p-3.5 rounded-2xl bg-[#0c1921] text-white text-xs font-semibold flex items-center justify-between shadow-lg animate-fadeIn border border-[#1b3446]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
                    <span>{assessmentToast}</span>
                  </div>
                  <button onClick={() => setAssessmentToast(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>
              )}

              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3 pb-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">📊</span>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">Assessment Desk</h2>
                  </div>
                  <button
                    onClick={() => {
                      setNewTestForm({ ...emptyTestForm(), batch: batches[0]?.name || '', course: batches[0]?.course || '' });
                      setShowCreateTestModal(true);
                    }}
                    disabled={batches.length === 0}
                    className="px-4 py-2 rounded-xl bg-[#0c1921] hover:bg-[#152a36] disabled:opacity-40 text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
                  >
                    + Create Test
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {[['active', 'Upcoming Tests', activeTests.length], ['pending', 'Pending Scores', pendingTests.length], ['results', 'Results & Weak Topics', scoredTests.length]].map(([key, label, count]) => (
                    <button
                      key={key}
                      onClick={() => setActiveAssessmentTab(key)}
                      className={`px-3.5 py-1.5 rounded-full font-semibold transition-all flex items-center gap-2 ${
                        activeAssessmentTab === key ? 'bg-[#0c1921] text-white shadow-sm' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                      }`}
                    >
                      <span>{label}</span>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${activeAssessmentTab === key ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'}`}>{count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {activeAssessmentTab === 'active' && (
                <div className="space-y-4">
                  {activeTests.length === 0 && <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center text-xs text-slate-500">No upcoming tests. Create one for your batch.</div>}
                  {activeTests.map(testCard)}
                </div>
              )}

              {activeAssessmentTab === 'pending' && (
                <div className="space-y-4">
                  {pendingTests.length === 0 && <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center text-xs text-slate-500">All conducted tests have scores entered.</div>}
                  {pendingTests.map(testCard)}
                </div>
              )}

              {activeAssessmentTab === 'results' && (
                <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Batch Performance & Weak Topic Analysis</h3>
                  {scoredTests.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">No scored tests yet.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {scoredTests.map(t => {
                        const entries = Object.entries(scoresOf(t));
                        const avgPct = entries.length && t.totalMarks ? (entries.reduce((a, [, v]) => a + Number(v || 0), 0) / entries.length / t.totalMarks) * 100 : 0;
                        const below = entries.filter(([, v]) => Number(v) < t.passMark);
                        return (
                          <div key={t.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-800">{t.name}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${below.length ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                {below.length ? 'Weak area detected' : 'All passed'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {t.topic ? `${t.topic} · ` : ''}Batch average {avgPct.toFixed(1)}% · {entries.length - below.length} of {entries.length} passed (pass mark {t.passMark}/{t.totalMarks}).
                            </p>
                            {below.length > 0 && (
                              <p className="text-xs text-rose-700">Below pass: {below.map(([k, v]) => `${nameOf(k)} (${v}/${t.totalMarks})`).join(', ')}</p>
                            )}
                            <button
                              onClick={() => setActiveScoreModalTest({ id: t.id, title: t.name, max: t.totalMarks, pass: t.passMark, batch: t.batch, test: t })}
                              className="text-[11px] font-bold text-[#00897b] hover:underline"
                            >
                              Edit scores
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-slate-500 font-medium px-1 leading-relaxed">
                Publishing scores updates each student's test average and placement readiness on their record — visible to the student, their HR and CCCP. Averages below 60% flag the student in the Weak Student Tracker.
              </div>

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
                      {studentsForTest(activeScoreModalTest.test).length === 0 && <div className="text-xs text-slate-500 text-center py-6">No students in this batch.</div>}
                      {studentsForTest(activeScoreModalTest.test).map(st => {
                        const stKey = studentKeyOf(st);
                        const raw = assessmentScores[activeScoreModalTest.id]?.[stKey];
                        const hasScore = typeof raw === 'number';
                        const isPass = hasScore && raw >= activeScoreModalTest.pass;
                        return (
                          <div key={stKey} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                            <div>
                              <div className="text-xs font-bold text-slate-900">{st.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{stKey}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={activeScoreModalTest.max}
                                value={hasScore ? raw : ''}
                                placeholder="—"
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setAssessmentScores(prev => {
                                    const cur = { ...(prev[activeScoreModalTest.id] || {}) };
                                    if (v === '') delete cur[stKey];
                                    else cur[stKey] = Math.max(0, Math.min(Number(activeScoreModalTest.max), Number(v)));
                                    return { ...prev, [activeScoreModalTest.id]: cur };
                                  });
                                }}
                                className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center"
                              />
                              {hasScore && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isPass ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                  {isPass ? 'PASS' : 'FAIL'}
                                </span>
                              )}
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
                          if (!Object.keys(currentScores).length) { setAssessmentToast('Enter at least one score before publishing.'); setTimeout(() => setAssessmentToast(null), 3000); return; }
                          try {
                            const updated = await updateAssessmentScores(testId, currentScores);
                            setAssessmentTests(prev => prev.map(t => t.id === testId ? { ...t, ...updated } : t));
                            setAssessmentToast(`Scores published for ${activeScoreModalTest.title} — student averages & readiness updated.`);
                            setActiveScoreModalTest(null);
                          } catch (e) {
                            setAssessmentToast(`Could not publish scores: ${e?.response?.data?.error || e.message}`);
                          }
                          setTimeout(() => setAssessmentToast(null), 4000);
                        }}
                        className="flex-1 py-3 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold transition-all shadow-sm"
                      >
                        Publish Scores
                      </button>
                      <button onClick={() => setActiveScoreModalTest(null)} className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all">Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {activeRationaleModalTest && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                  <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Coding Rationale</h3>
                        <p className="text-xs text-slate-500">{activeRationaleModalTest.title}</p>
                      </div>
                      <button onClick={() => setActiveRationaleModalTest(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
                    </div>
                    <textarea
                      rows={5}
                      value={rationaleTexts[activeRationaleModalTest.id] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRationaleTexts(prev => ({ ...prev, [activeRationaleModalTest.id]: val }));
                      }}
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed focus:outline-teal-500"
                      placeholder="Guidelines and question-wise breakdown for students to review..."
                    />
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={async () => {
                          const testId = activeRationaleModalTest.id;
                          try {
                            await updateAssessmentRationale(testId, rationaleTexts[testId] || '');
                            setAssessmentToast(`Rationale saved for ${activeRationaleModalTest.title}.`);
                            setActiveRationaleModalTest(null);
                          } catch (e) {
                            setAssessmentToast(`Could not save rationale: ${e?.response?.data?.error || e.message}`);
                          }
                          setTimeout(() => setAssessmentToast(null), 4000);
                        }}
                        className="flex-1 py-3 rounded-xl bg-[#0c1921] hover:bg-[#152a36] text-white text-xs font-bold transition-all shadow-sm"
                      >
                        Save Rationale
                      </button>
                      <button onClick={() => setActiveRationaleModalTest(null)} className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all">Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {showCreateTestModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
                  <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp my-8 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base">Create Test</h3>
                        <p className="text-xs text-slate-500">Configure a new assessment for one of your batches</p>
                      </div>
                      <button onClick={() => setShowCreateTestModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center font-bold text-base">✕</button>
                    </div>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const total = Number(newTestForm.totalMarks);
                        const pass = Number(newTestForm.passMark);
                        if (pass > total) { setAssessmentToast('Pass mark cannot exceed total marks.'); setTimeout(() => setAssessmentToast(null), 3000); return; }
                        const payload = {
                          name: newTestForm.name.trim(),
                          type: newTestForm.type,
                          course: newTestForm.course,
                          batch: newTestForm.batch,
                          topic: newTestForm.topic.trim(),
                          date: newTestForm.date,
                          timeLimit: newTestForm.timeLimit,
                          totalMarks: total,
                          passMark: pass,
                          studentsCount: myStudents.filter(st => (st.batchName || st.course) === newTestForm.batch).length,
                          trainerId,
                          trainerName
                        };
                        try {
                          const created = await createTrainerAssessment(payload);
                          setAssessmentTests(prev => [created, ...prev]);
                          setAssessmentToast(`Test "${created.name}" created for ${created.batch}.`);
                          setShowCreateTestModal(false);
                          setActiveAssessmentTab(created.date < todayKey ? 'pending' : 'active');
                        } catch (err) {
                          setAssessmentToast(`Could not create test: ${err?.response?.data?.error || err.message}`);
                        }
                        setTimeout(() => setAssessmentToast(null), 4500);
                      }}
                      className="space-y-3.5 text-xs"
                    >
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Test Name <span className="text-rose-500">*</span></label>
                        <input type="text" required value={newTestForm.name} onChange={(e) => setNewTestForm(prev => ({ ...prev, name: e.target.value }))} className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-teal-500 text-xs" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Type <span className="text-rose-500">*</span></label>
                          <select value={newTestForm.type} onChange={(e) => setNewTestForm(prev => ({ ...prev, type: e.target.value }))} className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs">
                            {['Daily Quiz', 'Weekly Test', 'Module Test', 'Practice Test', 'Full Mock Exam'].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Target Batch <span className="text-rose-500">*</span></label>
                          <select
                            required
                            value={newTestForm.batch}
                            onChange={(e) => {
                              const b = batches.find(x => x.name === e.target.value);
                              setNewTestForm(prev => ({ ...prev, batch: e.target.value, course: b?.course || prev.course }));
                            }}
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs"
                          >
                            {batches.map(b => <option key={b.id} value={b.name}>{b.name} ({b.students.length})</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Course</label>
                          <select value={newTestForm.course} onChange={(e) => setNewTestForm(prev => ({ ...prev, course: e.target.value }))} className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs">
                            {newTestForm.course && !TRAINER_COURSES.some(c => c.label === newTestForm.course) && <option value={newTestForm.course}>{newTestForm.course}</option>}
                            {TRAINER_COURSES.map(c => <option key={c.key} value={c.label}>{c.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Topic / Guidelines <span className="text-rose-500">*</span></label>
                          <input type="text" required value={newTestForm.topic} onChange={(e) => setNewTestForm(prev => ({ ...prev, topic: e.target.value }))} className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-xs" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Date <span className="text-rose-500">*</span></label>
                          <input type="date" required value={newTestForm.date} onChange={(e) => setNewTestForm(prev => ({ ...prev, date: e.target.value }))} className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs" />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Time Limit <span className="text-rose-500">*</span></label>
                          <select value={newTestForm.timeLimit} onChange={(e) => setNewTestForm(prev => ({ ...prev, timeLimit: e.target.value }))} className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs">
                            {['15 min', '30 min', '45 min', '60 min', '90 min', '120 min', '240 min'].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Total Marks <span className="text-rose-500">*</span></label>
                          <input type="number" min="1" max="500" required value={newTestForm.totalMarks} onChange={(e) => setNewTestForm(prev => ({ ...prev, totalMarks: e.target.value }))} className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-xs" />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Pass Mark <span className="text-rose-500">*</span></label>
                          <input type="number" min="1" max="500" required value={newTestForm.passMark} onChange={(e) => setNewTestForm(prev => ({ ...prev, passMark: e.target.value }))} className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-xs" />
                        </div>
                      </div>
                      <div className="pt-3 flex items-center gap-2">
                        <button type="submit" className="flex-1 py-3 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98]">Create Test</button>
                        <button type="button" onClick={() => setShowCreateTestModal(false)} className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all">Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
            );
          })()}

          {/* ================= TAB 10: LIBRARY & MATERIALS ================= */}
          {activeNav === 'library' && (
            <TrainingLibraryMaterials
              currentUser={{ name: trainerName, id: trainerId, branch: trainerBranch }}
              batches={batches}
              materials={materials}
              onChanged={loadRealData}
            />
          )}

          {/* ================= TAB: STUDENT SUBMISSIONS & REQUESTS ================= */}
          {activeNav === 'student_desk' && (
            <TrainerStudentDesk trainerId={trainerId} trainerName={trainerName} />
          )}

          {/* ================= TAB: PLACEMENT PREP & CERTIFICATION ================= */}
          {activeNav === 'placement' && (
            <TrainingPlacementPrep
              currentUser={{ name: trainerName, id: trainerId, branch: trainerBranch }}
              students={myStudents}
              onStudentUpdated={(updated) => setStudents(prev => prev.map(x => x._id === updated._id ? { ...x, ...updated } : x))}
            />
          )}

          {/* ================= TAB 11: MY PROFILE ================= */}
          {activeNav === 'profile' && (
            <TrainingMyProfile trainer={trainerProfile} currentUser={currentUser} profileError={profileError} />
          )}

          {/* ================= TAB 12: SKILLS & COURSES ================= */}
          {activeNav === 'skills' && (
            <TrainingSkillsCourses trainer={trainerProfile} />
          )}

          {/* ================= TAB 13: SHIFT & AVAILABILITY ================= */}
          {activeNav === 'shift' && (
            <TrainingShiftAvailability
              trainer={trainerProfile}
              demos={myExpertDemos}
              batches={batches}
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
                <h3 className="text-sm font-bold text-slate-900">{monthLabel} · Demo Conversion</h3>
              </div>
              <button onClick={() => setShowConversionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const attended = myMonthDemos.filter(isAttended).length;
              const converted = convertedStudents.filter(st => String(st.createdAt || '').slice(0, 7) === monthKey).length;
              const rate = attended > 0 ? Math.round((converted / attended) * 100) : 0;
              const admRate = Number(trainerProfile?.admissionIncentive) || 0;
              return (
                <>
                  <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 text-teal-900 space-y-1">
                    <div className="text-2xl font-black text-[#00897b]">{rate}% Conversion Rate</div>
                    <div className="text-xs text-teal-700 font-medium">{converted} admissions from {attended} demos you delivered</div>
                  </div>
                  <div className="space-y-2 text-xs divide-y divide-slate-100">
                    <div className="pt-2 flex justify-between">
                      <span className="text-slate-500">Demos routed to you:</span>
                      <span className="font-bold text-slate-900">{myMonthDemos.length}</span>
                    </div>
                    <div className="pt-2 flex justify-between">
                      <span className="text-slate-500">Demos delivered:</span>
                      <span className="font-bold text-slate-900">{attended} ({myMonthDemos.length > 0 ? Math.round((attended / myMonthDemos.length) * 100) : 0}%)</span>
                    </div>
                    <div className="pt-2 flex justify-between">
                      <span className="text-slate-500">Admissions from your demos:</span>
                      <span className="font-bold text-emerald-600">{converted}</span>
                    </div>
                    <div className="pt-2 flex justify-between">
                      <span className="text-slate-500">Admission incentive:</span>
                      <span className="font-bold text-emerald-600">{admRate > 0 ? `₹${(converted * admRate).toLocaleString()} (@ ₹${admRate.toLocaleString()} / admission)` : 'Not configured'}</span>
                    </div>
                  </div>
                </>
              );
            })()}

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
