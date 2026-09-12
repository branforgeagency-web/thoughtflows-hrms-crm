import React, { useState, useMemo } from 'react';
import { X, Sparkles } from 'lucide-react';

export default function AddCourseRateModal({ isOpen, onClose, onSave, initialData }) {
  if (!isOpen) return null;

  // Course Details
  const [courseCode, setCourseCode] = useState(initialData?.code || '');
  const [duration, setDuration] = useState(initialData?.duration || '');
  const [courseName, setCourseName] = useState(initialData?.name || '');

  // Fee Components
  const [registrationFee, setRegistrationFee] = useState(initialData?.registrationFee !== undefined ? initialData.registrationFee : '2000');
  const [trainingFee, setTrainingFee] = useState(initialData?.trainingFee !== undefined ? initialData.trainingFee : '45000');
  const [studyMaterialFee, setStudyMaterialFee] = useState(initialData?.studyMaterialFee !== undefined ? initialData.studyMaterialFee : '3000');
  const [membershipFee, setMembershipFee] = useState(initialData?.membershipFee !== undefined ? initialData.membershipFee : '5000');
  const [examFee, setExamFee] = useState(initialData?.examFee !== undefined ? initialData.examFee : '22000');

  // Tax & Terms
  const [gstPercent, setGstPercent] = useState(initialData?.gstPercent !== undefined ? initialData.gstPercent : '18');
  const [maxDiscount, setMaxDiscount] = useState(initialData?.maxDiscount !== undefined ? initialData.maxDiscount : '5000');
  const [installments, setInstallments] = useState(initialData?.installments || 'Full payment only');
  const [currency, setCurrency] = useState(initialData?.currency || 'INR');

  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Live calculation of Base and Total Payable
  const { baseTotal, totalPayable, gstAmount } = useMemo(() => {
    const reg = Number(registrationFee) || 0;
    const train = Number(trainingFee) || 0;
    const study = Number(studyMaterialFee) || 0;
    const memb = Number(membershipFee) || 0;
    const exam = Number(examFee) || 0;

    const base = reg + train + study + memb + exam;
    const gstRate = Number(gstPercent) || 0;
    const gstVal = Math.round((base * gstRate) / 100);
    const total = base + gstVal;

    return { baseTotal: base, totalPayable: total, gstAmount: gstVal };
  }, [registrationFee, trainingFee, studyMaterialFee, membershipFee, examFee, gstPercent]);

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

    const payload = {
      code: courseCode.trim().toUpperCase(),
      name: courseName.trim(),
      duration: duration.trim(),
      registrationFee: Number(registrationFee) || 0,
      trainingFee: Number(trainingFee) || 0,
      courseFee: (Number(registrationFee) || 0) + (Number(trainingFee) || 0) + (Number(studyMaterialFee) || 0) + (Number(membershipFee) || 0),
      studyMaterialFee: Number(studyMaterialFee) || 0,
      membershipFee: Number(membershipFee) || 0,
      examFee: Number(examFee) || 0,
      gstPercent: Number(gstPercent) || 0,
      maxDiscount: Number(maxDiscount) || 0,
      installments,
      currency,
      baseTotal,
      totalPayable
    };

    if (onSave) {
      onSave(payload);
    }

    showToast(`✓ Saved course rate for ${payload.code}`);
    setTimeout(() => {
      onClose();
    }, 500);
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
        <div className="p-5 sm:p-6 pb-4 flex items-center justify-between border-b border-slate-100 flex-shrink-0">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Add Course Rate
          </h2>

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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* SECTION 1: COURSE */}
          <div className="space-y-3">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-600">
              COURSE
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
                  Course Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CPC"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00897b] transition-all font-sans text-xs"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
                  Duration
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3 months"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00897b] transition-all font-sans text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
                Course Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Certified Professional Coder"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00897b] transition-all font-sans text-xs"
              />
            </div>
          </div>

          {/* SECTION 2: FEE COMPONENTS (₹) */}
          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-600">
              FEE COMPONENTS (₹)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
                  Registration / Admission Fee
                </label>
                <input
                  type="number"
                  placeholder="2000"
                  value={registrationFee}
                  onChange={(e) => setRegistrationFee(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00897b] transition-all font-sans text-xs"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
                  Course / Training Fee
                </label>
                <input
                  type="number"
                  placeholder="45000"
                  value={trainingFee}
                  onChange={(e) => setTrainingFee(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00897b] transition-all font-sans text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
                  Study Material Fee
                </label>
                <input
                  type="number"
                  placeholder="3000"
                  value={studyMaterialFee}
                  onChange={(e) => setStudyMaterialFee(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00897b] transition-all font-sans text-xs"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
                  Membership / Certification Fee
                </label>
                <input
                  type="number"
                  placeholder="5000"
                  value={membershipFee}
                  onChange={(e) => setMembershipFee(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00897b] transition-all font-sans text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
                <span>Exam / Voucher Fee </span>
                <span className="text-purple-600 font-semibold normal-case">
                  → reflects to CCCP Head & CRM
                </span>
              </label>
              <input
                type="number"
                placeholder="22000"
                value={examFee}
                onChange={(e) => setExamFee(e.target.value)}
                className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00897b] transition-all font-sans text-xs"
              />
            </div>
          </div>

          {/* SECTION 3: TAX & TERMS */}
          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-600">
              TAX & TERMS
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
                  GST %
                </label>
                <input
                  type="number"
                  placeholder="18"
                  value={gstPercent}
                  onChange={(e) => setGstPercent(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00897b] transition-all font-sans text-xs"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
                  Max Discount Allowed (₹)
                </label>
                <input
                  type="number"
                  placeholder="5000"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00897b] transition-all font-sans text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
                  Installments Allowed
                </label>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00897b] transition-all font-sans text-xs cursor-pointer"
                >
                  <option value="Full payment only">Full payment only</option>
                  <option value="2 Installments">2 Installments</option>
                  <option value="3 Installments">3 Installments</option>
                  <option value="4 Installments">4 Installments</option>
                  <option value="Custom installments">Custom installments</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-mono font-bold text-slate-500 uppercase mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00897b] transition-all font-sans text-xs cursor-pointer"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="AED">AED</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
          </div>

          {/* CALCULATION BANNER */}
          <div className="bg-[#f0faf8] border border-teal-200 rounded-xl p-3.5 sm:p-4 text-xs">
            <span className="font-extrabold text-[#00695c]">
              Total payable (incl. {gstPercent || 0}% GST): ₹{totalPayable.toLocaleString('en-IN')}
            </span>{' '}
            <span className="text-slate-500 font-mono">
              - base ₹{baseTotal.toLocaleString('en-IN')}
            </span>
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
              className="px-5 py-2.5 rounded-xl bg-[#0f2537] hover:bg-[#0a1926] text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              Save Course Rate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
