import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, X, Filter, Video, Users, User, Clock, CheckCircle2, XCircle, CalendarOff, Ban } from 'lucide-react';
import { getSchedulingCalendar, getSchedulingTags } from '../../services/api';
import { WEEK_MON, fmtMin, fmtSlot, addDays, startOfWeek, todayKey, parseDateKey, prettyDate, errMsg, STATUS_LABEL } from './schedUtils';

// Head of Trainer → Calendar: every trainer's classes (held / not held /
// upcoming), demos and 1:1 sessions in a compact month view (Wise-style).
const MAX_IN_CELL = 6;
const TYPE_OPTIONS = [
  { key: 'class', label: 'Classes' },
  { key: 'demo', label: 'Demos' },
  { key: 'one_on_one', label: '1:1 Sessions' }
];

// fixedTrainerId → a trainer's own calendar (trainer filter locked).
// onEventAction(event) → shows a "Go to …" button in the event details.
export default function SchedulingCalendar({ fixedTrainerId = '', heading = '', onEventAction } = {}) {
  const [anchor, setAnchor] = useState(() => todayKey().slice(0, 8) + '01'); // first of month
  const [view, setView] = useState('month'); // month | week
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayKey()));
  const [filters, setFilters] = useState({ trainerId: fixedTrainerId || '', branch: '', course: '', types: ['class', 'demo', 'one_on_one'] });
  useEffect(() => { if (fixedTrainerId) setFilters((f) => ({ ...f, trainerId: fixedTrainerId })); }, [fixedTrainerId]);
  const [showFilters, setShowFilters] = useState(false);
  const [tags, setTags] = useState({ trainers: [], branches: [], courses: [] });
  const [data, setData] = useState({ events: [], today: todayKey() });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dayOpen, setDayOpen] = useState(null); // date key for "See More"
  const [eventOpen, setEventOpen] = useState(null);

  // Grid: Monday on/before the 1st → 6 weeks (month) or 7 days (week)
  const range = useMemo(() => {
    if (view === 'week') return { from: weekStart, to: addDays(weekStart, 6) };
    const first = anchor;
    const from = startOfWeek(first);
    const d = parseDateKey(first);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const lastKey = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
    let to = addDays(startOfWeek(lastKey), 6);
    return { from, to };
  }, [anchor, view, weekStart]);

  const days = useMemo(() => {
    const out = [];
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) out.push(d);
    return out;
  }, [range]);

  useEffect(() => { if (!fixedTrainerId) getSchedulingTags().then(setTags).catch(() => {}); }, [fixedTrainerId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getSchedulingCalendar({
        from: range.from, to: range.to, trainerId: filters.trainerId || undefined,
        branch: filters.branch || undefined, course: filters.course || undefined, types: filters.types.join(',')
      });
      setData(res);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const byDay = useMemo(() => {
    const m = {};
    (data.events || []).forEach((e) => { (m[e.date] ||= []).push(e); });
    return m;
  }, [data.events]);

  const monthDate = parseDateKey(anchor);
  const title = view === 'week'
    ? `${prettyDate(range.from, { day: 'numeric', month: 'short' })} – ${prettyDate(range.to, { day: 'numeric', month: 'short', year: 'numeric' })}`
    : monthDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

  const shift = (dir) => {
    if (view === 'week') { setWeekStart((w) => addDays(w, 7 * dir)); return; }
    const d = new Date(monthDate.getFullYear(), monthDate.getMonth() + dir, 1);
    setAnchor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
  };
  const goToday = () => { setAnchor(todayKey().slice(0, 8) + '01'); setWeekStart(startOfWeek(todayKey())); };

  const counts = useMemo(() => {
    const c = { class: 0, demo: 0, one_on_one: 0, missed: 0 };
    (data.events || []).forEach((e) => { c[e.type] = (c[e.type] || 0) + 1; if (e.status === 'missed') c.missed += 1; });
    return c;
  }, [data.events]);

  const activeFilterCount = (filters.trainerId && !fixedTrainerId ? 1 : 0) + (filters.branch ? 1 : 0) + (filters.course ? 1 : 0) + (filters.types.length < 3 ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-2xl font-extrabold text-slate-900 min-w-[150px]">{heading ? <span className="block text-xs font-bold text-teal-700 uppercase tracking-wider">{heading}</span> : null}{title}</h2>
          <button onClick={goToday} className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm font-semibold text-slate-700 cursor-pointer">Today</button>
          <button onClick={() => shift(-1)} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Previous"><ChevronLeft className="w-5 h-5 text-slate-700" /></button>
          <button onClick={() => shift(1)} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Next"><ChevronRight className="w-5 h-5 text-slate-700" /></button>
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-500 hidden xl:inline">
            {counts.class} classes · {counts.demo} demos · {counts.one_on_one} 1:1 · <span className="text-rose-600 font-semibold">{counts.missed} not held</span>
          </span>
          <select value={view} onChange={(e) => setView(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 cursor-pointer">
            <option value="month">Month (Compact)</option>
            <option value="week">Week</option>
          </select>
          <button onClick={() => setShowFilters((v) => !v)} className={`px-3.5 py-2 rounded-xl border text-sm font-semibold flex items-center gap-1.5 cursor-pointer ${activeFilterCount ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>
            <Filter className="w-4 h-4" />Filter{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {!fixedTrainerId && <label className="space-y-1">
            <span className="font-bold text-slate-500">Trainer</span>
            <select value={filters.trainerId} onChange={(e) => setFilters((f) => ({ ...f, trainerId: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm">
              <option value="">All trainers</option>
              {tags.trainers.map((t) => <option key={t.trainerId} value={t.trainerId}>{t.trainerName}{t.branchName ? ` · ${t.branchName}` : ''}</option>)}
            </select>
          </label>}
          {!fixedTrainerId && <label className="space-y-1">
            <span className="font-bold text-slate-500">Branch</span>
            <select value={filters.branch} onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm">
              <option value="">All branches</option>
              {tags.branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>}
          <label className="space-y-1">
            <span className="font-bold text-slate-500">Course / batch</span>
            <input value={filters.course} onChange={(e) => setFilters((f) => ({ ...f, course: e.target.value }))} placeholder="e.g. CPC, AMCT" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
          </label>
          <div className="space-y-1">
            <span className="font-bold text-slate-500">Show</span>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_OPTIONS.map((o) => {
                const on = filters.types.includes(o.key);
                return (
                  <button key={o.key} onClick={() => setFilters((f) => ({ ...f, types: on ? (f.types.length > 1 ? f.types.filter((x) => x !== o.key) : f.types) : [...f.types, o.key] }))}
                    className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer ${on ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={() => setFilters({ trainerId: fixedTrainerId || '', branch: '', course: '', types: ['class', 'demo', 'one_on_one'] })} className="text-left text-teal-700 font-bold hover:underline cursor-pointer">Clear filters</button>
          )}
        </div>
      )}

      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}

      {/* Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-7 border-b border-slate-200">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
              <div key={d} className="py-3 text-center text-sm font-semibold text-slate-700 border-r last:border-r-0 border-slate-100">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const list = byDay[d] || [];
              const inMonth = view === 'week' || d.slice(0, 7) === anchor.slice(0, 7);
              const isToday = d === (data.today || todayKey());
              const shown = view === 'week' ? list : list.slice(0, MAX_IN_CELL);
              return (
                <div key={d} className={`group border-r border-b border-slate-100 p-1.5 transition-colors ${view === 'week' ? 'min-h-[420px]' : 'min-h-[150px]'} ${isToday ? 'bg-teal-50/40' : inMonth ? 'bg-white hover:bg-slate-50/70' : 'bg-slate-50/60'}`}>
                  <div className="flex items-center justify-between mb-1.5 px-0.5">
                    <span className={`text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-slate-900 text-white shadow-sm' : inMonth ? 'text-slate-800' : 'text-slate-400'}`}>
                      {parseDateKey(d).getDate()}
                    </span>
                    {list.length > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${inMonth ? 'bg-slate-100 text-slate-500' : 'bg-slate-100/70 text-slate-400'}`}>{list.length}</span>
                    )}
                  </div>
                  <div className={`space-y-1 ${inMonth ? '' : 'opacity-70'}`}>
                    {shown.map((e) => <EventChip key={e.id} e={e} today={data.today || todayKey()} showTrainer={!fixedTrainerId} rich={view === 'week'} onClick={() => setEventOpen(e)} />)}
                  </div>
                  {list.length > shown.length && (
                    <button onClick={() => setDayOpen(d)} className="mt-1.5 w-full py-1 rounded-md text-[11px] font-bold text-slate-500 bg-slate-100/80 hover:bg-teal-50 hover:text-teal-700 cursor-pointer">+{list.length - shown.length} more</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500 px-1">
        <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />Held</span>
        <span className="inline-flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-rose-600" />Not held / demo missed</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />Live now</span>
        <span className="inline-flex items-center gap-1.5"><Ban className="w-3.5 h-3.5 text-slate-400" /><s>Cancelled</s></span>
        <span className="inline-flex items-center gap-1.5"><CalendarOff className="w-3.5 h-3.5 text-amber-600" />Trainer on leave</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-100 border-l-[3px] border-rose-500" />Demo</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-teal-100 border-l-[3px] border-teal-600" />1:1 session</span>
        <span className="text-slate-400">Each course keeps its own colour. Classes come from active batches; held times from the Class Session Room.</span>
      </div>

      {dayOpen && (
        <Overlay onClose={() => setDayOpen(null)} title={prettyDate(dayOpen, { day: 'numeric', month: 'long', year: 'numeric' })}>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
            {(byDay[dayOpen] || []).map((e) => <EventChip key={e.id} e={e} rich showTrainer today={data.today || todayKey()} onClick={() => setEventOpen(e)} />)}
          </div>
        </Overlay>
      )}

      {eventOpen && (
        <Overlay onClose={() => setEventOpen(null)} title={eventOpen.title} small>
          <div className="space-y-2 text-sm text-slate-700">
            <Row icon={Clock}>{prettyDate(eventOpen.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {fmtSlot(eventOpen.startMin, eventOpen.endMin)}</Row>
            <Row icon={User}>{eventOpen.trainerName || 'Unassigned'}</Row>
            {eventOpen.course && <Row icon={Video}>{eventOpen.course}</Row>}
            {eventOpen.candidates?.length > 0 && <Row icon={Users}>{eventOpen.candidates.join(', ')}</Row>}
            <div className="pt-1">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusTone(eventOpen.status)}`}>{STATUS_LABEL[eventOpen.status] || eventOpen.status}</span>
              <span className="ml-2 text-xs text-slate-400">{{ class: 'Batch class', demo: 'Demo', one_on_one: '1:1 session' }[eventOpen.type]}</span>
            </div>
            {onEventAction && ['scheduled', 'live', 'booked', 'confirmed'].includes(eventOpen.status) && eventOpen.date === (data.today || todayKey()) && (
              <button onClick={() => { const ev = eventOpen; setEventOpen(null); setDayOpen(null); onEventAction(ev); }}
                className="w-full mt-2 py-2.5 rounded-xl bg-[#009688] hover:bg-[#00897b] text-white text-sm font-bold cursor-pointer">
                {eventOpen.type === 'demo' ? 'Go to Demos' : eventOpen.status === 'live' ? 'Go to the live class' : 'Go to Class Session Room to start'}
              </button>
            )}
          </div>
        </Overlay>
      )}
    </div>
  );
}

// Course colour: soft fill + strong left accent (same course → same colour)
const TONES = [
  { soft: 'bg-violet-50 hover:bg-violet-100', bar: 'border-l-violet-500', text: 'text-violet-900', sub: 'text-violet-600' },
  { soft: 'bg-sky-50 hover:bg-sky-100', bar: 'border-l-sky-500', text: 'text-sky-900', sub: 'text-sky-600' },
  { soft: 'bg-indigo-50 hover:bg-indigo-100', bar: 'border-l-indigo-500', text: 'text-indigo-900', sub: 'text-indigo-600' },
  { soft: 'bg-amber-50 hover:bg-amber-100', bar: 'border-l-amber-500', text: 'text-amber-900', sub: 'text-amber-700' },
  { soft: 'bg-emerald-50 hover:bg-emerald-100', bar: 'border-l-emerald-500', text: 'text-emerald-900', sub: 'text-emerald-700' },
  { soft: 'bg-fuchsia-50 hover:bg-fuchsia-100', bar: 'border-l-fuchsia-500', text: 'text-fuchsia-900', sub: 'text-fuchsia-600' },
  { soft: 'bg-cyan-50 hover:bg-cyan-100', bar: 'border-l-cyan-500', text: 'text-cyan-900', sub: 'text-cyan-700' },
  { soft: 'bg-lime-50 hover:bg-lime-100', bar: 'border-l-lime-600', text: 'text-lime-900', sub: 'text-lime-700' }
];
function toneFor(e) {
  if (e.type === 'demo') return { soft: 'bg-rose-50 hover:bg-rose-100', bar: 'border-l-rose-500', text: 'text-rose-900', sub: 'text-rose-600' };
  if (e.type === 'one_on_one') return { soft: 'bg-teal-50 hover:bg-teal-100', bar: 'border-l-teal-600', text: 'text-teal-900', sub: 'text-teal-700' };
  const key = String(e.course || e.title || '').toLowerCase().replace(/\(.*?\)/g, '').trim();
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}
// Batch names often repeat the class time ("CPC · 11:00 AM - 1:00 PM") — the chip already shows it
const TIME_RX = /\d{1,2}([:.]\d{2})?\s*(am|pm)\b/i;
function cleanTitle(t = '') {
  const parts = String(t).split(/\s*[·|]\s*/).filter((p) => p && !TIME_RX.test(p));
  return (parts.join(' · ') || String(t)).trim();
}
const shortTime = (m) => {
  const [hm, ap] = fmtMin(m).split(' ');
  return { hm: hm.replace(/^0/, ''), ap: (ap || '').toLowerCase() };
};
const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

function EventChip({ e, onClick, rich, showTrainer, today }) {
  const tone = toneFor(e);
  const live = e.status === 'live';
  const missed = e.status === 'missed';
  const cancelled = e.status === 'cancelled';
  const leave = e.status === 'leave';
  const held = e.status === 'done' || e.status === 'completed';
  const past = today && e.date < today;
  const t = shortTime(e.startMin);
  const title = cleanTitle(e.title);

  const base = live
    ? 'bg-emerald-600 hover:bg-emerald-700 border-l-emerald-800 text-white shadow-sm shadow-emerald-600/30'
    : missed
      ? 'bg-rose-50 hover:bg-rose-100 border-l-rose-500 text-rose-800'
      : cancelled
        ? 'bg-slate-50 hover:bg-slate-100 border-l-slate-300 text-slate-400'
        : leave
          ? 'bg-amber-50/60 hover:bg-amber-50 border-l-amber-400 text-amber-800 border-dashed'
          : `${tone.soft} ${tone.bar} ${tone.text}`;
  const subCls = live ? 'text-emerald-50/90' : missed ? 'text-rose-600' : cancelled ? 'text-slate-400' : leave ? 'text-amber-700' : tone.sub;

  const Icon = live ? null : missed ? XCircle : cancelled ? Ban : leave ? CalendarOff : held ? CheckCircle2 : null;
  const iconCls = missed ? 'text-rose-600' : cancelled ? 'text-slate-400' : leave ? 'text-amber-600' : 'text-emerald-600';
  const statusText = STATUS_LABEL[e.status] || '';
  const tip = `${fmtSlot(e.startMin, e.endMin)} · ${title}${e.trainerName ? ` · ${e.trainerName}` : ''}${statusText ? ` · ${statusText}` : ''}`;

  if (rich) {
    return (
      <button onClick={onClick} title={tip}
        className={`w-full text-left pl-2.5 pr-2 py-1.5 rounded-lg border-l-[3px] cursor-pointer transition-colors ${base} ${past && held ? 'opacity-90' : ''}`}>
        <div className="flex items-center gap-1.5 text-[11px] font-bold">
          {live && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
          {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${iconCls}`} />}
          <span className={cancelled ? 'line-through' : ''}>{fmtSlot(e.startMin, e.endMin)}</span>
          {statusText && !['scheduled', 'booked', 'confirmed'].includes(e.status) && (
            <span className={`ml-auto px-1.5 py-px rounded-full text-[9.5px] uppercase tracking-wide ${live ? 'bg-white/20' : 'bg-white/70'}`}>{statusText}</span>
          )}
        </div>
        <div className={`text-[13px] font-semibold truncate ${cancelled ? 'line-through' : ''}`}>{title}</div>
        {(showTrainer && e.trainerName) || e.course ? (
          <div className={`text-[11px] truncate ${subCls}`}>{[showTrainer ? e.trainerName : '', e.course && e.course !== title ? e.course : ''].filter(Boolean).join(' · ')}</div>
        ) : null}
      </button>
    );
  }

  return (
    <button onClick={onClick} title={tip}
      className={`w-full flex items-center gap-1 pl-1.5 pr-1 h-[26px] rounded-md border-l-[3px] text-[12px] leading-none cursor-pointer transition-colors ${base}`}>
      {live && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />}
      {Icon && <Icon className={`w-3 h-3 shrink-0 ${iconCls}`} />}
      <span className={`shrink-0 font-bold tabular-nums ${cancelled ? 'line-through' : ''}`}>
        {t.hm}<span className="text-[9.5px] font-semibold ml-px opacity-75">{t.ap}</span>
      </span>
      <span className={`truncate font-medium ${cancelled ? 'line-through' : ''} ${live ? '' : 'opacity-90'}`}>{title}</span>
      {showTrainer && e.trainerName && (
        <span title={e.trainerName} className={`ml-auto shrink-0 w-[18px] h-[18px] rounded-full text-[8.5px] font-black flex items-center justify-center ${live ? 'bg-white/25 text-white' : 'bg-white/80 text-slate-600 ring-1 ring-black/5'}`}>{initials(e.trainerName)}</span>
      )}
    </button>
  );
}

function statusTone(s) {
  if (s === 'done' || s === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'missed' || s === 'cancelled') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (s === 'live') return 'bg-emerald-600 text-white border-emerald-600';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

function Row({ icon: Icon, children }) {
  return <div className="flex items-start gap-2"><Icon className="w-4 h-4 mt-0.5 text-teal-600 shrink-0" /><span>{children}</span></div>;
}

export function Overlay({ title, onClose, children, small, wide }) {
  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full ${wide ? 'max-w-3xl' : small ? 'max-w-sm' : 'max-w-md'} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 rounded-t-2xl sticky top-0 z-10">
          <div className="font-bold text-slate-900 truncate pr-2">{title}</div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 cursor-pointer" aria-label="Close"><X className="w-4 h-4 text-slate-600" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
