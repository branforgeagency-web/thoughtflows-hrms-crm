import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, Copy, RefreshCw, RotateCcw, Volume2, Trophy, BookOpen, AlertCircle, Award, CheckCircle2 } from 'lucide-react';
import { saveTestQuestions, getTestAttempts, reallocateTestAttempt } from '../services/api';

// Turn a test into an online MCQ test the batch takes in the Student Portal.
// The server keeps the timer and grades each attempt; the score lands in the
// same place as a manually entered score (test average, readiness, HR, CCCP).
const errOf = (e, fb) => e?.response?.data?.error || e?.message || fb;

export const AAPC_CHAPTERS = [
  'Anatomy & Medical Terminology',
  'ICD-10-CM Coding Guidelines & Conventions',
  'CPT Surgery: Integumentary System (10000)',
  'CPT Surgery: Musculoskeletal System (20000)',
  'CPT Surgery: Respiratory & Cardiovascular (30000)',
  'CPT Surgery: Digestive System (40000)',
  'CPT Surgery: Urinary & Genital (50000)',
  'CPT Surgery: Nervous & Eye/Ear (60000)',
  'Evaluation & Management (E/M)',
  'Anesthesia & Radiology',
  'Pathology & Laboratory',
  'Medicine & HCPCS Level II',
  'Compliance, HIPAA & Regulatory'
];

const blankQ = () => ({
  q: '',
  options: ['', '', '', ''],
  answer: 0,
  marks: 1,
  chapter: 'ICD-10-CM Coding Guidelines & Conventions',
  rationale: '',
  audioRationaleUrl: ''
});

const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-500 bg-white';
const LETTERS = 'ABCDEF';
const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

// Paste format, one block per question (blank line between blocks):
//   Which code set is used for inpatient procedures?
//   A) CPT
//   B) ICD-10-PCS *
//   C) HCPCS
// The option marked with * is the correct one.
function parsePasted(text) {
  return String(text || '').split(/\n\s*\n/).map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) return null;
    const qLines = [];
    const options = [];
    let answer = 0;
    lines.forEach((l) => {
      const m = l.match(/^([A-Fa-f])[).:-]\s*(.+)$/);
      if (m) {
        let opt = m[2].trim();
        if (/\*\s*$/.test(opt)) { answer = options.length; opt = opt.replace(/\s*\*\s*$/, ''); }
        options.push(opt);
      } else if (!options.length) qLines.push(l.replace(/^\d+[).]\s*/, ''));
    });
    if (!qLines.length || options.length < 2) return null;
    return {
      q: qLines.join(' '),
      options: options.slice(0, 6),
      answer: Math.min(answer, options.length - 1),
      marks: 1,
      chapter: 'ICD-10-CM Coding Guidelines & Conventions',
      rationale: '',
      audioRationaleUrl: ''
    };
  }).filter(Boolean);
}

export default function OnlineTestBuilder({ test, onClose, onSaved }) {
  const [tab, setTab] = useState('questions');
  const [questions, setQuestions] = useState(() => (
    test.questions?.length
      ? test.questions.map((q) => ({
          q: q.q || '',
          options: [...(q.options || ['', '', '', ''])],
          answer: typeof q.answer === 'number' ? q.answer : 0,
          marks: q.marks || 1,
          chapter: q.chapter || 'ICD-10-CM Coding Guidelines & Conventions',
          rationale: q.rationale || '',
          audioRationaleUrl: q.audioRationaleUrl || ''
        }))
      : [blankQ()]
  ));
  const [durationMin, setDurationMin] = useState(test.durationMin || parseInt(test.timeLimit, 10) || 45);
  const [passMark, setPassMark] = useState(test.mode === 'online' ? test.passMark : '');
  const [paste, setPaste] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [loadingAtt, setLoadingAtt] = useState(false);
  const [reallocatingId, setReallocatingId] = useState('');
  const [attemptSort, setAttemptSort] = useState('score'); // 'score' or 'recent'

  const total = questions.reduce((a, q) => a + (Number(q.marks) || 1), 0);
  const hasAttempts = attempts.length > 0;

  const loadAttempts = async () => {
    setLoadingAtt(true);
    try {
      const data = await getTestAttempts(test.id);
      setAttempts(Array.isArray(data) ? data : []);
    } catch (_) {
      setAttempts([]);
    }
    setLoadingAtt(false);
  };

  useEffect(() => {
    loadAttempts();
  }, [test.id]);

  const edit = (i, patch) => setQuestions((list) => list.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  const editOption = (i, j, v) => setQuestions((list) => list.map((q, k) => (k === i ? { ...q, options: q.options.map((o, m) => (m === j ? v : o)) } : q)));
  const addOption = (i) => setQuestions((list) => list.map((q, k) => (k === i && q.options.length < 6 ? { ...q, options: [...q.options, ''] } : q)));
  const removeOption = (i, j) => setQuestions((list) => list.map((q, k) => {
    if (k !== i || q.options.length <= 2) return q;
    const options = q.options.filter((_, m) => m !== j);
    const answer = q.answer === j ? 0 : q.answer > j ? q.answer - 1 : q.answer;
    return { ...q, options, answer };
  }));

  const importPasted = () => {
    const parsed = parsePasted(paste);
    if (!parsed.length) { setError('Nothing recognised — use the format shown above the box.'); return; }
    setQuestions((list) => [...list.filter((q) => q.q.trim()), ...parsed]);
    setPaste('');
    setShowPaste(false);
    setError('');
  };

  const handleReallocate = async (studentId, studentName) => {
    const reason = window.prompt(`Reallocate exam for ${studentName || studentId}?\n\nEnter reason for retake (optional):`, 'Trainer granted reallocation');
    if (reason === null) return;
    try {
      setReallocatingId(studentId);
      setError('');
      setSuccessMsg('');
      await reallocateTestAttempt(test.id, { studentId, reason: reason.trim() || 'Trainer granted reallocation' });
      setSuccessMsg(`Exam successfully reallocated for ${studentName || studentId}. Previous attempt has been archived.`);
      await loadAttempts();
    } catch (e) {
      setError(errOf(e, 'Could not reallocate exam for student'));
    } finally {
      setReallocatingId('');
    }
  };

  const save = async (clear = false) => {
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const payload = clear
        ? { questions: [] }
        : {
            questions: questions.map((q) => ({
              ...q,
              chapter: (q.chapter || '').trim(),
              rationale: (q.rationale || '').trim(),
              audioRationaleUrl: (q.audioRationaleUrl || '').trim(),
              options: q.options.map((o) => o.trim()),
              marks: Number(q.marks) || 1
            })),
            durationMin: Number(durationMin),
            passMark: passMark === '' ? undefined : Number(passMark)
          };
      const updated = await saveTestQuestions(test.id, payload);
      onSaved?.(updated);
      if (hasAttempts) {
        setSuccessMsg('Questions saved and all existing attempts automatically re-graded!');
        await loadAttempts();
      } else {
        onClose();
      }
    } catch (e) {
      setError(errOf(e, 'Could not save the test'));
    } finally {
      setSaving(false);
    }
  };

  // Sort attempts
  const sortedAttempts = [...attempts].sort((a, b) => {
    if (attemptSort === 'score') {
      const scoreDiff = (b.score || 0) - (a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      const durA = a.submittedAt && a.startedAt ? (new Date(a.submittedAt) - new Date(a.startedAt)) : 999999999;
      const durB = b.submittedAt && b.startedAt ? (new Date(b.submittedAt) - new Date(b.startedAt)) : 999999999;
      return durA - durB;
    }
    return new Date(b.startedAt || 0) - new Date(a.startedAt || 0);
  });

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      {/* Hidden datalist for standard AAPC Chapters / Domains */}
      <datalist id="aapc-chapters-list">
        {AAPC_CHAPTERS.map((ch) => (
          <option key={ch} value={ch} />
        ))}
      </datalist>

      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-black uppercase tracking-wider">Exam Manager</span>
              {hasAttempts && (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Trainer Editor Access
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg truncate">Online test · {test.name}</h3>
            <p className="text-xs text-slate-500">{[test.batch, test.date && `opens ${test.date}`, `${durationMin} mins`].filter(Boolean).join(' · ')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 sm:px-6 pt-4 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex gap-2 text-xs font-bold">
            <button
              onClick={() => setTab('questions')}
              className={`px-4 py-1.5 rounded-full transition-all ${tab === 'questions' ? 'bg-[#0c1921] text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Questions ({questions.length})
            </button>
            <button
              onClick={() => setTab('attempts')}
              className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${tab === 'attempts' ? 'bg-[#0c1921] text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              Attempts & Leaderboard ({attempts.length})
            </button>
          </div>

          {tab === 'attempts' && attempts.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
              <span>Sort:</span>
              <button
                onClick={() => setAttemptSort('score')}
                className={`px-2 py-0.5 rounded-md font-bold ${attemptSort === 'score' ? 'bg-amber-100 text-amber-900' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Leaderboard (Rank)
              </button>
              <button
                onClick={() => setAttemptSort('recent')}
                className={`px-2 py-0.5 rounded-md font-bold ${attemptSort === 'recent' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Recent
              </button>
            </div>
          )}
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {successMsg && (
            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-2.5 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'questions' ? (
            <>
              {hasAttempts ? (
                <div className="text-xs bg-amber-50/90 border border-amber-200/80 text-amber-900 rounded-2xl p-3.5 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Trainer Editor Access is Enabled</div>
                    <p className="text-[11px] text-amber-800/90 mt-0.5">
                      {attempts.length} student attempt(s) have been submitted or are in progress. You can correct question text, adjust marks, reassign correct options, update AAPC chapters, or add audio rationales. Saving changes will <strong>automatically re-grade</strong> all submitted student attempts.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Test metadata controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <label className="block">
                  <span className="font-bold text-slate-600 block mb-1">Duration (minutes)</span>
                  <input
                    type="number"
                    min={5}
                    max={360}
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className="font-bold text-slate-600 block mb-1">Total Marks</span>
                  <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800">
                    {total} marks ({questions.length} questions)
                  </div>
                </label>
                <label className="block">
                  <span className="font-bold text-slate-600 block mb-1">Passing Mark</span>
                  <input
                    type="number"
                    min={1}
                    max={total}
                    value={passMark}
                    placeholder={String(Math.ceil(total * 0.7))}
                    onChange={(e) => setPassMark(e.target.value)}
                    className={inputCls}
                  />
                </label>
              </div>

              {/* Bulk paste button */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowPaste((v) => !v)}
                  className="text-xs font-bold text-[#00897b] hover:underline flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {showPaste ? 'Hide bulk paste tool' : 'Paste many questions at once'}
                </button>
                {showPaste && (
                  <div className="mt-2 space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <pre className="text-[10px] bg-white border border-slate-200 rounded-xl p-2.5 text-slate-600 whitespace-pre-wrap font-mono">
                      {'Which code set is used for inpatient hospital procedures?\nA) CPT\nB) ICD-10-PCS *\nC) HCPCS Level II\nD) CDT\n\n(leave a blank line between questions · * indicates the correct answer)'}
                    </pre>
                    <textarea
                      rows={6}
                      value={paste}
                      onChange={(e) => setPaste(e.target.value)}
                      className={inputCls}
                      placeholder="Paste questions here…"
                    />
                    <button
                      type="button"
                      onClick={importPasted}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                    >
                      Parse & Add Questions
                    </button>
                  </div>
                )}
              </div>

              {/* Question list */}
              <div className="space-y-4">
                {questions.map((q, i) => (
                  <div key={i} className="border border-slate-200 hover:border-slate-300 rounded-2xl p-4 sm:p-5 space-y-3 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-700">Question {i + 1}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span>Marks:</span>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={q.marks}
                            onChange={(e) => edit(i, { marks: e.target.value })}
                            className="w-14 px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold text-center"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setQuestions((list) => list.filter((_, k) => k !== i))}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Chapter & Audio link inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <label className="block">
                        <span className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-teal-600" /> AAPC Chapter / Medical Coding Domain
                        </span>
                        <input
                          list="aapc-chapters-list"
                          value={q.chapter || ''}
                          onChange={(e) => edit(i, { chapter: e.target.value })}
                          placeholder="e.g. ICD-10-CM Coding Guidelines"
                          className={inputCls}
                        />
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                          <Volume2 className="w-3.5 h-3.5 text-indigo-600" /> Audio Rationale URL (Optional MP3 / Clip)
                        </span>
                        <input
                          type="url"
                          value={q.audioRationaleUrl || ''}
                          onChange={(e) => edit(i, { audioRationaleUrl: e.target.value })}
                          placeholder="https://...mp3 (leaves blank for auto speech synthesis)"
                          className={inputCls}
                        />
                      </label>
                    </div>

                    {/* Question text */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">Question Prompt / Case Scenario</span>
                      <textarea
                        rows={2}
                        value={q.q}
                        onChange={(e) => edit(i, { q: e.target.value })}
                        placeholder="Enter question scenario or coding case snippet…"
                        className={inputCls}
                      />
                    </div>

                    {/* Options list */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-600 block">Options & Answer Key</span>
                      {q.options.map((o, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`ans-${i}`}
                            checked={q.answer === j}
                            onChange={() => edit(i, { answer: j })}
                            className="w-4 h-4 accent-[#00897b] cursor-pointer"
                            title="Mark as correct answer"
                          />
                          <span className={`text-[11px] font-black w-4 text-center ${q.answer === j ? 'text-teal-600' : 'text-slate-400'}`}>
                            {LETTERS[j]}
                          </span>
                          <input
                            value={o}
                            onChange={(e) => editOption(i, j, e.target.value)}
                            placeholder={`Option ${LETTERS[j]}`}
                            className={`${inputCls} ${q.answer === j ? 'border-teal-400 bg-teal-50/20' : ''}`}
                          />
                          {q.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(i, j)}
                              className="p-1 text-slate-300 hover:text-rose-600"
                              title="Delete option"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      {q.options.length < 6 && (
                        <button
                          type="button"
                          onClick={() => addOption(i)}
                          className="text-[11px] font-bold text-teal-700 hover:text-teal-800 ml-6 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Option
                        </button>
                      )}
                    </div>

                    {/* Clinical Rationale */}
                    <div className="pt-1">
                      <span className="text-[11px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
                        <span>Answer Rationale & Clinical Explanation</span>
                        <span className="text-[10px] text-slate-400 font-normal">(Audible to student upon exam submission)</span>
                      </span>
                      <textarea
                        rows={2}
                        value={q.rationale || ''}
                        onChange={(e) => edit(i, { rationale: e.target.value })}
                        placeholder="Explain why the selected option is correct and why other choices are invalid according to AAPC / CMS guidelines…"
                        className={inputCls}
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setQuestions((list) => [...list, blankQ()])}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-xs font-bold text-slate-600 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50/30 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Next Question
                </button>
              </div>
            </>
          ) : (
            /* Attempts & Leaderboard tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <div className="text-xs text-slate-600">
                  Total Student Attempts: <span className="font-bold text-slate-900">{attempts.length}</span>
                </div>
                <button
                  type="button"
                  onClick={loadAttempts}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 text-xs font-bold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAtt ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              {sortedAttempts.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                  <Trophy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-500">No student has started this test yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm">
                  {sortedAttempts.map((a, idx) => {
                    const isPassed = typeof test.passMark === 'number' ? a.score >= test.passMark : (a.score / (a.totalMarks || 1)) >= 0.7;
                    const pct = Math.round(((a.score || 0) / (a.totalMarks || 1)) * 100);
                    const rank = idx + 1;
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

                    return (
                      <div key={a._id} className="p-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          {attemptSort === 'score' && a.status === 'submitted' && (
                            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center shrink-0 border border-slate-200">
                              {medal}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate flex items-center gap-2">
                              <span>{a.studentName || a.studentId}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
                                Attempt {a.attemptIteration || 1}
                              </span>
                              {a.reallocated && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                                  Reallocated
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap gap-x-2">
                              <span>ID: {a.studentId}</span>
                              <span>·</span>
                              <span>Started: {fmt(a.startedAt)}</span>
                              {a.submittedAt && (
                                <>
                                  <span>·</span>
                                  <span>Submitted: {fmt(a.submittedAt)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {a.late && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">Late</span>}
                          {a.autoSubmitted && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">Auto-submitted</span>}

                          {a.status === 'submitted' ? (
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${isPassed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                              {a.score}/{a.totalMarks} ({pct}%)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              In Progress
                            </span>
                          )}

                          {/* Reallocation Button */}
                          <button
                            type="button"
                            onClick={() => handleReallocate(a.studentId, a.studentName)}
                            disabled={reallocatingId === a.studentId}
                            className="px-2.5 py-1 rounded-xl border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 text-[11px] font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                            title="Archive current attempt and allow student to take the exam again"
                          >
                            <RotateCcw className={`w-3 h-3 ${reallocatingId === a.studentId ? 'animate-spin' : ''}`} />
                            {reallocatingId === a.studentId ? 'Reallocating…' : 'Reallocate Exam'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions for question editing */}
        {tab === 'questions' && (
          <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-wrap items-center gap-2 justify-end bg-slate-50/70">
            {test.mode === 'online' && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Turn this back into an offline test (scores entered manually)?')) {
                    save(true);
                  }
                }}
                disabled={saving}
                className="mr-auto px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                Make offline
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => save(false)}
              disabled={saving || !questions.length}
              className="px-5 py-2.5 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              {saving
                ? 'Saving changes…'
                : hasAttempts
                ? `Save Corrections & Re-grade (${questions.length} Q)`
                : `Publish Online Test (${questions.length} Q)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
