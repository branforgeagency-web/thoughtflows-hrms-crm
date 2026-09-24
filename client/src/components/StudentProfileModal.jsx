import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

export default function StudentProfileModal({ isOpen, onClose, student }) {
  if (!isOpen || !student) return null;

  const [activeTab, setActiveTab] = useState('Overview');

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
            <div className="space-y-4">

              <div className="border border-slate-200/90 rounded-2xl p-5 bg-white shadow-xs space-y-2">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span>💼</span><span>Placement Status</span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Status</span>
                  <StatusBadge
                    text={student.placementStatus || 'In course'}
                    color={
                      (student.placementStatus || '').toLowerCase().includes('placed')
                        ? 'green'
                        : (student.placementStatus || '').toLowerCase().includes('hold')
                          ? 'amber'
                          : 'slate'
                    }
                  />
                </div>

                <InfoRow label="Status Group" value={student.statusGroup} />
                <InfoRow label="Handover Status" value={student.handoverStatus} />
                <InfoRow
                  label="Reward Points"
                  value={student.rewardPoints != null ? `${student.rewardPoints} pts` : '—'}
                  mono
                />

                {/* Not placed yet info */}
                {(!student.placementStatus || student.placementStatus === 'In course') && (
                  <div className="mt-3 flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-500">
                      Student is currently in training. Placement details will appear here once the student is certified and placed.
                    </p>
                  </div>
                )}
              </div>

              {/* Readiness snapshot */}
              <div className="border border-slate-200/90 rounded-2xl p-5 bg-white shadow-xs space-y-3">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span>📊</span><span>Readiness Snapshot</span>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <span className="text-slate-600">Attendance</span>
                    <span className="text-teal-700 font-mono">{student.attendancePct != null ? `${student.attendancePct}%` : '—'}</span>
                  </div>
                  {student.attendancePct != null && (
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full"
                        style={{ width: `${Math.min(student.attendancePct, 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <span className="text-slate-600">Readiness Score</span>
                    <span className="text-blue-700 font-mono">{student.readinessScore != null ? `${student.readinessScore}/100` : '—'}</span>
                  </div>
                  {student.readinessScore != null && (
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(student.readinessScore, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
