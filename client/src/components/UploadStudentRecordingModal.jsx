import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  UploadCloud,
  X,
  Search,
  User,
  Phone,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileAudio,
  Trash2,
  BookOpen,
  Hash,
  ChevronDown
} from 'lucide-react';
import { saveRecording } from '../services/api';

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(file);
});

const readDuration = (file) => new Promise((resolve) => {
  const url = URL.createObjectURL(file);
  const a = new Audio();
  a.preload = 'metadata';
  const done = (v) => {
    URL.revokeObjectURL(url);
    resolve(v);
  };
  a.onloadedmetadata = () => done(Number.isFinite(a.duration) ? Math.round(a.duration) : 0);
  a.onerror = () => done(0);
  setTimeout(() => done(0), 4000);
  a.src = url;
});

const formatSec = (sec) => {
  const s = Number(sec) || 0;
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}m ${rem < 10 ? '0' : ''}${rem}s`;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const getNowLocalDateTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
  return localISOTime;
};

const OUTCOME_OPTIONS = [
  'Follow-up Needed',
  'Will Join',
  'Demo Booked',
  'Call Back',
  'Enrolled / Admitted',
  'Fee Discussion',
  'Doubt Clearance',
  'Counselling Done',
  'Not Reachable',
  'Not Interested',
  'General Enquiry'
];

export default function UploadStudentRecordingModal({
  isOpen,
  onClose,
  onUploaded,
  currentUser,
  students = [],
  leads = [],
  initialStudent = null
}) {
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  const [studentSearch, setStudentSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isManualEntry, setIsManualEntry] = useState(false);

  // Form Fields
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentCustomId, setStudentCustomId] = useState('');
  const [studentCourse, setStudentCourse] = useState('');
  const [counselorName, setCounselorName] = useState('');
  const [recordedAt, setRecordedAt] = useState(getNowLocalDateTime());
  const [outcome, setOutcome] = useState('Follow-up Needed');
  const [notes, setNotes] = useState('');

  // Audio File State
  const [audioFile, setAudioFile] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // UI State
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize or reset when opened
  useEffect(() => {
    if (isOpen) {
      setCounselorName(currentUser?.name || '');
      setRecordedAt(getNowLocalDateTime());
      setOutcome('Follow-up Needed');
      setNotes('');
      setErrorMessage('');
      setAudioFile(null);
      setAudioDuration(0);
      setAudioPreviewUrl('');

      if (initialStudent) {
        handleSelectStudent(initialStudent);
      } else {
        setSelectedStudent(null);
        setStudentName('');
        setStudentPhone('');
        setStudentCustomId('');
        setStudentCourse('');
        setIsManualEntry(false);
        setStudentSearch('');
      }
    } else {
      // Clean up audio object URL
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl('');
      }
    }
  }, [isOpen, initialStudent, currentUser]);

  // Click outside to close student dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered students & leads list for search
  const filteredCandidates = useMemo(() => {
    const q = (studentSearch || '').toLowerCase().trim();
    const result = [];
    const seenPhones = new Set();

    // 1. Check Admitted / Enrolled Students
    (students || []).forEach((s) => {
      const name = s.name || '';
      const phone = s.phone || '';
      const sId = s.studentId || s.id || '';
      const course = s.course || '';

      if (!q || name.toLowerCase().includes(q) || phone.includes(q) || sId.toLowerCase().includes(q) || course.toLowerCase().includes(q)) {
        result.push({
          type: 'student',
          _id: s._id,
          studentId: sId,
          name,
          phone,
          course,
          batchDate: s.batchDate,
          hrName: s.hrName,
          raw: s
        });
        if (phone) seenPhones.add(phone.replace(/\D/g, '').slice(-10));
      }
    });

    // 2. Also search Leads if not already included
    (leads || []).forEach((l) => {
      const name = l.fullName || l.name || '';
      const phone = l.phone || '';
      const course = l.course || '';
      const digits = phone.replace(/\D/g, '').slice(-10);

      if (digits && seenPhones.has(digits)) return; // Avoid exact duplicate phone

      if (!q || name.toLowerCase().includes(q) || phone.includes(q) || course.toLowerCase().includes(q)) {
        result.push({
          type: 'lead',
          _id: l._id,
          studentId: l.admittedStudentId || '',
          name,
          phone,
          course,
          stage: l.stage,
          hrName: l.counselorAssigned || l.allocatedTo || l.spokenBy,
          raw: l
        });
      }
    });

    return result.slice(0, 15);
  }, [studentSearch, students, leads]);

  const handleSelectStudent = (candidate) => {
    setSelectedStudent(candidate);
    setStudentName(candidate.name || candidate.fullName || '');
    setStudentPhone(candidate.phone || candidate.whatsappNumber || '');
    setStudentCustomId(candidate.studentId || candidate.id || '');
    setStudentCourse(candidate.course || '');
    setShowDropdown(false);
    setStudentSearch('');
    setIsManualEntry(false);
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setStudentName('');
    setStudentPhone('');
    setStudentCustomId('');
    setStudentCourse('');
    setStudentSearch('');
  };

  const processAudioFile = async (file) => {
    if (!file) return;
    setErrorMessage('');

    if (file.size > MAX_FILE_BYTES) {
      setErrorMessage(`Selected audio file is too large (${formatFileSize(file.size)}). Max allowed is 50 MB.`);
      return;
    }

    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setAudioPreviewUrl(previewUrl);
    setAudioFile(file);

    try {
      const dur = await readDuration(file);
      setAudioDuration(dur);
    } catch {
      setAudioDuration(0);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) processAudioFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAudioFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!studentName.trim()) {
      setErrorMessage('Please select a student or enter the student name.');
      return;
    }
    if (!studentPhone.trim()) {
      setErrorMessage('Please provide a contact phone number for the student.');
      return;
    }
    if (!audioFile) {
      setErrorMessage('Please choose or drop an audio recording file to upload.');
      return;
    }

    try {
      setIsUploading(true);

      const audioBase64 = await readAsDataUrl(audioFile);

      const payload = {
        leadName: studentName.trim(),
        leadPhone: studentPhone.trim(),
        studentId: studentCustomId || selectedStudent?.studentId || '',
        studentMongoId: selectedStudent?.type === 'student' ? selectedStudent._id : undefined,
        leadId: selectedStudent?.type === 'lead' ? selectedStudent._id : undefined,
        counselorName: counselorName.trim() || currentUser?.name || 'HR Team',
        counselorPhone: currentUser?.phone || '',
        durationSeconds: Number(audioDuration) || 0,
        outcome: outcome || 'Follow-up Needed',
        notes: notes.trim(),
        audioBase64,
        fileName: audioFile.name,
        source: 'manual_upload',
        recordedAt: recordedAt ? new Date(recordedAt).toISOString() : new Date().toISOString()
      };

      const result = await saveRecording(payload);

      setIsUploading(false);
      if (onUploaded) {
        onUploaded(result, studentName.trim());
      }
      onClose();
    } catch (err) {
      console.error('Failed to upload call recording:', err);
      setIsUploading(false);
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to upload call recording. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/90 my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-[#0e6977] to-[#125863] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shadow-inner">
              <UploadCloud className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                Upload Call Recording
              </h2>
              <p className="text-[11.5px] text-teal-100/90 font-medium mt-0.5">
                Attach an audio recording to a student with duration and outcome notes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Student Selection Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#0e6977]" />
                <span>1. Select Student <span className="text-rose-500">*</span></span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsManualEntry(!isManualEntry);
                  if (!isManualEntry) handleClearStudent();
                }}
                className="text-[11px] font-bold text-[#0e6977] hover:underline cursor-pointer"
              >
                {isManualEntry ? '← Search from Student List' : 'Enter Details Manually →'}
              </button>
            </div>

            {!isManualEntry ? (
              <div className="space-y-2">
                {selectedStudent ? (
                  /* Selected Student Card */
                  <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#0e6977] text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                        {(studentName || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900 truncate">
                            {studentName}
                          </span>
                          {studentCustomId && (
                            <span className="px-2 py-0.5 rounded-md bg-[#0e6977]/10 text-[#0e6977] text-[10.5px] font-mono font-bold">
                              {studentCustomId}
                            </span>
                          )}
                          {studentCourse && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold truncate max-w-[150px]">
                              {studentCourse}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 font-mono flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{studentPhone}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearStudent}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 hover:text-rose-600 transition-colors shrink-0 cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  /* Searchable Student Dropdown */
                  <div className="relative" ref={dropdownRef}>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search student by Name, Student ID, Phone, or Course..."
                        value={studentSearch}
                        onChange={(e) => {
                          setStudentSearch(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0e6977] focus:bg-white font-medium transition-all"
                      />
                      <ChevronDown
                        className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                        onClick={() => setShowDropdown(!showDropdown)}
                      />
                    </div>

                    {showDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-xl z-20 divide-y divide-slate-100">
                        {filteredCandidates.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500">
                            No students found matching "{studentSearch}".
                            <button
                              type="button"
                              onClick={() => {
                                setIsManualEntry(true);
                                setStudentName(studentSearch);
                                setShowDropdown(false);
                              }}
                              className="block mx-auto mt-2 text-xs font-bold text-[#0e6977] hover:underline"
                            >
                              + Enter manually as a new caller
                            </button>
                          </div>
                        ) : (
                          filteredCandidates.map((c) => (
                            <button
                              key={`${c.type}-${c._id || c.studentId || c.phone}`}
                              type="button"
                              onClick={() => handleSelectStudent(c)}
                              className="w-full px-4 py-2.5 text-left hover:bg-teal-50/60 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-slate-900 group-hover:text-[#0e6977]">
                                    {c.name}
                                  </span>
                                  {c.studentId && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                                      {c.studentId}
                                    </span>
                                  )}
                                  <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                                    c.type === 'student' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {c.type === 'student' ? 'Admitted Student' : 'Lead'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                                  <span>{c.phone}</span>
                                  {c.course && <span>• {c.course}</span>}
                                </div>
                              </div>
                              <span className="text-xs font-bold text-[#0e6977] opacity-0 group-hover:opacity-100 transition-opacity">
                                Select →
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Manual Entry Form */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Student Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0e6977]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-mono placeholder-slate-400 focus:outline-none focus:border-[#0e6977]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Student ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TF-2024-001"
                    value={studentCustomId}
                    onChange={(e) => setStudentCustomId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-mono placeholder-slate-400 focus:outline-none focus:border-[#0e6977]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Course / Topic (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Full Stack Python"
                    value={studentCourse}
                    onChange={(e) => setStudentCourse(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0e6977]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Audio File Upload Section */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileAudio className="w-3.5 h-3.5 text-[#0e6977]" />
                <span>2. Audio Recording File <span className="text-rose-500">*</span></span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                Max 50MB (m4a, mp3, amr, wav, webm, ogg, aac)
              </span>
            </label>

            {!audioFile ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                  dragActive
                    ? 'border-[#0e6977] bg-teal-50'
                    : 'border-slate-300 hover:border-[#0e6977] bg-slate-50/70 hover:bg-teal-50/30'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 text-[#0e6977] flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Click to select audio recording, or drag and drop here
                </div>
                <p className="text-[11px] text-slate-400">
                  Audio recordings from call apps, phones, or voice notes
                </p>
              </div>
            ) : (
              /* Selected Audio Card with Preview Player */
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-teal-100 text-[#0e6977] flex items-center justify-center shrink-0">
                      <FileAudio className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {audioFile.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                        <span>{formatFileSize(audioFile.size)}</span>
                        <span>•</span>
                        <span className="text-teal-700 font-bold">
                          {audioDuration > 0 ? `Duration: ${formatSec(audioDuration)}` : 'Duration loaded'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAudioFile(null);
                      setAudioDuration(0);
                      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
                      setAudioPreviewUrl('');
                    }}
                    className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Remove audio file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Inline Audio Preview Player */}
                {audioPreviewUrl && (
                  <div className="pt-2 border-t border-slate-200/80">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Audio Playback Preview
                    </div>
                    <audio
                      src={audioPreviewUrl}
                      controls
                      className="w-full h-8 accent-[#0e6977]"
                      preload="metadata"
                    />
                  </div>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.m4a,.amr,.3gp,.aac,.wav,.mp3,.webm,.ogg,.flac"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* 3. Call Metadata Section */}
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0e6977]" />
              <span>3. Call Metadata & Outcome</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Call Date & Time */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Call Date & Time
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={recordedAt}
                    onChange={(e) => setRecordedAt(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:border-[#0e6977] focus:bg-white"
                  />
                </div>
              </div>

              {/* Call Outcome */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Call Outcome
                </label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#0e6977] focus:bg-white cursor-pointer"
                >
                  {OUTCOME_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Counsellor / HR Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  HR Counsellor
                </label>
                <input
                  type="text"
                  placeholder="HR Name"
                  value={counselorName}
                  onChange={(e) => setCounselorName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0e6977] focus:bg-white font-medium"
                />
              </div>
            </div>

            {/* Duration override if duration wasn't detected */}
            {audioFile && audioDuration === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-amber-800">
                <span>Audio duration could not be auto-detected. Enter duration in seconds:</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Secs"
                  value={audioDuration || ''}
                  onChange={(e) => setAudioDuration(Number(e.target.value) || 0)}
                  className="w-24 px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            )}

            {/* Notes / Discussion Summary */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Call Notes / Summary (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Key discussion points, student concerns, agreed follow-up action..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0e6977] focus:bg-white transition-all resize-none"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !audioFile || !studentName.trim() || !studentPhone.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#0e6977] hover:bg-[#0b5560] text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-teal-200" />
                  <span>Uploading Recording...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-teal-200" />
                  <span>Upload Recording</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
