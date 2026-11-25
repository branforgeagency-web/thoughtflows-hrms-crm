import React, { useCallback, useEffect, useState } from 'react';
import { Trophy, Crown, Medal, Clock, RefreshCw, Target, IndianRupee, Flame, Settings2, AlertTriangle, Video, User } from 'lucide-react';
import { getTrainerHoursScorecard, saveTrainerHoursPolicy } from '../services/api';

// Trainer Hours Scorecard — monthly class-hours target (default 90 h).
// Hours above the target earn the incentive: extra hours × rate per extra hour.
// Trainers see their own progress + the trainers' podium; Head / Admin also set the policy.

const pad = (n) => String(n).padStart(2, '0');
const monthKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const monthName = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const hrs = (h) => { const n = Number(h) || 0; const H = Math.floor(n); const M = Math.round((n - H) * 60); return M ? `${H}h ${pad(M)}m` : `${H}h`; };
const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const errMsg = (e) => e?.response?.data?.error || e?.message || 'Something went wrong';

const STAGE = {
  1: { label: 'Gold', ring: 'from-yellow-200 via-amber-400 to-amber-600', glow: 'shadow-[0_0_40px_rgba(251,191,36,0.55)]', initials: 'text-amber-200', block: 'from-amber-300 via-amber-400 to-amber-600', step: 'h-44', chip: 'text-amber-300' },
  2: { label: 'Silver', ring: 'from-white via-slate-300 to-slate-500', glow: 'shadow-[0_0_30px_rgba(203,213,225,0.35)]', initials: 'text-slate-200', block: 'from-slate-200 via-slate-300 to-slate-500', step: 'h-36', chip: 'text-slate-200' },
  3: { label: 'Bronze', ring: 'from-orange-200 via-orange-400 to-amber-800', glow: 'shadow-[0_0_30px_rgba(251,146,60,0.35)]', initials: 'text-orange-200', block: 'from-orange-300 via-orange-500 to-amber-800', step: 'h-32', chip: 'text-orange-300' }
};

function Ring({ pct, size = 150, stroke = 12, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="tfRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#5eead4" /><stop offset="100%" stopColor={p >= 100 ? '#fbbf24' : '#14b8a6'} /></linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#tfRing)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * p) / 100} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export default function TrainerHoursScorecard({ teamView = false }) {
  const [month, setMonth] = useState(monthKey());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPolicy, setShowPolicy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getTrainerHoursScorecard({ month })); setError(''); } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  }, [month]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 120000); return () => clearInterval(t); }, [load]);

  const policy = data?.policy || { targetHours: 90, ratePerExtraHour: 0 };
  const target = policy.targetHours;
  const rate = policy.ratePerExtraHour;
  const rows = data?.rows || [];
  const me = data?.me;
  const top = rows.filter((r) => r.hours > 0).slice(0, 3);
  const podium = [top[1], top[0], top[2]];
  const isThisMonth = month === monthKey();
  const now = new Date();
  const daysLeft = isThisMonth ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() : 0;
  const remaining = me ? Math.max(0, target - me.hours) : target;
  const perDayNeeded = daysLeft > 0 ? remaining / daysLeft : remaining;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-[radial-gradient(ellipse_at_top_left,_#134e5a_0%,_#0b2b35_50%,_#071a22_100%)] text-white p-5 sm:p-7 shadow-xl shadow-slate-900/20">
        <div className="pointer-events-none absolute -top-20 -right-10 w-80 h-80 rounded-full bg-teal-400/15 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-200/80">Trainer Hours Scorecard</div>
            <h2 className="text-2xl sm:text-3xl font-black">{monthName(month)}</h2>
            <p className="text-sm text-teal-50/80 max-w-xl">
              Target <b className="text-white">{target} class hours</b> a month. Every hour above {target} earns
              {rate ? <> <b className="text-amber-300">{rupees(rate)}</b> incentive.</> : <> incentive <span className="text-amber-300">(rate not set yet)</span>.</>}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <input type="month" value={month} max={monthKey()} onChange={(e) => e.target.value && setMonth(e.target.value)} className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-sm [color-scheme:dark]" />
              <button onClick={load} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 cursor-pointer" title="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
              {data?.canEditPolicy && (
                <button onClick={() => setShowPolicy((v) => !v)} className="px-3 py-2 rounded-xl bg-amber-400 text-[#0b2b35] text-sm font-bold flex items-center gap-1.5 cursor-pointer"><Settings2 className="w-4 h-4" />Target & rate</button>
              )}
            </div>
          </div>

          {!teamView && me ? (
            <div className="flex items-center gap-5">
              <Ring pct={(me.hours / target) * 100}>
                <div className="text-3xl font-black leading-none">{hrs(me.hours)}</div>
                <div className="text-[11px] text-teal-100/70 mt-1">of {target}h target</div>
                {me.hours >= target && <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-amber-300">Target hit 🎯</div>}
              </Ring>
              <div className="space-y-2 min-w-[180px]">
                <Stat icon={Target} label={me.hours >= target ? 'Extra hours' : 'Hours to target'} value={me.hours >= target ? hrs(me.extraHours) : hrs(remaining)} tone={me.hours >= target ? 'text-amber-300' : 'text-white'} />
                <Stat icon={IndianRupee} label="My incentive" value={rate ? rupees(me.incentive) : '—'} tone="text-amber-300" />
                {isThisMonth && me.hours < target && daysLeft > 0 && <div className="text-[11px] text-teal-100/70">≈ {hrs(perDayNeeded)} a day for {daysLeft} days to reach {target}h</div>}
                <div className="text-[11px] text-teal-100/70">Rank #{me.rank} of {rows.length} trainers</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 min-w-[280px]">
              <Stat icon={User} label="Trainers" value={data?.totals?.trainers ?? '—'} />
              <Stat icon={Clock} label="Class hours" value={data ? hrs(data.totals.hours) : '—'} />
              <Stat icon={Target} label={`Hit ${target}h`} value={data?.totals?.achieved ?? '—'} tone="text-amber-300" />
              <Stat icon={IndianRupee} label="Incentive payable" value={data?.totals?.incentive != null ? rupees(data.totals.incentive) : '—'} tone="text-amber-300" />
            </div>
          )}
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
      {showPolicy && data?.canEditPolicy && <PolicyCard policy={policy} onSaved={() => { setShowPolicy(false); load(); }} />}

      {/* Podium */}
      <div className="relative overflow-hidden rounded-3xl bg-[radial-gradient(ellipse_at_top,_#134e5a_0%,_#0b2b35_45%,_#071a22_100%)] px-4 sm:px-10 pt-7 shadow-xl shadow-slate-900/20">
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[380px] rounded-full bg-amber-300/20 blur-3xl" />
        {[[8, 18], [16, 70], [24, 40], [12, 88], [30, 8], [6, 55], [20, 28], [28, 76]].map(([t, l], i) => (
          <span key={i} className="pointer-events-none absolute rounded-full bg-white animate-pulse" style={{ top: `${t}%`, left: `${l}%`, width: 2, height: 2, opacity: 0.3 + (i % 3) * 0.15, animationDelay: `${i * 0.4}s` }} />
        ))}
        <div className="relative text-center mb-5">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200"><Trophy className="w-3.5 h-3.5" />Most class hours · {monthName(month)}</span>
        </div>
        {top.length === 0 ? (
          <div className="relative pb-10 text-center text-white">
            <Trophy className="w-14 h-14 mx-auto text-white/15" />
            <div className="mt-2 font-bold">No classes logged yet</div>
            <div className="text-sm text-teal-100/70">Classes started from the Class Session Room count here.</div>
          </div>
        ) : (
          <div className="relative grid grid-cols-3 gap-2 sm:gap-5 items-end max-w-3xl mx-auto">
            {podium.map((r, i) => {
              if (!r) return <div key={`e${i}`} />;
              const place = Math.min(3, r.rank);
              const S = STAGE[place];
              return (
                <div key={r.trainerId} className="flex flex-col items-center text-center">
                  <div className="h-8 flex items-end mb-1">{place === 1 ? <Crown className="w-8 h-8 text-amber-300 drop-shadow-[0_0_12px_rgba(252,211,77,0.8)]" fill="currentColor" /> : <Medal className={`w-6 h-6 ${S.chip}`} />}</div>
                  <div className={`relative rounded-full p-[3px] bg-gradient-to-br ${S.ring} ${S.glow}`}>
                    <div className={`${place === 1 ? 'w-24 h-24 text-3xl' : 'w-[76px] h-[76px] text-2xl'} rounded-full bg-gradient-to-br from-[#123c47] to-[#0a2229] border-[3px] border-[#0b2b35] flex items-center justify-center font-black ${S.initials}`}>{initials(r.name)}</div>
                    <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br ${S.ring} text-[#0b2b35] text-sm font-black flex items-center justify-center border-[3px] border-[#0b2b35]`}>{place}</div>
                  </div>
                  <div className="mt-5 min-h-[48px]">
                    <div className="font-extrabold text-white text-sm sm:text-base leading-tight">{r.name}</div>
                    <div className="text-[11px] text-teal-100/60">{r.branch || '—'}{r.isMe && <span className="ml-1.5 px-1.5 py-px rounded-full bg-teal-400 text-[#0b2b35] font-black text-[9px] uppercase">You</span>}</div>
                  </div>
                  <div className={`relative mt-3 w-full ${S.step} rounded-t-2xl bg-gradient-to-b ${S.block} shadow-[inset_0_2px_0_rgba(255,255,255,0.55),inset_0_-12px_24px_rgba(0,0,0,0.12)] overflow-hidden`}>
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent" />
                    <div className="relative h-full flex flex-col items-center pt-4 gap-1">
                      <div className="w-10 h-10 rounded-full bg-white/25 border border-white/40 flex items-center justify-center"><Clock className="w-5 h-5 text-white" /></div>
                      <div className="font-black text-white text-2xl sm:text-3xl leading-none drop-shadow">{hrs(r.hours)}</div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">class hours</div>
                      <div className={`mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0b2b35] ${S.chip}`}>{S.label}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="relative h-3 -mx-10 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </div>

      {/* Ranking */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="font-bold text-slate-800 flex items-center gap-2"><Medal className="w-4 h-4 text-[#0e6977]" />All trainers · target {target}h</div>
          <div className="text-[11px] text-slate-400 hidden sm:block">Line on each bar = {target}h target</div>
        </div>
        {rows.length === 0 && !loading && <div className="p-6 text-center text-sm text-slate-500">No trainers found.</div>}
        <div className="divide-y divide-slate-100">
          {rows.map((r) => {
            const S = r.hours > 0 && r.rank <= 3 ? STAGE[r.rank] : null;
            const scale = Math.max(target * 1.3, rows[0]?.hours || 0);
            const done = r.hours >= target;
            return (
              <div key={r.trainerId} className={`px-4 py-2.5 flex items-center gap-3 ${r.isMe ? 'bg-teal-50/70' : 'hover:bg-slate-50'}`}>
                <div className="w-9 text-center shrink-0">{S ? <Trophy className={`w-5 h-5 mx-auto ${r.rank === 1 ? 'text-amber-500' : r.rank === 2 ? 'text-slate-400' : 'text-orange-600'}`} fill="currentColor" fillOpacity={0.3} /> : <span className="text-sm font-bold text-slate-400">#{r.rank}</span>}</div>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${S ? `bg-gradient-to-br ${S.ring} text-[#0b2b35]` : 'bg-slate-100 text-slate-600'}`}>{initials(r.name)}</div>
                <div className="min-w-0 w-36 sm:w-52 shrink-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{r.name}{r.isMe && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[#0e6977] text-white align-middle">You</span>}</div>
                  <div className="text-[11px] text-slate-500 truncate">{r.branch || '—'} · {r.sessions} session{r.sessions === 1 ? '' : 's'}{r.noEndSessions ? <span className="text-amber-600"> · {r.noEndSessions} not ended</span> : ''}</div>
                </div>
                <div className="flex-1 hidden sm:block">
                  <div className="relative h-2.5 rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${done ? 'bg-gradient-to-r from-teal-400 to-amber-400' : 'bg-gradient-to-r from-teal-300 to-teal-600'}`} style={{ width: `${Math.min(100, (r.hours / scale) * 100)}%` }} />
                    <div className="absolute -top-1 -bottom-1 w-0.5 bg-slate-800/60 rounded" style={{ left: `${(target / scale) * 100}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0 w-20">
                  <div className="text-base font-black text-slate-900 leading-none">{hrs(r.hours)}</div>
                  <div className={`text-[10px] font-semibold ${done ? 'text-amber-600' : 'text-slate-400'}`}>{done ? `+${hrs(r.extraHours)} extra` : `${hrs(Math.max(0, target - r.hours))} to go`}</div>
                </div>
                {data?.showIncentives && <div className="text-right shrink-0 w-20 text-sm font-bold text-emerald-700">{r.incentive ? rupees(r.incentive) : '—'}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* My classes */}
      {!teamView && me && (data?.mySessions || []).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 font-bold text-slate-800 flex items-center gap-2"><Video className="w-4 h-4 text-[#0e6977]" />My classes this month ({data.mySessions.length})</div>
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
            {data.mySessions.map((s, i) => (
              <div key={i} className="px-4 py-2 flex items-center gap-3 text-sm">
                <div className="w-24 shrink-0 text-xs text-slate-500">{new Date(`${s.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}</div>
                <div className="flex-1 min-w-0 truncate font-semibold text-slate-800">{s.title}{s.course ? <span className="font-normal text-slate-500"> · {s.course}</span> : ''}</div>
                {s.noEnd && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3" />not ended</span>}
                {s.live && <span className="text-[10px] font-bold text-white bg-emerald-600 px-1.5 py-0.5 rounded-full">live</span>}
                <div className="w-16 text-right font-bold text-slate-900">{hrs(s.minutes / 60)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-[11px] text-slate-400 px-1 flex items-start gap-1.5">
        <Flame className="w-3.5 h-3.5 shrink-0 mt-px text-orange-400" />
        Hours = batch classes started and ended from the Class Session Room{policy.countOneOnOne ? ' + completed 1:1 sessions' : ''}. Overlapping sessions count once. A class left running counts at most {Math.round((policy.maxSessionMinutes || 240) / 60)}h; one never ended counts as {Math.round((policy.missingEndMinutes || 120) / 60 * 10) / 10}h — always end your class.
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone = 'text-white' }) {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/15 px-3 py-2">
      <div className="text-[10px] font-bold uppercase text-teal-100/70 flex items-center gap-1"><Icon className="w-3.5 h-3.5" />{label}</div>
      <div className={`text-lg font-black ${tone}`}>{value}</div>
    </div>
  );
}

function PolicyCard({ policy, onSaved }) {
  const [f, setF] = useState({ ...policy });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setBusy(true); setError('');
    try { await saveTrainerHoursPolicy(f); onSaved(); } catch (e) { setError(errMsg(e)); setBusy(false); }
  };
  const field = (k, label, hint) => (
    <label className="text-xs font-bold text-slate-500">{label}
      <input type="number" min="0" value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="block mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
      {hint && <span className="font-normal text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
  return (
    <div className="bg-white rounded-2xl border border-amber-200 p-4 space-y-3">
      <div className="font-bold text-slate-800">Trainer hours target & incentive</div>
      {error && <div className="p-2 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</div>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {field('targetHours', 'Monthly target (hours)')}
        {field('ratePerExtraHour', 'Incentive per extra hour (₹)')}
        {field('maxSessionMinutes', 'Max minutes per class', 'longer is capped')}
        {field('missingEndMinutes', 'Class not ended counts as (min)')}
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={f.countOneOnOne !== false} onChange={(e) => setF({ ...f, countOneOnOne: e.target.checked })} />Count completed 1:1 sessions as class hours</label>
      <div className="text-xs text-slate-500">Incentive = (hours taken − target) × rate. Example: 104h with a 90h target and ₹{Number(f.ratePerExtraHour) || 0}/h → 14 × ₹{Number(f.ratePerExtraHour) || 0} = {rupees(14 * (Number(f.ratePerExtraHour) || 0))}.</div>
      <button disabled={busy} onClick={save} className="px-4 py-2 rounded-xl bg-[#00897b] text-white text-sm font-bold cursor-pointer disabled:opacity-50">Save</button>
    </div>
  );
}
