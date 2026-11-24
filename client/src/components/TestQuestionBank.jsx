import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Upload, X, Flag, CheckCircle2, AlertCircle, Search, SlidersHorizontal, ChevronLeft, ChevronRight, ChevronDown, RefreshCw, FileQuestion, Lightbulb } from 'lucide-react';
import {
  getQuestionBankMeta, getQuestionBank, addBankQuestions, deleteBankQuestion, setBankMarking, resolveBankQuestion
} from '../services/api';
import RichText, { htmlToText } from './RichText';
import QuestionEditor, { LANGUAGES } from './QuestionEditor';

// Question Bank: every Test Series question in one list (paged on the server,
// so 19,000+ questions stay quick), filtered by test, subject, topic, type,
// language, text and reported. Add / Edit open the full-page question editor.
// fixedTestId + onBack: opened from Test List → Action → Questions.
const LETTERS = 'abcdef';
const errOf = (e) => e?.response?.data?.error || e?.message || 'Something went wrong';
const numOr = (v, d) => (v === '' || v == null || !Number.isFinite(Number(v)) ? d : Number(v));

const blankQ = (defaults = {}) => ({
  q: '', options: ['', '', '', ''], answer: 0, marks: 1, negMarks: 0, bonusMarks: 0,
  qType: 'MCQ', topic: '', subject: '', language: 'English', hint: '', rationale: '', chapter: '',
  ...defaults
});

// Paste / .txt import. Works with the panel's own layout:
//   1. The phalanx is a:
//   a. Ligament
//   b. Tendon
//   c. Bone
//   d. Muscle
//   ANS: c
//   Solution: A phalanx is a digital bone …
// Also accepts "A) …" options, a * after the correct option, "Marks: +1, -0.25" and "Hint: …".
export function parseQuestionText(text, defaults = {}) {
  const out = [];
  let cur = null;
  let mode = 'q'; // q → opts → done, or sol (solution text, may run over several lines)
  const push = () => {
    if (cur && cur.q.trim() && cur.options.length >= 2) {
      if (cur.answer < 0 || cur.answer >= cur.options.length) cur.answer = 0;
      if (cur.options.length === 2 && cur.options.every((o) => /^(true|false)$/i.test(o))) cur.qType = 'True/False';
      out.push(cur);
    }
    cur = null;
  };
  const start = (q) => { push(); cur = { ...blankQ(defaults), q, options: [], answer: -1 }; mode = 'q'; };
  String(text || '').split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    if (!line) { if (mode === 'sol') mode = 'done'; return; }
    const ans = line.match(/^ans(?:wer)?\s*[:.-]\s*\(?([a-fA-F])\)?\s*$/i);
    const sol = line.match(/^(?:solution|rationale|explanation)\s*[:.-]?\s*(.*)$/i);
    const hint = line.match(/^hint\s*[:.-]\s*(.*)$/i);
    const marks = line.match(/^marks?\s*[:.-]\s*\+?\s*([\d.]+)\s*(?:,\s*-\s*([\d.]+))?/i);
    const opt = line.match(/^\(?([a-fA-F])[).:-]\s+(.+)$/);
    const num = line.match(/^(?:q(?:uestion)?\s*)?\d+\s*[).:-]\s*(.+)$/i);
    if (cur && ans) { cur.answer = 'abcdef'.indexOf(ans[1].toLowerCase()); mode = 'done'; return; }
    if (cur && sol) { cur.rationale = sol[1].trim(); mode = 'sol'; return; }
    if (cur && hint) { cur.hint = hint[1].trim(); mode = 'done'; return; }
    if (cur && marks) { cur.marks = Number(marks[1]) || 1; if (marks[2]) cur.negMarks = Number(marks[2]) || 0; mode = 'done'; return; }
    if (cur && opt && (mode === 'q' || mode === 'opts')) {
      let o = opt[2].trim();
      if (/\*\s*$/.test(o)) { cur.answer = cur.options.length; o = o.replace(/\s*\*\s*$/, ''); }
      cur.options.push(o);
      mode = 'opts';
      return;
    }
    if (num) { start(num[1].trim()); return; }
    if (!cur || mode === 'done' || mode === 'opts') { start(line); return; }
    if (mode === 'sol') cur.rationale = `${cur.rationale} ${line}`.trim();
    else cur.q = `${cur.q}\n${line}`;
  });
  push();
  return out;
}

function ImportModal({ tests, testId: initialTestId, onCancel, onImport, saving }) {
  const [text, setText] = useState('');
  const [testId, setTestId] = useState(initialTestId || '');
  const [d, setD] = useState({ marks: 1, negMarks: 0, subject: '', topic: '', language: 'English' });
  const defaults = { marks: numOr(d.marks, 1), negMarks: numOr(d.negMarks, 0), subject: d.subject, topic: d.topic, language: d.language };
  const parsed = useMemo(() => parseQuestionText(text, defaults), [text, d]); // eslint-disable-line react-hooks/exhaustive-deps
  const inp = 'mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm';
  const readFile = (file) => { if (!file) return; const r = new FileReader(); r.onload = () => setText(String(r.result || '')); r.readAsText(file); };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900">Import Questions</h3>
          <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
            Paste questions (or upload a .txt file) in this format — one after another:
            <pre className="mt-2 text-[11px] text-slate-700 whitespace-pre-wrap">{`1. The phalanx is a:
a. Ligament
b. Tendon
c. Bone
d. Muscle
ANS: c
Solution: A phalanx (plural: phalanges) is a digital bone found in the fingers and toes.`}</pre>
            <div className="mt-1 text-slate-500">Optional lines per question: <code>Marks: +1, -0.25</code> and <code>Hint: …</code>. A * after an option also marks it correct.</div>
          </div>
          <label className="block text-xs font-bold text-slate-600">Add to test *
            <select value={testId} onChange={(e) => setTestId(e.target.value)} className={inp}>
              <option value="">Select Test</option>
              {tests.map((t) => <option key={t.id} value={t.id}>{t.name}{t.seriesName ? ` — ${t.seriesName}` : ''}{t.testCode ? ` (${t.testCode})` : ''} · {t.questionCount} questions</option>)}
            </select>
          </label>
          <div className="text-[11px] text-slate-500">A test holds up to 200 questions — import a big bank test by test.</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <label className="block text-xs font-bold text-slate-600">Marks +<input type="number" value={d.marks} onChange={(e) => setD({ ...d, marks: e.target.value })} className={inp} /></label>
            <label className="block text-xs font-bold text-slate-600">Negative −<input type="number" step="0.25" value={d.negMarks} onChange={(e) => setD({ ...d, negMarks: e.target.value })} className={inp} /></label>
            <label className="block text-xs font-bold text-slate-600">Subject<input value={d.subject} onChange={(e) => setD({ ...d, subject: e.target.value })} className={inp} /></label>
            <label className="block text-xs font-bold text-slate-600">Topic<input value={d.topic} onChange={(e) => setD({ ...d, topic: e.target.value })} className={inp} /></label>
            <label className="block text-xs font-bold text-slate-600">Language
              <select value={d.language} onChange={(e) => setD({ ...d, language: e.target.value })} className={inp}>{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</select>
            </label>
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} placeholder="Paste questions here…"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono" />
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 cursor-pointer">
              <Upload className="w-4 h-4" />Upload .txt
              <input type="file" accept=".txt,text/plain" className="hidden" onChange={(e) => readFile(e.target.files?.[0])} />
            </label>
            <span className={`text-xs font-bold ${parsed.length ? 'text-emerald-700' : 'text-slate-400'}`}>{parsed.length} question{parsed.length === 1 ? '' : 's'} recognised</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          <button type="button" disabled={saving || !parsed.length || !testId} onClick={() => onImport(testId, parsed)}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50">{saving ? 'Importing…' : `Add ${parsed.length} question${parsed.length === 1 ? '' : 's'}`}</button>
        </div>
      </div>
    </div>
  );
}

export default function TestQuestionBank({ canManage, fixedTestId = '', onBack }) {
  const [meta, setMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ limit: 10, page: 1, testId: fixedTestId, subject: '', topic: '', qType: '', language: 'English', search: '', reported: false });
  const [searchText, setSearchText] = useState('');
  const [editor, setEditor] = useState(null); // { initial } — full-page add / edit
  const [importing, setImporting] = useState(false);
  const [scheme, setScheme] = useState(null);
  const [expanded, setExpanded] = useState([]); // question ids with the solution open
  const set = (patch) => setF((x) => ({ ...x, page: 1, ...patch }));
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const loadMeta = useCallback(async () => {
    try { setMeta(await getQuestionBankMeta()); } catch (e) { setError(errOf(e)); }
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getQuestionBank({
        page: f.page, limit: f.limit, testId: f.testId || undefined, subject: f.subject || undefined, topic: f.topic || undefined,
        qType: f.qType || undefined, language: f.language || undefined, search: f.search || undefined, reported: f.reported ? 'true' : undefined
      });
      setRows(data?.rows || []);
      setTotal(data?.total || 0);
      setError('');
    } catch (e) {
      setError(errOf(e));
    } finally {
      setLoading(false);
    }
  }, [f]);
  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { load(); }, [load]);
  // search as you type (after a short pause)
  useEffect(() => {
    const t = setTimeout(() => { if (searchText !== f.search) set({ search: searchText }); }, 400);
    return () => clearTimeout(t);
  }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => { load(); loadMeta(); };
  const run = async (fn, msg) => {
    setSaving(true);
    setError('');
    try { await fn(); flash(msg); refresh(); return true; } catch (e) { setError(errOf(e)); return false; } finally { setSaving(false); }
  };

  const tests = meta?.tests || [];
  const subjects = Object.keys(meta?.subjects || {}).sort();
  const topics = f.subject ? (meta?.subjects?.[f.subject] || []) : [...new Set(Object.values(meta?.subjects || {}).flat())].sort();
  const languages = [...new Set([...LANGUAGES, ...(meta?.languages || [])])];
  const pages = Math.max(1, Math.ceil(total / f.limit));
  const selTest = tests.find((t) => t.id === f.testId);

  const remove = (r) => {
    if (!window.confirm(`Delete this question from ${r.testName}?\n\n${htmlToText(r.question.q).slice(0, 160)}`)) return;
    run(() => deleteBankQuestion(r.testId, r.question._id), 'Question deleted');
  };

  if (editor) {
    return (
      <QuestionEditor
        meta={meta}
        initial={editor.initial}
        testId={f.testId}
        onCancel={() => { setEditor(null); refresh(); }}
        onSaved={() => { flash('✓ Question saved'); loadMeta(); }}
      />
    );
  }

  const anyFilter = f.testId || f.subject || f.topic || f.qType || f.search || f.reported || (f.language && f.language !== 'English');
  const chip = 'px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-teal-500 focus:bg-white min-w-0';

  return (
    <div className="space-y-4 max-w-[1600px]">
      {toast && <div className="fixed bottom-5 right-5 z-50 p-3 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-lg">{toast}</div>}

      {onBack && (
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{selTest?.name || 'Questions'}</h2>
            <p className="text-xs text-slate-500">{[selTest?.seriesName, selTest?.testCode].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
      )}

      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}<button type="button" className="ml-auto" onClick={() => setError('')}><X className="w-3.5 h-3.5" /></button></div>}

      {/* header + filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0f212d] text-[#5eead4] flex items-center justify-center"><FileQuestion className="w-5 h-5" /></div>
            <div>
              <div className="text-base font-extrabold text-slate-900">Question List</div>
              <div className="text-xs text-slate-500">
                <b className="text-slate-800">{total.toLocaleString('en-IN')}</b> question{total === 1 ? '' : 's'}{anyFilter ? ' match' : ''} · {tests.length} test{tests.length === 1 ? '' : 's'} · {subjects.length} subject{subjects.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              {f.testId && (
                <button type="button" disabled={!selTest?.questionCount} onClick={() => setScheme({ marks: 1, negMarks: 0 })}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><SlidersHorizontal className="w-4 h-4" />Marking</button>
              )}
              <button type="button" disabled={!tests.length} onClick={() => setImporting(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Upload className="w-4 h-4" />Import</button>
              <button type="button" disabled={!tests.length} title={tests.length ? '' : 'Add a test first (Test List)'}
                onClick={() => setEditor({ initial: { defaults: { subject: f.subject, topic: f.topic, language: f.language || 'English' } } })}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold disabled:opacity-50"><Plus className="w-4 h-4" />Add Question</button>
            </div>
          )}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search question, option, solution, subject or topic…"
            className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-teal-500 focus:bg-white" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          <select value={f.testId} disabled={Boolean(onBack)} onChange={(e) => set({ testId: e.target.value })} className={`${chip} xl:col-span-2`}>
            <option value="">All Tests</option>
            {tests.map((t) => <option key={t.id} value={t.id}>{t.name}{t.seriesName ? ` — ${t.seriesName}` : ''} ({t.questionCount})</option>)}
          </select>
          <select value={f.subject} onChange={(e) => set({ subject: e.target.value, topic: '' })} className={chip}>
            <option value="">All Subjects</option>
            {subjects.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={f.topic} onChange={(e) => set({ topic: e.target.value })} className={chip}>
            <option value="">All Topics</option>
            {topics.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={f.qType} onChange={(e) => set({ qType: e.target.value })} className={chip}>
            <option value="">All Types</option>
            <option value="MCQ">MCQ</option>
            <option value="True/False">True / False</option>
          </select>
          <select value={f.language} onChange={(e) => set({ language: e.target.value })} className={chip}>
            <option value="">All Languages</option>
            {languages.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => set({ reported: !f.reported })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${f.reported ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:text-rose-600'}`}>
              <Flag className="w-3.5 h-3.5" />Reported only
            </button>
            {anyFilter && (
              <button type="button" onClick={() => { setSearchText(''); setF((x) => ({ ...x, page: 1, testId: onBack ? x.testId : '', subject: '', topic: '', qType: '', language: 'English', search: '', reported: false })); }}
                className="px-3 py-1.5 rounded-full text-xs font-bold text-slate-500 hover:text-slate-900">Clear filters</button>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">Show
            <select value={f.limit} onChange={(e) => set({ limit: Number(e.target.value) })} className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            per page
          </label>
        </div>
      </div>

      {scheme && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 flex flex-wrap items-end gap-3">
          <div className="text-sm font-bold text-slate-800 w-full">Set marks for every question in {selTest?.name}</div>
          <label className="text-xs font-bold text-slate-600">Marks +<input type="number" min={1} value={scheme.marks} onChange={(e) => setScheme({ ...scheme, marks: e.target.value })} className="block mt-1 w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm" /></label>
          <label className="text-xs font-bold text-slate-600">Negative −<input type="number" min={0} step="0.25" value={scheme.negMarks} onChange={(e) => setScheme({ ...scheme, negMarks: e.target.value })} className="block mt-1 w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm" /></label>
          <button type="button" disabled={saving} onClick={async () => { if (await run(() => setBankMarking(f.testId, { marks: numOr(scheme.marks, 1), negMarks: numOr(scheme.negMarks, 0) }), '✓ Marking updated')) setScheme(null); }} className="px-4 py-2 rounded-lg bg-[#009688] text-white text-sm font-bold disabled:opacity-50">Apply</button>
          <button type="button" onClick={() => setScheme(null)} className="px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-white">Cancel</button>
        </div>
      )}

      {/* question cards */}
      {loading && rows.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />Loading questions…</div>
      )}
      {!loading && rows.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <FileQuestion className="w-9 h-9 text-slate-300 mx-auto mb-2" />
          <div className="text-sm font-bold text-slate-700">{anyFilter ? 'No question matches these filters' : 'No questions yet'}</div>
          <p className="text-xs text-slate-500 mt-1">{anyFilter ? 'Try clearing a filter.' : tests.length ? 'Click Add Question, or Import to paste many at once.' : 'Add a test first in Test List, then add its questions here.'}</p>
        </div>
      )}

      <div className={`space-y-3 ${loading ? 'opacity-60' : ''}`}>
        {rows.map((r, i) => {
          const q = r.question;
          const font = q.font ? (q.font === 'ARIAL' ? 'Arial' : q.font) : undefined;
          const num = (f.page - 1) * f.limit + i + 1;
          const tags = [
            q.subject && { t: q.subject, c: 'bg-indigo-50 text-indigo-700' },
            q.topic && { t: q.topic, c: 'bg-teal-50 text-teal-700' },
            q.difficulty && { t: q.difficulty, c: q.difficulty === 'Hard' ? 'bg-rose-50 text-rose-700' : q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700' },
            { t: q.qType || 'MCQ', c: 'bg-slate-100 text-slate-600' },
            q.language && q.language !== 'English' && { t: q.language, c: 'bg-slate-100 text-slate-600' }
          ].filter(Boolean);
          const open = expanded.includes(q._id);
          return (
            <div key={`${r.testId}-${q._id}`} className={`bg-white rounded-2xl border overflow-hidden ${(q.reports || []).length ? 'border-rose-200' : 'border-slate-200'} hover:shadow-sm transition-shadow`}>
              {/* card header */}
              <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-slate-50/80 border-b border-slate-100">
                <span className="inline-flex items-center justify-center min-w-[2.25rem] h-7 px-2 rounded-lg bg-[#0f212d] text-white text-xs font-extrabold">Q{num}</span>
                {!onBack && (
                  <span className="text-[11px] text-slate-500 truncate max-w-[280px]" title={`${r.testName} · ${r.seriesName}`}>
                    <b className="text-slate-700">{r.testName}</b>{r.seriesName ? ` · ${r.seriesName}` : ''} · #{r.index + 1}
                  </span>
                )}
                <div className="flex flex-wrap gap-1">
                  {tags.map((t) => <span key={t.t} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.c}`}>{t.t}</span>)}
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700">+{q.marks || 1}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${q.negMarks ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-400'}`}>−{q.negMarks || 0}</span>
                  {q.bonusMarks > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-50 text-sky-700">Bonus +{q.bonusMarks}</span>}
                  {canManage && (
                    <>
                      <button type="button" onClick={() => setEditor({ initial: { testId: r.testId, question: q } })} title="Edit" className="ml-1 p-1.5 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"><Pencil className="w-4 h-4" /></button>
                      <button type="button" disabled={saving} onClick={() => remove(r)} title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>

              {/* body */}
              <div className="p-4 space-y-3" style={{ fontFamily: font }}>
                {q.instruction && <RichText html={q.instruction} className="text-xs text-slate-500 italic" />}
                {q.passage && <RichText html={q.passage} className="text-[13px] text-slate-700 p-3 rounded-xl bg-slate-50 border border-slate-200 max-h-48 overflow-y-auto" />}
                <RichText html={q.q} className="text-[15px] font-semibold text-slate-900 leading-relaxed" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(q.options || []).map((o, j) => {
                    const right = j === q.answer;
                    return (
                      <div key={j} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-sm ${right ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-white border-slate-200 text-slate-700'}`}>
                        <span className={`w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center text-[11px] font-extrabold ${right ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{LETTERS[j].toUpperCase()}</span>
                        <RichText html={o} className="flex-1 pt-0.5" />
                        {right && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />}
                      </div>
                    );
                  })}
                </div>

                {(q.rationale || q.hint) && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {q.rationale && (
                      <button type="button" onClick={() => setExpanded((list) => (open ? list.filter((x) => x !== q._id) : [...list, q._id]))}
                        className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900">
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />{open ? 'Hide solution' : 'Show solution'}
                      </button>
                    )}
                    {q.hint && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-semibold"><Lightbulb className="w-3 h-3" />{q.hint}</span>}
                  </div>
                )}
                {open && q.rationale && (
                  <div className="rounded-xl bg-teal-50/50 border border-teal-100 p-3">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700 mb-1">Solution</div>
                    <RichText html={q.rationale} className="text-sm text-slate-700" />
                  </div>
                )}

                {(q.reports || []).length > 0 && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                    <div className="flex items-center justify-between gap-2 font-bold text-rose-700">
                      <span className="inline-flex items-center gap-1"><Flag className="w-3.5 h-3.5" />Reported by {q.reports.length} student{q.reports.length === 1 ? '' : 's'}</span>
                      {canManage && <button type="button" disabled={saving} onClick={() => run(() => resolveBankQuestion(r.testId, q._id), '✓ Reports marked resolved')} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-100"><CheckCircle2 className="w-3.5 h-3.5" />Mark resolved</button>}
                    </div>
                    <ul className="mt-1.5 space-y-1 text-rose-900">
                      {q.reports.map((rep, k) => <li key={k}>“{rep.reason}” — {rep.studentName || rep.studentId}{rep.at ? `, ${new Date(rep.at).toLocaleDateString('en-IN')}` : ''}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600">
          <span>Showing {((f.page - 1) * f.limit + 1).toLocaleString('en-IN')}–{Math.min(f.page * f.limit, total).toLocaleString('en-IN')} of {total.toLocaleString('en-IN')} questions</span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={f.page <= 1} onClick={() => setF((x) => ({ ...x, page: 1 }))} className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40">First</button>
            <button type="button" disabled={f.page <= 1} onClick={() => setF((x) => ({ ...x, page: x.page - 1 }))} className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <span className="px-2">Page
              <input type="number" min={1} max={pages} value={f.page} onChange={(e) => { const n = Math.min(pages, Math.max(1, Number(e.target.value) || 1)); setF((x) => ({ ...x, page: n })); }}
                className="mx-1 w-16 px-1.5 py-1 rounded-lg border border-slate-200 text-center" />of {pages.toLocaleString('en-IN')}</span>
            <button type="button" disabled={f.page >= pages} onClick={() => setF((x) => ({ ...x, page: x.page + 1 }))} className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            <button type="button" disabled={f.page >= pages} onClick={() => setF((x) => ({ ...x, page: pages }))} className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40">Last</button>
          </div>
        </div>
      )}

      {importing && (
        <ImportModal tests={tests} testId={f.testId} saving={saving} onCancel={() => setImporting(false)}
          onImport={async (testId, list) => { if (await run(() => addBankQuestions(testId, { questions: list }), `✓ ${list.length} questions imported`)) setImporting(false); }} />
      )}
    </div>
  );
}
