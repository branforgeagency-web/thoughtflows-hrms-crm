import React, { useState, useEffect, useRef } from 'react';
import useFileToken from '../hooks/useFileToken';
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
  Mic,
  MicOff,
  Volume2,
  Download,
  Trash2,
  Link,
  ChevronDown,
  Circle
} from 'lucide-react';

import BookNewDemoModal from './BookNewDemoModal';
import { createDemo, getRecordings, saveRecording, recordingUrl } from '../services/api';
import { redirectToWhatsAppWeb } from '../utils/whatsapp';
import { copyToClipboard } from '../utils/clipboard';
import { COURSE_CATEGORIES } from '../constants/courses';

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

const STATUS_LABEL = {
  idle: 'READY',
  dialing: 'DIALING…',
  'in-progress': 'ON CALL',
  completed: 'CALL ENDED'
};

export default function LeadCallModal({ isOpen, onClose, leadData, onSave, currentUser }) {
  useFileToken(); // keeps file links (downloads / audio) signed with a fresh short-lived token
  // Call state (Direct device / Phone Link call)
  const [callStatus, setCallStatus] = useState('idle');
  const [callSeconds, setCallSeconds] = useState(0);
  const [selectedOutcome, setSelectedOutcome] = useState('Follow-up Needed');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [toastMsg, setToastMsg] = useState(null);
  const [showBookDemoModal, setShowBookDemoModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditingContext, setIsEditingContext] = useState(false);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedDuration, setUploadedDuration] = useState(0);
  const [leadRecordings, setLeadRecordings] = useState([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);
  const hasBeenAnsweredRef = useRef(false);

  // Lead Form State matching the design exactly
  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    whatsappNumber: '',
    source: 'Google Calls',
    leadFor: 'Demo',
    timeIn: '15:32',
    branch: 'Saravanampatti',
    status: 'NEW',
    fetchedBy: 'Google Ad ⚡',
    allocatedTo: 'Priyadharshini',
    spokenBy: 'YOU',
    age: '24',
    gender: 'Female',
    education: '',
    currentRole: 'BPO / Call Center',
    experienceYrs: '3.5',
    location: 'Coimbatore',
    course: 'CPC - Certified Professional Coder',
    budget: '₹20K-30K',
    batchTiming: 'Weekend (Sat-Sun)',
    decisionStatus: 'Will discuss with family',
    notes: 'Interested but wants weekend batch. Family discussion needed. Will call Sunday after 7 PM. Sent CPC brochure on WhatsApp.'
  });

  // Pitch Checklist Items matching screenshot
  const [checklist, setChecklist] = useState([
    { id: 1, text: 'Acknowledge night shifts / call targets are exhausting', checked: true },
    { id: 2, text: 'Position medical coding as remote-friendly, higher pay', checked: true },
    { id: 3, text: 'Ask: years of BPO experience & current package', checked: true },
    { id: 4, text: 'If 2+ yrs experience → pitch CPC fast-track (3 months)', checked: false },
    { id: 5, text: 'Share alumni placement examples (3–4 names, salaries)', checked: false },
    { id: 6, text: 'Send BPO-to-Coder salary comparison sheet on WhatsApp', checked: false },
    { id: 7, text: 'Book demo within 48 hrs · weekend slot preferred', checked: false },
    { id: 8, text: 'Mention AAPC certification + placement guarantee', checked: false }
  ]);

  const toggleChecklistItem = (id) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const clearTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Fetch recordings for this lead
  const fetchLeadRecordings = async (phone) => {
    const targetPhone = phone || leadForm.phone;
    if (!targetPhone) return;
    try {
      setLoadingRecordings(true);
      const res = await getRecordings({ leadPhone: targetPhone });
      setLeadRecordings(Array.isArray(res) ? res : []);
    } catch (e) {
      console.warn('Error fetching recordings for lead:', e);
    } finally {
      setLoadingRecordings(false);
    }
  };

  // Start in-browser audio recording with Voice Isolation (Noise Suppression & Echo Cancellation)
  const startAudioRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setRecordedAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setRecordedAudioUrl(url);
          setUploadedFileName('mic_voice_recording.webm');
        }
        setIsRecording(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone permission not granted or audio constraint error:', err);
      setIsRecording(false);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping mediaRecorder:', e);
      }
    }
    setIsRecording(false);
  };

  const handleClearRecording = () => {
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setUploadedFileName('');
    setUploadedDuration(0);
    showToast('Recorded audio removed');
  };

  // Reset & load form state when leadData changes
  useEffect(() => {
    setCallStatus('idle');
    setCallSeconds(0);
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setUploadedFileName('');
    setUploadedDuration(0);
    hasBeenAnsweredRef.current = false;
    clearTimers();

    if (leadData) {
      const p = leadData.phone || '';
      setLeadForm({
        name: leadData.name || leadData.fullName || '',
        phone: p || '+919876500000',
        whatsappNumber: leadData.whatsappNumber || leadData.alternatePhone || '',
        source: leadData.sourceName || leadData.source || 'Google Calls',
        leadFor: leadData.leadFor || 'Demo',
        timeIn: leadData.timeIn || '15:32',
        branch: leadData.branch || currentUser?.branch || 'Saravanampatti',
        status: leadData.stage ? leadData.stage.toUpperCase() : 'NEW',
        fetchedBy: leadData.fetchedBy || 'Google Ad ⚡',
        allocatedTo: leadData.allocatedTo || leadData.counselorAssigned || 'Priyadharshini',
        spokenBy: currentUser?.name ? `${currentUser.name} · YOU` : 'YOU',
        age: leadData.age || '24',
        gender: leadData.gender || 'Female',
        education: leadData.education || '',
        currentRole: leadData.currentRole || 'BPO / Call Center',
        experienceYrs: leadData.experienceYrs || '3.5',
        location: leadData.location || 'Coimbatore',
        course: leadData.course || 'CPC - Certified Professional Coder',
        budget: leadData.budget || '₹20K-30K',
        batchTiming: leadData.batchTiming || 'Weekend (Sat-Sun)',
        decisionStatus: leadData.decisionStatus || 'Will discuss with family',
        notes: leadData.notes || 'Interested but wants weekend batch. Family discussion needed. Will call Sunday after 7 PM. Sent CPC brochure on WhatsApp.'
      });
      fetchLeadRecordings(p);
    }

    return () => {
      clearTimers();
      stopAudioRecording();
    };
  }, [leadData?._id, leadData?.id]);

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const startTimer = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);
  };

  // Direct dial via mobile / desktop default dialer (Windows Phone Link, native phone dialer)
  const handleCall = () => {
    if (!leadForm.phone) {
      showToast('This student has no phone number on file.');
      return;
    }
    const cleanPhone = leadForm.phone.replace(/[^\d+]/g, '');
    window.open(`tel:${cleanPhone}`, '_self');
    // A tel: call gives the browser no connect/disconnect events, so the timer
    // waits until the counsellor marks the call as connected.
    if (callStatus !== 'in-progress') setCallStatus('dialing');
    showToast(`Dialing ${leadForm.phone} via Phone / Phone Link… Tap "Connected" once the student picks up.`);
  };

  const handleCallConnected = () => {
    setCallStatus('in-progress');
    hasBeenAnsweredRef.current = true;
    startTimer();
    startAudioRecording();
    showToast('Call connected. Timer started.');
  };

  const handleEndCall = () => {
    const wasConnected = callStatus === 'in-progress';
    clearTimers();
    stopAudioRecording();
    setCallStatus('completed');
    showToast(wasConnected ? '✓ Call ended. Audio recording ready.' : 'Call ended before it connected.');
  };

  // Handle local file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      showToast('File size exceeds 50 MB limit.');
      return;
    }
    setUploadedFileName(file.name);
    setRecordedAudioBlob(file);
    const url = URL.createObjectURL(file);
    setRecordedAudioUrl(url);
    // Use the recording's own length when no call was timed in the CRM
    const probe = new Audio();
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      if (Number.isFinite(probe.duration) && probe.duration > 0) setUploadedDuration(Math.round(probe.duration));
    };
    probe.src = url;
    showToast(`✓ Uploaded audio: ${file.name}`);
  };

  const handleSaveAndClose = async () => {
    if (['dialing', 'in-progress'].includes(callStatus)) {
      handleEndCall();
    }

    if (NEEDS_FOLLOW_UP_DATE.includes(selectedOutcome) && !followUpDate) {
      showToast('Pick a follow-up date before saving this outcome.');
      return;
    }

    setSaving(true);

    // Convert audio blob to base64 if available
    let audioBase64 = null;
    if (recordedAudioBlob) {
      try {
        audioBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(recordedAudioBlob);
        });
      } catch (e) {
        console.warn('Could not encode audio blob:', e);
      }
    }

    if (audioBase64) {
      const isPhoneUpload = recordedAudioBlob instanceof File;
      try {
        await saveRecording({
          leadId: leadData?._id || leadData?.id,
          leadName: leadForm.name || 'Unnamed Student',
          leadPhone: leadForm.phone,
          counselorName: currentUser?.name || '',
          counselorPhone: currentUser?.phone || '',
          durationSeconds: isPhoneUpload ? (uploadedDuration || callSeconds) : callSeconds,
          outcome: selectedOutcome,
          notes: leadForm.notes,
          audioBase64,
          fileName: uploadedFileName,
          source: isPhoneUpload ? 'phone_upload' : 'browser_mic'
        });
        await fetchLeadRecordings(leadForm.phone);
      } catch (err) {
        console.error('Failed to save call recording:', err);
        showToast(`Could not save call recording: ${err.response?.data?.error || err.message}`);
      }
    }

    const payload = {
      outcome: selectedOutcome,
      stage: OUTCOME_STAGE[selectedOutcome],
      notes: leadForm.notes,
      durationSeconds: callSeconds,
      wasAnswered: hasBeenAnsweredRef.current,
      followUpDate: NEEDS_FOLLOW_UP_DATE.includes(selectedOutcome) ? followUpDate : '',
      followUpTime: NEEDS_FOLLOW_UP_DATE.includes(selectedOutcome) ? followUpTime : '',
      leadForm: { ...leadForm }
    };

    try {
      if (onSave) await onSave(payload);
      showToast('✓ Call log & all student details saved!');
      setTimeout(() => onClose(), 600);
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

  const isCallActive = ['dialing', 'in-progress'].includes(callStatus);
  const statusLabel = STATUS_LABEL[callStatus] || callStatus.toUpperCase();

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
        
        {/* ── TOP HEADER BANNER ────────────────────────────────────────── */}
        <header className="bg-[#0b1b2b] text-white px-5 py-3.5 flex items-center justify-between gap-4 flex-wrap border-b border-slate-800">
          {/* Caller Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#00b894] text-white font-black text-xl flex items-center justify-center shadow-xs">
              {(leadForm.name || 'P')[0]}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                {leadForm.name || 'Priya Ramesh'}
              </h2>
              <div className="text-xs text-teal-300 font-mono tracking-wider mt-0.5">
                {leadForm.phone || '+919876500000'}
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Direct Device Call - Windows Phone Link / Mobile native dialer */}
            <button
              type="button"
              onClick={handleCall}
              disabled={!leadForm.phone}
              className="bg-[#00897b] hover:bg-[#00796b] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              title="Call directly via Phone or Windows Phone Link"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{isCallActive ? 'RE-DIAL' : 'CALL VIA PHONE'}</span>
            </button>

            {callStatus === 'dialing' && (
              <button
                type="button"
                onClick={handleCallConnected}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                title="Start the timer once the student picks up"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>CONNECTED</span>
              </button>
            )}

            {isCallActive && (
              <button
                type="button"
                onClick={handleEndCall}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                title="Stop the timer when the call disconnects"
              >
                <X className="w-3.5 h-3.5" />
                <span>HANG UP</span>
              </button>
            )}

            <div className="bg-white/10 border border-white/15 px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${callStatus === 'in-progress' ? 'bg-rose-500 animate-ping' : isCallActive ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'}`} />
              <span>{callStatus === 'in-progress' ? 'ON CALL' : statusLabel}</span>
            </div>

            {/* Digital Timer */}
            <div className="bg-[#0b3c5d] border border-cyan-400/40 text-cyan-300 font-mono font-black text-sm px-3.5 py-1.5 rounded-xl shadow-inner tracking-wider">
              {formatTimer(callSeconds)}
            </div>

            <button
              type="button"
              onClick={handleSaveAndClose}
              className="bg-[#e74c3c] hover:bg-[#c0392b] text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <span>✕ End Call & Save</span>
            </button>
          </div>
        </header>

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
                  <span className="font-extrabold text-slate-900">{leadForm.source}</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50/70 border border-purple-200">
                  <span className="text-[10px] font-mono font-bold text-purple-700 uppercase">LEAD FOR</span>
                  <span className="font-extrabold text-purple-800">{leadForm.leadFor}</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">TIME IN</span>
                  <span className="font-bold text-slate-800 font-mono">{leadForm.timeIn}</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">BRANCH</span>
                  <span className="font-bold text-slate-800">{leadForm.branch}</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">STATUS</span>
                  <span className="font-black text-[#00b894] tracking-wide">{leadForm.status}</span>
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
                    <span className="font-bold text-slate-800">{leadForm.fetchedBy}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-slate-100">
                    <span className="text-slate-400 font-medium">ALLOCATED</span>
                    <span className="font-bold text-slate-800">{leadForm.allocatedTo}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-slate-100">
                    <span className="text-slate-400 font-medium">SPOKEN</span>
                    <span className="font-extrabold text-[#00897b]">{leadForm.spokenBy}</span>
                  </div>
                </div>
              </div>

              {/* FOLLOW-UP HISTORY */}
              <div className="pt-2 border-t border-slate-200/60 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  FOLLOW-UP HISTORY
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  No follow-ups yet — first call. Add one below after you speak.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedOutcome('Follow-up Needed')}
                  className="w-full py-2 border-2 border-dashed border-teal-300 hover:border-teal-500 text-teal-700 bg-teal-50/50 hover:bg-teal-50 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  + Add follow-up
                </button>
              </div>
            </div>

            {/* ── COLUMN 2: CAPTURE WHILE YOU TALK (approx 5.5 cols) ───── */}
            <div className="lg:col-span-5 space-y-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 font-mono">
                  CAPTURE WHILE YOU TALK
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
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Education */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  EDUCATION
                </label>
                <select
                  value={leadForm.education}
                  onChange={(e) => setLeadForm({ ...leadForm, education: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white"
                >
                  <option value="">— Select —</option>
                  <option value="B.Tech Biotechnology">B.Tech Biotechnology</option>
                  <option value="BSc Nursing">BSc Nursing</option>
                  <option value="B.Pharm">B.Pharm</option>
                  <option value="BSc Microbiology">BSc Microbiology</option>
                  <option value="BSc Biochemistry">BSc Biochemistry</option>
                  <option value="BSc Zoology / Life Science">BSc Zoology / Life Science</option>
                  <option value="BE / B.Tech (Other)">BE / B.Tech (Other)</option>
                  <option value="Arts & Science Graduate">Arts & Science Graduate</option>
                  <option value="Diploma">Diploma</option>
                </select>
              </div>

              {/* Row 4: Current Role + Experience */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    CURRENT ROLE
                  </label>
                  <select
                    value={leadForm.currentRole}
                    onChange={(e) => setLeadForm({ ...leadForm, currentRole: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white"
                  >
                    <option value="BPO / Call Center">BPO / Call Center</option>
                    <option value="Fresher / Job Seeker">Fresher / Job Seeker</option>
                    <option value="Hospital Staff / Nurse">Hospital Staff / Nurse</option>
                    <option value="Medical Coding Trainee">Medical Coding Trainee</option>
                    <option value="Data Entry / IT Support">Data Entry / IT Support</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    EXPERIENCE (YRS)
                  </label>
                  <input
                    type="text"
                    value={leadForm.experienceYrs}
                    onChange={(e) => setLeadForm({ ...leadForm, experienceYrs: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  LOCATION
                </label>
                <input
                  type="text"
                  value={leadForm.location}
                  onChange={(e) => setLeadForm({ ...leadForm, location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white"
                />
              </div>

              {/* Row 6: Interested Course + Budget */}
              <div className="grid grid-cols-12 gap-2.5">
                <div className="col-span-8">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    INTERESTED COURSE
                  </label>
                  <select
                    value={leadForm.course}
                    onChange={(e) => setLeadForm({ ...leadForm, course: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white"
                  >
                    {COURSE_CATEGORIES.map((cat) => (
                      <optgroup key={cat.category} label={cat.title}>
                        {cat.courses.map((c) => {
                          const val = `${c.code} - ${c.name}`;
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
                <div className="col-span-4">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    BUDGET
                  </label>
                  <select
                    value={leadForm.budget}
                    onChange={(e) => setLeadForm({ ...leadForm, budget: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white"
                  >
                    <option value="₹20K-30K">₹20K-30K</option>
                    <option value="₹15K-20K">₹15K-20K</option>
                    <option value="₹30K-40K">₹30K-40K</option>
                    <option value="₹40K+">₹40K+</option>
                  </select>
                </div>
              </div>

              {/* Batch Timing */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  BATCH TIMING
                </label>
                <input
                  type="text"
                  value={leadForm.batchTiming}
                  onChange={(e) => setLeadForm({ ...leadForm, batchTiming: e.target.value })}
                  placeholder="e.g. Weekend (Sat-Sun) or 8-10 PM Weekdays"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white"
                />
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
                  placeholder="e.g. Will discuss with family"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white"
                />
              </div>

              {/* Live Notes */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  LIVE NOTES
                </label>
                <textarea
                  rows="3"
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  placeholder="What did the lead say? Any objections, budget, timing preference..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs leading-relaxed text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white transition-all font-sans"
                />
              </div>

              {/* Call Outcome 6 Cards */}
              <div className="pt-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
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

              {/* Bottom yellow conversion stats */}
              <div className="bg-[#fffbeb] border border-amber-300/80 rounded-2xl p-3 text-center text-xs font-bold text-amber-900 font-mono">
                💡 Avg CPL: ₹147 · Conv rate: 38%
              </div>
            </div>

          </div>

          {/* ── UPLOAD CALL RECORDING SECTION ──────────────────────────── */}
          <div className="pt-2">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono mb-2 flex items-center gap-1.5">
              <span>🎙</span>
              <span>CALL RECORDING — UPLOAD FROM YOUR PHONE</span>
            </div>

            {/* Cyan dashed upload box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-cyan-200 hover:border-cyan-400 bg-cyan-50/30 hover:bg-cyan-50/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#00897b] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Upload className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {uploadedFileName || 'Click to upload call recording'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    M4A · MP3 · WAV · AAC · OPUS · max 50 MB
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Browse Files
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.m4a,.mp3,.wav,.aac,.opus,.webm"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Audio Preview if audio recorded or uploaded */}
            {recordedAudioUrl && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold shrink-0">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-emerald-950">
                      {uploadedFileName ? `Audio: ${uploadedFileName}` : `Mic Audio (${formatTimer(callSeconds)})`}
                    </div>
                    <div className="text-[10.5px] text-emerald-700">Ready to save with call record</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <audio controls src={recordedAudioUrl} className="h-8 max-w-xs w-full accent-[#0e6977]" />
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
                <Volume2 className="w-4 h-4 text-[#0e6977]" />
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
                No past recordings on file. Calls dialed above or uploaded will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[9.5px] tracking-wider border-b border-slate-200">
                      <th className="py-2.5 px-3">DATE & TIME</th>
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
                            <audio controls src={recordingUrl(rec.audioUrl)} className="h-7 w-56 max-w-full accent-[#0e6977]" />
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

        {/* ── BOTTOM FOOTER ACTION BAR (matching screenshot) ──────────── */}
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

          {/* Save & Close Button */}
          <button
            type="button"
            onClick={handleSaveAndClose}
            disabled={saving}
            className="bg-[#c29d59] hover:bg-[#af8b47] disabled:opacity-60 text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{saving ? 'Saving…' : '✓ Save & Close'}</span>
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
            showToast(`✓ Demo booked for ${demo.studentName}! Routed to trainer ${demo.trainer || ''}.`);
          } catch (e) {
            console.warn('Failed to save demo in modal:', e);
            showToast(`Could not save demo: ${e.message}`);
          }
        }}
      />
    </div>
  );
}
