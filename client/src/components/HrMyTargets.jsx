import React, { useState, useEffect } from 'react';
import { 
  Award, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Sparkles, 
  ArrowUpRight, 
  ChevronRight,
  Info,
  Calculator,
  Gift
} from 'lucide-react';
import { getAdminSlabs, onDataUpdate } from '../services/api';

export default function HrMyTargets() {
  const [showSlabDetails, setShowSlabDetails] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [slabsList, setSlabsList] = useState([]);

  const loadSlabs = async () => {
    try {
      const data = await getAdminSlabs();
      if (Array.isArray(data) && data.length > 0) {
        setSlabsList(data.map(s => ({
          slab: s.slab,
          range: s.range,
          rate: s.labelRate || `₹${s.rate} / admission`,
          status: s.status,
          isCurrent: s.isCurrent
        })));
        return;
      }
    } catch (e) {
      console.warn('Live slabs fetch notice:', e.message);
    }
  };

  useEffect(() => {
    loadSlabs();
    const unsub = onDataUpdate((entity) => {
      if (entity === 'slabs') loadSlabs();
    });
    return unsub;
  }, []);

  const [incentivePolicy] = useState(() => {
    try {
      const saved = localStorage.getItem('thoughtflows_incentive_policy');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const activeSlab = slabsList.find(s => s.isCurrent) || slabsList[1] || slabsList[0] || {
    slab: 'Slab 2',
    range: '11 – 20 Admissions',
    rate: '₹700 / admission'
  };
  const currentTarget = incentivePolicy?.defaultTarget || 25;
  const currentRate = incentivePolicy?.bands?.[0]?.rate ? `₹${incentivePolicy.bands[0].rate} / lead` : activeSlab.rate;

  return (
    <div className="space-y-4 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-amber-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Title & Subtitle */}
      <div className="pt-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          My <span className="text-[#00897b]">Targets & Earnings</span>
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1 font-mono">
          Slab-based incentive · live tally · what unlocks the next tier
        </p>
      </div>

      {/* Golden Slab Banner */}
      <div className="bg-gradient-to-r from-[#ffe082] via-[#ffd54f] to-[#ffca28] rounded-2xl p-4 sm:p-5 text-amber-950 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-amber-300/80">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-600/20 border border-amber-600/30 flex items-center justify-center text-amber-900 flex-shrink-0">
            <Award className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold font-mono tracking-widest uppercase text-amber-900/90">
              TARGET POLICY · {currentTarget} ADMISSIONS
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-950 mt-0.5">
              {currentRate} · progressive past target ({currentTarget})
            </h3>
            <p className="text-xs text-amber-900/90 font-medium mt-0.5">
              Target banner synced in real-time with Admin Incentive Policy
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end flex-shrink-0 space-y-1.5">
          <div className="flex items-center justify-between w-full text-xs font-mono font-bold text-amber-950 gap-4">
            <span>— / —</span>
            <span className="text-amber-900 font-black cursor-pointer hover:underline" onClick={() => setShowSlabDetails(true)}>
              SLAB 3 →
            </span>
          </div>
          <div className="w-44 sm:w-52 h-2.5 bg-amber-950/20 rounded-full overflow-hidden">
            <div className="h-full bg-amber-950 rounded-full w-[45%]" />
          </div>
        </div>
      </div>

      {/* 4 Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
        {/* Card 1: BASE EARNINGS */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-cyan-500 flex flex-col justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            BASE EARNINGS
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 my-2">
            ₹0
          </div>
          <div className="text-xs text-emerald-600 font-mono font-medium">
            — × ₹700
          </div>
        </div>

        {/* Card 2: KT QUALITY BONUS */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-teal-500 flex flex-col justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            KT QUALITY BONUS
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-600 my-2">
            ₹0
          </div>
          <div className="text-xs text-emerald-600 font-mono font-medium">
            — score
          </div>
        </div>

        {/* Card 3: ZERO-MISS BONUS */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-teal-500 flex flex-col justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            ZERO-MISS BONUS
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-600 my-2">
            ₹500
          </div>
          <div className="text-xs text-emerald-600 font-mono font-medium">
            0 missed FUs
          </div>
        </div>

        {/* Card 4: CROSS-BRANCH REF */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-emerald-500 flex flex-col justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            CROSS-BRANCH REF
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-600 my-2">
            ₹300
          </div>
          <div className="text-xs text-emerald-600 font-mono font-medium">
            1 ref to Salem
          </div>
        </div>
      </div>

      {/* Large Total Earned This Month Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
            Total Earned This Month
          </span>
          <span className="text-xs text-slate-500 font-mono">
            ₹17,100 · est. ₹23,200 by month-end
          </span>
        </div>

        <div>
          <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
            ₹17,100
          </div>
          <p className="text-xs text-slate-500 font-mono mt-2">
            ↑ 18% vs last month · Rank 3 of 6 in Saravanampatti branch
          </p>
        </div>
      </div>

      {/* Floating Course Catalog Button */}
      <div className="pt-2">
        <button
          onClick={() => setShowCatalogModal(true)}
          className="flex items-center gap-2 bg-[#fef3c7] hover:bg-[#fde68a] text-[#92400e] border border-amber-300 font-bold text-xs py-2.5 px-4 rounded-full shadow-sm transition-all hover:scale-[1.02] active:scale-95"
        >
          <span>💡</span>
          <span>Course Catalog</span>
        </button>
      </div>

      {/* Slabs Breakdown Drawer / Modal */}
      {showSlabDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-amber-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Incentive Slabs Structure</h3>
              </div>
              <button
                onClick={() => setShowSlabDetails(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {slabsList.map((s, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border ${
                    s.isCurrent 
                      ? 'bg-amber-50 border-amber-300 shadow-xs' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900">{s.slab}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      s.isCurrent ? 'bg-amber-200 text-amber-950' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="text-slate-600 mt-0.5">{s.range}</div>
                  <div className="font-extrabold text-[#00897b] mt-1">{s.rate}</div>
                </div>
              ))}
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

      {/* Course Catalog Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-amber-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💡</span>
                <h3 className="font-extrabold text-slate-900 text-base">Thoughtflows Medical Coding Catalog</h3>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200">
                <div className="font-bold text-teal-950 text-sm">CPC Intensive (AAPC Certified)</div>
                <div className="text-teal-700 mt-0.5">Duration: 3 Months • Anatomy, ICD-10-CM, CPT, HCPCS Level II</div>
                <div className="text-teal-900 font-black mt-1">Fee: ₹25,000 (Incentive: ₹700 to ₹1,500)</div>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200">
                <div className="font-bold text-purple-950 text-sm">Comprehensive Medical Coding + Live Hospital Internship</div>
                <div className="text-purple-700 mt-0.5">Duration: 4.5 Months • US Healthcare RCM + Live EHR charting</div>
                <div className="text-purple-900 font-black mt-1">Fee: ₹32,000 (100% Placement Guarantee)</div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="font-bold text-amber-950 text-sm">Fast-Track Weekend Batch for Life Science Graduates</div>
                <div className="text-amber-700 mt-0.5">Duration: 8 Weeks • Saturday & Sunday • Mock Tests & AAPC Exam Prep</div>
                <div className="text-amber-900 font-black mt-1">Fee: ₹21,000</div>
              </div>
            </div>

            <button
              onClick={() => setShowCatalogModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all"
            >
              Close Catalog
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
