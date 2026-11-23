import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, FileText, Image as ImageIcon, CheckCircle2, XCircle, Clock, Trash2, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import {
  getStudentDocuments,
  getStudentDocumentUploadUrl,
  addStudentDocument,
  deleteStudentDocument,
  reviewStudentDocument,
  studentDocumentFileUrl,
  openProtectedFile
} from '../services/api';

// PUT the file to the server-signed S3 link, reporting progress (fetch has none)
const putToS3 = (url, file, contentType, onProgress) => new Promise((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  xhr.open('PUT', url);
  xhr.setRequestHeader('Content-Type', contentType);
  xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
  xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload was refused by storage (HTTP ${xhr.status}). Please try again.`)));
  xhr.onerror = () => reject(new Error('Upload failed — check your internet connection and try again.'));
  xhr.send(file);
});

// My Documents (Student Portal) and the Documents tab (HR student profile).
//   mode="student" → upload, view, remove (until HR verifies)
//   mode="staff"   → view, Verify / Reject (canReview), remove
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.heic,application/pdf,image/*';
const OK_MIME = /^(application\/pdf|image\/(jpeg|jpg|png|webp|heic|heif))$/i;

const fmtSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round((b || 0) / 1024))} KB`);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const mimeFromName = (name = '') => {
  const ext = String(name).split('.').pop().toLowerCase();
  return { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif' }[ext] || '';
};

const STATUS_STYLE = {
  Verified: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
  Rejected: { cls: 'bg-rose-50 text-rose-700 border-rose-200', Icon: XCircle },
  Submitted: { cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: Clock }
};
const StatusPill = ({ status }) => {
  const { cls, Icon } = STATUS_STYLE[status] || STATUS_STYLE.Submitted;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${cls}`}>
      <Icon className="w-3 h-3" />{status === 'Submitted' ? 'Waiting for HR' : status}
    </span>
  );
};

export default function StudentDocuments({ studentId, mode = 'student', canReview = false }) {
  const isStudent = mode === 'student';
  const [types, setTypes] = useState({});
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busyType, setBusyType] = useState(''); // docType being uploaded
  const [progress, setProgress] = useState(0);
  const [otherLabel, setOtherLabel] = useState('');
  const [rejecting, setRejecting] = useState(null); // { id, remark }
  const fileInputs = useRef({});

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };
  const apply = (data) => { setTypes(data?.types || {}); setDocs(Array.isArray(data?.documents) ? data.documents : []); };

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      apply(await getStudentDocuments(studentId));
      setError('');
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);
  useEffect(() => { load(); }, [load]);

  const handleFile = async (docType, file) => {
    if (!file) return;
    setError('');
    const mimeType = file.type || mimeFromName(file.name);
    if (!OK_MIME.test(mimeType)) return setError('Upload a PDF or a photo (JPG / PNG).');
    if (file.size > MAX_BYTES) return setError(`This file is ${fmtSize(file.size)}. The limit is 10 MB per document.`);
    if (docType === 'other' && !otherLabel.trim()) return setError('Type a name for the other document first (e.g. "Experience letter").');
    setBusyType(docType);
    setProgress(0);
    try {
      const meta = { fileName: file.name, fileSize: file.size, mimeType, docType };
      const { uploadUrl, storageKey } = await getStudentDocumentUploadUrl(studentId, meta);
      await putToS3(uploadUrl, file, mimeType, setProgress);
      apply(await addStudentDocument(studentId, { ...meta, storageKey, label: docType === 'other' ? otherLabel.trim() : '' }));
      if (docType === 'other') setOtherLabel('');
      flash('✓ Uploaded — your HR will verify it');
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Upload failed — please try again.');
    } finally {
      setBusyType('');
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Remove "${doc.label}" (${doc.fileName})?`)) return;
    try {
      apply(await deleteStudentDocument(studentId, doc._id));
      flash('Document removed');
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
  };

  const handleReview = async (doc, status, remark = '') => {
    try {
      apply(await reviewStudentDocument(studentId, doc._id, { status, remark }));
      setRejecting(null);
      flash(status === 'Verified' ? `✓ ${doc.label} verified` : `${doc.label} rejected — the student has been told why`);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
  };

  const open = (doc) => openProtectedFile(studentDocumentFileUrl(studentId, doc._id));

  const typeEntries = Object.entries(types);
  const required = typeEntries.filter(([, t]) => t.required);
  const docsOf = (k) => docs.filter((d) => d.docType === k);
  const verifiedRequired = required.filter(([k]) => docsOf(k).some((d) => d.status === 'Verified')).length;
  const uploadedRequired = required.filter(([k]) => docsOf(k).some((d) => d.status !== 'Rejected')).length;

  if (loading) {
    return <div className="py-10 text-center text-xs text-slate-500"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0d9488]" />Loading documents…</div>;
  }

  const renderDocRow = (doc) => (
    <div key={doc._id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-2 px-3 rounded-xl bg-slate-50 border border-slate-100">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/^image\//.test(doc.mimeType) ? <ImageIcon className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />}
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-800 truncate">{doc.docType === 'other' ? `${doc.label} · ` : ''}{doc.fileName}</div>
          <div className="text-[10px] text-slate-500">
            {fmtSize(doc.fileSize)} · uploaded {fmtDate(doc.uploadedAt)}
            {doc.reviewedBy && doc.status !== 'Submitted' ? ` · ${doc.status.toLowerCase()} by ${doc.reviewedBy}` : ''}
          </div>
          {doc.status === 'Rejected' && doc.remark && <div className="text-[11px] text-rose-700 mt-0.5">Reason: {doc.remark}</div>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <StatusPill status={doc.status} />
        <button type="button" onClick={() => open(doc)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-[#00695c] hover:bg-teal-50">
          <ExternalLink className="w-3.5 h-3.5" />View
        </button>
        {!isStudent && canReview && doc.status !== 'Verified' && (
          <button type="button" onClick={() => handleReview(doc, 'Verified')} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700">Verify</button>
        )}
        {!isStudent && canReview && doc.status !== 'Rejected' && (
          <button type="button" onClick={() => setRejecting({ id: doc._id, remark: '' })} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white border border-rose-200 text-rose-700 hover:bg-rose-50">Reject</button>
        )}
        {(!isStudent || doc.status !== 'Verified') && (
          <button type="button" onClick={() => handleDelete(doc)} title="Remove" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {rejecting?.id === doc._id && (
        <div className="sm:basis-full flex gap-2 w-full">
          <input autoFocus value={rejecting.remark} onChange={(e) => setRejecting({ ...rejecting, remark: e.target.value })}
            placeholder="Why? e.g. Photo is blurred — upload a clear scan"
            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs" />
          <button type="button" onClick={() => handleReview(doc, 'Rejected', rejecting.remark)} disabled={!rejecting.remark.trim()}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-rose-600 text-white disabled:opacity-50">Reject</button>
          <button type="button" onClick={() => setRejecting(null)} className="px-2 py-1.5 rounded-lg text-[11px] text-slate-500">Cancel</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {toast && <div className="p-3 rounded-xl bg-slate-900 text-white text-xs font-semibold">{toast}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">{isStudent ? 'Upload your documents' : 'Student documents'}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isStudent
              ? 'PDF or photo (JPG / PNG), up to 10 MB each. Only you and the academy staff can open these files.'
              : 'Uploaded by the student from the Student Portal. Verify each one or reject it with a reason.'}
          </p>
        </div>
        <div className="flex gap-2 text-[11px] font-bold flex-shrink-0">
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">Uploaded {uploadedRequired}/{required.length}</span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">Verified {verifiedRequired}/{required.length}</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
        </div>
      )}

      <div className="space-y-3">
        {typeEntries.map(([key, t]) => {
          const list = docsOf(key);
          const hasGood = list.some((d) => d.status !== 'Rejected');
          if (!isStudent && !list.length && !t.required) return null;
          const uploading = busyType === key;
          return (
            <div key={key} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{t.label}</span>
                  {t.required ? <span className="text-[10px] font-bold text-rose-600">Required</span> : <span className="text-[10px] font-semibold text-slate-400">Optional</span>}
                  {!list.length && t.required && <span className="text-[10px] font-semibold text-slate-500">· not uploaded</span>}
                </div>
                {isStudent && (
                  <div className="flex items-center gap-2">
                    {key === 'other' && (
                      <input value={otherLabel} onChange={(e) => setOtherLabel(e.target.value)} placeholder="Document name"
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs w-40" />
                    )}
                    <input type="file" accept={ACCEPT} className="hidden" ref={(el) => { fileInputs.current[key] = el; }}
                      onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; handleFile(key, f); }} />
                    <button type="button" disabled={Boolean(busyType)} onClick={() => fileInputs.current[key]?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#009688] hover:bg-[#00897b] text-white disabled:opacity-50">
                      {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {uploading ? `Uploading ${progress}%` : hasGood && key !== 'other' ? 'Upload another' : 'Upload'}
                    </button>
                  </div>
                )}
              </div>
              {list.length > 0 && <div className="mt-3 space-y-2">{list.map(renderDocRow)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
