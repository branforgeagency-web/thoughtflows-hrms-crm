import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, Trash2, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { getCourseSyllabus, getAllCourseSyllabi, saveCourseSyllabus } from '../services/api';
import { TRAINER_COURSES } from '../constants/courses';

// Head-of-Trainer-only: define the master module list for a COURSE — this is the
// single source of truth every batch of that course ticks progress against.
// Ordinary trainers can only view this list (see TrainerBatchDesk's syllabus
// tracker) — they cannot add, rename, remove or reorder modules here.
const errOf = (e, fb) => e?.response?.data?.error || e?.message || fb;
const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 bg-white';

export default function CourseSyllabusBoard({ courseOptions = [] }) {
  const [course, setCourse] = useState('');
  const [modules, setModules] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newModule, setNewModule] = useState('');
  const [toast, setToast] = useState('');
  const [existingCourses, setExistingCourses] = useState([]);

  const flash = (m, ms = 3500) => { setToast(m); setTimeout(() => setToast(''), ms); };

  const datalistCourses = useMemo(() => {
    const names = new Set();
    (courseOptions || []).forEach((c) => c && names.add(c));
    TRAINER_COURSES.forEach((c) => c?.key && names.add(c.key));
    existingCourses.forEach((c) => c?.course && names.add(c.course));
    return Array.from(names).filter(Boolean).sort();
  }, [courseOptions, existingCourses]);

  const refreshExisting = useCallback(() => {
    getAllCourseSyllabi().then((list) => setExistingCourses(Array.isArray(list) ? list : [])).catch(() => {});
  }, []);

  useEffect(() => { refreshExisting(); }, [refreshExisting]);

  const loadCourse = useCallback(async (c) => {
    const name = String(c || '').trim();
    if (!name) { setModules([]); setDirty(false); return; }
    setLoading(true);
    try {
      const doc = await getCourseSyllabus(name);
      setModules((doc?.modules || []).map((m) => ({ name: m.name })));
      setDirty(false);
    } catch (e) {
      flash(`⚠ ${errOf(e, 'Could not load this course')}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCourse(course); }, [course, loadCourse]);

  const editModules = (fn) => { setModules((prev) => fn([...prev])); setDirty(true); };
  const addModule = (e) => {
    e.preventDefault();
    const name = newModule.trim();
    if (!name) return;
    if (modules.some((m) => m.name.toLowerCase() === name.toLowerCase())) { flash('That module is already in the list'); return; }
    editModules((list) => [...list, { name }]);
    setNewModule('');
  };
  const move = (i, dir) => editModules((list) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return list;
    [list[i], list[j]] = [list[j], list[i]];
    return list;
  });

  const save = async () => {
    const name = course.trim();
    if (!name) { flash('Pick or type a course first'); return; }
    setSaving(true);
    try {
      const doc = await saveCourseSyllabus({ course: name, modules });
      setModules((doc?.modules || []).map((m) => ({ name: m.name })));
      setDirty(false);
      flash('✓ Syllabus saved — trainers teaching this course will see it');
      refreshExisting();
    } catch (e) {
      flash(`⚠ ${errOf(e, 'Could not save the syllabus')}`, 5000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
      {toast && <div className="p-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold">{toast}</div>}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" /> Course Syllabus
        </h3>
        <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">
          Head of Trainer only — trainers view this read-only
        </span>
      </div>
      <p className="text-xs text-slate-400">
        Pick (or type) a course, then add its modules in teaching order. This is the one syllabus every trainer teaching that course ticks progress against — trainers cannot add or edit modules themselves.
      </p>

      <div className="flex gap-2">
        <input
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          list="course-syllabus-options"
          placeholder="Select or type a course…"
          className={inputCls}
        />
        <datalist id="course-syllabus-options">
          {datalistCourses.map((c) => <option key={c} value={c} />)}
        </datalist>
        <button onClick={() => loadCourse(course)} className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 shrink-0" title="Reload"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {!course.trim() ? (
        <p className="text-xs text-slate-400 py-4 text-center">Pick a course above to view or edit its syllabus.</p>
      ) : loading ? (
        <p className="text-xs text-slate-400 py-4 text-center">Loading…</p>
      ) : (
        <>
          {modules.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No modules yet for this course. Add them below, in teaching order.</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
              {modules.map((m, i) => (
                <div key={`${m.name}-${i}`} className="flex items-center gap-3 px-3 py-2.5 text-xs">
                  <div className="flex-1 min-w-0 font-semibold text-slate-800 truncate">{i + 1}. {m.name}</div>
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30" title="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === modules.length - 1} className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30" title="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                  <button onClick={() => editModules((list) => list.filter((_, k) => k !== i))} className="p-1 rounded text-slate-400 hover:text-rose-600" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={addModule} className="flex gap-2">
            <input value={newModule} onChange={(e) => setNewModule(e.target.value)} placeholder="Add a module…" className={inputCls} />
            <button type="submit" className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1 shrink-0"><Plus className="w-3.5 h-3.5" />Add</button>
          </form>
          <button onClick={save} disabled={!dirty || saving} className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-40">
            {saving ? 'Saving…' : dirty ? 'Save syllabus' : 'Saved'}
          </button>
        </>
      )}

      {existingCourses.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Courses with a syllabus already set</p>
          <div className="flex flex-wrap gap-1.5">
            {existingCourses.map((c) => (
              <button
                key={c.courseKey || c.course}
                onClick={() => setCourse(c.course)}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
              >
                {c.course} <span className="text-slate-400">· {(c.modules || []).length}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
