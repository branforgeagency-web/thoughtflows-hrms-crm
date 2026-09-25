import React, { useState } from 'react';
import { 
  BookOpen, 
  FileText, 
  Eye, 
  Users, 
  CheckCircle2, 
  X, 
  Send, 
  Search,
  Sparkles,
  Bookmark,
  Building2,
  Check
} from 'lucide-react';

const SOP_DOCUMENTS = [
  {
    id: 'sop_01',
    title: 'Department SOP',
    subtitle: 'Standard Operating Procedure for HR & Admissions',
    category: 'General',
    version: 'v2.4',
    content: `
### 1. Objective
Establish standardized procedures for lead capture, student counselling, fee quotation, demo scheduling, and admission sign-off across all 14 physical branches and digital inquiry channels.

### 2. Lead Handling Guidelines
- All inbound leads from Meta, Google, and Walk-ins must be contacted within 15 minutes.
- Counselors must adhere to approved fee structures. No unauthorized discount may exceed ₹2,000 without Head of HR sign-off.
- Demo bookings must be confirmed via WhatsApp & SMS at least 1 hour prior to session.
    `
  },
  {
    id: 'sop_02',
    title: 'Team responsibilities',
    subtitle: 'Role hierarchy, targets & daily accountability matrix',
    category: 'Operations',
    version: 'v1.8',
    content: `
### 1. Head of HR & Department Heads
- Oversee daily admission funnels, lead conversions, counsellor quality scores, and discount concessions.
- Clear pending approvals and escalations within 2 hours.

### 2. Team Leads & Branch Managers
- Monitor live counsellor calls, branch attendance, and daily target gap.
- Conduct daily 9:00 AM briefing and 6:00 PM closing review.
    `
  },
  {
    id: 'sop_03',
    title: 'Approval rules',
    subtitle: 'Authority matrix for fee concessions, EMIs & waivers',
    category: 'Governance',
    version: 'v3.1',
    content: `
### Concession & EMI Sign-Off Matrix
- **Up to ₹2,000 Waiver**: Authorized by Branch Manager / Team Lead.
- **₹2,001 – ₹5,000 Waiver**: Requires Head of HR Approval via Approval Desk.
- **Above ₹5,000 / Special Installments**: Escalated to Executive Founders Desk.
    `
  },
  {
    id: 'sop_04',
    title: 'Escalation rules',
    subtitle: 'SLA timelines, priority flags & management forwarding',
    category: 'Governance',
    version: 'v2.0',
    content: `
### Operational Escalation Hierarchy
- **Fee Disputes & Quoting Mismatches**: Logged in Escalation Desk immediately. Must be addressed within 4 hours.
- **Unresolved Customer / Student Complaints**: Automatically escalated to Management if open for more than 24 hours.
    `
  },
  {
    id: 'sop_05',
    title: 'Reporting format',
    subtitle: 'Daily tracker submission, end-of-day reports & audit logs',
    category: 'Reporting',
    version: 'v1.5',
    content: `
### End of Day Reporting Format
- Every Academic Counsellor must submit their daily tracker by 6:30 PM.
- Metrics required: Total Calls, Connected Calls, Demos Booked, Demos Attended, Enrolments, Revenue Collected.
    `
  }
];

export default function SopHubBoard({ 
  departmentName = "HR",
  onAssignSuccess = null 
}) {
  const [selectedViewSop, setSelectedViewSop] = useState(null);
  const [selectedAssignSop, setSelectedAssignSop] = useState(null);
  const [assignedBranches, setAssignedBranches] = useState(['All 14 Branches']);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAssignToTeam = (e) => {
    e.preventDefault();
    if (!selectedAssignSop) return;

    showToast(`"${selectedAssignSop.title}" assigned successfully to team across ${assignedBranches.join(', ')}! ✓`);
    setSelectedAssignSop(null);
    if (onAssignSuccess) onAssignSuccess();
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
        <div className="flex items-center gap-2.5">
          {/* Multi-layer SOP Icon matching exact screenshot style */}
          <div className="w-6 h-6 flex items-center justify-center rounded bg-gradient-to-br from-purple-500 via-indigo-500 to-teal-400 text-white font-bold text-xs p-1 shadow-2xs">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
            Knowledge &amp; SOP Hub
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1 font-medium pl-0.5">
          Standard operating procedures for {departmentName}
        </p>
      </div>

      {/* SOP Documents List (Exact Screenshot Layout & Styling) */}
      <div className="divide-y divide-slate-100 border-t border-slate-100">
        {SOP_DOCUMENTS.map((doc) => (
          <div
            key={doc.id}
            className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-slate-50/60 px-2 rounded-xl transition-colors"
          >
            {/* Left Document Title + Gray Paper Icon */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="text-slate-300 text-sm select-none">📄</span>
              <h4 className="text-sm font-bold text-[#0f172a] tracking-tight group-hover:text-purple-900 transition-colors">
                {doc.title}
              </h4>
            </div>

            {/* Right Action Buttons: View | Assign to team (Exact Screenshot Style) */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setSelectedViewSop(doc)}
                className="border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-1 rounded-lg cursor-pointer transition-all shadow-2xs active:scale-95"
              >
                View
              </button>

              <button
                onClick={() => setSelectedAssignSop(doc)}
                className="border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-1 rounded-lg cursor-pointer transition-all shadow-2xs active:scale-95"
              >
                Assign to team
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* View SOP Document Modal */}
      {selectedViewSop && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setSelectedViewSop(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4 flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                📄
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {selectedViewSop.title}
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedViewSop.subtitle} &middot; {selectedViewSop.version}
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 pr-2 space-y-3 text-xs text-slate-700 font-sans leading-relaxed">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 whitespace-pre-line font-mono text-[11px]">
                {selectedViewSop.content}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-4 flex-shrink-0">
              <button
                type="button"
                onClick={() => setSelectedViewSop(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close Document
              </button>
              <button
                type="button"
                onClick={() => {
                  const docToAssign = selectedViewSop;
                  setSelectedViewSop(null);
                  setSelectedAssignSop(docToAssign);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md flex items-center gap-1.5 transition-all"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Assign to Team</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign to Team Modal */}
      {selectedAssignSop && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setSelectedAssignSop(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                👥
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Assign SOP to Team
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedAssignSop.title}
                </p>
              </div>
            </div>

            <form onSubmit={handleAssignToTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Team &amp; Branch Scope
                </label>
                <select
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-sans"
                >
                  <option value="all">All 33 HR Team Members across 14 Branches</option>
                  <option value="svm">Saravanampatti (SVM) Team</option>
                  <option value="gpm">Gandhipuram (GPM) Team</option>
                  <option value="hopes">Hopes College Team</option>
                  <option value="ameerpet">Ameerpet Team</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Acknowledgment Requirement
                </label>
                <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 text-xs text-purple-900 font-medium">
                  Team members will receive an in-app notification &amp; must click &quot;Read &amp; Acknowledge&quot; upon viewing.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAssignSop(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirm Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
