import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, User, Phone, Mail, GraduationCap, Building2, MapPin, Calendar, Clock, BookOpen, AlertCircle, Sparkles, Check } from 'lucide-react';
import { updateStudent } from '../services/api';
import { COURSE_CATEGORIES } from '../constants/courses';
import { QUALIFICATION_GROUPS } from '../constants/qualifications';
import { LEAD_SOURCE_GROUPS } from '../constants/leadSources';
import { getAvailableTimingSlots, BATCH_SCHEDULE, CANONICAL_TIMING_OPTIONS } from '../constants/batchTimings';
import SearchableSelect from './SearchableSelect';

export const BRANCH_OPTIONS = [
  'Saravanampatti (CBE)',
  'Hopes (CBE)',
  'Gandhipuram (CBE)',
  'Ameerpet (Hyderabad)',
  'Dilsukhnagar (Hyderabad)',
  'Kochi (Kerala)',
  'Salem (Tamil Nadu)',
  'Trichy (Tamil Nadu)',
  'Tirupati (Andhra Pradesh)',
  'Trivandrum (Kerala)',
  'Vizag (Andhra Pradesh)',
  'Pune (Maharashtra)',
  'Kollapur (Maharashtra)',
  'Theni (Tamil Nadu)'
];

export const TIMING_OPTIONS = CANONICAL_TIMING_OPTIONS;

export default function EditStudentModal({ isOpen, onClose, student, onSuccess }) {
  if (!isOpen || !student) return null;

  const studentIdentifier = student._id || student.id || student.studentId;

  const [name, setName] = useState(student.name || '');
  const [phone, setPhone] = useState(student.phone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(student.whatsappNumber || '');
  const [email, setEmail] = useState(student.email || '');
  const [course, setCourse] = useState(student.course || 'AMCT Beginner (Classroom)');
  const [mode, setMode] = useState(student.mode || 'Online');
  const [branch, setBranch] = useState(student.branch || BRANCH_OPTIONS[0]);
  const [batchTiming, setBatchTiming] = useState(student.batchTiming || CANONICAL_TIMING_OPTIONS[1]);
  const [batchDate, setBatchDate] = useState(student.batchDate || '');

  const availableSlots = useMemo(() => {
    return getAvailableTimingSlots({ course, mode, branch });
  }, [course, mode, branch]);
  const [dob, setDob] = useState(student.dob || '');
  const [qualification, setQualification] = useState(student.qualification || '');
  const [collegeCompany, setCollegeCompany] = useState(student.collegeCompany || '');
  const [location, setLocation] = useState(student.location || '');
  const [passoutYear, setPassoutYear] = useState(student.passoutYear || '');
  const [address, setAddress] = useState(student.address || '');
  const [fatherName, setFatherName] = useState(student.fatherName || '');
  const [examStatus, setExamStatus] = useState(student.examStatus || 'Not Booked');
  const [certified, setCertified] = useState(student.certified || 'Non-certified');
  const [source, setSource] = useState(student.source || 'WALK-IN');
  const [nextDueDate, setNextDueDate] = useState(student.nextDueDate || '');

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (student) {
      setName(student.name || '');
      setPhone(student.phone || '');
      setWhatsappNumber(student.whatsappNumber || '');
      setEmail(student.email || '');
      setCourse(student.course || 'AMCT Beginner (Classroom)');
      setMode(student.mode || 'Online');
      setBranch(student.branch || BRANCH_OPTIONS[0]);
      setBatchTiming(student.batchTiming || TIMING_OPTIONS[2]);
      setBatchDate(student.batchDate || '');
      setDob(student.dob || '');
      setQualification(student.qualification || '');
      setCollegeCompany(student.collegeCompany || '');
      setLocation(student.location || '');
      setPassoutYear(student.passoutYear || '');
      setAddress(student.address || '');
      setFatherName(student.fatherName || '');
      setExamStatus(student.examStatus || 'Not Booked');
      setCertified(student.certified || 'Non-certified');
      setSource(student.source || 'WALK-IN');
      setNextDueDate(student.nextDueDate || '');
      setErrorMessage(null);
    }
  }, [student]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Student full name is required');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Mobile / Contact number is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim().toUpperCase(),
        phone: phone.trim(),
        whatsappNumber: (whatsappNumber || phone).trim(),
        email: email.trim(),
        course,
        mode,
        branch,
        batchTiming,
        batchDate,
        dob,
        qualification,
        collegeCompany,
        location,
        passoutYear,
        address,
        fatherName,
        examStatus,
        certified,
        source,
        nextDueDate
      };

      const updated = await updateStudent(studentIdentifier, payload);
      const merged = { ...student, ...payload, ...(updated || {}) };
      if (onSuccess) onSuccess(merged);
      onClose();
    } catch (err) {
      console.error('Failed to update student:', err);
      setErrorMessage(err?.response?.data?.error || err.message || 'Failed to update student details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-[26px] max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto text-left animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#00897b] via-[#00796b] to-[#00695c] px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white font-extrabold text-lg shadow-2xs">
              {name ? name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
                  Edit Admitted Student
                </h2>
                <span className="bg-white/25 border border-white/30 text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded-md">
                  {student.studentId || student.id}
                </span>
              </div>
              <p className="text-xs text-teal-100 mt-0.5 font-medium">
                Admitted HR: {student.hrName || 'Admissions Team'}
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

          {/* Section: Personal & Contact */}
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#00897b]" />
              <span>Personal & Contact Information</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold outline-none focus:border-[#00897b] transition-all"
                  placeholder="e.g. ARUN KUMAR"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Father's / Guardian's Name
                </label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all"
                  placeholder="e.g. S. SURESH"
                />
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
                  Date of Birth (DOB)
                </label>
                <input
                  type="text"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all"
                  placeholder="e.g. 1999-04-15"
                />
              </div>
            </div>
          </div>

          {/* Section: Academic Background */}
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#00897b]" />
              <span>Academic Background</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Highest Qualification
                </label>
                <SearchableSelect
                  value={qualification}
                  onChange={setQualification}
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

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  College / Previous Employer
                </label>
                <input
                  type="text"
                  value={collegeCompany}
                  onChange={(e) => setCollegeCompany(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all"
                  placeholder="e.g. PSG College of Arts and Science"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  City / Location
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

          {/* Section: Course & Batch Details */}
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#00897b]" />
              <span>Course & Admission Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Enrolled Course (AMCT First)
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
                  Mode of Training
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold outline-none focus:border-[#00897b] transition-all cursor-pointer"
                >
                  <option value="Online">Online (Live Interactive)</option>
                  <option value="Classroom">Classroom (Branch Center)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Branch
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

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Batch Timing Slot
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
                  Batch Commencement Date
                </label>
                <input
                  type="text"
                  value={batchDate}
                  onChange={(e) => setBatchDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all"
                  placeholder="e.g. 15-May-2026"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Exam Status
                </label>
                <select
                  value={examStatus}
                  onChange={(e) => setExamStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold outline-none focus:border-[#00897b] transition-all cursor-pointer"
                >
                  <option value="Not Booked">Not Booked</option>
                  <option value="AAPC CPC Booked">AAPC CPC Booked</option>
                  <option value="Exam Scheduled">Exam Scheduled</option>
                  <option value="Exam Written">Exam Written</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Address & Additional */}
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#00897b]" />
              <span>Address & Follow-up Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Complete Address
                </label>
                <textarea
                  rows="2"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all"
                  placeholder="Door/House no, Street, Area, City, Pin"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Next Due Date (Fee Follow-up)
                </label>
                <input
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mode of Source (Lead Source)
                </label>
                <SearchableSelect
                  value={source}
                  onChange={setSource}
                  placeholder="— Select mode of source —"
                  searchPlaceholder="Search 32 sources (Google, Referral, WhatsApp...)"
                  groups={LEAD_SOURCE_GROUPS}
                  allowCustom={true}
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
              <span>{saving ? 'Saving Changes...' : 'Save Student Details'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
