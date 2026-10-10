import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, User, Phone, Mail, GraduationCap, MapPin, Calendar, Clock, BookOpen, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { updateLead } from '../services/api';
import { COURSE_CATEGORIES } from '../constants/courses';
import { QUALIFICATION_GROUPS } from '../constants/qualifications';
import { LEAD_SOURCE_GROUPS, ALL_CATEGORIES } from '../constants/leadSources';
import { getAvailableTimingSlots, BATCH_SCHEDULE, CANONICAL_TIMING_OPTIONS } from '../constants/batchTimings';
import SearchableSelect from './SearchableSelect';
import { BRANCH_OPTIONS, TIMING_OPTIONS } from './EditStudentModal';

const STAGE_OPTIONS = [
  { value: 'new', label: 'New Enquiry' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'demo_booked', label: 'Demo Booked' },
  { value: 'demo_attended', label: 'Demo Attended' },
  { value: 'fee_followup', label: 'Fee Follow-up' },
  { value: 'admitted', label: 'Admitted' },
  { value: 'closed', label: 'Closed / Lost' }
];

export default function EditLeadModal({ isOpen, onClose, lead, onSuccess }) {
  if (!isOpen || !lead) return null;

  const leadId = lead._id || lead.id;

  const [fullName, setFullName] = useState(lead.fullName || lead.name || '');
  const [phone, setPhone] = useState(lead.phone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(lead.whatsappNumber || '');
  const [email, setEmail] = useState(lead.email || '');
  const [course, setCourse] = useState(lead.course || 'AMCT Beginner (Classroom)');
  const [branch, setBranch] = useState(lead.branch || BRANCH_OPTIONS[0]);
  const [stage, setStage] = useState(lead.stage || 'new');
  const [education, setEducation] = useState(lead.education || lead.qualification || '');
  const [passoutYear, setPassoutYear] = useState(lead.passoutYear || '');
  const [location, setLocation] = useState(lead.location || '');
  const [sourceName, setSourceName] = useState(lead.sourceName || lead.source || 'Google Calls / GMB');
  const [batchTiming, setBatchTiming] = useState(lead.batchTiming || CANONICAL_TIMING_OPTIONS[1]);
  const [budget, setBudget] = useState(lead.budget || '₹20K-30K');

  const availableSlots = useMemo(() => {
    return getAvailableTimingSlots({ course, branch });
  }, [course, branch]);
  const [followUpDate, setFollowUpDate] = useState(lead.followUpDate || '');
  const [followUpTime, setFollowUpTime] = useState(lead.followUpTime || '11:00 AM');
  const [followUpNote, setFollowUpNote] = useState(lead.followUpNote || '');
  const [category, setCategory] = useState(lead.category || 'Fresh Graduate');

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (lead) {
      setFullName(lead.fullName || lead.name || '');
      setPhone(lead.phone || '');
      setWhatsappNumber(lead.whatsappNumber || '');
      setEmail(lead.email || '');
      setCourse(lead.course || 'AMCT Beginner (Classroom)');
      setBranch(lead.branch || BRANCH_OPTIONS[0]);
      setStage(lead.stage || 'new');
      setEducation(lead.education || lead.qualification || '');
      setPassoutYear(lead.passoutYear || '');
      setLocation(lead.location || '');
      setSourceName(lead.sourceName || lead.source || SOURCE_OPTIONS[0]);
      setBatchTiming(lead.batchTiming || TIMING_OPTIONS[2]);
      setBudget(lead.budget || '₹20K-30K');
      setFollowUpDate(lead.followUpDate || '');
      setFollowUpTime(lead.followUpTime || '11:00 AM');
      setFollowUpNote(lead.followUpNote || '');
      setCategory(lead.category || 'Fresh Graduate');
      setErrorMessage(null);
    }
  }, [lead]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Candidate name is required');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Contact phone number is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        whatsappNumber: (whatsappNumber || phone).trim(),
        email: email.trim(),
        course,
        branch,
        stage,
        education,
        passoutYear,
        location,
        sourceName,
        source: sourceName,
        batchTiming,
        budget,
        followUpDate,
        followUpTime,
        followUpNote,
        category
      };

      const updated = await updateLead(leadId, payload);
      const merged = { ...lead, ...payload, ...(updated || {}) };
      if (onSuccess) onSuccess(merged);
      onClose();
    } catch (err) {
      console.error('Failed to update lead:', err);
      setErrorMessage(err?.response?.data?.error || err.message || 'Failed to update enquiry details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-[26px] max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto text-left animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0e6977] via-[#00897b] to-[#00695c] px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white font-extrabold text-lg shadow-2xs">
              {fullName ? fullName.charAt(0).toUpperCase() : 'E'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
                  Edit Student Enquiry
                </h2>
                <span className="bg-white/25 border border-white/30 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase">
                  {stage.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-teal-100 mt-0.5 font-medium">
                Counsellor: {lead.counselorAssigned || lead.allocatedTo || 'Unassigned'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">

          {/* Section: Basic & Contact */}
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#00897b]" />
              <span>Candidate & Contact Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-[#00897b] transition-all"
                  placeholder="e.g. PRIYA SHARMA"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Enquiry Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold outline-none focus:border-[#00897b] transition-all cursor-pointer"
                >
                  {ALL_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.label}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Primary Mobile <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono outline-none focus:border-[#00897b] transition-all"
                  placeholder="10-digit mobile"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono outline-none focus:border-[#00897b] transition-all"
                  placeholder="WhatsApp number"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono outline-none focus:border-[#00897b] transition-all"
                  placeholder="candidate@email.com"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Location / City
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all"
                  placeholder="e.g. Coimbatore"
                />
              </div>
            </div>
          </div>

          {/* Section: Academic Background */}
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#00897b]" />
              <span>Academic Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Education / Degree
                </label>
                <SearchableSelect
                  value={education}
                  onChange={setEducation}
                  groups={QUALIFICATION_GROUPS}
                  placeholder="— Search qualification —"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Passout Year
                </label>
                <input
                  type="text"
                  value={passoutYear}
                  onChange={(e) => setPassoutYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all"
                  placeholder="e.g. 2024"
                />
              </div>
            </div>
          </div>

          {/* Section: Course & Pipeline Stage */}
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#00897b]" />
              <span>Course & Pipeline Status</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Interested Course (AMCT First)
                </label>
                <select
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold outline-none focus:border-[#00897b] transition-all cursor-pointer"
                >
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
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Preferred Branch
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold outline-none focus:border-[#00897b] transition-all cursor-pointer"
                >
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Pipeline Stage
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold outline-none focus:border-[#00897b] transition-all cursor-pointer"
                >
                  {STAGE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Preferred Batch Timing
                </label>
                <select
                  value={batchTiming}
                  onChange={(e) => setBatchTiming(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold outline-none focus:border-[#00897b] transition-all cursor-pointer"
                >
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

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Enquiry Source (Mode of Source)
                </label>
                <SearchableSelect
                  value={sourceName}
                  onChange={setSourceName}
                  placeholder="— Select enquiry source —"
                  searchPlaceholder="Search 32 sources (Google, Referral, WhatsApp...)"
                  groups={LEAD_SOURCE_GROUPS}
                  allowCustom={true}
                />
              </div>
            </div>
          </div>

          {/* Section: Next Follow-up & Discussion */}
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#00897b]" />
              <span>Next Follow-up & Discussion Notes</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Follow-up Time
                </label>
                <input
                  type="text"
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all"
                  placeholder="e.g. 11:30 AM"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Discussion Notes / Follow-up Summary
                </label>
                <textarea
                  rows="3"
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all"
                  placeholder="Note candidate preferences, concerns, fee discussions, demo schedule..."
                />
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving Changes...' : 'Save Enquiry Details'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
