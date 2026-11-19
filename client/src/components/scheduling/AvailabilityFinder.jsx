import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, Repeat, X, Globe, Search, RefreshCw, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { getSchedulingTags, findAvailableTrainers } from '../../services/api';
import { WEEK_MON, DURATIONS, timeOptions, fmtSlot, todayKey, addDays, weekdayOf, prettyDate, errMsg } from './schedUtils';

// Head of Trainer → Availability: pick trainer tags, a duration and one or
// more sessions; every matching trainer is checked against their shift,
// week-offs, leave, batch timings, timetable, demos and 1:1 sessions.
const TIMES = timeOptions(15, 5 * 60, 23 * 60);

export default function AvailabilityFinder() {
  const [tagsData, setTagsData] = useState({ courses: [], languages: [], branches: [] });
  const [tags, setTags] = useState({ courses: [], languages: [], branches: [] });
  const [duration, setDuration] = useState(60);
  const [sessions, setSessions] = useState([]);
  const [adding, setAdding] = useState(null); // 'single' | 'recurring'
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [onlyFull, setOnlyFull] = useState(false);
  const [open, setOpen] = useState({});

  useEffect(() => { getSchedulingTags().then(setTagsData).catch(() => {}); }, []);

  useEffect(() => {
    if (!sessions.length) { setResult(null); return undefined; }
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const r = await findAvailableTrainers({ tags, durationMin: duration, sessions });
        if (alive) setResult(r);
      } catch (e) { if (alive) setError(errMsg(e)); }
      finally { if (alive) setLoading(false); }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [tags, duration, sessions]);

  const addSessions = (list) => {
    setSessions((prev) => {
      const key = (s) => `${s.date}|${s.startMin}`;
      const seen = new Set(prev.map(key));
      return [...prev, ...list.filter((s) => !seen.has(key(s)))].sort((a, b) => (a.date === b.date ? a.startMin - b.startMin : a.date < b.date ? -1 : 1)).slice(0, 60);
    });
    setAdding(null);
  };

  const trainers = (result?.trainers || []).filter((t) => !onlyFull || t.freeCount === t.total);
  const fullCount = (result?.trainers || []).filter((t) => t.freeCount === t.total).length;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5">
      {/* Left: criteria */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-5 h-fit">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Availability</h2>
          <p className="text-xs text-slate-500 mt-0.5">Find trainers who are free for a class, demo or 1:1.</p>
        </div>

        <Field label="Trainer Tags">
          <TagPicker data={tagsData} value={tags} onChange={setTags} />
        </Field>

        <Field label="Duration">
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white">
            {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </Field>

        <Field label="Timezone">
          <div className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 flex items-center gap-2 text-slate-700">
            <Globe className="w-4 h-4" />Asia/Kolkata (GMT +05:30)
          </div>
        </Field>

        <Field label="Sessions">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setAdding(adding === 'single' ? null : 'single')} className={`py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${adding === 'single' ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
              <Plus className="w-4 h-4" />Add Sessions
            </button>
            <button onClick={() => setAdding(adding === 'recurring' ? null : 'recurring')} className={`py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${adding === 'recurring' ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
              <Repeat className="w-4 h-4" />Add Recurring
            </button>
          </div>
          {adding === 'single' && <SingleAdder onAdd={(s) => addSessions([s])} />}
          {adding === 'recurring' && <RecurringAdder onAdd={addSessions} />}
          {sessions.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>{sessions.length} session(s)</span>
                <button onClick={() => setSessions([])} className="font-semibold text-rose-600 hover:underline cursor-pointer">Clear all</button>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                {sessions.map((s, i) => (
                  <div key={`${s.date}-${s.startMin}`} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <span><b>{prettyDate(s.date)}</b> · {fmtSlot(s.startMin, s.startMin + duration)}</span>
                    <button onClick={() => setSessions((p) => p.filter((_, k) => k !== i))} className="p-0.5 rounded hover:bg-slate-200 cursor-pointer" aria-label="Remove"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Field>
      </div>

      {/* Right: results */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 min-h-[420px]">
        {!sessions.length ? (
          <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center gap-2">
            <Search className="w-14 h-14 text-slate-300" />
            <div className="text-lg font-bold text-slate-900">Find Available Trainers</div>
            <div className="text-sm text-slate-500">Add Sessions and all available trainers will be displayed here.</div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-slate-700">
                {loading ? <span className="inline-flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin text-teal-600" />Checking trainers…</span>
                  : result ? <><b className="text-emerald-700">{fullCount}</b> trainer(s) free for all {sessions.length} session(s) · {result.trainers.length} match the tags</> : null}
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                <input type="checkbox" checked={onlyFull} onChange={(e) => setOnlyFull(e.target.checked)} />Only fully available
              </label>
            </div>
            {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
            {result && trainers.length === 0 && !loading && (
              <div className="py-10 text-center text-sm text-slate-500">No trainer matches. Try fewer tags or a different time.</div>
            )}
            <div className="space-y-2">
              {trainers.map((t) => {
                const full = t.freeCount === t.total;
                const none = t.freeCount === 0;
                const isOpen = open[t.trainerId];
                return (
                  <div key={t.trainerId} className={`rounded-xl border ${full ? 'border-emerald-200 bg-emerald-50/40' : none ? 'border-slate-200 bg-slate-50/60' : 'border-amber-200 bg-amber-50/40'}`}>
                    <button onClick={() => setOpen((o) => ({ ...o, [t.trainerId]: !o[t.trainerId] }))} className="w-full flex items-center justify-between gap-3 p-3 text-left cursor-pointer">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">{String(t.trainerName || '?')[0]}</div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{t.trainerName}</div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {[t.branchName, (t.courses || []).slice(0, 3).join(', '), (t.languages || []).join('/'), `Shift ${t.shift}`].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${full ? 'bg-emerald-600 text-white' : none ? 'bg-slate-200 text-slate-600' : 'bg-amber-400 text-slate-900'}`}>
                          {full ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          Free {t.freeCount}/{t.total}
                        </span>
                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {t.results.map((r) => (
                          <div key={`${r.date}-${r.startMin}`} className={`px-2.5 py-1.5 rounded-lg text-xs border ${r.free ? 'bg-white border-emerald-200 text-emerald-800' : 'bg-white border-rose-200 text-rose-700'}`}>
                            <b>{prettyDate(r.date)}</b> {fmtSlot(r.startMin, r.endMin)} — {r.free ? 'Free' : r.reason}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1.5"><div className="text-xs font-semibold text-slate-600">{label}</div>{children}</div>;
}

function SingleAdder({ onAdd }) {
  const [date, setDate] = useState(todayKey());
  const [time, setTime] = useState(10 * 60);
  return (
    <div className="mt-2 p-3 rounded-xl border border-teal-200 bg-teal-50/40 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={date} min={todayKey()} onChange={(e) => setDate(e.target.value)} className="px-2 py-2 rounded-lg border border-slate-200 text-sm" />
        <select value={time} onChange={(e) => setTime(Number(e.target.value))} className="px-2 py-2 rounded-lg border border-slate-200 text-sm">
          {TIMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <button onClick={() => date && onAdd({ date, startMin: time })} className="w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold cursor-pointer">Add</button>
    </div>
  );
}

export function RecurringAdder({ onAdd, maxCount = 60, buttonLabel = 'Add sessions' }) {
  const [start, setStart] = useState(todayKey());
  const [weeks, setWeeks] = useState(4);
  const [days, setDays] = useState(['Mon', 'Wed', 'Fri']);
  const [time, setTime] = useState(10 * 60);
  const list = useMemo(() => {
    const out = [];
    for (let i = 0; i < weeks * 7 && out.length < maxCount; i++) {
      const d = addDays(start, i);
      if (days.includes(weekdayOf(d))) out.push({ date: d, startMin: time });
    }
    return out;
  }, [start, weeks, days, time, maxCount]);
  return (
    <div className="mt-2 p-3 rounded-xl border border-teal-200 bg-teal-50/40 space-y-2 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1"><span className="text-[11px] text-slate-500">Starting</span>
          <input type="date" value={start} min={todayKey()} onChange={(e) => setStart(e.target.value)} className="w-full px-2 py-2 rounded-lg border border-slate-200" /></label>
        <label className="space-y-1"><span className="text-[11px] text-slate-500">For</span>
          <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="w-full px-2 py-2 rounded-lg border border-slate-200">
            {[1, 2, 3, 4, 6, 8, 12].map((w) => <option key={w} value={w}>{w} week{w > 1 ? 's' : ''}</option>)}
          </select></label>
      </div>
      <div className="flex flex-wrap gap-1">
        {WEEK_MON.map((d) => {
          const on = days.includes(d);
          return <button key={d} onClick={() => setDays((p) => (on ? p.filter((x) => x !== d) : [...p, d]))} className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer ${on ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>{d}</button>;
        })}
      </div>
      <select value={time} onChange={(e) => setTime(Number(e.target.value))} className="w-full px-2 py-2 rounded-lg border border-slate-200">
        {TIMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <button disabled={!list.length} onClick={() => onAdd(list)} className="w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold cursor-pointer">
        {buttonLabel} ({list.length})
      </button>
    </div>
  );
}

// Grouped multi-select: Courses / Languages / Branches
export function TagPicker({ data, value, onChange, groups = ['courses', 'languages', 'branches'], placeholder = 'Choose Tags' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const LABEL = { courses: 'Courses', languages: 'Languages', branches: 'Branches' };
  const selected = groups.flatMap((g) => (value[g] || []).map((v) => ({ g, v })));
  const toggle = (g, v) => {
    const cur = value[g] || [];
    onChange({ ...value, [g]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm flex items-center justify-between gap-2 cursor-pointer">
        <div className="flex flex-wrap gap-1 text-left">
          {selected.length === 0 ? <span className="text-slate-400">{placeholder}</span> : selected.map(({ g, v }) => (
            <span key={`${g}-${v}`} className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center gap-1">
              {v}<X className="w-3 h-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggle(g, v); }} />
            </span>
          ))}
        </div>
        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl p-2 max-h-72 overflow-y-auto">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tags" className="w-full px-2.5 py-1.5 mb-2 rounded-lg border border-slate-200 text-sm" />
          {groups.map((g) => {
            const opts = (data[g] || []).filter((o) => o.toLowerCase().includes(q.toLowerCase()));
            if (!opts.length) return null;
            return (
              <div key={g} className="mb-2">
                <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{LABEL[g]}</div>
                {opts.map((o) => (
                  <label key={o} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-50 text-sm cursor-pointer">
                    <input type="checkbox" checked={(value[g] || []).includes(o)} onChange={() => toggle(g, o)} />{o}
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
