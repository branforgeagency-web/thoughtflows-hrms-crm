import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Send,
  Sparkles,
  AlertCircle,
  FileText,
  User,
  X,
  Plus,
  Search,
  Filter
} from 'lucide-react';

import { getStudents, updateStudent, getTrainerSettings, handoverStudentToTrainer } from '../services/api';

export default function HrHandoverDesk({ students: propStudents, onRefreshStudents, currentUser }) {
  const [toastMsg, setToastMsg] = useState(null);
  const [activeTabFilter, setActiveTabFilter] = useState('ALL'); // ALL, PENDING, READY, SENT
  const [editingStudent, setEditingStudent] = useState(null);
  const [students, setStudents] = useState(propStudents || []);
  const [trainers, setTrainers] = useState([]);
  const [assigning, setAssigning] = useState(null); // student being handed over
  const [assignForm, setAssignForm] = useState({ trainerId: '', batchName: '', trainerNote: '' });

  useEffect(() => {
    getTrainerSettings()
      .then(res => setTrainers(Array.isArray(res) ? res.filter(t => t.active !== false) : []))
      .catch(() => setTrainers([]));
  }, []);

  useEffect(() => {
    if (propStudents !== undefined) {
      setStudents(propStudents);
    } else {
      const params = currentUser?.name ? { hrName: currentUser.name } : undefined;
      getStudents(params).then(res => {
        if (Array.isArray(res)) setStudents(res);
      }).catch(err => console.error('Error fetching students for handover:', err));
    }
  }, [propStudents, currentUser?.name]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const CHECKLIST_KEYS = [
    { key: 'course', label: 'Course' },
    { key: 'branch', label: 'Branch' },
    { key: 'batchMode', label: 'Batch mode' },
    { key: 'paymentStatus', label: 'Payment status' },
    { key: 'studentId', label: 'Student ID' },
    { key: 'language', label: 'Language' },
    { key: 'education', label: 'Education' },
    { key: 'careerGoal', label: 'Career goal' },
    { key: 'trainerNote', label: 'Trainer note' },
    { key: 'documents', label: 'Documents' }
  ];

  // Handover action: HR picks the trainer & batch → student lands on that
  // trainer's dashboard and the trainer gets a notification
  const studentKey = (s) => s?._id || s?.studentId;
  const courseCode = (course = '') => String(course).toUpperCase().split(/[^A-Z0-9-]/).find(Boolean) || '';
  const openHandover = (stu) => {
    const code = courseCode(stu.course);
    const match = trainers.find(t => t.courseKey && t.courseKey.toUpperCase() === code && (!stu.branch || !t.branchName || t.branchName === stu.branch))
      || trainers.find(t => t.courseKey && t.courseKey.toUpperCase() === code);
    setAssignForm({
      trainerId: stu.trainerId || match?.trainerId || '',
      batchName: stu.batchName || [stu.course, stu.batchTiming].filter(Boolean).join(' · '),
      trainerNote: stu.trainerNote || ''
    });
    setAssigning(stu);
  };

  const handleSendToTraining = async () => {
    if (!assigning) return;
    if (!assignForm.trainerId) { showToast('Select a trainer'); return; }
    try {
      const updated = await handoverStudentToTrainer(studentKey(assigning), {
        ...assignForm,
        handedOverBy: currentUser?.name || currentUser?.userName || ''
      });
      setStudents(prev => prev.map(s => (studentKey(s) === studentKey(assigning) ? { ...s, ...updated } : s)));
      if (onRefreshStudents) onRefreshStudents();
      showToast(`✓ ${assigning.name} handed over to ${updated.trainerName} — trainer notified`);
      setAssigning(null);
      setEditingStudent(null);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Error handing over student');
    }
  };

  // Toggle checklist item
  const handleToggleChecklist = async (itemKey) => {
    if (!editingStudent) return;
    const currentChecklist = editingStudent.checklist || {};
    const updatedChecklist = {
      ...currentChecklist,
      [itemKey]: !currentChecklist[itemKey]
    };
    const allGreen = Object.values(updatedChecklist).every(v => v === true);
    const newStatus = allGreen ? 'Ready' : 'Pending Handover';
    const updatedStudent = {
      ...editingStudent,
      checklist: updatedChecklist,
      handoverStatus: newStatus,
      status: newStatus
    };
    setEditingStudent(updatedStudent);
    setStudents(prev => prev.map(s => (s._id === updatedStudent._id || s.studentId === updatedStudent.studentId || s.id === updatedStudent.id) ? updatedStudent : s));

    try {
      await updateStudent(editingStudent._id || editingStudent.studentId || editingStudent.id, {
        checklist: updatedChecklist,
        handoverStatus: newStatus
      });
      if (onRefreshStudents) onRefreshStudents();
    } catch (err) {
      console.error('Failed to persist checklist:', err);
    }
  };

  // Normalize status accessor
  const getStudentStatus = (s) => s.handoverStatus || 'Pending Handover';
  const allGreen = (s) => Object.values(s.checklist || {}).length > 0 && Object.values(s.checklist || {}).every(v => v === true);

  // Metrics calculation
  const pendingCount = students.filter(s => getStudentStatus(s) === 'Pending Handover').length;
  const readyCount = students.filter(s => getStudentStatus(s) === 'Ready').length;
  const sentCount = students.filter(s => getStudentStatus(s) === 'Sent to Training').length;

  return (
    <div className="w-full space-y-5 pb-16">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-teal-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Title & Subtitle */}
      <div className="pt-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Student <span className="text-[#00897b]">Handover Desk</span>
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1 font-mono">
          Before training starts, complete each student's handover. Every checklist item must be green to send them to the Training department.
        </p>
      </div>

      {/* 3 Metric Cards in a Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Pending Handover */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-amber-500 flex flex-col justify-between">
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 font-mono">
            PENDING HANDOVER
          </div>
          <div className="text-3xl sm:text-4xl font-black text-amber-600 mt-2">
            {pendingCount}
          </div>
          <div className="text-xs text-slate-400 font-mono font-medium mt-0.5">
            incomplete profile
          </div>
        </div>

        {/* Card 2: Ready to Send */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-teal-500 flex flex-col justify-between">
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 font-mono">
            READY TO SEND
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">
            {readyCount}
          </div>
          <div className="text-xs text-slate-400 font-mono font-medium mt-0.5">
            all checks green
          </div>
        </div>

        {/* Card 3: Sent to Training */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-emerald-500 flex flex-col justify-between">
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 font-mono">
            SENT TO TRAINING
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-600 mt-2">
            {sentCount}
          </div>
          <div className="text-xs text-slate-400 font-mono font-medium mt-0.5">
            handed over
          </div>
        </div>
      </div>

      {/* Student Handover Cards List */}
      <div className="space-y-4">
        {students.map((stu) => {
          const isAllGreen = allGreen(stu);
          const isSent = getStudentStatus(stu) === 'Sent to Training';

          return (
            <div
              key={studentKey(stu)}
              className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4 hover:border-slate-300 transition-all"
            >
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight">
                    {stu.name}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#005a54] text-white font-mono text-[11px] font-bold">
                    {stu.studentId}
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    {stu.course}
                  </span>
                </div>

                <div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isSent
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : isAllGreen
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {getStudentStatus(stu)}
                  </span>
                </div>
              </div>

              {/* Checklist Badges Row (10 items) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5 sm:gap-2">
                {CHECKLIST_KEYS.map((item) => {
                  const isChecked = Boolean((stu.checklist || {})[item.key]);
                  return (
                    <div
                      key={item.key}
                      onClick={() => !isSent && setEditingStudent(stu)}
                      title={!isSent ? 'Click to view / edit checklist' : undefined}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${
                        isChecked
                          ? 'bg-[#ecfdf5] border-emerald-200/80 text-[#047857]'
                          : 'bg-slate-50 border-slate-200 text-slate-400 cursor-pointer hover:border-amber-300'
                      }`}
                    >
                      {isChecked ? (
                        <Check className="w-3 h-3 text-emerald-600 stroke-[3] flex-shrink-0" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
                      )}
                      <span className="truncate">{item.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Action Button Row */}
              <div className="pt-1">
                {isSent ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{stu.trainerName ? `With ${stu.trainerName}${stu.batchName ? ` · ${stu.batchName}` : ''}` : 'Sent to Training — no trainer allocated'}</span>
                      </div>
                      <button onClick={() => openHandover(stu)} className="text-xs font-bold text-[#00897b] hover:underline">
                        {stu.trainerName ? 'Reassign trainer' : 'Allocate trainer'}
                      </button>
                    </div>
                    {/* Live training progress written by the trainer */}
                    <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                      <span className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">Attendance: {typeof stu.attendancePct === 'number' ? `${stu.attendancePct}%` : '—'}</span>
                      <span className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">Tests: {typeof stu.assessmentScore === 'number' ? `${stu.assessmentScore}%` : '—'}</span>
                      <span className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">Readiness: {typeof stu.readinessScore === 'number' ? `${stu.readinessScore}%` : '—'}</span>
                      {stu.trainerRecommendation && <span className="px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700">Trainer: {stu.trainerRecommendation}</span>}
                      {stu.syllabusCompleted && <span className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">Syllabus complete → CCCP</span>}
                      {(stu.remedialActions || []).length > 0 && <span className="px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">{stu.remedialActions.length} remedial action(s)</span>}
                    </div>
                  </div>
                ) : isAllGreen ? (
                  <button
                    onClick={() => openHandover(stu)}
                    className="bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center gap-1.5"
                  >
                    <span>Send to Training Department →</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setEditingStudent(stu)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Complete profile to send
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Checklist Completion Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingStudent.name} · Handover Checklist
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {editingStudent.studentId || editingStudent.id} · {editingStudent.course}
                </p>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Verify all 10 requirements below before transferring the student record to the academic coaching & training batch.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {CHECKLIST_KEYS.map((item) => {
                const isChecked = Boolean((editingStudent.checklist || {})[item.key]);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleToggleChecklist(item.key)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isChecked
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-amber-300'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isChecked
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-300 bg-white text-transparent'
                    }`}>
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
              >
                Close
              </button>
              {allGreen(editingStudent) && getStudentStatus(editingStudent) !== 'Sent to Training' && (
                <button
                  onClick={() => openHandover(editingStudent)}
                  className="px-5 py-2 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-xs transition-all shadow-sm"
                >
                  Send to Training Department →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trainer allocation modal */}
      {assigning && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Hand over {assigning.name}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{assigning.studentId} · {assigning.course}</p>
              </div>
              <button onClick={() => setAssigning(null)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Trainer <span className="text-rose-500">*</span></label>
                <select
                  value={assignForm.trainerId}
                  onChange={(e) => setAssignForm(prev => ({ ...prev, trainerId: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                >
                  <option value="">Select trainer…</option>
                  {trainers.map(t => (
                    <option key={t.trainerId} value={t.trainerId}>
                      {t.trainerName}{t.courseKey ? ` · ${t.courseKey}` : ''}{t.branchName ? ` · ${t.branchName}` : ''}{t.shift ? ` · ${t.shift}` : ''}
                    </option>
                  ))}
                </select>
                {trainers.length === 0 && <p className="text-[11px] text-rose-600 mt-1">No active trainers in Trainer Settings.</p>}
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Batch name</label>
                <input
                  value={assignForm.batchName}
                  onChange={(e) => setAssignForm(prev => ({ ...prev, batchName: e.target.value }))}
                  placeholder="e.g. CPC Morning Oct-26"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Note for the trainer</label>
                <textarea
                  rows={3}
                  value={assignForm.trainerNote}
                  onChange={(e) => setAssignForm(prev => ({ ...prev, trainerNote: e.target.value }))}
                  placeholder="Learning pace, language preference, career goal…"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button onClick={() => setAssigning(null)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">Cancel</button>
              <button onClick={handleSendToTraining} className="px-5 py-2 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-xs shadow-sm">
                Send to Trainer →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
