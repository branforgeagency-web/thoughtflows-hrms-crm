import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Users, BarChart3, CreditCard, Search, RefreshCw, CalendarPlus, ChevronRight, Copy, Send, AlertTriangle } from 'lucide-react';
import {
  getOneOnOneEnrollments, createOneOnOneEnrollment, updateOneOnOneEnrollment, scheduleOneOnOneSessions,
  getOneOnOneSessions, updateOneOnOneSession, getSchedulingTags
} from '../../services/api';
import { redirectToWhatsAppWeb } from '../../utils/whatsapp';
import { timeOptions, todayKey, prettyDate, fmtSlot, copyText, errMsg } from './schedUtils';
import { Overlay } from './SchedulingCalendar';
import { RecurringAdder } from './AvailabilityFinder';

// Head of Trainer → 1:1 Sessions: pair a student with a dedicated trainer,
// give them session credits, schedule sessions (clash-checked), and track
// credits used. The trainer starts each session from Class Session Room;
// the student joins with a no-login link.
const TIMES = timeOptions(15, 5 * 60, 23 * 60);
const SESSION_STATUS = {
  scheduled: 'bg-sky-50 text-sky-700 border-sky-200', live: 'bg-emerald-600 text-white border-emerald-600',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', no_show: 'bg-amber-50 text-amber-800 border-amber-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200'
};

export default function OneOnOneDesk({ students = [] }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [enrolling, setEnrolling] = useState(false);
  const [scheduling, setScheduling] = useState(null);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [tags, setTags] = useState({ trainers: [], courses: [] });
  const [toast, setToast] = useState('');
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setError('');
    try { setList(await getOneOnOneEnrollments()); } catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { getSchedulingTags().then(setTags).catch(() => {}); }, []);

  const ql = q.trim().toLowerCase();
  const shown = list.filter((e) => (statusFilter === 'all' || e.status === statusFilter) && (!ql || `${e.studentName} ${e.phone} ${e.course} ${e.trainerName}`.toLowerCase().includes(ql)));
  const totals = useMemo(() => ({
    active: list.filter((e) => e.status === 'active').length,
    lowCredits: list.filter((e) => e.status === 'active' && e.remainingCredits <= 2).length,
    scheduled: list.reduce((n, e) => n + e.scheduledCount, 0)
  }), [list]);

  if (loading) return <div className="py-20 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-teal-600" /></div>;

  if (!list.length) {
    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-extrabold text-slate-900">1:1 Sessions</h2>
        {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
        <div className="flex flex-col items-center text-center gap-3 py-6">
          <div className="w-24 h-24 rounded-full bg-blue-700 flex items-center justify-center"><Users className="w-11 h-11 text-white" /></div>
          <div className="text-xl font-extrabold text-slate-900">Get started with 1:1 tutoring</div>
          <div className="text-sm text-slate-500 max-w-md">Enroll your first student, pair them with a trainer and give them session credits.</div>
          <button onClick={() => setEnrolling(true)} className="mt-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-2 cursor-pointer"><Plus className="w-4 h-4" />Enroll a Student</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <Feature icon={Users} tone="bg-blue-700" title="Pair students with trainers" text="Assign a dedicated trainer to each student based on their level" />
          <Feature icon={BarChart3} tone="bg-emerald-700" title="Track session credits" text="Credits are used automatically when a session is completed" />
          <Feature icon={CalendarPlus} tone="bg-orange-700" title="Clash-free scheduling" text="Sessions are checked against the trainer's batches, demos and leave" />
        </div>
        {enrolling && <EnrollForm students={students} tags={tags} onClose={() => setEnrolling(false)} onSaved={(e) => { setEnrolling(false); load(); setScheduling(e); }} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold text-slate-900">1:1 Sessions</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student, trainer, course" className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm w-64" />
          </div>
          <button onClick={() => setEnrolling(true)} className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer"><Plus className="w-4 h-4" />Enroll a Student</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Active students" value={totals.active} />
        <Stat label="Sessions scheduled" value={totals.scheduled} />
        <Stat label="Low on credits (≤2)" value={totals.lowCredits} warn={totals.lowCredits > 0} />
      </div>

      <div className="flex gap-1.5 text-xs">
        {['active', 'paused', 'completed', 'all'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg border font-semibold capitalize cursor-pointer ${statusFilter === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600'}`}>{s}</button>
        ))}
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {shown.length === 0 && <div className="py-10 text-center text-sm text-slate-500">No students here.</div>}
        {shown.map((e) => {
          const pct = e.totalCredits ? Math.round((e.usedCredits / e.totalCredits) * 100) : 0;
          return (
            <div key={e.id} className="border-b border-slate-100 last:border-0">
              <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1.2fr_1fr_auto] gap-3 px-4 py-3 items-center">
                <button onClick={() => setExpanded(expanded === e.id ? null : e.id)} className="flex items-center gap-2 text-left min-w-0 cursor-pointer">
                  <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${expanded === e.id ? 'rotate-90' : ''}`} />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{e.studentName}{e.status !== 'active' && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 uppercase">{e.status}</span>}</div>
                    <div className="text-xs text-slate-500 truncate">{e.phone || 'No phone'}{e.course ? ` · ${e.course}` : ''}</div>
                  </div>
                </button>
                <div className="text-sm text-slate-700 truncate">{e.trainerName}<div className="text-xs text-slate-400">{e.sessionMinutes} min sessions</div></div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-slate-600"><b>{e.usedCredits}</b> / {e.totalCredits} credits used</span><span className={e.remainingCredits <= 2 ? 'text-rose-600 font-bold' : 'text-slate-500'}>{e.remainingCredits} left</span></div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${e.remainingCredits <= 2 ? 'bg-rose-500' : 'bg-teal-500'}`} style={{ width: `${pct}%` }} /></div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{e.scheduledCount} scheduled · {e.canSchedule} can still be scheduled</div>
                </div>
                <div className="text-xs text-slate-600">{e.nextSession ? <>Next: <b>{prettyDate(e.nextSession.date)}</b><div>{e.nextSession.timeSlot}</div></> : <span className="text-slate-400">No upcoming session</span>}</div>
                <div className="flex gap-1.5 justify-end">
                  <button disabled={e.status !== 'active' || e.canSchedule <= 0} onClick={() => setScheduling(e)} title={e.canSchedule <= 0 ? 'No credits left to schedule' : 'Schedule sessions'} className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"><CalendarPlus className="w-3.5 h-3.5" />Schedule</button>
                  <button onClick={() => setEditing(e)} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer">Edit</button>
                </div>
              </div>
              {expanded === e.id && <SessionList enrollment={e} onChanged={load} flash={flash} />}
            </div>
          );
        })}
      </div>

      {enrolling && <EnrollForm students={students} tags={tags} onClose={() => setEnrolling(false)} onSaved={(e) => { setEnrolling(false); load(); setScheduling(e); }} />}
      {scheduling && <ScheduleForm enrollment={scheduling} onClose={() => setScheduling(null)} onSaved={(n) => { setScheduling(null); setExpanded(scheduling.id); load(); flash(`${n} session(s) scheduled · trainer notified`); }} />}
      {editing && <EditForm enrollment={editing} tags={tags} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); flash('Saved'); }} />}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm shadow-xl">{toast}</div>}
    </div>
  );
}

function SessionList({ enrollment, onChanged, flash }) {
  const [sessions, setSessions] = useState(null);
  const [moving, setMoving] = useState(null);
  const load = useCallback(async () => {
    try { setSessions(await getOneOnOneSessions({ enrollmentId: enrollment.id })); } catch (e) { flash(errMsg(e)); setSessions([]); }
  }, [enrollment.id]);
  useEffect(() => { load(); }, [load, enrollment.usedCredits, enrollment.scheduledCount]);

  const setStatus = async (s, status, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try { await updateOneOnOneSession(s.id, { status }); await load(); onChanged(); } catch (e) { flash(errMsg(e)); }
  };
  const sendLink = (s) => {
    const msg = `Hi ${s.studentName}, your ${s.course || ''} 1:1 class with ${s.trainerName} is on ${prettyDate(s.date)} at ${s.timeSlot}. Join from your phone or computer (no app or login needed): ${s.joinLink}`;
    if (!redirectToWhatsAppWeb(s.phone || enrollment.phone, msg)) copyText(s.joinLink).then(() => flash('No phone on file — link copied'));
  };

  if (!sessions) return <div className="px-10 pb-4 text-xs text-slate-400">Loading sessions…</div>;
  if (!sessions.length) return <div className="px-10 pb-4 text-xs text-slate-500">No sessions yet — click Schedule.</div>;
  return (
    <div className="px-4 lg:px-10 pb-4 space-y-1.5">
      {sessions.map((s) => (
        <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <b className="text-slate-800">{prettyDate(s.date)}</b><span className="text-slate-600">{s.timeSlot}</span>
            <span className={`px-2 py-0.5 rounded-full border font-bold ${SESSION_STATUS[s.status]}`}>{s.status.replace('_', '-')}</span>
            {s.creditCharged && <span className="text-[10px] text-slate-400">1 credit used</span>}
            {s.studentJoinedAt && <span className="text-[10px] text-emerald-700">student joined</span>}
            {s.topic && <span className="text-slate-500">· {s.topic}</span>}
          </div>
          <div className="flex items-center gap-1">
            {['scheduled', 'live'].includes(s.status) && (
              <>
                <Mini title="Send join link on WhatsApp" onClick={() => sendLink(s)}><Send className="w-3.5 h-3.5" /></Mini>
                <Mini title="Copy join link" onClick={async () => flash((await copyText(s.joinLink)) ? 'Join link copied' : s.joinLink)}><Copy className="w-3.5 h-3.5" /></Mini>
              </>
            )}
            {s.status === 'scheduled' && <Mini onClick={() => setMoving(s)}>Reschedule</Mini>}
            {['scheduled', 'live'].includes(s.status) && <Mini onClick={() => setStatus(s, 'completed')}>Completed</Mini>}
            {['scheduled', 'live'].includes(s.status) && <Mini onClick={() => setStatus(s, 'no_show', 'Mark as student no-show? This uses 1 credit.')}>No-show</Mini>}
            {['scheduled', 'live'].includes(s.status) && <Mini danger onClick={() => setStatus(s, 'cancelled', 'Cancel this session? The credit is not used.')}>Cancel</Mini>}
            {['completed', 'no_show', 'cancelled'].includes(s.status) && <Mini onClick={() => setStatus(s, 'scheduled', s.creditCharged ? 'Undo and give the credit back?' : undefined)}>Undo</Mini>}
          </div>
        </div>
      ))}
      {moving && <MoveForm session={moving} onClose={() => setMoving(null)} onSaved={() => { setMoving(null); load(); onChanged(); flash('Session moved'); }} />}
    </div>
  );
}

function EnrollForm({ students, tags, onClose, onSaved }) {
  const [search, setSearch] = useState('');
  const [f, setF] = useState({ studentId: '', studentName: '', phone: '', email: '', course: '', trainerId: '', totalCredits: 10, sessionMinutes: 60, notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const sl = search.trim().toLowerCase();
  const matches = sl.length < 2 ? [] : students.filter((s) => `${s.name || s.studentName} ${s.studentId} ${s.phone} ${s.email}`.toLowerCase().includes(sl)).slice(0, 8);
  const pick = (s) => { setF((p) => ({ ...p, studentId: s.studentId || '', studentName: s.name || s.studentName || '', phone: s.phone || '', email: s.email || '', course: p.course || s.course || '' })); setSearch(''); };
  const save = async () => {
    setSaving(true); setError('');
    try { onSaved(await createOneOnOneEnrollment(f)); } catch (e) { setError(errMsg(e)); } finally { setSaving(false); }
  };
  return (
    <Overlay title="Enroll a Student" onClose={onClose} wide>
      <div className="space-y-4 text-sm">
        <div className="relative">
          <span className="text-xs font-semibold text-slate-600">Find an existing student (optional)</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type a name, ID or phone" className={inp} />
          {matches.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1">
              {matches.map((s) => (
                <button key={s._id || s.studentId} onClick={() => pick(s)} className="w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer">
                  <b>{s.name || s.studentName}</b> <span className="text-xs text-slate-500">{s.studentId} · {s.phone} · {s.course}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <L label="Student name *"><input value={f.studentName} onChange={(e) => set('studentName', e.target.value)} className={inp} /></L>
          <L label="Mobile (for WhatsApp links)"><input value={f.phone} onChange={(e) => set('phone', e.target.value)} className={inp} /></L>
          <L label="Email"><input value={f.email} onChange={(e) => set('email', e.target.value)} className={inp} /></L>
          <L label="Course"><input list="oo-courses" value={f.course} onChange={(e) => set('course', e.target.value)} className={inp} /><datalist id="oo-courses">{tags.courses.map((c) => <option key={c} value={c} />)}</datalist></L>
          <L label="Dedicated trainer *">
            <select value={f.trainerId} onChange={(e) => set('trainerId', e.target.value)} className={inp}>
              <option value="">Choose trainer…</option>
              {tags.trainers.map((t) => <option key={t.trainerId} value={t.trainerId}>{t.trainerName}{t.expertCourse ? ` · ${t.expertCourse}` : ''}{t.branchName ? ` · ${t.branchName}` : ''}</option>)}
            </select>
          </L>
          <div className="grid grid-cols-2 gap-2">
            <L label="Session credits"><input type="number" min={1} max={500} value={f.totalCredits} onChange={(e) => set('totalCredits', e.target.value)} className={inp} /></L>
            <L label="Session length">
              <select value={f.sessionMinutes} onChange={(e) => set('sessionMinutes', Number(e.target.value))} className={inp}>
                {[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
              </select>
            </L>
          </div>
          <L label="Notes" full><textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} className={inp} placeholder="Level, goals, preferred timings…" /></L>
        </div>
        {error && <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">{error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 font-semibold cursor-pointer">Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-60 cursor-pointer">{saving ? 'Saving…' : 'Enroll & schedule'}</button>
        </div>
      </div>
    </Overlay>
  );
}

function ScheduleForm({ enrollment, onClose, onSaved }) {
  const [mode, setMode] = useState('single');
  const [date, setDate] = useState(todayKey());
  const [time, setTime] = useState(10 * 60);
  const [pending, setPending] = useState([]);
  const [topic, setTopic] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState(null);
  const list = mode === 'single' ? [{ date, startMin: time }] : pending;

  const submit = async (force = false) => {
    setSaving(true); setError('');
    try {
      const created = await scheduleOneOnOneSessions(enrollment.id, { sessions: list, topic, force });
      onSaved(created.length);
    } catch (e) {
      if (e?.response?.status === 409 && e.response.data?.conflicts) setConflicts(e.response.data.conflicts);
      setError(errMsg(e));
    } finally { setSaving(false); }
  };

  return (
    <Overlay title={`Schedule · ${enrollment.studentName}`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div className="text-xs text-slate-500">Trainer <b className="text-slate-800">{enrollment.trainerName}</b> · {enrollment.sessionMinutes} min · <b>{enrollment.canSchedule}</b> credit(s) available to schedule</div>
        <div className="flex gap-1.5">
          {[['single', 'One session'], ['recurring', 'Recurring']].map(([k, l]) => (
            <button key={k} onClick={() => { setMode(k); setConflicts(null); setError(''); }} className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${mode === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600'}`}>{l}</button>
          ))}
        </div>
        {mode === 'single' ? (
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={date} min={todayKey()} onChange={(e) => { setDate(e.target.value); setConflicts(null); }} className={inp} />
            <select value={time} onChange={(e) => { setTime(Number(e.target.value)); setConflicts(null); }} className={inp}>{TIMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
          </div>
        ) : (
          <>
            <RecurringAdder maxCount={enrollment.canSchedule} buttonLabel="Use these dates" onAdd={(l) => { setPending(l); setConflicts(null); }} />
            {pending.length > 0 && <div className="text-xs text-teal-800 font-semibold">{pending.length} session(s): {pending.slice(0, 4).map((s) => prettyDate(s.date)).join(', ')}{pending.length > 4 ? '…' : ''}</div>}
          </>
        )}
        <L label="Topic (optional)"><input value={topic} onChange={(e) => setTopic(e.target.value)} className={inp} /></L>
        {conflicts && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1"><AlertTriangle className="w-4 h-4" />Trainer is busy:</div>
            {conflicts.map((c) => <div key={`${c.date}-${c.startMin}`}>{prettyDate(c.date)} {c.timeSlot} — {c.reason}</div>)}
          </div>
        )}
        {error && !conflicts && <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">{error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 font-semibold cursor-pointer">Cancel</button>
          {conflicts && <button onClick={() => submit(true)} disabled={saving} className="px-4 py-2 rounded-xl border border-amber-400 text-amber-800 font-bold cursor-pointer">Schedule anyway</button>}
          <button onClick={() => submit(false)} disabled={saving || !list.length} className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-50 cursor-pointer">{saving ? 'Scheduling…' : `Schedule ${list.length}`}</button>
        </div>
      </div>
    </Overlay>
  );
}

function MoveForm({ session, onClose, onSaved }) {
  const [date, setDate] = useState(session.date);
  const [time, setTime] = useState(session.startMin);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [canForce, setCanForce] = useState(false);
  const save = async (force) => {
    setBusy(true); setError('');
    try { await updateOneOnOneSession(session.id, { date, startMin: time, force }); onSaved(); }
    catch (e) { setError(errMsg(e)); setCanForce(e?.response?.status === 409); }
    finally { setBusy(false); }
  };
  return (
    <Overlay title="Reschedule session" onClose={onClose} small>
      <div className="space-y-3 text-sm">
        <div className="text-xs text-slate-500">Now: {prettyDate(session.date)} {session.timeSlot}</div>
        <input type="date" value={date} min={todayKey()} onChange={(e) => setDate(e.target.value)} className={inp} />
        <select value={time} onChange={(e) => setTime(Number(e.target.value))} className={inp}>{TIMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
        {error && <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">{error}</div>}
        <div className="flex justify-end gap-2">
          {canForce && <button onClick={() => save(true)} disabled={busy} className="px-3 py-2 rounded-xl border border-amber-400 text-amber-800 font-bold text-xs cursor-pointer">Move anyway</button>}
          <button onClick={() => save(false)} disabled={busy} className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer">Save</button>
        </div>
      </div>
    </Overlay>
  );
}

function EditForm({ enrollment, tags, onClose, onSaved }) {
  const [f, setF] = useState({ trainerId: enrollment.trainerId, totalCredits: enrollment.totalCredits, sessionMinutes: enrollment.sessionMinutes, status: enrollment.status, course: enrollment.course, notes: enrollment.notes });
  const [error, setError] = useState('');
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => { try { await updateOneOnOneEnrollment(enrollment.id, f); onSaved(); } catch (e) { setError(errMsg(e)); } };
  return (
    <Overlay title={`Edit · ${enrollment.studentName}`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <L label="Trainer (upcoming sessions move too)">
          <select value={f.trainerId} onChange={(e) => set('trainerId', e.target.value)} className={inp}>
            {tags.trainers.map((t) => <option key={t.trainerId} value={t.trainerId}>{t.trainerName}</option>)}
          </select>
        </L>
        <div className="grid grid-cols-2 gap-2">
          <L label={`Total credits (min ${enrollment.usedCredits})`}><input type="number" min={enrollment.usedCredits} value={f.totalCredits} onChange={(e) => set('totalCredits', e.target.value)} className={inp} /></L>
          <L label="Session length"><select value={f.sessionMinutes} onChange={(e) => set('sessionMinutes', Number(e.target.value))} className={inp}>{[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}</select></L>
        </div>
        <div className="flex gap-1">
          {[10, 20].map((n) => <button key={n} onClick={() => set('totalCredits', Number(f.totalCredits) + n)} className="px-2.5 py-1 rounded-lg border border-teal-300 text-teal-800 text-xs font-bold cursor-pointer"><CreditCard className="w-3 h-3 inline mr-1" />+{n} credits</button>)}
        </div>
        <L label="Course"><input value={f.course} onChange={(e) => set('course', e.target.value)} className={inp} /></L>
        <L label="Status">
          <select value={f.status} onChange={(e) => set('status', e.target.value)} className={inp}>
            <option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option>
          </select>
        </L>
        <L label="Notes"><textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} className={inp} /></L>
        {error && <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">{error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 font-semibold cursor-pointer">Cancel</button>
          <button onClick={save} className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer">Save</button>
        </div>
      </div>
    </Overlay>
  );
}

const inp = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white';
const L = ({ label, children, full }) => <label className={`space-y-1 block ${full ? 'md:col-span-2' : ''}`}><span className="text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
const Mini = ({ children, danger, ...p }) => <button {...p} className={`px-2 py-1 rounded-lg border bg-white font-semibold cursor-pointer ${danger ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}>{children}</button>;
const Stat = ({ label, value, warn }) => <div className={`p-4 rounded-2xl border bg-white ${warn ? 'border-rose-200' : 'border-slate-200/90'}`}><div className="text-[11px] font-bold uppercase text-slate-400">{label}</div><div className={`text-2xl font-black ${warn ? 'text-rose-600' : 'text-slate-900'}`}>{value}</div></div>;
function Feature({ icon: Icon, tone, title, text }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center space-y-2">
      <div className={`w-12 h-12 rounded-full ${tone} mx-auto flex items-center justify-center`}><Icon className="w-5 h-5 text-white" /></div>
      <div className="font-bold text-slate-900">{title}</div>
      <div className="text-xs text-slate-500">{text}</div>
    </div>
  );
}
