import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  Instagram, 
  Youtube, 
  MessageCircle, 
  Send, 
  Clock, 
  FileText, 
  User, 
  Check, 
  ChevronRight,
  Eye
} from 'lucide-react';

export const INITIAL_CONTENT_PIECES = [
  {
    id: 'cnt-1',
    code: 'CNT-TF-2026-0044',
    title: 'CPC exam tips — carousel',
    channel: 'Instagram',
    category: 'CPC Exam Tips',
    dueDate: 'Today',
    author: 'Sana M.',
    status: 'Approval Pending',
    description: '10 slide carousel covering ICD-10-CM coding conventions, guidelines for diabetes with manifestations, and time-saving tabular navigation hacks.',
    format: 'Carousel (1080x1350)',
    targetBranch: 'All Branches',
    caption: 'Mastering the CPC exam starts with knowing your guidelines like the back of your hand! Swipe through for 5 essential ICD-10 tips our trainers swear by. 📖✨ #MedicalCoding #CPCExam #AAPC'
  },
  {
    id: 'cnt-2',
    code: 'CNT-TF-2026-0045',
    title: 'Placed student reel — Optum',
    channel: 'Instagram',
    category: 'Placement Proof',
    dueDate: 'Today',
    author: 'Karthik P.',
    status: 'Design Pending',
    description: 'Short video reel highlighting Keerthana R. from Coimbatore batch who secured ₹4.8 LPA at Optum Global Solutions within 3 weeks of passing CPC.',
    format: 'Reel (9:16 Video)',
    targetBranch: 'Coimbatore - Gandhipuram',
    caption: 'From B.Sc Zoology fresher to CPC Certified Medical Coder at Optum! Meet Keerthana and hear how Thoughtflows transformed her career trajectory. 🚀 #ThoughtflowsSuccess'
  },
  {
    id: 'cnt-3',
    code: 'CNT-TF-2026-0046',
    title: 'Salary growth after CPC',
    channel: 'YouTube',
    category: 'Career Growth',
    dueDate: 'Tomorrow',
    author: 'Content Writer',
    status: 'Script Pending',
    description: 'In-depth video analysis breaking down 0-5 years salary benchmarks for AAPC CPC, CPB, and CIC coders in Indian healthcare MNCs vs overseas remote roles.',
    format: 'Video (16:9 4K)',
    targetBranch: 'All Branches',
    caption: 'What is the real salary growth for certified medical coders in 2026? We break down the actual pay bands from junior analyst to coding manager.'
  },
  {
    id: 'cnt-4',
    code: 'CNT-TF-2026-0047',
    title: 'Hyderabad job drive promo',
    channel: 'WhatsApp',
    category: 'Branch Promotion',
    dueDate: 'Today',
    author: 'Divya R.',
    status: 'Scheduled',
    description: 'WhatsApp broadcast graphic and copy for 40+ healthcare employers participating in the upcoming Ameerpet & Madhapur Mega Placement Drive.',
    format: 'Flyer (1080x1080)',
    targetBranch: 'Hyderabad (Madhapur & Ameerpet)',
    caption: '🚨 Hyderabad Walk-in Drive Alert! Top US RCM companies are hiring certified coders this Saturday at Thoughtflows Madhapur. Tap to RSVP your demo slot.'
  }
];

export default function ContentCalendarBoard({ 
  onToast,
  className = "" 
}) {
  const [contentPieces, setContentPieces] = useState(() => {
    try {
      const saved = localStorage.getItem('thoughtflows_content_calendar');
      return saved ? JSON.parse(saved) : INITIAL_CONTENT_PIECES;
    } catch {
      return INITIAL_CONTENT_PIECES;
    }
  });

  const [selectedPiece, setSelectedPiece] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Content Piece Form State
  const [newPieceForm, setNewPieceForm] = useState({
    title: '',
    channel: 'Instagram',
    category: 'CPC Exam Tips',
    dueDate: 'Today',
    author: 'Kavya M.',
    status: 'Design Pending',
    description: '',
    format: 'Reel (9:16 Video)'
  });

  const updatePieces = (newPieces) => {
    setContentPieces(newPieces);
    try {
      localStorage.setItem('thoughtflows_content_calendar', JSON.stringify(newPieces));
    } catch (e) {
      console.warn('Failed to save content pieces', e);
    }
  };

  const handleStatusChange = (pieceId, nextStatus) => {
    const updated = contentPieces.map(p => {
      if (p.id === pieceId) {
        return { ...p, status: nextStatus };
      }
      return p;
    });
    updatePieces(updated);

    const msg = `Updated "${contentPieces.find(p => p.id === pieceId)?.title}" status to "${nextStatus}"!`;
    if (onToast) onToast(msg);

    if (selectedPiece && selectedPiece.id === pieceId) {
      setSelectedPiece(prev => ({ ...prev, status: nextStatus }));
    }
  };

  const handleCreatePiece = (e) => {
    e.preventDefault();
    const nextIndex = contentPieces.length + 45;
    const paddedIndex = String(nextIndex).padStart(4, '0');
    const piece = {
      id: `cnt-${Date.now()}`,
      code: `CNT-TF-2026-${paddedIndex}`,
      title: newPieceForm.title,
      channel: newPieceForm.channel,
      category: newPieceForm.category,
      dueDate: newPieceForm.dueDate,
      author: newPieceForm.author,
      status: newPieceForm.status,
      description: newPieceForm.description || 'Standard marketing campaign asset for batch intake and student reach.',
      format: newPieceForm.format,
      targetBranch: 'All Branches'
    };

    const updated = [piece, ...contentPieces];
    updatePieces(updated);

    const msg = `📅 Scheduled "${piece.title}" (${piece.code})!`;
    if (onToast) onToast(msg);

    setIsAddModalOpen(false);
    setNewPieceForm({
      title: '',
      channel: 'Instagram',
      category: 'CPC Exam Tips',
      dueDate: 'Today',
      author: 'Kavya M.',
      status: 'Design Pending',
      description: '',
      format: 'Reel (9:16 Video)'
    });
  };

  // Status Badge styling - exact match to user reference screenshot
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approval Pending':
        return 'text-[#d97706] bg-[#fef3c7]/80 border border-[#fde68a]/70';
      case 'Design Pending':
        return 'text-[#d97706] bg-[#fef3c7]/80 border border-[#fde68a]/70';
      case 'Script Pending':
        return 'text-[#3b82f6] bg-[#eff6ff] border border-[#bfdbfe]/70';
      case 'Scheduled':
      default:
        return 'text-[#10b981] bg-[#ecfdf5] border border-[#a7f3d0]/70';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Outer Card Container - Exact match to reference screenshot */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-[0_4px_25px_-5px_rgba(15,23,42,0.05)]">
        
        {/* Header: Title + Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl leading-none select-none">📅</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Content Calendar
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-mono mt-1">
              {contentPieces.length} pieces in flight
            </p>
          </div>

          {/* Action: Add Content Piece */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Piece</span>
          </button>
        </div>

        {/* List of Content Cards */}
        <div className="space-y-3.5 sm:space-y-4">
          {contentPieces.map((piece) => (
            <div
              key={piece.id}
              onClick={() => setSelectedPiece(piece)}
              className="rounded-2xl border border-slate-200/90 p-4 sm:p-5 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:shadow-xs cursor-pointer group"
            >
              {/* Left Section: Title + Code Badge + Metadata Subtitle */}
              <div className="flex-1 min-w-0 pr-0 sm:pr-4">
                {/* Row 1: Title + Code Badge */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight group-hover:text-teal-900 transition-colors">
                    {piece.title}
                  </span>
                  <span className="bg-[#e0f7f6] text-[#0d9488] font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-[#b2e8e5]">
                    {piece.code}
                  </span>
                </div>

                {/* Row 2: Channel · Category · Due Date · Author */}
                <div className="text-xs text-slate-500 font-mono mt-1">
                  {piece.channel} · {piece.category} · due {piece.dueDate} · {piece.author}
                </div>
              </div>

              {/* Right Section: Status Pill Badge */}
              <div className="shrink-0 flex items-center justify-end">
                <span className={`px-3.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap font-mono ${getStatusBadge(piece.status)}`}>
                  {piece.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================================= */}
      {/* MODAL 1: VIEW & MANAGE CONTENT PIECE                                   */}
      {/* ======================================================================= */}
      {selectedPiece && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {selectedPiece.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 font-mono text-xs">
                    <span className="text-[#0d9488] font-bold">{selectedPiece.code}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">{selectedPiece.channel}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedPiece(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Details Content */}
            <div className="py-4 space-y-4 text-xs">
              {/* Status & Timing Banner */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Current Status:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(selectedPiece.status)}`}>
                    {selectedPiece.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Author / Owner:</span>
                  <span className="font-bold text-slate-800">{selectedPiece.author}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Category &amp; Format:</span>
                  <span className="font-bold text-slate-800">{selectedPiece.category} · {selectedPiece.format || 'Digital Asset'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Publish Target:</span>
                  <span className="text-amber-700 font-bold">due {selectedPiece.dueDate}</span>
                </div>
              </div>

              {/* Brief Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Asset Brief &amp; Outline</label>
                <p className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-700 leading-relaxed">
                  {selectedPiece.description}
                </p>
              </div>

              {/* Caption Preview */}
              {selectedPiece.caption && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Approved Copy / Caption Preview</label>
                  <p className="p-3 rounded-xl bg-teal-50/40 border border-teal-200/60 text-slate-800 font-mono text-[11px] leading-relaxed">
                    {selectedPiece.caption}
                  </p>
                </div>
              )}

              {/* Lifecycle Progression Actions */}
              <div className="pt-2">
                <label className="block font-bold text-slate-700 mb-2">Update Stage</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-center">
                  {[
                    { label: 'Script', status: 'Script Pending' },
                    { label: 'Design', status: 'Design Pending' },
                    { label: 'Approval', status: 'Approval Pending' },
                    { label: 'Scheduled', status: 'Scheduled' }
                  ].map(stage => (
                    <button
                      key={stage.status}
                      type="button"
                      onClick={() => handleStatusChange(selectedPiece.id, stage.status)}
                      className={`p-2 rounded-xl text-xs font-semibold border transition-all ${
                        selectedPiece.status === stage.status
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {stage.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Approval CTA for Pending items */}
              {selectedPiece.status === 'Approval Pending' && (
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-amber-900 text-xs">Ready for Publishing?</div>
                    <div className="text-[11px] text-amber-700 font-mono">Sign off to lock this asset into the broadcast queue.</div>
                  </div>
                  <button
                    onClick={() => handleStatusChange(selectedPiece.id, 'Scheduled')}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm active:scale-95 shrink-0"
                  >
                    Approve &amp; Schedule
                  </button>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPiece(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 2: SCHEDULE NEW CONTENT PIECE                                     */}
      {/* ======================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">📅</span>
                <h3 className="text-base font-bold text-slate-900">Schedule Content Piece</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePiece} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Piece Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Life Science Career Path Guide — carousel"
                  value={newPieceForm.title}
                  onChange={(e) => setNewPieceForm({ ...newPieceForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Channel</label>
                  <select
                    value={newPieceForm.channel}
                    onChange={(e) => setNewPieceForm({ ...newPieceForm, channel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="YouTube">YouTube</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Facebook">Facebook</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newPieceForm.category}
                    onChange={(e) => setNewPieceForm({ ...newPieceForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="CPC Exam Tips">CPC Exam Tips</option>
                    <option value="Placement Proof">Placement Proof</option>
                    <option value="Career Growth">Career Growth</option>
                    <option value="Branch Promotion">Branch Promotion</option>
                    <option value="Student Spotlight">Student Spotlight</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Due Date</label>
                  <select
                    value={newPieceForm.dueDate}
                    onChange={(e) => setNewPieceForm({ ...newPieceForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Today">Today</option>
                    <option value="Tomorrow">Tomorrow</option>
                    <option value="This Friday">This Friday</option>
                    <option value="Next Week">Next Week</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Owner / Creator</label>
                  <input
                    type="text"
                    required
                    value={newPieceForm.author}
                    onChange={(e) => setNewPieceForm({ ...newPieceForm, author: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Status</label>
                <select
                  value={newPieceForm.status}
                  onChange={(e) => setNewPieceForm({ ...newPieceForm, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="Script Pending">Script Pending</option>
                  <option value="Design Pending">Design Pending</option>
                  <option value="Approval Pending">Approval Pending</option>
                  <option value="Scheduled">Scheduled</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Brief / Concept</label>
                <textarea
                  rows="2"
                  placeholder="Outline key message, hooks, and call-to-action..."
                  value={newPieceForm.description}
                  onChange={(e) => setNewPieceForm({ ...newPieceForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  Schedule Piece
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
