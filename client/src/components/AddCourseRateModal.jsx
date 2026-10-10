import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Plus, Edit2, CheckCircle2, Lock } from 'lucide-react';

export default function AddCourseRateModal({ isOpen, onClose, onSave, initialData, existingCourses = [] }) {
  if (!isOpen) return null;

  // Selected course for editing vs creating new
  const [selectedCourseCode, setSelectedCourseCode] = useState(initialData?.code || '__NEW__');

  // Course Details
  const [courseCode, setCourseCode] = useState(initialData?.code || '');
  const [duration, setDuration] = useState(initialData?.duration || '3 Months');
  const [courseName, setCourseName] = useState(initialData?.name || '');

  // Fee Rates
  const [originalFee, setOriginalFee] = useState(initialData?.originalFee !== undefined && initialData?.originalFee !== null ? initialData.originalFee : '');
  const [standardFee, setStandardFee] = useState(initialData?.standardFee !== undefined && initialData?.standardFee !== null ? initialData.standardFee : (initialData?.newFeeNoDiscount || ''));
  const [courseFee, setCourseFee] = useState(initialData?.courseFee !== undefined && initialData?.courseFee !== null ? initialData.courseFee : (initialData?.fee || ''));
  const [examFee, setExamFee] = useState(initialData?.examFee !== undefined && initialData?.examFee !== null ? initialData.examFee : '');

  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const isEditing = selectedCourseCode && selectedCourseCode !== '__NEW__';

  // Load selected course details when course selection dropdown changes
  const handleCourseSelectionChange = (code) => {
    setSelectedCourseCode(code);
    if (!code || code === '__NEW__') {
      // Clear fields for adding new course
      setCourseCode('');
      setCourseName('');
      setDuration('3 Months');
      setOriginalFee('');
      setStandardFee('');
      setCourseFee('');
      setExamFee('');
    } else {
      // Find course from existingCourses
      const matched = existingCourses.find((c) => (c.code || '').toUpperCase() === code.toUpperCase());
      if (matched) {
        setCourseCode(matched.code || '');
        setCourseName(matched.name || '');
        setDuration(matched.duration || '3 Months');
        setOriginalFee(matched.originalFee !== undefined && matched.originalFee !== null ? matched.originalFee : (matched.oldFee || ''));
        setStandardFee(matched.standardFee !== undefined && matched.standardFee !== null ? matched.standardFee : (matched.newFeeNoDiscount || ''));
        setCourseFee(matched.courseFee !== undefined && matched.courseFee !== null ? matched.courseFee : (matched.fee || ''));
        setExamFee(matched.examFee !== undefined && matched.examFee !== null ? matched.examFee : '');
      }
    }
  };

  // Sync when initialData changes
  useEffect(() => {
    if (initialData?.code) {
      handleCourseSelectionChange(initialData.code);
    } else {
      setSelectedCourseCode('__NEW__');
    }
  }, [initialData?.code]);

  // Live calculation of Total Student Payable
  const { totalPayable } = useMemo(() => {
    const cFee = Number(courseFee) || 0;
    const eFee = Number(examFee) || 0;
    return { totalPayable: cFee + eFee };
  }, [courseFee, examFee]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!courseCode.trim()) {
      showToast('Please enter Course Code');
      return;
    }
    if (!courseName.trim()) {
      showToast('Please enter Course Name');
      return;
    }

    const cFeeNum = Number(courseFee) || 0;
    const eFeeNum = Number(examFee) || 0;

    const payload = {
      code: courseCode.trim().toUpperCase(),
      name: courseName.trim(),
      duration: duration.trim() || '3 Months',
      originalFee: Number(originalFee) || 0,
      standardFee: Number(standardFee) || 0,
      courseFee: cFeeNum,
      fee: cFeeNum,
      examFee: eFeeNum,
      examFeeText: eFeeNum > 0 ? `₹${eFeeNum.toLocaleString('en-IN')}` : 'NO EXAM',
      totalPayable: cFeeNum + eFeeNum
    };

    if (onSave) {
      onSave(payload);
    }

    showToast(`✓ ${isEditing ? 'Updated' : 'Added'} fee rate for ${payload.code}`);
    setTimeout(() => {
      onClose();
    }, 400);
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
      <div className="bg-white rounded-[28px] max-w-md sm:max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] my-auto text-left animate-in zoom-in-95 font-sans">
        
        {/* HEADER */}
        <div className="p-5 sm:p-6 pb-4 flex items-center justify-between border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEditing ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'}`}>
              {isEditing ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                {isEditing ? `Edit Course Fee Rate` : 'Add Course Fee Rate'}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {isEditing ? `Updating rates for ${courseCode || 'selected course'}` : 'Add a new course with official fee rates'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SCROLLABLE FORM */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* SECTION 1: COURSE SELECTION (EDIT EXISTING OR ADD NEW) */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[10.5px] font-mono font-black uppercase tracking-wider text-slate-600">
                COURSE RATE ACTION
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isEditing ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-teal-100 text-teal-800 border border-teal-200'}`}>
                {isEditing ? 'Editing Existing Rate' : 'Adding New Course'}
              </span>
            </div>

            <select
              value={selectedCourseCode}
              onChange={(e) => handleCourseSelectionChange(e.target.value)}
              className="w-full bg-white border border-slate-300 hover:border-[#0e6977] rounded-xl px-3 py-2.5 text-slate-900 font-bold outline-none focus:border-[#0e6977] text-xs cursor-pointer shadow-xs transition-colors"
            >
              <option value="__NEW__">➕ Add New Course Rate</option>
              {existingCourses && existingCourses.length > 0 && (
                <optgroup label="Select Existing Course to Edit Fee Rate">
                  {existingCourses.map((cr) => (
                    <option key={cr.code} value={cr.code}>
                      ✏️ Edit: {cr.code} — {cr.name} (Fee: ₹{Number(cr.courseFee || cr.fee || 0).toLocaleString('en-IN')})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* SECTION 2: COURSE DETAILS */}
          <div className="space-y-3">
            <div className="text-[11px] font-mono font-black uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
              <span>COURSE INFORMATION</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                  <span>Course Code</span>
                  {isEditing && (
                    <span className="text-[9.5px] text-amber-700 font-normal flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> Locked ID
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CPC, AMCT-B"
                  value={courseCode}
                  disabled={isEditing}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-slate-900 outline-none transition-all font-mono font-bold text-xs ${
                    isEditing
                      ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-600'
                      : 'bg-white border-slate-300 focus:border-[#0e6977]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
                  Duration
                </label>
                <input
                  type="text"
                  placeholder="e.g. 45 Days, 3 Months, 4 Months"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-white border border-slate-300 focus:border-[#0e6977] rounded-xl px-3.5 py-2.5 text-slate-900 outline-none transition-all text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
                Course Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Certified Professional Coder, AMCT Beginner"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-[#0e6977] rounded-xl px-3.5 py-2.5 text-slate-900 outline-none transition-all text-xs font-semibold"
              />
            </div>
          </div>

          {/* SECTION 3: FEE RATES (₹) */}
          <div className="space-y-3 pt-1">
            <div className="text-[11px] font-mono font-black uppercase tracking-wider text-teal-700">
              FEE RATES & EXAM CHARGES (₹)
            </div>

            {/* Reference Fees: Original Fee & Standard Fee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/90 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
                  Original Fee (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 15000"
                  value={originalFee}
                  onChange={(e) => setOriginalFee(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-[#0e6977] font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
                  Standard Fee (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 20000"
                  value={standardFee}
                  onChange={(e) => setStandardFee(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-[#0e6977] font-mono text-xs"
                />
              </div>
            </div>

            {/* Real Chargeable Fees */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                <label className="block text-[10.5px] font-mono font-black text-emerald-900 uppercase">
                  Discounted Course Fee (₹) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 17000"
                  value={courseFee}
                  onChange={(e) => setCourseFee(e.target.value)}
                  className="w-full bg-white border border-emerald-300 focus:border-emerald-600 rounded-xl px-3 py-2 text-emerald-950 font-mono font-black text-xs outline-none shadow-2xs"
                />
                <p className="text-[10px] text-emerald-700">Official tuition fee charged to student</p>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1">
                <label className="block text-[10.5px] font-mono font-black text-blue-900 uppercase">
                  Exam Fee (CCCP) (₹)
                </label>
                <input
                  type="number"
                  placeholder="0 for No Exam, or 70207"
                  value={examFee}
                  onChange={(e) => setExamFee(e.target.value)}
                  className="w-full bg-white border border-blue-300 focus:border-blue-600 rounded-xl px-3 py-2 text-blue-950 font-mono font-bold text-xs outline-none shadow-2xs"
                />
                <p className="text-[10px] text-blue-700">Reflects to CCCP Head audit cell</p>
              </div>
            </div>
          </div>

          {/* CALCULATION BANNER */}
          <div className="bg-[#f0faf8] border border-teal-200 rounded-2xl p-3.5 text-xs space-y-1">
            <div className="flex items-center justify-between font-black text-[#00695c]">
              <span>Total Student Payable:</span>
              <span className="text-sm font-mono font-black">
                ₹{totalPayable.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="text-[10.5px] text-slate-500 leading-snug">
              💡 Course fee ₹{(Number(courseFee) || 0).toLocaleString('en-IN')} + Exam fee ₹{(Number(examFee) || 0).toLocaleString('en-IN')}. Auto-updates across enrolled students and CCCP head audit.
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className={`px-6 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                isEditing
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-[#0e6977] hover:bg-[#00796b]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Update Fee Rate' : 'Add Course Rate'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
