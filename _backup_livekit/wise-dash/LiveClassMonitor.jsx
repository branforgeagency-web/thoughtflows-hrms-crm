import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Eye, BellRing, Search, X, Radio, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import LiveClassroom from '../LiveClassroom';
import { getSchedulingCalendar, observeLiveClass, remindTrainerToStart } from '../../services/api';
import { fmtMin, todayKey, prettyDate, errMsg } from './schedUtils';

// Head / Manager / TL → Class Session Room → Today's Classes (Wise-style).
// Every trainer runs their own class; leaders see all of today's classes,
// join a live one as an observer, or remind a trainer who is late.
const LATE_AFTER_MIN = 10;
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

function stateOf(e, now) {
  if (e.status === 'live') return 'live';
  if (e.status === 'done') return 'done';
  if (e.status === 'leave') return 'leave';
  if (e.status === 'missed') return 'not_held';
  if (now > (e.scheduledStartMin ?? e.startMin) + LATE_AFTER_MIN) return 'late';
  return 'upcoming';
}
const STATE = {
  live: { label: 'Live now', cls: 'bg-emerald-600 text-white', card: 'border-emerald-300 bg-emerald-50/50' },
  late: { label: 'Not started', cls: 'bg-rose-600 text-white', card: 'border-rose-300 bg-rose-50/40' },
  upcoming: { label: 'Upcoming', cls: 'bg-sky-100 text-sky-800', card: 'border-slate-200 bg-white' },
  done: { label: 'Completed', cls: 'bg-slate-200 text-slate-700', card: 'border-slate-200 bg-slate-50' },
  not_held: { label: 'Not held', cls: 'bg-rose-100 text-rose-700', card: 'border-rose-200 bg-white' },
  leave: { label: 'Trainer on leave', cls: 'bg-amber-100 text-amber-800', card: 'border-amber-200 bg-white' }
};
const TABS = [['all', 'All'], ['live', 'Live now'], ['late', 'Not started'], ['upcoming', 'Upcoming'], ['done', 'Completed']];

export default function LiveClassMonitor({ trainerIds = null, scopeLabel = 'all trainers' }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [now, setNow] = useState(nowMin());
  const [observing, setObserving] = useState(null);
  const [toast, setToast] = useState('');
  const [reminded, setReminded] = useState({});
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 3500); };
  const today = todayKey();

  const load = useCallback(async () => {
    try {
      const r = await getSchedulingCalendar({ from: today, to: today, types: 'class' });
      setEvents(r.events || []);
      setError('');
    } catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); setNow(nowMin()); }
  }, [today]);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const scoped = useMemo(() => {
    const ids = trainerIds ? new Set(trainerIds.map(String)) : null;
    return events.filter((e) => !ids || ids.has(String(e.trainerId)))
      .map((e) => ({ ...e, state: stateOf(e, now) }));
  }, [events, trainerIds, now]);

  const counts = useMemo(() => scoped.reduce((c, e) => { c[e.state] = (c[e.state] || 0) + 1; return c; }, {}), [scoped]);
  const ql = q.trim().toLowerCase();
  const order = { live: 0, late: 1, upcoming: 2, not_held: 3, leave: 4, done: 5 };
  const shown = scoped
    .filter((e) => (tab === 'all' || e.state === tab || (tab === 'late' && e.state === 'not_held')) && (!ql || `${e.title} ${e.trainerName} ${e.course}`.toLowerCase().includes(ql)))
    .sort((a, b) => order[a.state] - order[b.state] || a.startMin - b.startMin);

  const remind = async (e) => {
    try {
      await remindTrainerToStart({ trainerId: e.trainerId, batch: e.title, time: `${fmtMin(e.scheduledStartMin ?? e.startMin)}` });
      setReminded((r) => ({ ...r, [e.id]: true }));
      flash(`Reminder sent to ${e.trainerName}`);
    } catch (err) { flash(errMsg(err)); }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2"><Radio className="w-4 h-4 text-emerald-500" />Today's Classes · {prettyDate(today, { weekday: 'long', day: 'numeric', month: 'short' })}</h3>
          <p className="text-xs text-slate-500">Each trainer starts their own class. Join a live class as an observer, or remind a trainer who hasn't started · {scopeLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Batch or trainer" className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs w-48" />
          </div>
          <button onClick={load} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer" title="Refresh"><RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Kpi icon={Radio} label="Live now" value={counts.live || 0} tone="text-emerald-600" />
        <Kpi icon={AlertTriangle} label="Not started" value={(counts.late || 0) + (counts.not_held || 0)} tone="text-rose-600" />
        <Kpi icon={Clock} label="Upcoming" value={counts.upcoming || 0} tone="text-sky-600" />
        <Kpi icon={CheckCircle2} label="Completed" value={counts.done || 0} tone="text-slate-600" />
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer ${tab === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600'}`}>{l}</button>
        ))}
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}
      {!loading && shown.length === 0 && <div className="py-8 text-center text-xs text-slate-500">No classes here today. Classes come from each trainer's active batches (time + days).</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {shown.map((e) => {
          const st = STATE[e.state];
          const start = e.scheduledStartMin ?? e.startMin;
          const startsIn = start - now;
          return (
            <div key={e.id} className={`rounded-2xl border p-3.5 space-y-2 ${st.card}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-500">{fmtMin(start)} – {fmtMin(e.endMin)}</div>
                  <div className="font-extrabold text-slate-900 truncate" title={e.title}>{e.title}</div>
                  <div className="text-xs text-slate-600 truncate">{e.trainerName}{e.topic ? ` · ${e.topic}` : ''}</div>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${st.cls}`}>
                  {e.state === 'live' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-white mr-1 align-middle animate-pulse" />}{st.label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-500">
                  {e.state === 'live' && `Started ${fmtMin(e.startMin)}${e.startMin > start + LATE_AFTER_MIN ? ` · ${e.startMin - start} min late` : ''}`}
                  {e.state === 'done' && `Held · started ${fmtMin(e.startMin)}`}
                  {e.state === 'upcoming' && (startsIn > 0 ? `Starts in ${startsIn >= 60 ? `${Math.floor(startsIn / 60)}h ${startsIn % 60}m` : `${startsIn} min`}` : 'Due now')}
                  {e.state === 'late' && `${now - start} min past start`}
                  {e.state === 'not_held' && 'Class time is over'}
                </span>
                {e.state === 'live' && (e.canObserve
                  ? <button onClick={() => setObserving(e)} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 cursor-pointer"><Eye className="w-3.5 h-3.5" />Join as observer</button>
                  : <span className="text-[11px] text-slate-400">Running on old Zoom setup</span>)}
                {(e.state === 'late' || (e.state === 'upcoming' && startsIn <= 5)) && (
                  <button disabled={reminded[e.id]} onClick={() => remind(e)} className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 disabled:opacity-50 font-bold flex items-center gap-1 cursor-pointer"><BellRing className="w-3.5 h-3.5" />{reminded[e.id] ? 'Reminded' : 'Remind trainer'}</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {observing && (
        <div className="fixed inset-0 z-[95] bg-[#030b0f] flex flex-col">
          <div className="px-4 py-2.5 bg-[#07151c] border-b border-[#1b3446] flex items-center justify-between gap-2 text-white">
            <div className="min-w-0">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40 mr-2">Observing</span>
              <b>{observing.title}</b> <span className="text-xs text-slate-300">· {observing.trainerName}</span>
            </div>
            <button onClick={() => { setObserving(null); load(); }} className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer"><X className="w-3.5 h-3.5" />Leave</button>
          </div>
          <div className="flex-1">
            <LiveClassroom key={observing.sessionId} isHost={false} height="100%" getJoinDetails={() => observeLiveClass(observing.sessionId)}
              onLeft={() => { setObserving(null); load(); }} />
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm shadow-xl">{toast}</div>}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }) {
  return (
    <div className="p-3 rounded-xl border border-slate-200 bg-white">
      <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1"><Icon className={`w-3.5 h-3.5 ${tone}`} />{label}</div>
      <div className={`text-xl font-black ${tone}`}>{value}</div>
    </div>
  );
}
