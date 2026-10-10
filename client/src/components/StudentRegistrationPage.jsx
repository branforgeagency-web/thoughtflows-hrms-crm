import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  GraduationCap, 
  Building2, 
  Calendar, 
  Clock, 
  BookOpen, 
  ShieldCheck, 
  ExternalLink,
  ChevronLeft,
  Check,
  AlertTriangle,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import logoImg from '../assets/thoughtflows-logo.png';
import { COURSE_CATEGORIES } from '../constants/courses';
import { LEAD_SOURCE_GROUPS } from '../constants/leadSources';
import { getAvailableTimingSlots, BATCH_SCHEDULE } from '../constants/batchTimings';
import { createStudent, getStudents, checkDuplicateStudent } from '../services/api';
import { getCurrentMonthYear, getCurrentMonthName } from '../utils/dateUtils';
import { copyToClipboard } from '../utils/clipboard';
import { 
  BRANCH_MAP, 
  generateStudentIdDetails 
} from '../utils/studentIdGenerator';

export default function StudentRegistrationPage({ onBack }) {
  // Query parameters parsing
  const queryParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();

  // Form Fields with query param defaults
  const [name, setName] = useState(queryParams.get('name') || '');
  const [fatherName, setFatherName] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState(queryParams.get('phone') || '');
  const [whatsappNumber, setWhatsappNumber] = useState(queryParams.get('phone') || '');
  const [sameAsMobile, setSameAsMobile] = useState(true);
  const [consultHr, setConsultHr] = useState(queryParams.get('hr') || '');
  const [branch, setBranch] = useState(queryParams.get('branch') || 'Saravanampatti (CBE)');
  const [email, setEmail] = useState(queryParams.get('email') || '');
  const [facebookId, setFacebookId] = useState('');
  const [education, setEducation] = useState('');
  const [passoutYear, setPassoutYear] = useState('');
  const [college, setCollege] = useState('');
  const [company, setCompany] = useState('');

  // Course & Mode
  const [courseType, setCourseType] = useState('Online'); // 'Online' | 'Offline'
  const [course, setCourse] = useState(queryParams.get('course') || 'AMCT Beginner (Classroom)');
  
  // Knowledge source
  const [source, setSource] = useState(queryParams.get('source') || 'Google Calls / GMB');

  // Timings & Batch
  const [preferredTimings, setPreferredTimings] = useState('');
  const [batchType, setBatchType] = useState('Weekdays'); // 'Weekdays', 'Weekends', 'Both'

  const availableSlots = useMemo(() => {
    return getAvailableTimingSlots({ course, mode: courseType, branch });
  }, [course, courseType, branch]);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  const [existingStudents, setExistingStudents] = useState([]);

  useEffect(() => {
    getStudents()
      .then((data) => {
        if (Array.isArray(data)) setExistingStudents(data);
      })
      .catch((err) => console.error('Error fetching students for registration page ID generator:', err));
  }, []);

  const handleCheckDuplicate = async () => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanMail = email.trim().toLowerCase();
    if (cleanPhone.length === 10 || cleanMail) {
      try {
        const res = await checkDuplicateStudent({ phone: cleanPhone, email: cleanMail });
        if (res?.isDuplicate) {
          setDuplicateWarning(res);
        } else {
          setDuplicateWarning(null);
        }
      } catch (e) {
        // Silently ignore pre-check network hiccups
      }
    }
  };

  const currentIdDetails = useMemo(() => {
    return generateStudentIdDetails({
      branch: branch || 'Saravanampatti',
      course,
      courseType,
      date: new Date(),
      existingStudents
    });
  }, [branch, course, courseType, existingStudents]);

  const WALKIN_CATEGORIES = [
    ...COURSE_CATEGORIES.map(cat => ({
      category: cat.category,
      title: cat.title,
      items: cat.courses.map(c => c.code)
    })),
    {
      category: 'Others',
      title: 'Other Tracks',
      items: ['MCT', 'Others']
    }
  ];


  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (!fatherName.trim()) {
      setErrorMessage("Please enter father's name");
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Please enter your primary mobile number');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }
    if (!education.trim()) {
      setErrorMessage('Please specify your highest qualification');
      return;
    }

    const finalWhatsApp = sameAsMobile ? phone.trim() : (whatsappNumber.trim() || phone.trim());

    const studentRecord = {
      studentId: currentIdDetails.studentId,
      name: name.trim().toUpperCase(),
      fatherName: fatherName.trim(),
      address: address.trim(),
      dob,
      phone: phone.trim(),
      whatsappNumber: finalWhatsApp,
      alternatePhone: sameAsMobile ? '' : whatsappNumber.trim(),
      email: email.trim().toLowerCase(),
      facebookId: facebookId.trim(),
      qualification: education.trim(),
      qualTag: education.toLowerCase().includes('bsc') || education.toLowerCase().includes('pharm') ? 'Life Sci' : 'Grad',
      passoutYear: passoutYear.trim(),
      collegeCompany: college.trim() || company.trim() || '',
      college: college.trim(),
      company: company.trim(),
      course,
      mode: courseType,
      source,
      batchTiming: preferredTimings || '8-10 PM Weekdays',
      batchType,
      batchDate: getCurrentMonthYear(),
      hrName: consultHr || '',
      branch: branch || 'Saravanampatti',
      location: address.split(',')[0]?.trim() || 'Coimbatore',
      enqDate: getCurrentMonthName(),
      onboardStatus: '1/7 In Progress',
      syllabusModule: 'Module 1',
      mockInterview: 'Pending',
      examStatus: 'Not Booked',
      certified: 'Non-certified',
      placementStatus: 'In course',
      feeStatus: 'Pending',
      statusGroup: 'in_course',
      handoverStatus: 'Ready',
      registeredAt: new Date().toISOString()
    };

    try {
      setSubmitting(true);
      const res = await createStudent(studentRecord);
      setSubmittedData(res || studentRecord);
      setDuplicateWarning(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Registration error:', err);
      const errMsg = err?.response?.data?.error || err.message || 'Registration failed. Please try again.';
      setErrorMessage(errMsg);
      if (err?.response?.data?.duplicate) {
        setDuplicateWarning(err.response.data.duplicate);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyId = async (idToCopy) => {
    const success = await copyToClipboard(idToCopy);
    if (success) {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4fcfb] selection:bg-teal-200 selection:text-teal-950 font-sans py-6 sm:py-10 px-3 sm:px-6 flex flex-col items-center justify-start">
      
      {/* Background Decor */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(circle at 15% 20%, rgba(255, 255, 255, 0.95) 0%, rgba(235, 252, 249, 0.8) 45%, transparent 75%),
            radial-gradient(circle at 85% 15%, rgba(175, 241, 234, 0.45) 0%, transparent 60%),
            linear-gradient(135deg, #f6fdfc 0%, #ebf9f6 40%, #daf4f0 75%, #c8efe8 100%)
          `
        }}
      />

      <div className="relative z-10 w-full max-w-3xl">
        
        {/* Navigation Bar / Return to Portal */}
        <div className="flex items-center justify-between mb-4 px-2">
          {onBack ? (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-950 bg-white/80 hover:bg-white px-3 py-1.5 rounded-full border border-teal-200/80 shadow-xs transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to Portal</span>
            </button>
          ) : (
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-950 bg-white/80 hover:bg-white px-3 py-1.5 rounded-full border border-teal-200/80 shadow-xs transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Home Portal</span>
            </a>
          )}

          <div className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
            ThoughtFlows Academy · Admissions
          </div>
        </div>

        {/* SUCCESS CONFIRMATION SCREEN */}
        {submittedData ? (
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-teal-100 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>

            <div className="space-y-2">
              <span className="inline-block bg-teal-50 text-teal-800 border border-teal-200 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                Registration Confirmed
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Welcome to Thoughtflows!
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Thank you <strong className="text-slate-900">{submittedData.name}</strong>. Your registration for the <strong className="text-teal-700">{submittedData.course}</strong> course has been successfully recorded in the academy admissions database.
              </p>
            </div>

            {/* Generated ID Badge */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 max-w-md mx-auto shadow-lg space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-widest text-teal-400">
                Official Student Registration ID
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-black tracking-wider text-white">
                {submittedData.studentId || submittedData.id}
              </div>
              <p className="text-[11px] text-slate-400">
                Please keep this ID handy for all future admissions & batch communications.
              </p>
              <button
                type="button"
                onClick={() => handleCopyId(submittedData.studentId || submittedData.id)}
                className="mt-2 inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : null}
                <span>{copiedId ? 'Copied ID!' : 'Copy Student ID'}</span>
              </button>
            </div>

            {/* Next Steps Box */}
            <div className="bg-teal-50/70 border border-teal-100 rounded-2xl p-4 sm:p-5 text-left text-xs text-teal-950 space-y-2 max-w-lg mx-auto">
              <div className="font-extrabold text-teal-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>What happens next?</span>
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-teal-800 text-[12px] leading-relaxed">
                <li>Your dedicated academic counselor will reach out via WhatsApp / Call.</li>
                <li>You will receive your batch onboarding schedule and orientation login credentials.</li>
                <li>Class mode confirmed: <strong>{submittedData.mode}</strong> ({submittedData.batchTiming || '8-10 PM Weekdays'}).</li>
              </ul>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  setSubmittedData(null);
                  setName('');
                  setFatherName('');
                  setAddress('');
                  setDob('');
                  setPhone('');
                  setWhatsappNumber('');
                  setEmail('');
                  setEducation('');
                  setPassoutYear('');
                  setCollege('');
                  setCompany('');
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all"
              >
                Submit Another Registration
              </button>
              <a
                href="/"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#00695c] hover:bg-[#004d40] text-white font-extrabold text-xs shadow-md transition-all text-center"
              >
                Return to Academy Portal
              </a>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM CONTAINER */
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden text-left">
            
            {/* Header with Logo & Title */}
            <div className="p-6 sm:p-8 pb-4 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center">
                  <img
                    src={logoImg}
                    alt="Thoughtflows - No.1 Medical Coding Academy"
                    className="h-10 sm:h-12 w-auto object-contain"
                  />
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-mono uppercase text-teal-700 font-bold">
                    Official Student Admission
                  </div>
                  <div className="text-xs text-slate-500">
                    Thoughtflows Medical Coding Academy
                  </div>
                </div>
              </div>

              {/* Framed Registration Title */}
              <div className="mt-5 border-2 border-[#00695c] rounded-2xl py-3 px-6 text-center bg-teal-50/20">
                <h1 className="text-xl sm:text-2xl font-black text-[#00695c] tracking-tight">
                  Student Registration Form
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Please complete the form below to enroll into your professional medical coding certification program.
                </p>
              </div>

              {/* Online Student Instruction Banner */}
              <div className="mt-3 bg-[#e6f4f1] border border-teal-200/80 text-teal-900 text-center py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
                <span>📝</span>
                <span>Online Student Registration · Please fill in your details accurately</span>
              </div>
            </div>

            {/* Error / Duplicate Warning Alert */}
            {(errorMessage || duplicateWarning) && (
              <div className="mx-6 sm:mx-8 mt-4 p-4 bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs rounded-2xl shadow-sm animate-shake">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
                    <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="text-xs font-black uppercase tracking-wider text-rose-700">
                      {duplicateWarning ? 'Duplicate Record Error' : 'Registration Error'}
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-rose-950 leading-relaxed">
                      {errorMessage || duplicateWarning?.error}
                    </div>
                    {duplicateWarning?.firstRegistrationMember?.lastContactedHr && (
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-rose-200 text-slate-800 rounded-xl text-xs font-extrabold shadow-xs">
                          <User className="w-3.5 h-3.5 text-rose-600" />
                          <span>First Registered Member: <strong className="text-slate-950">{duplicateWarning.firstRegistrationMember.name}</strong></span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white rounded-xl text-xs font-black shadow-xs">
                          <UserCheck className="w-3.5 h-3.5 text-white" />
                          <span>Lastly Contacted HR: <strong className="underline decoration-white/60">{duplicateWarning.firstRegistrationMember.lastContactedHr}</strong></span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 text-xs font-sans">
              
              {/* SECTION: PERSONAL DETAILS */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase text-[#00695c] tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Personal Details</span>
                </div>

                {/* Name & Father's Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#00695c] mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ARUN KUMAR S"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00796b] focus:ring-2 focus:ring-teal-500/10 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#00695c] mb-1">
                      Father's Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SURESH K"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00796b] focus:ring-2 focus:ring-teal-500/10 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-bold text-[#00695c] mb-1">
                    Complete Address <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows="2"
                    required
                    placeholder="House/Door No, Street, Area, City, Pincode"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-[#00796b] focus:ring-2 focus:ring-teal-500/10 transition-all font-medium"
                  />
                </div>

                {/* DOB & Primary Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#00695c] mb-1">
                      Date of Birth <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00796b] focus:ring-2 focus:ring-teal-500/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#00695c] mb-1">
                      Primary Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile number"
                      value={phone}
                      onBlur={handleCheckDuplicate}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (sameAsMobile) setWhatsappNumber(e.target.value);
                      }}
                      className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00796b] focus:ring-2 focus:ring-teal-500/10 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* WhatsApp & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1 h-4">
                      <label className="text-xs font-bold text-[#00695c]">
                        WhatsApp Number <span className="text-rose-500">*</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={sameAsMobile}
                          onChange={(e) => {
                            setSameAsMobile(e.target.checked);
                            if (e.target.checked) setWhatsappNumber(phone);
                          }}
                          className="accent-[#00796b] rounded cursor-pointer"
                        />
                        <span>Same as mobile</span>
                      </label>
                    </div>
                    <input
                      type="tel"
                      placeholder="WhatsApp number"
                      value={sameAsMobile ? phone : whatsappNumber}
                      disabled={sameAsMobile}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00796b] transition-all font-mono disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#00695c] mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="student@gmail.com"
                      value={email}
                      onBlur={handleCheckDuplicate}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00796b] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: ACADEMIC QUALIFICATIONS */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-black uppercase text-[#00695c] tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Educational Qualification</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#00695c] mb-1">
                      Highest Degree / Qualification <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. B.Sc Life Sciences / B.Pharm / B.Com"
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00796b] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#00695c] mb-1">
                      Year of Passout <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2024 / 2025"
                      value={passoutYear}
                      onChange={(e) => setPassoutYear(e.target.value)}
                      className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00796b] transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#00695c] mb-1">
                      College / Institution Name
                    </label>
                    <input
                      type="text"
                      placeholder="College name"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00796b] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#00695c] mb-1">
                      Company (if currently working)
                    </label>
                    <input
                      type="text"
                      placeholder="Current employer / Optional"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00796b] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: COURSE SELECTION */}
              <div className="border border-slate-200/90 rounded-2xl p-4 bg-white/80 space-y-3.5 shadow-xs">
                {/* Mode: Online / Offline */}
                <div>
                  <div className="text-xs font-black uppercase text-[#00695c] tracking-wider mb-2">
                    SELECT LEARNING MODE
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-bold select-none">
                      <input
                        type="radio"
                        name="courseType"
                        value="Online"
                        checked={courseType === 'Online'}
                        onChange={() => setCourseType('Online')}
                        className="w-4 h-4 accent-[#00796b] cursor-pointer"
                      />
                      <span>Online Live Interactive</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-bold select-none">
                      <input
                        type="radio"
                        name="courseType"
                        value="Offline"
                        checked={courseType === 'Offline'}
                        onChange={() => setCourseType('Offline')}
                        className="w-4 h-4 accent-[#00796b] cursor-pointer"
                      />
                      <span>Classroom (Campus)</span>
                    </label>
                  </div>
                </div>

                {/* Course Selection Radios */}
                <div>
                  <div className="text-xs font-black uppercase text-[#00695c] tracking-wider mb-2">
                    SELECT COURSE / CERTIFICATION
                  </div>
                  <div className="space-y-3 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                    {WALKIN_CATEGORIES.map((cat) => (
                      <div key={cat.category} className="space-y-1.5">
                        <div className="text-[10px] font-black uppercase tracking-wider text-teal-800">
                          {cat.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          {cat.items.map((c) => (
                            <label key={c} className="flex items-center gap-1.5 cursor-pointer text-slate-800 font-semibold select-none text-xs hover:text-teal-800 transition-colors">
                              <input
                                type="radio"
                                name="course"
                                value={c}
                                checked={course === c}
                                onChange={() => setCourse(c)}
                                className="w-3.5 h-3.5 accent-[#00796b] cursor-pointer"
                              />
                              <span>{c}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* TIMINGS & SOURCE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#00695c] mb-1">
                    Preferred Batch Timing
                  </label>
                  <select
                    value={preferredTimings}
                    onChange={(e) => setPreferredTimings(e.target.value)}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00796b] transition-all font-medium cursor-pointer"
                  >
                    <option value="">— Select timing slot —</option>
                    {preferredTimings && !availableSlots.some(s => s.label === preferredTimings || s.value === preferredTimings || s.timing === preferredTimings) && (
                      <option value={preferredTimings}>Current: {preferredTimings}</option>
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

                <div>
                  <label className="block text-xs font-bold text-[#00695c] mb-1">
                    How did you hear about Thoughtflows? (Mode of Source)
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00796b] transition-all font-medium cursor-pointer"
                  >
                    {LEAD_SOURCE_GROUPS.map((grp) => (
                      <optgroup key={grp.group} label={grp.title}>
                        {grp.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {/* BRANCH SELECTION */}
              <div>
                <label className="block text-xs font-bold text-[#00695c] mb-1">
                  Branch / Center <span className="text-rose-500">*</span>
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00796b] transition-all font-medium cursor-pointer"
                >
                  {Object.entries(BRANCH_MAP).map(([bCode, bName]) => (
                    <option key={bCode} value={bName}>
                      {bName} ({bCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* CONSULTANT HR (IF SPECIFIED IN URL) */}
              {consultHr && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex flex-wrap items-center gap-4">
                  <div>
                    <span className="text-slate-400">Assigned Counselor:</span>{' '}
                    <strong className="text-slate-800">{consultHr}</strong>
                  </div>
                </div>
              )}

              {/* AUTO-GENERATED STUDENT ID BANNER */}
              <div className="bg-gradient-to-br from-[#f0faf8] via-[#e6f7f5] to-[#def5f2] border-2 border-teal-400/90 rounded-2xl p-4 sm:p-5 space-y-2.5 text-center shadow-xs">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-900">
                    YOUR GENERATED STUDENT ID
                  </span>
                  <span className="bg-teal-100/90 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-300">
                    Live
                  </span>
                </div>

                <div className="flex items-center justify-center font-mono font-black tracking-wider text-3xl sm:text-4xl text-slate-900">
                  <span>{currentIdDetails.companyPrefix}</span>
                  <span className="text-teal-600">{currentIdDetails.middleCode}</span>
                  <span className="bg-amber-100/90 text-amber-700 px-2.5 py-0.5 rounded-xl ml-1 shadow-xs border border-amber-300/80">
                    {currentIdDetails.serial}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-600 flex items-center justify-center flex-wrap gap-x-1.5 gap-y-0.5">
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

                <div className="text-[10px] font-mono text-teal-700/80 pt-0.5">
                  ✨ Auto-generated based on your Branch, Course & Learning Mode.
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#00695c] hover:bg-[#004d40] text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting Registration…</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Student Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center text-[11px] text-slate-400 font-mono pt-1">
                ThoughtFlows Medical Coding Academy · Admissions & Operations Portal
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
