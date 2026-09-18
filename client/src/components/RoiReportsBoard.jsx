import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Send, 
  Eye, 
  CheckCircle2, 
  TrendingUp, 
  Sparkles, 
  DollarSign, 
  Users, 
  Award, 
  Building2,
  Calendar,
  Share2
} from 'lucide-react';

export const REPORT_ITEMS = [
  {
    id: 'rep-campaign',
    title: 'Campaign performance report',
    category: 'Ad Campaigns & Spend',
    period: 'Current Month (Sep 2026)',
    summary: 'Comprehensive analysis of 4 active digital campaigns across Meta, Google & WhatsApp.',
    keyMetrics: [
      { label: 'Total Spend', value: '₹66,000' },
      { label: 'Leads Generated', value: '378 leads' },
      { label: 'Blended CPL', value: '₹174 / lead' },
      { label: 'Admissions Closed', value: '26 students' }
    ],
    tableData: [
      { name: 'CPC Weekend Job Drive — Hyderabad', channel: 'Instagram Ads', spend: '₹28,400', leads: 142, cpl: '₹200', adm: 9, roi: '565%' },
      { name: 'Placement Proof Reels', channel: 'YouTube Ads', spend: '₹19,100', leads: 89, cpl: '₹217', adm: 6, roi: '560%' },
      { name: 'Medical Coding Awareness — Coimbatore', channel: 'Facebook Ads', spend: '₹14,800', leads: 39, cpl: '₹379', adm: 2, roi: '184%' },
      { name: 'Free Workshop — Salem College', channel: 'WhatsApp Campaign', spend: '₹3,200', leads: 61, cpl: '₹52', adm: 4, roi: '2525%' }
    ]
  },
  {
    id: 'rep-source',
    title: 'Lead source ROI report',
    category: 'Attribution & Quality',
    period: 'Current Month (Sep 2026)',
    summary: 'Channel conversion efficiency, duplicate filtration rates, and cost-per-admission.',
    keyMetrics: [
      { label: 'Top Volume Channel', value: 'Instagram (142)' },
      { label: 'Highest ROI Channel', value: 'WhatsApp (2525%)' },
      { label: 'Highest Quality Tier', value: 'Direct Website / Organic' },
      { label: 'Revenue Generated', value: '₹5,50,000' }
    ],
    tableData: [
      { name: 'WhatsApp Campaigns', channel: 'Direct Push', spend: '₹3,200', leads: 61, cpl: '₹52', adm: 4, roi: '2525%' },
      { name: 'Instagram Sponsored', channel: 'Meta Paid', spend: '₹28,400', leads: 142, cpl: '₹200', adm: 9, roi: '565%' },
      { name: 'YouTube Video Discovery', channel: 'Google Paid', spend: '₹19,100', leads: 89, cpl: '₹217', adm: 6, roi: '560%' },
      { name: 'Facebook Demographics', channel: 'Meta Paid', spend: '₹14,800', leads: 39, cpl: '₹379', adm: 2, roi: '184%' }
    ]
  },
  {
    id: 'rep-branch',
    title: 'Branch-wise lead report',
    category: 'Branch Allocation & Fulfillment',
    period: 'Current Month (Sep 2026)',
    summary: 'Lead targets, delivered counts, and classroom batch fill rates across all Thoughtflows branches.',
    keyMetrics: [
      { label: 'Top Lead Absorber', value: 'Hyderabad (142)' },
      { label: 'Fulfillment Leader', value: 'Salem (76%)' },
      { label: 'Highest Conversion', value: 'Coimbatore (65%)' },
      { label: 'Pending Demand', value: 'Kochi (50 needed)' }
    ],
    tableData: [
      { name: 'Hyderabad (Madhapur & Ameerpet)', channel: 'Telugu / English', spend: '₹28,400', leads: 142, cpl: '₹200', adm: 9, roi: '95% Met' },
      { name: 'Salem Main Branch', channel: 'Tamil', spend: '₹3,200', leads: 61, cpl: '₹52', adm: 4, roi: '76% Met' },
      { name: 'Coimbatore (Gandhipuram)', channel: 'Tamil', spend: '₹14,800', leads: 39, cpl: '₹379', adm: 2, roi: '65% Met' },
      { name: 'Kochi (MG Road)', channel: 'Malayalam', spend: '₹0 (Pending)', leads: 0, cpl: '—', adm: 0, roi: '0% Met' }
    ]
  },
  {
    id: 'rep-cpa',
    title: 'Cost per admission report',
    category: 'Unit Economics & CAC',
    period: 'Current Month (Sep 2026)',
    summary: 'Customer Acquisition Cost (CAC) per enrolled student versus lifetime student tuition fees.',
    keyMetrics: [
      { label: 'Avg CAC / Student', value: '₹2,519' },
      { label: 'Average Course Fee', value: '₹45,000' },
      { label: 'CAC Margin Ratio', value: '5.6% of Tuition' },
      { label: 'Industry CAC Benchmark', value: '₹4,500 - ₹6,000' }
    ],
    tableData: [
      { name: 'WhatsApp Campus Drive', channel: 'Direct', spend: '₹3,200', leads: 61, cpl: '₹52', adm: 4, roi: '₹800 / adm' },
      { name: 'Instagram Placement Reels', channel: 'Social', spend: '₹28,400', leads: 142, cpl: '₹200', adm: 9, roi: '₹3,155 / adm' },
      { name: 'YouTube Live CPC Masterclass', channel: 'Search/Video', spend: '₹19,100', leads: 89, cpl: '₹217', adm: 6, roi: '₹3,183 / adm' },
      { name: 'Facebook Newsfeed Ads', channel: 'Display', spend: '₹14,800', leads: 39, cpl: '₹379', adm: 2, roi: '₹7,400 / adm' }
    ]
  },
  {
    id: 'rep-reels',
    title: 'Reel performance report',
    category: 'Social Video Reach',
    period: 'Current Month (Sep 2026)',
    summary: 'Organic and paid viral reel performance featuring verified alumni and salary proofs.',
    keyMetrics: [
      { label: 'Total Video Views', value: '148,200 views' },
      { label: 'Engagement Rate', value: '8.4%' },
      { label: 'Direct DM Inquiries', value: '94 leads' },
      { label: 'Top Reel', value: 'Keerthana Optum ₹4.8 LPA' }
    ],
    tableData: [
      { name: 'Keerthana R. Optum Success (9:16)', channel: 'Instagram Reel', spend: '₹8,500', leads: 48, cpl: '₹177', adm: 4, roi: '64k Views' },
      { name: 'Day in Life of Medical Coder', channel: 'Instagram Reel', spend: '₹5,200', leads: 26, cpl: '₹200', adm: 2, roi: '38k Views' },
      { name: 'AAPC CPC Tabular Coding Hack', channel: 'YouTube Shorts', spend: '₹3,400', leads: 18, cpl: '₹188', adm: 1, roi: '27k Views' },
      { name: 'Coimbatore Batch 43 Classroom Vibe', channel: 'Instagram Story', spend: '₹2,000', leads: 12, cpl: '₹166', adm: 1, roi: '19k Views' }
    ]
  }
];

export default function RoiReportsBoard({ onToast, className = "" }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [sendReportModal, setSendReportModal] = useState(null);
  const [recipient, setRecipient] = useState('Founders & Managing Director');
  const [personalNote, setPersonalNote] = useState('Attached is the latest verified marketing performance and admissions ROI report for your review.');

  const handleView = (report) => {
    setSelectedReport(report);
  };

  const handlePdf = (report) => {
    const msg = `📄 Generating official PDF for "${report.title}"... Ready for download!`;
    if (onToast) onToast(msg);
  };

  const handleOpenSend = (report) => {
    setSendReportModal(report);
  };

  const handleSendSubmit = (e) => {
    e.preventDefault();
    const msg = `🚀 "${sendReportModal.title}" dispatched to ${recipient}!`;
    if (onToast) onToast(msg);
    setSendReportModal(null);
  };

  return (
    <div className={`w-full space-y-6 ${className}`}>
      
      {/* ======================================================================= */}
      {/* TOP ROW: 6 METRIC CARDS (EXACT MATCH TO REFERENCE SCREENSHOT)           */}
      {/* ======================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* 1. Total Leads: 378 (Cyan) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-t-[3.5px] border-t-cyan-500 flex flex-col justify-between hover:shadow-md transition-all">
          <div className="text-3xl sm:text-4xl font-extrabold text-cyan-500 tracking-tight">
            378
          </div>
          <div className="mt-3">
            <div className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
              Total Leads
            </div>
          </div>
        </div>

        {/* 2. Admissions: 26 (Green) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-t-[3.5px] border-t-emerald-500 flex flex-col justify-between hover:shadow-md transition-all">
          <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 tracking-tight">
            26
          </div>
          <div className="mt-3">
            <div className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
              Admissions
            </div>
          </div>
        </div>

        {/* 3. Revenue: ₹5.5L (Teal/Green with subtitle 'marketing-sourced') */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-t-[3.5px] border-t-teal-500 flex flex-col justify-between hover:shadow-md transition-all">
          <div className="text-3xl sm:text-4xl font-extrabold text-teal-600 tracking-tight">
            ₹5.5L
          </div>
          <div className="mt-3">
            <div className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
              Revenue
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              marketing-sourced
            </div>
          </div>
        </div>

        {/* 4. Spend: ₹66k (Dark Navy / Black) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-t-[3.5px] border-t-[#0f172a] flex flex-col justify-between hover:shadow-md transition-all">
          <div className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] tracking-tight">
            ₹66k
          </div>
          <div className="mt-3">
            <div className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
              Spend
            </div>
          </div>
        </div>

        {/* 5. ROI: 734% (Emerald Green with subtitle 'return on spend') */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-t-[3.5px] border-t-emerald-500 flex flex-col justify-between hover:shadow-md transition-all">
          <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 tracking-tight">
            734%
          </div>
          <div className="mt-3">
            <div className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
              ROI
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              return on spend
            </div>
          </div>
        </div>

        {/* 6. Cost / Admission: ₹2519 (Royal Blue) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-t-[3.5px] border-t-blue-600 flex flex-col justify-between hover:shadow-md transition-all">
          <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 tracking-tight">
            ₹2519
          </div>
          <div className="mt-3">
            <div className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
              Cost / Admission
            </div>
          </div>
        </div>

      </div>

      {/* ======================================================================= */}
      {/* MAIN CONTAINER: ROI REPORTS (EXACT MATCH TO USER SCREENSHOT)            */}
      {/* ======================================================================= */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-[0_4px_25px_-5px_rgba(15,23,42,0.05)] space-y-4">
        
        {/* Header: Title + Subtitle */}
        <div className="pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl leading-none select-none">📈</span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              ROI Reports
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-mono mt-1">
            Generate &amp; send to management
          </p>
        </div>

        {/* List of 5 Report Cards */}
        <div className="space-y-3 sm:space-y-3.5">
          {REPORT_ITEMS.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200/90 p-4 sm:p-5 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs hover:shadow-xs"
            >
              {/* Left Section: Report Name */}
              <div className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                {item.title}
              </div>

              {/* Right Section: View, PDF, Send Buttons */}
              <div className="shrink-0 flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => handleView(item)}
                  className="border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  View
                </button>

                <button
                  onClick={() => handlePdf(item)}
                  className="border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  PDF
                </button>

                <button
                  onClick={() => handleOpenSend(item)}
                  className="border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  Send
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================================= */}
      {/* MODAL 1: VIEW EXECUTIVE REPORT DATA BREAKDOWN                           */}
      {/* ======================================================================= */}
      {selectedReport && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200/80 p-6 sm:p-7 animate-scaleUp relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {selectedReport.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {selectedReport.category} · {selectedReport.period}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedReport(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="py-4 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                {selectedReport.summary}
              </p>

              {/* 4 Quick Stat Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {selectedReport.keyMetrics.map((m, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{m.label}</div>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Detailed Breakdown Table */}
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs mt-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        <th className="p-3">Source / Campaign</th>
                        <th className="p-3">Channel / Tag</th>
                        <th className="p-3 text-right">Spend</th>
                        <th className="p-3 text-right">Leads</th>
                        <th className="p-3 text-right">CPL</th>
                        <th className="p-3 text-right">Admissions</th>
                        <th className="p-3 text-right">Performance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {selectedReport.tableData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3 font-bold text-slate-900">{row.name}</td>
                          <td className="p-3 text-slate-500">{row.channel}</td>
                          <td className="p-3 text-right font-mono text-slate-700">{row.spend}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">{row.leads}</td>
                          <td className="p-3 text-right font-mono text-slate-600">{row.cpl}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-600">{row.adm}</td>
                          <td className="p-3 text-right font-mono font-bold text-teal-700">{row.roi}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handlePdf(selectedReport);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => {
                    const r = selectedReport;
                    setSelectedReport(null);
                    handleOpenSend(r);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to Management</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 2: SEND REPORT TO MANAGEMENT                                      */}
      {/* ======================================================================= */}
      {sendReportModal && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">📤</span>
                <h3 className="text-base font-bold text-slate-900">Dispatch Executive Report</h3>
              </div>
              <button
                onClick={() => setSendReportModal(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendSubmit} className="py-4 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 font-mono">
                <span className="text-slate-400">Report: </span>
                <strong className="text-slate-900">{sendReportModal.title}</strong>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Send Recipient</label>
                <select
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="Founders & Managing Director">Dr. Vikram C. (Managing Director) &amp; Founders</option>
                  <option value="Regional Directors">Regional Operations Directors (Ganesh N.)</option>
                  <option value="All 12 Branch Managers">All 12 Branch Managers</option>
                  <option value="Finance & Accounts Desk">Finance &amp; Admissions P&amp;L Desk</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Delivery Channels</label>
                <div className="p-2.5 rounded-xl border border-teal-200 bg-teal-50/60 text-teal-900 font-mono text-[11px] flex items-center justify-between">
                  <span>Portal Notification + Automated Email PDF</span>
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Executive Note</label>
                <textarea
                  rows="3"
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSendReportModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Report</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
