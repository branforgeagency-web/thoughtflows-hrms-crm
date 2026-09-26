import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Video, ExternalLink, X, RefreshCw } from 'lucide-react';
import {
  getStudentSubmissions,
  reviewStudentSubmission,
  studentSubmissionFileUrl,
  getStudentRequests,
  respondStudentRequest,
  onDataUpdate
} from '../services/api';

// Trainer side of the Student Portal flow: review what allocated students
// submit (assignments, resume, video intro, improvement tasks) and handle
// their mock-interview / 1-on-1 requests.
const TYPE_LABEL = { assignment: 'Assignment', resume: 'Resume', video_intro: 'Video intro', improvement_task: 'Improvement task' };
const REQ_LABEL = { mock_interview: 'Mock interview', consultation: '1-on-1 consultation' };
const TONE = {
  Submitted: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Needs Revision': 'bg-rose-50 text-rose-700 border-rose-200',
  Open: 'bg-amber-50 text-amber-700 border-amber-200',
  Scheduled: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Declined: 'bg-slate-100 text-slate-600 border-slate-200'
};
const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const fmtSize = (b) => (!b ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const inputCls = 'w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:outline-none focus:border-[#00897b]';

export default function TrainerStudentDesk({ trainerId, trainerName }) {
  const [tab, setTab] = useState('submissions');
  const [filter, setFilter] = useState('pending');
  const [subs, setSubs] = useState([]);
  const [reqs, setReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null); // { kind: 'sub' | 'req', item }
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!trainerId) { setLoading(false); return; }
    try {
      const [s, r] = await Promise.all([
        getStudentSubmissions({ trainerId }),
        getStudentRequests({ audience: 'trainer', trainerId })
      ]);
      setSubs(Array.isArray(s) ? s : []);
      setReqs(Array.isArray(r) ? r : []);
      setError('');
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const poll = setInterval(load, 60000);
    const unsub = onDataUpdate((entity) => { if (['student_submissions', 'student_requests'].includes(entity)) load(); });
    return () => { clearInterval(poll); unsub(); };
  }, [trainerId]);

  const pendingSubs = subs.filter((s) => s.status === 'Submitted');
  const pendingReqs = reqs.filter((r) => r.status === 'Open' || r.status === 'Scheduled');
  const shownSubs = useMemo(() => (filter === 'pending' ? pendingSubs : subs), [filter, subs]);
  const shownReqs = useMemo(() => (filter === 'pending' ? pendingReqs : reqs), [filter, reqs]);

  const open = (kind, item) => {
    setActive({ kind, item });
    setForm(kind === 'sub'
      ? { status: 'Approved', score: item.score ?? '', feedback: item.feedback || '' }
      : { status: item.status === 'Open' ? 'Scheduled' : 'Resolved', scheduledFor: item.scheduledFor || item.preferredDate || '', response: item.response || '', mockScore: '' });
  };

  const save = async () => {
    setSaving(true);
    try {
      if (active.kind === 'sub') {
        await reviewStudentSubmission(active.item._id, { ...form, reviewedBy: trainerName });
      } else {
        await respondStudentRequest(active.item._id, { ...form, respondedBy: trainerName });
      }
      setActive(null);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-5 max-w-[1280px]">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['To review', pendingSubs.length],
          ['Open requests', pendingReqs.length],
          ['Reviewed', subs.length - pendingSubs.length],
          ['Students', new Set([...subs, ...reqs].map((x) => x.studentId)).size]
        ].map(([l, v]) => (
          <div key={l} className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm">
            <div className="text-2xl font-black text-slate-900">{v}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{l}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex bg-slate-100 rounded-xl p-1 text-xs font-bold">
          {[['submissions', `Submissions (${pendingSubs.length})`], ['requests', `Requests (${pendingReqs.length})`]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg ${tab === k ? 'bg-white text-[#00897b] shadow-sm' : 'text-slate-600'}`}>{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white">
            <option value="pending">Needs action</option>
            <option value="all">All</option>
          </select>
          <button onClick={load} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {error && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">⚠ {error}</div>}

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm divide-y divide-slate-100">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Loading…</div>
        ) : tab === 'submissions' ? (
          shownSubs.length === 0 ? <div className="p-10 text-center text-xs text-slate-500">{filter === 'pending' ? 'Nothing waiting for review.' : 'No submissions from your students yet.'}</div> : shownSubs.map((s) => (
            <div key={s._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#00897b] flex items-center justify-center flex-shrink-0">{s.type === 'video_intro' ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}</div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{s.title}</div>
                  <div className="text-[11px] text-slate-500">{s.studentName} · {s.studentId} · {TYPE_LABEL[s.type]} · {fmt(s.createdAt)}</div>
                  {s.note && <div className="text-[11px] text-slate-600 mt-1">“{s.note}”</div>}
                  {s.feedback && <div className="text-[11px] text-slate-500 mt-1">Your feedback: {s.feedback}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${TONE[s.status]}`}>{s.status}{typeof s.score === 'number' ? ` · ${s.score}` : ''}</span>
                {s.fileName && <a href={studentSubmissionFileUrl(s._id)} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1"><ExternalLink className="w-3 h-3" />{fmtSize(s.fileSize) || 'File'}</a>}
                {s.link && <a href={s.link} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1"><ExternalLink className="w-3 h-3" />Link</a>}
                <button onClick={() => open('sub', s)} className="px-3 py-1.5 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold">{s.status === 'Submitted' ? 'Review' : 'Edit review'}</button>
              </div>
            </div>
          ))
        ) : (
          shownReqs.length === 0 ? <div className="p-10 text-center text-xs text-slate-500">{filter === 'pending' ? 'No open requests.' : 'No requests from your students yet.'}</div> : shownReqs.map((r) => (
            <div key={r._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900">{REQ_LABEL[r.type] || r.type} — {r.studentName}</div>
                <div className="text-[11px] text-slate-500">{r.studentId} · {r.batch} · raised {fmt(r.createdAt)}{r.preferredDate ? ` · prefers ${fmt(r.preferredDate)}` : ''}</div>
                {r.message && <div className="text-[11px] text-slate-600 mt-1">“{r.message}”</div>}
                {r.scheduledFor && <div className="text-[11px] text-indigo-700 mt-1">Scheduled: {fmt(r.scheduledFor)}</div>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${TONE[r.status]}`}>{r.status}</span>
                <button onClick={() => open('req', r)} className="px-3 py-1.5 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold">Respond</button>
              </div>
            </div>
          ))
        )}
      </div>

      {active && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 flex items-center justify-center p-4" onClick={() => setActive(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setActive(null)} className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
            {active.kind === 'sub' ? (
              <>
                <h3 className="text-base font-bold text-slate-900 pr-8">Review: {active.item.title}</h3>
                <p className="text-xs text-slate-500">{active.item.studentName} · {TYPE_LABEL[active.item.type]}</p>
                <div className="space-y-3 mt-5 text-xs">
                  <label className="block"><span className="font-semibold text-slate-700 block mb-1">Decision</span>
                    <select value={form.status} onChange={setF('status')} className={inputCls}><option>Approved</option><option>Needs Revision</option></select>
                  </label>
                  <label className="block"><span className="font-semibold text-slate-700 block mb-1">Score out of 100 (optional)</span>
                    <input type="number" min={0} max={100} value={form.score} onChange={setF('score')} className={inputCls} />
                  </label>
                  <label className="block"><span className="font-semibold text-slate-700 block mb-1">Feedback for the student</span>
                    <textarea rows={4} value={form.feedback} onChange={setF('feedback')} className={inputCls} />
                  </label>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold text-slate-900 pr-8">{REQ_LABEL[active.item.type]} — {active.item.studentName}</h3>
                {active.item.message && <p className="text-xs text-slate-500 mt-1">“{active.item.message}”</p>}
                <div className="space-y-3 mt-5 text-xs">
                  <label className="block"><span className="font-semibold text-slate-700 block mb-1">Status</span>
                    <select value={form.status} onChange={setF('status')} className={inputCls}>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Resolved">{active.item.type === 'mock_interview' ? 'Completed' : 'Resolved'}</option>
                      <option value="Declined">Declined</option>
                    </select>
                  </label>
                  {form.status === 'Scheduled' && (
                    <label className="block"><span className="font-semibold text-slate-700 block mb-1">Date & time</span>
                      <input type="datetime-local" value={form.scheduledFor} onChange={setF('scheduledFor')} className={inputCls} />
                    </label>
                  )}
                  {active.item.type === 'mock_interview' && form.status === 'Resolved' && (
                    <label className="block"><span className="font-semibold text-slate-700 block mb-1">Mock score out of 100 (updates readiness)</span>
                      <input type="number" min={0} max={100} value={form.mockScore} onChange={setF('mockScore')} className={inputCls} />
                    </label>
                  )}
                  <label className="block"><span className="font-semibold text-slate-700 block mb-1">Message to the student</span>
                    <textarea rows={3} value={form.response} onChange={setF('response')} placeholder={form.status === 'Scheduled' ? 'e.g. Join the class Zoom link at this time' : ''} className={inputCls} />
                  </label>
                </div>
              </>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setActive(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={save} disabled={saving || (active.kind === 'req' && form.status === 'Scheduled' && !form.scheduledFor)} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#009688] hover:bg-[#00897b] text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
