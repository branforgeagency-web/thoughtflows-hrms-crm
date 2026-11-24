import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Trash2, RefreshCw, ListChecks, Eye, EyeOff, Pencil, AlertCircle, X, Search, Send, ChevronDown,
  FileQuestion, BarChart3, Power, BookOpen, Flag, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  getTestSeriesList,
  createTestSeries,
  updateTestSeries,
  deleteTestSeries,
  addTestToSeries,
  removeTestFromSeries,
  updateSeriesTest,
  notifySeriesTest
} from '../services/api';
import { ALL_COURSES } from '../constants/courses';
import OnlineTestBuilder from './OnlineTestBuilder';
import TestQuestionBank from './TestQuestionBank';

// Test Series — course-wide mock / practice tests (Head of Trainer & Managers).
//   Test List  : every test of every course / series in one table (ID, dates,
//                status, publish result, actions) — like the online test panel
//   Questions  : question bank of one test (options, answer, marks, solution…)
//   Courses    : the series themselves (e.g. "CPPM Vol 1"), which courses see
//                them, and Publish / Draft
const COURSE_CODES = [...new Set(ALL_COURSES.map((c) => c.code))];

const fmtWindow = (d) => {
  if (!d) return 'NA';
  const [date, time] = d.split('T');
  const [y, m, day] = date.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let out = `${Number(day)} ${months[Number(m) - 1] || ''} ${y}`;
  if (time) {
    const [hh, mm] = time.split(':').map(Number);
    out += `, ${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
  }
  return out;
};

const Pill = ({ tone, children }) => (
  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${tone === 'green' ? 'bg-emerald-50 text-emerald-700' : tone === 'red' ? 'bg-rose-50 text-rose-700' : tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{children}</span>
);

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
          <span className="text-[11px] font-bold text-slate-600">Course name *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CPPM Vol 1"
            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold text-slate-600">For student courses</span>
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
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Create course'}
        </button>
      </div>
    </div>
  );
}

// Add / edit one test: course (series), name, duration, open / close window, status, publish result
function TestForm({ series, initial, defaultSeriesId, onCancel, onSave, saving }) {
  const [f, setF] = useState(() => ({
    seriesId: initial?.seriesId || defaultSeriesId || series[0]?.id || '',
    name: initial?.name || '',
    topic: initial?.topic || '',
    durationMin: initial?.durationMin || 60,
    openDate: initial?.openDate || '',
    closeDate: initial?.closeDate || '',
    status: initial?.status || 'Active',
    publishResult: initial ? initial.publishResult !== false : true
  }));
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const inp = 'mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-sky-500';
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl mt-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900">{initial ? 'Edit Test' : 'Add Test'}</h3>
          <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold text-slate-600">Course *</span>
            <select value={f.seriesId} onChange={(e) => set({ seriesId: e.target.value })} className={inp}>
              {series.map((s) => <option key={s.id} value={s.id}>{s.name}{s.status !== 'Published' ? ' (Draft)' : ''}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold text-slate-600">Test name *</span>
            <input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Mock Test 7" className={inp} />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-600">Topic / subject</span>
            <input value={f.topic} onChange={(e) => set({ topic: e.target.value })} placeholder="e.g. Medical Office Accounting" className={inp} />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-600">Duration (minutes) *</span>
            <input type="number" min={5} max={300} value={f.durationMin} onChange={(e) => set({ durationMin: e.target.value })} className={inp} />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-600">Open date</span>
            <input type="datetime-local" value={f.openDate} onChange={(e) => set({ openDate: e.target.value })} className={inp} />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-600">Close date</span>
            <input type="datetime-local" value={f.closeDate} onChange={(e) => set({ closeDate: e.target.value })} className={inp} />
          </label>
          <p className="sm:col-span-2 -mt-2 text-[11px] text-slate-500">Leave the dates empty (NA) to keep the test open all the time. Times are IST.</p>
          <label className="block">
            <span className="text-xs font-bold text-slate-600">Status</span>
            <select value={f.status} onChange={(e) => set({ status: e.target.value })} className={inp}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive (hidden from students)</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-600">Publish result</span>
            <select value={f.publishResult ? 'yes' : 'no'} onChange={(e) => set({ publishResult: e.target.value === 'yes' })} className={inp}>
              <option value="yes">Yes — show score & answers after submit</option>
              <option value="no">No — hold results for now</option>
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          <button type="button" disabled={saving || !f.name.trim() || !f.seriesId} onClick={() => onSave(f)}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50">
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add test'}
          </button>
        </div>
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
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('tests'); // tests | questions | courses
  // Test list
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [view, setView] = useState(() => { try { return localStorage.getItem('tf_test_view') || 'table'; } catch (_) { return 'table'; } });
  const switchView = (v) => { setView(v); try { localStorage.setItem('tf_test_view', v); } catch (_) { /* ignore */ } };
  const [page, setPage] = useState(1);
  const [courseFilter, setCourseFilter] = useState('');
  const [selected, setSelected] = useState([]);
  const [menuId, setMenuId] = useState('');
  const [testForm, setTestForm] = useState(null); // { initial? }
  const [builderTest, setBuilderTest] = useState(null);
  const [bankTestId, setBankTestId] = useState('');
  // Courses (series)
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState('');
  const menuRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null); // table dropdown: fixed position next to the button

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

  useEffect(() => {
    if (!menuId) return undefined;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(''); };
    const closeAll = () => setMenuId('');
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', closeAll, true);
    window.addEventListener('resize', closeAll);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', closeAll, true);
      window.removeEventListener('resize', closeAll);
    };
  }, [menuId]);

  const run = async (fn, okMsg) => {
    setSaving(true);
    setError('');
    try {
      const out = await fn();
      if (okMsg) flash(typeof okMsg === 'function' ? okMsg(out) : okMsg);
      await load();
      return true;
    } catch (e) {
      setError(errOf(e));
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Every test of every series, newest first (like the test panel list)
  const allTests = useMemo(() => series.flatMap((s) => s.tests.map((t) => ({ ...t, seriesId: s.id, seriesName: s.name, seriesStatus: s.status })))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)), [series]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTests.filter((t) => (!courseFilter || t.seriesId === courseFilter)
      && (!q || [t.name, t.testCode, t.seriesName, t.topic].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [allTests, search, courseFilter]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const curPage = Math.min(page, pages);
  const rows = filtered.slice((curPage - 1) * pageSize, curPage * pageSize);
  useEffect(() => { setPage(1); }, [search, courseFilter, pageSize]);

  const bankTest = allTests.find((t) => t.id === bankTestId);

  // ----- test actions -----
  const saveTest = async (f) => {
    const initial = testForm?.initial;
    const body = {
      name: f.name.trim(), topic: f.topic, durationMin: Number(f.durationMin) || 60,
      openDate: f.openDate, closeDate: f.closeDate, status: f.status, publishResult: f.publishResult
    };
    if (initial) {
      const ok = await run(() => updateSeriesTest(initial.seriesId, initial.id, { ...body, moveToSeriesId: f.seriesId !== initial.seriesId ? f.seriesId : undefined }), '✓ Test updated');
      if (ok) setTestForm(null);
      return;
    }
    let created = null;
    const ok = await run(async () => {
      created = await addTestToSeries(f.seriesId, body);
      // status / window are saved on create too, but status Inactive needs the update route
      if (created?.id && f.status === 'Inactive') await updateSeriesTest(f.seriesId, created.id, { status: 'Inactive' });
    }, '✓ Test added — now add its questions');
    if (ok) {
      setTestForm(null);
      if (created?.id) setBankTestId(created.id);
    }
  };
  const patchTest = (t, patch, msg) => run(() => updateSeriesTest(t.seriesId, t.id, patch), msg);
  const deleteTest = (t) => {
    if (!window.confirm(`Delete "${t.name}" (${t.testCode})? This cannot be undone.`)) return;
    run(() => removeTestFromSeries(t.seriesId, t.id), 'Test deleted');
  };
  const sendTest = (t) => {
    if (!window.confirm(`Notify all students of "${t.seriesName}" that "${t.name}" is ready?`)) return;
    run(() => notifySeriesTest(t.seriesId, t.id), (out) => `✓ Sent to ${out?.notified || 0} student${out?.notified === 1 ? '' : 's'}`);
  };
  const bulk = async (patch, label) => {
    const list = allTests.filter((t) => selected.includes(t.id));
    if (!list.length) return;
    if (patch === 'delete') {
      if (!window.confirm(`Delete ${list.length} selected test${list.length === 1 ? '' : 's'}? Tests students have already taken are kept.`)) return;
    }
    let failed = 0;
    setSaving(true);
    for (const t of list) {
      try {
        if (patch === 'delete') await removeTestFromSeries(t.seriesId, t.id);
        else await updateSeriesTest(t.seriesId, t.id, patch);
      } catch (_) { failed += 1; }
    }
    setSaving(false);
    setSelected([]);
    flash(`${label}: ${list.length - failed} done${failed ? ` · ${failed} skipped (already taken by students)` : ''}`);
    load();
  };

  // ----- series (course) actions -----
  const handleCreate = async (body) => { if (await run(() => createTestSeries(body), '✓ Course created — add tests to it from Test List')) setCreating(false); };
  const handleEdit = async (id, body) => { if (await run(() => updateTestSeries(id, body), '✓ Course updated')) setEditingId(''); };
  const togglePublish = (s) => run(
    () => updateTestSeries(s.id, { status: s.status === 'Published' ? 'Draft' : 'Published' }),
    s.status === 'Published' ? 'Course hidden from students (Draft)' : '✓ Published — students of these courses can see it now'
  );
  const handleDeleteSeries = (s) => {
    if (!window.confirm(`Delete "${s.name}" and all its tests? This cannot be undone.`)) return;
    run(() => deleteTestSeries(s.id), 'Course deleted');
  };

  if (loading) return <div className="py-12 text-center text-xs text-slate-500"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-600" />Loading tests…</div>;

  if (bankTest) {
    return (
      <TestQuestionBank
        canManage={canManage}
        fixedTestId={bankTest.id}
        onBack={() => { setBankTestId(''); load(); }}
      />
    );
  }

  const allOnPage = rows.length > 0 && rows.every((t) => selected.includes(t.id));
  const toggleAll = (on) => setSelected(on ? [...new Set([...selected, ...rows.map((t) => t.id)])] : selected.filter((id) => !rows.some((t) => t.id === id)));

  // Action dropdown shared by the table and the cards
  const actionMenu = (t, placement, style) => (
    <div style={style} className={`${style ? 'fixed' : 'absolute right-0'} z-50 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-sm ${placement}`}>
      {[
        { label: canManage ? 'Questions' : 'View questions', icon: FileQuestion, on: () => setBankTestId(t.id) },
        canManage && { label: 'Edit test', icon: Pencil, on: () => setTestForm({ initial: t }) },
        { label: 'Results & attempts', icon: BarChart3, on: () => setBuilderTest(t) },
        canManage && { label: t.status === 'Active' ? 'Deactivate' : 'Activate', icon: Power, on: () => patchTest(t, { status: t.status === 'Active' ? 'Inactive' : 'Active' }, t.status === 'Active' ? 'Test deactivated — hidden from students' : '✓ Test active') },
        canManage && { label: t.publishResult ? 'Hide result' : 'Publish result', icon: t.publishResult ? EyeOff : Eye, on: () => patchTest(t, { publishResult: !t.publishResult }, t.publishResult ? 'Results hidden from students' : '✓ Results published to students') },
        canManage && { label: 'Delete', icon: Trash2, on: () => deleteTest(t), danger: true }
      ].filter(Boolean).map((m) => {
        const Icon = m.icon;
        return (
          <button key={m.label} type="button" onClick={() => { setMenuId(''); m.on(); }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 ${m.danger ? 'text-rose-600' : 'text-slate-700'}`}>
            <Icon className="w-4 h-4" />{m.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4 max-w-[1400px]">
      {toast && <div className="fixed bottom-5 right-5 z-50 p-3 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-lg">{toast}</div>}

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Test Series</h2>
          <p className="text-xs text-slate-500 mt-0.5">Mock tests, question bank and courses for the Student Portal</p>
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-xl">
          {[{ id: 'tests', label: 'Test List', icon: ListChecks }, { id: 'questions', label: 'Question Bank', icon: FileQuestion }, { id: 'courses', label: `Courses (${series.length})`, icon: BookOpen }].map((x) => {
            const Icon = x.icon;
            return (
              <button key={x.id} type="button" onClick={() => setTab(x.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${tab === x.id ? 'bg-[#0f212d] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                <Icon className="w-3.5 h-3.5" />{x.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}<button type="button" className="ml-auto" onClick={() => setError('')}><X className="w-3.5 h-3.5" /></button></div>}
      {!canManage && <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">View only — the Head of Trainer and Managers add and edit tests.</div>}

      {tab === 'tests' && (
        <div className="space-y-4">
          {/* stat tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Tests', value: allTests.length, sub: `${series.length} course${series.length === 1 ? '' : 's'}`, icon: ListChecks, tone: 'bg-[#0f212d] text-white', iconTone: 'bg-white/10 text-[#5eead4]' },
              { label: 'Active', value: allTests.filter((t) => t.status === 'Active').length, sub: 'visible to students', icon: Power, tone: 'bg-white', iconTone: 'bg-emerald-50 text-emerald-600' },
              { label: 'Questions', value: allTests.reduce((a, t) => a + (t.questionCount || 0), 0), sub: `${allTests.filter((t) => t.reportedCount).length} test(s) with reports`, icon: FileQuestion, tone: 'bg-white', iconTone: 'bg-teal-50 text-teal-600' },
              { label: 'Attempts', value: allTests.reduce((a, t) => a + (t.submitted || 0), 0), sub: 'submitted by students', icon: BarChart3, tone: 'bg-white', iconTone: 'bg-sky-50 text-sky-600' }
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className={`rounded-2xl border border-slate-200 p-4 flex items-center gap-3 ${s.tone}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.iconTone}`}><Icon className="w-5 h-5" /></div>
                  <div className="min-w-0">
                    <div className="text-2xl font-extrabold leading-none">{s.value.toLocaleString('en-IN')}</div>
                    <div className="text-[11px] font-bold uppercase tracking-wider mt-1 opacity-70">{s.label}</div>
                    <div className="text-[10px] opacity-60 truncate">{s.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col lg:flex-row lg:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by test name, ID or course…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-teal-500 focus:bg-white" />
            </div>
            <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm lg:w-60">
              <option value="">All Courses</option>
              {series.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm lg:w-32">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
            </select>
            <div className="flex bg-slate-100 rounded-xl p-1 flex-shrink-0">
              {[{ v: 'table', l: 'Table' }, { v: 'cards', l: 'Cards' }].map((x) => (
                <button key={x.v} type="button" onClick={() => switchView(x.v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${view === x.v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{x.l}</button>
              ))}
            </div>
            {canManage && (
              <button type="button" disabled={!series.length} onClick={() => setTestForm({ initial: null })}
                title={series.length ? '' : 'Create a course first (Courses tab)'}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-sm font-bold disabled:opacity-50">
                <Plus className="w-4 h-4" />Add Test
              </button>
            )}
          </div>

          {/* bulk bar */}
          {canManage && rows.length > 0 && (view === 'cards' || selected.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 px-1">
              {view === 'cards' && (
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                  <input type="checkbox" className="accent-teal-600" checked={allOnPage} onChange={(e) => toggleAll(e.target.checked)} />
                  Select page
                </label>
              )}
              {selected.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 ml-2 pl-3 border-l border-slate-200">
                  <span className="text-xs font-bold text-slate-700 mr-1">{selected.length} selected</span>
                  <button type="button" disabled={saving} onClick={() => bulk({ status: 'Active' }, 'Activated')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Activate</button>
                  <button type="button" disabled={saving} onClick={() => bulk({ status: 'Inactive' }, 'Deactivated')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">Deactivate</button>
                  <button type="button" disabled={saving} onClick={() => bulk({ publishResult: true }, 'Results published')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 hover:bg-sky-100">Publish result</button>
                  <button type="button" disabled={saving} onClick={() => bulk({ publishResult: false }, 'Results hidden')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100">Hide result</button>
                  <button type="button" disabled={saving} onClick={() => bulk('delete', 'Deleted')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100">Delete</button>
                  <button type="button" onClick={() => setSelected([])} className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800">Clear</button>
                </div>
              )}
            </div>
          )}

          {/* cards */}
          {rows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <ListChecks className="w-9 h-9 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-700">{allTests.length ? 'No test matches your search' : 'No tests yet'}</div>
              <p className="text-xs text-slate-500 mt-1">{allTests.length ? 'Try another name or course.' : series.length ? 'Click Add Test to create Mock Test 1.' : 'Create a course first in the Courses tab (e.g. "CPPM Vol 1"), then add tests to it.'}</p>
            </div>
          ) : view === 'table' ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    {canManage && <th className="pl-4 pr-2 py-3 w-8"><input type="checkbox" className="accent-teal-600" checked={allOnPage} onChange={(e) => toggleAll(e.target.checked)} /></th>}
                    <th className="px-3 py-3 w-10">#</th>
                    <th className="px-3 py-3">Test ID</th>
                    <th className="px-3 py-3">Test Name</th>
                    <th className="px-3 py-3">Course</th>
                    <th className="px-3 py-3">Open Date</th>
                    <th className="px-3 py-3">Close Date</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Publish Result</th>
                    <th className="px-3 py-3 text-right pr-4">More</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t, i) => {
                    const isSel = selected.includes(t.id);
                    return (
                      <tr key={t.id} className={`border-b border-slate-100 last:border-0 align-top transition-colors ${isSel ? 'bg-teal-50/60' : 'hover:bg-slate-50/70'}`}>
                        {canManage && <td className="pl-4 pr-2 py-3.5"><input type="checkbox" className="accent-teal-600" checked={isSel} onChange={(e) => setSelected(e.target.checked ? [...selected, t.id] : selected.filter((x) => x !== t.id))} /></td>}
                        <td className="px-3 py-3.5 font-bold text-slate-500">{(curPage - 1) * pageSize + i + 1}</td>
                        <td className="px-3 py-3.5"><span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md whitespace-nowrap">{t.testCode || '—'}</span></td>
                        <td className="px-3 py-3.5 min-w-[220px]">
                          <button type="button" onClick={() => setBankTestId(t.id)} className="text-left font-bold text-slate-900 hover:text-[#00796b]">{t.name}</button>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px]">
                            <span className={t.questionCount ? 'text-slate-600 font-semibold' : 'text-amber-600 font-bold'}>{t.questionCount} Questions</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500">{t.durationMin} min · {t.totalMarks || 0} marks</span>
                            {t.submitted > 0 && <><span className="text-slate-300">•</span><span className="text-slate-500">{t.submitted} attempt{t.submitted === 1 ? '' : 's'}</span></>}
                            {t.reportedCount > 0 && <span className="inline-flex items-center gap-0.5 text-rose-600 font-bold"><Flag className="w-3 h-3" />{t.reportedCount} reported</span>}
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="font-semibold text-slate-700">{t.seriesName}</div>
                          {t.seriesStatus !== 'Published' && <div className="text-[10px] font-bold text-amber-600">Draft course</div>}
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-slate-600">{fmtWindow(t.openDate)}</td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-slate-600">{fmtWindow(t.closeDate)}</td>
                        <td className="px-3 py-3.5"><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${t.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}><span className={`w-1.5 h-1.5 rounded-full ${t.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />{t.status}</span></td>
                        <td className="px-3 py-3.5"><span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${t.publishResult ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'}`}>{t.publishResult ? 'Yes' : 'No'}</span></td>
                        <td className="px-3 py-3.5 pr-4">
                          <div className="flex items-center justify-end gap-1.5 relative" ref={menuId === t.id ? menuRef : null}>
                            <button type="button" onClick={(e) => {
                              const r = e.currentTarget.getBoundingClientRect();
                              const up = window.innerHeight - r.bottom < 260;
                              setMenuPos(up ? { bottom: window.innerHeight - r.top + 4, right: window.innerWidth - r.right } : { top: r.bottom + 4, right: window.innerWidth - r.right });
                              setMenuId(menuId === t.id ? '' : t.id);
                            }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0f212d] hover:bg-[#172b38] text-white text-xs font-bold">
                              Action<ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            {canManage && (
                              <button type="button" disabled={saving} onClick={() => sendTest(t)} title="Notify students"
                                className="p-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100"><Send className="w-4 h-4" /></button>
                            )}
                            {menuId === t.id && actionMenu(t, '', menuPos)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {rows.map((t, i) => {
                const isSel = selected.includes(t.id);
                const ready = t.questionCount > 0;
                return (
                  <div key={t.id} className={`group bg-white rounded-2xl border transition-shadow hover:shadow-md flex flex-col ${isSel ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-200'}`}>
                    <div className={`h-1.5 rounded-t-2xl ${t.status !== 'Active' ? 'bg-slate-300' : ready ? 'bg-gradient-to-r from-[#009688] to-[#14b8a6]' : 'bg-amber-400'}`} />
                    <div className="p-4 flex-1 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer min-w-0">
                          {canManage && <input type="checkbox" className="accent-teal-600" checked={isSel} onChange={(e) => setSelected(e.target.checked ? [...selected, t.id] : selected.filter((x) => x !== t.id))} />}
                          <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate">{t.testCode || '—'}</span>
                        </label>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{t.status}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.publishResult ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'}`}>{t.publishResult ? 'Result on' : 'Result held'}</span>
                        </div>
                      </div>

                      <button type="button" onClick={() => setBankTestId(t.id)} className="text-left">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700">{t.seriesName}{t.seriesStatus !== 'Published' && <span className="ml-1.5 text-amber-600">· Draft course</span>}</div>
                        <div className="text-base font-extrabold text-slate-900 leading-snug group-hover:text-[#00796b] line-clamp-2">{t.name}</div>
                      </button>

                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { v: t.questionCount, l: 'Questions', warn: !ready },
                          { v: `${t.durationMin}m`, l: 'Duration' },
                          { v: t.totalMarks || 0, l: 'Marks' }
                        ].map((m) => (
                          <div key={m.l} className={`rounded-xl px-2 py-2 text-center ${m.warn ? 'bg-amber-50' : 'bg-slate-50'}`}>
                            <div className={`text-base font-extrabold ${m.warn ? 'text-amber-700' : 'text-slate-900'}`}>{m.v}</div>
                            <div className="text-[10px] text-slate-500 font-semibold">{m.l}</div>
                          </div>
                        ))}
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1">
                        <div className="flex justify-between"><span className="text-slate-400">Opens</span><span className="font-semibold">{fmtWindow(t.openDate) === 'NA' ? 'Anytime' : fmtWindow(t.openDate)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Closes</span><span className="font-semibold">{fmtWindow(t.closeDate) === 'NA' ? 'No end date' : fmtWindow(t.closeDate)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Attempts</span><span className="font-semibold">{t.submitted || 0}{t.avgScore != null ? ` · avg ${t.avgScore}/${t.totalMarks}` : ''}</span></div>
                      </div>

                      {!ready && <div className="text-[11px] font-semibold text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">No questions yet — students can't see this test.</div>}
                      {t.reportedCount > 0 && <div className="text-[11px] font-semibold text-rose-700 bg-rose-50 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1"><Flag className="w-3 h-3" />{t.reportedCount} question{t.reportedCount === 1 ? '' : 's'} reported by students</div>}
                    </div>

                    <div className="px-4 pb-4 flex items-center gap-2">
                      <button type="button" onClick={() => setBankTestId(t.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#0f212d] hover:bg-[#172b38] text-white text-xs font-bold">
                        <FileQuestion className="w-4 h-4" />{canManage ? 'Questions' : 'View questions'}
                      </button>
                      <div className="relative" ref={menuId === t.id ? menuRef : null}>
                        <button type="button" onClick={() => setMenuId(menuId === t.id ? '' : t.id)} title="More actions"
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">
                          Action<ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        {menuId === t.id && (
                          <div className="absolute right-0 bottom-11 z-30 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-sm">
                            {[
                              canManage && { label: 'Edit test', icon: Pencil, on: () => setTestForm({ initial: t }) },
                              { label: 'Results & attempts', icon: BarChart3, on: () => setBuilderTest(t) },
                              canManage && { label: t.status === 'Active' ? 'Deactivate' : 'Activate', icon: Power, on: () => patchTest(t, { status: t.status === 'Active' ? 'Inactive' : 'Active' }, t.status === 'Active' ? 'Test deactivated — hidden from students' : '✓ Test active') },
                              canManage && { label: t.publishResult ? 'Hide result' : 'Publish result', icon: t.publishResult ? EyeOff : Eye, on: () => patchTest(t, { publishResult: !t.publishResult }, t.publishResult ? 'Results hidden from students' : '✓ Results published to students') },
                              canManage && { label: 'Delete', icon: Trash2, on: () => deleteTest(t), danger: true }
                            ].filter(Boolean).map((m) => {
                              const Icon = m.icon;
                              return (
                                <button key={m.label} type="button" onClick={() => { setMenuId(''); m.on(); }}
                                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 ${m.danger ? 'text-rose-600' : 'text-slate-700'}`}>
                                  <Icon className="w-4 h-4" />{m.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {canManage && (
                        <button type="button" disabled={saving} onClick={() => sendTest(t)} title="Notify students"
                          className="p-2 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100"><Send className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filtered.length > 0 && (
            <div className="flex items-center justify-between px-1 text-xs text-slate-600">
              <span>Showing {(curPage - 1) * pageSize + 1}–{Math.min(curPage * pageSize, filtered.length)} of {filtered.length} tests</span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={curPage <= 1} onClick={() => setPage(curPage - 1)} className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                <span className="px-2 font-bold">{curPage} / {pages}</span>
                <button type="button" disabled={curPage >= pages} onClick={() => setPage(curPage + 1)} className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'questions' && <TestQuestionBank canManage={canManage} />}

      {tab === 'courses' && (
        <div className="space-y-3">
          <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500">A course groups tests (e.g. "CPPM Vol 1", "Certification Mastery"). Pick which student courses see it, then Publish. Students only see Published courses with Active tests.</p>
            {canManage && !creating && (
              <button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex-shrink-0">
                <Plus className="w-4 h-4" />New course
              </button>
            )}
          </div>
          {creating && <SeriesForm onCancel={() => setCreating(false)} onSave={handleCreate} saving={saving} />}
          {series.length === 0 && !creating && (
            <div className="bg-white rounded-lg border border-dashed border-slate-300 p-10 text-center">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-700">No courses yet</div>
            </div>
          )}
          {series.map((s) => (editingId === s.id
            ? <SeriesForm key={s.id} initial={s} onCancel={() => setEditingId('')} onSave={(b) => handleEdit(s.id, b)} saving={saving} />
            : (
              <div key={s.id} className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{s.name}</span>
                    <Pill tone={s.status === 'Published' ? 'green' : 'gray'}>{s.status}</Pill>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    For: {(s.courses || []).length ? s.courses.join(', ') : 'All admitted students'} · {s.tests.length} test{s.tests.length === 1 ? '' : 's'}
                  </div>
                  {s.description && <div className="text-xs text-slate-600 mt-1">{s.description}</div>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => { setCourseFilter(s.id); setTab('tests'); }} className="px-2.5 py-1.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">View tests</button>
                  {canManage && (
                    <>
                      <button type="button" disabled={saving} onClick={() => togglePublish(s)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold ${s.status === 'Published' ? 'bg-white border border-slate-200 text-slate-700' : 'bg-emerald-600 text-white'}`}>
                        {s.status === 'Published' ? <><EyeOff className="w-3.5 h-3.5" />Unpublish</> : <><Eye className="w-3.5 h-3.5" />Publish</>}
                      </button>
                      <button type="button" onClick={() => setEditingId(s.id)} title="Edit" className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"><Pencil className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => handleDeleteSeries(s)} title="Delete" className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              </div>
            )))}
        </div>
      )}

      {testForm && (
        <TestForm series={series} initial={testForm.initial} defaultSeriesId={courseFilter}
          onCancel={() => setTestForm(null)} onSave={saveTest} saving={saving} />
      )}

      {builderTest && (
        <OnlineTestBuilder
          test={builderTest}
          initialTab="attempts"
          onClose={() => { setBuilderTest(null); load(); }}
          onSaved={() => load()}
        />
      )}
    </div>
  );
}
