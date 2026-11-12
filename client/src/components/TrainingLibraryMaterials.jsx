import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  BookOpen,
  Folder,
  FolderPlus,
  FolderUp,
  FolderInput,
  ArrowLeft,
  Pencil
} from 'lucide-react';
import {
  uploadTrainingMaterial,
  trainingMaterialFileUrl,
  pinTrainingMaterial,
  assignTrainingMaterial,
  deleteTrainingMaterial,
  moveTrainingMaterialFolder,
  getTrainingFolders,
  createTrainingFolder,
  renameTrainingFolder,
  deleteTrainingFolder
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
  const [uploadFolder, setUploadFolder] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadNote, setUploadNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null); // null = Root (All Folders view)
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');
  const [moveFor, setMoveFor] = useState(null);
  const [moveTargetFolder, setMoveTargetFolder] = useState('');

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

  const loadFolders = async () => {
    try {
      const list = await getTrainingFolders();
      setFolders(Array.isArray(list) ? list : []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  // Merge DB folders with any folder names referenced on materials
  const allFolders = useMemo(() => {
    const byName = new Map();
    folders.forEach((f) => {
      if (f?.name) byName.set(f.name, f);
    });
    materials.forEach((m) => {
      const name = String(m.folder || '').trim();
      if (name && !byName.has(name)) {
        byName.set(name, { _id: null, name });
      }
    });
    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [folders, materials]);

  const openFolder = (folderName) => {
    setActiveFolder(folderName);
    setUploadFolder(folderName || '');
    setActiveTab('All');
  };

  const handleCreateFolder = async (e) => {
    e?.preventDefault?.();
    const name = newFolderName.trim();
    if (!name) return;
    try {
      await createTrainingFolder({ name });
      setNewFolderName('');
      setShowNewFolderInput(false);
      await loadFolders();
      setUploadFolder(name);
      flash(`Folder "${name}" created`);
    } catch (err) {
      flash(err?.response?.data?.error || 'Could not create folder');
    }
  };

  const handleRenameFolder = async (folder) => {
    const next = renameFolderValue.trim();
    if (!next || next === folder.name) {
      setRenamingFolder(null);
      return;
    }
    try {
      if (folder._id) {
        await renameTrainingFolder(folder._id, next);
      }
      if (activeFolder === folder.name) setActiveFolder(next);
      if (uploadFolder === folder.name) setUploadFolder(next);
      setRenamingFolder(null);
      await loadFolders();
      onChanged?.();
      flash(`Renamed folder to "${next}"`);
    } catch (err) {
      flash(err?.response?.data?.error || 'Could not rename folder');
    }
  };

  const handleDeleteFolder = async (folder) => {
    const count = materials.filter((m) => (m.folder || '') === folder.name).length;
    const msg = count > 0
      ? `Delete folder "${folder.name}"? The ${count} file(s) inside will be moved to Root (not deleted).`
      : `Delete empty folder "${folder.name}"?`;
    if (!window.confirm(msg)) return;
    try {
      if (folder._id) {
        await deleteTrainingFolder(folder._id);
      }
      if (activeFolder === folder.name) setActiveFolder(null);
      if (uploadFolder === folder.name) setUploadFolder('');
      await loadFolders();
      onChanged?.();
      flash(`Folder "${folder.name}" deleted`);
    } catch (err) {
      flash(err?.response?.data?.error || 'Could not delete folder');
    }
  };

  const handleMoveMaterial = async () => {
    if (!moveFor) return;
    try {
      await moveTrainingMaterialFolder(moveFor._id, moveTargetFolder.trim());
      setMoveFor(null);
      await loadFolders();
      onChanged?.();
      flash(moveTargetFolder.trim() ? `Moved to "${moveTargetFolder.trim()}"` : 'Moved to Root');
    } catch (err) {
      flash(err?.response?.data?.error || 'Could not move file');
    }
  };

  const ALLOWED_EXTS = new Set(['ppt', 'pptx', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'webp']);

  const uploadSingleFile = async (file, targetFolder, customTitle = '') => {
    const payload = {
      title: customTitle || file.name.replace(/\.[^.]+$/, ''),
      description: uploadNote.trim(),
      category: uploadCategory,
      folder: targetFolder,
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
    return payload.storageProvider;
  };

  const handleFileUpload = async (e, isFolderUpload = false) => {
    if (!canManage) return;
    const rawFiles = Array.from(e.target.files || []);
    if (!rawFiles.length) return;

    // Filter valid files (skip system hidden files like .DS_Store / Thumbs.db)
    const validFiles = [];
    let skipped = 0;
    for (const f of rawFiles) {
      if (f.name.startsWith('.') || f.name.toLowerCase() === 'thumbs.db' || f.name.toLowerCase() === 'desktop.ini') {
        continue;
      }
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (isFolderUpload && !ALLOWED_EXTS.has(ext)) {
        skipped++;
        continue;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        skipped++;
        continue;
      }
      validFiles.push(f);
    }

    if (!validFiles.length) {
      flash(`No valid files under ${MAX_MB} MB found to upload.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
      return;
    }

    setUploading(true);
    let uploadedCount = 0;
    let lastProvider = 'inline';
    let detectedFolder = uploadFolder.trim();

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setUploadProgressText(
          validFiles.length > 1 ? `Uploading ${i + 1} of ${validFiles.length}…` : 'Uploading…'
        );
        let targetFolder = uploadFolder.trim();
        if (isFolderUpload && file.webkitRelativePath) {
          const pcFolder = file.webkitRelativePath.split('/')[0]?.trim();
          if (pcFolder) {
            targetFolder = targetFolder || pcFolder;
            detectedFolder = targetFolder;
          }
        }
        const customTitle = validFiles.length === 1 && !isFolderUpload ? uploadTitle.trim() : '';
        lastProvider = await uploadSingleFile(file, targetFolder, customTitle);
        uploadedCount++;
      }

      setUploadTitle('');
      setUploadNote('');
      await loadFolders();
      if (isFolderUpload && detectedFolder) {
        setActiveFolder(detectedFolder);
        setUploadFolder(detectedFolder);
      }
      const folderLabel = detectedFolder ? ` into folder "${detectedFolder}"` : '';
      const skipNote = skipped > 0 ? ` (${skipped} skipped: unsupported or >${MAX_MB} MB)` : '';
      flash(
        uploadedCount === 1
          ? `"${validFiles[0].name}" uploaded${folderLabel}${lastProvider === 'amplify' ? ' (AWS S3)' : ''}${skipNote}`
          : `${uploadedCount} files uploaded${folderLabel}${skipNote}`
      );
      onChanged?.();
    } catch (err) {
      flash(err?.response?.data?.error || `Upload failed after ${uploadedCount} file(s)`);
    }
    setUploading(false);
    setUploadProgressText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
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

  const isSearching = Boolean(searchQuery.trim());

  const filtered = materials.filter((m) => {
    const mFolder = String(m.folder || '').trim();
    if (activeFolder !== null) {
      if (mFolder !== activeFolder) return false;
    } else if (!isSearching && activeTab === 'All' && allFolders.length > 0) {
      // At Root with no search/filter, show only unfiled (root) materials below the folder cards
      if (mFolder !== '') return false;
    }
    if (activeTab === 'PPT Decks' && !isPptMaterial(m)) return false;
    if (activeTab === 'Pinned' && !(m.pinnedBy || []).includes(myId)) return false;
    if (activeTab === 'My uploads' && m.uploaderId !== myId) return false;
    if (!['All', 'PPT Decks', 'Pinned', 'My uploads'].includes(activeTab) && m.category !== activeTab) return false;
    if (isSearching) {
      const q = searchQuery.toLowerCase();
      return [m.title, m.description, m.category, m.folder, m.uploadedBy, m.fileName, m.fileFormat].some((v) =>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex items-center gap-1.5">
                <select
                  value={uploadFolder}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setShowNewFolderInput(true);
                    } else {
                      setUploadFolder(e.target.value);
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-teal-500"
                >
                  <option value="">📁 Root (No Folder)</option>
                  {allFolders.map((f) => (
                    <option key={f.name} value={f.name}>
                      📁 {f.name}
                    </option>
                  ))}
                  <option value="__new__">+ Create New Folder…</option>
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewFolderInput((v) => !v)}
                  title="Create new folder"
                  className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-teal-500 text-teal-700 shrink-0 cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              </div>
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
                placeholder="Title (optional, defaults to file name)"
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500"
              />
              <input
                value={uploadNote}
                onChange={(e) => setUploadNote(e.target.value)}
                placeholder="Topic / module note (optional)"
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>

            {showNewFolderInput && (
              <form onSubmit={handleCreateFolder} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-teal-200">
                <Folder className="w-4 h-4 text-teal-600 shrink-0 ml-1" />
                <input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name (e.g. CCP, CPC, ICD-10)"
                  autoFocus
                  className="flex-1 text-xs px-2 py-1 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#00897b] hover:bg-[#007a6d] text-white text-xs font-bold cursor-pointer"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewFolderInput(false);
                    setNewFolderName('');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e, false)}
              multiple
              className="hidden"
              accept=".ppt,.pptx,.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
            />
            <input
              type="file"
              ref={folderInputRef}
              onChange={(e) => handleFileUpload(e, true)}
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
            />

            <div className="flex items-center flex-wrap gap-2.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00897b] hover:bg-[#007a6d] disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>
                  {uploading
                    ? uploadProgressText || 'Uploading…'
                    : uploadFolder
                    ? `Choose Files & Upload to "${uploadFolder}"`
                    : 'Choose PPT / Files & Upload'}
                </span>
              </button>
              <button
                onClick={() => folderInputRef.current?.click()}
                disabled={uploading}
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-teal-50 border border-teal-300 disabled:opacity-50 text-[#00897b] text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <FolderUp className="w-4 h-4" />
                <span>Upload Folder from PC</span>
              </button>
              {uploadFolder && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-semibold">
                  <Folder className="w-3.5 h-3.5 text-teal-600" />
                  <span>Target: {uploadFolder}</span>
                </span>
              )}
            </div>
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

        {/* Folder Breadcrumb or Folders Grid */}
        {activeFolder !== null ? (
          <div className="flex items-center justify-between flex-wrap gap-2 bg-teal-50/70 border border-teal-200 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <button
                type="button"
                onClick={() => openFolder(null)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-teal-400 text-slate-700 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Folders</span>
              </button>
              <span className="text-slate-400">/</span>
              <span className="inline-flex items-center gap-1.5 text-teal-800">
                <Folder className="w-4 h-4 fill-teal-500/20 text-teal-600" />
                <span>{activeFolder}</span>
              </span>
              <span className="text-[11px] font-medium text-slate-500">({filtered.length} files)</span>
            </div>
          </div>
        ) : (
          !isSearching &&
          activeTab === 'All' &&
          (allFolders.length > 0 || canManage) && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Folders</span>
                {canManage && !showNewFolderInput && (
                  <button
                    type="button"
                    onClick={() => setShowNewFolderInput(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-teal-400 text-teal-700 text-xs font-semibold cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>New Folder</span>
                  </button>
                )}
              </div>
              {allFolders.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {allFolders.map((folder) => {
                    const count = materials.filter((m) => String(m.folder || '').trim() === folder.name).length;
                    const isRenaming = renamingFolder === folder.name;
                    return (
                      <div
                        key={folder.name}
                        className="group bg-white rounded-2xl border border-slate-200/90 hover:border-teal-400 hover:shadow-sm p-3.5 transition-all flex flex-col justify-between"
                      >
                        {isRenaming ? (
                          <div className="space-y-2">
                            <input
                              value={renameFolderValue}
                              onChange={(e) => setRenameFolderValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameFolder(folder);
                                if (e.key === 'Escape') setRenamingFolder(null);
                              }}
                              autoFocus
                              className="w-full text-xs border border-teal-400 rounded-lg px-2 py-1 focus:outline-none"
                            />
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setRenamingFolder(null)}
                                className="px-2 py-0.5 text-[10px] text-slate-500 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRenameFolder(folder)}
                                className="px-2 py-0.5 text-[10px] bg-teal-600 text-white rounded font-semibold cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openFolder(folder.name)}
                              className="flex items-start gap-2.5 text-left w-full cursor-pointer"
                            >
                              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0">
                                <Folder className="w-4 h-4 fill-amber-400/30" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-900 truncate">{folder.name}</div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {count} {count === 1 ? 'file' : 'files'}
                                </div>
                              </div>
                            </button>
                            {canManage && (
                              <div className="flex items-center justify-end gap-1 mt-2 pt-1.5 border-t border-slate-100 opacity-70 group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRenamingFolder(folder.name);
                                    setRenameFolderValue(folder.name);
                                  }}
                                  title="Rename folder"
                                  className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-teal-700 cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFolder(folder)}
                                  title="Delete folder"
                                  className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )
        )}

        {filtered.length === 0 ? (
          <div className="py-10 text-center rounded-2xl bg-white border border-slate-200 text-xs text-slate-500">
            {materials.length === 0
              ? canManage
                ? 'No PPTs or materials uploaded yet. Upload one above to share across all trainer dashboards.'
                : 'No PPTs or materials uploaded yet by Head of Department or Manager.'
              : activeFolder !== null
              ? `No materials in folder "${activeFolder}" yet. Use the upload box above to add files here.`
              : allFolders.length > 0 && activeTab === 'All' && !isSearching
              ? 'All materials are organized inside folders above. Click any folder to view its files.'
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
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ede9fe] text-[#6d28d9] truncate">
                          {m.category}
                        </span>
                        {m.fileFormat && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${formatBadgeStyle(m)}`}>
                            {m.fileFormat}
                          </span>
                        )}
                        {m.folder && activeFolder === null && (
                          <button
                            type="button"
                            onClick={() => openFolder(m.folder)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 cursor-pointer"
                          >
                            <Folder className="w-2.5 h-2.5" />
                            <span>{m.folder}</span>
                          </button>
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
                          <button
                            type="button"
                            onClick={() => {
                              setMoveFor(m);
                              setMoveTargetFolder(m.folder || '');
                            }}
                            className="p-1 rounded hover:text-teal-700 cursor-pointer"
                            title="Move to folder"
                          >
                            <FolderInput className="w-3.5 h-3.5" />
                          </button>
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
      {canManage && moveFor && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Move to Folder</h3>
              <button type="button" onClick={() => setMoveFor(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs font-semibold text-slate-700 truncate">{moveFor.title}</div>
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select Folder</label>
              <select
                value={allFolders.some((f) => f.name === moveTargetFolder) || moveTargetFolder === '' ? moveTargetFolder : '__custom__'}
                onChange={(e) => {
                  if (e.target.value !== '__custom__') setMoveTargetFolder(e.target.value);
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
              >
                <option value="">📁 Root (No Folder)</option>
                {allFolders.map((f) => (
                  <option key={f.name} value={f.name}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
              <input
                value={moveTargetFolder}
                onChange={(e) => setMoveTargetFolder(e.target.value)}
                placeholder="Or type a new folder name (e.g. CCP)"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMoveFor(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMoveMaterial}
                className="px-4 py-2 rounded-xl bg-[#00897b] hover:bg-[#007a6d] text-white text-xs font-bold cursor-pointer"
              >
                Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
