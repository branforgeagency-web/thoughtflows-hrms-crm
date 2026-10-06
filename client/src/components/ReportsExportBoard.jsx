import React, { useState } from 'react';
import { CheckCircle2, X, Download, Mail } from 'lucide-react';
import {
  getDailyClosures,
  getTeam,
  getApprovals,
  getEscalations,
  getHrTargets,
  getLeads,
  getStudents
} from '../services/api';

const TIMEFRAMES = ['Today', 'This Week', 'This Month'];

// IST calendar day, so "Today" matches the dates the server stores
const istDate = (d = new Date()) => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10);
function rangeStart(timeframe) {
  const now = new Date(Date.now() + 330 * 60000);
  if (timeframe === 'Today') return istDate();
  if (timeframe === 'This Week') {
    const day = (now.getUTCDay() + 6) % 7; // Monday = 0
    return new Date(now.getTime() - day * 864e5).toISOString().slice(0, 10);
  }
  return `${now.toISOString().slice(0, 7)}-01`;
}
const inRange = (value, from) => {
  if (!value) return false;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : istDate(new Date(value));
  return d >= from;
};
const inr = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

// Each report fetches live records and returns { columns, rows, summary }
const REPORTS = [
  {
    id: 'daily',
    title: 'Daily department report',
    description: 'End-of-day closures submitted by each counsellor: calls, connects, demos, admissions, fees and pending follow-ups.',
    build: async ({ from }) => {
      const list = (await getDailyClosures()).filter((c) => c.date >= from);
      const sum = (k) => list.reduce((s, c) => s + (Number(c[k]) || 0), 0);
      return {
        columns: ['Date', 'Counsellor', 'Branch', 'Calls', 'Connected', 'Demos', 'Admissions', 'Fees', 'Pending FUs'],
        rows: list.map((c) => [c.date, c.counselorName, c.branch, c.callsMade, c.connected, c.demosBooked, c.admissions, c.feesCollected, c.pendingFus]),
        summary: `${list.length} closures · ${sum('callsMade')} calls · ${sum('admissions')} admissions · ${inr(sum('feesCollected'))} collected`
      };
    }
  },
  {
    id: 'team',
    title: 'Team performance report',
    description: 'Each team member’s live workload, completions, pending items and quality score.',
    build: async ({ departmentCode }) => {
      const team = await getTeam(departmentCode ? { departmentCode } : undefined);
      return {
        columns: ['Name', 'Role', 'Branch', 'Assigned', 'Completed', 'Pending', 'Quality %', 'Quality basis', 'Available'],
        rows: team.map((m) => [m.name, m.role, m.branchName, m.assigned, m.completed, m.pending, m.quality ?? '', m.qualityBasis || '', m.available === false ? 'No' : 'Yes']),
        summary: `${team.length} members · ${team.reduce((s, m) => s + (m.pending || 0), 0)} pending items`
      };
    }
  },
  {
    id: 'approvals',
    title: 'Pending approval report',
    description: 'Every approval still waiting for a decision, oldest first.',
    build: async ({ departmentCode }) => {
      const list = (await getApprovals({ ...(departmentCode ? { departmentCode } : {}), status: 'pending' }))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      return {
        columns: ['Raised', 'Title', 'Kind', 'Priority', 'Requested by', 'Branch', 'Details'],
        rows: list.map((a) => [istDate(new Date(a.createdAt)), a.title, a.kind, a.priority, a.requestedBy, a.branchName, a.description]),
        summary: `${list.length} pending · ${list.filter((a) => a.priority === 'high').length} high priority`
      };
    }
  },
  {
    id: 'escalations',
    title: 'Escalation report',
    description: 'Escalations raised in the period with their status, owner response and resolution time.',
    build: async ({ departmentCode, from }) => {
      const list = (await getEscalations(departmentCode ? { departmentCode } : undefined)).filter((e) => inRange(e.createdAt, from));
      const hours = (e) => (e.resolvedAt ? Math.round((new Date(e.resolvedAt) - new Date(e.createdAt)) / 36e5) : '');
      return {
        columns: ['Raised', 'Title', 'Type', 'Priority', 'Status', 'Raised by', 'Branch', 'Response', 'Hours to resolve'],
        rows: list.map((e) => [istDate(new Date(e.createdAt)), e.title, e.type, e.priority, e.status, e.raisedBy, e.branchName, e.response, hours(e)]),
        summary: `${list.length} raised · ${list.filter((e) => !['resolved', 'closed'].includes(e.status)).length} still open`
      };
    }
  },
  {
    id: 'targets',
    title: 'Target vs achievement report',
    description: 'Targets set by the Head of HR against what has been achieved.',
    build: async () => {
      const list = await getHrTargets();
      return {
        columns: ['Target', 'Period', 'Assigned to', 'Target value', 'Achieved', 'Achieved %', 'Assigned by'],
        rows: list.map((t) => [t.title, t.period, t.assignedTo, t.target, t.achieved, t.target ? Math.round((t.achieved / t.target) * 100) : '', t.assignedBy]),
        summary: `${list.length} targets · ${list.filter((t) => t.target && t.achieved >= t.target).length} met`
      };
    }
  },
  {
    id: 'summary',
    title: 'Management summary report',
    description: 'Headline numbers for the period: new leads, admissions, fees collected and open approvals / escalations.',
    build: async ({ departmentCode, from }) => {
      const [leadsRes, students, approvals, escalations] = await Promise.all([
        getLeads().catch(() => ({ leads: [] })),
        getStudents().catch(() => []),
        getApprovals({ ...(departmentCode ? { departmentCode } : {}), status: 'pending' }).catch(() => []),
        getEscalations(departmentCode ? { departmentCode } : undefined).catch(() => [])
      ]);
      const leads = (leadsRes?.leads || []).filter((l) => inRange(l.createdAt, from));
      const admitted = students.filter((s) => inRange(s.createdAt, from));
      const collected = students.reduce((s, st) => s + (st.receipts || []).filter((r) => inRange(r.date || r.at, from)).reduce((a, r) => a + (Number(r.amount) || 0), 0), 0);
      const rows = [
        ['New leads', leads.length],
        ['Admissions', admitted.length],
        ['Lead → admission %', leads.length ? Math.round((admitted.length / leads.length) * 100) : ''],
        ['Fees collected', collected],
        ['Pending approvals', approvals.length],
        ['Open escalations', escalations.filter((e) => !['resolved', 'closed'].includes(e.status)).length]
      ];
      return { columns: ['Metric', 'Value'], rows, summary: `${leads.length} leads · ${admitted.length} admissions · ${inr(collected)} collected` };
    }
  }
];

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function ReportsExportBoard({
  departmentCode = '',
  departmentName = 'HR department'
}) {
  const [activeTimeframe, setActiveTimeframe] = useState('Today');
  const [preview, setPreview] = useState(null); // { report, data, loading, error }
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const run = async (report) => {
    setPreview({ report, data: null, loading: true, error: '' });
    try {
      const data = await report.build({ departmentCode, from: rangeStart(activeTimeframe) });
      setPreview({ report, data, loading: false, error: '' });
      return data;
    } catch (e) {
      setPreview({ report, data: null, loading: false, error: e?.response?.data?.error || e.message });
      return null;
    }
  };

  const download = (report, data) => {
    const lines = [data.columns, ...data.rows].map((r) => r.map(csvCell).join(','));
    const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.id}-${departmentName.replace(/\W+/g, '-').toLowerCase()}-${activeTimeframe.replace(/\s+/g, '-').toLowerCase()}-${istDate()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded "${report.title}" (${data.rows.length} rows)`);
  };

  const email = (report, data) => {
    const subject = `${report.title} — ${departmentName} (${activeTimeframe})`;
    const body = `${subject}\n\n${data.summary}\n\nDownload the full CSV from the Reports tab.`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const quick = async (report, action) => {
    const data = preview?.report?.id === report.id && preview.data ? preview.data : await run(report);
    if (data) action(report, data);
  };

  const btn = 'border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer transition-all shadow-2xs active:scale-95';

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-lg sm:text-xl">📄</span>
          <h3 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">Reports</h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1 font-medium pl-0.5">
          Built from live records for {departmentName} · CSV export
        </p>

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              onClick={() => { setActiveTimeframe(t); setPreview(null); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                activeTimeframe === t
                  ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-slate-100 border-t border-slate-100">
        {REPORTS.map((report) => (
          <div key={report.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-slate-50/60 px-2 rounded-xl transition-colors">
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-slate-900 tracking-tight group-hover:text-purple-900 transition-colors">{report.title}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{report.description}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => run(report)} className={btn}>View</button>
              <button onClick={() => quick(report, download)} className={btn}>CSV</button>
              <button onClick={() => quick(report, email)} className={btn}>Email</button>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-7 border border-slate-200 shadow-2xl relative max-h-[88vh] flex flex-col">
            <button
              onClick={() => setPreview(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="mb-4 border-b border-slate-100 pb-4">
              <h4 className="text-base font-bold text-slate-900">{preview.report.title}</h4>
              <p className="text-xs text-slate-400 font-mono">
                {activeTimeframe} (from {rangeStart(activeTimeframe)}) · {departmentName}
              </p>
              {preview.data && <p className="text-xs text-slate-700 font-semibold mt-2">{preview.data.summary}</p>}
            </div>

            <div className="overflow-auto flex-1 text-xs">
              {preview.loading && <div className="py-10 text-center text-slate-400">Building report…</div>}
              {preview.error && <div className="py-10 text-center text-rose-600">{preview.error}</div>}
              {preview.data && preview.data.rows.length === 0 && (
                <div className="py-10 text-center text-slate-400">No records for this period.</div>
              )}
              {preview.data && preview.data.rows.length > 0 && (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 sticky top-0">
                    <tr>{preview.data.columns.map((c) => <th key={c} className="py-2 px-2 font-bold whitespace-nowrap">{c}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.data.rows.slice(0, 200).map((r, i) => (
                      <tr key={i}>{r.map((v, j) => <td key={j} className="py-1.5 px-2 text-slate-700 whitespace-nowrap">{v === null || v === undefined || v === '' ? '—' : String(v)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              )}
              {preview.data && preview.data.rows.length > 200 && (
                <p className="text-[11px] text-slate-400 mt-2">Showing 200 of {preview.data.rows.length} rows — the CSV has all of them.</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
              <button onClick={() => setPreview(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Close</button>
              <button
                disabled={!preview.data}
                onClick={() => email(preview.report, preview.data)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" /> Email summary
              </button>
              <button
                disabled={!preview.data}
                onClick={() => download(preview.report, preview.data)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white shadow-md flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
