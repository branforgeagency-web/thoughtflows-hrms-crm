import React, { useRef, useState } from 'react';
import { Smartphone, UploadCloud, X, CheckCircle2, AlertCircle, Copy, Loader2 } from 'lucide-react';
import { syncPhoneRecording } from '../services/api';

const MAX_BYTES = 25 * 1024 * 1024;

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(file);
});

const readDuration = (file) => new Promise((resolve) => {
  const url = URL.createObjectURL(file);
  const a = new Audio();
  a.preload = 'metadata';
  const done = (v) => { URL.revokeObjectURL(url); resolve(v); };
  a.onloadedmetadata = () => done(Number.isFinite(a.duration) ? Math.round(a.duration) : 0);
  a.onerror = () => done(0);
  setTimeout(() => done(0), 5000);
  a.src = url;
});

const STATUS_UI = {
  matched: { cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  unmatched: { cls: 'text-amber-700 bg-amber-50 border-amber-200', icon: AlertCircle },
  duplicate: { cls: 'text-slate-500 bg-slate-50 border-slate-200', icon: Copy },
  error: { cls: 'text-rose-700 bg-rose-50 border-rose-200', icon: AlertCircle },
  uploading: { cls: 'text-teal-700 bg-teal-50 border-teal-200', icon: Loader2 },
  waiting: { cls: 'text-slate-400 bg-white border-slate-200', icon: Loader2 }
};

// Counsellors call from their own phone, then pick the phone's call-recording
// files here. The server reads the number/time from each file name and files
// the recording under the matching lead.
export default function PhoneRecordingSync({ isOpen, onClose, onDone }) {
  const inputRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const update = (i, patch) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const start = rows.length;
    setRows((prev) => [...prev, ...files.map((f) => ({ name: f.name, status: 'waiting', detail: '' }))]);
    setBusy(true);
    for (let k = 0; k < files.length; k++) {
      const file = files[k];
      const i = start + k;
      if (file.size > MAX_BYTES) { update(i, { status: 'error', detail: 'File larger than 25 MB' }); continue; }
      update(i, { status: 'uploading', detail: 'Uploading…' });
      try {
        const [audioBase64, durationSeconds] = await Promise.all([readAsDataUrl(file), readDuration(file)]);
        const res = await syncPhoneRecording({ fileName: file.name, audioBase64, durationSeconds, lastModified: file.lastModified });
        if (res.status === 'matched') update(i, { status: 'matched', detail: `→ ${res.lead.fullName} (${res.lead.phone})` });
        else if (res.status === 'duplicate') update(i, { status: 'duplicate', detail: 'Already synced' });
        else update(i, { status: 'unmatched', detail: `No lead found for ${res.parsed?.phone || res.parsed?.name || 'this file'} — saved as "Unknown caller"` });
      } catch (err) {
        update(i, { status: 'error', detail: err.response?.data?.error || err.message });
      }
    }
    setBusy(false);
    if (onDone) onDone();
  };

  const counts = rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/70 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#0e6977]" />
            <h2 className="font-black text-slate-900">Sync Phone Call Recordings</h2>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-700">
          <ol className="list-decimal pl-4 space-y-1 text-[12px]">
            <li>Turn on <b>auto call recording</b> in your phone's dialer (Phone app → Settings → Call recording → Always record).</li>
            <li>Call students normally from your phone.</li>
            <li>Open this CRM on your phone (or laptop), tap <b>Choose recordings</b>, and select the call recordings — select many at once.</li>
          </ol>
          <p className="text-[11px] text-slate-500">
            Each file is matched to a lead by the phone number in its file name. Files already synced are skipped automatically.
          </p>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="w-full border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/50 rounded-xl py-6 flex flex-col items-center gap-1.5 text-teal-800 font-bold disabled:opacity-50 cursor-pointer"
          >
            <UploadCloud className="w-6 h-6" />
            <span>{busy ? 'Syncing…' : 'Choose recordings'}</span>
            <span className="text-[10.5px] font-medium text-teal-700/70">m4a · mp3 · amr · aac · wav · ogg</span>
          </button>
          <input ref={inputRef} type="file" accept="audio/*,.m4a,.amr,.3gp,.aac" multiple className="hidden" onChange={handleFiles} />

          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                {counts.matched ? <span className="text-emerald-700">✓ {counts.matched} matched</span> : null}
                {counts.unmatched ? <span className="text-amber-700">⚠ {counts.unmatched} no lead</span> : null}
                {counts.duplicate ? <span className="text-slate-500">{counts.duplicate} already synced</span> : null}
                {counts.error ? <span className="text-rose-700">✕ {counts.error} failed</span> : null}
              </div>
              <ul className="space-y-1.5">
                {rows.map((r, i) => {
                  const ui = STATUS_UI[r.status] || STATUS_UI.waiting;
                  const Icon = ui.icon;
                  return (
                    <li key={i} className={`border rounded-lg px-3 py-2 flex items-start gap-2 ${ui.cls}`}>
                      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${r.status === 'uploading' ? 'animate-spin' : ''}`} />
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{r.name}</div>
                        {r.detail && <div className="text-[10.5px] opacity-90">{r.detail}</div>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
