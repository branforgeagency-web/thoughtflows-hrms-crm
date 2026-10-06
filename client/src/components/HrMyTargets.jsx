import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  ChevronRight,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { getStudents, getHrTargets, onDataUpdate } from '../services/api';
import { useIncentivePolicy, progressiveIncentive } from '../utils/incentive';

const normName = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
const monthKey = (d) => {
  const x = new Date(d);
  return isNaN(x.getTime()) ? '' : `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
};
const inr = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

// My Targets & Earnings — admissions from the student records, the target from
// the Head of HR (or Admin's default) and incentive from Admin's policy bands.
export default function HrMyTargets({ students: propStudents, currentUser }) {
  const [showBands, setShowBands] = useState(false);
  const [allStudents, setAllStudents] = useState(propStudents || []);
  const [headTarget, setHeadTarget] = useState(null);
  const policy = useIncentivePolicy();
  const myName = normName(currentUser?.name);

  useEffect(() => {
    if (propStudents !== undefined) { setAllStudents(propStudents); return undefined; }
    const load = () => getStudents().then((res) => { if (Array.isArray(res)) setAllStudents(res); }).catch(() => {});
    load();
    return onDataUpdate((entity) => { if (entity === 'students') load(); });
  }, [propStudents]);

  useEffect(() => {
    const load = () => getHrTargets({ period: 'month' })
      .then((rows) => {
        const admissionRows = (Array.isArray(rows) ? rows : []).filter((t) => /admission|enrol/i.test(t.title || ''));
        const pick = admissionRows.find((t) => normName(t.assignedTo) === myName)
          || admissionRows.find((t) => /^all\b/i.test(String(t.assignedTo || '').trim()));
        setHeadTarget(pick && Number(pick.target) > 0 ? Number(pick.target) : null);
      })
      .catch(() => {});
    load();
    return onDataUpdate((entity) => { if (entity === 'targets') load(); });
  }, [myName]);

  const now = new Date();
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const admittedOn = (s) => monthKey(s.admissionDate || s.createdAt);

  const mine = useMemo(() => allStudents.filter((s) => myName && normName(s.hrName) === myName), [allStudents, myName]);
  const admissionsThisMonth = mine.filter((s) => admittedOn(s) === thisMonth).length;
  const admissionsLastMonth = mine.filter((s) => admittedOn(s) === lastMonth).length;
  const collectedThisMonth = mine.reduce((sum, s) => sum + (s.receipts || [])
    .filter((r) => monthKey(r.at || r.date) === thisMonth)
    .reduce((a, r) => a + (Number(r.amount) || 0), 0), 0);

  // Rank among counsellors whose students share my branch (this month)
  const branchRank = useMemo(() => {
    const myBranch = normName(currentUser?.branch);
    if (!myBranch) return null;
    const tally = new Map();
    allStudents.forEach((s) => {
      if (admittedOn(s) !== thisMonth || !s.hrName) return;
      const b = normName(s.branch || s.leadBranch || s.location);
      if (!b.includes(myBranch) && !myBranch.includes(b)) return;
      tally.set(normName(s.hrName), (tally.get(normName(s.hrName)) || 0) + 1);
    });
    if (!tally.has(myName)) tally.set(myName, admissionsThisMonth);
    const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    return { rank: ranked.findIndex(([n]) => n === myName) + 1, of: ranked.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allStudents, myName, thisMonth, currentUser?.branch, admissionsThisMonth]);

  const policyTarget = Number(policy?.defaultTarget) > 0 ? Number(policy.defaultTarget) : null;
  const target = headTarget || policyTarget;
  const bands = policy?.bands || [];
  const pastTarget = target ? Math.max(0, admissionsThisMonth - target) : 0;
  const earned = target ? progressiveIncentive(admissionsThisMonth, target, bands) : 0;
  const earnedLastMonth = target ? progressiveIncentive(admissionsLastMonth, target, bands) : 0;
  const progressPct = target ? Math.min(100, Math.round((admissionsThisMonth / target) * 100)) : 0;
  const delta = admissionsThisMonth - admissionsLastMonth;

  // Which band the next admission past target falls in
  const nextBand = useMemo(() => {
    let prev = 0;
    for (const b of bands) {
      if (pastTarget < Number(b.upTo)) return { ...b, from: prev };
      prev = Number(b.upTo) || prev;
    }
    return null;
  }, [bands, pastTarget]);

  const card = 'bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-[#00897b] flex flex-col justify-between';
  const label = 'text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono';

  return (
    <div className="space-y-4 pb-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          My <span className="text-[#00897b]">Targets & Earnings</span>
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 font-mono font-medium mt-1">
          Monthly target &middot; incentive past target &middot; live from your admissions
        </p>
      </div>

      <div className="bg-[#fef08a] rounded-2xl p-4 sm:p-5 text-amber-950 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 border border-amber-300/80">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-600/20 border border-amber-700/20 flex items-center justify-center text-amber-950 flex-shrink-0">
            <Award className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold font-mono tracking-widest uppercase text-amber-900/90">
              MONTHLY TARGET &middot; {now.toLocaleString('en-IN', { month: 'long' }).toUpperCase()}
              {target && !headTarget ? ' · ADMIN DEFAULT' : ''}
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">
              {policy === undefined ? 'Loading policy…'
                : !target ? 'No target set yet — Admin sets it in Incentive Slabs'
                : admissionsThisMonth >= target
                  ? `Target hit · ${pastTarget} past target · ${inr(earned)} earned`
                  : `${target - admissionsThisMonth} more admissions to hit your target of ${target}`}
            </h3>
            <p className="text-xs text-amber-900/80 font-medium mt-0.5">
              {nextBand && target
                ? `Each admission past target currently pays ${inr(nextBand.rate)} (${nextBand.label || `band up to ${nextBand.upTo}`})`
                : bands.length ? 'All incentive bands used this month' : 'No incentive bands configured'}
            </p>
          </div>
        </div>
        <div className="flex flex-col md:items-end flex-shrink-0 space-y-1.5 min-w-[170px]">
          <div className="flex items-center justify-between w-full text-xs font-mono font-extrabold text-amber-950 gap-4">
            <span>{admissionsThisMonth} / {target || '—'}</span>
            {bands.length > 0 && (
              <button onClick={() => setShowBands(true)} className="text-amber-950 font-black cursor-pointer hover:underline flex items-center gap-0.5 text-[11px] tracking-wider uppercase">
                Bands <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="w-full md:w-44 h-2 bg-amber-950/20 rounded-full overflow-hidden">
            <div className="h-full bg-amber-950 rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
        <div className={card}>
          <div className={label}>ADMISSIONS THIS MONTH</div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 my-2 tracking-tight">{admissionsThisMonth}</div>
          <div className="text-xs font-mono font-semibold text-[#00897b]">{admissionsLastMonth} last month</div>
        </div>
        <div className={card}>
          <div className={label}>PAST TARGET</div>
          <div className="text-3xl sm:text-4xl font-black text-[#00897b] my-2 tracking-tight">{pastTarget}</div>
          <div className="text-xs font-mono font-semibold text-[#00897b]">admissions that earn incentive</div>
        </div>
        <div className={card}>
          <div className={label}>FEES COLLECTED</div>
          <div className="text-3xl sm:text-4xl font-black text-[#00897b] my-2 tracking-tight">{inr(collectedThisMonth)}</div>
          <div className="text-xs font-mono font-semibold text-[#00897b]">from your students this month</div>
        </div>
        <div className={card}>
          <div className={label}>BRANCH RANK</div>
          <div className="text-3xl sm:text-4xl font-black text-[#00897b] my-2 tracking-tight">
            {branchRank ? `#${branchRank.rank}` : '—'}
          </div>
          <div className="text-xs font-mono font-semibold text-[#00897b]">
            {branchRank ? `of ${branchRank.of} counsellors by admissions` : 'no branch on your account'}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-bold text-slate-900">Incentive Earned This Month</span>
          <span className="text-xs font-mono text-slate-400 font-medium">last month {inr(earnedLastMonth)} at the current policy</span>
        </div>
        <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight pt-1">{inr(earned)}</div>
        <div className="text-xs font-mono text-slate-400 font-medium flex items-center gap-1.5 pt-1">
          <span className={`font-bold flex items-center ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {delta >= 0 ? <ChevronUp className="w-3.5 h-3.5 stroke-[3]" /> : <ChevronDown className="w-3.5 h-3.5 stroke-[3]" />}
            {Math.abs(delta)}
          </span>
          <span>admissions vs last month</span>
        </div>
      </div>

      {showBands && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-amber-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Incentive Bands</h3>
              </div>
              <button onClick={() => setShowBands(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold cursor-pointer">✕</button>
            </div>
            <p className="text-[11px] text-slate-500">Paid per admission past your target of {target || '—'}.</p>
            <div className="space-y-2.5 text-xs">
              {bands.map((b, idx) => {
                const active = nextBand && nextBand.id === b.id;
                return (
                  <div key={b.id || idx} className={`p-3 rounded-2xl border ${active ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900">{b.label || `Up to ${b.upTo} past target`}</span>
                      <span className="text-[#00897b] font-mono">{inr(b.rate)} / admission</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setShowBands(false)} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
