import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useFileToken from '../hooks/useFileToken';
import { localDateKey } from '../utils/dateUtils';
import { Play, Clock, CheckSquare, Users, MessageSquare, Send, Copy, X, RefreshCw, ExternalLink } from 'lucide-react';
import ZoomMeeting from './ZoomMeeting';
import {
  getLiveClasses,
  startLiveClass,
  getTrainerClassJoin,
  addLiveClassNote,
  endLiveClass,
  markLiveClassAttendanceSaved,
  recordTrainerAttendance,
  trainingMaterialFileUrl,
  onDataUpdate
} from '../services/api';

// Class Session Room
//   Start  → server creates a Zoom meeting on the trainer's own Zoom user
//   Host   → trainer joins inside the dashboard as host (ZAK)
//   Join   → students join from their portal; every join is logged here
//   End    → Zoom closes for everyone; attendance is pre-filled from the join log
const studentKeyOf = (s) => String(s?.studentId || s?._id || '');
const fmtTimer = (secs) => [Math.floor(secs / 3600), Math.floor((secs % 3600) / 60), secs % 60].map((n) => String(n).padStart(2, '0')).join(':');
const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '');
const todayKey = () => localDateKey();

export default function ClassSessionRoom({ trainerId, trainerName, batches = [], materials = [], onAttendanceSaved }) {
  useFileToken(); // keeps file links (downloads / audio) signed with a fresh short-lived token
  const [batchId, setBatchId] = useState('');
  const batch = batches.find((b) => b.id === batchId) || batches[0] || null;
  const [topic, setTopic] = useState('');
  const [live, setLive] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [noteText, setNoteText] = useState('');
  const [endReview, setEndReview] = useState(null); // { session, batch, marks }
  const [savingAtt, setSavingAtt] = useState(false);

  const flash = (msg, ms = 3500) => { setToast(msg); setTimeout(() => setToast(''), ms); };
  const liveBatch = live ? batches.find((b) => b.name === live.batch) || null : null;
  const roomBatch = liveBatch || batch;
  const batchMaterials = useMemo(
    () => (roomBatch ? materials.filter((m) => (m.assignments || []).some((a) => a.batch === roomBatch.name)) : []),
    [materials, roomBatch]
  );

  useEffect(() => { if (batch && !live) setTopic(batch.module || ''); }, [batch?.id]);

  // Restore / refresh the live session (page reload, other device, new joins)
  const refreshLive = useCallback(async () => {
    if (!trainerId) return;
    try {
      const list = await getLiveClasses({ trainerId });
      const sess = Array.isArray(list) ? list[0] : null;
      setLive(sess || null);
      if (sess) {
        const b = batches.find((x) => x.name === sess.batch);
        if (b) setBatchId(b.id);
      }
    } catch (_) {}
  }, [trainerId, batches]);

  useEffect(() => { refreshLive(); }, [refreshLive]);
  useEffect(() => {
    if (!live) return undefined;
    const poll = setInterval(refreshLive, 15000); // picks up students joining
    const unsub = onDataUpdate((e) => { if (e === 'live_class') refreshLive(); });
    return () => { clearInterval(poll); unsub(); };
  }, [live?.sessionId, refreshLive]);

  useEffect(() => {
    if (!live?.startedAt) { setElapsed(0); return undefined; }
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(live.startedAt).getTime()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [live?.startedAt]);

  const handleStart = async () => {
    if (!batch) return;
    setStarting(true);
    setError('');
    try {
      const bName = batch?.name || batch?.batchName || batch?.id || 'Active Batch';
      const tId = trainerId || 'LEADER';
      const tName = trainerName || 'Trainer';
      const sess = await startLiveClass({ trainerId: tId, trainerName: tName, batch: bName, topic: topic.trim() || batch?.module || '' });
      setLive(sess);
      flash('✓ Class is live — your batch can now join from the Student Portal');
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setStarting(false);
    }
  };

  const joinDetails = useCallback((_reset, noHost) => getTrainerClassJoin(live?.sessionId, { noHost }), [live?.sessionId]);

  const handleEnd = async () => {
    if (!live) return;
    if (!window.confirm('End the class for everyone? Zoom will close for all students.')) return;
    try {
      const res = await endLiveClass({ sessionId: live.sessionId });
      const ended = res?.sessions?.[0] || live;
      const b = liveBatch || batch;
      const joins = Object.fromEntries((ended.joins || []).map((j) => [j.studentId, j]));
      const marks = {};
      (b?.students || []).forEach((s) => {
        const j = joins[studentKeyOf(s)];
        const dur = typeof j?.durationMinutes === 'number' && j.durationMinutes > 0
          ? j.durationMinutes
          : (j?.joinedAt ? Math.max(0, Math.round(((j.lastJoinAt ? new Date(j.lastJoinAt) : new Date(ended.endedAt || Date.now())) - new Date(j.joinedAt)) / 60000)) : 0);
        // Online sessions: Present is only available after student attends at least 1 hr 45 min (105 mins)
        if (dur >= 105) {
          marks[studentKeyOf(s)] = 'Present';
        } else if (j) {
          marks[studentKeyOf(s)] = 'Late';
        } else {
          marks[studentKeyOf(s)] = 'Absent';
        }
      });
      setLive(null);
      setEndReview({ session: ended, batch: b, marks });
    } catch (e) {
      flash(`⚠ ${e?.response?.data?.error || e.message}`, 5000);
    }
  };

  const saveReviewedAttendance = async () => {
    if (!endReview?.batch) return;
    setSavingAtt(true);
    try {
      const topic = endReview.session.topic || endReview.batch.module || '';
      await recordTrainerAttendance({
        trainerId,
        trainerName,
        batch: endReview.batch.name,
        date: todayKey(),
        topic,
        records: endReview.marks,
        isOnline: true,
        sessionId: endReview.session.sessionId || endReview.session._id
      });
      await markLiveClassAttendanceSaved(endReview.session.sessionId).catch(() => {});
      setEndReview(null);
      const sylMsg = topic ? ` · Syllabus tracker marked & updated for "${topic}"` : '';
      flash(`✓ Attendance saved${sylMsg} — student, HR and Leadership dashboards updated`);
      onAttendanceSaved?.();
    } catch (e) {
      flash(`⚠ Could not save attendance: ${e?.response?.data?.error || e.message}`, 5000);
    } finally {
      setSavingAtt(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim() || !live) return;
    try {
      const sess = await addLiveClassNote(live.sessionId, noteText.trim());
      setLive(sess);
      setNoteText('');
    } catch (err) {
      flash(`⚠ ${err?.response?.data?.error || err.message}`);
    }
  };

  const inviteText = () => {
    const b = liveBatch || batch;
    const link = live?.zoomJoinUrl || '';
    return `🎓 *Thoughtflows Academy — Live Class*\n\n📚 *Batch:* ${b?.name || ''}\n${live?.topic ? `📖 *Topic:* ${live.topic}\n` : ''}👨‍🏫 *Trainer:* ${trainerName}\n${link ? `\n▶ Join the meeting: ${link}\n` : ''}\n▶ Or join from your *Student Portal → Dashboard → Join Class*.\n\n⚠ Please join from the portal link or the portal itself — that is how your attendance is recorded.`;
  };

  // ---------------------------------------------------------------------------
  if (!batch && !live) {
    return (
      <div className="bg-white rounded-2xl p-10 border border-slate-200/90 shadow-sm text-center text-xs text-slate-500">
        No batch has been allocated to you yet. HR allocates students to you from the Handover Desk.
      </div>
    );
  }

  const joinedMap = Object.fromEntries((live?.joins || []).map((j) => [j.studentId, j]));
  const roster = roomBatch?.students || [];

  return (
    <div className="space-y-5 max-w-[1280px]">
      {toast && <div className="p-3 rounded-xl bg-slate-900 text-white text-xs font-semibold">{toast}</div>}

      {!live ? (
        <div className="space-y-5">
          <div className="bg-[#0f212d] rounded-2xl p-6 sm:p-7 text-white border border-[#1b3446] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight">{batch.name}</h2>
                <p className="text-xs text-slate-200 mt-1.5">{[batch.course, `${batch.students.length} students`, batch.mode, batch.timing].filter(Boolean).join(' · ')}</p>
              </div>
              {batches.length > 1 && (
                <select value={batch.id} onChange={(e) => setBatchId(e.target.value)} className="bg-[#172b38] border border-[#244255] rounded-xl px-3 py-2 text-xs text-white">
                  {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
            </div>
            <label className="block">
              <span className="text-[11px] font-bold text-[#5aa8b7] uppercase tracking-wider">Today's topic</span>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. CPT Surgery — Integumentary system"
                className="mt-1 w-full bg-[#172b38] border border-[#244255] rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500" />
              <span className="text-[10px] text-slate-400">Shown to students and saved with today's attendance.</span>
            </label>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 pb-2">How this class runs</h3>
            <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4">
              <li>Click <b>Start Class</b> — a new Zoom meeting is created on your Zoom account and you join it here as host.</li>
              <li>Your {batch.students.length} students see <b>LIVE NOW → Join Class</b> on their portal (you can also WhatsApp them).</li>
              <li>Who joined and when is tracked on the right. Add notes — students see them after class.</li>
              <li>Click <b>End Class</b> — Zoom closes for everyone and attendance is pre-filled from the join list for you to confirm.</li>
            </ol>
            <div className="text-xs text-slate-500 mt-3">Materials for this batch: <b className="text-slate-800">{batchMaterials.length}</b></div>
          </div>

          {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">⚠ {error}</div>}

          <button onClick={handleStart} disabled={starting}
            className="w-full py-4 rounded-2xl bg-[#009688] hover:bg-[#00897b] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-60">
            {starting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{starting ? 'Creating Zoom meeting…' : 'Start Class'}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-[#0b242c] p-5 rounded-2xl border border-[#16414e] text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />LIVE
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-mono font-bold text-amber-300">
                  <Clock className="w-3.5 h-3.5" />{fmtTimer(elapsed)}
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-bold text-teal-200">
                  <Users className="w-3.5 h-3.5" />{(live.joins || []).length}/{roster.length} joined
                </span>
              </div>
              <h2 className="text-xl font-extrabold mt-1.5">{live.topic || live.batch}</h2>
              <p className="text-xs text-slate-300">{live.batch}{live.meetingSource === 'class_link' ? ' · using your fixed class Zoom link' : ''}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => { try { navigator.clipboard.writeText(inviteText().replace(/\*/g, '')); flash('Invite copied'); } catch (_) {} }}
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5"><Copy className="w-4 h-4" />Copy invite</button>
              <button onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(inviteText())}`, '_blank')}
                className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold flex items-center gap-1.5"><Send className="w-4 h-4" />WhatsApp batch</button>
              <button onClick={handleEnd} className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold">End Class</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <ZoomMeeting
                key={live.sessionId}
                getJoinDetails={joinDetails}
                userName={trainerName}
                height={560}
                isTrainerHost
                onLeft={() => flash('You left the Zoom call. The class is still live — rejoin anytime, or click "End Class" when you\'re done.', 6000)}
              />
              {live.zoomJoinUrl && (
                <a href={live.zoomJoinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#00897b] hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" />Open in the Zoom app instead
                </a>
              )}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-3">
                <div className="text-xs font-bold text-slate-900">Session materials</div>
                {batchMaterials.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">No materials assigned to {roomBatch?.name}. Assign them from Library & Materials.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {batchMaterials.map((m) => (
                      <a key={m._id} href={trainingMaterialFileUrl(m._id)} target="_blank" rel="noreferrer" className="p-3 rounded-xl border border-slate-200 hover:border-teal-400 flex items-center gap-3 text-xs">
                        <span className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-[10px] shrink-0">{m.fileFormat}</span>
                        <span className="min-w-0"><span className="block font-bold text-slate-900 truncate">{m.title}</span><span className="block text-[10px] text-slate-500 truncate">{m.category}</span></span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5"><CheckSquare className="w-4 h-4 text-[#00897b]" />Who joined (Live Duration)</span>
                  <button onClick={refreshLive} className="text-slate-400 hover:text-slate-700" title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
                </div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {roster.length === 0 && <div className="py-6 text-center text-xs text-slate-400">No students in this batch.</div>}
                  {roster.map((s) => {
                    const j = joinedMap[studentKeyOf(s)];
                    const dur = typeof j?.durationMinutes === 'number' && j.durationMinutes > 0
                      ? j.durationMinutes
                      : (j?.joinedAt ? Math.max(0, Math.round((Date.now() - new Date(j.joinedAt)) / 60000)) : 0);
                    return (
                      <div key={studentKeyOf(s)} className="py-2 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-slate-800 truncate block">{s.name}</span>
                          {j && (
                            <span className="text-[10px] text-slate-400">
                              Joined {fmtTime(j.joinedAt)} · <span className={dur >= 105 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-medium'}>{dur}m attended</span>
                            </span>
                          )}
                        </div>
                        {j
                          ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dur >= 105 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : (j.late ? 'bg-amber-50 text-amber-700' : 'bg-teal-50 text-teal-700')}`}>{dur >= 105 ? '✓ 1h 45m+ (Present)' : (j.late ? 'Late' : 'Active')}</span>
                          : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Not yet</span>}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Tracks active online duration in real-time. Students must attend at least 1 hour and 45 minutes (105 mins) before the Present option unlocks in attendance review.</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm flex flex-col">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 pb-3 border-b border-slate-100">
                  <MessageSquare className="w-4 h-4 text-[#00897b]" />Session notes <span className="text-[10px] font-medium text-slate-400">· shared with the batch</span>
                </div>
                <div className="space-y-2 mt-3 max-h-56 overflow-y-auto">
                  {(live.notes || []).length === 0
                    ? <div className="py-6 text-center text-xs text-slate-400">Key points, homework, codes to revise…</div>
                    : live.notes.map((n, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"><div className="text-[10px] text-slate-400">{fmtTime(n.at)}</div><p className="text-slate-700">{n.text}</p></div>
                    ))}
                </div>
                <form onSubmit={handleAddNote} className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                  <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note…" className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500" />
                  <button type="submit" className="px-3.5 py-2 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold">Add</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {endReview && (
        <div className="fixed inset-0 z-[90] bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setEndReview(null)} className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
            <h3 className="text-base font-bold text-slate-900">Class ended — confirm attendance</h3>
            <p className="text-xs text-slate-500 mt-0.5">{endReview.batch?.name} · {endReview.session.topic || 'Class'} · pre-filled from who joined</p>

            <div className="bg-teal-50/80 border border-teal-200 rounded-xl p-3 my-3 text-xs text-teal-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-teal-900">
                <span>🛡</span> Online Attendance & Syllabus Policy
              </div>
              <div className="text-[11px] text-teal-800">
                • <strong>Online Attendance Rule:</strong> Option to mark attendance as Present is available <strong>only after attending at least 1 hour and 45 minutes</strong> (105 mins).
              </div>
              <div className="text-[11px] text-teal-800">
                • <strong>Syllabus Tracker:</strong> Confirming attendance automatically marks and updates <strong>"{endReview.session.topic || endReview.batch.module || 'Session Topic'}"</strong> in the batch syllabus tracker.
              </div>
            </div>

            <div className="divide-y divide-slate-100 mt-4">
              {(endReview.batch?.students || []).map((s) => {
                const k = studentKeyOf(s);
                const j = (endReview.session?.joins || []).find((x) => x.studentId === k || x.name === s.name);
                const dur = typeof j?.durationMinutes === 'number' && j.durationMinutes > 0
                  ? j.durationMinutes
                  : (j?.joinedAt ? Math.max(0, Math.round(((j.lastJoinAt ? new Date(j.lastJoinAt) : new Date(endReview.session.endedAt || Date.now())) - new Date(j.joinedAt)) / 60000)) : 0);
                const canMarkPresent = dur >= 105;
                return (
                  <div key={k} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-800 truncate block">{s.name}</span>
                      <div className="mt-0.5">
                        {canMarkPresent ? (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            ✓ {Math.floor(dur / 60)}h {dur % 60}m (Eligible for Present)
                          </span>
                        ) : j ? (
                          <span className="text-[10px] text-amber-700 font-medium bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            ⏱ {dur}m / 105m (Under 1h 45m req)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Did not join online</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {['Present', 'Late', 'Absent'].map((v) => {
                        const isPresentDisabled = v === 'Present' && !canMarkPresent;
                        return (
                          <button
                            key={v}
                            disabled={isPresentDisabled}
                            title={isPresentDisabled ? `Present is locked: student attended ${dur}m (requires at least 1 hr 45 min)` : `Mark ${v}`}
                            onClick={() => {
                              if (isPresentDisabled) return;
                              setEndReview((r) => ({ ...r, marks: { ...r.marks, [k]: v } }));
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                              isPresentDisabled
                                ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                                : endReview.marks[k] === v
                                  ? (v === 'Present' ? 'bg-emerald-600 text-white border-emerald-600' : v === 'Late' ? 'bg-amber-500 text-white border-amber-500' : 'bg-rose-600 text-white border-rose-600')
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {isPresentDisabled ? '🔒 ' : ''}{v}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEndReview(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Skip for now</button>
              <button onClick={saveReviewedAttendance} disabled={savingAtt} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#009688] hover:bg-[#00897b] text-white disabled:opacity-50">{savingAtt ? 'Saving…' : 'Save attendance & update syllabus'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
