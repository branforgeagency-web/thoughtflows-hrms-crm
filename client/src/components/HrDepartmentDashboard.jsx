import React, { useState, useEffect, useMemo } from 'react';
import { localDateKey } from '../utils/dateUtils';
import { 
  Search, 
  Plus, 
  Bell, 
  Coffee, 
  LogOut, 
  Phone, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Award,
  TrendingUp,
  Home,
  Filter,
  Monitor,
  GraduationCap,
  Target,
  BarChart2,
  BookOpen,
  IndianRupee,
  Repeat,
  ChevronLeft,
  ChevronRight,
  Palette,
  RefreshCw,
  PhoneCall,
  Users,
  AlertTriangle
} from 'lucide-react';
import HrPipelineView from './HrPipelineView';
import HrFollowUpBoard from './HrFollowUpBoard';
import HrDemoDesk from './HrDemoDesk';
import HrAdmittedStudentsCrm from './HrAdmittedStudentsCrm';
import HrMyTargets from './HrMyTargets';
import HrMySchedule from './HrMySchedule';
import HrLmsSection from './HrLmsSection';
import HrStudentFeesCrm from './HrStudentFeesCrm';
import HrHandoverDesk from './HrHandoverDesk';
import HrReportsView from './HrReportsView';
import HrCallRecordingsTable from './HrCallRecordingsTable';
import HrStudentRequestsDesk from './HrStudentRequestsDesk';
import TrainerQualityBoard from './TrainerQualityBoard';
import { Inbox as InboxIcon } from 'lucide-react';
import LeadCallModal from './LeadCallModal';
import BookNewDemoModal from './BookNewDemoModal';
import AddLeadModal from './AddLeadModal';
import CompleteRegistrationModal from './CompleteRegistrationModal';
import { getStudents, getLeads, createLead, updateLead, updateStudent, getDemos, createDemo, createStudent, getRecordings, getTodayClosure, saveDailyClosure, onDataUpdate, getNotifications, markNotificationRead, markNotificationsRead, getStudentRequests, getStudentTickets, getMyAttendance, setMyAttendance, logCall, getTodayCallLog, getHrTargets } from '../services/api';
import { redirectToWhatsAppWeb } from '../utils/whatsapp';
import { useIncentivePolicy, progressiveIncentive } from '../utils/incentive';
import DashboardNavSwitcher from './DashboardNavSwitcher';

export default function HrDepartmentDashboard({ onClose, currentUser, onLogout, onSwitchDepartment, theme = 'classic' }) {
  // Persist active tab across browser refresh within this session
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return sessionStorage.getItem('thoughtflows_hr_active_tab') || 'Home';
    } catch {
      return 'Home';
    }
  });

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    try {
      sessionStorage.setItem('thoughtflows_hr_active_tab', tabName);
      localStorage.removeItem('thoughtflows_hr_active_tab');
    } catch (e) {
      console.warn('Could not save active tab to sessionStorage', e);
    }
  };

  const userName = currentUser?.name || currentUser?.userName || '';
  // Break timer is kept per counsellor so a shared browser never mixes two people's breaks
  const userKey = String(userName || 'anon').trim().toLowerCase().replace(/\s+/g, '_');
  const breakStartKey = `thoughtflows_break_start_${userKey}`;
  const userFirstName = userName.split(' ')[0] || 'there';
  const branchName = currentUser?.branch || '';
  const branchShort = String(branchName).replace(/\s*branch\b.*$/i, '').replace(/\s*\(.*\)\s*$/, '').trim();

  // Current Day Date Key for Daily Reset (e.g. '2026-09-24'); re-checked every
  // minute so a dashboard left open overnight rolls over to the new day
  const [todayKey, setTodayKey] = useState(() => localDateKey());
  const [hourNow, setHourNow] = useState(() => new Date().getHours());
  useEffect(() => {
    const t = setInterval(() => {
      setTodayKey(localDateKey());
      setHourNow(new Date().getHours());
    }, 60000);
    return () => clearInterval(t);
  }, []);
  const greeting = hourNow < 12 ? 'Good morning' : hourNow < 17 ? 'Good afternoon' : 'Good evening';

  const todayDisplay = useMemo(() => {
    return new Date(`${todayKey}T00:00:00`).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, [todayKey]);

  // Helper: check if a date string/Date object is from today
  const isToday = (dateInput) => {
    if (!dateInput) return false;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const [searchQuery, setSearchQuery] = useState('');
  
  // Live Break Timer State & Persistence
  const [breakStartTime, setBreakStartTime] = useState(() => {
    try {
      const saved = localStorage.getItem(breakStartKey);
      return saved ? parseInt(saved, 10) : null;
    } catch { return null; }
  });
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [accumulatedBreak, setAccumulatedBreak] = useState(() => {
    try {
      const today = localDateKey();
      const saved = localStorage.getItem(`thoughtflows_break_acc_${userKey}_${today}`);
      return saved ? parseInt(saved, 10) : 0;
    } catch { return 0; }
  });
  const [isOnBreak, setIsOnBreak] = useState(() => Boolean(breakStartTime));

  useEffect(() => {
    if (!isOnBreak) {
      setBreakSeconds(0);
      return undefined;
    }
    let start = breakStartTime;
    if (!start) {
      start = Date.now();
      setBreakStartTime(start);
      try { localStorage.setItem(breakStartKey, String(start)); } catch (_) {}
    }
    const tick = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setBreakSeconds(elapsed);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isOnBreak, breakStartTime]);

  // Server attendance (Leadership branch view): clock in on open, restore break state
  useEffect(() => {
    if (!userName) return;
    (async () => {
      try {
        const rec = await getMyAttendance(currentUser?.branch);
        if (!rec?.checkIn || rec.status === 'absent') await setMyAttendance('in', currentUser?.branch);
        else if (rec.status === 'break' && rec.breakStartedAt && !isOnBreak) {
          const start = new Date(rec.breakStartedAt).getTime();
          setBreakStartTime(start);
          try { localStorage.setItem(breakStartKey, String(start)); } catch (_) {}
          setIsOnBreak(true);
        } else if (rec.status === 'in' && isOnBreak) {
          // Break was ended on another device
          try { localStorage.removeItem(breakStartKey); } catch (_) {}
          setBreakStartTime(null);
          setIsOnBreak(false);
        }
        if (typeof rec?.breakMinutes === 'number' && rec.breakMinutes * 60 > accumulatedBreak) setAccumulatedBreak(rec.breakMinutes * 60);
      } catch (_) { /* offline: local timer still works */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName]);

  const handleToggleBreak = () => {
    setMyAttendance(isOnBreak ? 'resume' : 'break', currentUser?.branch).catch(() => {});
    if (isOnBreak) {
      const duration = breakStartTime ? Math.max(0, Math.floor((Date.now() - breakStartTime) / 1000)) : breakSeconds;
      const newTotal = accumulatedBreak + duration;
      setAccumulatedBreak(newTotal);
      try {
        const today = localDateKey();
        localStorage.setItem(`thoughtflows_break_acc_${userKey}_${today}`, String(newTotal));
        localStorage.removeItem(breakStartKey);
      } catch (_) {}
      setBreakStartTime(null);
      setBreakSeconds(0);
      setIsOnBreak(false);
    } else {
      const now = Date.now();
      setBreakStartTime(now);
      try { localStorage.setItem(breakStartKey, String(now)); } catch (_) {}
      setIsOnBreak(true);
    }
  };

  const fmtBreakTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const [closureSubmitted, setClosureSubmitted] = useState(false);
  const [closureSubmittedAt, setClosureSubmittedAt] = useState('');
  const [customMetrics, setCustomMetrics] = useState(null);
  const [editingMetric, setEditingMetric] = useState(null);
  const [callRecordings, setCallRecordings] = useState([]);
  
  // Local daily calls cache for instant reactivity when calling through modal
  // Today's calls come from the server call log (works across devices / browsers)
  const [todayCallLogs, setTodayCallLogs] = useState([]);
  useEffect(() => {
    if (!userName) return undefined;
    let alive = true;
    const load = () => getTodayCallLog()
      .then((r) => { if (alive && Array.isArray(r?.list)) setTodayCallLogs(r.list.map((c) => ({ id: c.leadId, time: c.createdAt, outcome: c.outcome, duration: c.durationSeconds, connected: c.connected }))); })
      .catch(() => {});
    load();
    const t = setInterval(load, 120000);
    return () => { alive = false; clearInterval(t); };
  }, [userName]);

  const [dashMenuOpen, setDashMenuOpen] = useState(false);
  const [barTheme, setBarTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('thoughtflows_hr_theme');
      return saved && saved !== 'clay' ? saved : 'turquoise';
    } catch {
      return 'turquoise';
    }
  }); // 'turquoise' | 'slate' | 'teal' | 'light'

  const handleCycleTheme = () => {
    setBarTheme(prev => {
      const next = prev === 'turquoise' ? 'slate' : prev === 'slate' ? 'teal' : prev === 'teal' ? 'light' : 'turquoise';
      try {
        localStorage.setItem('thoughtflows_hr_theme', next);
      } catch (e) {
        console.warn('Failed to save theme to localStorage', e);
      }
      return next;
    });
  };
  const [selectedCallLead, setSelectedCallLead] = useState(null);
  const [showBookDemoModal, setShowBookDemoModal] = useState(false);
  const [bookDemoInitialData, setBookDemoInitialData] = useState(null);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [studentLogin, setStudentLogin] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Training → HR notifications (handover progress, attendance alerts,
  // demo outcomes, syllabus completion, trainer recommendations)
  const [hrNotifications, setHrNotifications] = useState([]);
  const [showHrNotifs, setShowHrNotifs] = useState(false);
  // A new notification (referral lead, trainer progress, student request…)
  // came from another user's device — reload the CRM data behind it.
  const seenHrNotifIds = React.useRef(null);
  const reloadDataRef = React.useRef(null);
  const loadHrNotifications = async () => {
    try {
      const list = await getNotifications({ audience: 'hr', recipientName: currentUser?.name || currentUser?.userName || '' });
      const arr = Array.isArray(list) ? list : [];
      setHrNotifications(arr);
      const ids = arr.map(n => n._id);
      const hasNew = seenHrNotifIds.current && ids.some(id => !seenHrNotifIds.current.has(id));
      seenHrNotifIds.current = new Set(ids);
      if (hasNew && reloadDataRef.current) reloadDataRef.current();
    } catch (_) {}
  };
  useEffect(() => {
    loadHrNotifications();
    const unsub = onDataUpdate((entity) => {
      if (['notifications', 'students', 'demos', 'trainer_attendance'].includes(entity)) loadHrNotifications();
    });
    const poll = setInterval(loadHrNotifications, 60000);
    return () => { unsub(); clearInterval(poll); };
  }, [currentUser?.name]);
  const unreadHrNotifs = hrNotifications.filter(n => !n.read);

  // Real database states
  const [students, setStudents] = useState([]);
  const [leads, setLeads] = useState([]);
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Elevated user check (Admin / Super Admin / Leadership can toggle All vs My Leads)
  const isElevatedUser = currentUser?.role === 'Super Admin' ||
    currentUser?.role === 'Admin' ||
    currentUser?.department === 'admin' ||
    currentUser?.department === 'leadership';

  const [scopeMode, setScopeMode] = useState('mine'); // 'mine' | 'all'

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Lead allocated to a counsellor without LMS certification (server warning)
  useEffect(() => {
    const onWarn = (e) => showToast(`⚠ ${e.detail?.message || 'Counsellor not LMS-certified for this course'}`);
    window.addEventListener('thoughtflows_lms_warning', onWarn);
    return () => window.removeEventListener('thoughtflows_lms_warning', onWarn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const counselorFilter = currentUser?.name?.trim();
      const shouldFilterOnServer = counselorFilter && (!isElevatedUser || scopeMode === 'mine');
      const dKey = localDateKey();

      const [stRes, ldRes, dmRes, recRes, closureRes] = await Promise.all([
        getStudents(shouldFilterOnServer ? { hrName: counselorFilter } : undefined),
        getLeads(shouldFilterOnServer ? { counselor: counselorFilter } : undefined),
        getDemos(shouldFilterOnServer ? { counselor: counselorFilter, branch: branchShort } : undefined),
        getRecordings(shouldFilterOnServer ? { counselor: counselorFilter } : undefined).catch(() => []),
        (counselorFilter ? getTodayClosure(counselorFilter, dKey) : Promise.resolve(null)).catch(() => null)
      ]);
      setStudents(Array.isArray(stRes) ? stRes : []);
      setLeads(ldRes?.leads || []);
      setDemos(Array.isArray(dmRes) ? dmRes : []);
      setCallRecordings(Array.isArray(recRes) ? recRes : []);

      // Check if closure was submitted today
      if (closureRes) {
        setClosureSubmitted(true);
        if (closureRes.submittedAt) {
          setClosureSubmittedAt(new Date(closureRes.submittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
        }
        setCustomMetrics({
          callsMade: closureRes.callsMade,
          connected: closureRes.connected,
          demosBooked: closureRes.demosBooked,
          admissions: closureRes.admissions,
          feesCollected: closureRes.feesCollected,
          pendingFus: closureRes.pendingFus
        });
      } else {
        // Check localStorage for today's submission
        try {
          const localSaved = localStorage.getItem(`thoughtflows_closure_${dKey}_${counselorFilter || ''}`);
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            if (parsed.submitted) {
              setClosureSubmitted(true);
              setClosureSubmittedAt(parsed.submittedAt || '');
              if (parsed.metrics) setCustomMetrics(parsed.metrics);
            }
          } else {
            // New day reset!
            setClosureSubmitted(false);
            setClosureSubmittedAt('');
            setCustomMetrics(null);
          }
        } catch {
          setClosureSubmitted(false);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching HR CRM live data:', err);
      setLoading(false);
    }
  };
  reloadDataRef.current = () => loadAllData(true);

  useEffect(() => {
    loadAllData();
    const unsub = onDataUpdate((entity) => {
      if (entity === 'leads' || entity === 'students' || entity === 'demos' || entity === 'recordings' || entity === 'closures') {
        loadAllData();
      }
    });
    return unsub;
  }, [scopeMode, currentUser?.name, todayKey]);

  const handleAddLeadSubmit = async (leadData) => {
    try {
      const payload = {
        ...leadData,
        fullName: leadData.fullName || leadData.name,
        counselorAssigned: currentUser?.name || ''
      };
      const created = await createLead(payload);
      setLeads(prev => [created, ...prev]);
      setShowAddLeadModal(false);
      if (created.studentLogin?.password) setStudentLogin({ name: created.fullName, phone: created.phone, ...created.studentLogin });
      showToast(created.studentLogin?.existing ? `✓ Added lead: ${created.fullName} (login already exists for this email)` : `✓ Added real lead: ${created.fullName}`);
    } catch (err) {
      console.error('Failed to create lead:', err);
      const msg = err?.response?.data?.error || err.message || 'Error saving lead to database';
      showToast(`⚠ ${msg}`);
      throw err;
    }
  };

  const handleBookDemoSubmit = async (demoData) => {
    try {
      const created = await createDemo({ ...demoData, bookedBy: currentUser?.name || currentUser?.userName || '' });
      setDemos(prev => [created, ...prev]);
      setShowBookDemoModal(false);
      if (created.notificationSent) {
        showToast(`✓ Booked demo for ${created.candidateName}! Notification sent to ${created.trainer}`);
      } else {
        showToast(`✓ Booked demo for ${created.candidateName}. Notification not sent: ${created.notificationBlockReason || 'Conditions not met'}`);
      }
    } catch (err) {
      console.error('Failed to book demo:', err);
      showToast('Error saving demo to database');
    }
  };

  // Counselor Scoping: Strictly filter leads, students, and demos for the logged-in counselor.
  // Names are compared whole (so "Ram" never picks up "Ramesh"), and a record with
  // no owner belongs to nobody — it never shows up in every counsellor's list.
  const normName = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const myName = normName(currentUser?.name);
  const scopedStudents = useMemo(() => {
    if (scopeMode === 'all' && isElevatedUser) return students;
    if (!myName) return students;
    return students.filter(s => normName(s.hrName) === myName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, scopeMode, isElevatedUser, myName]);

  const scopedLeads = useMemo(() => {
    let baseLeads = leads;
    if (scopeMode === 'all' && isElevatedUser) {
      baseLeads = leads;
    } else if (myName) {
      baseLeads = leads.filter(l => normName(l.counselorAssigned || l.allocatedTo) === myName);
    }

    // Ensure every admitted student belonging to this counselor is present in the pipeline
    // even if a lead was not previously created or synced
    const leadPhones = new Set(
      baseLeads.map(l => (l.phone || '').replace(/\D/g, '').slice(-10)).filter(Boolean)
    );
    const leadStudentIds = new Set(
      baseLeads.map(l => l.admittedStudentId).filter(Boolean)
    );

    const syntheticAdmittedLeads = scopedStudents
      .filter(s => {
        const ph = (s.phone || '').replace(/\D/g, '').slice(-10);
        const hasByPhone = ph.length === 10 && leadPhones.has(ph);
        const hasById = s.studentId && leadStudentIds.has(s.studentId);
        return !hasByPhone && !hasById;
      })
      .map(s => ({
        _id: s._id || `synth-${s.studentId}`,
        id: s._id || `synth-${s.studentId}`,
        fullName: s.name,
        name: s.name,
        phone: s.phone || '',
        whatsappNumber: s.whatsappNumber || s.phone || '',
        email: s.email || '',
        course: s.course || '',
        branch: s.branch || '',
        location: s.location || s.branch || '',
        education: s.qualification || '',
        passoutYear: s.passoutYear || '',
        source: s.source || 'Direct Admission',
        sourceName: s.source || 'Direct Admission',
        stage: 'admitted',
        status: 'completed',
        counselorAssigned: s.hrName || currentUser?.name || '',
        allocatedTo: s.hrName || currentUser?.name || '',
        admittedStudentId: s.studentId,
        batchTiming: s.batchTiming || '',
        followUpDate: '',
        followUpTime: '',
        notes: `Admitted Student ID: ${s.studentId}`,
        createdAt: s.createdAt || s.registeredAt || new Date().toISOString()
      }));

    return [...baseLeads, ...syntheticAdmittedLeads];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, scopedStudents, scopeMode, isElevatedUser, myName, currentUser?.name]);

  const scopedDemos = useMemo(() => {
    if (scopeMode === 'all' && isElevatedUser) return demos;
    if (!myName && !branchShort) return demos;
    const bClean = (v) => String(v || '').toLowerCase().replace(/\s*(branch|\(.*\)|hq)\b/gi, '').replace(/[^a-z0-9]/g, '');
    const myB = bClean(branchShort);
    const leadPhones = new Set(
      scopedLeads.map(l => (l.phone || '').replace(/\D/g, '').slice(-10)).filter(Boolean)
    );
    return demos.filter(d => {
      const ph = (d.phone || '').replace(/\D/g, '').slice(-10);
      const isLeadCandidate = ph.length === 10 && leadPhones.has(ph);
      const isMine = myName && (normName(d.counselor) === myName || normName(d.bookedBy) === myName);
      const isMyBranch = myB && (bClean(d.location).includes(myB) || bClean(d.branch).includes(myB));
      return isMine || isMyBranch || isLeadCandidate;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demos, scopedLeads, scopeMode, isElevatedUser, myName, branchShort]);

  // Monthly admissions target: the Head of HR's target for this counsellor (or
  // "All HR"), otherwise Admin's default target from the incentive policy
  const incentivePolicy = useIncentivePolicy();
  const [headTarget, setHeadTarget] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => getHrTargets({ period: 'month' })
      .then((rows) => {
        if (!alive || !Array.isArray(rows)) return;
        const admissionRows = rows.filter(t => /admission|enrol/i.test(t.title || ''));
        const pick = admissionRows.find(t => normName(t.assignedTo) === myName)
          || admissionRows.find(t => /^all\b/i.test(String(t.assignedTo || '').trim()));
        setHeadTarget(pick && Number(pick.target) > 0 ? Number(pick.target) : null);
      })
      .catch(() => {});
    load();
    const off = onDataUpdate((entity) => { if (entity === 'targets') load(); });
    return () => { alive = false; off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myName]);
  const policyTarget = Number(incentivePolicy?.defaultTarget) > 0 ? Number(incentivePolicy.defaultTarget) : null;
  const monthlyTarget = { value: headTarget || policyTarget, fromHead: Boolean(headTarget) };

  const monthPrefix = todayKey.slice(0, 7);
  const admissionsThisMonth = useMemo(() => scopedStudents.filter(s => {
    if (myName && normName(s.hrName) !== myName) return false;
    const d = new Date(s.admissionDate || s.createdAt);
    return !isNaN(d.getTime()) && localDateKey(d).slice(0, 7) === monthPrefix;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }).length, [scopedStudents, monthPrefix, myName]);

  // Dynamic priorities for tomorrow
  const overdueCount = useMemo(() => {
    return scopedLeads.filter(l => l.followUpDate && l.followUpDate < todayKey && l.stage !== 'admitted' && l.stage !== 'closed').length;
  }, [scopedLeads, todayKey]);

  const feePendingCount = useMemo(() => {
    return scopedLeads.filter(l => l.stage === 'fee_followup' || l.stage === 'demo_attended').length;
  }, [scopedLeads]);

  // End of day numbers (strictly calculated for TODAY - resets each day)
  const computedDailyMetrics = useMemo(() => {
    // 1. Calls made TODAY — the server call log is the record (every call saved
    //    from the call modal writes one row). Uploaded recordings only count if
    //    they outnumber it, e.g. calls made outside the modal.
    const recordingsToday = callRecordings.filter(r => isToday(r.createdAt));
    const callsMadeToday = Math.max(todayCallLogs.length, recordingsToday.length);

    // 2. Connected calls TODAY (same sources, same rule)
    const connectedToday = Math.max(
      todayCallLogs.filter(c => c.connected).length,
      recordingsToday.filter(r => r.outcome && r.outcome !== 'Not Reachable').length
    );

    // 3. Demos BOOKED today (not demos that merely take place today)
    const demosBookedToday = scopedDemos.filter(d => isToday(d.createdAt)).length;

    // 4. Admissions TODAY (strictly admissions closed by this counselor)
    const todayAdmissions = scopedStudents.filter(s => {
      if (myName && normName(s.hrName) !== myName) return false;
      return isToday(s.createdAt) || isToday(s.admissionDate);
    });
    const admissionsToday = todayAdmissions.length;

    // 5. Fees collected TODAY = receipts dated today (admission payments + instalments).
    //    Older admissions saved before receipts existed count their paid amount.
    const feesTodayNum = scopedStudents.reduce((acc, s) => {
      const receipts = Array.isArray(s.receipts) ? s.receipts : [];
      if (!receipts.length) return acc + (isToday(s.createdAt) ? Number(s.paidAmount) || 0 : 0);
      return acc + receipts
        .filter(r => r.date === todayKey || (!r.date && isToday(r.at)))
        .reduce((a, r) => a + (Number(r.amount) || 0), 0);
    }, 0);

    // 6. Pending follow-ups due TODAY or overdue
    const pendingToday = scopedLeads.filter(l => {
      if (l.stage === 'admitted' || l.stage === 'closed') return false;
      if (l.followUpDate) return l.followUpDate <= todayKey;
      return l.stage === 'new' || l.stage === 'contacted';
    }).length;

    return {
      callsMade: callsMadeToday,
      connected: connectedToday,
      demosBooked: demosBookedToday,
      admissions: admissionsToday,
      rawFeesCollected: feesTodayNum,
      feesCollected: `₹${feesTodayNum.toLocaleString('en-IN')}`,
      pendingFus: pendingToday
    };
  }, [scopedLeads, scopedStudents, scopedDemos, callRecordings, todayCallLogs, todayKey]);

  // If user corrected/edited numbers, use customMetrics; otherwise use live computed daily metrics
  const closureMetrics = useMemo(() => {
    if (customMetrics) {
      const rawFees = typeof customMetrics.feesCollected === 'number' 
        ? customMetrics.feesCollected 
        : (parseInt(String(customMetrics.feesCollected).replace(/\D/g, '')) || 0);
      return {
        callsMade: customMetrics.callsMade ?? computedDailyMetrics.callsMade,
        connected: customMetrics.connected ?? computedDailyMetrics.connected,
        demosBooked: customMetrics.demosBooked ?? computedDailyMetrics.demosBooked,
        admissions: customMetrics.admissions ?? computedDailyMetrics.admissions,
        rawFeesCollected: rawFees,
        feesCollected: typeof customMetrics.feesCollected === 'string' && customMetrics.feesCollected.startsWith('₹') 
          ? customMetrics.feesCollected 
          : `₹${rawFees.toLocaleString('en-IN')}`,
        pendingFus: customMetrics.pendingFus ?? computedDailyMetrics.pendingFus
      };
    }
    return computedDailyMetrics;
  }, [customMetrics, computedDailyMetrics]);

  // Submit today's closure to database and command center
  const handleDailyClosureSubmit = async () => {
    try {
      const payload = {
        counselorName: userName,
        counselorEmail: currentUser?.email || '',
        branch: branchName,
        date: todayKey,
        callsMade: closureMetrics.callsMade,
        connected: closureMetrics.connected,
        demosBooked: closureMetrics.demosBooked,
        admissions: closureMetrics.admissions,
        feesCollected: closureMetrics.rawFeesCollected,
        pendingFus: closureMetrics.pendingFus,
        status: 'submitted',
        notes: `Daily closure submitted by ${userName} on ${todayKey}`,
        // What the system counted — managers see which numbers were hand-corrected
        systemMetrics: {
          callsMade: computedDailyMetrics.callsMade,
          connected: computedDailyMetrics.connected,
          demosBooked: computedDailyMetrics.demosBooked,
          admissions: computedDailyMetrics.admissions,
          feesCollected: computedDailyMetrics.rawFeesCollected,
          pendingFus: computedDailyMetrics.pendingFus
        }
      };
      await saveDailyClosure(payload);
      setMyAttendance('out', currentUser?.branch).catch(() => {});
      setClosureSubmitted(true);
      const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      setClosureSubmittedAt(timeStr);
      try {
        localStorage.setItem(`thoughtflows_closure_${todayKey}_${userName}`, JSON.stringify({
          submitted: true,
          submittedAt: timeStr,
          metrics: payload
        }));
      } catch (e) {}
      showToast(`✓ Today's closure (${todayKey}) submitted to Command Center!`);
    } catch (err) {
      // Not saved — leave it unsubmitted so the counsellor can retry
      console.error('Failed to submit daily closure:', err);
      showToast(`⚠ Closure NOT submitted: ${err?.response?.data?.error || err.message}. Please try again.`);
    }
  };

  // Open student requests + support tickets for this counsellor (Student Portal → HR)
  const [studentInboxCount, setStudentInboxCount] = useState(0);
  useEffect(() => {
    const me = String(userName || '').trim().toLowerCase();
    const load = async () => {
      try {
        const [reqs, tickets] = await Promise.all([
          getStudentRequests({ audience: 'hr', status: 'Open' }).catch(() => []),
          getStudentTickets({ status: 'open' }).catch(() => [])
        ]);
        const mine = (n) => !me || String(n || '').trim().toLowerCase() === me;
        setStudentInboxCount((reqs || []).filter((r) => mine(r.hrName)).length + (tickets || []).filter((t) => mine(t.hrName)).length);
      } catch (_) {}
    };
    load();
    const t = setInterval(load, 60000);
    const off = onDataUpdate(load);
    return () => { clearInterval(t); off(); };
  }, [userName]);

  // Dynamic Navigation Tabs with real database counts
  const pendingFeesStats = useMemo(() => {
    let count = 0;
    let totalBal = 0;
    scopedStudents.forEach(s => {
      const fee = Number(s.courseFee) || 0;
      const paid = Number(s.paidAmount) || 0;
      const bal = (s.pendingBalance != null && !isNaN(Number(s.pendingBalance))) ? Number(s.pendingBalance) : Math.max(0, fee - paid);
      if (bal > 0) {
        count++;
        totalBal += bal;
      }
    });
    return { count, totalBal };
  }, [scopedStudents]);

  const NAV_TABS = useMemo(() => {
    const pipelineCount = scopedLeads.length.toString();
    const followUpCount = scopedLeads.filter(l => l.stage !== 'admitted' && l.stage !== 'closed').length.toString();
    const admittedCount = scopedStudents.length.toString();
    const handoverCount = scopedStudents.filter(s => s.handoverStatus !== 'Sent to Training').length.toString();

    return [
      { name: 'Home', badge: null, icon: Home, iconBg: 'bg-[#0e6977]', color: 'teal' },
      { name: 'Pipeline & Follow-ups', badge: pipelineCount, icon: Filter, iconBg: 'bg-[#7c3aed]', badgeBg: 'bg-rose-500', color: 'purple' },
      { name: 'Demo Desk', badge: scopedDemos.length > 0 ? scopedDemos.length.toString() : null, icon: Monitor, iconBg: 'bg-cyan-600', color: 'cyan' },
      { name: 'Admitted Students', badge: admittedCount, icon: GraduationCap, iconBg: 'bg-emerald-600', badgeBg: 'bg-emerald-500', color: 'emerald' },
      { name: 'Call Recordings', badge: null, icon: PhoneCall, iconBg: 'bg-[#0e6977]', color: 'teal' },
      { name: 'My Targets', badge: null, icon: Target, iconBg: 'bg-rose-500', color: 'pink' },
      { name: 'My Schedule', badge: null, icon: Calendar, iconBg: 'bg-blue-500', color: 'blue' },
      { name: 'LMS', badge: 'Learn', isPillBadge: true, icon: BookOpen, iconBg: 'bg-yellow-700', color: 'green' },
      { name: 'Fees', badge: pendingFeesStats.count > 0 ? String(pendingFeesStats.count) : null, badgeBg: 'bg-amber-500', icon: IndianRupee, iconBg: 'bg-teal-600', color: 'teal' },
      { name: 'Handover', badge: handoverCount, icon: Repeat, iconBg: 'bg-orange-600', badgeBg: 'bg-orange-500', color: 'orange' },
      { name: 'Student Requests', badge: studentInboxCount > 0 ? String(studentInboxCount) : null, icon: InboxIcon, iconBg: 'bg-indigo-600', badgeBg: 'bg-rose-500', color: 'indigo' },
    ];
  }, [scopedLeads, scopedStudents, scopedDemos, studentInboxCount, pendingFeesStats.count]);

  // Today's Priority Queue: overdue follow-ups first, then today's, then
  // fee-due admitted students, then fee-stage leads, then brand-new leads.
  const priorityQueue = useMemo(() => {
    // Admitted students with pending / overdue fee installments
    const feeDueItems = scopedStudents
      .filter(s => {
        const fee = Number(s.courseFee) || 0;
        const paid = Number(s.paidAmount) || 0;
        const bal = (s.pendingBalance != null && !isNaN(Number(s.pendingBalance))) ? Number(s.pendingBalance) : Math.max(0, fee - paid);
        return bal > 0 && s.nextDueDate && s.nextDueDate <= todayKey;
      })
      .map(s => {
        const fee = Number(s.courseFee) || 0;
        const paid = Number(s.paidAmount) || 0;
        const bal = (s.pendingBalance != null && !isNaN(Number(s.pendingBalance))) ? Number(s.pendingBalance) : Math.max(0, fee - paid);
        const isOverdue = s.nextDueDate < todayKey;
        return {
          id: s._id || s.studentId,
          time: isOverdue ? 'DUE OVERDUE' : 'DUE TODAY',
          isNow: false,
          isOverdue,
          name: `${s.name} — Fee Due (₹${bal.toLocaleString('en-IN')})`,
          details: [s.studentId, s.course, `Due: ${s.nextDueDate}`, `Paid so far: ₹${paid.toLocaleString('en-IN')}`].filter(Boolean).join(' • '),
          studentData: s,
          isFeeDue: true,
          actionText: 'COLLECT FEE',
          actionStyle: 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-600 hover:text-white font-black'
        };
      });

    const rankOf = (l) => {
      if (l.followUpDate && l.followUpDate < todayKey) return 0;
      if (l.followUpDate === todayKey) return 1;
      if (l.followUpDate && l.followUpDate > todayKey) return 9;
      if (l.stage === 'fee_followup' || l.stage === 'demo_attended') return 2;
      if (l.stage === 'new' && !(l.callCount > 0)) return 3;
      return 4;
    };
    const leadItems = scopedLeads
      .filter(l => l.stage !== 'admitted' && l.stage !== 'closed')
      .map(l => ({ lead: l, rank: rankOf(l) }))
      .filter(x => x.rank < 9)
      .sort((a, b) => a.rank - b.rank
        || String(a.lead.followUpDate || '').localeCompare(String(b.lead.followUpDate || ''))
        || String(a.lead.followUpTime || '99').localeCompare(String(b.lead.followUpTime || '99'))
        || new Date(a.lead.createdAt || 0) - new Date(b.lead.createdAt || 0))
      .slice(0, 6)
      .map(({ lead, rank }, idx) => {
        const stage = lead.stage || 'new';
        let actionText = 'CALL NOW';
        let actionStyle = 'bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-extrabold';
        if (stage === 'demo_booked') {
          actionText = 'VIEW DEMO';
          actionStyle = 'bg-purple-50 text-purple-700 border border-purple-200 font-bold';
        } else if (stage === 'demo_attended' || stage === 'fee_followup') {
          actionText = 'FEE PITCH';
          actionStyle = 'bg-amber-50 text-amber-800 border border-amber-200 font-bold';
        }
        return {
          id: lead._id || lead.id,
          time: rank === 0 ? 'OVERDUE' : rank === 1 ? (lead.followUpTime || 'TODAY') : stage === 'new' ? 'NEW' : '—',
          isNow: idx === 0,
          isOverdue: rank === 0,
          name: `${lead.fullName || lead.name} — ${stage === 'new' ? 'First Call' : stage.replace(/_/g, ' ').toUpperCase()}`,
          details: [lead.sourceName || lead.source, lead.course, lead.location, lead.followUpNote].filter(Boolean).join(' • ') || lead.phone || '',
          leadData: lead,
          actionText,
          actionStyle
        };
      });

    return [...feeDueItems, ...leadItems].slice(0, 8);
  }, [scopedLeads, scopedStudents, todayKey]);

  // Recent Activity: real events with their real timestamps, newest first
  const recentActivities = useMemo(() => {
    const list = [];
    const push = (at, e) => { const d = new Date(at); if (!isNaN(d.getTime())) list.push({ ...e, at: d }); };
    scopedStudents.forEach(s => {
      push(s.createdAt, {
        primary: `${s.name} admitted`,
        secondary: [s.course, s.studentId && `ID: ${s.studentId}`].filter(Boolean).join(' • '),
        tag: 'ADMITTED', tagStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      });
      (Array.isArray(s.receipts) ? s.receipts : []).forEach(r => push(r.at || r.date, {
        primary: `₹${(Number(r.amount) || 0).toLocaleString('en-IN')} received from ${s.name}`,
        secondary: [r.receiptNo, r.mode].filter(Boolean).join(' • '),
        tag: 'FEE', tagStyle: 'bg-teal-50 text-teal-700 border-teal-200'
      }));
    });
    scopedDemos.forEach(d => push(d.updatedAt || d.createdAt, {
      primary: `${d.candidateName} demo ${d.status || 'booked'}`,
      secondary: [d.course, d.trainer && `with ${d.trainer}`, d.preferredDate].filter(Boolean).join(' • '),
      tag: 'DEMO', tagStyle: 'bg-blue-50 text-blue-700 border-blue-200'
    }));
    scopedLeads.forEach(l => push(l.createdAt, {
      primary: `New lead: ${l.fullName || l.name}`,
      secondary: [l.sourceName || l.source, l.course].filter(Boolean).join(' • '),
      tag: 'NEW LEAD', tagStyle: 'bg-cyan-50 text-cyan-700 border-cyan-200'
    }));
    const leadName = new Map(scopedLeads.map(l => [String(l._id || l.id), l.fullName || l.name]));
    todayCallLogs.forEach(c => push(c.time, {
      primary: `Called ${leadName.get(String(c.id)) || 'a lead'}`,
      secondary: [c.outcome, c.duration ? `${Math.round(c.duration)}s` : ''].filter(Boolean).join(' • '),
      tag: 'CALL', tagStyle: 'bg-slate-50 text-slate-700 border-slate-200'
    }));
    return list
      .sort((a, b) => b.at - a.at)
      .slice(0, 8)
      .map(e => ({
        ...e,
        time: localDateKey(e.at) === todayKey
          ? e.at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
          : e.at.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      }));
  }, [scopedStudents, scopedDemos, scopedLeads, todayCallLogs, todayKey]);

  // Header search across my leads, students and demos
  const searchInputRef = React.useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const qDigits = q.replace(/\D/g, '');
    const hit = (...vals) => vals.some(v => {
      const str = String(v || '');
      return str.toLowerCase().includes(q) || (qDigits.length >= 4 && str.replace(/\D/g, '').includes(qDigits));
    });
    const out = [];
    scopedLeads.forEach(l => {
      if (hit(l.fullName, l.name, l.phone, l.email, l.course)) out.push({ kind: 'Lead', key: `l-${l._id}`, title: l.fullName || l.name, sub: [l.phone, (l.stage || '').replace(/_/g, ' '), l.course].filter(Boolean).join(' • '), lead: l });
    });
    scopedStudents.forEach(st => {
      if (hit(st.name, st.studentId, st.phone, st.email, st.course)) out.push({ kind: 'Student', key: `s-${st._id}`, title: st.name, sub: [st.studentId, st.course, st.feeStatus].filter(Boolean).join(' • '), student: st });
    });
    scopedDemos.forEach(d => {
      if (hit(d.candidateName, d.phone, d.email, d.course)) out.push({ kind: 'Demo', key: `d-${d._id}`, title: d.candidateName, sub: [d.course, d.preferredDate, d.status].filter(Boolean).join(' • '), demo: d });
    });
    return out.slice(0, 12);
  }, [searchQuery, scopedLeads, scopedStudents, scopedDemos]);
  const openSearchResult = (r) => {
    setSearchOpen(false);
    setSearchQuery('');
    if (r.lead) {
      if (r.lead.stage === 'admitted' || r.lead.stage === 'closed') { handleTabChange('Pipeline & Follow-ups'); return; }
      openCallFor(r.lead);
    } else if (r.student) {
      handleTabChange(r.student.feeStatus && r.student.feeStatus !== 'Fully Paid' ? 'Fees' : 'Admitted Students');
    } else if (r.demo) {
      handleTabChange('Demo Desk');
    }
  };

  // Open the call modal for a lead or student (priority queue, pipeline, search, admitted CRM)
  const openCallFor = (lead, isStudent = false) => {
    if (!lead) return;
    setSelectedCallLead({
      id: lead._id || lead.id || lead.studentId,
      _id: lead._id || lead.id || lead.studentId,
      name: lead.fullName || lead.name,
      details: [lead.sourceName || lead.source, lead.course, lead.location].filter(Boolean).join(' • '),
      phone: lead.phone || '',
      whatsappNumber: lead.whatsappNumber || '',
      source: lead.sourceName || lead.source || (isStudent ? 'Enrolled Student' : 'Direct'),
      stage: lead.stage || (isStudent ? 'admitted' : 'new'),
      callCount: lead.callCount || 0,
      counselorAssigned: lead.counselorAssigned || lead.hrName,
      leadData: lead,
      isStudent
    });
  };

  // Lead → Student: registration form pre-filled from the lead. Creating the
  // student links it to the lead and moves the lead to Admitted (server side).
  const [admittingLead, setAdmittingLead] = useState(null);
  const handleAdmitSubmit = async (studentRecord) => {
    const lead = admittingLead;
    let created;
    try {
      created = await createStudent({ ...studentRecord, leadId: lead?._id || lead?.id || '' });
    } catch (err) {
      // The form shows this message (e.g. "already admitted as TF…")
      throw new Error(err?.response?.data?.error || err.message);
    }
    setAdmittingLead(null);
    loadAllData(true);
    if (created?.studentLogin?.password) setStudentLogin({ name: created.name, phone: created.phone, ...created.studentLogin });
    showToast(`✓ ${created?.name || 'Student'} admitted (${created?.studentId || ''}) — lead moved to Admitted`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f0faf8] font-sans text-slate-800 animate-fadeIn">
      {/* Top Main Navigation Bar */}
      <header className={`sticky top-0 z-30 transition-colors duration-200 px-4 sm:px-6 lg:px-8 py-2.5 shadow-md flex items-center justify-between gap-3 flex-wrap ${
        barTheme === 'clay'
          ? 'bg-white text-[#073734] border-b border-[#cce8e4] shadow-[0_6px_20px_rgba(7,55,52,0.06),inset_0_2px_4px_rgba(255,255,255,0.95)]'
          : barTheme === 'turquoise'
            ? 'bg-[#73C1CC] text-[#073138] border-b border-[#5cb6c2] shadow-sm'
            : barTheme === 'slate'
              ? 'bg-[#0f172a] text-slate-100 border-b border-slate-800'
              : barTheme === 'teal'
                ? 'bg-gradient-to-r from-[#042f2e] via-[#064e3b] to-[#042f2e] text-white border-b border-teal-800/60'
                : 'bg-white/95 backdrop-blur-md text-slate-800 border-b border-slate-200/90'
      }`}>
        {/* Left: Logo Pill */}
        <div className="flex items-center gap-2.5 sm:gap-3">

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl shadow-xs border ${
            barTheme === 'clay'
              ? 'clay-pill text-[#073734]'
              : barTheme === 'turquoise'
                ? 'bg-white/90 border-white/70 text-[#073138]'
                : barTheme === 'slate'
                  ? 'bg-slate-800/90 border-slate-700/80 text-white'
                  : barTheme === 'teal'
                    ? 'bg-white/15 border-white/20 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <img 
              src="/thoughtflows-logo.png" 
              alt="Thoughtflows" 
              className="h-5 w-auto object-contain bg-white rounded px-1 py-0.5" 
            />
            <span className="text-[11px] font-bold tracking-tight hidden xs:inline">
              Thoughtflows 2.0 <span className={
                barTheme === 'clay'
                  ? 'text-[#0d9488] font-extrabold'
                  : barTheme === 'turquoise' 
                    ? 'text-[#0e6977] font-extrabold' 
                    : barTheme === 'slate' 
                      ? 'text-teal-400' 
                      : barTheme === 'teal' 
                        ? 'text-teal-200' 
                        : 'text-[#00897b]'
              }>• HR</span>
            </span>
          </div>
        </div>

        {/* Center: Search & Add Lead */}
        <div className="flex items-center gap-2 flex-1 max-w-md mx-auto justify-center">
          <div className="relative w-full max-w-xs">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
              barTheme === 'clay' ? 'text-teal-600' : barTheme === 'turquoise' ? 'text-[#1e606a]' : 'text-slate-400'
            }`} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              onKeyDown={(e) => { if (e.key === 'Enter' && searchResults[0]) openSearchResult(searchResults[0]); }}
              placeholder="Search leads, students, demos..."
              className={`w-full rounded-xl pl-8 pr-12 py-1.5 text-xs outline-none transition-all ${
                barTheme === 'clay'
                  ? 'clay-input text-[#073138] placeholder-[#1e606a]/70'
                  : barTheme === 'turquoise'
                    ? 'bg-white/90 border border-white/70 text-[#073138] placeholder-[#1e606a]/70 focus:bg-white focus:border-[#0e6977] shadow-xs'
                    : barTheme === 'slate'
                      ? 'bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-400 focus:border-teal-400 focus:bg-slate-800'
                      : barTheme === 'teal'
                        ? 'bg-white/15 border border-white/20 text-white placeholder-teal-200/70 focus:bg-white/25 focus:border-teal-300'
                        : 'bg-slate-100/90 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-teal-500'
              }`}
            />
            <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono px-1.5 py-0.5 rounded ${
              barTheme === 'clay'
                ? 'clay-pill text-[#073138] font-bold'
                : barTheme === 'turquoise'
                  ? 'bg-[#73C1CC]/25 text-[#073138] font-bold'
                  : barTheme === 'light'
                    ? 'bg-slate-200 text-slate-600'
                    : 'bg-white/10 text-white/80'
            }`}>
              {/Mac/i.test(navigator.platform || '') ? '⌘K' : 'Ctrl K'}
            </span>
            {searchOpen && searchQuery.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-full mt-2 max-h-80 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-2xl z-50 text-left">
                {searchResults.length === 0 ? (
                  <div className="px-4 py-4 text-xs text-slate-400 text-center">No leads, students or demos match “{searchQuery.trim()}”.</div>
                ) : searchResults.map((r) => (
                  <button
                    key={r.key}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => openSearchResult(r)}
                    className="w-full text-left px-3 py-2 border-b border-slate-50 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase flex-shrink-0 ${r.kind === 'Lead' ? 'bg-purple-50 text-purple-700' : r.kind === 'Student' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{r.kind}</span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-slate-900 truncate">{r.title}</span>
                      <span className="block text-[11px] text-slate-500 truncate">{r.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={() => setShowAddLeadModal(true)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold transition-all flex-shrink-0 active:scale-95 cursor-pointer ${
            barTheme === 'clay'
              ? 'clay-btn clay-btn-primary'
              : barTheme === 'turquoise'
                ? 'rounded-xl bg-[#08363e] hover:bg-[#052329] text-white shadow-sm font-extrabold'
                : barTheme === 'slate'
                  ? 'rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white'
                  : barTheme === 'teal'
                    ? 'rounded-xl bg-white hover:bg-teal-50 text-[#042f2e]'
                    : 'rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white'
          }`}>
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Enquiry</span>
          </button>

          <div className="relative flex-shrink-0">
          <button onClick={() => setShowHrNotifs(v => !v)} title="Updates from Training" className={`p-2 rounded-xl transition-colors relative flex-shrink-0 ${
            barTheme === 'clay'
              ? 'clay-btn clay-btn-secondary text-[#073734]'
              : barTheme === 'turquoise'
                ? 'border bg-white/90 hover:bg-white border-white/70 text-[#073138] shadow-xs'
                : barTheme === 'slate'
                  ? 'border bg-slate-800/90 hover:bg-slate-700 border-slate-700/80 text-slate-300'
                  : barTheme === 'teal'
                    ? 'border bg-white/15 hover:bg-white/25 border-white/20 text-white'
                    : 'border bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
          }`}>
            <Bell className="w-3.5 h-3.5" />
            {unreadHrNotifs.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center">{unreadHrNotifs.length}</span>
            )}
          </button>
          {showHrNotifs && (
            <div className="absolute left-0 top-full mt-2 w-80 max-h-[420px] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 text-left">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Updates from Training</span>
                {unreadHrNotifs.length > 0 && (
                  <button
                    onClick={async () => {
                      try { await markNotificationsRead(unreadHrNotifs.map(n => n._id)); } catch (_) {}
                      setHrNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    }}
                    className="text-[11px] font-bold text-[#00897b] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {hrNotifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-slate-400">No updates yet.</div>
              ) : hrNotifications.map(n => (
                <button
                  key={n._id}
                  onClick={async () => {
                    if (!n.read) {
                      try { await markNotificationRead(n._id); } catch (_) {}
                      setHrNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
                    }
                    if (n.type === 'demo') handleTabChange('Demo Desk');
                    else if (n.studentId) handleTabChange('Handover');
                    setShowHrNotifs(false);
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 ${n.read ? '' : 'bg-amber-50/60'}`}
                >
                  <div className="text-xs font-bold text-slate-900">{n.title}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">{n.message}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                </button>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* Right: Quick Controls & Session Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">



          {/* Theme Switcher Button */}
          <button
            onClick={handleCycleTheme}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              barTheme === 'clay'
                ? 'clay-btn clay-btn-secondary text-[#0b6b66] border-teal-100'
                : barTheme === 'turquoise'
                  ? 'border bg-white/90 hover:bg-white border-white/70 text-[#073138] shadow-xs'
                  : barTheme === 'slate'
                    ? 'border bg-slate-800/90 hover:bg-slate-700 border-slate-700/80 text-teal-400'
                    : barTheme === 'teal'
                      ? 'border bg-white/15 hover:bg-white/25 border-white/20 text-teal-200'
                      : 'border bg-slate-100 hover:bg-slate-200 border-slate-200 text-teal-700'
            }`}
            title={`Current theme: ${barTheme}. Click to switch theme.`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden xl:inline capitalize">{barTheme} Theme</span>
          </button>

          {/* User Profile */}
          <div className={`flex items-center gap-2.5 px-3 py-1 rounded-xl ${
            barTheme === 'clay'
              ? 'clay-pill text-[#073734]'
              : barTheme === 'turquoise'
                ? 'border bg-white/90 border-white/70 text-[#073138] shadow-xs'
                : barTheme === 'slate'
                  ? 'border bg-slate-800/90 border-slate-700/80 text-slate-100'
                  : barTheme === 'teal'
                    ? 'border bg-white/15 border-white/20 text-white'
                    : 'border bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shadow-xs ${
              barTheme === 'clay'
                ? 'clay-squircle bg-teal-600 text-white'
                : barTheme === 'turquoise'
                  ? 'bg-[#08363e] text-[#73C1CC]'
                  : 'bg-gradient-to-br from-teal-400 to-emerald-600 text-white'
            }`}>
              {userFirstName[0]}
            </div>
            <div className="text-left text-[11px] leading-tight hidden sm:block">
              <div className="font-bold">{userName}</div>
              <div className={`text-[9.5px] uppercase tracking-wider flex items-center gap-1 mt-0.5 ${
                barTheme === 'clay'
                  ? 'text-teal-700 font-semibold'
                  : barTheme === 'turquoise'
                    ? 'text-[#185d68]'
                    : barTheme === 'light'
                      ? 'text-slate-500'
                      : 'text-slate-400'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {(branchShort || currentUser?.department || 'HR').toUpperCase()}
              </div>
            </div>
          </div>

          {/* Quick Cross-Dashboard Switcher */}
          <DashboardNavSwitcher currentDepartment="hr" onSwitchDepartment={onSwitchDepartment} />

          {/* Break Button */}
          <button
            onClick={handleToggleBreak}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isOnBreak 
                ? 'bg-amber-400 border border-amber-300 text-amber-950 font-black shadow-xs ring-2 ring-amber-300/60' 
                : barTheme === 'clay'
                  ? 'clay-btn clay-btn-secondary text-[#073734]'
                  : barTheme === 'turquoise'
                    ? 'border bg-white/90 hover:bg-white border-white/70 text-[#073138] shadow-xs'
                    : barTheme === 'slate'
                      ? 'border bg-slate-800/90 hover:bg-slate-700 border-slate-700/80 text-slate-200'
                      : barTheme === 'teal'
                        ? 'border bg-white/15 hover:bg-white/25 border-white/20 text-white'
                        : 'border bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
          >
            <Coffee className={`w-3.5 h-3.5 ${isOnBreak ? 'animate-bounce text-amber-900' : ''}`} />
            <span>
              {isOnBreak ? `On Break (${fmtBreakTimer(breakSeconds)})` : 'Start Break'}
            </span>
            {!isOnBreak && accumulatedBreak > 0 && (
              <span className="text-[10px] opacity-80">({Math.floor(accumulatedBreak / 60)}m used)</span>
            )}
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout || onClose}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              barTheme === 'clay'
                ? 'clay-btn clay-btn-danger'
                : barTheme === 'turquoise'
                  ? 'border bg-white/90 hover:bg-rose-50 hover:text-rose-600 border-white/70 text-[#073138] shadow-xs'
                  : barTheme === 'slate'
                    ? 'border bg-slate-800/90 hover:bg-rose-900/40 hover:text-rose-300 hover:border-rose-500/40 border-slate-700/80 text-slate-400'
                    : barTheme === 'teal'
                      ? 'border bg-white/15 hover:bg-rose-50 hover:text-white border-white/20 text-white'
                      : 'border bg-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border-slate-200 text-slate-600'
            }`}
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Sub-Header Navigation Tabs Bar */}
      <div className={`border-b px-4 sm:px-6 lg:px-8 py-2 relative z-20 transition-all ${
        barTheme === 'clay'
          ? 'bg-[#f4fcfb] border-teal-100 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9)]'
          : barTheme === 'turquoise'
            ? 'bg-[#f0fafb] border-[#c2e8ee] shadow-xs'
            : barTheme === 'teal'
              ? 'bg-[#f0faf8] border-teal-200/80 shadow-xs'
              : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div className="w-full flex items-center gap-2">
          {/* Scroll Left */}
          <button 
            onClick={() => {
              const el = document.getElementById('hr-nav-tabs-container');
              if (el) el.scrollLeft -= 220;
            }}
            className={`w-7 h-7 flex items-center justify-center text-xs flex-shrink-0 transition-colors ${
              barTheme === 'clay'
                ? 'clay-btn clay-btn-secondary'
                : 'rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800'
            }`}
            title="Scroll Left"
          >
            ◀
          </button>

          {/* Scrollable Tabs */}
          <div 
            id="hr-nav-tabs-container"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none scroll-smooth flex-1 py-0.5"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.name;
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.name}
                  onClick={() => handleTabChange(tab.name)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs transition-all flex-shrink-0 ${
                    isActive
                      ? barTheme === 'clay'
                        ? 'clay-btn clay-btn-primary text-white font-bold'
                        : barTheme === 'turquoise'
                          ? 'bg-[#08363e] text-white font-bold shadow-xs border border-[#08363e]'
                          : barTheme === 'teal'
                            ? 'bg-[#00796b] text-white font-bold shadow-xs border border-[#00695c]'
                            : 'bg-slate-900 text-white font-bold shadow-xs border border-slate-900'
                      : barTheme === 'clay'
                        ? 'clay-btn clay-btn-secondary text-[#073734] hover:text-[#0b6b66] font-semibold'
                        : barTheme === 'turquoise'
                          ? 'bg-white/90 hover:bg-[#e4f5f8] text-slate-700 hover:text-[#08363e] border border-slate-200/70 font-semibold'
                          : 'bg-slate-50/90 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/70 font-semibold'
                  }`}
                >
                  {/* Clean Unified Icon */}
                  {IconComp && (
                    <IconComp className={`w-3.5 h-3.5 ${
                      isActive 
                        ? barTheme === 'clay'
                          ? 'text-teal-200 stroke-[2.4]'
                          : barTheme === 'turquoise'
                            ? 'text-[#73C1CC] stroke-[2.4]'
                            : 'text-teal-400 stroke-[2.4]' 
                        : 'text-slate-400 group-hover:text-slate-600 stroke-[2]'
                    }`} />
                  )}
                  <span>{tab.name}</span>

                  {/* Clean Unified Badge */}
                  {tab.badge && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : tab.isPillBadge
                          ? 'bg-amber-100 text-amber-800'
                          : tab.badgeBg || 'bg-slate-200 text-slate-700'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Scroll Right */}
          <button 
            onClick={() => {
              const el = document.getElementById('hr-nav-tabs-container');
              if (el) el.scrollLeft += 220;
            }}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs flex-shrink-0 transition-colors"
            title="Scroll Right"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {activeTab === 'My Schedule' ? (
          <HrMySchedule 
            isOnBreak={isOnBreak} 
            setIsOnBreak={setIsOnBreak} 
            breakSeconds={breakSeconds} 
            accumulatedBreak={accumulatedBreak} 
            handleToggleBreak={handleToggleBreak} 
            currentUser={currentUser} 
          />
        ) : activeTab === 'My Targets' ? (
          <HrMyTargets currentUser={currentUser} students={scopedStudents} />
        ) : activeTab === 'Admitted Students' ? (
          <HrAdmittedStudentsCrm 
            students={scopedStudents} 
            onRefreshStudents={loadAllData} 
            currentUser={currentUser} 
            onStudentLogin={setStudentLogin}
            onCallStudent={(st) => openCallFor(st, true)}
          />
        ) : activeTab === 'Call Recordings' ? (
          <HrCallRecordingsTable currentUser={currentUser} />
        ) : activeTab === 'Demo Desk' ? (
          <HrDemoDesk 
            demos={scopedDemos} 
            onRefreshDemos={loadAllData} 
            onBookDemoClick={() => setShowBookDemoModal(true)} 
            currentUser={currentUser}
          />
        ) : (activeTab === 'Pipeline & Follow-ups' || activeTab === 'My Pipeline' || activeTab === 'Follow-up Board') ? (
          <HrPipelineView 
            leads={scopedLeads} 
            onRefreshLeads={loadAllData} 
            onAddLeadClick={() => setShowAddLeadModal(true)} 
            onAdmitLead={setAdmittingLead}
            onCallLead={(lead) => openCallFor(lead, false)}
            initialViewMode={activeTab === 'Follow-up Board' ? 'followup' : 'kanban'}
            currentUser={currentUser}
          />
        ) : activeTab === 'LMS' ? (
          <HrLmsSection currentUser={currentUser} />
        ) : activeTab === 'Fees' ? (
          <HrStudentFeesCrm 
            students={scopedStudents} 
            onRefreshStudents={loadAllData} 
            currentUser={currentUser} 
          />
) : activeTab === 'Student Requests' ? (
          <HrStudentRequestsDesk currentUser={currentUser} onCountChange={setStudentInboxCount} />
        ) : activeTab === 'Handover' ? (
          <div className="space-y-6">
            <HrHandoverDesk 
              students={scopedStudents} 
              onRefreshStudents={loadAllData} 
              currentUser={currentUser} 
            />
            <TrainerQualityBoard title="Trainer ratings — use when allocating" />
          </div>
        ) : activeTab === 'Home' ? (
          <>
        
        {/* Greeting & Quick Context */}
        <div className="text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {greeting}, <span className="text-[#0e6977]">{userFirstName}</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {[todayDisplay, branchName].filter(Boolean).join(' • ')} • You have <strong className="text-slate-800 font-semibold">{closureMetrics.pendingFus} pending follow-ups</strong> in your pipeline
              </p>
            </div>
            {/* Scoping status pill */}
            <div className="flex items-center gap-2">
              {isElevatedUser ? (
                <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-xs text-xs font-bold">
                  <button
                    onClick={() => setScopeMode('mine')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      scopeMode === 'mine' ? 'bg-[#0e6977] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    👤 My Leads ({scopedLeads.length})
                  </button>
                  <button
                    onClick={() => setScopeMode('all')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      scopeMode === 'all' ? 'bg-[#0e6977] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🌐 All Leads ({leads.length})
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>My Workspace: {scopedLeads.length} Leads • {scopedStudents.length} Students</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Golden Target Progress Banner */}
        <div className="bg-gradient-to-r from-[#fff9eb] via-[#fffbeb] to-[#fef3c7] border border-[#fde68a] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-300/60 flex items-center justify-center text-amber-700 flex-shrink-0">
              <Award className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full border border-amber-300/50">
                MONTHLY TARGET • {new Date(`${todayKey}T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }).toUpperCase()}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                {monthlyTarget.value
                  ? `Target ${monthlyTarget.value} admissions • ${admissionsThisMonth} closed this month`
                  : `${admissionsThisMonth} admissions closed this month`}
              </h3>
              <p className="text-xs text-amber-900/80">
                {!monthlyTarget.value
                  ? 'No monthly target set yet — the Head of HR or Admin (Incentive Slabs) sets it.'
                  : admissionsThisMonth >= monthlyTarget.value
                  ? `Goal achieved! ${admissionsThisMonth - monthlyTarget.value} surplus admissions · ₹${progressiveIncentive(admissionsThisMonth, monthlyTarget.value, incentivePolicy?.bands).toLocaleString('en-IN')} incentive earned.`
                  : `${monthlyTarget.value - admissionsThisMonth} more to hit your target — then each extra admission earns incentive.`}
                {monthlyTarget.value && !monthlyTarget.fromHead && ' (Admin default target.)'}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-64 flex flex-col items-end">
            <div className="flex items-center justify-between w-full text-xs font-extrabold text-slate-800 mb-1">
              <span>{admissionsThisMonth} / {monthlyTarget.value || "—"}</span>
              <span className="text-amber-700">{monthlyTarget.value ? `${Math.min(100, Math.round((admissionsThisMonth / monthlyTarget.value) * 100))}%` : "—"}</span>
            </div>
            <div className="w-full h-2.5 bg-amber-200/60 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-[#73C1CC] rounded-full transition-all duration-500" 
                style={{ width: `${monthlyTarget.value ? Math.min(100, Math.round((admissionsThisMonth / monthlyTarget.value) * 100)) : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between w-full mt-1.5 flex-wrap gap-2">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                COLLECTED TODAY: <strong className="text-emerald-700">{closureMetrics.feesCollected}</strong>
              </span>
              <button
                type="button"
                onClick={() => handleTabChange('Fees')}
                className="text-[10px] font-bold text-slate-700 hover:text-[#00897b] transition-colors cursor-pointer flex items-center gap-1"
                title="View Pending Dues in Fees CRM"
              >
                <span>PENDING DUES:</span>
                <strong className="text-amber-800 font-mono">₹{pendingFeesStats.totalBal.toLocaleString('en-IN')}</strong>
                <span className="text-slate-500">({pendingFeesStats.count})</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Metric Cards in a Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1 */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#73C1CC]/70 transition-all flex flex-col justify-between text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                CALLS LOGGED
              </span>
              <div className="w-7 h-7 rounded-full bg-[#e6f7f9] text-[#0e6977] flex items-center justify-center">
                <Phone className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{closureMetrics.callsMade}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">{closureMetrics.connected} connected</div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-400/50 transition-all flex flex-col justify-between text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                FOLLOW-UPS DUE
              </span>
              <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-amber-600">{closureMetrics.pendingFus}</div>
            <div className="text-xs text-rose-500 mt-1 font-bold">{overdueCount} overdue · due today or earlier</div>
          </div>

          {/* Card 3 */}
          <div 
            onClick={() => {
              setBookDemoInitialData(null);
              setShowBookDemoModal(true);
            }}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#73C1CC]/80 transition-all flex flex-col justify-between text-left cursor-pointer group"
            title="Click to schedule a new demo"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                DEMOS BOOKED
              </span>
              <div className="w-7 h-7 rounded-full bg-[#e6f7f9] text-[#0e6977] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{scopedDemos.length}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">{scopedDemos.filter(d => String(d.status).toLowerCase() === 'booked').length} upcoming · {scopedDemos.filter(d => String(d.status).toLowerCase() === 'attended').length} attended</div>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#73C1CC]/70 transition-all flex flex-col justify-between text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                ADMISSIONS • THIS MONTH
              </span>
              <div className="w-7 h-7 rounded-full bg-[#e6f7f9] text-[#0e6977] flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0e6977]">{admissionsThisMonth}</div>
            <div className="text-xs text-[#0e6977] mt-1 font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {scopedStudents.length} enrolled in total
            </div>
          </div>
        </div>

        {/* Two Column Middle Section: Priority Queue & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left: Today's Priority Queue (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between relative">
            
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0e6977] animate-pulse" />
                  <h3 className="text-sm font-bold text-slate-900">Today's Priority Queue</h3>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {closureMetrics.pendingFus} pending in pipeline
                </span>
              </div>

              {/* Queue Items */}
              <div className="space-y-2.5">
                {priorityQueue.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    No urgent calls in queue. Click "+ Add Enquiry" above to record a new student enquiry.
                  </div>
                ) : (
                  priorityQueue.map((item, idx) => (
                    <div 
                      key={item.id || idx}
                      className="p-3 rounded-xl bg-slate-50/60 hover:bg-[#f0fafb] border border-slate-100 hover:border-[#bde6ed] transition-all flex items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold flex-shrink-0 ${
                          item.isOverdue
                            ? 'bg-rose-600 text-white'
                            : item.isNow
                              ? 'bg-[#0e6977] text-white'
                              : 'bg-slate-200/70 text-slate-700'
                        }`}>
                          {item.time}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {item.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            📞 {item.details}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (item.isFeeDue) handleTabChange('Fees');
                          else if (item.leadData?.stage === 'demo_booked') handleTabChange('Demo Desk');
                          else openCallFor(item.leadData);
                        }}
                        className={`px-3 py-1 rounded-full text-[10.5px] tracking-wide flex-shrink-0 transition-all cursor-pointer active:scale-95 ${item.actionStyle}`}
                      >
                        {item.actionText}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Recent Activity (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
                <span className="text-xs text-slate-500 font-medium">Live CRM Feed</span>
              </div>

              {/* Timeline Items */}
              <div className="space-y-3">
                {recentActivities.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No recent activity recorded yet.
                  </div>
                ) : (
                  recentActivities.map((act, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2.5 text-left text-xs">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="text-[11px] font-mono text-slate-400 mt-0.5 flex-shrink-0">
                          {act.time}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 leading-snug truncate">
                            {act.primary}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {act.secondary}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-extrabold flex-shrink-0 uppercase border ${act.tagStyle}`}>
                        {act.tag}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Banner: End-of-Day Closure Card */}
        <div className="bg-[#082228] text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-[#12424b] text-left">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-base">🌙</span>
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                  End-of-Day Closure
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#12424b] text-[#73C1CC] text-[10.5px] font-bold font-mono border border-[#1d5c68]">
                  {todayDisplay}
                </span>
                <span className="text-[10px] text-teal-300 font-semibold bg-white/5 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <span>↺</span>
                  <span>Resets Daily</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Submit your day before logging out. Only activity performed today is counted and rolls up to your Branch Manager's Command Center.
              </p>
            </div>
            {closureSubmitted && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-xl">
                  ✓ Submitted for {todayKey} ({closureSubmittedAt || 'Done'})
                </span>
                <button
                  onClick={() => setClosureSubmitted(false)}
                  className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer"
                >
                  Edit / Update
                </button>
              </div>
            )}
          </div>

          {/* 6 Metric Boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4">
            {/* Box 1: Calls Made */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center transition-all hover:bg-white/10">
              {editingMetric === 'callsMade' ? (
                <input
                  type="number"
                  min="0"
                  autoFocus
                  value={closureMetrics.callsMade}
                  onChange={(e) => setCustomMetrics(prev => ({ ...(prev || closureMetrics), callsMade: Math.max(0, parseInt(e.target.value) || 0) }))}
                  onBlur={() => setEditingMetric(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingMetric(null)}
                  className="w-16 bg-white/20 text-center text-xl font-extrabold text-[#73C1CC] rounded outline-none border border-[#73C1CC] mx-auto block"
                />
              ) : (
                <div 
                  onClick={() => !closureSubmitted && setEditingMetric('callsMade')}
                  className={`text-xl sm:text-2xl font-extrabold text-[#73C1CC] ${!closureSubmitted ? 'cursor-pointer hover:scale-105' : ''} transition-transform`}
                  title={!closureSubmitted ? "Click to correct calls made today" : "Calls made today"}
                >
                  {closureMetrics.callsMade}
                </div>
              )}
              <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">
                CALLS MADE
              </div>
            </div>

            {/* Box 2: Connected */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center transition-all hover:bg-white/10">
              {editingMetric === 'connected' ? (
                <input
                  type="number"
                  min="0"
                  autoFocus
                  value={closureMetrics.connected}
                  onChange={(e) => setCustomMetrics(prev => ({ ...(prev || closureMetrics), connected: Math.max(0, parseInt(e.target.value) || 0) }))}
                  onBlur={() => setEditingMetric(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingMetric(null)}
                  className="w-16 bg-white/20 text-center text-xl font-extrabold text-[#73C1CC] rounded outline-none border border-[#73C1CC] mx-auto block"
                />
              ) : (
                <div 
                  onClick={() => !closureSubmitted && setEditingMetric('connected')}
                  className={`text-xl sm:text-2xl font-extrabold text-[#73C1CC] ${!closureSubmitted ? 'cursor-pointer hover:scale-105' : ''} transition-transform`}
                  title={!closureSubmitted ? "Click to correct connected calls today" : "Connected calls today"}
                >
                  {closureMetrics.connected}
                </div>
              )}
              <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">
                CONNECTED
              </div>
            </div>

            {/* Box 3: Demos Booked */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center transition-all hover:bg-white/10">
              {editingMetric === 'demosBooked' ? (
                <input
                  type="number"
                  min="0"
                  autoFocus
                  value={closureMetrics.demosBooked}
                  onChange={(e) => setCustomMetrics(prev => ({ ...(prev || closureMetrics), demosBooked: Math.max(0, parseInt(e.target.value) || 0) }))}
                  onBlur={() => setEditingMetric(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingMetric(null)}
                  className="w-16 bg-white/20 text-center text-xl font-extrabold text-[#73C1CC] rounded outline-none border border-[#73C1CC] mx-auto block"
                />
              ) : (
                <div 
                  onClick={() => !closureSubmitted && setEditingMetric('demosBooked')}
                  className={`text-xl sm:text-2xl font-extrabold text-[#73C1CC] ${!closureSubmitted ? 'cursor-pointer hover:scale-105' : ''} transition-transform`}
                  title={!closureSubmitted ? "Click to correct demos booked today" : "Demos booked today"}
                >
                  {closureMetrics.demosBooked}
                </div>
              )}
              <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">
                DEMOS BOOKED
              </div>
            </div>

            {/* Box 4: Admissions */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center transition-all hover:bg-white/10">
              {editingMetric === 'admissions' ? (
                <input
                  type="number"
                  min="0"
                  autoFocus
                  value={closureMetrics.admissions}
                  onChange={(e) => setCustomMetrics(prev => ({ ...(prev || closureMetrics), admissions: Math.max(0, parseInt(e.target.value) || 0) }))}
                  onBlur={() => setEditingMetric(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingMetric(null)}
                  className="w-16 bg-white/20 text-center text-xl font-extrabold text-[#73C1CC] rounded outline-none border border-[#73C1CC] mx-auto block"
                />
              ) : (
                <div 
                  onClick={() => !closureSubmitted && setEditingMetric('admissions')}
                  className={`text-xl sm:text-2xl font-extrabold text-[#73C1CC] ${!closureSubmitted ? 'cursor-pointer hover:scale-105' : ''} transition-transform`}
                  title={!closureSubmitted ? "Click to correct admissions done today" : "Admissions done today"}
                >
                  {closureMetrics.admissions}
                </div>
              )}
              <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">
                ADMISSIONS
              </div>
            </div>

            {/* Box 5: Fees Collected */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center transition-all hover:bg-white/10">
              {editingMetric === 'feesCollected' ? (
                <input
                  type="number"
                  min="0"
                  step="1000"
                  autoFocus
                  value={closureMetrics.rawFeesCollected}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value) || 0);
                    setCustomMetrics(prev => ({ ...(prev || closureMetrics), feesCollected: val, rawFeesCollected: val }));
                  }}
                  onBlur={() => setEditingMetric(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingMetric(null)}
                  className="w-24 bg-white/20 text-center text-lg font-extrabold text-white rounded outline-none border border-white/40 mx-auto block font-mono"
                />
              ) : (
                <div 
                  onClick={() => !closureSubmitted && setEditingMetric('feesCollected')}
                  className={`text-xl sm:text-2xl font-extrabold text-white ${!closureSubmitted ? 'cursor-pointer hover:scale-105' : ''} transition-transform font-mono`}
                  title={!closureSubmitted ? "Click to correct fees collected today" : "Fees collected today"}
                >
                  {closureMetrics.feesCollected}
                </div>
              )}
              <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">
                FEES COLLECTED
              </div>
            </div>

            {/* Box 6: Pending Follow-ups */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center transition-all hover:bg-white/10">
              {editingMetric === 'pendingFus' ? (
                <input
                  type="number"
                  min="0"
                  autoFocus
                  value={closureMetrics.pendingFus}
                  onChange={(e) => setCustomMetrics(prev => ({ ...(prev || closureMetrics), pendingFus: Math.max(0, parseInt(e.target.value) || 0) }))}
                  onBlur={() => setEditingMetric(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingMetric(null)}
                  className="w-16 bg-white/20 text-center text-xl font-extrabold text-amber-400 rounded outline-none border border-amber-400 mx-auto block"
                />
              ) : (
                <div 
                  onClick={() => !closureSubmitted && setEditingMetric('pendingFus')}
                  className={`text-xl sm:text-2xl font-extrabold text-amber-400 ${!closureSubmitted ? 'cursor-pointer hover:scale-105' : ''} transition-transform`}
                  title={!closureSubmitted ? "Click to correct pending follow-ups due today" : "Pending follow-ups due today"}
                >
                  {closureMetrics.pendingFus}
                </div>
              )}
              <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">
                PENDING FUS
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs">
            <div className="text-slate-400 flex items-center gap-1.5">
              <span>✏️</span>
              <span>Tap any number to correct it before submitting.</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleDailyClosureSubmit}
                disabled={closureSubmitted}
                className={`px-4 py-2 rounded-xl ${
                  closureSubmitted 
                    ? 'bg-emerald-700/80 text-white cursor-default' 
                    : 'bg-[#0e6977] hover:bg-[#0a4f5a] text-white shadow-md active:scale-[0.98] cursor-pointer'
                } font-bold text-xs flex items-center gap-1.5 transition-all`}
              >
                <span>{closureSubmitted ? `Closure Submitted (${closureSubmittedAt || 'Done'}) ✓` : "Submit Today's Closure →"}</span>
              </button>
              <span className="text-[11px] text-slate-400">
                Tomorrow's priority: {overdueCount} overdue follow-ups + {feePendingCount} fee-pending students
              </span>
            </div>
          </div>
        </div>
        </>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto text-2xl font-bold">
              📂
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">{activeTab}</h2>
              <p className="text-xs text-slate-500 mt-1">
                This module is integrated with the Central Academic & Counselling Network.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => handleTabChange('Pipeline & Follow-ups')}
                className="px-4 py-2 rounded-xl bg-[#7c3aed] text-white text-xs font-bold shadow-xs hover:bg-[#6d28d9] transition-all"
              >
                Open Pipeline & Follow-ups ({scopedLeads.length} Leads)
              </button>
              <button
                onClick={() => handleTabChange('Home')}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Back to Home Dashboard
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Lead Call Modal */}
      <LeadCallModal
        isOpen={Boolean(selectedCallLead)}
        onClose={() => setSelectedCallLead(null)}
        leadData={selectedCallLead}
        currentUser={currentUser}
        onSave={async (data) => {
          const leadId = selectedCallLead?._id || selectedCallLead?.id;
          if (!leadId) {
            showToast('Could not save — this record has no database ID.');
            return;
          }
          const isStudent = Boolean(selectedCallLead.isStudent);
          let updatedLead = null;

          if (isStudent) {
            try {
              const updatedStudent = await updateStudent(leadId, {
                phone: data.leadForm?.phone,
                whatsappNumber: data.leadForm?.whatsappNumber,
                notes: data.notes
              });
              setStudents((prev) => prev.map((s) => ((s._id || s.id || s.studentId) === leadId ? { ...s, ...updatedStudent } : s)));
            } catch (err) {
              console.warn('Student update notice:', err.message);
            }
          } else {
            // Latest copy of the lead, so two calls in a row both count
            const freshLead = leads.find((l) => (l._id || l.id) === leadId) || selectedCallLead.leadData || {};
            const update = {
              callCount: (freshLead.callCount ?? selectedCallLead.callCount ?? 0) + 1,
              lastCallTime: new Date().toISOString(),
              notes: data.notes || undefined,
              followUpNote: data.notes || undefined,
              followUpDate: data.followUpDate || undefined,
              followUpTime: data.followUpTime || undefined,
              ...(data.leadForm ? {
                fullName: data.leadForm.name || undefined,
                name: data.leadForm.name || undefined,
                phone: data.leadForm.phone || undefined,
                whatsappNumber: data.leadForm.whatsappNumber || undefined,
                age: data.leadForm.age || undefined,
                gender: data.leadForm.gender || undefined,
                education: data.leadForm.education || undefined,
                currentRole: data.leadForm.currentRole || undefined,
                category: data.leadForm.currentRole || undefined,
                experienceYrs: data.leadForm.experienceYrs || undefined,
                location: data.leadForm.location || undefined,
                course: data.leadForm.course || undefined,
                budget: data.leadForm.budget || undefined,
                batchTiming: data.leadForm.batchTiming || undefined,
                decisionStatus: data.leadForm.decisionStatus || undefined,
                source: data.leadForm.source || undefined,
                sourceName: data.leadForm.source || undefined,
                branch: data.leadForm.branch || undefined,
                fetchedBy: data.leadForm.fetchedBy || undefined,
                allocatedTo: data.leadForm.allocatedTo || undefined,
                counselorAssigned: data.leadForm.allocatedTo || undefined,
              } : {})
            };
            if (data.stage) update.stage = data.stage;
            // Strip undefined keys so we never overwrite real saved values with nothing
            Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

            updatedLead = await updateLead(leadId, update);
            setLeads((prev) => prev.map((l) => ((l._id || l.id) === leadId ? updatedLead : l)));
          }

          // Record call into today's local log for instant daily closure reactivity
          const newCallEntry = {
            id: leadId,
            time: new Date().toISOString(),
            outcome: data.outcome,
            duration: data.durationSeconds || 0,
            connected: data.outcome !== 'Not Reachable'
          };
          setTodayCallLogs((prev) => [newCallEntry, ...prev]);
          logCall({ leadId, leadName: data.leadForm?.name || selectedCallLead?.name || '', outcome: data.outcome, durationSeconds: data.durationSeconds || 0 })
            .catch(() => showToast('⚠ Call saved on the record, but the daily call counter could not be updated'));

          showToast(`✓ Call outcome saved for ${data.leadForm?.name || selectedCallLead.name} (${data.outcome}, ${Math.round(data.durationSeconds || 0)}s)`);

          // "Will Join" → straight into registration, pre-filled from the lead
          if (String(data.outcome || '').startsWith('Will Join') && updatedLead?.stage !== 'admitted') {
            setSelectedCallLead(null);
            setAdmittingLead(updatedLead);
          }
        }}
      />

      {/* Lead → Student registration (pipeline "Admit", call outcome "Will Join") */}
      {admittingLead && (
        <CompleteRegistrationModal
          key={admittingLead._id || admittingLead.id}
          isOpen
          onClose={() => setAdmittingLead(null)}
          currentUser={currentUser}
          existingStudents={students}
          initialData={{
            fullName: admittingLead.fullName || admittingLead.name || '',
            phone: admittingLead.phone || '',
            email: admittingLead.email || '',
            location: admittingLead.location || '',
            qualification: admittingLead.education || '',
            passoutYear: admittingLead.passoutYear || '',
            source: admittingLead.sourceName || admittingLead.source || '',
            courseName: admittingLead.course || '',
            branchName: admittingLead.branch || branchShort || '',
            leadBranch: admittingLead.branch || '',
            batchTiming: admittingLead.batchTiming || ''
          }}
          onSubmit={handleAdmitSubmit}
        />
      )}

      {/* Book New Demo Modal */}
      <BookNewDemoModal
        isOpen={showBookDemoModal}
        onClose={() => setShowBookDemoModal(false)}
        currentUser={currentUser}
        initialData={bookDemoInitialData || { location: branchShort || 'Gandhipuram' }}
        onConfirm={handleBookDemoSubmit}
      />

      {/* Add New Lead Modal */}
      {studentLogin && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Student login created</h3>
            <p className="text-xs text-slate-500">{studentLogin.name} has been added to Users. Share these dashboard credentials with the student.</p>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1.5 font-mono">
              <div><span className="text-slate-400">Email: </span><span className="font-bold text-slate-900">{studentLogin.email}</span></div>
              <div><span className="text-slate-400">Password: </span><span className="font-bold text-slate-900">{studentLogin.password}</span></div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { try { navigator.clipboard.writeText(`Email: ${studentLogin.email}\nPassword: ${studentLogin.password}`); } catch (_) {} }}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
              >Copy</button>
              <button
                onClick={() => {
                  const text = `Hi ${studentLogin.name}, welcome to Thoughtflows! Your student dashboard login\nEmail: ${studentLogin.email}\nPassword: ${studentLogin.password}`;
                  redirectToWhatsAppWeb(studentLogin.phone, text);
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >Send via WhatsApp</button>
            </div>
            <button onClick={() => setStudentLogin(null)} className="w-full py-2 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold">Done</button>
          </div>
        </div>
      )}

      <AddLeadModal
        isOpen={showAddLeadModal}
        onClose={() => setShowAddLeadModal(false)}
        onAddLead={handleAddLeadSubmit}
      />
    </div>
  );
}
