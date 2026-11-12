import React, { useMemo, useRef, useState } from 'react';
import useFileToken from '../hooks/useFileToken';
import {
  Eye,
  Send,
  Star,
  UploadCloud,
  X,
  CheckCircle2,
  Download,
  Trash2,
  Search,
  Lock,
  Presentation,
  BookOpen
} from 'lucide-react';
import {
  uploadTrainingMaterial,
  trainingMaterialFileUrl,
  pinTrainingMaterial,
  assignTrainingMaterial,
  deleteTrainingMaterial
} from '../services/api';
import { isAmplifyStorageConfigured, uploadTrainingMaterialFile } from '../services/amplifyStorage';
import LmsMaterialViewer from './LmsMaterialViewer';

const CATEGORIES = [
  'General',
  'CPT Guidelines',
  'ICD-10-CM',
  'ICD-10-PCS',
  'HCPCS Level II',
  'E/M',
  'Anatomy & Physiology',
  'Billing & RCM',
  'Exam Practice',
  'Viva & Interview'
];
const MAX_MB = 12;

const formatSize = (bytes = 0) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const isPptMaterial = (m) => {
  const fmt = String(m?.fileFormat || '').toUpperCase();
  const name = String(m?.fileName || '').toLowerCase();
  const mime = String(m?.mimeType || '').toLowerCase();
  return fmt === 'PPT' || fmt === 'PPTX' || name.endsWith('.ppt') || name.endsWith('.pptx') || mime.includes('presentation') || mime.includes('powerpoint');
};

const formatBadgeStyle = (m) => {
  const fmt = String(m?.fileFormat || '').toUpperCase();
  if (fmt === 'PPT' || fmt === 'PPTX') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (fmt === 'PDF') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (['PNG', 'JPG', 'JPEG', 'WEBP'].includes(fmt)) return 'bg-sky-100 text-sky-700 border-sky-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

function inferCanManage(currentUser = {}) {
  const tr = String(currentUser.trainerRole || '').toLowerCase();
  const role = String(currentUser.role || '').toLowerCase();
  const dept = String(currentUser.department || '').toLowerCase();
  if (tr === 'tl' || tr === 'trainer' || tr === 'part_time') return false;
  if (/\bteam lead\b|\btl\b/.test(role)) return false;
  if (['admin', 'leadership'].includes(dept) || ['admin', 'super admin'].includes(role)) return true;
  if (tr === 'head' || tr === 'manager') return true;
  if (/head|manager|chief/.test(role)) return true;
  return false;
}

// LMS Teaching Library — Head of Department & Manager upload PPTs and course materials;
// Team Leads and Trainers have view-only access directly inside their dashboard (no delete / no download).
export default function TrainingLibraryMaterials({
  currentUser = {},
  batches = [],
  materials = [],
  canManage: canManageProp,
  onChanged
}) {
  useFileToken();
  const canManage = typeof canManageProp === 'boolean' ? canManageProp : inferCanManage(currentUser);

  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadCategory, setUploadCategory] = useState('General');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadNote, setUploadNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  const [viewer, setViewer] = useState(null);
  const [assignFor, setAssignFor] = useState(null);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [assignModule, setAssignModule] = useState('');
  const [assignNote, setAssignNote] = useState('');

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };
  const myId = currentUser.id || currentUser._id || currentUser.trainerId || currentUser.name || '';

  const handleFileUpload = async (e) => {
    if (!canManage) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      flash(`File is larger than ${MAX_MB} MB`);
      return;
    }
    setUploading(true);
    try {
      const payload = {
        title: uploadTitle.trim() || file.name.replace(/\.[^.]+$/, ''),
        description: uploadNote.trim(),
        category: uploadCategory,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        uploadedBy: currentUser.name,
        uploaderId: myId,
        branch: currentUser.branch || ''
      };

      if (isAmplifyStorageConfigured()) {
        try {
          const s3Result = await uploadTrainingMaterialFile(file, { category: uploadCategory });
          payload.storageKey = s3Result.storageKey;
          payload.storageUrl = s3Result.storageUrl;
          payload.storageProvider = 'amplify';
        } catch (amplifyErr) {
          console.warn('Amplify upload failed, falling back to database storage:', amplifyErr);
        }
      }

      if (!payload.storageUrl) {
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        payload.data = data;
        payload.storageProvider = 'inline';
      }

      await uploadTrainingMaterial(payload);
      setUploadTitle('');
      setUploadNote('');
      flash(`"${file.name}" uploaded to the LMS library${payload.storageProvider === 'amplify' ? ' (AWS S3)' : ''}`);
      onChanged?.();
    } catch (err) {
      flash(err?.response?.data?.error || 'Upload failed');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTogglePin = async (m) => {
    if (!myId) return;
    try {
      await pinTrainingMaterial(m._id, myId, !(m.pinnedBy || []).includes(myId));
      onChanged?.();
    } catch (err) {
      flash(err?.response?.data?.error || 'Could not update pin');
    }
  };

  const handleDelete = async (m) => {
    if (!canManage) return;
    if (!window.confirm(`Delete "${m.title}" from the LMS library?`)) return;
    try {
      await deleteTrainingMaterial(m._id);
      flash('Material deleted');
      onChanged?.();
    } catch (err) {
      flash(err?.response?.data?.error || 'Could not delete');
    }
  };

  const openAssign = (m) => {
    if (!canManage) return;
    setAssignFor(m);
    setSelectedBatches(batches[0] ? [batches[0].name] : []);
    setAssignModule(batches[0]?.module || '');
    setAssignNote('');
  };

  const handleConfirmAssignment = async () => {
    if (!selectedBatches.length) {
      flash('Select at least one batch');
      return;
    }
    try {
      await assignTrainingMaterial(assignFor._id, {
        batches: selectedBatches,
        module: assignModule,
        note: assignNote,
        by: currentUser.name
      });
      flash(`Assigned "${assignFor.title}" to ${selectedBatches.join(', ')}`);
      setAssignFor(null);
      onChanged?.();
    } catch (err) {
      flash(err?.response?.data?.error || 'Could not assign');
    }
  };

  const tabs = useMemo(() => {
    const base = ['All', 'PPT Decks', 'Pinned'];
    if (canManage) base.push('My uploads');
    return [...base, ...Array.from(new Set(materials.map((m) => m.category).filter(Boolean)))];
  }, [materials, canManage]);

  const myBatchNames = new Set(batches.map((b) => b.name));

  const filtered = materials.filter((m) => {
    if (activeTab === 'PPT Decks' && !isPptMaterial(m)) return false;
    if (activeTab === 'Pinned' && !(m.pinnedBy || []).includes(myId)) return false;
    if (activeTab === 'My uploads' && m.uploaderId !== myId) return false;
    if (!['All', 'PPT Decks', 'Pinned', 'My uploads'].includes(activeTab) && m.category !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return [m.title, m.description, m.category, m.uploadedBy, m.fileName, m.fileFormat].some((v) =>
        String(v || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pptCount = materials.filter(isPptMaterial).length;
  const stats = canManage
    ? [
        ['TOTAL MATERIALS', materials.length],
        ['PPT DECKS', pptCount],
        ['MY UPLOADS', materials.filter((m) => m.uploaderId === myId).length],
        ['PINNED', materials.filter((m) => (m.pinnedBy || []).includes(myId)).length]
      ]
    : [
        ['TOTAL MATERIALS', materials.length],
        ['PPT DECKS', pptCount],
        ['ASSIGNED TO BATCHES', materials.filter((m) => (m.assignments || []).some((a) => myBatchNames.has(a.batch))).length],
        ['PINNED', materials.filter((m) => (m.pinnedBy || []).includes(myId)).length]
      ];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn text-slate-800">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-[#0f242d] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-teal-500/30 text-xs font-semibold animate-slideDown">
          <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Role-Aware LMS Header / Upload Panel */}
      {canManage ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#00897b]">
                <Presentation className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Upload LMS PPT &amp; Teaching Material</h2>
                <p className="text-[11px] text-slate-500">Head of Department &amp; Manager Upload Desk</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#e6f7f5] text-[#00897b] text-xs font-semibold">
              Shared across all Trainer LMS Dashboards
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 text-xs text-slate-600 leading-relaxed">
            Upload <strong>PPT / PPTX</strong> presentations, PDFs, or course materials (max {MAX_MB} MB). Team Leads and Trainers can open and view them inside their LMS dashboard — download and delete are restricted for TL &amp; Trainers.
          </div>
          <div className="border border-dashed border-[#009688]/60 bg-[#f9fdfd] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-teal-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="PPT / Material title (defaults to file name)"
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500"
              />
              <input
                value={uploadNote}
                onChange={(e) => setUploadNote(e.target.value)}
                placeholder="Topic / module note (optional)"
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".ppt,.pptx,.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00897b] hover:bg-[#007a6d] disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{uploading ? 'Uploading PPT…' : 'Choose PPT / File & Upload'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-[#0f242d] to-[#133544] text-white rounded-2xl border border-teal-500/20 p-5 shadow-sm flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight">LMS Presentation &amp; Study Library</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                PPT decks and course materials uploaded by your Head of Department &amp; Manager. Click <strong>Open &amp; View</strong> to present inside the dashboard.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-200 text-[11px] font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>View-Only · Download &amp; Delete Disabled</span>
          </span>
        </div>
      )}

      {/* LMS Library Catalog */}
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📚</span>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">LMS Course Decks &amp; Materials</h2>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PPTs or materials…"
              className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-teal-500 w-56 sm:w-64"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(([label, value]) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200/80 p-5 text-center shadow-xs">
              <div className="text-3xl font-black text-slate-900">{value}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#0f242d] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center rounded-2xl bg-white border border-slate-200 text-xs text-slate-500">
            {materials.length === 0
              ? canManage
                ? 'No PPTs or materials uploaded yet. Upload one above to share across all trainer dashboards.'
                : 'No PPTs or materials uploaded yet by Head of Department or Manager.'
              : 'No materials match this filter.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filtered.map((m) => {
              const pinned = (m.pinnedBy || []).includes(myId);
              const myAssignments = (m.assignments || []).filter((a) => myBatchNames.has(a.batch));
              const isPpt = isPptMaterial(m);
              return (
                <div
                  key={m._id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ede9fe] text-[#6d28d9] truncate">
                          {m.category}
                        </span>
                        {m.fileFormat && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${formatBadgeStyle(m)}`}>
                            {m.fileFormat}
                          </span>
                        )}
                      </div>
                      <button type="button" onClick={() => handleTogglePin(m)} title={pinned ? 'Unpin' : 'Pin'} className="cursor-pointer shrink-0">
                        <Star className={`w-4 h-4 ${pinned ? 'fill-[#00897b] text-[#00897b]' : 'text-slate-300 hover:text-[#00897b]'}`} />
                      </button>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-2.5 leading-snug break-words">{m.title}</h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      {[m.uploadedBy, m.branch].filter(Boolean).join(' · ')} · {new Date(m.createdAt).toLocaleDateString('en-IN')}
                    </p>
                    {m.description && <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">{m.description}</p>}
                    {myAssignments.length > 0 && (
                      <p className="text-[10px] text-teal-700 font-semibold mt-2">
                        Assigned: {myAssignments.map((a) => a.batch).join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>
                        {m.fileFormat || 'FILE'} · {formatSize(m.fileSize)}
                      </span>
                      {canManage ? (
                        <div className="flex items-center gap-1">
                          <a
                            href={trainingMaterialFileUrl(m._id, true)}
                            className="p-1 rounded hover:text-teal-700"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDelete(m)}
                            className="p-1 rounded hover:text-rose-600 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                          <Lock className="w-3 h-3" />
                          View only
                        </span>
                      )}
                    </div>

                    {canManage ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setViewer(m)}
                          className="py-2 px-3 rounded-xl bg-[#0f242d] hover:bg-[#1a3847] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isPpt ? 'View PPT' : 'Open'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openAssign(m)}
                          disabled={batches.length === 0}
                          title={batches.length === 0 ? 'No batches allocated' : 'Assign to batch'}
                          className="py-2 px-3 rounded-xl bg-[#fef3c7] hover:bg-[#fde68a] disabled:opacity-40 text-[#92400e] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Assign</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setViewer(m)}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#0f242d] hover:bg-[#1a3847] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-400" />
                        <span>{isPpt ? 'Open & View PPT' : 'Open & View'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {viewer && (
        <LmsMaterialViewer
          material={viewer}
          canDownload={canManage}
          onClose={() => setViewer(null)}
        />
      )}

      {canManage && assignFor && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Assign to Batch</h3>
              <button type="button" onClick={() => setAssignFor(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <div className="font-bold text-slate-900 truncate">{assignFor.title}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {assignFor.category} · {assignFor.fileFormat} · {formatSize(assignFor.fileSize)}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">Batches</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {batches.map((batch) => {
                  const checked = selectedBatches.includes(batch.name);
                  return (
                    <label
                      key={batch.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs ${
                        checked ? 'bg-teal-50/70 border-teal-300 text-teal-900 font-semibold' : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedBatches((prev) =>
                              prev.includes(batch.name) ? prev.filter((b) => b !== batch.name) : [...prev, batch.name]
                            )
                          }
                          className="w-4 h-4"
                        />
                        <span>
                          {batch.name}
                          {batch.timing ? ` (${batch.timing})` : ''}
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">{batch.students.length} students</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Module / shelf</label>
              <input
                value={assignModule}
                onChange={(e) => setAssignModule(e.target.value)}
                placeholder="e.g. Module 3"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Note for students (optional)</label>
              <textarea
                rows={2}
                value={assignNote}
                onChange={(e) => setAssignNote(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAssignFor(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignment}
                className="px-4 py-2 rounded-xl bg-[#00897b] hover:bg-[#007a6d] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Assign</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
