import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Send,
  CheckCircle2,
  X
} from 'lucide-react';
import { getTeam, sendStaffReminder, onDataUpdate } from '../services/api';

// Only these departments have a notification inbox a reminder can reach
const REMINDABLE = ['DEP-HR-001', 'ACAD', 'CCCP'];

const statusOf = (quality) => {
  if (typeof quality !== 'number') return 'No data';
  if (quality >= 90) return 'Excellent';
  if (quality >= 75) return 'Good';
  return 'Average';
};

// Live team roster: one row per staff account, with workload & quality
// computed by the server from leads (HR) or students & ratings (Training)
const toRow = (m) => ({
  id: m._id || m.id,
  name: m.name,
  role: m.role || 'Staff',
  branchName: m.branchName || 'Unassigned',
  departmentCode: m.departmentCode,
  doneCount: m.completed || 0,
  totalCount: m.assigned || 0,
  pendingCount: m.pending || 0,
  qualityScore: typeof m.quality === 'number' ? m.quality : null,
  qualityBasis: m.qualityBasis || '',
  workLabel: m.workLabel || { assigned: 'assigned', completed: 'done', pending: 'pending' },
  status: statusOf(m.quality),
  isOff: m.available === false,
  initial: (m.name || '?').trim()[0]?.toUpperCase() || '?'
});

export default function TeamPerformanceBoard({
  customMembers = null,
  title = "Team Performance",
  showSearch = true,
  departmentCode = '',
  branchName = '',
  onRemind = null
}) {
  const [members, setMembers] = useState(customMembers || []);
  const [loading, setLoading] = useState(!customMembers);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [remindedIds, setRemindedIds] = useState({});
  const [remindModalMember, setRemindModalMember] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [customNote, setCustomNote] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (customMembers) return;
    try {
      const params = {};
      if (departmentCode) params.departmentCode = departmentCode;
      if (branchName) params.branchName = branchName;
      const data = await getTeam(params);
      setMembers(Array.isArray(data) ? data.map(toRow) : []);
      setLoadError('');
    } catch (e) {
      setLoadError(e?.response?.data?.error || 'Could not load the team');
    } finally {
      setLoading(false);
    }
  }, [customMembers, departmentCode, branchName]);

  useEffect(() => {
    if (customMembers) { setMembers(customMembers); return undefined; }
    load();
    return onDataUpdate((entity) => {
      if (['team', 'leads', 'students', 'feedback', 'users'].includes(entity)) load();
    });
  }, [customMembers, load]);

  // Auto-clear toast
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Filtered & Sorted Members by Quality Score (descending, no-data last)
  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return members
      .filter(m => {
        const matchSearch =
          m.name.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q) ||
          String(m.branchName || '').toLowerCase().includes(q);
        if (statusFilter === 'All') return matchSearch;
        if (statusFilter === 'Off') return matchSearch && m.isOff;
        return matchSearch && m.status === statusFilter;
      })
      .sort((a, b) => (b.qualityScore ?? -1) - (a.qualityScore ?? -1));
  }, [members, searchQuery, statusFilter]);

  const handleOpenRemindModal = (member) => {
    setRemindModalMember(member);
    setCustomNote(`Hi ${member.name}, you have ${member.pendingCount} ${member.workLabel.pending}. Please complete them at your earliest convenience.`);
  };

  const handleSendReminder = async (e) => {
    e?.preventDefault();
    if (!remindModalMember) return;
    setSending(true);
    try {
      await sendStaffReminder({ name: remindModalMember.name, departmentCode: remindModalMember.departmentCode, message: customNote });
      setRemindedIds(prev => ({
        ...prev,
        [remindModalMember.id]: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      if (onRemind) onRemind(remindModalMember, customNote);
      showToast(`Reminder delivered to ${remindModalMember.name}'s notifications`);
      setRemindModalMember(null);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Could not send the reminder');
    } finally {
      setSending(false);
    }
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            {/* Custom Multi-color Bar Chart Icon matching exact design */}
            <div className="w-6 h-6 flex items-end justify-between gap-0.5 p-0.5 rounded bg-slate-100/80 border border-slate-200/60">
              <span className="w-1.5 h-3.5 bg-cyan-500 rounded-xs" />
              <span className="w-1.5 h-4.5 bg-purple-600 rounded-xs" />
              <span className="w-1.5 h-2.5 bg-amber-500 rounded-xs" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
              {title}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1 font-medium pl-0.5">
            {loading ? 'Loading…' : `${members.length} members`} &nbsp;&middot;&nbsp; sorted by quality score
          </p>
        </div>

        {/* Filter & Search Bar */}
        {showSearch && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member, role, ID..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-sans"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-xs">
              {['All', 'Excellent', 'Good', 'Average', 'No data'].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                    statusFilter === f 
                      ? 'bg-white text-slate-900 shadow-2xs font-bold' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* List of Team Performance Rows (Exact Screenshot Aesthetics) */}
      <div className="space-y-3">
        {loadError ? (
          <div className="text-center py-10 bg-rose-50 rounded-2xl border border-rose-200 text-xs font-semibold text-rose-700">{loadError}</div>
        ) : !loading && members.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs font-semibold text-slate-500">No staff accounts yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">Team members appear here once Admin creates their login in User Accounts.</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs font-semibold text-slate-500">{loading ? 'Loading team…' : 'No team members match the current search filter.'}</p>
            <button 
              onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}
              className="mt-2 text-xs text-purple-600 hover:underline font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredMembers.map((m) => {
            const isReminded = remindedIds[m.id];

            return (
              <div
                key={m.id}
                className="group bg-white border border-slate-200/90 hover:border-purple-200 rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4"
              >
                {/* Left Section: Avatar + Name/Role/Stats */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  {/* Purple Circle Avatar with Initial */}
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full ${m.avatarBg || 'bg-[#7c3aed]'} text-white font-extrabold text-sm sm:text-base flex items-center justify-center flex-shrink-0 shadow-2xs font-sans`}>
                    {m.initial || m.name[0]}
                  </div>

                  {/* Member Details */}
                  <div className="min-w-0 flex-1">
                    {/* Top Row: Name + Status Dot (. off / online) */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-bold text-[#0f172a] tracking-tight group-hover:text-purple-900 transition-colors">
                        {m.name}
                      </h4>
                      {m.isOff && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse" />
                          <span className="text-slate-400 font-mono text-[11px]">. off</span>
                        </span>
                      )}
                    </div>

                    {/* Middle Row: Role & Employee ID */}
                    <div className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>{m.role}</span>
                      <span className="text-slate-300 font-bold">&middot;</span>
                      <span className="font-mono text-slate-500">{m.branchName}</span>
                    </div>

                    {/* Bottom Row: Done / Pending / Quality Stats */}
                    <div className="text-xs text-slate-500 font-medium mt-1.5 flex items-center gap-2 flex-wrap">
                      <span className="text-slate-800 font-semibold">
                        {m.workLabel.completed} <span className="font-bold text-slate-900">{m.doneCount}/{m.totalCount}</span> {m.workLabel.assigned}
                      </span>
                      <span className="text-slate-300 font-bold">&middot;</span>
                      <span>
                        <span className="font-semibold text-slate-700">{m.pendingCount}</span> {m.workLabel.pending}
                      </span>
                      <span className="text-slate-300 font-bold">&middot;</span>
                      <span>
                        <span title={m.qualityBasis}>Quality <span className="font-bold text-slate-900">{m.qualityScore !== null ? `${m.qualityScore}%` : "—"}</span></span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Section: Status Pill + Remind Button */}
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Status Tag Pill matching exact screenshot colors */}
                  <div>
                    {m.status === 'Good' && (
                      <span className="inline-block bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] text-[11px] sm:text-xs font-semibold px-3 py-0.5 rounded-full tracking-wide">
                        Good
                      </span>
                    )}
                    {m.status === 'Average' && (
                      <span className="inline-block bg-[#fef3c7] text-[#d97706] border border-[#fde68a] text-[11px] sm:text-xs font-semibold px-3 py-0.5 rounded-full tracking-wide">
                        Average
                      </span>
                    )}
                    {m.status === 'Excellent' && (
                      <span className="inline-block bg-[#dcfce7] text-[#16a34a] border border-[#bbf7d0] text-[11px] sm:text-xs font-semibold px-3 py-0.5 rounded-full tracking-wide">
                        Excellent
                      </span>
                    )}
                    {m.status === 'No data' && (
                      <span title={m.qualityBasis} className="inline-block bg-slate-100 text-slate-500 border border-slate-200 text-[11px] sm:text-xs font-semibold px-3 py-0.5 rounded-full tracking-wide">
                        No data
                      </span>
                    )}
                  </div>

                  {/* Remind Button */}
                  <button
                    onClick={() => handleOpenRemindModal(m)}
                    disabled={!REMINDABLE.includes(m.departmentCode)}
                    title={REMINDABLE.includes(m.departmentCode) ? 'Send to their notification bell' : 'This department has no notification inbox'}
                    className={`border text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 ${
                      isReminded
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-bold'
                        : 'border-slate-300/90 hover:border-slate-400 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {isReminded ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Sent ({isReminded})</span>
                      </>
                    ) : (
                      <>
                        <span>Remind</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Remind Modal */}
      {remindModalMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setRemindModalMember(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                {remindModalMember.initial}
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Send Task Reminder
                </h4>
                <p className="text-xs text-slate-500">
                  To {remindModalMember.name} &middot; {remindModalMember.branchName}
                </p>
              </div>
            </div>

            <form onSubmit={handleSendReminder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pending Task Overview
                </label>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div><strong>Pending:</strong> {remindModalMember.pendingCount} {remindModalMember.workLabel.pending}</div>
                  <div><strong>Quality:</strong> {remindModalMember.qualityScore !== null ? `${remindModalMember.qualityScore}%` : "—"} ({remindModalMember.qualityBasis || remindModalMember.status})</div>
                  <div><strong>Progress:</strong> {remindModalMember.doneCount}/{remindModalMember.totalCount} {remindModalMember.workLabel.assigned} {remindModalMember.workLabel.completed}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Custom Reminder Message
                </label>
                <textarea
                  rows={3}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRemindModalMember(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sending ? 'Sending…' : 'Send Reminder'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
