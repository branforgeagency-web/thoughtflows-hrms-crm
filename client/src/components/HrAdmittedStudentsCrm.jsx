import React, { useState } from 'react';
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
  Mail,
  Phone,
  BookOpen,
  Briefcase
} from 'lucide-react';

export default function HrAdmittedStudentsCrm() {
  const [activeTabFilter, setActiveTabFilter] = useState('all'); // all, in_course, placed, on_hold
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [showIdGenModal, setShowIdGenModal] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sample Admitted Students matching screenshot
  const [students, setStudents] = useState([
    {
      id: 'TFMC0Y6001',
      name: 'AJITH KUMAR A',
      phone: '63•••• 18356',
      course: 'IPDRG',
      mode: 'Online',
      batchDate: 'May 2',
      hrName: 'Kalaiselvi',
      batchTiming: '8-10 PM Weekdays',
      qualification: 'BE Medical Electronics - 2020',
      qualTag: 'Life Sci',
      collegeCompany: 'S2M Health Care',
      location: 'Namakkal',
      email: 'ajith16124002@gmail.com',
      dob: '16-07-1999',
      enqDate: 'April',
      source: 'OLD STUDENT',
      onboardStatus: '7/7 ✓',
      syllabusModule: 'Module 1',
      mockInterview: 'Pending',
      examStatus: 'Not Booked',
      certified: 'Non-certified',
      placementStatus: 'Placed · 32K',
      feeStatus: 'Fully Paid',
      feeAmount: '₹25,000',
      statusGroup: 'placed'
    },
    {
      id: 'TFMC0Y6002',
      name: 'DHARSHINI S',
      phone: '98•••• 88987',
      course: 'CIC',
      mode: 'Online',
      batchDate: 'May 3',
      hrName: 'Reshma',
      batchTiming: '8-10 PM Weekdays',
      qualification: 'BSc Optometry - 2024',
      qualTag: 'Life Sci',
      collegeCompany: 'Lotus Eye',
      location: 'Hosur',
      email: 'dharshateddy73@gmail.com',
      dob: '02-07-2002',
      enqDate: 'April',
      source: 'OLD STUDENT',
      onboardStatus: '7/7 ✓',
      syllabusModule: 'Module 2',
      mockInterview: 'Pending',
      examStatus: 'Not Booked',
      certified: 'Non-certified',
      placementStatus: 'In course',
      feeStatus: 'Part Paid',
      feeAmount: '₹11,000 / ₹25,000',
      statusGroup: 'in_course'
    },
    {
      id: 'TFMC0Y6003',
      name: 'POOJA R.',
      phone: '97•••• 21345',
      course: 'CPC Inter',
      mode: 'Online',
      batchDate: 'May 10',
      hrName: 'Kavitha N.',
      batchTiming: '10 AM-12 PM Daily',
      qualification: 'BSc Biotechnology - 2023',
      qualTag: 'Life Sci',
      collegeCompany: 'PSG College of Arts & Science',
      location: 'Coimbatore',
      email: 'pooja.r.cpc@gmail.com',
      dob: '14-04-2001',
      enqDate: 'May',
      source: 'DIRECT ENQUIRY',
      onboardStatus: '7/7 ✓',
      syllabusModule: 'Module 1',
      mockInterview: 'Pending',
      examStatus: 'Not Booked',
      certified: 'Non-certified',
      placementStatus: 'In course',
      feeStatus: 'Fully Paid',
      feeAmount: '₹21,000',
      statusGroup: 'in_course'
    },
    {
      id: 'TFMC0Y6004',
      name: 'ANANYA M.',
      phone: '94•••• 77654',
      course: 'CPC Prep',
      mode: 'Classroom',
      batchDate: 'May 15',
      hrName: 'Kavitha N.',
      batchTiming: '2-4 PM Weekdays',
      qualification: 'BPharm - 2022',
      qualTag: 'Pharmacy',
      collegeCompany: 'KMCH College of Pharmacy',
      location: 'Saravanampatti',
      email: 'ananya.m99@gmail.com',
      dob: '28-11-1999',
      enqDate: 'May',
      source: 'REFERRAL',
      onboardStatus: '7/7 ✓',
      syllabusModule: 'Module 1',
      mockInterview: 'Cleared ✓',
      examStatus: 'AAPC CPC Booked',
      certified: 'CPC Certified ✓',
      placementStatus: 'Interviewing (Omega)',
      feeStatus: 'Fully Paid',
      feeAmount: '₹25,000',
      statusGroup: 'in_course'
    },
    {
      id: 'TFMC0Y6005',
      name: 'KARTHIKEYAN V.',
      phone: '99•••• 33211',
      course: 'Comprehensive Medical Coding',
      mode: 'Classroom',
      batchDate: 'May 20',
      hrName: 'Balaji R.',
      batchTiming: '6-8 PM Weekdays',
      qualification: 'BCom - 2021',
      qualTag: 'Non-LifeSci',
      collegeCompany: 'Rathinam College',
      location: 'Coimbatore',
      email: 'karthik.v.bcom@gmail.com',
      dob: '05-09-2000',
      enqDate: 'May',
      source: 'WALK-IN',
      onboardStatus: '4/7 Pending',
      syllabusModule: 'Orientation',
      mockInterview: 'Pending',
      examStatus: 'Not Booked',
      certified: 'Non-certified',
      placementStatus: 'On Hold (Docs pending)',
      feeStatus: 'Part Paid',
      feeAmount: '₹15,000 / ₹32,000',
      statusGroup: 'on_hold'
    }
  ]);

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

  // Walk-in registration form state
  const [newWalkin, setNewWalkin] = useState({
    name: '',
    phone: '',
    email: '',
    course: 'CPC Intensive Medical Coding',
    mode: 'Classroom (Saravanampatti)',
    qualification: '',
    college: '',
    feePaid: '₹25,000',
    timing: '8-10 PM Weekdays'
  });

  const handleWalkinSubmit = (e) => {
    e.preventDefault();
    if (!newWalkin.name || !newWalkin.phone) {
      showToast('Please provide student name and mobile number');
      return;
    }

    const newStudent = {
      id: `TFMC0Y600${students.length + 1}`,
      name: newWalkin.name.toUpperCase(),
      phone: newWalkin.phone,
      course: newWalkin.course,
      mode: newWalkin.mode.includes('Online') ? 'Online' : 'Classroom',
      batchDate: 'May 22',
      hrName: 'Kavitha N.',
      batchTiming: newWalkin.timing,
      qualification: newWalkin.qualification || 'BSc Graduate',
      qualTag: 'Life Sci',
      collegeCompany: newWalkin.college || 'Coimbatore',
      location: 'Saravanampatti',
      email: newWalkin.email || 'student@thoughtflows.in',
      dob: '01-01-2002',
      enqDate: 'May',
      source: 'WALK-IN',
      onboardStatus: '7/7 ✓',
      syllabusModule: 'Module 1',
      mockInterview: 'Pending',
      examStatus: 'Not Booked',
      certified: 'Non-certified',
      placementStatus: 'In course',
      feeStatus: 'Fully Paid',
      feeAmount: newWalkin.feePaid,
      statusGroup: 'in_course'
    };

    setStudents([newStudent, ...students]);
    setShowWalkinModal(false);
    setNewWalkin({
      name: '',
      phone: '',
      email: '',
      course: 'CPC Intensive Medical Coding',
      mode: 'Classroom (Saravanampatti)',
      qualification: '',
      college: '',
      feePaid: '₹25,000',
      timing: '8-10 PM Weekdays'
    });
    showToast(`✓ Registered student ${newStudent.name} (${newStudent.id})`);
  };

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

  const handleShareLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast('🔗 Copied Student Registration Link to clipboard');
  };

  // Filter students
  const filteredStudents = students.filter(s => {
    if (activeTabFilter === 'in_course' && s.statusGroup !== 'in_course') return false;
    if (activeTabFilter === 'placed' && s.statusGroup !== 'placed') return false;
    if (activeTabFilter === 'on_hold' && s.statusGroup !== 'on_hold') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) 
        || s.id.toLowerCase().includes(q) 
        || s.phone.includes(q)
        || s.course.toLowerCase().includes(q)
        || s.email.toLowerCase().includes(q);
    }
    return true;
  });

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
          Auto-filled from registration forms · same columns as your Hopes Branch sheet - May 2026
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
            className="flex items-center gap-1.5 bg-white hover:bg-teal-50 text-slate-900 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-700" />
            <span>Share Link</span>
          </button>

          <button
            onClick={() => setShowWalkinModal(true)}
            className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            <span>✨</span>
            <span>Walk-In Registration</span>
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
          onClick={() => setShowIdGenModal(true)}
          className="flex-shrink-0 flex items-center gap-1.5 bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all self-start md:self-auto"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Generate Student ID</span>
        </button>
      </div>

      {/* 4 Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-cyan-500 flex flex-col justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            ADMITTED · MAY
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 my-2">
            20
          </div>
          <div className="text-xs text-emerald-600 font-mono font-medium">
            auto-pulled from forms
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-teal-500 flex flex-col justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            ONBOARDING DONE
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 my-2">
            14
          </div>
          <div className="text-xs text-emerald-600 font-mono font-medium">
            6 in progress
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-cyan-600 flex flex-col justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            IN COURSE
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 my-2">
            18
          </div>
          <div className="text-xs text-emerald-600 font-mono font-medium">
            1 awaiting batch
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-teal-600 flex flex-col justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            PLACED · MAY
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 my-2">
            1
          </div>
          <div className="text-xs text-emerald-600 font-mono font-medium">
            1 interviewing
          </div>
        </div>
      </div>

      {/* Filter Row & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
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
              20
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
              17
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
              1
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
              1
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, mobile, course..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#00897b] transition-all shadow-xs"
          />
        </div>
      </div>

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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {filteredStudents.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Student ID */}
                  <td className="py-3 px-3 font-mono font-bold text-[#00897b] whitespace-nowrap">
                    {s.id}
                  </td>

                  {/* Name · Contact */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-extrabold text-slate-900">{s.name}</div>
                    <div className="text-[10.5px] text-slate-400 font-mono">{s.phone}</div>
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
                    <div className="font-semibold">{s.batchTiming.split(' ')[0]}</div>
                    <div className="text-[9.5px] text-slate-400">{s.batchTiming.split(' ').slice(1).join(' ')}</div>
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
                      s.mockInterview.includes('Cleared')
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {s.mockInterview}
                    </span>
                  </td>

                  {/* Exam Booked · Fee */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <select
                      value={s.examStatus}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStudents(prev => prev.map(item => item.id === s.id ? { ...item, examStatus: val } : item));
                        showToast(`${s.name} Exam status updated`);
                      }}
                      className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10.5px] text-slate-700 outline-none"
                    >
                      <option value="Not Booked">Not Booked ⌵</option>
                      <option value="AAPC CPC Booked">AAPC CPC Booked</option>
                      <option value="Exam Scheduled">Exam Scheduled</option>
                    </select>
                  </td>

                  {/* Certified */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                      s.certified.includes('Certified')
                        ? 'bg-emerald-100 text-emerald-800 font-bold'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {s.certified}
                    </span>
                  </td>

                  {/* Placed */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      s.placementStatus.includes('Placed')
                        ? 'bg-emerald-100 text-emerald-800'
                        : s.placementStatus.includes('Interviewing')
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-600'
                    }`}>
                      {s.placementStatus}
                    </span>
                  </td>

                  {/* Fee */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-bold text-slate-900">{s.feeStatus}</div>
                    <div className="text-[10px] text-emerald-700 font-mono">{s.feeAmount}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Walk-in Registration Modal */}
      {showWalkinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h3 className="font-extrabold text-slate-900 text-base">Walk-In Student Registration</h3>
              </div>
              <button
                onClick={() => setShowWalkinModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWalkinSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Student Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PRIYANKA M"
                    value={newWalkin.name}
                    onChange={(e) => setNewWalkin({ ...newWalkin, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-[#00897b] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Mobile Contact</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 00000"
                    value={newWalkin.phone}
                    onChange={(e) => setNewWalkin({ ...newWalkin, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-[#00897b] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="student@gmail.com"
                  value={newWalkin.email}
                  onChange={(e) => setNewWalkin({ ...newWalkin, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-[#00897b] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Course</label>
                  <select
                    value={newWalkin.course}
                    onChange={(e) => setNewWalkin({ ...newWalkin, course: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 outline-none focus:border-[#00897b] focus:bg-white text-xs"
                  >
                    <option value="CPC Intensive Medical Coding">CPC Intensive</option>
                    <option value="Comprehensive Medical Coding + Hospital Internship">Comprehensive + Internship</option>
                    <option value="IPDRG Specialized Coding">IPDRG Specialized Coding</option>
                    <option value="CIC Certified Inpatient Coder">CIC Inpatient</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Batch Mode</label>
                  <select
                    value={newWalkin.mode}
                    onChange={(e) => setNewWalkin({ ...newWalkin, mode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 outline-none focus:border-[#00897b] focus:bg-white text-xs"
                  >
                    <option value="Classroom (Saravanampatti)">Classroom (Saravanampatti)</option>
                    <option value="Online (Live Zoom)">Online (Live Zoom)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Qualification</label>
                  <input
                    type="text"
                    placeholder="BSc Nursing / BCom 2023"
                    value={newWalkin.qualification}
                    onChange={(e) => setNewWalkin({ ...newWalkin, qualification: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-[#00897b] focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">College / Location</label>
                  <input
                    type="text"
                    placeholder="PSG College · Coimbatore"
                    value={newWalkin.college}
                    onChange={(e) => setNewWalkin({ ...newWalkin, college: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-[#00897b] focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Fee Amount Paid</label>
                  <input
                    type="text"
                    value={newWalkin.feePaid}
                    onChange={(e) => setNewWalkin({ ...newWalkin, feePaid: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-[#00897b] focus:bg-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Batch Timing</label>
                  <input
                    type="text"
                    value={newWalkin.timing}
                    onChange={(e) => setNewWalkin({ ...newWalkin, timing: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-[#00897b] focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowWalkinModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#00796b] hover:bg-[#00695c] text-white font-bold rounded-xl text-xs transition-all shadow-sm"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Student ID Modal */}
      {showIdGenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#00897b]" />
                <h3 className="font-extrabold text-slate-900 text-base">Student ID Generator</h3>
              </div>
              <button
                onClick={() => setShowIdGenModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl text-center">
                <span className="text-[10px] text-teal-300 font-mono block mb-1">GENERATED ID</span>
                <span className="text-xl font-mono font-black text-white tracking-widest bg-white/10 px-3 py-1 rounded-lg">
                  {generatedId}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Branch</label>
                  <select
                    value={idGen.branch}
                    onChange={(e) => setIdGen({ ...idGen, branch: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5"
                  >
                    <option value="S">S - Saravanampatti</option>
                    <option value="H">H - Hopes</option>
                    <option value="R">R - RS Puram</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Course</label>
                  <select
                    value={idGen.course}
                    onChange={(e) => setIdGen({ ...idGen, course: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5"
                  >
                    <option value="C">C - CPC</option>
                    <option value="I">I - IPDRG</option>
                    <option value="X">X - CIC</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Type</label>
                  <select
                    value={idGen.type}
                    onChange={(e) => setIdGen({ ...idGen, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5"
                  >
                    <option value="O">O - Online</option>
                    <option value="C">C - Classroom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Serial</label>
                  <input
                    type="text"
                    value={idGen.serial}
                    onChange={(e) => setIdGen({ ...idGen, serial: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-mono"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard?.writeText(generatedId);
                  showToast(`✓ Copied ID: ${generatedId}`);
                  setShowIdGenModal(false);
                }}
                className="w-full py-2.5 bg-[#00897b] hover:bg-[#00796b] text-white font-bold rounded-xl text-xs transition-all shadow-sm"
              >
                Copy & Use This ID
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
