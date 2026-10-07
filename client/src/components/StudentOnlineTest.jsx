import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Timer, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { getStudentTest, startStudentTest, saveStudentTestAnswers, submitStudentTest } from '../services/api';

// Student side of an online MCQ test. The server owns the clock (endsAt) and
// the grading; answers are autosaved so a dropped connection loses nothing.
const errOf = (e, fb) => e?.response?.data?.error || e?.message || fb;
const LETTERS = 'ABCDEF';
const mmss = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export default function StudentOnlineTest({ testId, onClose, onFinished }) {
  const [view, setView] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState('');
  const [left, setLeft] = useState(0);
  const offsetRef = useRef(0); // server clock − browser clock
  const saveTimer = useRef(null);
  const submittedRef = useRef(false);

  const apply = useCallback((v) => {
    setView(v);
    if (v?.state === 'in_progress') {
      if (v.serverNow) offsetRef.current = new Date(v.serverNow).getTime() - Date.now();
      setAnswers(v.answers || v.questions.map(() => -1));
    }
  }, []);

  useEffect(() => {
    getStudentTest(testId).then(apply).catch((e) => setError(errOf(e, 'Could not open this test')));
    return () => clearTimeout(saveTimer.current);
  }, [testId, apply]);

  const submit = useCallback(async (auto = false) => {
    if (submittedRef.current) return;
    if (!auto) {
      const skipped = answers.filter((a) => a < 0).length;
      if (!window.confirm(skipped ? `${skipped} question${skipped > 1 ? 's are' : ' is'} unanswered. Submit anyway?` : 'Submit your answers? You cannot change them afterwards.')) return;
    }
    submittedRef.current = true;
    clearTimeout(saveTimer.current);
    setBusy(true);
    try {
      const v = await submitStudentTest(testId, answers);
      apply(v);
      onFinished?.();
    } catch (e) {
      submittedRef.current = false;
      setError(errOf(e, 'Could not submit — check your connection and try again'));
    } finally {
      setBusy(false);
    }
  }, [answers, testId, apply, onFinished]);

  // Countdown; submits automatically at 0
  useEffect(() => {
    if (view?.state !== 'in_progress') return undefined;
    const tick = () => {
      const ms = new Date(view.endsAt).getTime() - (Date.now() + offsetRef.current);
      setLeft(ms);
      if (ms <= 0) submit(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [view?.state, view?.endsAt, submit]);

  // Warn before closing the tab mid-test
  useEffect(() => {
    if (view?.state !== 'in_progress') return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [view?.state]);

  const choose = (qi, oi) => {
    const next = answers.map((a, i) => (i === qi ? oi : a));
    setAnswers(next);
    setSaveState('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveStudentTestAnswers(testId, next).then(() => setSaveState('saved')).catch(() => setSaveState('offline'));
    }, 800);
  };

  const begin = async () => {
    setBusy(true);
    setError('');
    try { apply(await startStudentTest(testId)); } catch (e) { setError(errOf(e, 'Could not start the test')); }
    setBusy(false);
  };

  const close = () => {
    if (view?.state === 'in_progress' && !window.confirm('Leave the test? The timer keeps running and your saved answers are submitted when time is up. You can come back before then.')) return;
    onClose();
  };

  const answered = answers.filter((a) => a >= 0).length;

  return (
    <div className="fixed inset-0 z-[65] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[95vh] flex flex-col shadow-2xl">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">{view?.name || 'Online test'}</h3>
            {view && <p className="text-[11px] text-slate-500">{[view.questionCount && `${view.questionCount} questions`, `${view.totalMarks} marks`, `pass ${view.passMark}`, `${view.durationMin} min`].filter(Boolean).join(' · ')}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {view?.state === 'in_progress' && (
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-sm ${left < 60000 ? 'bg-rose-50 text-rose-700' : left < 300000 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-800'}`}>
                <Timer className="w-4 h-4" />{mmss(left)}
              </span>
            )}
            <button onClick={close} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {!view && !error && <div className="py-16 text-center text-xs text-slate-500"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading…</div>}

          {view?.state === 'not_started' && (
            <div className="max-w-md mx-auto text-center space-y-4 py-6">
              <div className="text-4xl">📝</div>
              <h4 className="text-lg font-black text-slate-900">{view.name}</h4>
              {view.topic && <p className="text-xs text-slate-500">{view.topic}</p>}
              <ul className="text-xs text-left text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
                <li>• {view.questionCount} multiple-choice questions · {view.totalMarks} marks · pass mark {view.passMark}</li>
                <li>• You get <b>{view.durationMin} minutes</b> from the moment you press Start — the timer does not stop.</li>
                <li>• Answers are saved as you go. When time is up the test is submitted automatically.</li>
                <li>• One attempt only. Your score goes straight to your trainer and your progress.</li>
              </ul>
              {view.alreadyScored ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">Your trainer has already entered a score for this test.</p>
              ) : !view.opensToday ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">This test opens on {view.date}.</p>
              ) : (
                <button onClick={begin} disabled={busy} className="w-full py-3 rounded-2xl bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold text-sm disabled:opacity-50">{busy ? 'Starting…' : 'Start test'}</button>
              )}
            </div>
          )}

          {view?.state === 'in_progress' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {view.questions.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)} className={`w-8 h-8 rounded-lg text-[11px] font-bold border ${i === current ? 'bg-[#483ec7] text-white border-[#483ec7]' : answers[i] >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200'}`}>{i + 1}</button>
                ))}
              </div>
              {(() => {
                const q = view.questions[current];
                return (
                  <div className="border border-slate-200 rounded-2xl p-4 sm:p-5">
                    <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-2"><span>Question {current + 1} of {view.questions.length}</span><span>{q.marks} mark{q.marks > 1 ? 's' : ''}</span></div>
                    <p className="text-sm text-slate-900 font-semibold whitespace-pre-line">{q.q}</p>
                    <div className="mt-4 space-y-2">
                      {q.options.map((o, j) => (
                        <button key={j} onClick={() => choose(current, j)} className={`w-full text-left px-4 py-3 rounded-xl border text-sm flex items-start gap-3 transition ${answers[current] === j ? 'bg-indigo-50 border-[#483ec7] text-slate-900' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${answers[current] === j ? 'bg-[#483ec7] text-white' : 'bg-slate-100 text-slate-500'}`}>{LETTERS[j]}</span>
                          <span>{o}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div className="flex items-center justify-between gap-2">
                <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold disabled:opacity-40">‹ Previous</button>
                <span className="text-[11px] text-slate-500">{answered}/{view.questions.length} answered{saveState === 'saving' ? ' · saving…' : saveState === 'saved' ? ' · saved' : saveState === 'offline' ? ' · not saved (offline)' : ''}</span>
                {current < view.questions.length - 1
                  ? <button onClick={() => setCurrent((c) => c + 1)} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Next ›</button>
                  : <button onClick={() => submit(false)} disabled={busy} className="px-4 py-2 rounded-xl bg-[#0d9488] text-white text-xs font-bold disabled:opacity-50">{busy ? 'Submitting…' : 'Submit'}</button>}
              </div>
            </div>
          )}

          {view?.state === 'submitted' && (
            <div className="space-y-5">
              <div className={`rounded-2xl p-5 text-center border ${view.score >= view.passMark ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                {view.score >= view.passMark ? <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" /> : <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />}
                <div className="text-3xl font-black text-slate-900 mt-2">{view.score}/{view.totalMarks}</div>
                <div className="text-xs font-bold mt-1">{view.score >= view.passMark ? 'Passed' : `Below the pass mark (${view.passMark})`} · {view.correct} of {view.questionCount} correct</div>
                {view.autoSubmitted && <div className="text-[11px] text-slate-500 mt-1">Submitted automatically when time ran out.</div>}
              </div>
              {view.rationale && <div className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 whitespace-pre-line"><b>Trainer's rationale:</b> {view.rationale}</div>}
              <div className="space-y-3">
                {view.review.map((q, i) => (
                  <div key={i} className={`border rounded-2xl p-4 text-xs ${q.yours === q.answer ? 'border-emerald-200' : 'border-rose-200'}`}>
                    <div className="font-bold text-slate-900 whitespace-pre-line">{i + 1}. {q.q}</div>
                    <div className="mt-2 space-y-1">
                      {q.options.map((o, j) => (
                        <div key={j} className={`px-3 py-1.5 rounded-lg ${j === q.answer ? 'bg-emerald-50 text-emerald-800 font-semibold' : j === q.yours ? 'bg-rose-50 text-rose-700 line-through' : 'text-slate-600'}`}>{LETTERS[j]}. {o}{j === q.answer ? ' ✓' : ''}</div>
                      ))}
                      {q.yours < 0 && <div className="text-[11px] text-slate-400">Not answered</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="mt-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">⚠ {error}</div>}
        </div>
      </div>
    </div>
  );
}
