import React, { useState, useEffect, useRef, useMemo } from 'react';
import useFileToken from '../hooks/useFileToken';
import { getAvailableTimingSlots, BATCH_SCHEDULE } from '../constants/batchTimings';
import {
  Phone,
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
  HelpCircle,
  FileText,
  Volume2,
  Download,
  Trash2,
  Link,
  ChevronDown,
  Circle,
  Smartphone,
  Copy
} from 'lucide-react';

import BookNewDemoModal from './BookNewDemoModal';
import { createDemo, getRecordings, saveRecording, recordingUrl } from '../services/api';
import { redirectToWhatsAppWeb } from '../utils/whatsapp';
import { copyToClipboard } from '../utils/clipboard';
import { COURSE_CATEGORIES } from '../constants/courses';
import RecordingAudio from './RecordingAudio';

// Maps a real call outcome to a real pipeline stage change.
const OUTCOME_STAGE = {
  'Will Join 🚀': 'fee_followup',
  'Demo Booked': 'demo_booked',
  'Follow-up Needed': 'contacted',
  'Call Back Later': 'contacted',
  'Not Reachable': null,
  'Not Interested': 'closed'
};

const NEEDS_FOLLOW_UP_DATE = ['Follow-up Needed', 'Call Back Later'];

export default function LeadCallModal({ isOpen, onClose, leadData, onSave, currentUser }) {
  useFileToken(); // keeps file links (downloads / audio) signed with a fresh short-lived token

  const [selectedOutcome, setSelectedOutcome] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [toastMsg, setToastMsg] = useState(null);
  const [showBookDemoModal, setShowBookDemoModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditingContext, setIsEditingContext] = useState(false);

  // Audio Recording Upload States (Recordings done on HR's mobile phone)
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedDuration, setUploadedDuration] = useState(0);
  const [leadRecordings, setLeadRecordings] = useState([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);

  const fileInputRef = useRef(null);

  // Lead Form State
  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    whatsappNumber: '',
    source: '',
    leadFor: '',
    timeIn: '',
    branch: '',
    status: '',
    fetchedBy: '',
    allocatedTo: '',
    spokenBy: '',
    age: '',
    gender: '',
    education: '',
    currentRole: '',
    experienceYrs: '',
    location: '',
    course: '',
    budget: '',
    batchTiming: '',
    decisionStatus: '',
    notes: ''
  });

  const availableSlots = useMemo(() => {
    return getAvailableTimingSlots({ course: leadForm.course, branch: leadForm.branch });
  }, [leadForm.course, leadForm.branch]);

  // Checklist of questions & talking points asked to candidate
  const [checklist, setChecklist] = useState([
    { id: 1, text: 'Introduce ThoughtFlows Academy & purpose of the call', checked: false },
    { id: 2, text: 'Understand candidate background, qualification & aspirations', checked: false },
    { id: 3, text: 'Explain Medical Coding / AMCT career opportunities & higher packages', checked: false },
    { id: 4, text: 'Pitch course options (AMCT / CPC), study mode & curriculum duration', checked: false },
    { id: 5, text: 'Share student alumni placements, salary milestones & hiring partners', checked: false },
    { id: 6, text: 'Send syllabus curriculum brochure & fee breakdown on WhatsApp', checked: false },
    { id: 7, text: 'Book free demo session slot or confirm next follow-up date & time', checked: false },
    { id: 8, text: 'Explain accreditation benefits, exam readiness & placement assistance', checked: false }
  ]);

  const toggleChecklistItem = (id) => {
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)));
  };

  // Fetch recordings for this lead
  const fetchLeadRecordings = async (phone) => {
    const targetPhone = phone || leadForm.phone;
    if (!targetPhone) return;
    try {
      setLoadingRecordings(true);
      const res = await getRecordings({ leadPhone: targetPhone });
      setLeadRecordings(Array.isArray(res) ? res : (res?.recordings || []));
    } catch (e) {
      console.warn('Failed to load recordings for lead:', e);
    } finally {
      setLoadingRecordings(false);
    }
  };

  const handleClearRecording = () => {
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setUploadedFileName('');
    setUploadedDuration(0);
    showToast('Uploaded recording removed');
  };

  // Reset & load form state when leadData changes
  useEffect(() => {
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setUploadedFileName('');
    setUploadedDuration(0);

    if (leadData) {
      const p = leadData.phone || '';
      let formattedTimeIn = leadData.timeIn || '';
      if (!formattedTimeIn && leadData.createdAt) {
        try {
          formattedTimeIn = new Date(leadData.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
          formattedTimeIn = '';
        }
      }

      let resolvedCourse = leadData.course || leadData.interestedCourse || '';
      if (resolvedCourse) {
        for (const cat of COURSE_CATEGORIES) {
          const match = cat.courses?.find(
            (c) =>
              c.code?.toLowerCase() === resolvedCourse.toLowerCase() ||
              c.name?.toLowerCase() === resolvedCourse.toLowerCase() ||
              `${c.code} - ${c.name}`.toLowerCase() === resolvedCourse.toLowerCase()
          );
          if (match) {
            resolvedCourse = match.code === match.name ? match.name : `${match.code} - ${match.name}`;
            break;
          }
        }
      }

      setLeadForm({
        name: leadData.fullName || leadData.name || '',
        phone: p,
        whatsappNumber: leadData.whatsappNumber || leadData.alternatePhone || '',
        source: leadData.sourceName || leadData.source || '',
        leadFor: leadData.leadFor || leadData.cameFor || '',
        timeIn: formattedTimeIn,
        branch: leadData.branch || currentUser?.branch || '',
        status: leadData.stage ? String(leadData.stage).toUpperCase() : (leadData.status ? String(leadData.status).toUpperCase() : ''),
        fetchedBy: leadData.fetchedBy || leadData.sourceName || leadData.source || '',
        allocatedTo: leadData.allocatedTo || leadData.counselorAssigned || '',
        spokenBy: leadData.spokenBy || (currentUser?.name ? `${currentUser.name} · YOU` : 'YOU'),
        age: leadData.age ? String(leadData.age) : '',
        gender: leadData.gender || '',
        education: leadData.education || leadData.qualification || '',
        currentRole: leadData.currentRole || leadData.category || '',
        experienceYrs: leadData.experienceYrs ? String(leadData.experienceYrs) : '',
        location: leadData.location || leadData.city || '',
        course: resolvedCourse,
        budget: leadData.budget || '',
        batchTiming: leadData.batchTiming || '',
        decisionStatus: leadData.decisionStatus || '',
        notes: leadData.notes || leadData.followUpNote || leadData.discussionNote || ''
      });
      setSelectedOutcome(leadData.callOutcome || leadData.lastCallOutcome || leadData.outcome || '');
      setFollowUpDate(leadData.followUpDate || '');
      setFollowUpTime(leadData.followUpTime || '');
      setChecklist((prev) => prev.map((item) => ({ ...item, checked: false })));
      fetchLeadRecordings(p);
    }
  }, [leadData?._id, leadData?.id]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Handle local audio file upload from phone
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 75 * 1024 * 1024) {
      showToast('File size exceeds 75 MB limit.');
      return;
    }
    setUploadedFileName(file.name);
    setRecordedAudioBlob(file);
    const url = URL.createObjectURL(file);
    setRecordedAudioUrl(url);

    // Read audio length
    const probe = new Audio();
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      if (Number.isFinite(probe.duration) && probe.duration > 0) {
        setUploadedDuration(Math.round(probe.duration));
      }
    };
    probe.src = url;
    showToast(`✓ Call recording attached: ${file.name}`);
  };

  // Save student details & uploaded recording
  const handleSaveAndClose = async () => {
    if (NEEDS_FOLLOW_UP_DATE.includes(selectedOutcome) && !followUpDate) {
      showToast('Please schedule next follow-up date before submitting.');
      return;
    }

    setSaving(true);

    // Convert audio file to base64 if present
    let audioBase64 = null;
    if (recordedAudioBlob) {
      try {
        audioBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(recordedAudioBlob);
        });
      } catch (e) {
        console.warn('Could not encode audio file:', e);
      }
    }

    let recordingFailed = false;
    if (audioBase64) {
      try {
        await saveRecording({
          leadId: leadData?._id || leadData?.id,
          leadName: leadForm.name || 'Student',
          leadPhone: leadForm.phone,
          counselorName: currentUser?.name || 'HR Counselor',
          counselorPhone: currentUser?.phone || '',
          durationSeconds: uploadedDuration || 60,
          outcome: selectedOutcome || 'Follow-up Needed',
          notes: leadForm.notes,
          audioBase64,
          fileName: uploadedFileName || 'phone_call_recording.m4a',
          source: 'phone_upload'
        });
        await fetchLeadRecordings(leadForm.phone);
      } catch (err) {
        console.error('Failed to save call recording:', err);
        recordingFailed = true;
        showToast(`Could not save call recording: ${err.response?.data?.error || err.message}`);
      }
    }

    const nextStage = selectedOutcome === 'Not Reachable'
      ? ((leadData?.stage || 'new') === 'new' ? 'contacted' : undefined)
      : (selectedOutcome ? OUTCOME_STAGE[selectedOutcome] : undefined);

    const payload = {
      outcome: selectedOutcome || undefined,
      stage: nextStage,
      notes: leadForm.notes,
      durationSeconds: uploadedDuration || 0,
      wasAnswered: Boolean(selectedOutcome && selectedOutcome !== 'Not Reachable'),
      followUpDate: NEEDS_FOLLOW_UP_DATE.includes(selectedOutcome) ? followUpDate : (leadData?.followUpDate || ''),
      followUpTime: NEEDS_FOLLOW_UP_DATE.includes(selectedOutcome) ? followUpTime : (leadData?.followUpTime || ''),
      leadForm: { ...leadForm }
    };

    try {
      if (onSave) await onSave(payload);
      if (recordingFailed) {
        setTimeout(() => showToast('⚠ Details saved, but recording upload failed — click Submit again to retry.'), 3500);
      } else {
        showToast(audioBase64 ? '✓ Student details & call recording saved!' : '✓ Student details updated successfully!');
        setTimeout(() => onClose(), 600);
      }
    } catch (e) {
      showToast(`Could not save: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSendRegistrationLink = async () => {
    const regUrl = `${window.location.origin}/register?name=${encodeURIComponent(leadForm.name || '')}&phone=${encodeURIComponent(leadForm.phone || '')}&course=${encodeURIComponent(leadForm.course || '')}${currentUser?.name ? `&hr=${encodeURIComponent(currentUser.name)}` : ''}`;
    await copyToClipboard(regUrl);
    showToast('✓ Registration link copied to clipboard & sent!');
  };

  const handleWhatsAppBrochure = () => {
    const msg = `Hello ${leadForm.name}, thank you for speaking with Thoughtflows Medical Coding Academy! Here is the complete curriculum & fee brochure for ${leadForm.course}. Let us know if you have any questions!`;
    redirectToWhatsAppWeb(leadForm.phone || leadForm.whatsappNumber, msg);
  };

  const OUTCOMES = [
    { title: 'Will Join 🚀', sub: 'Open registration' },
    { title: 'Follow-up Needed', sub: 'Schedule FU' },
    { title: 'Demo Booked', sub: 'Pick slot below ↓' },
    { title: 'Call Back Later', sub: 'Set time' },
    { title: 'Not Reachable', sub: 'Retry later' },
    { title: 'Not Interested', sub: 'Close lead' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-[70] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-teal-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Modal Card */}
      <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] text-left">
        
        {/* ── TOP HEADER (Direct Mobile Phone Contact Workflow) ────────── */}
        <header className="bg-[#0b1b2b] text-white px-5 py-3.5 flex items-center justify-between gap-4 flex-wrap border-b border-slate-800">
          {/* Student Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#00897b] text-white font-black text-xl flex items-center justify-center shadow-xs">
              {(leadForm.name || 'S')[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                  {leadForm.name || 'Student Details'}
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Discussion &amp; Details
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="text-xs text-teal-300 font-mono tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-teal-400" />
                  <span>{leadForm.phone || 'No phone'}</span>
                </div>
                {leadForm.phone && (
                  <button
                    type="button"
                    onClick={async () => {
                      await copyToClipboard(leadForm.phone);
                      showToast(`✓ Phone number copied: ${leadForm.phone}`);
                    }}
                    className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                    title="Copy phone to dial on your mobile phone"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs text-slate-300">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Contact student on your phone</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Informational Guidance Strip */}
        <div className="bg-teal-50/90 border-b border-teal-200/80 px-5 py-2 flex items-center justify-between gap-2 text-xs text-teal-950 flex-wrap">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-base">📱</span>
            <span>
              <strong>Direct Phone Contact:</strong> Call candidate directly on your phone. Ask and record details below, then attach the phone call recording to submit.
            </span>
          </div>
          {leadForm.phone && (
            <span className="text-[11px] font-mono text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded font-bold">
              Dial: {leadForm.phone}
            </span>
          )}
        </div>

        {/* ── SCROLLABLE MODAL BODY ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs text-slate-800">

          {/* 3-COLUMN MAIN LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

            {/* ── COLUMN 1: LEAD CONTEXT (approx 3 cols) ───────────────── */}
            <div className="lg:col-span-3 space-y-3.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  LEAD CONTEXT
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingContext(!isEditingContext)}
                  className="flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-800 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{isEditingContext ? 'Done' : 'Edit'}</span>
                </button>
              </div>

              {/* Context Pill Cards */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">SOURCE</span>
                  {isEditingContext ? (
                    <input
                      type="text"
                      value={leadForm.source}
                      onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
                      placeholder="Add source..."
                      className="text-right font-bold text-slate-900 border-b border-teal-400 outline-none w-36 text-xs bg-transparent"
                    />
                  ) : (
                    <span className="font-extrabold text-slate-900">{leadForm.source || '—'}</span>
                  )}
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50/70 border border-purple-200">
                  <span className="text-[10px] font-mono font-bold text-purple-700 uppercase">LEAD FOR</span>
                  {isEditingContext ? (
                    <input
                      type="text"
                      value={leadForm.leadFor}
                      onChange={(e) => setLeadForm({ ...leadForm, leadFor: e.target.value })}
                      placeholder="e.g. Admission / Demo"
                      className="text-right font-bold text-purple-800 border-b border-purple-400 outline-none w-36 text-xs bg-transparent"
                    />
                  ) : (
                    <span className="font-extrabold text-purple-800">{leadForm.leadFor || '—'}</span>
                  )}
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">TIME IN</span>
                  {isEditingContext ? (
                    <input
                      type="text"
                      value={leadForm.timeIn}
                      onChange={(e) => setLeadForm({ ...leadForm, timeIn: e.target.value })}
                      placeholder="e.g. 10:30 AM"
                      className="text-right font-bold text-slate-800 border-b border-teal-400 outline-none w-36 text-xs bg-transparent"
                    />
                  ) : (
                    <span className="font-bold text-slate-800 font-mono">{leadForm.timeIn || '—'}</span>
                  )}
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">BRANCH</span>
                  {isEditingContext ? (
                    <input
                      type="text"
                      value={leadForm.branch}
                      onChange={(e) => setLeadForm({ ...leadForm, branch: e.target.value })}
                      placeholder="Add branch..."
                      className="text-right font-bold text-slate-800 border-b border-teal-400 outline-none w-36 text-xs bg-transparent"
                    />
                  ) : (
                    <span className="font-bold text-slate-800">{leadForm.branch || '—'}</span>
                  )}
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">STATUS</span>
                  <span className="font-black text-[#00b894] tracking-wide">{leadForm.status || '—'}</span>
                </div>
              </div>

              {/* 3-PERSON ATTRIBUTION */}
              <div className="pt-2 border-t border-slate-200/60 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  3-PERSON ATTRIBUTION
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-slate-100">
                    <span className="text-slate-400 font-medium">FETCHED</span>
                    {isEditingContext ? (
                      <input
                        type="text"
                        value={leadForm.fetchedBy}
                        onChange={(e) => setLeadForm({ ...leadForm, fetchedBy: e.target.value })}
                        placeholder="Add fetched by..."
                        className="text-right font-bold text-slate-800 border-b border-teal-400 outline-none w-32 text-xs bg-transparent"
                      />
                    ) : (
                      <span className="font-bold text-slate-800">{leadForm.fetchedBy || '—'}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-slate-100">
                    <span className="text-slate-400 font-medium">ALLOCATED</span>
                    {isEditingContext ? (
                      <input
                        type="text"
                        value={leadForm.allocatedTo}
                        onChange={(e) => setLeadForm({ ...leadForm, allocatedTo: e.target.value })}
                        placeholder="Add staff name..."
                        className="text-right font-bold text-slate-800 border-b border-teal-400 outline-none w-32 text-xs bg-transparent"
                      />
                    ) : (
                      <span className="font-bold text-slate-800">{leadForm.allocatedTo || '—'}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-slate-100">
                    <span className="text-slate-400 font-medium">SPOKEN</span>
                    {isEditingContext ? (
                      <input
                        type="text"
                        value={leadForm.spokenBy}
                        onChange={(e) => setLeadForm({ ...leadForm, spokenBy: e.target.value })}
                        placeholder="Add spoken by..."
                        className="text-right font-extrabold text-[#00897b] border-b border-teal-400 outline-none w-32 text-xs bg-transparent"
                      />
                    ) : (
                      <span className="font-extrabold text-[#00897b]">{leadForm.spokenBy || '—'}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* FOLLOW-UP HISTORY */}
              <div className="pt-2 border-t border-slate-200/60 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  FOLLOW-UP HISTORY
                </div>
                {leadData?.followUpDate ? (
                  <div className="p-2 rounded-xl bg-white border border-slate-200 text-[11px] space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Scheduled Follow-up</span>
                      <span className="text-teal-700 font-mono">{leadData.followUpDate} {leadData.followUpTime || ''}</span>
                    </div>
                    {leadData.followUpNote && (
                      <p className="text-slate-600 text-[10.5px] leading-snug">{leadData.followUpNote}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    No follow-ups recorded yet.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedOutcome('Follow-up Needed')}
                  className="w-full py-2 border-2 border-dashed border-teal-300 hover:border-teal-500 text-teal-700 bg-teal-50/50 hover:bg-teal-50 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  + Add follow-up
                </button>
              </div>
            </div>

            {/* ── COLUMN 2: DETAILS ASKED FROM STUDENTS (approx 5.5 cols) ─ */}
            <div className="lg:col-span-5 space-y-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 font-mono">
                  STUDENT DETAILS &amp; INTERVIEW NOTES
                </span>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  FULL NAME
                </label>
                <input
                  type="text"
                  value={leadForm.name}
                  onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white"
                />
              </div>

              {/* Row 2: Age + Gender */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    AGE
                  </label>
                  <input
                    type="text"
                    value={leadForm.age}
                    onChange={(e) => setLeadForm({ ...leadForm, age: e.target.value })}
                    placeholder="e.g. 23"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    GENDER
                  </label>
                  <select
                    value={leadForm.gender}
                    onChange={(e) => setLeadForm({ ...leadForm, gender: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white"
                  >
                    <option value="">— Select Gender —</option>
                    {leadForm.gender && !['Female', 'Male', 'Other'].includes(leadForm.gender) && (
                      <option value={leadForm.gender}>{leadForm.gender}</option>
                    )}
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Education */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  EDUCATION / DEGREE
                </label>
                <select
                  value={leadForm.education}
                  onChange={(e) => setLeadForm({ ...leadForm, education: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white"
                >
                  <option value="">— Select Education —</option>
                  <option value="BSc Nursing">BSc Nursing</option>
                  <option value="GNM / ANM Nursing">GNM / ANM Nursing</option>
                  <option value="B.Pharm / D.Pharm">B.Pharm / D.Pharm</option>
                  <option value="M.Pharm / Pharm.D">M.Pharm / Pharm.D</option>
                  <option value="BSc Biotechnology">BSc Biotechnology</option>
                  <option value="BSc Microbiology">BSc Microbiology</option>
                  <option value="BSc Biochemistry">BSc Biochemistry</option>
                  <option value="BSc Zoology / Botany / Life Science">BSc Zoology / Botany / Life Science</option>
                  <option value="BPT (Physiotherapy)">BPT (Physiotherapy)</option>
                  <option value="BSc MLT (Medical Lab Technology)">BSc MLT (Medical Lab Technology)</option>
                  <option value="BSc Radiology / Allied Health">BSc Radiology / Allied Health</option>
                  <option value="B.Tech / BE">B.Tech / BE</option>
                  <option value="Arts & Science Graduate">Arts & Science Graduate</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Row 4: Current Role + Experience */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    CURRENT ROLE
                  </label>
                  <input
                    type="text"
                    value={leadForm.currentRole}
                    onChange={(e) => setLeadForm({ ...leadForm, currentRole: e.target.value })}
                    placeholder="e.g. Fresher / Nurse"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    EXPERIENCE (YRS)
                  </label>
                  <input
                    type="text"
                    value={leadForm.experienceYrs}
                    onChange={(e) => setLeadForm({ ...leadForm, experienceYrs: e.target.value })}
                    placeholder="e.g. 0 or 2"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white"
                  />
                </div>
              </div>

              {/* Location & Budget */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    LOCATION / CITY
                  </label>
                  <input
                    type="text"
                    value={leadForm.location}
                    onChange={(e) => setLeadForm({ ...leadForm, location: e.target.value })}
                    placeholder="e.g. Coimbatore / Kochi"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    BUDGET / PAYMENT
                  </label>
                  <input
                    type="text"
                    value={leadForm.budget}
                    onChange={(e) => setLeadForm({ ...leadForm, budget: e.target.value })}
                    placeholder="e.g. Full / 2 Installments"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white"
                  />
                </div>
              </div>

              {/* Interested Course */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  INTERESTED COURSE
                </label>
                <select
                  value={leadForm.course}
                  onChange={(e) => setLeadForm({ ...leadForm, course: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white"
                >
                  <option value="">— Select Course —</option>
                  <option value="CPC - Certified Professional Coder">CPC - Certified Professional Coder</option>
                  <option value="AMCT - Advanced Medical Coding Training">AMCT - Advanced Medical Coding Training</option>
                  <option value="CIC - Certified Inpatient Coder">CIC - Certified Inpatient Coder</option>
                  <option value="CPB - Certified Professional Biller">CPB - Certified Professional Biller</option>
                  <option value="CPMA - Certified Professional Medical Auditor">CPMA - Certified Professional Medical Auditor</option>
                  <option value="CRC - Certified Risk Adjustment Coder">CRC - Certified Risk Adjustment Coder</option>
                  <option value="IP-DRG - Inpatient Diagnosis Related Groups">IP-DRG - Inpatient Diagnosis Related Groups</option>
                </select>
              </div>

              {/* Batch Timing */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  PREFERRED BATCH TIMING
                </label>
                <select
                  value={leadForm.batchTiming}
                  onChange={(e) => setLeadForm({ ...leadForm, batchTiming: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white cursor-pointer"
                >
                  <option value="">— Select timing slot —</option>
                  <option value="Not Mentioned">Not Mentioned</option>
                  {availableSlots.map((s, idx) => (
                    <option key={`slot-${idx}`} value={s.label}>
                      {s.label}
                    </option>
                  ))}
                  {BATCH_SCHEDULE.filter((s) => !availableSlots.some((a) => a.label === s.label)).map((s, idx) => (
                    <option key={`other-${idx}`} value={s.label}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Decision Status */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  DECISION STATUS
                </label>
                <input
                  type="text"
                  value={leadForm.decisionStatus}
                  onChange={(e) => setLeadForm({ ...leadForm, decisionStatus: e.target.value })}
                  placeholder="e.g. Ready to join, Discussing with parents, Needs demo..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white"
                />
              </div>

              {/* Discussion Notes */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  PHONE DISCUSSION NOTES
                </label>
                <textarea
                  rows="3"
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  placeholder="What did the candidate say during your phone conversation? Preferences, doubts, fee commitment..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs leading-relaxed text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white transition-all font-sans"
                />
              </div>

              {/* Call Outcome Options */}
              <div className="pt-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  CONVERSATION OUTCOME
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
                        className={`p-2.5 rounded-xl border text-center transition-all flex flex-col justify-center min-h-[52px] cursor-pointer ${
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

              {/* Follow-up date / time picker when outcome requires it */}
              {NEEDS_FOLLOW_UP_DATE.includes(selectedOutcome) && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-800 font-mono">
                    SCHEDULE NEXT FOLLOW-UP
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono outline-none"
                    />
                    <input
                      type="time"
                      value={followUpTime}
                      onChange={(e) => setFollowUpTime(e.target.value)}
                      className="bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── COLUMN 3: TALKING POINTS & SCRIPT CHECKLIST (approx 3.5 cols) ── */}
            <div className="lg:col-span-4 space-y-2.5">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 font-mono pb-1 border-b border-slate-100 flex items-center justify-between">
                <span>TALKING POINTS CHECKLIST</span>
                <span className="text-[10px] text-teal-700 font-bold">Ask on phone</span>
              </div>
              <div className="space-y-2">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`p-3 rounded-2xl border text-xs font-semibold flex items-start gap-2.5 transition-all cursor-pointer select-none ${
                      item.checked
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : 'bg-amber-50/70 border-amber-200/90 text-amber-950 hover:bg-amber-50'
                    }`}
                  >
                    {item.checked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    )}
                    <span className="leading-snug">{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Information Card */}
              <div className="bg-[#fffbeb] border border-amber-300/80 rounded-2xl p-3 text-center text-xs font-bold text-amber-900 font-mono">
                💡 Avg CPL: ₹147 · Placement Success: 94%
              </div>
            </div>

          </div>

          {/* ── UPLOAD PHONE CALL RECORDING SECTION ─────────────────────── */}
          <div className="pt-2">
            <div className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 font-mono mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>🎙️</span>
                <span>UPLOAD PHONE CALL RECORDING</span>
              </span>
              <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Audio recorded on your phone
              </span>
            </div>

            {/* Cyan dashed upload box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/30 hover:bg-teal-50/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#00897b] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Upload className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {uploadedFileName || 'Click to select and upload call recording from your phone'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Supports M4A, MP3, WAV, AAC, OPUS, WEBM · up to 75 MB
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
              >
                Browse Audio File
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.m4a,.mp3,.wav,.aac,.opus,.webm,.ogg"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Audio Preview if audio attached */}
            {recordedAudioUrl && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold shrink-0">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-emerald-950 truncate max-w-sm">
                      {uploadedFileName || 'Attached Phone Audio'}
                    </div>
                    <div className="text-[10.5px] text-emerald-700">
                      Duration: {uploadedDuration ? `${Math.floor(uploadedDuration / 60)}m ${uploadedDuration % 60}s` : 'Ready to save'} · Ready to submit
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <RecordingAudio src={recordedAudioUrl} className="h-8 max-w-xs w-full accent-[#00897b]" />
                  <button
                    type="button"
                    onClick={handleClearRecording}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                    title="Remove this recording"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── RECORDED CALLS HISTORY TABLE FOR THIS STUDENT ───────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#00897b]" />
                <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">
                  Recorded Calls for {leadForm.name || 'Student'}
                </span>
                <span className="text-[10px] bg-teal-100 text-teal-900 px-2 py-0.5 rounded font-mono font-bold">
                  {leadRecordings.length}
                </span>
              </div>
              <span className="text-[10.5px] text-slate-400 font-mono">
                {leadForm.phone}
              </span>
            </div>

            {loadingRecordings ? (
              <div className="py-3 text-center text-xs text-slate-400">Loading audio records…</div>
            ) : leadRecordings.length === 0 ? (
              <div className="py-3 text-center text-xs text-slate-400 font-medium">
                No past recordings on file. Upload phone call recordings above to archive here.
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[9.5px] tracking-wider border-b border-slate-200">
                      <th className="py-2.5 px-3">DATE &amp; TIME</th>
                      <th className="py-2.5 px-3">COUNSELLOR</th>
                      <th className="py-2.5 px-3">DURATION</th>
                      <th className="py-2.5 px-3">OUTCOME</th>
                      <th className="py-2.5 px-3 min-w-[220px]">AUDIO PLAYBACK</th>
                      <th className="py-2.5 px-3 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11.5px]">
                    {leadRecordings.map((rec) => (
                      <tr key={rec._id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {new Date(rec.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {rec.counselorName}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                          {Math.floor(rec.durationSeconds / 60)}m {rec.durationSeconds % 60}s
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                            {rec.outcome}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {rec.audioUrl ? (
                            <RecordingAudio src={recordingUrl(rec.audioUrl)} className="h-7 w-56 max-w-full accent-[#00897b]" />
                          ) : (
                            <span className="text-slate-400 italic text-[10.5px]">No audio file</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {rec.audioUrl && (
                            <a
                              href={recordingUrl(rec.audioUrl)}
                              download={`call_${rec.leadName}_${rec.leadPhone}.webm`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded bg-slate-100 hover:bg-teal-100 text-teal-800 inline-block transition-all"
                              title="Download Audio"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* ── BOTTOM FOOTER ACTION BAR ─────────────────────────────────── */}
        <footer className="p-3.5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Send Registration Link Button */}
            <button
              type="button"
              onClick={handleSendRegistrationLink}
              className="bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Link className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Send Registration Link</span>
            </button>

            {/* Book Demo Button */}
            <button
              type="button"
              onClick={() => setShowBookDemoModal(true)}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book Demo</span>
            </button>

            {/* WhatsApp Brochure Button */}
            <button
              type="button"
              onClick={handleWhatsAppBrochure}
              className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Brochure</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              disabled={saving}
              className="bg-[#00897b] hover:bg-[#00796b] disabled:opacity-60 text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{saving ? 'Submitting…' : '✓ Submit Details & Recording'}</span>
            </button>
          </div>
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
            showToast(`✓ Demo booked for ${demo.studentName || demo.candidateName}! Moved to Trainer Head & Manager for trainer assignment.`);
          } catch (e) {
            console.warn('Failed to save demo in modal:', e);
            showToast(`Could not save demo: ${e.message}`);
          }
        }}
      />
    </div>
  );
}
