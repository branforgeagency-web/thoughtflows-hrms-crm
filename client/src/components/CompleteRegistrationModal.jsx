import React, { useState, useEffect } from 'react';
import { X, Sparkles, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { COURSE_CATEGORIES } from '../constants/courses';

export default function CompleteRegistrationModal({
  isOpen,
  onClose,
  initialData,
  currentUser,
  onSubmit
}) {
  if (!isOpen) return null;

  // Personal Details - purely empty unless provided by initialData
  const [fullName, setFullName] = useState(initialData?.fullName || initialData?.name || '');
  const [dob, setDob] = useState(initialData?.dob || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [locationAddress, setLocationAddress] = useState(initialData?.location || '');

  // Education & Background
  const [highestQualification, setHighestQualification] = useState(initialData?.qualification || '');
  const [passoutYear, setPassoutYear] = useState(initialData?.passoutYear || '');
  const [collegeCompany, setCollegeCompany] = useState(initialData?.collegeCompany || initialData?.college || '');
  const [modeOfSource, setModeOfSource] = useState(initialData?.source || '');
  const [leadCameFor, setLeadCameFor] = useState(initialData?.leadCameFor || 'Admission');

  // Course Selection
  const [course, setCourse] = useState(initialData?.courseName || '');
  const [branch, setBranch] = useState(initialData?.branchName || '');
  const [courseType, setCourseType] = useState(initialData?.typeName || '');
  const [batchTiming, setBatchTiming] = useState(initialData?.batchTiming || '');
  const [batchType, setBatchType] = useState(initialData?.batchType || 'Weekdays');
  const [dateOfJoining, setDateOfJoining] = useState(initialData?.dateOfJoining || '');

  // Fee Payment
  const [totalCourseFee, setTotalCourseFee] = useState(initialData?.courseFee ? String(initialData.courseFee) : '');
  const [amountPaidNow, setAmountPaidNow] = useState(initialData?.amountPaidNow ? String(initialData.amountPaidNow) : '');
  const [paymentPlan, setPaymentPlan] = useState('Full Payment');
  const [nextDueDate, setNextDueDate] = useState('');
  const [examBooked, setExamBooked] = useState('Not Booked');
  const [examFeePaid, setExamFeePaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI / GPay / PhonePe');

  // Generated Student ID
  const [studentId, setStudentId] = useState(initialData?.generatedId || '');
  const [idSubtext, setIdSubtext] = useState(initialData?.idSubtext || '');

  const [toastMsg, setToastMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto calculate pending balance and fee status safely from inputs
  const numTotalFee = Number(totalCourseFee) || 0;
  const numPaidNow = Number(amountPaidNow) || 0;
  const pendingBalance = numTotalFee > 0 ? Math.max(0, numTotalFee - numPaidNow) : 0;
  const feeStatus = numTotalFee > 0 && pendingBalance === 0 
    ? 'Fully Paid' 
    : numPaidNow > 0 
      ? 'Part Paid' 
      : 'Pending';

  useEffect(() => {
    if (initialData?.generatedId) {
      setStudentId(initialData.generatedId);
      if (initialData.courseName) setCourse(initialData.courseName);
      if (initialData.branchName) setBranch(initialData.branchName);
      if (initialData.typeName) setCourseType(initialData.typeName);
      if (initialData.branchName && initialData.courseName) {
        setIdSubtext(`TF · ${initialData.branchName} · ${initialData.courseName} · ${initialData.typeName || 'Online'} · ${initialData.monthName || 'May'} · ${initialData.yearVal || '2026'} · serial ${initialData.serial || '001'}`);
      }
    }
  }, [initialData]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      showToast('Please enter full name and phone number');
      return;
    }

    setSubmitting(true);
    const counselorName = currentUser?.name || 'Kavitha N.';

    const studentRecord = {
      studentId: studentId.trim(),
      name: fullName.trim().toUpperCase(),
      dob,
      phone: phone.trim(),
      email: email.trim(),
      location: locationAddress.split(',')[0]?.trim() || 'Coimbatore',
      address: locationAddress.trim(),
      qualification: highestQualification,
      qualTag: highestQualification.toLowerCase().includes('pharm') || highestQualification.toLowerCase().includes('bsc') ? 'Life Sci' : 'Grad',
      passoutYear,
      collegeCompany,
      source: modeOfSource,
      leadCameFor,
      course,
      branch,
      mode: courseType,
      batchTiming,
      batchType,
      batchDate: dateOfJoining,
      courseFee: Number(totalCourseFee),
      paidAmount: Number(amountPaidNow),
      pendingBalance,
      feeStatus,
      feeAmount: pendingBalance === 0 ? `₹${Number(totalCourseFee).toLocaleString('en-IN')}` : `₹${Number(amountPaidNow).toLocaleString('en-IN')} / ₹${Number(totalCourseFee).toLocaleString('en-IN')}`,
      paymentPlan,
      nextDueDate,
      examStatus: examBooked,
      examFee: Number(examFeePaid),
      paymentMethod,
      hrName: counselorName,
      onboardStatus: '7/7 ✓',
      syllabusModule: 'Module 1',
      mockInterview: 'Pending',
      certified: 'Non-certified',
      placementStatus: 'In course',
      statusGroup: 'in_course',
      handoverStatus: 'Ready',
      registeredAt: new Date().toISOString()
    };

    try {
      if (onSubmit) {
        await onSubmit(studentRecord);
      }
      showToast(`✓ Admitted ${studentRecord.name} successfully! Saved to CRM.`);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      showToast(`Error saving student: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      {/* Toast feedback */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-[80] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-teal-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Modal Card */}
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] my-auto text-left">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-[#009688] via-[#00897b] to-[#00796b] text-white p-6 sm:p-7 relative flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer text-xs"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Logo badge */}
          <div className="flex justify-center mb-3">
            <div className="bg-white px-4 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5">
              <span className="text-[#00897b] font-black tracking-tight text-xs uppercase">ThoughtFlows</span>
              <span className="text-[10px] text-slate-500 font-medium">· No.1 Medical Coding Academy</span>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-center tracking-tight">
            Complete Your Registration
          </h2>
          <p className="text-center text-xs text-teal-100 font-medium mt-1 font-mono">
            Sent by {currentUser?.name?.split(' ')[0] || 'Kavitha'} · Auto-saves to CRM on submit
          </p>
        </div>

        {/* SCROLLABLE FORM BODY */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-7 space-y-6 text-xs text-slate-800">
          
          {/* SECTION 1: Personal Details */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-4 bg-[#00897b] rounded-full" />
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                Personal Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Priya Ramesh"
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  DATE OF BIRTH
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  PHONE
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@gmail.com"
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                LOCATION / ADDRESS
              </label>
              <input
                type="text"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="e.g. Saravanampatti, Coimbatore"
                className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all"
              />
            </div>
          </div>

          {/* SECTION 2: Education & Background */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-4 bg-[#00897b] rounded-full" />
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                Education & Background
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  HIGHEST QUALIFICATION
                </label>
                <select
                  value={highestQualification}
                  onChange={(e) => setHighestQualification(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer"
                >
                  <option value="">— Select qualification —</option>
                  <option value="BPharm (Bachelor of Pharmacy)">BPharm (Bachelor of Pharmacy)</option>
                  <option value="BSc Life Sciences (Biotech, Micro, Biochem)">BSc Life Sciences (Biotech, Micro, Biochem)</option>
                  <option value="BSc Nursing / GNM">BSc Nursing / GNM</option>
                  <option value="BPT / Allied Health">BPT / Allied Health</option>
                  <option value="BSc Computer Science / IT / BCA">BSc Computer Science / IT / BCA</option>
                  <option value="BCom / BBA / Non-Life Sciences">BCom / BBA / Non-Life Sciences</option>
                  <option value="BE / BTech">BE / BTech</option>
                  <option value="Other Graduation">Other Graduation</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  YEAR OF PASSING
                </label>
                <input
                  type="text"
                  value={passoutYear}
                  onChange={(e) => setPassoutYear(e.target.value)}
                  placeholder="e.g. 2022"
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  COLLEGE / COMPANY
                </label>
                <input
                  type="text"
                  value={collegeCompany}
                  onChange={(e) => setCollegeCompany(e.target.value)}
                  placeholder="e.g. PSG College / TCS"
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  MODE OF SOURCE
                </label>
                <select
                  value={modeOfSource}
                  onChange={(e) => setModeOfSource(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer"
                >
                  <option value="">— Select source —</option>
                  <option value="Google Calls">Google Calls</option>
                  <option value="Direct Call">Direct Call</option>
                  <option value="Referral">Referral</option>
                  <option value="Justdial">Justdial</option>
                  <option value="WhatsApp Direct">WhatsApp Direct</option>
                  <option value="Direct Walk-in">Direct Walk-in</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook Job Post">Facebook Job Post</option>
                  <option value="LinkedIn">LinkedIn</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                LEAD CAME FOR
              </label>
              <select
                value={leadCameFor}
                onChange={(e) => setLeadCameFor(e.target.value)}
                className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer"
              >
                <option value="Admission">Admission</option>
                <option value="Demo Class">Demo Class</option>
                <option value="Course Enquiry">Course Enquiry</option>
                <option value="Placement Support">Placement Support</option>
              </select>
            </div>
          </div>

          {/* SECTION 3: Course Selection */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-4 bg-[#00897b] rounded-full" />
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                Course Selection
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  COURSE
                </label>
                <select
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer"
                >
                  <option value="">— Select course —</option>
                  {COURSE_CATEGORIES.map((cat) => (
                    <optgroup key={cat.category} label={cat.title}>
                      {cat.courses.map((c) => {
                        const val = `${c.code} - ${c.name}`;
                        return (
                          <option key={c.code} value={val}>
                            {val}
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  BRANCH
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer"
                >
                  <option value="">— Select branch —</option>
                  <option value="Saravanampatti">Saravanampatti</option>
                  <option value="Hopes (Coimbatore)">Hopes (Coimbatore)</option>
                  <option value="Gandhipuram">Gandhipuram</option>
                  <option value="Trichy">Trichy</option>
                  <option value="Salem">Salem</option>
                  <option value="Hyderabad Ameerpet">Hyderabad Ameerpet</option>
                  <option value="Hyderabad Dilsukhnagar">Hyderabad Dilsukhnagar</option>
                  <option value="Kochi">Kochi</option>
                  <option value="Trivandrum">Trivandrum</option>
                  <option value="Vizag">Vizag</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  COURSE TYPE
                </label>
                <select
                  value={courseType}
                  onChange={(e) => setCourseType(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer"
                >
                  <option value="">— Select type —</option>
                  <option value="Online">Online</option>
                  <option value="Classroom">Classroom</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  BATCH TIMING
                </label>
                <select
                  value={batchTiming}
                  onChange={(e) => setBatchTiming(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer"
                >
                  <option value="">— Select timing —</option>
                  <option value="9:00–11:00 AM">9:00–11:00 AM</option>
                  <option value="11:30 AM–1:30 PM">11:30 AM–1:30 PM</option>
                  <option value="2:00–4:00 PM">2:00–4:00 PM</option>
                  <option value="6:00–8:00 PM">6:00–8:00 PM</option>
                  <option value="8:00–10:00 PM Weekdays">8:00–10:00 PM Weekdays</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  BATCH TYPE
                </label>
                <select
                  value={batchType}
                  onChange={(e) => setBatchType(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer"
                >
                  <option value="Weekdays">Weekdays</option>
                  <option value="Weekends">Weekends</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  DATE OF JOINING
                </label>
                <input
                  type="date"
                  value={dateOfJoining}
                  onChange={(e) => setDateOfJoining(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Fee Payment */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <div className="w-1.5 h-4 bg-[#00897b] rounded-full" />
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                Fee Payment
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  TOTAL COURSE FEE
                </label>
                <input
                  type="number"
                  value={totalCourseFee}
                  onChange={(e) => setTotalCourseFee(e.target.value)}
                  placeholder="e.g. 21000"
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  AMOUNT PAID NOW
                </label>
                <input
                  type="number"
                  value={amountPaidNow}
                  onChange={(e) => setAmountPaidNow(e.target.value)}
                  placeholder="e.g. 11000"
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all font-mono font-bold text-emerald-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  PENDING BALANCE
                </label>
                <div className="w-full bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-black font-mono text-slate-800 flex items-center">
                  ₹{pendingBalance.toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  FEE STATUS
                </label>
                <div className={`w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold flex items-center border ${
                  feeStatus === 'Fully Paid'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : feeStatus === 'Part Paid'
                      ? 'bg-amber-100/70 text-amber-900 border-amber-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {feeStatus}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  PAYMENT PLAN
                </label>
                <select
                  value={paymentPlan}
                  onChange={(e) => setPaymentPlan(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer"
                >
                  <option value="Full Payment">Full Payment</option>
                  <option value="2 Instalments">2 Instalments</option>
                  <option value="3 Instalments">3 Instalments</option>
                  <option value="Monthly Plan">Monthly Plan</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  NEXT DUE DATE
                </label>
                <input
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  EXAM BOOKED
                </label>
                <select
                  value={examBooked}
                  onChange={(e) => setExamBooked(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer"
                >
                  <option value="Not Booked">Not Booked</option>
                  <option value="AAPC CPC Booked">AAPC CPC Booked</option>
                  <option value="Exam Scheduled">Exam Scheduled</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  EXAM FEE PAID (₹)
                </label>
                <input
                  type="text"
                  value={examFeePaid}
                  onChange={(e) => setExamFeePaid(e.target.value)}
                  placeholder="e.g. 0"
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                PAYMENT METHOD
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer"
              >
                <option value="UPI / GPay / PhonePe">UPI / GPay / PhonePe</option>
                <option value="Net Banking / NEFT">Net Banking / NEFT</option>
                <option value="Credit / Debit Card">Credit / Debit Card</option>
                <option value="Cash at Branch">Cash at Branch</option>
              </select>
            </div>

            <p className="text-[11px] text-slate-400 font-mono pt-1 leading-relaxed">
              Pending balance & status update automatically. This fee record flows to the CRM and shows on the HR Head & Branch Manager dashboards.
            </p>
          </div>

          {/* SECTION 5: Auto-Generated Student ID Box */}
          <div className="bg-[#e6f7f6] border border-[#a2e3de] rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-[#00897b] rounded-full" />
              <div className="text-xs font-bold text-[#00695c]">
                Student ID will be generated automatically
              </div>
            </div>

            <div className="font-mono font-black text-2xl sm:text-3xl text-[#0e6977] tracking-wider pt-1">
              {studentId}
            </div>

            <div className="text-[11px] font-mono text-[#00695c]/80">
              {idSubtext}
            </div>
          </div>

          {/* SECTION 6: Sticky Bottom Submit Bar */}
          <div className="pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100">
              <div className="space-y-1.5 flex-1">
                <div className="text-xs font-mono text-slate-500">
                  Ready to admit · all sections complete
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#00897b] h-full w-full rounded-full transition-all" />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="bg-[#00897b] hover:bg-[#00796b] disabled:opacity-50 text-white font-black text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer flex-shrink-0"
              >
                <span className="flex items-center gap-1.5">
                  <span>✓ Admit Student & Save to CRM</span>
                </span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
