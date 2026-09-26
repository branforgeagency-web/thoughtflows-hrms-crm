import React, { useEffect, useState } from 'react';
import { getLmsCertifications, onDataUpdate } from '../services/api';

// Leadership view: which counsellors have finished LMS certification
// (5 mandatory modules) and which course tests they have passed.
export default function LmsCertificationBoard() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () => getLmsCertifications()
      .then((r) => { if (alive) { setRows(Array.isArray(r) ? r : []); setError(''); } })
      .catch((e) => { if (alive) setError(e?.response?.data?.error || e.message); });
    load();
    const off = onDataUpdate((entity) => { if (entity === 'lms') load(); });
    return () => { alive = false; off(); };
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6">
      <h3 className="text-sm font-bold text-slate-900 mb-3">🎓 Counsellor LMS certification</h3>
      {error ? <div className="text-xs text-rose-600">{error}</div>
        : rows === null ? <div className="text-xs text-slate-500">Loading…</div>
        : rows.length === 0 ? <div className="text-xs text-slate-500 py-4 text-center">No counsellor has started the HR LMS yet.</div>
        : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-3">Counsellor</th><th className="py-2 px-2">Mandatory</th><th className="py-2 pl-2">Courses unlocked</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.email || r.userName} className="border-b border-slate-50">
                    <td className="py-2.5 pr-3 font-semibold text-slate-800">{r.userName || r.email}</td>
                    <td className="py-2.5 px-2">
                      <span className={`font-bold ${r.mandatoryComplete ? 'text-emerald-600' : 'text-amber-600'}`}>{r.mandatoryPassed.length}/{r.mandatory.length}</span>
                      {!r.mandatoryComplete && <span className="text-slate-400"> · missing {r.mandatory.filter((m) => !r.mandatoryPassed.includes(m)).join(', ')}</span>}
                    </td>
                    <td className="py-2.5 pl-2 text-slate-600">{r.mandatoryComplete && r.coursesPassed.length ? r.coursesPassed.join(', ') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
