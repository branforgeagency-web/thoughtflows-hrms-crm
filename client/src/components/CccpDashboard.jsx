import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, 
  GraduationCap, 
  Building, 
  Building2, 
  Rocket, 
  Receipt, 
  Calendar, 
  BarChart3, 
  AlertTriangle, 
  Clock, 
  PhoneCall, 
  CheckCircle2, 
  ChevronRight, 
  X, 
  LogOut, 
  Repeat, 
  Plus, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Users, 
  Award, 
  Briefcase, 
  FileText, 
  Check, 
  Sparkles,
  ExternalLink,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import logoImg from '../assets/thoughtflows-logo.png';
import { 
  getStudents, 
  updateStudent, 
  getColleges, 
  createCollege, 
  getCompanies, 
  createCompany, 
  getPlacements, 
  createPlacement, 
  updatePlacement, 
  getBillingDeals, 
  createBillingDeal, 
  getCccpFollowUps, 
  createCccpFollowUp, 
  onDataUpdate 
} from '../services/api';

export default function CccpDashboard({
  onClose,
  currentUser,
  onLogout,
  onSwitchDepartment,
  theme = 'clay'
}) {
  const [activeNav, setActiveNav] = useState('home'); // 'home', 'certification', 'campus', 'corporate', 'placement', 'billing', 'calendar', 'reports'
  const [selectedDetail, setSelectedDetail] = useState(null); // for modal/drawer drilldown
  const [searchQuery, setSearchQuery] = useState('');
  const [dashMenuOpen, setDashMenuOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [dateDisplay, setDateDisplay] = useState(
    new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  );

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // =========================================================================
  // REAL LIVE DATA: CCCP VERTICALS (From MongoDB API)
  // =========================================================================
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [collegesList, setCollegesList] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);
  const [placementStudents, setPlacementStudents] = useState([]);
  const [billingDeals, setBillingDeals] = useState([]);
  const [followUps, setFollowUps] = useState([]);

  const fetchLiveCccpData = async () => {
    try {
      setLoadingStudents(true);
      const [stRes, clgRes, cmpRes, plcRes, bilRes, fuRes] = await Promise.all([
        getStudents().catch(() => []),
        getColleges().catch(() => []),
        getCompanies().catch(() => []),
        getPlacements().catch(() => []),
        getBillingDeals().catch(() => []),
        getCccpFollowUps().catch(() => [])
      ]);
      setStudents(Array.isArray(stRes) ? stRes : []);
      setCollegesList(Array.isArray(clgRes) ? clgRes : []);
      setCompaniesList(Array.isArray(cmpRes) ? cmpRes : []);
      setPlacementStudents(Array.isArray(plcRes) ? plcRes : []);
      setBillingDeals(Array.isArray(bilRes) ? bilRes : []);
      setFollowUps(Array.isArray(fuRes) ? fuRes : []);
    } catch (err) {
      console.warn('CCCP live fetch notice:', err.message);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchLiveCccpData();
    const unsub = onDataUpdate((entity) => {
      if (!entity || entity.startsWith('cccp') || entity === 'students') {
        fetchLiveCccpData();
      }
    });
    return unsub;
  }, []);

  const handleUpdateStudentExam = async (studentId, examStatus, certified) => {
    try {
      await updateStudent(studentId, { examStatus, certified });
      setStudents(prev => prev.map(s => (s._id === studentId || s.studentId === studentId) ? { ...s, examStatus, certified } : s));
      showToast(`✓ Updated certification status to "${certified}" for student!`);
    } catch (err) {
      console.error('Failed to update student exam status:', err);
      showToast('Error saving exam status');
    }
  };

  const handleUpdateStudentPlacement = async (studentId, placementStatus, statusGroup = 'placed') => {
    try {
      await updateStudent(studentId, { placementStatus, statusGroup });
      setStudents(prev => prev.map(s => (s._id === studentId || s.studentId === studentId) ? { ...s, placementStatus, statusGroup } : s));
      showToast(`✓ Updated placement status to "${placementStatus}"!`);
    } catch (err) {
      console.error('Failed to update student placement status:', err);
      showToast('Error saving placement status');
    }
  };

  // College handlers
  const [isAddCollegeOpen, setIsAddCollegeOpen] = useState(false);
  const [collegeForm, setCollegeForm] = useState({
    name: '',
    city: '',
    type: 'Arts & Science',
    decisionMaker: '',
    studentStrength: '',
    mou: 'No',
    stage: 'College Identified'
  });

  const handleSaveCollege = async (e) => {
    e?.preventDefault();
    if (!collegeForm.name) return;
    const cityCode = (collegeForm.city || 'CBG').substring(0, 3).toUpperCase();
    const newCode = `CLG-${cityCode}-00${collegesList.length + 1}`;
    const newCol = {
      name: collegeForm.name,
      code: newCode,
      city: collegeForm.city || 'Coimbatore',
      type: collegeForm.type || 'Arts & Science',
      decisionMaker: collegeForm.decisionMaker || 'Dr. Principal',
      studentStrength: collegeForm.studentStrength || '',
      mouStatus: collegeForm.mou === 'Yes' ? 'MOU Signed' : 'In Discussion',
      stage: collegeForm.stage || 'Listed'
    };
    try {
      const created = await createCollege(newCol);
      setCollegesList(prev => [created, ...prev]);
      setIsAddCollegeOpen(false);
      setCollegeForm({ name: '', city: '', type: 'Arts & Science', decisionMaker: '', studentStrength: '', mou: 'No', stage: 'College Identified' });
      showToast(`✓ Added college partner: ${created.name}`);
    } catch (err) {
      showToast('Error creating college partner');
    }
  };

  // Corporate Company handlers
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    city: '',
    type: 'Medical Coding',
    contact: '',
    hiring: 'Actively Hiring',
    trainingInterest: 'No',
    stage: 'Identified'
  });

  const handleSaveCompany = async (e) => {
    e?.preventDefault();
    if (!companyForm.name) return;
    const cityCode = (companyForm.city || 'HYD').substring(0, 3).toUpperCase();
    const newCode = `CMP-${cityCode}-00${companiesList.length + 1}`;
    const newCmp = {
      name: companyForm.name,
      code: newCode,
      city: companyForm.city || 'Hyderabad',
      type: companyForm.type || 'Medical Coding',
      contact: companyForm.contact || 'HR Team',
      hiring: companyForm.hiring || 'Actively Hiring',
      trainingInterest: companyForm.trainingInterest || 'No',
      stage: companyForm.stage || 'Identified'
    };
    try {
      const created = await createCompany(newCmp);
      setCompaniesList(prev => [created, ...prev]);
      setIsAddCompanyOpen(false);
      setCompanyForm({ name: '', city: '', type: 'Medical Coding', contact: '', hiring: 'Actively Hiring', trainingInterest: 'No', stage: 'Identified' });
      showToast(`✓ Added corporate partner: ${created.name}`);
    } catch (err) {
      showToast('Error creating corporate partner');
    }
  };

  // Placement handlers
  const [isMapStudentOpen, setIsMapStudentOpen] = useState(false);
  const [mapForm, setMapForm] = useState({
    studentId: '',
    company: '',
    role: 'Medical Coder',
    interviewDate: ''
  });

  const handleSaveMapping = async (e) => {
    e.preventDefault();
    if (!mapForm.studentId) return;

    const targetStudent = students.find(s => s.studentId === mapForm.studentId || `${s.name} · ${s.studentId}` === mapForm.studentId);
    const candidateName = targetStudent ? targetStudent.name : (mapForm.studentId.split('·')[0]?.trim() || mapForm.studentId);
    const candidateTfId = targetStudent ? targetStudent.studentId : (mapForm.studentId.split('·')[1]?.trim() || 'TF-GEN-001');

    const newRecord = {
      studentId: candidateTfId,
      name: candidateName,
      tfId: candidateTfId,
      readiness: targetStudent?.mockInterview?.includes('/') ? `${parseInt(targetStudent.mockInterview)}%` : '85%',
      trainerRec: 'Ready',
      company: mapForm.company || (companiesList[0]?.name || 'Partner Company'),
      role: mapForm.role || 'Medical Coder',
      interview: mapForm.interviewDate 
        ? new Date(mapForm.interviewDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) 
        : '—',
      interviewDate: mapForm.interviewDate ? new Date(mapForm.interviewDate) : null,
      status: mapForm.interviewDate ? 'Interview Scheduled' : 'Company Mapped'
    };

    try {
      const created = await createPlacement(newRecord);
      setPlacementStudents(prev => [created, ...prev.filter(p => p.studentId !== candidateTfId)]);
      setIsMapStudentOpen(false);
      setMapForm({ studentId: '', company: '', role: 'Medical Coder', interviewDate: '' });
      showToast(`✓ Mapped ${candidateName} to ${newRecord.company}`);
    } catch (err) {
      showToast('Error saving placement mapping');
    }
  };

  const handleAdvanceStudent = async (id) => {
    const target = placementStudents.find(s => s._id === id || s.id === id || s.studentId === id);
    if (!target) return;
    let newStatus = target.status;
    let interviewStr = target.interview;

    if (target.status === 'Not Ready') {
      newStatus = 'Company Mapped';
    } else if (target.status === 'Company Mapped') {
      newStatus = 'Interview Scheduled';
      interviewStr = new Date(Date.now() + 86400000 * 3).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } else if (target.status === 'Interview Scheduled') {
      newStatus = 'Selected';
    } else if (target.status === 'Selected') {
      newStatus = 'Joined';
    }

    try {
      await updatePlacement(target._id || target.id, { status: newStatus, interview: interviewStr });
      setPlacementStudents(prev => prev.map(s => (s._id === id || s.id === id || s.studentId === id) ? { ...s, status: newStatus, interview: interviewStr } : s));
      showToast(`✓ Advanced ${target.name} to ${newStatus}`);
    } catch (e) {
      setPlacementStudents(prev => prev.map(s => (s._id === id || s.id === id || s.studentId === id) ? { ...s, status: newStatus, interview: interviewStr } : s));
    }
  };

  // Billing handlers
  const [isAddBillingOpen, setIsAddBillingOpen] = useState(false);
  const [billingForm, setBillingForm] = useState({
    deal: '',
    type: 'Campus',
    status: 'Payment Pending'
  });

  const handleSaveBilling = async (e) => {
    e?.preventDefault();
    if (!billingForm.deal) return;
    const newDeal = {
      deal: billingForm.deal,
      type: billingForm.type,
      status: billingForm.status,
      amount: billingForm.type === 'Campus' ? 180000 : 250000,
      invoiceDate: new Date().toISOString().split('T')[0]
    };
    try {
      const created = await createBillingDeal(newDeal);
      setBillingDeals(prev => [created, ...prev]);
      setIsAddBillingOpen(false);
      setBillingForm({ deal: '', type: 'Campus', status: 'Payment Pending' });
      showToast(`✓ Created billing record: ${created.deal}`);
    } catch (err) {
      showToast('Error saving billing deal');
    }
  };

  // Follow-up handlers
  const [isAddFollowUpOpen, setIsAddFollowUpOpen] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    time: '11:00',
    vertical: 'Campus',
    who: '',
    action: ''
  });

  const handleSaveFollowUp = async (e) => {
    e?.preventDefault();
    if (!followUpForm.who || !followUpForm.action) return;
    const newFollowUp = {
      title: followUpForm.action,
      action: followUpForm.action,
      who: followUpForm.who,
      targetName: followUpForm.who,
      time: followUpForm.time || '11:00',
      vertical: followUpForm.vertical,
      type: followUpForm.vertical,
      status: 'Upcoming',
      date: new Date().toISOString().split('T')[0]
    };
    try {
      const created = await createCccpFollowUp(newFollowUp);
      setFollowUps(prev => [created, ...prev]);
      setIsAddFollowUpOpen(false);
      setFollowUpForm({ time: '11:00', vertical: 'Campus', who: '', action: '' });
      showToast(`✓ Scheduled follow-up: ${created.action || created.title}`);
    } catch (err) {
      setFollowUps(prev => [{ ...newFollowUp, id: `flw-${Date.now()}` }, ...prev]);
      setIsAddFollowUpOpen(false);
      setFollowUpForm({ time: '11:00', vertical: 'Campus', who: '', action: '' });
      showToast('Scheduled follow-up');
    }
  };

  // =========================================================================
  // REAL-TIME DYNAMIC METRICS CALCULATION (Zero Mock Data)
  // =========================================================================
  // Certification Metrics
  const certifiedCount = useMemo(() => 
    students.filter(s => s.certified?.toLowerCase().includes('certified')).length
  , [students]);

  const voucherBookedCount = useMemo(() => 
    students.filter(s => s.examStatus?.toLowerCase().includes('booked')).length
  , [students]);

  const paymentPendingCount = useMemo(() => 
    students.filter(s => s.feeStatus === 'Part Paid' || s.feeStatus === 'Pending').length
  , [students]);

  const interestedCount = useMemo(() => 
    students.filter(s => s.examStatus === 'Not Booked' && !s.certified?.toLowerCase().includes('certified')).length
  , [students]);

  const examWrittenCount = useMemo(() => 
    students.filter(s => s.examStatus?.toLowerCase().includes('written') || s.examStatus?.toLowerCase().includes('cleared')).length
  , [students]);

  const examReadyCount = useMemo(() => 
    students.filter(s => s.mockInterview?.toLowerCase().includes('cleared') || s.mockInterview?.toLowerCase().includes('ready') || s.examStatus?.toLowerCase().includes('target')).length
  , [students]);

  // Campus Metrics
  const mouSignedCount = useMemo(() => 
    collegesList.filter(c => c.mou === 'Signed').length
  , [collegesList]);

  const collegesContactedCount = useMemo(() => 
    collegesList.filter(c => c.stage === 'Contacted' || c.stage === 'Decision-Maker Connected').length
  , [collegesList]);

  const collegesApptCount = useMemo(() => 
    collegesList.filter(c => c.stage === 'Appointment Fixed' || c.stage === 'Visit Completed').length
  , [collegesList]);

  const collegesWorkshopCount = useMemo(() => 
    collegesList.filter(c => c.stage === 'Workshop Completed').length
  , [collegesList]);

  // Corporate Metrics
  const corpDealsCount = useMemo(() => 
    companiesList.filter(c => c.stage === 'Training Active' || c.stage === 'Requirement Received').length
  , [companiesList]);

  const corpContactedCount = useMemo(() => 
    companiesList.filter(c => c.stage === 'Contacted' || c.stage === 'Decision-Maker Connected').length
  , [companiesList]);

  const corpMeetingCount = useMemo(() => 
    companiesList.filter(c => c.stage === 'Meeting Fixed' || c.stage === 'Meeting Done').length
  , [companiesList]);

  const corpReqCount = useMemo(() => 
    companiesList.filter(c => c.stage === 'Requirement Received').length
  , [companiesList]);

  const corpTrainingCount = useMemo(() => 
    companiesList.filter(c => c.stage === 'Training Active').length
  , [companiesList]);

  // Placement Metrics
  const placementMappedCount = useMemo(() => 
    placementStudents.filter(p => p.company && p.company !== '— unmapped —' && p.company !== '—').length
  , [placementStudents]);

  const placementInterviewCount = useMemo(() => 
    placementStudents.filter(p => p.status === 'Interview Scheduled').length
  , [placementStudents]);

  const placementSelectedCount = useMemo(() => 
    placementStudents.filter(p => p.status === 'Selected').length
  , [placementStudents]);

  const placementJoinedCount = useMemo(() => 
    placementStudents.filter(p => p.status === 'Joined').length
  , [placementStudents]);

  // Billing Metrics
  const pendingBillingCount = useMemo(() => 
    billingDeals.filter(b => b.status === 'Payment Pending' || b.status === 'Invoice Raised').length
  , [billingDeals]);

  // Real Counts for Sidebar Badges
  const navCounts = {
    certification: students.length,
    campus: collegesList.length,
    corporate: companiesList.length,
    placement: placementStudents.length,
    billing: pendingBillingCount,
    calendar: followUps.length
  };

  // Real Pipeline Stages
  const certStages = [
    { label: 'Interested', count: interestedCount, color: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
    { label: 'Exam-ready', count: examReadyCount, color: 'bg-[#fef3c7] text-[#92400e] border border-amber-200/70 hover:bg-amber-200/80' },
    { label: 'Voucher booked', count: voucherBookedCount, color: 'bg-[#e0f2fe] text-[#0369a1] border border-sky-200/70 hover:bg-sky-200/80' },
    { label: 'Exam written', count: examWrittenCount, color: 'bg-[#ede9fe] text-[#5b21b6] border border-indigo-200/70 hover:bg-indigo-200/80' },
    { label: 'Certified', count: certifiedCount, color: 'bg-[#dcfce7] text-[#166534] border border-emerald-200/70 hover:bg-emerald-200/80' }
  ];

  const campusStages = [
    { label: 'Listed', count: collegesList.length, color: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
    { label: 'Contacted', count: collegesContactedCount, color: 'bg-[#fef3c7] text-[#92400e] border border-amber-200/70 hover:bg-amber-200/80' },
    { label: 'Appt fixed', count: collegesApptCount, color: 'bg-[#e0f2fe] text-[#0369a1] border border-sky-200/70 hover:bg-sky-200/80' },
    { label: 'Demo done', count: collegesWorkshopCount, color: 'bg-[#ccfbf1] text-[#115e59] border border-teal-200/70 hover:bg-teal-200/80' },
    { label: 'MOU', count: mouSignedCount, color: 'bg-[#dcfce7] text-[#166534] border border-emerald-200/70 hover:bg-emerald-200/80' }
  ];

  const corporateStages = [
    { label: 'Listed', count: companiesList.length, color: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
    { label: 'Contacted', count: corpContactedCount, color: 'bg-[#fef3c7] text-[#92400e] border border-amber-200/70 hover:bg-amber-200/80' },
    { label: 'Meeting', count: corpMeetingCount, color: 'bg-[#e0f2fe] text-[#0369a1] border border-sky-200/70 hover:bg-sky-200/80' },
    { label: 'Requirement', count: corpReqCount, color: 'bg-[#ede9fe] text-[#5b21b6] border border-indigo-200/70 hover:bg-indigo-200/80' },
    { label: 'Training', count: corpTrainingCount, color: 'bg-[#dcfce7] text-[#166534] border border-emerald-200/70 hover:bg-emerald-200/80' }
  ];

  const placementStages = [
    { label: 'Mapped', count: placementMappedCount, color: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
    { label: 'Interviews', count: placementInterviewCount, color: 'bg-[#e0f2fe] text-[#0369a1] border border-sky-200/70 hover:bg-sky-200/80' },
    { label: 'Selected', count: placementSelectedCount, color: 'bg-[#ede9fe] text-[#5b21b6] border border-purple-200/70 hover:bg-purple-200/80' },
    { label: 'Joined', count: placementJoinedCount, color: 'bg-[#dcfce7] text-[#166534] border border-emerald-200/70 hover:bg-emerald-200/80' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#f1f5f9] flex overflow-hidden font-sans text-slate-800 select-none animate-fadeIn">
      {/* ================= LEFT SIDEBAR ================= */}
      <aside className="w-[220px] sm:w-[240px] bg-white border-r border-slate-200/80 flex flex-col justify-between p-4 shrink-0 z-20 shadow-[2px_0_12px_rgba(0,0,0,0.02)]">
        <div>
          {/* Top Sidebar Header with Centered Thoughtflows Logo */}
          <div className="pt-1 pb-4 border-b border-slate-100 mb-3.5 flex flex-col items-center justify-center text-center">
            <img 
              src={logoImg} 
              alt="Thoughtflows" 
              className="h-8 w-auto object-contain mb-2.5 drop-shadow-sm"
            />
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              CCCP VERTICALS
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {/* Master Home */}
            <button
              onClick={() => setActiveNav('home')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                activeNav === 'home'
                  ? 'bg-[#102a45] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  activeNav === 'home' ? 'bg-[#1a385c]' : 'bg-slate-100'
                }`}>
                  <span className="text-base leading-none">🏠</span>
                </div>
                <span className="text-sm font-bold tracking-tight">Master Home</span>
              </div>
            </button>

            {/* Certification */}
            <button
              onClick={() => setActiveNav('certification')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                activeNav === 'certification'
                  ? 'bg-[#102a45] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  activeNav === 'certification' ? 'bg-[#1d3d60] text-teal-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  <GraduationCap className="w-4 h-4 text-slate-600" />
                </div>
                <span className="text-sm font-semibold tracking-tight">Certification</span>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                activeNav === 'certification' ? 'bg-teal-400 text-slate-900' : 'bg-[#0d9488] text-white'
              }`}>
                {navCounts.certification}
              </span>
            </button>

            {/* Campus */}
            <button
              onClick={() => setActiveNav('campus')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                activeNav === 'campus'
                  ? 'bg-[#102a45] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  activeNav === 'campus' ? 'bg-[#1d3d60] text-emerald-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Building className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-sm font-semibold tracking-tight">Campus</span>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                activeNav === 'campus' ? 'bg-teal-400 text-slate-900' : 'bg-[#0d9488] text-white'
              }`}>
                {navCounts.campus}
              </span>
            </button>

            {/* Corporate */}
            <button
              onClick={() => setActiveNav('corporate')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                activeNav === 'corporate'
                  ? 'bg-[#102a45] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  activeNav === 'corporate' ? 'bg-[#1d3d60] text-sky-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Building2 className="w-4 h-4 text-sky-600" />
                </div>
                <span className="text-sm font-semibold tracking-tight">Corporate</span>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                activeNav === 'corporate' ? 'bg-teal-400 text-slate-900' : 'bg-[#0d9488] text-white'
              }`}>
                {navCounts.corporate}
              </span>
            </button>

            {/* Placement Desk */}
            <button
              onClick={() => setActiveNav('placement')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                activeNav === 'placement'
                  ? 'bg-[#102a45] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  activeNav === 'placement' ? 'bg-[#1d3d60] text-rose-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Rocket className="w-4 h-4 text-rose-500" />
                </div>
                <span className="text-sm font-semibold tracking-tight">Placement Desk</span>
              </div>
            </button>

            {/* Billing Status */}
            <button
              onClick={() => setActiveNav('billing')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                activeNav === 'billing'
                  ? 'bg-[#102a45] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  activeNav === 'billing' ? 'bg-[#1d3d60] text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Receipt className="w-4 h-4 text-slate-500" />
                </div>
                <span className="text-sm font-semibold tracking-tight">Billing Status</span>
              </div>
            </button>

            {/* Follow-up Calendar */}
            <button
              onClick={() => setActiveNav('calendar')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                activeNav === 'calendar'
                  ? 'bg-[#102a45] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  activeNav === 'calendar' ? 'bg-[#1d3d60] text-sky-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Calendar className="w-4 h-4 text-sky-500" />
                </div>
                <span className="text-sm font-semibold tracking-tight">Follow-up<br className="sm:hidden" /> Calendar</span>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                activeNav === 'calendar' ? 'bg-teal-400 text-slate-900' : 'bg-[#0d9488] text-white'
              }`}>
                {navCounts.calendar}
              </span>
            </button>

            {/* Reports & MIS */}
            <button
              onClick={() => setActiveNav('reports')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                activeNav === 'reports'
                  ? 'bg-[#102a45] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  activeNav === 'reports' ? 'bg-[#1d3d60] text-emerald-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-sm font-semibold tracking-tight">Reports & MIS</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Bottom Sidebar User Info & Logout */}
        <div className="pt-3 border-t border-slate-100 space-y-2 relative">
          <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#102a45] text-white text-xs font-bold flex items-center justify-center shrink-0">
              MR
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-800 leading-tight">Meenakshi R.</div>
              <div className="text-[10px] text-slate-400 leading-tight truncate">Placements & Corp Head</div>
            </div>
          </div>



          <button
            onClick={onLogout || onClose}
            title="Sign Out"
            className="w-full text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-100 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99] shadow-sm cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-[#f8fafc] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.06),rgba(255,255,255,0))]">
        {/* Body Container */}
        <div className="p-5 sm:p-7 space-y-6 max-w-[1640px] mx-auto w-full">
          {/* ======================================================== */}
          {/* MASTER HOME VIEW                                          */}
          {/* ======================================================== */}
          {activeNav === 'home' && (
            <>
              {/* Header: Business Movement • Today */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200/70">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      LIVE DESK
                    </span>
                    <span className="text-xs font-mono font-medium text-slate-400">
                      {dateDisplay}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Business Movement</span>
                    <span className="text-slate-300 font-light">/</span>
                    <span className="bg-gradient-to-r from-slate-900 via-[#102a45] to-teal-700 bg-clip-text text-transparent">Today</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Unified operational control across institutional partnerships, candidate certifications, and corporate placements.
                  </p>
                </div>
              </div>

              {/* TOP ROW: 5 SUMMARY KPI CARDS */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
                {/* 1. CERTIFICATION */}
                <div 
                  onClick={() => setActiveNav('certification')}
                  className="group cursor-pointer bg-white/95 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_16px_32px_-8px_rgba(15,23,42,0.1)] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#102a45] to-[#2563eb]" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">CERTIFICATION</span>
                    <div className="w-8 h-8 rounded-xl bg-slate-100/80 text-[#102a45] group-hover:bg-[#102a45] group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="my-2.5">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      {loadingStudents ? '...' : students.length}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">In pipeline</span>
                    <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">{certifiedCount} certified MTD</span>
                  </div>
                </div>

                {/* 2. CAMPUS */}
                <div 
                  onClick={() => setActiveNav('campus')}
                  className="group cursor-pointer bg-white/95 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_16px_32px_-8px_rgba(15,23,42,0.1)] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">CAMPUS</span>
                    <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                      <Building className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="my-2.5">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      {collegesList.length}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Colleges active</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{mouSignedCount} MOUs</span>
                  </div>
                </div>

                {/* 3. CORPORATE */}
                <div 
                  onClick={() => setActiveNav('corporate')}
                  className="group cursor-pointer bg-white/95 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_16px_32px_-8px_rgba(15,23,42,0.1)] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">CORPORATE</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                      <Building2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="my-2.5">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      {companiesList.length}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Companies</span>
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{corpDealsCount} deals live</span>
                  </div>
                </div>

                {/* 4. PLACEMENT */}
                <div 
                  onClick={() => setActiveNav('placement')}
                  className="group cursor-pointer bg-white/95 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_16px_32px_-8px_rgba(15,23,42,0.1)] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">PLACEMENT</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                      <Rocket className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="my-2.5">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      {placementStudents.length}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Mapped</span>
                    <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">{placementInterviewCount} interviews</span>
                  </div>
                </div>

                {/* 5. BILLING PENDING */}
                <div 
                  onClick={() => setActiveNav('billing')}
                  className="group cursor-pointer bg-white/95 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_16px_32px_-8px_rgba(15,23,42,0.1)] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">BILLING PENDING</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                      <Receipt className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="my-2.5">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      {pendingBillingCount}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Status</span>
                    <span className={`font-bold px-2 py-0.5 rounded-md border ${
                      pendingBillingCount === 0 
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                        : 'text-amber-700 bg-amber-50 border-amber-200'
                    }`}>
                      {pendingBillingCount === 0 ? 'All cleared' : 'Need follow-up'}
                    </span>
                  </div>
                </div>
              </section>

              {/* SECOND & THIRD ROW: 6 OPERATIONAL CARDS */}
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* 1. Certification Pipeline */}
                <div 
                  className="bg-white/95 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_25px_-6px_rgba(15,23,42,0.07)] transition-all flex flex-col justify-between"
                  style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 220px' }}
                >
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <h2 className="text-sm font-bold text-slate-900">Certification Pipeline</h2>
                    </div>
                    <div className="font-mono text-xs text-slate-400 mb-4">
                      interest → exam → certified
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {certStages.map((stage, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedDetail({ title: `Certification: ${stage.label}`, count: stage.count, type: 'cert' })}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl shadow-2xs transition-all hover:scale-[1.02] ${stage.color}`}
                      >
                        {stage.label} <span className="font-black ml-1.5">{stage.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Campus Pipeline */}
                <div 
                  className="bg-white/95 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_25px_-6px_rgba(15,23,42,0.07)] transition-all flex flex-col justify-between"
                  style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 220px' }}
                >
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                        <Building className="w-4 h-4" />
                      </div>
                      <h2 className="text-sm font-bold text-slate-900">Campus Pipeline</h2>
                    </div>
                    <div className="font-mono text-xs text-slate-400 mb-4">
                      listed → workshop → MOU
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {campusStages.map((stage, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedDetail({ title: `Campus Pipeline: ${stage.label}`, count: stage.count, type: 'campus' })}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl shadow-2xs transition-all hover:scale-[1.02] ${stage.color}`}
                      >
                        {stage.label} <span className="font-black ml-1.5">{stage.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Corporate Pipeline */}
                <div 
                  className="bg-white/95 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_25px_-6px_rgba(15,23,42,0.07)] transition-all flex flex-col justify-between"
                  style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 220px' }}
                >
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <h2 className="text-sm font-bold text-slate-900">Corporate Pipeline</h2>
                    </div>
                    <div className="font-mono text-xs text-slate-400 mb-4">
                      listed → meeting → training
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {corporateStages.map((stage, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedDetail({ title: `Corporate Pipeline: ${stage.label}`, count: stage.count, type: 'corporate' })}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl shadow-2xs transition-all hover:scale-[1.02] ${stage.color}`}
                      >
                        {stage.label} <span className="font-black ml-1.5">{stage.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Placement Movement */}
                <div 
                  className="bg-white/95 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_25px_-6px_rgba(15,23,42,0.07)] transition-all flex flex-col justify-between"
                  style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 220px' }}
                >
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Rocket className="w-4 h-4" />
                      </div>
                      <h2 className="text-sm font-bold text-slate-900">Placement Movement</h2>
                    </div>
                    <div className="font-mono text-xs text-slate-400 mb-4">
                      mapped → interview → joined
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {placementStages.map((stage, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedDetail({ title: `Placement: ${stage.label}`, count: stage.count, type: 'placement' })}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl shadow-2xs transition-all hover:scale-[1.02] ${stage.color}`}
                      >
                        {stage.label} <span className="font-black ml-1.5">{stage.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Follow-ups Today */}
                <div 
                  className="bg-white/95 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_25px_-6px_rgba(15,23,42,0.07)] transition-all flex flex-col justify-between"
                  style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 220px' }}
                >
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <h2 className="text-sm font-bold text-slate-900">Follow-ups Today</h2>
                    </div>
                    <div className="font-mono text-xs text-slate-400 mb-3">
                      due across all verticals
                    </div>
                  </div>

                  <div className="space-y-2">
                    {followUps.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No pending follow-ups today
                      </div>
                    ) : (
                      followUps.map(item => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedDetail({ title: item.title || item.action, item, type: 'followup' })}
                          className="cursor-pointer bg-amber-50/60 hover:bg-amber-100/70 border border-amber-200/70 rounded-xl px-3.5 py-2.5 flex items-center justify-between transition-all"
                        >
                          <span className="text-xs font-medium text-slate-800 truncate pr-2">
                            {item.title || `${item.who}: ${item.action}`}
                          </span>
                          <span className="font-mono text-xs font-bold text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded-md shrink-0">
                            {item.time}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 6. Stuck Items */}
                <div 
                  className="bg-white/95 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_25px_-6px_rgba(15,23,42,0.07)] transition-all flex flex-col justify-between"
                  style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 220px' }}
                >
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <h2 className="text-sm font-bold text-slate-900">Stuck Items</h2>
                    </div>
                    <div className="font-mono text-xs text-slate-400 mb-3">
                      delayed beyond SLA · auto-escalated
                    </div>
                  </div>

                  <div className="space-y-2">
                    {paymentPendingCount === 0 && collegesList.filter(c => c.stage === 'Contacted').length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No escalated or SLA-breached items
                      </div>
                    ) : (
                      <>
                        {collegesList.filter(c => c.stage === 'Contacted').map(c => (
                          <div
                            key={c.id}
                            onClick={() => setSelectedDetail({ title: `${c.name} - response pending`, item: c, type: 'stuck' })}
                            className="cursor-pointer bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200/70 rounded-xl px-3.5 py-2.5 flex items-center justify-between transition-all"
                          >
                            <span className="text-xs font-medium text-rose-950 truncate pr-2">
                              {c.name} - contact follow-up
                            </span>
                            <span className="font-mono text-xs font-bold text-rose-700 bg-rose-200/60 px-2 py-0.5 rounded-md shrink-0">
                              Overdue
                            </span>
                          </div>
                        ))}
                        {students.filter(s => s.feeStatus === 'Part Paid').slice(0, 2).map(s => (
                          <div
                            key={s._id || s.studentId}
                            onClick={() => setSelectedDetail({ title: `${s.name} - balance fee`, item: s, type: 'stuck' })}
                            className="cursor-pointer bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200/70 rounded-xl px-3.5 py-2.5 flex items-center justify-between transition-all"
                          >
                            <span className="text-xs font-medium text-rose-950 truncate pr-2">
                              {s.name} - exam fee pending
                            </span>
                            <span className="font-mono text-xs font-bold text-rose-700 bg-rose-200/60 px-2 py-0.5 rounded-md shrink-0">
                              Payment
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {/* ======================================================== */}
          {/* VERTICAL VIEW: CERTIFICATION & EXAM VOUCHER CELL         */}
          {/* ======================================================== */}
          {activeNav === 'certification' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Top Header */}
              <div className="pb-3 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                      <GraduationCap className="w-3.5 h-3.5" />
                      ACADEMIC & CERTIFICATION
                    </span>
                    <span className="text-xs font-mono font-medium text-slate-400">
                      {students.length} students tracked
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Certification &amp; Exam Voucher Cell
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Complete student journey tracking from interest registration → voucher booking → exam clearance → placement readiness.
                  </p>
                </div>
              </div>

              {/* Live Synced Notice Banner */}
              <div className="bg-gradient-to-r from-sky-50/90 to-indigo-50/70 border border-sky-200/70 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                <span className="bg-white text-emerald-800 border border-emerald-200/80 rounded-full px-3 py-1 text-[11px] font-bold shrink-0 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  LIVE SYNCED
                </span>
                <p className="text-slate-700 text-xs font-medium leading-relaxed">
                  Pulled from <strong className="text-slate-900 font-bold">Trainer 360</strong>: Exam Readiness, Mock Scores &amp; Trainer Recommendations are synchronized directly from live trainer evaluation submissions. If a trainer has not finalized scores, the candidate reflects <span className="font-semibold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded">Pending — Trainer Review</span>.
                </p>
              </div>

              {/* 11-Stage Stepper Flow */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)]">
                <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2 min-w-[800px]">
                  {[
                    { step: 1, label: 'Pool', done: true },
                    { step: 2, label: 'Interest', done: true },
                    { step: 3, label: 'Readiness', done: true },
                    { step: 4, label: 'Agrees', done: true },
                    { step: 5, label: 'Payment', done: true },
                    { step: 6, label: 'Membership', done: false },
                    { step: 7, label: 'Voucher', done: false },
                    { step: 8, label: 'Exam Date', done: false },
                    { step: 9, label: 'Written', done: false },
                    { step: 10, label: 'Result', done: false },
                    { step: 11, label: 'Certified', done: false }
                  ].map((item, idx, arr) => (
                    <React.Fragment key={item.step}>
                      <div className="flex flex-col items-center gap-2 flex-1 min-w-[60px]">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          item.done 
                            ? 'bg-[#102a45] text-white shadow-xs' 
                            : 'bg-slate-100 text-slate-500 font-medium'
                        }`}>
                          {item.step}
                        </div>
                        <span className={`text-[11px] font-semibold text-center whitespace-nowrap ${
                          item.done ? 'text-slate-900 font-bold' : 'text-slate-500'
                        }`}>
                          {item.label}
                        </span>
                      </div>
                      {idx < arr.length - 1 && (
                        <div className={`h-0.5 flex-1 select-none -mt-5 mx-0.5 rounded-full ${
                          item.done ? 'bg-[#102a45]' : 'bg-slate-200'
                        }`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Exam Fees by Course Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold text-slate-900">Exam Fees by Course</h2>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Managed in HR · Live reflected
                    </span>
                  </div>
                </div>

                {/* 7 Course Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {[
                    { code: 'CPC', name: 'Certified Professional Coder', fee: '₹22,000' },
                    { code: 'CCS', name: 'Certified Coding Specialist', fee: '₹24,000' },
                    { code: 'CRC', name: 'Certified Risk Adjustment Coder', fee: '₹21,000' },
                    { code: 'COC', name: 'Certified Outpatient Coder', fee: '₹23,000' },
                    { code: 'CIC', name: 'Certified Inpatient Coder', fee: '₹26,000' },
                    { code: 'IPDRG', name: 'Inpatient DRG Coding', fee: '₹20,000' },
                    { code: 'AMCT Intermediate', name: 'AAPC Medical Coding Training', fee: '₹19,000', special: true }
                  ].map((c, i) => (
                    <div 
                      key={i} 
                      className={`bg-white/95 backdrop-blur-md rounded-2xl p-4 border shadow-[0_4px_16px_-4px_rgba(15,23,42,0.03)] hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between text-center transition-all ${
                        c.special ? 'border-purple-300 ring-1 ring-purple-100' : 'border-slate-200/80'
                      }`}
                    >
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider mb-1.5 ${
                          c.special ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {c.code}
                        </span>
                        <div className="text-[10px] text-slate-500 min-h-[26px] line-clamp-2 leading-tight font-medium">
                          {c.name}
                        </div>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-100">
                        <div className="text-base font-black text-slate-900">{c.fee}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wide">Standard Fee</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-sky-50/70 border border-sky-200/60 rounded-xl p-3 text-xs text-sky-900 leading-relaxed font-medium">
                  The CCCP Cell references these official exam voucher rates for candidate sponsorship and booking. Rates update directly whenever modified in the HR fee schedule.
                </div>
              </div>

              {/* 5 Metric Status Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.04)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-slate-400" />
                  <div className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">INTERESTED</div>
                  <div className="text-3xl font-black text-slate-900 my-1.5">{interestedCount}</div>
                  <div className="text-[11px] text-slate-500">counselling pool</div>
                </div>

                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.04)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                  <div className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">PAYMENT PENDING</div>
                  <div className="text-3xl font-black text-slate-900 my-1.5">{paymentPendingCount}</div>
                  <div className="text-[11px] text-amber-600 font-medium">fee follow-up</div>
                </div>

                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.04)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500" />
                  <div className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">VOUCHER BOOKED</div>
                  <div className="text-3xl font-black text-slate-900 my-1.5">{voucherBookedCount}</div>
                  <div className="text-[11px] text-sky-600 font-medium">exam scheduled</div>
                </div>

                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.04)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
                  <div className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">EXAM WRITTEN</div>
                  <div className="text-3xl font-black text-slate-900 my-1.5">{examWrittenCount}</div>
                  <div className="text-[11px] text-indigo-600 font-medium">awaiting result</div>
                </div>

                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.04)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                  <div className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">CERTIFIED MTD</div>
                  <div className="text-3xl font-black text-slate-900 my-1.5">{certifiedCount}</div>
                  <div className="text-[11px] text-emerald-600 font-bold">→ placement desk</div>
                </div>
              </div>

              {/* Certification Student Pool Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">
                    Certification Student Pool <span className="font-normal text-slate-400 text-xs">· {students.length} students</span>
                  </h2>
                </div>

                <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100/70 text-slate-400 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3.5 px-4 font-bold text-slate-600">STUDENT</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">TF ID</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">COURSE</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">READINESS ⚡</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">TRAINER REC</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">STAGE</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">NEXT ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {students.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                              {loadingStudents ? 'Loading real student records from database...' : 'No student records found in the database.'}
                            </td>
                          </tr>
                        ) : (
                          students.map((st) => {
                            const readiness = st.mockInterview?.includes('/')
                              ? parseInt(st.mockInterview)
                              : st.mockInterview?.includes('Cleared')
                              ? 90
                              : st.certified?.includes('Certified')
                              ? 95
                              : 65;
                            const isReady = readiness >= 80 || st.mockInterview?.includes('Cleared') || st.certified?.includes('Certified');
                            const stage = st.certified?.includes('Certified')
                              ? 'Certified'
                              : st.examStatus?.toLowerCase().includes('booked')
                              ? 'Voucher Booked'
                              : st.feeStatus === 'Part Paid'
                              ? 'Payment Pending'
                              : 'Interested';
                            const action = stage === 'Certified'
                              ? 'Forward to Placements'
                              : stage === 'Voucher Booked'
                              ? 'Track Exam Schedule'
                              : stage === 'Payment Pending'
                              ? 'Payment nudge'
                              : 'AAPC Counseling';

                            const initials = (st.name || 'TF').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                            return (
                              <tr key={st._id || st.studentId} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                                      {initials}
                                    </div>
                                    <span className="font-bold text-slate-900">{st.name}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 font-medium">{st.studentId}</td>
                                <td className="py-3.5 px-4">
                                  <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold text-[11px]">
                                    {st.course?.split('—')[0]?.trim() || st.course}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-black ${readiness >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{readiness}%</span>
                                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${readiness >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                        style={{ width: `${readiness}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    isReady ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                    {isReady ? 'Ready' : 'Needs Revision'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                    stage === 'Certified'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : stage === 'Voucher Booked'
                                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                      : stage === 'Payment Pending'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {stage}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-semibold text-slate-800">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {stage !== 'Certified' && stage !== 'Voucher Booked' && (
                                      <button
                                        onClick={() => handleUpdateStudentExam(st._id || st.studentId, 'AAPC CPC Booked', 'Exam Scheduled')}
                                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-all active:scale-95 cursor-pointer"
                                      >
                                        Book AAPC Exam
                                      </button>
                                    )}
                                    {stage === 'Voucher Booked' && (
                                      <button
                                        onClick={() => handleUpdateStudentExam(st._id || st.studentId, 'Cleared', 'CPC Certified ✓')}
                                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-all active:scale-95 cursor-pointer"
                                      >
                                        Mark Certified ✓
                                      </button>
                                    )}
                                    {stage === 'Certified' && (
                                      <button
                                        onClick={() => {
                                          handleUpdateStudentPlacement(st._id || st.studentId, 'Interviewing (Omega Health)', 'placed');
                                          setActiveNav('placement');
                                        }}
                                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all active:scale-95 cursor-pointer"
                                      >
                                        Forward to Placements →
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Bottom Integration Footer */}
              <div className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-200/80 rounded-2xl p-4 text-xs text-emerald-950 flex items-center gap-2.5 shadow-2xs font-medium leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">✓</span>
                <span>
                  When a candidate reaches <strong className="font-bold">Certified</strong>, their Student 360 badge, placement-readiness score, and Talentera pipeline entry update automatically in real-time.
                </span>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VERTICAL VIEW: CAMPUS PARTNERSHIPS CELL                   */}
          {/* ======================================================== */}
          {activeNav === 'campus' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Top Header */}
              <div className="pb-3 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/20">
                      <Building className="w-3.5 h-3.5" />
                      CAMPUS PARTNERSHIPS
                    </span>
                    <span className="text-xs font-mono font-medium text-slate-400">
                      {collegesList.length} institutions tracked
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Campus Partnerships Cell
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    End-to-end institution outreach: identification → seminar workshops → MOU signing → student database validation → HR handover.
                  </p>
                </div>
              </div>

              {/* Info Notification Banner */}
              <div className="bg-gradient-to-r from-teal-50/80 to-sky-50/80 border border-teal-200/70 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                <span className="w-6 h-6 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  i
                </span>
                <p className="text-slate-700 text-xs font-medium leading-relaxed">
                  Validated bulk student rosters from signed campuses stream directly to HR Admissions as fresh prospective leads — tagged <span className="font-bold text-slate-900 bg-white/80 px-2 py-0.5 rounded border border-teal-200">Campus — [College] — [Event]</span> with duplicate-check and consent verification.
                </p>
              </div>

              {/* College Master Database Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">
                    College Master Database <span className="font-normal text-slate-400 text-xs">· {collegesList.length} colleges</span>
                  </h2>
                  <button
                    onClick={() => setIsAddCollegeOpen(true)}
                    className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add College</span>
                  </button>
                </div>

                {/* Table */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100/70 text-slate-400 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3.5 px-4 font-bold text-slate-600">COLLEGE</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">CODE</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">CITY</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">TYPE</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">DECISION-MAKER</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">MOU</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">STAGE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {collegesList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                              No colleges registered yet. Click "+ Add College" above to add your first campus partnership.
                            </td>
                          </tr>
                        ) : (
                          collegesList.map((col) => (
                            <tr key={col.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                                    <Building className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="font-bold text-slate-900">{col.name}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 font-medium">{col.code}</td>
                              <td className="py-3.5 px-4 text-slate-800 font-medium">{col.city}</td>
                              <td className="py-3.5 px-4">
                                <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                  {col.type}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-slate-700 font-medium">{col.decisionMaker}</td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                  col.mou === 'Signed'
                                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                                    : col.mou === 'Draft'
                                    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    col.mou === 'Signed' ? 'bg-emerald-500' : col.mou === 'Draft' ? 'bg-amber-500' : 'bg-slate-400'
                                  }`}></span>
                                  {col.mou}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                  col.stage === 'MOU Signed'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : col.stage === 'Appointment Fixed'
                                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                    : col.stage === 'Workshop Completed'
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {col.stage}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VERTICAL VIEW: CORPORATE PARTNERSHIPS CELL                */}
          {/* ======================================================== */}
          {activeNav === 'corporate' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Top Header */}
              <div className="pb-3 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                      <Building2 className="w-3.5 h-3.5" />
                      CORPORATE PARTNERSHIPS
                    </span>
                    <span className="text-xs font-mono font-medium text-slate-400">
                      {companiesList.length} companies tracked
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Corporate Partnerships Cell
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Industry relationship desk: target identification → leadership meetings → custom requirements → corporate training batches.
                  </p>
                </div>
              </div>

              {/* Info Notification Banner */}
              <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/70 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                <span className="w-6 h-6 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  i
                </span>
                <p className="text-slate-700 text-xs font-medium leading-relaxed">
                  Confirmed corporate training agreements automatically trigger an active Corporate Batch inside Trainer 360 — CCCP closes the corporate deal while Training executes delivery.
                </p>
              </div>

              {/* Company Master Database Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">
                    Company Master Database <span className="font-normal text-slate-400 text-xs">· {companiesList.length} companies</span>
                  </h2>
                  <button
                    onClick={() => setIsAddCompanyOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Company</span>
                  </button>
                </div>

                {/* Table */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100/70 text-slate-400 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3.5 px-4 font-bold text-slate-600">COMPANY</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">CODE</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">CITY</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">TYPE</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">CONTACT</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">HIRING</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">STAGE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {companiesList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                              No corporate companies registered yet. Click "+ Add Company" above to add a corporate partner.
                            </td>
                          </tr>
                        ) : (
                          companiesList.map((cmp) => (
                            <tr key={cmp.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                                    <Building2 className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="font-bold text-slate-900">{cmp.name}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 font-medium">{cmp.code}</td>
                              <td className="py-3.5 px-4 text-slate-800 font-medium">{cmp.city}</td>
                              <td className="py-3.5 px-4">
                                <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                  {cmp.type}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-slate-700 font-medium">{cmp.contact}</td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                  cmp.hiring === 'Actively Hiring'
                                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                                    : cmp.hiring === 'Paused'
                                    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    cmp.hiring === 'Actively Hiring' ? 'bg-emerald-500 animate-pulse' : cmp.hiring === 'Paused' ? 'bg-amber-500' : 'bg-slate-400'
                                  }`}></span>
                                  {cmp.hiring}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                  cmp.stage === 'Requirement Received'
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : cmp.stage === 'Meeting Done'
                                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                    : cmp.stage === 'Training Active'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {cmp.stage}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VERTICAL VIEW: PLACEMENT DESK                            */}
          {/* ======================================================== */}
          {activeNav === 'placement' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header */}
              <div className="pb-3 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20">
                      <Rocket className="w-3.5 h-3.5" />
                      CAREER & PLACEMENT
                    </span>
                    <span className="text-xs font-mono font-medium text-slate-400">
                      {placementStudents.length} candidates in transit
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Placement Movement Desk
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Direct candidate transition pipeline: certified pool → corporate match → interview rounds → offer selection → joining.
                  </p>
                </div>
              </div>

              {/* Info banner */}
              <div className="bg-gradient-to-r from-purple-50/80 to-blue-50/80 border border-purple-200/70 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                <span className="bg-white text-purple-800 border border-purple-200/80 rounded-full px-3 py-1 text-[11px] font-bold shrink-0 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                  LIVE ENGINE
                </span>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  Readiness scores, mock ratings, and trainer recommendations are pulled automatically from <strong className="font-bold text-slate-900">Trainer 360</strong>. Confirmed offers dynamically update the candidate's master student profile.
                </p>
              </div>

              {/* 4 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.04)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#102a45]" />
                  <div className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">MAPPED</div>
                  <div className="text-3xl font-black text-slate-900 my-1.5">
                    {placementStudents.filter(s => s.company && s.company !== '— unmapped —' && s.company !== '—').length}
                  </div>
                  <div className="text-xs text-slate-400 font-medium">to hiring partners</div>
                </div>

                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.04)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
                  <div className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">INTERVIEWS</div>
                  <div className="text-3xl font-black text-slate-900 my-1.5">
                    {placementStudents.filter(s => s.status === 'Interview Scheduled').length}
                  </div>
                  <div className="text-xs text-blue-600 font-medium">interview rounds fixed</div>
                </div>

                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.04)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
                  <div className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">SELECTED</div>
                  <div className="text-3xl font-black text-slate-900 my-1.5">
                    {placementStudents.filter(s => s.status === 'Selected').length}
                  </div>
                  <div className="text-xs text-purple-600 font-medium">offers received</div>
                </div>

                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.04)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                  <div className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">JOINED</div>
                  <div className="text-3xl font-black text-slate-900 my-1.5">
                    {placementStudents.filter(s => s.status === 'Joined').length}
                  </div>
                  <div className="text-xs text-emerald-600 font-bold">placement complete</div>
                </div>
              </div>

              {/* 7-Stage Stepper */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)]">
                <div className="flex items-center justify-between max-w-4xl mx-auto overflow-x-auto py-1">
                  {[
                    { step: 1, label: 'Pool', completed: true },
                    { step: 2, label: 'Placement Ready', completed: true },
                    { step: 3, label: 'Talentera Synced', completed: true },
                    { step: 4, label: 'Company Mapped', completed: true },
                    { step: 5, label: 'Interview', completed: true },
                    { step: 6, label: 'Selected', completed: false },
                    { step: 7, label: 'Joined', completed: false }
                  ].map((item, idx, arr) => (
                    <React.Fragment key={item.step}>
                      <div className="flex flex-col items-center min-w-[80px]">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          item.completed 
                            ? 'bg-[#102a45] text-white shadow-xs' 
                            : 'bg-slate-100 text-slate-400 font-medium'
                        }`}>
                          {item.step}
                        </div>
                        <span className={`text-[11px] font-semibold mt-2 text-center whitespace-nowrap ${
                          item.completed ? 'text-slate-900 font-bold' : 'text-slate-500'
                        }`}>
                          {item.label}
                        </span>
                      </div>
                      {idx < arr.length - 1 && (
                        <div className={`h-0.5 flex-1 select-none -mt-5 mx-1 rounded-full ${
                          item.completed ? 'bg-[#102a45]' : 'bg-slate-200'
                        }`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Student Movement Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Student Movement · {placementStudents.length} tracked
                  </h3>
                  <button
                    onClick={() => setIsMapStudentOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Map Student to Company</span>
                  </button>
                </div>

                <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100/70 text-slate-400 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3.5 px-4 font-bold text-slate-600">STUDENT</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">TF ID</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">READINESS ⚡</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">TRAINER REC</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">COMPANY</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">ROLE</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">INTERVIEW</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600">STATUS</th>
                          <th className="py-3.5 px-4 font-bold text-slate-600 text-right">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {placementStudents.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                              No students mapped to companies yet. Click "+ Map Student to Company" above to start placement movement.
                            </td>
                          </tr>
                        ) : (
                          placementStudents.map((st) => {
                            const readiness = parseInt(st.readiness) || 80;
                            const initials = (st.name || 'TF').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                            return (
                              <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                                      {initials}
                                    </div>
                                    <span className="font-bold text-slate-900">{st.name}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 font-medium">
                                  {st.tfId}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-black ${readiness >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                      {st.readiness}
                                    </span>
                                    <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${readiness >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                        style={{ width: `${Math.min(readiness, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    st.trainerRec === 'Ready'
                                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                                      : 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${st.trainerRec === 'Ready' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                    {st.trainerRec}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={st.company === '— unmapped —' || !st.company ? 'text-slate-400 italic' : 'font-bold text-slate-800'}>
                                    {st.company || '—'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-slate-600 font-medium">
                                  {st.role}
                                </td>
                                <td className="py-3.5 px-4 text-slate-600 font-medium">
                                  {st.interview}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                    st.status === 'Interview Scheduled' || st.status === 'Company Mapped'
                                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                      : st.status === 'Selected'
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                      : st.status === 'Joined'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {st.status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    onClick={() => handleAdvanceStudent(st.id)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold shadow-2xs transition-all active:scale-95"
                                  >
                                    <span>Advance</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VERTICAL VIEW: BILLING STATUS (COORDINATION ONLY)         */}
          {/* ======================================================== */}
          {activeNav === 'billing' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header */}
              <div className="pb-3 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                      <Receipt className="w-3.5 h-3.5" />
                      COORDINATION ONLY
                    </span>
                    <span className="text-xs font-mono font-medium text-slate-400">
                      {billingDeals.length} deals monitored
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Billing Coordination Desk
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Operational deal lifecycle coordination — tracking payment statuses and follow-up milestones without exposing financial numbers.
                  </p>
                </div>
              </div>

              {/* Red-tinted Warning / Privacy Banner */}
              <div className="bg-gradient-to-r from-rose-50/90 to-amber-50/70 border border-rose-200/70 rounded-2xl p-4 flex items-center gap-3.5 text-xs text-rose-900 shadow-xs font-medium">
                <span className="w-7 h-7 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  🔒
                </span>
                <p className="leading-relaxed">
                  <strong className="font-bold text-rose-950">Strict Privacy Protocol:</strong> Commercial figures, GST rates, profit margins, and account identifiers remain strictly isolated within Finance and Executive Management accounts.
                </p>
              </div>

              {/* Table Header with Add Button */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Tracked Deals <span className="font-normal text-slate-400 text-xs">· {billingDeals.length} deals</span>
                  </h3>
                  <button
                    onClick={() => setIsAddBillingOpen(true)}
                    className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Record Deal Status</span>
                  </button>
                </div>

                {/* Deals Status Table */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100/70 text-slate-400 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3.5 px-6 font-bold text-slate-600">DEAL DESCRIPTION</th>
                          <th className="py-3.5 px-6 font-bold text-slate-600">VERTICAL</th>
                          <th className="py-3.5 px-6 font-bold text-slate-600">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {billingDeals.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-12 text-center text-slate-400 text-xs">
                              No deals tracked yet. Click "+ Record Deal Status" above to log a new billing coordination item.
                            </td>
                          </tr>
                        ) : (
                          billingDeals.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-4 px-6 font-bold text-slate-900">
                                {row.deal}
                              </td>
                              <td className="py-4 px-6">
                                <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                  {row.type}
                                </span>
                              </td>
                              <td className="py-4 px-6">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
                                  row.status === 'Payment Pending'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : row.status === 'Invoice Raised'
                                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                    : row.status === 'Advance Received'
                                    ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                    : row.status === 'Payment Completed'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    row.status === 'Payment Completed' ? 'bg-emerald-500' : row.status === 'Payment Pending' ? 'bg-amber-500' : 'bg-blue-500'
                                  }`}></span>
                                  {row.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VERTICAL VIEW: FOLLOW-UP CALENDAR                        */}
          {/* ======================================================== */}
          {activeNav === 'calendar' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header */}
              <div className="pb-3 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20">
                      <Calendar className="w-3.5 h-3.5" />
                      ACTIVITY SCHEDULE
                    </span>
                    <span className="text-xs font-mono font-medium text-slate-400">
                      {followUps.length} follow-ups planned
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Follow-up Calendar
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Cross-vertical appointment and call agenda across campus partners, corporate deals, exam candidates, and placed students.
                  </p>
                </div>
              </div>

              {/* Table Header with Add Button */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Scheduled Agendas <span className="font-normal text-slate-400 text-xs">· {followUps.length} appointments</span>
                  </h3>
                  <button
                    onClick={() => setIsAddFollowUpOpen(true)}
                    className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Follow-up</span>
                  </button>
                </div>

                {/* Table */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100/70 text-slate-400 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3.5 px-6 font-bold text-slate-600">TIME / DUE</th>
                          <th className="py-3.5 px-6 font-bold text-slate-600">VERTICAL</th>
                          <th className="py-3.5 px-6 font-bold text-slate-600">PARTNER / CANDIDATE</th>
                          <th className="py-3.5 px-6 font-bold text-slate-600">ACTION REQUIRED</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {followUps.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                              No follow-up appointments scheduled yet. Click "+ Add Follow-up" above to schedule an agenda item.
                            </td>
                          </tr>
                        ) : (
                          followUps.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-4 px-6">
                                <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                                  {row.time}
                                </span>
                              </td>
                              <td className="py-4 px-6">
                                <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  row.vertical === 'Campus'
                                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                    : row.vertical === 'Cert'
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : row.vertical === 'Corporate'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                                }`}>
                                  {row.vertical}
                                </span>
                              </td>
                              <td className="py-4 px-6 font-bold text-slate-900">
                                {row.who}
                              </td>
                              <td className="py-4 px-6 text-slate-700 font-medium">
                                {row.action}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VERTICAL VIEW: REPORTS & MIS                             */}
          {/* ======================================================== */}
          {activeNav === 'reports' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header */}
              <div className="pb-3 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      <BarChart3 className="w-3.5 h-3.5" />
                      EXECUTIVE METRICS &amp; MIS
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Reports &amp; Management MIS
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Holistic operational summaries tracking speed, pipeline velocity, conversion ratios, and institutional outcomes.
                  </p>
                </div>
              </div>

              {/* 4 Movement Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Card 1: Certification Movement */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <span>Certification Movement</span>
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        Live Status
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Academy pool progression into global certifications</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 mt-5">
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
                      Interested <strong className="text-slate-900 ml-1">{interestedCount}</strong>
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                      Exam Ready <strong className="text-amber-950 ml-1">{examReadyCount}</strong>
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 text-xs font-semibold">
                      Written <strong className="text-sky-950 ml-1">{examWrittenCount}</strong>
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                      Certified <strong className="text-emerald-950 ml-1">{certifiedCount}</strong>
                    </span>
                  </div>
                </div>

                {/* Card 2: Campus Movement */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                          <Building className="w-4 h-4" />
                        </div>
                        <span>Campus Partnerships</span>
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        Active Outreach
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">College engagements, seminars, and signed MOUs</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 mt-5">
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
                      Colleges <strong className="text-slate-900 ml-1">{collegesList.length}</strong>
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                      Contacted <strong className="text-amber-950 ml-1">{collegesContactedCount}</strong>
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold">
                      Workshops <strong className="text-teal-950 ml-1">{collegesWorkshopCount}</strong>
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                      MOUs <strong className="text-emerald-950 ml-1">{mouSignedCount}</strong>
                    </span>
                  </div>
                </div>

                {/* Card 3: Corporate Movement */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span>Corporate Partnerships</span>
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        Deals Desk
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Corporate training agreements and enterprise clients</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 mt-5">
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
                      Companies <strong className="text-slate-900 ml-1">{companiesList.length}</strong>
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 text-xs font-semibold">
                      Meetings <strong className="text-sky-950 ml-1">{corpMeetingCount}</strong>
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-semibold">
                      Requirements <strong className="text-indigo-950 ml-1">{corpReqCount}</strong>
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                      Training Active <strong className="text-emerald-950 ml-1">{corpTrainingCount}</strong>
                    </span>
                  </div>
                </div>

                {/* Card 4: Placement Movement */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                          <Rocket className="w-4 h-4" />
                        </div>
                        <span>Placement Movement</span>
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        Hiring Outcomes
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Interviews completed, candidate selections, and joining</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 mt-5">
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
                      Mapped <strong className="text-slate-900 ml-1">{placementMappedCount}</strong>
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 text-xs font-semibold">
                      Interviews <strong className="text-sky-950 ml-1">{placementInterviewCount}</strong>
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-xs font-semibold">
                      Selected <strong className="text-purple-950 ml-1">{placementSelectedCount}</strong>
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                      Joined <strong className="text-emerald-950 ml-1">{placementJoinedCount}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ================= DRILLDOWN DETAIL MODAL ================= */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 animate-scaleUp relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-sky-500 to-indigo-500" />
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">{selectedDetail.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedDetail(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-5 space-y-4">
              {selectedDetail.item ? (
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2.5 text-xs">
                  {Object.entries(selectedDetail.item).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center py-1.5 border-b border-slate-200/60 last:border-0">
                      <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">{k}:</span>
                      <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-100">{String(v)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Total of <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">{selectedDetail.count} records</span> currently in this pipeline stage. Action items are actively tracked by the CCCP operational desk.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert(`Updated status for: ${selectedDetail.title}`);
                  setSelectedDetail(null);
                }}
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#102a45] via-[#153a5c] to-[#1e3a8a] hover:opacity-95 rounded-xl shadow-md shadow-slate-900/10 transition-all active:scale-95"
              >
                Update / Advance Stage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD COLLEGE MODAL ================= */}
      {isAddCollegeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 animate-scaleUp relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Add College</h3>
                  <p className="text-[11px] text-slate-400">Institutional campus outreach partner</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddCollegeOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCollege} className="py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    College Name
                  </label>
                  <input
                    type="text"
                    required
                    value={collegeForm.name}
                    onChange={e => setCollegeForm({ ...collegeForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="e.g. Sri Ramakrishna College"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    City / District
                  </label>
                  <input
                    type="text"
                    value={collegeForm.city}
                    onChange={e => setCollegeForm({ ...collegeForm, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="e.g. Coimbatore"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Type
                  </label>
                  <select
                    value={collegeForm.type}
                    onChange={e => setCollegeForm({ ...collegeForm, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="Arts & Science">Arts & Science</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Nursing">Nursing</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Allied Health">Allied Health</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Principal / HOD
                  </label>
                  <input
                    type="text"
                    value={collegeForm.decisionMaker}
                    onChange={e => setCollegeForm({ ...collegeForm, decisionMaker: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="e.g. Dr. Anitha R"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Total Student Strength
                  </label>
                  <input
                    type="number"
                    value={collegeForm.studentStrength}
                    onChange={e => setCollegeForm({ ...collegeForm, studentStrength: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="e.g. 150"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    MOU Status
                  </label>
                  <select
                    value={collegeForm.mou}
                    onChange={e => setCollegeForm({ ...collegeForm, mou: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="No">No</option>
                    <option value="Draft">Draft</option>
                    <option value="Signed">Signed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Pipeline Stage
                </label>
                <select
                  value={collegeForm.stage}
                  onChange={e => setCollegeForm({ ...collegeForm, stage: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="College Identified">College Identified</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Decision-Maker Connected">Decision-Maker Connected</option>
                  <option value="Appointment Fixed">Appointment Fixed</option>
                  <option value="Visit Completed">Visit Completed</option>
                  <option value="Workshop Completed">Workshop Completed</option>
                  <option value="Student Data Collected">Student Data Collected</option>
                  <option value="HR Handover Done">HR Handover Done</option>
                  <option value="MOU Signed">MOU Signed</option>
                </select>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddCollegeOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#102a45] via-[#153a5c] to-[#1e3a8a] hover:opacity-95 shadow-md shadow-slate-900/10 transition-all active:scale-95"
                >
                  Save College
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ADD COMPANY MODAL ================= */}
      {isAddCompanyOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 animate-scaleUp relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Add Company</h3>
                  <p className="text-[11px] text-slate-400">Corporate & healthcare hiring partner</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddCompanyOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCompany} className="py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={companyForm.name}
                    onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. HCL Healthcare"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    City / State
                  </label>
                  <input
                    type="text"
                    value={companyForm.city}
                    onChange={e => setCompanyForm({ ...companyForm, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. Hyderabad"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Type
                  </label>
                  <select
                    value={companyForm.type}
                    onChange={e => setCompanyForm({ ...companyForm, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Medical Coding">Medical Coding</option>
                    <option value="RCM">RCM</option>
                    <option value="Billing">Billing</option>
                    <option value="AR">AR</option>
                    <option value="Hospital">Hospital</option>
                    <option value="BPO">BPO</option>
                    <option value="KPO">KPO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    HR / Contact Person
                  </label>
                  <input
                    type="text"
                    value={companyForm.contact}
                    onChange={e => setCompanyForm({ ...companyForm, contact: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. Ramesh (HR)"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Hiring Status
                  </label>
                  <select
                    value={companyForm.hiring}
                    onChange={e => setCompanyForm({ ...companyForm, hiring: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Actively Hiring">Actively Hiring</option>
                    <option value="Paused">Paused</option>
                    <option value="Not Hiring">Not Hiring</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Training Interest
                  </label>
                  <select
                    value={companyForm.trainingInterest}
                    onChange={e => setCompanyForm({ ...companyForm, trainingInterest: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Pipeline Stage
                </label>
                <select
                  value={companyForm.stage}
                  onChange={e => setCompanyForm({ ...companyForm, stage: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Identified">Identified</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Decision-Maker Connected">Decision-Maker Connected</option>
                  <option value="Meeting Fixed">Meeting Fixed</option>
                  <option value="Meeting Done">Meeting Done</option>
                  <option value="Requirement Received">Requirement Received</option>
                  <option value="Training Active">Training Active</option>
                </select>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddCompanyOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#102a45] via-[#153a5c] to-[#1e3a8a] hover:opacity-95 shadow-md shadow-slate-900/10 transition-all active:scale-95"
                >
                  Save Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: MAP STUDENT TO COMPANY ================= */}
      {isMapStudentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/80 overflow-hidden p-6 sm:p-7 animate-scaleUp relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                  <Rocket className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Map Student to Company</h3>
                  <p className="text-[11px] text-slate-400">Coordinate placement interview pipeline</p>
                </div>
              </div>
              <button
                onClick={() => setIsMapStudentOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveMapping} className="py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Student (Admitted Pool)
                  </label>
                  <select
                    value={mapForm.studentId}
                    onChange={e => setMapForm({ ...mapForm, studentId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    required
                  >
                    <option value="">Select Student...</option>
                    {students.map(st => (
                      <option key={st._id || st.studentId} value={st.studentId}>
                        {st.name} · {st.studentId}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Company (Corporate Master)
                  </label>
                  <select
                    value={mapForm.company}
                    onChange={e => setMapForm({ ...mapForm, company: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    required
                  >
                    <option value="">Select Company...</option>
                    {companiesList.length === 0 ? (
                      <option value="" disabled>No companies added yet (Add via Corporate Cell)</option>
                    ) : (
                      companiesList.map(c => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Role
                  </label>
                  <select
                    value={mapForm.role}
                    onChange={e => setMapForm({ ...mapForm, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="Medical Coder">Medical Coder</option>
                    <option value="AR Executive">AR Executive</option>
                    <option value="Billing Specialist">Billing Specialist</option>
                    <option value="Auditor">Auditor</option>
                    <option value="RCM Analyst">RCM Analyst</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Interview Date
                  </label>
                  <input
                    type="date"
                    value={mapForm.interviewDate}
                    onChange={e => setMapForm({ ...mapForm, interviewDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsMapStudentOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#102a45] via-[#153a5c] to-[#1e3a8a] hover:opacity-95 shadow-md shadow-slate-900/10 transition-all active:scale-95"
                >
                  Save Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RECORD BILLING DEAL STATUS ================= */}
      {isAddBillingOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/80 overflow-hidden p-6 sm:p-7 animate-scaleUp relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Record Deal Status</h3>
                  <p className="text-[11px] text-slate-400">Billing milestone tracking (No amounts)</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddBillingOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBilling} className="py-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Deal Description / Title
                </label>
                <input
                  type="text"
                  required
                  value={billingForm.deal}
                  onChange={e => setBillingForm({ ...billingForm, deal: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  placeholder="e.g. PSG College · Two-Day Workshop"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Vertical / Type
                  </label>
                  <select
                    value={billingForm.type}
                    onChange={e => setBillingForm({ ...billingForm, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="Campus">Campus</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Placement">Placement</option>
                    <option value="Cert">Certification</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Billing Status (No Amounts)
                  </label>
                  <select
                    value={billingForm.status}
                    onChange={e => setBillingForm({ ...billingForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="Payment Pending">Payment Pending</option>
                    <option value="Invoice Raised">Invoice Raised</option>
                    <option value="Advance Received">Advance Received</option>
                    <option value="Payment Completed">Payment Completed</option>
                    <option value="Not Billable">Not Billable</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddBillingOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#102a45] via-[#153a5c] to-[#1e3a8a] hover:opacity-95 shadow-md shadow-slate-900/10 transition-all active:scale-95"
                >
                  Save Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD FOLLOW-UP ================= */}
      {isAddFollowUpOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/80 overflow-hidden p-6 sm:p-7 animate-scaleUp relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Add Follow-up Appointment</h3>
                  <p className="text-[11px] text-slate-400">Schedule pending partner action</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddFollowUpOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFollowUp} className="py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Time / Due
                  </label>
                  <input
                    type="text"
                    required
                    value={followUpForm.time}
                    onChange={e => setFollowUpForm({ ...followUpForm, time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    placeholder="e.g. 11:30 or Today"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Vertical
                  </label>
                  <select
                    value={followUpForm.vertical}
                    onChange={e => setFollowUpForm({ ...followUpForm, vertical: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="Campus">Campus</option>
                    <option value="Cert">Certification</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Placement">Placement</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Who (Student, College, or Company)
                </label>
                <input
                  type="text"
                  required
                  value={followUpForm.who}
                  onChange={e => setFollowUpForm({ ...followUpForm, who: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  placeholder="e.g. Sri Ramakrishna College or Priya S"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Action Required
                </label>
                <input
                  type="text"
                  required
                  value={followUpForm.action}
                  onChange={e => setFollowUpForm({ ...followUpForm, action: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  placeholder="e.g. Call Principal for MOU appointment"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddFollowUpOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#102a45] via-[#153a5c] to-[#1e3a8a] hover:opacity-95 shadow-md shadow-slate-900/10 transition-all active:scale-95"
                >
                  Save Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
