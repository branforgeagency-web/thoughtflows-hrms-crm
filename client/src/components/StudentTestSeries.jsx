import React, { useCallback, useEffect, useState } from 'react';
import { ListChecks, Clock, FileQuestion, Trophy, PlayCircle, RotateCcw, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getMyTestSeries } from '../services/api';

// Student Portal → Test Series. Published series for the student's course;
// each test opens in the existing online test screen (StudentOnlineTest)
// through onOpenTest(testId). Mocks can be retaken from the result screen.
export default function StudentTestSeries({ onOpenTest, refreshKey = 0 }) {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getMyTestSeries();
      const list = Array.isArray(data) ? data : [];
      setSeries(list);
      setActiveId((prev) => (list.some((s) => s.id === prev) ? prev : list[0]?.id || ''));
      setError('');
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading) return <div className="py-12 text-center text-xs text-slate-500"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0d9488]" />Loading test series…</div>;
  if (error) return <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex gap-2"><AlertCircle className="w-4 h-4" />{error}</div>;
  if (!series.length) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
        <ListChecks className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <div className="text-sm font-bold text-slate-700">No test series for your course yet</div>
        <p className="text-xs text-slate-500 mt-1">When the training team publishes mock tests for your course, they appear here.</p>
      </div>
    );
  }

  const active = series.find((s) => s.id === activeId) || series[0];

  return (
    <div className="space-y-4">
      {series.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {series.map((s) => (
            <button key={s.id} type="button" onClick={() => setActiveId(s.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border ${s.id === active.id ? 'bg-[#0f212d] text-white border-[#0f212d]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
              {s.name} <span className="opacity-70">· {s.done}/{s.total}</span>
            </button>
          ))}
        </div>
      )}

      <div className="bg-[#0f212d] rounded-2xl p-5 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">{active.name}</h2>
            {active.description && <p className="text-xs text-slate-300 mt-1 max-w-2xl">{active.description}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-extrabold">{active.done}<span className="text-sm text-slate-400">/{active.total}</span></div>
            <div className="text-[10px] uppercase tracking-wider text-[#5aa8b7] font-bold">tests taken</div>
          </div>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-[#1b3446] overflow-hidden">
          <div className="h-full bg-[#14b8a6]" style={{ width: `${active.total ? Math.round((active.done / active.total) * 100) : 0}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {active.tests.map((t, i) => {
          const passed = t.bestScore != null && t.bestScore >= t.passMark;
          return (
            <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Test {i + 1}</div>
                  <div className="text-sm font-extrabold text-slate-900">{t.name}</div>
                  {t.topic && <div className="text-[11px] text-slate-500">{t.topic}</div>}
                </div>
                {t.bestScore != null && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${passed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {passed ? <CheckCircle2 className="w-3 h-3" /> : <Trophy className="w-3 h-3" />}Best {t.bestScore}/{t.totalMarks}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1"><FileQuestion className="w-3.5 h-3.5 text-slate-400" />{t.questionCount} questions</span>
                <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" />{t.durationMin} min</span>
                <span>{t.totalMarks} marks · pass {t.passMark}</span>
                {t.attemptsTaken > 0 && <span>{t.attemptsTaken} attempt{t.attemptsTaken === 1 ? '' : 's'}</span>}
              </div>
              <button type="button" onClick={() => onOpenTest?.(t.id)}
                className={`mt-auto w-full py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 ${
                  t.state === 'in_progress' ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : t.state === 'submitted' ? 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-50'
                      : 'bg-[#009688] hover:bg-[#00897b] text-white'}`}>
                {t.state === 'in_progress' ? <><PlayCircle className="w-4 h-4" />Continue test</>
                  : t.state === 'submitted' ? <><RotateCcw className="w-4 h-4" />View result · retake</>
                    : <><PlayCircle className="w-4 h-4" />Start test</>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
