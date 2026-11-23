import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, RefreshCw, ListChecks, Eye, EyeOff, Pencil, Users, Clock, AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import {
  getTestSeriesList,
  createTestSeries,
  updateTestSeries,
  deleteTestSeries,
  addTestToSeries,
  removeTestFromSeries
} from '../services/api';
import { ALL_COURSES } from '../constants/courses';
import OnlineTestBuilder from './OnlineTestBuilder';

// Test Series — course-wide mock / practice tests (Head of Trainer & Managers).
//   1. Create a series and pick the courses it is for (blank = all students)
//   2. Add tests and fill each one's questions in the online test builder
//   3. Publish → every admitted student of those courses sees it in
//      Student Portal → Test Series and can take / retake the tests.
const COURSE_CODES = [...new Set(ALL_COURSES.map((c) => c.code))];

function SeriesForm({ initial, onCancel, onSave, saving }) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [courses, setCourses] = useState(initial?.courses || []);
  const [pick, setPick] = useState('');
  const addCourse = (c) => { const v = String(c || '').trim(); if (v && !courses.includes(v)) setCourses([...courses, v]); setPick(''); };
  return (
    <div className="bg-white rounded-2xl border border-teal-200 p-4 sm:p-5 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[11px] font-bold text-slate-600">Series name *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CPC Mock Exam Series"
            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold text-slate-600">For courses</span>
          <div className="mt-1 flex gap-2">
            <input list="ts-course-codes" value={pick} onChange={(e) => setPick(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCourse(pick); } }}
              placeholder="Type or pick a course, e.g. CPC" className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm" />
            <button type="button" onClick={() => addCourse(pick)} className="px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700">Add</button>
          </div>
          <datalist id="ts-course-codes">{COURSE_CODES.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {courses.length === 0
          ? <span className="text-[11px] text-slate-500">No course picked → visible to <b>all admitted students</b>.</span>
          : courses.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-bold text-teal-800">
              {c}<button type="button" onClick={() => setCourses(courses.filter((x) => x !== c))}><X className="w-3 h-3" /></button>
            </span>
          ))}
        {courses.length > 0 && <span className="text-[10px] text-slate-400">"CPC" also covers CPC Fast track, CPC+ED, CPC+CIC…</span>}
      </div>
      <label className="block">
        <span className="text-[11px] font-bold text-slate-600">Description (shown to students)</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
          placeholder="e.g. 10 full-length AAPC-style CPC mock exams — 100 questions, 4 hours each"
          className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
      </label>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
        <button type="button" disabled={saving || !name.trim()} onClick={() => onSave({ name: name.trim(), description, courses })}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#009688] hover:bg-[#00897b] text-white disabled:opacity-50">
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Create series'}
        </button>
      </div>
    </div>
  );
}

export default function TestSeriesManager() {
  const [series, setSeries] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState('');
  const [newTest, setNewTest] = useState({ name: '', durationMin: 60 });
  const [builderTest, setBuilderTest] = useState(null);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 3500); };
  const errOf = (e) => e?.response?.data?.error || e.message;

  const load = useCallback(async () => {
    try {
      const data = await getTestSeriesList();
      setSeries(data?.series || []);
      setCanManage(Boolean(data?.canManage));
      setError('');
    } catch (e) {
      setError(errOf(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => ({
    published: series.filter((s) => s.status === 'Published').length,
    tests: series.reduce((a, s) => a + s.tests.length, 0),
    attempts: series.reduce((a, s) => a + s.tests.reduce((b, t) => b + (t.submitted || 0), 0), 0)
  }), [series]);

  const run = async (fn, okMsg) => {
    setSaving(true);
    setError('');
    try {
      await fn();
      if (okMsg) flash(okMsg);
      await load();
      return true;
    } catch (e) {
      setError(errOf(e));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (body) => {
    let created = null;
    const ok = await run(async () => { created = await createTestSeries(body); }, '✓ Series created — now add tests to it');
    if (ok) { setCreating(false); if (created?.id) setOpenId(created.id); }
  };
  const handleEdit = async (id, body) => { if (await run(() => updateTestSeries(id, body), '✓ Series updated')) setEditingId(''); };
  const togglePublish = (s) => run(
    () => updateTestSeries(s.id, { status: s.status === 'Published' ? 'Draft' : 'Published' }),
    s.status === 'Published' ? 'Series hidden from students (Draft)' : '✓ Published — students of these courses can see it now'
  );
  const handleDelete = (s) => {
    if (!window.confirm(`Delete "${s.name}" and all its tests? This cannot be undone.`)) return;
    run(() => deleteTestSeries(s.id), 'Series deleted');
  };
  const handleAddTest = async (s) => {
    if (!newTest.name.trim()) return setError('Give the test a name, e.g. "Mock Test 1".');
    let created = null;
    const ok = await run(async () => { created = await addTestToSeries(s.id, { name: newTest.name.trim(), durationMin: Number(newTest.durationMin) || 60 }); }, '✓ Test added — add its questions now');
    if (ok) {
      setNewTest({ name: '', durationMin: 60 });
      if (created) setBuilderTest(created);
    }
  };
  const handleRemoveTest = (s, t) => {
    if (!window.confirm(`Remove "${t.name}" from ${s.name}?`)) return;
    run(() => removeTestFromSeries(s.id, t.id), 'Test removed');
  };

  if (loading) return <div className="py-12 text-center text-xs text-slate-500"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0d9488]" />Loading test series…</div>;

  return (
    <div className="space-y-4 max-w-[1200px]">
      {toast && <div className="p-3 rounded-xl bg-slate-900 text-white text-xs font-semibold">{toast}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Test Series</h2>
          <p className="text-xs text-slate-500 mt-0.5">Mock & practice tests for a whole course — every admitted student of that course sees published series in their portal and can retake them. Scores here don't change batch test averages.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">{stats.published}/{series.length} published</span>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">{stats.tests} tests</span>
          <span className="px-2.5 py-1 rounded-full bg-teal-50 text-[11px] font-bold text-teal-700">{stats.attempts} attempts</span>
          {canManage && !creating && (
            <button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold">
              <Plus className="w-4 h-4" />New series
            </button>
          )}
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
      {!canManage && <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">View only — the Head of Trainer and Managers create and edit test series.</div>}

      {creating && <SeriesForm onCancel={() => setCreating(false)} onSave={handleCreate} saving={saving} />}

      {series.length === 0 && !creating && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <ListChecks className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <div className="text-sm font-bold text-slate-700">No test series yet</div>
          <p className="text-xs text-slate-500 mt-1">Create one, e.g. "CPC Mock Exam Series", add Mock Test 1, 2, 3… and publish it.</p>
        </div>
      )}

      {series.map((s) => {
        const open = openId === s.id;
        const ready = s.tests.filter((t) => t.questionCount > 0).length;
        if (editingId === s.id) return <SeriesForm key={s.id} initial={s} onCancel={() => setEditingId('')} onSave={(b) => handleEdit(s.id, b)} saving={saving} />;
        return (
          <div key={s.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer hover:bg-slate-50" onClick={() => setOpenId(open ? '' : s.id)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-extrabold text-slate-900">{s.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.status === 'Published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{s.status}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {(s.courses || []).length ? s.courses.join(', ') : 'All students'} · {s.tests.length} test{s.tests.length === 1 ? '' : 's'} ({ready} with questions)
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button type="button" disabled={saving} onClick={() => togglePublish(s)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${s.status === 'Published' ? 'bg-white border border-slate-200 text-slate-700' : 'bg-emerald-600 text-white'}`}>
                    {s.status === 'Published' ? <><EyeOff className="w-3.5 h-3.5" />Unpublish</> : <><Eye className="w-3.5 h-3.5" />Publish</>}
                  </button>
                  <button type="button" onClick={() => setEditingId(s.id)} title="Edit" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><Pencil className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => handleDelete(s)} title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
              {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {open && (
              <div className="border-t border-slate-100 p-4 space-y-2 bg-slate-50/50">
                {s.description && <p className="text-xs text-slate-600 mb-2">{s.description}</p>}
                {s.tests.length === 0 && <div className="text-xs text-slate-500">No tests in this series yet.</div>}
                {s.tests.map((t, i) => (
                  <div key={t.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-white border border-slate-200">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900">{i + 1}. {t.name}</div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3">
                        {t.questionCount > 0
                          ? <span>{t.questionCount} questions · {t.totalMarks} marks · pass {t.passMark}</span>
                          : <span className="text-amber-700 font-semibold">No questions yet — students can't see it</span>}
                        <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{t.durationMin} min</span>
                        <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{t.submitted} attempt{t.submitted === 1 ? '' : 's'}{t.avgScore != null ? ` · avg ${t.avgScore}/${t.totalMarks}` : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setBuilderTest(t)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#0f212d] text-white hover:bg-[#172b38]">
                        {canManage ? (t.questionCount ? 'Edit questions · results' : 'Add questions') : 'View results'}
                      </button>
                      {canManage && (
                        <button type="button" onClick={() => handleRemoveTest(s, t)} title="Remove test" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </div>
                ))}
                {canManage && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <input value={newTest.name} onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddTest(s); }}
                      placeholder={`e.g. Mock Test ${s.tests.length + 1}`} className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white" />
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <input type="number" min={5} max={300} value={newTest.durationMin} onChange={(e) => setNewTest({ ...newTest, durationMin: e.target.value })}
                        className="w-20 px-2 py-2 rounded-xl border border-slate-200 text-xs bg-white" />min
                    </label>
                    <button type="button" disabled={saving} onClick={() => handleAddTest(s)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-xs font-bold disabled:opacity-50">
                      <Plus className="w-3.5 h-3.5" />Add test
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {builderTest && (
        <OnlineTestBuilder
          test={builderTest}
          onClose={() => { setBuilderTest(null); load(); }}
          onSaved={() => load()}
        />
      )}
    </div>
  );
}
