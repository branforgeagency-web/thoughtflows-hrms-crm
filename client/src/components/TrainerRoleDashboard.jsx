import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  Shuffle,
  Clock,
  X,
  ArrowLeft,
  LogOut,
  CheckCircle2,
  Users,
  Crown,
  Briefcase,
  GraduationCap,
  Building2,
  MapPin,
  Search,
  Calendar,
  ChevronDown,
  RefreshCw,
  BookOpen,
  Filter,
  Network
} from 'lucide-react';
import TeamRosterBoard from './TeamRosterBoard';
import CourseSyllabusBoard from './CourseSyllabusBoard';
import DashboardNavSwitcher from './DashboardNavSwitcher';
import TrainerOrgHierarchyChart from './TrainerOrgHierarchyChart';
import {
  TRAINER_HIERARCHY,
  ALL_HIERARCHY_TRAINERS
} from '../constants/trainerHierarchy';
import {
  getTrainerSettings,
  getBatches,
  getBranches,
  getStudents,
  getDemos,
  reassignDemo,
  bulkReassignDemos,
  rescheduleDemo,
  onDataUpdate
} from '../services/api';

export default function TrainerRoleDashboard({
  roleType = 'head', // 'head' | 'manager' | 'tl'
  initialLeaderId = null,
  onBack,
  currentUser,
  onLogout,
  onSwitchDepartment,
  onClose
}) {
  const [trainersList, setTrainersList] = useState([]);
  const [batchesList, setBatchesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [demosList, setDemosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOrgChart, setShowOrgChart] = useState(false);

  // Active Leader Selection
  const [activeLeaderId, setActiveLeaderId] = useState(() => {
    if (initialLeaderId) return initialLeaderId;
    if (roleType === 'head') return 'manoj';
    if (roleType === 'manager') {
      const name = String(currentUser?.name || currentUser?.userName || '').toLowerCase();
      if (name.includes('pavithra')) return 'pavithra';
      return 'keerthi'; // Default to Keerthi (TN / KL)
    }
    if (roleType === 'tl') {
      const name = String(currentUser?.name || currentUser?.userName || '').toLowerCase();
      if (name.includes('vaishna')) return 'vaishna';
      if (name.includes('mounika')) return 'mounika';
      return 'ram_balaji'; // Default to Ram Balaji (TN)
    }
    return 'manoj';
  });

  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');

  // Reassignment & Reschedule Toast and State
  const [reassignToast, setReassignToast] = useState('');
  const flashReassign = (m, ms = 4000) => { setReassignToast(m); setTimeout(() => setReassignToast(''), ms); };
  const [reassignDemoTarget, setReassignDemoTarget] = useState(null);
  const [reassignForm, setReassignForm] = useState({ toTrainerId: '', reason: '' });
  const [reassigning, setReassigning] = useState(false);
  const [bulkReassignForm, setBulkReassignForm] = useState({ fromTrainerId: '', toTrainerId: '', date: '', reason: '' });
  const [bulkReassigning, setBulkReassigning] = useState(false);
  const [rescheduleDemoTarget, setRescheduleDemoTarget] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ preferredDate: '', timeSlot: '', toTrainerId: '', reason: '' });
  const [rescheduling, setRescheduling] = useState(false);

  const loadData = useCallback(() => {
    Promise.all([
      getTrainerSettings().catch(() => []),
      getBatches().catch(() => []),
      getBranches().catch(() => []),
      getStudents().catch(() => []),
      getDemos().catch(() => [])
    ]).then(([tData, bData, brData, sData, dData]) => {
      // Merge backend trainers with official hierarchy trainers so all 25 trainers exist
      const mergedTrainers = [...(Array.isArray(tData) ? tData : [])];
      ALL_HIERARCHY_TRAINERS.forEach((ht) => {
        const found = mergedTrainers.find((t) =>
          String(t.trainerName || '').toLowerCase() === ht.name.toLowerCase() ||
          t.trainerId === ht.id
        );
        if (found) {
          found.teamLeadId = ht.teamLeadId;
          found.teamLeadName = ht.teamLeadName;
          found.managerId = ht.managerId;
          found.managerName = ht.managerName;
          found.zone = ht.zone;
        } else {
          mergedTrainers.push(ht);
        }
      });

      setTrainersList(mergedTrainers);
      setBatchesList(Array.isArray(bData) ? bData : []);
      setBranchesList(Array.isArray(brData) ? brData : []);
      setStudentsList(Array.isArray(sData) ? sData : []);
      setDemosList(Array.isArray(dData) ? dData : []);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadData();
    const unsub = onDataUpdate((entity) => {
      if (entity === 'students' || entity === 'trainers' || entity === 'batches' || entity === 'demos') {
        loadData();
      }
    });
    return () => unsub();
  }, [loadData]);

  // Current Role & Active Leader Configuration
  const currentLeader = useMemo(() => {
    if (roleType === 'head') {
      return {
        id: 'manoj',
        name: 'Manoj',
        roleTitle: 'Head of Training Department',
        badge: 'HT',
        scopeLabel: 'Tamil Nadu, Kerala, Andhra Pradesh & Telangana · DEP-TR-TN-001',
        zone: 'All Regions (TN, KL, AP / TS)',
        topBarGrad: 'linear-gradient(90deg, #005a9c, #0284c7)',
        managerLabel: 'Head of Trainer'
      };
    }
    if (roleType === 'manager') {
      const mgr = TRAINER_HIERARCHY.managers.find((m) => m.id === activeLeaderId) || TRAINER_HIERARCHY.managers[0];
      return {
        id: mgr.id,
        name: mgr.name,
        roleTitle: `Training Manager (${mgr.zone})`,
        badge: mgr.badge,
        scopeLabel: `${mgr.zoneLabel} · DEP-TR-MGR-${mgr.id.toUpperCase()}`,
        zone: mgr.zone,
        topBarGrad: mgr.id === 'keerthi'
          ? 'linear-gradient(90deg, #00828a, #0d9488)'
          : 'linear-gradient(90deg, #6d28d9, #8b5cf6)',
        managerLabel: 'Training Manager'
      };
    }
    // Team Lead
    const tl = TRAINER_HIERARCHY.teamLeads.find((t) => t.id === activeLeaderId) || TRAINER_HIERARCHY.teamLeads[0];
    return {
      id: tl.id,
      name: tl.name,
      roleTitle: `Team Lead (${tl.zone})`,
      badge: tl.badge,
      scopeLabel: `${tl.zoneLabel} · Reporting to ${tl.managerName} · DEP-TR-TL-${tl.id.toUpperCase()}`,
      zone: tl.zone,
      topBarGrad: tl.id === 'ram_balaji'
        ? 'linear-gradient(90deg, #2e7d32, #16a34a)'
        : tl.id === 'vaishna'
        ? 'linear-gradient(90deg, #0284c7, #38bdf8)'
        : 'linear-gradient(90deg, #be185d, #ec4899)',
      managerLabel: 'Trainer Team Lead'
    };
  }, [roleType, activeLeaderId]);

  // Scoped Trainers based on Active Leader
  const scopedTrainers = useMemo(() => {
    let list = trainersList;
    if (roleType === 'manager') {
      if (activeLeaderId === 'keerthi') {
        // TN & KL (Ram Balaji & Vaishna)
        list = list.filter((t) => t.managerId === 'keerthi' || ['TN', 'KL'].includes(t.zone) || /tamil|kerala|coimbatore|kochi|trivandrum|salem|trichy/i.test(`${t.branchName || ''} ${t.branch || ''}`));
      } else if (activeLeaderId === 'pavithra') {
        // AP & TS (Mounika)
        list = list.filter((t) => t.managerId === 'pavithra' || ['AP / TS', 'AP', 'TS'].includes(t.zone) || /telangana|andhra|hyderabad|ameerpet|dilsukhnagar|tirupati|vizag/i.test(`${t.branchName || ''} ${t.branch || ''}`));
      }
    } else if (roleType === 'tl') {
      if (activeLeaderId === 'ram_balaji') {
        // 10 TN Trainers
        list = list.filter((t) => t.teamLeadId === 'ram_balaji' || t.zone === 'TN' || /tharani|jennifer|karkuzhali|sowmiya|darsana|sharon|kaviya|priya|sumaiya|sophiga/i.test(t.trainerName || t.name || ''));
      } else if (activeLeaderId === 'vaishna') {
        // 7 KL Trainers
        list = list.filter((t) => t.teamLeadId === 'vaishna' || t.zone === 'KL' || /aleena|aswini|shilpa|varamani|shiny|shiva|abarna/i.test(t.trainerName || t.name || ''));
      } else if (activeLeaderId === 'mounika') {
        // 8 AP/TS Trainers
        list = list.filter((t) => t.teamLeadId === 'mounika' || t.zone === 'AP / TS' || /pooja|varsha|charishma|prasanna|aashifa|santhiya|kavitha|santhosh/i.test(t.trainerName || t.name || ''));
      }
    }

    if (selectedBranchFilter !== 'all') {
      list = list.filter((t) => String(t.branchName || t.branch || '').toLowerCase().includes(selectedBranchFilter.toLowerCase()));
    }
    return list;
  }, [trainersList, roleType, activeLeaderId, selectedBranchFilter]);

  // Scoped Demos based on Scoped Trainers
  const scopedTrainerNames = useMemo(() => {
    return scopedTrainers.map((t) => t.trainerName || t.name).filter(Boolean);
  }, [scopedTrainers]);

  const scopedDemos = useMemo(() => {
    if (roleType === 'head') return demosList;
    return demosList.filter((d) => {
      const tName = String(d.trainer || d.trainerMapping || '').toLowerCase();
      return scopedTrainerNames.some((stn) => tName.includes(stn.toLowerCase()));
    });
  }, [demosList, roleType, scopedTrainerNames]);

  // KPI Counts
  const availableNowCount = useMemo(() => {
    return scopedTrainers.filter((t) => t.active !== false).length;
  }, [scopedTrainers]);

  const batchesCount = useMemo(() => {
    if (roleType === 'head') return batchesList.length;
    return batchesList.filter((b) => {
      const bTrainer = String(b.trainer || b.faculty || '').toLowerCase();
      return scopedTrainerNames.some((stn) => bTrainer.includes(stn.toLowerCase()));
    }).length;
  }, [batchesList, roleType, scopedTrainerNames]);

  const pendingAllocationCount = useMemo(() => {
    const list = studentsList.filter((st) => {
      const isHandedOver = st.handoverStatus === 'Handed Over to Head of Trainer' || (st.handoverStatus === 'Sent to Training' && !st.trainerId);
      return isHandedOver && !st.trainerId;
    });
    if (roleType === 'head') return list.length;
    return list.filter((st) => {
      const text = `${st.branch || ''} ${st.state || ''} ${st.location || ''}`.toLowerCase();
      if (activeLeaderId === 'keerthi' || activeLeaderId === 'ram_balaji') return /tamil|coimbatore|salem|trichy/i.test(text);
      if (activeLeaderId === 'vaishna') return /kerala|kochi|trivandrum/i.test(text);
      if (activeLeaderId === 'pavithra' || activeLeaderId === 'mounika') return /telangana|andhra|hyderabad/i.test(text);
      return true;
    }).length;
  }, [studentsList, roleType, activeLeaderId]);

  const upcomingDemosCount = useMemo(() => {
    return scopedDemos.filter((d) => ['booked', 'confirmed'].includes(String(d.status || '').toLowerCase())).length;
  }, [scopedDemos]);

  // Demo Actions
  const openReassign = (demo) => {
    setReassignDemoTarget(demo);
    setReassignForm({ toTrainerId: '', reason: '' });
  };

  const confirmReassignOne = async () => {
    if (!reassignDemoTarget || !reassignForm.toTrainerId) return;
    setReassigning(true);
    try {
      await reassignDemo(reassignDemoTarget._id, { toTrainerId: reassignForm.toTrainerId, reason: reassignForm.reason });
      const toName = scopedTrainers.find((t) => (t.trainerId || t.id) === reassignForm.toTrainerId)?.name || 'the new trainer';
      flashReassign(`✓ ${reassignDemoTarget.candidateName}'s demo reassigned to ${toName}`);
      setReassignDemoTarget(null);
      loadData();
    } catch (e) {
      flashReassign(`⚠ ${e?.response?.data?.error || e.message || 'Could not reassign this demo'}`, 5000);
    } finally {
      setReassigning(false);
    }
  };

  const confirmBulkReassign = async () => {
    const { fromTrainerId, toTrainerId, date, reason } = bulkReassignForm;
    if (!fromTrainerId || !toTrainerId) { flashReassign('⚠ Pick both trainers first', 3000); return; }
    if (fromTrainerId === toTrainerId) { flashReassign('⚠ Pick two different trainers', 3000); return; }
    setBulkReassigning(true);
    try {
      const res = await bulkReassignDemos({ fromTrainerId, toTrainerId, date, reason });
      const count = res?.reassigned || 0;
      if (count === 0) {
        flashReassign('No upcoming demos found for that trainer' + (date ? ` on ${date}` : '') + '.', 4000);
      } else {
        const fromName = scopedTrainers.find((t) => (t.trainerId || t.id) === fromTrainerId)?.name || 'the trainer';
        const toName = scopedTrainers.find((t) => (t.trainerId || t.id) === toTrainerId)?.name || 'the new trainer';
        flashReassign(`✓ ${count} demo${count === 1 ? '' : 's'} moved from ${fromName} to ${toName}`);
        setBulkReassignForm({ fromTrainerId: '', toTrainerId: '', date: '', reason: '' });
      }
      loadData();
    } catch (e) {
      flashReassign(`⚠ ${e?.response?.data?.error || e.message || 'Could not reassign these demos'}`, 5000);
    } finally {
      setBulkReassigning(false);
    }
  };

  const openReschedule = (demo) => {
    setRescheduleDemoTarget(demo);
    setRescheduleForm({ preferredDate: '', timeSlot: demo.timeSlot || demo.time || '', toTrainerId: '', reason: '' });
  };

  const confirmReschedule = async () => {
    if (!rescheduleDemoTarget || !rescheduleForm.preferredDate || !rescheduleForm.timeSlot) {
      flashReassign('⚠ Pick a new date and time first', 3000);
      return;
    }
    setRescheduling(true);
    try {
      await rescheduleDemo(rescheduleDemoTarget._id, rescheduleForm);
      flashReassign(`✓ ${rescheduleDemoTarget.candidateName}'s demo rescheduled to ${rescheduleForm.preferredDate} ${rescheduleForm.timeSlot}`);
      setRescheduleDemoTarget(null);
      loadData();
    } catch (e) {
      flashReassign(`⚠ ${e?.response?.data?.error || e.message || 'Could not reschedule this demo'}`, 5000);
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F8FAFC] font-sans text-slate-800 animate-fadeIn">
      {/* Top Navbar */}
      <header
        className="sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 flex-wrap shadow-md"
        style={{ background: 'linear-gradient(90deg, #0F172A, #1E293B 55%, #334155)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/90 hover:bg-white text-slate-800 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-600" /> Back to Trainer Roles
          </button>
          <div className="bg-white rounded-xl px-2.5 py-1.5 shadow-sm hidden sm:block">
            <img src="/thoughtflows-logo.png" alt="Thoughtflows" className="h-6 w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white leading-tight">{currentLeader.roleTitle}</h1>
            <p className="text-[10px] font-bold tracking-[0.2em] text-slate-300 uppercase">
              Thoughtflows Medical Coding Academy · {currentLeader.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOrgChart((v) => !v)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs ${
              showOrgChart
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>{showOrgChart ? 'Hide Org Tree' : 'View Org Tree'}</span>
          </button>

          {onSwitchDepartment && (
            <DashboardNavSwitcher
              currentDepartment="training"
              onSwitchDepartment={onSwitchDepartment}
            />
          )}

          <div className="flex items-center gap-2 bg-white/10 rounded-full pl-2 pr-4 py-1.5">
            <span
              className="w-8 h-8 rounded-full grid place-items-center text-xs font-bold text-white shadow-xs"
              style={{ background: currentLeader.topBarGrad }}
            >
              {currentLeader.badge}
            </span>
            <div>
              <div className="text-xs font-bold text-white leading-tight">
                {currentLeader.name}
              </div>
              <div className="text-[9px] font-bold tracking-[0.15em] text-slate-300 uppercase">
                {currentLeader.roleTitle}
              </div>
            </div>
          </div>

          {(onLogout || onClose) && (
            <button
              onClick={onLogout || onClose}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white border border-rose-400/30 text-xs font-bold transition-all cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Optional Interactive Org Hierarchy Chart Modal / Drawer */}
        {showOrgChart && (
          <div className="animate-fadeIn">
            <TrainerOrgHierarchyChart
              onSelectNode={(node) => {
                if (node.roleType === 'head') setActiveLeaderId('manoj');
                else if (node.roleType === 'manager') setActiveLeaderId(node.id);
                else if (node.roleType === 'tl') setActiveLeaderId(node.id);
                setShowOrgChart(false);
              }}
            />
          </div>
        )}

        {/* Role & Leader Profile Switcher (TN/KL vs AP/TS, or TN vs KL vs AP/TS) */}
        <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {roleType === 'head' ? 'Department Head:' : roleType === 'manager' ? 'Select Training Manager:' : 'Select Team Lead:'}
            </span>

            {roleType === 'head' && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-black text-blue-700">
                <Crown className="w-3.5 h-3.5 text-blue-600" /> Manoj · Head of Training Department (All 25 Faculty)
              </div>
            )}

            {roleType === 'manager' && (
              <div className="flex items-center gap-2">
                {TRAINER_HIERARCHY.managers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setActiveLeaderId(m.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeLeaderId === m.id
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{m.name}</span>
                    <span className="opacity-80 font-normal">({m.zone})</span>
                  </button>
                ))}
              </div>
            )}

            {roleType === 'tl' && (
              <div className="flex items-center gap-2 flex-wrap">
                {TRAINER_HIERARCHY.teamLeads.map((tl) => (
                  <button
                    key={tl.id}
                    onClick={() => setActiveLeaderId(tl.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeLeaderId === tl.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{tl.name}</span>
                    <span className="opacity-80 font-normal">({tl.zone} · {tl.trainersCount} Trainers)</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {branchesList.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Branch Filter:</span>
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Branches</option>
                {branchesList.map((b) => (
                  <option key={b._id || b.code || b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 1. Zone/Role Header Banner (matches user reference image) */}
        <div
          className="rounded-3xl p-6 text-white shadow-lg relative overflow-hidden"
          style={{ background: currentLeader.topBarGrad }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-lg shadow-sm bg-white/20">
              {currentLeader.badge}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                {currentLeader.name} <span className="opacity-70 font-normal">·</span> {currentLeader.roleTitle}
              </h2>
              <p className="text-xs sm:text-sm opacity-80 font-mono mt-0.5">
                {currentLeader.scopeLabel}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Stat Row (5 Stat Cards matching user reference image) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-100/90 rounded-2xl p-4 shadow-xs text-center">
            <div className="text-2xl font-extrabold text-slate-900">{loading ? '…' : scopedTrainers.length}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Trainers</div>
          </div>
          <div className="bg-white border border-slate-100/90 rounded-2xl p-4 shadow-xs text-center">
            <div className="text-2xl font-extrabold text-emerald-600">{loading ? '…' : availableNowCount}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Available Now</div>
          </div>
          <div className="bg-white border border-slate-100/90 rounded-2xl p-4 shadow-xs text-center">
            <div className="text-2xl font-extrabold text-slate-900">{loading ? '…' : batchesCount}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Batches</div>
          </div>
          <div className="bg-white border border-slate-100/90 rounded-2xl p-4 shadow-xs text-center">
            <div className={`text-2xl font-extrabold ${pendingAllocationCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {loading ? '…' : pendingAllocationCount}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Pending Allocation</div>
          </div>
          <div className="bg-white border border-slate-100/90 rounded-2xl p-4 shadow-xs text-center">
            <div className="text-2xl font-extrabold text-blue-600">{loading ? '…' : upcomingDemosCount}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Upcoming Demos</div>
          </div>
        </div>

        {/* 3. Active Trainers Table Section (matches user reference image) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span>🗂️</span> Active Trainers in {currentLeader.zone}
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {scopedTrainers.length} trainers listed
            </span>
          </div>

          {scopedTrainers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-3 font-bold">TRAINER</th>
                    <th className="pb-3 font-bold">BRANCH</th>
                    <th className="pb-3 font-bold">COURSES SPECIALIZATION</th>
                    <th className="pb-3 font-bold">LANGUAGES</th>
                    <th className="pb-3 font-bold">ASSIGNED STUDENTS</th>
                    <th className="pb-3 font-bold">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scopedTrainers.map((t) => {
                    const assignedCount = studentsList.filter((s) => s.trainerId === (t.trainerId || t.id)).length;
                    return (
                      <tr key={t.trainerId || t.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 pr-4">
                          <div className="font-extrabold text-slate-900">{t.trainerName || t.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{t.trainerId || t.id}</div>
                        </td>
                        <td className="py-3.5 pr-4 text-slate-600 font-medium">{t.branchName || t.branch || 'Academy-wide'}</td>
                        <td className="py-3.5 pr-4 text-slate-600 font-medium">{t.expertCourse || t.specialization || 'CPC — Certified Professional Coder'}</td>
                        <td className="py-3.5 pr-4 text-slate-600 font-medium">
                          {Array.isArray(t.languages) ? t.languages.join(', ') : 'Tamil, English'}
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="font-extrabold text-blue-600">{assignedCount}</span> students
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${t.active !== false ? 'text-emerald-600' : 'text-slate-400'}`}>
                            <span className={`w-2 h-2 rounded-full ${t.active !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                            {t.active !== false ? 'Active on Duty' : 'On Leave'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">No trainers assigned to this region yet.</div>
          )}
        </div>

        {/* 4. Demos Section (matches user reference image) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          {reassignToast && (
            <div className="p-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold">{reassignToast}</div>
          )}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span>👥</span> Demos in {currentLeader.zone}
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {scopedDemos.length} on record · {upcomingDemosCount} upcoming
              {scopedDemos.filter((d) => String(d.status || '').toLowerCase() === 'missed').length > 0 && (
                <span className="text-rose-500 font-bold">
                  {' '}· {scopedDemos.filter((d) => String(d.status || '').toLowerCase() === 'missed').length} missed
                </span>
              )}
            </span>
          </div>

          {/* Bulk Reassign Desk */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
              <Shuffle className="w-3.5 h-3.5 text-blue-600" /> Reassign all demos of a trainer on leave
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select
                value={bulkReassignForm.fromTrainerId}
                onChange={(e) => setBulkReassignForm((f) => ({ ...f, fromTrainerId: e.target.value }))}
                className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none"
              >
                <option value="">From trainer…</option>
                {scopedTrainers.map((t) => (
                  <option key={t.trainerId || t.id} value={t.trainerId || t.id}>{t.trainerName || t.name}</option>
                ))}
              </select>
              <select
                value={bulkReassignForm.toTrainerId}
                onChange={(e) => setBulkReassignForm((f) => ({ ...f, toTrainerId: e.target.value }))}
                className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none"
              >
                <option value="">To trainer…</option>
                {scopedTrainers.filter((t) => (t.trainerId || t.id) !== bulkReassignForm.fromTrainerId).map((t) => (
                  <option key={t.trainerId || t.id} value={t.trainerId || t.id}>{t.trainerName || t.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={bulkReassignForm.date}
                onChange={(e) => setBulkReassignForm((f) => ({ ...f, date: e.target.value }))}
                className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none"
                title="Leave blank to move every upcoming demo, not just one day"
              />
              <input
                value={bulkReassignForm.reason}
                onChange={(e) => setBulkReassignForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Reason (e.g. On leave)"
                className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none"
              />
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-[10px] text-slate-400">Leave the date blank to move every one of that trainer's upcoming demos, not just one day.</p>
              <button
                onClick={confirmBulkReassign}
                disabled={bulkReassigning || !bulkReassignForm.fromTrainerId || !bulkReassignForm.toTrainerId}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-40 shrink-0 cursor-pointer shadow-xs"
              >
                {bulkReassigning ? 'Reassigning…' : 'Reassign all'}
              </button>
            </div>
          </div>

          {/* Demos Table */}
          {scopedDemos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-3 font-bold">CANDIDATE</th>
                    <th className="pb-3 font-bold">COURSE</th>
                    <th className="pb-3 font-bold">DATE &amp; TIME</th>
                    <th className="pb-3 font-bold">LANGUAGES</th>
                    <th className="pb-3 font-bold">LOCATION</th>
                    <th className="pb-3 font-bold">TRAINER</th>
                    <th className="pb-3 font-bold">STATUS</th>
                    <th className="pb-3 font-bold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scopedDemos
                    .slice()
                    .sort((a, b) => String(b.preferredDate || '').localeCompare(String(a.preferredDate || '')))
                    .map((d) => {
                      const statusKey = String(d.status || 'booked').toLowerCase();
                      const statusCls = statusKey === 'attended' ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                        : statusKey === 'missed' ? 'text-rose-600 bg-rose-50 border-rose-200'
                        : statusKey === 'confirmed' ? 'text-teal-600 bg-teal-50 border-teal-200'
                        : 'text-amber-600 bg-amber-50 border-amber-200';
                      const canReassign = !['attended', 'cancelled'].includes(statusKey);
                      return (
                        <tr key={d._id || `${d.candidateName}-${d.preferredDate}`} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 pr-4">
                            <div className="font-extrabold text-slate-900">{d.candidateName}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{d.phone}</div>
                          </td>
                          <td className="py-3.5 pr-4 text-slate-600 font-medium">{d.course || '—'}</td>
                          <td className="py-3.5 pr-4 text-slate-600 font-medium">{d.preferredDate || '—'} {d.timeSlot || d.time ? `· ${d.timeSlot || d.time}` : ''}</td>
                          <td className="py-3.5 pr-4 text-slate-600 font-medium">{d.language || 'English'}</td>
                          <td className="py-3.5 pr-4 text-slate-600 font-medium">{d.location || d.branch || '—'}</td>
                          <td className="py-3.5 pr-4 text-slate-600 font-medium">
                            <div>{d.trainer || d.trainerMapping || '—'}</div>
                            {d.reassigned && (
                              <div className="text-[10px] text-blue-500 font-semibold mt-0.5">↪ reassigned from {d.originalTrainerName || 'another trainer'}</div>
                            )}
                          </td>
                          <td className="py-3.5 pr-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusCls}`}>
                              {d.status || 'Booked'}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-1.5">
                              {canReassign && (
                                <button
                                  onClick={() => openReassign(d)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer"
                                >
                                  <Shuffle className="w-3 h-3" /> Reassign
                                </button>
                              )}
                              {statusKey === 'missed' && (
                                <button
                                  onClick={() => openReschedule(d)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 cursor-pointer"
                                >
                                  <Clock className="w-3 h-3" /> Reschedule
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">No demos booked for this region yet.</div>
          )}
        </div>

        {/* Single Demo Reassign Panel */}
        {reassignDemoTarget && (
          <div className="bg-white border-2 border-blue-200 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Shuffle className="w-3.5 h-3.5 text-blue-600" /> Reassign {reassignDemoTarget.candidateName}'s demo
              </h4>
              <button onClick={() => setReassignDemoTarget(null)} className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[11px] text-slate-400">
              Currently with <span className="font-bold text-slate-600">{reassignDemoTarget.trainer || reassignDemoTarget.trainerMapping || '—'}</span> · {reassignDemoTarget.preferredDate} {reassignDemoTarget.timeSlot || reassignDemoTarget.time || ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={reassignForm.toTrainerId}
                onChange={(e) => setReassignForm((f) => ({ ...f, toTrainerId: e.target.value }))}
                className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none"
              >
                <option value="">Reassign to…</option>
                {scopedTrainers.filter((t) => (t.trainerId || t.id) !== reassignDemoTarget.trainerId).map((t) => (
                  <option key={t.trainerId || t.id} value={t.trainerId || t.id}>{t.trainerName || t.name}</option>
                ))}
              </select>
              <input
                value={reassignForm.reason}
                onChange={(e) => setReassignForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Reason (e.g. On leave)"
                className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none"
              />
            </div>
            <button
              onClick={confirmReassignOne}
              disabled={reassigning || !reassignForm.toTrainerId}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-40 cursor-pointer shadow-xs"
            >
              {reassigning ? 'Reassigning…' : 'Confirm reassignment'}
            </button>
          </div>
        )}

        {/* Single Demo Reschedule Panel */}
        {rescheduleDemoTarget && (
          <div className="bg-white border-2 border-amber-200 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Reschedule {rescheduleDemoTarget.candidateName}'s demo
              </h4>
              <button onClick={() => setRescheduleDemoTarget(null)} className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[11px] text-slate-400">
              Was scheduled <span className="font-bold text-slate-600">{rescheduleDemoTarget.preferredDate} {rescheduleDemoTarget.timeSlot || rescheduleDemoTarget.time || ''}</span> with {rescheduleDemoTarget.trainer || rescheduleDemoTarget.trainerMapping || '—'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="date"
                value={rescheduleForm.preferredDate}
                onChange={(e) => setRescheduleForm((f) => ({ ...f, preferredDate: e.target.value }))}
                className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none"
              />
              <input
                value={rescheduleForm.timeSlot}
                onChange={(e) => setRescheduleForm((f) => ({ ...f, timeSlot: e.target.value }))}
                placeholder="Time (e.g. 10:00 AM)"
                className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none"
              />
              <select
                value={rescheduleForm.toTrainerId}
                onChange={(e) => setRescheduleForm((f) => ({ ...f, toTrainerId: e.target.value }))}
                className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none"
              >
                <option value="">Keep same trainer</option>
                {scopedTrainers.filter((t) => (t.trainerId || t.id) !== rescheduleDemoTarget.trainerId).map((t) => (
                  <option key={t.trainerId || t.id} value={t.trainerId || t.id}>Move to {t.trainerName || t.name}</option>
                ))}
              </select>
              <input
                value={rescheduleForm.reason}
                onChange={(e) => setRescheduleForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Reason (optional)"
                className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none"
              />
            </div>
            <button
              onClick={confirmReschedule}
              disabled={rescheduling || !rescheduleForm.preferredDate || !rescheduleForm.timeSlot}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-40 cursor-pointer shadow-xs"
            >
              {rescheduling ? 'Rescheduling…' : 'Confirm reschedule'}
            </button>
          </div>
        )}

        {/* 5. Team Roster & Weekly Schedule Allocator */}
        <TeamRosterBoard
          departmentCode="ACAD"
          managerLabel={currentLeader.managerLabel}
          allowedNames={scopedTrainerNames.length > 0 ? scopedTrainerNames : null}
        />

        {/* 6. Course Syllabus */}
        <CourseSyllabusBoard
          courseOptions={scopedTrainers.map((t) => t.expertCourse || t.specialization || t.course).filter(Boolean)}
        />
      </main>
    </div>
  );
}
