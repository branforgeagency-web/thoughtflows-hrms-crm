import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Clock,
  Calendar,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  LogIn,
  LogOut,
  Users
} from 'lucide-react';
import { decideApproval, getHrStaffAttendance, onDataUpdate } from '../services/api';
import { localDateKey } from '../utils/dateUtils';

const daysAgoKey = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateKey(d);
};

const fmtTime = (value, fallback) => {
  if (value) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      });
    }
  }
  return fallback || '—';
};

const fmtDateLabel = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const leaveDateRangeText = (leave) => {
  const from = leave?.leaveFrom;
  const to = leave?.leaveTo;
  if (!from && !to) return 'Date in details';
  if (!to || from === to) return fmtDateLabel(from);
  return `${fmtDateLabel(from)} → ${fmtDateLabel(to)}`;
};

const statusBadge = (sessionStatus) => {
  if (sessionStatus === 'In Progress') {
    return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Logged in</span>;
  }
  if (sessionStatus === 'Completed') {
    return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">Logged out</span>;
  }
  if (sessionStatus === 'Logout missing') {
    return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">Logout missing</span>;
  }
  if (sessionStatus === 'On Leave') {
    return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-800">On Leave</span>;
  }
  return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700">{sessionStatus || 'Not Started'}</span>;
};

const leaveStatusBadge = (status) => {
  if (status === 'approved') {
    return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Approved</span>;
  }
  if (status === 'rejected') {
    return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700">Rejected</span>;
  }
  if (status === 'forwarded') {
    return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-700">Forwarded</span>;
  }
  return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">Pending</span>;
};

export default function HrAttendanceLeavesSection({
  scopeKind = 'all',
  scopeLabel = '',
  branch = '',
  canDecideLeaves = false
}) {
  const today = localDateKey();
  const [range, setRange] = useState('today'); // 'today' | '7' | '30' | 'date'
  const [pickDate, setPickDate] = useState(today);
  const [branchFilter, setBranchFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [leaveFilter, setLeaveFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [data, setData] = useState({ attendance: [], leaves: [], branches: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decidingId, setDecidingId] = useState('');

  const queryParams = useMemo(() => {
    const base = range === 'today'
      ? { from: today, to: today }
      : range === 'date'
        ? { from: pickDate, to: pickDate }
        : { from: daysAgoKey(Number(range) - 1), to: today };
    if (scopeKind === 'branch' && branch) {
      base.branch = branch;
    } else if (branchFilter && branchFilter !== 'all') {
      base.branch = branchFilter;
    }
    return base;
  }, [range, pickDate, today, scopeKind, branch, branchFilter]);

  const load = useCallback(() => {
    setLoading(true);
    getHrStaffAttendance(queryParams)
      .then((res) => {
        setData({
          attendance: Array.isArray(res?.attendance) ? res.attendance : [],
          leaves: Array.isArray(res?.leaves) ? res.leaves : [],
          branches: Array.isArray(res?.branches) ? res.branches : [],
          summary: res?.summary || {}
        });
        setError('');
      })
      .catch((e) => setError(e?.response?.data?.error || e.message || 'Failed to load HR attendance'))
      .finally(() => setLoading(false));
  }, [queryParams]);

  useEffect(() => {
    load();
    const unsub = onDataUpdate((entity) => {
      if (entity === 'attendance' || entity === 'approvals') load();
    });
    const timer = setInterval(load, 60000);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [load]);

  const q = search.trim().toLowerCase();
  const visibleAttendance = useMemo(() => (
    data.attendance.filter((r) => {
      if (!q) return true;
      return [r.employeeName, r.branchName, r.staffRole, r.sessionStatus]
        .some((v) => String(v || '').toLowerCase().includes(q));
    })
  ), [data.attendance, q]);

  const visibleLeaves = useMemo(() => (
    data.leaves.filter((l) => {
      if (leaveFilter !== 'all' && l.status !== leaveFilter) return false;
      if (!q) return true;
      return [l.requestedBy, l.branchName, l.leaveType, l.description, l.title]
        .some((v) => String(v || '').toLowerCase().includes(q));
    })
  ), [data.leaves, leaveFilter, q]);

  const handleLeaveDecision = async (id, action) => {
    setDecidingId(`${id}-${action}`);
    try {
      await decideApproval(id, action);
      load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Could not update leave status');
    } finally {
      setDecidingId('');
    }
  };

  const summary = data.summary || {};

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">HR Attendance & Leave Details</h2>
              {scopeLabel ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {scopeLabel}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live HR login time, logout time, working hours, and leave requests synced automatically.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {['today', '7', '30', 'date'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-xl font-bold border transition-colors ${
                  range === r
                    ? 'bg-[#0f212d] text-white border-[#0f212d]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {r === 'today' ? 'Today' : r === 'date' ? 'Pick date' : `Last ${r} days`}
              </button>
            ))}
            {range === 'date' && (
              <input
                type="date"
                value={pickDate}
                max={today}
                onChange={(e) => setPickDate(e.target.value || today)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
              />
            )}
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>HR Staff</span>
              <Users size={13} className="text-slate-400" />
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">{summary.totalStaff ?? 0}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700">
              <span>Logged In</span>
              <LogIn size={13} />
            </div>
            <div className="text-xl font-black text-emerald-800 mt-1">{summary.loggedInNow ?? 0}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>Logged Out</span>
              <LogOut size={13} />
            </div>
            <div className="text-xl font-black text-slate-800 mt-1">{summary.loggedOut ?? 0}</div>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-rose-700">
              <span>Not Started</span>
              <Clock size={13} />
            </div>
            <div className="text-xl font-black text-rose-800 mt-1">{summary.notStarted ?? 0}</div>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-violet-700">
              <span>On Leave</span>
              <Calendar size={13} />
            </div>
            <div className="text-xl font-black text-violet-800 mt-1">{summary.onLeaveToday ?? 0}</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-700">
              <span>Pending Leaves</span>
              <AlertCircle size={13} />
            </div>
            <div className="text-xl font-black text-amber-800 mt-1">{summary.pendingLeaves ?? 0}</div>
          </div>
        </div>

        {/* Search + Branch Filter */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by HR name, branch, role, or leave reason..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>
          {scopeKind === 'all' && data.branches.length > 0 && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
            >
              <option value="all">All Branches</option>
              {data.branches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}
      </div>

      {/* HR Login & Logout Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">HR Login & Logout Attendance</h3>
            <p className="text-[11px] text-slate-500">
              Showing {visibleAttendance.length} record{visibleAttendance.length === 1 ? '' : 's'}
              {summary.dateFrom ? ` (${summary.dateFrom === summary.dateTo ? fmtDateLabel(summary.dateFrom) : `${fmtDateLabel(summary.dateFrom)} – ${fmtDateLabel(summary.dateTo)}`})` : ''}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 pr-3">Date</th>
                <th className="py-2.5 px-3">HR Staff</th>
                <th className="py-2.5 px-3">Branch</th>
                <th className="py-2.5 px-3">Login Time</th>
                <th className="py-2.5 px-3">Logout Time</th>
                <th className="py-2.5 px-3">Break</th>
                <th className="py-2.5 px-3">Working Hours</th>
                <th className="py-2.5 pl-3">Status & Leave</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && visibleAttendance.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold">
                    Loading HR attendance records...
                  </td>
                </tr>
              ) : visibleAttendance.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold">
                    No HR attendance records found for this filter.
                  </td>
                </tr>
              ) : (
                visibleAttendance.map((row) => (
                  <tr key={row._id || `${row.date}-${row.employeeName}`} className="hover:bg-slate-50/80">
                    <td className="py-3 pr-3 font-semibold text-slate-700 whitespace-nowrap">
                      {fmtDateLabel(row.date)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{row.employeeName}</div>
                      <div className="text-[11px] text-slate-500">{row.staffRole || 'HR'}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                      {row.branchName || '—'}
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-700 whitespace-nowrap">
                      {fmtTime(row.workStartTime, row.checkIn)}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-700 whitespace-nowrap">
                      {fmtTime(row.workEndTime, row.checkOut)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {row.breakMinutesTotal ? `${row.breakMinutesTotal} min` : '0 min'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                      {row.durationText || '—'}
                    </td>
                    <td className="py-3 pl-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {statusBadge(row.sessionStatus)}
                        {row.leaveInfo && row.sessionStatus !== 'On Leave' && (
                          <span
                            title={row.leaveInfo.description || row.leaveInfo.leaveType}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.leaveInfo.status === 'approved'
                                ? 'bg-violet-100 text-violet-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {row.leaveInfo.leaveType} ({row.leaveInfo.status})
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* HR Leave Details & Requests */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">HR Leave Details & Requests</h3>
            <p className="text-[11px] text-slate-500">
              All HR leave applications with dates, type, reason, approval status, and reviewer details.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {['all', 'pending', 'approved', 'rejected'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setLeaveFilter(st)}
                className={`px-2.5 py-1 rounded-lg font-bold border capitalize ${
                  leaveFilter === st
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 pr-3">HR Staff</th>
                <th className="py-2.5 px-3">Branch</th>
                <th className="py-2.5 px-3">Leave Type</th>
                <th className="py-2.5 px-3">Leave Dates</th>
                <th className="py-2.5 px-3">Reason / Details</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Reviewed By</th>
                {canDecideLeaves && <th className="py-2.5 pl-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && visibleLeaves.length === 0 ? (
                <tr>
                  <td colSpan={canDecideLeaves ? 8 : 7} className="py-8 text-center text-slate-400 font-semibold">
                    Loading HR leave records...
                  </td>
                </tr>
              ) : visibleLeaves.length === 0 ? (
                <tr>
                  <td colSpan={canDecideLeaves ? 8 : 7} className="py-8 text-center text-slate-400 font-semibold">
                    No HR leave requests found.
                  </td>
                </tr>
              ) : (
                visibleLeaves.map((leave) => (
                  <tr key={leave._id} className="hover:bg-slate-50/80 align-top">
                    <td className="py-3 pr-3">
                      <div className="font-bold text-slate-900">{leave.requestedBy || '—'}</div>
                      <div className="text-[11px] text-slate-500">{leave.requesterRole || 'HR'}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                      {leave.branchName || '—'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                      {leave.leaveType || 'Leave'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-indigo-700 whitespace-nowrap">
                      {leaveDateRangeText(leave)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs">
                      {leave.description || leave.title || '—'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {leaveStatusBadge(leave.status)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      <div>{leave.decidedBy || '—'}</div>
                      {leave.decidedAt && (
                        <div className="text-[10px] text-slate-400">
                          {new Date(leave.decidedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      )}
                    </td>
                    {canDecideLeaves && (
                      <td className="py-3 pl-3 text-right whitespace-nowrap">
                        {leave.status === 'pending' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={Boolean(decidingId)}
                              onClick={() => handleLeaveDecision(leave._id, 'approved')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <CheckCircle2 size={12} />
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(decidingId)}
                              onClick={() => handleLeaveDecision(leave._id, 'rejected')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700 disabled:opacity-50"
                            >
                              <XCircle size={12} />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={Boolean(decidingId)}
                            onClick={() => handleLeaveDecision(leave._id, 'pending')}
                            className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Reopen
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
