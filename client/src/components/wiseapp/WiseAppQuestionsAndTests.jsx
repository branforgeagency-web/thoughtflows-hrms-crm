import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  Flag,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  BookOpen,
  X,
  Upload,
  Check,
  Send,
  ChevronDown
} from 'lucide-react';
import {
  getWiseAppQuestions,
  createWiseAppQuestion,
  bulkCreateWiseAppQuestions,
  updateWiseAppQuestion,
  deleteWiseAppQuestion,
  reportWiseAppQuestion,
  resolveWiseAppQuestionReport,
  getWiseAppTests,
  createWiseAppTest,
  updateWiseAppTest,
  deleteWiseAppTest
} from '../../services/api';
import OnlineTestBuilder, { AAPC_CHAPTERS } from '../OnlineTestBuilder';

const COURSES = ['CPC', 'CIC', 'COC', 'CPB', 'CPMA', 'CRC', 'CCS', 'Anatomy & Terminology'];
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const parseBulkQuestions = (text, course, chapter) => {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length < 3) return null;
      const qLines = [];
      const options = [];
      let correctIndex = 0;
      lines.forEach((l) => {
        const m = l.match(/^([A-Fa-f])[).:-]\s*(.+)$/);
        if (m) {
          let opt = m[2].trim();
          if (/\*\s*$/.test(opt)) {
            correctIndex = options.length;
            opt = opt.replace(/\s*\*\s*$/, '').trim();
          }
          options.push(opt);
        } else if (!options.length) {
          qLines.push(l.replace(/^\d+[).]\s*/, ''));
        }
      });
      if (!qLines.length || options.length < 2) return null;
      return {
        questionText: qLines.join(' '),
        options: options.slice(0, 6),
        correctIndex: Math.min(correctIndex, options.length - 1),
        marks: 1,
        course,
        chapter,
        difficulty: 'Medium'
      };
    })
    .filter(Boolean);
};

export function WiseAppQuestionsSection({ initialReportedOnly = false, onChanged }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [reportedOnly, setReportedOnly] = useState(initialReportedOnly);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkCourse, setBulkCourse] = useState('CPC');
  const [bulkChapter, setBulkChapter] = useState(AAPC_CHAPTERS[1]);
  const [editing, setEditing] = useState(null);
  const [resolvingQ, setResolvingQ] = useState(null);
  const [resolveNote, setResolveNote] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    questionText: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    marks: 1,
    course: 'CPC',
    chapter: AAPC_CHAPTERS[1],
    difficulty: 'Medium',
    explanation: '',
    testName: ''
  });

  useEffect(() => {
    setReportedOnly(initialReportedOnly);
  }, [initialReportedOnly]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getWiseAppQuestions({
        q: search,
        course: courseFilter,
        reported: reportedOnly ? 'true' : ''
      });
      setQuestions(Array.isArray(data) ? data : []);
    } catch (_) {
      setQuestions([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [reportedOnly, courseFilter]);

  const resetForm = () => {
    setEditing(null);
    setForm({
      questionText: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      marks: 1,
      course: 'CPC',
      chapter: AAPC_CHAPTERS[1],
      difficulty: 'Medium',
      explanation: '',
      testName: ''
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateWiseAppQuestion(editing._id, form);
        setMsg('Question updated successfully.');
      } else {
        await createWiseAppQuestion(form);
        setMsg('Question added to WiseApp Question Bank.');
      }
      setShowForm(false);
      resetForm();
      await load();
      onChanged?.();
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Could not save question.');
    }
  };

  const handleBulkSave = async () => {
    const parsed = parseBulkQuestions(bulkText, bulkCourse, bulkChapter);
    if (!parsed.length) {
      setMsg('No valid MCQs parsed. Follow format: Question line, then A) ..., B) ... * for correct answer.');
      return;
    }
    try {
      const res = await bulkCreateWiseAppQuestions(parsed);
      setMsg(`Imported ${res.insertedCount || parsed.length} questions.`);
      setBulkText('');
      setShowBulk(false);
      await load();
      onChanged?.();
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Bulk import failed.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question from WiseApp Question Bank?')) return;
    await deleteWiseAppQuestion(id);
    await load();
    onChanged?.();
  };

  const handleReport = async (q) => {
    const reason = window.prompt('Reason for reporting this question (e.g. Wrong answer key, Typo, Outdated CPT code):', 'Incorrect Answer Key');
    if (!reason) return;
    await reportWiseAppQuestion(q._id, { reason });
    setMsg('Question flagged under Reported Questions.');
    await load();
    onChanged?.();
  };

  const handleResolve = async (action) => {
    if (!resolvingQ) return;
    await resolveWiseAppQuestionReport(resolvingQ._id, {
      action,
      resolutionNote: resolveNote || (action === 'resolved' ? 'Verified & fixed' : 'Dismissed after review'),
      updatedQuestion: {
        questionText: resolvingQ.questionText,
        options: resolvingQ.options,
        correctIndex: resolvingQ.correctIndex,
        explanation: resolvingQ.explanation
      }
    });
    setResolvingQ(null);
    setResolveNote('');
    setMsg('Reported question reviewed & cleared.');
    await load();
    onChanged?.();
  };

  const filtered = questions.filter((q) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (q.questionText || '').toLowerCase().includes(s) ||
      (q.chapter || '').toLowerCase().includes(s) ||
      (q.testName || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="bg-white rounded border border-slate-200 border-t-[3px] border-t-[#dd4b39] p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              {reportedOnly ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-[#a94442]" />
                  Reported Questions Triage Queue
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4 text-[#dd4b39]" />
                  Manage Questions — Medical Coding Question Bank
                </>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {reportedOnly
                ? 'Review student & trainer flagged questions, fix answer keys or rationales, and clear reports.'
                : 'Create, bulk-import, categorize by AAPC chapter, and maintain practice & exam questions.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setReportedOnly(!reportedOnly)}
              className={`px-3 py-1.5 rounded text-xs font-bold border transition cursor-pointer ${
                reportedOnly
                  ? 'bg-[#a94442] text-white border-[#953b39]'
                  : 'bg-white text-[#a94442] border-[#a94442]/40 hover:bg-rose-50'
              }`}
            >
              {reportedOnly ? 'Showing Reported Only' : 'View Reported Queue'}
            </button>
            <button
              onClick={() => setShowBulk(!showBulk)}
              className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> Bulk Paste
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-3.5 py-1.5 rounded bg-[#00a65a] hover:bg-[#008d4c] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Question
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search question text, chapter, or test..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#00c0ef]"
            />
          </div>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded text-xs bg-white"
          >
            <option value="">All Courses</option>
            {COURSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="text-xs font-semibold text-slate-500 px-2">
            {filtered.length} question{filtered.length === 1 ? '' : 's'}
          </span>
        </div>

        {msg && (
          <div className="mt-3 px-3 py-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <span>{msg}</span>
            <button onClick={() => setMsg('')} className="text-emerald-700 font-bold">×</button>
          </div>
        )}
      </div>

      {/* Bulk Paste Panel */}
      {showBulk && (
        <div className="bg-white rounded border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Bulk Paste MCQs (Separate blocks with blank line, mark correct option with *)
            </h4>
            <button onClick={() => setShowBulk(false)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select value={bulkCourse} onChange={(e) => setBulkCourse(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded text-xs">
              {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={bulkChapter} onChange={(e) => setBulkChapter(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded text-xs">
              {AAPC_CHAPTERS.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          </div>
          <textarea
            rows={5}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`Which modifier indicates a bilateral procedure?\nA) 25\nB) 50 *\nC) 59\nD) 76`}
            className="w-full p-2.5 border border-slate-200 rounded text-xs font-mono"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowBulk(false)} className="px-3 py-1.5 text-xs rounded border border-slate-200">Cancel</button>
            <button onClick={handleBulkSave} className="px-4 py-1.5 text-xs font-bold rounded bg-[#00a65a] text-white cursor-pointer">
              Import Questions
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="bg-white rounded border border-slate-200 border-t-[3px] border-t-[#00a65a] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-800">{editing ? 'Edit Question' : 'New Medical Coding Question'}</h4>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Question Stem *</label>
              <textarea
                rows={2}
                required
                value={form.questionText}
                onChange={(e) => setForm({ ...form, questionText: e.target.value })}
                placeholder="Enter medical coding scenario or MCQ question..."
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {form.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctIdx"
                    checked={form.correctIndex === idx}
                    onChange={() => setForm({ ...form, correctIndex: idx })}
                    title="Mark as correct option"
                  />
                  <span className="text-xs font-bold text-slate-500 w-4">{LETTERS[idx]})</span>
                  <input
                    value={opt}
                    onChange={(e) => {
                      const next = [...form.options];
                      next[idx] = e.target.value;
                      setForm({ ...form, options: next });
                    }}
                    placeholder={`Option ${LETTERS[idx]}`}
                    className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded text-xs"
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} className="px-2.5 py-1.5 border border-slate-200 rounded text-xs">
                {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} className="px-2.5 py-1.5 border border-slate-200 rounded text-xs sm:col-span-2">
                {AAPC_CHAPTERS.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
              </select>
              <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className="px-2.5 py-1.5 border border-slate-200 rounded text-xs">
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={form.explanation}
                onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                placeholder="Coding Rationale / ICD-CPT Guideline reference"
                className="px-2.5 py-1.5 border border-slate-200 rounded text-xs"
              />
              <input
                value={form.testName}
                onChange={(e) => setForm({ ...form, testName: e.target.value })}
                placeholder="Linked Test Name (optional)"
                className="px-2.5 py-1.5 border border-slate-200 rounded text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs rounded border border-slate-200">Cancel</button>
              <button type="submit" className="px-4 py-1.5 text-xs font-bold rounded bg-[#00a65a] text-white cursor-pointer">
                {editing ? 'Update Question' : 'Save Question'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resolve Reported Modal */}
      {resolvingQ && (
        <div className="bg-rose-50/70 rounded border border-[#a94442]/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#a94442] uppercase">Resolve Reported Question</h4>
            <button onClick={() => setResolvingQ(null)} className="text-slate-500"><X className="w-4 h-4" /></button>
          </div>
          <textarea
            rows={2}
            value={resolvingQ.questionText}
            onChange={(e) => setResolvingQ({ ...resolvingQ, questionText: e.target.value })}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-xs"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(resolvingQ.options || []).map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-200">
                <input
                  type="radio"
                  checked={resolvingQ.correctIndex === idx}
                  onChange={() => setResolvingQ({ ...resolvingQ, correctIndex: idx })}
                />
                <span className="text-xs font-bold">{LETTERS[idx]})</span>
                <input
                  value={opt}
                  onChange={(e) => {
                    const next = [...resolvingQ.options];
                    next[idx] = e.target.value;
                    setResolvingQ({ ...resolvingQ, options: next });
                  }}
                  className="flex-1 text-xs outline-none"
                />
              </div>
            ))}
          </div>
          <input
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
            placeholder="Resolution note (e.g. Updated CPT answer key from 99213 to 99214)"
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-xs"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => handleResolve('dismissed')} className="px-3 py-1.5 text-xs rounded border border-slate-300 bg-white font-semibold cursor-pointer">
              Dismiss Report
            </button>
            <button onClick={() => handleResolve('resolved')} className="px-4 py-1.5 text-xs rounded bg-[#00a65a] text-white font-bold flex items-center gap-1 cursor-pointer">
              <Check className="w-3.5 h-3.5" /> Save Fix & Resolve
            </button>
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading question bank...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {reportedOnly ? 'No open reported questions! All flagged items are resolved.' : 'No questions yet. Click "Add Question" or "Bulk Paste" to build the WiseApp Question Bank.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((q, idx) => (
              <div key={q._id} className="p-4 hover:bg-slate-50/70 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">Q{idx + 1}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#00c0ef]/15 text-[#0086a8]">{q.course}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">{q.chapter}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700">{q.difficulty}</span>
                      {q.testName && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">Test: {q.testName}</span>
                      )}
                      {q.reported && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#a94442] text-white">
                          Reported ({q.reportCount || 1})
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-800">{q.questionText}</p>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {(q.options || []).map((opt, oi) => (
                        <div
                          key={oi}
                          className={`text-xs px-2.5 py-1 rounded border flex items-center gap-1.5 ${
                            q.correctIndex === oi
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          <span className="font-bold">{LETTERS[oi]})</span>
                          <span>{opt}</span>
                          {q.correctIndex === oi && <CheckCircle2 className="w-3 h-3 ml-auto text-emerald-600" />}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        <strong className="text-slate-700">Rationale:</strong> {q.explanation}
                      </p>
                    )}
                    {q.reported && q.reports?.length > 0 && (
                      <div className="mt-2 p-2 rounded bg-rose-50 border border-rose-200 text-[11px] text-[#a94442]">
                        <strong>Latest Report:</strong> {q.reports[q.reports.length - 1].reason}
                        {q.reports[q.reports.length - 1].details ? ` — ${q.reports[q.reports.length - 1].details}` : ''} (by {q.reports[q.reports.length - 1].reportedBy})
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {q.reported ? (
                      <button
                        onClick={() => setResolvingQ({ ...q })}
                        className="px-2.5 py-1 rounded bg-[#00a65a] text-white text-[11px] font-bold cursor-pointer"
                      >
                        Resolve
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReport(q)}
                        className="px-2.5 py-1 rounded border border-rose-200 text-[#a94442] hover:bg-rose-50 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Flag className="w-3 h-3" /> Report
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditing(q);
                        setForm({
                          questionText: q.questionText,
                          options: q.options?.length >= 4 ? q.options : [...(q.options || []), '', '', '', ''].slice(0, 4),
                          correctIndex: q.correctIndex || 0,
                          marks: q.marks || 1,
                          course: q.course || 'CPC',
                          chapter: q.chapter || AAPC_CHAPTERS[1],
                          difficulty: q.difficulty || 'Medium',
                          explanation: q.explanation || '',
                          testName: q.testName || ''
                        });
                        setShowForm(true);
                      }}
                      className="px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(q._id)}
                      className="px-2.5 py-1 rounded border border-slate-200 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const formatTestDate = (val) => {
  if (!val) return 'NA';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return 'NA';
  return d.toISOString().slice(0, 10);
};

export function WiseAppTestsSection({ initialType = '', onChanged }) {
  const [tests, setTests] = useState([]);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [builderTest, setBuilderTest] = useState(null);
  const [openActionId, setOpenActionId] = useState(null);
  const [selectedQIds, setSelectedQIds] = useState([]);
  const [selectedTestIds, setSelectedTestIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('All Courses');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [msg, setMsg] = useState('');

  const defaultForm = {
    name: '',
    testCode: '',
    type: initialType || 'Practice Test',
    course: 'CPC',
    batch: '',
    trainerName: '',
    durationMin: 45,
    passMark: 35,
    mode: initialType === 'Subjective Test' ? 'offline' : 'online',
    openDate: '',
    closeDate: '',
    publishResult: true,
    status: 'Active'
  };
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      type: initialType || 'Practice Test',
      mode: initialType === 'Subjective Test' ? 'offline' : f.mode
    }));
    setCurrentPage(1);
  }, [initialType]);

  const load = async () => {
    setLoading(true);
    try {
      const [tData, qData] = await Promise.all([
        getWiseAppTests(),
        getWiseAppQuestions()
      ]);
      setTests(Array.isArray(tData) ? tData : []);
      setBankQuestions(Array.isArray(qData) ? qData : []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openAddModal = () => {
    setEditingTest(null);
    setSelectedQIds([]);
    setForm(defaultForm);
    setShowModal(true);
    setOpenActionId(null);
  };

  const openEditModal = (t) => {
    setEditingTest(t);
    setSelectedQIds([]);
    setForm({
      name: t.name || '',
      testCode: t.testCode || '',
      type: t.type || 'Practice Test',
      course: t.course || 'CPC',
      batch: t.batch || '',
      trainerName: t.trainerName || '',
      durationMin: t.durationMin || 45,
      passMark: t.passMark ?? 35,
      mode: t.mode || 'online',
      openDate: t.openDate ? String(t.openDate).slice(0, 10) : '',
      closeDate: t.closeDate ? String(t.closeDate).slice(0, 10) : '',
      publishResult: t.publishResult !== undefined ? Boolean(t.publishResult) : true,
      status: t.status || 'Active'
    });
    setShowModal(true);
    setOpenActionId(null);
  };

  const handleSaveTest = async (e) => {
    e.preventDefault();
    try {
      if (editingTest) {
        await updateWiseAppTest(editingTest.id, {
          ...form,
          openDate: form.openDate || null,
          closeDate: form.closeDate || null
        });
        setMsg(`Test "${form.name}" updated.`);
      } else {
        await createWiseAppTest({
          ...form,
          openDate: form.openDate || null,
          closeDate: form.closeDate || null,
          questionIds: selectedQIds
        });
        setMsg(`Test "${form.name}" created and synced.`);
      }
      setShowModal(false);
      setEditingTest(null);
      setSelectedQIds([]);
      setForm(defaultForm);
      await load();
      onChanged?.();
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Could not save test.');
    }
  };

  const handleDelete = async (id) => {
    setOpenActionId(null);
    if (!window.confirm('Delete this test?')) return;
    await deleteWiseAppTest(id);
    setSelectedTestIds((prev) => prev.filter((x) => x !== id));
    await load();
    onChanged?.();
  };

  const toggleStatus = async (t) => {
    setOpenActionId(null);
    const next = t.status === 'Active' ? 'Closed' : 'Active';
    await updateWiseAppTest(t.id, { status: next });
    await load();
    onChanged?.();
  };

  const togglePublishResult = async (t) => {
    setOpenActionId(null);
    const next = !(t.publishResult !== false);
    await updateWiseAppTest(t.id, { publishResult: next });
    await load();
    onChanged?.();
  };

  const handleSendTest = async (t) => {
    const shareText = `WiseApp Test: ${t.name} (${t.testCode || `TST${String(t.id).slice(-8).toUpperCase()}`}) — ${t.course || 'All Courses'}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
      }
    } catch (_) {}
    setMsg(`Test link/notification prepared for "${t.name}" (${t.course || 'All Courses'}).`);
  };

  const handleBulkDelete = async () => {
    if (selectedTestIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedTestIds.length} selected test(s)?`)) return;
    await Promise.all(selectedTestIds.map((id) => deleteWiseAppTest(id)));
    setSelectedTestIds([]);
    await load();
    onChanged?.();
  };

  const baseTests = initialType === 'Subjective Test'
    ? tests.filter((t) => t.type === 'Subjective Test')
    : tests;

  const courseOptions = Array.from(
    new Set([
      ...COURSES,
      ...baseTests.map((t) => (t.course || '').trim()).filter(Boolean)
    ])
  );

  const filteredTests = baseTests.filter((t) => {
    const matchesCourse =
      courseFilter === 'All Courses' || (t.course || '').toLowerCase() === courseFilter.toLowerCase();
    const q = searchQuery.trim().toLowerCase();
    const code = (t.testCode || `TST${String(t.id).slice(-8).toUpperCase()}`).toLowerCase();
    const matchesSearch =
      !q ||
      (t.name || '').toLowerCase().includes(q) ||
      code.includes(q) ||
      (t.course || '').toLowerCase().includes(q) ||
      (t.batch || '').toLowerCase().includes(q);
    return matchesCourse && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTests.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedTests = filteredTests.slice(startIdx, startIdx + pageSize);

  const allPageSelected =
    paginatedTests.length > 0 && paginatedTests.every((t) => selectedTestIds.includes(t.id));

  const toggleSelectAllPage = () => {
    const pageIds = paginatedTests.map((t) => t.id);
    if (allPageSelected) {
      setSelectedTestIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedTestIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedTestIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      {msg && (
        <div className="px-3.5 py-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="text-emerald-700 font-bold cursor-pointer">×</button>
        </div>
      )}

      {/* Main Test List Card (matches WiseApp Test List screenshot) */}
      <div className="bg-white rounded-sm border border-slate-200 shadow-xs">
        {/* Card Header */}
        <div className="px-4 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800">
            {initialType === 'Subjective Test' ? 'Subjective Test List' : 'Test List'}
          </h3>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search Test"
                className="w-44 sm:w-52 px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#3c8dbc]"
              />
            </div>
            <button
              onClick={openAddModal}
              className="px-3.5 py-1.5 rounded bg-[#3c8dbc] hover:bg-[#357ca5] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add
            </button>
          </div>
        </div>

        {/* Filter Row: Show + Course */}
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-slate-700">Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 border border-slate-300 rounded text-xs text-slate-700 bg-white focus:outline-none focus:border-[#3c8dbc]"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-slate-700">Course</span>
              <select
                value={courseFilter}
                onChange={(e) => {
                  setCourseFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="min-w-[160px] px-2.5 py-1.5 border border-slate-300 rounded text-xs text-slate-700 bg-white focus:outline-none focus:border-[#3c8dbc]"
              >
                <option value="All Courses">All Courses</option>
                {courseOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedTestIds.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600 font-medium">{selectedTestIds.length} selected</span>
              <button
                onClick={handleBulkDelete}
                className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-semibold cursor-pointer"
              >
                Delete Selected
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto px-4 pb-3">
          {loading ? (
            <div className="py-10 text-center text-xs text-slate-400">Loading tests...</div>
          ) : paginatedTests.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 border border-slate-100 rounded">
              {initialType === 'Subjective Test'
                ? 'No subjective tests found. Click "+ Add" to create one.'
                : 'No tests found. Click "+ Add" to create a test.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f4f6f9] border-y border-slate-200 text-xs font-bold text-slate-700">
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAllPage}
                      className="rounded border-slate-300 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-2.5 w-10">#</th>
                  <th className="py-2.5 px-3">Test ID</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Test Name</th>
                  <th className="py-2.5 px-3">Course</th>
                  <th className="py-2.5 px-3">Open Date</th>
                  <th className="py-2.5 px-3">Close Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Publish Result</th>
                  <th className="py-2.5 px-3">More</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTests.map((t, idx) => {
                  const rowNum = startIdx + idx + 1;
                  const testCode = t.testCode || `TST${String(t.id).slice(-8).toUpperCase()}`;
                  const publishResult = t.publishResult !== false;
                  const isDropdownOpen = openActionId === t.id;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 align-top">
                        <input
                          type="checkbox"
                          checked={selectedTestIds.includes(t.id)}
                          onChange={() => toggleSelectRow(t.id)}
                          className="rounded border-slate-300 cursor-pointer mt-0.5"
                        />
                      </td>
                      <td className="py-3 px-2.5 align-top font-bold text-slate-700">{rowNum}</td>
                      <td className="py-3 px-3 align-top text-slate-700 font-medium whitespace-nowrap">{testCode}</td>
                      <td className="py-3 px-3 align-top">
                        <div className="text-slate-700 font-normal leading-snug">{t.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {t.questionCount || 0} Questions
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top text-slate-700">{t.course || 'All'}</td>
                      <td className="py-3 px-3 align-top text-slate-600 whitespace-nowrap">{formatTestDate(t.openDate)}</td>
                      <td className="py-3 px-3 align-top text-slate-600 whitespace-nowrap">{formatTestDate(t.closeDate)}</td>
                      <td className="py-3 px-3 align-top">
                        <button
                          onClick={() => toggleStatus(t)}
                          title="Click to toggle status"
                          className={`px-2.5 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                            t.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {t.status || 'Active'}
                        </button>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <button
                          onClick={() => togglePublishResult(t)}
                          title="Click to toggle Publish Result"
                          className={`px-2.5 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                            publishResult
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {publishResult ? 'Yes' : 'No'}
                        </button>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <div className="relative inline-flex items-center gap-1.5">
                          <div className="relative">
                            <button
                              onClick={() => setOpenActionId(isDropdownOpen ? null : t.id)}
                              className="px-2.5 py-1.5 rounded bg-[#f39c12] hover:bg-[#e08e0b] text-white text-xs font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            >
                              <ChevronDown className="w-3 h-3" /> Action
                            </button>
                            {isDropdownOpen && (
                              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded shadow-lg z-30 py-1 text-xs">
                                <button
                                  onClick={() => openEditModal(t)}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 cursor-pointer"
                                >
                                  Edit Test
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenActionId(null);
                                    setBuilderTest(t);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 cursor-pointer"
                                >
                                  Manage Questions ({t.questionCount || 0})
                                </button>
                                <button
                                  onClick={() => toggleStatus(t)}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 cursor-pointer"
                                >
                                  Set {t.status === 'Active' ? 'Closed' : 'Active'}
                                </button>
                                <button
                                  onClick={() => togglePublishResult(t)}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 cursor-pointer"
                                >
                                  Publish Result: {publishResult ? 'No' : 'Yes'}
                                </button>
                                <button
                                  onClick={() => handleDelete(t.id)}
                                  className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 border-t border-slate-100 cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleSendTest(t)}
                            title="Send / Share Test"
                            className="p-1.5 rounded bg-[#3c8dbc] hover:bg-[#357ca5] text-white cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Showing {filteredTests.length === 0 ? 0 : startIdx + 1} to {Math.min(startIdx + pageSize, filteredTests.length)} of {filteredTests.length} entries
          </div>
          <div className="inline-flex items-center border border-slate-300 rounded overflow-hidden">
            <button
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer border-r border-slate-300"
            >
              Previous
            </button>
            <span className="px-3 py-1 bg-[#3c8dbc] text-white font-semibold">
              {safePage}
            </span>
            <button
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer border-l border-slate-300"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Test Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-[#3c8dbc] text-white flex items-center justify-between">
              <h4 className="text-sm font-bold">
                {editingTest ? 'Edit Test' : 'Add New Test'}
              </h4>
              <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveTest} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Test Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Basic Principles in Medical Office Accounting / Mock Test 7"
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Test ID (auto if blank)</label>
                  <input
                    value={form.testCode}
                    onChange={(e) => setForm({ ...form, testCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. TSTF30CCADF"
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Course</label>
                  <input
                    list="wiseapp-course-suggestions"
                    value={form.course}
                    onChange={(e) => setForm({ ...form, course: e.target.value })}
                    placeholder="e.g. CPPM Vol 2 / Certification Mastery / CPC"
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                  <datalist id="wiseapp-course-suggestions">
                    {courseOptions.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Test Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                  >
                    <option value="Practice Test">Practice Test</option>
                    <option value="Subjective Test">Subjective Test</option>
                    <option value="Weekly Test">Weekly Test</option>
                    <option value="Mock Exam">Mock Exam</option>
                    <option value="Chapter Quiz">Chapter Quiz</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batch (Optional)</label>
                  <input
                    value={form.batch}
                    onChange={(e) => setForm({ ...form, batch: e.target.value })}
                    placeholder="Leave blank for all batches"
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Open Date</label>
                  <input
                    type="date"
                    value={form.openDate}
                    onChange={(e) => setForm({ ...form, openDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Close Date</label>
                  <input
                    type="date"
                    value={form.closeDate}
                    onChange={(e) => setForm({ ...form, closeDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={form.durationMin}
                    onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) || 45 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mode</label>
                  <select
                    value={form.mode}
                    onChange={(e) => setForm({ ...form, mode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                  >
                    <option value="online">Online MCQ Test</option>
                    <option value="offline">Offline / Classroom</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Closed">Closed</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.publishResult}
                      onChange={(e) => setForm({ ...form, publishResult: e.target.checked })}
                    />
                    Publish Result Immediately (Yes / No)
                  </label>
                </div>
              </div>

              {!editingTest && bankQuestions.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-slate-700 mb-1.5">
                    Attach Questions from WiseApp Question Bank ({selectedQIds.length} selected)
                  </div>
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded divide-y divide-slate-100">
                    {bankQuestions.map((q) => {
                      const checked = selectedQIds.includes(q._id);
                      return (
                        <label key={q._id} className="flex items-start gap-2 p-2 text-xs hover:bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedQIds((prev) =>
                                checked ? prev.filter((id) => id !== q._id) : [...prev, q._id]
                              )
                            }
                          />
                          <span className="flex-1 text-slate-700 line-clamp-1">{q.questionText}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{q.course}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 rounded border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#3c8dbc] hover:bg-[#357ca5] text-white text-xs font-bold cursor-pointer"
                >
                  {editingTest ? 'Save Changes' : 'Create Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Builder Modal for Test */}
      {builderTest && (
        <OnlineTestBuilder
          test={builderTest}
          onClose={() => setBuilderTest(null)}
          onSaved={() => {
            load();
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}
