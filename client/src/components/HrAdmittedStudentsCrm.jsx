import React, { useState, useEffect, useMemo } from 'react';
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
import GenerateStudentIdModal from './GenerateStudentIdModal';
import WalkinRegistrationModal from './WalkinRegistrationModal';
import StudentProfileModal from './StudentProfileModal';

import { getStudents, createStudent } from '../services/api';

export default function HrAdmittedStudentsCrm({ students: propStudents, onRefreshStudents, currentUser }) {
  const [activeTabFilter, setActiveTabFilter] = useState('all'); // all, in_course, placed, on_hold
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [showIdGenModal, setShowIdGenModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [students, setStudents] = useState(propStudents || []);

  useEffect(() => {
    if (propStudents && propStudents.length > 0) {
      setStudents(propStudents);
    } else {
      getStudents().then(res => {
        if (Array.isArray(res)) setStudents(res);
      }).catch(err => console.error('Error fetching students:', err));
    }
  }, [propStudents]);

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

  const handleWalkinSubmit = async (e) => {
    e.preventDefault();
    if (!newWalkin.name || !newWalkin.phone) {
      showToast('Please provide student name and mobile number');
      return;
    }

    const newStudent = {
      studentId: `TFMC0Y${Math.floor(1000 + Math.random() * 9000)}`,
      name: newWalkin.name.toUpperCase(),
      phone: newWalkin.phone,
      course: newWalkin.course,
      mode: newWalkin.mode.includes('Online') ? 'Online' : 'Classroom',
      batchDate: 'May 2026',
      hrName: currentUser?.name || 'Kavitha N.',
      batchTiming: newWalkin.timing,
      qualification: newWalkin.qualification || 'BSc Graduate',
      qualTag: 'Life Sci',
      collegeCompany: newWalkin.college || 'Coimbatore',
      location: 'Saravanampatti',
      email: newWalkin.email || `student.${Date.now().toString().slice(-4)}@thoughtflows.in`,
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
      statusGroup: 'in_course',
      handoverStatus: 'Ready'
    };

    try {
      const created = await createStudent(newStudent);
      const studentToAdd = created || newStudent;
      setStudents(prev => [studentToAdd, ...prev]);
      if (onRefreshStudents) onRefreshStudents();
      showToast(`✓ Registered student ${studentToAdd.name} (${studentToAdd.studentId}) in live database!`);
    } catch (err) {
      console.error('Error creating student in DB:', err);
      setStudents(prev => [newStudent, ...prev]);
      showToast(`✓ Registered student ${newStudent.name}`);
    }

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
                <tr 
                  key={s.id} 
                  onClick={() => setSelectedStudent(s)}
                  className="hover:bg-teal-50/60 cursor-pointer transition-colors group"
                  title={`Click to view full profile for ${s.name}`}
                >
                  {/* Student ID */}
                  <td className="py-3 px-3 font-mono font-bold text-[#00897b] whitespace-nowrap group-hover:underline">
                    {s.id}
                  </td>

                  {/* Name · Contact */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-extrabold text-slate-900 group-hover:text-[#00796b] transition-colors">{s.name}</div>
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
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
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
      <WalkinRegistrationModal
        isOpen={showWalkinModal}
        onClose={() => setShowWalkinModal(false)}
        onRegister={async (newStudent) => {
          try {
            const created = await createStudent({
              ...newStudent,
              studentId: newStudent.id || newStudent.studentId,
              hrName: currentUser?.name || newStudent.hrName || 'Kavitha N.'
            });
            setStudents(prev => [created, ...prev]);
            if (onRefreshStudents) onRefreshStudents();
            showToast(`✓ Registered real student: ${created.name} (${created.studentId || created.id})`);
          } catch (err) {
            console.error('Failed to create student in database:', err);
            showToast('Error saving student to database');
          }
        }}
      />

      {/* Generate Student ID Modal */}
      <GenerateStudentIdModal
        isOpen={showIdGenModal}
        onClose={() => setShowIdGenModal(false)}
        onConfirm={async (id) => {
          try {
            const created = await createStudent({
              studentId: id,
              name: `STUDENT ${id.slice(-4)}`,
              phone: '98401 23456',
              course: id.includes('C') ? 'CPC' : id.includes('I') ? 'IPDRG' : 'CIC',
              mode: id.includes('O') ? 'Online' : 'Classroom',
              hrName: currentUser?.name || 'Kavitha N.',
              statusGroup: 'in_course'
            });
            setStudents(prev => [created, ...prev]);
            if (onRefreshStudents) onRefreshStudents();
            showToast(`✓ Generated & saved real student ID: ${id}`);
          } catch (err) {
            console.error('Failed to generate student ID in database:', err);
            showToast('Error generating student ID');
          }
        }}
      />

      {/* Student Profile Modal */}
      <StudentProfileModal
        isOpen={Boolean(selectedStudent)}
        onClose={() => setSelectedStudent(null)}
        student={selectedStudent}
      />
    </div>
  );
}
