import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Upload, X, Flag, CheckCircle2, AlertCircle, Search, SlidersHorizontal, ChevronLeft, ChevronRight, ChevronDown, RefreshCw, FileQuestion, Lightbulb, FileSpreadsheet, Download, History, FolderInput, FolderOutput } from 'lucide-react';
import {
  getQuestionBankMeta, getQuestionBank, deleteBankQuestion, setBankMarking, resolveBankQuestion,
  bulkUploadQuestions, getQuestionImports, undoQuestionImport, bankBulkAction
} from '../services/api';
import { readSpreadsheet, parseCsv } from './spreadsheetReader';
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

// ---------- Bulk upload (Excel / CSV / text) ----------
// Column headers are matched loosely, e.g. "Question", "Option A".."Option E",
// "Answer" (A–E, 1–5 or the option text), "Solution", "Subject", "Topic",
// "Marks", "Negative Marks", "Difficulty", "Language", "Hint", "Type", "Test ID".
const COLS = [
  ['q', /^(question|questions|question text|question details|q)$/],
  ['a', /^(option ?a|opt ?a|a|option ?1|choice ?a)$/],
  ['b', /^(option ?b|opt ?b|b|option ?2|choice ?b)$/],
  ['c', /^(option ?c|opt ?c|c|option ?3|choice ?c)$/],
  ['d', /^(option ?d|opt ?d|d|option ?4|choice ?d)$/],
  ['e', /^(option ?e|opt ?e|e|option ?5|choice ?e)$/],
  ['f', /^(option ?f|opt ?f|f|option ?6|choice ?f)$/],
  ['answer', /^(answer|ans|correct|correct answer|correct option|key|answer key|right answer)$/],
  ['rationale', /^(solution|rationale|explanation|reason)$/],
  ['subject', /^(subject|section)$/],
  ['topic', /^(topic|chapter name|sub ?topic)$/],
  ['marks', /^(marks|mark|\+ ?ve|positive|positive marks|\+ ?marks)$/],
  ['negMarks', /^(negative|negative marks|neg|neg marks|- ?ve|- ?marks|minus)$/],
  ['bonusMarks', /^(bonus|bonus marks)$/],
  ['difficulty', /^(difficulty|difficulty level|level)$/],
  ['language', /^(language|lang)$/],
  ['hint', /^(hint)$/],
  ['qType', /^(type|question type|qtype)$/],
  ['testCode', /^(test ?id|test ?code)$/]
];
// Plain cell text with < or > would be read as formatting — keep it as text
const cellHtml = (v) => (/[<>]/.test(v) ? `<span>${v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</span>` : v);
const norm = (h) => String(h || '').toLowerCase().replace(/[_.]/g, ' ').replace(/\s+/g, ' ').trim();
const TEMPLATE = 'Question,Option A,Option B,Option C,Option D,Option E,Answer,Solution,Subject,Topic,Marks,Negative Marks,Difficulty,Language,Hint,Type,Test ID\n'
  + '"The phalanx is a:",Ligament,Tendon,Bone,Muscle,,C,"A phalanx is a digital bone found in the fingers and toes.",MOCK TEST,Anatomy,1,0,Easy,English,DOCQ,MCQ,\n';

function rowsToQuestions(rows) {
  const h = rows.findIndex((r) => (r || []).some((x) => String(x).trim()));
  if (h < 0 || rows.length < h + 2) return { questions: [], skipped: [], mapped: [] };
  const header = rows[h].map(norm);
  const at = {};
  COLS.forEach(([key, re]) => { const i = header.findIndex((h) => re.test(h)); if (i >= 0) at[key] = i; });
  const mapped = COLS.filter(([k]) => at[k] !== undefined).map(([k]) => k);
  if (at.q === undefined || at.a === undefined || at.b === undefined) {
    return { questions: [], skipped: [], mapped, headerError: 'The first row must have column names — at least "Question", "Option A", "Option B" and "Answer". Download the template to see all columns.' };
  }
  const questions = [];
  const skipped = [];
  rows.slice(h + 1).forEach((r = [], k) => {
    const row = h + k + 2; // spreadsheet row number
    const cell = (key) => (at[key] !== undefined ? String(r[at[key]] ?? '').trim() : '');
    const q = cell('q');
    if (!q && !cell('a')) return; // blank line
    const options = ['a', 'b', 'c', 'd', 'e', 'f'].map(cell);
    while (options.length && !options[options.length - 1]) options.pop();
    const ans = cell('answer');
    let answer = -1;
    if (/^[a-f]$/i.test(ans)) answer = 'abcdef'.indexOf(ans.toLowerCase());
    else if (/^\(?[a-f][).]?$/i.test(ans)) answer = 'abcdef'.indexOf(ans.replace(/[^a-f]/gi, '').toLowerCase());
    else if (/^option ?[a-f]$/i.test(ans)) answer = 'abcdef'.indexOf(ans.slice(-1).toLowerCase());
    else if (/^[1-6]$/.test(ans)) answer = Number(ans) - 1;
    else if (ans) answer = options.findIndex((o) => o.toLowerCase() === ans.toLowerCase());
    if (!q) { skipped.push({ row, error: 'Question is empty' }); return; }
    if (options.length < 2 || options.some((o) => !o)) { skipped.push({ row, error: 'Needs at least 2 options, with no gaps (A, B, C…)' }); return; }
    if (answer < 0 || answer >= options.length) { skipped.push({ row, error: `Answer "${ans}" does not match an option` }); return; }
    const type = cell('qType').toLowerCase();
    const isTF = /^(tf|t\/f|true ?\/ ?false|true false)$/.test(type) || (options.length === 2 && options.every((o) => /^(true|false)$/i.test(o)));
    const diff = cell('difficulty').toLowerCase();
    questions.push({
      row, q: cellHtml(q), options: options.map(cellHtml), answer,
      rationale: cellHtml(cell('rationale')), subject: cell('subject'), topic: cell('topic'),
      marks: numOr(cell('marks'), 1), negMarks: Math.abs(numOr(cell('negMarks'), 0)), bonusMarks: numOr(cell('bonusMarks'), 0),
      difficulty: diff ? diff[0].toUpperCase() + diff.slice(1) : '', language: cell('language') || 'English', hint: cell('hint'),
      qType: isTF ? 'True/False' : 'MCQ', testCode: cell('testCode').toUpperCase()
    });
  });
  return { questions, skipped, mapped };
}

const CHUNK = 500;
const downloadCsv = (name, lines) => {
  const url = URL.createObjectURL(new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

function BulkUploadModal({ tests, maxPerTest, testId: initialTestId, onClose, onDone }) {
  const [parsed, setParsed] = useState(null); // { questions, skipped, mapped, source }
  const [parseError, setParseError] = useState('');
  const [reading, setReading] = useState(false);
  const [text, setText] = useState('');
  const [target, setTarget] = useState(initialTestId && initialTestId !== 'none' ? initialTestId : '');
  const [d, setD] = useState({ subject: '', topic: '', language: 'English' });
  const [progress, setProgress] = useState(null); // { done, total, inserted, errors }
  const [finished, setFinished] = useState(null);
  const busy = Boolean(progress && !finished);
  const hasTestCol = Boolean(parsed?.questions.some((q) => q.testCode));
  const targetTest = tests.find((t) => t.id === target);
  const room = targetTest ? Math.max(0, maxPerTest - targetTest.questionCount) : Infinity;

  const onFile = async (file) => {
    if (!file) return;
    setParseError(''); setParsed(null); setFinished(null); setProgress(null);
    setReading(true);
    try {
      if (/\.txt$/i.test(file.name)) {
        const qs = parseQuestionText(await file.text()).map((q, i) => ({ ...q, row: i + 1 }));
        if (!qs.length) throw new Error('No questions recognised in this text file — use the "1. … / a. … / ANS: c" layout.');
        setParsed({ questions: qs, skipped: [], mapped: [], source: file.name });
      } else {
        const { rows } = await readSpreadsheet(file);
        const out = rowsToQuestions(rows);
        if (out.headerError) throw new Error(out.headerError);
        if (!out.questions.length && !out.skipped.length) throw new Error('No question rows found under the header row.');
        setParsed({ ...out, source: `${file.name} · ${(rows.length - 1).toLocaleString('en-IN')} rows` });
      }
    } catch (e) {
      setParseError(e.message);
    } finally {
      setReading(false);
    }
  };
  const onPasteParse = () => {
    setParseError(''); setFinished(null);
    const looksTabular = /\t/.test(text.split('\n')[0] || '');
    if (looksTabular) {
      const out = rowsToQuestions(parseCsv(text));
      if (out.headerError) { setParseError(out.headerError); return; }
      setParsed({ ...out, source: 'pasted rows' });
    } else {
      const qs = parseQuestionText(text).map((q, i) => ({ ...q, row: i + 1 }));
      if (!qs.length) { setParseError('Nothing recognised. Paste spreadsheet rows (with the header row) or the "1. … / a. … / ANS: c" layout.'); return; }
      setParsed({ questions: qs, skipped: [], mapped: [], source: 'pasted text' });
    }
  };

  const upload = async () => {
    const list = parsed.questions.map((q) => ({
      ...q,
      subject: q.subject || d.subject, topic: q.topic || d.topic,
      language: q.language && q.language !== 'English' ? q.language : (d.language || 'English')
    }));
    const importBatch = `IMP-${Date.now().toString(36).toUpperCase()}`;
    const state = { done: 0, total: list.length, inserted: 0, errors: [...parsed.skipped] };
    setProgress({ ...state });
    for (let i = 0; i < list.length; i += CHUNK) {
      const chunk = list.slice(i, i + CHUNK);
      try {
        const res = await bulkUploadQuestions({ questions: chunk, testId: hasTestCol ? '' : target, importBatch });
        state.inserted += res.inserted || 0;
        state.errors.push(...(res.errors || []));
      } catch (e) {
        chunk.forEach((q) => state.errors.push({ row: q.row, error: `Upload failed: ${errOf(e)}` }));
      }
      state.done = Math.min(list.length, i + CHUNK);
      setProgress({ ...state });
    }
    state.errors.sort((a, b) => a.row - b.row);
    setFinished({ ...state, importBatch });
    onDone?.();
  };

  const inp = 'mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-white';
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={busy ? undefined : onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Bulk Upload Questions</h3>
            <p className="text-[11px] text-slate-500">Excel (.xlsx), CSV or text · 20,000+ rows are sent in batches of {CHUNK}</p>
          </div>
          {!busy && <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100"><X className="w-4 h-4" /></button>}
        </div>

        <div className="p-5 space-y-4">
          {!progress && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/40 cursor-pointer hover:bg-teal-50 text-center">
                  <FileSpreadsheet className="w-8 h-8 text-teal-600" />
                  <span className="text-sm font-bold text-slate-800">{reading ? 'Reading file…' : 'Choose Excel / CSV / .txt'}</span>
                  <span className="text-[11px] text-slate-500">First row = column names</span>
                  <input type="file" accept=".xlsx,.csv,.tsv,.txt" className="hidden" disabled={reading} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; onFile(file); }} />
                </label>
                <div className="rounded-xl border border-slate-200 p-4 text-xs text-slate-600 space-y-2">
                  <div className="font-bold text-slate-800">Columns</div>
                  <div>Question · Option A–E · Answer (A–E) · Solution · Subject · Topic · Marks · Negative Marks · Difficulty · Language · Hint · Type · Test ID</div>
                  <div className="text-slate-500">Only Question, Option A, Option B and Answer are required. Fill <b>Test ID</b> (e.g. TST2503FBB6) to put each row straight into that test.</div>
                  <button type="button" onClick={() => downloadCsv('question-upload-template.csv', [TEMPLATE.trim()])} className="inline-flex items-center gap-1 font-bold text-teal-700 hover:underline"><Download className="w-3.5 h-3.5" />Download template</button>
                </div>
              </div>

              <details className="rounded-xl border border-slate-200">
                <summary className="px-4 py-2.5 text-xs font-bold text-slate-700 cursor-pointer">…or paste rows / text</summary>
                <div className="p-4 pt-1 space-y-2">
                  <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder={'Paste rows copied from Excel (with the header row), or:\n1. The phalanx is a:\na. Ligament\nb. Tendon\nc. Bone\nd. Muscle\nANS: c\nSolution: …'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono" />
                  <button type="button" disabled={!text.trim()} onClick={onPasteParse} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold disabled:opacity-40">Read pasted text</button>
                </div>
              </details>

              {parseError && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{parseError}</div>}

              {parsed && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-emerald-50 p-3"><div className="text-xl font-extrabold text-emerald-700">{parsed.questions.length.toLocaleString('en-IN')}</div><div className="text-[11px] font-semibold text-emerald-800">ready to upload</div></div>
                    <div className={`rounded-xl p-3 ${parsed.skipped.length ? 'bg-amber-50' : 'bg-slate-50'}`}><div className={`text-xl font-extrabold ${parsed.skipped.length ? 'text-amber-700' : 'text-slate-400'}`}>{parsed.skipped.length.toLocaleString('en-IN')}</div><div className="text-[11px] font-semibold text-slate-600">rows with problems</div></div>
                    <div className="rounded-xl bg-slate-50 p-3"><div className="text-xl font-extrabold text-slate-700">{parsed.mapped.length || '—'}</div><div className="text-[11px] font-semibold text-slate-600">columns matched</div></div>
                  </div>
                  <div className="text-[11px] text-slate-500">{parsed.source}{parsed.mapped.length ? ` · ${parsed.mapped.join(', ')}` : ''}</div>
                  {parsed.skipped.length > 0 && (
                    <div className="max-h-28 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50/50 p-2 text-[11px] text-amber-900 space-y-0.5">
                      {parsed.skipped.slice(0, 50).map((s) => <div key={s.row}>Row {s.row}: {s.error}</div>)}
                      {parsed.skipped.length > 50 && <div>…and {parsed.skipped.length - 50} more (download the report after uploading)</div>}
                    </div>
                  )}
                  {parsed.questions[0] && (
                    <div className="rounded-xl border border-slate-200 p-3 text-xs">
                      <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">First question</div>
                      <div className="font-semibold text-slate-900">{htmlToText(parsed.questions[0].q)}</div>
                      <div className="mt-1 grid grid-cols-2 gap-x-3 text-slate-600">
                        {parsed.questions[0].options.map((o, j) => <div key={j} className={j === parsed.questions[0].answer ? 'text-emerald-700 font-bold' : ''}>{LETTERS[j]}. {htmlToText(o)}</div>)}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block text-xs font-bold text-slate-600 sm:col-span-2">Put these questions in
                      {hasTestCol ? (
                        <div className="mt-1 px-3 py-2 rounded-lg bg-sky-50 text-sky-800 text-xs font-semibold">Each row goes to the test in its <b>Test ID</b> column (rows without one stay in the Question Bank).</div>
                      ) : (
                        <select value={target} onChange={(e) => setTarget(e.target.value)} className={inp}>
                          <option value="">Question Bank only (add to tests later)</option>
                          {tests.map((t) => <option key={t.id} value={t.id} disabled={t.questionCount >= maxPerTest}>{t.name}{t.seriesName ? ` — ${t.seriesName}` : ''} · {t.questionCount}/{maxPerTest}</option>)}
                        </select>
                      )}
                    </label>
                    {targetTest && parsed.questions.length > room && (
                      <div className="sm:col-span-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                        {targetTest.name} has room for {room} more (a test holds up to {maxPerTest}). The first {room} will be added; the rest will be reported as errors. Choose "Question Bank only" to keep all {parsed.questions.length.toLocaleString('en-IN')}.
                      </div>
                    )}
                    <label className="block text-xs font-bold text-slate-600">Subject (when the row has none)<input value={d.subject} onChange={(e) => setD({ ...d, subject: e.target.value })} className={inp} placeholder="e.g. MOCK TEST" /></label>
                    <label className="block text-xs font-bold text-slate-600">Topic (when the row has none)<input value={d.topic} onChange={(e) => setD({ ...d, topic: e.target.value })} className={inp} /></label>
                  </div>
                </div>
              )}
            </>
          )}

          {progress && (
            <div className="space-y-3 py-2">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>{finished ? 'Upload finished' : 'Uploading…'}</span>
                <span>{progress.done.toLocaleString('en-IN')} / {progress.total.toLocaleString('en-IN')}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#009688] transition-all" style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }} /></div>
              {!finished && <p className="text-[11px] text-slate-500">Keep this window open until it finishes.</p>}
              {finished && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-xl bg-emerald-50 p-3"><div className="text-2xl font-extrabold text-emerald-700">{finished.inserted.toLocaleString('en-IN')}</div><div className="text-[11px] font-semibold text-emerald-800">questions saved</div></div>
                    <div className={`rounded-xl p-3 ${finished.errors.length ? 'bg-rose-50' : 'bg-slate-50'}`}><div className={`text-2xl font-extrabold ${finished.errors.length ? 'text-rose-700' : 'text-slate-400'}`}>{finished.errors.length.toLocaleString('en-IN')}</div><div className="text-[11px] font-semibold text-slate-600">rows not saved</div></div>
                  </div>
                  {finished.errors.length > 0 && (
                    <button type="button" onClick={() => downloadCsv(`upload-errors-${finished.importBatch}.csv`, ['Row,Problem', ...finished.errors.map((x) => `${x.row},"${String(x.error).replace(/"/g, '""')}"`)])}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:underline"><Download className="w-3.5 h-3.5" />Download the list of rows not saved</button>
                  )}
                  <p className="text-[11px] text-slate-500">Upload ID <b className="font-mono">{finished.importBatch}</b> — if something looks wrong, open <b>Uploads</b> on the Question Bank and undo the whole upload.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
          {finished ? (
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold bg-[#009688] text-white">Done</button>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40">Cancel</button>
              <button type="button" disabled={busy || !parsed?.questions.length} onClick={upload}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-[#009688] hover:bg-[#00897b] text-white disabled:opacity-50">
                <Upload className="w-4 h-4" />{busy ? 'Uploading…' : `Upload ${parsed?.questions.length ? parsed.questions.length.toLocaleString('en-IN') : ''} questions`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Recent uploads with Undo
function UploadsPanel({ onClose, onChanged }) {
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState('');
  const load = useCallback(async () => {
    try { setList(await getQuestionImports()); } catch (e) { setErr(errOf(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const undo = async (b) => {
    if (!window.confirm(`Delete all ${b.count} questions from upload ${b.importBatch}?`)) return;
    setBusyId(b.importBatch); setErr('');
    try { await undoQuestionImport(b.importBatch); await load(); onChanged?.(); } catch (e) { setErr(errOf(e)); } finally { setBusyId(''); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl my-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-base font-extrabold text-slate-900">Recent uploads</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-2">
          {err && <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold">{err}</div>}
          {!list && <div className="py-6 text-center text-xs text-slate-500">Loading…</div>}
          {list && !list.length && <div className="py-6 text-center text-xs text-slate-500">No bulk uploads yet.</div>}
          {list?.map((b) => (
            <div key={b.importBatch} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900">{b.count.toLocaleString('en-IN')} questions</div>
                <div className="text-[11px] text-slate-500"><span className="font-mono">{b.importBatch}</span> · {b.at ? new Date(b.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}{b.by ? ` · ${b.by}` : ''}{b.tests ? ` · ${b.tests} test(s)` : ' · bank only'}</div>
              </div>
              <button type="button" disabled={Boolean(busyId)} onClick={() => undo(b)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50">{busyId === b.importBatch ? 'Deleting…' : 'Undo upload'}</button>
            </div>
          ))}
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
  const [selected, setSelected] = useState([]); // question ids ticked for bulk actions
  const [moveTo, setMoveTo] = useState('');
  const [uploadsOpen, setUploadsOpen] = useState(false);
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
    if (!window.confirm(`Delete this question${r.testName ? ` (it is in ${r.testName})` : ''}?\n\n${htmlToText(r.question.q).slice(0, 160)}`)) return;
    run(() => deleteBankQuestion(r.question._id), 'Question deleted');
  };
  const bulk = async (action) => {
    if (!selected.length) return;
    if (action === 'delete' && !window.confirm(`Delete ${selected.length} selected question(s)? This cannot be undone.`)) return;
    if (action === 'assign' && !moveTo) { setError('Pick the test to add the selected questions to.'); return; }
    const ok = await run(() => bankBulkAction({ ids: selected, action, testId: moveTo }),
      action === 'delete' ? `${selected.length} question(s) deleted` : action === 'assign' ? `✓ ${selected.length} question(s) added to the test` : `${selected.length} question(s) moved to the Question Bank`);
    if (ok) { setSelected([]); setMoveTo(''); }
  };
  useEffect(() => { setSelected([]); }, [f]);
  const pageIds = rows.map((r) => r.question._id);
  const allPicked = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

  if (editor) {
    return (
      <QuestionEditor
        meta={meta}
        initial={editor.initial}
        testId={f.testId === 'none' ? '' : f.testId}
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
                <b className="text-slate-800">{total.toLocaleString('en-IN')}</b> question{total === 1 ? '' : 's'}{anyFilter ? ` match (of ${(meta?.total || 0).toLocaleString('en-IN')})` : ''} · {(meta?.unassigned || 0).toLocaleString('en-IN')} not in any test · {tests.length} test{tests.length === 1 ? '' : 's'} · {subjects.length} subject{subjects.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              {f.testId && f.testId !== 'none' && (
                <button type="button" disabled={!selTest?.questionCount} onClick={() => setScheme({ marks: 1, negMarks: 0 })}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><SlidersHorizontal className="w-4 h-4" />Marking</button>
              )}
              <button type="button" onClick={() => setUploadsOpen(true)} title="Recent bulk uploads (undo)"
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"><History className="w-4 h-4" />Uploads</button>
              <button type="button" onClick={() => setImporting(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-teal-200 bg-teal-50 text-xs font-bold text-teal-800 hover:bg-teal-100"><FileSpreadsheet className="w-4 h-4" />Bulk Upload</button>
              <button type="button"
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
            <option value="none">Not in any test (bank only)</option>
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

      {/* bulk actions on ticked questions */}
      {canManage && rows.length > 0 && (
        <div className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl ${selected.length ? 'bg-[#0f212d] text-white' : ''}`}>
          <label className={`inline-flex items-center gap-2 text-xs font-bold cursor-pointer ${selected.length ? 'text-white' : 'text-slate-600'}`}>
            <input type="checkbox" className="accent-teal-500 w-4 h-4" checked={allPicked} onChange={(e) => setSelected((list) => (e.target.checked ? [...new Set([...list, ...pageIds])] : list.filter((id) => !pageIds.includes(id))))} />
            {selected.length ? `${selected.length} selected` : 'Select page'}
          </label>
          {selected.length > 0 && (
            <>
              <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="ml-2 px-2 py-1.5 rounded-lg text-xs text-slate-800 bg-white max-w-[260px]">
                <option value="">Add to test…</option>
                {tests.map((t) => <option key={t.id} value={t.id} disabled={t.questionCount >= (meta?.maxPerTest || 200)}>{t.name}{t.seriesName ? ` — ${t.seriesName}` : ''} · {t.questionCount}/{meta?.maxPerTest || 200}</option>)}
              </select>
              <button type="button" disabled={saving || !moveTo} onClick={() => bulk('assign')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white disabled:opacity-40"><FolderInput className="w-3.5 h-3.5" />Add</button>
              <button type="button" disabled={saving} onClick={() => bulk('unassign')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20"><FolderOutput className="w-3.5 h-3.5" />Remove from test</button>
              <button type="button" disabled={saving} onClick={() => bulk('delete')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500"><Trash2 className="w-3.5 h-3.5" />Delete</button>
              <button type="button" onClick={() => setSelected([])} className="ml-auto text-xs text-slate-300 hover:text-white">Clear</button>
            </>
          )}
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
                {canManage && <input type="checkbox" className="accent-teal-600 w-4 h-4" checked={selected.includes(q._id)} onChange={(e) => setSelected((list) => (e.target.checked ? [...list, q._id] : list.filter((x) => x !== q._id)))} />}
                <span className="inline-flex items-center justify-center min-w-[2.25rem] h-7 px-2 rounded-lg bg-[#0f212d] text-white text-xs font-extrabold">Q{num}</span>
                {!onBack && (r.testId ? (
                  <span className="text-[11px] text-slate-500 truncate max-w-[280px]" title={`${r.testName} · ${r.seriesName}`}>
                    <b className="text-slate-700">{r.testName}</b>{r.seriesName ? ` · ${r.seriesName}` : ''} · #{r.index + 1}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">Bank only</span>
                ))}
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
                      {canManage && <button type="button" disabled={saving} onClick={() => run(() => resolveBankQuestion(q._id), '✓ Reports marked resolved')} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-100"><CheckCircle2 className="w-3.5 h-3.5" />Mark resolved</button>}
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
        <BulkUploadModal tests={tests} maxPerTest={meta?.maxPerTest || 200} testId={f.testId}
          onClose={() => { setImporting(false); refresh(); }} onDone={refresh} />
      )}
      {uploadsOpen && <UploadsPanel onClose={() => setUploadsOpen(false)} onChanged={() => { flash('Upload removed'); refresh(); }} />}
    </div>
  );
}
