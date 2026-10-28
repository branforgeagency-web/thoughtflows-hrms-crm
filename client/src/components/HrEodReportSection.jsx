import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Edit3, 
  Eye, 
  User, 
  Calendar, 
  PhoneCall, 
  Target, 
  Award, 
  Building2, 
  RefreshCw,
  Play,
  LogOut,
  Sparkles
} from 'lucide-react';
import { getDailyClosures, reviewDailyClosure } from '../services/api';

export default function HrEodReportSection({
  currentUser,
  userName = '',
  branchName = '',
  todayKey = '',
  todayDisplay = '',
  attendanceRecord = null,
  sessionStatus = 'Not Started',
  workStartTimeFormatted = '',
  workEndTimeFormatted = '',
  workingDurationText = '',
  closureMetrics = null,
  computedDailyMetrics = null,
  customMetrics = null,
  setCustomMetrics = null,
  closureSubmitted = false,
  closureSubmittedAt = '',
  eodSummaryText = '',
  setEodSummaryText = null,
  onSubmitEod = null,
  onStartWorkClick = null,
  onCloseWorkClick = null,
  isElevatedUser = false,
  showToast = () => {}
}) {
  const [submitting, setSubmitting] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [editingMetric, setEditingMetric] = useState(null);

  // For HR Head / Admin / Leadership: switch between My EOD and Team EOD Submissions
  const [elevatedTab, setElevatedTab] = useState('my-eod'); // 'my-eod' | 'team-submissions'
  const [teamClosures, setTeamClosures] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const loadTeamClosures = async () => {
    if (!isElevatedUser) return;
    setLoadingTeam(true);
    try {
      const data = await getDailyClosures({ date: todayKey });
      if (Array.isArray(data)) {
        setTeamClosures(data);
      }
    } catch (err) {
      console.warn('Failed to load team closures:', err);
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    if (isElevatedUser && elevatedTab === 'team-submissions') {
      loadTeamClosures();
    }
  }, [isElevatedUser, elevatedTab, todayKey]);

  const handleReviewTeamClosure = async (closureId) => {
    try {
      const updated = await reviewDailyClosure(closureId);
      setTeamClosures(prev => prev.map(c => ((c._id || c.id) === closureId ? updated : c)));
      showToast('✓ EOD report marked reviewed by HR Head');
    } catch (e) {
      showToast(e?.response?.data?.error || 'Could not mark the report reviewed');
    }
  };

  const handleSubmit = async () => {
    if (!eodSummaryText.trim()) {
      showToast('⚠ Please enter a brief summary of today\'s work completed before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      if (onSubmitEod) {
        await onSubmitEod(eodSummaryText);
        setReviewMode(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Word count & character count
  const wordCount = useMemo(() => {
    const trimmed = (eodSummaryText || '').trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [eodSummaryText]);

  const charCount = (eodSummaryText || '').length;

  return (
    <div className="w-full space-y-6 text-left">
      {/* Top Banner / Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0e6977]/10 text-[#0e6977] border border-[#0e6977]/20 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <FileText className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0e6977] bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                  Official End-of-Day
                </span>
                <span className="text-xs font-mono text-slate-400 font-semibold">
                  {todayDisplay} ({todayKey})
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                HR Daily EOD Report &amp; Work Session
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Record your work summary and submit directly to the <strong>HR Head</strong> for review.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isElevatedUser && (
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
                <button
                  type="button"
                  onClick={() => setElevatedTab('my-eod')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    elevatedTab === 'my-eod' ? 'bg-white text-[#0e6977] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📝 My EOD Report
                </button>
                <button
                  type="button"
                  onClick={() => setElevatedTab('team-submissions')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    elevatedTab === 'team-submissions' ? 'bg-white text-[#0e6977] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  👥 Team Submissions ({teamClosures.length})
                </button>
              </div>
            )}

            {closureSubmitted ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300/80 px-3.5 py-2 rounded-2xl text-xs font-bold text-emerald-800 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Submitted to HR Head ({closureSubmittedAt || 'Today'})</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-300/80 px-3.5 py-2 rounded-2xl text-xs font-bold text-amber-800 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Pending EOD Submission</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ELEVATED VIEW: Review Team Submissions */}
      {isElevatedUser && elevatedTab === 'team-submissions' ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                HR Team EOD Submissions
              </h3>
              <p className="text-xs text-slate-500">
                Live End-of-Day reports submitted by HR counsellors and executives to the Head of HR
              </p>
            </div>
            <button
              onClick={loadTeamClosures}
              disabled={loadingTeam}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingTeam ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {teamClosures.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-10 text-center space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No EOD Reports Submitted Yet Today</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When HR team members click &ldquo;Submit EOD to HR Head&rdquo;, their reports and work session info will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamClosures.map((c, idx) => {
                const isAck = Boolean(c.reviewedAt);
                const timeLabel = c.submittedAt 
                  ? new Date(c.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Today EOD';

                return (
                  <div
                    key={c._id || c.id || idx}
                    className="bg-white border border-slate-200/90 hover:border-teal-300 rounded-2xl p-5 shadow-2xs transition-all space-y-4"
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-sm">
                          {(c.counselorName || 'HR')[0]}
                        </div>
                        <div>
                          <div className="text-base font-extrabold text-slate-900 leading-tight">
                            {c.counselorName || 'HR Executive'}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {c.branch || 'Branch not set'} &middot; Submitted at {timeLabel} &middot; Date: {c.date}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAck ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Reviewed{c.reviewedBy ? ` by ${c.reviewedBy}` : ''}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleReviewTeamClosure(c._id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-1.5 rounded-full shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Reviewed</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Work Session Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/90 border border-slate-200/70 rounded-xl px-4 py-2.5 text-xs">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-teal-600" />
                          <span className="font-medium text-slate-500">Work Session:</span>
                          <span className="font-bold text-slate-900">{c.workStartTime || 'Not Recorded'}</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-bold text-slate-900">{c.workEndTime || (c.workSessionStatus === 'Completed' ? 'Completed' : 'In Progress')}</span>
                        </div>
                        {Boolean(c.workingHoursText || c.workingMinutes) && (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <span className="font-medium text-slate-500">Duration:</span>
                            <span className="font-extrabold text-[#0e6977] bg-teal-100/70 px-2 py-0.5 rounded-md font-mono">
                              {c.workingHoursText || `${Math.floor((c.workingMinutes || 0) / 60)}h ${(c.workingMinutes || 0) % 60}m`}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        c.workSessionStatus === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : c.workSessionStatus === 'In Progress'
                            ? 'bg-cyan-50 text-cyan-700 border-cyan-200 animate-pulse'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {c.workSessionStatus || (c.workEndTime ? 'Completed' : 'In Progress')}
                      </span>
                    </div>

                    {/* Detailed Summary */}
                    {(c.summary || c.notes) && (
                      <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-4 text-xs space-y-1.5">
                        <div className="font-bold text-teal-950 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-teal-700" />
                          <span>Detailed Work Completed Summary:</span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed text-slate-800 bg-white/80 p-3 rounded-lg border border-teal-100 font-sans">
                          {c.summary || c.notes}
                        </p>
                      </div>
                    )}

                    {/* CRM Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1 text-center">
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                        <div className="text-[10px] text-slate-500 font-semibold">Calls Made</div>
                        <div className="text-base font-black text-slate-900 mt-0.5">{c.callsMade || 0}</div>
                        <div className="text-[9px] text-teal-600 font-medium">{c.connected || 0} conn</div>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                        <div className="text-[10px] text-slate-500 font-semibold">Demos Booked</div>
                        <div className="text-base font-black text-amber-600 mt-0.5">{c.demosBooked || 0}</div>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                        <div className="text-[10px] text-slate-500 font-semibold">Admissions</div>
                        <div className="text-base font-black text-emerald-600 mt-0.5">{c.admissions || 0}</div>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 sm:col-span-2">
                        <div className="text-[10px] text-slate-500 font-semibold">Fees Collected</div>
                        <div className="text-base font-black text-purple-700 mt-0.5">₹{(c.feesCollected || 0).toLocaleString('en-IN')}</div>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                        <div className="text-[10px] text-slate-500 font-semibold">Pending FUs</div>
                        <div className="text-base font-black text-rose-500 mt-0.5">{c.pendingFus || 0}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* STANDARD VIEW: My EOD Report Form & Work Session Card */
        <>
          {/* 1. Official Work Session Information Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#0e6977]" />
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Today&apos;s Work Session &amp; Attendance Details
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Session Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase border flex items-center gap-1.5 ${
                  sessionStatus === 'Completed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : sessionStatus === 'In Progress'
                      ? 'bg-teal-50 text-teal-800 border-teal-300 ring-2 ring-teal-200/60'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    sessionStatus === 'Completed' ? 'bg-emerald-500' : sessionStatus === 'In Progress' ? 'bg-teal-500 animate-ping' : 'bg-amber-400'
                  }`} />
                  {sessionStatus}
                </span>
              </div>
            </div>

            {/* 4 Detail Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Work Start Time */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 text-center">
                <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                  Work Start Time
                </div>
                <div className="text-lg sm:text-xl font-black text-slate-900 mt-1 font-mono">
                  {workStartTimeFormatted || 'Not Started'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Confirmed Check-in
                </div>
              </div>

              {/* Card 2: Work End Time */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 text-center">
                <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                  Work End Time
                </div>
                <div className={`text-lg sm:text-xl font-black mt-1 font-mono ${
                  workEndTimeFormatted ? 'text-slate-900' : sessionStatus === 'In Progress' ? 'text-teal-600' : 'text-slate-400'
                }`}>
                  {workEndTimeFormatted || (sessionStatus === 'In Progress' ? 'In Progress' : '--:--')}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Confirmed Logout
                </div>
              </div>

              {/* Card 3: Total Working Hours & Minutes */}
              <div className="bg-teal-50/60 border border-teal-200/80 rounded-2xl p-4 text-center">
                <div className="text-[10.5px] font-extrabold text-[#0e6977] uppercase tracking-wider">
                  Working Hours
                </div>
                <div className="text-lg sm:text-xl font-black text-[#0e6977] mt-1 font-mono">
                  {workingDurationText || '0 hrs 0 mins'}
                </div>
                <div className="text-[10px] text-teal-600 mt-0.5 font-medium">
                  {sessionStatus === 'In Progress' ? 'Live duration' : 'Total duration'}
                </div>
              </div>

              {/* Card 4: Quick Action */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 flex flex-col justify-center items-center gap-2">
                {sessionStatus === 'Not Started' && onStartWorkClick && (
                  <button
                    type="button"
                    onClick={onStartWorkClick}
                    className="w-full py-2.5 rounded-xl bg-[#0e6977] hover:bg-[#0a4f5a] text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white stroke-none" />
                    <span>Start Work</span>
                  </button>
                )}
                {sessionStatus === 'In Progress' && onCloseWorkClick && (
                  <button
                    type="button"
                    onClick={onCloseWorkClick}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Close Work</span>
                  </button>
                )}
                {sessionStatus === 'Completed' && (
                  <div className="text-center">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full">
                      ✓ Work Closed
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">Shift completed for today</p>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic pl-1">
              * Working hours are automatically calculated strictly between confirmed <strong>Start Work</strong> and <strong>Close Work</strong> timestamps.
            </p>
          </div>

          {/* 2. Detailed Work Summary Section */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                    Detailed Summary of Work Completed
                  </h3>
                  <span className="text-[11px] font-bold text-rose-500">* Required</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter a comprehensive overview of your calls, demos, follow-ups, student enrollments, and key achievements for today.
                </p>
              </div>

              {/* Edit / Review Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setReviewMode(false)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    !reviewMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewMode(true)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    reviewMode ? 'bg-white text-[#0e6977] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Review Preview</span>
                </button>
              </div>
            </div>

            {/* Mode 1: Edit Mode Textarea */}
            {!reviewMode ? (
              <div className="space-y-2">
                <textarea
                  value={eodSummaryText}
                  onChange={(e) => setEodSummaryText && setEodSummaryText(e.target.value)}
                  placeholder="Enter detailed summary of tasks completed today...&#10;&#10;Examples:&#10;• Contacted 25 prospective students; 18 connected calls.&#10;• Scheduled 3 online demo sessions for CPC Medical Coding with Faculty.&#10;• Closed 2 student admissions (Rajesh K. & Priya M.) and verified initial fee receipts.&#10;• Addressed student queries regarding exam booking slot timetable.&#10;• Handled overdue follow-ups and updated lead pipeline."
                  rows={8}
                  className="w-full text-xs sm:text-sm p-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0e6977] focus:ring-2 focus:ring-[#0e6977]/20 focus:outline-none transition-all font-sans leading-relaxed text-slate-800"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <div>
                    Tip: Be specific with numbers, student names, and any support needed from the HR Head.
                  </div>
                  <div className="font-mono">
                    {wordCount} words &middot; {charCount} characters
                  </div>
                </div>
              </div>
            ) : (
              /* Mode 2: Formatted Review Preview */
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/80">
                  <span className="font-bold text-slate-700">Preview as seen by HR Head</span>
                  <span className="text-slate-400 font-mono">{userName} &middot; {branchName}</span>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200/70 shadow-2xs">
                  {eodSummaryText.trim() ? (
                    <p className="whitespace-pre-wrap text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
                      {eodSummaryText}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No summary entered yet. Switch to Edit mode to write your daily work summary.
                    </p>
                  )}
                </div>

                <div className="text-[11px] text-slate-500">
                  This summary will be formally attached with your shift duration ({workingDurationText || '0 hrs 0 mins'}) and CRM performance numbers.
                </div>
              </div>
            )}
          </div>

          {/* 3. Daily CRM Metrics Breakdown */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Today&apos;s CRM Activity Metrics
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Synchronized with today&apos;s database activity. Click any number to correct if needed.
                </p>
              </div>
              <span className="text-[10px] text-teal-700 font-bold bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full">
                ↺ Auto-Synced from Database
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Box 1: Calls Made */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-center hover:border-teal-300 transition-all">
                {editingMetric === 'callsMade' ? (
                  <input
                    type="number"
                    min="0"
                    autoFocus
                    value={closureMetrics?.callsMade ?? 0}
                    onChange={(e) => setCustomMetrics && setCustomMetrics(prev => ({ ...(prev || closureMetrics), callsMade: Math.max(0, parseInt(e.target.value) || 0) }))}
                    onBlur={() => setEditingMetric(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingMetric(null)}
                    className="w-16 bg-white text-center text-xl font-extrabold text-[#0e6977] rounded outline-none border border-[#0e6977] mx-auto block"
                  />
                ) : (
                  <div 
                    onClick={() => setEditingMetric('callsMade')}
                    className="text-2xl font-black text-[#0e6977] cursor-pointer hover:scale-105 transition-transform"
                    title="Click to edit"
                  >
                    {closureMetrics?.callsMade ?? 0}
                  </div>
                )}
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mt-1">
                  CALLS MADE
                </div>
              </div>

              {/* Box 2: Connected */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-center hover:border-teal-300 transition-all">
                {editingMetric === 'connected' ? (
                  <input
                    type="number"
                    min="0"
                    autoFocus
                    value={closureMetrics?.connected ?? 0}
                    onChange={(e) => setCustomMetrics && setCustomMetrics(prev => ({ ...(prev || closureMetrics), connected: Math.max(0, parseInt(e.target.value) || 0) }))}
                    onBlur={() => setEditingMetric(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingMetric(null)}
                    className="w-16 bg-white text-center text-xl font-extrabold text-[#0e6977] rounded outline-none border border-[#0e6977] mx-auto block"
                  />
                ) : (
                  <div 
                    onClick={() => setEditingMetric('connected')}
                    className="text-2xl font-black text-[#0e6977] cursor-pointer hover:scale-105 transition-transform"
                    title="Click to edit"
                  >
                    {closureMetrics?.connected ?? 0}
                  </div>
                )}
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mt-1">
                  CONNECTED
                </div>
              </div>

              {/* Box 3: Demos Booked */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-center hover:border-teal-300 transition-all">
                {editingMetric === 'demosBooked' ? (
                  <input
                    type="number"
                    min="0"
                    autoFocus
                    value={closureMetrics?.demosBooked ?? 0}
                    onChange={(e) => setCustomMetrics && setCustomMetrics(prev => ({ ...(prev || closureMetrics), demosBooked: Math.max(0, parseInt(e.target.value) || 0) }))}
                    onBlur={() => setEditingMetric(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingMetric(null)}
                    className="w-16 bg-white text-center text-xl font-extrabold text-amber-600 rounded outline-none border border-amber-500 mx-auto block"
                  />
                ) : (
                  <div 
                    onClick={() => setEditingMetric('demosBooked')}
                    className="text-2xl font-black text-amber-600 cursor-pointer hover:scale-105 transition-transform"
                    title="Click to edit"
                  >
                    {closureMetrics?.demosBooked ?? 0}
                  </div>
                )}
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mt-1">
                  DEMOS BOOKED
                </div>
              </div>

              {/* Box 4: Admissions */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-center hover:border-teal-300 transition-all">
                {editingMetric === 'admissions' ? (
                  <input
                    type="number"
                    min="0"
                    autoFocus
                    value={closureMetrics?.admissions ?? 0}
                    onChange={(e) => setCustomMetrics && setCustomMetrics(prev => ({ ...(prev || closureMetrics), admissions: Math.max(0, parseInt(e.target.value) || 0) }))}
                    onBlur={() => setEditingMetric(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingMetric(null)}
                    className="w-16 bg-white text-center text-xl font-extrabold text-emerald-600 rounded outline-none border border-emerald-500 mx-auto block"
                  />
                ) : (
                  <div 
                    onClick={() => setEditingMetric('admissions')}
                    className="text-2xl font-black text-emerald-600 cursor-pointer hover:scale-105 transition-transform"
                    title="Click to edit"
                  >
                    {closureMetrics?.admissions ?? 0}
                  </div>
                )}
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mt-1">
                  ADMISSIONS
                </div>
              </div>

              {/* Box 5: Fees Collected */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-center hover:border-teal-300 transition-all">
                {editingMetric === 'feesCollected' ? (
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    autoFocus
                    value={closureMetrics?.rawFeesCollected ?? 0}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setCustomMetrics && setCustomMetrics(prev => ({ ...(prev || closureMetrics), feesCollected: val, rawFeesCollected: val }));
                    }}
                    onBlur={() => setEditingMetric(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingMetric(null)}
                    className="w-24 bg-white text-center text-lg font-extrabold text-purple-700 rounded outline-none border border-purple-500 mx-auto block font-mono"
                  />
                ) : (
                  <div 
                    onClick={() => setEditingMetric('feesCollected')}
                    className="text-xl sm:text-2xl font-black text-purple-700 cursor-pointer hover:scale-105 transition-transform font-mono"
                    title="Click to edit"
                  >
                    {closureMetrics?.feesCollected ?? '₹0'}
                  </div>
                )}
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mt-1">
                  FEES COLLECTED
                </div>
              </div>

              {/* Box 6: Pending Follow-ups */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-center hover:border-teal-300 transition-all">
                {editingMetric === 'pendingFus' ? (
                  <input
                    type="number"
                    min="0"
                    autoFocus
                    value={closureMetrics?.pendingFus ?? 0}
                    onChange={(e) => setCustomMetrics && setCustomMetrics(prev => ({ ...(prev || closureMetrics), pendingFus: Math.max(0, parseInt(e.target.value) || 0) }))}
                    onBlur={() => setEditingMetric(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingMetric(null)}
                    className="w-16 bg-white text-center text-xl font-extrabold text-rose-500 rounded outline-none border border-rose-500 mx-auto block"
                  />
                ) : (
                  <div 
                    onClick={() => setEditingMetric('pendingFus')}
                    className="text-2xl font-black text-rose-500 cursor-pointer hover:scale-105 transition-transform"
                    title="Click to edit"
                  >
                    {closureMetrics?.pendingFus ?? 0}
                  </div>
                )}
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mt-1">
                  PENDING FUS
                </div>
              </div>
            </div>
          </div>

          {/* 4. Submission Bar to HR Head */}
          <div className="bg-gradient-to-r from-teal-900 via-[#0e6977] to-teal-950 text-white rounded-3xl p-5 sm:p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-300" />
                <h4 className="text-base font-extrabold text-white">
                  {closureSubmitted ? 'EOD Report Submitted' : 'Ready to Submit to HR Head?'}
                </h4>
              </div>
              <p className="text-xs text-teal-100/80 max-w-lg leading-relaxed">
                {closureSubmitted 
                  ? `Report successfully delivered to the HR Head on ${closureSubmittedAt}. You can update your summary and re-submit anytime before closing work.`
                  : 'Your summary, shift start/end timestamps, duration, and CRM activity will be delivered to the HR Head dashboard for daily review.'}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className={`px-6 py-3 rounded-2xl font-extrabold text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2 ${
                  closureSubmitted 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/40' 
                    : 'bg-white hover:bg-teal-50 text-[#073734]'
                }`}
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-teal-900 border-t-transparent rounded-full animate-spin" />
                    <span>Submitting EOD...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{closureSubmitted ? 'Update & Re-Submit to HR Head' : 'Submit EOD to HR Head'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
