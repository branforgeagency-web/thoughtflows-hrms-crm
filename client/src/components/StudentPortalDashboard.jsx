import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useFileToken from '../hooks/useFileToken';
import ZoomMeeting from './ZoomMeeting';
import {
  Home,
  CreditCard,
  TrendingUp,
  Calendar,
  BookOpen,
  Users,
  Briefcase,
  Award,
  FileText,
  HelpCircle,
  User,
  ChevronRight,
  Video,
  CheckCircle2,
  Upload,
  Download,
  Send,
  X,
  AlertCircle,
  ArrowRight,
  Info,
  MapPin,
  ExternalLink,
  LogOut,
  RefreshCw,
  MessageSquare,
  Menu,
  PlayCircle,
  Sparkles,
  Star
} from 'lucide-react';
import StudentOnlineTest from './StudentOnlineTest';
import BookNewDemoModal from './BookNewDemoModal';
import StudentDemoNotice from './StudentDemoNotice';
import {
  getStudentPortal,
  updateStudentPortalProfile,
  createStudentReferral,
  createStudentSubmission,
  studentSubmissionFileUrl,
  createStudentRequest,
  studentRequestDocumentUrl,
  createTrainerDoubt,
  createEscalation,
  createDemo,
  trainingMaterialFileUrl,
  joinStudentLiveClass,
  sendLiveClassHeartbeat,
  submitStudentFeedback,
  followUpDoubt,
  resolveDoubt,
  onDataUpdate
} from '../services/api';
import NotificationBell from './NotificationBell';
import { COURSE_CATEGORIES } from '../constants/courses';

// ----------------------------------------------------------------------------
// Program rules (not student data)
// ----------------------------------------------------------------------------
const REFERRAL_REWARD = 1500;
const READINESS_TARGET = 80;
const ATTENDANCE_TARGET = 75;
const TIERS = [
  { name: 'Silver', min: 0 },
  { name: 'Gold', min: 3 },
  { name: 'Platinum', min: 6 }
];
// Same 7 stages HR / CCCP use on the student profile
const PLACEMENT_STAGES = [
  { id: 1, label: 'Talent Pool', desc: 'Profile vetted by the placement cell' },
  { id: 2, label: 'Placement Ready', desc: 'Attendance, scores & mock cleared' },
  { id: 3, label: 'Talentera Synced', desc: 'Resume & portfolio live' },
  { id: 4, label: 'Company Mapped', desc: 'Mapped to a hiring partner' },
  { id: 5, label: 'Interviews Attended', desc: 'Aptitude, technical & panel rounds' },
  { id: 6, label: 'Offer Released', desc: 'HR & CTC discussion' },
  { id: 7, label: 'Joined & Placed', desc: 'Onboarding complete' }
];
const LOCATION_OPTIONS = ['Coimbatore', 'Chennai', 'Bangalore', 'Hyderabad', 'Kochi', 'Madurai', 'Trichy', 'Remote / Work From Home'];
const EXAM_OPTIONS = ['CPC', 'COC', 'CIC', 'CRC', 'CPB', 'CPMA', 'CCS', 'Other'];
const TICKET_CATEGORIES = ['Fees & Receipts', 'Certificate Release', 'Batch Conversion', 'Batch Timing or Classroom Change', 'LMS / Materials Access', 'Attendance Correction', 'Placement Team Inquiry', 'Other'];
const BREAK_REASON_CATEGORIES = [
  'Medical Emergency / Health Condition',
  'University / Academic Examinations',
  'Family Emergency / Personal Urgent Matter',
  'Official Relocation / Travel',
  'Work / Professional Commitment',
  'Other Valid Grounds'
];

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtDateTime = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const fmtSize = (b) => (!b ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});
const errMsg = (e, fallback) => e?.response?.data?.error || e?.message || fallback;
const shortCourse = (c = '') => (c.match(/\b(CPC|CIC|COC|CPB|CPMA|CRC|CCS|RHIT|CCA)\b/) || [])[1] || c.split(/[\s—-]/)[0] || '—';

const PILL = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
  indigo: 'bg-indigo-50 text-[#483ec7] border-indigo-200',
  slate: 'bg-slate-50 text-slate-600 border-slate-200'
};
const statusTone = (s = '') => {
  const v = String(s).toLowerCase();
  if (/present|approved|resolved|replied|passed|completed|admitted|scheduled|ready/.test(v)) return 'green';
  if (/late|submitted|open|new|pending|review|progress|contacted|demo/.test(v)) return 'amber';
  if (/absent|revision|declined|overdue|failed|not ready|closed/.test(v)) return 'red';
  return 'slate';
};

// ----------------------------------------------------------------------------
// Small presentational pieces
// ----------------------------------------------------------------------------
const Card = ({ children, className = '' }) => (
  <div className={`bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-[0_2px_16px_rgba(0,0,0,0.03)] ${className}`}>{children}</div>
);
const CardTitle = ({ icon, title, right, sub }) => (
  <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
    <div>
      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">{icon && <span className="text-lg">{icon}</span>}{title}</h3>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
    {right}
  </div>
);
const Pill = ({ tone = 'slate', children }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${PILL[tone]}`}>{children}</span>
);
const HeaderStatMini = ({ value }) => <span className="text-xs font-bold text-[#483ec7] bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">{value}</span>;
const Row = ({ label, value, mono }) => (
  <div className="py-3 flex items-center justify-between gap-4 text-xs sm:text-sm">
    <span className="text-slate-500 font-medium">{label}</span>
    <span className={`text-slate-900 font-semibold text-right ${mono ? 'font-mono' : ''}`}>{value || <span className="text-slate-400 font-medium">Not set</span>}</span>
  </div>
);
const Empty = ({ icon = '📭', title, text }) => (
  <div className="text-center py-8 px-4">
    <div className="text-2xl mb-2">{icon}</div>
    <div className="text-sm font-semibold text-slate-600">{title}</div>
    {text && <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">{text}</p>}
  </div>
);
const PageHeader = ({ title, sub, right }) => (
  <div className="bg-gradient-to-r from-[#1e1b4b] via-[#312e81] to-[#1e1b4b] rounded-3xl p-6 sm:p-7 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_8px_30px_rgba(30,27,75,0.2)]">
    <div>
      <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{title}</h2>
      {sub && <p className="text-xs sm:text-sm text-indigo-200/90 mt-1 max-w-2xl">{sub}</p>}
    </div>
    {right}
  </div>
);
const HeaderStat = ({ label, value }) => (
  <div className="bg-white/10 border border-white/15 rounded-2xl px-4 py-2.5 text-right">
    <div className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">{label}</div>
    <div className="text-lg font-black text-emerald-300">{value}</div>
  </div>
);
const Btn = ({ children, onClick, tone = 'dark', type = 'button', disabled, className = '' }) => {
  const tones = {
    dark: 'bg-[#221f3f] hover:bg-slate-900 text-white',
    teal: 'bg-[#0d9488] hover:bg-[#0f766e] text-white',
    light: 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-800',
    indigo: 'bg-[#483ec7] hover:bg-[#3b32a8] text-white'
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 ${tones[tone]} ${className}`}>
      {children}
    </button>
  );
};
const Modal = ({ title, sub, onClose, children, wide }) => (
  <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
    <div className={`bg-white rounded-3xl shadow-2xl w-full ${wide ? 'max-w-4xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto p-6 relative`} onClick={(e) => e.stopPropagation()}>
      <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5" /></button>
      <h3 className="text-base font-bold text-slate-900 pr-8">{title}</h3>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      <div className="mt-5">{children}</div>
    </div>
  </div>
);
const Field = ({ label, children }) => (
  <label className="block text-xs">
    <span className="font-semibold text-slate-700 block mb-1">{label}</span>
    {children}
  </label>
);
const inputCls = 'w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:outline-none focus:border-[#483ec7]';
const fmtMin = (m) => {
  if (!Number.isFinite(m)) return '';
  const h = Math.floor(m / 60) % 24;
  const mm = String(m % 60).padStart(2, '0');
  return `${((h + 11) % 12) + 1}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
};
const Stars = ({ value = 0, onRate, disabled, size = 'text-xl' }) => (
  <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Rating">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} disabled={disabled}
        onClick={() => onRate && onRate(n)}
        className={`${size} leading-none transition cursor-pointer disabled:cursor-default ${n <= value ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'}`}>★</button>
    ))}
  </div>
);
// Notification type → portal section
const NOTIF_NAV = { module: 'dashboard', announcement: 'dashboard', recording: 'classes', exam: 'certification', payment: 'payments', doubt: 'trainers', handover: 'trainers', assessment: 'lms', score: 'lms', material: 'lms', submission: 'lms', live: 'classes', attendance: 'classes', ticket: 'help', syllabus: 'placement-prep', recommendation: 'placement-prep', referral: 'membership', request: 'dashboard' };

// ============================================================================
export default function StudentPortalDashboard({ onClose, currentUser, onLogout }) {
  useFileToken(); // keeps file links (downloads / audio) signed with a fresh short-lived token
  const [activeNav, setActiveNav] = useState('dashboard');
  const [portal, setPortal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // { type, ...payload }
  const [busy, setBusy] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [navOpen, setNavOpen] = useState(false); // mobile sidebar
  const [testId, setTestId] = useState(null); // online test being taken
  const [followText, setFollowText] = useState({}); // doubt id → follow-up draft

  // form state shared by the modals
  const [form, setForm] = useState({});
  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? (e.target.type === 'file' ? e.target.files[0] : e.target.value) : e }));
  const [quickDoubt, setQuickDoubt] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [liveAttendedMins, setLiveAttendedMins] = useState(0);
  const [eligibleForPresent, setEligibleForPresent] = useState(false);

  const showToast = (msg, ms = 3500) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };
  const openModal = (type, payload = {}, initialForm = {}) => {
    setForm(initialForm);
    setModal({ type, ...payload });
  };
  const closeModal = () => { setModal(null); setForm({}); };

  // Heartbeat tracking student attendance duration during live class (1 hr 45 min rule)
  useEffect(() => {
    if (modal?.type !== 'liveClass' || !live?.sessionId || !st?.studentId) return undefined;
    const sendPulse = async () => {
      try {
        const res = await sendLiveClassHeartbeat({
          sessionId: live.sessionId,
          studentId: st.studentId,
          email: st.email
        });
        if (res?.ok) {
          if (typeof res.durationMinutes === 'number') setLiveAttendedMins(res.durationMinutes);
          if (typeof res.eligibleForPresent === 'boolean') setEligibleForPresent(res.eligibleForPresent);
        }
      } catch (_) {}
    };
    sendPulse();
    const timer = setInterval(sendPulse, 30000);
    return () => clearInterval(timer);
  }, [modal?.type, live?.sessionId, st?.studentId, st?.email]);

  // --------------------------------------------------------------------------
  // Load everything for the signed-in student from the server
  // --------------------------------------------------------------------------
  const load = useCallback(async (silent = false) => {
    if (!currentUser?.studentId && !currentUser?.email) {
      setLoadError('This login is not linked to an admitted student record.');
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const data = await getStudentPortal({ studentId: currentUser?.studentId, email: currentUser?.email });
      setPortal(data);
      setLoadError('');
    } catch (e) {
      setLoadError(errMsg(e, 'Could not load your student record.'));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.studentId, currentUser?.email]);

  useEffect(() => {
    load();
    // Full reload is heavy (≈12 queries), so it runs rarely; the notification
    // bell (45s, tiny query) triggers an immediate reload when something new arrives.
    const poll = setInterval(() => { if (document.visibilityState !== 'hidden') load(true); }, 180000);
    const onVisible = () => { if (document.visibilityState === 'visible') load(true); };
    document.addEventListener('visibilitychange', onVisible);
    const unsub = onDataUpdate((entity) => {
      if (['students', 'doubts', 'trainer_doubts', 'live_class', 'assessments', 'trainer_attendance', 'materials', 'student_submissions', 'student_requests', 'leads', 'syllabus', 'announcements'].includes(entity)) load(true);
    });
    return () => { clearInterval(poll); unsub(); document.removeEventListener('visibilitychange', onVisible); };
  }, [load]);

  // --------------------------------------------------------------------------
  // Derived view of the real record
  // --------------------------------------------------------------------------
  const st = portal?.student || null;
  const trainer = portal?.trainer || null;
  const live = portal?.liveSession || null;
  const attendance = portal?.attendance || [];
  const assessments = portal?.assessments || [];
  const materials = portal?.materials || [];
  const doubts = portal?.doubts || [];
  const submissions = portal?.submissions || [];
  const requests = portal?.requests || [];
  const referrals = portal?.referrals || [];
  const placements = portal?.placements || [];
  const tickets = portal?.tickets || [];
  const classNotes = portal?.classNotes || [];
  const partners = portal?.hiringPartners || [];
  const timetable = portal?.timetable || [];

  // Batch Conversion Ticket — Student is permitted to raise only once
  const hasBatchConversionTicket = Boolean(
    st?.batchConversionTicketRaised ||
    tickets.some((t) => /batch\s*conversion/i.test(t?.type || '') || /batch\s*conversion/i.test(t?.category || '') || /batch\s*conversion/i.test(t?.title || '')) ||
    requests.some((r) => r?.type === 'batch_conversion' || /batch\s*conversion/i.test(r?.subject || ''))
  );
  const existingBatchConversionTicket = tickets.find((t) => /batch\s*conversion/i.test(t?.type || '') || /batch\s*conversion/i.test(t?.category || '') || /batch\s*conversion/i.test(t?.title || ''))
    || requests.find((r) => r?.type === 'batch_conversion' || /batch\s*conversion/i.test(r?.subject || ''));
  const rateableClasses = portal?.rateableClasses || [];
  const trainerFeedback = portal?.trainerFeedback || null;
  const syllabus = portal?.syllabus || null;
  const announcements = portal?.announcements || [];
  const recordings = portal?.recordings || [];
  const sylModules = syllabus?.modules || [];
  const sylDone = sylModules.filter((m) => m.done).length;
  const sylPct = sylModules.length ? Math.round((sylDone / sylModules.length) * 100) : null;

  const displaySylModules = useMemo(() => {
    const rawList = sylModules.length > 0 ? sylModules : [
      { name: 'Module 1 — Foundations & Medical Terminology', done: Boolean(st?.syllabusModule && st.syllabusModule !== 'Module 1') || Boolean(st?.syllabusCompleted) },
      { name: 'Module 2 — Anatomy, Physiology & Body Systems', done: Boolean(st?.syllabusCompleted) || ['Module 3', 'Module 4', 'Module 5'].includes(st?.syllabusModule) },
      { name: 'Module 3 — Core Coding Guidelines & Classification', done: Boolean(st?.syllabusCompleted) || ['Module 4', 'Module 5'].includes(st?.syllabusModule) },
      { name: 'Module 4 — Specialty Case Studies & Scenarios', done: Boolean(st?.syllabusCompleted) || st?.syllabusModule === 'Module 5' },
      { name: 'Module 5 — Comprehensive Mock Exams & AAPC Review', done: Boolean(st?.syllabusCompleted) }
    ];

    return rawList.map((m, idx) => {
      // Check if student has completed Anatomy foundation or completed modules
      const isAnatomyMod = idx < 2 || /anatomy|physiology|terminology|foundations/i.test(m.name);
      const isCompletedInRecord = Boolean(
        st?.anatomyCompleted ||
        (st?.completedModules || []).some((cm) => cm.toLowerCase().includes(m.name.toLowerCase()) || (isAnatomyMod && (cm.includes('1') || cm.includes('2')))) ||
        (isAnatomyMod && ['Module 3', 'Module 4', 'Module 5'].includes(st?.syllabusModule))
      );
      return {
        ...m,
        done: Boolean(m.done || isCompletedInRecord || st?.syllabusCompleted)
      };
    });
  }, [sylModules, st?.syllabusModule, st?.syllabusCompleted, st?.anatomyCompleted, st?.completedModules]);
  const effectiveSylDone = sylModules.length > 0 ? sylDone : displaySylModules.filter(m => m.done).length;
  const effectiveSylPct = st?.syllabusCompleted ? 100 : (sylModules.length ? sylPct : Math.round((effectiveSylDone / displaySylModules.length) * 100));

  const sendFollowUp = async (q) => {
    const text = String(followText[q.id] || '').trim();
    if (!text) return;
    const ok = await run(() => followUpDoubt(q.id, text), '✓ Follow-up sent to your trainer');
    if (ok) setFollowText((f) => ({ ...f, [q.id]: '' }));
  };

  const [trainerComment, setTrainerComment] = useState('');
  const rate = async (payload, msg = '✓ Thanks for your feedback') => {
    try {
      await submitStudentFeedback(st.studentId, payload);
      showToast(msg);
      load(true);
    } catch (e) {
      showToast(errMsg(e, 'Could not save your rating'));
    }
  };

  const d = useMemo(() => {
    if (!st) return null;
    const name = st.name || currentUser?.name || 'Student';
    const attended = attendance.filter((a) => a.status === 'Present' || a.status === 'Late').length;
    const absent = attendance.filter((a) => a.status === 'Absent').length;
    const late = attendance.filter((a) => a.status === 'Late').length;
    const attendancePct = typeof st.attendancePct === 'number' ? st.attendancePct : (attendance.length ? Math.round((attended / attendance.length) * 100) : null);
    const scored = assessments.filter((t) => typeof t.pct === 'number');
    const testAvg = typeof st.assessmentScore === 'number' ? st.assessmentScore : (scored.length ? Math.round(scored.reduce((a, t) => a + t.pct, 0) / scored.length) : null);
    const readiness = typeof st.readinessScore === 'number' ? st.readinessScore : null;

    // Fees — straight from the HR fee record
    const courseFee = Number(st.courseFee || 0);
    const paid = Number(st.paidAmount || 0);
    const balance = typeof st.pendingBalance === 'number' && st.pendingBalance > 0 ? st.pendingBalance : Math.max(0, courseFee - paid);

    // Modules covered = class topics the trainer logged, oldest first
    const topics = [];
    [...attendance].reverse().forEach((a) => { if (a.topic && !topics.includes(a.topic)) topics.push(a.topic); });

    // Stage is kept by the server (1–3 automatic, 4–7 set by the placement team)
    const placementStage = Math.min(7, Math.max(0, Number(st.placementStage) || 0));

    const joined = referrals.filter((r) => r.stage === 'admitted').length;
    const tierIdx = TIERS.reduce((idx, t, i) => (joined >= t.min ? i : idx), 0);

    const latestOf = (type) => submissions.find((s) => s.type === type) || null;

    const todayDateKey = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.find((a) => a.date === todayDateKey) || null;
    const latestAttendance = attendance[0] || null;
    const isSyllabusDone = Boolean(st.syllabusCompleted) || (sylModules.length > 0 && sylDone === sylModules.length);

    return {
      name,
      initials: name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'S',
      batch: portal?.batch || '',
      attended, absent, late, attendancePct, testAvg, readiness,
      todayAttendance,
      latestAttendance,
      isSyllabusDone,
      effectiveSylPct,
      effectiveSylDone,
      courseFee, paid, balance,
      topics,
      placementStage,
      joined,
      tier: TIERS[tierIdx],
      nextTier: TIERS[tierIdx + 1] || null,
      resume: latestOf('resume'),
      videoIntro: latestOf('video_intro'),
      openMock: requests.find((r) => r.type === 'mock_interview' && ['Open', 'Scheduled'].includes(r.status)) || null,
      pendingPoints: requests.filter((r) => r.type === 'redeem_points' && ['Open', 'Scheduled'].includes(r.status)).reduce((a, r) => a + Number(r.details?.points || 0), 0)
    };
  }, [st, portal?.batch, attendance, assessments, referrals, submissions, requests, placements, currentUser?.name, sylModules, sylDone, effectiveSylPct, effectiveSylDone]);

  // Weekly Star Rating (derived from backend sync or live 4-pillar computation)
  const weeklyRating = useMemo(() => {
    if (portal?.weeklyRating?.stars) return portal.weeklyRating;
    if (st?.weeklyRating?.stars) return st.weeklyRating;

    const attRate = d?.attendancePct ?? (attendance.length ? Math.round((d?.attended / attendance.length) * 100) : 85);
    const attScore = attRate >= 95 ? 5.0 : attRate >= 85 ? 4.5 : attRate >= 75 ? 4.0 : attRate >= 60 ? 3.0 : 2.0;
    const testRate = d?.testAvg ?? (assessments.length ? 80 : 75);
    const assScore = testRate >= 90 ? 5.0 : testRate >= 80 ? 4.5 : testRate >= 70 ? 3.8 : testRate >= 55 ? 3.0 : 2.0;
    const sylRate = d?.effectiveSylPct ?? (d?.isSyllabusDone ? 100 : 50);
    const sylScore = d?.isSyllabusDone ? 5.0 : sylRate >= 80 ? 4.8 : sylRate >= 60 ? 4.2 : sylRate >= 40 ? 3.6 : 3.0;
    const partScore = (doubts.length >= 2 && submissions.length >= 2) ? 5.0 : (doubts.length >= 1 || submissions.length >= 1) ? 4.4 : 3.6;
    const overall = Number(((attScore + assScore + sylScore + partScore) / 4).toFixed(1));
    const roundedStars = Math.round(overall);

    let tier = 'On-Track Learner';
    if (overall >= 4.5) tier = 'Outstanding Star';
    else if (overall >= 3.8) tier = 'High Performer';
    else if (overall >= 3.0) tier = 'On-Track Learner';
    else if (overall >= 2.0) tier = 'Needs Focus';
    else tier = 'Action Required';

    return {
      stars: overall,
      roundedStars,
      tier,
      weekLabel: 'Current Academic Week',
      weekNumber: 42,
      year: 2026,
      attendanceScore: attScore,
      attendanceDetail: `${attRate}% weekly attendance rate (target: 75%+)`,
      assessmentScore: assScore,
      assessmentDetail: `${testRate}% average score across evaluations`,
      syllabusScore: sylScore,
      syllabusDetail: `${d?.effectiveSylDone ?? 0} modules covered (${sylRate}% syllabus progress)`,
      participationScore: partScore,
      participationDetail: `${doubts.length} doubts · ${submissions.length} submissions uploaded`,
      feedback: 'Maintain your consistent class attendance and syllabus pacing this week to secure high placement eligibility.',
      evaluatedBy: 'Automated Weekly Audit',
      history: []
    };
  }, [portal?.weeklyRating, st?.weeklyRating, d, attendance, assessments, doubts, submissions]);

  // --------------------------------------------------------------------------
  // Actions (all persisted to the server)
  // --------------------------------------------------------------------------
  // Resolves true on success so callers only clear their inputs when it saved
  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      closeModal();
      if (okMsg) showToast(okMsg);
      await load(true);
      return true;
    } catch (e) {
      showToast(`⚠ ${errMsg(e, 'Something went wrong')}`, 5000);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitDoubt = (question, topic) => run(
    () => createTrainerDoubt({ studentId: st.studentId, studentName: st.name, topic: topic || st.syllabusModule || 'General', course: st.course, question }),
    trainer ? `✓ Doubt sent to ${trainer.trainerName}` : '✓ Doubt logged — it will reach your trainer once one is allocated'
  );

  const submitWork = async () => {
    const { type, title, note, link, file, materialId } = form;
    if (!file && !link) { showToast('⚠ Attach a file or paste a link'); return; }
    await run(async () => {
      const payload = { type, title: title || file?.name || 'Submission', note, link, materialId };
      if (file) {
        if (file.size > 12 * 1024 * 1024) throw new Error('File is larger than 12 MB');
        payload.fileName = file.name;
        payload.mimeType = file.type;
        payload.data = await fileToBase64(file);
      }
      await createStudentSubmission(st.studentId, payload);
    }, trainer ? `✓ Sent to ${trainer.trainerName} for review` : '✓ Submitted');
  };

  const submitRequest = (type, subject, extra = {}) => run(
    () => createStudentRequest(st.studentId, { type, subject, message: form.message || '', preferredDate: form.preferredDate || '', ...extra }),
    '✓ Request sent'
  );

  const saveProfile = (patch, okMsg) => run(() => updateStudentPortalProfile(st.studentId, patch), okMsg);

  // --------------------------------------------------------------------------
  // Loading / not-linked states
  // --------------------------------------------------------------------------
  if (loading && !portal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f4f6fb]">
        <div className="text-center text-slate-500 text-sm"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-[#0d9488]" />Loading your student record…</div>
      </div>
    );
  }
  if (!st || !d) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f4f6fb] p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md text-center shadow-sm">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Student record not found</h2>
          <p className="text-xs text-slate-500 mt-2">{loadError || 'Your login is not linked to an admitted student yet.'}</p>
          <p className="text-xs text-slate-400 mt-1">Signed in as {currentUser?.email || currentUser?.name || 'unknown'}</p>
          <div className="flex gap-2 justify-center mt-6">
            <Btn tone="light" onClick={() => load()}><RefreshCw className="w-4 h-4" />Retry</Btn>
            <Btn onClick={onLogout || onClose}><LogOut className="w-4 h-4" />Logout</Btn>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { category: 'OVERVIEW', items: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'membership', label: 'Membership & Referrals', icon: CreditCard },
      { id: 'progress', label: 'My Progress', icon: TrendingUp }
    ] },
    { category: 'LEARNING', items: [
      { id: 'classes', label: 'Classes', icon: Calendar },
      { id: 'lms', label: 'Materials & Tests', icon: BookOpen },
      { id: 'trainers', label: 'My Trainer', icon: Users }
    ] },
    { category: 'CAREER', items: [
      { id: 'placement-prep', label: 'Placement Prep', icon: Briefcase },
      { id: 'certification', label: 'Certificate & Placement', icon: Award }
    ] },
    { category: 'ACCOUNT', items: [
      { id: 'payments', label: 'Payments', icon: CreditCard },
      { id: 'admission', label: 'Admission Details', icon: FileText },
      { id: 'help', label: 'Help', icon: HelpCircle },
      { id: 'profile', label: 'My Profile', icon: User }
    ] }
  ];
  const go = (id) => { setActiveNav(id); setNavOpen(false); };
  const navTitle = navItems.flatMap((g) => g.items).find((i) => i.id === activeNav)?.label || 'Dashboard';

  const pct = (v) => (typeof v === 'number' ? `${v}%` : '—');
  const bar = (v) => `${Math.min(100, Math.max(0, Number(v) || 0))}%`;
  const newReplies = doubts.filter((x) => x.status === 'Replied');
  const answeredDoubts = doubts.filter((x) => x.status === 'Replied' || x.status === 'Resolved');

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================
  const renderDashboard = () => {
    const actions = [];
    if (d.balance > 0) actions.push({ icon: CreditCard, tone: 'rose', title: `Fee balance ${inr(d.balance)}`, sub: st.nextDueDate ? `Next due ${st.nextDueDate}` : 'Pending with accounts', go: () => setActiveNav('payments') });
    const failed = assessments.filter((t) => t.passed === false);
    if (failed.length) actions.push({ icon: AlertCircle, tone: 'amber', title: `Revise: ${failed[0].name}`, sub: `Scored ${failed[0].myScore}/${failed[0].totalMarks} · pass mark ${failed[0].passMark}`, go: () => setActiveNav('lms') });
    // Only flag a revision if it is still the latest version of that piece of work
    const workKey = (s) => s.materialId || `${s.type}:${s.title}`;
    const revision = submissions.find((s) => s.status === 'Needs Revision' && submissions.find((x) => workKey(x) === workKey(s)) === s);
    if (revision) actions.push({ icon: Upload, tone: 'amber', title: `Resubmit: ${revision.title}`, sub: revision.feedback || 'Trainer asked for a revision', go: () => setActiveNav('lms') });
    const openTest = assessments.find((t) => t.mode === 'online' && t.myScore === null && t.attempt?.status !== 'submitted' && (!t.date || t.date <= new Date().toISOString().slice(0, 10)));
    if (openTest) actions.unshift({ icon: BookOpen, tone: 'indigo', title: `${openTest.attempt?.status === 'in_progress' ? 'Finish' : 'Take'} online test: ${openTest.name}`, sub: `${openTest.questionCount} questions · ${openTest.durationMin || ''} min`, go: () => setTestId(openTest.id) });
    if (!d.resume) actions.push({ icon: Upload, tone: 'indigo', title: 'Upload your resume', sub: 'Needed before placement drives', go: () => openModal('submit', {}, { type: 'resume', title: 'Resume' }) });
    if (newReplies.length) actions.push({ icon: MessageSquare, tone: 'green', title: `${newReplies.length} doubt${newReplies.length > 1 ? 's' : ''} answered`, sub: newReplies[0].topic, go: () => setActiveNav('trainers') });
    if (materials[0]) actions.push({ icon: BookOpen, tone: 'indigo', title: `New material: ${materials[0].title}`, sub: materials[0].module || materials[0].category, go: () => setActiveNav('lms') });
    const toneCls = { rose: 'bg-rose-50 text-rose-600 border-rose-200', amber: 'bg-amber-50 text-amber-600 border-amber-200', indigo: 'bg-indigo-50 text-[#483ec7] border-indigo-200', green: 'bg-emerald-50 text-emerald-600 border-emerald-200' };

    return (
      <div className="w-full space-y-6 pb-12">
        <StudentDemoNotice email={st.email || currentUser?.email} name={d.name} />

        {/* Live class banner — started by the trainer from the Class Session Room */}
        <div className="bg-gradient-to-r from-[#07252a] via-[#0b3842] to-[#061e22] border border-teal-500/30 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_8px_30px_rgba(7,37,42,0.25)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0e3b43] border border-teal-400/40 flex items-center justify-center flex-shrink-0"><Video className="w-6 h-6 text-teal-300" /></div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {live ? (
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 rounded-md flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />LIVE NOW</span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-400/15 border border-amber-400/40 px-2.5 py-0.5 rounded-md">{trainer ? 'NO LIVE CLASS' : 'AWAITING ALLOCATION'}</span>
                )}
                <span className="text-white font-black text-base sm:text-lg tracking-tight">
                  {live ? `${live.topic || d.batch} — ${live.trainerName} is live` : `${st.course}${st.syllabusModule ? ` — ${st.syllabusModule}` : ''}`}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {live
                  ? `Started ${new Date(live.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · join from here`
                  : trainer
                    ? `${trainer.trainerName}${st.batchTiming ? ` · ${st.batchTiming}` : ''} · this banner turns live when your trainer starts class`
                    : 'The Head of Trainer will allocate a trainer and batch. Class links will appear here.'}
              </p>
            </div>
          </div>
          <button onClick={() => openModal('liveClass')}
            className={`w-full sm:w-auto px-7 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer flex-shrink-0 ${live ? 'bg-[#009688] hover:bg-[#00897b] text-white' : 'bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700'}`}>
            {live ? '▶ Join Class' : 'Classroom Status'}<ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Break Status Banner (if student has an active approved break or pending break request) */}
        {st?.breakStatus === 'approved' && (
          <div className="p-4 sm:p-5 bg-emerald-50/90 border-2 border-emerald-300 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 border border-emerald-300 text-2xl flex items-center justify-center flex-shrink-0">
                🌴
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-black text-emerald-950 text-sm sm:text-base">Official Academic Break Active</h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-200 text-emerald-900">
                    Status: On Hold
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-800 border border-emerald-300">
                    Prior Approval Granted
                  </span>
                </div>
                <p className="text-xs text-emerald-900 mt-1 font-medium">
                  Approved period: <strong>{fmtDate(st.breakStartDate)}</strong> to <strong>{fmtDate(st.breakEndDate)}</strong>
                  {st.breakReason && <> · Reason: <em>{st.breakReason}</em></>}
                  {st.breakApprovedBy && <> · Approved by: <strong>{st.breakApprovedBy}</strong></>}
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Your syllabus progress and attendance are protected on official hold. Please reach out to your branch HR on your return date to resume classes.
                </p>
              </div>
            </div>
            <Btn tone="light" onClick={() => setActiveNav('help')} className="text-xs flex-shrink-0 cursor-pointer">
              Break Details
            </Btn>
          </div>
        )}

        {st?.breakStatus === 'pending_approval' && (
          <div className="p-4 sm:p-5 bg-amber-50/90 border-2 border-amber-300 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-300 text-2xl flex items-center justify-center flex-shrink-0">
                ⏳
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-black text-amber-950 text-sm sm:text-base">Break Request Pending Prior Approval</h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900">
                    Under Review
                  </span>
                </div>
                <p className="text-xs text-amber-900 mt-1 font-medium">
                  Requested break: <strong>{fmtDate(st.breakStartDate)}</strong> to <strong>{fmtDate(st.breakEndDate)}</strong>
                  {st.breakReason && <> · Reason: <em>{st.breakReason}</em></>}
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Your supporting documentation is under review by HR / Operations authority. Prior approval is required before leave commences.
                </p>
              </div>
            </div>
            <Btn tone="light" onClick={() => setActiveNav('help')} className="text-xs flex-shrink-0 cursor-pointer">
              View Request
            </Btn>
          </div>
        )}

        {/* ======================================================== */}
        {/* WEEKLY STAR RATING - STUDENT DASHBOARD                    */}
        {/* Updated weekly based on 4 pillars:                        */}
        {/* 1. Attendance                                             */}
        {/* 2. Assessment Performance                                 */}
        {/* 3. Syllabus Progress                                      */}
        {/* 4. Participation                                          */}
        {/* ======================================================== */}
        <div className="bg-gradient-to-br from-[#121633] via-[#1c224f] to-[#0d1029] rounded-3xl p-5 sm:p-7 text-white shadow-[0_8px_32px_rgba(20,25,60,0.35)] border border-indigo-500/30 space-y-6">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-400/20">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black text-2xl flex items-center justify-center shadow-md flex-shrink-0">
                ⭐
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                    Weekly Star Rating
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    {weeklyRating.tier}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-indigo-200 border border-white/10">
                    {weeklyRating.weekLabel}
                  </span>
                </div>
                <p className="text-xs text-indigo-200 mt-1">
                  Updated weekly based on attendance, assessment performance, syllabus progress, and participation
                </p>
              </div>
            </div>

            {weeklyRating.history?.length > 0 && (
              <button
                onClick={() => openModal('ratingHistory')}
                className="self-start sm:self-auto text-xs font-bold text-amber-300 hover:text-white bg-white/10 hover:bg-white/20 border border-amber-300/30 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Weekly Trend</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Hero Star Score & Feedback */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Left: Star Badge & Big Numerical Score */}
            <div className="lg:col-span-5 bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="text-center sm:text-left">
                <div className="flex items-baseline justify-center sm:justify-start gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-amber-400 tracking-tight">
                    {Number(weeklyRating.stars || 0).toFixed(1)}
                  </span>
                  <span className="text-indigo-300 font-bold text-sm">/ 5.0</span>
                </div>

                {/* 5-Star Visual Display */}
                <div className="flex items-center gap-1 my-2 justify-center sm:justify-start">
                  {[1, 2, 3, 4, 5].map((starNum) => {
                    const isFull = weeklyRating.stars >= starNum;
                    const isHalf = !isFull && weeklyRating.stars >= starNum - 0.5;
                    return (
                      <span
                        key={starNum}
                        className={`text-2xl transition-transform hover:scale-110 ${
                          isFull
                            ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                            : isHalf
                            ? 'text-amber-300'
                            : 'text-slate-600'
                        }`}
                      >
                        ★
                      </span>
                    );
                  })}
                </div>

                <div className="text-[11px] text-indigo-200 font-medium">
                  Comprehensive Weekly Evaluation Score
                </div>
              </div>
            </div>

            {/* Right: Weekly Feedback / Tip Callout */}
            <div className="lg:col-span-7 bg-amber-500/10 border border-amber-400/30 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">💡</span>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                  Weekly Performance Guidance
                </h4>
                <p className="text-xs text-indigo-100 leading-relaxed font-medium">
                  {weeklyRating.feedback || 'Maintain your strong attendance and syllabus pace this week to stay on track for placement readiness.'}
                </p>
                <div className="text-[10px] text-indigo-300 pt-1">
                  Evaluated via {weeklyRating.evaluatedBy || 'Automated Weekly Audit'} · Updates weekly
                </div>
              </div>
            </div>
          </div>

          {/* The 4 Core Evaluation Pillars */}
          <div>
            <div className="text-xs font-bold text-indigo-200 mb-3 flex items-center justify-between">
              <span className="uppercase tracking-wider text-[10px] font-black text-indigo-300">
                4 Core Evaluation Pillars (Equal 25% Weightage)
              </span>
              <span className="text-[10px] text-indigo-300">Target: ≥ 4.0★ per pillar</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* PILLAR 1: ATTENDANCE */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/10 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>📋</span> Attendance
                    </span>
                    <span className="text-xs font-black text-amber-400 flex items-center gap-0.5">
                      {Number(weeklyRating.attendanceScore || 0).toFixed(1)} <span className="text-[10px] text-amber-300">★</span>
                    </span>
                  </div>

                  <div className="w-full bg-slate-700/60 rounded-full h-1.5 overflow-hidden my-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
                      style={{ width: `${Math.min(100, Math.max(10, ((weeklyRating.attendanceScore || 0) / 5) * 100))}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-indigo-200 line-clamp-2 mt-1">
                    {weeklyRating.attendanceDetail || 'Weekly class attendance'}
                  </p>
                </div>
                <div className="text-[10px] text-indigo-400 pt-2 border-t border-white/5 mt-3 flex justify-between font-mono">
                  <span>Target: 75%+</span>
                  <span>25% Weight</span>
                </div>
              </div>

              {/* PILLAR 2: ASSESSMENT PERFORMANCE */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/10 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>📝</span> Assessments
                    </span>
                    <span className="text-xs font-black text-amber-400 flex items-center gap-0.5">
                      {Number(weeklyRating.assessmentScore || 0).toFixed(1)} <span className="text-[10px] text-amber-300">★</span>
                    </span>
                  </div>

                  <div className="w-full bg-slate-700/60 rounded-full h-1.5 overflow-hidden my-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
                      style={{ width: `${Math.min(100, Math.max(10, ((weeklyRating.assessmentScore || 0) / 5) * 100))}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-indigo-200 line-clamp-2 mt-1">
                    {weeklyRating.assessmentDetail || 'Evaluated tests and scores'}
                  </p>
                </div>
                <div className="text-[10px] text-indigo-400 pt-2 border-t border-white/5 mt-3 flex justify-between font-mono">
                  <span>Target: 70%+</span>
                  <span>25% Weight</span>
                </div>
              </div>

              {/* PILLAR 3: SYLLABUS PROGRESS */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/10 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>🧭</span> Syllabus Pace
                    </span>
                    <span className="text-xs font-black text-amber-400 flex items-center gap-0.5">
                      {Number(weeklyRating.syllabusScore || 0).toFixed(1)} <span className="text-[10px] text-amber-300">★</span>
                    </span>
                  </div>

                  <div className="w-full bg-slate-700/60 rounded-full h-1.5 overflow-hidden my-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400"
                      style={{ width: `${Math.min(100, Math.max(10, ((weeklyRating.syllabusScore || 0) / 5) * 100))}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-indigo-200 line-clamp-2 mt-1">
                    {weeklyRating.syllabusDetail || 'Module progression speed'}
                  </p>
                </div>
                <div className="text-[10px] text-indigo-400 pt-2 border-t border-white/5 mt-3 flex justify-between font-mono">
                  <span>On-track pacing</span>
                  <span>25% Weight</span>
                </div>
              </div>

              {/* PILLAR 4: PARTICIPATION */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/10 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>💬</span> Participation
                    </span>
                    <span className="text-xs font-black text-amber-400 flex items-center gap-0.5">
                      {Number(weeklyRating.participationScore || 0).toFixed(1)} <span className="text-[10px] text-amber-300">★</span>
                    </span>
                  </div>

                  <div className="w-full bg-slate-700/60 rounded-full h-1.5 overflow-hidden my-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
                      style={{ width: `${Math.min(100, Math.max(10, ((weeklyRating.participationScore || 0) / 5) * 100))}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-indigo-200 line-clamp-2 mt-1">
                    {weeklyRating.participationDetail || 'Doubts & assignments'}
                  </p>
                </div>
                <div className="text-[10px] text-indigo-400 pt-2 border-t border-white/5 mt-3 flex justify-between font-mono">
                  <span>Interactive</span>
                  <span>25% Weight</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 03. STUDENT DASHBOARD - DAILY UPDATES                     */}
        {/* Priority fields: Student Attendance & Syllabus Completion */}
        {/* ======================================================== */}
        <div className="bg-white border-2 border-indigo-100/90 rounded-3xl p-5 sm:p-7 shadow-[0_4px_24px_rgba(72,62,199,0.06)] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-xl shadow-xs">
                📅
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Daily Updates
                  </h3>
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Updated Today
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Priority fields: Student Attendance &amp; Syllabus Completion Status
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>{fmtDate(new Date())}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* PRIORITY FIELD 1: STUDENT ATTENDANCE */}
            <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border border-emerald-200/80 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 font-mono flex items-center gap-1.5">
                    <span>📋</span> Priority 1: Student Attendance
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                    (d.attendancePct ?? 0) >= ATTENDANCE_TARGET
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {(d.attendancePct ?? 0) >= ATTENDANCE_TARGET ? '✓ Target Met (75%+)' : '⚠ Below 75% Target'}
                  </span>
                </div>

                <div className="flex items-baseline gap-3 my-2">
                  <div className="text-3xl sm:text-4xl font-black text-emerald-950">
                    {pct(d.attendancePct)}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold">
                    Overall Attendance Rate
                  </div>
                </div>

                {/* Today's Attendance Status */}
                <div className="p-3 bg-white/95 rounded-xl border border-emerald-200/70 text-xs space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Today's Class Status:</span>
                    {d.todayAttendance ? (
                      <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] border ${
                        d.todayAttendance.status === 'Present'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : d.todayAttendance.status === 'Late'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {d.todayAttendance.status === 'Present' ? '✓ Present' : d.todayAttendance.status === 'Late' ? '⏱ Late' : '✕ Absent'}
                      </span>
                    ) : live ? (
                      <span className="font-bold px-2 py-0.5 rounded-md text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                        ● Class Live Now — Join to log
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-500 text-[11px]">
                        Scheduled / Awaiting Today's Session
                      </span>
                    )}
                  </div>
                  {d.todayAttendance?.topic && (
                    <div className="text-[11px] text-slate-600">
                      Today's Topic: <strong className="text-slate-800">{d.todayAttendance.topic}</strong>
                    </div>
                  )}
                  {d.latestAttendance && !d.todayAttendance && (
                    <div className="text-[10.5px] text-slate-500">
                      Last logged session: <strong>{fmtDate(d.latestAttendance.date)}</strong> · {d.latestAttendance.status}
                    </div>
                  )}
                </div>

                {/* Attendance Metric Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center mt-3 text-xs">
                  <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                    <div className="font-black text-emerald-700 text-sm">{d.attended}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Present</div>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                    <div className="font-black text-amber-700 text-sm">{d.late}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Late</div>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                    <div className="font-black text-rose-700 text-sm">{d.absent}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Absent</div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">
                  Total classes held: <strong>{attendance.length}</strong>
                </span>
                <button
                  onClick={() => setActiveNav('progress')}
                  className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View Attendance Log <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* PRIORITY FIELD 2: SYLLABUS COMPLETION STATUS */}
            <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/30 border border-indigo-200/80 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#483ec7] font-mono flex items-center gap-1.5">
                    <span>🧭</span> Priority 2: Syllabus Completion
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                    d.isSyllabusDone
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                  }`}>
                    {d.isSyllabusDone ? '✓ 100% Completed' : 'In Progress'}
                  </span>
                </div>

                <div className="flex items-baseline gap-3 my-2">
                  <div className="text-3xl sm:text-4xl font-black text-[#1e1b4b]">
                    {d.effectiveSylPct}%
                  </div>
                  <div className="text-xs text-slate-500 font-semibold">
                    {d.isSyllabusDone ? 'Full Syllabus Cleared' : `${d.effectiveSylDone} of ${displaySylModules.length} Modules Covered`}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200/70 rounded-full h-2.5 overflow-hidden my-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#483ec7] to-teal-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(d.effectiveSylPct, 5))}%` }}
                  />
                </div>

                {/* Current module & topics details */}
                <div className="p-3 bg-white/95 rounded-xl border border-indigo-200/70 text-xs space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Current Module:</span>
                    <strong className="text-slate-900 font-bold">{st.syllabusModule || 'Module 1'}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Placement Eligibility:</span>
                    <span className={`font-semibold text-[11px] ${d.isSyllabusDone ? 'text-emerald-700 font-bold' : 'text-slate-600'}`}>
                      {d.isSyllabusDone ? '✓ Eligible (Sent to CCCP)' : 'Requires Syllabus Completion'}
                    </span>
                  </div>
                  {d.topics.length > 0 && (
                    <div className="text-[11px] text-slate-600 truncate">
                      Latest Topic Covered: <strong className="text-slate-800">{d.topics[d.topics.length - 1]}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">
                  Batch: <strong>{st.batchName || 'Allocated Batch'}</strong>
                </span>
                <button
                  onClick={() => setActiveNav('classes')}
                  className="text-[#483ec7] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View Module Tracker <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {[
            { label: 'Attendance', value: pct(d.attendancePct), sub: `${d.attended}/${attendance.length} classes`, color: '#0d9488', w: d.attendancePct },
            { label: 'Test Average', value: pct(d.testAvg), sub: `${assessments.filter((t) => t.myScore !== null).length} tests scored`, color: '#ea580c', w: d.testAvg },
            { label: 'Readiness Score', value: d.readiness !== null ? `${d.readiness}/100` : '—', sub: `Target ${READINESS_TARGET}+`, color: '#7c3aed', w: d.readiness }
          ].map((c) => (
            <div key={c.label} className="bg-white border border-slate-200/80 rounded-3xl p-6 text-center shadow-[0_2px_14px_rgba(0,0,0,0.03)]">
              <div className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: c.color }}>{c.value}</div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-2">{c.label}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{c.sub}</div>
              <div className="w-24 h-1 bg-slate-100 rounded-full mx-auto mt-2.5 overflow-hidden"><div className="h-full rounded-full" style={{ width: bar(c.w), background: c.color }} /></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">
            <Card>
              <CardTitle icon="🎓" title="My Batch" right={<button onClick={() => setActiveNav('classes')} className="text-xs font-bold text-[#483ec7] hover:underline cursor-pointer">Classes ›</button>} />
              <div className="divide-y divide-slate-100">
                <Row label="Batch" value={st.batchName} />
                <Row label="Course" value={st.course} />
                <Row label="Batch start" value={st.batchDate} />
                <Row label="Timing" value={st.batchTiming} />
                <Row label="Mode · Branch" value={[st.mode, st.location].filter(Boolean).join(' · ')} />
                <Row label="Current module" value={st.syllabusModule} />
              </div>
            </Card>
            <Card>
              <CardTitle
                icon="🧭"
                title="Syllabus Progress"
                sub={`${d.effectiveSylDone} of ${displaySylModules.length} modules covered by your trainer`}
                right={<Pill tone={d.effectiveSylPct === 100 ? 'green' : 'indigo'}>{d.effectiveSylPct}%</Pill>}
              />
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-4">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#483ec7] to-[#0d9488]"
                  style={{ width: bar(d.effectiveSylPct) }}
                />
              </div>
              <div className="space-y-1.5">
                {displaySylModules.map((m, i) => {
                  const isNext = !m.done && displaySylModules.findIndex((x) => !x.done) === i;
                  return (
                    <div
                      key={`${m.name}-${i}`}
                      className={`flex items-center justify-between gap-3 text-xs px-3 py-2 rounded-xl border ${
                        m.done
                          ? 'bg-emerald-50/60 border-emerald-100'
                          : isNext
                          ? 'bg-indigo-50 border-indigo-200'
                          : 'bg-white border-slate-100'
                      }`}
                    >
                      <span className={`font-semibold ${m.done ? 'text-emerald-800' : isNext ? 'text-[#483ec7]' : 'text-slate-500'}`}>
                        {m.done ? '✓' : isNext ? '●' : '○'} {m.name}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {m.done ? fmtDate(m.doneAt) : isNext ? 'Up next' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card>
              <CardTitle icon="📍" title="Topics Covered in Class" sub="Logged by your trainer with each attendance" right={<button onClick={() => setActiveNav('progress')} className="text-xs font-bold text-[#483ec7] hover:underline cursor-pointer">Progress ›</button>} />
              {d.topics.length === 0 ? <Empty icon="🗂" title="No classes logged yet" text="Topics appear here as your trainer records each class." /> : (
                <div className="flex flex-wrap gap-2">
                  {d.topics.map((t, i) => <span key={t} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${i === d.topics.length - 1 ? 'bg-indigo-50 border-indigo-200 text-[#483ec7]' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>{i === d.topics.length - 1 ? '● ' : '✓ '}{t}</span>)}
                </div>
              )}
              {st.syllabusCompleted && <div className="mt-4 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">✓ Full syllabus completed {st.syllabusCompletedAt ? `on ${fmtDate(st.syllabusCompletedAt)}` : ''}</div>}
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-6">
            {announcements.length > 0 && (
              <Card>
                <CardTitle icon="📢" title="Announcements" sub={trainer ? `From ${trainer.trainerName}` : 'From your trainer'} />
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {announcements.slice(0, 5).map((a) => (
                    <div key={a.id} className="border-l-4 border-[#483ec7] bg-indigo-50/40 rounded-r-xl px-3 py-2">
                      <div className="text-xs font-bold text-slate-900">{a.title}</div>
                      {a.message && <p className="text-[11px] text-slate-600 mt-0.5 whitespace-pre-line">{a.message}</p>}
                      <div className="text-[10px] text-slate-400 mt-1">{fmtDate(a.createdAt)}{a.trainerName ? ` · ${a.trainerName}` : ''}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            <Card>
              <CardTitle icon="⚡" title="What needs your attention" />
              {actions.length === 0 ? <Empty icon="✅" title="You're all caught up" /> : (
                <div className="space-y-3">
                  {actions.slice(0, 5).map((a, i) => {
                    const Icon = a.icon;
                    return (
                      <div key={i} onClick={a.go} className="group p-3.5 rounded-2xl border border-slate-200/70 hover:border-[#483ec7]/40 hover:bg-slate-50/70 cursor-pointer flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${toneCls[a.tone]}`}><Icon className="w-5 h-5" /></div>
                          <div className="min-w-0"><div className="text-xs sm:text-sm font-bold text-slate-900 truncate">{a.title}</div><div className="text-[11px] text-slate-400 truncate">{a.sub}</div></div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#483ec7] flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card>
              <CardTitle icon="🧑‍🏫" title="My Trainer" right={<button onClick={() => setActiveNav('trainers')} className="text-xs font-bold text-[#483ec7] hover:underline cursor-pointer">Details ›</button>} />
              {trainer ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#4338ca] to-[#312e81] text-white font-black flex items-center justify-center">{trainer.trainerName[0]}</div>
                    <div className="min-w-0"><div className="text-sm font-bold text-slate-900 truncate">{trainer.trainerName}</div><div className="text-[11px] text-slate-500 truncate">{trainer.specialization || trainer.expertCourse || trainer.role}</div></div>
                  </div>
                  <Btn onClick={() => openModal('doubt')}>Ask doubt</Btn>
                </div>
              ) : <Empty icon="⏳" title="Trainer not allocated yet" text="The Head of Trainer will allocate your trainer shortly." />}
            </Card>

            <div className="bg-gradient-to-br from-[#0f3b40] to-[#0a2a2e] rounded-3xl p-6 text-white space-y-3">
              <h3 className="font-extrabold text-base">🎯 Book a 1-on-1 Course Demo</h3>
              <p className="text-xs text-teal-100/90">Want to add another certification? Book a live demo with a course expert.</p>
              <button onClick={() => setShowDemoModal(true)} className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"><Calendar className="w-4 h-4" />Book Course Demo</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // MEMBERSHIP & REFERRALS
  // ==========================================================================
  const renderMembership = () => {
    const points = Number(st.rewardPoints || 0);
    const toNext = d.nextTier ? d.nextTier.min - d.joined : 0;
    return (
      <div className="space-y-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-gradient-to-br from-[#0b3842] via-[#0e4a55] to-[#062126] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <img src="/thoughtflows-logo-white.png" alt="ThoughtFlows" className="h-6 w-auto object-contain" />
              <span className="bg-white text-slate-900 px-4 py-1 rounded-full text-xs font-black uppercase">{d.tier.name} Tier</span>
            </div>
            <div className="mt-8 text-[11px] text-[#71a5af] uppercase font-bold tracking-widest">Member</div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase mt-1">{d.name}</h2>
            <div className="grid grid-cols-3 gap-4 mt-6 text-xs">
              <div><div className="text-[10px] text-[#71a5af] uppercase font-semibold">Student ID</div><div className="font-mono font-bold mt-0.5">{st.studentId}</div></div>
              <div><div className="text-[10px] text-[#71a5af] uppercase font-semibold">Member since</div><div className="font-bold mt-0.5">{fmtDate(st.createdAt) || st.batchDate}</div></div>
              <div><div className="text-[10px] text-[#71a5af] uppercase font-semibold">Course</div><div className="font-bold mt-0.5">{shortCourse(st.course)}</div></div>
            </div>
            <div className="mt-6 bg-black/20 border border-white/10 rounded-2xl p-4 flex justify-between">
              <div><div className="text-[10px] text-[#71a5af] uppercase font-bold">Reward points</div><div className="text-2xl font-black">{points.toLocaleString('en-IN')}</div></div>
              <div className="text-right"><div className="text-[10px] text-[#71a5af] uppercase font-bold">Cash value</div><div className="text-2xl font-black text-amber-300">{inr(points)}</div></div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <Card>
              <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-400">Membership tier</span><Pill tone="amber">{d.tier.name}</Pill></div>
              {d.nextTier ? (
                <>
                  <h3 className="text-base font-bold text-slate-900 mt-3">Unlock <span className="text-amber-600">{d.nextTier.name}</span></h3>
                  <p className="text-xs text-slate-500 mt-1">{toNext} more admitted referral{toNext === 1 ? '' : 's'} to reach {d.nextTier.name}.</p>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 mt-3 overflow-hidden"><div className="bg-gradient-to-r from-[#d97706] to-[#fbbf24] h-full rounded-full" style={{ width: bar((d.joined / d.nextTier.min) * 100) }} /></div>
                  <div className="text-[11px] text-slate-500 mt-1.5">{d.joined} / {d.nextTier.min} joined</div>
                </>
              ) : <p className="text-xs text-slate-500 mt-3">You're at the highest tier.</p>}
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <Btn onClick={() => openModal('referral', {}, { course: st.course })} className="py-3.5">+ Refer a Friend</Btn>
              <Btn tone="light" onClick={() => openModal('redeem', {}, { points: points - d.pendingPoints, option: 'cash' })} disabled={points - d.pendingPoints <= 0} className="py-3.5">↻ Redeem Points</Btn>
            </div>
            {d.pendingPoints > 0 && <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{d.pendingPoints} points in a pending redemption request with HR.</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Referrals sent', referrals.length],
            ['Admitted', d.joined],
            ['Conversion', referrals.length ? `${Math.round((d.joined / referrals.length) * 100)}%` : '—'],
            ['Points earned', inr(referrals.filter((r) => r.referralRewarded).length * REFERRAL_REWARD)]
          ].map(([l, v]) => (
            <div key={l} className="bg-white border border-slate-200/80 rounded-3xl p-5 text-center"><div className="text-2xl font-black text-slate-900">{v}</div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">{l}</div></div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-7">
            <CardTitle icon="📋" title="My Referrals" sub="Live status from the admissions team" />
            {referrals.length === 0 ? <Empty icon="👥" title="No referrals yet" text={`Refer a friend — you earn ${REFERRAL_REWARD.toLocaleString('en-IN')} points when they get admitted.`} /> : (
              <div className="divide-y divide-slate-100">
                {referrals.map((r) => (
                  <div key={r._id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0"><div className="font-bold text-slate-900 text-sm truncate">{r.fullName}</div><div className="text-[11px] text-slate-400">{r.phone} · {r.course} · {fmtDate(r.createdAt)}</div></div>
                    <div className="flex flex-col items-end gap-1">
                      <Pill tone={statusTone(r.stage)}>{String(r.stage || 'new').replace(/_/g, ' ')}</Pill>
                      {r.referralRewarded && <span className="text-[10px] font-bold text-emerald-600">+{REFERRAL_REWARD} pts</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="lg:col-span-5">
            <CardTitle icon="⚡" title="How referrals work" />
            <ol className="space-y-3 text-xs text-slate-700">
              {[
                'Refer a friend with their name and mobile number.',
                `${st.hrName || 'Your HR counsellor'} contacts them and books a free demo.`,
                `When they are admitted, ${REFERRAL_REWARD.toLocaleString('en-IN')} points are credited to you automatically.`,
                'Redeem points as cash (UPI) or as fee credit — HR approves each request.',
                `Reach ${TIERS[1].min} admitted referrals for Gold and ${TIERS[2].min} for Platinum.`
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-2.5"><span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">{i + 1}</span><span>{t}</span></li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // PROGRESS
  // ==========================================================================
  const renderProgress = () => (
    <div className="space-y-6 pb-12">
      <PageHeader title="My Progress" sub="Attendance, test scores and readiness — as recorded by your trainer" right={<HeaderStat label="Readiness" value={d.readiness !== null ? `${d.readiness}/100` : 'Not scored'} />} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardTitle icon="📊" title="Test Results" sub={`${assessments.length} test${assessments.length === 1 ? '' : 's'} for your batch`} />
            {assessments.length === 0 ? <Empty icon="📝" title="No tests yet" text="Tests your trainer creates for your batch appear here with your score." /> : (
              <div className="divide-y divide-slate-100">
                {assessments.map((t) => (
                  <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{t.name}</div>
                      <div className="text-[11px] text-slate-400">{[t.type, t.topic, t.date && fmtDate(t.date)].filter(Boolean).join(' · ')}</div>
                      {t.rationale && <div className="text-[11px] text-slate-600 mt-1 bg-slate-50 rounded-lg px-2 py-1">💬 {t.rationale}</div>}
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      {t.myScore !== null ? (
                        <><div className="font-mono font-bold text-sm text-slate-900">{t.myScore}/{t.totalMarks}</div><Pill tone={t.passed ? 'green' : 'red'}>{t.passed ? 'Passed' : 'Below pass mark'}</Pill></>
                      ) : <Pill tone="slate">Not scored</Pill>}
                      {t.mode === 'online' && t.attempt?.status === 'submitted' && <button onClick={() => setTestId(t.id)} className="block ml-auto text-[11px] font-bold text-[#483ec7] hover:underline cursor-pointer">Review answers</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <CardTitle icon="📅" title="Attendance Log" sub={`${d.attended} attended · ${d.late} late · ${d.absent} absent`} right={<Pill tone={d.attendancePct === null ? 'slate' : d.attendancePct >= ATTENDANCE_TARGET ? 'green' : 'red'}>{pct(d.attendancePct)}</Pill>} />
            {attendance.length === 0 ? <Empty icon="📅" title="No attendance recorded yet" /> : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {attendance.map((a) => (
                  <div key={a.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0"><div className="font-semibold text-slate-800">{fmtDate(a.date)}</div><div className="text-[11px] text-slate-400 truncate">{[a.topic, a.trainerName].filter(Boolean).join(' · ')}</div></div>
                    <Pill tone={statusTone(a.status)}>{a.status}</Pill>
                  </div>
                ))}
              </div>
            )}
            {d.attendancePct !== null && d.attendancePct < ATTENDANCE_TARGET && <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mt-3">Attendance is below {ATTENDANCE_TARGET}%. This is flagged to your HR counsellor.</p>}
          </Card>
        </div>
        <div className="lg:col-span-5 space-y-6">
          <Card className="text-center">
            <h3 className="text-base font-bold text-slate-900">🎯 Placement Readiness</h3>
            <div className={`text-5xl font-black mt-4 ${d.readiness >= READINESS_TARGET ? 'text-emerald-600' : d.readiness >= 60 ? 'text-amber-600' : 'text-slate-700'}`}>{d.readiness ?? '—'}</div>
            <div className="text-xs text-slate-400 font-bold">OUT OF 100</div>
            <div className="w-full bg-slate-100 rounded-full h-3 mt-4 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500" style={{ width: bar(d.readiness) }} /></div>
            <div className="grid grid-cols-3 gap-2 mt-5 text-xs">
              {[['Tests', st.assessmentScore], ['Mock', st.mockScore], ['Technical', st.technicalScore]].map(([l, v]) => (
                <div key={l} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5"><div className="font-black text-slate-900">{typeof v === 'number' ? v : '—'}</div><div className="text-[10px] text-slate-500 font-semibold">{l}</div></div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-4 text-left">Average of your test score and the mock & technical scores your trainer enters — shown once all three are in. Reach {READINESS_TARGET}+ to be referred to placement.</p>
          </Card>
          <Card>
            <CardTitle icon="🧭" title="Trainer Recommendation" />
            {st.trainerRecommendation ? (
              <div className="flex items-center justify-between"><Pill tone={statusTone(st.trainerRecommendation)}>{st.trainerRecommendation}</Pill><span className="text-[11px] text-slate-400">{fmtDate(st.trainerRecommendationAt)}</span></div>
            ) : <Empty icon="⏳" title="Not given yet" text="Your trainer marks you Ready / Needs Revision after assessments." />}
            {(st.remedialActions || []).filter((r) => r.action !== 'escalate').length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Improvement plan</div>
                {(st.remedialActions || []).filter((r) => r.action !== 'escalate').map((r, i) => (
                  <div key={i} className="text-xs bg-amber-50 border border-amber-200 rounded-xl px-3 py-2"><b className="capitalize">{String(r.action).replace(/_/g, ' ')}</b>{r.note ? ` — ${r.note}` : ''}<div className="text-[10px] text-slate-400">{r.by} · {fmtDate(r.at)}</div></div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );

  // ==========================================================================
  // CLASSES
  // ==========================================================================
  const renderClasses = () => (
    <div className="space-y-6 pb-12">
      <PageHeader title="Classes" sub={[d.batch, st.batchTiming, st.mode].filter(Boolean).join(' · ') || 'Batch not allocated yet'} right={<HeaderStat label="Classes held" value={attendance.length} />} />
      <Card>
        <CardTitle icon="🔴" title="Live Class" />
        {live ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div><div className="text-sm font-bold text-slate-900">{live.topic || d.batch}</div><div className="text-xs text-slate-500">{live.trainerName} · started {new Date(live.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div></div>
            <Btn tone="teal" onClick={() => openModal('liveClass')}><Video className="w-4 h-4" />Join Now</Btn>
          </div>
        ) : (
          <div className="text-xs text-slate-600 space-y-1">
            <div>No class is live right now.</div>
            {(st.batchTiming || trainer?.workingDays) && <div className="text-slate-500">Regular schedule: <b>{[trainer?.workingDays, st.batchTiming].filter(Boolean).join(' · ')}</b></div>}
          </div>
        )}
      </Card>
      <Card>
        <CardTitle icon="🗓" title="Weekly Timetable" sub={trainer ? `${trainer.trainerName}'s classes for your batch` : 'Appears once your trainer is allocated'} />
        {timetable.length === 0 ? <Empty icon="🗓" title="No timetable published yet" text={st.batchTiming ? `Batch timing: ${st.batchTiming}` : 'Your trainer or admin adds class slots to the trainer roster.'} /> : (
          <div className="divide-y divide-slate-100">
            {timetable.map((c, i) => (
              <div key={`${c.name}-${i}`} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0"><div className="text-sm font-bold text-slate-900 truncate">{c.name || 'Class'}</div><div className="text-[11px] text-slate-500">{c.days || 'Working days'}</div></div>
                <span className="text-xs font-bold text-[#483ec7] bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg whitespace-nowrap">{Number.isFinite(c.startMin) && Number.isFinite(c.endMin) ? `${fmtMin(c.startMin)} – ${fmtMin(c.endMin)}` : c.timeSlot}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      {rateableClasses.length > 0 && (
        <Card>
          <CardTitle icon="⭐" title="Rate Recent Classes" sub="Anonymous to classmates — helps your trainer and the academy improve" />
          <div className="divide-y divide-slate-100">
            {rateableClasses.map((c) => (
              <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0"><div className="text-sm font-bold text-slate-900 truncate">{c.topic || 'Class session'}</div><div className="text-[11px] text-slate-400">{fmtDate(c.date)}{c.trainerName ? ` · ${c.trainerName}` : ''}</div></div>
                <Stars value={c.myRating || 0} onRate={(n) => rate({ kind: 'class', sessionId: c.id, rating: n })} />
              </div>
            ))}
          </div>
        </Card>
      )}
      <Card>
        <CardTitle icon="🎬" title="Class Recordings" sub="Replay classes you missed or want to revise" right={<HeaderStatMini value={recordings.length} />} />
        {recordings.length === 0 ? <Empty icon="🎬" title="No recordings yet" text="Your trainer adds the recording link after each class." /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recordings.map((r) => (
              <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="border border-slate-200 hover:border-[#483ec7]/50 rounded-2xl p-4 flex items-center gap-3 group">
                <PlayCircle className="w-8 h-8 text-[#483ec7] shrink-0" />
                <div className="min-w-0"><div className="text-sm font-bold text-slate-900 truncate group-hover:text-[#483ec7]">{r.topic || 'Class recording'}</div><div className="text-[11px] text-slate-400">{fmtDate(r.date)}{r.trainerName ? ` · ${r.trainerName}` : ''}</div></div>
                <ExternalLink className="w-4 h-4 text-slate-300 ml-auto shrink-0" />
              </a>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <CardTitle icon="🗂" title="Past Classes" sub="Every class your trainer recorded attendance for" />
        {attendance.length === 0 ? <Empty icon="🗓" title="No classes recorded yet" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {attendance.map((a) => (
              <div key={a.id} className="border border-slate-200 rounded-2xl p-4 flex items-start justify-between gap-3">
                <div className="min-w-0"><div className="text-sm font-bold text-slate-900 truncate">{a.topic || 'Class session'}</div><div className="text-[11px] text-slate-400 mt-0.5">{fmtDate(a.date)}{a.trainerName ? ` · ${a.trainerName}` : ''}</div></div>
                <Pill tone={statusTone(a.status)}>{a.status}</Pill>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <CardTitle icon="📝" title="Class Notes" sub="Key points your trainer shared during live classes" />
        {classNotes.length === 0 ? <Empty icon="📝" title="No class notes yet" /> : (
          <div className="space-y-4">
            {classNotes.map((c) => (
              <div key={c.id} className="border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2"><span className="text-sm font-bold text-slate-900">{c.topic || 'Class'}</span><span className="text-[11px] text-slate-400">{fmtDate(c.date)}{c.trainerName ? ` · ${c.trainerName}` : ''}</span></div>
                <ul className="mt-2 space-y-1 text-xs text-slate-700 list-disc pl-4">{c.notes.map((n, i) => <li key={i}>{n.text}</li>)}</ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  // ==========================================================================
  // MATERIALS, TESTS & SUBMISSIONS
  // ==========================================================================
  const renderLms = () => {
    const byModule = materials.reduce((acc, m) => { const k = m.module || m.category || 'General'; (acc[k] = acc[k] || []).push(m); return acc; }, {});
    const workSubs = submissions.filter((s) => s.type === 'assignment' || s.type === 'improvement_task');
    return (
      <div className="space-y-6 pb-12">
        <PageHeader title="Materials & Tests" sub="Files your trainer assigned to your batch, and the work you've sent back" right={<HeaderStat label="Materials" value={materials.length} />} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Card className="lg:col-span-7">
            <CardTitle icon="📚" title="Assigned Materials" sub={d.batch} />
            {materials.length === 0 ? <Empty icon="📂" title="Nothing assigned yet" text="Your trainer assigns notes, guidelines and practice sets from the library." /> : (
              <div className="space-y-5">
                {Object.entries(byModule).map(([mod, list]) => (
                  <div key={mod}>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{mod}</div>
                    <div className="space-y-2">
                      {list.map((m) => {
                        const sub = submissions.find((s) => s.materialId === m.id);
                        return (
                          <div key={m.id} className="p-3.5 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 truncate">{m.title}</div>
                              <div className="text-[11px] text-slate-400 truncate">{[m.fileFormat, fmtSize(m.fileSize), m.assignedBy || m.uploadedBy, fmtDate(m.assignedAt)].filter(Boolean).join(' · ')}</div>
                              {m.note && <div className="text-[11px] text-slate-600 mt-1">📌 {m.note}</div>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {sub && <Pill tone={statusTone(sub.status)}>{sub.status}</Pill>}
                              <a href={trainingMaterialFileUrl(m.id)} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-[#483ec7] text-white text-xs font-bold flex items-center gap-1"><ExternalLink className="w-3 h-3" />Open</a>
                              <button onClick={() => openModal('submit', {}, { type: 'assignment', title: `Answers — ${m.title}`, materialId: m.id })} className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer">{sub ? 'Resubmit' : 'Submit'}</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <div className="lg:col-span-5 space-y-6">
            <Card>
              <CardTitle icon="📤" title="My Submissions" right={<Btn tone="light" onClick={() => openModal('submit', {}, { type: 'assignment' })}><Upload className="w-3.5 h-3.5" />New</Btn>} />
              {workSubs.length === 0 ? <Empty icon="📤" title="No submissions yet" /> : (
                <div className="space-y-2">
                  {workSubs.map((s) => (
                    <div key={s._id} className="border border-slate-200 rounded-2xl p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-bold text-slate-900 truncate">{s.title}</div>
                        <Pill tone={statusTone(s.status)}>{s.status}{typeof s.score === 'number' ? ` · ${s.score}` : ''}</Pill>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{fmtDate(s.createdAt)}{s.fileName ? ` · ${s.fileName}` : ''}</div>
                      {s.feedback && <div className="text-[11px] text-slate-700 bg-slate-50 rounded-lg px-2 py-1.5 mt-2">💬 {s.reviewedBy ? `${s.reviewedBy}: ` : ''}{s.feedback}</div>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <CardTitle icon="📝" title="Upcoming / Unscored Tests" />
              {assessments.filter((t) => t.myScore === null).length === 0 ? <Empty icon="✅" title="No pending tests" /> : (
                <div className="space-y-2">
                  {assessments.filter((t) => t.myScore === null).map((t) => {
                    const online = t.mode === 'online';
                    const inProgress = t.attempt?.status === 'in_progress';
                    return (
                      <div key={t.id} className="text-xs border border-slate-200 rounded-xl p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-slate-900">{t.name}</div>
                          {online ? <Pill tone="indigo">ONLINE</Pill> : <Pill tone="slate">In class</Pill>}
                        </div>
                        <div className="text-[11px] text-slate-500">{[t.type, t.topic, t.date && fmtDate(t.date), online ? `${t.questionCount} questions · ${t.durationMin || ''} min` : t.timeLimit, `${t.totalMarks} marks · pass ${t.passMark}`].filter(Boolean).join(' · ')}</div>
                        {online && <Btn tone="indigo" className="w-full mt-2" onClick={() => setTestId(t.id)}>{inProgress ? 'Continue test' : 'Open test'}</Btn>}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // TRAINER & DOUBTS
  // ==========================================================================
  const renderTrainers = () => {
    const consults = requests.filter((r) => r.type === 'consultation');
    return (
      <div className="space-y-6 pb-12">
        <PageHeader title="My Trainer" sub="Your allocated trainer, doubts and 1-on-1 requests" right={<HeaderStat label="Doubts answered" value={`${answeredDoubts.length}/${doubts.length}`} />} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-6">
            <Card>
              {trainer ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4338ca] to-[#312e81] text-white text-xl font-black flex items-center justify-center">{trainer.trainerName[0]}</div>
                    <div><h3 className="text-lg font-black text-slate-900">{trainer.trainerName}</h3><p className="text-xs font-semibold text-[#483ec7]">{trainer.specialization || trainer.expertCourse || trainer.role || 'Trainer'}</p></div>
                  </div>
                  <div className="divide-y divide-slate-100 mt-4">
                    <Row label="Course" value={trainer.expertCourse} />
                    <Row label="Branch" value={trainer.branchName} />
                    <Row label="Working days" value={trainer.workingDays} />
                    <Row label="Shift" value={trainer.shift} />
                    <Row label="Languages" value={(trainer.languages || []).join(', ')} />
                    {(trainer.certifications || []).length > 0 && <Row label="Certifications" value={trainer.certifications.join(', ')} />}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-5">
                    <Btn onClick={() => openModal('doubt')}><MessageSquare className="w-4 h-4" />Ask Doubt</Btn>
                    <Btn tone="light" onClick={() => openModal('request', { reqType: 'consultation', title: `Request 1-on-1 with ${trainer.trainerName}` })}>📅 Request 1-on-1</Btn>
                  </div>
                </>
              ) : <Empty icon="⏳" title="Trainer not allocated yet" text="The Head of Trainer allocates your trainer after handover. Doubts you post now will be routed once allocated." />}
            </Card>
            {trainer && (
              <Card>
                <CardTitle icon="⭐" title={`Rate ${trainer.trainerName}`} sub={trainerFeedback ? `You rated ${trainerFeedback.rating}★ · you can update it anytime` : 'Your overall experience so far'} />
                <Stars value={trainerFeedback?.rating || 0} size="text-3xl" onRate={(n) => rate({ kind: 'trainer', rating: n, comment: trainerComment || trainerFeedback?.comment || '' })} />
                <textarea rows={2} value={trainerComment} onChange={(e) => setTrainerComment(e.target.value)} placeholder={trainerFeedback?.comment || 'Optional comment (then tap a star to save)'} className={`${inputCls} mt-3`} />
              </Card>
            )}
            {consults.length > 0 && (
              <Card>
                <CardTitle icon="📅" title="1-on-1 Requests" />
                <div className="space-y-2">{consults.map((r) => <RequestRow key={r._id} r={r} />)}</div>
              </Card>
            )}
          </div>
          <Card className="lg:col-span-7">
            <CardTitle icon="💭" title="My Doubts" sub="24-hour reply SLA" right={<Btn tone="light" onClick={() => openModal('doubt')}>+ New</Btn>} />
            {doubts.length === 0 ? <Empty icon="💭" title="No doubts posted yet" /> : (
              <div className="space-y-3">
                {doubts.map((q) => (
                  <div key={q.id} className="border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-bold text-slate-500">{q.topic} · {q.timeText}</span><Pill tone={statusTone(q.status)}>{q.status}</Pill></div>
                    <p className="text-sm text-slate-900 mt-1.5">{q.question}</p>
                    {(q.thread?.length ? q.thread : (q.reply ? [{ by: 'trainer', name: q.trainerName, text: q.reply, at: q.repliedAt }] : [])).map((m, i) => (
                      <div key={i} className={`mt-2 text-xs rounded-xl p-3 border ${m.by === 'trainer' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 ml-6'}`}>
                        <b className={m.by === 'trainer' ? 'text-emerald-800' : 'text-slate-700'}>{m.by === 'trainer' ? (m.name || q.trainerName || 'Trainer') : 'You'}:</b> <span className="text-slate-700 whitespace-pre-line">{m.text}</span>
                        {m.at && <span className="block text-[10px] text-slate-400 mt-0.5">{fmtDate(m.at)}</span>}
                      </div>
                    ))}
                    {q.status === 'Replied' && (
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-2">
                          <input value={followText[q.id] || ''} onChange={(e) => setFollowText((f) => ({ ...f, [q.id]: e.target.value }))} placeholder="Still unclear? Ask a follow-up…" className={inputCls} />
                          <Btn tone="light" disabled={busy || !String(followText[q.id] || '').trim()} onClick={() => sendFollowUp(q)}><Send className="w-3.5 h-3.5" /></Btn>
                        </div>
                        <button onClick={() => run(() => resolveDoubt(q.id), '✓ Marked as resolved')} className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer">✓ My doubt is cleared</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  };

  const RequestRow = ({ r }) => {
    const isMock = r.type === 'mock_interview';
    const attemptNum = r.attemptNumber || r.details?.attemptNumber || 1;
    const score = r.details?.mockScore ?? (isMock && r.status === 'Resolved' && st.mockScore != null ? st.mockScore : null);
    return (
      <div className="border border-slate-200 rounded-xl p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            {isMock && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 shrink-0">
                Attempt {attemptNum}/2
              </span>
            )}
            <span className="font-bold text-slate-900 truncate">{r.subject || r.type.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {score != null && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Score: {score}%
              </span>
            )}
            <Pill tone={statusTone(r.status)}>{r.status}</Pill>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">Raised {fmtDate(r.createdAt)}{r.preferredDate ? ` · preferred ${r.preferredDate}` : ''}{r.scheduledFor ? ` · scheduled ${r.scheduledFor}` : ''}</div>
        {r.details?.improvements && <div className="mt-1 text-[11px] text-slate-600 italic">Target improvements: “{r.details.improvements}”</div>}
        {r.response && <div className="mt-2 bg-slate-50 rounded-lg px-2 py-1.5 text-slate-700">💬 {r.respondedBy ? `${r.respondedBy}: ` : ''}{r.response}</div>}
      </div>
    );
  };

  // ==========================================================================
  // PLACEMENT PREP
  // ==========================================================================
  const renderPlacementPrep = () => {
    const mocks = requests.filter((r) => r.type === 'mock_interview');
    const validMocks = mocks.filter((r) => ['Open', 'Scheduled', 'Resolved'].includes(r.status));
    const completedMocks = mocks.filter((r) => r.status === 'Resolved');
    const openMock = mocks.find((r) => ['Open', 'Scheduled'].includes(r.status));
    const attemptsUsed = validMocks.length;
    const nextAttempt = Math.min(2, completedMocks.length + 1);

    // Attempt 1 details
    const att1 = (st.mockInterviewAttempts || []).find((a) => a.attemptNumber === 1) || completedMocks.find((m) => (m.attemptNumber || m.details?.attemptNumber) === 1);
    const att1Score = att1?.score ?? att1?.details?.mockScore;
    const att1Req = mocks.find((m) => (m.attemptNumber || m.details?.attemptNumber || 1) === 1);
    const att1Status = att1 ? 'Completed' : (att1Req?.status || 'Not Booked');

    // Attempt 2 details
    const att2 = (st.mockInterviewAttempts || []).find((a) => a.attemptNumber === 2) || completedMocks.find((m) => (m.attemptNumber || m.details?.attemptNumber) === 2);
    const att2Score = att2?.score ?? att2?.details?.mockScore;
    const att2Req = mocks.find((m) => (m.attemptNumber || m.details?.attemptNumber) === 2);
    const att2Status = att2 ? 'Completed' : (att2Req?.status || (att1Status === 'Completed' ? 'Available' : 'Locked'));

    const canBook = !openMock && attemptsUsed < 2 && Boolean(trainer);

    const SubStatus = ({ label, sub, type }) => (
      <div className="border border-slate-200 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2"><span className="text-sm font-bold text-slate-900">{label}</span>{sub ? <Pill tone={statusTone(sub.status)}>{sub.status}</Pill> : <Pill tone="slate">Not submitted</Pill>}</div>
        {sub?.feedback && <div className="text-[11px] text-slate-700 bg-slate-50 rounded-lg px-2 py-1.5 mt-2">💬 {sub.feedback}</div>}
        <div className="flex gap-2 mt-3">
          {sub?.fileName && <a href={studentSubmissionFileUrl(sub._id)} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#483ec7] hover:underline">View</a>}
          {sub?.link && <a href={sub.link} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#483ec7] hover:underline">Open link</a>}
          <button onClick={() => openModal('submit', {}, { type, title: label })} className="text-xs font-bold text-slate-700 hover:underline cursor-pointer ml-auto">{sub ? 'Upload new version' : 'Upload'} ›</button>
        </div>
      </div>
    );
    return (
      <div className="space-y-6 pb-12">
        <PageHeader title="Placement Prep" sub="Mock interviews, resume and video introduction — reviewed by your trainer" right={<HeaderStat label="Mock interview" value={st.mockInterview || 'Pending'} />} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">
            <Card>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎤</span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Mock Interviews</h3>
                    <div className="text-[11px] text-slate-500 font-medium">Two-Attempt Readiness Assessment & Improvement Plan</div>
                  </div>
                </div>
                <div>
                  {attemptsUsed >= 2 ? (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      2 / 2 Attempts Used
                    </span>
                  ) : openMock ? (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      Attempt {openMock.attemptNumber || openMock.details?.attemptNumber || 1} in Progress
                    </span>
                  ) : (
                    <Btn
                      onClick={() => openModal('request', {
                        reqType: 'mock_interview',
                        title: `Book Mock Interview — Attempt ${nextAttempt} of 2`,
                        attemptNumber: nextAttempt
                      })}
                      disabled={!canBook}
                    >
                      Book Attempt {nextAttempt} of 2
                    </Btn>
                  )}
                </div>
              </div>

              {/* Policy Banner */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3 mb-4 text-xs text-indigo-900 flex items-start gap-2.5">
                <span className="text-base leading-none">🎯</span>
                <div className="leading-relaxed">
                  <strong className="font-bold">Two-Attempt Policy:</strong> Students receive up to two mock interview attempts to assess and improve interview readiness. <strong>Attempt 1</strong> benchmarks initial performance; <strong>Attempt 2</strong> evaluates improvements made from your trainer's feedback.
                </div>
              </div>

              {/* Two Attempts Overview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {/* Attempt 1 Card */}
                <div className={`p-3.5 rounded-2xl border transition-all ${
                  att1Status === 'Completed'
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : att1Status === 'Scheduled' || att1Status === 'Open'
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-slate-50/60 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                      Attempt 1: Initial Assessment
                    </span>
                    <Pill tone={statusTone(att1Status)}>{att1Status}</Pill>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">
                      {att1Score != null ? `${att1Score}%` : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Readiness Score</span>
                  </div>
                  {att1?.feedback && (
                    <div className="mt-2 text-[11px] text-slate-600 bg-white/80 p-2 rounded-xl border border-slate-100 line-clamp-2">
                      💬 {att1.feedback}
                    </div>
                  )}
                </div>

                {/* Attempt 2 Card */}
                <div className={`p-3.5 rounded-2xl border transition-all ${
                  att2Status === 'Completed'
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : att2Status === 'Scheduled' || att2Status === 'Open'
                    ? 'bg-amber-50/40 border-amber-200'
                    : att2Status === 'Available'
                    ? 'bg-indigo-50/40 border-indigo-200'
                    : 'bg-slate-50/60 border-slate-200 opacity-70'
                }`}>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                      Attempt 2: Improvement
                    </span>
                    <Pill tone={statusTone(att2Status)}>{att2Status}</Pill>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">
                      {att2Score != null ? `${att2Score}%` : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Readiness Score</span>
                    {att1Score != null && att2Score != null && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        att2Score >= att1Score ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {att2Score >= att1Score ? `+${att2Score - att1Score}%` : `${att2Score - att1Score}%`}
                      </span>
                    )}
                  </div>
                  {att2?.feedback ? (
                    <div className="mt-2 text-[11px] text-slate-600 bg-white/80 p-2 rounded-xl border border-slate-100 line-clamp-2">
                      💬 {att2.feedback}
                    </div>
                  ) : att2Status === 'Available' ? (
                    <div className="mt-2 text-[11px] text-indigo-700 bg-white/80 p-2 rounded-xl border border-indigo-100">
                      ✨ Ready to re-assess after practicing feedback
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Request rows */}
              {mocks.length === 0 ? (
                <Empty
                  icon="🎤"
                  title="No mock interview booked"
                  text={trainer ? 'Request Attempt 1 — your trainer schedules it and enters your readiness assessment.' : 'Available once a trainer is allocated.'}
                />
              ) : (
                <div className="space-y-2">{mocks.map((r) => <RequestRow key={r._id} r={r} />)}</div>
              )}
              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3"><div className="text-[10px] font-bold text-slate-500 uppercase">Mock score</div><div className="text-lg font-black">{typeof st.mockScore === 'number' ? st.mockScore : '—'}</div></div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3"><div className="text-[10px] font-bold text-slate-500 uppercase">Technical score</div><div className="text-lg font-black">{typeof st.technicalScore === 'number' ? st.technicalScore : '—'}</div></div>
              </div>
            </Card>
            <Card>
              <CardTitle icon="📄" title="Placement Documents" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SubStatus label="Resume" sub={d.resume} type="resume" />
                <SubStatus label="60-sec Video Intro" sub={d.videoIntro} type="video_intro" />
              </div>
            </Card>
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#1e1b4b] rounded-3xl p-6 text-white space-y-3">
              <div className="flex items-center justify-between"><h3 className="text-base font-bold">Placement gate</h3><span className="text-xs font-bold text-amber-300 bg-white/10 px-3 py-1 rounded-full">{d.readiness >= READINESS_TARGET ? 'Target met ✓' : d.readiness === null ? 'Not scored' : `Gap ${READINESS_TARGET - d.readiness} pts`}</span></div>
              <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-400 to-teal-300" style={{ width: bar(((d.readiness || 0) / READINESS_TARGET) * 100) }} /></div>
              <ul className="text-xs space-y-1.5 text-indigo-100">
                <li>{d.readiness >= READINESS_TARGET ? '✓' : '○'} Readiness {READINESS_TARGET}+ (now {d.readiness ?? '—'})</li>
                <li>{(d.attendancePct || 0) >= ATTENDANCE_TARGET ? '✓' : '○'} Attendance {ATTENDANCE_TARGET}%+ (now {pct(d.attendancePct)})</li>
                <li>{d.resume?.status === 'Approved' ? '✓' : '○'} Resume approved</li>
                <li>{d.videoIntro?.status === 'Approved' ? '✓' : '○'} Video intro approved</li>
                <li>{st.trainerRecommendation === 'Ready' ? '✓' : '○'} Trainer recommendation: {st.trainerRecommendation || 'pending'}</li>
                <li>{d.balance === 0 ? '✓' : '○'} No fee dues</li>
              </ul>
            </div>
            <Card>
              <CardTitle icon="📝" title="Improvement Tasks" right={<Btn tone="light" onClick={() => openModal('submit', {}, { type: 'improvement_task', title: 'Improvement task' })}>Submit</Btn>} />
              {submissions.filter((s) => s.type === 'improvement_task').length === 0 ? <Empty icon="📝" title="Nothing submitted" text="Send work your trainer asked for in your improvement plan." /> : (
                <div className="space-y-2">{submissions.filter((s) => s.type === 'improvement_task').map((s) => (
                  <div key={s._id} className="text-xs border border-slate-200 rounded-xl p-3"><div className="flex justify-between gap-2"><b>{s.title}</b><Pill tone={statusTone(s.status)}>{s.status}</Pill></div>{s.feedback && <div className="text-slate-600 mt-1">💬 {s.feedback}</div>}</div>
                ))}</div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // CERTIFICATE & PLACEMENT
  // ==========================================================================
  const renderCertification = () => {
    const interviews = st.interviews || [];
    const examReqs = requests.filter((r) => r.type === 'exam_booking');
    const isCertApproved = Boolean(st.courseCompletionApproved);
    const isExamApproved = Boolean(st.examApprovedByTrainer);
    const certReady = isCertApproved && st.syllabusCompleted && d.balance === 0;

    return (
      <div className="space-y-6 pb-12">
        <PageHeader title="Certificate & Placement" sub="Updated by HR and the placement cell (CCCP)" right={<HeaderStat label="Current phase" value={d.placementStage ? `${d.placementStage}. ${PLACEMENT_STAGES[d.placementStage - 1].label}` : 'In training'} />} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">
            <Card>
              <CardTitle icon="📍" title="Placement Pipeline" right={<Pill tone={d.placementStage ? 'indigo' : 'slate'}>{d.placementStage ? `Phase ${d.placementStage} of 7` : 'Starts after training'}</Pill>} />
              {!d.placementStage && <p className="text-xs text-slate-500 mb-4">Your placement journey starts once your trainer completes your syllabus or marks you Ready. Current status: <b>{st.placementStatus || 'In course'}</b>.</p>}
              <div className="space-y-0">
                {PLACEMENT_STAGES.map((s, i) => {
                  const done = s.id < d.placementStage;
                  const cur = s.id === d.placementStage;
                  return (
                    <div key={s.id} className="flex gap-4 relative pb-5 last:pb-0">
                      {i < PLACEMENT_STAGES.length - 1 && <div className={`absolute left-[13px] top-7 bottom-0 w-0.5 ${done ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 z-10 ${done ? 'bg-emerald-500 text-white' : cur ? 'bg-[#483ec7] text-white ring-4 ring-indigo-100' : 'bg-slate-100 text-slate-400'}`}>{done ? '✓' : s.id}</div>
                      <div><div className={`text-sm ${cur ? 'font-black text-slate-900' : done ? 'font-bold text-slate-800' : 'text-slate-400'}`}>{s.label}{cur && <span className="ml-2"><Pill tone="indigo">YOU ARE HERE</Pill></span>}</div><div className="text-[11px] text-slate-500">{s.desc}</div></div>
                    </div>
                  );
                })}
              </div>
            </Card>
            {(interviews.length > 0 || placements.length > 0) && (
              <Card>
                <CardTitle icon="🏢" title="Interviews & Company Mapping" />
                <div className="space-y-2">
                  {placements.map((p) => (
                    <div key={p._id} className="text-xs border border-slate-200 rounded-xl p-3 flex justify-between gap-2"><div><b>{p.company}</b> · {p.role}<div className="text-[10px] text-slate-400">{p.interviewDate ? `Interview ${fmtDate(p.interviewDate)}` : p.interview || ''}</div></div><Pill tone={statusTone(p.status)}>{p.status}</Pill></div>
                  ))}
                  {interviews.map((iv, i) => (
                    <div key={iv.id || i} className="text-xs border border-slate-200 rounded-xl p-3">
                      <div className="flex justify-between gap-2"><b>{iv.company || 'Company'}</b>{iv.status && <Pill tone={statusTone(iv.status)}>{iv.status}</Pill>}</div>
                      {(iv.rounds || []).map((r, j) => <div key={j} className="text-[11px] text-slate-600 mt-1">• {r.name} — {r.status}{r.date ? ` (${r.date})` : ''}</div>)}
                    </div>
                  ))}
                </div>
                {st.placementCompany && <div className="mt-3 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">🎉 {st.placementCompany}{st.placementRole ? ` · ${st.placementRole}` : ''}{st.placementPackage ? ` · ${st.placementPackage}` : ''}</div>}
              </Card>
            )}
          </div>
          <div className="lg:col-span-5 space-y-6">
            <Card>
              <CardTitle
                icon="📜"
                title="Course Completion Certificate"
                right={
                  isCertApproved ? (
                    <Pill tone="green">Trainer Approved ✓</Pill>
                  ) : st.courseCompletionStatus === 'Declined' ? (
                    <Pill tone="red">Declined by Trainer</Pill>
                  ) : (
                    <Pill tone="amber">Awaiting Trainer Approval</Pill>
                  )
                }
              />
              <div className="divide-y divide-slate-100">
                <Row label="Syllabus" value={st.syllabusCompleted ? `Completed ${fmtDate(st.syllabusCompletedAt)}` : 'In progress'} />
                <Row
                  label="Trainer Approval"
                  value={
                    isCertApproved
                      ? `✓ Approved by ${st.courseCompletionApprovedBy || 'Trainer'} (${fmtDate(st.courseCompletionApprovedAt)})`
                      : st.courseCompletionStatus === 'Declined'
                      ? `Declined · ${st.courseCompletionTrainerNotes || 'Needs revision'}`
                      : 'Pending trainer verification (Syllabus, Tests, Readiness)'
                  }
                />
                <Row label="Exam status" value={st.examStatus} />
                <Row label="Certification" value={st.certified} />
                <Row label="Fee clearance" value={d.balance === 0 ? 'Cleared' : `${inr(d.balance)} pending`} />
              </div>

              {st.courseCompletionTrainerNotes && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 mt-3">
                  <strong>Trainer Note:</strong> {st.courseCompletionTrainerNotes}
                </div>
              )}

              <p className={`text-[11px] mt-3 rounded-xl px-3 py-2 border ${
                certReady
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : !isCertApproved
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                {certReady
                  ? '✓ All criteria met: Trainer approved course completion certificate and zero fee balance. Contact branch office for certificate release.'
                  : !isCertApproved
                  ? '⚠️ Policy Requirement: Your respective trainer must verify syllabus completion, assessments, and overall readiness before the course completion certificate can be approved and released.'
                  : 'Course completion certificate approved by trainer. Zero fee balance required for final certificate release.'}
              </p>
            </Card>

            <Card>
              <CardTitle
                icon="🗓"
                title="AAPC Exam Slot"
                sub="Booked by your HR counsellor with the exam cell"
                right={
                  <Btn
                    tone={isExamApproved ? 'light' : 'slate'}
                    disabled={!isExamApproved || examReqs.some((r) => ['Open', 'Scheduled'].includes(r.status))}
                    onClick={() => {
                      if (!isExamApproved) {
                        showToast('⚠ Trainer approval required before requesting an exam slot');
                        return;
                      }
                      openModal(
                        'request',
                        { reqType: 'exam_booking', title: 'Request an AAPC exam slot', subjects: EXAM_OPTIONS.map((x) => `${x} exam`) },
                        { subject: `${EXAM_OPTIONS.includes(shortCourse(st.course)) ? shortCourse(st.course) : 'Other'} exam` }
                      );
                    }}
                  >
                    {!isExamApproved
                      ? 'Trainer Approval Required'
                      : examReqs.some((r) => ['Open', 'Scheduled'].includes(r.status))
                      ? 'Slot Requested'
                      : 'Request slot'}
                  </Btn>
                }
              />
              <div className="divide-y divide-slate-100">
                <Row
                  label="Trainer Exam Approval"
                  value={
                    isExamApproved
                      ? `✓ Approved by ${st.examApprovedBy || 'Trainer'} (${fmtDate(st.examApprovedAt)})`
                      : st.examApprovalStatus === 'Declined'
                      ? `Declined · ${st.examTrainerNotes || 'Needs improvement'}`
                      : 'Pending respective trainer verification'
                  }
                />
                <Row label="Exam status" value={st.examStatus} />
                {st.examDate && <Row label="Exam date" value={fmtDateTime(st.examDate)} />}
              </div>

              {!isExamApproved ? (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 mt-2.5 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>⚠️</span> Trainer Verification Required
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    Per academy rules, students cannot request an AAPC exam slot until their respective trainer has verified syllabus completion, passed assessments, and overall exam readiness.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 mt-2.5 flex items-center gap-2">
                  <span className="font-bold text-sm">✓</span>
                  <span>Trainer exam approval granted. You are eligible to schedule your AAPC / certification exam slot.</span>
                </div>
              )}

              {examReqs.length > 0 && <div className="mt-3 space-y-2">{examReqs.map((r) => <RequestRow key={r._id} r={r} />)}</div>}
            </Card>
            <Card>
              <CardTitle icon="📍" title="Preferred Work Locations" right={<Btn tone="light" onClick={() => openModal('locations', {}, { locations: st.preferredLocations || [] })}>Edit</Btn>} />
              {(st.preferredLocations || []).length ? <div className="flex flex-wrap gap-2">{st.preferredLocations.map((l) => <span key={l} className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">{l}</span>)}</div> : <Empty icon="📍" title="Not set" text="Tell the placement cell where you'd like to work." />}
            </Card>
            {partners.length > 0 && (
              <div className="bg-[#1e1b4b] rounded-3xl p-6 text-white">
                <h3 className="text-base font-bold mb-3">Hiring Partners</h3>
                <div className="grid grid-cols-2 gap-2">
                  {partners.map((p) => <div key={p._id} className="bg-white/5 border border-white/10 rounded-xl p-3"><div className="text-xs font-bold">{p.name}</div><div className="text-[10px] text-indigo-300">{[p.city, p.activeVacancies ? `${p.activeVacancies} openings` : ''].filter(Boolean).join(' · ')}</div></div>)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // PAYMENTS
  // ==========================================================================
  const renderPayments = () => {
    const receipts = st.receipts || [];
    const feeReqs = requests.filter((r) => r.type === 'fee_query' || r.type === 'payment_link');
    return (
      <div className="space-y-6 pb-12">
        <PageHeader title="Payments" sub="Your fee record as maintained by the accounts / HR team" right={<HeaderStat label="Balance" value={d.balance === 0 ? 'Cleared' : inr(d.balance)} />} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Card className="lg:col-span-7">
            <CardTitle icon="💳" title="Fee Ledger" sub={st.course} right={<Pill tone={d.balance === 0 ? 'green' : 'amber'}>{st.feeStatus || (d.balance === 0 ? 'Paid' : 'Pending')}</Pill>} />
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center mb-4">
              <div className="text-xs font-bold text-slate-500 uppercase">Outstanding balance</div>
              <div className={`text-4xl font-black mt-1 ${d.balance === 0 ? 'text-emerald-600' : 'text-slate-900'}`}>{inr(d.balance)}</div>
              {st.nextDueDate && d.balance > 0 && <div className="text-xs text-slate-500 mt-1">Next due {st.nextDueDate}</div>}
            </div>
            <div className="divide-y divide-slate-100">
              <Row label="Course fee" value={d.courseFee ? inr(d.courseFee) : ''} />
              <Row label="Paid so far" value={inr(d.paid)} />
              <Row label="Payment plan" value={st.paymentPlan} />
              <Row label="Payment method" value={st.paymentMethod} />
              {Number(st.examFee) > 0 && <Row label="Exam fee" value={inr(st.examFee)} />}
            </div>
            {d.balance > 0 && (
              <Btn tone="indigo" className="w-full mt-5 py-3.5" onClick={() => openModal('request', { reqType: 'payment_link', title: 'Request payment link', subject: `Payment link for ${inr(d.balance)}` }, { message: `Please send me a payment link for my pending balance of ${inr(d.balance)}.` })}>Request payment link for {inr(d.balance)}</Btn>
            )}
          </Card>
          <div className="lg:col-span-5 space-y-6">
            <Card>
              <CardTitle icon="🧾" title="Receipts" right={<Pill tone="indigo">{receipts.length}</Pill>} />
              {receipts.length === 0 ? <Empty icon="🧾" title="No receipts on record" text="Receipts added by the accounts team appear here." /> : (
                <div className="space-y-2">
                  {receipts.map((r, i) => (
                    <div key={r.id || i} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0"><div className="font-bold text-slate-900 truncate">{r.label || r.title || r.name || `Receipt ${i + 1}`}</div><div className="text-[10px] text-slate-400">{[r.receiptNo || r.id, r.date && fmtDate(r.date), r.mode, r.reference].filter(Boolean).join(' · ')}</div></div>
                      <div className="flex items-center gap-2">
                        {r.amount && <span className="font-bold text-emerald-600">{typeof r.amount === 'number' ? inr(r.amount) : r.amount}</span>}
                        {(r.url || r.fileUrl) && <a href={r.url || r.fileUrl} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-slate-100"><Download className="w-3.5 h-3.5" /></a>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <CardTitle icon="❓" title="Fee Queries" right={<Btn tone="light" onClick={() => openModal('request', { reqType: 'fee_query', title: 'Raise a fee query', subjects: ['Instalment extension', 'Receipt not received', 'Discount / scholarship', 'Payment verification', 'Other'] }, { subject: 'Instalment extension' })}>+ Query</Btn>} />
              {feeReqs.length === 0 ? <Empty icon="💬" title="No queries raised" /> : <div className="space-y-2">{feeReqs.map((r) => <RequestRow key={r._id} r={r} />)}</div>}
            </Card>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // ADMISSION
  // ==========================================================================
  const renderAdmission = () => {
    const checklist = st.checklist || {};
    const labels = { course: 'Course confirmed', branch: 'Branch confirmed', batchMode: 'Batch & mode', paymentStatus: 'Payment status', studentId: 'Student ID issued', language: 'Language preference', education: 'Education details', careerGoal: 'Career goal', trainerNote: 'Trainer handover note', documents: 'Documents submitted' };
    const keys = Object.keys(labels);
    const done = keys.filter((k) => checklist[k]).length;
    return (
      <div className="space-y-6 pb-12">
        <PageHeader title="Admission Details" sub="Your enrolment record held by HR" right={<HeaderStat label="Onboarding" value={`${done}/${keys.length}`} />} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Card className="lg:col-span-7">
            <CardTitle icon="🎓" title="Enrolment Record" right={<Pill tone="green">Admitted</Pill>} />
            <div className="divide-y divide-slate-100">
              <Row label="Student ID" value={st.studentId} mono />
              <Row label="Course" value={st.course} />
              <Row label="Mode" value={st.mode} />
              <Row label="Branch" value={st.location} />
              <Row label="Batch" value={st.batchName} />
              <Row label="Batch start" value={st.batchDate} />
              <Row label="Admitted on" value={fmtDate(st.createdAt)} />
              <Row label="HR counsellor" value={st.hrName} />
              <Row label="Source" value={st.source} />
              <Row label="Qualification" value={[st.qualification, st.qualTag].filter(Boolean).join(' · ')} />
              <Row label="College / Company" value={st.collegeCompany} />
            </div>
          </Card>
          <div className="lg:col-span-5 space-y-6">
            <Card>
              <CardTitle icon="📁" title="Onboarding Checklist" right={<Pill tone={done === keys.length ? 'green' : 'amber'}>{done}/{keys.length}</Pill>} />
              <div className="divide-y divide-slate-100">
                {keys.map((k) => <div key={k} className="py-2.5 flex justify-between text-xs"><span className="text-slate-600">{labels[k]}</span><span className={`font-bold ${checklist[k] ? 'text-emerald-600' : 'text-slate-400'}`}>{checklist[k] ? '✓ Done' : 'Pending'}</span></div>)}
              </div>
            </Card>
            <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-2 text-xs">
              <div className="flex justify-between"><h3 className="text-base font-bold">Fee snapshot</h3><button onClick={() => setActiveNav('payments')} className="font-bold text-teal-300 hover:underline cursor-pointer">Ledger ›</button></div>
              <div className="flex justify-between"><span className="text-slate-300">Course fee</span><b>{d.courseFee ? inr(d.courseFee) : '—'}</b></div>
              <div className="flex justify-between"><span className="text-slate-300">Paid</span><b className="text-emerald-400">{inr(d.paid)}</b></div>
              <div className="flex justify-between"><span className="text-slate-300">Pending</span><b className={d.balance ? 'text-amber-300' : 'text-emerald-400'}>{inr(d.balance)}</b></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // HELP
  // ==========================================================================
  const renderHelp = () => {
    const breakRequests = requests.filter((r) => r.type === 'break_request');

    return (
      <div className="space-y-6 pb-12">
        <PageHeader title="Help & Support" sub="Academic doubts go to your trainer; official requests and operations to the branch team" right={<HeaderStat label="Open tickets" value={tickets.filter((t) => !['resolved', 'closed'].includes(t.status)).length} />} />

        {/* ------------------------------------------------------------------ */}
        {/* STUDENT BREAK REQUEST AND PRIOR APPROVAL                           */}
        {/* Policy: Students planning a break must submit a request with a     */}
        {/* valid reason & supporting documentation. Prior approval required.  */}
        {/* ------------------------------------------------------------------ */}
        <Card className="border-2 border-indigo-100/90 shadow-[0_4px_24px_rgba(72,62,199,0.06)]">
          <CardTitle
            icon="⏸️"
            title="Student Break Request &amp; Approval"
            sub="Academy Policy: Students planning a break must submit a request with a valid reason and supporting documentation. Prior approval is required."
            right={
              <Btn onClick={() => openModal('break_request', {}, { reasonCategory: BREAK_REASON_CATEGORIES[0] })}>
                + Apply for Break
              </Btn>
            }
          />

          {/* Current Break Status Callout */}
          <div className="mb-5">
            {st.breakStatus === 'approved' ? (
              <div className="p-4 bg-emerald-50/90 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">🌴</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-emerald-950 text-sm">Official Break Approved (Prior Approval Granted)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Status: On Hold
                      </span>
                    </div>
                    <p className="text-xs text-emerald-900 mt-1 font-medium">
                      Duration: <strong>{fmtDate(st.breakStartDate)}</strong> to <strong>{fmtDate(st.breakEndDate)}</strong>
                      {st.breakReason && <> · Reason: <em>{st.breakReason}</em></>}
                      {st.breakApprovedBy && <> · Approved by: <strong>{st.breakApprovedBy}</strong></>}
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Your attendance and batch schedules are placed on official hold without negative penalties. Please contact your branch HR on your return date to resume classes.
                    </p>
                  </div>
                </div>
                <Pill tone="green">Approved</Pill>
              </div>
            ) : st.breakStatus === 'pending_approval' ? (
              <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">⏳</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-amber-950 text-sm">Break Request Pending Prior Approval</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                        Under Review
                      </span>
                    </div>
                    <p className="text-xs text-amber-900 mt-1 font-medium">
                      Requested: <strong>{fmtDate(st.breakStartDate)}</strong> to <strong>{fmtDate(st.breakEndDate)}</strong>
                      {st.breakReason && <> · Reason: <em>{st.breakReason}</em></>}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Your supporting documentation has been forwarded to the HR Counsellor / Operations authority for review. <strong>Please continue attending classes until prior approval is officially granted.</strong>
                    </p>
                  </div>
                </div>
                <Pill tone="amber">Pending Approval</Pill>
              </div>
            ) : (
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-3 text-xs">
                <Info className="w-5 h-5 text-[#483ec7] flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-600 leading-relaxed">
                  <strong>Academy Break Policy:</strong> Students planning a break must submit a request with a valid reason and supporting documentation. <strong>Prior approval from the relevant authority is required</strong> before taking leave. Unapproved pauses disrupt syllabus progress and trigger absence alerts.
                </div>
              </div>
            )}
          </div>

          {/* List of Submitted Break Requests */}
          <div>
            <div className="text-xs font-bold text-slate-700 mb-2.5 flex items-center justify-between">
              <span>My Break Requests</span>
              <span className="text-[11px] font-normal text-slate-400">{breakRequests.length} submitted</span>
            </div>

            {breakRequests.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                No break requests submitted yet. Use "+ Apply for Break" if you need to schedule an official leave.
              </div>
            ) : (
              <div className="space-y-2.5">
                {breakRequests.map((r) => {
                  const isApproved = r.status === 'Resolved';
                  const isDeclined = r.status === 'Declined';
                  return (
                    <div key={r._id} className="border border-slate-200 rounded-2xl p-3.5 text-xs bg-white hover:border-indigo-200 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{isApproved ? '🌴' : isDeclined ? '❌' : '⏳'}</span>
                          <div>
                            <span className="font-extrabold text-slate-900">
                              {r.details?.reasonCategory || r.reasonCategory || r.subject || 'Student Break Request'}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-2">
                              #{String(r._id).slice(-6).toUpperCase()} · Submitted {fmtDate(r.createdAt)}
                            </span>
                          </div>
                        </div>
                        <Pill tone={isApproved ? 'green' : isDeclined ? 'red' : 'amber'}>
                          {isApproved ? 'Prior Approval Granted' : isDeclined ? 'Declined' : 'Pending Prior Approval'}
                        </Pill>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5 text-[11px]">
                        <div>
                          <span className="text-slate-400 font-medium">Leave Dates: </span>
                          <span className="font-bold text-slate-800">
                            {fmtDate(r.startDate || r.preferredDate || r.details?.startDate)} to {fmtDate(r.endDate || r.details?.endDate || r.details?.returnDate)}
                          </span>
                          {r.details?.durationDays ? (
                            <span className="ml-1 text-indigo-600 font-semibold">({r.details.durationDays} days)</span>
                          ) : null}
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium">Reviewing Authority: </span>
                          <span className="font-semibold text-slate-700">{r.hrName ? `HR ${r.hrName}` : 'Branch HR / Operations'}</span>
                        </div>
                      </div>

                      {r.message && (
                        <p className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <strong className="text-slate-700">Reason / Details: </strong>
                          {r.message}
                        </p>
                      )}

                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                        {(r.documentUrl || r.documentName || r.details?.documentName) ? (
                          <a
                            href={studentRequestDocumentUrl(r._id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-bold text-[#483ec7] hover:underline bg-indigo-50/70 border border-indigo-100 px-2.5 py-1 rounded-lg"
                          >
                            <span>📎</span>
                            <span>View Supporting Document</span>
                            <span className="text-[10px] font-normal text-slate-500">
                              ({r.documentName || r.details?.documentName || 'Document'})
                            </span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">No document attached</span>
                        )}

                        {r.response && (
                          <div className="text-[11px] text-slate-700 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                            <strong>Decision Note:</strong> {r.response}
                            {r.respondedBy && <span className="text-slate-400 text-[10px]"> — {r.respondedBy}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Card className="lg:col-span-6">
          <CardTitle icon="💭" title="Ask your trainer" sub={trainer ? `Goes to ${trainer.trainerName} · 24h SLA` : 'Routed once a trainer is allocated'} />
          <form onSubmit={(e) => { e.preventDefault(); if (quickDoubt.trim()) submitDoubt(quickDoubt.trim()).then((ok) => ok && setQuickDoubt('')); }} className="space-y-3">
            <textarea rows={4} value={quickDoubt} onChange={(e) => setQuickDoubt(e.target.value)} placeholder="Explain your doubt — include code numbers or the case snippet…" className={inputCls} />
            <Btn type="submit" disabled={busy || !quickDoubt.trim()} className="w-full"><Send className="w-4 h-4" />Send doubt</Btn>
          </form>
          <div className="text-xs text-slate-500 mt-3">{answeredDoubts.length} answered · {doubts.length - answeredDoubts.length} awaiting reply · <button onClick={() => setActiveNav('trainers')} className="text-[#483ec7] font-bold cursor-pointer">view all</button></div>
        </Card>
        <Card className="lg:col-span-6">
          <CardTitle icon="🏢" title="Branch support tickets" sub={[st.location, st.hrName && `HR: ${st.hrName}`].filter(Boolean).join(' · ')} right={<Btn onClick={() => openModal('ticket', {}, { category: TICKET_CATEGORIES[0] })}>+ Ticket</Btn>} />
          
          {/* One-time Batch Conversion Ticket Callout */}
          <div className="mb-4">
            {hasBatchConversionTicket ? (
              <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base flex-shrink-0">🔄</span>
                  <div className="min-w-0">
                    <div className="font-bold text-amber-950 flex items-center gap-2 flex-wrap">
                      <span>Batch Conversion Ticket</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
                        1-Time Request Used
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 mt-0.5 truncate">
                      Repeat requests not permitted per policy{existingBatchConversionTicket ? ` · Status: ${existingBatchConversionTicket.status}` : ''}
                    </p>
                  </div>
                </div>
                {existingBatchConversionTicket && (
                  <Pill tone={statusTone(existingBatchConversionTicket.status)}>{existingBatchConversionTicket.status}</Pill>
                )}
              </div>
            ) : (
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base flex-shrink-0">🔄</span>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                      <span>Batch Conversion Ticket</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-[#483ec7] border border-indigo-200 whitespace-nowrap">
                        1 Allowed
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      Need to shift batch timing or schedule? Students may raise this once.
                    </p>
                  </div>
                </div>
                <Btn
                  tone="light"
                  onClick={() => openModal('ticket', {}, { category: 'Batch Conversion', subject: 'Request for Batch Conversion' })}
                  className="whitespace-nowrap text-xs cursor-pointer flex-shrink-0"
                >
                  Convert Batch
                </Btn>
              </div>
            )}
          </div>

          {tickets.length === 0 ? <Empty icon="🎫" title="No tickets raised" /> : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <div key={t._id} className="border border-slate-200 rounded-xl p-3 text-xs">
                  <div className="flex justify-between gap-2">
                    <b className="truncate flex items-center gap-1.5">
                      {/batch\s*conversion/i.test(t.type || t.category || t.title || '') && <span title="Batch Conversion Ticket">🔄</span>}
                      {t.title}
                    </b>
                    <Pill tone={statusTone(t.status === 'open' ? 'open' : t.status)}>{t.status}</Pill>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">#{String(t._id).slice(-6).toUpperCase()} · {t.type} · {fmtDate(t.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

  // ==========================================================================
  // PROFILE
  // ==========================================================================
  const renderProfile = () => {
    const skills = st.skills || [];
    const certs = st.certificates || [];
    const edits = requests.filter((r) => r.type === 'profile_edit');
    const mask = (v, re, rep) => (v ? String(v).replace(re, rep) : '');
    return (
      <div className="space-y-6 pb-12">
        <div className="bg-gradient-to-r from-[#1e1b4b] via-[#312e81] to-[#1e1b4b] rounded-3xl p-6 sm:p-7 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 text-2xl font-black flex items-center justify-center">{d.initials}</div>
            <div><h2 className="text-2xl font-black">{d.name}</h2><p className="text-xs text-indigo-200">{st.course}</p><div className="flex gap-2 mt-2 text-xs"><span className="px-3 py-1 rounded-lg bg-white/10 font-mono font-bold">{st.studentId}</span>{st.location && <span className="px-3 py-1 rounded-lg bg-white/10 text-indigo-200">{st.location}</span>}</div></div>
          </div>
          <Btn tone="light" onClick={() => openModal('request', { reqType: 'profile_edit', title: 'Request a contact update', subject: 'Contact details update' })}>Request profile edit</Btn>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">
            <Card>
              <CardTitle title="Contact record" sub="Changes are verified by your HR counsellor" />
              <div className="divide-y divide-slate-100">
                <Row label="Phone" value={mask(st.phone, /(\d{2})\d{6}(\d{2})$/, '$1••••••$2')} mono />
                <Row label="WhatsApp" value={mask(st.whatsappNumber, /(\d{2})\d{6}(\d{2})$/, '$1••••••$2')} mono />
                <Row label="Email" value={mask(st.email, /^(.{3}).*(@.*)$/, '$1••••$2')} />
                <Row label="Date of birth" value={st.dob} />
              </div>
              {edits.length > 0 && <div className="mt-4 space-y-2">{edits.map((r) => <RequestRow key={r._id} r={r} />)}</div>}
            </Card>
            <Card>
              <CardTitle
                title="Academic & batch"
                right={
                  hasBatchConversionTicket ? (
                    <Pill tone="amber">Batch Conversion: 1x Used</Pill>
                  ) : (
                    <button
                      onClick={() => openModal('ticket', {}, { category: 'Batch Conversion', subject: 'Request for Batch Conversion' })}
                      className="text-xs font-bold text-[#483ec7] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      Convert Batch (1x)
                    </button>
                  )
                }
              />
              <div className="divide-y divide-slate-100">
                <Row label="Batch" value={st.batchName} />
                <Row label="Timing" value={st.batchTiming} />
                <Row label="Mode" value={st.mode} />
                <Row label="Trainer" value={st.trainerName} />
                {st.anatomyCompleted && (
                  <Row
                    label="Anatomy Foundation"
                    value={`✓ Completed (${fmtDate(st.anatomyCompletedAt) || 'Verified'}) · Progress Preserved`}
                  />
                )}
                {st.codingBatchEnrolledAt && (
                  <Row
                    label="Medical Coding Track"
                    value={`Active since ${fmtDate(st.codingBatchEnrolledAt)} · Module 3+`}
                  />
                )}
                <Row
                  label="Batch Conversion"
                  value={
                    hasBatchConversionTicket
                      ? `Used (1-time request raised · ${existingBatchConversionTicket?.status || 'Logged'})`
                      : 'Available (1 request permitted during course)'
                  }
                />
              </div>
            </Card>
          </div>
          <div className="lg:col-span-5 space-y-6">
            <Card>
              <CardTitle icon="📜" title="Other Certificates" right={<Btn tone="light" onClick={() => openModal('certificate', {}, { year: String(new Date().getFullYear()) })}>+ Add</Btn>} />
              {certs.length === 0 ? <Empty icon="📜" title="None added" text="Degrees, internships or other certifications." /> : (
                <div className="space-y-2">
                  {certs.map((c) => (
                    <div key={c.id || c.name} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                      <div className="min-w-0"><div className="text-xs font-bold text-slate-900 truncate">{c.name}</div><div className="text-[10px] text-slate-400">{[c.issuer, c.year].filter(Boolean).join(' · ')}</div></div>
                      <button onClick={() => saveProfile({ certificates: certs.filter((x) => x !== c) }, `Removed ${c.name}`)} className="p-1 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <CardTitle icon="🌟" title="Skills" right={<Pill tone="green">{skills.length}</Pill>} />
              <div className="flex flex-wrap gap-2 mb-4">
                {skills.length === 0 && <span className="text-xs text-slate-400">No skills added yet.</span>}
                {skills.map((s) => (
                  <span key={s} className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold flex items-center gap-1.5">{s}<button onClick={() => saveProfile({ skills: skills.filter((x) => x !== s) })} className="text-teal-500 hover:text-rose-600 cursor-pointer">✕</button></span>
                ))}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); const v = newSkill.trim(); if (!v) return; if (skills.some((s) => s.toLowerCase() === v.toLowerCase())) { showToast('Already in your list'); return; } saveProfile({ skills: [...skills, v] }, `Added ${v}`).then((ok) => ok && setNewSkill('')); }} className="flex gap-2">
                <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Add a skill (e.g. MS Excel)" className={inputCls} />
                <Btn type="submit" disabled={busy}>+ Add</Btn>
              </form>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // MODALS
  // ==========================================================================
  const renderModal = () => {
    if (!modal) return null;
    const footer = (label, onClick, disabled) => (
      <div className="flex justify-end gap-2 mt-5">
        <Btn tone="light" onClick={closeModal}>Cancel</Btn>
        <Btn onClick={onClick} disabled={busy || disabled}>{busy ? 'Saving…' : label}</Btn>
      </div>
    );

    switch (modal.type) {
      case 'doubt':
        return (
          <Modal title={trainer ? `Ask ${trainer.trainerName}` : 'Ask a doubt'} sub={trainer ? 'Replies appear under My Trainer' : 'Will be routed once a trainer is allocated'} onClose={closeModal}>
            <div className="space-y-3">
              <Field label="Topic"><input value={form.topic ?? st.syllabusModule ?? ''} onChange={setF('topic')} placeholder="e.g. CPT modifiers" className={inputCls} /></Field>
              <Field label="Your question"><textarea rows={4} value={form.question || ''} onChange={setF('question')} placeholder="Describe your doubt or paste the question…" className={inputCls} /></Field>
            </div>
            {footer('Send doubt', () => submitDoubt(form.question.trim(), form.topic ?? st.syllabusModule), !form.question?.trim())}
          </Modal>
        );

      case 'submit': {
        const typeLabel = { assignment: 'Assignment', resume: 'Resume', video_intro: 'Video introduction', improvement_task: 'Improvement task' }[form.type] || 'Work';
        return (
          <Modal title={`Submit ${typeLabel.toLowerCase()}`} sub={trainer ? `Sent to ${trainer.trainerName} for review` : 'Saved to your record'} onClose={closeModal}>
            <div className="space-y-3">
              <Field label="Title"><input value={form.title || ''} onChange={setF('title')} className={inputCls} /></Field>
              {form.type === 'assignment' && !form.materialId && materials.length > 0 && (
                <Field label="For material (optional)">
                  <select value={form.materialId || ''} onChange={setF('materialId')} className={inputCls}>
                    <option value="">— none —</option>
                    {materials.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                  </select>
                </Field>
              )}
              {form.type === 'video_intro'
                ? <Field label="Video link (Google Drive / YouTube unlisted)"><input value={form.link || ''} onChange={setF('link')} placeholder="https://" className={inputCls} /></Field>
                : null}
              <Field label={form.type === 'video_intro' ? 'Or upload the video (max 12 MB)' : 'File (PDF, DOCX, XLSX, image — max 12 MB)'}>
                <input type="file" onChange={setF('file')} accept={form.type === 'video_intro' ? 'video/*' : undefined} className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-[#483ec7] file:font-bold" />
              </Field>
              <Field label="Note to trainer (optional)"><textarea rows={2} value={form.note || ''} onChange={setF('note')} className={inputCls} /></Field>
            </div>
            {footer('Submit', submitWork, !form.file && !form.link)}
          </Modal>
        );
      }

      case 'request': {
        const toTrainer = modal.reqType === 'mock_interview' || modal.reqType === 'consultation';
        const needsDate = toTrainer || modal.reqType === 'exam_booking';
        const isMock = modal.reqType === 'mock_interview';
        const attemptNum = modal.attemptNumber || 1;
        return (
          <Modal
            title={modal.title}
            sub={isMock
              ? `Attempt ${attemptNum} of 2 · Evaluated by ${trainer?.trainerName || 'your trainer'} to ${attemptNum === 1 ? 'assess baseline interview readiness' : 'verify post-feedback readiness improvement'}`
              : toTrainer
              ? `Goes to ${trainer?.trainerName || 'your trainer'}`
              : modal.reqType === 'exam_booking'
              ? `Goes to ${st.hrName || 'your HR counsellor'} and the exam cell`
              : `Goes to ${st.hrName || 'your HR counsellor'}`}
            onClose={closeModal}
          >
            <div className="space-y-3">
              {isMock && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-900">
                  <div className="font-bold flex items-center justify-between">
                    <span>Mock Interview — Attempt {attemptNum} of 2</span>
                    <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-mono font-bold">
                      {attemptNum === 1 ? 'Baseline Assessment' : 'Readiness Improvement'}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-indigo-700">
                    {attemptNum === 1
                      ? 'Your trainer will conduct a comprehensive round to evaluate medical coding knowledge, presentation clarity, and interview preparedness.'
                      : 'Focus on demonstrating improvements on the weak spots and recommendations identified during Attempt 1.'}
                  </p>
                </div>
              )}
              {modal.subjects && (
                <Field label="Subject"><select value={form.subject || ''} onChange={setF('subject')} className={inputCls}>{modal.subjects.map((s) => <option key={s}>{s}</option>)}</select></Field>
              )}
              {needsDate && <Field label={modal.reqType === 'exam_booking' ? 'Preferred exam date' : 'Preferred date & time'}><input type="datetime-local" value={form.preferredDate || ''} onChange={setF('preferredDate')} className={inputCls} /></Field>}
              {isMock && attemptNum === 2 && (
                <Field label="Key improvements & topics prepared since Attempt 1">
                  <input
                    type="text"
                    value={form.improvements || ''}
                    onChange={setF('improvements')}
                    placeholder="e.g. Revised ICD-10 guidelines, practiced scenario questions..."
                    className={inputCls}
                  />
                </Field>
              )}
              <Field label={modal.reqType === 'profile_edit' ? 'What should be changed? (new phone / email / reason)' : modal.reqType === 'exam_booking' ? 'Online or test centre? Any other details' : 'Message'}>
                <textarea rows={3} value={form.message || ''} onChange={setF('message')} placeholder={isMock ? 'Mention any specific topics or questions you would like to practice...' : ''} className={inputCls} />
              </Field>
            </div>
            {footer('Send request', () => submitRequest(modal.reqType, form.subject || modal.subject || modal.title, { details: { attemptNumber: attemptNum, improvements: form.improvements || '' } }), !form.message?.trim() && !form.preferredDate)}
          </Modal>
        );
      }

      case 'referral':
        return (
          <Modal title="Refer a friend" sub={`Earn ${REFERRAL_REWARD.toLocaleString('en-IN')} points when they're admitted`} onClose={closeModal}>
            <div className="space-y-3">
              <Field label="Friend's full name *"><input value={form.name || ''} onChange={setF('name')} className={inputCls} /></Field>
              <Field label="Mobile / WhatsApp *"><input type="tel" value={form.phone || ''} onChange={setF('phone')} placeholder="10-digit mobile" className={inputCls} /></Field>
              <Field label="Interested course">
                <select value={form.course || ''} onChange={setF('course')} className={inputCls}>
                  <option value={st.course}>{st.course}</option>
                  {COURSE_CATEGORIES.map((cat) => (
                    <optgroup key={cat.category} label={cat.title}>
                      {cat.courses.map((c) => <option key={c.code} value={`${c.code} — ${c.name}`}>{c.code} — {c.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <p className="text-[11px] text-slate-500">{st.hrName ? `${st.hrName} will contact them.` : 'The admissions team will contact them.'}</p>
            </div>
            {footer('Submit referral', () => run(() => createStudentReferral(st.studentId, { name: form.name, phone: form.phone, course: form.course }), `✓ Referral sent for ${form.name}`), !form.name?.trim() || !form.phone?.trim())}
          </Modal>
        );

      case 'redeem': {
        const available = Number(st.rewardPoints || 0) - d.pendingPoints;
        const pts = Number(form.points || 0);
        return (
          <Modal title="Redeem reward points" sub="HR approves and processes each redemption" onClose={closeModal}>
            <div className="bg-gradient-to-br from-[#0b3842] to-[#062126] text-white rounded-2xl p-4 flex justify-between"><div><div className="text-[11px] text-teal-300">Available</div><div className="text-2xl font-bold">{available}</div></div><div className="text-right"><div className="text-[11px] text-teal-300">Cash value</div><div className="text-2xl font-bold text-amber-400">{inr(available)}</div></div></div>
            <div className="space-y-3 mt-4">
              <Field label="Points to redeem"><input type="number" min={1} max={available} value={form.points || ''} onChange={setF('points')} className={inputCls} /></Field>
              <Field label="Redeem as">
                <select value={form.option || 'cash'} onChange={setF('option')} className={inputCls}>
                  <option value="cash">Cash transfer (UPI / bank)</option>
                  {d.balance > 0 && <option value="fee">Fee credit against {inr(d.balance)} balance</option>}
                </select>
              </Field>
              {form.option !== 'fee' && <Field label="UPI ID"><input value={form.upi || ''} onChange={setF('upi')} placeholder="name@bank" className={inputCls} /></Field>}
            </div>
            {footer('Submit request', () => run(() => createStudentRequest(st.studentId, { type: 'redeem_points', subject: `Redeem ${pts} points as ${form.option === 'fee' ? 'fee credit' : 'cash'}`, message: form.option === 'fee' ? 'Apply as fee credit' : `UPI: ${form.upi || ''}`, details: { points: pts, option: form.option || 'cash', upi: form.upi || '' } }), '✓ Redemption request sent to HR'), !pts || pts > available || (form.option !== 'fee' && !form.upi?.trim()))}
          </Modal>
        );
      }

      case 'ticket': {
        const isBatchConv = form.category === 'Batch Conversion';
        const isSubmitDisabled = !form.subject?.trim() || (isBatchConv && hasBatchConversionTicket);

        return (
          <Modal title="Raise a support ticket" sub={`${st.location || 'Branch'} operations desk`} onClose={closeModal}>
            <div className="space-y-3">
              <Field label="Category">
                <select
                  value={form.category || TICKET_CATEGORIES[0]}
                  onChange={setF('category')}
                  className={inputCls}
                >
                  {TICKET_CATEGORIES.map((c) => (
                    <option key={c} value={c} disabled={c === 'Batch Conversion' && hasBatchConversionTicket}>
                      {c === 'Batch Conversion' && hasBatchConversionTicket ? `${c} (1-time request already used)` : c}
                    </option>
                  ))}
                </select>
              </Field>

              {isBatchConv && hasBatchConversionTicket && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-amber-950">One-Time Policy Limit Reached</p>
                    <p className="text-amber-800 leading-relaxed">
                      You have already submitted a Batch Conversion ticket{existingBatchConversionTicket ? ` (#${String(existingBatchConversionTicket._id).slice(-6).toUpperCase()} · Status: ${existingBatchConversionTicket.status})` : ''}.
                      As per academy policy, students are permitted to raise a batch conversion ticket <strong>only once</strong>. Repeat batch conversion ticket requests are not permitted.
                    </p>
                  </div>
                </div>
              )}

              {isBatchConv && !hasBatchConversionTicket && (
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-900 flex items-start gap-3 shadow-2xs">
                  <Info className="w-5 h-5 text-[#483ec7] flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-indigo-950">Important Policy Notice: 1-Time Request Only</p>
                    <p className="text-indigo-800 leading-relaxed">
                      Students are permitted to raise a batch conversion ticket <strong>only once</strong> throughout their course duration. Please specify your current batch, preferred target batch timing, and reason clearly in the details below.
                    </p>
                  </div>
                </div>
              )}

              <Field label="Subject">
                <input
                  value={form.subject || ''}
                  onChange={setF('subject')}
                  placeholder={isBatchConv ? 'e.g. Request to convert from Morning to Evening batch' : ''}
                  className={inputCls}
                />
              </Field>
              <Field label="Details">
                <textarea
                  rows={4}
                  value={form.description || ''}
                  onChange={setF('description')}
                  placeholder={isBatchConv ? 'Please state your current batch name, desired new batch/timing, and reason for conversion…' : ''}
                  className={inputCls}
                />
              </Field>
            </div>
            {footer(
              isBatchConv && hasBatchConversionTicket ? '1-Time Limit Reached' : 'Submit ticket',
              () => run(() => createEscalation({
                title: form.subject || `${form.category} — ${st.name}`,
                description: form.description || '',
                type: form.category,
                category: form.category,
                studentId: st.studentId,
                priority: isBatchConv ? 'high' : 'normal',
                departmentCode: /fee/i.test(form.category) ? 'FIN' : /class|batch|attendance|lms/i.test(form.category) ? 'ACAD' : 'ADM',
                branchName: st.location || '',
                raisedBy: `${st.name} (${st.studentId})`
              }), '✓ Ticket raised'),
              isSubmitDisabled
            )}
          </Modal>
        );
      }

      case 'break_request': {
        const reason = form.reasonCategory || BREAK_REASON_CATEGORIES[0];
        const startDate = form.startDate || '';
        const endDate = form.endDate || '';
        const explanation = form.explanation || '';
        const file = form.file || null;

        let durationDays = 0;
        if (startDate && endDate) {
          const s = new Date(startDate);
          const e = new Date(endDate);
          if (!isNaN(s) && !isNaN(e) && e >= s) {
            durationDays = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
          }
        }

        const isDatesInvalid = Boolean(startDate && endDate && new Date(endDate) < new Date(startDate));
        const isValid = Boolean(
          reason &&
          startDate &&
          endDate &&
          !isDatesInvalid &&
          explanation.trim().length >= 5 &&
          file
        );

        const handleSubmit = async () => {
          if (!isValid) return;
          if (file && file.size > 12 * 1024 * 1024) {
            showToast('⚠ File size exceeds 12 MB limit');
            return;
          }
          await run(async () => {
            let documentData = '';
            if (file) {
              documentData = await fileToBase64(file);
            }
            await createStudentRequest(st.studentId, {
              type: 'break_request',
              subject: `Student Break Request: ${reason} (${startDate} to ${endDate})`,
              message: explanation.trim(),
              preferredDate: startDate,
              details: {
                reasonCategory: reason,
                explanation: explanation.trim(),
                startDate,
                endDate,
                returnDate: endDate,
                durationDays,
                documentName: file?.name || '',
                documentMimeType: file?.type || '',
                documentData
              }
            });
          }, '✓ Break request submitted for prior approval');
        };

        return (
          <Modal title="Apply for Student Break" sub="Prior approval from relevant authority is mandatory per academy policy" onClose={closeModal}>
            <div className="space-y-4">
              {/* Policy Callout */}
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl text-xs text-indigo-950 flex items-start gap-3 shadow-2xs">
                <Info className="w-5 h-5 text-[#483ec7] flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-extrabold text-indigo-950">Student Break Policy &amp; Prior Approval</p>
                  <p className="text-indigo-800 leading-relaxed text-[11px]">
                    Students planning a break must submit a request with a valid reason and supporting documentation.
                    <strong> Prior approval from the relevant authority is strictly required</strong> before any break begins.
                    Once approved, your student status will be placed on official hold to protect your attendance and training schedule.
                  </p>
                </div>
              </div>

              {/* Reason Category */}
              <Field label="Reason Category *">
                <select
                  value={form.reasonCategory || BREAK_REASON_CATEGORIES[0]}
                  onChange={setF('reasonCategory')}
                  className={inputCls}
                >
                  {BREAK_REASON_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Break Start Date *">
                  <input
                    type="date"
                    value={form.startDate || ''}
                    onChange={setF('startDate')}
                    className={inputCls}
                  />
                </Field>
                <Field label="Expected Return Date *">
                  <input
                    type="date"
                    min={form.startDate || ''}
                    value={form.endDate || ''}
                    onChange={setF('endDate')}
                    className={inputCls}
                  />
                </Field>
              </div>

              {isDatesInvalid && (
                <div className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-2.5 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Expected return date cannot be before the break start date.
                </div>
              )}

              {durationDays > 0 && !isDatesInvalid && (
                <div className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between">
                  <span>Planned Break Duration:</span>
                  <span className="font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                    {durationDays} {durationDays === 1 ? 'day' : 'days'}
                  </span>
                </div>
              )}

              {/* Detailed Reason */}
              <Field label="Valid Reason & Detailed Explanation * (minimum 5 characters)">
                <textarea
                  rows={3}
                  value={form.explanation || ''}
                  onChange={setF('explanation')}
                  placeholder="Provide specific details regarding the necessity of this break..."
                  className={inputCls}
                />
              </Field>

              {/* Supporting Documentation */}
              <Field label="Supporting Documentation * (Mandatory)">
                <div className="space-y-2">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={setF('file')}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-[#483ec7] hover:file:bg-indigo-100 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500">
                    Upload medical certificate, university exam timetable, employer letter, or official proof (PDF, JPG, PNG, DOC - max 12 MB).
                  </p>
                  {form.file ? (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                      <span className="truncate font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        {form.file.name}
                      </span>
                      <span className="text-[10px] text-emerald-700 ml-2 font-mono flex-shrink-0">
                        {fmtSize(form.file.size)}
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      Supporting documentation is strictly required to submit a break request.
                    </div>
                  )}
                </div>
              </Field>
            </div>
            {footer(
              'Submit Break Request for Prior Approval',
              handleSubmit,
              !isValid
            )}
          </Modal>
        );
      }

      case 'ratingHistory':
        return (
          <Modal title="Weekly Star Rating History & Trend" sub="Week-over-week performance evaluation across the 4 core pillars" onClose={closeModal}>
            <div className="space-y-3.5">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between text-xs text-indigo-950">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⭐</span>
                  <div>
                    <div className="font-extrabold">Current Week: {Number(weeklyRating.stars || 0).toFixed(1)} / 5.0 ★</div>
                    <div className="text-[10.5px] text-indigo-700">{weeklyRating.tier} · {weeklyRating.weekLabel}</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-300">
                  Active Rating
                </span>
              </div>

              {weeklyRating.history?.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-700">Archived Weekly Audits ({weeklyRating.history.length})</div>
                  {weeklyRating.history.map((h, idx) => (
                    <div key={idx} className="p-3.5 border border-slate-200 rounded-2xl bg-white space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-slate-900">{h.weekLabel || `Week ${h.weekNumber}`}</span>
                          <span className="text-[10px] text-slate-400 ml-2">{fmtDate(h.evaluatedAt)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-amber-600">{Number(h.stars || 0).toFixed(1)}★</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">{h.tier || 'Rated'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] pt-1">
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-center">
                          <span className="text-slate-400 block font-medium">Attendance</span>
                          <span className="font-bold text-slate-800">{h.attendanceScore ? `${Number(h.attendanceScore).toFixed(1)}★` : '—'}</span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-center">
                          <span className="text-slate-400 block font-medium">Assessments</span>
                          <span className="font-bold text-slate-800">{h.assessmentScore ? `${Number(h.assessmentScore).toFixed(1)}★` : '—'}</span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-center">
                          <span className="text-slate-400 block font-medium">Syllabus</span>
                          <span className="font-bold text-slate-800">{h.syllabusScore ? `${Number(h.syllabusScore).toFixed(1)}★` : '—'}</span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-center">
                          <span className="text-slate-400 block font-medium">Participation</span>
                          <span className="font-bold text-slate-800">{h.participationScore ? `${Number(h.participationScore).toFixed(1)}★` : '—'}</span>
                        </div>
                      </div>
                      {h.feedback && (
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <strong>Note:</strong> {h.feedback}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  No previous weekly audit archives yet. Weekly evaluations are archived every Monday automatically.
                </div>
              )}
            </div>
          </Modal>
        );

      case 'certificate':
        return (
          <Modal title="Add a certificate" onClose={closeModal}>
            <div className="space-y-3">
              <Field label="Certificate name *"><input value={form.name || ''} onChange={setF('name')} className={inputCls} /></Field>
              <Field label="Issued by"><input value={form.issuer || ''} onChange={setF('issuer')} className={inputCls} /></Field>
              <Field label="Year"><input value={form.year || ''} onChange={setF('year')} className={inputCls} /></Field>
            </div>
            {footer('Add', () => saveProfile({ certificates: [...(st.certificates || []), { name: form.name, issuer: form.issuer, year: form.year }] }, `✓ Added ${form.name}`), !form.name?.trim())}
          </Modal>
        );

      case 'locations': {
        const sel = form.locations || [];
        const toggle = (l) => setForm((f) => ({ ...f, locations: sel.includes(l) ? sel.filter((x) => x !== l) : [...sel, l] }));
        return (
          <Modal title="Preferred work locations" sub="Shared with the placement cell" onClose={closeModal}>
            <div className="flex flex-wrap gap-2">
              {[...new Set([...LOCATION_OPTIONS, ...sel])].map((l) => (
                <button key={l} onClick={() => toggle(l)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${sel.includes(l) ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200'}`}>{sel.includes(l) ? '✓ ' : ''}{l}</button>
              ))}
            </div>
            {footer('Save', () => saveProfile({ preferredLocations: sel }, '✓ Locations updated'))}
          </Modal>
        );
      }

      case 'liveClass':
        return (
          <Modal wide={Boolean(live)} title={live ? (live.topic || d.batch) : 'Classroom status'} sub={live ? `Live with ${live.trainerName}` : undefined} onClose={closeModal}>
            {live ? (
              <>
                <ZoomMeeting
                  key={live.sessionId}
                  getJoinDetails={(reset) => joinStudentLiveClass({ studentId: st.studentId, email: st.email, batch: d.batch, reset })}
                  studentEmail={st.email || undefined}
                  userName={d.name}
                  isTrainerHost={false}
                  height={560}
                />
                <div className="mt-3 p-3 rounded-xl border bg-slate-50 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${eligibleForPresent ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        Online Session Attendance: <span className="font-mono text-teal-700 font-extrabold">{liveAttendedMins} min</span>
                        {eligibleForPresent ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">✓ Present Ready</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">Requires 1h 45m</span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        {eligibleForPresent
                          ? '✓ 1 hour and 45 minutes attendance requirement reached. Trainer can mark attendance as Present.'
                          : `⏱ Minimum 1 hour and 45 minutes (105 mins) required before attendance can be marked as Present. (${Math.max(0, 105 - liveAttendedMins)} mins remaining)`}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border self-start sm:self-auto shrink-0 ${
                    eligibleForPresent
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-amber-50 text-amber-700 border-amber-300'
                  }`}>
                    {eligibleForPresent ? '✓ Eligible for Present' : `${liveAttendedMins}m / 105m`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Active online duration updates continuously every 30 seconds. Minimum 1h 45m required for full attendance credit.</p>
              </>
            ) : (
              <div className="text-center">
                <Pill tone="amber">NOT STARTED</Pill>
                <h3 className="text-base font-extrabold text-slate-900 mt-3">Waiting for your trainer</h3>
                <p className="text-xs text-slate-500 mt-1">You can join as soon as {trainer?.trainerName || 'your trainer'} starts the class. This page checks every 30 seconds.</p>
                <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 mt-4 text-left space-y-1">
                  <div>• Course: <b>{st.course}</b></div>
                  <div>• Batch: <b>{d.batch || 'Not allocated'}</b></div>
                  <div>• Timing: <b>{st.batchTiming || 'Not set'}</b></div>
                </div>
                <Btn tone="light" className="mx-auto mt-4" onClick={() => load(true)}><RefreshCw className="w-4 h-4" />Check again</Btn>
              </div>
            )}
          </Modal>
        );

      default:
        return null;
    }
  };

  // ==========================================================================
  // LAYOUT
  // ==========================================================================
  return (
    <div className="fixed inset-0 z-50 flex bg-[#f4f6fb] overflow-hidden text-slate-800 font-sans animate-fadeIn">
      {navOpen && <div className="fixed inset-0 z-[54] bg-slate-900/50 lg:hidden" onClick={() => setNavOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-[55] w-72 bg-[#0d9488] text-white flex flex-col justify-between p-4 sm:p-5 flex-shrink-0 h-full overflow-y-auto shadow-xl transition-transform duration-200 ${navOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1 pt-1">
            <div className="h-10 px-2.5 py-1 rounded-xl bg-white flex items-center justify-center shadow-sm flex-shrink-0"><img src="/thoughtflows-logo.png" alt="ThoughtFlows" className="h-7 w-auto object-contain" /></div>
            <div><div className="text-sm font-black tracking-tight">ThoughtFlows</div><div className="text-[10px] text-teal-100 font-semibold uppercase tracking-wider">Student 360°</div></div>
          </div>
          <div className="bg-white/10 border border-white/15 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-[#0d9488] font-black flex items-center justify-center flex-shrink-0">{d.initials}</div>
            <div className="min-w-0"><div className="text-sm font-bold truncate">{d.name}</div><div className="text-[10px] font-mono text-teal-100 truncate">{st.studentId}</div></div>
          </div>
          <nav className="space-y-5">
            {navItems.map((group) => (
              <div key={group.category}>
                <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-teal-100/80">{group.category}</div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = activeNav === item.id;
                    return (
                      <button key={item.id} onClick={() => go(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer ${active ? 'bg-white text-[#0d9488] shadow-sm font-bold' : 'text-white/90 hover:text-white hover:bg-white/10 font-medium'}`}>
                        <Icon className="w-4 h-4 flex-shrink-0" /><span className="truncate">{item.label}</span>
                        {item.id === 'trainers' && newReplies.length > 0 && !active && <span className="ml-auto text-[10px] font-bold bg-white text-[#0d9488] rounded-full px-1.5">{newReplies.length}</span>}
                        {item.id === 'classes' && live && !active && <span className="ml-auto w-2 h-2 rounded-full bg-emerald-300 animate-ping" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
        <button onClick={onLogout || onClose} className="mt-6 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer"><LogOut className="w-4 h-4" /><span>Logout</span></button>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <header className="h-16 px-3 sm:px-7 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setNavOpen(true)} className="lg:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer" aria-label="Open menu"><Menu className="w-5 h-5" /></button>
            <span className="hidden sm:block w-2 h-2 rounded-full bg-emerald-500" />
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">{navTitle}</h2>
            {d.batch && <span className="hidden sm:inline text-[10px] font-bold text-[#0d9488] bg-teal-50 border border-teal-200/80 px-2.5 py-0.5 rounded-full truncate max-w-[220px]">{d.batch}</span>}
          </div>
          <div className="flex items-center gap-2">
            {st.location && <span className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-600"><MapPin className="w-3.5 h-3.5" />{st.location}</span>}
            {st?.studentId && <NotificationBell audience="student" recipientId={st.studentId} onNew={() => load(true)} onOpenItem={(n) => { go(NOTIF_NAV[n.type] || 'dashboard'); load(true); }} />}
            <button onClick={() => load(true)} title="Refresh" className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={onLogout || onClose} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"><LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 sm:p-7">
          {loadError && <div className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">⚠ {loadError} — showing the last loaded data.</div>}
          {activeNav === 'dashboard' && renderDashboard()}
          {activeNav === 'membership' && renderMembership()}
          {activeNav === 'progress' && renderProgress()}
          {activeNav === 'classes' && renderClasses()}
          {activeNav === 'lms' && renderLms()}
          {activeNav === 'trainers' && renderTrainers()}
          {activeNav === 'placement-prep' && renderPlacementPrep()}
          {activeNav === 'certification' && renderCertification()}
          {activeNav === 'payments' && renderPayments()}
          {activeNav === 'admission' && renderAdmission()}
          {activeNav === 'help' && renderHelp()}
          {activeNav === 'profile' && renderProfile()}
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2 max-w-sm">
          <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" /><span>{toast}</span>
        </div>
      )}

      {renderModal()}

      {testId && <StudentOnlineTest testId={testId} onClose={() => { setTestId(null); load(true); }} onFinished={() => load(true)} />}

      <BookNewDemoModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        initialData={{ studentName: d.name, mobile: st.phone, email: st.email }}
        onConfirm={async (demoData) => {
          try {
            await createDemo(demoData);
            showToast(`✓ Demo booked for ${demoData.course}`);
          } catch (e) {
            showToast(`⚠ ${errMsg(e, 'Could not book the demo')}`, 5000);
          }
        }}
      />
    </div>
  );
}
