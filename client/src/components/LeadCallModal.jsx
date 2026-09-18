import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Edit2,
  Clock,
  Calendar,
  MessageSquare,
  Share2,
  Upload,
  Check,
  CheckCircle2,
  Sparkles,
  X,
  AlertCircle,
  Zap,
  HelpCircle,
  FileText
} from 'lucide-react';

import BookNewDemoModal from './BookNewDemoModal';
import { createDemo } from '../services/api';

export default function LeadCallModal({ isOpen, onClose, leadData, onSave }) {
  if (!isOpen) return null;

  // Live Timer
  const [callSeconds, setCallSeconds] = useState(64); // 01:04
  const [isOnCall, setIsOnCall] = useState(true);
  const [selectedOutcome, setSelectedOutcome] = useState('Follow-up Needed');
  const [toastMsg, setToastMsg] = useState(null);
  const [showBookDemoModal, setShowBookDemoModal] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isOnCall) {
      interval = setInterval(() => {
        setCallSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOnCall]);

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Form states
  const [leadForm, setLeadForm] = useState({
    name: leadData?.name || 'Priya Ramesh',
    phone: leadData?.phone || '+919876500000',
    source: 'Google Calls',
    leadFor: 'Demo',
    timeIn: '15:32',
    branch: 'Saravanampatti',
    status: 'NEW',
    fetched: 'Google Ad ⚡',
    allocated: 'Priyadharshini',
    spoken: 'Kavitha · YOU',
    location: 'Coimbatore',
    course: 'CPC - Certified Professional Coder',
    budget: '₹20K-30K',
    batchTiming: 'Weekend (Sat-Sun)',
    decisionStatus: 'Will discuss with family',
    notes:
      'Interested but wants weekend batch. Family discussion needed. Will call Sunday after 7 PM. Sent CPC brochure on WhatsApp.'
  });

  // Action script checklist
  const [checklist, setChecklist] = useState([
    { id: 'c1', text: 'Empathize first — BPO grind is exhausting', done: true },
    { id: 'c2', text: 'Position medical coding as remote-friendly, higher pay', done: true },
    { id: 'c3', text: 'Ask: years of BPO experience & current package', done: true },
    { id: 'c4', text: 'If 2+ yrs experience → pitch CPC fast-track (3 months)', done: false },
    { id: 'c5', text: 'Share alumni placement examples (3-4 names, salaries)', done: false },
    { id: 'c6', text: 'Send BPO-to-Coder salary comparison sheet on WhatsApp', done: false },
    { id: 'c7', text: 'Book demo within 48 hrs - weekend slot preferred', done: false },
    { id: 'c8', text: 'Mention AAPC certification + placement guarantee', done: false }
  ]);

  const toggleChecklistItem = (id) => {
    setChecklist((prev) =>
      prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c))
    );
  };

  const OUTCOMES = [
    { title: 'Will Join 🚀', sub: 'Open registration' },
    { title: 'Follow-up Needed', sub: 'Schedule FU' },
    { title: 'Demo Booked', sub: 'Pick slot below ↓' },
    { title: 'Call Back Later', sub: 'Set time' },
    { title: 'Not Reachable', sub: 'Retry later' },
    { title: 'Not Interested', sub: 'Close lead' }
  ];

  const handleEndCall = () => {
    setIsOnCall(false);
    showToast('Call ended. Complete notes and save outcome.');
  };

  const handleSaveAndClose = () => {
    if (onSave) onSave({ ...leadForm, outcome: selectedOutcome });
    showToast('✓ Call log & outcome saved successfully!');
    setTimeout(() => onClose(), 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-[60] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-teal-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Modal Container */}
      <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Top Header Bar */}
        <header className="bg-[#0b1b2b] text-white px-5 py-3 flex items-center justify-between gap-3 flex-wrap border-b border-slate-800">
          {/* Left: Caller Info */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white font-black text-lg flex items-center justify-center shadow-xs">
              {leadForm.name[0] || 'P'}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                {leadForm.name}
              </h2>
              <div className="text-xs text-teal-300 font-mono tracking-wider">
                {leadForm.phone}
              </div>
            </div>
          </div>

          {/* Right: Call Actions & Timer */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setIsOnCall(true);
                showToast('Dialing lead via Cloud Telephony...');
              }}
              className="bg-[#00b894] hover:bg-[#00a383] text-white font-bold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>DIAL NOW</span>
            </button>

            <div className="bg-white/10 border border-white/15 px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isOnCall ? 'bg-rose-500 animate-ping' : 'bg-slate-400'}`} />
              <span>{isOnCall ? 'ON CALL' : 'OFF CALL'}</span>
            </div>

            <div className="bg-[#0b3c5d] border border-cyan-400/30 text-cyan-300 font-mono font-black text-sm px-3.5 py-1 rounded-xl shadow-inner tracking-wider">
              {formatTimer(callSeconds)}
            </div>

            <button
              onClick={handleEndCall}
              className="bg-[#e74c3c] hover:bg-[#c0392b] text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <span>✕ End Call & Save</span>
            </button>
          </div>
        </header>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs text-slate-800">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* COLUMN 1: LEAD CONTEXT (approx 3 cols) */}
            <div className="lg:col-span-3 space-y-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  LEAD CONTEXT
                </span>
                <button className="text-[#00897b] hover:text-[#00695c] font-bold text-[11px] flex items-center gap-1">
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">SOURCE</span>
                  <span className="font-extrabold text-slate-900">{leadForm.source}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">LEAD FOR</span>
                  <span className="border border-purple-300 bg-purple-50 text-purple-700 font-bold px-2.5 py-0.5 rounded-lg text-[11px]">
                    {leadForm.leadFor}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">TIME IN</span>
                  <span className="font-mono font-bold text-slate-800">{leadForm.timeIn}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">BRANCH</span>
                  <span className="font-bold text-slate-900">{leadForm.branch}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">STATUS</span>
                  <span className="font-black text-[#00897b]">{leadForm.status}</span>
                </div>
              </div>

              {/* 3-Person Attribution */}
              <div className="pt-3 border-t border-slate-200/60 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  3-PERSON ATTRIBUTION
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">FETCHED</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      {leadForm.fetched}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">ALLOCATED</span>
                    <span className="font-semibold text-slate-800">{leadForm.allocated}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">SPOKEN</span>
                    <span className="font-bold text-[#00897b]">{leadForm.spoken}</span>
                  </div>
                </div>
              </div>

              {/* Follow-up History */}
              <div className="pt-3 border-t border-slate-200/60 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  FOLLOW-UP HISTORY
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  No follow-ups yet — first call. Add one below after you speak.
                </p>
                <button
                  onClick={() => showToast('Scheduled follow-up reminder for tomorrow')}
                  className="w-full py-2 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100/70 text-[#00695c] font-bold text-xs transition-all flex items-center justify-center gap-1"
                >
                  <span>+ Add follow-up</span>
                </button>
              </div>
            </div>

            {/* COLUMN 2: MIDDLE FORM & CALL OUTCOME (approx 5 cols) */}
            <div className="lg:col-span-5 space-y-3.5">
              {/* Location Input */}
              <div>
                <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  LOCATION
                </label>
                <input
                  type="text"
                  value={leadForm.location}
                  onChange={(e) => setLeadForm({ ...leadForm, location: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#00897b] transition-all"
                />
              </div>

              {/* Course & Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8">
                  <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    INTERESTED COURSE
                  </label>
                  <select
                    value={leadForm.course}
                    onChange={(e) => setLeadForm({ ...leadForm, course: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#00897b] transition-all"
                  >
                    <option value="CPC - Certified Professional Coder">CPC - Certified Professional Coder</option>
                    <option value="CCS - Certified Coding Specialist">CCS - Certified Coding Specialist</option>
                    <option value="CRC - Certified Risk Adjustment Coder">CRC - Certified Risk Adjustment Coder</option>
                    <option value="EMCT Intermediate - AAPC Training">EMCT Intermediate - AAPC Training</option>
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    BUDGET
                  </label>
                  <input
                    type="text"
                    value={leadForm.budget}
                    onChange={(e) => setLeadForm({ ...leadForm, budget: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#00897b] transition-all"
                  />
                </div>
              </div>

              {/* Batch Timing */}
              <div>
                <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  BATCH TIMING
                </label>
                <input
                  type="text"
                  value={leadForm.batchTiming}
                  onChange={(e) => setLeadForm({ ...leadForm, batchTiming: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#00897b] transition-all"
                />
              </div>

              {/* Decision Status */}
              <div>
                <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  DECISION STATUS
                </label>
                <input
                  type="text"
                  value={leadForm.decisionStatus}
                  onChange={(e) => setLeadForm({ ...leadForm, decisionStatus: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#00897b] transition-all"
                />
              </div>

              {/* Live Notes */}
              <div>
                <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  LIVE NOTES
                </label>
                <textarea
                  rows="3"
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs leading-relaxed text-slate-900 outline-none focus:border-[#00897b] transition-all font-sans"
                />
              </div>

              {/* CALL OUTCOME Selection */}
              <div>
                <div className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  CALL OUTCOME
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {OUTCOMES.map((oc) => {
                    const isSel = selectedOutcome === oc.title;
                    return (
                      <button
                        key={oc.title}
                        type="button"
                        onClick={() => {
                          setSelectedOutcome(oc.title);
                          if (oc.title.includes('Demo Booked')) {
                            setShowBookDemoModal(true);
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all flex flex-col justify-center min-h-[56px] cursor-pointer ${
                          isSel
                            ? 'bg-[#e6fffa] border-2 border-[#00897b] text-[#00695c] shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                        }`}
                      >
                        <div className="font-extrabold text-xs">{oc.title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{oc.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* COLUMN 3: ACTION PLAN · CATEGORY SCRIPT (approx 4 cols) */}
            <div className="lg:col-span-4 bg-[#fffbeb] border border-amber-200 rounded-2xl p-4 space-y-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-800 font-mono">
                ACTION PLAN · CATEGORY SCRIPT
              </div>

              {/* Category Selector */}
              <div>
                <label className="block text-[10px] font-black uppercase text-amber-900 mb-1">
                  CATEGORY (25 PLANS)
                </label>
                <select className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none">
                  <option>BPO Reject — Looking for change</option>
                  <option>Fresher — Life Sciences</option>
                  <option>Career Gap — Post Pregnancy / Marriage</option>
                  <option>Price Sensitive — Seeking Discount</option>
                </select>
              </div>

              {/* Script Checklist Items */}
              <div className="space-y-2">
                {checklist.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-start gap-2 ${
                      item.done
                        ? 'bg-[#ecfdf5] border-teal-300/80 text-[#065f46] font-semibold'
                        : 'bg-white border-amber-200 text-slate-800 hover:border-amber-400'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold ${
                        item.done
                          ? 'bg-emerald-600 text-white'
                          : 'border border-amber-400 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span className="leading-snug">{item.text}</span>
                  </button>
                ))}
              </div>

              {/* Conversion Stats Pill */}
              <div className="bg-white border border-amber-200/80 p-2.5 rounded-xl text-center text-slate-600 text-[11px] font-mono font-medium">
                💡 Avg CPL: <strong className="text-slate-900">₹147</strong> · Conv rate:{' '}
                <strong className="text-emerald-700 font-bold">38%</strong>
              </div>
            </div>
          </div>

          {/* CALL RECORDING UPLOAD STRIP */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono mb-2">
              CALL RECORDING — UPLOAD FROM YOUR PHONE
            </div>

            <div className="border-2 border-dashed border-teal-300/90 bg-[#f0faf8] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#00897b] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-xs sm:text-sm text-slate-900">
                    Click to upload call recording
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    M4A · MP3 · WAV · AAC · OPUS · max 50 MB
                  </div>
                </div>
              </div>

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={() => showToast('Audio recording attached successfully!')}
                />
                <span className="bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 active:scale-95">
                  Browse Files
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <footer className="p-4 bg-slate-50/90 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => showToast('Sent AAPC Registration Link via SMS & Email')}
              className="bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>🔗 Send Registration Link</span>
            </button>

            <button
              onClick={() => setShowBookDemoModal(true)}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>📅 Book Demo</span>
            </button>

            <button
              onClick={() => showToast('WhatsApp brochure dispatched to +919876500000')}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>💬 WhatsApp Brochure</span>
            </button>
          </div>

          <button
            onClick={handleSaveAndClose}
            className="bg-[#c29d59] hover:bg-[#af8b47] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>✓ Save & Close</span>
          </button>
        </footer>
      </div>

      {/* Book New Demo Sub-Modal */}
      <BookNewDemoModal
        isOpen={showBookDemoModal}
        onClose={() => setShowBookDemoModal(false)}
        initialData={{
          studentName: leadForm.name,
          mobile: leadForm.phone,
          course: 'CPC',
          mode: 'Online'
        }}
        onConfirm={async (demo) => {
          setSelectedOutcome('Demo Booked');
          try {
            await createDemo(demo);
            showToast(`✓ Demo booked for ${demo.studentName}! Routed to expert trainer ${demo.trainer || ''}.`);
          } catch (e) {
            console.warn('Failed to save demo in modal:', e);
            showToast(`✓ Demo booked for ${demo.studentName} on ${demo.preferredDate} (${demo.timeSlot})`);
          }
        }}
      />
    </div>
  );
}
