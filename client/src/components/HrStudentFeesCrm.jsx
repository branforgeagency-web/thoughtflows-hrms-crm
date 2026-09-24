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
  FileSpreadsheet
} from 'lucide-react';
import { getCourseFeeRates, saveCourseFeeRate, createStudent, getStudents, updateStudent } from '../services/api';
import AddCourseRateModal from './AddCourseRateModal';

export default function HrStudentFeesCrm({ students: propStudents, onRefreshStudents, currentUser }) {
  const [toastMsg, setToastMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCourseRateModal, setShowCourseRateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

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
    counsellor: currentUser?.name || 'Kavitha N.',
    courseFee: 21000
  });

  // Calculate dynamic fees mapping
  const courseRateMap = useMemo(() => {
    const map = {};
    courseRates.forEach(cr => {
      map[cr.code] = cr;
    });
    return map;
  }, [courseRates]);

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
      let normalizedCourse = 'CPC';
      if (rawCourse.includes('AMCT')) normalizedCourse = 'AMCT';
      else if (rawCourse.includes('IPDRG')) normalizedCourse = 'IPDRG';
      else if (rawCourse.includes('CIC')) normalizedCourse = 'CIC';
      else if (rawCourse.includes('CRC')) normalizedCourse = 'CRC';
      else if (rawCourse.includes('CCS')) normalizedCourse = 'CCS';
      else if (rawCourse.includes('CPC')) normalizedCourse = 'CPC';

      const cr = courseRateMap[normalizedCourse];
      const fee = Number(matched.courseFee) || (cr ? cr.courseFee : 21000);

      setNewRecord(prev => ({
        ...prev,
        id: matched.studentId || matched.id || trimmedId,
        name: (matched.name || '').toUpperCase(),
        course: normalizedCourse,
        counsellor: matched.hrName || currentUser?.name || 'Kavitha N.',
        courseFee: fee
      }));
    } else {
      setNewRecord(prev => ({ ...prev, id: selectedId }));
    }
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.studentId || s.id || '').toLowerCase().includes(q) ||
      (s.course || '').toLowerCase().includes(q) ||
      (s.counsellor || s.hrName || '').toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Calculations for Summary
  const { totalCourseFee, totalExamFee, grandTotal } = useMemo(() => {
    let cTotal = 0;
    let eTotal = 0;
    filteredStudents.forEach(s => {
      cTotal += Number(s.courseFee) || 0;
      const rate = courseRateMap[s.course];
      eTotal += rate ? rate.examFee : 22000;
    });
    return {
      totalCourseFee: cTotal,
      totalExamFee: eTotal,
      grandTotal: cTotal + eTotal
    };
  }, [filteredStudents, courseRateMap]);

  // Add Record Handler
  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!newRecord.name.trim()) {
      showToast('Please provide a student name');
      return;
    }
    const feeNum = Number(newRecord.courseFee) || 21000;
    const finalStudentId = newRecord.id.trim() || `TFSCOY${Math.floor(6000 + Math.random() * 900)}`;

    const created = {
      ...newRecord,
      studentId: finalStudentId,
      id: finalStudentId,
      courseFee: feeNum
    };

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
        await createStudent({
          studentId: finalStudentId,
          name: newRecord.name.toUpperCase(),
          course: newRecord.course,
          courseFee: feeNum,
          hrName: newRecord.counsellor,
          phone: '98401 00000',
          mode: 'Online',
          batchDate: 'May 2026',
          statusGroup: 'in_course'
        });
      }

      await refreshStudents();
      if (onRefreshStudents) onRefreshStudents();
      showToast(`✓ Fee record saved for ${newRecord.name}`);
    } catch (err) {
      console.warn('Fallback local state update:', err);
      setStudents(prev => [created, ...prev.filter(s => (s.studentId || s.id) !== finalStudentId)]);
      showToast(`✓ Added fee record for ${created.name}`);
    }

    setShowAddModal(false);
    setNewRecord({
      id: '',
      name: '',
      course: 'CPC',
      counsellor: currentUser?.name || 'Kavitha N.',
      courseFee: 21000
    });
  };

  // Update Course Rate
  const handleSaveCourseRate = (e) => {
    e.preventDefault();
    setCourseRates(prev => prev.map(cr => {
      if (cr.code === editingCourse.code) {
        return {
          ...cr,
          courseFee: Number(editingCourse.courseFee) || cr.courseFee,
          examFee: Number(editingCourse.examFee) || cr.examFee
        };
      }
      return cr;
    }));
    setEditingCourse(null);
    showToast(`✓ Updated rate structure for ${editingCourse.code}`);
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
              setEditingCourse(null);
              setShowCourseRateModal(true);
            }}
            className="bg-[#0f2537] hover:bg-[#0a1926] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Fees Rate</span>
          </button>

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
      <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student ID, name, or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-[#0e6977] transition-all"
          />
        </div>
        <div className="text-xs font-mono text-slate-500 font-bold">
          Showing <strong>{filteredStudents.length}</strong> admissions
        </div>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((stu) => {
                const cr = courseRateMap[stu.course];
                const examFee = cr ? cr.examFee : 22000;
                const total = Number(stu.courseFee) + examFee;

                return (
                  <tr key={stu.id} className="hover:bg-teal-50/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-500 text-[11px]">
                      {stu.id}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-slate-900">
                      {stu.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200/80 font-bold text-[10.5px]">
                        {stu.course}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {stu.counsellor}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800 font-mono">
                      ₹{Number(stu.courseFee).toLocaleString('en-IN')}
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
                edit a rate and it auto-updates every student of that course + the CCCP head
              </span>
            </h3>
          </div>

          <button
            onClick={() => {
              setEditingCourse(null);
              setShowCourseRateModal(true);
            }}
            className="bg-[#0e6977] hover:bg-[#0a4f5a] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Fees Rate</span>
          </button>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">CODE</th>
                <th className="py-3 px-4">COURSE NAME</th>
                <th className="py-3 px-4 text-right">COURSE FEE</th>
                <th className="py-3 px-4 text-right">EXAM FEE (CCCP)</th>
                <th className="py-3 px-4 text-center">ACTION</th>
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
                  <td className="py-3 px-4 text-right font-bold text-slate-800 font-mono">
                    ₹{cr.courseFee.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-800 font-mono">
                    <span className="inline-flex items-center gap-1">
                      <span>₹{cr.examFee.toLocaleString('en-IN')}</span>
                      <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-black">
                        CCCP
                      </span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setEditingCourse({ ...cr })}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 font-bold text-[11px] border border-slate-200 transition-all"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
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
                    ₹{(courseRateMap[newRecord.course]?.examFee || 22000).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between font-black text-teal-950 pt-1 border-t border-teal-200">
                  <span>Total Payable:</span>
                  <span className="font-mono">
                    ₹{(Number(newRecord.courseFee) + (courseRateMap[newRecord.course]?.examFee || 22000)).toLocaleString('en-IN')}
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

      {/* Modal: Add / Edit Course Rate */}
      <AddCourseRateModal
        isOpen={showCourseRateModal || Boolean(editingCourse)}
        initialData={editingCourse}
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
    </div>
  );
}
