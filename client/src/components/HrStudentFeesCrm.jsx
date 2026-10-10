import React, { useState, useEffect, useMemo } from 'react';
import {
  IndianRupee,
  Plus,
  Search,
  Filter,
  Info,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Download,
  Sparkles,
  X,
  FileSpreadsheet,
  Receipt,
  Copy,
  Check
} from 'lucide-react';
import { getCourseFeeRates, saveCourseFeeRate, getStudents, updateStudent, recordStudentPayment } from '../services/api';
import { localDateKey } from '../utils/dateUtils';
import AddCourseRateModal from './AddCourseRateModal';
import EditStudentFeeModal from './EditStudentFeeModal';

export default function HrStudentFeesCrm({ students: propStudents, onRefreshStudents, currentUser }) {
  const [toastMsg, setToastMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCourseRateModal, setShowCourseRateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingFeeStudent, setEditingFeeStudent] = useState(null);
  const [viewingReceiptsStudent, setViewingReceiptsStudent] = useState(null);
  const [copiedTxnId, setCopiedTxnId] = useState(null);
  const [feeStatusFilter, setFeeStatusFilter] = useState('all'); // 'all' | 'pending' | 'overdue' | 'cleared'

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Live Course Fee Rates Catalog
  const [courseRates, setCourseRates] = useState([]);
  const [students, setStudents] = useState(propStudents || []);

  const refreshStudents = async () => {
    try {
      const params = currentUser?.name ? { hrName: currentUser.name } : undefined;
      const res = await getStudents(params);
      if (Array.isArray(res)) {
        setStudents(res);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  useEffect(() => {
    getCourseFeeRates()
      .then(res => {
        if (Array.isArray(res)) setCourseRates(res);
      })
      .catch(err => console.error('Error fetching course fee rates:', err));
  }, []);

  useEffect(() => {
    if (propStudents !== undefined) {
      setStudents(propStudents);
    } else {
      refreshStudents();
    }
  }, [propStudents, currentUser?.name]);

  // Unique admitted students with valid IDs for the selector
  const admittedStudentsList = useMemo(() => {
    const map = new Map();
    (students || []).forEach(s => {
      const sid = (s.studentId || s.id || '').trim();
      if (sid && !map.has(sid.toUpperCase())) {
        map.set(sid.toUpperCase(), {
          ...s,
          studentId: sid
        });
      }
    });
    return Array.from(map.values());
  }, [students]);

  // Form State for Add Record
  const [newRecord, setNewRecord] = useState({
    id: '',
    name: '',
    course: 'CPC',
    counsellor: currentUser?.name || '',
    courseFee: ''
  });

  // Calculate dynamic fees mapping
  const courseRateMap = useMemo(() => {
    const map = {};
    courseRates.forEach(cr => {
      map[cr.code] = cr;
    });
    return map;
  }, [courseRates]);

  // Student course text ("CPC — Certified Professional Coder") → its rate row
  const rateFor = (course = '') => {
    const c = String(course).trim().toUpperCase();
    if (!c) return null;
    return courseRateMap[course]
      || courseRates.find(cr => (cr.code || '').toUpperCase() === c || (cr.name || '').toUpperCase() === c)
      || courseRates.find(cr => cr.code && c.split(/[^A-Z0-9/-]+/).includes(cr.code.toUpperCase()))
      || null;
  };
  // Exam fee: the student's own exam fee, else the course rate's — never a guessed default
  const examFeeOf = (s) => Number(s.examFee) || Number(rateFor(s.course)?.examFee) || 0;
  const balanceOf = (s) => Math.max(0, (Number(s.courseFee) || 0) - (Number(s.paidAmount) || 0));

  // Handle student ID selection: auto-fills name, course, and course fee if matched
  const handleSelectStudentId = (selectedId) => {
    const trimmedId = (selectedId || '').trim();
    if (!trimmedId) {
      setNewRecord(prev => ({
        ...prev,
        id: '',
        name: ''
      }));
      return;
    }

    const matched = students.find(
      s => (s.studentId && s.studentId.toLowerCase() === trimmedId.toLowerCase()) ||
           (s.id && s.id.toLowerCase() === trimmedId.toLowerCase())
    );

    if (matched) {
      const rawCourse = (matched.course || 'CPC').toUpperCase();
      let normalizedCourse = rawCourse;
      const exactCr = courseRates.find(c => (c.code || '').toUpperCase() === rawCourse || (c.name || '').toUpperCase() === rawCourse);
      if (exactCr) {
        normalizedCourse = exactCr.code;
      } else if (rawCourse.includes('AMCT-INT') || rawCourse.includes('INTERMEDIATE')) normalizedCourse = 'AMCT-INT';
      else if (rawCourse.includes('AMCT-ADV') || rawCourse.includes('ADVANCED')) normalizedCourse = 'AMCT-ADV';
      else if (rawCourse.includes('AMCT-BEG') || rawCourse.includes('BEGINNER')) normalizedCourse = 'AMCT-BEG';
      else if (rawCourse.includes('AMCT')) normalizedCourse = 'AMCT-INT';
      else if (rawCourse.includes('CCS-FRESHER')) normalizedCourse = 'CCS-Fresher';
      else if (rawCourse.includes('CCS-OTHER')) normalizedCourse = 'CCS-Other';
      else if (rawCourse.includes('CCS')) normalizedCourse = 'CCS';
      else if (rawCourse.includes('ED')) normalizedCourse = 'ED';
      else if (rawCourse.includes('E/M') || rawCourse.includes('EM')) normalizedCourse = 'E/M';
      else if (rawCourse.includes('SURGERY')) normalizedCourse = 'Surgery';
      else if (rawCourse.includes('IP-DRG') || rawCourse.includes('IPDRG')) normalizedCourse = 'IP-DRG';
      else if (rawCourse.includes('CPC')) normalizedCourse = 'CPC';

      const cr = courseRateMap[normalizedCourse];
      const fee = Number(matched.courseFee) || (cr ? Number(cr.courseFee) || 0 : 0);

      setNewRecord(prev => ({
        ...prev,
        id: matched.studentId || matched.id || trimmedId,
        name: (matched.name || '').toUpperCase(),
        course: normalizedCourse,
        counsellor: matched.hrName || currentUser?.name || '',
        courseFee: fee
      }));
    } else {
      setNewRecord(prev => ({ ...prev, id: selectedId }));
    }
  };

  // Fee status counts for quick tab counters
  const feeStatusCounts = useMemo(() => {
    const today = localDateKey();
    let pending = 0;
    let overdue = 0;
    let cleared = 0;
    students.forEach(s => {
      const bal = balanceOf(s);
      if (bal > 0) {
        pending++;
        if (s.nextDueDate && s.nextDueDate <= today) overdue++;
      } else if (Number(s.courseFee) > 0) {
        cleared++;
      }
    });
    return { pending, overdue, cleared, total: students.length };
  }, [students]);

  // Filtered Students (Supports Fee Status, Student ID, Name, Phone, Course, Counsellor, Txn ID / Reference, Receipt No)
  const filteredStudents = useMemo(() => {
    const today = localDateKey();
    return students.filter(s => {
      const bal = balanceOf(s);
      const isOverdue = bal > 0 && s.nextDueDate && s.nextDueDate <= today;
      if (feeStatusFilter === 'pending' && bal <= 0) return false;
      if (feeStatusFilter === 'overdue' && !isOverdue) return false;
      if (feeStatusFilter === 'cleared' && (bal > 0 || !(Number(s.courseFee) > 0))) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const basicMatch =
        (s.name || '').toLowerCase().includes(q) ||
        (s.studentId || s.id || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q) ||
        (s.course || '').toLowerCase().includes(q) ||
        (s.counsellor || s.hrName || '').toLowerCase().includes(q);

      if (basicMatch) return true;

      const receipts = Array.isArray(s.receipts) ? s.receipts : [];
      return receipts.some(r =>
        (r.reference || '').toLowerCase().includes(q) ||
        (r.receiptNo || r.id || '').toLowerCase().includes(q) ||
        (r.label || '').toLowerCase().includes(q) ||
        (r.mode || '').toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery, feeStatusFilter]);

  // Calculations for Summary
  const { totalCourseFee, totalExamFee, grandTotal, totalPaid, totalBalance } = useMemo(() => {
    let cTotal = 0;
    let eTotal = 0;
    let paid = 0;
    let bal = 0;
    filteredStudents.forEach(s => {
      cTotal += Number(s.courseFee) || 0;
      eTotal += examFeeOf(s);
      paid += Number(s.paidAmount) || 0;
      bal += balanceOf(s);
    });
    return {
      totalCourseFee: cTotal,
      totalExamFee: eTotal,
      grandTotal: cTotal + eTotal,
      totalPaid: paid,
      totalBalance: bal
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredStudents, courseRateMap, courseRates]);

  // Record a fee instalment → receipt + recomputed balance on the student record
  const emptyPayment = () => ({ amount: '', mode: 'UPI / GPay / PhonePe', date: localDateKey(), reference: '', note: '', nextDueDate: '' });
  const [payingStudent, setPayingStudent] = useState(null);
  const [payment, setPayment] = useState(emptyPayment);
  const [savingPayment, setSavingPayment] = useState(false);
  const openPayment = (stu) => {
    setPayment({ ...emptyPayment(), nextDueDate: stu.nextDueDate || '' });
    setPayingStudent(stu);
  };
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!(Number(payment.amount) > 0)) { showToast('Enter the amount received'); return; }
    setSavingPayment(true);
    try {
      const updated = await recordStudentPayment(payingStudent.studentId || payingStudent._id, { ...payment, amount: Number(payment.amount) });
      setStudents(prev => prev.map(s => (s._id === updated._id ? updated : s)));
      if (onRefreshStudents) onRefreshStudents();
      showToast(`✓ ₹${Number(payment.amount).toLocaleString('en-IN')} recorded for ${updated.name}`);
      setPayingStudent(null);
    } catch (err) {
      showToast(`⚠ Not saved: ${err?.response?.data?.error || err.message}`);
    } finally {
      setSavingPayment(false);
    }
  };

  // Add Record Handler
  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!newRecord.name.trim()) {
      showToast('Please provide a student name');
      return;
    }
    const feeNum = Number(newRecord.courseFee) || 0;
    const finalStudentId = newRecord.id.trim();
    if (!finalStudentId) {
      showToast('Select an admitted student ID');
      return;
    }

    try {
      const matched = students.find(
        s => (s.studentId && s.studentId.toLowerCase() === finalStudentId.toLowerCase()) ||
             (s.id && s.id.toLowerCase() === finalStudentId.toLowerCase()) ||
             (s._id && s._id === finalStudentId)
      );

      if (matched && matched._id) {
        await updateStudent(matched._id, {
          course: newRecord.course,
          courseFee: feeNum,
          hrName: newRecord.counsellor
        });
      } else if (!matched) {
        showToast('⚠ No admitted student with this ID. Register the student under Admitted Students first.');
        return;
      }

      await refreshStudents();
      if (onRefreshStudents) onRefreshStudents();
      showToast(`✓ Fee record saved for ${newRecord.name}`);
    } catch (err) {
      showToast(`⚠ Not saved: ${err?.response?.data?.error || err.message}`);
      return;
    }

    setShowAddModal(false);
    setNewRecord({
      id: '',
      name: '',
      course: 'CPC',
      counsellor: currentUser?.name || '',
      courseFee: ''
    });
  };

  return (
    <div className="w-full space-y-5 pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-teal-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Student <span className="text-[#0e6977]">Fees</span></span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-700 font-extrabold text-xl sm:text-2xl">CRM</span>
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1">
            Every admitted student's course & exam fee. Course fee is ENTERED per student; the exam fee auto-fills from the course rate and reflects in the CCCP head.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              refreshStudents();
              setShowAddModal(true);
            }}
            className="bg-[#0e6977] hover:bg-[#0a4f5a] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Fee Record</span>
          </button>
        </div>
      </div>

      {/* Warning / Audit Notice Banner */}
      <div className="bg-[#f5f3ff] border border-purple-200 rounded-xl p-3.5 sm:p-4 text-purple-900 flex items-start sm:items-center gap-3 shadow-xs">
        <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5 sm:mt-0" />
        <div className="text-xs sm:text-[12.5px] leading-relaxed">
          <strong>Notice:</strong> The exam fee auto-fills to reduce admitted course rate - no manual entry. Course fee is unusual if earned/enrolled student. The exam fee also reflects in the CCCP Head's Correction cell for audit/tracking.
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex-wrap sm:flex-nowrap">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Student ID, Name, Txn ID / UTR, Receipt No..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-[#0e6977] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="text-xs font-mono text-slate-500 font-bold whitespace-nowrap">
          Showing <strong>{filteredStudents.length}</strong> admissions
        </div>
      </div>

      {/* Quick Filter Tabs for Fee Status */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setFeeStatusFilter('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            feeStatusFilter === 'all'
              ? 'bg-[#0e6977] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Admissions ({feeStatusCounts.total})
        </button>

        <button
          type="button"
          onClick={() => setFeeStatusFilter('pending')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            feeStatusFilter === 'pending'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100/70'
          }`}
        >
          <span>Pending Balance</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-black ${
            feeStatusFilter === 'pending' ? 'bg-white/25 text-white' : 'bg-amber-200/90 text-amber-950'
          }`}>
            {feeStatusCounts.pending}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFeeStatusFilter('overdue')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            feeStatusFilter === 'overdue'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100/70'
          }`}
        >
          <span>Overdue Installments</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-black ${
            feeStatusFilter === 'overdue' ? 'bg-white/25 text-white' : 'bg-rose-200 text-rose-900'
          }`}>
            {feeStatusCounts.overdue}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFeeStatusFilter('cleared')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            feeStatusFilter === 'cleared'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100/70'
          }`}
        >
          <span>Fully Cleared</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-black ${
            feeStatusFilter === 'cleared' ? 'bg-white/25 text-white' : 'bg-emerald-200 text-emerald-900'
          }`}>
            {feeStatusCounts.cleared}
          </span>
        </button>
      </div>

      {/* TABLE 1: STUDENT FEE LEDGER */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <span>Student Fee Ledger</span>
              <span className="text-slate-400 font-normal">·</span>
              <span className="text-slate-500 text-xs font-semibold">{students.length} admissions · pulled from CRM</span>
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">STUDENT ID</th>
                <th className="py-3 px-4">STUDENT NAME</th>
                <th className="py-3 px-4">COURSE</th>
                <th className="py-3 px-4">COUNSELLOR</th>
                <th className="py-3 px-4 text-right">COURSE FEE</th>
                <th className="py-3 px-4 text-right">EXAM FEE (CCCP)</th>
                <th className="py-3 px-4 text-right">TOTAL FEE</th>
                <th className="py-3 px-4 text-right">PAID</th>
                <th className="py-3 px-4 text-right">BALANCE</th>
                <th className="py-3 px-4 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((stu) => {
                const examFee = examFeeOf(stu);
                const total = (Number(stu.courseFee) || 0) + examFee;
                const balance = balanceOf(stu);
                const q = searchQuery.trim().toLowerCase();
                const matchedReceipt = q ? (stu.receipts || []).find(r =>
                  (r.reference && r.reference.toLowerCase().includes(q)) ||
                  ((r.receiptNo || r.id) && (r.receiptNo || r.id).toLowerCase().includes(q))
                ) : null;

                return (
                  <tr key={stu._id || stu.studentId} className="hover:bg-teal-50/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-500 text-[11px]">
                      {stu.studentId}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-slate-900">
                      <div>{stu.name}</div>
                      {matchedReceipt && (
                        <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-300 text-amber-900 text-[10.5px] font-mono font-bold animate-in fade-in">
                          <span className="text-amber-700 font-black">✓ Matched Txn:</span>
                          <span className="bg-amber-100/90 px-1 py-0.2 rounded text-slate-900">{matchedReceipt.reference || matchedReceipt.receiptNo}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-emerald-700 font-black">₹{(Number(matchedReceipt.amount) || 0).toLocaleString('en-IN')}</span>
                          {matchedReceipt.mode && <span className="text-slate-500 font-normal">({matchedReceipt.mode})</span>}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200/80 font-bold text-[10.5px]">
                        {stu.course}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {stu.hrName}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800 font-mono">
                      ₹{(Number(stu.courseFee) || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      <span className="inline-flex items-center gap-1">
                        <span>₹{examFee.toLocaleString('en-IN')}</span>
                        <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-black">
                          CCCP
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 font-mono">
                      ₹{total.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700 font-mono">
                      ₹{(Number(stu.paidAmount) || 0).toLocaleString('en-IN')}
                    </td>
                    <td className={`py-3 px-4 text-right font-black font-mono ${balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {balance > 0 ? `₹${balance.toLocaleString('en-IN')}` : 'Cleared'}
                      {balance > 0 && stu.nextDueDate && <div className="text-[9.5px] font-semibold text-slate-400">due {stu.nextDueDate}</div>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingFeeStudent(stu)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 font-bold text-[11px] border border-slate-200 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                          title="Edit Fee Record"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        {Array.isArray(stu.receipts) && stu.receipts.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setViewingReceiptsStudent(stu)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                            title="View Receipts & Transaction IDs"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Txn ({stu.receipts.length})</span>
                          </button>
                        )}
                        <button
                          onClick={() => openPayment(stu)}
                          disabled={balance === 0 && Number(stu.courseFee) > 0}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-[11px] border border-teal-200 transition-all cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <IndianRupee className="w-3 h-3" />
                          <span>Record payment</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Total Summary Footer Row */}
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200 font-black text-xs">
                <td colSpan={4} className="py-3.5 px-4 text-right font-extrabold text-slate-700 uppercase tracking-wider">
                  Total:
                </td>
                <td className="py-3.5 px-4 text-right text-slate-900 font-mono font-black">
                  ₹{totalCourseFee.toLocaleString('en-IN')}
                </td>
                <td className="py-3.5 px-4 text-right text-slate-900 font-mono font-black">
                  ₹{totalExamFee.toLocaleString('en-IN')}
                </td>
                <td className="py-3.5 px-4 text-right text-[#0e6977] font-mono font-black text-sm">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </td>
                <td className="py-3.5 px-4 text-right text-emerald-700 font-mono font-black">
                  ₹{totalPaid.toLocaleString('en-IN')}
                </td>
                <td className="py-3.5 px-4 text-right text-amber-700 font-mono font-black">
                  ₹{totalBalance.toLocaleString('en-IN')}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* TABLE 2: FEE STRUCTURE BY COURSE */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <span>Fee Structure by Course</span>
              <span className="text-slate-400 font-normal">·</span>
              <span className="text-slate-500 text-xs font-semibold">
                Official course fee rates & CCCP exam fees
              </span>
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">CODE</th>
                <th className="py-3 px-4">COURSE NAME</th>
                <th className="py-3 px-4 text-right">ORIGINAL FEE</th>
                <th className="py-3 px-4 text-right">STANDARD FEE</th>
                <th className="py-3 px-4 text-right">DISCOUNTED FEE</th>
                <th className="py-3 px-4 text-right">EXAM FEE (CCCP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courseRates.map((cr) => (
                <tr key={cr.code} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-black text-slate-900 font-mono">
                    {cr.code}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-700">
                    {cr.name}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-400 line-through font-mono">
                    {cr.originalFee ? `₹${Number(cr.originalFee).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-600 font-mono">
                    {cr.standardFee ? `₹${Number(cr.standardFee).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-emerald-700 font-mono">
                    ₹{Number(cr.courseFee).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-800 font-mono">
                    <span className="inline-flex items-center gap-1">
                      <span>₹{(cr.examFee || 0).toLocaleString('en-IN')}</span>
                      <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-black">
                        CCCP
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Student Fee Record */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💳</span>
                <h3 className="font-extrabold text-slate-900 text-base">Add Student Fee Record</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRecord} className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    Admitted Student ID
                  </label>
                  <span className="text-[10px] text-teal-700 font-mono font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                    {admittedStudentsList.length} admitted students
                  </span>
                </div>

                {/* Dropdown displaying ALL admitted student IDs with their names and courses */}
                <select
                  value={newRecord.id}
                  onChange={(e) => handleSelectStudentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 hover:border-[#0e6977] rounded-xl px-3 py-2.5 text-slate-900 font-mono font-bold outline-none focus:border-[#0e6977] focus:bg-white text-xs cursor-pointer shadow-xs transition-colors"
                >
                  <option value="">— Select an Admitted Student ID —</option>
                  {admittedStudentsList.map((s) => (
                    <option key={s.studentId} value={s.studentId}>
                      {s.studentId} — {s.name} ({s.course || 'CPC'})
                    </option>
                  ))}
                </select>

                {/* Live Match Notification Pill */}
                {newRecord.id && (
                  <div className="mt-1.5 flex items-center justify-between px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] animate-in fade-in">
                    <div className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>ID: <strong className="font-mono text-emerald-950 font-bold">{newRecord.id}</strong></span>
                    </div>
                    {newRecord.name && (
                      <span className="font-bold text-emerald-700">Auto-filled: {newRecord.name}</span>
                    )}
                  </div>
                )}

                {/* Manual entry fallback */}
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Or custom ID:</span>
                  <input
                    type="text"
                    placeholder="Type ID manually"
                    value={newRecord.id}
                    onChange={(e) => handleSelectStudentId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-mono text-[11px] outline-none focus:border-[#0e6977]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Student Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PRIYA RAMESH"
                  value={newRecord.name}
                  onChange={(e) => setNewRecord({ ...newRecord, name: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 uppercase font-bold outline-none focus:border-[#0e6977] focus:bg-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Course</label>
                  <select
                    value={newRecord.course}
                    onChange={(e) => {
                      const selCourse = e.target.value;
                      const cr = courseRateMap[selCourse];
                      setNewRecord({
                        ...newRecord,
                        course: selCourse,
                        courseFee: cr ? cr.courseFee : newRecord.courseFee
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white text-xs font-semibold"
                  >
                    {courseRates.map(cr => (
                      <option key={cr.code} value={cr.code}>{cr.code}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Course Fee (₹)</label>
                  <input
                    type="number"
                    required
                    value={newRecord.courseFee}
                    onChange={(e) => setNewRecord({ ...newRecord, courseFee: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 font-mono font-bold outline-none focus:border-[#0e6977] focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Counsellor</label>
                <input
                  type="text"
                  required
                  value={newRecord.counsellor}
                  onChange={(e) => setNewRecord({ ...newRecord, counsellor: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white text-xs"
                />
              </div>

              <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-[11.5px] text-teal-900 space-y-1">
                <div className="flex justify-between">
                  <span>Exam Fee (CCCP Auto-filled):</span>
                  <span className="font-bold font-mono">
                    ₹{(Number(courseRateMap[newRecord.course]?.examFee) || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between font-black text-teal-950 pt-1 border-t border-teal-200">
                  <span>Total Payable:</span>
                  <span className="font-mono">
                    ₹{((Number(newRecord.courseFee) || 0) + (Number(courseRateMap[newRecord.course]?.examFee) || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#0e6977] hover:bg-[#00796b] text-white font-bold rounded-xl text-xs transition-all shadow-sm"
                >
                  Add Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Payment */}
      {payingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => !savingPayment && setPayingStudent(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Record payment</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{payingStudent.name} · <span className="font-mono">{payingStudent.studentId}</span></p>
              </div>
              <button onClick={() => setPayingStudent(null)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="bg-slate-50 rounded-xl p-2 border border-slate-200"><div className="text-slate-500 font-bold">Course fee</div><div className="font-mono font-black">₹{(Number(payingStudent.courseFee) || 0).toLocaleString('en-IN')}</div></div>
              <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-200"><div className="text-emerald-700 font-bold">Paid</div><div className="font-mono font-black text-emerald-800">₹{(Number(payingStudent.paidAmount) || 0).toLocaleString('en-IN')}</div></div>
              <div className="bg-amber-50 rounded-xl p-2 border border-amber-200"><div className="text-amber-700 font-bold">Balance</div><div className="font-mono font-black text-amber-800">₹{balanceOf(payingStudent).toLocaleString('en-IN')}</div></div>
            </div>
            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <label className="block"><span className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Amount (₹)</span>
                  <input type="number" min="1" required autoFocus value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold outline-none focus:border-[#0e6977] focus:bg-white" />
                </label>
                <label className="block"><span className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Date</span>
                  <input type="date" value={payment.date} onChange={(e) => setPayment({ ...payment, date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0e6977] focus:bg-white" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block"><span className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Mode</span>
                  <select value={payment.mode} onChange={(e) => setPayment({ ...payment, mode: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 outline-none focus:border-[#0e6977] focus:bg-white font-semibold">
                    {['UPI / GPay / PhonePe', 'Cash', 'Card', 'Bank Transfer', 'Cheque', 'EMI / Loan'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </label>
                <label className="block"><span className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Reference / Txn ID</span>
                  <input value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0e6977] focus:bg-white" />
                </label>
              </div>
              <label className="block"><span className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Next due date (if balance remains)</span>
                <input type="date" value={payment.nextDueDate} onChange={(e) => setPayment({ ...payment, nextDueDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0e6977] focus:bg-white" />
              </label>
              <label className="block"><span className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Note (optional)</span>
                <input value={payment.note} onChange={(e) => setPayment({ ...payment, note: e.target.value })} placeholder="e.g. 2nd instalment" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0e6977] focus:bg-white" />
              </label>
              <div className="pt-2 flex items-center gap-2">
                <button type="button" onClick={() => setPayingStudent(null)} className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl">Cancel</button>
                <button type="submit" disabled={savingPayment} className="w-1/2 py-2.5 bg-[#0e6977] hover:bg-[#00796b] text-white font-bold rounded-xl shadow-sm disabled:opacity-50">{savingPayment ? 'Saving…' : 'Save payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Course Rate */}
      <AddCourseRateModal
        isOpen={showCourseRateModal || Boolean(editingCourse)}
        initialData={editingCourse}
        existingCourses={courseRates}
        onClose={() => {
          setShowCourseRateModal(false);
          setEditingCourse(null);
        }}
        onSave={async (rateData) => {
          try {
            const saved = await saveCourseFeeRate(rateData);
            setCourseRates(prev => {
              const exists = prev.some(cr => cr.code === saved.code);
              if (exists) {
                return prev.map(cr => cr.code === saved.code ? { ...cr, ...saved } : cr);
              }
              return [saved, ...prev];
            });
            showToast(`✓ Saved real course rate for ${saved.code} to database`);
          } catch (err) {
            console.error('Failed to save course fee rate:', err);
            showToast('Error saving course rate to database');
          }
        }}
      />

      {/* Modal: Edit Student Fee Record */}
      <EditStudentFeeModal
        isOpen={Boolean(editingFeeStudent)}
        student={editingFeeStudent}
        courseRates={courseRates}
        onClose={() => setEditingFeeStudent(null)}
        onSave={(updatedStudent) => {
          setStudents((prev) =>
            prev.map((s) =>
              (s._id && s._id === updatedStudent._id) ||
              (s.studentId && s.studentId === updatedStudent.studentId)
                ? { ...s, ...updatedStudent }
                : s
            )
          );
          if (onRefreshStudents) onRefreshStudents();
        }}
      />

      {/* Modal: View Student Receipts & Transaction IDs */}
      {viewingReceiptsStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in" onClick={() => setViewingReceiptsStudent(null)}>
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0e6977] via-[#0a4f5a] to-[#083b43] text-white p-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shadow-inner">
                  <Receipt className="w-5 h-5 text-teal-200" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Payment & Receipt Ledger</h3>
                  <p className="text-xs text-teal-100 font-mono mt-0.5">
                    {viewingReceiptsStudent.name} · <span className="font-bold">{viewingReceiptsStudent.studentId}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingReceiptsStudent(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Financial Summary Strip */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-slate-500 font-bold text-[10.5px] uppercase tracking-wider">Total Fee</div>
                <div className="font-mono font-black text-slate-900 text-sm mt-0.5">
                  ₹{(Number(viewingReceiptsStudent.courseFee) || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                <div className="text-emerald-700 font-bold text-[10.5px] uppercase tracking-wider">Paid So Far</div>
                <div className="font-mono font-black text-emerald-800 text-sm mt-0.5">
                  ₹{(Number(viewingReceiptsStudent.paidAmount) || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                <div className="text-amber-700 font-bold text-[10.5px] uppercase tracking-wider">Balance</div>
                <div className="font-mono font-black text-amber-800 text-sm mt-0.5">
                  ₹{balanceOf(viewingReceiptsStudent).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Receipts List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                <span>Receipts & Transaction IDs</span>
                <span className="font-mono font-bold text-[#0e6977]">{(viewingReceiptsStudent.receipts || []).length} Recorded</span>
              </div>

              {(!viewingReceiptsStudent.receipts || viewingReceiptsStudent.receipts.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                  No individual receipts found for this student.
                </div>
              ) : (
                viewingReceiptsStudent.receipts.map((rc, idx) => (
                  <div
                    key={rc.id || rc.receiptNo || idx}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-teal-300 shadow-2xs transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                          <span>{rc.label || `Fee Instalment ${idx + 1}`}</span>
                          <span className="text-[10px] font-mono text-teal-800 bg-teal-50 px-2 py-0.2 rounded-full border border-teal-200 font-bold">
                            {rc.receiptNo || rc.id || `RC-${idx + 1}`}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                          <span>{rc.date || '—'}</span>
                          {rc.recordedBy && <span>· By {rc.recordedBy}</span>}
                          {rc.mode && <span className="font-semibold text-slate-600">· {rc.mode}</span>}
                        </div>
                      </div>
                      <div className="font-mono font-black text-emerald-700 text-sm whitespace-nowrap bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                        ₹{(Number(rc.amount) || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* Transaction Reference / UTR Number Box */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/80 -mx-3.5 -mb-3.5 p-2.5 px-3.5 rounded-b-2xl">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          Txn ID / Ref:
                        </span>
                        <span className={`text-[11.5px] font-mono font-bold truncate ${rc.reference ? 'text-slate-900' : 'text-slate-400 italic font-normal'}`}>
                          {rc.reference || 'Not recorded'}
                        </span>
                      </div>
                      {rc.reference && (
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(rc.reference);
                              setCopiedTxnId(rc.reference);
                              showToast('✓ Transaction ID copied to clipboard');
                              setTimeout(() => setCopiedTxnId(null), 2000);
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[10.5px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
                        >
                          {copiedTxnId === rc.reference ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-teal-600" />
                              <span>Copy Txn</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingReceiptsStudent(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
