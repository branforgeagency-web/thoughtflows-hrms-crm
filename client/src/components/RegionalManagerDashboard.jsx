import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, MapPin, Users, Building2, Search, CheckCircle2, UserCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { getBranches, getAdminUsers } from '../services/api';

// Distinctive color themes dynamically assigned across regions
const REGION_THEMES = [
  {
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
  {
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
  {
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
  {
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
  {
    accentColor: '#0D9488',
    topBorder: 'bg-teal-600',
    badgeBg: 'bg-teal-600',
    bgLight: 'bg-teal-50/70',
    borderLight: 'border-teal-100',
    textAccent: 'text-teal-600',
    glowBg: 'from-teal-400/20 to-transparent',
    avatarBg: 'bg-teal-600',
    iconBoxBg: 'bg-teal-600'
  },
  {
    accentColor: '#E11D48',
    topBorder: 'bg-rose-600',
    badgeBg: 'bg-rose-600',
    bgLight: 'bg-rose-50/70',
    borderLight: 'border-rose-100',
    textAccent: 'text-rose-600',
    glowBg: 'from-rose-400/20 to-transparent',
    avatarBg: 'bg-rose-600',
    iconBoxBg: 'bg-rose-600'
  }
];

// Helper to generate a clean region code dynamically from region name
const getRegionCode = (regionName = '') => {
  const clean = regionName.trim();
  const words = clean.split(/[\s-]+/).filter(Boolean);
  if (words.length >= 2) {
    const letters = words.map(w => w[0].toUpperCase()).join('');
    return `REG-${letters}`;
  }
  const firstLetters = clean.slice(0, 3).toUpperCase();
  return `REG-${firstLetters}`;
};

// Check if any registered user has been designated as Regional Manager for this region
const findRegionalManagerForRegion = (regionName, regionBranches, users = []) => {
  if (!users?.length) return null;
  const regLower = regionName.toLowerCase();
  const branchNamesLower = regionBranches.map(b => (b.name || '').toLowerCase());

  return users.find(u => {
    const role = (u.role || '').toLowerCase();
    const isRegionalRole = role.includes('regional manager') || role.includes('regional head') || role.includes('regional lead');
    if (!isRegionalRole) return false;

    const userBranch = (u.branch || '').toLowerCase();
    if (userBranch.includes(regLower) || regLower.includes(userBranch)) return true;
    if (branchNamesLower.some(bn => userBranch.includes(bn) || bn.includes(userBranch))) return true;
    return false;
  }) || null;
};

export default function RegionalManagerDashboard({
  onBack,
  initialManagerId = null,
  liveBranches = [],
  onSelectBranch,
  currentUser = null
}) {
  const [selectedRegionId, setSelectedRegionId] = useState(initialManagerId);
  const [branches, setBranches] = useState(Array.isArray(liveBranches) ? liveBranches : []);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(!liveBranches || liveBranches.length === 0);
  const [searchQuery, setSearchQuery] = useState('');

  // Keep selected region in sync if parent changes initialManagerId
  useEffect(() => {
    if (initialManagerId) {
      setSelectedRegionId(initialManagerId);
    }
  }, [initialManagerId]);

  // Fetch real branches and registered users directly from MongoDB
  useEffect(() => {
    let isMounted = true;
    const fetchLiveData = async () => {
      try {
        const [branchesData, usersData] = await Promise.all([
          getBranches().catch(() => []),
          getAdminUsers().catch(() => [])
        ]);
        if (!isMounted) return;
        if (Array.isArray(branchesData) && branchesData.length > 0) {
          setBranches(branchesData);
        }
        if (Array.isArray(usersData)) {
          setUsers(usersData);
        }
      } catch (err) {
        console.warn('Regional live data error', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLiveData();
    return () => { isMounted = false; };
  }, []);

  // Compute live regional zones dynamically from genuine MongoDB branch records
  const regionsData = useMemo(() => {
    if (!branches?.length) return [];

    // Group branches dynamically by state or city
    const regionMap = new Map();

    branches.forEach((branch) => {
      const stateName = (branch.state || branch.city || 'Unassigned Region').trim();
      if (!regionMap.has(stateName)) {
        regionMap.set(stateName, []);
      }
      regionMap.get(stateName).push(branch);
    });

    const entries = Array.from(regionMap.entries())
      .sort((a, b) => b[1].length - a[1].length); // Sort by branch count descending

    return entries.map(([regionName, branchList], index) => {
      const id = regionName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const code = getRegionCode(regionName);
      const theme = REGION_THEMES[index % REGION_THEMES.length];

      // Match regional manager from DB users
      const assignedManager = findRegionalManagerForRegion(regionName, branchList, users);

      // Sub-branches text from real branch records
      const subBranchesText = branchList.map(b => b.name).filter(Boolean).join(', ');

      // Live metrics calculated strictly from actual branch records
      const branchesCount = branchList.length;
      const totalStaff = branchList.reduce((sum, b) => sum + (Number(b.staffCount) || 0), 0);
      const totalLeads = branchList.reduce((sum, b) => sum + (Number(b.leadCount) || 0), 0);
      const openLeads = branchList.reduce((sum, b) => sum + (Number(b.openLeads) || 0), 0);
      const admittedLeads = branchList.reduce((sum, b) => sum + (Number(b.admittedLeads) || 0), 0);
      const totalStudents = branchList.reduce((sum, b) => sum + (Number(b.activeStudents) || 0), 0);
      const admissionsThisMonth = branchList.reduce((sum, b) => sum + (Number(b.admissionsThisMonth) || 0), 0);
      const totalCapacity = branchList.reduce((sum, b) => sum + (Number(b.capacity) || 0), 0);

      const computedBranches = branchList.map((b) => {
        const staff = Number(b.staffCount) || 0;
        const leads = Number(b.leadCount) || 0;
        const admits = Number(b.activeStudents) || 0;
        const convRate = b.conversionPct !== null && b.conversionPct !== undefined
          ? `${b.conversionPct}%`
          : (leads > 0 && b.admittedLeads !== undefined
              ? `${Math.round((b.admittedLeads / leads) * 100)}%`
              : '—');

        return {
          id: b._id || b.id || b.name,
          name: b.name,
          code: b.code || '—',
          city: b.city || '—',
          state: b.state || regionName,
          manager: b.manager || b.managers?.[0] || 'Unassigned',
          hrs: staff,
          leads: leads,
          admissions: admits,
          conversion: convRate,
          status: b.status || 'Operational',
          capacity: b.capacity || 0,
          rawBranch: b
        };
      });

      return {
        id,
        regionName,
        code,
        theme,
        managerName: assignedManager ? assignedManager.name : null,
        managerEmail: assignedManager?.email || null,
        managerPhone: assignedManager?.phone || null,
        initial: assignedManager ? assignedManager.name.charAt(0).toUpperCase() : regionName.charAt(0).toUpperCase(),
        isAssigned: Boolean(assignedManager),
        subBranchesText: subBranchesText || 'No branches mapped',
        branchesCount,
        totalStaff,
        totalLeads,
        openLeads,
        admittedLeads,
        totalStudents,
        admissionsThisMonth,
        totalCapacity,
        branches: computedBranches,
        noticeText: `Live regional overview for ${regionName} — ${branchesCount} ${branchesCount === 1 ? 'branch' : 'branches'} with real-time staff, leads, and student enrolments synced directly from MongoDB.`
      };
    });
  }, [branches, users]);

  // Selected manager/region object
  const selectedRegion = useMemo(() => {
    if (!selectedRegionId) return null;
    const target = String(selectedRegionId).toLowerCase();
    return (
      regionsData.find(
        (r) =>
          r.id === target ||
          r.regionName.toLowerCase() === target ||
          r.code.toLowerCase() === target ||
          target.includes(r.id) ||
          r.id.includes(target)
      ) || null
    );
  }, [selectedRegionId, regionsData]);

  // Handle opening branch detail in Branch Manager Desk
  const handleBranchClick = (branchItem) => {
    if (onSelectBranch) {
      onSelectBranch(branchItem.rawBranch || branchItem);
    }
  };

  // Filtered regions based on search query
  const filteredRegions = useMemo(() => {
    if (!searchQuery.trim()) return regionsData;
    const q = searchQuery.toLowerCase();
    return regionsData.filter(
      r =>
        r.regionName.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.subBranchesText.toLowerCase().includes(q) ||
        (r.managerName && r.managerName.toLowerCase().includes(q))
    );
  }, [regionsData, searchQuery]);

  // --------------------------------------------------------------------------
  // GRID VIEW: All Regional Zones
  // --------------------------------------------------------------------------
  if (!selectedRegion) {
    return (
      <div className="w-full min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8 font-sans text-slate-800 animate-fadeIn">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Bar: Back Button & Live Tag */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              onClick={() => onBack && onBack()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
              Back to roles
            </button>

            {/* Quick search input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search region or branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Regional Managers</h1>
            <p className="font-mono text-xs text-slate-500 tracking-wider mt-1 flex items-center gap-2">
              <span>{regionsData.length} regional zones</span>
              <span className="text-slate-300">·</span>
              <span>{branches.length} branches</span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live MongoDB connection
              </span>
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white rounded-2xl border border-slate-200/90 p-6 animate-pulse space-y-4">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-6 bg-slate-200 rounded w-2/3" />
                  <div className="h-4 bg-slate-100 rounded w-full" />
                  <div className="h-10 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredRegions.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No regional zones found</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery ? `No regions matching "${searchQuery}"` : 'Configure branches with valid states in Admin Branch Setup.'}
              </p>
            </div>
          )}

          {/* Grid of Dynamic Region Cards */}
          {!loading && filteredRegions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {filteredRegions.map((region) => (
                <div
                  key={region.id}
                  onClick={() => setSelectedRegionId(region.id)}
                  className="group relative bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden cursor-pointer flex flex-col justify-between"
                >
                  {/* Top Colored Border Bar */}
                  <div className={`h-1.5 w-full ${region.theme.topBorder}`} />

                  {/* Top-Right Soft Glow Accent */}
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-radial ${region.theme.glowBg} rounded-full blur-xl pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity`} />

                  <div className="p-6">
                    {/* Top Row: Icon & Code */}
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-11 h-11 rounded-2xl ${region.theme.iconBoxBg} flex items-center justify-center text-white shadow-xs`}>
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                        {region.code}
                      </span>
                    </div>

                    {/* Region Name & Assigned Manager */}
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                        {region.regionName}
                      </h3>

                      <div className="mt-1 flex items-center gap-2">
                        {region.isAssigned ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            <UserCheck className="w-3 h-3 text-emerald-600" />
                            {region.managerName}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">
                            Regional Lead · Unassigned
                          </span>
                        )}
                      </div>

                      {/* Sub-branches text */}
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                        <span className="font-semibold text-slate-600">Branches:</span> {region.subBranchesText}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Metrics Bar */}
                  <div className="border-t border-slate-100/80 px-6 py-3.5 bg-slate-50/40 grid grid-cols-4 text-center">
                    <div>
                      <div className={`text-base font-extrabold ${region.theme.textAccent} leading-none`}>
                        {region.branchesCount}
                      </div>
                      <div className="text-[8px] sm:text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider mt-1">
                        BRANCHES
                      </div>
                    </div>
                    <div>
                      <div className={`text-base font-extrabold ${region.theme.textAccent} leading-none`}>
                        {region.totalStaff}
                      </div>
                      <div className="text-[8px] sm:text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider mt-1">
                        STAFF
                      </div>
                    </div>
                    <div>
                      <div className={`text-base font-extrabold ${region.theme.textAccent} leading-none`}>
                        {region.totalStudents}
                      </div>
                      <div className="text-[8px] sm:text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider mt-1">
                        STUDENTS
                      </div>
                    </div>
                    <div>
                      <div className={`text-base font-extrabold ${region.theme.textAccent} leading-none`}>
                        {region.totalLeads}
                      </div>
                      <div className="text-[8px] sm:text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider mt-1">
                        LEADS
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // DETAIL VIEW: Single Regional Zone
  // --------------------------------------------------------------------------
  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8 font-sans text-slate-800 animate-fadeIn">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Back Button */}
        <div>
          <button
            onClick={() => setSelectedRegionId(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
            All regions
          </button>
        </div>

        {/* Region Banner Header Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
          <div className="flex items-center gap-4">
            {/* Avatar Circle with Initial */}
            <div className={`w-12 h-12 rounded-full ${selectedRegion.theme.avatarBg} text-white font-extrabold text-lg flex items-center justify-center flex-shrink-0 shadow-xs`}>
              {selectedRegion.initial}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {selectedRegion.regionName} Region
                </h2>
                <span className="text-[10px] font-bold font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedRegion.code}
                </span>
              </div>

              <div className="font-mono text-xs text-slate-500 tracking-wide mt-1 flex items-center gap-2 flex-wrap">
                {selectedRegion.isAssigned ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Manager: {selectedRegion.managerName} {selectedRegion.managerEmail ? `(${selectedRegion.managerEmail})` : ''}
                  </span>
                ) : (
                  <span className="text-slate-400">
                    Regional Manager: Unassigned (Configured via Admin Staff Accounts)
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                <span className="font-semibold text-slate-600">Covering:</span> {selectedRegion.subBranchesText}
              </p>
            </div>
          </div>

          {/* Right Icon Box */}
          <div className={`w-10 h-10 rounded-xl ${selectedRegion.theme.iconBoxBg} flex items-center justify-center text-white shadow-xs flex-shrink-0`}>
            <MapPin className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* 4 Live KPI Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {loading ? '…' : selectedRegion.branchesCount}
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 font-mono tracking-wider uppercase mt-1">
              BRANCHES
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              {selectedRegion.totalCapacity ? `${selectedRegion.totalCapacity} total seats` : 'Active operations'}
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {loading ? '…' : selectedRegion.totalStaff}
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 font-mono tracking-wider uppercase mt-1">
              TOTAL STAFF
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              Across all regional branches
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {loading ? '…' : selectedRegion.totalLeads}
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 font-mono tracking-wider uppercase mt-1">
              TOTAL LEADS
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              {selectedRegion.openLeads} active pipeline
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-2xs text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {loading ? '…' : selectedRegion.totalStudents}
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 font-mono tracking-wider uppercase mt-1">
              STUDENTS ENROLLED
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              {selectedRegion.admissionsThisMonth} new this month
            </div>
          </div>
        </div>

        {/* Branches Table Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-base">🏢</span>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                Branches in {selectedRegion.regionName}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                ({selectedRegion.branches.length})
              </span>
            </div>
            <span className="text-[11px] text-blue-600 font-medium">
              Click any branch row to open Branch Manager Desk →
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                  <th className="py-2.5 px-3">BRANCH</th>
                  <th className="py-2.5 px-3">BRANCH MANAGER</th>
                  <th className="py-2.5 px-3">LOCATION</th>
                  <th className="py-2.5 px-3 text-center">STAFF</th>
                  <th className="py-2.5 px-3 text-center">LEADS</th>
                  <th className="py-2.5 px-3 text-center">STUDENTS</th>
                  <th className="py-2.5 px-3 text-center">CONVERSION</th>
                  <th className="py-2.5 px-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedRegion.branches.map((branch) => (
                  <tr
                    key={branch.id}
                    onClick={() => handleBranchClick(branch)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3 font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                      <div className="flex items-center gap-2">
                        <span>{branch.name}</span>
                        {branch.code && branch.code !== '—' && (
                          <span className="text-[9px] font-mono text-slate-400 font-normal">
                            ({branch.code})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {branch.manager !== 'Unassigned' ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {branch.manager}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {branch.city}, {branch.state}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700 text-center">
                      {branch.hrs}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700 text-center">
                      {branch.leads}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700 text-center">
                      {branch.admissions}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 text-center">
                      {branch.conversion}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        branch.status === 'Operational'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {branch.status}
                      </span>
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
            {selectedRegion.noticeText}
          </p>
        </div>
      </div>
    </div>
  );
}
