import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, ArrowRight, Check, ShieldCheck, Copy, RotateCcw, AlertTriangle } from 'lucide-react';
import { COURSE_CATEGORIES } from '../constants/courses';
import { QUALIFICATION_GROUPS } from '../constants/qualifications';
import { LEAD_SOURCE_GROUPS } from '../constants/leadSources';
import { getAvailableTimingSlots, BATCH_SCHEDULE, CANONICAL_TIMING_OPTIONS } from '../constants/batchTimings';
import SearchableSelect from './SearchableSelect';
import logoImg from '../assets/thoughtflows-logo.png';
import { 
  BRANCH_MAP, 
  COURSE_MAP, 
  TYPE_MAP, 
  MONTH_MAP, 
  YEAR_MAP, 
  generateStudentIdDetails 
} from '../utils/studentIdGenerator';
import { getStudents } from '../services/api';

const CURRENT_YEAR = new Date().getFullYear();
const PASSOUT_YEARS = Array.from({ length: CURRENT_YEAR - 1980 + 1 }, (_, i) => String(CURRENT_YEAR - i));
const ALL_QUALIFICATIONS = QUALIFICATION_GROUPS.flatMap((g) => g.options);

export default function CompleteRegistrationModal({
  isOpen,
  onClose,
  initialData,
  currentUser,
  onSubmit,
  existingStudents
}) {
  if (!isOpen) return null;

  // Personal Details - purely empty unless provided by initialData
  const [fullName, setFullName] = useState(initialData?.fullName || initialData?.name || '');
  const [fatherName, setFatherName] = useState(initialData?.fatherName || '');
  const [dob, setDob] = useState(initialData?.dob || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(initialData?.whatsappNumber || initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [locationAddress, setLocationAddress] = useState(initialData?.location || initialData?.address || '');

  // Education & Background
  const [highestQualification, setHighestQualification] = useState(initialData?.qualification || '');
  const [passoutYear, setPassoutYear] = useState(initialData?.passoutYear || '');
  const [collegeCompany, setCollegeCompany] = useState(initialData?.collegeCompany || initialData?.college || '');
  const [modeOfSource, setModeOfSource] = useState(initialData?.source || '');
  const [leadCameFor, setLeadCameFor] = useState(initialData?.leadCameFor || 'Admission');

  // Course Selection
  const [course, setCourse] = useState(initialData?.courseName || initialData?.course || 'CPC - Certified Professional Coder');
  const [branch, setBranch] = useState(initialData?.branchName || initialData?.branch || 'Saravanampatti');
  const [courseType, setCourseType] = useState(initialData?.typeName || initialData?.mode || 'Online');
  const [batchTiming, setBatchTiming] = useState(initialData?.batchTiming || '');
  const [batchType, setBatchType] = useState(initialData?.batchType || 'Weekdays');
  const [dateOfJoining, setDateOfJoining] = useState(initialData?.dateOfJoining || new Date().toISOString().split('T')[0]);

  const availableSlots = useMemo(() => {
    return getAvailableTimingSlots({ course, mode: courseType, branch });
  }, [course, courseType, branch]);

  // Fee Payment
  const [totalCourseFee, setTotalCourseFee] = useState(initialData?.courseFee ? String(initialData.courseFee) : '');
  const [amountPaidNow, setAmountPaidNow] = useState(initialData?.amountPaidNow ? String(initialData.amountPaidNow) : '');
  const [paymentPlan, setPaymentPlan] = useState('Full Payment');
  const [nextDueDate, setNextDueDate] = useState('');
  const [examBooked, setExamBooked] = useState('Not Booked');
  const [examFeePaid, setExamFeePaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI / GPay / PhonePe');
  const [transactionId, setTransactionId] = useState(initialData?.transactionId || initialData?.paymentReference || '');
  const [examPaidTogether, setExamPaidTogether] = useState(true);
  const [examTransactionId, setExamTransactionId] = useState('');
  const hasExamFee = (Number(examFeePaid) || 0) > 0;
  const separateExamTxn = hasExamFee && !examPaidTogether;

  // Auto calculate pending balance and fee status safely from inputs
  const numTotalFee = Number(totalCourseFee) || 0;
  const numPaidNow = Number(amountPaidNow) || 0;
  const pendingBalance = numTotalFee > 0 ? Math.max(0, numTotalFee - numPaidNow) : 0;
  const feeStatus = numTotalFee > 0 && pendingBalance === 0 
    ? 'Fully Paid' 
    : numPaidNow > 0 
      ? 'Part Paid' 
      : 'Pending';

  // Generated Student ID & metadata
  const [allStudents, setAllStudents] = useState(existingStudents || []);
  const [customMonth, setCustomMonth] = useState('');
  const [customYear, setCustomYear] = useState('');
  const [customSerial, setCustomSerial] = useState('');
  const [showIdControls, setShowIdControls] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const [studentId, setStudentId] = useState('');
  const [idSubtext, setIdSubtext] = useState('');

  const [toastMsg, setToastMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Sync or fetch students for ID serial calculation
  useEffect(() => {
    if (!isOpen) return;
    if (Array.isArray(existingStudents) && existingStudents.length > 0) {
      setAllStudents(existingStudents);
    } else {
      getStudents()
        .then((data) => {
          if (Array.isArray(data)) setAllStudents(data);
        })
        .catch((err) => console.error('Error fetching students for ID generator:', err));
    }
  }, [isOpen, existingStudents]);

  // Sync initialData changes when opening modal
  useEffect(() => {
    if (!isOpen || !initialData) return;
    if (initialData.fullName || initialData.name) setFullName(initialData.fullName || initialData.name);
    if (initialData.fatherName) setFatherName(initialData.fatherName);
    if (initialData.dob) setDob(initialData.dob);
    if (initialData.phone) setPhone(initialData.phone);
    if (initialData.whatsappNumber) setWhatsappNumber(initialData.whatsappNumber);
    if (initialData.email) setEmail(initialData.email);
    if (initialData.location || initialData.address) setLocationAddress(initialData.location || initialData.address);
    if (initialData.qualification || initialData.education) setHighestQualification(initialData.qualification || initialData.education);
    if (initialData.passoutYear) setPassoutYear(initialData.passoutYear);
    if (initialData.collegeCompany || initialData.college) setCollegeCompany(initialData.collegeCompany || initialData.college);
    if (initialData.source || initialData.sourceName) setModeOfSource(initialData.source || initialData.sourceName);
    if (initialData.leadCameFor) setLeadCameFor(initialData.leadCameFor);
    if (initialData.courseName || initialData.course) setCourse(initialData.courseName || initialData.course);
    if (initialData.branchName || initialData.branch) setBranch(initialData.branchName || initialData.branch);
    if (initialData.typeName || initialData.mode) setCourseType(initialData.typeName || initialData.mode);
    if (initialData.batchTiming) setBatchTiming(initialData.batchTiming);
    if (initialData.batchType) setBatchType(initialData.batchType);
    if (initialData.dateOfJoining) setDateOfJoining(initialData.dateOfJoining);
    if (initialData.courseFee) setTotalCourseFee(String(initialData.courseFee));
    if (initialData.amountPaidNow) setAmountPaidNow(String(initialData.amountPaidNow));
    if (initialData.transactionId || initialData.paymentReference) setTransactionId(initialData.transactionId || initialData.paymentReference);
  }, [isOpen, initialData]);

  // Live computed ID metadata based on form fields
  const currentIdDetails = useMemo(() => {
    return generateStudentIdDetails({
      branch: branch || 'Saravanampatti',
      course: course || 'CPC - Certified Professional Coder',
      courseType: courseType || 'Online',
      date: dateOfJoining || new Date(),
      month: customMonth || undefined,
      year: customYear || undefined,
      serial: customSerial || undefined,
      existingStudents: allStudents
    });
  }, [branch, course, courseType, dateOfJoining, customMonth, customYear, customSerial, allStudents]);

  // Keep studentId and breakdown subtext automatically in sync with form details
  useEffect(() => {
    setStudentId(currentIdDetails.studentId);
    setIdSubtext(currentIdDetails.breakdownText);
  }, [currentIdDetails]);

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
    const counselorName = currentUser?.name || '';

    const studentRecord = {
      studentId: studentId.trim(),
      name: fullName.trim().toUpperCase(),
      fatherName: fatherName.trim(),
      dob,
      phone: phone.trim(),
      whatsappNumber: (whatsappNumber || phone).trim(),
      alternatePhone: (whatsappNumber && whatsappNumber !== phone ? whatsappNumber : '').trim(),
      email: email.trim(),
      location: locationAddress.split(',')[0]?.trim() || branch || 'Coimbatore',
      address: locationAddress.trim(),
      qualification: highestQualification,
      qualTag: QUALIFICATION_GROUPS.find((g) => g.group === 'life')?.options.includes(highestQualification)
        || (!ALL_QUALIFICATIONS.includes(highestQualification) && /pharm|nursing|bsc life/i.test(highestQualification))
        ? 'Life Sci'
        : 'Grad',
      passoutYear,
      collegeCompany,
      source: modeOfSource,
      leadCameFor,
      course,
      branch,
      leadBranch: initialData?.leadBranch || initialData?.branchName || branch,
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
      examPaidWithCourseFee: !separateExamTxn,
      examTransactionId: hasExamFee ? (separateExamTxn ? examTransactionId.trim() : transactionId.trim()) : '',
      paymentMethod,
      paymentReference: transactionId.trim(),
      transactionId: transactionId.trim(),
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
      setSubmitError(null);
      if (onSubmit) {
        await onSubmit(studentRecord);
      }
      showToast(`✓ Admitted ${studentRecord.name} successfully! Saved to CRM.`);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      const errMsg = err?.response?.data?.error || err.message || 'Error saving student';
      setSubmitError(errMsg);
      showToast(`⚠ ${errMsg}`);
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

          {/* ThoughtFlows Logo */}
          <div className="flex justify-center mb-3">
            <div className="bg-white px-4 py-1.5 rounded-2xl shadow-sm flex items-center justify-center">
              <img 
                src={logoImg} 
                alt="ThoughtFlows" 
                className="h-7 sm:h-8 w-auto object-contain"
                onError={(e) => { e.currentTarget.src = '/thoughtflows-logo.png'; }}
              />
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-center tracking-tight">
            Registration Form
          </h2>
        </div>

        {/* SCROLLABLE FORM BODY */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-7 space-y-6 text-xs text-slate-800">
          
          {/* Submission Error Alert */}
          {submitError && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs rounded-2xl shadow-sm animate-shake flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="font-extrabold uppercase tracking-wide text-rose-700 text-[11px]">
                  Duplicate Record / Admission Error
                </div>
                <div className="font-semibold text-rose-900 leading-relaxed text-xs">
                  {submitError}
                </div>
              </div>
            </div>
          )}

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
                  FATHER'S NAME
                </label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="Father's / Guardian's name"
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all"
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
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (!whatsappNumber) setWhatsappNumber(e.target.value);
                  }}
                  placeholder="10-digit mobile"
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  WHATSAPP NUMBER
                </label>
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="WhatsApp mobile number"
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                <SearchableSelect
                  value={highestQualification}
                  onChange={setHighestQualification}
                  placeholder="— Select qualification —"
                  searchPlaceholder="Search qualification (e.g. BSc, Nursing, BPharm)..."
                  groups={QUALIFICATION_GROUPS}
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  YEAR OF PASSING
                </label>
                <select
                  value={passoutYear}
                  onChange={(e) => setPassoutYear(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer"
                >
                  <option value="">— Select year —</option>
                  {passoutYear && !PASSOUT_YEARS.includes(String(passoutYear)) && (
                    <option value={passoutYear}>{passoutYear}</option>
                  )}
                  {PASSOUT_YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
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
                <SearchableSelect
                  value={modeOfSource}
                  onChange={setModeOfSource}
                  placeholder="— Select mode of source —"
                  searchPlaceholder="Search 32 sources (Google, Referral, WhatsApp...)"
                  groups={LEAD_SOURCE_GROUPS}
                  allowCustom={true}
                />
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
                  <optgroup label="AMCT Certification Programmes">
                    <option value="AMCT Beginner (Classroom)">AMCT Beginner (Classroom)</option>
                    <option value="AMCT Beginner (Online)">AMCT Beginner (Online)</option>
                    <option value="AMCT Intermediate (Classroom)">AMCT Intermediate (Classroom)</option>
                    <option value="AMCT Intermediate (Online)">AMCT Intermediate (Online)</option>
                    <option value="AMCT Advanced (Classroom)">AMCT Advanced (Classroom)</option>
                    <option value="AMCT Advanced (Online)">AMCT Advanced (Online)</option>
                    <option value="AMCT - Advanced Medical Coding">AMCT - Advanced Medical Coding (A)</option>
                    <option value="AMCT Beginner">AMCT Beginner (AB)</option>
                    <option value="AMCT Intermediate">AMCT Intermediate (AI)</option>
                    <option value="AMCT Advanced">AMCT Advanced (AA)</option>
                  </optgroup>
                  <optgroup label="AAPC Certifications">
                    <option value="CPC - Certified Professional Coder">CPC - Certified Professional Coder (C)</option>
                    <option value="CIC - Certified Inpatient Coder">CIC - Certified Inpatient Coder (E)</option>
                    <option value="CPMA - Certified Professional Medical Auditor">CPMA - Certified Professional Medical Auditor (P)</option>
                    <option value="COC - Certified Outpatient Coder">COC - Certified Outpatient Coder (B)</option>
                    <option value="CRC - Certified Risk Adjustment Coder">CRC - Certified Risk Adjustment Coder (R)</option>
                    <option value="CPB - Certified Professional Biller">CPB - Certified Professional Biller (PB)</option>
                    <option value="CEDC - Certified Emergency Department Coder">CEDC - Certified Emergency Department Coder (EDC)</option>
                    <option value="CEMC - Certified Evaluation and Management Coder">CEMC - Certified Evaluation and Management Coder (CN)</option>
                    <option value="CDEO - Certified Documentation Expert Outpatient">CDEO - Certified Documentation Expert Outpatient (CDO)</option>
                    <option value="CDEI - Certified Documentation Expert Inpatient">CDEI - Certified Documentation Expert Inpatient (CDEI)</option>
                    <option value="CPPM - Certified Physician Practice Manager">CPPM - Certified Physician Practice Manager (PPM)</option>
                  </optgroup>
                  <optgroup label="Speciality Tracks">
                    <option value="Surgery - Specialty Surgery Coding">Surgery - Specialty Surgery Coding (Y)</option>
                    <option value="ED - Emergency Department Coding">ED - Emergency Department Coding (D)</option>
                    <option value="EM - Evaluation and Management Coding">EM - Evaluation and Management Coding (N)</option>
                    <option value="Radiology - Radiology Coding">Radiology - Radiology Coding (RD)</option>
                    <option value="Anesthesia - Anesthesia Coding">Anesthesia - Anesthesia Coding (AN)</option>
                    <option value="IP DRG - Inpatient DRG Coding">IP DRG - Inpatient DRG Coding (I)</option>
                    <option value="HCC - Risk Adjustment Coding">HCC - Risk Adjustment Coding (H)</option>
                    <option value="IVR - Interventional Radiology Coding">IVR - Interventional Radiology Coding (IVR)</option>
                    <option value="CDI - Clinical Documentation Improvement">CDI - Clinical Documentation Improvement (CDI)</option>
                  </optgroup>
                  <optgroup label="AHIMA & HIMAA Certifications">
                    <option value="CCS - Certified Coding Specialist">CCS - Certified Coding Specialist (S)</option>
                    <option value="CCS-P - Certified Coding Specialist – Physician-based">CCS-P - Certified Coding Specialist – Physician-based (CSP)</option>
                    <option value="RHIA - Registered Health Information Administrator">RHIA - Registered Health Information Administrator (RIA)</option>
                    <option value="RHIT - Registered Health Information Technician">RHIT - Registered Health Information Technician (RIT)</option>
                    <option value="CCC - Certified Clinical Coder">CCC - Certified Clinical Coder (CCC)</option>
                    <option value="HIM - Health Information Management">HIM - Health Information Management (HIM)</option>
                  </optgroup>
                  <optgroup label="Foundation & Other Tracks">
                    <option value="CPC Crash Course">CPC Crash Course (F)</option>
                    <option value="CPT Coding">CPT Coding (T)</option>
                    <option value="ICD-10 Coding">ICD-10 Coding (Z)</option>
                    <option value="Anatomy & Physiology">Anatomy & Physiology (O)</option>
                  </optgroup>
                  {COURSE_CATEGORIES.map((cat) => (
                    <optgroup key={cat.category} label={cat.title}>
                      {cat.courses.map((c) => {
                        const val = c.code === c.name ? c.name : `${c.code} - ${c.name}`;
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
                  {Object.entries(BRANCH_MAP).map(([bCode, bName]) => (
                    <option key={bCode} value={bName}>
                      {bName} ({bCode})
                    </option>
                  ))}
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
                  <option value="Online">Online (O)</option>
                  <option value="Classroom">Classroom (C)</option>
                  <option value="Hybrid">Hybrid (H)</option>
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
                  <option value="">— Select timing slot —</option>
                  {/* Preserve existing custom/legacy value if not matched */}
                  {batchTiming && !availableSlots.some(s => s.label === batchTiming || s.value === batchTiming || s.timing === batchTiming) && (
                    <option value={batchTiming}>Current: {batchTiming}</option>
                  )}
                  <optgroup label={`🎯 Available for Selected Course & Branch (${availableSlots.length} Slots)`}>
                    {availableSlots.map((s, idx) => (
                      <option key={`avail-${idx}`} value={s.label}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="📋 All Other Schedule Slots">
                    {BATCH_SCHEDULE.filter(s => !availableSlots.some(a => a.label === s.label)).map((s, idx) => (
                      <option key={`other-${idx}`} value={s.label}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
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

            {hasExamFee && (
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  HOW WAS THE EXAM FEE PAID?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { together: true, label: 'Together with course fee', hint: 'One transaction ID' },
                    { together: false, label: 'Separately', hint: 'Separate transaction IDs' }
                  ].map((opt) => {
                    const active = examPaidTogether === opt.together;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setExamPaidTogether(opt.together)}
                        className={`text-left px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
                          active
                            ? 'border-2 border-[#00897b] bg-teal-50 text-teal-900'
                            : 'border-slate-200 bg-slate-50/70 hover:border-teal-300 text-slate-700'
                        }`}
                      >
                        <div className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                          {active && <Check className="w-3.5 h-3.5 text-[#00897b]" />}
                          {opt.label}
                        </div>
                        <div className="text-[10.5px] text-slate-500 font-mono">{opt.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                  {separateExamTxn
                    ? 'COURSE FEE TRANSACTION ID / UTR'
                    : hasExamFee
                      ? 'TRANSACTION ID (COURSE + EXAM FEE)'
                      : 'TRANSACTION ID / UPI REF / UTR'}
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. 428190384721 or IMPS..."
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all font-mono"
                />
              </div>
            </div>

            {separateExamTxn && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="hidden sm:block" />
                <div>
                  <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1">
                    EXAM FEE TRANSACTION ID / UTR
                  </label>
                  <input
                    type="text"
                    value={examTransactionId}
                    onChange={(e) => setExamTransactionId(e.target.value)}
                    placeholder="e.g. 428190384999"
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#00897b] transition-all font-mono"
                  />
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-400 font-mono pt-1 leading-relaxed">
              Pending balance & status update automatically. This fee record flows to the CRM and shows on the HR Head & Branch Manager dashboards.
            </p>
          </div>

          {/* SECTION 5: Auto-Generated Student ID Box */}
          <div className="bg-gradient-to-br from-[#f0faf8] via-[#e6f7f5] to-[#def5f2] border-2 border-teal-400/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-900">
                  Student ID (Auto-Generated from Details)
                </span>
                <span className="bg-teal-100/90 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-300">
                  Live Sync
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowIdControls(!showIdControls)}
                  className="text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-white/90 hover:bg-white px-2.5 py-1 rounded-lg border border-teal-200 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3 h-3 text-teal-600" />
                  <span>{showIdControls ? 'Hide Controls' : 'Fine-Tune ID'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(studentId);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                  }}
                  className="text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-white/90 hover:bg-white px-2.5 py-1 rounded-lg border border-teal-200 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Copy Student ID"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Large Typography ID */}
            <div className="flex items-center justify-center font-mono font-black tracking-wider text-3xl sm:text-4xl py-1">
              <span className="text-slate-900">{currentIdDetails.companyPrefix}</span>
              <span className="text-teal-600">{currentIdDetails.middleCode}</span>
              <span className="bg-amber-100/90 text-amber-700 px-2.5 py-0.5 rounded-xl ml-1 shadow-xs border border-amber-300/80">
                {currentIdDetails.serial}
              </span>
            </div>

            {/* Breakdown Subtitle with dot separators */}
            <div className="text-[11px] font-mono text-slate-600 text-center flex items-center justify-center flex-wrap gap-x-1.5 gap-y-0.5">
              <span>{currentIdDetails.companyPrefix}</span>
              <span>·</span>
              <span className="text-teal-800 font-bold">{currentIdDetails.branchName} ({currentIdDetails.branchCode})</span>
              <span>·</span>
              <span className="text-teal-800 font-bold">{currentIdDetails.courseName.split(' - ')[0]} ({currentIdDetails.courseCode})</span>
              <span>·</span>
              <span className="text-teal-800 font-bold">{currentIdDetails.typeName} ({currentIdDetails.typeCode})</span>
              <span>·</span>
              <span className="text-teal-800 font-bold">{currentIdDetails.monthName} ({currentIdDetails.monthCode})</span>
              <span>·</span>
              <span className="text-teal-800 font-bold">{currentIdDetails.yearVal} ({currentIdDetails.yearCode})</span>
              <span>·</span>
              <span>Serial <strong className="text-slate-900 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">{currentIdDetails.serial}</strong></span>
            </div>

            {/* Fine-Tuning Controls (Collapsible) */}
            {showIdControls && (
              <div className="mt-3 pt-3 border-t border-teal-200/70 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-teal-800 uppercase mb-1">
                    Month Code
                  </label>
                  <select
                    value={customMonth || currentIdDetails.monthCode}
                    onChange={(e) => setCustomMonth(e.target.value)}
                    className="w-full bg-white border border-teal-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-teal-500 font-sans cursor-pointer"
                  >
                    {Object.entries(MONTH_MAP).map(([code, mName]) => (
                      <option key={code} value={code}>
                        {code} - {mName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-teal-800 uppercase mb-1">
                    Year Code
                  </label>
                  <select
                    value={customYear || currentIdDetails.yearCode}
                    onChange={(e) => setCustomYear(e.target.value)}
                    className="w-full bg-white border border-teal-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-teal-500 font-sans cursor-pointer"
                  >
                    {Object.entries(YEAR_MAP).map(([code, yVal]) => (
                      <option key={code} value={code}>
                        {code} - {yVal}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-mono font-bold text-teal-800 uppercase">
                      Serial Number
                    </label>
                    {(customSerial || customMonth || customYear) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomMonth('');
                          setCustomYear('');
                          setCustomSerial('');
                        }}
                        className="text-[9.5px] text-teal-700 hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={customSerial || currentIdDetails.serial}
                    onChange={(e) => setCustomSerial(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="001"
                    className="w-full bg-white border border-teal-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-teal-500 font-mono font-bold"
                  />
                </div>
              </div>
            )}

            <div className="text-[10px] font-mono text-teal-700/80 pt-1 text-center">
              💡 ID updates automatically when you change Branch, Course, Type, or Joining Date. Serial is auto-calculated from {allStudents.length} admitted students.
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
