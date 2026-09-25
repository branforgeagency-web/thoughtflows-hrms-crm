import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Send, 
  Plus, 
  X, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Check,
  Building2,
  User,
  MessageSquare
} from 'lucide-react';
import { getEscalations, createEscalation, onDataUpdate } from '../services/api';

export default function EscalationDeskBoard({ 
  customScopeLabel = "HR issues",
  onEscalationChange = null 
}) {
  const [escalations, setEscalations] = useState([]);
  const [filterStatus, setFilterStatus] = useState('open'); // 'open', 'all', 'resolved'
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [mgmtModalEscalation, setMgmtModalEscalation] = useState(null);
  const [mgmtNote, setMgmtNote] = useState('');

  const loadEscalations = async () => {
    try {
      const data = await getEscalations({ departmentCode: 'DEP-HR-001' });
      if (Array.isArray(data)) {
        setEscalations(data.map(e => ({
          id: e._id || e.id,
          ticketId: e.ticketId || `ESC-${(e._id || '').slice(-6).toUpperCase()}`,
          title: e.title,
          priority: e.priority || 'urgent',
          description: e.description || e.details || '',
          owner: e.raisedBy || e.owner || 'HR Staff',
          timeAgo: e.createdAt ? new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
          department: e.department || 'HR Department',
          departmentCode: e.departmentCode || 'DEP-HR-001',
          status: (e.status || 'open').toUpperCase() === 'RESOLVED' ? 'RESOLVED' : 'ESCALATED',
          branch: e.branchName || 'Saravanampatti (SVM)'
        })));
      }
    } catch (e) {
      console.warn('Escalations fetch notice:', e);
    }
  };

  useEffect(() => {
    loadEscalations();
    const unsub = onDataUpdate((entity) => {
      if (entity === 'escalations') {
        loadEscalations();
      }
    });
    return unsub;
  }, []);

  // Form for New Escalation
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('urgent');
  const [newDesc, setNewDesc] = useState('');
  const [newOwner, setNewOwner] = useState('Kavitha N.');
  const [newDept, setNewDept] = useState('HR Department');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Open Escalations Count
  const openCount = useMemo(() => {
    return escalations.filter(e => e.status !== 'RESOLVED').length;
  }, [escalations]);

  // Filtered List
  const filteredList = useMemo(() => {
    return escalations.filter(item => {
      const matchSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.owner.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (filterStatus === 'open') return matchSearch && item.status !== 'RESOLVED';
      if (filterStatus === 'resolved') return matchSearch && item.status === 'RESOLVED';
      return matchSearch;
    });
  }, [escalations, searchQuery, filterStatus]);

  // Mark Resolved Action
  const handleMarkResolved = (id) => {
    setEscalations(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, status: 'RESOLVED' };
      }
      return item;
    }));

    const matched = escalations.find(e => e.id === id);
    showToast(`Escalation ${matched?.ticketId || ''} marked as RESOLVED ✓`);
    if (onEscalationChange) onEscalationChange();
  };

  // Escalate to Mgmt Action
  const handleOpenMgmtModal = (item) => {
    setMgmtModalEscalation(item);
    setMgmtNote(`Escalating issue "${item.title}" (${item.ticketId}) to Executive Founders Desk for priority resolution.`);
  };

  const handleConfirmMgmtEscalation = (e) => {
    e.preventDefault();
    if (!mgmtModalEscalation) return;

    setEscalations(prev => prev.map(item => {
      if (item.id === mgmtModalEscalation.id) {
        return { 
          ...item, 
          status: 'MGMT_ESCALATED',
          description: `${item.description} [Escalated to Management: ${mgmtNote}]` 
        };
      }
      return item;
    }));

    showToast(`Escalation ${mgmtModalEscalation.ticketId} forwarded to Executive Leadership Desk 🚨`);
    setMgmtModalEscalation(null);
    if (onEscalationChange) onEscalationChange();
  };

  // Add New Escalation
  const handleCreateEscalation = (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    const newTicketNum = Math.floor(1000 + Math.random() * 9000);
    const newEntry = {
      id: `esc_${Date.now()}`,
      ticketId: `ESC-TF-2026-0${newTicketNum}`,
      title: newTitle.trim(),
      priority: newPriority,
      description: newDesc.trim(),
      owner: newOwner,
      timeAgo: 'Just now',
      department: newDept,
      departmentCode: 'DEP-HR-001',
      status: 'ESCALATED',
      branch: 'Head Office'
    };

    setEscalations(prev => [newEntry, ...prev]);
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewDesc('');
    showToast(`New Escalation Ticket ${newEntry.ticketId} raised successfully!`);
    if (onEscalationChange) onEscalationChange();
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs">
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

      {/* Main Header Container matching Screenshot */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            {/* Siren Emoji / Alert Icon */}
            <span className="text-xl sm:text-2xl select-none">🚨</span>
            <h3 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
              Escalation Desk
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1 font-medium pl-0.5">
            {customScopeLabel} &nbsp;&middot;&nbsp; {openCount} open
          </p>
        </div>

        {/* Right Controls: Filters & Raise Ticket */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-xs">
            <button
              onClick={() => setFilterStatus('open')}
              className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                filterStatus === 'open' 
                  ? 'bg-white text-slate-900 shadow-2xs font-bold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Open ({openCount})
            </button>
            <button
              onClick={() => setFilterStatus('resolved')}
              className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                filterStatus === 'resolved' 
                  ? 'bg-white text-slate-900 shadow-2xs font-bold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Resolved ({escalations.length - openCount})
            </button>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                filterStatus === 'all' 
                  ? 'bg-white text-slate-900 shadow-2xs font-bold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({escalations.length})
            </button>
          </div>

          {/* Raise Escalation Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Raise Escalation</span>
          </button>
        </div>
      </div>

      {/* Escalation Cards List (Exact Screenshot Layout & Aesthetics) */}
      <div className="space-y-4">
        {filteredList.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-xs font-semibold text-slate-600">No active escalations in this view.</p>
            <p className="text-[11px] text-slate-400 mt-1">All issues are resolved and operating smoothly.</p>
          </div>
        ) : (
          filteredList.map((item) => {
            const isResolved = item.status === 'RESOLVED';
            const isMgmt = item.status === 'MGMT_ESCALATED';

            return (
              <div
                key={item.id}
                className={`group bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 relative border-l-4 ${
                  isResolved 
                    ? 'border-l-emerald-500 opacity-80' 
                    : item.priority === 'urgent'
                    ? 'border-l-rose-500'
                    : 'border-l-amber-500'
                }`}
              >
                {/* Top Row: Left Ticket Pill Badge + Right ESCALATED Status */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  {/* Ticket Code Pill Badge matching exact green/mint style */}
                  <span className="inline-block bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] font-mono text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wide">
                    {item.ticketId}
                  </span>

                  {/* Status Indicator */}
                  <span className={`text-[10px] font-mono font-bold tracking-wider uppercase ${
                    isResolved 
                      ? 'text-emerald-600 font-extrabold'
                      : isMgmt 
                      ? 'text-rose-600 font-extrabold animate-pulse'
                      : 'text-slate-400'
                  }`}>
                    {isResolved ? 'RESOLVED ✓' : isMgmt ? 'ESCALATED TO MGMT 🚨' : 'ESCALATED'}
                  </span>
                </div>

                {/* Middle Row: Title + Urgent dot + Description + Owner/Time */}
                <div className="mb-4">
                  {/* Issue Title & Priority Tag */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm sm:text-base font-bold text-[#0f172a] group-hover:text-rose-900 transition-colors">
                      {item.title}
                    </h4>
                    {item.priority === 'urgent' && !isResolved && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                        <span>urgent</span>
                      </span>
                    )}
                  </div>

                  {/* Main Description matching exact string format */}
                  <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Owner & Time Monospace Subtext */}
                  <div className="text-[11px] text-slate-400 font-mono mt-1.5 flex items-center gap-2 flex-wrap">
                    <span>owner: <strong className="text-slate-500 font-semibold">{item.owner}</strong></span>
                    <span>&middot;</span>
                    <span>{item.timeAgo}</span>
                    {item.branch && (
                      <>
                        <span>&middot;</span>
                        <span className="text-slate-500">{item.branch}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom Action Row matching exact buttons */}
                {!isResolved && (
                  <div className="flex items-center gap-2.5 pt-1">
                    {/* Primary Solid Green Button: Mark Resolved */}
                    <button
                      onClick={() => handleMarkResolved(item.id)}
                      className="bg-[#10b981] hover:bg-emerald-600 text-white font-bold text-xs px-4 py-1.5 rounded-lg border border-[#10b981] shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Mark Resolved</span>
                    </button>

                    {/* Secondary Outlined Button: Escalate to Mgmt */}
                    <button
                      onClick={() => handleOpenMgmtModal(item)}
                      className="bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 text-xs font-semibold px-4 py-1.5 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Escalate to Mgmt</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Escalate to Management Modal */}
      {mgmtModalEscalation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setMgmtModalEscalation(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-sm">
                🚨
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Escalate to Management
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  Ticket: {mgmtModalEscalation.ticketId}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmMgmtEscalation} className="space-y-4">
              <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200 text-xs text-slate-700 space-y-1">
                <div><strong>Issue:</strong> {mgmtModalEscalation.title}</div>
                <div><strong>Owner:</strong> {mgmtModalEscalation.owner}</div>
                <div><strong>Context:</strong> {mgmtModalEscalation.description}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Management Escalation
                </label>
                <textarea
                  rows={3}
                  value={mgmtNote}
                  onChange={(e) => setMgmtNote(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMgmtModalEscalation(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Forward to Mgmt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raise New Escalation Ticket Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-sm">
                🚨
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Raise New Escalation Ticket
                </h4>
                <p className="text-xs text-slate-500">
                  Submit an urgent issue requiring operational attention
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateEscalation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Issue Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fee dispute / Discount promised on call"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Owner
                  </label>
                  <input
                    type="text"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detailed Escalation Description & Lead Reference
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Lead L-TF-CBE-2026-0150 — Student says discount was promised on call..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
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
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
