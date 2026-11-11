import React, { useState, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  Calendar,
  GitBranch,
  Search,
  CheckCircle2,
  Clock,
  MessageSquare,
  Plus,
  Bell,
  Star,
  Trash2,
  X
} from 'lucide-react';
import {
  getWiseAppStudents,
  updateWiseAppStudentOnboarding,
  getWiseAppTeachers,
  getWiseAppSchedules,
  createWiseAppSchedule,
  updateWiseAppSchedule,
  followUpWiseAppSchedule,
  deleteWiseAppSchedule,
  getWiseAppAllocations,
  assignWiseAppAllocation
} from '../../services/api';

// ---------------------------------------------------------------------------
// 1. Students (Step 1: Student Info + Onboarding + WhatsApp + Allocation Sync)
// ---------------------------------------------------------------------------
export function WiseAppStudentsSection({ onChanged }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getWiseAppStudents({ q: search, allocation: filter, mode: modeFilter });
      setStudents(Array.isArray(data) ? data : []);
    } catch (_) {
      setStudents([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [filter, modeFilter]);

  const toggleField = async (student, field, value, extra = {}) => {
    try {
      const updated = await updateWiseAppStudentOnboarding(student.studentId || student._id, {
        [field]: value,
        ...extra
      });
      setStudents((prev) => prev.map((s) => (s.studentId === updated.studentId ? updated : s)));
      setMsg(`Updated ${updated.name} (${updated.studentId}).`);
      onChanged?.();
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Update failed.');
    }
  };

  const handleSetWhatsAppGroup = async (student) => {
    const groupName = window.prompt(
      `Enter WhatsApp group name for ${student.name}:`,
      student.whatsappGroupName || `${student.course || 'CPC'} ${student.batchName || 'Online'} Group`
    );
    if (groupName === null) return;
    await toggleField(student, 'whatsappGroupAdded', true, { whatsappGroupName: groupName });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border border-slate-200 border-t-[3px] border-t-[#f39c12] p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#f39c12]" />
              Students — Information Management & Onboarding Sync
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Track student details, course info, intro session completion, WhatsApp group onboarding (for online students), and Class Allocation Sheet sync.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: '', label: 'All Students' },
              { id: 'pending_intro', label: 'Pending Intro' },
              { id: 'pending_whatsapp', label: 'Needs WhatsApp Group' },
              { id: 'unallocated', label: 'Unallocated' },
              { id: 'synced', label: 'Allocation Synced' }
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setFilter(pill.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold border cursor-pointer ${
                  filter === pill.id
                    ? 'bg-[#f39c12] text-white border-[#db8b0b]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student name, TF-ID, course, batch..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#f39c12]"
            />
          </div>
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded text-xs bg-white"
          >
            <option value="">All Modes</option>
            <option value="Online">Online</option>
            <option value="Classroom">Classroom</option>
          </select>
          <button type="submit" className="px-3.5 py-1.5 rounded bg-slate-800 text-white text-xs font-bold cursor-pointer">
            Search
          </button>
        </form>

        {msg && (
          <div className="mt-3 px-3 py-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex justify-between">
            <span>{msg}</span>
            <button onClick={() => setMsg('')}>×</button>
          </div>
        )}
      </div>

      <div className="bg-white rounded border border-slate-200 shadow-xs overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading students...</div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No students match this filter.</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="p-3">Student</th>
                <th className="p-3">Course & Mode</th>
                <th className="p-3">Batch / Trainer</th>
                <th className="p-3 text-center">Intro Session</th>
                <th className="p-3 text-center">WhatsApp Group</th>
                <th className="p-3 text-center">Allocation Sheet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s) => (
                <tr key={s.studentId || s._id} className="hover:bg-slate-50/70">
                  <td className="p-3">
                    <div className="font-bold text-slate-800">{s.name}</div>
                    <div className="text-[11px] text-slate-500">{s.studentId} · {s.branch || 'Branch N/A'}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-700">{s.course}</div>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.mode === 'Online' ? 'bg-cyan-50 text-cyan-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {s.mode || 'Online'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-700">{s.batchName || <span className="text-rose-500">Unallocated</span>}</div>
                    <div className="text-[11px] text-slate-500">{s.trainerName || 'No trainer assigned'}</div>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleField(s, 'introSessionCompleted', !s.introSessionCompleted)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                        s.introSessionCompleted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {s.introSessionCompleted ? '✓ Completed' : 'Mark Done'}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    {s.whatsappGroupAdded ? (
                      <button
                        onClick={() => toggleField(s, 'whatsappGroupAdded', false)}
                        className="px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer"
                        title={s.whatsappGroupName || 'Added to WhatsApp Group'}
                      >
                        ✓ {s.whatsappGroupName ? s.whatsappGroupName.slice(0, 18) : 'Added'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSetWhatsAppGroup(s)}
                        className="px-2.5 py-1 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 cursor-pointer"
                      >
                        + Add to Group
                      </button>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleField(s, 'classAllocationSynced', !s.classAllocationSynced)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                        s.classAllocationSynced
                          ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {s.classAllocationSynced ? '✓ Synced' : 'Sync Sheet'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Teachers / Trainers Overview
// ---------------------------------------------------------------------------
export function WiseAppTeachersSection({ onNavigate }) {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getWiseAppTeachers()
      .then((d) => setTeachers(Array.isArray(d) ? d : []))
      .catch(() => setTeachers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = teachers.filter((t) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (t.trainerName || '').toLowerCase().includes(s) ||
      (t.branchName || '').toLowerCase().includes(s) ||
      (t.expertCourse || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border border-slate-200 border-t-[3px] border-t-[#00c0ef] p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#00c0ef]" />
            Teachers & Trainers Directory
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor trainer shifts, assigned batches, schedule update compliance, and student feedback ratings.
          </p>
        </div>
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter trainer, branch, or course..."
            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-xs"
          />
        </div>
      </div>

      <div className="bg-white rounded border border-slate-200 shadow-xs overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading trainers...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No trainers found.</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="p-3">Trainer</th>
                <th className="p-3">Branch & Shift</th>
                <th className="p-3">Course Expertise</th>
                <th className="p-3 text-center">Active Batches</th>
                <th className="p-3 text-center">Pending Updates</th>
                <th className="p-3 text-center">Feedback Rating</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.trainerId || t._id} className="hover:bg-slate-50/70">
                  <td className="p-3">
                    <div className="font-bold text-slate-800">{t.trainerName}</div>
                    <div className="text-[11px] text-slate-400">{t.trainerId} · {t.email || '—'}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-700">{t.branchName || 'All Branches'}</div>
                    <div className="text-[11px] text-slate-500">{t.shift || 'Flexible'}</div>
                  </td>
                  <td className="p-3 text-slate-700">{t.expertCourse || t.courseKey || 'CPC'}</td>
                  <td className="p-3 text-center font-bold text-slate-800">{t.batchCount}</td>
                  <td className="p-3 text-center">
                    {t.pendingUpdates > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold">{t.pendingUpdates} pending</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">Up to date</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {t.avgRating ? (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {t.avgRating} ({t.feedbackCount})
                      </span>
                    ) : (
                      <span className="text-slate-400">No ratings</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onNavigate?.('schedules')}
                      className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold cursor-pointer"
                    >
                      View Schedule
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Class Schedule Management & Team Leader Follow-up (Step 2 & Step 6)
// ---------------------------------------------------------------------------
export function WiseAppSchedulesSection({ onChanged }) {
  const [schedules, setSchedules] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    trainerName: '',
    trainerId: '',
    batchName: '',
    course: 'CPC',
    branch: '',
    scheduledDate: new Date().toISOString().slice(0, 10),
    timeSlot: '10:00 AM - 12:00 PM',
    topic: '',
    mode: 'Online',
    status: 'Scheduled',
    changeNote: ''
  });

  const load = async () => {
    setLoading(true);
    try {
      const [sData, tData] = await Promise.all([
        getWiseAppSchedules({ status: statusFilter }),
        getWiseAppTeachers()
      ]);
      setSchedules(Array.isArray(sData) ? sData : []);
      setTrainers(Array.isArray(tData) ? tData : []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await createWiseAppSchedule(form);
      setShowForm(false);
      setForm({ ...form, batchName: '', topic: '', changeNote: '' });
      setMsg('Class schedule saved.');
      await load();
      onChanged?.();
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Could not save schedule.');
    }
  };

  const handleStatusChange = async (sched, status) => {
    await updateWiseAppSchedule(sched._id, { status });
    await load();
    onChanged?.();
  };

  const handleFollowUp = async (sched) => {
    const note = window.prompt('Team Leader Follow-up Note:', sched.tlFollowUpNote || 'Followed up with trainer to update schedule promptly.');
    if (note === null) return;
    await followUpWiseAppSchedule(sched._id, {
      tlFollowUpStatus: 'Follow-up Sent',
      tlFollowUpNote: note
    });
    setMsg('Team Leader follow-up recorded.');
    await load();
    onChanged?.();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this schedule entry?')) return;
    await deleteWiseAppSchedule(id);
    await load();
    onChanged?.();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border border-slate-200 border-t-[3px] border-t-[#00a65a] p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#00a65a]" />
            Class Schedule Management & TL Follow-ups
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Trainers update class schedules promptly; Team Leaders monitor pending updates and record follow-ups.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded text-xs bg-white"
          >
            <option value="">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Updated">Updated</option>
            <option value="Pending Update">Pending Update</option>
            <option value="Completed">Completed</option>
          </select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3.5 py-1.5 rounded bg-[#00a65a] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Schedule
          </button>
        </div>
      </div>

      {msg && (
        <div className="px-3 py-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg('')}>×</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded border border-slate-200 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <select
              required
              value={form.trainerName}
              onChange={(e) => {
                const tr = trainers.find((t) => t.trainerName === e.target.value);
                setForm({
                  ...form,
                  trainerName: e.target.value,
                  trainerId: tr?.trainerId || '',
                  branch: tr?.branchName || form.branch
                });
              }}
              className="px-3 py-1.5 border border-slate-200 rounded text-xs"
            >
              <option value="">Select Trainer *</option>
              {trainers.map((t) => (
                <option key={t.trainerId} value={t.trainerName}>{t.trainerName} ({t.branchName || 'All'})</option>
              ))}
            </select>
            <input
              required
              value={form.batchName}
              onChange={(e) => setForm({ ...form, batchName: e.target.value })}
              placeholder="Batch Name *"
              className="px-3 py-1.5 border border-slate-200 rounded text-xs"
            />
            <input
              required
              type="date"
              value={form.scheduledDate}
              onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
              className="px-3 py-1.5 border border-slate-200 rounded text-xs"
            />
            <input
              required
              value={form.timeSlot}
              onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
              placeholder="Time Slot (e.g. 10:00 AM - 12:00 PM)"
              className="px-3 py-1.5 border border-slate-200 rounded text-xs"
            />
            <input
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              placeholder="Session Topic (e.g. CPT Integumentary System)"
              className="px-3 py-1.5 border border-slate-200 rounded text-xs"
            />
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="px-3 py-1.5 border border-slate-200 rounded text-xs"
            >
              <option value="Scheduled">Scheduled</option>
              <option value="Updated">Updated</option>
              <option value="Pending Update">Pending Update</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded border border-slate-200 text-xs">Cancel</button>
            <button type="submit" className="px-4 py-1.5 rounded bg-[#00a65a] text-white text-xs font-bold cursor-pointer">Save Schedule</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded border border-slate-200 shadow-xs overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading schedules...</div>
        ) : schedules.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No schedule entries yet. Trainers can add today's class schedule above.</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="p-3">Date & Slot</th>
                <th className="p-3">Trainer</th>
                <th className="p-3">Batch & Topic</th>
                <th className="p-3">Schedule Status</th>
                <th className="p-3">TL Follow-up</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedules.map((sc) => (
                <tr key={sc._id} className="hover:bg-slate-50/70">
                  <td className="p-3">
                    <div className="font-bold text-slate-800">{sc.scheduledDate}</div>
                    <div className="text-[11px] text-slate-500">{sc.timeSlot} · {sc.mode}</div>
                  </td>
                  <td className="p-3 font-semibold text-slate-700">{sc.trainerName}</td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-800">{sc.batchName}</div>
                    <div className="text-[11px] text-slate-500">{sc.topic || sc.course}</div>
                  </td>
                  <td className="p-3">
                    <select
                      value={sc.status}
                      onChange={(e) => handleStatusChange(sc, e.target.value)}
                      className={`px-2 py-1 rounded text-[11px] font-bold border ${
                        sc.status === 'Pending Update'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : sc.status === 'Updated' || sc.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                      }`}
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Updated">Updated</option>
                      <option value="Pending Update">Pending Update</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="p-3">
                    {sc.tlFollowUpStatus === 'Follow-up Sent' || sc.tlFollowUpStatus === 'Verified' ? (
                      <div>
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold text-[10px]">
                          {sc.tlFollowUpStatus}
                        </span>
                        {sc.tlFollowUpNote && <div className="text-[10px] text-slate-500 mt-0.5">{sc.tlFollowUpNote}</div>}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleFollowUp(sc)}
                        className="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Bell className="w-3 h-3" /> Follow Up
                      </button>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDelete(sc._id)}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Class Allocation & Coordination (Step 3)
// ---------------------------------------------------------------------------
export function WiseAppAllocationsSection({ onChanged }) {
  const [data, setData] = useState({ batches: [], unallocatedStudents: [], trainers: [] });
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState({});
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await getWiseAppAllocations();
      setData(res || { batches: [], unallocatedStudents: [], trainers: [] });
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAssign = async (student) => {
    const batchId = selectedBatch[student.studentId];
    const batch = (data.batches || []).find((b) => String(b._id) === String(batchId));
    if (!batch) {
      setMsg('Please choose a batch before allocating.');
      return;
    }
    try {
      await assignWiseAppAllocation({
        studentId: student.studentId,
        batchId: String(batch._id),
        batchName: batch.batchName,
        trainerId: batch.trainerId,
        trainerName: batch.trainerName,
        introSessionCompleted: true,
        whatsappGroupAdded: student.mode === 'Online',
        whatsappGroupName: `${batch.course} - ${batch.batchName}`
      });
      setMsg(`Allocated ${student.name} to ${batch.batchName} (${batch.trainerName}) & synced Class Allocation.`);
      await load();
      onChanged?.();
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Allocation failed.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border border-slate-200 border-t-[3px] border-t-[#605ca8] p-4 shadow-xs">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-[#605ca8]" />
          Class Allocation & Coordination
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Coordinate batch assignments after student intro session completion, sync with the Class Allocation Sheet, and onboard online learners to WhatsApp groups.
        </p>
        {msg && (
          <div className="mt-3 px-3 py-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex justify-between">
            <span>{msg}</span>
            <button onClick={() => setMsg('')}>×</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded border border-slate-200 p-8 text-center text-xs text-slate-400">Loading allocations...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Unallocated Students Queue */}
          <div className="bg-white rounded border border-slate-200 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Students Pending Batch Allocation ({data.unallocatedStudents?.length || 0})
              </h4>
            </div>
            {!data.unallocatedStudents?.length ? (
              <div className="py-8 text-center text-xs text-emerald-700 bg-emerald-50 rounded">
                All active students are allocated to batches!
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                {data.unallocatedStudents.map((st) => (
                  <div key={st.studentId} className="py-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800">{st.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {st.studentId} · {st.course} · {st.mode} · {st.branch || 'All'}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        st.introSessionCompleted ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {st.introSessionCompleted ? 'Intro Done' : 'Intro Pending'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedBatch[st.studentId] || ''}
                        onChange={(e) => setSelectedBatch({ ...selectedBatch, [st.studentId]: e.target.value })}
                        className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded text-xs bg-white"
                      >
                        <option value="">Select Batch & Trainer...</option>
                        {(data.batches || []).map((b) => (
                          <option key={b._id} value={b._id}>
                            {b.batchName} — {b.trainerName} ({b.scheduledTime} · {b.mode})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssign(st)}
                        className="px-3 py-1.5 rounded bg-[#605ca8] text-white text-xs font-bold cursor-pointer"
                      >
                        Allocate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Batch Allocation Matrix */}
          <div className="bg-white rounded border border-slate-200 shadow-xs p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Active Batches & Trainer Assignments ({data.batches?.length || 0})
            </h4>
            <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
              {(data.batches || []).map((b) => (
                <div key={b._id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-800">{b.batchName}</div>
                    <div className="text-[11px] text-slate-500">
                      {b.course} · Trainer: <strong className="text-slate-700">{b.trainerName}</strong> · {b.scheduledTime}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 text-[11px] font-bold">
                      {b.enrolledCount}/{b.maxStudents || 15} Students
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {b.whatsappSyncedCount} WhatsApp synced
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
