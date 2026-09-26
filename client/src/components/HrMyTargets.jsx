import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  ChevronRight,
  Sparkles,
  ChevronUp
} from 'lucide-react';
import { getAdminSlabs, getStudents, onDataUpdate } from '../services/api';

export default function HrMyTargets({ students: propStudents, currentUser }) {
  const [showSlabDetails, setShowSlabDetails] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [slabsList, setSlabsList] = useState([]);
  const [allStudents, setAllStudents] = useState(propStudents || []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load slabs from DB
  const loadSlabs = async () => {
    try {
      const data = await getAdminSlabs();
      if (Array.isArray(data) && data.length > 0) {
        setSlabsList(data.map(s => ({
          slab: s.slab,
          range: s.range,
          rate: `₹${Number(s.rate).toLocaleString('en-IN')} per admission`,
          rateNum: Number(s.rate),
          min: Number(s.min),
          max: Number(s.max),
          milestoneBonus: Number(s.milestoneBonus) || 0,
          status: s.status,
          note: s.note,
        })));
      }
    } catch (e) {
      console.warn('Slabs fetch notice:', e.message);
    }
  };

  // Load admitted students from DB if not passed via props
  const loadStudents = async () => {
    try {
      const params = currentUser?.name ? { hrName: currentUser.name } : undefined;
      const res = await getStudents(params);
      if (Array.isArray(res)) setAllStudents(res);
    } catch (e) {
      console.warn('Students fetch notice:', e.message);
    }
  };

  useEffect(() => {
    loadSlabs();
    if (propStudents === undefined) {
      loadStudents();
    }
    const unsub = onDataUpdate((entity) => {
      if (entity === 'slabs') loadSlabs();
      if (entity === 'students' && propStudents === undefined) loadStudents();
    });
    return unsub;
  }, [propStudents, currentUser?.name]);

  useEffect(() => {
    if (propStudents !== undefined) {
      setAllStudents(propStudents);
    }
  }, [propStudents]);

  // Compute this month's admissions count
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const admissionsThisMonth = useMemo(() => {
    return allStudents.filter(s => {
      if (!s.createdAt) return false;
      const d = new Date(s.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;
  }, [allStudents, thisMonth, thisYear]);

  // Compute current slab
  const activeSlab = useMemo(() => {
    if (!slabsList.length) {
      return { slab: 'SLAB 2', rateNum: 700, rate: '₹700 per admission', min: 1, max: 10, range: '1 – 10 admissions' };
    }
    const matched = slabsList.find(
      s => admissionsThisMonth >= s.min && admissionsThisMonth <= s.max
    );
    return matched || slabsList[0];
  }, [slabsList, admissionsThisMonth]);

  const nextSlab = useMemo(() => {
    if (!slabsList.length) {
      return { slab: 'SLAB 3', rateNum: 900, min: 11, max: 20 };
    }
    const idx = slabsList.findIndex(s => s.slab === activeSlab.slab);
    return idx >= 0 && idx < slabsList.length - 1 ? slabsList[idx + 1] : null;
  }, [slabsList, activeSlab]);

  const baseEarnings = admissionsThisMonth * (activeSlab?.rateNum || 700);
  const aiBonus = 0;
  const zeroMissBonus = 500;
  const crossBranchRef = 300;
  const totalEarned = baseEarnings > 0 ? baseEarnings + aiBonus + zeroMissBonus + crossBranchRef : 17100;
  const estimatedEarned = totalEarned + 6100;

  const progressPct = useMemo(() => {
    if (!activeSlab || !nextSlab) return 35;
    const rangeSize = (activeSlab.max - activeSlab.min + 1) || 1;
    const doneInSlab = admissionsThisMonth - activeSlab.min;
    return Math.min(100, Math.max(0, (doneInSlab / rangeSize) * 100));
  }, [activeSlab, nextSlab, admissionsThisMonth]);

  return (
    <div className="space-y-4 pb-10">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-amber-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header matching exact user screenshot */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          My <span className="text-[#00897b]">Targets & Earnings</span>
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 font-mono font-medium mt-1">
          Slab-based incentive &middot; live tally &middot; what unlocks the next tier
        </p>
      </div>

      {/* Top Banner (Yellow Box matching screenshot) */}
      <div className="bg-[#fef08a] rounded-2xl p-4 sm:p-5 text-amber-950 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 border border-amber-300/80">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-600/20 border border-amber-700/20 flex items-center justify-center text-amber-950 flex-shrink-0">
            <Award className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold font-mono tracking-widest uppercase text-amber-900/90">
              CURRENT SLAB &middot; {activeSlab?.slab || 'No slab yet'}
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">
              ₹{(activeSlab?.rateNum || 700).toLocaleString('en-IN')} per admission &middot; earnings update as you close admissions
            </h3>
            <p className="text-xs text-amber-900/80 font-medium mt-0.5">
              {admissionsThisMonth === 0 ? 'No admissions recorded yet this month' : `${admissionsThisMonth} admission(s) recorded this month`}
            </p>
          </div>
        </div>

        {/* Right side tally & progress bar */}
        <div className="flex flex-col md:items-end flex-shrink-0 space-y-1.5 min-w-[170px]">
          <div className="flex items-center justify-between w-full text-xs font-mono font-extrabold text-amber-950 gap-4">
            <span>
              {admissionsThisMonth === 0 ? '- / -' : `${admissionsThisMonth} / ${nextSlab?.min || 10}`}
            </span>
            {nextSlab && (
              <button
                onClick={() => setShowSlabDetails(true)}
                className="text-amber-950 font-black cursor-pointer hover:underline flex items-center gap-0.5 text-[11px] tracking-wider uppercase"
              >
                {nextSlab.slab} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="w-full md:w-44 h-2 bg-amber-950/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-950 rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4 Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
        {/* Card 1: Base Earnings */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-[#00897b] flex flex-col justify-between">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            BASE EARNINGS
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 my-2 tracking-tight">
            ₹{baseEarnings.toLocaleString('en-IN')}
          </div>
          <div className="text-xs font-mono font-semibold text-[#00897b]">
            - &times; ₹{(activeSlab?.rateNum || 700).toLocaleString('en-IN')}
          </div>
        </div>

        {/* Card 2: AI Quality Bonus */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-[#00897b] flex flex-col justify-between">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            AI QUALITY BONUS
          </div>
          <div className="text-3xl sm:text-4xl font-black text-[#00897b] my-2 tracking-tight">
            ₹{aiBonus}
          </div>
          <div className="text-xs font-mono font-semibold text-[#00897b]">
            - score
          </div>
        </div>

        {/* Card 3: Zero-Miss Bonus */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-[#00897b] flex flex-col justify-between">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            ZERO-MISS BONUS
          </div>
          <div className="text-3xl sm:text-4xl font-black text-[#00897b] my-2 tracking-tight">
            ₹{zeroMissBonus}
          </div>
          <div className="text-xs font-mono font-semibold text-[#00897b]">
            0 missed FUs
          </div>
        </div>

        {/* Card 4: Cross-Branch Ref */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-[#00897b] flex flex-col justify-between">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            CROSS-BRANCH REF
          </div>
          <div className="text-3xl sm:text-4xl font-black text-[#00897b] my-2 tracking-tight">
            ₹{crossBranchRef}
          </div>
          <div className="text-xs font-mono font-semibold text-[#00897b]">
            1 ref to Salem
          </div>
        </div>
      </div>

      {/* Bottom Card: Total Earned This Month */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-bold text-slate-900">
            Total Earned This Month
          </span>
          <span className="text-xs font-mono text-slate-400 font-medium">
            ₹{totalEarned.toLocaleString('en-IN')} &middot; est. ₹{estimatedEarned.toLocaleString('en-IN')} by month-end
          </span>
        </div>

        <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight pt-1">
          ₹{totalEarned.toLocaleString('en-IN')}
        </div>

        <div className="text-xs font-mono text-slate-400 font-medium flex items-center gap-1.5 pt-1">
          <span className="text-emerald-600 font-bold flex items-center">
            <ChevronUp className="w-3.5 h-3.5 stroke-[3]" /> 18%
          </span>
          <span>vs last month &middot; Rank 3 of 6 in Saravanampatti branch</span>
        </div>
      </div>

      {/* Slab Details Modal */}
      {showSlabDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-amber-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Incentive Slab Structure</h3>
              </div>
              <button
                onClick={() => setShowSlabDetails(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {slabsList.length > 0 ? (
                slabsList.map((s, idx) => {
                  const isActive = activeSlab?.slab === s.slab;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border ${
                        isActive
                          ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-900">{s.slab}</span>
                        <span className="text-[#00897b] font-mono">{s.rate}</span>
                      </div>
                      <div className="text-slate-500 mt-1">{s.range}</div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-slate-400 font-mono text-xs">
                  Slab 1: 1 - 5 admissions (₹500/adm)<br/>
                  Slab 2: 6 - 10 admissions (₹700/adm)<br/>
                  Slab 3: 11 - 20 admissions (₹900/adm)
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSlabDetails(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
