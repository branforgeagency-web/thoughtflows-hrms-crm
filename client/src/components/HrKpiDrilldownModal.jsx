import React, { useMemo, useState } from 'react';
import { X, Search, Calendar, PhoneCall } from 'lucide-react';

// Shows the records behind a Home KPI card (calls, follow-ups, demos, admissions).
// Every list is built by the dashboard with the SAME rules as the card's count.

const fmtTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Pill = ({ children, tone = 'slate' }) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200'
  };
  return <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold ${tones[tone] || tones.slate}`}>{children}</span>;
};

export default function HrKpiDrilldownModal({ kind, data, onClose, onCallLead, onBookDemo }) {
  const [q, setQ] = useState('');
  const [sub, setSub] = useState('all'); // per-card sub filter

  const config = useMemo(() => {
    switch (kind) {
      case 'calls':
        return {
          title: 'Calls Logged Today',
          tabs: [['all', 'All'], ['connected', 'Connected'], ['not', 'Not connected']],
          rows: data.calls,
          filter: (r) => sub === 'all' || (sub === 'connected' ? r.connected : !r.connected),
          cols: ['Time', 'Candidate', 'Mobile', 'Outcome', ''],
          render: (r) => [
            fmtTime(r.time),
            r.name || '—',
            r.phone || '—',
            <Pill tone={r.connected ? 'green' : 'red'}>{r.outcome || (r.connected ? 'Connected' : 'Not connected')}</Pill>,
            r.lead ? <CallBtn onClick={() => onCallLead(r.lead)} /> : null
          ]
        };
      case 'followups':
        return {
          title: 'Follow-ups Due (today or earlier)',
          tabs: [['all', 'All'], ['overdue', 'Overdue'], ['today', 'Today'], ['nodate', 'No date set']],
          rows: data.followups,
          filter: (r) => sub === 'all' || r.bucket === sub,
          cols: ['Candidate', 'Mobile', 'Stage', 'Follow-up', 'Remarks', ''],
          render: (r) => [
            r.lead.fullName || r.lead.name || '—',
            r.lead.phone || '—',
            <Pill tone="teal">{String(r.lead.stage || 'new').replace(/_/g, ' ').toUpperCase()}</Pill>,
            r.bucket === 'nodate'
              ? <Pill>No date</Pill>
              : <Pill tone={r.bucket === 'overdue' ? 'red' : 'amber'}>{fmtDate(r.lead.followUpDate)}{r.lead.followUpTime ? ` · ${r.lead.followUpTime}` : ''}</Pill>,
            <span className="line-clamp-2 max-w-[260px]" title={r.lead.followUpNote || r.lead.notes || ''}>{r.lead.followUpNote || r.lead.notes || '—'}</span>,
            <CallBtn onClick={() => onCallLead(r.lead)} />
          ]
        };
      case 'demos':
        return {
          title: 'Demos Booked',
          tabs: [['all', 'All'], ['pending', 'Pending faculty'], ['assigned', 'Assigned'], ['attended', 'Attended']],
          rows: data.demos,
          filter: (r) => sub === 'all' || r.bucket === sub,
          cols: ['Candidate', 'Mobile', 'Course', 'Demo date', 'Trainer', 'Status'],
          render: (r) => [
            r.demo.candidateName || '—',
            r.demo.phone || '—',
            r.demo.course || '—',
            `${fmtDate(r.demo.preferredDate)}${r.demo.time || r.demo.timeSlot ? ` · ${r.demo.time || r.demo.timeSlot}` : ''}`,
            r.demo.trainer && r.demo.trainer !== 'Unassigned' ? r.demo.trainer : <Pill tone="amber">Pending faculty</Pill>,
            <Pill tone={r.bucket === 'attended' ? 'green' : 'slate'}>{String(r.demo.status || 'scheduled').toUpperCase()}</Pill>
          ]
        };
      case 'admissions':
      default:
        return {
          title: 'Admissions',
          tabs: [['month', 'This month'], ['all', 'All enrolled']],
          rows: data.admissions,
          filter: (r) => (sub === 'month' ? r.thisMonth : true),
          cols: ['Student', 'Student ID', 'Mobile', 'Course', 'Admission date', 'Fee paid'],
          render: (r) => [
            r.student.name || r.student.fullName || '—',
            r.student.studentId || '—',
            r.student.phone || '—',
            r.student.course || '—',
            fmtDate(r.student.admissionDate || r.student.createdAt),
            r.student.paidAmount ? `₹${Number(r.student.paidAmount).toLocaleString('en-IN')}` : '—'
          ]
        };
    }
  }, [kind, data, sub, onCallLead]);

  // Admissions opens on "This month" (what the card counts)
  React.useEffect(() => { setSub(kind === 'admissions' ? 'month' : 'all'); setQ(''); }, [kind]);

  if (!kind) return null;

  const needle = q.trim().toLowerCase();
  const visible = (config.rows || []).filter(config.filter).filter((r) => !needle || JSON.stringify(r).toLowerCase().includes(needle));

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">{config.title}</h2>
            <p className="text-xs text-slate-500">{visible.length} record{visible.length === 1 ? '' : 's'}</p>
          </div>
          <div className="flex items-center gap-2">
            {kind === 'demos' && onBookDemo && (
              <button type="button" onClick={onBookDemo}
                className="px-3 py-1.5 rounded-lg bg-[#0e6977] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                <Calendar className="w-3.5 h-3.5" /> Book new demo
              </button>
            )}
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="px-5 py-3 flex items-center gap-2 flex-wrap border-b border-slate-100">
          {config.tabs.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setSub(key)}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${sub === key ? 'bg-[#0e6977] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {label}
            </button>
          ))}
          <div className="ml-auto relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / mobile"
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs w-52 focus:outline-none focus:ring-2 focus:ring-teal-300" />
          </div>
        </div>

        <div className="overflow-auto flex-1">
          {visible.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">No records</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>{config.cols.map((c, i) => <th key={i} className="py-2.5 px-3 font-bold text-slate-500 uppercase tracking-wider text-[10px]">{c}</th>)}</tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={r.key || i} className="border-t border-slate-100 hover:bg-slate-50/70">
                    {config.render(r).map((cell, j) => <td key={j} className="py-2.5 px-3 text-slate-700 align-top">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function CallBtn({ onClick }) {
  return (
    <button type="button" onClick={onClick} title="Open call form"
      className="w-7 h-7 rounded-lg bg-teal-50 text-[#0e6977] hover:bg-teal-100 inline-flex items-center justify-center cursor-pointer">
      <PhoneCall className="w-3.5 h-3.5" />
    </button>
  );
}
