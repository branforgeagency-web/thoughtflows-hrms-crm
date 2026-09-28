import React, { useState, useEffect } from 'react';
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
  Check
} from 'lucide-react';
import logoImg from '../assets/thoughtflows-logo.png';
import { COURSE_CATEGORIES } from '../constants/courses';
import { createStudent } from '../services/api';
import { getCurrentMonthYear, getCurrentMonthName } from '../utils/dateUtils';
import { copyToClipboard } from '../utils/clipboard';

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
  const [course, setCourse] = useState(queryParams.get('course') || 'CPC');
  
  // Knowledge source
  const [source, setSource] = useState('Online');

  // Timings & Batch
  const [preferredTimings, setPreferredTimings] = useState('8-10 PM Weekdays');
  const [batchType, setBatchType] = useState('Weekdays'); // 'Weekdays', 'Weekends', 'Both'

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

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

  const SOURCES = [
    'Social Media',
    'Word of Mouth',
    'Online',
    'College Campus',
    'Others'
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Registration error:', err);
      setErrorMessage(err?.response?.data?.error || err.message || 'Registration failed. Please try again.');
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

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="mx-6 sm:mx-8 mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-shake">
                <span>⚠️</span>
                <span>{errorMessage}</span>
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
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00796b] transition-all font-medium"
                  >
                    <option value="8-10 PM Weekdays">8:00 PM – 10:00 PM (Weekdays)</option>
                    <option value="7-9 AM Weekdays">7:00 AM – 9:00 AM (Morning)</option>
                    <option value="10 AM-1 PM Daily">10:00 AM – 1:00 PM (Regular)</option>
                    <option value="2-5 PM Weekdays">2:00 PM – 5:00 PM (Afternoon)</option>
                    <option value="Weekend Full Day">Weekend Full Day (Sat & Sun)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#00695c] mb-1">
                    How did you hear about Thoughtflows?
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 outline-none focus:border-[#00796b] transition-all font-medium"
                  >
                    {SOURCES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CONSULTANT HR & BRANCH (IF SPECIFIED IN URL) */}
              {(consultHr || branch) && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex flex-wrap items-center gap-4">
                  {consultHr && (
                    <div>
                      <span className="text-slate-400">Assigned Counselor:</span>{' '}
                      <strong className="text-slate-800">{consultHr}</strong>
                    </div>
                  )}
                  {branch && (
                    <div>
                      <span className="text-slate-400">Branch:</span>{' '}
                      <strong className="text-slate-800">{branch}</strong>
                    </div>
                  )}
                </div>
              )}

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
