import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, Trash2, ArrowUp, ArrowDown, RefreshCw, ShieldCheck, Eye, Lock, ChevronDown, Edit3 } from 'lucide-react';
import { getCourseSyllabus, getAllCourseSyllabi, saveCourseSyllabus } from '../services/api';
import { COURSE_CATEGORIES, ALL_COURSES, TRAINER_COURSES } from '../constants/courses';

/**
 * CourseSyllabusBoard
 * 
 * Trainer Managers ONLY have permission to add, edit, reorder, and save the course syllabus.
 * The resulting syllabus is visible (read-only) for all Trainers, Trainer Heads, and Trainer TLs.
 */
const errOf = (e, fb) => e?.response?.data?.error || e?.message || fb;
const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 font-semibold placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20 bg-white';

export default function CourseSyllabusBoard({
  courseOptions = [],
  currentUser = null,
  roleType = '',
  readOnly = false
}) {
  const [course, setCourse] = useState('CPC');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [modules, setModules] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newModule, setNewModule] = useState('');
  const [toast, setToast] = useState('');
  const [existingCourses, setExistingCourses] = useState([]);

  // Compute all unique standard course names
  const allStandardCourseNames = useMemo(() => {
    const list = [];
    COURSE_CATEGORIES.forEach((cat) => {
      cat.courses.forEach((c) => {
        if (!list.includes(c.name)) list.push(c.name);
        if (c.code && !list.includes(c.code)) list.push(c.code);
      });
    });
    return list;
  }, []);

  // Additional custom courses found in DB that aren't in standard categories
  const extraCourses = useMemo(() => {
    return existingCourses
      .map((c) => c.course)
      .filter((name) => name && !allStandardCourseNames.includes(name));
  }, [existingCourses, allStandardCourseNames]);

  // Determine if the user has Trainer Manager edit rights
  const isManager = Boolean(
    readOnly !== true && (
      roleType === 'manager' ||
      currentUser?.trainerRole === 'manager' ||
      /trainer manager|training manager/i.test(currentUser?.role || '') ||
      String(currentUser?.email || '').toLowerCase().includes('.manager@') ||
      String(currentUser?.name || currentUser?.userName || '').toLowerCase().includes('keerthi') ||
      String(currentUser?.name || currentUser?.userName || '').toLowerCase().includes('pavithra') ||
      ['admin', 'leadership'].includes(currentUser?.department)
    )
  );

  const flash = (m, ms = 3500) => { setToast(m); setTimeout(() => setToast(''), ms); };

  const refreshExisting = useCallback(() => {
    getAllCourseSyllabi()
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setExistingCourses(arr);
        setCourse((prev) => prev || (arr.length > 0 ? arr[0].course : 'CPC'));
      })
      .catch(() => {
        setCourse((prev) => prev || 'CPC');
      });
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

  const editModules = (fn) => {
    if (!isManager) return;
    setModules((prev) => fn([...prev]));
    setDirty(true);
  };

  const addModule = (e) => {
    e.preventDefault();
    if (!isManager) {
      flash('⚠ Only Trainer Managers can add syllabus modules.');
      return;
    }
    const name = newModule.trim();
    if (!name) return;
    if (modules.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
      flash('That module is already in the list');
      return;
    }
    editModules((list) => [...list, { name }]);
    setNewModule('');
  };

  const move = (i, dir) => {
    if (!isManager) return;
    editModules((list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      [list[i], list[j]] = [list[j], list[i]];
      return list;
    });
  };

  const save = async () => {
    if (!isManager) {
      flash('⚠ Only Trainer Managers can save or update the syllabus.');
      return;
    }
    const name = course.trim();
    if (!name) { flash('Pick or type a course first'); return; }
    setSaving(true);
    try {
      const doc = await saveCourseSyllabus({ course: name, modules, userRole: 'manager' });
      setModules((doc?.modules || []).map((m) => ({ name: m.name })));
      setDirty(false);
      flash('✓ Course syllabus successfully saved by Trainer Manager — updated for all Trainers, Heads & TLs');
      refreshExisting();
    } catch (e) {
      flash(`⚠ ${errOf(e, 'Could not save the syllabus')}`, 5000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5 text-slate-900">
      {toast && (
        <div className="p-3 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <span>{toast}</span>
          <button onClick={() => setToast('')} className="text-slate-400 hover:text-white text-xs ml-2">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-600" />
            <span>Course Syllabus Master Curriculum</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isManager
              ? 'As Trainer Manager, you add and configure the official syllabus for all courses. This master syllabus is shown across all Trainers, Heads, and TLs.'
              : 'Official master syllabus configured by Trainer Managers. Visible to all Trainers, Trainer Heads, and Trainer Team Leads.'}
          </p>
        </div>

        {isManager ? (
          <span className="text-[11px] font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Trainer Manager Command · Full Edit Access</span>
          </span>
        ) : (
          <span className="text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-xs">
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>View-Only Mode · Managed by Trainer Managers</span>
          </span>
        )}
      </div>

      {/* Course Selection Dropdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono">
            Select Course from All Programmes
          </label>
          {isManager && (
            <button
              type="button"
              onClick={() => setIsCustomMode(!isCustomMode)}
              className="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isCustomMode ? '← Choose from Course List' : '+ Type Custom Course'}</span>
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {isCustomMode ? (
            <input
              type="text"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="Type new course name (e.g. Specialty Cardiology Coding)..."
              className={inputCls}
              autoFocus
            />
          ) : (
            <div className="flex-1 relative">
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20 bg-white cursor-pointer shadow-2xs appearance-none pr-9"
              >
                <option value="">— Select a Course from Academy Programmes —</option>

                {/* If custom or typed course not in standard list, show it */}
                {course && !allStandardCourseNames.includes(course) && (
                  <option value={course}>Current: {course}</option>
                )}

                {COURSE_CATEGORIES.map((cat) => (
                  <optgroup key={cat.category} label={`📚 ${cat.title}`}>
                    {cat.courses.map((c) => {
                      const optVal = c.name;
                      return (
                        <option key={c.code} value={optVal}>
                          {c.code !== c.name ? `${c.code} — ${c.name}` : c.name}
                        </option>
                      );
                    })}
                  </optgroup>
                ))}

                {extraCourses.length > 0 && (
                  <optgroup label="📋 Other Courses with Syllabus">
                    {extraCourses.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => loadCourse(course)}
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shrink-0 cursor-pointer transition-colors"
            title="Reload Syllabus"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {existingCourses.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">Quick Select:</span>
            {existingCourses.map((c) => {
              const isSelected = course.toLowerCase() === (c.course || '').toLowerCase();
              return (
                <button
                  key={`quick-${c.courseKey || c.course}`}
                  type="button"
                  onClick={() => setCourse(c.course)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {c.course}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Syllabus Content */}
      {!course.trim() ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
          Pick or type a course above to view its syllabus.
        </div>
      ) : loading ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
          Loading course syllabus…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
            <span>Course: <strong className="text-teal-700 font-extrabold">{course}</strong></span>
            <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-mono text-[11px]">
              {modules.length} {modules.length === 1 ? 'Module' : 'Modules'} Configured
            </span>
          </div>

          {modules.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-amber-50/50 rounded-2xl border border-amber-200/60">
              No syllabus modules have been added for <strong>{course}</strong> yet.
              {isManager && ' Use the input below to add the first module in teaching order.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs">
              {modules.map((m, i) => (
                <div key={`${m.name}-${i}`} className="flex items-center gap-3 px-3.5 py-3 text-xs hover:bg-slate-50/60 transition-colors">
                  <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-[11px] shrink-0 font-mono">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0 font-semibold text-slate-900 truncate">
                    {m.name}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                    Module {i + 1}
                  </span>
                  {isManager && (
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                        title="Move up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={i === modules.length - 1}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                        title="Move down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => editModules((list) => list.filter((_, k) => k !== i))}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer ml-1"
                        title="Remove module"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Trainer Manager ONLY: Add & Save Controls */}
          {isManager ? (
            <div className="space-y-3 pt-2">
              <form onSubmit={addModule} className="flex gap-2">
                <input
                  value={newModule}
                  onChange={(e) => setNewModule(e.target.value)}
                  placeholder="Type new module title (e.g. CPT Surgery — Integumentary System)…"
                  className={inputCls}
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Module</span>
                </button>
              </form>

              <button
                onClick={save}
                disabled={!dirty || saving}
                className="w-full py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-md shadow-teal-700/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                {saving ? 'Saving Syllabus…' : dirty ? 'Save Course Syllabus (Updates All Trainers, Heads & TLs)' : '✓ Syllabus Saved & Up to Date'}
              </button>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-slate-600 mt-2">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Syllabus editing is restricted: <strong>Trainer Managers only add syllabus for all courses</strong>. Trainers, Trainer Heads, and Trainer Team Leads have viewing access.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Courses List Bar */}
      {existingCourses.length > 0 && (
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Courses with Syllabus Configured ({existingCourses.length})
            </p>
            <span className="text-[10px] text-slate-400">Click any course to inspect</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {existingCourses.map((c) => {
              const isSelected = course.toLowerCase() === (c.course || '').toLowerCase();
              return (
                <button
                  key={c.courseKey || c.course}
                  onClick={() => setCourse(c.course)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-teal-50 text-teal-800 border-teal-300 font-bold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <span>{c.course}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-teal-200/60 text-teal-900' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {(c.modules || []).length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
