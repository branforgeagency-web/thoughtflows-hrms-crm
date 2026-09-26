import React, { useEffect, useState } from 'react';
import { getStudentTimeline, onDataUpdate } from '../services/api';

// One timeline per student: admission, handover, doubts, submissions,
// requests, tickets, remedial steps, feedback and placement — newest first.
const KIND = {
  admission: { icon: '🎓', tone: 'bg-emerald-100 text-emerald-700', label: 'Admission' },
  handover: { icon: '👩‍🏫', tone: 'bg-orange-100 text-orange-700', label: 'Handover' },
  remedial: { icon: '🩹', tone: 'bg-rose-100 text-rose-700', label: 'Remedial' },
  syllabus: { icon: '📘', tone: 'bg-indigo-100 text-indigo-700', label: 'Syllabus' },
  recommendation: { icon: '✅', tone: 'bg-teal-100 text-teal-700', label: 'Recommendation' },
  doubt: { icon: '💬', tone: 'bg-sky-100 text-sky-700', label: 'Doubt' },
  submission: { icon: '📤', tone: 'bg-violet-100 text-violet-700', label: 'Submission' },
  request: { icon: '📨', tone: 'bg-amber-100 text-amber-700', label: 'Request' },
  ticket: { icon: '🎫', tone: 'bg-red-100 text-red-700', label: 'Ticket' },
  feedback: { icon: '⭐', tone: 'bg-yellow-100 text-yellow-700', label: 'Feedback' },
  placement: { icon: '💼', tone: 'bg-purple-100 text-purple-700', label: 'Placement' }
};

const fmt = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function StudentTimeline({ studentId, compact = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!studentId) return undefined;
    let alive = true;
    const load = () => getStudentTimeline(studentId)
      .then((d) => { if (alive) { setData(d); setError(''); } })
      .catch((e) => { if (alive) setError(e?.response?.data?.error || e.message); });
    load();
    const off = onDataUpdate(load);
    return () => { alive = false; off(); };
  }, [studentId]);

  if (error) return <div className="text-xs text-rose-600 p-3">{error}</div>;
  if (!data) return <div className="text-xs text-slate-500 p-3">Loading timeline…</div>;

  const kinds = [...new Set(data.events.map((e) => e.kind))];
  const events = filter === 'all' ? data.events : data.events.filter((e) => e.kind === filter);

  return (
    <div>
      {!compact && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {['all', ...kinds].map((k) => (
            <button key={k} type="button" onClick={() => setFilter(k)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${filter === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              {k === 'all' ? `All (${data.events.length})` : `${KIND[k]?.label || k}`}
            </button>
          ))}
        </div>
      )}
      {events.length === 0 ? (
        <div className="text-xs text-slate-500 p-3">No activity yet.</div>
      ) : (
        <ol className="relative border-l-2 border-slate-100 ml-3 space-y-3">
          {events.map((e, i) => {
            const k = KIND[e.kind] || { icon: '•', tone: 'bg-slate-100 text-slate-600' };
            return (
              <li key={`${e.kind}-${e.at}-${i}`} className="ml-4">
                <span className={`absolute -left-[13px] w-6 h-6 rounded-full flex items-center justify-center text-xs ${k.tone}`}>{k.icon}</span>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-xs font-bold text-slate-800">{e.title}</span>
                  {e.status && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{e.status}</span>}
                </div>
                {e.detail && <div className="text-[11px] text-slate-600 mt-0.5 whitespace-pre-line">{e.detail}</div>}
                <div className="text-[10px] text-slate-400 mt-0.5">{fmt(e.at)}{e.by ? ` · ${e.by}` : ''}</div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
