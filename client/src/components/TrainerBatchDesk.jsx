import React, { useCallback, useEffect, useState } from 'react';
import { ListChecks, Megaphone, Video, Plus, Trash2, RefreshCw, ExternalLink, ArrowUp, ArrowDown } from 'lucide-react';
import {
  getBatchSyllabus,
  saveBatchSyllabus,
  getBatchAnnouncements,
  createBatchAnnouncement,
  deleteBatchAnnouncement,
  getLiveClassHistory,
  saveLiveClassRecording
} from '../services/api';

// Trainer's per-batch desk:
//   • Syllabus tracker — tick modules as they are covered; students see the progress
//   • Announcements — one message to every student of the batch
//   • Class recordings — add the Zoom / Drive link after class so students can replay
const errOf = (e, fb) => e?.response?.data?.error || e?.message || fb;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-500 bg-white';
const card = 'bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm';

export default function TrainerBatchDesk({ batches = [] }) {
  const [batchId, setBatchId] = useState('');
  const batch = batches.find((b) => b.id === batchId) || batches[0] || null;
  const [toast, setToast] = useState('');
  const flash = (m, ms = 3500) => { setToast(m); setTimeout(() => setToast(''), ms); };

  // ---- syllabus ----
  const [modules, setModules] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [newModule, setNewModule] = useState('');
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
        getBatchSyllabus(batch.name).catch(() => ({ modules: [] })),
        getBatchAnnouncements({ batch: batch.name }).catch(() => []),
        getLiveClassHistory({ batch: batch.name }).catch(() => [])
      ]);
      setModules((syl?.modules || []).map((m) => ({ _id: m._id, name: m.name, done: Boolean(m.done), doneAt: m.doneAt })));
      setDirty(false);
      setPosts(Array.isArray(ann) ? ann : []);
      setSessions(Array.isArray(hist) ? hist : []);
      setRecDrafts({});
    } catch (e) {
      flash(`⚠ ${errOf(e, 'Could not load this batch')}`);
    }
  }, [batch?.name]);

  useEffect(() => { load(); }, [load]);

  if (!batch) {
    return <div className={`${card} text-center text-xs text-slate-500 py-10`}>No batch has been allocated to you yet. HR allocates students to you from the Handover Desk.</div>;
  }

  const doneCount = modules.filter((m) => m.done).length;
  const pct = modules.length ? Math.round((doneCount / modules.length) * 100) : 0;

  const editModules = (fn) => { setModules((prev) => fn([...prev])); setDirty(true); };
  const addModule = (e) => {
    e.preventDefault();
    const name = newModule.trim();
    if (!name) return;
    if (modules.some((m) => m.name.toLowerCase() === name.toLowerCase())) { flash('That module is already in the list'); return; }
    editModules((list) => [...list, { name, done: false }]);
    setNewModule('');
  };
  const move = (i, dir) => editModules((list) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return list;
    [list[i], list[j]] = [list[j], list[i]];
    return list;
  });

  const saveSyllabus = async () => {
    setSavingSyl(true);
    try {
      const doc = await saveBatchSyllabus({ batch: batch.name, course: batch.course, modules });
      setModules((doc?.modules || []).map((m) => ({ _id: m._id, name: m.name, done: Boolean(m.done), doneAt: m.doneAt })));
      setDirty(false);
      flash('✓ Syllabus saved — students of this batch see the progress');
    } catch (e) {
      flash(`⚠ ${errOf(e, 'Could not save the syllabus')}`, 5000);
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
        {/* ---------------- Syllabus tracker ---------------- */}
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
            <p className="text-xs text-slate-500 py-3">Add the modules of this course in teaching order (e.g. "ICD-10-CM Guidelines", "CPT E/M", "Modifiers"). Tick each one when it's covered — students see the progress and get notified.</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
              {modules.map((m, i) => (
                <div key={m._id || `new-${i}`} className="flex items-center gap-3 px-3 py-2.5 text-xs">
                  <input type="checkbox" checked={m.done} onChange={() => editModules((list) => { list[i] = { ...list[i], done: !list[i].done }; return list; })} className="w-4 h-4 accent-[#00897b] cursor-pointer" aria-label={`Mark ${m.name} done`} />
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold truncate ${m.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{i + 1}. {m.name}</div>
                    {m.done && m.doneAt && <div className="text-[10px] text-slate-400">Covered {fmtDate(m.doneAt)}</div>}
                  </div>
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30" title="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === modules.length - 1} className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30" title="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                  <button onClick={() => editModules((list) => list.filter((_, k) => k !== i))} className="p-1 rounded text-slate-400 hover:text-rose-600" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={addModule} className="flex gap-2">
            <input value={newModule} onChange={(e) => setNewModule(e.target.value)} placeholder="Add a module…" className={inputCls} />
            <button type="submit" className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1 shrink-0"><Plus className="w-3.5 h-3.5" />Add</button>
          </form>
          <button onClick={saveSyllabus} disabled={!dirty || savingSyl} className="w-full py-2.5 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold disabled:opacity-40">
            {savingSyl ? 'Saving…' : dirty ? 'Save syllabus' : 'Saved'}
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
    </div>
  );
}
