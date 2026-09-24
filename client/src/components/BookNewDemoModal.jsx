import React, { useState, useEffect, useMemo, useRef } from 'react';
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

import { getEligibleTrainers } from '../services/api';

// Course dropdown options (display only — the backend independently ranks
// eligible trainers by course expertise once language/location/time match)
const COURSES = [
  { key: 'CPC', label: 'CPC — Certified Professional Coder' },
  { key: 'CIC', label: 'CIC — Certified Inpatient Coder' },
  { key: 'CPB', label: 'CPB — Certified Professional Biller & RCM' },
  { key: 'CPMA', label: 'CPMA — Certified Medical Auditor' },
  { key: 'CCS', label: 'CCS — Certified Coding Specialist' },
  { key: 'CRC', label: 'CRC — Certified Risk Adjustment' },
  { key: 'COC', label: 'COC — Certified Outpatient Coder' },
  { key: 'EMCT', label: 'EMCT Intermediate & Terminology' }
];

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

export default function BookNewDemoModal({ isOpen, onClose, initialData, onConfirm }) {
  if (!isOpen) return null;

  const [studentName, setStudentName] = useState(initialData?.studentName || initialData?.name || initialData?.candidateName || '');
  const [mobile, setMobile] = useState(initialData?.mobile || initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [course, setCourse] = useState(initialData?.course || 'CPC');
  const [mode, setMode] = useState(initialData?.mode || 'Online (Zoom Live)');
  const [preferredDate, setPreferredDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState(initialData?.timeSlot || '10:00–11:30 AM');
  const [language, setLanguage] = useState(initialData?.language || 'Tamil');
  const [location, setLocation] = useState(initialData?.location || LOCATIONS[0]);
  const [toastMsg, setToastMsg] = useState(null);

  // ------------------------------------------------------------------
  // Demo Booking Notification Requirement — live preview
  // Asks the backend (the single source of truth) which trainers would
  // actually be notified for the currently selected language, location,
  // date and time slot, so the form never lies to the person booking it.
  // ------------------------------------------------------------------
  const [preview, setPreview] = useState({ loading: true, count: 0, trainers: [], reason: '' });
  const requestSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const seq = ++requestSeq.current;
    setPreview((p) => ({ ...p, loading: true }));

    getEligibleTrainers({ language, location, preferredDate, timeSlot, course })
      .then((data) => {
        if (cancelled || seq !== requestSeq.current) return;
        setPreview({ loading: false, count: data.count || 0, trainers: data.trainers || [], reason: data.reason || '' });
      })
      .catch(() => {
        if (cancelled || seq !== requestSeq.current) return;
        setPreview({ loading: false, count: 0, trainers: [], reason: 'Could not reach the server to check trainer availability.' });
      });

    return () => {
      cancelled = true;
    };
  }, [language, location, preferredDate, timeSlot, course]);

  const eligible = preview.count > 0;

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

    const courseLabel = COURSES.find((c) => c.key === course)?.label || course;

    const demoPayload = {
      email: email.trim().toLowerCase(),
      candidateName: studentName,
      studentName,
      phone: mobile,
      mobile,
      course: courseLabel,
      mode,
      preferredDate,
      time: `${preferredDate} ${timeSlot}`,
      timeSlot,
      language,
      location,
      status: 'booked'
    };

    if (onConfirm) {
      onConfirm(demoPayload);
    }

    if (eligible) {
      showToast(`✓ Demo booked for ${studentName}! Notification sent to ${preview.count} matching trainer${preview.count > 1 ? 's' : ''}.`);
    } else {
      showToast(`✓ Demo booked for ${studentName}. No trainer matched ${language} · ${location} · ${timeSlot} — notification suppressed.`);
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
                Notifies only trainers matching language, location, free time slot, demo-experience & active status
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
                {COURSES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
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
                const isSelected = timeSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setTimeSlot(slot)}
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
            </div>
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
          {/* LIVE NOTIFICATION PREVIEW — pulled from the real trainer   */}
          {/* roster on the server (language + location + free-at-time + */}
          {/* Experienced-in-Demo + Active) — never a client-side guess. */}
          {/* ======================================================== */}
          <div className={`rounded-2xl p-4 border transition-all space-y-3 ${
            preview.loading
              ? 'bg-slate-50 border-slate-200 text-slate-600'
              : eligible
              ? 'bg-[#ecfdf5] border-emerald-300 text-emerald-950 shadow-xs'
              : 'bg-[#fef2f2] border-rose-300 text-rose-950 shadow-xs'
          }`}>
            <div className="flex items-center justify-between gap-2 border-b pb-2.5 border-black/5">
              <div className="flex items-center gap-2">
                {preview.loading ? (
                  <div className="w-6 h-6 rounded-full bg-slate-400 text-white flex items-center justify-center font-bold text-xs">…</div>
                ) : eligible ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">✓</div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs">✕</div>
                )}
                <div>
                  <div className="font-extrabold text-[12px] uppercase tracking-wide">
                    {preview.loading
                      ? 'Checking trainer availability…'
                      : eligible
                      ? `Notification WILL Be Sent to ${preview.count} Trainer${preview.count > 1 ? 's' : ''}`
                      : 'Notification WILL NOT Be Sent'}
                  </div>
                  <div className="text-[10.5px] opacity-80 font-medium">
                    {preview.loading
                      ? 'Matching language, location & free time against the live trainer roster'
                      : eligible
                      ? preview.trainers.map((t) => t.trainerName).join(', ')
                      : preview.reason || `No trainer matches ${language} · ${location} · ${timeSlot}`}
                  </div>
                </div>
              </div>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                eligible ? 'bg-emerald-200/80 text-emerald-900 border border-emerald-300' : 'bg-rose-200/80 text-rose-900 border border-rose-300'
              }`}>
                {preview.loading ? 'Checking' : eligible ? 'Ready to Send' : 'Blocked'}
              </span>
            </div>

            {/* The 5 hard conditions, for transparency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px]">
              <div className="p-2 rounded-xl border bg-white/80 border-black/5">
                <div className="font-bold">1. Same Language</div>
                <div className="mt-0.5 opacity-80 text-[10px]">Trainer must teach in {language}</div>
              </div>
              <div className="p-2 rounded-xl border bg-white/80 border-black/5">
                <div className="font-bold">2. Same Location</div>
                <div className="mt-0.5 opacity-80 text-[10px]">Trainer must be based at {location}</div>
              </div>
              <div className="p-2 rounded-xl border bg-white/80 border-black/5">
                <div className="font-bold">3. Free at Selected Time</div>
                <div className="mt-0.5 opacity-80 text-[10px]">No other demo booked/confirmed at {timeSlot}</div>
              </div>
              <div className="p-2 rounded-xl border bg-white/80 border-black/5">
                <div className="font-bold">4 &amp; 5. Demo-Experienced &amp; Active</div>
                <div className="mt-0.5 opacity-80 text-[10px]">Marked "Experienced in Demo" and active in admin settings</div>
              </div>
            </div>

            <div className="text-[10.5px] leading-relaxed pt-0.5">
              <strong>Rule Enforcement:</strong> the demo notification is sent <em>only</em> to trainers who satisfy all 5 conditions above — checked live against the trainer roster, not simulated on this form.
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
                eligible
                  ? 'bg-[#0e6977] hover:bg-[#0a4f5a]'
                  : 'bg-slate-800 hover:bg-slate-900'
              }`}
            >
              {eligible ? 'Confirm Demo & Send Notification' : 'Confirm Demo (Notification Suppressed)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
