import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Video,
  Check,
  X,
  Sparkles,
  AlertTriangle,
  Info
} from 'lucide-react';

import { COURSE_CATEGORIES, TRAINER_COURSES, isSpecialtyCourse } from '../constants/courses';

const COURSES = TRAINER_COURSES;

const TIME_SLOTS = [
  '6:00–8:00 AM',
  '8:00–9:30 AM',
  '10:00–11:30 AM',
  '11:30 AM–1:00 PM',
  '12:00–1:30 PM',
  '1:30–2:00 PM',
  '2:00–3:30 PM',
  '4:00–6:00 PM'
];

const LANGUAGES = ['Tamil', 'English', 'Telugu', 'Malayalam', 'Hindi', 'Kannada'];

// Branches / locations a student can select — must match a Trainer's
// branchName (server side) for the "Same Location" notification rule.
const LOCATIONS = [
  'Ameerpet',
  'Dilsukhnagar',
  'Gandhipuram',
  'Hopes',
  'Kochi',
  'Salem',
  'Saravanampatti',
  'Tirupati',
  'Trichy',
  'Trivandrum',
  'Vizag',
  'Pune',
  'Kollapur',
  'Theni'
];

export default function BookNewDemoModal({ isOpen, onClose, initialData, onConfirm, currentUser }) {
  if (!isOpen) return null;

  const userBranchClean = currentUser?.branch
    ? String(currentUser.branch).replace(/\s*(branch|\(.*\)|hq)\b/gi, '').trim()
    : '';
  const initialLoc = initialData?.location || initialData?.branch || LOCATIONS.find(l => userBranchClean && l.toLowerCase() === userBranchClean.toLowerCase()) || userBranchClean || LOCATIONS[0];

  const [studentName, setStudentName] = useState(initialData?.studentName || initialData?.name || initialData?.candidateName || '');
  const [mobile, setMobile] = useState(initialData?.mobile || initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [course, setCourse] = useState(initialData?.course || 'AMCT Beginner (Classroom)');
  const [mode, setMode] = useState(initialData?.mode || 'Online (Zoom Live)');
  const [preferredDate, setPreferredDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState(initialData?.timeSlot || '10:00–11:30 AM');
  const [language, setLanguage] = useState(initialData?.language || 'Tamil');
  const [location, setLocation] = useState(initialLoc);
  const [toastMsg, setToastMsg] = useState(null);
  const [outsideFixedTiming, setOutsideFixedTiming] = useState(false);
  const [customTimeRequested, setCustomTimeRequested] = useState('');

  useEffect(() => {
    if (initialData?.location || initialData?.branch) {
      setLocation(initialData.location || initialData.branch);
    } else if (userBranchClean) {
      const match = LOCATIONS.find(l => l.toLowerCase() === userBranchClean.toLowerCase());
      if (match) setLocation(match);
    }
  }, [initialData, userBranchClean]);

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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast("Please enter the student's email");
      return;
    }

    if (outsideFixedTiming && !customTimeRequested.trim()) {
      showToast('Please enter the requested time for this outside-fixed-timing demo');
      return;
    }

    const courseLabel = COURSES.find((c) => c.key === course)?.label || course;
    const effectiveTimeSlot = outsideFixedTiming ? customTimeRequested.trim() : timeSlot;

    const demoPayload = {
      email: email.trim().toLowerCase(),
      candidateName: studentName,
      studentName,
      phone: mobile,
      mobile,
      course: courseLabel,
      mode,
      preferredDate,
      time: `${preferredDate} ${effectiveTimeSlot}`,
      timeSlot: effectiveTimeSlot,
      language,
      location,
      branch: location,
      counselor: currentUser?.name || '',
      bookedBy: currentUser?.name || '',
      outsideFixedTiming,
      customTimeRequested: outsideFixedTiming ? customTimeRequested.trim() : '',
      status: 'booked'
    };

    if (onConfirm) {
      onConfirm(demoPayload);
    }

    if (outsideFixedTiming) {
      showToast(`✓ Demo booked for ${studentName} at ${effectiveTimeSlot} (outside fixed timings). Flagged for Trainer Head & Manager to coordinate.`);
    } else {
      showToast(`✓ Demo booked for ${studentName}! Moved to Trainer Head & Manager for assignment.`);
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
                Fill details and move demo to Trainer Head / Trainer Manager to assign available trainers
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

          {/* Student email */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 font-mono mb-1">
              Student Email *
            </label>
            <input
              type="email"
              required
              placeholder="student's existing email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-[#0e6977] transition-all"
            />
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
                {COURSE_CATEGORIES.map((cat) => (
                  <optgroup key={cat.category} label={cat.title}>
                    {cat.courses.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code === c.name ? c.name : `${c.code} — ${c.name}`}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {isSpecialtyCourse(course) ? (
                <div className="mt-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 inline-block">
                  🎯 Specialty Course · Scheduled per trainer availability
                </div>
              ) : (
                <div className="mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
                  ⚡ Fresher Track · Demo experts available throughout the day
                </div>
              )}
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
                <option value="Online (Zoom Live)">Online (Zoom Live)</option>
                <option value="Classroom">Classroom (at selected location)</option>
                <option value="Campus Tour + Counseling">Campus Tour</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 font-mono mb-1.5 flex items-center gap-1.5">
              <span>📍</span>
              <span>Location / Branch *</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {LOCATIONS.map((loc) => {
                const isSelected = location === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocation(loc)}
                    className={`py-1 px-3 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-[#0e6977] border-[#0e6977] text-white shadow-xs'
                        : 'bg-white border-teal-300/80 text-[#00695c] hover:border-teal-500'
                    }`}
                  >
                    {loc}
                  </button>
                );
              })}
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
            <label className="block text-[11px] font-bold text-slate-600 font-mono mb-1.5">
              Time Slot Selection
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TIME_SLOTS.map((slot) => {
                const isSelected = !outsideFixedTiming && timeSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => { setOutsideFixedTiming(false); setTimeSlot(slot); }}
                    className={`py-2 px-2 rounded-xl text-[10.5px] font-bold transition-all text-center border cursor-pointer ${
                      isSelected
                        ? 'bg-[#0e6977] border-[#0e6977] text-white shadow-xs scale-[1.02]'
                        : 'bg-white border-teal-300/80 text-[#00695c] hover:border-teal-500'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setOutsideFixedTiming((v) => !v)}
                className={`py-2 px-2 rounded-xl text-[10.5px] font-bold transition-all text-center border cursor-pointer col-span-2 sm:col-span-4 ${
                  outsideFixedTiming
                    ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                    : 'bg-white border-amber-300/80 text-amber-700 hover:border-amber-500'
                }`}
              >
                ⏰ Outside Fixed Timings — notify the respective Head to coordinate
              </button>
            </div>
            {outsideFixedTiming && (
              <div className="mt-2 p-3 rounded-xl border border-amber-300 bg-amber-50">
                <label className="block text-[10.5px] font-bold text-amber-800 font-mono mb-1">
                  Requested time (outside fixed slots)
                </label>
                <input
                  type="text"
                  value={customTimeRequested}
                  onChange={(e) => setCustomTimeRequested(e.target.value)}
                  placeholder="e.g. 9:00 PM"
                  className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-amber-500 transition-all"
                />
                <p className="text-[10px] text-amber-700 mt-1.5">
                  No trainer is auto-notified for a time outside the fixed slots. This booking is flagged for the
                  respective Head to coordinate and handle manually.
                </p>
              </div>
            )}
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

          {/* Demo routing note */}
          <div className="rounded-xl p-3 bg-teal-50/70 border border-teal-200/90 text-teal-950 flex items-center gap-2.5">
            <span className="text-base shrink-0">📋</span>
            <span className="text-[11px] font-medium leading-relaxed">
              This demo will be routed directly to the <strong>Trainer Head</strong> and <strong>Trainer Manager</strong> to assign available trainers.
            </span>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="py-2.5 px-6 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer text-white bg-[#0e6977] hover:bg-[#0a4f5a]"
            >
              Confirm &amp; Move Demo to Trainer Head / Manager
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
