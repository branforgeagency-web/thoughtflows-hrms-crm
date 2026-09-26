import React, { useEffect, useState } from 'react';
import { getFeedbackSummary, onDataUpdate } from '../services/api';

// Trainer-quality roll-up from Student Portal ratings (class + trainer).
// Leadership & HR see every trainer; pass trainerId for a single trainer's own view.
const tone = (v) => (v >= 4.2 ? 'text-emerald-600' : v >= 3.5 ? 'text-amber-600' : 'text-rose-600');

export default function TrainerQualityBoard({ trainerId, days = 90, title = 'Trainer Quality (student ratings)' }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => getFeedbackSummary({ trainerId, days })
      .then((r) => { if (alive) { setRows(Array.isArray(r) ? r : []); setError(''); } })
      .catch((e) => { if (alive) setError(e?.response?.data?.error || e.message); });
    load();
    const off = onDataUpdate((entity) => { if (entity === 'feedback') load(); });
    return () => { alive = false; off(); };
  }, [trainerId, days]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-slate-900">⭐ {title}</h3>
        <span className="text-[11px] text-slate-400">Last {days} days</span>
      </div>
      {error ? <div className="text-xs text-rose-600">{error}</div>
        : rows === null ? <div className="text-xs text-slate-500">Loading…</div>
        : rows.length === 0 ? <div className="text-xs text-slate-500 py-4 text-center">No student ratings yet. Students rate classes and their trainer from the Student Portal.</div>
        : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-3">Trainer</th><th className="py-2 px-2 text-right">Overall</th><th className="py-2 px-2 text-right">Classes</th><th className="py-2 px-2 text-right">Trainer</th><th className="py-2 px-2 text-right">Ratings</th><th className="py-2 pl-2 text-right">Low (≤2★)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <React.Fragment key={r.trainerId || r.trainerName}>
                    <tr className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => setOpen(open === r.trainerId ? null : r.trainerId)}>
                      <td className="py-2.5 pr-3 font-semibold text-slate-800">{r.trainerName || r.trainerId}</td>
                      <td className={`py-2.5 px-2 text-right font-black ${tone(r.avg)}`}>{r.avg?.toFixed(1)}★</td>
                      <td className="py-2.5 px-2 text-right text-slate-600">{r.classAvg != null ? r.classAvg.toFixed(1) : '—'}</td>
                      <td className="py-2.5 px-2 text-right text-slate-600">{r.trainerAvg != null ? r.trainerAvg.toFixed(1) : '—'}</td>
                      <td className="py-2.5 px-2 text-right text-slate-600">{r.count}</td>
                      <td className={`py-2.5 pl-2 text-right font-bold ${r.low ? 'text-rose-600' : 'text-slate-400'}`}>{r.low}</td>
                    </tr>
                    {open === r.trainerId && (
                      <tr><td colSpan={6} className="pb-3">
                        <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                          {(r.recent || []).map((c, i) => (
                            <div key={i} className="text-[11px] text-slate-700"><b className={tone(c.rating)}>{c.rating}★</b> {c.kind === 'class' ? `“${c.topic || 'class'}”` : 'trainer'}{c.comment ? ` — ${c.comment}` : ''} <span className="text-slate-400">· {c.studentName}</span></div>
                          ))}
                        </div>
                      </td></tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
