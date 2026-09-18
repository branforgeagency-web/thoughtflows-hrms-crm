import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Video,
  Check,
  CheckCircle2,
  X,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Info
} from 'lucide-react';

// Time parsing helpers for accurate client-side evaluation
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const cleaned = timeStr.trim();
  const match12 = cleaned.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2] ? parseInt(match12[2], 10) : 0;
    const period = match12[3].toLowerCase();
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const match24 = cleaned.match(/(\d{1,2}):(\d{2})/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }
  return null;
}

function parseSlotToRange(slotStr) {
  if (!slotStr) return null;
  const parts = slotStr.split(/[–\-—to]/i).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    let startPart = parts[0];
    let endPart = parts[1];
    const periodMatch = endPart.match(/(am|pm)/i);
    if (periodMatch && !startPart.match(/(am|pm)/i)) {
      const period = periodMatch[1].toLowerCase();
      const startNum = parseInt(startPart, 10);
      const endNum = parseInt(endPart, 10);
      if (period === 'pm' && startNum >= 6 && startNum <= 11 && endNum < 6) {
        startPart = `${startPart} AM`;
      } else {
        startPart = `${startPart} ${period}`;
      }
    }
    const startMin = parseTimeToMinutes(startPart);
    const endMin = parseTimeToMinutes(endPart);
    if (startMin !== null && endMin !== null) {
      return { startMin, endMin };
    }
  }
  const singleMin = parseTimeToMinutes(slotStr);
  if (singleMin !== null) {
    return { startMin: singleMin, endMin: singleMin + 60 };
  }
  return null;
}

// Configured Faculty Roster with Experience, Shifts, and Scheduled Classes
const COURSE_EXPERTS = {
  CPC: {
    trainer: 'Revathi K',
    trainerId: 'TR-CBG-001',
    courseFull: 'CPC — Certified Professional Coder',
    specialization: 'Anatomy, ICD-10-CM & CPT Surgery Coding Specialist',
    rating: '96% Rating · Shift 6 AM–2 PM',
    shift: '6:00 AM – 2:00 PM',
    shiftStartMin: 360, // 6:00 AM
    shiftEndMin: 840,   // 2:00 PM
    scheduledClasses: [
      { name: 'CPC — Medical Coding Core (Batch 01)', timeSlot: '6:00–8:00 AM', startMin: 360, endMin: 480 },
      { name: 'ICD-10-CM Coding & Guidelines', timeSlot: '8:00–9:30 AM', startMin: 480, endMin: 570 },
      { name: 'CPT Surgery & Modifiers Workshop', timeSlot: '12:00–1:30 PM', startMin: 720, endMin: 810 }
    ]
  },
  CIC: {
    trainer: 'Priyadharshini K.',
    trainerId: 'TR-CBG-002',
    courseFull: 'CIC — Certified Inpatient Coder',
    specialization: 'Inpatient Coding, ICD-10-PCS & IPDRG Specialist',
    rating: '98% Rating · Shift 9 AM–5 PM',
    shift: '9:00 AM – 5:00 PM',
    shiftStartMin: 540, // 9:00 AM
    shiftEndMin: 1020,  // 5:00 PM
    scheduledClasses: [
      { name: 'CIC Inpatient Hospital PCS Lab', timeSlot: '9:00–11:00 AM', startMin: 540, endMin: 660 },
      { name: 'IPDRG Grouping & Case Studies', timeSlot: '1:00–3:00 PM', startMin: 780, endMin: 900 }
    ]
  },
  CPB: {
    trainer: 'Suresh Babu',
    trainerId: 'TR-CBG-003',
    courseFull: 'CPB — Certified Professional Biller',
    specialization: 'US Healthcare RCM & Hospital Billing Specialist',
    rating: '92% Rating · Shift 8 AM–4 PM',
    shift: '8:00 AM – 4:00 PM',
    shiftStartMin: 480, // 8:00 AM
    shiftEndMin: 960,   // 4:00 PM
    scheduledClasses: [
      { name: 'CPB Healthcare Billing & Claims', timeSlot: '8:00–10:00 AM', startMin: 480, endMin: 600 },
      { name: 'RCM Denial Management', timeSlot: '1:00–2:30 PM', startMin: 780, endMin: 870 }
    ]
  },
  CPMA: {
    trainer: 'Manjunath R.',
    trainerId: 'TR-CBG-004',
    courseFull: 'CPMA — Certified Professional Medical Auditor',
    specialization: 'Chart Auditing, Compliance & HCPCS Specialist',
    rating: '94% Rating · Shift 10 AM–6 PM',
    shift: '10:00 AM – 6:00 PM',
    shiftStartMin: 600, // 10:00 AM
    shiftEndMin: 1080,  // 6:00 PM
    scheduledClasses: [
      { name: 'CPMA Chart Auditing Fundamentals', timeSlot: '10:00–12:00 PM', startMin: 600, endMin: 720 },
      { name: 'AAPC Regulatory Compliance Drills', timeSlot: '2:00–4:00 PM', startMin: 840, endMin: 960 }
    ]
  },
  CCS: {
    trainer: 'Karthik V.',
    trainerId: 'TR-ACAD-002',
    courseFull: 'CCS — Certified Coding Specialist',
    specialization: 'AHIMA Inpatient & Outpatient Hospital Specialist',
    rating: '95% Rating · Shift 9 AM–5 PM',
    shift: '9:00 AM – 5:00 PM',
    shiftStartMin: 540,
    shiftEndMin: 1020,
    scheduledClasses: [
      { name: 'AHIMA CCS Clinical Documentation', timeSlot: '9:00–11:00 AM', startMin: 540, endMin: 660 },
      { name: 'Inpatient PCS Code Building', timeSlot: '2:00–3:30 PM', startMin: 840, endMin: 930 }
    ]
  },
  CRC: {
    trainer: 'Dr. Vikram C.',
    trainerId: 'TR-ACAD-001',
    courseFull: 'CRC — Certified Risk Adjustment Coder',
    specialization: 'HCC Risk Adjustment & Value Healthcare Specialist',
    rating: '99% Rating · Shift 7 AM–3 PM',
    shift: '7:00 AM – 3:00 PM',
    shiftStartMin: 420,
    shiftEndMin: 900,
    scheduledClasses: [
      { name: 'CRC Risk Adjustment Masterclass', timeSlot: '7:00–9:00 AM', startMin: 420, endMin: 540 },
      { name: 'COC Outpatient Procedures Review', timeSlot: '12:30–2:00 PM', startMin: 750, endMin: 840 }
    ]
  },
  COC: {
    trainer: 'Dr. Vikram C.',
    trainerId: 'TR-ACAD-001',
    courseFull: 'COC — Certified Outpatient Coder',
    specialization: 'Hospital Outpatient Services & Ambulatory Specialist',
    rating: '99% Rating · Shift 7 AM–3 PM',
    shift: '7:00 AM – 3:00 PM',
    shiftStartMin: 420,
    shiftEndMin: 900,
    scheduledClasses: [
      { name: 'CRC Risk Adjustment Masterclass', timeSlot: '7:00–9:00 AM', startMin: 420, endMin: 540 },
      { name: 'COC Outpatient Procedures Review', timeSlot: '12:30–2:00 PM', startMin: 750, endMin: 840 }
    ]
  },
  'EMCT Intermediate': {
    trainer: 'Anjali Nair',
    trainerId: 'TR-KL-001',
    courseFull: 'EMCT Intermediate & Medical Terminology',
    specialization: 'Medical Terminology & Foundational Physiology',
    rating: '91% Rating · Shift 8 AM–4 PM',
    shift: '8:00 AM – 4:00 PM',
    shiftStartMin: 480,
    shiftEndMin: 960,
    scheduledClasses: [
      { name: 'Anatomy & Medical Terminology Foundation', timeSlot: '8:00–10:00 AM', startMin: 480, endMin: 600 }
    ]
  }
};

export default function BookNewDemoModal({ isOpen, onClose, initialData, onConfirm }) {
  if (!isOpen) return null;

  const [studentName, setStudentName] = useState(initialData?.studentName || initialData?.name || initialData?.candidateName || '');
  const [mobile, setMobile] = useState(initialData?.mobile || initialData?.phone || '');
  const [course, setCourse] = useState(initialData?.course || 'CPC');
  const [mode, setMode] = useState(initialData?.mode || 'Online');
  const [preferredDate, setPreferredDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState(initialData?.timeSlot || '10:00–11:30 AM');
  const [language, setLanguage] = useState(initialData?.language || 'Tamil');
  const [isExperiencedTrainer, setIsExperiencedTrainer] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);

  const TIME_SLOTS = [
    { slot: '6:00–8:00 AM', tag: 'Class Overlap (CPC)' },
    { slot: '8:00–9:30 AM', tag: 'Class Overlap (CPC)' },
    { slot: '10:00–11:30 AM', tag: 'Free In Shift (Delivered)' },
    { slot: '11:30 AM–1:00 PM', tag: 'Free In Shift (Delivered)' },
    { slot: '12:00–1:30 PM', tag: 'Class Overlap (CPC)' },
    { slot: '1:30–2:00 PM', tag: 'Free In Shift (Delivered)' },
    { slot: '4:00–6:00 PM', tag: 'Outside Shift (Blocked)' },
    { slot: '6:30–8:30 PM', tag: 'Outside Shift (Blocked)' }
  ];

  const LANGUAGES = ['Tamil', 'English', 'Telugu', 'Malayalam', 'Hindi', 'Kannada'];

  const getExpertForCourse = (crs) => {
    return COURSE_EXPERTS[crs] || COURSE_EXPERTS.CPC;
  };

  const expert = useMemo(() => getExpertForCourse(course), [course]);

  // Live Multi-Condition Rule Evaluation
  const evaluation = useMemo(() => {
    // Condition 1: Experienced Trainer
    if (!isExperiencedTrainer) {
      return {
        eligible: false,
        condition1: false,
        condition2: null,
        condition3: null,
        condition4: null,
        conflictType: 'NOT_EXPERIENCED',
        reason: `Blocked: Trainer ${expert.trainer} is not marked as Experienced in settings. Notification not sent.`
      };
    }

    const range = parseSlotToRange(timeSlot);
    if (!range) {
      return {
        eligible: true,
        condition1: true,
        condition2: true,
        condition3: true,
        condition4: true,
        conflictType: null,
        reason: 'Slot time within normal schedule window. Notification ready.'
      };
    }

    const { startMin, endMin } = range;

    // Condition 4: Outside Shift Time
    const isOutsideShift = startMin < expert.shiftStartMin || endMin > expert.shiftEndMin;
    if (isOutsideShift) {
      return {
        eligible: false,
        condition1: true,
        condition2: true,
        condition3: false,
        condition4: false,
        conflictType: 'OUTSIDE_SHIFT',
        reason: `Blocked: Demo session (${timeSlot}) is outside trainer's configured shift (${expert.shift}). Notification not sent.`
      };
    }

    // Condition 2: Trainer Has a Class During the Demo Time
    const overlappingClass = (expert.scheduledClasses || []).find(cls => {
      return Math.max(startMin, cls.startMin) < Math.min(endMin, cls.endMin);
    });

    if (overlappingClass) {
      return {
        eligible: false,
        condition1: true,
        condition2: false,
        condition3: false,
        condition4: true,
        conflictType: 'CLASS_CONFLICT',
        conflictingClass: overlappingClass.name,
        conflictingSlot: overlappingClass.timeSlot,
        reason: `Blocked: Trainer already has class "${overlappingClass.name}" (${overlappingClass.timeSlot}) overlapping with demo (${timeSlot}). Notification not sent.`
      };
    }

    // Condition 3: Experienced + Within Shift + No Class During Demo Time
    return {
      eligible: true,
      condition1: true,
      condition2: true,
      condition3: true,
      condition4: true,
      conflictType: null,
      reason: `Delivered: Trainer is Experienced · Within shift (${expert.shift}) · No class conflict during ${timeSlot}. Notification sent!`
    };
  }, [expert, timeSlot, isExperiencedTrainer]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!studentName.trim()) {
      showToast('Please enter candidate / student name');
      return;
    }

    const demoPayload = {
      candidateName: studentName,
      studentName,
      phone: mobile,
      mobile,
      course,
      mode,
      preferredDate,
      time: `${preferredDate} ${timeSlot}`,
      timeSlot,
      language,
      trainer: expert.trainer,
      trainerId: expert.trainerId,
      trainerRole: expert.specialization,
      expertCourse: expert.courseFull,
      isExpertMatched: true,
      isExperienced: isExperiencedTrainer,
      shiftTiming: expert.shift,
      hasConflict: evaluation.conflictType === 'CLASS_CONFLICT',
      conflictReason: evaluation.eligible ? '' : evaluation.reason,
      notificationSent: evaluation.eligible,
      notificationSentTo: evaluation.eligible ? expert.trainerId : null,
      notificationSentToName: evaluation.eligible ? expert.trainer : null,
      notificationSentAt: evaluation.eligible ? new Date() : null,
      notificationRead: false,
      notificationBlockReason: evaluation.eligible ? '' : evaluation.reason,
      priority: evaluation.eligible ? 'Urgent - Subject Matter Expert First' : 'Standard - No Alert Dispatched',
      trainerMapping: evaluation.eligible 
        ? `★ Notification Sent to ${expert.trainer}: Experienced · Shift (${expert.shift}) · Free Slot`
        : `🔕 Notification Blocked: ${evaluation.reason}`,
      status: 'booked'
    };

    if (onConfirm) {
      onConfirm(demoPayload);
    }

    if (evaluation.eligible) {
      showToast(`✓ Demo booked for ${studentName}! High-priority notification sent to ${expert.trainer}.`);
    } else {
      showToast(`✓ Demo booked for ${studentName}. Notification suppressed: ${evaluation.reason}`);
    }

    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-[60] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-teal-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Modal Box */}
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in zoom-in-95 max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🗓️</span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight">
                Book New Demo
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Multi-condition trainer notification engine with shift & schedule verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto">
          {/* Student name & Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 font-mono mb-1">
                Student Name *
              </label>
              <input
                type="text"
                required
                placeholder="Candidate name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-[#0e6977] transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 font-mono mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                placeholder="+91..."
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-[#0e6977] transition-all font-mono"
              />
            </div>
          </div>

          {/* Row: Course & Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 font-mono mb-1">
                Course
              </label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold outline-none focus:border-[#0e6977] transition-all"
              >
                <option value="CPC">CPC — Certified Professional Coder</option>
                <option value="CIC">CIC — Certified Inpatient Coder</option>
                <option value="CPB">CPB — Certified Professional Biller & RCM</option>
                <option value="CPMA">CPMA — Certified Medical Auditor</option>
                <option value="CCS">CCS — Certified Coding Specialist</option>
                <option value="CRC">CRC — Certified Risk Adjustment</option>
                <option value="COC">COC — Certified Outpatient Coder</option>
                <option value="EMCT Intermediate">EMCT Intermediate & Terminology</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 font-mono mb-1">
                Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold outline-none focus:border-[#0e6977] transition-all"
              >
                <option value="Online">Online (Zoom Live)</option>
                <option value="Classroom (Saravanampatti)">Classroom (Saravanampatti)</option>
                <option value="Campus Tour + Counseling">Campus Tour</option>
              </select>
            </div>
          </div>

          {/* Preferred date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 font-mono mb-1">
              Preferred Date
            </label>
            <input
              type="date"
              required
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#0e6977] transition-all font-mono"
            />
          </div>

          {/* Time slot picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-slate-600 font-mono">
                Time Slot Selection
              </label>
              <span className="text-[10px] text-slate-500">
                Shift: <strong className="text-slate-800">{expert.shift}</strong>
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TIME_SLOTS.map(({ slot, tag }) => {
                const isSelected = timeSlot === slot;
                const isConflict = expert.scheduledClasses?.some(cls => {
                  const range = parseSlotToRange(slot);
                  return range && Math.max(range.startMin, cls.startMin) < Math.min(range.endMin, cls.endMin);
                });
                const range = parseSlotToRange(slot);
                const isOffShift = range && (range.startMin < expert.shiftStartMin || range.endMin > expert.shiftEndMin);

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setTimeSlot(slot)}
                    className={`py-2 px-2 rounded-xl text-[10.5px] font-bold transition-all text-center border relative flex flex-col items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-[#0e6977] border-[#0e6977] text-white shadow-xs scale-[1.02]'
                        : isConflict
                        ? 'bg-rose-50/60 border-rose-200 text-rose-800 hover:border-rose-400'
                        : isOffShift
                        ? 'bg-amber-50/60 border-amber-200 text-amber-800 hover:border-amber-400'
                        : 'bg-white border-teal-300/80 text-[#00695c] hover:border-teal-500'
                    }`}
                  >
                    <span>{slot}</span>
                    <span className={`text-[8.5px] font-normal leading-tight mt-0.5 truncate max-w-full ${
                      isSelected ? 'text-teal-100' : isConflict ? 'text-rose-600' : isOffShift ? 'text-amber-600' : 'text-teal-600'
                    }`}>
                      {isConflict ? '⚠️ Class' : isOffShift ? '🌙 Off-shift' : '✓ Open'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Condition 1 Simulation Toggle: Trainer Experience Setting */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Condition 1: Trainer Experience Setting</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Designated SME: <strong className="text-slate-700">{expert.trainer}</strong> ({expert.trainerId}) · {expert.specialization}
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isExperiencedTrainer}
                onChange={(e) => setIsExperiencedTrainer(e.target.checked)}
                className="w-4 h-4 text-[#0e6977] rounded focus:ring-teal-500 cursor-pointer"
              />
              <span className={`text-[11px] font-bold ${isExperiencedTrainer ? 'text-teal-700' : 'text-slate-500'}`}>
                {isExperiencedTrainer ? 'Experienced' : 'Not Experienced'}
              </span>
            </label>
          </div>

          {/* Preferred language */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 font-mono mb-1.5 flex items-center gap-1.5">
              <span>🗣️</span>
              <span>Preferred Language</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {LANGUAGES.map((lang) => {
                const isSelected = language === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`py-1 px-3 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-[#0e6977] border-[#0e6977] text-white shadow-xs'
                        : 'bg-white border-teal-300/80 text-[#00695c] hover:border-teal-500'
                    }`}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* MULTI-CONDITION LIVE DECISION CARD                     */}
          {/* ======================================================== */}
          <div className={`rounded-2xl p-4 border transition-all space-y-3 ${
            evaluation.eligible
              ? 'bg-[#ecfdf5] border-emerald-300 text-emerald-950 shadow-xs'
              : 'bg-[#fef2f2] border-rose-300 text-rose-950 shadow-xs'
          }`}>
            {/* Header Status */}
            <div className="flex items-center justify-between gap-2 border-b pb-2.5 border-black/5">
              <div className="flex items-center gap-2">
                {evaluation.eligible ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    ✓
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                    ✕
                  </div>
                )}
                <div>
                  <div className="font-extrabold text-[12px] uppercase tracking-wide">
                    {evaluation.eligible ? 'Demo Booked Notification WILL Be Sent' : 'Demo Booked Notification WILL NOT Be Sent'}
                  </div>
                  <div className="text-[10.5px] opacity-80 font-medium">
                    {evaluation.eligible 
                      ? `Dispatched directly to ${expert.trainer}'s dashboard first` 
                      : `Notification suppressed: ${evaluation.reason}`}
                  </div>
                </div>
              </div>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                evaluation.eligible ? 'bg-emerald-200/80 text-emerald-900 border border-emerald-300' : 'bg-rose-200/80 text-rose-900 border border-rose-300'
              }`}>
                {evaluation.eligible ? 'Ready to Send' : 'Blocked'}
              </span>
            </div>

            {/* 3 Strict Condition Checklists */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10.5px]">
              {/* Condition 1 */}
              <div className={`p-2 rounded-xl border flex flex-col justify-between ${
                isExperiencedTrainer ? 'bg-white/80 border-emerald-200 text-emerald-900' : 'bg-white/80 border-rose-200 text-rose-900'
              }`}>
                <div className="font-bold flex items-center gap-1">
                  <span>{isExperiencedTrainer ? '🟢' : '🔴'}</span>
                  <span>1. Experienced Trainer</span>
                </div>
                <div className="mt-1 opacity-80 text-[10px]">
                  {isExperiencedTrainer ? 'Trainer is Experienced ✓' : 'Trainer not experienced ✗'}
                </div>
              </div>

              {/* Condition 2 & 4: Shift Window */}
              <div className={`p-2 rounded-xl border flex flex-col justify-between ${
                evaluation.condition4 !== false ? 'bg-white/80 border-emerald-200 text-emerald-900' : 'bg-white/80 border-rose-200 text-rose-900'
              }`}>
                <div className="font-bold flex items-center gap-1">
                  <span>{evaluation.condition4 !== false ? '🟢' : '🔴'}</span>
                  <span>2. Shift Window</span>
                </div>
                <div className="mt-1 opacity-80 text-[10px]">
                  {evaluation.condition4 !== false 
                    ? `Within ${expert.shift} ✓` 
                    : `Outside ${expert.shift} ✗`}
                </div>
              </div>

              {/* Condition 3: Scheduled Classes Overlap */}
              <div className={`p-2 rounded-xl border flex flex-col justify-between ${
                evaluation.condition2 !== false ? 'bg-white/80 border-emerald-200 text-emerald-900' : 'bg-white/80 border-rose-200 text-rose-900'
              }`}>
                <div className="font-bold flex items-center gap-1">
                  <span>{evaluation.condition2 !== false ? '🟢' : '🔴'}</span>
                  <span>3. Class Overlap</span>
                </div>
                <div className="mt-1 opacity-80 text-[10px] truncate" title={evaluation.conflictingClass}>
                  {evaluation.condition2 !== false 
                    ? 'No Class Conflict ✓' 
                    : `Conflict: ${evaluation.conflictingClass || 'Active Class'} ✗`}
                </div>
              </div>
            </div>

            {/* Explanation Note */}
            <div className="text-[10.5px] leading-relaxed pt-0.5">
              <strong>Rule Enforcement:</strong> Demo notification is sent <em>only</em> when Trainer is Experienced, demo slot is within trainer's shift, and trainer has no scheduled class at that time.
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className={`py-2 px-6 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer text-white ${
                evaluation.eligible 
                  ? 'bg-[#0e6977] hover:bg-[#0a4f5a]' 
                  : 'bg-slate-800 hover:bg-slate-900'
              }`}
            >
              {evaluation.eligible ? 'Confirm Demo & Send Notification' : 'Confirm Demo (Notification Suppressed)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
