import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Target, 
  Award, 
  AlertTriangle, 
  Search, 
  Sparkles, 
  Filter, 
  Clock, 
  User, 
  BookOpen, 
  MessageSquare, 
  Cpu, 
  Check, 
  X,
  TrendingUp,
  Save
} from 'lucide-react';
import { updateStudentReadiness } from '../services/api';

/**
 * Job-Ready Status & Placement Readiness for trainer's allocated students.
 * Trainers evaluate each student across 4 key pillars:
 * 1. Technical Knowledge
 * 2. Assessments
 * 3. Communication
 * 4. Interview Preparation
 */
export default function TrainingPlacementPrep({ currentUser = {}, students = [], onStudentUpdated }) {
  const [toastMessage, setToastMessage] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [batchFilter, setBatchFilter] = useState('All');

  const flash = (msg) => { 
    setToastMessage(msg); 
    setTimeout(() => setToastMessage(null), 3800); 
  };
  const num = (v) => (typeof v === 'number' && !isNaN(v) ? v : null);

  const getCanonicalStatus = (st) => {
    if (st.jobReadyStatus) return st.jobReadyStatus;
    if (st.trainerRecommendation === 'Ready') return 'Job Ready';
    if (st.trainerRecommendation === 'Needs Revision') return 'Needs Revision';
    if (st.trainerRecommendation === 'Not Ready') return 'Not Ready';
    return '';
  };

  // Distinct batches for filter
  const batchesList = useMemo(() => {
    const set = new Set();
    students.forEach(s => {
      if (s.batchName) set.add(s.batchName);
    });
    return Array.from(set).sort();
  }, [students]);

  // Overall KPI statistics
  const stats = useMemo(() => {
    const total = students.length;
    let ready = 0;
    let revision = 0;
    let notReady = 0;
    let pending = 0;
    let scoreSum = 0;
    let scoreCount = 0;

    students.forEach(s => {
      const st = getCanonicalStatus(s);
      if (st === 'Job Ready' || st === 'Ready') ready++;
      else if (st === 'Needs Revision') revision++;
      else if (st === 'Not Ready') notReady++;
      else pending++;

      if (typeof s.readinessScore === 'number') {
        scoreSum += s.readinessScore;
        scoreCount++;
      }
    });

    const avgScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0;
    const readyPct = total > 0 ? Math.round((ready / total) * 100) : 0;

    return { total, ready, revision, notReady, pending, avgScore, readyPct };
  }, [students]);

  // Calculate live readiness for draft
  const getDraftReadiness = (st, d = {}) => {
    const tech = d.technicalScore !== undefined && d.technicalScore !== '' 
      ? Number(d.technicalScore) 
      : num(st.technicalScore);

    const assess = d.assessmentScore !== undefined && d.assessmentScore !== '' 
      ? Number(d.assessmentScore) 
      : num(st.assessmentScore);

    const comm = d.communicationScore !== undefined && d.communicationScore !== '' 
      ? Number(d.communicationScore) 
      : num(st.communicationScore);

    const interview = d.interviewPrepScore !== undefined && d.interviewPrepScore !== '' 
      ? Number(d.interviewPrepScore) 
      : (d.mockScore !== undefined && d.mockScore !== '' ? Number(d.mockScore) : (num(st.interviewPrepScore) ?? num(st.mockScore)));

    const parts = [tech, assess, comm, interview].filter(v => v !== null && !isNaN(v));
    if (parts.length === 0) return num(st.readinessScore);
    return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  };

  const updateDraft = (studentId, field, val) => {
    setDrafts(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: val
      }
    }));
  };

  const handleSaveReadiness = async (student, targetStatus) => {
    const id = student._id || student.studentId;
    const d = drafts[id] || {};
    const status = targetStatus || d.status || getCanonicalStatus(student) || 'Job Ready';

    setSavingId(id);
    try {
      const payload = {
        status,
        jobReadyStatus: status,
        trainerName: currentUser?.name || '',
        technicalScore: d.technicalScore !== undefined && d.technicalScore !== '' ? Number(d.technicalScore) : student.technicalScore,
        assessmentScore: d.assessmentScore !== undefined && d.assessmentScore !== '' ? Number(d.assessmentScore) : student.assessmentScore,
        communicationScore: d.communicationScore !== undefined && d.communicationScore !== '' ? Number(d.communicationScore) : student.communicationScore,
        interviewPrepScore: d.interviewPrepScore !== undefined && d.interviewPrepScore !== '' ? Number(d.interviewPrepScore) : (student.interviewPrepScore ?? student.mockScore),
        feedback: d.feedback !== undefined ? d.feedback : (student.readinessFeedback || '')
      };

      const updated = await updateStudentReadiness(id, payload);
      onStudentUpdated?.(updated);
      setDrafts(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      flash(`${student.name}: Readiness updated as "${status}"${status === 'Job Ready' || status === 'Ready' ? ' · Referred to CCCP' : ''}`);
    } catch (e) {
      flash(`Could not save: ${e?.response?.data?.error || e.message}`);
    }
    setSavingId(null);
  };

  // Filtered students list
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = !searchQuery || 
        (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.studentId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.course || '').toLowerCase().includes(searchQuery.toLowerCase());

      const status = getCanonicalStatus(s);
      let matchStatus = true;
      if (statusFilter === 'Job Ready') matchStatus = status === 'Job Ready' || status === 'Ready';
      else if (statusFilter === 'Needs Revision') matchStatus = status === 'Needs Revision';
      else if (statusFilter === 'Not Ready') matchStatus = status === 'Not Ready';
      else if (statusFilter === 'Pending') matchStatus = !status;

      const matchBatch = batchFilter === 'All' || s.batchName === batchFilter;

      return matchSearch && matchStatus && matchBatch;
    });
  }, [students, searchQuery, statusFilter, batchFilter]);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#0f242d] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-teal-500/30 text-xs font-semibold animate-slideDown">
          <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#07242b] via-[#0c343d] to-[#082830] text-white rounded-3xl p-6 sm:p-7 shadow-sm border border-teal-900/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Trainer Evaluation Desk
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  CCCP Placement Cell Sync
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>🎯</span> Student Job-Ready Status
              </h1>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Evaluate each student's job readiness across <strong className="text-teal-300 font-semibold">Technical Knowledge</strong>, <strong className="text-teal-300 font-semibold">Assessments</strong>, <strong className="text-teal-300 font-semibold">Communication</strong>, and <strong className="text-teal-300 font-semibold">Interview Preparation</strong>. Marking a student as <strong className="text-emerald-300 font-semibold">"Job Ready"</strong> automatically forwards their profile to the CCCP Placement Cell.
              </p>
            </div>

            {/* Quick KPI stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-black/20 p-3 rounded-2xl border border-white/10 shrink-0 text-center">
              <div className="px-3 py-1">
                <div className="text-xl font-black text-white">{stats.total}</div>
                <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Students</div>
              </div>
              <div className="px-3 py-1 border-l border-white/10">
                <div className="text-xl font-black text-emerald-400">{stats.ready}</div>
                <div className="text-[9.5px] font-bold text-emerald-300 uppercase tracking-wider">Job Ready</div>
              </div>
              <div className="px-3 py-1 border-l border-white/10">
                <div className="text-xl font-black text-amber-400">{stats.revision}</div>
                <div className="text-[9.5px] font-bold text-amber-300 uppercase tracking-wider">Revision</div>
              </div>
              <div className="px-3 py-1 border-l border-white/10">
                <div className="text-xl font-black text-teal-300">{stats.avgScore}%</div>
                <div className="text-[9.5px] font-bold text-teal-200 uppercase tracking-wider">Avg Readiness</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Rubric Info Box */}
      <div className="p-4 rounded-2xl bg-[#eff6ff] border border-[#bfdbfe] text-xs text-[#1e40af] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-2.5">
          <span className="text-lg">💡</span>
          <div className="leading-relaxed">
            <strong className="font-bold">4-Pillar Evaluation Criteria:</strong> Readiness score (0–100%) is computed from <strong>1) Technical Knowledge</strong>, <strong>2) Weekly & Mock Assessments</strong>, <strong>3) Communication & Professional Demeanor</strong>, and <strong>4) Interview Preparation</strong>. All updates reflect instantly on the student record, HR handover desk, and CCCP candidate pipeline.
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student by name, student ID or course..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
            {['All', 'Job Ready', 'Needs Revision', 'Not Ready', 'Pending'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all text-[11px] ${
                  statusFilter === filter 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {filter === 'All' ? `All (${stats.total})` : filter}
              </button>
            ))}
          </div>

          {/* Batch Selector */}
          {batchesList.length > 0 && (
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500"
            >
              <option value="All">All Batches</option>
              {batchesList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Student Cards Grid */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center text-xs text-slate-500 space-y-2">
          <div className="text-3xl">🔍</div>
          <div className="font-bold text-slate-800 text-sm">No students found</div>
          <div>Try adjusting your search terms or filter selection.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStudents.map(student => {
            const id = student._id || student.studentId;
            const d = drafts[id] || {};
            const isModified = Object.keys(d).length > 0;
            const currentStatus = d.status || getCanonicalStatus(student);
            const liveReadiness = getDraftReadiness(student, d);
            
            const ringColor = liveReadiness === null 
              ? '#cbd5e1' 
              : liveReadiness < 65 
                ? '#ef4444' 
                : liveReadiness < 80 
                  ? '#f59e0b' 
                  : '#10b981';

            const radius = 34;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - ((liveReadiness || 0) / 100) * circumference;

            const isWeak = (num(student.attendancePct) !== null && student.attendancePct < 80) || 
              (num(student.assessmentScore) !== null && student.assessmentScore < 60);

            // 4 evaluation pillars
            const pillars = [
              { 
                key: 'technicalScore', 
                label: 'Technical Knowledge', 
                icon: '💻', 
                current: student.technicalScore,
                hint: 'Core coding & concepts'
              },
              { 
                key: 'assessmentScore', 
                label: 'Assessments', 
                icon: '📝', 
                current: student.assessmentScore,
                hint: 'Weekly & mock tests'
              },
              { 
                key: 'communicationScore', 
                label: 'Communication', 
                icon: '🗣️', 
                current: student.communicationScore,
                hint: 'English & presentation'
              },
              { 
                key: 'interviewPrepScore', 
                label: 'Interview Prep', 
                icon: '🎯', 
                current: student.interviewPrepScore ?? student.mockScore,
                hint: 'Mock interview & HR'
              }
            ];

            return (
              <div 
                key={id} 
                className={`bg-white rounded-3xl border transition-all flex flex-col justify-between shadow-xs hover:shadow-md ${
                  isModified ? 'border-teal-400 ring-2 ring-teal-100' : 'border-slate-200/90'
                } p-5 space-y-4`}
              >
                <div>
                  {/* Card Header: Student Name & Badges */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 truncate">{student.name}</span>
                        {isWeak && (
                          <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9.5px] font-black uppercase">
                            Weak
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {[student.studentId, student.course, student.batchName].filter(Boolean).join(' · ')}
                      </div>
                    </div>

                    {/* Job Ready Status & Approval Pills */}
                    <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
                      {currentStatus === 'Job Ready' || currentStatus === 'Ready' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                          Job Ready
                        </span>
                      ) : currentStatus === 'Needs Revision' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs">
                          <AlertTriangle className="w-3 h-3" />
                          Needs Revision
                        </span>
                      ) : currentStatus === 'Not Ready' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 shadow-2xs">
                          <X className="w-3 h-3 stroke-[2.5]" />
                          Not Ready
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Pending
                        </span>
                      )}
                      {student.courseCompletionApproved && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 shadow-2xs">
                          <Award className="w-2.5 h-2.5" />
                          Cert Approved
                        </span>
                      )}
                      {student.examApprovedByTrainer && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Exam Approved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Readiness Circle & Summary */}
                  <div className="py-3 flex items-center justify-between gap-4 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100 my-2">
                    <div className="flex items-center gap-3">
                      <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r={radius} stroke="#e2e8f0" strokeWidth="8" fill="transparent" />
                          <circle 
                            cx="50" 
                            cy="50" 
                            r={radius} 
                            stroke={ringColor} 
                            strokeWidth="8" 
                            strokeDasharray={circumference} 
                            strokeDashoffset={offset} 
                            strokeLinecap="round" 
                            fill="transparent" 
                            className="transition-all duration-500 ease-out" 
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-sm font-black text-slate-900 tracking-tight leading-none">
                            {liveReadiness === null ? '—' : `${liveReadiness}%`}
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900">Overall Readiness</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {liveReadiness >= 80 ? 'Placement target met (80%+)' : liveReadiness >= 65 ? 'Approaching placement threshold' : 'Requires further coaching'}
                        </div>
                        {isModified && (
                          <div className="text-[10px] font-bold text-teal-700 mt-0.5 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Live preview
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-[10px] text-slate-400 font-medium shrink-0">
                      <div>Attendance: <strong className="text-slate-700">{student.attendancePct != null ? `${student.attendancePct}%` : '—'}</strong></div>
                      <div>HR: <strong className="text-slate-700">{student.hrName || '—'}</strong></div>
                    </div>
                  </div>

                  {/* The 4 Evaluation Pillars Inputs */}
                  <div className="space-y-2 mt-3">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 px-0.5">
                      4 Readiness Pillars (0 – 100)
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {pillars.map(p => {
                        const val = d[p.key] !== undefined ? d[p.key] : (num(p.current) ?? '');
                        return (
                          <div key={p.key} className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl p-2.5 transition-all">
                            <div className="flex items-center justify-between gap-1 text-[10.5px] font-bold text-slate-700">
                              <span className="flex items-center gap-1 truncate">
                                <span>{p.icon}</span>
                                <span className="truncate">{p.label}</span>
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={val}
                                placeholder="—"
                                onChange={(e) => updateDraft(id, p.key, e.target.value)}
                                className="w-full text-center text-xs font-black text-slate-900 bg-white rounded-lg border border-slate-200 py-1 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
                              />
                              <span className="text-[11px] font-bold text-slate-400">%</span>
                            </div>
                            <div className="text-[9.5px] text-slate-400 font-medium mt-1 truncate">
                              {p.hint}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Feedback / Notes Input */}
                  <div className="mt-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-0.5 block mb-1">
                      Trainer Remarks & Readiness Feedback
                    </label>
                    <input
                      type="text"
                      value={d.feedback !== undefined ? d.feedback : (student.readinessFeedback || '')}
                      onChange={(e) => updateDraft(id, 'feedback', e.target.value)}
                      placeholder="e.g. Strong SQL & coding, needs confidence in HR rounds..."
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-teal-500 focus:bg-white text-slate-800"
                    />
                  </div>
                </div>

                {/* Action Buttons: Status selector & Save */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="text-[10.5px] font-bold text-slate-600 flex items-center justify-between">
                    <span>Set Job-Ready Status:</span>
                    {student.readinessEvaluatedAt && (
                      <span className="text-[9.5px] text-slate-400 font-normal">
                        Evaluated {new Date(student.readinessEvaluatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { status: 'Job Ready', bg: 'bg-[#00897b]', text: '✓ Job Ready' },
                      { status: 'Needs Revision', bg: 'bg-[#f59e0b]', text: '⚡ Revision' },
                      { status: 'Not Ready', bg: 'bg-[#ef4444]', text: '✕ Not Ready' }
                    ].map(btn => (
                      <button
                        key={btn.status}
                        disabled={savingId === id}
                        onClick={() => handleSaveReadiness(student, btn.status)}
                        className={`py-2 px-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer text-center disabled:opacity-50 ${
                          currentStatus === btn.status 
                            ? `${btn.bg} text-white shadow-xs font-bold` 
                            : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {btn.text}
                      </button>
                    ))}
                  </div>

                  {isModified && (
                    <button
                      disabled={savingId === id}
                      onClick={() => handleSaveReadiness(student, currentStatus || 'Job Ready')}
                      className="w-full py-2 rounded-xl text-xs font-bold bg-[#0f242d] hover:bg-[#1a3845] text-teal-300 flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save 4-Pillar Evaluation</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
