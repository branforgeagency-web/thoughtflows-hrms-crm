import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, IndianRupee, BookOpen, Calendar, User, Sparkles, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { updateStudent } from '../services/api';
import { COURSE_CATEGORIES } from '../constants/courses';

export default function EditStudentFeeModal({ isOpen, onClose, student, courseRates = [], onSave }) {
  if (!isOpen || !student) return null;

  const studentIdentifier = student._id || student.id || student.studentId;

  const [name, setName] = useState(student.name || '');
  const [course, setCourse] = useState(student.course || 'CPC');
  const [courseFee, setCourseFee] = useState(student.courseFee !== undefined && student.courseFee !== null ? student.courseFee : '');
  const [examFee, setExamFee] = useState(student.examFee !== undefined && student.examFee !== null ? student.examFee : '');
  const [nextDueDate, setNextDueDate] = useState(student.nextDueDate || '');
  const [paymentPlan, setPaymentPlan] = useState(student.paymentPlan || 'Full Payment');
  const [hrName, setHrName] = useState(student.hrName || student.counsellor || '');
  const [notes, setNotes] = useState(student.notes || student.feeNote || '');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Sync state when student prop changes
  useEffect(() => {
    if (student) {
      setName(student.name || '');
      setCourse(student.course || 'CPC');
      setCourseFee(student.courseFee !== undefined && student.courseFee !== null ? student.courseFee : '');
      setExamFee(student.examFee !== undefined && student.examFee !== null ? student.examFee : '');
      setNextDueDate(student.nextDueDate || '');
      setPaymentPlan(student.paymentPlan || 'Full Payment');
      setHrName(student.hrName || student.counsellor || '');
      setNotes(student.notes || student.feeNote || '');
      setErrorMsg(null);
    }
  }, [student]);

  // When course changes, allow picking rate from courseRates catalog
  const handleCourseChange = (newCourse) => {
    setCourse(newCourse);
    const matchedRate = courseRates.find(
      cr => (cr.code || '').toUpperCase() === newCourse.toUpperCase() ||
            (cr.name || '').toUpperCase() === newCourse.toUpperCase()
    );
    if (matchedRate) {
      if (matchedRate.courseFee !== undefined && matchedRate.courseFee !== null) {
        setCourseFee(matchedRate.courseFee);
      }
      if (matchedRate.examFee !== undefined && matchedRate.examFee !== null) {
        setExamFee(matchedRate.examFee);
      }
    }
  };

  // Financial calculations
  const paidAmount = Number(student.paidAmount) || 0;
  const courseFeeNum = Number(courseFee) || 0;
  const examFeeNum = Number(examFee) || 0;
  const totalPayable = courseFeeNum + examFeeNum;
  const remainingBalance = Math.max(0, courseFeeNum - paidAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (courseFee === '' || isNaN(courseFeeNum) || courseFeeNum < 0) {
      setErrorMsg('Please enter a valid course fee (₹)');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim().toUpperCase(),
        course,
        courseFee: courseFeeNum,
        examFee: examFeeNum,
        nextDueDate,
        paymentPlan,
        hrName: hrName.trim(),
        notes: notes.trim()
      };

      const updated = await updateStudent(studentIdentifier, payload);

      showToast(`✓ Fee details updated for ${updated.name || name}`);
      if (onSave) {
        onSave(updated);
      }
      setTimeout(() => {
        onClose();
      }, 400);
    } catch (err) {
      console.error('Failed to update student fee record:', err);
      setErrorMsg(err.response?.data?.error || err.message || 'Could not save student fee record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-[70] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-teal-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Modal Card */}
      <div className="bg-white rounded-[28px] max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] my-auto text-left animate-in zoom-in-95 font-sans">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0e6977] via-[#0a4f5a] to-[#083b43] text-white p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shadow-inner">
              <IndianRupee className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>Edit Student Fee Record</span>
              </h3>
              <p className="text-xs text-teal-100 font-mono mt-0.5 flex items-center gap-2">
                <span>{student.name}</span>
                <span>·</span>
                <span className="font-bold bg-white/20 px-2 py-0.2 rounded-md">{student.studentId}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Financial Snapshot Strip */}
        <div className="bg-slate-50 border-b border-slate-200 p-3.5 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-slate-400 font-bold text-[10px] uppercase">Agreed Fee</div>
            <div className="font-mono font-black text-slate-800 text-sm mt-0.5">
              ₹{courseFeeNum.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200 shadow-2xs">
            <div className="text-emerald-700 font-bold text-[10px] uppercase">Paid So Far</div>
            <div className="font-mono font-black text-emerald-800 text-sm mt-0.5">
              ₹{paidAmount.toLocaleString('en-IN')}
            </div>
          </div>
          <div className={`p-2 rounded-xl border shadow-2xs ${remainingBalance > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className={`font-bold text-[10px] uppercase ${remainingBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>Balance</div>
            <div className={`font-mono font-black text-sm mt-0.5 ${remainingBalance > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
              {remainingBalance > 0 ? `₹${remainingBalance.toLocaleString('en-IN')}` : 'Cleared ✓'}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Student Name */}
          <div>
            <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
              Student Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold outline-none focus:border-[#0e6977] focus:bg-white text-xs"
            />
          </div>

          {/* Enrolled Course */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase">
                Enrolled Course
              </label>
              <span className="text-[10px] text-teal-700 font-bold">Auto-updates standard fees</span>
            </div>
            <select
              value={course}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 hover:border-[#0e6977] rounded-xl px-3 py-2.5 text-slate-900 font-bold outline-none focus:border-[#0e6977] focus:bg-white text-xs cursor-pointer"
            >
              {/* Fallback option if custom course */}
              {course && !COURSE_CATEGORIES.some(cat => cat.courses?.some(c => c.name === course || c.code === course || `${c.code} - ${c.name}` === course)) && (
                <option value={course}>{course}</option>
              )}
              {COURSE_CATEGORIES.map((cat) => (
                <optgroup key={cat.category} label={cat.title}>
                  {cat.courses?.map((c) => {
                    const val = c.code === c.name ? c.name : `${c.code} - ${c.name}`;
                    return (
                      <option key={c.code} value={c.code}>
                        {val}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Course Fee & Exam Fee Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
              <label className="block text-[10.5px] font-mono font-black text-emerald-900 uppercase">
                Course Fee (Tuition ₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={courseFee}
                onChange={(e) => setCourseFee(e.target.value)}
                placeholder="e.g. 21000"
                className="w-full bg-white border border-emerald-300 focus:border-emerald-600 rounded-xl px-3 py-2 text-emerald-950 font-mono font-black text-xs outline-none shadow-2xs"
              />
              <p className="text-[10px] text-emerald-700">Official fee charged for tuition</p>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1">
              <label className="block text-[10.5px] font-mono font-black text-blue-900 uppercase">
                Exam Fee (CCCP ₹)
              </label>
              <input
                type="number"
                min="0"
                value={examFee}
                onChange={(e) => setExamFee(e.target.value)}
                placeholder="0 for No Exam, or 70207"
                className="w-full bg-white border border-blue-300 focus:border-blue-600 rounded-xl px-3 py-2 text-blue-950 font-mono font-bold text-xs outline-none shadow-2xs"
              />
              <p className="text-[10px] text-blue-700">Voucher cost reflects to CCCP Head</p>
            </div>
          </div>

          {/* Payment Plan & Next Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
                Payment Plan
              </label>
              <select
                value={paymentPlan}
                onChange={(e) => setPaymentPlan(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-semibold outline-none focus:border-[#0e6977] focus:bg-white text-xs cursor-pointer"
              >
                <option value="Full Payment">Full Payment</option>
                <option value="2 Installments">2 Installments</option>
                <option value="3 Installments">3 Installments</option>
                <option value="4 Installments">4 Installments</option>
                <option value="Custom EMI">Custom EMI / Installment</option>
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
                Next Due Date
              </label>
              <input
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono outline-none focus:border-[#0e6977] focus:bg-white text-xs"
              />
            </div>
          </div>

          {/* Counsellor */}
          <div>
            <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
              Counsellor / Admitted HR
            </label>
            <input
              type="text"
              value={hrName}
              onChange={(e) => setHrName(e.target.value)}
              placeholder="e.g. Priyadharshini"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold outline-none focus:border-[#0e6977] focus:bg-white text-xs"
            />
          </div>

          {/* Discussion Notes */}
          <div>
            <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
              Fee & Payment Discussion Notes
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Special concession agreed, paying 2nd installment on 15th..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white text-xs leading-relaxed"
            />
          </div>

          {/* Total Summary Footer Box */}
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl text-teal-950 text-xs space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span>Total Fee (Course + Exam):</span>
              <span className="font-mono font-black text-sm text-[#0e6977]">
                ₹{totalPayable.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-teal-800">
              <span>Remaining Balance:</span>
              <span className="font-mono font-bold">
                ₹{remainingBalance.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#0e6977] hover:bg-[#00796b] text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saving ? 'Updating…' : 'Update Fee Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
