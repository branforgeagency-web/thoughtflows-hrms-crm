import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  Timer,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Volume2,
  VolumeX,
  Trophy,
  RotateCcw,
  BarChart3,
  Layers,
  Sparkles,
  HelpCircle,
  Award
} from 'lucide-react';
import {
  getStudentTest,
  startStudentTest,
  saveStudentTestAnswers,
  submitStudentTest,
  getTestLeaderboard,
  reallocateStudentTest
} from '../services/api';

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

  // Result view active tab: 'review' | 'aapc' | 'leaderboard'
  const [resultTab, setResultTab] = useState('review');
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Audio Rationale state
  const [playingAudioIndex, setPlayingAudioIndex] = useState(null);
  const audioElemRef = useRef(null);

  const stopAudio = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioElemRef.current) {
      audioElemRef.current.pause();
      audioElemRef.current.currentTime = 0;
    }
    setPlayingAudioIndex(null);
  }, []);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

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

  // Load leaderboard when switching to leaderboard tab
  useEffect(() => {
    if (resultTab === 'leaderboard' && view?.state === 'submitted') {
      setLoadingLeaderboard(true);
      getTestLeaderboard(testId)
        .then((data) => setLeaderboardData(data))
        .catch(() => setLeaderboardData(null))
        .finally(() => setLoadingLeaderboard(false));
    }
  }, [resultTab, view?.state, testId]);

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

  const handleRetake = async () => {
    if (!window.confirm('Do you want to reallocate and retake this exam? Your prior score will be preserved in your attempt history while you complete the new attempt.')) return;
    stopAudio();
    setBusy(true);
    setError('');
    try {
      const updated = await reallocateStudentTest(testId, { reason: 'Student retake for score & chapter improvement' });
      apply(updated);
      submittedRef.current = false;
      onFinished?.();
    } catch (e) {
      setError(errOf(e, 'Could not reallocate exam for retake'));
    } finally {
      setBusy(false);
    }
  };

  const playAudioRationale = (index, q) => {
    if (playingAudioIndex === index) {
      stopAudio();
      return;
    }
    stopAudio();

    if (q.audioRationaleUrl) {
      if (!audioElemRef.current) audioElemRef.current = new Audio();
      audioElemRef.current.src = q.audioRationaleUrl;
      audioElemRef.current.onended = () => setPlayingAudioIndex(null);
      audioElemRef.current.onerror = () => fallbackSpeech(index, q);
      setPlayingAudioIndex(index);
      audioElemRef.current.play().catch(() => fallbackSpeech(index, q));
    } else {
      fallbackSpeech(index, q);
    }
  };

  const fallbackSpeech = (index, q) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setError('Audio narration is not supported by your current browser.');
      return;
    }
    const correctLetter = LETTERS[q.answer] || '';
    const correctText = q.options?.[q.answer] || '';
    const explanation = q.audioRationaleText || q.rationale || 'Review course reference materials for full guidance.';
    const toSpeak = `Explanation for Question ${index + 1}. The correct answer is option ${correctLetter}, ${correctText}. Rationale: ${explanation}`;

    const utterance = new SpeechSynthesisUtterance(toSpeak);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setPlayingAudioIndex(null);
    utterance.onerror = () => setPlayingAudioIndex(null);
    setPlayingAudioIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const close = () => {
    if (view?.state === 'in_progress' && !window.confirm('Leave the test? The timer keeps running and your saved answers are submitted when time is up. You can come back before then.')) return;
    stopAudio();
    onClose();
  };

  const answered = answers.filter((a) => a >= 0).length;

  return (
    <div className="fixed inset-0 z-[65] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">{view?.name || 'Online test'}</h3>
              {view?.attemptIteration > 1 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Attempt {view.attemptIteration}
                </span>
              )}
            </div>
            {view && <p className="text-[11px] text-slate-500">{[view.questionCount && `${view.questionCount} questions`, `${view.totalMarks} marks`, `pass ${view.passMark}`, `${view.durationMin} min`].filter(Boolean).join(' · ')}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {view?.state === 'in_progress' && (
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-sm ${left < 60000 ? 'bg-rose-50 text-rose-700' : left < 300000 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-800'}`}>
                <Timer className="w-4 h-4" />{mmss(left)}
              </span>
            )}
            <button onClick={close} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {!view && !error && <div className="py-16 text-center text-xs text-slate-500"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading…</div>}

          {/* STATE: NOT STARTED */}
          {view?.state === 'not_started' && (
            <div className="max-w-md mx-auto text-center space-y-4 py-6">
              <div className="text-4xl">📝</div>
              <h4 className="text-lg font-black text-slate-900">{view.name}</h4>
              {view.topic && <p className="text-xs text-slate-500">{view.topic}</p>}
              <ul className="text-xs text-left text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
                <li>• {view.questionCount} multiple-choice questions · {view.totalMarks} marks · pass mark {view.passMark}</li>
                <li>• You get <b>{view.durationMin} minutes</b> from the moment you press Start — the timer does not stop.</li>
                <li>• Answers are saved as you go. When time is up the test is submitted automatically.</li>
                <li>• Includes AAPC-style chapter breakdown, audio rationale explanations, and score leaderboards.</li>
              </ul>
              {view.alreadyScored ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">Your trainer has already entered a score for this test.</p>
              ) : !view.opensToday ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">This test opens on {view.date}.</p>
              ) : (
                <button onClick={begin} disabled={busy} className="w-full py-3 rounded-2xl bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold text-sm cursor-pointer disabled:opacity-50">{busy ? 'Starting…' : 'Start test'}</button>
              )}
            </div>
          )}

          {/* STATE: IN PROGRESS */}
          {view?.state === 'in_progress' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {view.questions.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)} className={`w-8 h-8 rounded-lg text-[11px] font-bold border cursor-pointer ${i === current ? 'bg-[#483ec7] text-white border-[#483ec7]' : answers[i] >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200'}`}>{i + 1}</button>
                ))}
              </div>
              {(() => {
                const q = view.questions[current];
                return (
                  <div className="border border-slate-200 rounded-2xl p-4 sm:p-5">
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 mb-2">
                      <div className="flex items-center gap-2">
                        <span>Question {current + 1} of {view.questions.length}</span>
                        {q.chapter && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
                            📂 {q.chapter}
                          </span>
                        )}
                      </div>
                      <span>{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-sm text-slate-900 font-semibold whitespace-pre-line">{q.q}</p>
                    <div className="mt-4 space-y-2">
                      {q.options.map((o, j) => (
                        <button key={j} onClick={() => choose(current, j)} className={`w-full text-left px-4 py-3 rounded-xl border text-sm flex items-start gap-3 transition cursor-pointer ${answers[current] === j ? 'bg-indigo-50 border-[#483ec7] text-slate-900' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${answers[current] === j ? 'bg-[#483ec7] text-white' : 'bg-slate-100 text-slate-500'}`}>{LETTERS[j]}</span>
                          <span>{o}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div className="flex items-center justify-between gap-2">
                <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold disabled:opacity-40 cursor-pointer">‹ Previous</button>
                <span className="text-[11px] text-slate-500">{answered}/{view.questions.length} answered{saveState === 'saving' ? ' · saving…' : saveState === 'saved' ? ' · saved' : saveState === 'offline' ? ' · not saved (offline)' : ''}</span>
                {current < view.questions.length - 1
                  ? <button onClick={() => setCurrent((c) => c + 1)} className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer">Next ›</button>
                  : <button onClick={() => submit(false)} disabled={busy} className="px-4 py-2 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-bold disabled:opacity-50 cursor-pointer">{busy ? 'Submitting…' : 'Submit'}</button>}
              </div>
            </div>
          )}

          {/* STATE: SUBMITTED (RESULT & REVIEW) */}
          {view?.state === 'submitted' && (
            <div className="space-y-5">
              {/* Score Banner with Reallocation / Retake Option */}
              <div className={`rounded-3xl p-5 sm:p-6 text-center border relative overflow-hidden ${view.score >= view.passMark ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
                {view.score >= view.passMark ? <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" /> : <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />}
                <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">
                  {view.score}/{view.totalMarks}
                </div>
                <div className="text-xs font-bold mt-1 text-slate-700">
                  {view.score >= view.passMark ? '✓ Passed Assessment' : `Below pass mark (${view.passMark})`} · {view.correct} of {view.questionCount} correct ({Math.round(((view.score || 0) / (view.totalMarks || 1)) * 100)}%)
                </div>
                {view.autoSubmitted && <div className="text-[11px] text-slate-500 mt-1">Submitted automatically when time ran out.</div>}

                {/* Retake / Reallocation Action */}
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-center gap-3 flex-wrap">
                  <button
                    onClick={handleRetake}
                    disabled={busy}
                    className="px-4 py-2 rounded-full text-xs font-bold bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Start a new reallocated attempt for this exam"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Retake Exam (Attempt {(view.attemptIteration || 1) + 1})</span>
                  </button>
                  <span className="text-[11px] text-slate-400">
                    Reallocating preserves your attempt history while granting a fresh attempt.
                  </span>
                </div>
              </div>

              {/* Navigation Tabs: Review & Audio | AAPC Score Report | Leaderboard */}
              <div className="flex border-b border-slate-200 gap-2">
                {[
                  { id: 'review', label: 'Review & Audio Rationales', icon: Volume2 },
                  { id: 'aapc', label: 'AAPC Score Report', icon: BarChart3 },
                  { id: 'leaderboard', label: 'Score Leaderboard', icon: Trophy }
                ].map((t) => {
                  const Icon = t.icon;
                  const active = resultTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { stopAudio(); setResultTab(t.id); }}
                      className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 cursor-pointer transition-all ${
                        active
                          ? 'border-[#0d9488] text-[#0d9488]'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: REVIEW & AUDIO RATIONALES */}
              {resultTab === 'review' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3 text-xs text-indigo-900">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-indigo-600" />
                      <span>
                        <strong className="font-bold">Audio Rationale Available:</strong> Click <strong>Listen to Rationale</strong> on any question to hear audio explanations.
                      </span>
                    </div>
                    {playingAudioIndex !== null && (
                      <button
                        onClick={stopAudio}
                        className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-[11px] font-bold hover:bg-rose-200 cursor-pointer"
                      >
                        ■ Stop Audio
                      </button>
                    )}
                  </div>

                  {view.rationale && (
                    <div className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 whitespace-pre-line">
                      <b>Trainer's overall notes:</b> {view.rationale}
                    </div>
                  )}

                  <div className="space-y-3">
                    {view.review?.map((q, i) => {
                      const isCorrect = q.yours === q.answer;
                      const isPlaying = playingAudioIndex === i;
                      return (
                        <div
                          key={i}
                          className={`border rounded-2xl p-4 text-xs transition-all ${
                            isCorrect ? 'border-emerald-200 bg-white' : 'border-rose-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="font-bold text-slate-900 whitespace-pre-line flex-1">
                              {i + 1}. {q.q}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {q.chapter && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                  {q.chapter}
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {isCorrect ? '✓ Correct' : '✕ Incorrect'}
                              </span>
                            </div>
                          </div>

                          {/* Options list */}
                          <div className="mt-2 space-y-1">
                            {q.options.map((o, j) => (
                              <div
                                key={j}
                                className={`px-3 py-1.5 rounded-lg flex items-center justify-between text-xs ${
                                  j === q.answer
                                    ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
                                    : j === q.yours
                                    ? 'bg-rose-50 text-rose-700 line-through border border-rose-200'
                                    : 'text-slate-600'
                                }`}
                              >
                                <span>{LETTERS[j]}. {o}</span>
                                {j === q.answer && <span className="text-[10px] font-bold text-emerald-700">✓ Correct Choice</span>}
                                {j === q.yours && j !== q.answer && <span className="text-[10px] font-bold text-rose-600">Your Choice</span>}
                              </div>
                            ))}
                            {q.yours < 0 && <div className="text-[11px] text-slate-400 italic">Not answered</div>}
                          </div>

                          {/* Rationale & Audio Player */}
                          <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50/80 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                                <span>💡</span> Explanation & Rationale
                              </span>
                              <button
                                onClick={() => playAudioRationale(i, q)}
                                className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                                  isPlaying
                                    ? 'bg-indigo-600 text-white shadow-xs animate-pulse'
                                    : 'bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}
                                title="Listen to narration explaining the answer"
                              >
                                {isPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                <span>{isPlaying ? 'Playing Audio (Stop)' : 'Listen to Audio Rationale'}</span>
                              </button>
                            </div>
                            <p className="text-[11.5px] text-slate-700 leading-relaxed whitespace-pre-line">
                              {q.rationale || 'The correct option aligns with standard medical coding guidelines and anatomical references.'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: AAPC-STYLE SCORE REPORT */}
              {resultTab === 'aapc' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-slate-900 to-[#0e3b43] text-white rounded-2xl p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="text-[11px] uppercase font-mono tracking-wider text-teal-300">
                          AAPC-Style Performance Diagnostic Report
                        </div>
                        <h4 className="text-base font-bold mt-0.5">{view.name}</h4>
                        <div className="text-xs text-slate-300 mt-1">
                          Diagnostic breakdown by chapter/domain to pinpoint strengths and revision priorities.
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-amber-400">
                          {Math.round(((view.score || 0) / (view.totalMarks || 1)) * 100)}%
                        </div>
                        <div className="text-[10px] text-teal-200 uppercase font-bold">
                          AAPC Benchmark: 70%+
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chapter breakdown list */}
                  <div className="space-y-2.5">
                    {(!view.chapterBreakdown || view.chapterBreakdown.length === 0) ? (
                      <div className="py-8 text-center text-xs text-slate-500">
                        No chapter breakdown available for this assessment.
                      </div>
                    ) : (
                      view.chapterBreakdown.map((chap, idx) => {
                        const isStrength = chap.mastery === 'Strength';
                        const isModerate = chap.mastery === 'Moderate';
                        return (
                          <div
                            key={idx}
                            className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-2 shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>📂</span>
                                  <span>{chap.name}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {chap.correctCount} of {chap.totalQuestions} questions correct · {chap.earnedMarks}/{chap.totalMarks} marks
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                                  isStrength
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : isModerate
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}>
                                  {chap.mastery === 'Strength' ? '✓ Strength' : chap.mastery === 'Moderate' ? '⚡ Moderate' : '⚠ Improvement Area'} ({chap.percentage}%)
                                </span>
                              </div>
                            </div>

                            {/* Visual Progress Bar */}
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isStrength ? 'bg-emerald-500' : isModerate ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${chap.percentage}%` }}
                              />
                            </div>

                            {/* Targeted Diagnostic Feedback */}
                            <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl">
                              {isStrength
                                ? 'Mastery verified: Excellent accuracy on codes and guidelines in this domain.'
                                : isModerate
                                ? 'Approaching benchmark: Re-review edge-case guidelines and practice 5–10 scenario questions.'
                                : 'Priority revision area: Schedule 1-on-1 doubt session with trainer and practice chapter questions.'}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: SCORE LEADERBOARD */}
              {resultTab === 'leaderboard' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong className="font-bold">Exam Leaderboard:</strong> Peer performance rankings for <strong>{view.name}</strong>.
                      </span>
                    </div>
                    {leaderboardData && (
                      <span className="font-mono text-amber-800 font-bold text-[11px]">
                        {leaderboardData.totalParticipants} Participants
                      </span>
                    )}
                  </div>

                  {loadingLeaderboard ? (
                    <div className="py-12 text-center text-xs text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                      Loading leaderboard rankings…
                    </div>
                  ) : !leaderboardData || leaderboardData.leaderboard?.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">
                      No participants have submitted this exam yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {leaderboardData.leaderboard.map((row) => (
                        <div
                          key={row.studentId + (row.attemptIteration || 1)}
                          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs transition ${
                            row.isCurrentUser
                              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-200'
                              : 'bg-white border-slate-200/90'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-8 text-center text-sm font-black shrink-0">
                              {row.medal}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 flex items-center gap-2 truncate">
                                <span>{row.studentName}</span>
                                {row.isCurrentUser && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">
                                    You
                                  </span>
                                )}
                                {row.attemptIteration > 1 && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    (Attempt {row.attemptIteration})
                                  </span>
                                )}
                              </div>
                              <div className="text-[10.5px] text-slate-500">
                                Time: {row.durationMin}m · {row.correct}/{view.questionCount} correct
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-sm font-black text-slate-900">
                              {row.score}/{row.totalMarks} <span className="text-[11px] font-mono text-slate-500">({row.percentage}%)</span>
                            </div>
                            <span className={`text-[10px] font-bold ${row.passed ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {row.passed ? '✓ Passed' : 'Below Pass'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && <div className="mt-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">⚠ {error}</div>}
        </div>
      </div>
    </div>
  );
}

