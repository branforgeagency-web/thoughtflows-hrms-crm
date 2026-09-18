import React, { useState } from 'react';
import {
  X,
  Star,
  Zap,
  Target,
  Folder,
  Check,
  ArrowRight,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function AddLeadModal({ isOpen, onClose, onAddLead }) {
  if (!isOpen) return null;

  // Selected Source (defaulting to #21 Facebook Job Post as in screenshot)
  const [selectedSourceId, setSelectedSourceId] = useState('s21');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('24');
  const [gender, setGender] = useState('Female');
  const [location, setLocation] = useState('Coimbatore');
  const [education, setEducation] = useState('— Select graduation —');
  const [interestedCourse, setInterestedCourse] = useState('CPC - Certified Professional Coder');
  const [preferredBranch, setPreferredBranch] = useState('Saravanampatti (CBE)');

  // Selected Category
  const [selectedCategory, setSelectedCategory] = useState('Fresh Graduate');
  const [showMoreCategories, setShowMoreCategories] = useState(false);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 32 Sources Data
  const TIER_A_SOURCES = [
    { id: 's1', num: '#1', name: 'Google Calls / GMB', badge: 'GOOGLE', volume: '~180/mo · 35%' },
    { id: 's2', num: '#2', name: 'Direct Call', badge: 'SMO TEAM', volume: '~70/mo · 14%' },
    { id: 's3', num: '#3', name: 'Referral', badge: 'EXISTING STUDENT', volume: '~60/mo · 12%' },
    { id: 's4', num: '#4', name: 'Justdial', badge: 'JUSTDIAL', volume: '~45/mo · 9%' }
  ];

  const TIER_B_SOURCES = [
    { id: 's5', num: '#5', name: 'WhatsApp — Direct from Student', badge: 'WHATSAPP', volume: '~38/mo · 7%' },
    { id: 's6', num: '#6', name: 'Direct Walk-in', badge: 'BRANCH', volume: '~28/mo · 5.5%' },
    { id: 's7', num: '#7', name: 'Instagram Chatting', badge: 'INSTAGRAM', volume: '~20/mo · 4%' },
    { id: 's8', num: '#8', name: 'Old SMO Follow-up', badge: 'RECYCLE', volume: '~18/mo · 3.5%' },
    { id: 's9', num: '#9', name: 'LinkedIn Chatting', badge: 'LINKEDIN', volume: '~16/mo · 3%' }
  ];

  const TIER_C_SOURCES = [
    { id: 's10', num: '#10', name: 'Website Enquiry Form', badge: 'DM TEAM', volume: '~14/mo · 2.7%' },
    { id: 's11', num: '#11', name: 'Workshop', badge: 'COLLEGE VISIT', volume: '~12/mo · 2.3%' },
    { id: 's12', num: '#12', name: 'Old Student (Repeat)', badge: 'REPEAT', volume: '~10/mo · 2%' }
  ];

  const TIER_D_SOURCES = [
    { id: 's13', num: '#13', name: 'LinkedIn Direct Call', badge: 'LINKEDIN', volume: '~6/mo' },
    { id: 's14', num: '#14', name: 'Facebook Chatting', badge: 'FACEBOOK', volume: '~4/mo' },
    { id: 's15', num: '#15', name: 'Email Enquiry', badge: 'EMAIL', volume: '~3/mo' },
    { id: 's16', num: '#16', name: 'Instagram Direct Call', badge: 'INSTAGRAM', volume: '~3/mo' },
    { id: 's17', num: '#17', name: 'Facebook Direct Call', badge: 'FACEBOOK', volume: '~2/mo' },
    { id: 's18', num: '#18', name: 'YouTube DM', badge: 'YOUTUBE', volume: '~2/mo' },
    { id: 's19', num: '#19', name: 'Corporate Referrals', badge: 'B2B', volume: '~2/mo' },
    { id: 's20', num: '#20', name: 'College Bulk Demo', badge: 'COLLEGE', volume: '~2/mo' },
    { id: 's21', num: '#21', name: 'Facebook Job Post', badge: 'FACEBOOK', volume: '<1/mo' },
    { id: 's22', num: '#22', name: 'FB Messenger', badge: 'FACEBOOK', volume: '<1/mo' },
    { id: 's23', num: '#23', name: 'FB Comments', badge: 'FACEBOOK', volume: '<1/mo' },
    { id: 's24', num: '#24', name: 'Instagram Comments', badge: 'INSTAGRAM', volume: '<1/mo' },
    { id: 's25', num: '#25', name: 'LinkedIn Comments', badge: 'LINKEDIN', volume: '<1/mo' },
    { id: 's26', num: '#26', name: 'YouTube Comments', badge: 'YOUTUBE', volume: '<1/mo' },
    { id: 's27', num: '#27', name: 'Google My Business', badge: 'GOOGLE', volume: '<1/mo' },
    { id: 's28', num: '#28', name: 'Telegram', badge: 'TELEGRAM', volume: '<1/mo' },
    { id: 's29', num: '#29', name: 'Webinars', badge: 'EVENT', volume: '<1/mo' },
    { id: 's30', num: '#30', name: 'Job Portals (Naukri)', badge: 'JOB BOARD', volume: '<1/mo' },
    { id: 's31', num: '#31', name: 'Consulting Firms', badge: 'B2B', volume: '<1/mo' },
    { id: 's32', num: '#32', name: 'Pre-COVID Old Follow-up', badge: 'DORMANT', volume: '<1/mo' }
  ];

  const ALL_SOURCES = [
    ...TIER_A_SOURCES,
    ...TIER_B_SOURCES,
    ...TIER_C_SOURCES,
    ...TIER_D_SOURCES
  ];

  const currentSelectedSource = ALL_SOURCES.find(s => s.id === selectedSourceId) || TIER_D_SOURCES[8];

  // Lead Categories
  const PRIMARY_CATEGORIES = [
    { id: 'c1', label: 'BPO Reject', icon: '💼' },
    { id: 'c2', label: 'NEET Failed', icon: '🩺' },
    { id: 'c3', label: 'Working Pro (BPO/Hospital)', icon: '👩‍💼' },
    { id: 'c4', label: 'Final Year Student', icon: '🎓' },
    { id: 'c5', label: 'BPharm / BSc Nursing', icon: '💊' },
    { id: 'c6', label: 'Allied Health Graduate', icon: '🧬' },
    { id: 'c7', label: 'Already Employed', icon: '⚙️' },
    { id: 'c8', label: 'Career Gap (1-3 yrs)', icon: '⏸️' },
    { id: 'c9', label: 'Alumni Referral', icon: '⭐' },
    { id: 'c10', label: 'Walk-in Enquiry', icon: '🚪' },
    { id: 'c11', label: 'NRI / Overseas', icon: '🌐' },
    { id: 'c12', label: 'Career Switch', icon: '🔄' },
    { id: 'c13', label: 'Cold Call', icon: '📞' },
    { id: 'c14', label: 'Fresh Graduate', icon: '🎯' }
  ];

  const EXTRA_CATEGORIES = [
    { id: 'c15', label: 'Govt Exam Aspirant', icon: '🏥' },
    { id: 'c16', label: 'Parent Inquiring', icon: '👨‍👩‍👦' },
    { id: 'c17', label: 'IT / Non-Medical Switch', icon: '💻' },
    { id: 'c18', label: 'Lab Technician / Paramedical', icon: '🧪' },
    { id: 'c19', label: 'Exam Repeat / Retake', icon: '📝' },
    { id: 'c20', label: 'Homemaker Restart', icon: '🏠' },
    { id: 'c21', label: 'Urgent Placement Needed', icon: '⏳' },
    { id: 'c22', label: 'Fee Discount Seeking', icon: '💰' },
    { id: 'c23', label: 'Friend Group Joint Admission', icon: '🤝' },
    { id: 'c24', label: 'Outstation Relocation', icon: '📍' },
    { id: 'c25', label: 'High Merit Discount', icon: '🌟' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('Please enter candidate full name');
      return;
    }
    if (!mobileNumber.trim()) {
      showToast('Please enter mobile number');
      return;
    }

    const newLead = {
      id: `lead-${Date.now()}`,
      name: fullName.trim(),
      phone: mobileNumber.trim(),
      email: email.trim(),
      age,
      gender,
      location,
      education,
      course: interestedCourse,
      branch: preferredBranch,
      source: currentSelectedSource.name,
      sourceBadge: currentSelectedSource.badge,
      category: selectedCategory,
      createdAt: new Date().toISOString()
    };

    if (onAddLead) {
      onAddLead(newLead);
    }

    showToast(`✓ Lead ${newLead.name} successfully added to dashboard!`);
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const renderSourceCard = (item, isCompact = false) => {
    const isSelected = selectedSourceId === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setSelectedSourceId(item.id)}
        className={`relative text-left p-3 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer ${
          isSelected
            ? 'border-2 border-[#00a896] bg-[#f0faf8] shadow-sm'
            : 'border-slate-200/90 bg-white hover:border-teal-300 hover:shadow-xs'
        }`}
      >
        {isSelected && (
          <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#0e6977] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </span>
        )}
        <div className="space-y-1 pr-4">
          <div className="text-[10px] font-mono text-slate-400 font-semibold">{item.num}</div>
          <div className="font-bold text-slate-900 text-xs leading-snug truncate">
            {item.name}
          </div>
          <div>
            <span className="inline-block text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              {item.badge}
            </span>
          </div>
        </div>
        <div className="mt-2 text-[10.5px] font-mono font-semibold text-emerald-600">
          {item.volume}
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-[70] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-teal-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Modal Container */}
      <div className="bg-white rounded-[28px] max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        
        {/* TOP BANNER */}
        <div className="bg-gradient-to-r from-[#00b49f] via-[#00a896] to-[#028090] p-5 sm:p-6 text-white relative flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Add New Lead</h2>
            <p className="text-[11px] font-mono font-bold tracking-widest text-teal-100/90 mt-1 uppercase">
              PICK SOURCE · CAPTURE DETAILS · ASSIGN CATEGORY · START CALL
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-7 space-y-8 text-left">
          
          {/* SECTION 1: WHERE DID THIS LEAD COME FROM? */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#0e6977] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  1
                </span>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  Where did this lead come from?
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400 font-medium">
                32 sources tracked · pick one
              </span>
            </div>

            {/* Tier A: Top Producers */}
            <div className="space-y-2.5">
              <div className="bg-emerald-50/70 border border-emerald-200/60 px-3.5 py-1.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-extrabold text-emerald-950">
                    TIER A · Top Producers
                  </span>
                  <span className="text-[11px] font-mono text-emerald-800/80 hidden sm:inline">
                    Daily bread · 70% of all leads
                  </span>
                </div>
                <span className="bg-emerald-600 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded-md">
                  ~355/mo
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {TIER_A_SOURCES.map((s) => renderSourceCard(s))}
              </div>
            </div>

            {/* Tier B: Solid Performers */}
            <div className="space-y-2.5 pt-2">
              <div className="bg-blue-50/70 border border-blue-200/60 px-3.5 py-1.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                  <span className="text-xs font-extrabold text-blue-950">
                    TIER B · Solid Performers
                  </span>
                  <span className="text-[11px] font-mono text-blue-800/80 hidden sm:inline">
                    Reliable channels worth optimizing
                  </span>
                </div>
                <span className="bg-blue-600 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded-md">
                  ~120/mo
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {TIER_B_SOURCES.map((s) => renderSourceCard(s))}
              </div>
            </div>

            {/* Tier C: Moderate Volume */}
            <div className="space-y-2.5 pt-2">
              <div className="bg-amber-50/70 border border-amber-200/60 px-3.5 py-1.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-extrabold text-amber-950">
                    TIER C · Moderate Volume
                  </span>
                  <span className="text-[11px] font-mono text-amber-800/80 hidden sm:inline">
                    Weekly contribution · niche but valuable
                  </span>
                </div>
                <span className="bg-amber-500 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded-md">
                  ~36/mo
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {TIER_C_SOURCES.map((s) => renderSourceCard(s))}
              </div>
            </div>

            {/* Tier D: Long Tail */}
            <div className="space-y-2.5 pt-2">
              <div className="bg-slate-100/80 border border-slate-200 px-3.5 py-1.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-xs font-extrabold text-slate-900">
                    TIER D · Long Tail
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                    Low volume but tracked for completeness · 20 sources
                  </span>
                </div>
                <span className="bg-slate-600 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded-md">
                  ~30/mo
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {TIER_D_SOURCES.map((s) => renderSourceCard(s, true))}
              </div>
            </div>
          </div>

          {/* SECTION 2: CANDIDATE DETAILS */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#0e6977] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  2
                </span>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  Candidate Details
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400 font-medium">
                All required for proper allocation
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Row 1: Full Name */}
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                  FULL NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Ramesh"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#0e6977] transition-all font-sans"
                />
              </div>

              {/* Row 2: Mobile & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                    MOBILE NUMBER *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="98••••••••"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#0e6977] transition-all font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                    EMAIL
                  </label>
                  <input
                    type="email"
                    placeholder="name@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#0e6977] transition-all font-sans"
                  />
                </div>
              </div>

              {/* Row 3: Age & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                    AGE
                  </label>
                  <input
                    type="number"
                    placeholder="24"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#0e6977] transition-all font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                    GENDER
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#0e6977] transition-all font-sans cursor-pointer"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Location & Education */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                    LOCATION
                  </label>
                  <input
                    type="text"
                    placeholder="Coimbatore"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#0e6977] transition-all font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                    EDUCATION / GRADUATION
                  </label>
                  <select
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#0e6977] transition-all font-sans cursor-pointer"
                  >
                    <option value="— Select graduation —">— Select graduation —</option>
                    <option value="BSc Life Sciences (Biotech, Micro, Biochem)">BSc Life Sciences (Biotech, Micro, Biochem)</option>
                    <option value="BPharm / DPharm / MPharm">BPharm / DPharm / MPharm</option>
                    <option value="BSc Nursing / GNM">BSc Nursing / GNM</option>
                    <option value="BPT / Physiotherapy / Allied Health">BPT / Physiotherapy / Allied Health</option>
                    <option value="BSc Computer Science / IT / BCA">BSc Computer Science / IT / BCA</option>
                    <option value="BCom / BBA / Non-Life Sciences">BCom / BBA / Non-Life Sciences</option>
                    <option value="BE / BTech">BE / BTech</option>
                    <option value="Other Graduation">Other Graduation</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Interested Course & Preferred Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                    INTERESTED COURSE
                  </label>
                  <select
                    value={interestedCourse}
                    onChange={(e) => setInterestedCourse(e.target.value)}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#0e6977] transition-all font-sans cursor-pointer"
                  >
                    <option value="CPC - Certified Professional Coder">CPC - Certified Professional Coder</option>
                    <option value="Comprehensive Medical Coding + Hospital Internship">Comprehensive Medical Coding + Hospital Internship</option>
                    <option value="Fast-Track Weekend Batch for Life Sciences">Fast-Track Weekend Batch for Life Sciences</option>
                    <option value="Inpatient Coding & DRG Specialty">Inpatient Coding & DRG Specialty</option>
                    <option value="Medical Billing & RCM Executive">Medical Billing & RCM Executive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                    PREFERRED BRANCH
                  </label>
                  <select
                    value={preferredBranch}
                    onChange={(e) => setPreferredBranch(e.target.value)}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#0e6977] transition-all font-sans cursor-pointer"
                  >
                    <option value="Saravanampatti (CBE)">Saravanampatti (CBE)</option>
                    <option value="Gandhipuram (CBE)">Gandhipuram (CBE)</option>
                    <option value="Online Live (Virtual)">Online Live (Virtual)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: LEAD CATEGORY */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#0e6977] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  3
                </span>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  Lead Category
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400 font-medium">
                Drives the action plan + script during call
              </span>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {PRIMARY_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.label;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.label)}
                    className={`p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer text-left ${
                      isSelected
                        ? 'border-2 border-[#0e6977] bg-[#e6fffa] text-[#00695c] font-bold shadow-xs'
                        : 'border-slate-200/90 bg-white hover:border-teal-300 text-slate-800'
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-xs truncate">{cat.label}</span>
                  </button>
                );
              })}

              {/* Expand Extra Categories Button */}
              <button
                type="button"
                onClick={() => setShowMoreCategories(!showMoreCategories)}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 cursor-pointer text-left ${
                  showMoreCategories
                    ? 'border-[#0e6977] bg-teal-50/50 text-[#0e6977] font-bold'
                    : 'border-teal-400 bg-teal-50/20 hover:bg-teal-50/50 text-teal-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#0e6977]" />
                  <span className="text-xs font-bold">
                    {showMoreCategories ? 'Show Less' : '+ 11 more categories'}
                  </span>
                </div>
                {showMoreCategories ? (
                  <ChevronUp className="w-4 h-4 text-[#0e6977]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#0e6977]" />
                )}
              </button>
            </div>

            {/* Render Extra 11 Categories when expanded */}
            {showMoreCategories && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2 animate-in fade-in">
                {EXTRA_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.label;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.label)}
                      className={`p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer text-left ${
                        isSelected
                          ? 'border-2 border-[#0e6977] bg-[#e6fffa] text-[#00695c] font-bold shadow-xs'
                          : 'border-slate-200/90 bg-white hover:border-teal-300 text-slate-800'
                      }`}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span className="text-xs truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* BOTTOM STICKY FOOTER */}
          <div className="sticky -bottom-5 sm:-bottom-7 -mx-5 sm:-mx-7 -mb-5 sm:-mb-7 bg-slate-50/95 backdrop-blur-md border-t border-slate-200 px-5 sm:px-7 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg z-20">
            <div className="text-xs font-mono text-slate-500">
              Selected: <strong className="text-slate-900 font-bold">{currentSelectedSource?.name}</strong> ·{' '}
              <span className="text-teal-700 font-semibold">{selectedCategory}</span>
            </div>

            <button
              type="submit"
              className="bg-[#0e6977] hover:bg-[#0a4f5a] text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Add Lead to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
