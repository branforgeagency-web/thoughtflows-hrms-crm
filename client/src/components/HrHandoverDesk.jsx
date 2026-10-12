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

import { getStudents, updateStudent, getHeadOfTrainers, handoverStudentToHead } from '../services/api';

export default function HrHandoverDesk({ students: propStudents, onRefreshStudents, currentUser }) {
  const [toastMsg, setToastMsg] = useState(null);
  const [activeTabFilter, setActiveTabFilter] = useState('ALL'); // ALL, PENDING, READY, SENT
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [students, setStudents] = useState(propStudents || []);
  const [headsOfTrainer, setHeadsOfTrainer] = useState([]);
  const [assigning, setAssigning] = useState(null); // student being handed over to Head of Trainer
  const [assignForm, setAssignForm] = useState({ headOfTrainer: '', headOfTrainerId: '', trainerNote: '' });

  useEffect(() => {
    getHeadOfTrainers()
      .then(res => {
        const list = Array.isArray(res) && res.length > 0 ? res : [
          { id: 'HEAD_FACULTY_001', name: 'Dr. Vikram C.', role: 'Faculty Lead & Head of Training' }
        ];
        setHeadsOfTrainer(list);
      })
      .catch(() => {
        setHeadsOfTrainer([
          { id: 'HEAD_FACULTY_001', name: 'Dr. Vikram C.', role: 'Faculty Lead & Head of Training' }
        ]);
      });
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

  // Handover action: HR hands over student to Head of Trainer.
  // Head of Trainer will subsequently assign the student to their respective trainer & batch.
  const studentKey = (s) => s?._id || s?.studentId;

  const openHandover = (stu) => {
    const defaultHead = headsOfTrainer[0] || { name: 'Dr. Vikram C.', id: 'HEAD_FACULTY_001', role: 'Faculty Lead & Head of Training' };
    setAssignForm({
      headOfTrainer: stu.headOfTrainer || defaultHead.name,
      headOfTrainerId: stu.headOfTrainerId || defaultHead.id,
      trainerNote: stu.trainerNote || ''
    });
    setAssigning(stu);
  };

  const handleSendToHead = async () => {
    if (!assigning) return;
    try {
      const updated = await handoverStudentToHead(studentKey(assigning), {
        ...assignForm,
        handedOverBy: currentUser?.name || currentUser?.userName || 'HR'
      });
      setStudents(prev => prev.map(s => (studentKey(s) === studentKey(assigning) ? { ...s, ...updated } : s)));
      if (onRefreshStudents) onRefreshStudents();
      showToast(`✓ ${assigning.name} handed over to Head of Trainer (${assignForm.headOfTrainer || 'Dr. Vikram C.'})`);
      setAssigning(null);
      setEditingStudent(null);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Error handing over student to Head of Trainer');
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
    const isAllGreen = CHECKLIST_KEYS.every(k => Boolean(updatedChecklist[k.key] === true));
    const newStatus = isAllGreen ? 'Ready' : 'Pending Handover';
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

  // Verify all 10 checklist items in one click
  const handleVerifyAllChecklist = async () => {
    if (!editingStudent) return;
    const verifiedChecklist = {};
    CHECKLIST_KEYS.forEach(k => {
      verifiedChecklist[k.key] = true;
    });
    const updatedStudent = {
      ...editingStudent,
      checklist: verifiedChecklist,
      handoverStatus: 'Ready',
      status: 'Ready'
    };
    setEditingStudent(updatedStudent);
    setStudents(prev => prev.map(s => (s._id === updatedStudent._id || s.studentId === updatedStudent.studentId || s.id === updatedStudent.id) ? updatedStudent : s));

    try {
      await updateStudent(editingStudent._id || editingStudent.studentId || editingStudent.id, {
        checklist: verifiedChecklist,
        handoverStatus: 'Ready'
      });
      if (onRefreshStudents) onRefreshStudents();
      showToast('✓ All 10 checklist items verified');
    } catch (err) {
      console.error('Failed to persist checklist:', err);
    }
  };

  // Normalize status accessor
  const isHandedOver = (s) => s.handoverStatus === 'Handed Over to Head of Trainer' || s.handoverStatus === 'Sent to Training';
  const getStudentStatus = (s) => s.handoverStatus || 'Pending Handover';
  const allGreen = (s) => CHECKLIST_KEYS.every(k => Boolean((s?.checklist || {})[k.key] === true));

  // Metrics calculation
  const pendingCount = students.filter(s => getStudentStatus(s) === 'Pending Handover').length;
  const readyCount = students.filter(s => getStudentStatus(s) === 'Ready').length;
  const sentCount = students.filter(s => isHandedOver(s)).length;

  // Filter students based on activeTabFilter and searchQuery
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const status = getStudentStatus(s);
      if (activeTabFilter === 'PENDING' && status !== 'Pending Handover') return false;
      if (activeTabFilter === 'READY' && status !== 'Ready') return false;
      if (activeTabFilter === 'SENT' && !isHandedOver(s)) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (s.name || '').toLowerCase().includes(q) ||
        (s.studentId || s.id || '').toLowerCase().includes(q) ||
        (s.course || '').toLowerCase().includes(q) ||
        (s.branch || '').toLowerCase().includes(q) ||
        (s.trainerName || '').toLowerCase().includes(q) ||
        (s.headOfTrainer || '').toLowerCase().includes(q)
      );
    });
  }, [students, activeTabFilter, searchQuery]);

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
          Complete the student checklist to hand over admitted students to the Head of Trainer. The Head of Trainer will assign respective trainers and batches.
        </p>
      </div>

      {/* 3 Metric Cards in a Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Pending Handover */}
        <button
          type="button"
          onClick={() => setActiveTabFilter(prev => prev === 'PENDING' ? 'ALL' : 'PENDING')}
          className={`bg-white rounded-2xl p-5 border shadow-xs border-l-4 border-l-amber-500 flex flex-col justify-between text-left transition-all cursor-pointer hover:shadow-md ${
            activeTabFilter === 'PENDING' ? 'ring-2 ring-amber-400 border-amber-300' : 'border-slate-200/90'
          }`}
        >
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 font-mono">
            PENDING HANDOVER
          </div>
          <div className="text-3xl sm:text-4xl font-black text-amber-600 mt-2">
            {pendingCount}
          </div>
          <div className="text-xs text-slate-400 font-mono font-medium mt-0.5">
            incomplete profile · click to filter
          </div>
        </button>

        {/* Card 2: Ready to Handover */}
        <button
          type="button"
          onClick={() => setActiveTabFilter(prev => prev === 'READY' ? 'ALL' : 'READY')}
          className={`bg-white rounded-2xl p-5 border shadow-xs border-l-4 border-l-teal-500 flex flex-col justify-between text-left transition-all cursor-pointer hover:shadow-md ${
            activeTabFilter === 'READY' ? 'ring-2 ring-teal-500 border-teal-300' : 'border-slate-200/90'
          }`}
        >
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 font-mono">
            READY FOR HANDOVER
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">
            {readyCount}
          </div>
          <div className="text-xs text-slate-400 font-mono font-medium mt-0.5">
            checklist verified · click to filter
          </div>
        </button>

        {/* Card 3: Handed Over */}
        <button
          type="button"
          onClick={() => setActiveTabFilter(prev => prev === 'SENT' ? 'ALL' : 'SENT')}
          className={`bg-white rounded-2xl p-5 border shadow-xs border-l-4 border-l-emerald-500 flex flex-col justify-between text-left transition-all cursor-pointer hover:shadow-md ${
            activeTabFilter === 'SENT' ? 'ring-2 ring-emerald-500 border-emerald-300' : 'border-slate-200/90'
          }`}
        >
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 font-mono">
            HANDED OVER
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-600 mt-2">
            {sentCount}
          </div>
          <div className="text-xs text-slate-400 font-mono font-medium mt-0.5">
            with head of trainer · click to filter
          </div>
        </button>
      </div>

      {/* Filter Pills & Search Input Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Students', count: students.length },
            { id: 'PENDING', label: 'Pending Checklist', count: pendingCount },
            { id: 'READY', label: 'Ready for Handover', count: readyCount },
            { id: 'SENT', label: 'Handed Over', count: sentCount }
          ].map(tab => {
            const isActive = activeTabFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#00897b] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px] max-w-xs w-full sm:w-auto">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, ID, course..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#00897b] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Student Handover Cards List */}
      <div className="space-y-4">
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-400 space-y-2">
            <div className="text-3xl">📋</div>
            <div className="font-bold text-sm text-slate-700">No students found matching this criteria</div>
            <p className="text-xs text-slate-400">
              {searchQuery ? `No results for "${searchQuery}". Clear your search.` : 'No admitted students in this handover bucket.'}
            </p>
          </div>
        ) : (
          filteredStudents.map((stu) => {
          const isAllGreen = allGreen(stu);
          const isSent = isHandedOver(stu);

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
                    stu.trainerName
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : isSent
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : isAllGreen
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {stu.trainerName
                      ? `Allocated: ${stu.trainerName}`
                      : isSent
                        ? 'Handed Over to Head of Trainer'
                        : isAllGreen
                          ? 'Ready for Handover'
                          : 'Pending Handover'}
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
                      {stu.trainerName ? (
                        <>
                          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>With {stu.trainerName}{stu.batchName ? ` · ${stu.batchName}` : ''}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                            Assigned by Head of Trainer{stu.allocatedByHead ? ` (${stu.allocatedByHead})` : ''}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 px-4 py-2 rounded-xl border border-purple-200">
                            <Clock className="w-4 h-4 text-purple-600" />
                            <span>Handed Over to Head of Trainer{stu.headOfTrainer ? ` (${stu.headOfTrainer})` : ''}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/70">
                            Awaiting trainer allocation by Head of Trainer
                          </span>
                        </>
                      )}
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
                    <span>Handover to Head of Trainer →</span>
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
        }))}
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
              Verify all 10 requirements below before handing over the student record to the Head of Trainer.
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
                type="button"
                onClick={handleVerifyAllChecklist}
                className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs transition-all border border-teal-200 cursor-pointer"
                title="Mark all 10 checklist requirements as verified"
              >
                ✓ Verify All 10
              </button>
              <button
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
              >
                Close
              </button>
              {allGreen(editingStudent) && !isHandedOver(editingStudent) && (
                <button
                  onClick={() => openHandover(editingStudent)}
                  className="px-5 py-2 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
                >
                  Handover to Head of Trainer →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Handover to Head of Trainer Modal */}
      {assigning && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Handover to Head of Trainer</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{assigning.name} · {assigning.studentId} · {assigning.course}</p>
              </div>
              <button onClick={() => setAssigning(null)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold">✕</button>
            </div>

            <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-3 text-xs text-teal-900 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 mb-0.5 text-teal-800">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                Handover Protocol
              </div>
              The student record will be transferred to the Head of Trainer. The Head of Trainer will review the profile, student preferences, and assign the respective trainer and batch.
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Head of Trainer <span className="text-rose-500">*</span>
                </label>
                {headsOfTrainer.length > 1 ? (
                  <select
                    value={assignForm.headOfTrainer}
                    onChange={(e) => {
                      const selected = headsOfTrainer.find(h => h.name === e.target.value);
                      setAssignForm(prev => ({
                        ...prev,
                        headOfTrainer: e.target.value,
                        headOfTrainerId: selected?.id || ''
                      }));
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                  >
                    {headsOfTrainer.map(h => (
                      <option key={h.id || h.name} value={h.name}>
                        {h.name} · {h.role || 'Head of Trainer'}{h.branch ? ` (${h.branch})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        {assignForm.headOfTrainer || headsOfTrainer[0]?.name || 'Dr. Vikram C.'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {headsOfTrainer[0]?.role || 'Faculty Lead & Head of Training'} · All Branches
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-[#00897b] text-white text-[10px] font-bold">
                      Head of Trainer
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Student Preferences & Handover Note
                </label>
                <textarea
                  rows={4}
                  value={assignForm.trainerNote}
                  onChange={(e) => setAssignForm(prev => ({ ...prev, trainerNote: e.target.value }))}
                  placeholder="Learning pace, language preference, preferred timings, background or special instructions for the Head of Trainer to assign the best trainer..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Branch:</span>
                  <span className="font-semibold text-slate-700">{assigning.branch || 'Headquarters'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Admitted By:</span>
                  <span className="font-semibold text-slate-700">{assigning.hrName || currentUser?.name || 'HR'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Batch Mode:</span>
                  <span className="font-semibold text-slate-700">{assigning.batchTiming || assigning.mode || 'Regular'}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button onClick={() => setAssigning(null)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
                Cancel
              </button>
              <button onClick={handleSendToHead} className="px-5 py-2 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-xs shadow-sm">
                Confirm Handover to Head of Trainer →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
