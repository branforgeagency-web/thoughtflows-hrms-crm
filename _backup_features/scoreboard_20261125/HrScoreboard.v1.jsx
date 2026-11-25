import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trophy, Medal, Crown, RefreshCw, TrendingUp, Users, GraduationCap, ChevronRight, Flame } from 'lucide-react';
import { getHrLeaderboard } from '../services/api';

// HR Admissions Scoreboard — every HR dashboard.
// Gold / Silver / Bronze trophies for the top 3 counsellors of the month,
// ranked by students admitted (ties → more fees collected this month).
// compact → small top-3 strip for the Home page (click opens the full board).

const pad = (n) => String(n).padStart(2, '0');
const monthKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const monthName = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const norm = (s = '') => String(s).trim().toLowerCase().replace(/\s+/g, ' ');

const PLACES = {
  1: {
    label: 'Gold', ring: 'ring-amber-300', grad: 'from-amber-300 via-yellow-400 to-amber-500', text: 'text-amber-700',
    soft: 'bg-gradient-to-b from-amber-50 to-white border-amber-200', trophy: 'text-amber-500', glow: 'shadow-amber-300/50', step: 'h-28', stepBg: 'bg-gradient-to-b from-amber-300 to-amber-400'
  },
  2: {
    label: 'Silver', ring: 'ring-slate-300', grad: 'from-slate-200 via-slate-300 to-slate-400', text: 'text-slate-600',
    soft: 'bg-gradient-to-b from-slate-50 to-white border-slate-200', trophy: 'text-slate-400', glow: 'shadow-slate-300/50', step: 'h-20', stepBg: 'bg-gradient-to-b from-slate-200 to-slate-300'
  },
  3: {
    label: 'Bronze', ring: 'ring-orange-300', grad: 'from-orange-300 via-amber-600 to-orange-700', text: 'text-orange-800',
    soft: 'bg-gradient-to-b from-orange-50 to-white border-orange-200', trophy: 'text-orange-600', glow: 'shadow-orange-300/50', step: 'h-14', stepBg: 'bg-gradient-to-b from-orange-300 to-orange-400'
  }
};

function useBoard(month, branch) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getHrLeaderboard({ month, branch })); setError(''); } catch (e) { setError(e?.response?.data?.error || e.message || 'Could not load the scoreboard'); } finally { setLoading(false); }
  }, [month, branch]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 120000); return () => clearInterval(t); }, [load]);
  return { data, loading, error, load };
}

export default function HrScoreboard({ currentUser, compact = false, onOpenFull }) {
  const myBranch = currentUser?.branch || '';
  const [month, setMonth] = useState(monthKey());
  const [branch, setBranch] = useState('all');
  const { data, loading, error, load } = useBoard(compact ? monthKey() : month, compact ? 'all' : branch);
  const rows = data?.rows || [];
  const isMe = useCallback((r) => (data?.me && norm(r.name) === norm(data.me.name)) || norm(r.name) === norm(currentUser?.name), [data, currentUser]);
  const top = rows.filter((r) => r.admissions > 0).slice(0, 3);
  const leader = rows[0]?.admissions || 0;
  const isThisMonth = (compact ? monthKey() : month) === monthKey();
  const daysLeft = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  }, []);
  const me = data?.me;
  const above = me && me.rank > 1 ? rows.filter((r) => r.rank < me.rank).slice(-1)[0] : null;

  if (compact) {
    return (
      <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50 via-white to-white p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-md shadow-amber-300/40"><Trophy className="w-5 h-5 text-white" /></div>
            <div>
              <div className="text-sm font-extrabold text-slate-900">Admissions Scoreboard</div>
              <div className="text-[11px] text-slate-500">{monthName(monthKey())} · {daysLeft} day{daysLeft === 1 ? '' : 's'} left</div>
            </div>
          </div>
          {onOpenFull && <button onClick={onOpenFull} className="text-xs font-bold text-[#0e6977] hover:underline flex items-center gap-0.5 cursor-pointer">Full board<ChevronRight className="w-3.5 h-3.5" /></button>}
        </div>
        {loading && !data ? (
          <div className="text-xs text-slate-500 flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 animate-spin" />Loading…</div>
        ) : top.length === 0 ? (
          <div className="text-xs text-slate-500">No admissions yet this month — the first admission takes the gold!</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {top.map((r) => {
              const p = PLACES[r.rank] || PLACES[3];
              return (
                <div key={r.name} className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${p.soft} ${isMe(r) ? 'ring-2 ring-[#0e6977]/40' : ''}`}>
                  <Trophy className={`w-6 h-6 shrink-0 ${p.trophy}`} fill="currentColor" fillOpacity={0.25} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-slate-900 truncate">{r.name}{isMe(r) ? ' (You)' : ''}</div>
                    <div className="text-[11px] text-slate-500 truncate">{p.label} · {r.branch || '—'}</div>
                  </div>
                  <div className={`text-xl font-black ${p.text}`}>{r.admissions}</div>
                </div>
              );
            })}
          </div>
        )}
        {me && (
          <div className="mt-2.5 text-[12px] text-slate-600">
            You are <b className="text-slate-900">#{me.rank}</b> with <b className="text-slate-900">{me.admissions}</b> admission{me.admissions === 1 ? '' : 's'}
            {above ? <> · <span className="text-[#0e6977] font-semibold">{Math.max(1, above.admissions - me.admissions + (above.admissions === me.admissions ? 1 : 0))} more to pass {above.name.split(' ')[0]}</span></> : me.rank === 1 && me.admissions > 0 ? <> · <span className="text-amber-600 font-semibold">you're leading! 🏆</span></> : null}
          </div>
        )}
      </div>
    );
  }

  // Podium order: 2nd · 1st · 3rd (ties keep their shared rank and trophy)
  const podium = [top[1], top[0], top[2]];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-[#08363e] via-[#0e6977] to-[#00897b] text-white p-5 sm:p-6 relative">
        <div className="absolute -right-6 -top-6 opacity-10"><Trophy className="w-48 h-48" /></div>
        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-teal-100/80">HR Admissions Scoreboard</div>
            <h2 className="text-2xl sm:text-3xl font-black mt-1">{monthName(month)}</h2>
            <div className="text-sm text-teal-50/90 mt-1">{isThisMonth ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left — every admission counts!` : 'Final standings'}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="month" value={month} max={monthKey()} onChange={(e) => e.target.value && setMonth(e.target.value)} className="px-3 py-2 rounded-xl bg-white/15 border border-white/20 text-sm text-white [color-scheme:dark]" />
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className="px-3 py-2 rounded-xl bg-white/15 border border-white/20 text-sm text-white [&>option]:text-slate-900">
              <option value="all">All branches</option>
              {myBranch && <option value={myBranch}>My branch ({myBranch})</option>}
              {(data?.branches || []).filter((b) => norm(b) !== norm(myBranch)).map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <button onClick={load} className="p-2 rounded-xl bg-white/15 hover:bg-white/25 cursor-pointer" title="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-3 mt-5 max-w-xl">
          {[[Users, 'Counsellors', data?.totals?.hrs ?? '—'], [GraduationCap, 'Admissions', data?.totals?.admissions ?? '—'], [TrendingUp, 'Fees collected', data ? rupees(data.totals.fees) : '—']].map(([Icon, l, v]) => (
            <div key={l} className="rounded-2xl bg-white/10 border border-white/15 px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase text-teal-100/80 flex items-center gap-1"><Icon className="w-3.5 h-3.5" />{l}</div>
              <div className="text-lg font-black">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}

      {/* Podium */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8">
        {top.length === 0 ? (
          <div className="py-10 text-center">
            <Trophy className="w-14 h-14 mx-auto text-slate-200" />
            <div className="mt-2 font-bold text-slate-700">No admissions yet{isThisMonth ? ' this month' : ''}</div>
            <div className="text-sm text-slate-500">The first admission takes the gold trophy.</div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end max-w-3xl mx-auto">
            {podium.map((r, i) => {
              if (!r) return <div key={`empty-${i}`} />;
              const place = Math.min(3, r.rank);
              const p = PLACES[place];
              const mine = isMe(r);
              return (
                <div key={r.name} className="flex flex-col items-center text-center">
                  {place === 1 && <Crown className="w-7 h-7 text-amber-400 mb-1 drop-shadow" fill="currentColor" />}
                  <div className={`relative rounded-full p-1 bg-gradient-to-br ${p.grad} shadow-lg ${p.glow}`}>
                    <div className={`${place === 1 ? 'w-20 h-20 sm:w-24 sm:h-24 text-2xl' : 'w-16 h-16 sm:w-20 sm:h-20 text-xl'} rounded-full bg-white flex items-center justify-center font-black text-slate-700 ${mine ? 'ring-4 ring-[#0e6977]/30' : ''}`}>
                      {initials(r.name)}
                    </div>
                    <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-gradient-to-br ${p.grad} text-white text-xs font-black flex items-center justify-center border-2 border-white`}>{place}</div>
                  </div>
                  <div className="mt-4 font-extrabold text-slate-900 text-sm sm:text-base leading-tight">{r.name}{mine && <span className="block text-[11px] text-[#0e6977]">You</span>}</div>
                  <div className="text-[11px] text-slate-500">{r.branch || '—'}</div>
                  <div className={`mt-2 w-full rounded-t-2xl ${p.stepBg} ${p.step} flex flex-col items-center justify-center shadow-inner`}>
                    <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white drop-shadow" fill="currentColor" fillOpacity={0.35} />
                    <div className="text-white font-black text-xl sm:text-2xl leading-none mt-1 drop-shadow">{r.admissions}</div>
                    <div className="text-white/90 text-[10px] font-bold uppercase tracking-wide">{p.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My position */}
      {me && (
        <div className="rounded-2xl border border-[#0e6977]/20 bg-teal-50/60 p-4 flex flex-wrap items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#0e6977] text-white flex items-center justify-center font-black">#{me.rank}</div>
          <div className="flex-1 min-w-[200px]">
            <div className="font-bold text-slate-900">Your position: #{me.rank} of {rows.length}</div>
            <div className="text-sm text-slate-600">
              {me.rank === 1 && me.admissions > 0 ? 'You are leading the board — keep it up! 🏆'
                : above ? `${Math.max(1, above.admissions - me.admissions + (above.admissions === me.admissions ? 1 : 0))} more admission(s) to pass ${above.name} (#${above.rank}).`
                  : 'Make your first admission to get on the podium.'}
            </div>
          </div>
          {me.rank > 3 && top[2] && <div className="text-xs font-semibold text-orange-700 flex items-center gap-1"><Flame className="w-4 h-4" />{Math.max(1, top[2].admissions - me.admissions + 1)} more for a trophy</div>}
        </div>
      )}

      {/* Full ranking */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-bold text-slate-800 flex items-center gap-2"><Medal className="w-4 h-4 text-[#0e6977]" />Full ranking</div>
        {rows.length === 0 && !loading && <div className="p-6 text-center text-sm text-slate-500">No counsellors found{branch !== 'all' ? ' for this branch' : ''}.</div>}
        <div className="divide-y divide-slate-100">
          {rows.map((r) => {
            const p = r.admissions > 0 ? PLACES[r.rank] : null;
            const mine = isMe(r);
            const pct = leader ? Math.round((r.admissions / leader) * 100) : 0;
            return (
              <div key={r.name} className={`px-4 py-2.5 flex items-center gap-3 ${mine ? 'bg-teal-50/70' : 'hover:bg-slate-50'}`}>
                <div className="w-9 text-center shrink-0">
                  {p ? <Trophy className={`w-5 h-5 mx-auto ${p.trophy}`} fill="currentColor" fillOpacity={0.3} /> : <span className="text-sm font-bold text-slate-400">#{r.rank}</span>}
                </div>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${p ? `bg-gradient-to-br ${p.grad} text-white` : 'bg-slate-100 text-slate-600'}`}>{initials(r.name)}</div>
                <div className="min-w-0 w-40 sm:w-56 shrink-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{r.name}{mine && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[#0e6977] text-white align-middle">You</span>}</div>
                  <div className="text-[11px] text-slate-500 truncate">{r.branch || '—'}{r.topCourse ? ` · mostly ${r.topCourse}` : ''}</div>
                </div>
                <div className="flex-1 hidden sm:block">
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${p ? `bg-gradient-to-r ${p.grad}` : 'bg-[#0e6977]/60'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0 w-24">
                  <div className="text-lg font-black text-slate-900 leading-none">{r.admissions}</div>
                  <div className="text-[10px] text-slate-500">{r.fees ? rupees(r.fees) : 'admissions'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="text-[11px] text-slate-400 px-1">Ranked by students admitted this month (admission date). If two counsellors tie, the one with more fees collected this month ranks higher. Updates every 2 minutes.</div>
    </div>
  );
}
