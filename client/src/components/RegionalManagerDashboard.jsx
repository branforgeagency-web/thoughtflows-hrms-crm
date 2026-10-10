import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, Info, Building2, MapPin, Users, GraduationCap, CheckCircle2 } from 'lucide-react';
import { getLeads, getStudents, getBranches } from '../services/api';

const REGIONAL_ZONES_CONFIG = [
  {
    id: 'gayathri',
    name: 'Gayathri',
    initial: 'G',
    role: 'Regional Manager',
    regionName: 'Coimbatore Zone-1',
    code: 'REG-CBE-Z1',
    subBranchesText: 'Saravanampatti, Gandhipuram, Salem',
    branchMatcher: (name = '', city = '') => /saravanampatti|gandhipuram|salem/i.test(`${name} ${city}`),
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
    noticeText: "Live regional overview for Coimbatore Zone-1 — branch staff, leads, and student enrolments pulled in real-time from MongoDB."
  },
  {
    id: 'sruthi',
    name: 'Sruthi',
    initial: 'S',
    role: 'Regional Manager',
    regionName: 'Coimbatore Zone-2',
    code: 'REG-CBE-Z2',
    subBranchesText: 'Tiruppur, Erode, Karur',
    branchMatcher: (name = '', city = '') => /tiruppur|erode|karur/i.test(`${name} ${city}`),
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
    noticeText: "Live regional overview for Coimbatore Zone-2 — branch staff, leads, and student enrolments pulled in real-time from MongoDB."
  },
  {
    id: 'aswanth',
    name: 'Aswanth',
    initial: 'A',
    role: 'Regional Manager',
    regionName: 'Kerala',
    code: 'REG-KL-001',
    subBranchesText: 'Kochi, Trivandrum, Calicut',
    branchMatcher: (name = '', city = '') => /kerala|kochi|trivandrum|calicut/i.test(`${name} ${city}`),
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
    noticeText: "Live regional overview for Kerala — branch staff, leads, and student enrolments pulled in real-time from MongoDB."
  },
  {
    id: 'lokesh',
    name: 'Lokesh',
    initial: 'L',
    role: 'Regional Manager',
    regionName: 'AP / Telangana',
    code: 'REG-AP-TG',
    subBranchesText: 'Madhapur, Dilsukhnagar, Vijayawada, Vizag',
    branchMatcher: (name = '', city = '') => /telangana|andhra|hyderabad|madhapur|dilsukhnagar|vijayawada|vizag/i.test(`${name} ${city}`),
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
    noticeText: "Live regional overview for AP & Telangana — branch staff, leads, and student enrolments pulled in real-time from MongoDB."
  }
];

export default function RegionalManagerDashboard({
  onBack,
  initialManagerId = null,
  liveBranches = [],
  onSelectBranch
}) {
  const [selectedManagerId, setSelectedManagerId] = useState(initialManagerId);
  const [branches, setBranches] = useState(liveBranches || []);
  const [leads, setLeads] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchLiveData = async () => {
      try {
        const [bRes, lRes, sRes] = await Promise.all([
          liveBranches?.length ? Promise.resolve(liveBranches) : getBranches().catch(() => []),
          getLeads().catch(() => ({ leads: [] })),
          getStudents().catch(() => [])
        ]);
        if (!isMounted) return;
        setBranches(Array.isArray(bRes) ? bRes : []);
        setLeads(Array.isArray(lRes?.leads) ? lRes.leads : Array.isArray(lRes) ? lRes : []);
        setStudents(Array.isArray(sRes) ? sRes : []);
      } catch (err) {
        console.warn('Regional live data error', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchLiveData();
    return () => { isMounted = false; };
  }, [liveBranches]);

  // Compute live regional managers data from actual MongoDB records
  const managersData = useMemo(() => {
    return REGIONAL_ZONES_CONFIG.map((cfg) => {
      const matchedBranches = branches.filter((b) => cfg.branchMatcher(b.name, b.city || b.state));
      
      const computedBranches = matchedBranches.map((b) => {
        const branchLeads = leads.filter((l) => (l.branch || '').toLowerCase().includes((b.name || '').toLowerCase()));
        const branchStudents = students.filter((s) => (s.location || s.branch || '').toLowerCase().includes((b.name || '').toLowerCase()));
        const totalAdmissions = branchStudents.length > 0 ? branchStudents.length : (b.activeStudents || 0);
        const convRate = branchLeads.length > 0
          ? `${Math.round((totalAdmissions / branchLeads.length) * 100)}%`
          : (totalAdmissions > 0 ? '100%' : '—');

        return {
          id: b._id || b.id || b.name,
          name: b.name,
          city: b.city || b.state || 'India',
          hrs: b.staffCount || 0,
          leads: branchLeads.length,
          admissions: totalAdmissions,
          conversion: convRate,
          badge: b.name.includes('Gandhipuram') ? '50–50 SHARED' : null,
          rawBranch: b
        };
      });

      const totalHrs = computedBranches.reduce((sum, b) => sum + (b.hrs || 0), 0);
      const totalLeads = computedBranches.reduce((sum, b) => sum + (b.leads || 0), 0);
      const totalAdmits = computedBranches.reduce((sum, b) => sum + (b.admissions || 0), 0);

      return {
        ...cfg,
        branchesCount: computedBranches.length,
        hrsCount: totalHrs,
        activeLeadsCount: totalLeads,
        admitsCount: totalAdmits,
        branches: computedBranches
      };
    });
  }, [branches, leads, students]);

  // Selected manager object
  const selectedManager = useMemo(() => {
    if (!selectedManagerId) return null;
    return managersData.find(m => m.id === selectedManagerId) || managersData[0];
  }, [selectedManagerId, managersData]);

  // Handle opening branch detail if passed
  const handleBranchClick = (branchItem) => {
    if (onSelectBranch) {
      onSelectBranch(branchItem.rawBranch || branchItem);
    }
  };

  // If no manager is selected, render Regional Managers Grid View
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
            <p className="font-mono text-xs text-slate-500 tracking-wider mt-1 flex items-center gap-2">
              <span>{managersData.length} regional zones</span>
              <span className="text-slate-300">·</span>
              <span>live stats connected to MongoDB</span>
            </p>
          </div>

          {/* Grid of Manager Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {managersData.map((manager) => (
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
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                      {manager.code}
                    </span>
                  </div>

                  {/* Manager Name & Region */}
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                      {manager.name}
                    </h3>
                    <p className="font-mono text-xs text-slate-400 mt-0.5 tracking-wide">
                      {manager.regionName}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {manager.subBranchesText}
                    </p>
                  </div>
                </div>

                {/* Bottom Metrics Bar */}
                <div className="border-t border-slate-100/80 px-6 py-3.5 bg-slate-50/40 grid grid-cols-3 text-center">
                  <div>
                    <div className={`text-lg font-extrabold ${manager.theme.textAccent} leading-none`}>
                      {loading ? '…' : manager.branchesCount}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider mt-1">
                      BRANCHES
                    </div>
                  </div>
                  <div>
                    <div className={`text-lg font-extrabold ${manager.theme.textAccent} leading-none`}>
                      {loading ? '…' : manager.hrsCount}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider mt-1">
                      STAFF
                    </div>
                  </div>
                  <div>
                    <div className={`text-lg font-extrabold ${manager.theme.textAccent} leading-none`}>
                      {loading ? '…' : manager.admitsCount}
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

  // Render Regional Manager Detail View
  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8 font-sans text-slate-800 animate-fadeIn">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Back Button */}
        <div>
          <button
            onClick={() => setSelectedManagerId(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
            All regions
          </button>
        </div>

        {/* Manager Banner Header Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-4">
            {/* Avatar Circle with Initial */}
            <div className={`w-12 h-12 rounded-full ${selectedManager.theme.avatarBg} text-white font-extrabold text-lg flex items-center justify-center flex-shrink-0 shadow-xs`}>
              {selectedManager.initial}
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {selectedManager.name}
              </h2>
              <p className="font-mono text-xs text-slate-500 tracking-wide mt-0.5">
                Regional Manager · {selectedManager.regionName} · {selectedManager.code}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedManager.subBranchesText}
              </p>
            </div>
          </div>

          {/* Right Icon Box */}
          <div className={`w-10 h-10 rounded-xl ${selectedManager.theme.iconBoxBg} flex items-center justify-center text-white shadow-xs flex-shrink-0`}>
            <MapPin className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* 4 KPI Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {loading ? '…' : selectedManager.branchesCount}
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 font-mono tracking-wider uppercase mt-1">
              BRANCHES
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {loading ? '…' : selectedManager.hrsCount}
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 font-mono tracking-wider uppercase mt-1">
              TOTAL STAFF
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {loading ? '…' : selectedManager.activeLeadsCount}
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 font-mono tracking-wider uppercase mt-1">
              ACTIVE LEADS
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {loading ? '…' : selectedManager.admitsCount}
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 font-mono tracking-wider uppercase mt-1">
              ADMISSIONS
            </div>
          </div>
        </div>

        {/* Branches Table Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-base">🏢</span>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                Branches in {selectedManager.regionName}
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Click any branch to view details
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                  <th className="py-2.5 px-2">BRANCH</th>
                  <th className="py-2.5 px-2">LOCATION</th>
                  <th className="py-2.5 px-2">STAFF</th>
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
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-2 font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
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
