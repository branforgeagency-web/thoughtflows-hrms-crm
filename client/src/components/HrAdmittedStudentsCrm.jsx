import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Share2, 
  UserPlus, 
  Download, 
  Search, 
  Sparkles, 
  Check, 
  ExternalLink, 
  Plus, 
  Settings, 
  GraduationCap,
  Calendar,
  DollarSign,
  IndianRupee,
  Mail,
  Phone,
  FileText,
  MessageSquare,
  BookOpen,
  Briefcase,
  Edit2,
  Trash2,
  Filter,
  X
} from 'lucide-react';
import StudentProfileModal from './StudentProfileModal';
import CompleteRegistrationModal from './CompleteRegistrationModal';
import EditStudentModal from './EditStudentModal';
import BulkAdmitStudentsModal from './BulkAdmitStudentsModal';
import PaginationBar from './PaginationBar';

import { getStudents, getStudentFilterOptions, createStudent, updateStudent, deleteStudent, resetStudentLogin, onDataUpdate } from '../services/api';
import { getCurrentMonthYear, getCurrentMonthName, localDateKey } from '../utils/dateUtils';
import { copyToClipboard } from '../utils/clipboard';
import { redirectToWhatsAppWeb } from '../utils/whatsapp';

function FilterSelect({ label, k, options, allLabel = 'All', value, onChange }) {
  const on = Boolean(value);
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(k, e.target.value)}
        className={`w-full bg-white border rounded-lg px-2 py-1.5 text-[11px] font-semibold outline-none focus:border-[#00897b] transition-all cursor-pointer ${on ? 'border-[#00897b] text-[#00695c] bg-teal-50/60' : 'border-slate-200 text-slate-700'}`}
      >
        <option value="">{allLabel}</option>
        {/* keep a picked value visible even if it is not in the current list */}
        {on && !(options || []).some((v) => (typeof v === 'string' ? v : v.value) === value) && (
          <option value={value}>{value}</option>
        )}
        {(options || []).map((v) => {
          const opt = typeof v === 'string' ? { value: v, label: v } : v;
          return <option key={opt.value} value={opt.value}>{opt.label}</option>;
        })}
      </select>
    </label>
  );
}

export default function HrAdmittedStudentsCrm({
  students: propStudents,
  onRefreshStudents,
  currentUser,
  onStudentLogin,
  onCallStudent,
  page: propPage,
  totalPages: propTotalPages,
  totalCount: propTotalCount,
  limit: propLimit = 50,
  totalStats: propTotalStats,
  onLimitChange,
  onPageChange,
  onFiltersChange,
  lockedBranch = '',
  lockedHr = false,
  loading: propLoading = false
}) {
  // Show new / reset portal credentials in the persistent card owned by the HR dashboard
  const shareLogin = (st, login) => {
    if (login?.password && onStudentLogin) onStudentLogin({ name: st.name, phone: st.phone, email: login.email, password: login.password });
  };
  const handleResetLogin = async (e, st) => {
    e.stopPropagation();
    try {
      const login = await resetStudentLogin(st.studentId || st._id);
      shareLogin(st, login);
      if (!onStudentLogin) showToast(`Login for ${st.name}: ${login.email} / ${login.password}`);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Could not reset the login');
    }
  };
  const [activeTabFilter, setActiveTabFilter] = useState('all'); // all, in_course, placed, on_hold
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showCompleteRegModal, setShowCompleteRegModal] = useState(false);
  const [showBulkAdmit, setShowBulkAdmit] = useState(false);
  const [completeRegInitialData, setCompleteRegInitialData] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [students, setStudents] = useState(propStudents || []);
  const [localPage, setLocalPage] = useState(1);
  const [localTotalPages, setLocalTotalPages] = useState(1);
  const [localTotalCount, setLocalTotalCount] = useState(0);
  const [localStats, setLocalStats] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const isLoading = Boolean(propLoading || localLoading);

  // ---- Table filters (branch, HR, course, ...) — applied on the server so they
  // cover every page, not just the rows currently loaded
  const EMPTY_FILTERS = {
    branch: '', hrName: '', course: '', mode: '', batchTiming: '', source: '',
    feeFilter: '', certified: '', placementStatus: '', examStatus: '', dateFrom: '', dateTo: ''
  };
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filterOptions, setFilterOptions] = useState(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const serverFiltering = Boolean(onFiltersChange) || propStudents === undefined;
  const standaloneParamsRef = useRef({});
  const setFilter = (key, value) => setFilters((cur) => ({
    ...cur,
    [key]: value,
    // a different branch has different HRs
    ...(key === 'branch' ? { hrName: '' } : {})
  }));
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const clearAllFilters = () => { setFilters(EMPTY_FILTERS); setSearchQuery(''); setActiveTabFilter('all'); };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleConfirmDeleteStudent = async () => {
    if (!deletingStudent) return;
    setIsDeleting(true);
    try {
      const targetId = deletingStudent._id || deletingStudent.id || deletingStudent.studentId;
      await deleteStudent(targetId);
      setStudents(prev => prev.filter(s => (s._id || s.id || s.studentId) !== targetId));
      showToast(`✓ Removed student ${deletingStudent.name}`);
      setDeletingStudent(null);
      if (onRefreshStudents) onRefreshStudents();
    } catch (err) {
      console.error('Failed to delete student:', err);
      showToast(`⚠ ${err?.response?.data?.error || 'Could not delete student'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchStandaloneStudents = (targetPage = localPage) => {
    const params = {
      ...(currentUser?.name ? { hrName: currentUser.name } : {}),
      ...standaloneParamsRef.current,
      page: targetPage,
      limit: propLimit,
      withStats: 'true'
    };
    setLocalLoading(true);
    getStudents(params).then(res => {
      if (Array.isArray(res)) {
        setStudents(res);
        setLocalTotalCount(res.length);
        setLocalTotalPages(1);
      } else if (res && Array.isArray(res.students)) {
        setStudents(res.students);
        setLocalTotalCount(res.totalCount ?? res.students.length);
        setLocalTotalPages(res.totalPages || 1);
        setLocalStats(res.stats || null);
      }
    }).catch(err => console.error('Error fetching students:', err))
      .finally(() => setLocalLoading(false));
  };

  useEffect(() => {
    if (propStudents !== undefined) {
      setStudents(propStudents);
    } else {
      fetchStandaloneStudents(localPage);
    }
  }, [propStudents, currentUser?.name, localPage]);
 
  useEffect(() => {
    const unsub = onDataUpdate((entity) => {
      if (entity === 'students') {
        if (onRefreshStudents) {
          onRefreshStudents();
        } else {
          fetchStandaloneStudents(localPage);
        }
      }
    });
    return () => unsub();
  }, [onRefreshStudents, currentUser?.name, localPage]);

  // Send filters / search / card pick to the server whenever they change
  const firstFilterRun = useRef(true);
  useEffect(() => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (!v) return;
      if (k === 'branch' && lockedBranch) return;
      if (k === 'hrName' && lockedHr) return;
      params[k] = v;
    });
    if (debouncedSearch) params.search = debouncedSearch;
    if (activeTabFilter && activeTabFilter !== 'all') params.view = activeTabFilter;
    if (firstFilterRun.current) {
      firstFilterRun.current = false;
      if (!Object.keys(params).length) return; // first load already done by the parent
    }
    if (onFiltersChange) {
      onFiltersChange(params);
    } else if (propStudents === undefined) {
      standaloneParamsRef.current = params;
      if (localPage !== 1) setLocalPage(1);
      else fetchStandaloneStudents(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, debouncedSearch, activeTabFilter, lockedBranch, lockedHr]);

  // Dropdown values (only what this user may see; HRs follow the chosen branch)
  useEffect(() => {
    let alive = true;
    const branch = lockedBranch || filters.branch;
    getStudentFilterOptions(branch ? { branch } : {})
      .then((o) => { if (alive) setFilterOptions(o || null); })
      .catch((err) => console.error('Filter options failed:', err));
    return () => { alive = false; };
  }, [lockedBranch, filters.branch, currentUser?.name]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ID generator calculator state
  const [idGen, setIdGen] = useState({
    company: 'TF',
    branch: 'S', // S - Saravanampatti, H - Hopes, R - RS Puram
    course: 'C', // C - CPC, I - IPDRG, X - CIC
    type: 'O',   // O - Online, C - Classroom
    month: 'Y',  // Y - May
    year: '6',   // 6 - 2026
    serial: '006'
  });

  const generatedId = `${idGen.company}${idGen.branch}${idGen.course}${idGen.type}${idGen.month}${idGen.year}${idGen.serial}`;


  const handleExportCsv = () => {
    const headers = [
      'STUDENT ID', 'NAME', 'CONTACT', 'COURSE', 'BRANCH', 'HR NAME', 'BATCH TIMING',
      'QUALIFICATION', 'COLLEGE/COMPANY', 'EMAIL', 'SOURCE', 'ONBOARD', 'SYLLABUS',
      'PLACED', 'FEE'
    ];
    const rows = students.map(s => [
      s.id, s.name, s.phone, s.course, s.mode, s.hrName, s.batchTiming,
      s.qualification, s.collegeCompany, s.email, s.source, s.onboardStatus, s.syllabusModule,
      s.placementStatus, s.feeAmount
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(i => `"${i}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Thoughtflows_Admitted_Students_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Exported CSV for TF Billing 2');
  };

  const handleShareLink = async () => {
    // Generate the official student registration form link
    const regUrl = `${window.location.origin}/register${
      currentUser?.name
        ? `?hr=${encodeURIComponent(currentUser.name)}${currentUser?.branch ? `&branch=${encodeURIComponent(currentUser.branch)}` : ''}`
        : ''
    }`;

    const success = await copyToClipboard(regUrl);
    if (success) {
      setCopiedLink(true);
      showToast('✓ Registration form link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      prompt('Copy student registration form link:', regUrl);
    }
  };

  // Filter students (Supports Name, ID, Phone, Course, Email, and Txn ID / Receipt No)
  const filteredStudents = serverFiltering ? students : students.filter(s => {
    // Filters from the overview cards
    if (activeTabFilter === 'admitted_month') {
      const created = s.createdAt ? new Date(s.createdAt) : null;
      const now = new Date();
      if (!created || isNaN(created.getTime()) || created.getMonth() !== now.getMonth() || created.getFullYear() !== now.getFullYear()) return false;
    }
    if (activeTabFilter === 'onboarding_done' || activeTabFilter === 'onboarding_progress') {
      const m = /^(\d+)\s*\/\s*(\d+)/.exec(s.onboardStatus || '');
      const done = Boolean(m && m[1] === m[2]);
      if (activeTabFilter === 'onboarding_done' ? !done : done) return false;
    }
    if (activeTabFilter === 'interviewing' && !/interview/i.test(s.placementStatus || '')) return false;
    if (activeTabFilter === 'in_course' && s.statusGroup !== 'in_course') return false;
    if (activeTabFilter === 'placed' && s.statusGroup !== 'placed') return false;
    if (activeTabFilter === 'on_hold' && s.statusGroup !== 'on_hold') return false;
    if (activeTabFilter === 'fee_pending') {
      const fee = Number(s.courseFee) || 0;
      const paid = Number(s.paidAmount) || 0;
      const bal = (s.pendingBalance != null && !isNaN(Number(s.pendingBalance))) ? Number(s.pendingBalance) : Math.max(0, fee - paid);
      const isPending = bal > 0 || (s.feeStatus && s.feeStatus.toLowerCase().includes('pending'));
      if (!isPending) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const basicMatch = (s.name || '').toLowerCase().includes(q) 
        || (s.studentId || s.id || '').toLowerCase().includes(q) 
        || (s.phone || '').includes(q)
        || (s.course || '').toLowerCase().includes(q)
        || (s.email || '').toLowerCase().includes(q);

      if (basicMatch) return true;

      const receipts = Array.isArray(s.receipts) ? s.receipts : [];
      return receipts.some(r =>
        (r.reference || '').toLowerCase().includes(q) ||
        (r.receiptNo || r.id || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Real, derived overview stats — every number below comes from the
  // actual students array, never a hardcoded placeholder.
  const stats = useMemo(() => {
    const now = new Date();
    const admittedThisMonth = students.filter((s) => {
      const created = s.createdAt ? new Date(s.createdAt) : null;
      return (
        created &&
        !isNaN(created.getTime()) &&
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      );
    }).length;

    const onboardingDone = students.filter((s) => {
      const m = /^(\d+)\s*\/\s*(\d+)/.exec(s.onboardStatus || '');
      return m && m[1] === m[2];
    }).length;

    const inCourse = students.filter((s) => s.statusGroup === 'in_course').length;
    const placed = students.filter((s) => s.statusGroup === 'placed').length;
    const onHold = students.filter((s) => s.statusGroup === 'on_hold').length;
    const interviewing = students.filter((s) => /interview/i.test(s.placementStatus || '')).length;
    const feePending = students.filter((s) => {
      const fee = Number(s.courseFee) || 0;
      const paid = Number(s.paidAmount) || 0;
      const bal = (s.pendingBalance != null && !isNaN(Number(s.pendingBalance))) ? Number(s.pendingBalance) : Math.max(0, fee - paid);
      return bal > 0 || (s.feeStatus && s.feeStatus.toLowerCase().includes('pending'));
    }).length;

    // Server totals across every page when we have them; this page's numbers otherwise
    const serverTotals = propStudents !== undefined ? propTotalStats : localStats;
    if (serverTotals && typeof serverTotals.total === 'number') return serverTotals;

    return {
      total: students.length,
      admittedThisMonth,
      onboardingDone,
      onboardingInProgress: students.length - onboardingDone,
      inCourse,
      placed,
      onHold,
      interviewing,
      feePending
    };
  }, [students, propStudents, propTotalStats, localStats]);

  const currentMonthLabel = new Date().toLocaleString('en-US', { month: 'long' }).toUpperCase();

  // Clicking a card shows those students in the table below (click again to clear)
  const CARD_FILTER_LABELS = {
    admitted_month: `Admitted in ${new Date().toLocaleString('en-US', { month: 'long' })}`,
    onboarding_done: 'Onboarding done',
    onboarding_progress: 'Onboarding in progress',
    interviewing: 'Interviewing'
  };
  const pickCard = (key) => {
    setActiveTabFilter((cur) => (cur === key ? 'all' : key));
    setTimeout(() => {
      const el = document.getElementById('admitted-students-table');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-emerald-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Title & Subtitle */}
      <div className="pt-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Admitted <span className="text-[#00897b]">Students</span> <span className="text-slate-500 font-medium">· CRM</span>
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1 font-mono">
          Auto-filled from registration forms · same columns as your Hopes Branch sheet - {getCurrentMonthYear()}
        </p>
      </div>

      {/* Action Banner: New Student Registration */}
      <div className="bg-[#00796b] text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">📝</span>
            <h3 className="font-extrabold text-sm sm:text-base tracking-tight">New Student Registration</h3>
          </div>
          <p className="text-xs text-teal-100/90 mt-1">
            Online students: send the link. Walk-ins: fill on this device. Branch Manager exports CSV for TF Billing 2.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleShareLink}
            title="Copy student registration form link to clipboard"
            className={`flex items-center gap-1.5 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer ${
              copiedLink
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 ring-2 ring-emerald-400/30'
                : 'bg-white hover:bg-teal-50 text-slate-900'
            }`}
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-800 font-extrabold">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-700" />
                <span>Share Link</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              setCompleteRegInitialData(null);
              setShowCompleteRegModal(true);
            }}
            className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <span>✨</span>
            <span>+ Add New Student (Walk-In)</span>
          </button>

          <button
            onClick={() => setShowBulkAdmit(true)}
            title="Upload admitted students from the branch admission sheet (paste from Google Sheets or CSV)"
            className="flex items-center gap-1.5 bg-white hover:bg-teal-50 text-slate-900 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-700" />
            <span>Bulk Upload</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-teal-300" />
            <span>Export for Billing</span>
          </button>
        </div>
      </div>

      {/* Notice text */}
      <div className="text-center text-[11px] text-slate-400 font-mono py-0.5">
        No new registrations yet · share the link or use Walk-in to add one
      </div>

      {/* Student ID Format Strip (Dark Navy) */}
      <div className="bg-[#0f172a] text-white rounded-2xl p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-[9.5px] font-mono uppercase tracking-widest text-teal-300">
            STUDENT ID FORMAT · TFSMC0Y6001
          </div>
          <div className="text-xs font-mono font-bold text-slate-200">
            TF · Branch · Course · Type · Month · Year · Serial
          </div>
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 flex-wrap">
            <span>Example:</span>
            <span className="bg-[#00897b] text-white px-2 py-0.5 rounded font-black text-[10px]">
              TFSCOY6001
            </span>
            <span>= TF (company) - S Saravanampatti - C CPC - O Online - Y May - 6 2026 - serial 001</span>
          </div>
        </div>

        <button
          onClick={() => {
            setCompleteRegInitialData(null);
            setShowCompleteRegModal(true);
          }}
          className="flex-shrink-0 flex items-center gap-1.5 bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all self-start md:self-auto cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Register New Student</span>
        </button>
      </div>

      {/* 4 Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1 */}
        <div role="button" tabIndex={0} onClick={() => pickCard('admitted_month')} onKeyDown={(e) => e.key === 'Enter' && pickCard('admitted_month')}
          title="Click to show these students"
          className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-cyan-500 flex flex-col justify-between cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all ${activeTabFilter === 'admitted_month' ? 'ring-2 ring-[#00897b] ring-offset-1' : ''}`}>
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            ADMITTED · {currentMonthLabel}
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 my-2">
            {stats.admittedThisMonth}
          </div>
          <div className="text-xs text-emerald-600 font-mono font-medium">
            auto-pulled from forms
          </div>
        </div>

        {/* Card 2 */}
        <div role="button" tabIndex={0} onClick={() => pickCard('onboarding_done')} onKeyDown={(e) => e.key === 'Enter' && pickCard('onboarding_done')}
          title="Click to show these students"
          className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-teal-500 flex flex-col justify-between cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all ${activeTabFilter === 'onboarding_done' ? 'ring-2 ring-[#00897b] ring-offset-1' : ''}`}>
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            ONBOARDING DONE
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 my-2">
            {stats.onboardingDone}
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); pickCard('onboarding_progress'); }}
            className={`self-start text-xs font-mono font-medium hover:underline cursor-pointer ${activeTabFilter === 'onboarding_progress' ? 'text-[#00897b] font-bold underline' : 'text-emerald-600'}`}>
            {stats.onboardingInProgress} in progress
          </button>
        </div>

        {/* Card 3 */}
        <div role="button" tabIndex={0} onClick={() => pickCard('in_course')} onKeyDown={(e) => e.key === 'Enter' && pickCard('in_course')}
          title="Click to show these students"
          className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-cyan-600 flex flex-col justify-between cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all ${activeTabFilter === 'in_course' ? 'ring-2 ring-[#00897b] ring-offset-1' : ''}`}>
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            IN COURSE
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 my-2">
            {stats.inCourse}
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); pickCard('on_hold'); }}
            className={`self-start text-xs font-mono font-medium hover:underline cursor-pointer ${activeTabFilter === 'on_hold' ? 'text-[#00897b] font-bold underline' : 'text-emerald-600'}`}>
            {stats.onHold} on hold
          </button>
        </div>

        {/* Card 4 */}
        <div role="button" tabIndex={0} onClick={() => pickCard('placed')} onKeyDown={(e) => e.key === 'Enter' && pickCard('placed')}
          title="Click to show these students"
          className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-teal-600 flex flex-col justify-between cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all ${activeTabFilter === 'placed' ? 'ring-2 ring-[#00897b] ring-offset-1' : ''}`}>
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            PLACED
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 my-2">
            {stats.placed}
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); pickCard('interviewing'); }}
            className={`self-start text-xs font-mono font-medium hover:underline cursor-pointer ${activeTabFilter === 'interviewing' ? 'text-[#00897b] font-bold underline' : 'text-emerald-600'}`}>
            {stats.interviewing} interviewing
          </button>
        </div>
      </div>

      {/* Filter Row & Search */}
      {CARD_FILTER_LABELS[activeTabFilter] && (
        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-full bg-[#00897b] text-white font-bold">
            Showing: {CARD_FILTER_LABELS[activeTabFilter]} · {serverFiltering ? (propTotalCount ?? localTotalCount) : filteredStudents.length}
          </span>
          <button type="button" onClick={() => setActiveTabFilter('all')} className="text-slate-500 hover:text-slate-800 font-semibold underline cursor-pointer">Clear</button>
        </div>
      )}
      <div id="admitted-students-table" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTabFilter('all')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTabFilter === 'all'
                ? 'bg-[#00897b] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>All Students</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              activeTabFilter === 'all' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {stats.total}
            </span>
          </button>

          <button
            onClick={() => setActiveTabFilter('in_course')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTabFilter === 'in_course'
                ? 'bg-[#00897b] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>In Course</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              activeTabFilter === 'in_course' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {stats.inCourse}
            </span>
          </button>

          <button
            onClick={() => setActiveTabFilter('placed')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTabFilter === 'placed'
                ? 'bg-[#00897b] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>Placed</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              activeTabFilter === 'placed' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {stats.placed}
            </span>
          </button>

          <button
            onClick={() => setActiveTabFilter('on_hold')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTabFilter === 'on_hold'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100/60'
            }`}
          >
            <span>On Hold</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              activeTabFilter === 'on_hold' ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-800'
            }`}>
              {stats.onHold}
            </span>
          </button>

          <button
            onClick={() => setActiveTabFilter('fee_pending')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTabFilter === 'fee_pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100/70'
            }`}
          >
            <IndianRupee className="w-3 h-3" />
            <span>Fee Pending</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              activeTabFilter === 'fee_pending' ? 'bg-white/25 text-white' : 'bg-amber-200/90 text-amber-950 font-black'
            }`}>
              {stats.feePending}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, mobile, txn ID / UTR..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#00897b] transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Filter bar — branch, HR, course and more (server-side, all pages) */}
      {(() => {
        const o = filterOptions || {};
        const selCls = (on) => `w-full bg-white border rounded-lg px-2 py-1.5 text-[11px] font-semibold outline-none focus:border-[#00897b] transition-all cursor-pointer ${on ? 'border-[#00897b] text-[#00695c] bg-teal-50/60' : 'border-slate-200 text-slate-700'}`;
        const showBranch = o.canFilterBranch && !lockedBranch;
        const showHr = o.canFilterHr && !lockedHr;
        return (
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
                <Filter className="w-3.5 h-3.5 text-[#00897b]" />
                <span>Filters</span>
                {lockedBranch && (
                  <span className="text-[10px] font-semibold text-slate-500">· {lockedBranch} branch</span>
                )}
                {activeFilterCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#00897b] text-white font-bold">{activeFilterCount} on</span>
                )}
              </div>
              {(activeFilterCount > 0 || searchQuery || activeTabFilter !== 'all') && (
                <button type="button" onClick={clearAllFilters} className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer">
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5">
              {showBranch && <FilterSelect value={filters.branch} onChange={setFilter} label="Branch" k="branch" options={o.branches} allLabel="All branches" />}
              {showHr && <FilterSelect value={filters.hrName} onChange={setFilter} label="HR" k="hrName" options={o.hrs} allLabel="All HRs" />}
              <FilterSelect value={filters.course} onChange={setFilter} label="Course" k="course" options={o.courses} allLabel="All courses" />
              <FilterSelect value={filters.mode} onChange={setFilter} label="Mode" k="mode" options={o.modes} allLabel="Online & Classroom" />
              <FilterSelect value={filters.batchTiming} onChange={setFilter} label="Batch Timing" k="batchTiming" options={o.batchTimings} allLabel="All timings" />
              <FilterSelect value={filters.source} onChange={setFilter} label="Mode of Source" k="source" options={o.sources} allLabel="All sources" />
              <FilterSelect value={filters.feeFilter} onChange={setFilter} label="Fee" k="feeFilter" options={[{ value: 'pending', label: 'Fee pending' }, { value: 'cleared', label: 'Fully paid' }]} allLabel="All" />
              <FilterSelect value={filters.certified} onChange={setFilter} label="Certified" k="certified" options={o.certified} allLabel="All" />
              <FilterSelect value={filters.placementStatus} onChange={setFilter} label="Placement" k="placementStatus" options={o.placementStatus} allLabel="All" />
              <FilterSelect value={filters.examStatus} onChange={setFilter} label="Exam" k="examStatus" options={o.examStatus} allLabel="All" />
              <label className="flex flex-col gap-1 min-w-0">
                <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500">Admitted from</span>
                <input type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(e) => setFilter('dateFrom', e.target.value)} className={selCls(Boolean(filters.dateFrom))} />
              </label>
              <label className="flex flex-col gap-1 min-w-0">
                <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500">Admitted to</span>
                <input type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(e) => setFilter('dateTo', e.target.value)} className={selCls(Boolean(filters.dateTo))} />
              </label>
            </div>
          </div>
        );
      })()}

      {/* CRM Student Records Data Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                <th className="py-3 px-3">Student ID</th>
                <th className="py-3 px-3">Name · Contact</th>
                <th className="py-3 px-3">Course · Branch · Obj</th>
                <th className="py-3 px-3">HR Name</th>
                <th className="py-3 px-3">Batch Timing</th>
                <th className="py-3 px-3">Qualification</th>
                <th className="py-3 px-3">College / Company · Location</th>
                <th className="py-3 px-3">Mail ID</th>
                <th className="py-3 px-3">DOB</th>
                <th className="py-3 px-3">Mode of Source</th>
                <th className="py-3 px-3">Onboard</th>
                <th className="py-3 px-3">Syllabus</th>
                <th className="py-3 px-3">Mock Int.</th>
                <th className="py-3 px-3">Exam Booked · Fee</th>
                <th className="py-3 px-3">Certified</th>
                <th className="py-3 px-3">Placed</th>
                <th className="py-3 px-3">Fee</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {filteredStudents.map((s, idx) => (
                <tr 
                  key={s._id || s.id || s.studentId || idx} 
                  onClick={() => setSelectedStudent(s)}
                  className="hover:bg-teal-50/60 cursor-pointer transition-colors group"
                  title={`Click to view full profile for ${s.name}`}
                >
                  {/* Student ID */}
                  <td className="py-3 px-3 font-mono font-bold text-[#00897b] whitespace-nowrap group-hover:underline">
                    {s.studentId || s.id}
                  </td>

                  {/* Name · Contact */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-extrabold text-slate-900 group-hover:text-[#00796b] transition-colors">{s.name}</div>
                    <div className="text-[10.5px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                      <span>{s.phone}</span>
                      {s.phone && (
                        <div className="inline-flex items-center gap-1 opacity-75 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onCallStudent) {
                                onCallStudent(s);
                              }
                            }}
                            className="p-1 rounded-md bg-[#00897b]/10 hover:bg-[#00897b] text-[#00897b] hover:text-white transition-colors"
                            title={`Student Details, Questions & Recording - ${s.name}`}
                          >
                            <FileText className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              redirectToWhatsAppWeb(s.whatsappNumber || s.phone);
                            }}
                            className="p-1 rounded-md bg-[#25d366]/15 hover:bg-[#25d366] text-[#25d366] hover:text-white transition-colors"
                            title={`WhatsApp ${s.name}`}
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {s.whatsappNumber && s.whatsappNumber !== s.phone && (
                      <span className="text-[9.5px] text-emerald-600 block font-semibold font-mono">WA: {s.whatsappNumber}</span>
                    )}
                  </td>

                  {/* Course · Branch · Obj */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-bold text-slate-800">{s.course}</div>
                    <div className="text-[10px] text-slate-500">{s.mode} · {s.batchDate}</div>
                  </td>

                  {/* HR Name */}
                  <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                    {s.hrName}
                  </td>

                  {/* Batch Timing */}
                  <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                    {s.batchTiming ? (
                      s.batchTiming.includes('·') ? (
                        <>
                          <div className="font-semibold text-slate-800 text-xs">
                            {s.batchTiming.split('·')[0].trim()}
                          </div>
                          <div className="text-[10px] font-medium text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            {s.batchTiming.split('·').slice(1).join('·').trim()}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-semibold text-slate-800 text-xs">{s.batchTiming.split(' ')[0]}</div>
                          <div className="text-[9.5px] text-slate-400">{s.batchTiming.split(' ').slice(1).join(' ')}</div>
                        </>
                      )
                    ) : (
                      <span className="text-slate-400 text-xs italic">—</span>
                    )}
                  </td>

                  {/* Qualification */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-semibold text-slate-800">{s.qualification}</div>
                    <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded">
                      {s.qualTag}
                    </span>
                  </td>

                  {/* College / Company */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-medium text-slate-800">{s.collegeCompany}</div>
                    <div className="text-[10px] text-slate-400">{s.location}</div>
                  </td>

                  {/* Mail ID */}
                  <td className="py-3 px-3 font-mono text-[10.5px] text-slate-500 whitespace-nowrap">
                    {s.email}
                  </td>

                  {/* DOB */}
                  <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                    <div>{s.dob}</div>
                    <div className="text-[9.5px] text-slate-400">Enq: {s.enqDate}</div>
                  </td>

                  {/* Mode of Source */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="bg-purple-100 text-purple-800 text-[9.5px] font-bold px-2 py-0.5 rounded-md">
                      {s.source}
                    </span>
                  </td>

                  {/* Onboard */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                      {s.onboardStatus}
                    </span>
                  </td>

                  {/* Syllabus */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="bg-amber-100 text-amber-900 text-[9.5px] font-bold px-2 py-0.5 rounded-md">
                      {s.syllabusModule}
                    </span>
                  </td>

                  {/* Mock Interview */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                      String(s.mockInterview || '').includes('Cleared')
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {s.mockInterview || 'Not Scheduled'}
                    </span>
                  </td>

                  {/* Exam Booked · Fee */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <select
                      value={s.examStatus || 'Not Booked'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={async (e) => {
                        e.stopPropagation();
                        const val = e.target.value;
                        const studentIdentifier = s._id || s.studentId || s.id;
                        setStudents(prev => prev.map(item => {
                          const isMatch = (s._id && item._id === s._id) || 
                                          (s.studentId && item.studentId === s.studentId) || 
                                          (s.id && item.id === s.id);
                          return isMatch ? { ...item, examStatus: val } : item;
                        }));
                        showToast(`✓ ${s.name} Exam status updated`);
                        try {
                          if (studentIdentifier) {
                            await updateStudent(studentIdentifier, { examStatus: val });
                            if (onRefreshStudents) onRefreshStudents();
                          }
                        } catch (err) {
                          console.error('Failed to update student examStatus:', err);
                          showToast(`⚠ Failed to save: ${err?.response?.data?.error || err.message}`);
                        }
                      }}
                      className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10.5px] text-slate-700 outline-none cursor-pointer focus:border-teal-500"
                    >
                      <option value="Not Booked">Not Booked ⌵</option>
                      <option value="AAPC CPC Booked">AAPC CPC Booked</option>
                      <option value="Exam Scheduled">Exam Scheduled</option>
                      {/* CCCP writes course-specific statuses (e.g. "CPC Exam Written") — keep them visible */}
                      {s.examStatus && !['Not Booked', 'AAPC CPC Booked', 'Exam Scheduled'].includes(s.examStatus) && (
                        <option value={s.examStatus}>{s.examStatus}</option>
                      )}
                    </select>
                  </td>

                  {/* Certified */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                      String(s.certified || '').includes('Certified')
                        ? 'bg-emerald-100 text-emerald-800 font-bold'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {s.certified || 'Non-Certified'}
                    </span>
                  </td>

                  {/* Placed */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      String(s.placementStatus || '').includes('Placed')
                        ? 'bg-emerald-100 text-emerald-800'
                        : /interview/i.test(String(s.placementStatus || ''))
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-600'
                    }`}>
                      {s.placementStatus || 'In Progress'}
                    </span>
                  </td>

                  {/* Fee */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {(() => {
                      const courseFee = Number(s.courseFee) || 0;
                      const paid = Number(s.paidAmount) || 0;
                      const bal = (s.pendingBalance != null && !isNaN(Number(s.pendingBalance))) ? Number(s.pendingBalance) : Math.max(0, courseFee - paid);
                      const today = localDateKey();
                      const isOverdue = bal > 0 && s.nextDueDate && s.nextDueDate <= today;

                      if (bal > 0) {
                        return (
                          <div>
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-800 border border-rose-200 font-extrabold'
                                : 'bg-amber-100 text-amber-900 border border-amber-200'
                            }`}>
                              {isOverdue ? 'Overdue' : 'Due'}: ₹{bal.toLocaleString('en-IN')}
                            </span>
                            <div className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                              Paid: ₹{paid.toLocaleString('en-IN')} {courseFee > 0 && `of ₹${courseFee.toLocaleString('en-IN')}`}
                            </div>
                            {s.nextDueDate && (
                              <div className={`text-[9px] font-bold mt-0.5 ${isOverdue ? 'text-rose-600 font-mono' : 'text-slate-400'}`}>
                                Due: {s.nextDueDate}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div>
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {s.feeStatus || 'Paid in Full'}
                          </span>
                          {courseFee > 0 && (
                            <div className="text-[9.5px] text-emerald-700 font-mono mt-0.5">
                              ₹{courseFee.toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>

                  {/* Actions: Edit + Portal login */}
                  <td className="py-3 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingStudent(s);
                        }}
                        className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-[#00897b] text-[#00897b] hover:text-white border border-[#00897b]/30 hover:border-[#00897b] transition-all cursor-pointer shadow-2xs active:scale-95"
                        title={`Edit details for ${s.name}`}
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleResetLogin(e, s)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Create or reset this student's dashboard password"
                      >
                        Login
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingStudent(s);
                        }}
                        className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 transition-all cursor-pointer shadow-2xs active:scale-95"
                        title={`Delete admitted student ${s.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={18} className="py-10 text-center text-xs text-slate-500 font-semibold">
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2 text-[#00897b] font-bold">
                        <span className="w-4 h-4 border-2 border-[#00897b] border-t-transparent rounded-full animate-spin" />
                        Loading admitted students…
                      </span>
                    ) : (
                      <>
                        No students match these filters.
                        {(activeFilterCount > 0 || searchQuery || activeTabFilter !== 'all') && (
                          <button type="button" onClick={clearAllFilters} className="ml-2 text-[#00897b] underline font-bold cursor-pointer">Clear filters</button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Student Modal */}
      {editingStudent && (
        <EditStudentModal
          isOpen={!!editingStudent}
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSuccess={(updated) => {
            setStudents(prev => prev.map(item => {
              const match = (item._id && item._id === updated._id) || 
                            (item.studentId && item.studentId === updated.studentId) ||
                            (item.id && item.id === updated.id);
              return match ? { ...item, ...updated } : item;
            }));
            showToast(`✓ Updated details for ${updated.name}`);
            if (onRefreshStudents) onRefreshStudents();
          }}
          onDelete={(targetId) => {
            setStudents(prev => prev.filter(s => (s._id || s.id || s.studentId) !== targetId));
            showToast('✓ Admitted student removed');
            if (onRefreshStudents) onRefreshStudents();
          }}
        />
      )}

      {/* Bulk admission upload */}
      {showBulkAdmit && (
        <BulkAdmitStudentsModal
          isOpen={showBulkAdmit}
          currentUser={currentUser}
          onClose={() => setShowBulkAdmit(false)}
          onDone={(results) => {
            const n = results.filter((r) => r.ok).length;
            if (onRefreshStudents) onRefreshStudents(); else fetchStandaloneStudents(localPage);
            showToast(`✓ Bulk upload: ${n} student${n === 1 ? '' : 's'} admitted`);
          }}
        />
      )}

      {/* Complete Your Registration Modal */}
      {showCompleteRegModal && (
        <CompleteRegistrationModal
          isOpen={showCompleteRegModal}
          onClose={() => {
            setShowCompleteRegModal(false);
            setCompleteRegInitialData(null);
          }}
          initialData={completeRegInitialData}
          currentUser={currentUser}
          existingStudents={students}
        onSubmit={async (studentRecord) => {
          try {
            const created = await createStudent(studentRecord);
            const savedStudent = created || studentRecord;
            setStudents(prev => [savedStudent, ...prev]);
            if (onRefreshStudents) onRefreshStudents();
            shareLogin(savedStudent, created?.studentLogin);
            if (created?.studentLogin?.created) {
              showToast(`✓ Admitted ${savedStudent.name}! Login Created — Email: ${created.studentLogin.email} | Pass: ${created.studentLogin.password}`);
            } else {
              showToast(`✓ Admitted ${savedStudent.name} (${savedStudent.studentId || savedStudent.id}) & saved to CRM!`);
            }
          } catch (err) {
            console.error('Failed to create admitted student:', err);
            showToast(`⚠ Not saved: ${err?.response?.data?.error || err.message}`);
            throw err;
          }
        }}
      />
      )}

      {/* Student Profile Modal */}
      <StudentProfileModal
        isOpen={Boolean(selectedStudent)}
        onClose={() => setSelectedStudent(null)}
        student={selectedStudent}
        onUpdateStudent={(updated) => {
          setSelectedStudent(updated);
          setStudents(prev => prev.map(s => (s._id === updated._id || s.studentId === updated.studentId) ? { ...s, ...updated } : s));
          if (onRefreshStudents) onRefreshStudents();
        }}
        onDeleteStudent={(targetId) => {
          setSelectedStudent(null);
          setStudents(prev => prev.filter(s => (s._id || s.id || s.studentId) !== targetId));
          showToast('✓ Admitted student removed');
          if (onRefreshStudents) onRefreshStudents();
        }}
      />

      <PaginationBar
        page={propPage ?? localPage}
        totalPages={propTotalPages ?? localTotalPages}
        totalCount={propTotalCount ?? localTotalCount}
        limit={propLimit}
        itemLabel="students"
        onPageChange={(nextPage) => {
          if (onPageChange) onPageChange(nextPage);
          else setLocalPage(nextPage);
        }}
        onLimitChange={onLimitChange}
      />

      {/* Delete Student Confirmation Modal */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-left animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Delete Admitted Student</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete admitted student <strong className="text-slate-900">{deletingStudent.name}</strong> (<span className="font-mono font-bold text-teal-700">{deletingStudent.studentId || deletingStudent.id}</span>)? All associated records will be removed.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Student'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
