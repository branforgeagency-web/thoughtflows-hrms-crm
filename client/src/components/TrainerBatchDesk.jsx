import React, { useCallback, useEffect, useState } from 'react';
import { ListChecks, Megaphone, Video, RefreshCw, ExternalLink, Lock, Trash2 } from 'lucide-react';
import {
  getBatchSyllabus,
  saveBatchSyllabus,
  getBatchAnnouncements,
  createBatchAnnouncement,
  deleteBatchAnnouncement,
  getLiveClassHistory,
  saveLiveClassRecording
} from '../services/api';
import CourseSyllabusBoard from './CourseSyllabusBoard';

// Trainer's per-batch desk:
//   • Syllabus tracker — tick modules as they are covered; students see the progress
//   • Announcements — one message to every student of the batch
//   • Class recordings — add the Zoom / Drive link after class so students can replay
const errOf = (e, fb) => e?.response?.data?.error || e?.message || fb;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 font-semibold placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20 bg-white';
const card = 'bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm';

export default function TrainerBatchDesk({ batches = [] }) {
  const [deskView, setDeskView] = useState('batch'); // 'batch' | 'master_syllabus'
  const [batchId, setBatchId] = useState('');
  const batch = batches.find((b) => b.id === batchId) || batches[0] || null;
  const [toast, setToast] = useState('');
  const flash = (m, ms = 3500) => { setToast(m); setTimeout(() => setToast(''), ms); };

  // ---- syllabus (module list is Head-of-Trainer managed; trainers only tick progress) ----
  const [modules, setModules] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [hasCourseSyllabus, setHasCourseSyllabus] = useState(true);
  const [savingSyl, setSavingSyl] = useState(false);

  // ---- announcements ----
  const [posts, setPosts] = useState([]);
  const [annTitle, setAnnTitle] = useState('');
  const [annMsg, setAnnMsg] = useState('');
  const [posting, setPosting] = useState(false);

  // ---- recordings ----
  const [sessions, setSessions] = useState([]);
  const [recDrafts, setRecDrafts] = useState({});

  const load = useCallback(async () => {
    if (!batch) return;
    try {
      const [syl, ann, hist] = await Promise.all([
        getBatchSyllabus(batch.name, batch.course).catch(() => ({ modules: [], hasCourseSyllabus: true })),
        getBatchAnnouncements({ batch: batch.name }).catch(() => []),
        getLiveClassHistory({ batch: batch.name }).catch(() => [])
      ]);
      setModules((syl?.modules || []).map((m) => ({ _id: m._id, name: m.name, done: Boolean(m.done), doneAt: m.doneAt })));
      setDirty(false);
      setHasCourseSyllabus(syl?.hasCourseSyllabus !== false);
      setPosts(Array.isArray(ann) ? ann : []);
      setSessions(Array.isArray(hist) ? hist : []);
      setRecDrafts({});
    } catch (e) {
      flash(`⚠ ${errOf(e, 'Could not load this batch')}`);
    }
  }, [batch?.name]);

  useEffect(() => { load(); }, [load]);

  if (!batch) {
    return <div className={`${card} text-center text-xs text-slate-500 py-10`}>No batch has been allocated to you yet. Head of Trainer allocates students to you from the Allocation Desk.</div>;
  }

  const doneCount = modules.filter((m) => m.done).length;
  const pct = modules.length ? Math.round((doneCount / modules.length) * 100) : 0;

  // Trainers may only tick/untick existing modules — the module list itself (adding,
  // renaming, removing, reordering) is managed solely by the Head of Trainer, per course.
  const toggleModule = (i) => {
    setModules((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], done: !next[i].done };
      return next;
    });
    setDirty(true);
  };

  const saveSyllabus = async () => {
    setSavingSyl(true);
    try {
      const doc = await saveBatchSyllabus({ batch: batch.name, course: batch.course, modules });
      setModules((doc?.modules || []).map((m) => ({ _id: m._id, name: m.name, done: Boolean(m.done), doneAt: m.doneAt })));
      setDirty(false);
      flash('✓ Progress saved — students of this batch see it');
    } catch (e) {
      flash(`⚠ ${errOf(e, 'Could not save progress')}`, 5000);
    } finally {
      setSavingSyl(false);
    }
  };

  const postAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle.trim()) return;
    setPosting(true);
    try {
      const doc = await createBatchAnnouncement({ batch: batch.name, title: annTitle.trim(), message: annMsg.trim() });
      setPosts((prev) => [doc, ...prev]);
      setAnnTitle('');
      setAnnMsg('');
      flash(`✓ Sent to ${batch.students.length} student${batch.students.length === 1 ? '' : 's'} of ${batch.name}`);
    } catch (err) {
      flash(`⚠ ${errOf(err, 'Could not send')}`, 5000);
    } finally {
      setPosting(false);
    }
  };

  const removeAnnouncement = async (p) => {
    if (!window.confirm(`Delete "${p.title}"? Students will no longer see it on their dashboard.`)) return;
    try {
      await deleteBatchAnnouncement(p._id);
      setPosts((prev) => prev.filter((x) => x._id !== p._id));
    } catch (e) {
      flash(`⚠ ${errOf(e, 'Could not delete')}`);
    }
  };

  const saveRecording = async (s) => {
    const url = (recDrafts[s.sessionId] ?? s.recordingUrl ?? '').trim();
    try {
      await saveLiveClassRecording(s.sessionId, url);
      setSessions((prev) => prev.map((x) => (x.sessionId === s.sessionId ? { ...x, recordingUrl: url } : x)));
      setRecDrafts((d) => { const n = { ...d }; delete n[s.sessionId]; return n; });
      flash(url ? '✓ Recording link saved — the batch has been notified' : 'Recording link removed');
    } catch (e) {
      flash(`⚠ ${errOf(e, 'Could not save the link')}`, 5000);
    }
  };

  return (
    <div className="space-y-5 max-w-[1280px]">
      {toast && <div className="p-3 rounded-xl bg-slate-900 text-white text-xs font-semibold">{toast}</div>}

      {/* View Switcher: My Batch vs All Courses Master Syllabus */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setDeskView('batch')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            deskView === 'batch'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          🎯 My Batch Syllabus & Announcements
        </button>
        <button
          type="button"
          onClick={() => setDeskView('master_syllabus')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            deskView === 'master_syllabus'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          📖 All Courses Master Syllabus (View)
        </button>
      </div>

      {deskView === 'master_syllabus' ? (
        <CourseSyllabusBoard readOnly={true} roleType="trainer" />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 truncate">{batch.name}</h2>
          <p className="text-xs text-slate-500">{[batch.course, `${batch.students.length} students`, batch.mode, batch.timing].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="flex items-center gap-2">
          {batches.length > 1 && (
            <select value={batch.id} onChange={(e) => setBatchId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white">
              {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button onClick={load} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ---------------- Syllabus tracker (view-only list; Head of Trainer manages modules) ---------------- */}
        <div className={`${card} lg:col-span-7 space-y-4`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-[#00897b]" />
              <h3 className="text-sm font-bold text-slate-900">Syllabus tracker</h3>
            </div>
            <span className="text-xs font-bold text-slate-600">{doneCount}/{modules.length} · {pct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#00897b] transition-all" style={{ width: `${pct}%` }} /></div>

          {modules.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 flex items-start gap-1.5">
              <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
              {hasCourseSyllabus === false
                ? `The Head of Trainer hasn't added a syllabus for "${batch.course || 'this course'}" yet — once they do, it will appear here to tick off as you teach it.`
                : "No modules on this course's syllabus yet."}
            </p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
              {modules.map((m, i) => (
                <div key={m._id || `mod-${i}`} className="flex items-center gap-3 px-3 py-2.5 text-xs">
                  <input type="checkbox" checked={m.done} onChange={() => toggleModule(i)} className="w-4 h-4 accent-[#00897b] cursor-pointer" aria-label={`Mark ${m.name} done`} />
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold truncate ${m.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{i + 1}. {m.name}</div>
                    {m.done && m.doneAt && <div className="text-[10px] text-slate-400">Covered {fmtDate(m.doneAt)}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3 inline" /> Modules are set by the Head of Trainer for this course — tick them off as you teach them.</p>

          <button onClick={saveSyllabus} disabled={!dirty || savingSyl || modules.length === 0} className="w-full py-2.5 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold disabled:opacity-40">
            {savingSyl ? 'Saving…' : dirty ? 'Save progress' : 'Saved'}
          </button>
        </div>

        {/* ---------------- Announcements ---------------- */}
        <div className={`${card} lg:col-span-5 space-y-4`}>
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#00897b]" />
            <h3 className="text-sm font-bold text-slate-900">Announce to the batch</h3>
          </div>
          <form onSubmit={postAnnouncement} className="space-y-2">
            <input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} maxLength={140} placeholder="Title (e.g. Saturday class moved to 10 AM)" className={inputCls} />
            <textarea rows={3} value={annMsg} onChange={(e) => setAnnMsg(e.target.value)} maxLength={2000} placeholder="Details (optional)" className={inputCls} />
            <button type="submit" disabled={posting || !annTitle.trim()} className="w-full py-2.5 rounded-xl bg-[#0c1921] hover:bg-[#152a36] text-white text-xs font-bold disabled:opacity-40">{posting ? 'Sending…' : 'Send to batch'}</button>
          </form>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {posts.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No announcements yet.</p>}
            {posts.map((p) => (
              <div key={p._id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <b className="text-slate-900">{p.title}</b>
                  <button onClick={() => removeAnnouncement(p)} className="text-slate-400 hover:text-rose-600 shrink-0" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                {p.message && <p className="text-slate-600 mt-1 whitespace-pre-line">{p.message}</p>}
                <div className="text-[10px] text-slate-400 mt-1">{fmtDateTime(p.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------- Recordings ---------------- */}
      <div className={`${card} space-y-4`}>
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-[#00897b]" />
          <h3 className="text-sm font-bold text-slate-900">Class recordings</h3>
          <span className="text-[11px] text-slate-400">Paste the Zoom cloud or Google Drive link after each class — students can replay it from Classes.</span>
        </div>
        {sessions.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No finished classes for this batch yet. Run one from the Class Session Room.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.map((s) => {
              const draft = recDrafts[s.sessionId] ?? s.recordingUrl ?? '';
              const changed = draft.trim() !== (s.recordingUrl || '');
              return (
                <div key={s.sessionId} className="py-3 flex flex-col md:flex-row md:items-center gap-3 text-xs">
                  <div className="md:w-64 min-w-0">
                    <div className="font-bold text-slate-900 truncate">{s.topic || 'Class'}</div>
                    <div className="text-[10px] text-slate-400">{fmtDateTime(s.startedAt)} · {s.joins} joined</div>
                  </div>
                  <input value={draft} onChange={(e) => setRecDrafts((d) => ({ ...d, [s.sessionId]: e.target.value }))} placeholder="https://… recording link" className={inputCls} />
                  <div className="flex items-center gap-2 shrink-0">
                    {s.recordingUrl && <a href={s.recordingUrl} target="_blank" rel="noreferrer" className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" title="Open"><ExternalLink className="w-3.5 h-3.5" /></a>}
                    <button onClick={() => saveRecording(s)} disabled={!changed} className="px-3 py-2 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white font-bold disabled:opacity-40">Save</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  )}
</div>
  );
}
