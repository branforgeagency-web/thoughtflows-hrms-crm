import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Send, 
  CheckCircle2, 
  X, 
  Calendar, 
  Building2, 
  Users, 
  Filter, 
  Sparkles,
  Printer,
  Share2
} from 'lucide-react';

const REPORTS_LIST = [
  {
    id: 'rep_01',
    title: 'Daily department report',
    description: 'Complete breakdown of daily calls, demos scheduled, follow-ups & lead conversions across all 14 branches.',
    category: 'Daily',
    format: 'PDF / Excel'
  },
  {
    id: 'rep_02',
    title: 'Team performance report',
    description: 'Counsellor-wise quality scores, completed tasks, pending work, and attendance status sorted by top performers.',
    category: 'Team',
    format: 'PDF / Excel'
  },
  {
    id: 'rep_03',
    title: 'Pending approval report',
    description: 'Audit log of fee concessions, discount approvals, commission waivers, and pending management sign-offs.',
    category: 'Approvals',
    format: 'PDF'
  },
  {
    id: 'rep_04',
    title: 'Escalation report',
    description: 'Detailed log of operational escalations, fee disputes, trainer substitution requests, and resolution timestamps.',
    category: 'Escalations',
    format: 'PDF'
  },
  {
    id: 'rep_05',
    title: 'Target vs achievement report',
    description: 'Monthly admission targets, current enrolments, shortfall analysis, and branch revenue projections.',
    category: 'Targets',
    format: 'PDF / Excel'
  },
  {
    id: 'rep_06',
    title: 'Management summary report',
    description: 'Executive briefing for Founders & Operational Heads summarizing overall department health, ROI & key metrics.',
    category: 'Executive',
    format: 'PDF'
  }
];

export default function ReportsExportBoard({ 
  departmentName = "HR department",
  onBackToDepartments = null 
}) {
  const [activeTimeframe, setActiveTimeframe] = useState('Today'); // 'Today', 'This Week', 'This Month', 'Branch-wise', 'Team-wise'
  const [selectedReport, setSelectedReport] = useState(null);
  const [sendReportModal, setSendReportModal] = useState(null);
  const [recipientEmail, setRecipientEmail] = useState('management@thoughtflows.in');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
  };

  const handleDownloadPDF = (report) => {
    showToast(`Downloading PDF for "${report.title}"... ✓`);
  };

  const handleOpenSendModal = (report) => {
    setSendReportModal(report);
  };

  const handleSendReport = (e) => {
    e.preventDefault();
    if (!sendReportModal) return;

    showToast(`"${sendReportModal.title}" sent successfully to ${recipientEmail}!`);
    setSendReportModal(null);
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
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
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {/* Document / Report Icon */}
          <span className="text-slate-400 text-lg sm:text-xl">📄</span>
          <h3 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
            Reports
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1 font-medium pl-0.5">
          Generate &amp; export &nbsp;&middot;&nbsp; {departmentName}
        </p>

        {/* Timeframe Filter Pills Bar matching exact screenshot styling */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {['Today', 'This Week', 'This Month', 'Branch-wise', 'Team-wise'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTimeframe(t)}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
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

      {/* List of Report Rows (Exact Screenshot Aesthetics) */}
      <div className="divide-y divide-slate-100 border-t border-slate-100">
        {REPORTS_LIST.map((rep) => (
          <div
            key={rep.id}
            className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-slate-50/60 px-2 rounded-xl transition-colors"
          >
            {/* Left Title */}
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-slate-900 tracking-tight group-hover:text-purple-900 transition-colors">
                {rep.title}
              </h4>
            </div>

            {/* Right Action Buttons: View | PDF | Send (Matching exact screenshot styling) */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleViewReport(rep)}
                className="border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer transition-all shadow-2xs active:scale-95"
              >
                View
              </button>

              <button
                onClick={() => handleDownloadPDF(rep)}
                className="border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer transition-all shadow-2xs active:scale-95"
              >
                PDF
              </button>

              <button
                onClick={() => handleOpenSendModal(rep)}
                className="border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer transition-all shadow-2xs active:scale-95"
              >
                Send
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* View Report Preview Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                📄
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {selectedReport.title}
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  Timeframe: {activeTimeframe} &middot; {departmentName}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <p className="leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {selectedReport.description}
              </p>

              {/* Simulated Data Preview */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-900 text-slate-100 font-mono text-[11px] space-y-1.5 overflow-x-auto">
                <div className="text-emerald-400 font-bold">--- REPORT SUMMARY ENGINE LOG ---</div>
                <div>Generated At: {new Date().toLocaleString()}</div>
                <div>Scope: {departmentName} ({activeTimeframe})</div>
                <div>Status: VERIFIED &amp; COMPLETED</div>
                <div className="text-slate-400 pt-2">Total Rows Processed: 428 records</div>
                <div className="text-slate-400">Export Format: {selectedReport.format}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-5 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => { handleDownloadPDF(selectedReport); setSelectedReport(null); }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Report Modal */}
      {sendReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setSendReportModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                📧
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Send Report via Email / System
                </h4>
                <p className="text-xs text-slate-500 truncate max-w-[260px]">
                  {sendReportModal.title}
                </p>
              </div>
            </div>

            <form onSubmit={handleSendReport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Recipient Email / User
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Selected Timeframe
                </label>
                <div className="text-xs font-mono font-semibold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                  {activeTimeframe} &middot; {departmentName}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSendReportModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md flex items-center gap-1.5 transition-all"
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
