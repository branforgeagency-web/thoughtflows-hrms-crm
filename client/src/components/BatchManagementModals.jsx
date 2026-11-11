import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  Users,
  Clock,
  BookOpen,
  UserCheck,
  CheckCircle2,
  Plus,
  Layers,
  Sparkles,
  Edit3,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import {
  createBatch,
  updateBatch,
  getBatchDetail,
  assignStudentsToBatch,
  removeStudentFromBatch,
  autoGroupBatches,
  updateStudentBatchProgress
} from '../services/api';

const TIME_PRESETS = [
  '6:00 AM – 8:00 AM',
  '9:00 AM – 11:00 AM',
  '9:30 AM – 11:30 AM',
  '11:00 AM – 1:00 PM',
  '11:30 AM – 1:30 PM',
  '2:00 PM – 4:00 PM',
  '2:30 PM – 4:30 PM',
  '3:00 PM – 5:00 PM',
  '4:00 PM – 6:00 PM',
  '6:30 PM – 8:30 PM',
  '7:30 PM – 9:30 PM'
];

const COURSE_PRESETS = ['CPC', 'AMCT', 'AMCT Beginner (Online)', 'AMCT Intermediate (Online)', 'CIC', 'CCS', 'COC', 'CPMA', 'CRC', 'IP-DRG', 'Surgery', 'Anatomy Alone'];

const capBadge = (count, min = 10, max = 15) => {
  if (count === 0) return { label: 'Empty (0)', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  if (count < min) return { label: `Forming (${count}/${max})`, cls: 'bg-amber-50 text-amber-800 border-amber-200' };
  if (count <= max) return { label: `Optimal (${count}/${max})`, cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  return { label: `Over Capacity (${count}/${max})`, cls: 'bg-rose-50 text-rose-800 border-rose-200' };
};

export function CreateBatchModal({
  isOpen,
  onClose,
  trainers = [],
  students = [],
  branches = [],
  onCreated,
  flashToast
}) {
  const [course, setCourse] = useState('CPC');
  const [trainerId, setTrainerId] = useState('');
  const [scheduledTime, setScheduledTime] = useState('11:00 AM – 1:00 PM');
  const [mode, setMode] = useState('Online');
  const [branch, setBranch] = useState('');
  const [days, setDays] = useState('Weekdays');
  const [batchName, setBatchName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);
  const [minStudents, setMinStudents] = useState(10);
  const [maxStudents, setMaxStudents] = useState(15);
  const [selectedIds, setSelectedIds] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [onlyUnallocated, setOnlyUnallocated] = useState(true);
  const [allowOverflow, setAllowOverflow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedTrainer = useMemo(
    () => trainers.find((t) => (t.trainerId || t.id) === trainerId) || null,
    [trainers, trainerId]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (!trainerId && trainers.length) {
      setTrainerId(trainers[0].trainerId || trainers[0].id || '');
    }
    setError('');
    setSelectedIds([]);
    setNameEdited(false);
    setAllowOverflow(false);
  }, [isOpen]);

  useEffect(() => {
    if (nameEdited) return;
    const tName = selectedTrainer?.trainerName || selectedTrainer?.name || '';
    if (course && scheduledTime && tName) {
      setBatchName(`${course} · ${scheduledTime} · ${tName}`);
    }
  }, [course, scheduledTime, selectedTrainer, nameEdited]);

  const candidateStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    const courseLower = course.trim().toLowerCase();
    return students
      .filter((s) => {
        if (onlyUnallocated && s.trainerId && s.batchName) return false;
        if (q) {
          const hit = [s.name, s.studentId, s.phone, s.course, s.branch]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q));
          if (!hit) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aMatch = String(a.course || '').toLowerCase().includes(courseLower) ? 0 : 1;
        const bMatch = String(b.course || '').toLowerCase().includes(courseLower) ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
  }, [students, onlyUnallocated, studentSearch, course]);

  if (!isOpen) return null;

  const toggleId = (sid) => {
    setSelectedIds((prev) => (prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]));
  };

  const selectRecommended12 = () => {
    const courseLower = course.trim().toLowerCase();
    const matching = candidateStudents.filter((s) => String(s.course || '').toLowerCase().includes(courseLower));
    const pool = matching.length ? matching : candidateStudents;
    const cap = Math.min(15, Math.max(10, Number(maxStudents) || 15));
    const pickCount = Math.min(pool.length, Math.min(12, cap));
    setSelectedIds(pool.slice(0, pickCount).map((s) => s.studentId || s._id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!course.trim() || !trainerId || !scheduledTime.trim()) {
      setError('Course, assigned trainer, and scheduled time are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await createBatch({
        batchName: batchName.trim(),
        course: course.trim(),
        trainerId,
        scheduledTime: scheduledTime.trim(),
        mode,
        branch,
        days,
        minStudents: Number(minStudents) || 10,
        maxStudents: Number(maxStudents) || 15,
        studentIds: selectedIds,
        allowOverflow
      });
      flashToast?.(`✓ Created batch "${res?.batch?.batchName || batchName}" with ${res?.assignedCount || 0} student(s)`);
      onCreated?.(res);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not create batch');
    } finally {
      setSaving(false);
    }
  };

  const badge = capBadge(selectedIds.length, Number(minStudents) || 10, Number(maxStudents) || 15);

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Create Trainer Batch &amp; Group Students</h3>
              <p className="text-[11px] text-slate-500">Link 10–15 students under one trainer, course, and scheduled time slot.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Course *</label>
              <input
                list="batch-course-presets"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. CPC"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold outline-none focus:border-teal-600"
              />
              <datalist id="batch-course-presets">
                {COURSE_PRESETS.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Assigned Trainer *</label>
              <select
                value={trainerId}
                onChange={(e) => setTrainerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold outline-none focus:border-teal-600"
              >
                <option value="">Select trainer…</option>
                {trainers.map((tr) => (
                  <option key={tr.trainerId || tr.id} value={tr.trainerId || tr.id}>
                    {tr.trainerName || tr.name} ({tr.courseKey || tr.specialization || 'Faculty'} · {tr.branchName || 'Online'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Scheduled Time *</label>
              <input
                list="batch-time-presets"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                placeholder="e.g. 11:00 AM – 1:00 PM"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold outline-none focus:border-teal-600"
              />
              <datalist id="batch-time-presets">
                {TIME_PRESETS.map((t) => <option key={t} value={t} />)}
              </datalist>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Batch Name *</label>
              <input
                value={batchName}
                onChange={(e) => { setBatchName(e.target.value); setNameEdited(true); }}
                placeholder="Auto-generated from course, time & trainer"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold outline-none focus:border-teal-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mode</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold">
                  <option value="Online">Online</option>
                  <option value="Classroom">Classroom</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Days</label>
                <select value={days} onChange={(e) => setDays(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold">
                  <option value="Weekdays">Weekdays (Mon–Fri)</option>
                  <option value="Weekends">Weekends (Sat–Sun)</option>
                  <option value="Mon-Sat">Mon–Sat</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Branch</label>
                <input
                  list="batch-branch-list"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                />
                <datalist id="batch-branch-list">
                  {branches.map((b, i) => <option key={i} value={b.name || b.branchName || b} />)}
                </datalist>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Min Size</label>
                <input type="number" min={1} max={30} value={minStudents} onChange={(e) => setMinStudents(e.target.value)} className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Max Size</label>
                <input type="number" min={1} max={50} value={maxStudents} onChange={(e) => setMaxStudents(e.target.value)} className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold" />
              </div>
            </div>
          </div>

          {/* Group Students Picker */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-700" />
                <span className="font-extrabold text-slate-900">Group Students into this Batch</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${badge.cls}`}>{badge.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectRecommended12}
                  className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[11px] hover:bg-teal-100 cursor-pointer"
                >
                  ⚡ Select Optimal (10–15)
                </button>
                {selectedIds.length > 0 && (
                  <button type="button" onClick={() => setSelectedIds([])} className="text-[11px] font-bold text-slate-500 hover:text-rose-600 cursor-pointer">
                    Clear ({selectedIds.length})
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students by name, ID, course, branch…"
                className="flex-1 min-w-[200px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
              />
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                <input type="checkbox" checked={onlyUnallocated} onChange={(e) => setOnlyUnallocated(e.target.checked)} className="accent-teal-600" />
                Unallocated only
              </label>
            </div>

            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 bg-white rounded-xl border border-slate-200">
              {candidateStudents.length === 0 ? (
                <div className="p-4 text-center text-slate-400">No matching students found.</div>
              ) : (
                candidateStudents.map((st) => {
                  const sid = st.studentId || st._id;
                  const checked = selectedIds.includes(sid);
                  return (
                    <label key={sid} className={`flex items-center justify-between gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 ${checked ? 'bg-teal-50/50' : ''}`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input type="checkbox" checked={checked} onChange={() => toggleId(sid)} className="accent-teal-600 w-3.5 h-3.5" />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{st.name} <span className="font-mono text-[10px] text-teal-700">({st.studentId})</span></div>
                          <div className="text-[10.5px] text-slate-500 truncate">
                            {[st.course, st.branch || st.location, st.batchTiming || st.mode].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </div>
                      {st.batchName ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold shrink-0">{st.batchName}</span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold shrink-0">Pending</span>
                      )}
                    </label>
                  );
                })
              )}
            </div>

            {selectedIds.length > (Number(maxStudents) || 15) && (
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-semibold cursor-pointer">
                <input type="checkbox" checked={allowOverflow} onChange={(e) => setAllowOverflow(e.target.checked)} className="accent-amber-600" />
                <span>Selected {selectedIds.length} students (above recommended max {maxStudents}). Confirm overflow into single batch.</span>
              </label>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white font-bold shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Creating Batch…' : `Create Batch${selectedIds.length ? ` (${selectedIds.length} Students)` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AutoGroupBatchModal({
  isOpen,
  onClose,
  trainers = [],
  students = [],
  onCreated,
  flashToast
}) {
  const [course, setCourse] = useState('CPC');
  const [trainerId, setTrainerId] = useState('');
  const [scheduledTime, setScheduledTime] = useState('11:00 AM – 1:00 PM');
  const [mode, setMode] = useState('Online');
  const [targetBatchSize, setTargetBatchSize] = useState(12);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && !trainerId && trainers.length) {
      setTrainerId(trainers[0].trainerId || trainers[0].id || '');
    }
    setError('');
  }, [isOpen]);

  const matchingPending = useMemo(() => {
    const c = course.trim().toLowerCase();
    return students.filter((s) => !s.trainerId && (!c || String(s.course || '').toLowerCase().includes(c)));
  }, [students, course]);

  if (!isOpen) return null;

  const handleGroup = async (e) => {
    e.preventDefault();
    if (!course.trim() || !trainerId || !scheduledTime.trim()) {
      setError('Course, trainer, and scheduled time are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await autoGroupBatches({
        course: course.trim(),
        trainerId,
        scheduledTime: scheduledTime.trim(),
        mode,
        targetBatchSize: Number(targetBatchSize) || 12,
        studentIds: matchingPending.map((s) => s.studentId || s._id)
      });
      flashToast?.(`✓ Grouped ${res.totalStudentsGrouped} students into ${res.batchesCreated} batch(es)`);
      onCreated?.(res);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Auto-grouping failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 text-xs text-slate-800">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-700" />
            <h3 className="text-sm font-extrabold text-slate-900">Auto-Group Pending Students (10–15 / Batch)</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">{error}</div>}

        <form onSubmit={handleGroup} className="space-y-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Course *</label>
            <input list="auto-course-presets" value={course} onChange={(e) => setCourse(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold" />
            <datalist id="auto-course-presets">
              {COURSE_PRESETS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Assigned Trainer *</label>
            <select value={trainerId} onChange={(e) => setTrainerId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold">
              <option value="">Select trainer…</option>
              {trainers.map((tr) => (
                <option key={tr.trainerId || tr.id} value={tr.trainerId || tr.id}>
                  {tr.trainerName || tr.name} ({tr.courseKey || tr.specialization || 'Faculty'})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Scheduled Time *</label>
              <input list="auto-time-presets" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold" />
              <datalist id="auto-time-presets">
                {TIME_PRESETS.map((t) => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Batch Size (10–15)</label>
              <input type="number" min={10} max={15} value={targetBatchSize} onChange={(e) => setTargetBatchSize(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900">
            <strong>{matchingPending.length}</strong> unallocated student{matchingPending.length === 1 ? '' : 's'} matching <strong>{course || 'All'}</strong> will be grouped into{' '}
            <strong>{matchingPending.length ? Math.ceil(matchingPending.length / Math.min(15, Math.max(10, Number(targetBatchSize) || 12))) : 0}</strong> batch(es) under this trainer &amp; schedule.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving || !matchingPending.length} className="px-4 py-2 rounded-xl bg-[#00897b] text-white font-bold disabled:opacity-50 cursor-pointer">
              {saving ? 'Grouping…' : 'Create & Group Batches'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BatchDetailModal({
  batchIdOrName,
  isOpen,
  onClose,
  canManage = false,
  trainers = [],
  allStudents = [],
  onUpdated,
  flashToast
}) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [addingStudents, setAddingStudents] = useState(false);
  const [pickIds, setPickIds] = useState([]);
  const [pickSearch, setPickSearch] = useState('');

  const load = useCallback(async () => {
    if (!batchIdOrName || !isOpen) return;
    setLoading(true);
    setError('');
    try {
      const data = await getBatchDetail(batchIdOrName);
      setDetail(data);
      if (data?.batch) {
        setEditForm({
          batchName: data.batch.batchName || '',
          course: data.batch.course || '',
          trainerId: data.batch.trainerId || '',
          scheduledTime: data.batch.scheduledTime || '',
          mode: data.batch.mode || 'Online',
          branch: data.batch.branch || '',
          status: data.batch.status || 'Active'
        });
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not load batch details');
    } finally {
      setLoading(false);
    }
  }, [batchIdOrName, isOpen]);

  useEffect(() => {
    load();
    setExpandedStudentId(null);
    setEditing(false);
    setAddingStudents(false);
    setPickIds([]);
  }, [load]);

  const unallocatedCandidates = useMemo(() => {
    const enrolledKeys = new Set((detail?.students || []).flatMap((s) => [s.studentId, s._id]));
    const q = pickSearch.trim().toLowerCase();
    return allStudents.filter((s) => {
      if (enrolledKeys.has(s.studentId) || enrolledKeys.has(s._id)) return false;
      if (s.trainerId && s.batchName) return false;
      if (q) {
        return [s.name, s.studentId, s.course, s.phone].some((v) => String(v || '').toLowerCase().includes(q));
      }
      return true;
    });
  }, [allStudents, detail?.students, pickSearch]);

  if (!isOpen) return null;

  const b = detail?.batch;
  const studentsList = detail?.students || [];
  const badge = b ? capBadge(b.enrolledCount, b.minStudents, b.maxStudents) : null;

  const saveBatchEdit = async () => {
    if (!b) return;
    setSavingEdit(true);
    try {
      await updateBatch(b._id || b.id || b.batchName, editForm);
      flashToast?.('✓ Batch updated — all enrolled students synced to course, trainer & schedule');
      setEditing(false);
      await load();
      onUpdated?.();
    } catch (err) {
      flashToast?.(`⚠ ${err?.response?.data?.error || err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStudentModule = async (st, moduleName, currentDone) => {
    try {
      await updateStudentBatchProgress(st.studentId || st._id, {
        moduleName,
        done: !currentDone
      });
      await load();
      onUpdated?.();
    } catch (err) {
      flashToast?.(`⚠ ${err?.response?.data?.error || err.message}`);
    }
  };

  const handleAddSelected = async () => {
    if (!b || !pickIds.length) return;
    try {
      await assignStudentsToBatch(b._id || b.id || b.batchName, { studentIds: pickIds, allowOverflow: true });
      flashToast?.(`✓ Added ${pickIds.length} student(s) to ${b.batchName}`);
      setPickIds([]);
      setAddingStudents(false);
      await load();
      onUpdated?.();
    } catch (err) {
      flashToast?.(`⚠ ${err?.response?.data?.error || err.message}`);
    }
  };

  const handleRemoveStudent = async (st) => {
    if (!b) return;
    if (!window.confirm(`Remove ${st.name} from "${b.batchName}"?`)) return;
    try {
      await removeStudentFromBatch(b._id || b.id || b.batchName, st.studentId || st._id);
      flashToast?.(`Removed ${st.name} from batch`);
      await load();
      onUpdated?.();
    } catch (err) {
      flashToast?.(`⚠ ${err?.response?.data?.error || err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-slate-900 truncate">{b?.batchName || batchIdOrName}</h3>
              {b?.batchCode && <span className="px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-mono text-[10px] font-bold">{b.batchCode}</span>}
              {badge && <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${badge.cls}`}>{badge.label}</span>}
            </div>
            {b && (
              <p className="text-xs text-slate-500 mt-0.5">
                {[b.course, `Trainer: ${b.trainerName || 'Unassigned'}`, b.scheduledTime, b.mode, b.branch].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={load} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 cursor-pointer" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {loading ? (
            <div className="py-12 text-center text-slate-500">Loading batch roster &amp; individual progress…</div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">{error}</div>
          ) : (
            <>
              {/* Batch Summary Strip & Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Course</div>
                  <div className="font-extrabold text-slate-900 mt-0.5">{b.course || '—'}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Assigned Trainer</div>
                  <div className="font-extrabold text-teal-700 mt-0.5">{b.trainerName || '—'}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Scheduled Time</div>
                  <div className="font-extrabold text-slate-900 mt-0.5">{b.scheduledTime || '—'}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Avg Attendance</div>
                  <div className="font-extrabold text-emerald-700 mt-0.5">{b.avgAttendance != null ? `${b.avgAttendance}%` : 'No classes'}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Avg Batch Progress</div>
                  <div className="font-extrabold text-indigo-700 mt-0.5">{b.avgProgress ?? 0}%</div>
                </div>
              </div>

              {canManage && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing((v) => !v)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> {editing ? 'Close Edit' : 'Edit Course / Trainer / Time'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingStudents((v) => !v)}
                    className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Students to Batch
                  </button>
                </div>
              )}

              {editing && canManage && (
                <div className="p-4 rounded-2xl border border-teal-200 bg-teal-50/40 space-y-3">
                  <div className="font-bold text-teal-900">Update Batch Configuration (propagates to all {studentsList.length} students)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input value={editForm.batchName} onChange={(e) => setEditForm((p) => ({ ...p, batchName: e.target.value }))} placeholder="Batch Name" className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold" />
                    <input value={editForm.course} onChange={(e) => setEditForm((p) => ({ ...p, course: e.target.value }))} placeholder="Course" className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold" />
                    <input value={editForm.scheduledTime} onChange={(e) => setEditForm((p) => ({ ...p, scheduledTime: e.target.value }))} placeholder="Scheduled Time" className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold" />
                    <select value={editForm.trainerId} onChange={(e) => setEditForm((p) => ({ ...p, trainerId: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold">
                      <option value="">Select Trainer…</option>
                      {trainers.map((t) => <option key={t.trainerId || t.id} value={t.trainerId || t.id}>{t.trainerName || t.name}</option>)}
                    </select>
                    <select value={editForm.mode} onChange={(e) => setEditForm((p) => ({ ...p, mode: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold">
                      <option value="Online">Online</option>
                      <option value="Classroom">Classroom</option>
                    </select>
                    <select value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold">
                      <option value="Forming">Forming</option>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-bold cursor-pointer">Cancel</button>
                    <button type="button" disabled={savingEdit} onClick={saveBatchEdit} className="px-4 py-1.5 rounded-xl bg-teal-700 text-white font-bold cursor-pointer">
                      {savingEdit ? 'Saving…' : 'Save & Sync All Students'}
                    </button>
                  </div>
                </div>
              )}

              {addingStudents && canManage && (
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Select Pending Students to Add ({pickIds.length} selected)</span>
                    <input value={pickSearch} onChange={(e) => setPickSearch(e.target.value)} placeholder="Search…" className="px-3 py-1 rounded-lg border border-slate-200 bg-white" />
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 bg-white rounded-xl border border-slate-200">
                    {unallocatedCandidates.length === 0 ? (
                      <div className="p-3 text-center text-slate-400">No unallocated students available.</div>
                    ) : unallocatedCandidates.map((s) => {
                      const sid = s.studentId || s._id;
                      const checked = pickIds.includes(sid);
                      return (
                        <label key={sid} className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-50">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={checked} onChange={() => setPickIds((p) => checked ? p.filter((x) => x !== sid) : [...p, sid])} className="accent-teal-600" />
                            <span className="font-bold">{s.name}</span>
                            <span className="font-mono text-[10px] text-teal-700">{s.studentId}</span>
                          </div>
                          <span className="text-[11px] text-slate-500">{s.course} · {s.branch || s.mode}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setAddingStudents(false)} className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-bold cursor-pointer">Cancel</button>
                    <button type="button" disabled={!pickIds.length} onClick={handleAddSelected} className="px-4 py-1.5 rounded-xl bg-teal-600 text-white font-bold disabled:opacity-50 cursor-pointer">
                      Add {pickIds.length} to Batch
                    </button>
                  </div>
                </div>
              )}

              {/* Individual Student Attendance & Batch Progress Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-extrabold text-slate-900">Individual Student Attendance &amp; Batch Progress ({studentsList.length})</span>
                  <span className="text-[11px] text-slate-500">Click any student row to view/toggle individual syllabus module progress</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Student</th>
                        <th className="py-2.5 px-3">Linked Course · Time</th>
                        <th className="py-2.5 px-3">Attendance</th>
                        <th className="py-2.5 px-3">Individual Progress</th>
                        <th className="py-2.5 px-3">Current Module</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">No students enrolled in this batch yet.</td>
                        </tr>
                      ) : studentsList.map((st) => {
                        const sid = st.studentId || st._id;
                        const isExpanded = expandedStudentId === sid;
                        return (
                          <React.Fragment key={sid}>
                            <tr className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-3">
                                <div className="font-extrabold text-slate-900">{st.name}</div>
                                <div className="font-mono text-[10px] text-teal-700">{st.studentId}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-800">{st.course}</div>
                                <div className="text-[10.5px] text-slate-500">{st.trainerName} · {st.batchTiming || b?.scheduledTime || '—'}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className={`font-black ${st.attendancePct == null ? 'text-slate-400' : st.attendancePct < 75 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {st.attendancePct != null ? `${st.attendancePct}%` : 'No classes'}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  P:{st.presentCount} · L:{st.lateCount} · A:{st.absentCount}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 min-w-[160px]">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${st.individualProgressPct}%` }} />
                                  </div>
                                  <span className="font-bold text-slate-800">{st.individualProgressPct}%</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {st.doneModulesCount}/{st.totalModulesCount} modules
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-700">
                                {st.syllabusModule || 'Module 1'}
                              </td>
                              <td className="py-2.5 px-3 text-right space-x-1">
                                <button
                                  type="button"
                                  onClick={() => setExpandedStudentId(isExpanded ? null : sid)}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold hover:bg-indigo-100 cursor-pointer inline-flex items-center gap-1"
                                >
                                  Modules {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStudent(st)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                    title="Remove from batch"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-indigo-50/30">
                                <td colSpan={6} className="px-4 py-3">
                                  <div className="text-[11px] font-bold text-slate-700 mb-2">
                                    Individual Module Progress for {st.name} (click to toggle catch-up / completion):
                                  </div>
                                  {(st.moduleStates || []).length === 0 ? (
                                    <div className="text-[11px] text-slate-500">No course syllabus modules configured yet for {b?.course}.</div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {st.moduleStates.map((m, idx) => (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() => handleToggleStudentModule(st, m.name, m.done)}
                                          className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                            m.done
                                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                              : m.batchCovered
                                              ? 'bg-amber-50 border-amber-200 text-amber-900'
                                              : 'bg-white border-slate-200 text-slate-600'
                                          }`}
                                        >
                                          <CheckCircle2 className={`w-4 h-4 shrink-0 ${m.done ? 'text-emerald-600' : 'text-slate-300'}`} />
                                          <div className="min-w-0 flex-1">
                                            <div className="font-semibold truncate">{m.name}</div>
                                            <div className="text-[10px] opacity-75">
                                              {m.done ? `Completed${m.source ? ` (${m.source})` : ''}` : m.batchCovered ? 'Taught in batch · Student missed' : 'Upcoming'}
                                            </div>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
