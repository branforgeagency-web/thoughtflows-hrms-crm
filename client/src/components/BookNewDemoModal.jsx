import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Video,
  Check,
  CheckCircle2,
  X,
  Sparkles
} from 'lucide-react';

export default function BookNewDemoModal({ isOpen, onClose, initialData, onConfirm }) {
  if (!isOpen) return null;

  const [studentName, setStudentName] = useState(initialData?.studentName || initialData?.name || '');
  const [mobile, setMobile] = useState(initialData?.mobile || initialData?.phone || '');
  const [course, setCourse] = useState(initialData?.course || 'CPC');
  const [mode, setMode] = useState(initialData?.mode || 'Online');
  const [preferredDate, setPreferredDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState('6:00–8:00 AM');
  const [language, setLanguage] = useState('Tamil');
  const [toastMsg, setToastMsg] = useState(null);

  const TIME_SLOTS = [
    '6:00–8:00 AM',
    '9:00–11:00 AM',
    '4:00–6:00 PM',
    '6:30–8:30 PM'
  ];

  const LANGUAGES = [
    'Tamil',
    'English',
    'Telugu',
    'Malayalam',
    'Hindi',
    'Kannada'
  ];

  // Dynamic Trainer Mapping
  const getTrainerMapping = (lang, crs) => {
    switch (lang) {
      case 'Tamil':
        return 'Maps to Revathi K · Tamil · Anatomy + ICD-10-CM · 90% · load 2/5';
      case 'English':
        return 'Maps to Karthik V · English · CPC & CPT Coding · 94% · load 1/5';
      case 'Telugu':
        return 'Maps to Suresh Babu · Telugu · RCM & Hospital Billing · 88% · load 3/5';
      case 'Malayalam':
        return 'Maps to Anjali Nair · Malayalam · Medical Terminology · 92% · load 2/5';
      case 'Hindi':
        return 'Maps to Priya Sharma · Hindi · ICD-10 & Coding Fundamentals · 91% · load 1/5';
      case 'Kannada':
        return 'Maps to Manjunath R · Kannada · HCPCS & Chart Auditing · 89% · load 2/5';
      default:
        return 'Maps to Senior Faculty · Thoughtflows Coimbatore';
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!studentName.trim()) {
      showToast('Please enter candidate / student name');
      return;
    }
    const demoPayload = {
      studentName,
      mobile,
      course,
      mode,
      preferredDate,
      timeSlot,
      language,
      trainer: getTrainerMapping(language, course)
    };
    if (onConfirm) {
      onConfirm(demoPayload);
    }
    showToast(`✓ Demo booked for ${studentName}! Trainer & candidate notified.`);
    setTimeout(() => {
      onClose();
    }, 600);
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
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🗓️</span>
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
              Book New Demo
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Student name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 font-mono mb-1">
              Student name
            </label>
            <input
              type="text"
              required
              placeholder="Student name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-[#00897b] transition-all"
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 font-mono mb-1">
              Mobile
            </label>
            <input
              type="tel"
              required
              placeholder="+91..."
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-[#00897b] transition-all font-mono"
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
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-semibold outline-none focus:border-[#00897b] transition-all"
              >
                <option value="CPC">CPC</option>
                <option value="CIC">CIC</option>
                <option value="CCS">CCS</option>
                <option value="CRC">CRC</option>
                <option value="COC">COC</option>
                <option value="EMCT Intermediate">EMCT Intermediate</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 font-mono mb-1">
                Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-semibold outline-none focus:border-[#00897b] transition-all"
              >
                <option value="Online">Online</option>
                <option value="Classroom (Saravanampatti)">Classroom (Saravanampatti)</option>
                <option value="Campus Tour + Counseling">Campus Tour</option>
              </select>
            </div>
          </div>

          {/* Preferred date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 font-mono mb-1">
              Preferred date
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all font-mono"
              />
            </div>
          </div>

          {/* Time slot */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 font-mono mb-1.5">
              Time slot
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TIME_SLOTS.map((slot) => {
                const isSelected = timeSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setTimeSlot(slot)}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all text-center border ${
                      isSelected
                        ? 'bg-[#00897b] border-[#00897b] text-white shadow-xs'
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
              <span>Preferred language — maps to a trainer who teaches it</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {LANGUAGES.map((lang) => {
                const isSelected = language === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`py-1.5 px-3.5 rounded-xl text-[11px] font-bold transition-all border ${
                      isSelected
                        ? 'bg-[#00897b] border-[#00897b] text-white shadow-xs'
                        : 'bg-white border-teal-300/80 text-[#00695c] hover:border-teal-500'
                    }`}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trainer Mapping Card */}
          <div className="bg-[#e6fffa] border border-teal-300/80 rounded-2xl p-3 sm:p-3.5 text-xs text-[#00695c] font-semibold flex items-center gap-2 shadow-xs">
            <Check className="w-4 h-4 text-[#00897b] stroke-[3] flex-shrink-0" />
            <span className="leading-snug">
              {getTrainerMapping(language, course)}
            </span>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="py-2.5 px-6 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-xs shadow-xs transition-all active:scale-95"
            >
              Confirm Demo & Notify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
