import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Palette, 
  Sparkles, 
  FileText, 
  Eye, 
  RotateCcw,
  Upload,
  MessageSquare
} from 'lucide-react';
import { getCreatives, createCreative, updateCreative, onDataUpdate } from '../services/api';

export const INITIAL_CREATIVES = [
  {
    id: 'cr-1',
    code: 'CR-TF-2026-0088',
    title: 'Hyderabad job drive poster',
    format: 'Poster',
    campaignCode: 'CAM-TF-2026-1001',
    author: 'Sana M.',
    priority: 'high',
    status: 'Submitted',
    specs: 'Dimensions: 1080x1350 · Format: PNG · Size: 2.4 MB',
    previewColor: 'from-blue-600 via-indigo-700 to-slate-950',
    tagline: 'Mega Healthcare Job Fair • 40+ RCM Recruiters',
    branch: 'Hyderabad - Madhapur & Ameerpet',
    notes: 'Poster designed for Instagram grid & college campus notice boards in Ameerpet.'
  },
  {
    id: 'cr-2',
    code: 'CR-TF-2026-0089',
    title: 'Placement proof reel v2',
    format: 'Reel',
    campaignCode: 'CAM-TF-2026-1002',
    author: 'Karthik P.',
    priority: 'medium',
    status: 'Submitted',
    specs: 'Duration: 38s · 1080x1920 · 60fps · 4K Audio',
    previewColor: 'from-purple-600 via-pink-600 to-rose-700',
    tagline: 'Student Journey: From Life Science Graduate to CPC Certified Analyst',
    branch: 'All Branches (Coimbatore HQ)',
    notes: 'Reel featuring Keerthana R. talking about her ₹4.8 LPA offer at Optum.'
  },
  {
    id: 'cr-3',
    code: 'CR-TF-2026-0090',
    title: 'Awareness ad creative',
    format: 'Ad creative',
    campaignCode: 'CAM-TF-2026-1003',
    author: 'Sana M.',
    priority: 'low',
    status: 'Needs Correction',
    specs: 'Dimensions: 1080x1080 · Format: JPG · Size: 1.1 MB',
    previewColor: 'from-emerald-600 via-teal-700 to-slate-900',
    tagline: 'Why B.Sc Zoology & Chemistry Graduates Excel in US Medical Coding',
    branch: 'Coimbatore - Gandhipuram',
    notes: 'Needs correction: Font contrast on mobile feed is too low. Please update logo to 2026 vector version and re-export.'
  }
];

export default function CreativeApprovalDesk({ 
  onToast,
  onQueueCountChange,
  className = "" 
}) {
  const [creatives, setCreatives] = useState(INITIAL_CREATIVES);

  useEffect(() => {
    let isMounted = true;
    const loadCreatives = async () => {
      try {
        const data = await getCreatives();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setCreatives(data);
          if (onQueueCountChange) {
            const pendingCount = data.filter(c => c.status === 'Submitted').length;
            onQueueCountChange(pendingCount);
          }
        }
      } catch (err) {
        console.warn('Backend creatives fetch notice:', err.message);
      }
    };

    loadCreatives();

    const unsub = onDataUpdate((entity) => {
      if (entity === 'creatives' || entity === 'marketing_creatives') {
        loadCreatives();
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const [selectedCreativeForPreview, setSelectedCreativeForPreview] = useState(null);
  const [correctionModalItem, setCorrectionModalItem] = useState(null);
  const [correctionNote, setCorrectionNote] = useState('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // New Creative Submission State
  const [newCreativeForm, setNewCreativeForm] = useState({
    title: '',
    format: 'Poster',
    campaignCode: 'CAM-TF-2026-1001',
    author: 'Kavya M.',
    priority: 'medium',
    tagline: '',
    branch: 'Hyderabad'
  });

  const updateCreatives = (newCreatives) => {
    setCreatives(newCreatives);
    if (onQueueCountChange) {
      const pendingCount = newCreatives.filter(c => c.status === 'Submitted').length;
      onQueueCountChange(pendingCount);
    }
  };

  // One-click Approve
  const handleApprove = async (e, item) => {
    e.stopPropagation();
    try {
      await updateCreative(item._id || item.id, { status: 'Approved' });
    } catch (err) {
      console.warn('Update creative error:', err.message);
    }
    const updated = creatives.map(c => {
      if (c.id === item.id || (c._id && c._id === item._id)) {
        return { ...c, status: 'Approved' };
      }
      return c;
    });
    updateCreatives(updated);

    const msg = `✅ "${item.title}" approved! Released for campaign publishing.`;
    if (onToast) onToast(msg);
  };

  // Open Correction Feedback Modal
  const handleOpenCorrectModal = (e, item) => {
    e.stopPropagation();
    setCorrectionModalItem(item);
    setCorrectionNote(item.notes || 'Please adjust typography sizing, ensure AAPC disclaimer is visible, and enhance color contrast.');
  };

  // Submit Correction Request
  const handleSubmitCorrection = async (e) => {
    e.preventDefault();
    if (!correctionModalItem) return;

    try {
      await updateCreative(correctionModalItem._id || correctionModalItem.id, { 
        status: 'Needs Correction',
        notes: correctionNote 
      });
    } catch (err) {
      console.warn('Update creative correction error:', err.message);
    }

    const updated = creatives.map(c => {
      if (c.id === correctionModalItem.id || (c._id && c._id === correctionModalItem._id)) {
        return { 
          ...c, 
          status: 'Needs Correction',
          notes: correctionNote 
        };
      }
      return c;
    });
    updateCreatives(updated);

    const msg = `📝 Revision requested for "${correctionModalItem.title}"! Designer notified.`;
    if (onToast) onToast(msg);

    setCorrectionModalItem(null);
  };

  // Submit New Creative Asset
  const handleCreateCreative = async (e) => {
    e.preventDefault();
    const nextIndex = creatives.length + 88;
    const padded = String(nextIndex).padStart(4, '0');
    const item = {
      id: `cr-${Date.now()}`,
      code: `CR-TF-2026-${padded}`,
      title: newCreativeForm.title,
      format: newCreativeForm.format,
      campaignCode: newCreativeForm.campaignCode,
      author: newCreativeForm.author,
      priority: newCreativeForm.priority,
      status: 'Submitted',
      specs: 'Dimensions: 1080x1350 · Format: PNG · Size: 2.1 MB',
      previewColor: 'from-teal-600 via-cyan-700 to-slate-900',
      tagline: newCreativeForm.tagline || newCreativeForm.title,
      branch: newCreativeForm.branch,
      notes: 'Initial submission awaiting marketing head compliance review.'
    };

    try {
      const created = await createCreative(item);
      if (created && created._id) item._id = created._id;
    } catch (err) {
      console.warn('Backend creative save error:', err.message);
    }

    const updated = [item, ...creatives];
    updateCreatives(updated);

    const msg = `🎨 Creative "${item.title}" (${item.code}) submitted for review!`;
    if (onToast) onToast(msg);

    setIsSubmitModalOpen(false);
    setNewCreativeForm({
      title: '',
      format: 'Poster',
      campaignCode: 'CAM-TF-2026-1001',
      author: 'Kavya M.',
      priority: 'medium',
      tagline: '',
      branch: 'Hyderabad'
    });
  };

  // Status Badge Styling - exact match to user screenshot
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Submitted':
        return 'text-[#d97706] bg-[#fef3c7]/80 border border-[#fde68a]/70';
      case 'Needs Correction':
        return 'text-[#ef4444] bg-[#fee2e2]/70 border border-[#fecaca]/70';
      case 'Approved':
      default:
        return 'text-[#10b981] bg-[#ecfdf5] border border-[#a7f3d0]/70';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Outer Card Container - Exact match to user screenshot */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-[0_4px_25px_-5px_rgba(15,23,42,0.05)]">
        
        {/* Header: Title + Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl leading-none select-none">🎨</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Creative Approval Desk
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-mono mt-1">
              No public post goes live without approval
            </p>
          </div>

          {/* Action: Submit Creative */}
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Submit Creative</span>
          </button>
        </div>

        {/* List of Creative Approval Cards */}
        <div className="space-y-3.5 sm:space-y-4">
          {creatives.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedCreativeForPreview(item)}
              className="rounded-2xl border border-slate-200/90 p-4 sm:p-5 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs hover:shadow-xs cursor-pointer group"
            >
              {/* Left Section: Title + Code Badge + Metadata Subtitle */}
              <div className="flex-1 min-w-0 pr-0 sm:pr-4">
                {/* Row 1: Title + Cyan Code Badge */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight group-hover:text-teal-900 transition-colors">
                    {item.title}
                  </span>
                  <span className="bg-[#e0f7f6] text-[#0d9488] font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-[#b2e8e5]">
                    {item.code}
                  </span>
                </div>

                {/* Row 2: Format · Campaign Code · Author · Priority */}
                <div className="text-xs text-slate-500 font-mono mt-1">
                  {item.format} · {item.campaignCode} · by {item.author} · {item.priority}
                </div>
              </div>

              {/* Right Section: Status Pill on Top + Action Buttons */}
              <div className="shrink-0 flex sm:flex-col items-end justify-between sm:justify-center gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                {/* Status Badge */}
                <span className={`px-3.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap font-mono ${getStatusBadge(item.status)}`}>
                  {item.status}
                </span>

                {/* Action Buttons: Only show Approve/Correct when Submitted or Approved */}
                {item.status !== 'Needs Correction' ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleApprove(e, item)}
                      className="border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      Approve
                    </button>
                    <button
                      onClick={(e) => handleOpenCorrectModal(e, item)}
                      className="border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      Correct
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleOpenCorrectModal(e, item)}
                      className="border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      View Notes
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================================= */}
      {/* MODAL 1: PREVIEW CREATIVE ASSET                                         */}
      {/* ======================================================================= */}
      {selectedCreativeForPreview && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {selectedCreativeForPreview.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 font-mono text-xs">
                    <span className="text-[#0d9488] font-bold">{selectedCreativeForPreview.code}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">{selectedCreativeForPreview.campaignCode}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCreativeForPreview(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Artwork Container */}
            <div className="my-4">
              <div className={`h-52 bg-gradient-to-br ${selectedCreativeForPreview.previewColor} rounded-2xl p-6 text-white flex flex-col justify-between shadow-inner relative overflow-hidden border border-slate-800/20`}>
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
                    {selectedCreativeForPreview.format}
                  </span>
                  <span className="text-[10px] text-white/90 font-mono bg-black/40 px-2 py-0.5 rounded backdrop-blur-md">
                    Thoughtflows Verified
                  </span>
                </div>

                <div className="relative z-10">
                  <div className="text-xs text-teal-200 font-semibold">{selectedCreativeForPreview.branch}</div>
                  <div className="text-lg font-black leading-tight mt-1 max-w-sm drop-shadow">
                    {selectedCreativeForPreview.tagline}
                  </div>
                </div>

                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              </div>
            </div>

            {/* Technical Specs & Compliance Checklist */}
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 font-mono space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Submitted By:</span>
                  <span className="font-bold text-slate-800">{selectedCreativeForPreview.author}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Campaign:</span>
                  <span className="font-bold text-slate-800">{selectedCreativeForPreview.campaignCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Specifications:</span>
                  <span className="text-slate-800">{selectedCreativeForPreview.specs}</span>
                </div>
              </div>

              {selectedCreativeForPreview.notes && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
                  <div className="font-bold text-amber-900 text-xs">Review Notes / Feedback:</div>
                  <p className="text-[11px] text-amber-800 mt-1 font-mono leading-relaxed">
                    {selectedCreativeForPreview.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => setSelectedCreativeForPreview(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    handleOpenCorrectModal(e, selectedCreativeForPreview);
                    setSelectedCreativeForPreview(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
                >
                  Request Correction
                </button>
                <button
                  onClick={(e) => {
                    handleApprove(e, selectedCreativeForPreview);
                    setSelectedCreativeForPreview(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve &amp; Release</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 2: REQUEST CORRECTION NOTES                                       */}
      {/* ======================================================================= */}
      {correctionModalItem && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">Request Revision</h3>
              </div>
              <button
                onClick={() => setCorrectionModalItem(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCorrection} className="py-4 space-y-3.5 text-xs">
              <p className="text-slate-600">
                Send feedback to <strong>{correctionModalItem.author}</strong> for <strong>{correctionModalItem.title}</strong>.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Feedback &amp; Required Changes</label>
                <textarea
                  rows="4"
                  required
                  value={correctionNote}
                  onChange={(e) => setCorrectionNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCorrectionModalItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  Send Correction Notes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 3: SUBMIT NEW CREATIVE                                            */}
      {/* ======================================================================= */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎨</span>
                <h3 className="text-base font-bold text-slate-900">Submit New Creative</h3>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCreative} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Asset Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Coimbatore CPC Weekend Workshop Flyer"
                  value={newCreativeForm.title}
                  onChange={(e) => setNewCreativeForm({ ...newCreativeForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Creative Format</label>
                  <select
                    value={newCreativeForm.format}
                    onChange={(e) => setNewCreativeForm({ ...newCreativeForm, format: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Poster">Poster (1080x1350)</option>
                    <option value="Reel">Instagram Reel (9:16)</option>
                    <option value="Ad creative">Square Ad Creative (1:1)</option>
                    <option value="Flyer">Campus Flyer (A4 Print)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Campaign Link</label>
                  <select
                    value={newCreativeForm.campaignCode}
                    onChange={(e) => setNewCreativeForm({ ...newCreativeForm, campaignCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                  >
                    <option value="CAM-TF-2026-1001">CAM-TF-2026-1001 (Hyderabad)</option>
                    <option value="CAM-TF-2026-1002">CAM-TF-2026-1002 (Reels Proof)</option>
                    <option value="CAM-TF-2026-1003">CAM-TF-2026-1003 (Coimbatore)</option>
                    <option value="CAM-TF-2026-1004">CAM-TF-2026-1004 (Salem)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Designer / Author</label>
                  <input
                    type="text"
                    required
                    value={newCreativeForm.author}
                    onChange={(e) => setNewCreativeForm({ ...newCreativeForm, author: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newCreativeForm.priority}
                    onChange={(e) => setNewCreativeForm({ ...newCreativeForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="high">high</option>
                    <option value="medium">medium</option>
                    <option value="low">low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Headline / Tagline Copy</label>
                <input
                  type="text"
                  placeholder="Main visual headline displayed on the asset"
                  value={newCreativeForm.tagline}
                  onChange={(e) => setNewCreativeForm({ ...newCreativeForm, tagline: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
