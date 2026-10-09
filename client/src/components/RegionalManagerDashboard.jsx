import React, { useState, useMemo } from 'react';
import { ChevronLeft, Info, Building2, MapPin, Users, GraduationCap, CheckCircle2 } from 'lucide-react';

export const REGIONAL_MANAGERS_DATA = [
  {
    id: 'gayathri',
    name: 'Gayathri',
    initial: 'G',
    role: 'Regional Manager',
    regionName: 'Coimbatore Zone-1',
    code: 'REG-CBE-Z1',
    subBranchesText: 'Saravanampatti, Gandhipuram (50%), Salem',
    theme: {
      accentColor: '#2563EB',
      topBorder: 'bg-blue-600',
      badgeBg: 'bg-blue-600',
      bgLight: 'bg-blue-50/70',
      borderLight: 'border-blue-100',
      textAccent: 'text-blue-600',
      glowBg: 'from-blue-400/20 to-transparent',
      avatarBg: 'bg-blue-600',
      iconBoxBg: 'bg-blue-600'
    },
    branchesCount: 3,
    hrsCount: 12,
    activeLeadsCount: 124,
    admitsCount: 151,
    branches: [
      {
        id: 'cbe-saravanampatti',
        name: 'CBE-Saravanampatti',
        city: 'Coimbatore',
        hrs: 5,
        leads: 47,
        admissions: 61,
        conversion: '38%',
        badge: null
      },
      {
        id: 'cbe-gandhipuram',
        name: 'CBE-Gandhipuram',
        city: 'Coimbatore',
        hrs: 4,
        leads: 41,
        admissions: 48,
        conversion: '34%',
        badge: '50–50 SHARED'
      },
      {
        id: 'salem',
        name: 'Salem',
        city: 'Tamil Nadu',
        hrs: 3,
        leads: 36,
        admissions: 42,
        conversion: '28%',
        badge: null
      }
    ],
    noticeText: "This is Gayathri's regional view — the branches, staff and performance for Coimbatore Zone-1. Branch-level staff (HRs, trainers) and live attendance roll up here once we add the people list."
  },
  {
    id: 'sruthi',
    name: 'Sruthi',
    initial: 'S',
    role: 'Regional Manager',
    regionName: 'Coimbatore Zone-2',
    code: 'REG-CBE-Z2',
    subBranchesText: 'Tiruppur, Erode, Karur',
    theme: {
      accentColor: '#9333EA',
      topBorder: 'bg-purple-600',
      badgeBg: 'bg-purple-600',
      bgLight: 'bg-purple-50/70',
      borderLight: 'border-purple-100',
      textAccent: 'text-purple-600',
      glowBg: 'from-purple-400/20 to-transparent',
      avatarBg: 'bg-purple-600',
      iconBoxBg: 'bg-purple-600'
    },
    branchesCount: 3,
    hrsCount: 11,
    activeLeadsCount: 118,
    admitsCount: 127,
    branches: [
      {
        id: 'cbe-tiruppur',
        name: 'CBE-Tiruppur',
        city: 'Tiruppur',
        hrs: 4,
        leads: 42,
        admissions: 45,
        conversion: '35%',
        badge: null
      },
      {
        id: 'cbe-erode',
        name: 'CBE-Erode',
        city: 'Erode',
        hrs: 4,
        leads: 40,
        admissions: 44,
        conversion: '32%',
        badge: null
      },
      {
        id: 'cbe-karur',
        name: 'CBE-Karur',
        city: 'Karur',
        hrs: 3,
        leads: 36,
        admissions: 38,
        conversion: '29%',
        badge: null
      }
    ],
    noticeText: "This is Sruthi's regional view — the branches, staff and performance for Coimbatore Zone-2. Branch-level staff (HRs, trainers) and live attendance roll up here once we add the people list."
  },
  {
    id: 'aswanth',
    name: 'Aswanth',
    initial: 'A',
    role: 'Regional Manager',
    regionName: 'Kerala',
    code: 'REG-KL-001',
    subBranchesText: 'Kochi, Trivandrum',
    theme: {
      accentColor: '#16A34A',
      topBorder: 'bg-emerald-600',
      badgeBg: 'bg-emerald-600',
      bgLight: 'bg-emerald-50/70',
      borderLight: 'border-emerald-100',
      textAccent: 'text-emerald-600',
      glowBg: 'from-emerald-400/20 to-transparent',
      avatarBg: 'bg-emerald-600',
      iconBoxBg: 'bg-emerald-600'
    },
    branchesCount: 2,
    hrsCount: 6,
    activeLeadsCount: 58,
    admitsCount: 64,
    branches: [
      {
        id: 'kochi',
        name: 'Kochi',
        city: 'Kochi',
        hrs: 3,
        leads: 32,
        admissions: 35,
        conversion: '31%',
        badge: null
      },
      {
        id: 'trivandrum',
        name: 'Trivandrum',
        city: 'Trivandrum',
        hrs: 3,
        leads: 26,
        admissions: 29,
        conversion: '27%',
        badge: null
      }
    ],
    noticeText: "This is Aswanth's regional view — the branches, staff and performance for Kerala. Branch-level staff (HRs, trainers) and live attendance roll up here once we add the people list."
  },
  {
    id: 'lokesh',
    name: 'Lokesh',
    initial: 'L',
    role: 'Regional Manager',
    regionName: 'AP / Telangana',
    code: 'REG-AP-TG',
    subBranchesText: 'Madhapur, Dilsukhnagar, Vijayawada, Vizag',
    theme: {
      accentColor: '#EA580C',
      topBorder: 'bg-orange-600',
      badgeBg: 'bg-orange-600',
      bgLight: 'bg-orange-50/70',
      borderLight: 'border-orange-100',
      textAccent: 'text-orange-600',
      glowBg: 'from-orange-400/20 to-transparent',
      avatarBg: 'bg-orange-600',
      iconBoxBg: 'bg-orange-600'
    },
    branchesCount: 4,
    hrsCount: 17,
    activeLeadsCount: 135,
    admitsCount: 146,
    branches: [
      {
        id: 'hyd-madhapur',
        name: 'Hyderabad - Madhapur',
        city: 'Hyderabad',
        hrs: 5,
        leads: 42,
        admissions: 46,
        conversion: '36%',
        badge: null
      },
      {
        id: 'hyd-dilsukhnagar',
        name: 'Hyderabad - Dilsukhnagar',
        city: 'Hyderabad',
        hrs: 4,
        leads: 35,
        admissions: 38,
        conversion: '33%',
        badge: null
      },
      {
        id: 'vijayawada',
        name: 'Vijayawada',
        city: 'Vijayawada',
        hrs: 4,
        leads: 31,
        admissions: 34,
        conversion: '30%',
        badge: null
      },
      {
        id: 'vizag',
        name: 'Vizag',
        city: 'Visakhapatnam',
        hrs: 4,
        leads: 27,
        admissions: 28,
        conversion: '26%',
        badge: null
      }
    ],
    noticeText: "This is Lokesh's regional view — the branches, staff and performance for AP / Telangana. Branch-level staff (HRs, trainers) and live attendance roll up here once we add the people list."
  }
];

export default function RegionalManagerDashboard({
  onBack,
  initialManagerId = null,
  liveBranches = [],
  onSelectBranch
}) {
  const [selectedManagerId, setSelectedManagerId] = useState(initialManagerId);

  // Selected manager object
  const selectedManager = useMemo(() => {
    if (!selectedManagerId) return null;
    return REGIONAL_MANAGERS_DATA.find(m => m.id === selectedManagerId) || REGIONAL_MANAGERS_DATA[0];
  }, [selectedManagerId]);

  // Handle opening branch detail if passed
  const handleBranchClick = (branch) => {
    if (onSelectBranch) {
      onSelectBranch(branch);
    }
  };

  // If no manager is selected, render Image 1: Regional Managers Grid View
  if (!selectedManager) {
    return (
      <div className="w-full min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8 font-sans text-slate-800 animate-fadeIn">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Back Button */}
          <div>
            <button
              onClick={() => onBack && onBack()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
              Back to roles
            </button>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Regional Managers</h1>
            <p className="font-mono text-xs text-slate-500 tracking-wider mt-1">
              Pick a region to open its manager dashboard
            </p>
          </div>

          {/* Grid of Manager Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {REGIONAL_MANAGERS_DATA.map((manager) => (
              <div
                key={manager.id}
                onClick={() => setSelectedManagerId(manager.id)}
                className="group relative bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden cursor-pointer flex flex-col justify-between"
              >
                {/* Top Colored Border Bar */}
                <div className={`h-1.5 w-full ${manager.theme.topBorder}`} />

                {/* Top-Right Soft Glow Accent */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-radial ${manager.theme.glowBg} rounded-full blur-xl pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity`} />

                <div className="p-6">
                  {/* Top Left Icon Square */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 rounded-2xl ${manager.theme.iconBoxBg} flex items-center justify-center text-white shadow-xs`}>
                      <div className="w-3.5 h-3.5 border-2 border-white/90 rounded-xs bg-white/30" />
                    </div>
                  </div>

                  {/* Manager Name & Region */}
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                      {manager.name}
                    </h3>
                    <p className="font-mono text-xs text-slate-400 mt-0.5 tracking-wide">
                      {manager.regionName}
                    </p>
                  </div>
                </div>

                {/* Bottom Metrics Bar */}
                <div className="border-t border-slate-100/80 px-6 py-3.5 bg-slate-50/40 grid grid-cols-3 text-center">
                  <div>
                    <div className={`text-lg font-extrabold ${manager.theme.textAccent} leading-none`}>
                      {manager.branchesCount}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider mt-1">
                      BRANCHES
                    </div>
                  </div>
                  <div>
                    <div className={`text-lg font-extrabold ${manager.theme.textAccent} leading-none`}>
                      {manager.hrsCount}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider mt-1">
                      HRS
                    </div>
                  </div>
                  <div>
                    <div className={`text-lg font-extrabold ${manager.theme.textAccent} leading-none`}>
                      {manager.admitsCount}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider mt-1">
                      ADMITS
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render Image 2: Regional Manager Detail View
  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8 font-sans text-slate-800 animate-fadeIn">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back Button to list */}
        <div>
          <button
            onClick={() => setSelectedManagerId(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
            All regional heads
          </button>
        </div>

        {/* Manager Banner Card */}
        <div className="relative bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex items-center justify-between overflow-hidden">
          {/* Left accent line */}
          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${selectedManager.theme.badgeBg}`} />

          <div className="flex items-center gap-4 pl-2">
            {/* Avatar Circle */}
            <div className={`w-12 h-12 rounded-2xl ${selectedManager.theme.avatarBg} text-white font-extrabold text-xl flex items-center justify-center shadow-xs flex-shrink-0`}>
              {selectedManager.initial}
            </div>

            {/* Info */}
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {selectedManager.name}
              </h2>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                Regional Manager · {selectedManager.regionName} · {selectedManager.code}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedManager.subBranchesText}
              </p>
            </div>
          </div>

          {/* Right Icon Box */}
          <div className={`w-10 h-10 rounded-xl ${selectedManager.theme.iconBoxBg} flex items-center justify-center text-white shadow-xs flex-shrink-0`}>
            <div className="w-4 h-4 border-2 border-white/90 rounded-xs bg-white/30" />
          </div>
        </div>

        {/* 4 KPI Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {selectedManager.branchesCount}
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 font-mono tracking-wider uppercase mt-1">
              BRANCHES
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {selectedManager.hrsCount}
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 font-mono tracking-wider uppercase mt-1">
              HRS
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {selectedManager.activeLeadsCount}
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 font-mono tracking-wider uppercase mt-1">
              ACTIVE LEADS
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {selectedManager.admitsCount}
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 font-mono tracking-wider uppercase mt-1">
              ADMISSIONS
            </div>
          </div>
        </div>

        {/* Branches Table Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base">🏢</span>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
              Branches in {selectedManager.regionName}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                  <th className="py-2.5 px-2">BRANCH</th>
                  <th className="py-2.5 px-2">CITY</th>
                  <th className="py-2.5 px-2">HRS</th>
                  <th className="py-2.5 px-2">LEADS</th>
                  <th className="py-2.5 px-2">ADMISSIONS</th>
                  <th className="py-2.5 px-2">CONVERSION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedManager.branches.map((branch) => (
                  <tr
                    key={branch.id}
                    onClick={() => handleBranchClick(branch)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-2 font-extrabold text-slate-900">
                      <div className="inline-flex items-center gap-2 flex-wrap">
                        <span>{branch.name}</span>
                        {branch.badge && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold font-mono uppercase tracking-wide">
                            {branch.badge}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-slate-600 font-medium">
                      {branch.city}
                    </td>
                    <td className="py-3 px-2 font-semibold text-slate-700">
                      {branch.hrs}
                    </td>
                    <td className="py-3 px-2 font-semibold text-slate-700">
                      {branch.leads}
                    </td>
                    <td className="py-3 px-2 font-semibold text-slate-700">
                      {branch.admissions}
                    </td>
                    <td className="py-3 px-2 font-semibold text-slate-900">
                      {branch.conversion}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Notice Banner */}
        <div className="bg-blue-50/70 border border-blue-150 rounded-xl px-4 py-3 text-xs text-blue-800 flex items-start sm:items-center gap-3">
          <div className="w-4 h-4 bg-blue-600 text-white rounded text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
            ℹ
          </div>
          <p className="leading-relaxed">
            {selectedManager.noticeText}
          </p>
        </div>
      </div>
    </div>
  );
}
