import React, { useMemo, useState } from 'react';
import { X, Download, Send, TrendingUp } from 'lucide-react';
import { createApproval } from '../services/api';

// Every number here is computed from live records passed in by the Marketing
// dashboard: campaigns (spend typed in; leads / admissions / revenue counted
// by the server from StudentLead + Student fees), lead sources, branch lead
// demand, creatives, the lead pool and the branch list.
const inr = (n) => (n === null || n === undefined || Number.isNaN(n) ? '—' : `₹${Math.round(Number(n)).toLocaleString('en-IN')}`);
const shortInr = (n) => {
  const v = Number(n) || 0;
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}k`;
  return `₹${v}`;
};
const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : '—');
const escapeHtml = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export default function RoiReportsBoard({
  campaigns = [],
  sources = [],
  demands = [],
  creatives = [],
  leads = [],
  branches = [],
  currentUser,
  onToast,
  className = ''
}) {
  const toast = (m) => onToast && onToast(m);
  const [selectedId, setSelectedId] = useState(null);
  const [sendId, setSendId] = useState(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const totals = useMemo(() => {
    const spend = campaigns.reduce((s, c) => s + (Number(c.spent) || 0), 0);
    const revenue = campaigns.reduce((s, c) => s + (Number(c.revenue) || 0), 0);
    const campaignLeads = campaigns.reduce((s, c) => s + (c.leads || 0), 0);
    const campaignAdm = campaigns.reduce((s, c) => s + (c.admissions || 0), 0);
    const admitted = leads.filter((l) => l.stage === 'admitted').length;
    return {
      leads: leads.length,
      admitted,
      spend,
      revenue,
      campaignLeads,
      campaignAdm,
      roi: spend ? Math.round(((revenue - spend) / spend) * 100) : null,
      cpa: spend && campaignAdm ? spend / campaignAdm : null,
      cpl: spend && campaignLeads ? spend / campaignLeads : null
    };
  }, [campaigns, leads]);

  const reports = useMemo(() => {
    const byLeads = [...campaigns].sort((a, b) => (b.leads || 0) - (a.leads || 0));
    const bestRoi = [...campaigns].filter((c) => Number(c.spent) > 0).sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi))[0];
    const topSource = [...sources].sort((a, b) => b.leads - a.leads)[0];
    const bestSource = [...sources].filter((s) => s.leads >= 5).sort((a, b) => (b.adm / b.leads) - (a.adm / a.leads))[0];
    const branchRows = [...branches].sort((a, b) => (b.leadCount || 0) - (a.leadCount || 0));
    const openDemands = demands.filter((d) => d.status !== 'Closed');
    const demandFor = (name) => openDemands.filter((d) => String(d.branch || '').toLowerCase() === String(name || '').toLowerCase());
    const creativeStatus = creatives.reduce((m, c) => ({ ...m, [c.status]: (m[c.status] || 0) + 1 }), {});
    const campaignByCode = new Map(campaigns.map((c) => [c.code, c]));
    const creativeCampaigns = [...new Set(creatives.map((c) => c.campaignCode).filter(Boolean))];

    return [
      {
        id: 'rep-campaign',
        title: 'Campaign performance report',
        category: 'Ad campaigns & spend',
        summary: `${campaigns.length} campaigns · ${campaigns.filter((c) => c.status === 'Live').length} live. Leads and admissions are counted from the lead pool by campaign code.`,
        keyMetrics: [
          { label: 'Spend (this month / total)', value: `${inr(campaigns.reduce((t, c) => t + (Number(c.spentThisMonth) || 0), 0))} / ${inr(totals.spend)}` },
          { label: 'Campaign leads', value: totals.campaignLeads },
          { label: 'Blended CPL', value: inr(totals.cpl) },
          { label: 'Admissions', value: totals.campaignAdm }
        ],
        columns: ['Campaign', 'Channel', 'Spend', 'This month', 'Leads', 'CPL', 'Adm', 'ROI'],
        rows: byLeads.map((c) => [c.name, c.channel || '—', inr(c.spent), inr(c.spentThisMonth || 0), c.leads || 0, inr(c.cpl), c.admissions || 0, c.roi || '—'])
      },
      {
        id: 'rep-source',
        title: 'Lead source ROI report',
        category: 'Attribution & quality',
        summary: 'Volume, duplicates and funnel per lead source, as HR moves each lead (connected → demo → admitted).',
        keyMetrics: [
          { label: 'Top volume source', value: topSource ? `${topSource.source} (${topSource.leads})` : '—' },
          { label: 'Best conversion', value: bestSource ? `${bestSource.source} (${pct(bestSource.adm, bestSource.leads)})` : '—' },
          { label: 'Sources tracked', value: sources.length },
          { label: 'Revenue (campaigns)', value: inr(totals.revenue) }
        ],
        columns: ['Source', 'Quality', 'Spend', 'Leads', 'CPL', 'Adm', 'Lead → Adm'],
        rows: sources.map((s) => [s.source, s.quality, s.spend ? inr(s.spend) : '—', s.leads, s.cpl, s.adm, pct(s.adm, s.leads)])
      },
      {
        id: 'rep-branch',
        title: 'Branch-wise lead report',
        category: 'Branch allocation & demand',
        summary: 'Leads and admissions per branch from the lead pool, with open branch lead requests.',
        keyMetrics: [
          { label: 'Top lead branch', value: branchRows[0] ? `${branchRows[0].name} (${branchRows[0].leadCount || 0})` : '—' },
          { label: 'Open demands', value: openDemands.length },
          { label: 'Leads still needed', value: openDemands.reduce((s, d) => s + (d.gap || 0), 0) },
          { label: 'Branches', value: branches.length }
        ],
        columns: ['Branch', 'City', 'Leads', 'Admitted', 'Conversion', 'Open demand', 'Delivered'],
        rows: branchRows.map((b) => {
          const ds = demandFor(b.name);
          const target = ds.reduce((s, d) => s + (d.targetLeads || 0), 0);
          const delivered = ds.reduce((s, d) => s + (d.deliveredLeads || 0), 0);
          return [b.name, b.city || '—', b.leadCount || 0, b.admittedLeads || 0, b.conversionPct === null || b.conversionPct === undefined ? '—' : `${b.conversionPct}%`, target || '—', target ? `${delivered} (${pct(delivered, target)})` : '—'];
        })
      },
      {
        id: 'rep-cpa',
        title: 'Cost per admission report',
        category: 'Unit economics',
        summary: 'Spend per admission and fees collected from admitted campaign leads.',
        keyMetrics: [
          { label: 'Avg cost / admission', value: inr(totals.cpa) },
          { label: 'Fees collected / admission', value: totals.campaignAdm ? inr(totals.revenue / totals.campaignAdm) : '—' },
          { label: 'Best ROI campaign', value: bestRoi ? `${bestRoi.name} (${bestRoi.roi})` : '—' },
          { label: 'Overall ROI', value: totals.roi === null ? '—' : `${totals.roi}%` }
        ],
        columns: ['Campaign', 'Spend', 'Adm', 'Cost / adm', 'Fees collected', 'ROI'],
        rows: campaigns.map((c) => [c.name, inr(c.spent), c.admissions || 0, inr(c.costPerAdmission), inr(c.revenue), c.roi || '—'])
      },
      {
        id: 'rep-creative',
        title: 'Creative pipeline report',
        category: 'Creatives & approvals',
        summary: 'Creative approvals by status and the campaign results of the campaigns they were made for.',
        keyMetrics: [
          { label: 'Awaiting approval', value: creativeStatus.Submitted || 0 },
          { label: 'Approved', value: creativeStatus.Approved || 0 },
          { label: 'Needs correction', value: creativeStatus['Needs Correction'] || 0 },
          { label: 'Campaigns with creatives', value: creativeCampaigns.length }
        ],
        columns: ['Creative', 'Format', 'Status', 'Campaign', 'Campaign leads', 'Campaign adm'],
        rows: creatives.map((c) => {
          const cm = campaignByCode.get(c.campaignCode);
          return [c.title, c.format || '—', c.status, c.campaignCode || '—', cm ? cm.leads || 0 : '—', cm ? cm.admissions || 0 : '—'];
        })
      }
    ];
  }, [campaigns, sources, demands, creatives, branches, totals]);

  const selected = reports.find((r) => r.id === selectedId) || null;
  const sendReport = reports.find((r) => r.id === sendId) || null;
  const generatedAt = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Printable report → the browser's "Save as PDF"
  const handlePdf = (report) => {
    const w = window.open('', '_blank');
    if (!w) { toast('Allow pop-ups to download the PDF'); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title>
      <style>body{font-family:Arial,sans-serif;padding:28px;color:#0f172a}h1{font-size:20px;margin:0}p{color:#475569;font-size:12px}
      .m{display:flex;gap:10px;margin:14px 0}.m div{border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:11px;flex:1}
      .m b{display:block;font-size:14px;margin-top:2px}table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border-bottom:1px solid #e2e8f0;padding:6px;text-align:left}th{background:#f8fafc;text-transform:uppercase;font-size:10px;color:#64748b}</style>
      </head><body><h1>${escapeHtml(report.title)}</h1><p>ThoughtFlows · Marketing · ${escapeHtml(report.category)} · generated ${escapeHtml(generatedAt)}${currentUser?.name ? ` by ${escapeHtml(currentUser.name)}` : ''}</p>
      <p>${escapeHtml(report.summary)}</p>
      <div class="m">${report.keyMetrics.map((m) => `<div>${escapeHtml(m.label)}<b>${escapeHtml(m.value)}</b></div>`).join('')}</div>
      <table><thead><tr>${report.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
      <tbody>${report.rows.length ? report.rows.map((r) => `<tr>${r.map((v) => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${report.columns.length}">No records yet</td></tr>`}</tbody></table>
      <script>window.onload=function(){window.print()}</script></body></html>`);
    w.document.close();
  };

  // "Send" files the report into the Leadership Hub's Marketing approvals
  const handleSend = async (e) => {
    e.preventDefault();
    if (!sendReport) return;
    setSending(true);
    try {
      const metrics = sendReport.keyMetrics.map((m) => `${m.label}: ${m.value}`).join(' · ');
      await createApproval({
        title: `Marketing report: ${sendReport.title}`,
        description: [metrics, note.trim()].filter(Boolean).join(' — '),
        kind: 'Marketing Report',
        priority: 'low',
        departmentCode: 'MKT',
        branchName: 'All Branches',
        requestedBy: currentUser?.name || ''
      });
      toast(`"${sendReport.title}" sent to Leadership Hub`);
      setSendId(null);
      setNote('');
    } catch (err) {
      toast(err?.response?.data?.error || 'Could not send the report');
    } finally {
      setSending(false);
    }
  };

  const cards = [
    { label: 'Total Leads', value: totals.leads, sub: 'all sources', color: 'cyan' },
    { label: 'Admissions', value: totals.admitted, sub: 'from the lead pool', color: 'emerald' },
    { label: 'Revenue', value: shortInr(totals.revenue), sub: 'fees from campaign leads', color: 'teal' },
    { label: 'Spend', value: shortInr(totals.spend), sub: 'recorded on campaigns', color: 'slate' },
    { label: 'ROI', value: totals.roi === null ? '—' : `${totals.roi}%`, sub: 'return on spend', color: 'emerald' },
    { label: 'Cost / Admission', value: totals.cpa === null ? '—' : inr(totals.cpa), sub: 'campaign admissions', color: 'blue' }
  ];
  const tone = {
    cyan: ['border-t-cyan-500', 'text-cyan-500'],
    emerald: ['border-t-emerald-500', 'text-emerald-600'],
    teal: ['border-t-teal-500', 'text-teal-600'],
    slate: ['border-t-[#0f172a]', 'text-[#0f172a]'],
    blue: ['border-t-blue-600', 'text-blue-600']
  };

  return (
    <div className={`w-full space-y-6 ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {cards.map((c) => (
          <div key={c.label} className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-t-[3.5px] ${tone[c.color][0]} flex flex-col justify-between`}>
            <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${tone[c.color][1]}`}>{c.value}</div>
            <div className="mt-3">
              <div className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">{c.label}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-[0_4px_25px_-5px_rgba(15,23,42,0.05)] space-y-4">
        <div className="pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl leading-none select-none">📈</span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">ROI Reports</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-mono mt-1">Built from live records · PDF or send to Leadership Hub</p>
        </div>

        <div className="space-y-3 sm:space-y-3.5">
          {reports.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200/90 p-4 sm:p-5 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs">
              <div>
                <div className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">{item.title}</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item.rows.length} rows · {item.category}</div>
              </div>
              <div className="shrink-0 flex items-center gap-2 self-end sm:self-auto">
                {[['View', () => setSelectedId(item.id)], ['PDF', () => handlePdf(item)], ['Send', () => setSendId(item.id)]].map(([l, fn]) => (
                  <button key={l} onClick={fn} className="border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer">
                    {l}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200/80 p-6 sm:p-7 animate-scaleUp relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">{selected.title}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{selected.category} · {generatedAt}</p>
                </div>
              </div>
              <button onClick={() => setSelectedId(null)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">{selected.summary}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {selected.keyMetrics.map((m) => (
                  <div key={m.label} className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{m.label}</div>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5 break-words">{m.value}</div>
                  </div>
                ))}
              </div>
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        {selected.columns.map((c, i) => <th key={c} className={`p-3 ${i > 1 ? 'text-right' : ''}`}>{c}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {selected.rows.length === 0 ? (
                        <tr><td colSpan={selected.columns.length} className="p-6 text-center text-slate-400">No records yet</td></tr>
                      ) : selected.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          {row.map((v, i) => <td key={i} className={`p-3 ${i === 0 ? 'font-bold text-slate-900' : i > 1 ? 'text-right font-mono text-slate-700' : 'text-slate-500'}`}>{v}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <button onClick={() => setSelectedId(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Close</button>
              <div className="flex items-center gap-2">
                <button onClick={() => handlePdf(selected)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button onClick={() => { setSendId(selected.id); setSelectedId(null); }} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-sm flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" /> Send to Leadership
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {sendReport && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">📤</span>
                <h3 className="text-base font-bold text-slate-900">Send report</h3>
              </div>
              <button onClick={() => setSendId(null)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSend} className="py-4 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 font-mono">
                <span className="text-slate-400">Report: </span><strong className="text-slate-900">{sendReport.title}</strong>
              </div>
              <div className="p-2.5 rounded-xl border border-teal-200 bg-teal-50/60 text-teal-900 text-[11px]">
                Goes to <b>Leadership Hub → Approvals</b> (Marketing) with the key figures attached.
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Note (optional)</label>
                <textarea rows="3" value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none" />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button type="button" onClick={() => setSendId(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={sending} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" /> Send Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
