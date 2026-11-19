import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Video, Clock, CheckCircle2, XCircle, User, CreditCard, CalendarDays } from 'lucide-react';
import { getMySchedule } from '../../services/api';
import { fmtMin, fmtSlot, addDays, startOfWeek, todayKey, parseDateKey, prettyDate, colorFor, errMsg } from './schedUtils';

// Student Portal → My Schedule (Wise-style): batch classes, 1:1 sessions and
// demos in one calendar, a "next class" countdown and one-click Join.
const STATUS = {
  live: { label: 'Live now', cls: 'bg-emerald-600 text-white' },
  scheduled: { label: 'Upcoming', cls: 'bg-sky-100 text-sky-800' },
  done: { label: 'Held', cls: 'bg-slate-100 text-slate-700' },
  missed: { label: 'Not held', cls: 'bg-rose-100 text-rose-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500 line-through' },
  leave: { label: 'Trainer on leave', cls: 'bg-amber-100 text-amber-800' }
};
const TYPE = { class: 'Class', one_on_one: '1:1', demo: 'Demo' };

export default function StudentSchedule({ onJoinBatchClass }) {
  const [view, setView] = useState('week');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayKey()));
  const [month, setMonth] = useState(() => todayKey().slice(0, 8) + '01');
  const [picked, setPicked] = useState(todayKey());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const range = useMemo(() => {
    if (view === 'week') return { from: weekStart, to: addDays(weekStart, 6) };
    const d = parseDateKey(month);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const lastKey = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
    return { from: startOfWeek(month), to: addDays(startOfWeek(lastKey), 6) };
  }, [view, weekStart, month]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getMySchedule({ from: range.from, to: range.to })); setError(''); }
    catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  }, [range.from, range.to]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(() => { load(); setTick((x) => x + 1); }, 60000); return () => clearInterval(t); }, [load]);

  const events = data?.events || [];
  const today = data?.today || todayKey();
  const nowMin = useMemo(() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }, [tick, data]);
  const byDay = useMemo(() => { const m = {}; events.forEach((e) => { (m[e.date] ||= []).push(e); }); return m; }, [events]);

  const next = useMemo(() => {
    const live = events.find((e) => e.status === 'live');
    if (live) return live;
    return events.find((e) => e.status === 'scheduled' && (e.date > today || (e.date === today && e.endMin > nowMin)));
  }, [events, today, nowMin]);

  const join = (e) => {
    if (e.type === 'class') onJoinBatchClass?.();
    else if (e.joinLink) window.open(e.joinLink, '_blank', 'noopener');
  };

  const shift = (dir) => {
    if (view === 'week') setWeekStart((w) => addDays(w, 7 * dir));
    else { const d = parseDateKey(month); const n = new Date(d.getFullYear(), d.getMonth() + dir, 1); setMonth(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`); }
  };
  const goToday = () => { setWeekStart(startOfWeek(todayKey())); setMonth(todayKey().slice(0, 8) + '01'); setPicked(todayKey()); };
  const title = view === 'week'
    ? `${prettyDate(range.from, { day: 'numeric', month: 'short' })} – ${prettyDate(range.to, { day: 'numeric', month: 'short' })}`
    : parseDateKey(month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      {/* Next class */}
      {next ? <NextCard e={next} today={today} nowMin={nowMin} onJoin={() => join(next)} />
        : !loading && <div className="bg-white rounded-2xl border border-slate-200 p-4 text-sm text-slate-500 flex items-center gap-2"><CalendarDays className="w-4 h-4" />No upcoming class in this period.</div>}

      {(data?.oneOnOne || []).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.oneOnOne.map((o, i) => (
            <div key={i} className="px-3 py-2 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /><b>1:1 {o.course}</b> with {o.trainerName} · <b>{o.remainingCredits}</b> of {o.totalCredits} sessions left
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button onClick={goToday} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer">Today</button>
          <button onClick={() => shift(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Previous"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => shift(1)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Next"><ChevronRight className="w-4 h-4" /></button>
          <span className="text-sm font-extrabold text-slate-900 ml-1">{title}</span>
          {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600 ml-1" />}
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-bold">
          {[['week', 'Week'], ['month', 'Month']].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} className={`px-3 py-1.5 cursor-pointer ${view === k ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>{l}</button>
          ))}
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}

      {view === 'week' ? (
        <div className="space-y-2">
          {Array.from({ length: 7 }, (_, i) => addDays(range.from, i)).map((d) => (
            <DayBlock key={d} date={d} list={byDay[d] || []} isToday={d === today} onJoin={join} />
          ))}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-7 text-[11px] font-bold text-slate-500 border-b border-slate-100">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-2 text-center">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {(() => { const out = []; for (let d = range.from; d <= range.to; d = addDays(d, 1)) out.push(d); return out; })().map((d) => {
                const list = byDay[d] || [];
                const inMonth = d.slice(0, 7) === month.slice(0, 7);
                return (
                  <button key={d} onClick={() => setPicked(d)} className={`min-h-[64px] sm:min-h-[84px] p-1 border-r border-b border-slate-100 text-left cursor-pointer ${picked === d ? 'bg-teal-50' : inMonth ? 'bg-white' : 'bg-slate-50/60'}`}>
                    <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${d === today ? 'bg-slate-900 text-white' : inMonth ? 'text-slate-800' : 'text-slate-400'}`}>{parseDateKey(d).getDate()}</div>
                    <div className="hidden sm:block space-y-0.5 mt-0.5">
                      {list.slice(0, 3).map((e) => <div key={e.id} className={`text-[10px] px-1 rounded border truncate ${colorFor(e)}`}>{fmtMin(e.startMin)} {TYPE[e.type]}</div>)}
                      {list.length > 3 && <div className="text-[10px] text-slate-500">+{list.length - 3} more</div>}
                    </div>
                    <div className="sm:hidden flex gap-0.5 mt-1 flex-wrap">{list.slice(0, 4).map((e) => <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${e.status === 'live' ? 'bg-emerald-500' : e.type === 'demo' ? 'bg-rose-400' : e.type === 'one_on_one' ? 'bg-teal-500' : 'bg-violet-400'}`} />)}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <DayBlock date={picked} list={byDay[picked] || []} isToday={picked === today} onJoin={join} />
        </>
      )}
    </div>
  );
}

function NextCard({ e, today, nowMin, onJoin }) {
  const live = e.status === 'live';
  let when = '';
  if (!live) {
    if (e.date === today) {
      const mins = e.startMin - nowMin;
      when = mins > 0 ? `Starts in ${mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`}` : 'Starting now — waiting for your trainer';
    } else when = `${prettyDate(e.date, { weekday: 'long', day: 'numeric', month: 'short' })}`;
  }
  const canJoin = live && (e.type === 'class' || e.joinLink);
  return (
    <div className={`rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${live ? 'bg-emerald-600 text-white' : 'bg-[#0f212d] text-white'}`}>
      <div>
        <div className="text-[11px] font-black uppercase tracking-wider opacity-80">{live ? '● Live now' : 'Next class'} · {TYPE[e.type]}</div>
        <div className="text-lg font-extrabold">{e.title}</div>
        <div className="text-xs opacity-90">{fmtSlot(e.startMin, e.endMin)} · {e.trainerName}{e.topic ? ` · ${e.topic}` : ''}</div>
        {when && <div className="text-sm font-bold mt-1 text-teal-300">{when}</div>}
      </div>
      {canJoin ? (
        <button onClick={onJoin} className="px-5 py-3 rounded-xl bg-white text-emerald-700 font-extrabold flex items-center justify-center gap-2 cursor-pointer"><Video className="w-5 h-5" />Join now</button>
      ) : (
        <div className="text-xs opacity-80 max-w-[220px]">The Join button turns on here when your trainer starts the class.</div>
      )}
    </div>
  );
}

function DayBlock({ date, list, isToday, onJoin }) {
  return (
    <div className={`bg-white rounded-2xl border p-3 ${isToday ? 'border-teal-300' : 'border-slate-200'}`}>
      <div className="text-xs font-extrabold text-slate-700 mb-2">{isToday ? 'Today · ' : ''}{prettyDate(date, { weekday: 'long', day: 'numeric', month: 'short' })}</div>
      {list.length === 0 ? <div className="text-xs text-slate-400">No classes</div> : (
        <div className="space-y-1.5">
          {list.map((e) => {
            const st = STATUS[e.status] || STATUS.scheduled;
            const canJoin = e.status === 'live' && (e.type === 'class' || e.joinLink);
            return (
              <div key={e.id} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border ${colorFor(e)}`}>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold opacity-80 flex items-center gap-1"><Clock className="w-3 h-3" />{fmtSlot(e.startMin, e.endMin)} · {TYPE[e.type]}</div>
                  <div className="text-sm font-bold truncate">{e.title}</div>
                  <div className="text-[11px] opacity-80 truncate flex items-center gap-1"><User className="w-3 h-3" />{e.trainerName}{e.topic ? ` · ${e.topic}` : ''}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${st.cls}`}>{st.label}</span>
                  {e.status === 'done' && e.type === 'class' && e.attended !== null && (
                    e.attended
                      ? <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />You attended</span>
                      : <span className="text-[10px] font-bold text-rose-600 flex items-center gap-0.5"><XCircle className="w-3 h-3" />You missed it</span>
                  )}
                  {canJoin && <button onClick={() => onJoin(e)} className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">Join</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
