import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  X, 
  Search, 
  Filter,
  Check,
  User,
  Calendar,
  PhoneCall,
  Target,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { getDailyClosures, onDataUpdate } from '../services/api';

export default function DailyTrackerBoard({ 
  customTasks = null,
  onTaskUpdate = null 
}) {
  const [activeTab, setActiveTab] = useState('eod'); // 'eod' | 'tasks'
  const [tasks, setTasks] = useState(customTasks || []);
  const [closures, setClosures] = useState([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form for New Task
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('Kavitha N.');
  const [newDue, setNewDue] = useState('due 5:00 PM');
  const [newPriority, setNewPriority] = useState('high');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load real HR staff EOD submissions from database
  const loadClosures = async () => {
    try {
      const data = await getDailyClosures();
      if (Array.isArray(data)) {
        setClosures(data);
      }
    } catch (e) {
      console.warn('Failed to fetch EOD closures:', e);
    }
  };

  useEffect(() => {
    loadClosures();
    const unsub = onDataUpdate((entity) => {
      if (entity === 'closures') {
        loadClosures();
      }
    });
    return unsub;
  }, []);

  // Compute Live Counts for Top Stat Cards from real EOD closures & tasks
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayClosures = closures.filter(c => c.date === todayStr || !c.date);
    
    const eodSubmitted = todayClosures.length;
    const totalCalls = todayClosures.reduce((acc, c) => acc + (c.callsMade || 0), 0);
    const totalDemos = todayClosures.reduce((acc, c) => acc + (c.demosBooked || 0), 0);
    const totalAdmissions = todayClosures.reduce((acc, c) => acc + (c.admissions || 0), 0);

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;

    return { 
      eodSubmitted, 
      totalCalls, 
      totalDemos, 
      totalAdmissions, 
      completedTasks, 
      inProgressTasks 
    };
  }, [closures, tasks]);

  const handleAcknowledgeEod = (closureId) => {
    setAcknowledgedIds(prev => [...prev, closureId]);
    showToast('✓ Staff EOD Report reviewed & acknowledged by Head of HR!');
  };

  // Cycle Status
  const handleCycleStatus = (id) => {
    const statusOrder = ['not-started', 'in-progress', 'completed', 'delayed'];
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextIdx = (statusOrder.indexOf(t.status) + 1) % statusOrder.length;
        const nextStatus = statusOrder[nextIdx];
        showToast(`Task "${t.title}" status updated to "${nextStatus}"`);
        return { ...t, status: nextStatus };
      }
      return t;
    }));
    if (onTaskUpdate) onTaskUpdate();
  };

  // Add Task
  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask = {
      id: `task_${Date.now()}`,
      title: newTitle.trim(),
      assignedTo: newAssignee,
      dueTime: newDue,
      priority: newPriority,
      status: 'not-started'
    };

    setTasks(prev => [newTask, ...prev]);
    setIsAddModalOpen(false);
    setNewTitle('');
    showToast(`New team task "${newTask.title}" added to daily tracker!`);
    if (onTaskUpdate) onTaskUpdate();
  };

  return (
    <div className="w-full space-y-5">
      {/* Toast Notification */}
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

      {/* Top Stat Cards Grid matching screenshot style */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Card 1: HR EODs Received */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs border-t-4 border-t-purple-600">
          <div className="text-2xl sm:text-3xl font-bold text-purple-700 tracking-tight">
            {stats.eodSubmitted}
          </div>
          <div className="text-xs font-semibold text-slate-700 mt-1">
            HR EOD Reports Submitted
          </div>
        </div>

        {/* Card 2: Calls Made */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs border-t-4 border-t-cyan-500">
          <div className="text-2xl sm:text-3xl font-bold text-cyan-600 tracking-tight">
            {stats.totalCalls}
          </div>
          <div className="text-xs font-semibold text-slate-700 mt-1">
            Total Calls Made Today
          </div>
        </div>

        {/* Card 3: Demos Booked */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs border-t-4 border-t-amber-500">
          <div className="text-2xl sm:text-3xl font-bold text-amber-600 tracking-tight">
            {stats.totalDemos}
          </div>
          <div className="text-xs font-semibold text-slate-700 mt-1">
            Demos Booked Today
          </div>
        </div>

        {/* Card 4: Admissions Closed */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs border-t-4 border-t-emerald-500">
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight">
            {stats.totalAdmissions}
          </div>
          <div className="text-xs font-semibold text-slate-700 mt-1">
            Admissions Closed Today
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl select-none">📋</span>
              <h3 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
                Daily Tracker &amp; Staff EOD Submissions
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1 font-medium pl-0.5">
              Live End-of-Day reports submitted by HR team members to Head of HR
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('eod')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'eod' ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Staff EOD Reports ({closures.length})
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'tasks' ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Team Tasks ({tasks.length})
              </button>
            </div>

            {activeTab === 'tasks' && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Task</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: Live HR Staff EOD Reports */}
        {activeTab === 'eod' && (
          <div className="space-y-4">
            {closures.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-8 text-center space-y-3">
                <FileText className="w-10 h-10 text-purple-400 mx-auto" />
                <h4 className="text-base font-bold text-slate-800">No EOD Reports Submitted Yet Today</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When HR team members submit their daily End-of-Day closure report from their HR Dashboard, their details will automatically show up here for the HR Head to review.
                </p>
              </div>
            ) : (
              closures.map((c, idx) => {
                const isAck = acknowledgedIds.includes(c._id || c.id || idx);
                const timeLabel = c.submittedAt 
                  ? new Date(c.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Today EOD';

                return (
                  <div
                    key={c._id || c.id || idx}
                    className="bg-white border border-slate-200/90 hover:border-purple-300 rounded-2xl p-5 shadow-2xs transition-all space-y-3"
                  >
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                          {(c.counselorName || 'HR')[0]}
                        </div>
                        <div>
                          <div className="text-base font-extrabold text-slate-900 leading-tight">
                            {c.counselorName || 'HR Executive'}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {c.branch || 'Saravanampatti Branch'} &middot; Submitted at {timeLabel} &middot; Date: {c.date || 'Today'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAck ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Reviewed &amp; Acknowledged
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAcknowledgeEod(c._id || c.id || idx)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-full shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Reviewed</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* EOD Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                      <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                        <div className="text-xs text-slate-500 font-semibold">Calls Made</div>
                        <div className="text-lg font-black text-slate-900 mt-1">{c.callsMade || 0}</div>
                        <div className="text-[10px] text-cyan-600 font-medium">{c.connected || 0} connected</div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                        <div className="text-xs text-slate-500 font-semibold">Demos Booked</div>
                        <div className="text-lg font-black text-amber-600 mt-1">{c.demosBooked || 0}</div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                        <div className="text-xs text-slate-500 font-semibold">Admissions</div>
                        <div className="text-lg font-black text-emerald-600 mt-1">{c.admissions || 0}</div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                        <div className="text-xs text-slate-500 font-semibold">Fees Collected</div>
                        <div className="text-lg font-black text-purple-700 mt-1">₹{(c.feesCollected || 0).toLocaleString('en-IN')}</div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100 col-span-2 sm:col-span-1">
                        <div className="text-xs text-slate-500 font-semibold">Pending Follow-ups</div>
                        <div className="text-lg font-black text-rose-500 mt-1">{c.pendingFus || 0}</div>
                      </div>
                    </div>

                    {/* EOD Notes */}
                    {c.notes && (
                      <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-3 text-xs text-purple-950 font-medium">
                        <strong className="font-bold">EOD Remarks:</strong> {c.notes}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: Tasks Tracker */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {tasks.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-8 text-center space-y-3">
                <ClipboardList className="w-10 h-10 text-purple-400 mx-auto" />
                <h4 className="text-base font-bold text-slate-800">No Team Tasks Added Yet</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click &quot;Add Task&quot; above to create and assign daily tasks for the HR team.
                </p>
              </div>
            ) : (
              tasks.map((task) => {
                const isCompleted = task.status === 'completed';
                const isInProgress = task.status === 'in-progress';
                const isNotStarted = task.status === 'not-started';
                const isDelayed = task.status === 'delayed';

                return (
                  <div
                    key={task.id}
                    className="group py-3 px-2 border-b border-slate-100 flex items-center justify-between gap-3 hover:bg-slate-50/70 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span 
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          isCompleted 
                            ? 'bg-emerald-500' 
                            : isInProgress 
                            ? 'bg-cyan-500'
                            : isDelayed
                            ? 'bg-rose-500 animate-pulse'
                            : 'bg-slate-400'
                        }`}
                      />

                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-[#0f172a] tracking-tight group-hover:text-purple-900 transition-colors">
                          {task.title}
                        </h4>

                        <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>{task.assignedTo}</span>
                          <span className="text-slate-300 font-bold">&middot;</span>
                          <span>{task.dueTime}</span>
                          <span className="text-slate-300 font-bold">&middot;</span>
                          <span>{task.priority}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <button
                        onClick={() => handleCycleStatus(task.id)}
                        className="cursor-pointer transition-transform active:scale-95"
                        title="Click to cycle status"
                      >
                        {isInProgress && (
                          <span className="inline-block bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-md tracking-wide">
                            in-progress
                          </span>
                        )}

                        {isNotStarted && (
                          <span className="inline-block bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-md tracking-wide">
                            not-started
                          </span>
                        )}

                        {isCompleted && (
                          <span className="inline-block bg-[#dcfce7] text-[#16a34a] border border-[#bbf7d0] text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-md tracking-wide">
                            completed
                          </span>
                        )}

                        {isDelayed && (
                          <span className="inline-block bg-[#ffe4e6] text-[#e11d48] border border-[#fecdd3] text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-md tracking-wide">
                            delayed
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Add New Task Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                📋
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Add New Team Task
                </h4>
                <p className="text-xs text-slate-500">
                  Assign task &amp; set deadline on daily tracker
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Call back 12 demo no-shows"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Owner
                  </label>
                  <input
                    type="text"
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="high">high</option>
                    <option value="medium">medium</option>
                    <option value="low">low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Due Time
                </label>
                <input
                  type="text"
                  placeholder="e.g. due 5:00 PM or due EOD"
                  value={newDue}
                  onChange={(e) => setNewDue(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

