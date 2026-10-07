import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, Copy, RefreshCw } from 'lucide-react';
import { saveTestQuestions, getTestAttempts } from '../services/api';

// Turn a test into an online MCQ test the batch takes in the Student Portal.
// The server keeps the timer and grades each attempt; the score lands in the
// same place as a manually entered score (test average, readiness, HR, CCCP).
const errOf = (e, fb) => e?.response?.data?.error || e?.message || fb;
const blankQ = () => ({ q: '', options: ['', '', '', ''], answer: 0, marks: 1 });
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
    return { q: qLines.join(' '), options: options.slice(0, 6), answer: Math.min(answer, options.length - 1), marks: 1 };
  }).filter(Boolean);
}

export default function OnlineTestBuilder({ test, onClose, onSaved }) {
  const [tab, setTab] = useState('questions');
  const [questions, setQuestions] = useState(() => (test.questions?.length ? test.questions.map((q) => ({ q: q.q, options: [...q.options], answer: q.answer, marks: q.marks || 1 })) : [blankQ()]));
  const [durationMin, setDurationMin] = useState(test.durationMin || parseInt(test.timeLimit, 10) || 45);
  const [passMark, setPassMark] = useState(test.mode === 'online' ? test.passMark : '');
  const [paste, setPaste] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [loadingAtt, setLoadingAtt] = useState(false);

  const total = questions.reduce((a, q) => a + (Number(q.marks) || 1), 0);
  const locked = attempts.length > 0;

  const loadAttempts = async () => {
    setLoadingAtt(true);
    try { setAttempts(await getTestAttempts(test.id)); } catch (_) { setAttempts([]); }
    setLoadingAtt(false);
  };
  useEffect(() => { loadAttempts(); }, [test.id]);

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

  const save = async (clear = false) => {
    setSaving(true);
    setError('');
    try {
      const payload = clear
        ? { questions: [] }
        : { questions: questions.map((q) => ({ ...q, options: q.options.map((o) => o.trim()), marks: Number(q.marks) || 1 })), durationMin: Number(durationMin), passMark: passMark === '' ? undefined : Number(passMark) };
      const updated = await saveTestQuestions(test.id, payload);
      onSaved?.(updated);
      onClose();
    } catch (e) {
      setError(errOf(e, 'Could not save the test'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">Online test · {test.name}</h3>
            <p className="text-xs text-slate-500">{[test.batch, test.date && `opens ${test.date}`].filter(Boolean).join(' · ')}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 sm:px-6 pt-4 flex gap-2 text-xs font-bold">
          {[['questions', `Questions (${questions.length})`], ['attempts', `Attempts (${attempts.length})`]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-3.5 py-1.5 rounded-full ${tab === k ? 'bg-[#0c1921] text-white' : 'bg-slate-100 text-slate-600'}`}>{l}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {tab === 'questions' ? (
            <>
              {locked && <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2">Students have started this test, so the questions are locked.</div>}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <label className="block"><span className="font-bold text-slate-600 block mb-1">Duration (min)</span>
                  <input type="number" min={5} max={300} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} disabled={locked} className={inputCls} /></label>
                <label className="block"><span className="font-bold text-slate-600 block mb-1">Total marks</span>
                  <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold">{total}</div></label>
                <label className="block"><span className="font-bold text-slate-600 block mb-1">Pass mark</span>
                  <input type="number" min={1} max={total} value={passMark} placeholder={String(Math.ceil(total * 0.7))} onChange={(e) => setPassMark(e.target.value)} disabled={locked} className={inputCls} /></label>
              </div>

              {!locked && (
                <div>
                  <button onClick={() => setShowPaste((v) => !v)} className="text-xs font-bold text-[#00897b] hover:underline flex items-center gap-1"><Copy className="w-3.5 h-3.5" />Paste many questions at once</button>
                  {showPaste && (
                    <div className="mt-2 space-y-2">
                      <pre className="text-[10px] bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-600 whitespace-pre-wrap">{'Which code set is used for inpatient procedures?\nA) CPT\nB) ICD-10-PCS *\nC) HCPCS\n\n(blank line between questions · * marks the correct option)'}</pre>
                      <textarea rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} className={inputCls} placeholder="Paste questions here…" />
                      <button onClick={importPasted} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Add these questions</button>
                    </div>
                  )}
                </div>
              )}

              {questions.map((q, i) => (
                <div key={i} className="border border-slate-200 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-500">Q{i + 1}</span>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-slate-500 flex items-center gap-1">Marks
                        <input type="number" min={1} max={20} value={q.marks} onChange={(e) => edit(i, { marks: e.target.value })} disabled={locked} className="w-14 px-2 py-1 rounded-lg border border-slate-200 text-xs" /></label>
                      {!locked && <button onClick={() => setQuestions((list) => list.filter((_, k) => k !== i))} className="p-1 text-slate-400 hover:text-rose-600" title="Remove question"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </div>
                  <textarea rows={2} value={q.q} onChange={(e) => edit(i, { q: e.target.value })} disabled={locked} placeholder="Question (paste the case snippet if needed)" className={inputCls} />
                  <div className="space-y-1.5">
                    {q.options.map((o, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <input type="radio" name={`ans-${i}`} checked={q.answer === j} onChange={() => edit(i, { answer: j })} disabled={locked} className="accent-[#00897b]" title="Correct answer" />
                        <span className="text-[11px] font-bold text-slate-400 w-4">{LETTERS[j]}</span>
                        <input value={o} onChange={(e) => editOption(i, j, e.target.value)} disabled={locked} placeholder={`Option ${LETTERS[j]}`} className={inputCls} />
                        {!locked && q.options.length > 2 && <button onClick={() => removeOption(i, j)} className="p-1 text-slate-300 hover:text-rose-600"><X className="w-3.5 h-3.5" /></button>}
                      </div>
                    ))}
                    {!locked && q.options.length < 6 && <button onClick={() => addOption(i)} className="text-[11px] font-bold text-slate-500 hover:text-slate-800 ml-8">+ option</button>}
                  </div>
                  <p className="text-[10px] text-slate-400">Select the radio button next to the correct option.</p>
                </div>
              ))}
              {!locked && <button onClick={() => setQuestions((list) => [...list, blankQ()])} className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-xs font-bold text-slate-500 hover:border-teal-400 hover:text-teal-700 flex items-center justify-center gap-1"><Plus className="w-4 h-4" />Add question</button>}
            </>
          ) : (
            <>
              <div className="flex justify-end"><button onClick={loadAttempts} className="p-2 rounded-xl border border-slate-200 text-slate-500"><RefreshCw className={`w-4 h-4 ${loadingAtt ? 'animate-spin' : ''}`} /></button></div>
              {attempts.length === 0 ? <p className="text-xs text-slate-400 text-center py-8">No student has started this test yet.</p> : (
                <div className="divide-y divide-slate-100 text-xs">
                  {attempts.map((a) => (
                    <div key={a._id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0"><div className="font-bold text-slate-900 truncate">{a.studentName || a.studentId}</div><div className="text-[10px] text-slate-400">{a.studentId} · started {fmt(a.startedAt)}{a.submittedAt ? ` · submitted ${fmt(a.submittedAt)}` : ''}</div></div>
                      <div className="flex items-center gap-2 shrink-0">
                        {a.late && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">Late</span>}
                        {a.autoSubmitted && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">Auto-submitted</span>}
                        {a.status === 'submitted'
                          ? <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${a.score >= test.passMark ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>{a.score}/{a.totalMarks}</span>
                          : <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">In progress</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {error && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">⚠ {error}</div>}
        </div>

        {tab === 'questions' && !locked && (
          <div className="p-5 sm:p-6 border-t border-slate-100 flex flex-wrap items-center gap-2 justify-end">
            {test.mode === 'online' && <button onClick={() => { if (window.confirm('Turn this back into an offline test (scores entered by hand)?')) save(true); }} disabled={saving} className="mr-auto px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50">Make offline</button>}
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Cancel</button>
            <button onClick={() => save(false)} disabled={saving || !questions.length} className="px-5 py-2.5 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold disabled:opacity-40">{saving ? 'Saving…' : `Publish online test · ${questions.length} Q`}</button>
          </div>
        )}
      </div>
    </div>
  );
}
