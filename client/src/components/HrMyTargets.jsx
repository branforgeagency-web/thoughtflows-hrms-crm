import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  TrendingUp,
  Sparkles,
  AlertCircle,
  ChevronRight,
  Users
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

  // Sync prop students when parent updates
  useEffect(() => {
    if (propStudents !== undefined) {
      setAllStudents(propStudents);
    }
  }, [propStudents]);

  // ── Compute this month's admissions count (all students this month) ──────
  const now = new Date();
  const thisMonth = now.getMonth();      // 0-based
  const thisYear = now.getFullYear();

  const admissionsThisMonth = useMemo(() => {
    return allStudents.filter(s => {
      if (!s.createdAt) return false;
      const d = new Date(s.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;
  }, [allStudents, thisMonth, thisYear]);

  // ── Compute current slab from actual count ───────────────────────────────
  const activeSlab = useMemo(() => {
    if (!slabsList.length) return null;
    // Find the slab the HR currently falls into based on real admissions
    const matched = slabsList.find(
      s => admissionsThisMonth >= s.min && admissionsThisMonth <= s.max
    );
    // If 0 admissions, show slab 1 as the one they're working towards
    return matched || slabsList[0];
  }, [slabsList, admissionsThisMonth]);

  // ── Next slab to unlock ──────────────────────────────────────────────────
  const nextSlab = useMemo(() => {
    if (!activeSlab || !slabsList.length) return null;
    const idx = slabsList.findIndex(s => s.slab === activeSlab.slab);
    return idx >= 0 && idx < slabsList.length - 1 ? slabsList[idx + 1] : null;
  }, [slabsList, activeSlab]);

  // ── Real earnings = admissionsThisMonth × current slab rate ─────────────
  const baseEarnings = admissionsThisMonth * (activeSlab?.rateNum || 0);

  // ── Progress toward next slab ────────────────────────────────────────────
  const progressPct = useMemo(() => {
    if (!activeSlab || !nextSlab) return 100;
    const rangeSize = activeSlab.max - activeSlab.min + 1;
    const doneInSlab = admissionsThisMonth - activeSlab.min;
    return Math.min(100, Math.max(0, (doneInSlab / rangeSize) * 100));
  }, [activeSlab, nextSlab, admissionsThisMonth]);

  // ── Month label ──────────────────────────────────────────────────────────
  const monthLabel = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4 pb-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-amber-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Title */}
      <div className="pt-1 border-b border-slate-200/80 pb-3">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          My <span className="text-[#00897b]">Targets & Earnings</span>
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1 font-mono">
          Slab-based incentive · {monthLabel} · earnings update as you close admissions
        </p>
      </div>

      {/* ── Current Slab Banner ───────────────────────────────────────────── */}
      {activeSlab ? (
        <div className="bg-gradient-to-r from-[#ffe082] via-[#ffd54f] to-[#ffca28] rounded-2xl p-4 sm:p-5 text-amber-950 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-amber-300/80">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-600/20 border border-amber-600/30 flex items-center justify-center text-amber-900 flex-shrink-0">
              <Award className="w-7 h-7 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-[10px] font-extrabold font-mono tracking-widest uppercase text-amber-900/90">
                Current Slab · {activeSlab.slab}
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-950 mt-0.5">
                {activeSlab.rate} · {activeSlab.status}
              </h3>
              <p className="text-xs text-amber-900/90 font-medium mt-0.5">
                {activeSlab.range} · {activeSlab.note}
              </p>
            </div>
          </div>

          {/* Progress toward next slab */}
          <div className="flex flex-col items-end flex-shrink-0 space-y-1.5 min-w-[160px]">
            <div className="flex items-center justify-between w-full text-xs font-mono font-bold text-amber-950 gap-3">
              <span>
                {admissionsThisMonth === 0
                  ? 'No admissions yet'
                  : `${admissionsThisMonth} admission${admissionsThisMonth !== 1 ? 's' : ''}`}
              </span>
              {nextSlab && (
                <button
                  onClick={() => setShowSlabDetails(true)}
                  className="text-amber-900 font-black cursor-pointer hover:underline flex items-center gap-0.5"
                >
                  {nextSlab.slab} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="w-full h-2.5 bg-amber-950/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-950 rounded-full transition-all duration-700"
                style={{ width: admissionsThisMonth === 0 ? '0%' : `${progressPct}%` }}
              />
            </div>
            {nextSlab && (
              <div className="text-[10px] text-amber-900/80 font-mono text-right">
                {admissionsThisMonth === 0
                  ? `Reach ${nextSlab.min} admissions to unlock ${nextSlab.slab}`
                  : `${nextSlab.min - admissionsThisMonth} more to unlock ${nextSlab.slab} (₹${nextSlab.rateNum.toLocaleString('en-IN')}/adm)`}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-100 rounded-2xl p-5 text-slate-500 text-sm flex items-center gap-3 border border-slate-200">
          <AlertCircle className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <span>Incentive slab policy not configured yet. Ask admin to set up slabs.</span>
        </div>
      )}

      {/* ── 3 Metric Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">

        {/* Card 1: Admissions This Month */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-cyan-500 flex flex-col justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            ADMISSIONS THIS MONTH
          </div>
          <div className="text-4xl sm:text-5xl font-black text-slate-900 my-2">
            {admissionsThisMonth}
          </div>
          <div className="text-xs text-slate-500 font-mono font-medium">
            {admissionsThisMonth === 0
              ? 'No admissions recorded yet this month'
              : `${admissionsThisMonth} student${admissionsThisMonth !== 1 ? 's' : ''} admitted in ${monthLabel}`}
          </div>
        </div>

        {/* Card 2: Base Earnings */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-teal-500 flex flex-col justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            BASE EARNINGS
          </div>
          <div className={`text-4xl sm:text-5xl font-black my-2 ${baseEarnings > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
            ₹{baseEarnings.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 font-mono font-medium">
            {admissionsThisMonth === 0
              ? `₹0 · ${activeSlab?.rate || '—'} starts from first admission`
              : `${admissionsThisMonth} × ₹${(activeSlab?.rateNum || 0).toLocaleString('en-IN')}`}
          </div>
        </div>

        {/* Card 3: Current Slab Rate */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-amber-500 flex flex-col justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            RATE PER ADMISSION
          </div>
          <div className={`text-4xl sm:text-5xl font-black my-2 ${activeSlab ? 'text-amber-700' : 'text-slate-400'}`}>
            {activeSlab ? `₹${activeSlab.rateNum.toLocaleString('en-IN')}` : '—'}
          </div>
          <div className="text-xs text-slate-500 font-mono font-medium">
            {activeSlab ? `${activeSlab.slab} · ${activeSlab.range}` : 'No slab configured'}
          </div>
        </div>
      </div>

      {/* ── Earnings Summary Card ─────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
            Total Earnings This Month
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {monthLabel}
          </span>
        </div>

        {admissionsThisMonth === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Users className="w-7 h-7 text-slate-300" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-300">₹0</div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                No admissions recorded yet this month.<br />
                Earnings will update as you close admissions.
              </p>
            </div>
            {activeSlab && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-2 text-xs text-teal-800 font-semibold">
                🎯 Your first admission earns <strong>₹{activeSlab.rateNum.toLocaleString('en-IN')}</strong> — close it today!
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
              ₹{baseEarnings.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 font-mono mt-2">
              {admissionsThisMonth} admission{admissionsThisMonth !== 1 ? 's' : ''} × ₹{(activeSlab?.rateNum || 0).toLocaleString('en-IN')} ({activeSlab?.slab})
            </p>
            {nextSlab && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-900 font-semibold">
                📈 Close {nextSlab.min - admissionsThisMonth} more admission{nextSlab.min - admissionsThisMonth !== 1 ? 's' : ''} to unlock <strong>{nextSlab.slab} (₹{nextSlab.rateNum.toLocaleString('en-IN')}/adm)</strong>
              </div>
            )}
            {activeSlab?.milestoneBonus > 0 && (
              <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs text-emerald-800 font-semibold">
                🏆 Milestone Bonus: <strong>₹{activeSlab.milestoneBonus.toLocaleString('en-IN')}</strong> unlocked at {activeSlab.max}+ admissions
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Slab Details Modal ────────────────────────────────────────────── */}
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
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {slabsList.map((s, idx) => {
                const isActive = activeSlab?.slab === s.slab;
                const isDone = activeSlab && slabsList.indexOf(s) < slabsList.indexOf(activeSlab);
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border ${
                      isActive
                        ? 'bg-amber-50 border-amber-300 shadow-xs ring-1 ring-amber-400'
                        : isDone
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900">{s.slab}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-amber-200 text-amber-950'
                          : isDone
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-slate-200 text-slate-700'
                      }`}>
                        {isActive ? '● Current' : isDone ? '✓ Passed' : s.status}
                      </span>
                    </div>
                    <div className="text-slate-600 mt-0.5">{s.range}</div>
                    <div className="font-extrabold text-[#00897b] mt-1">{s.rate}</div>
                    {s.milestoneBonus > 0 && (
                      <div className="text-emerald-700 font-semibold mt-0.5">
                        + ₹{s.milestoneBonus.toLocaleString('en-IN')} milestone bonus
                      </div>
                    )}
                    {s.note && <div className="text-slate-400 text-[10px] mt-0.5 italic">{s.note}</div>}
                  </div>
                );
              })}
            </div>

            <div className="text-[11px] text-slate-400 font-mono text-center">
              Your count this month: <strong className="text-slate-700">{admissionsThisMonth} admissions</strong>
            </div>

            <button
              onClick={() => setShowSlabDetails(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
