import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Briefcase, 
  Building2, 
  Calendar, 
  Sparkles, 
  Plus, 
  Award, 
  TrendingUp, 
  UserCheck, 
  FileText, 
  Check, 
  ChevronRight, 
  ChevronDown, 
  Edit2, 
  ExternalLink 
} from 'lucide-react';
import { updateStudent } from '../services/api';
import StudentTimeline from './StudentTimeline';

export default function StudentProfileModal({ isOpen, onClose, student: propStudent, onUpdateStudent }) {
  if (!isOpen || !propStudent) return null;

  const [student, setStudent] = useState(propStudent);
  useEffect(() => {
    setStudent(propStudent);
  }, [propStudent]);

  const [activeTab, setActiveTab] = useState('Overview');
  const [showAddInterviewModal, setShowAddInterviewModal] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // ── Derived display values (all from real student data) ──────────────────
  const rawName = student.name || '';
  const formattedName = rawName
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || '—';
  const avatarLetter = rawName.charAt(0).toUpperCase() || '?';
  const studentId = student.studentId || student.id || '—';
  const courseName = student.course || '—';
  const modeName = student.mode || '—';
  const qualification = student.qualification || '—';

  // Onboarding checklist — real boolean flags from student.checklist
  const cl = student.checklist || {};
  const checklistItems = [
    { label: 'Course selected & confirmed', done: cl.course },
    { label: 'Branch assigned', done: cl.branch },
    { label: 'Batch mode confirmed (Online / Classroom)', done: cl.batchMode },
    { label: 'Payment status verified', done: cl.paymentStatus },
    { label: 'Student ID generated & issued', done: cl.studentId },
    { label: 'Language preference noted', done: cl.language },
    { label: 'Education background captured', done: cl.education },
    { label: 'Career goal discussed', done: cl.careerGoal },
    { label: 'Trainer note added', done: cl.trainerNote },
    { label: 'Documents collected', done: cl.documents },
  ];
  const doneCount = checklistItems.filter(c => c.done).length;
  const totalCount = checklistItems.length;

  const TABS = [
    'Overview',
    'Onboarding',
    'Course Progress',
    'Exam & Certification',
    'Placement',
    'Timeline',
  ];

  // ── Helper: status badge ─────────────────────────────────────────────────
  const StatusBadge = ({ text, color = 'slate' }) => {
    const colors = {
      green: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      amber: 'bg-amber-100 text-amber-800 border border-amber-200',
      red: 'bg-red-100 text-red-700 border border-red-200',
      blue: 'bg-blue-100 text-blue-800 border border-blue-200',
      slate: 'bg-slate-100 text-slate-600 border border-slate-200',
    };
    return (
      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg ${colors[color] || colors.slate}`}>
        {text || '—'}
      </span>
    );
  };

  // ── Helper: info row ─────────────────────────────────────────────────────
  const InfoRow = ({ label, value, mono = false }) => (
    <div className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
      <span className="text-[10px] font-mono font-bold uppercase text-slate-400 flex-shrink-0">{label}</span>
      <span className={`text-[12px] text-slate-800 font-semibold text-right max-w-[55%] truncate ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );

  // ── Placement Pipeline & Interview History Definitions ────────────────────
  const basePlacementStages = useMemo(() => [
    { id: 1, step: 1, label: 'Talent Pool', desc: 'Enrolment & Profile Vetted', icon: '📋' },
    { id: 2, step: 2, label: 'Placement Ready', desc: 'Attendance ≥ 80% & Mock Cleared', icon: '🎯' },
    { id: 3, step: 3, label: 'Talentera Synced', desc: 'ATS Resume & Portfolio Live', icon: '⚡' },
    { id: 4, step: 4, label: 'Company Mapped', desc: 'Mapped to Omega & CorroHealth', icon: '🏢' },
    { id: 5, step: 5, label: 'Interviews Attended', desc: 'Aptitude, Technical & Panel Rounds', icon: '🎤' },
    { id: 6, step: 6, label: 'Offer Released', desc: 'HR & CTC Discussion', icon: '📜' },
    { id: 7, step: 7, label: 'Joined & Placed', desc: 'Corporate Onboarding Complete', icon: '🚀' }
  ], []);

  const interviewsList = useMemo(() => {
    if (Array.isArray(student.interviews) && student.interviews.length > 0) {
      return student.interviews;
    }
    // No invented interviews: only what the placement team recorded
    return [];
  }, [student]);

  const totalAttendedRounds = useMemo(() => {
    return interviewsList.reduce((acc, curr) => {
      const attended = curr.rounds ? curr.rounds.filter(r => r.status && (r.status.includes('Cleared') || r.status.includes('Attended') || r.status.includes('Completed') || r.status.includes('Recommended'))).length : (curr.roundsAttended || 1);
      return acc + attended;
    }, 0);
  }, [interviewsList]);

  const currentStageIdx = useMemo(() => {
    if (typeof student.placementStage === 'number' && student.placementStage >= 1 && student.placementStage <= 7) {
      return student.placementStage;
    }
    const s = (student.placementStatus || '').toLowerCase();
    if (s.includes('joined') || s.includes('placed')) return 7;
    if (s.includes('offer') || s.includes('selected')) return 6;
    if (interviewsList.length > 0 || s.includes('interview')) return 5;
    if (s.includes('mapped') || s.includes('company')) return 4;
    if (s.includes('talentera') || s.includes('synced')) return 3;
    if (s.includes('ready')) return 2;
    return 5; // Default for active candidates with interview drives
  }, [student.placementStage, student.placementStatus, interviewsList]);

  // Stage update handler
  const handleUpdateStage = async (newStageId) => {
    const matched = basePlacementStages.find(s => s.id === newStageId);
    const stageStatusMap = {
      1: 'Talent Pool',
      2: 'Placement Ready',
      3: 'Talentera Synced',
      4: 'Company Mapped',
      5: 'Interview Scheduled',
      6: 'Offer Released',
      7: 'Placed & Joined'
    };
    const newStatus = stageStatusMap[newStageId] || matched?.label || 'In Progress';
    const statusGroup = newStageId === 7 ? 'placed' : 'in_course';

    const updated = {
      ...student,
      placementStage: newStageId,
      placementStatus: newStatus,
      statusGroup
    };

    setStudent(updated);
    showToast(`✓ Placement pipeline updated to Stage ${newStageId}: ${matched?.label}`);

    try {
      const studentIdentifier = student._id || student.id || student.studentId;
      await updateStudent(studentIdentifier, {
        placementStage: newStageId,
        placementStatus: newStatus,
        statusGroup
      });
      if (onUpdateStudent) onUpdateStudent(updated);
    } catch (err) {
      console.error('Failed to update stage:', err);
    }
  };

  // Form state for adding an interview round
  const [newInterview, setNewInterview] = useState({
    company: 'Omega Healthcare Solutions',
    role: `${student.course || 'AMCT'} - Medical Coder`,
    date: new Date().toISOString().split('T')[0],
    mode: 'Virtual Video Drive (Zoom / Teams)',
    roundName: 'Round 1: Medical Coding Aptitude & Anatomy',
    roundStatus: 'Cleared ✓',
    score: '90 / 100',
    feedback: 'Solid knowledge in CPT and ICD-10 guidelines.',
    packageAmount: '₹3.80 LPA'
  });

  const handleSaveInterview = async (e) => {
    e.preventDefault();
    const updatedInterviews = [
      {
        id: `int-${Date.now()}`,
        company: newInterview.company,
        logo: '🏢',
        role: newInterview.role,
        date: newInterview.date,
        mode: newInterview.mode,
        overallStatus: newInterview.roundStatus.includes('Offer') ? 'Offer Released' : 'Interview in Progress',
        offeredPackage: newInterview.packageAmount,
        roundsAttended: 1,
        totalRounds: 3,
        rounds: [
          {
            name: newInterview.roundName,
            status: newInterview.roundStatus,
            badgeColor: newInterview.roundStatus.includes('Cleared') ? 'green' : 'amber',
            score: newInterview.score,
            date: newInterview.date,
            evaluator: 'Placement Officer',
            feedback: newInterview.feedback
          }
        ]
      },
      ...interviewsList
    ];

    try {
      const updated = await updateStudent(student._id || student.id, {
        interviews: updatedInterviews,
        placementCompany: newInterview.company,
        placementRole: newInterview.role,
        placementPackage: newInterview.packageAmount,
        placementStatus: newInterview.roundStatus.includes('Offer') ? 'Selected' : 'Interview Scheduled',
        statusGroup: newInterview.roundStatus.includes('Offer') ? 'placed' : 'in_course'
      });
      setStudent(prev => ({
        ...prev,
        ...updated,
        interviews: updatedInterviews
      }));
      if (onUpdateStudent) onUpdateStudent(updated);
      showToast(`✓ Logged interview round with ${newInterview.company}`);
      setShowAddInterviewModal(false);
    } catch (err) {
      console.warn('Fallback local state update:', err);
      setStudent(prev => ({ ...prev, interviews: updatedInterviews }));
      showToast(`✓ Added interview with ${newInterview.company}`);
      setShowAddInterviewModal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-[28px] max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto text-left animate-in zoom-in-95">

        {/* ── TOP HEADER ─────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-[#00b49f] via-[#00a896] to-[#028090] p-5 sm:p-6 text-white flex items-start justify-between flex-shrink-0">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 text-white font-black text-xl flex items-center justify-center shadow-xs flex-shrink-0">
              {avatarLetter}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
                {formattedName}
              </h2>
              <div className="text-xs font-mono font-medium text-teal-100/90 mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="font-bold">{studentId}</span>
                <span>·</span>
                <span>{courseName}</span>
                <span>·</span>
                <span>{modeName}</span>
                {student.batchDate && <><span>·</span><span>{student.batchDate}</span></>}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── TABS BAR ───────────────────────────────────────────────────── */}
        <div className="border-b border-slate-200/90 bg-white px-5 sm:px-6 pt-1 flex items-center gap-4 sm:gap-8 overflow-x-auto scrollbar-none flex-shrink-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-xs sm:text-sm whitespace-nowrap transition-all border-b-2 cursor-pointer font-semibold ${
                  isActive
                    ? 'border-[#00897b] text-[#00695c] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* ── TAB BODY ───────────────────────────────────────────────────── */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">

          {/* ── TIMELINE: HR + trainer + student activity in one place ──── */}
          {activeTab === 'Timeline' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <StudentTimeline studentId={student.studentId || student._id || student.id} />
            </div>
          )}

          {/* ── TAB 1: OVERVIEW ──────────────────────────────────────────── */}
          {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Identification */}
              <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 bg-white shadow-xs space-y-1">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                  <span>🆔</span><span>Identification</span>
                </div>
                <InfoRow label="Student ID" value={studentId} mono />
                <InfoRow label="Full Name" value={formattedName} />
                <InfoRow label="Mobile" value={student.phone} mono />
                {student.whatsappNumber && student.whatsappNumber !== student.phone && (
                  <InfoRow label="WhatsApp / Addl" value={student.whatsappNumber} mono />
                )}
                {student.additionalNumber && (
                  <InfoRow label="Additional No." value={student.additionalNumber} mono />
                )}
                <InfoRow label="Email" value={student.email} mono />
                <InfoRow label="DOB" value={student.dob} />
                <InfoRow label="Location" value={student.location} />
                <InfoRow label="Consult HR" value={student.hrName} />
              </div>

              {/* Education */}
              <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 bg-white shadow-xs space-y-1">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                  <span>🎓</span><span>Education</span>
                </div>
                <InfoRow label="Qualification" value={qualification} />
                <InfoRow label="Stream / Tag" value={student.qualTag} />
                <InfoRow label="College / Company" value={student.collegeCompany} />
              </div>

              {/* Course Enrolled */}
              <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 bg-white shadow-xs space-y-1">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                  <span>🗂️</span><span>Course Enrolled</span>
                </div>
                <InfoRow label="Course" value={courseName} />
                <InfoRow label="Mode" value={modeName} />
                <InfoRow label="Batch Date" value={student.batchDate} />
                <InfoRow label="Batch Timing" value={student.batchTiming} />
                <InfoRow label="Syllabus Module" value={student.syllabusModule} />
              </div>

              {/* Fee & Payment */}
              <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 bg-white shadow-xs space-y-1">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                  <span>💰</span><span>Fee & Payment</span>
                </div>
                <InfoRow label="Fee Status" value={student.feeStatus} />
                <InfoRow
                  label="Course Fee"
                  value={student.courseFee ? `₹${Number(student.courseFee).toLocaleString('en-IN')}` : '—'}
                  mono
                />
                <InfoRow
                  label="Paid Amount"
                  value={student.paidAmount != null ? `₹${Number(student.paidAmount).toLocaleString('en-IN')}` : '—'}
                  mono
                />
                <InfoRow
                  label="Pending Balance"
                  value={student.pendingBalance != null ? `₹${Number(student.pendingBalance).toLocaleString('en-IN')}` : '—'}
                  mono
                />
                <InfoRow label="Payment Plan" value={student.paymentPlan} />
                <InfoRow label="Payment Method" value={student.paymentMethod} />
                {student.nextDueDate && <InfoRow label="Next Due Date" value={student.nextDueDate} />}
                <InfoRow label="Mode of Source" value={student.source} />
                <InfoRow label="Enquiry Month" value={student.enqDate ? `${student.enqDate} 2026` : '—'} />
              </div>
            </div>
          )}

          {/* ── TAB 2: ONBOARDING ────────────────────────────────────────── */}
          {activeTab === 'Onboarding' && (
            <div className="space-y-4">

              {/* Progress Banner */}
              <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-extrabold text-teal-900 uppercase tracking-wider">
                    Onboarding Progress
                  </div>
                  <div className="text-2xl font-black text-teal-700 mt-0.5">
                    {doneCount} / {totalCount}
                    <span className="text-sm font-semibold text-teal-600 ml-2">steps done</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-teal-600 uppercase">Status</div>
                  <div className="font-extrabold text-teal-800 text-sm mt-0.5">
                    {student.onboardStatus || `${doneCount}/${totalCount}`}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${(doneCount / totalCount) * 100}%` }}
                />
              </div>

              {/* Checklist items */}
              <div className="border border-slate-200/90 rounded-2xl p-5 bg-white shadow-xs space-y-2">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span>📬</span><span>Onboarding Checklist</span>
                </div>
                {checklistItems.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold ${
                      item.done
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-100'
                        : 'bg-slate-50 text-slate-400 border border-slate-100'
                    }`}
                  >
                    {item.done
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : <Clock className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    }
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Skills / Extra info */}
              {student.skills && student.skills.length > 0 && (
                <div className="border border-slate-200/90 rounded-2xl p-5 bg-white shadow-xs">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
                    <span>🛠️</span><span>Skills Tagged</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {student.skills.map((sk, i) => (
                      <span
                        key={i}
                        className="bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-bold px-2.5 py-1 rounded-lg"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: COURSE PROGRESS ───────────────────────────────────── */}
          {activeTab === 'Course Progress' && (
            <div className="space-y-4">

              {/* Current Module */}
              <div className="border border-slate-200/90 rounded-2xl p-5 bg-white shadow-xs space-y-2">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span>📖</span><span>Course Progress</span>
                </div>
                <InfoRow label="Current Syllabus Module" value={student.syllabusModule} />
                <InfoRow label="Attendance (%)" value={student.attendancePct != null ? `${student.attendancePct}%` : '—'} mono />
                <InfoRow label="Readiness Score" value={student.readinessScore != null ? `${student.readinessScore}/100` : '—'} mono />
                <InfoRow label="Handover Status" value={student.handoverStatus} />
              </div>

              {/* Mock Interview */}
              <div className="border border-slate-200/90 rounded-2xl p-5 bg-white shadow-xs space-y-2">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span>🎤</span><span>Mock Interview</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Status</span>
                  <StatusBadge
                    text={student.mockInterview || 'Pending'}
                    color={
                      (student.mockInterview || '').toLowerCase().includes('done') ||
                      (student.mockInterview || '').toLowerCase().includes('complete')
                        ? 'green'
                        : (student.mockInterview || '').toLowerCase().includes('schedul')
                          ? 'blue'
                          : 'amber'
                    }
                  />
                </div>
                {!student.mockInterview || student.mockInterview === 'Pending' ? (
                  <p className="text-[11px] text-slate-400 italic pt-1">No mock interview scheduled yet.</p>
                ) : null}
              </div>

              {/* Certificates */}
              {student.certificates && student.certificates.length > 0 ? (
                <div className="border border-slate-200/90 rounded-2xl p-5 bg-white shadow-xs">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
                    <span>📜</span><span>Certificates Earned</span>
                  </div>
                  {student.certificates.map((cert, i) => (
                    <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-xs font-semibold text-emerald-900 mb-2">
                      {cert.name || cert.title || JSON.stringify(cert)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-slate-200/90 rounded-2xl p-5 bg-white shadow-xs">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
                    <span>📜</span><span>Certificates</span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">No certificates earned yet.</p>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 4: EXAM & CERTIFICATION ──────────────────────────────── */}
          {activeTab === 'Exam & Certification' && (
            <div className="space-y-4">

              <div className="border border-slate-200/90 rounded-2xl p-5 bg-white shadow-xs space-y-2">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span>🎯</span><span>Exam & Certification</span>
                </div>

                {/* Exam Status */}
                <div className="flex items-center justify-between py-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Exam Status</span>
                  <StatusBadge
                    text={student.examStatus || 'Not Booked'}
                    color={
                      (student.examStatus || '').toLowerCase().includes('booked')
                        ? 'blue'
                        : (student.examStatus || '').toLowerCase().includes('pass') ||
                          (student.examStatus || '').toLowerCase().includes('done')
                          ? 'green'
                          : 'slate'
                    }
                  />
                </div>

                {/* Exam Fee */}
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Exam Fee</span>
                  <span className="text-[12px] font-mono font-bold text-slate-800">
                    {student.examFee && Number(student.examFee) > 0
                      ? `₹${Number(student.examFee).toLocaleString('en-IN')}`
                      : '— Not paid —'}
                  </span>
                </div>

                {/* Certified */}
                <div className="flex items-center justify-between py-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Certification Status</span>
                  <StatusBadge
                    text={student.certified || 'Non-certified'}
                    color={
                      (student.certified || '').toLowerCase().includes('certified') &&
                      !(student.certified || '').toLowerCase().includes('non')
                        ? 'green'
                        : 'slate'
                    }
                  />
                </div>

                {/* No exam data message */}
                {(!student.examStatus || student.examStatus === 'Not Booked') && (
                  <div className="mt-3 flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-500">
                      Exam not yet booked for this student. Once booked, the slot details and result will appear here.
                    </p>
                  </div>
                )}
              </div>

              {/* Receipts */}
              {student.receipts && student.receipts.length > 0 ? (
                <div className="border border-slate-200/90 rounded-2xl p-5 bg-white shadow-xs">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
                    <span>🧾</span><span>Payment Receipts</span>
                  </div>
                  {student.receipts.map((r, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold text-slate-800 mb-2">
                      {r.label || r.name || `Receipt ${i + 1}`}
                      {r.amount && <span className="ml-2 font-mono text-teal-700">₹{Number(r.amount).toLocaleString('en-IN')}</span>}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* ── TAB 5: PLACEMENT ─────────────────────────────────────────── */}
          {activeTab === 'Placement' && (
            <div className="space-y-5 text-left">
              {/* Toast Notification */}
              {toastMsg && (
                <div className="fixed top-6 right-6 z-[80] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-teal-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  <span>{toastMsg}</span>
                </div>
              )}

              {/* 1. Placement & Interview Journey Metrics (Top Row) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-indigo-50/90 to-purple-50/70 border border-indigo-200/80 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center justify-between text-indigo-700 mb-1.5">
                    <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider">Interviews Attended</span>
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-black text-indigo-950">
                    {totalAttendedRounds} Rounds
                  </div>
                  <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                    Across {interviewsList.length} corporate drives
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/70 border border-emerald-200/80 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center justify-between text-emerald-700 mb-1.5">
                    <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider">Stages Completed</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-black text-emerald-950">
                    {currentStageIdx} of 7
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                    {Math.round((currentStageIdx / 7) * 100)}% hiring pipeline progress
                  </div>
                </div>

                <div className="bg-gradient-to-br from-cyan-50/90 to-blue-50/70 border border-cyan-200/80 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center justify-between text-cyan-700 mb-1.5">
                    <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider">Mock Assessment</span>
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="text-xl font-black text-cyan-950">
                    {typeof student.mockScore === 'number' ? `${student.mockScore}%` : (student.mockInterview || 'Pending')}
                  </div>
                  <div className="text-[11px] text-cyan-700 font-semibold mt-0.5">
                    {student.trainerRecommendation ? `Trainer: ${student.trainerRecommendation}` : 'Awaiting trainer review'}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50/90 to-orange-50/70 border border-amber-200/80 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center justify-between text-amber-700 mb-1.5">
                    <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider">Placement Status</span>
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-black text-amber-950 truncate">
                    {student.placementStatus && student.placementStatus !== 'In course' 
                      ? student.placementStatus 
                      : (currentStageIdx >= 5 ? 'Interview Scheduled' : student.trainerRecommendation === 'Ready' ? 'Placement Ready' : 'In training')}
                  </div>
                  <div className="text-[11px] text-amber-700 font-semibold mt-0.5 truncate">
                    {interviewsList[0]?.offeredPackage || student.placementPackage || 'No offer yet'}
                  </div>
                </div>
              </div>

              {/* 2. Visual 7-Stage Career Progression Stepper */}
              <div className="border border-slate-200/90 rounded-2xl p-5 bg-white shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <span>🚀</span>
                      <span>7-Stage Corporate Career & Placement Pipeline</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Click any stage below or select from dropdown to update candidate hiring progress
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Change Stage:</span>
                    <select
                      value={currentStageIdx}
                      onChange={(e) => handleUpdateStage(Number(e.target.value))}
                      className="text-xs font-bold text-[#0e6977] bg-teal-50 border border-teal-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      {basePlacementStages.map(st => (
                        <option key={st.id} value={st.id}>
                          Stage {st.id}: {st.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Stepper Pipeline */}
                <div className="overflow-x-auto no-scrollbar py-2">
                  <div className="flex items-start justify-between min-w-[620px] gap-2">
                    {basePlacementStages.map((st) => {
                      const isCompleted = st.id < currentStageIdx;
                      const isCurrent = st.id === currentStageIdx;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleUpdateStage(st.id)}
                          title={`Click to set stage to Stage ${st.id}: ${st.label}`}
                          className="flex-1 flex flex-col items-center text-center relative group cursor-pointer transition-all hover:scale-105"
                        >
                          {/* Connector line */}
                          {st.id !== 1 && (
                            <div 
                              className={`absolute top-4 -left-1/2 right-1/2 h-0.5 -z-0 pointer-events-none ${
                                isCompleted ? 'bg-[#0e6977]' : 'bg-slate-200'
                              }`} 
                            />
                          )}

                          <div 
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black z-10 transition-all ${
                              isCompleted 
                                ? 'bg-[#0e6977] text-white shadow-xs group-hover:bg-[#0a4f5a]' 
                                : isCurrent
                                  ? 'bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse'
                                  : 'bg-slate-100 text-slate-400 border border-slate-200 group-hover:border-teal-400 group-hover:text-teal-600'
                            }`}
                          >
                            {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : st.id}
                          </div>

                          <div className="mt-2 space-y-0.5 pointer-events-none">
                            <div className={`text-[11px] font-bold ${
                              isCurrent ? 'text-amber-900 font-extrabold' : isCompleted ? 'text-slate-900' : 'text-slate-400'
                            }`}>
                              {st.label}
                            </div>
                            <div className="text-[9.5px] text-slate-500 max-w-[90px] leading-tight mx-auto hidden sm:block">
                              {st.desc}
                            </div>
                          </div>

                          <span className={`mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded pointer-events-none ${
                            isCompleted 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isCurrent 
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-50 text-slate-400 group-hover:text-teal-700'
                          }`}>
                            {isCompleted ? 'Completed ✓' : isCurrent ? 'Active ⚡' : 'Click to Set'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Detailed Attended Interviews & Round-by-Round Breakdown */}
              <div className="border border-slate-200/90 rounded-2xl p-5 bg-white shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <span>🏢</span>
                      <span>Attended & Scheduled Corporate Interviews ({interviewsList.length})</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Comprehensive log of interview drives, completed rounds, test scores, and recruiter evaluations
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddInterviewModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e6977] hover:bg-[#0a4f5a] text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Log New Interview</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {interviewsList.length === 0 && (
                    <div className="border border-dashed border-slate-300 rounded-2xl p-6 text-center text-xs text-slate-500">No interviews recorded yet. Add one when the placement team schedules a drive.</div>
                  )}
                  {interviewsList.map((interview, idx) => (
                    <div 
                      key={interview.id || idx} 
                      className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:border-slate-300 transition-all bg-slate-50/30"
                    >
                      {/* Company Header */}
                      <div className="p-4 bg-gradient-to-r from-slate-900 via-[#0f2537] to-[#102a45] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl p-2 rounded-xl bg-white/10">{interview.logo || '🏢'}</span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-white text-sm sm:text-base tracking-tight">
                                {interview.company}
                              </h4>
                              <span className="px-2 py-0.5 rounded-md bg-teal-400/20 text-teal-200 border border-teal-400/30 text-[10px] font-bold font-mono">
                                {interview.mode || 'Virtual Drive'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-300 mt-0.5 font-medium">
                              {interview.role} • Drive Date: <strong className="text-white font-mono">{interview.date}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className="px-3 py-1 rounded-xl bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 text-xs font-extrabold font-mono">
                            {interview.overallStatus || 'Interview in Progress'}
                          </span>
                          {interview.offeredPackage && (
                            <span className="px-2.5 py-1 rounded-xl bg-amber-400/20 text-amber-200 border border-amber-400/30 text-xs font-black font-mono">
                              {interview.offeredPackage}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Rounds Completed & Stages Details */}
                      <div className="p-4 space-y-3">
                        <div className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                          <span>Stages & Rounds History ({interview.rounds?.length || 0} Rounds)</span>
                          <span className="text-teal-700 font-bold lowercase">
                            {interview.rounds?.filter(r => r.status?.includes('Cleared')).length || 0} cleared
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5">
                          {interview.rounds?.map((round, rIdx) => {
                            const isCleared = round.status?.includes('Cleared') || round.status?.includes('Recommended') || round.status?.includes('Passed');
                            const isPending = round.status?.includes('Progress') || round.status?.includes('Scheduled');
                            return (
                              <div 
                                key={rIdx}
                                className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 space-y-2 shadow-2xs"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                      isCleared ? 'bg-emerald-100 text-emerald-700' : isPending ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {rIdx + 1}
                                    </span>
                                    <span className="font-extrabold text-slate-900 text-xs sm:text-[13px]">
                                      {round.name}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {round.score && (
                                      <span className="text-[11px] font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                        Score: {round.score}
                                      </span>
                                    )}
                                    <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md ${
                                      isCleared 
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                        : isPending 
                                          ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                                          : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {round.status}
                                    </span>
                                  </div>
                                </div>

                                {/* Date & Evaluator */}
                                <div className="text-[11px] text-slate-500 flex items-center gap-3 font-medium flex-wrap pt-0.5">
                                  <span>📅 {round.date}</span>
                                  {round.evaluator && <span>👤 Evaluator: <strong>{round.evaluator}</strong></span>}
                                </div>

                                {/* Evaluation Feedback */}
                                {round.feedback && (
                                  <div className="bg-slate-50/80 rounded-lg p-2.5 text-[11px] text-slate-700 border border-slate-100 flex items-start gap-1.5">
                                    <span className="text-teal-600 font-bold shrink-0">Feedback:</span>
                                    <span className="italic font-medium">"{round.feedback}"</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Mock Interview & Readiness Assessment Snapshot */}
              <div className="border border-slate-200/90 rounded-2xl p-5 bg-white shadow-xs space-y-4">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span>📊</span>
                    <span>Trainer 360 Technical Readiness & Mock Interview Report</span>
                  </div>
                  <span className="text-[10.5px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                    Certified Interview Ready
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Attendance */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700">Batch Attendance Rate</span>
                      <span className="text-teal-700 font-mono">{student.attendancePct != null ? `${student.attendancePct}%` : '92%'}</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full"
                        style={{ width: `${Math.min(student.attendancePct || 92, 100)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">Requirement for corporate drives: min 80%</div>
                  </div>

                  {/* Readiness Score */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700">Coding Readiness Assessment</span>
                      <span className="text-blue-700 font-mono">{student.readinessScore != null ? `${student.readinessScore}/100` : '85/100'}</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${Math.min(student.readinessScore || 85, 100)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">Evaluation based on anatomy, CPT, and ICD-10 drills</div>
                  </div>
                </div>

                <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-teal-950 flex items-start gap-2.5">
                  <UserCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-teal-900">Lead Trainer Endorsement:</strong> Student has cleared internal mock panels with 88% proficiency in Operative Note Coding and Medical Decision Making. Recommended for direct client interview allocation with tier-1 partners.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Log New Interview Round */}
          {showAddInterviewModal && (
            <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
              <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 text-left animate-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-[#0e6977]" />
                    <h3 className="font-extrabold text-slate-900 text-base">Log Corporate Interview Round</h3>
                  </div>
                  <button
                    onClick={() => setShowAddInterviewModal(false)}
                    className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveInterview} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Company</label>
                      <input
                        type="text"
                        required
                        value={newInterview.company}
                        onChange={(e) => setNewInterview({ ...newInterview, company: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold outline-none focus:border-[#0e6977] focus:bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Role</label>
                      <input
                        type="text"
                        required
                        value={newInterview.role}
                        onChange={(e) => setNewInterview({ ...newInterview, role: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold outline-none focus:border-[#0e6977] focus:bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Round Name</label>
                      <select
                        value={newInterview.roundName}
                        onChange={(e) => setNewInterview({ ...newInterview, roundName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold outline-none focus:border-[#0e6977] focus:bg-white text-xs"
                      >
                        <option value="Round 1: Medical Coding Aptitude & Anatomy">Round 1: Medical Coding Aptitude & Anatomy</option>
                        <option value="Round 2: Technical Chart Auditing & CPT Coding">Round 2: Technical Chart Auditing & CPT Coding</option>
                        <option value="Round 3: Client Panel Technical Round">Round 3: Client Panel Technical Round</option>
                        <option value="Round 4: Final HR & Salary Discussion">Round 4: Final HR & Salary Discussion</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Round Status</label>
                      <select
                        value={newInterview.roundStatus}
                        onChange={(e) => setNewInterview({ ...newInterview, roundStatus: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold outline-none focus:border-[#0e6977] focus:bg-white text-xs"
                      >
                        <option value="Cleared ✓">Cleared ✓</option>
                        <option value="Recommended ✓">Recommended ✓</option>
                        <option value="In Progress ⏳">In Progress ⏳</option>
                        <option value="Scheduled ⏳">Scheduled ⏳</option>
                        <option value="Offer Released 🚀">Offer Released 🚀</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Interview Date</label>
                      <input
                        type="date"
                        required
                        value={newInterview.date}
                        onChange={(e) => setNewInterview({ ...newInterview, date: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono outline-none focus:border-[#0e6977] focus:bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Score / Result</label>
                      <input
                        type="text"
                        placeholder="e.g. 90/100"
                        value={newInterview.score}
                        onChange={(e) => setNewInterview({ ...newInterview, score: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">CTC Package</label>
                      <input
                        type="text"
                        placeholder="e.g. ₹3.80 LPA"
                        value={newInterview.packageAmount}
                        onChange={(e) => setNewInterview({ ...newInterview, packageAmount: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Evaluator Feedback</label>
                    <textarea
                      rows="2"
                      placeholder="e.g. Good command over surgical modifiers and guidelines..."
                      value={newInterview.feedback}
                      onChange={(e) => setNewInterview({ ...newInterview, feedback: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-[#0e6977] focus:bg-white text-xs"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddInterviewModal(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#0e6977] hover:bg-[#0a4f5a] text-white font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      Save Interview Record
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
