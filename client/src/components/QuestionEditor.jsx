import React, { useMemo, useState } from 'react';
import { ArrowLeft, AlertCircle, Save } from 'lucide-react';
import RichEditor from './RichEditor';
import { AAPC_CHAPTERS } from './OnlineTestBuilder';
import { addBankQuestion, updateBankQuestion } from '../services/api';

// Add New Questions [Question Bank] — full page, laid out like the online test
// panel: question options / basic details / marks / "More" switches on the
// left, the question and options A–D (E) in rich-text editors on the right.
export const LANGUAGES = ['English', 'Tamil', 'Hindi', 'Telugu', 'Malayalam', 'Kannada'];
const QUESTION_FONTS = ['ARIAL', 'Calibri', 'Georgia', 'Times New Roman', 'Verdana', 'Noto Sans Tamil'];
const LETTERS = 'ABCDEF';
const errOf = (e) => e?.response?.data?.error || e?.message || 'Could not save the question';
const isBlank = (html) => !String(html || '').replace(/<(?!img)[^>]+>/gi, '').replace(/&nbsp;/g, '').trim();

const fresh = (defaults = {}) => ({
  q: '', options: ['', '', '', ''], answer: -1, marks: 1, negMarks: 0, bonusMarks: 0,
  qType: 'MCQ', topic: '', subject: '', language: 'English', hint: '', rationale: '', chapter: '',
  difficulty: '', font: '', passage: '', instruction: '',
  ...defaults
});

const Label = ({ children }) => <div className="text-[11px] font-bold text-slate-700 mb-1">{children}</div>;
const inp = 'w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs bg-white focus:outline-none focus:border-sky-500';

// Pick from existing values or type a new one
function PickOrType({ value, options, onChange, placeholder, disabled }) {
  const [typing, setTyping] = useState(false);
  const known = options.includes(value) || !value;
  if (typing || !known) {
    return (
      <div className="flex gap-1">
        <input autoFocus={typing} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inp} />
        {options.length > 0 && <button type="button" onClick={() => { setTyping(false); onChange(''); }} className="px-2 text-[11px] text-sky-700 font-bold">List</button>}
      </div>
    );
  }
  return (
    <select value={value} disabled={disabled} onChange={(e) => { if (e.target.value === '__new') { setTyping(true); onChange(''); } else onChange(e.target.value); }} className={inp}>
      <option value="">{disabled ? 'First Select the Subject' : 'Select'}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
      {!disabled && <option value="__new">+ Add new…</option>}
    </select>
  );
}

export default function QuestionEditor({ meta, initial, testId: initialTestId, onCancel, onSaved }) {
  const editing = Boolean(initial?.question?._id);
  const start = initial?.question || null;
  const [testId, setTestId] = useState(initial?.testId || initialTestId || '');
  const [f, setF] = useState(() => (start
    ? { ...fresh(), ...start, options: [...(start.options || [])], answer: typeof start.answer === 'number' ? start.answer : -1 }
    : fresh(initial?.defaults)));
  const [more, setMore] = useState(() => ({
    passage: Boolean(start?.passage),
    instruction: Boolean(start?.instruction),
    solution: start ? Boolean(start.rationale) : true,
    optionE: (start?.options || []).length > 4
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));

  const subjects = useMemo(() => Object.keys(meta?.subjects || {}).sort(), [meta]);
  const topics = (meta?.subjects || {})[f.subject] || [];
  const tests = meta?.tests || [];

  const setType = (qType) => {
    if (qType === 'True/False') set({ qType, options: ['True', 'False'], answer: f.answer > 1 ? -1 : f.answer });
    else set({ qType, options: f.qType === 'True/False' ? ['', '', '', ...(more.optionE ? [''] : [])] : f.options });
  };
  const toggleE = (on) => {
    setMore((m) => ({ ...m, optionE: on }));
    if (f.qType === 'True/False') return;
    if (on && f.options.length < 5) set({ options: [...f.options, ''] });
    if (!on && f.options.length > 4) set({ options: f.options.slice(0, 4), answer: f.answer >= 4 ? -1 : f.answer });
  };
  const setOpt = (j, v) => setF((x) => ({ ...x, options: x.options.map((o, k) => (k === j ? v : o)) }));

  const problem = isBlank(f.q) ? 'Type your question.'
      : f.options.some(isBlank) ? 'Fill every option.'
        : f.answer < 0 ? 'Tick the correct option.'
          : !(Number(f.marks) >= 1) ? 'Give +VE marks (1 or more).'
            : null;

  const save = async (addAnother) => {
    if (problem) { setError(problem); return; }
    setSaving(true);
    setError('');
    const question = {
      ...f,
      passage: more.passage ? f.passage : '',
      instruction: more.instruction ? f.instruction : '',
      rationale: more.solution ? f.rationale : '',
      marks: Number(f.marks) || 1,
      negMarks: Number(f.negMarks) || 0,
      bonusMarks: Number(f.bonusMarks) || 0
    };
    try {
      if (editing) await updateBankQuestion(start._id, { question, testId });
      else await addBankQuestion({ question, testId });
      onSaved?.();
      if (addAnother && !editing) {
        // keep the settings, clear the content
        setF(fresh({ subject: f.subject, topic: f.topic, language: f.language, qType: f.qType, font: f.font, difficulty: f.difficulty, marks: f.marks, negMarks: f.negMarks, chapter: f.chapter, passage: more.passage ? f.passage : '', options: f.qType === 'True/False' ? ['True', 'False'] : Array(more.optionE ? 5 : 4).fill('') }));
        setSavedCount((n) => n + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        onCancel?.();
      }
    } catch (e) {
      setError(errOf(e));
    } finally {
      setSaving(false);
    }
  };

  const fontFamily = f.font ? (f.font === 'ARIAL' ? 'Arial' : f.font) : '';

  return (
    <div className="space-y-3 max-w-[1600px]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50"><ArrowLeft className="w-4 h-4" /></button>
          <h2 className="text-lg text-slate-800">{editing ? 'Edit Question' : 'Add New Questions'}<span className="text-slate-500">[Question Bank]</span></h2>
        </div>
        <div className="flex items-center gap-2">
          {savedCount > 0 && <span className="text-xs font-bold text-emerald-700">✓ {savedCount} saved</span>}
          <button type="button" onClick={onCancel} className="px-3 py-2 rounded text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          {!editing && <button type="button" disabled={saving} onClick={() => save(true)} className="px-3 py-2 rounded border border-sky-600 text-sky-700 text-sm font-bold hover:bg-sky-50 disabled:opacity-50">Save & Add Another</button>}
          <button type="button" disabled={saving} onClick={() => save(false)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold disabled:opacity-50">
            <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      {error && <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 items-start">
        {/* LEFT: options */}
        <div className="bg-white rounded border border-slate-200 p-3.5 space-y-3 lg:sticky lg:top-2">
          <div className="text-xs font-semibold text-slate-700 pb-2 border-b border-slate-200">Question Options</div>
          <div>
            <Label>Test</Label>
            <select value={testId} onChange={(e) => setTestId(e.target.value)} className={inp}>
              <option value="">No test — keep in Question Bank</option>
              {tests.map((t) => {
                const full = t.questionCount >= (meta?.maxPerTest || 200) && t.id !== initial?.testId;
                return <option key={t.id} value={t.id} disabled={full}>{t.name}{t.seriesName ? ` — ${t.seriesName}` : ''}{t.testCode ? ` (${t.testCode})` : ''} · {t.questionCount}/{meta?.maxPerTest || 200}{full ? ' FULL' : ''}</option>;
              })}
            </select>
          </div>
          <div>
            <Label>Language</Label>
            <select value={f.language} onChange={(e) => set({ language: e.target.value })} className={inp}>
              {[...new Set([...LANGUAGES, ...(meta?.languages || [])])].map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <Label>Question Type:</Label>
            <select value={f.qType} onChange={(e) => setType(e.target.value)} className={inp}>
              <option value="MCQ">MCQ Single Ans (MCQ)</option>
              <option value="True/False">True / False (TF)</option>
            </select>
          </div>
          <div>
            <Label>Font</Label>
            <select value={f.font} onChange={(e) => set({ font: e.target.value })} className={inp}>
              <option value="">Default</option>
              {QUESTION_FONTS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>

          <div className="text-xs font-semibold text-slate-700 pt-2 pb-2 border-b border-slate-200">Basic Details</div>
          <div>
            <Label>Hint</Label>
            <input value={f.hint} onChange={(e) => set({ hint: e.target.value })} className={inp} placeholder="e.g. DOCQ" />
          </div>
          <div>
            <Label>Subject:</Label>
            <PickOrType value={f.subject} options={subjects} onChange={(v) => set({ subject: v, topic: '' })} placeholder="New subject, e.g. MOCK TEST" />
          </div>
          <div>
            <Label>Topic:</Label>
            <PickOrType value={f.topic} options={topics} disabled={!f.subject} onChange={(v) => set({ topic: v })} placeholder="New topic, e.g. Anatomy" />
          </div>
          <div>
            <Label>Difficulty Level</Label>
            <select value={f.difficulty} onChange={(e) => set({ difficulty: e.target.value })} className={inp}>
              <option value="">Select Difficulty Level</option>
              {['Easy', 'Medium', 'Hard'].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <Label>AAPC chapter (score report)</Label>
            <select value={f.chapter} onChange={(e) => set({ chapter: e.target.value })} className={inp}>
              <option value="">— none —</option>
              {AAPC_CHAPTERS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Marks</Label>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min={1} max={20} value={f.marks} onChange={(e) => set({ marks: e.target.value })} placeholder="+VE" title="+VE marks for a correct answer" className={inp} />
              <input type="number" min={0} max={20} step="0.25" value={f.negMarks} onChange={(e) => set({ negMarks: e.target.value })} placeholder="-VE" title="-VE marks for a wrong answer" className={inp} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5"><span>+VE (correct)</span><span>-VE (wrong)</span></div>
          </div>
          <div>
            <Label>Bonus Marks</Label>
            <input type="number" min={0} max={20} step="0.25" value={f.bonusMarks} onChange={(e) => set({ bonusMarks: e.target.value })} className={inp} />
            <div className="text-[10px] text-slate-400 mt-0.5">More than 0 = every student gets these marks (for a wrong / disputed question)</div>
          </div>

          <div className="text-xs font-semibold text-slate-700 pt-2 pb-2 border-b border-slate-200">More</div>
          {[
            { k: 'passage', l: 'Have Passage ?' },
            { k: 'instruction', l: 'Have Instruction Part ?' },
            { k: 'solution', l: 'Have Solution ?' },
            { k: 'optionE', l: 'Have Option "E" ?', hide: f.qType === 'True/False' }
          ].filter((x) => !x.hide).map((x) => (
            <label key={x.k} className="flex items-center gap-3 pl-6 text-[11px] font-bold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={more[x.k]} onChange={(e) => (x.k === 'optionE' ? toggleE(e.target.checked) : setMore((m) => ({ ...m, [x.k]: e.target.checked })))} />
              {x.l}
            </label>
          ))}
        </div>

        {/* RIGHT: content */}
        <div className="bg-white rounded border border-slate-200">
          <div className="border-b border-slate-200 px-3 pt-2">
            <span className="inline-block px-3 py-1.5 text-[11px] border border-b-white border-slate-200 rounded-t -mb-px bg-white">{f.language || 'English'}</span>
          </div>
          <div className="p-4 space-y-5">
            {more.instruction && (
              <div>
                <div className="text-xs font-bold text-slate-800 mb-1">Instruction</div>
                <RichEditor value={f.instruction} onChange={(v) => set({ instruction: v })} minHeight={70} fontFamily={fontFamily} placeholder="e.g. Read the passage and answer the question that follows" />
              </div>
            )}
            {more.passage && (
              <div>
                <div className="text-xs font-bold text-slate-800 mb-1">Passage</div>
                <RichEditor value={f.passage} onChange={(v) => set({ passage: v })} minHeight={120} fontFamily={fontFamily} placeholder="Paste the case / passage here" />
              </div>
            )}
            <div>
              <div className="text-xs font-bold text-slate-800 mb-1">Type your Question</div>
              <RichEditor value={f.q} onChange={(v) => set({ q: v })} minHeight={110} fontFamily={fontFamily} />
            </div>

            <div className="border-t border-slate-200 pt-3">
              <div className="grid grid-cols-[110px_1fr] gap-3 text-[11px] font-semibold text-slate-600 mb-1">
                <div className="text-center">CORRECT</div><div>QUESTION OPTION</div>
              </div>
              <div className="space-y-4">
                {f.options.map((o, j) => (
                  <div key={`${f.qType}-${j}`} className="grid grid-cols-[110px_1fr] gap-3 items-start border-b border-slate-100 pb-4 last:border-0">
                    <label className="block border border-slate-200 rounded overflow-hidden cursor-pointer">
                      <div className={`text-center text-xs font-bold py-1.5 ${f.answer === j ? 'bg-emerald-700' : 'bg-emerald-600'} text-white`}>{LETTERS[j]}</div>
                      <div className={`py-2 flex justify-center ${f.answer === j ? 'bg-emerald-50' : 'bg-white'}`}>
                        <input type="radio" name="correct" checked={f.answer === j} onChange={() => set({ answer: j })} className="w-4 h-4 accent-emerald-600" />
                      </div>
                    </label>
                    {f.qType === 'True/False'
                      ? <div className="px-3 py-2.5 border border-slate-300 rounded text-sm bg-slate-50">{o}</div>
                      : <RichEditor value={o} onChange={(v) => setOpt(j, v)} minHeight={60} fontFamily={fontFamily} />}
                  </div>
                ))}
              </div>
            </div>

            {more.solution && (
              <div className="border-t border-slate-200 pt-3">
                <div className="text-xs font-bold text-slate-800 mb-1">Solution</div>
                <RichEditor value={f.rationale} onChange={(v) => set({ rationale: v })} minHeight={90} fontFamily={fontFamily} placeholder="Shown to students with the result" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
