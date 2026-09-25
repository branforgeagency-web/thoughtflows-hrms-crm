import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, 
  Trophy, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  TrendingUp, 
  Edit3, 
  Plus, 
  X,
  UserCheck,
  UserX
} from 'lucide-react';
import { getHrTargets, createHrTarget, updateHrTarget, deleteHrTarget, getStudents, getDemos, getDailyClosures, onDataUpdate } from '../services/api';

export default function DepartmentTargetsBoard({ 
  customTargets = null,
  onTargetUpdate = null 
}) {
  const [targets, setTargets] = useState(customTargets || []);
  const [activeTab, setActiveTab] = useState('today'); // 'today', 'this week', 'this month'
  const [toastMessage, setToastMessage] = useState(null);
  const [editModalTarget, setEditModalTarget] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [demos, setDemos] = useState([]);
  const [closures, setClosures] = useState([]);

  // Form states for target assignment/editing
  const [newTitle, setNewTitle] = useState('');
  const [newTargetNum, setNewTargetNum] = useState(10);
  const [newUnit, setNewUnit] = useState('Admissions');
  const [newAssignee, setNewAssignee] = useState('All HR');
  const [editAchieved, setEditAchieved] = useState(0);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load real targets & real activity stats from backend/database
  const loadData = async () => {
    try {
      const [tData, sData, dData, cData] = await Promise.all([
        getHrTargets().catch(() => []),
        getStudents().catch(() => []),
        getDemos().catch(() => []),
        getDailyClosures().catch(() => [])
      ]);

      if (Array.isArray(tData)) {
        setTargets(tData.map(t => ({
          id: t._id || t.id,
          title: t.title,
          target: Number(t.target) || 0,
          achieved: Number(t.achieved) || 0,
          unit: t.unit || 'Count',
          period: t.period || 'today',
          assignedTo: t.assignedTo || 'All HR'
        })));
      }
      if (Array.isArray(sData)) setStudents(sData);
      if (Array.isArray(dData)) setDemos(dData);
      if (Array.isArray(cData)) setClosures(cData);
    } catch (e) {
      console.warn('Targets load error:', e);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = onDataUpdate((entity) => {
      if (['targets', 'students', 'demos', 'closures'].includes(entity)) {
        loadData();
      }
    });
    return unsub;
  }, []);

  // Compute live achieved numbers dynamically based on actual database records
  const computedTargets = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAdmissions = students.filter(s => s.createdAt && s.createdAt.startsWith(todayStr)).length;
    const todayDemos = demos.filter(d => d.createdAt && d.createdAt.startsWith(todayStr)).length;
    const todayClosuresSum = closures
      .filter(c => c.date === todayStr)
      .reduce((acc, c) => acc + (c.callsMade || 0), 0);

    return targets.map(t => {
      let liveAchieved = t.achieved;
      const lower = t.title.toLowerCase();
      if (lower.includes('admission')) {
        liveAchieved = Math.max(t.achieved, todayAdmissions);
      } else if (lower.includes('demo')) {
        liveAchieved = Math.max(t.achieved, todayDemos);
      } else if (lower.includes('follow-up') || lower.includes('call')) {
        liveAchieved = Math.max(t.achieved, todayClosuresSum);
      }
      return { ...t, achieved: liveAchieved };
    });
  }, [targets, students, demos, closures]);

  // Rank HR Team Members dynamically based on real admissions & EOD calls
  const { bestPerformer, needsSupport } = useMemo(() => {
    const staffMap = {};
    students.forEach(s => {
      const hr = s.hrName || s.assignedTo || 'HR Staff';
      if (!staffMap[hr]) staffMap[hr] = { name: hr, admissions: 0, calls: 0 };
      staffMap[hr].admissions += 1;
    });
    closures.forEach(c => {
      const hr = c.counselorName || 'HR Staff';
      if (!staffMap[hr]) staffMap[hr] = { name: hr, admissions: 0, calls: 0 };
      staffMap[hr].calls += (c.callsMade || 0);
    });

    const staffList = Object.values(staffMap);
    if (staffList.length === 0) {
      return {
        bestPerformer: null,
        needsSupport: null
      };
    }

    staffList.sort((a, b) => (b.admissions * 10 + b.calls) - (a.admissions * 10 + a.calls));
    const best = staffList[0];
    const worst = staffList.length > 1 ? staffList[staffList.length - 1] : best;

    return {
      bestPerformer: {
        name: best.name,
        qualityScore: Math.min(98, 80 + best.admissions * 3),
        admissions: best.admissions
      },
      needsSupport: {
        name: worst.name,
        qualityScore: Math.max(65, 70 + worst.admissions * 2),
        pending: Math.max(0, 5 - worst.admissions)
      }
    };
  }, [students, closures]);

  // Handle Assigning Target by Head of HR
  const handleCreateTargetSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const payload = {
      title: newTitle.trim(),
      target: Number(newTargetNum) || 1,
      achieved: 0,
      unit: newUnit,
      period: 'today',
      assignedTo: newAssignee,
      assignedBy: 'Head of HR'
    };

    try {
      const res = await createHrTarget(payload);
      setTargets(prev => [res, ...prev]);
      showToast(`Target "${payload.title}" assigned to ${payload.assignedTo}! ✓`);
    } catch (err) {
      const fallback = { ...payload, id: `tar_${Date.now()}` };
      setTargets(prev => [fallback, ...prev]);
      showToast(`Target "${payload.title}" assigned locally! ✓`);
    }
    setIsAssignModalOpen(false);
    setNewTitle('');
    if (onTargetUpdate) onTargetUpdate();
  };

  const handleOpenEdit = (t) => {
    setEditModalTarget(t);
    setEditAchieved(t.achieved);
  };

  const handleSaveTarget = async (e) => {
    e.preventDefault();
    if (!editModalTarget) return;

    const newAch = Number(editAchieved);
    try {
      if (editModalTarget.id && !String(editModalTarget.id).startsWith('tar_')) {
        await updateHrTarget(editModalTarget.id, { achieved: newAch, target: editModalTarget.target });
      }
    } catch (_) {}

    setTargets(prev => prev.map(t => t.id === editModalTarget.id ? { ...t, achieved: newAch } : t));
    showToast(`Target "${editModalTarget.title}" updated to ${newAch}/${editModalTarget.target}`);
    setEditModalTarget(null);
    if (onTargetUpdate) onTargetUpdate();
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Header Container matching Screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl select-none">🎯</span>
            <h3 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
              Department Targets
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1 font-medium pl-0.5">
            Targets assigned to HR staff &nbsp;&middot;&nbsp; {activeTab}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-xs">
            {['today', 'this week', 'this month'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-lg font-semibold text-[11px] capitalize transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Assign Target to HR</span>
          </button>
        </div>
      </div>

      {/* List of Target Rows matching exact screenshot aesthetics */}
      <div className="space-y-3.5 mb-6">
        {computedTargets.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-8 text-center space-y-3">
            <Target className="w-10 h-10 text-purple-400 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">No HR Targets Assigned Yet</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Click &quot;Assign Target to HR&quot; above to set target metrics for your HR team.
            </p>
          </div>
        ) : (
          computedTargets.map((t) => {
            const isComplete = t.achieved >= t.target;
            const percentage = Math.min(100, Math.round((t.achieved / Math.max(1, t.target)) * 100));

            return (
              <div 
                key={t.id}
                className="py-3 px-1 border-b border-slate-100 flex items-center justify-between gap-4 group"
              >
                {/* Left Label */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm sm:text-base font-bold text-[#0f172a] tracking-tight group-hover:text-purple-900 transition-colors">
                      {t.title}
                    </h4>
                    {t.assignedTo && (
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                        {t.assignedTo}
                      </span>
                    )}
                  </div>
                  {/* Soft Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden max-w-md hidden sm:block">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isComplete ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Right Score Ratio */}
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-xs sm:text-sm font-bold ${
                    isComplete ? 'text-emerald-600' : 'text-rose-500 font-extrabold'
                  }`}>
                    {t.achieved}/{t.target}
                  </span>

                  <button
                    onClick={() => handleOpenEdit(t)}
                    className="opacity-0 group-hover:opacity-100 text-xs text-slate-400 hover:text-slate-700 transition-opacity p-1 cursor-pointer"
                    title="Update progress count"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Spotlight Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Best Performer Card */}
        {bestPerformer ? (
          <div className="bg-white border border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            <div className="text-xs font-bold text-slate-500">
              Best Performer
            </div>
            <div className="text-base sm:text-lg font-bold text-emerald-600 mt-1 tracking-tight">
              {bestPerformer.name}
            </div>
            <div className="text-[10px] text-slate-400 font-mono font-bold tracking-wider mt-0.5">
              {bestPerformer.qualityScore}% QUALITY &nbsp;&middot;&nbsp; {bestPerformer.admissions} admissions
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-center text-xs text-slate-400">
            No staff admissions recorded yet
          </div>
        )}

        {/* Needs Support Card */}
        {needsSupport ? (
          <div className="bg-white border border-rose-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
            <div className="text-xs font-bold text-slate-500">
              Needs Support
            </div>
            <div className="text-base sm:text-lg font-bold text-rose-600 mt-1 tracking-tight">
              {needsSupport.name}
            </div>
            <div className="text-[10px] text-slate-400 font-mono font-bold tracking-wider mt-0.5">
              {needsSupport.qualityScore}% QUALITY &nbsp;&middot;&nbsp; {needsSupport.pending} pending follow-ups
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-center text-xs text-slate-400">
            No staff follow-up data recorded yet
          </div>
        )}
      </div>

      {/* Modal 1: Assign Target to HR */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setIsAssignModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                🎯
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Assign Target to HR Staff
                </h4>
                <p className="text-xs text-slate-500">
                  Set target metrics for HR team members
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateTargetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Daily Admissions Target"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Goal
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newTargetNum}
                    onChange={(e) => setNewTargetNum(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assign To HR Member
                  </label>
                  <select
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="All HR">All HR Team</option>
                    <option value="Kavitha N.">Kavitha N.</option>
                    <option value="Reshma">Reshma</option>
                    <option value="Kalaiselvi">Kalaiselvi</option>
                    <option value="Divya Kannuri">Divya Kannuri</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Assign Target</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Target Achievement Modal */}
      {editModalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setEditModalTarget(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                🎯
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Update Target &amp; Progress
                </h4>
                <p className="text-xs text-slate-500">
                  {editModalTarget.title} &middot; Target Goal: {editModalTarget.target}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveTarget} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Achieved Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={editAchieved}
                  onChange={(e) => setEditAchieved(e.target.value)}
                  className="w-full text-sm font-bold font-mono p-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all"
                >
                  Save Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

