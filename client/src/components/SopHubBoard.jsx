import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  X,
  Send,
  Plus,
  Pencil,
  Trash2
} from 'lucide-react';
import { getSops, createSop, updateSop, deleteSop, assignSop, onDataUpdate } from '../services/api';

const EMPTY_FORM = { title: '', subtitle: '', category: 'General', content: '' };
const CATEGORIES = ['General', 'Operations', 'Governance', 'Reporting', 'Training'];

// Department SOPs, written and versioned by department heads. "Send to team"
// drops the SOP into every team member's notification bell.
export default function SopHubBoard({
  department = 'DEP-HR-001',
  departmentName = 'HR'
}) {
  const [sops, setSops] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [selectedViewSop, setSelectedViewSop] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | sop
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const load = useCallback(async () => {
    try {
      const data = await getSops({ department });
      setSops(Array.isArray(data) ? data : []);
      setLoadError('');
    } catch (e) {
      setSops([]);
      setLoadError(e?.response?.data?.error || 'Could not load SOPs');
    }
  }, [department]);

  useEffect(() => {
    load();
    return onDataUpdate((entity) => { if (entity === 'sops') load(); });
  }, [load]);

  const openEditor = (sop) => {
    setEditing(sop || 'new');
    setForm(sop ? { title: sop.title, subtitle: sop.subtitle || '', category: sop.category || 'General', content: sop.content || '' } : EMPTY_FORM);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editing === 'new') await createSop({ ...form, department });
      else await updateSop(editing._id, form);
      showToast(editing === 'new' ? `"${form.title}" added` : `"${form.title}" updated to a new version`);
      setEditing(null);
      load();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Could not save the SOP');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sop) => {
    if (!window.confirm(`Delete "${sop.title}"?`)) return;
    try {
      await deleteSop(sop._id);
      load();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Could not delete the SOP');
    }
  };

  const handleAssign = async (sop) => {
    try {
      await assignSop(sop._id);
      showToast(`"${sop.title}" sent to every ${departmentName} team member's notifications ✓`);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Could not send the SOP');
    }
  };

  const btn = 'border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-1 rounded-lg cursor-pointer transition-all shadow-2xs active:scale-95';
  const input = 'w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500';

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
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
        <button
          onClick={() => openEditor(null)}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> New SOP
        </button>
      </div>

      <div className="divide-y divide-slate-100 border-t border-slate-100">
        {sops === null && <div className="py-10 text-center text-xs text-slate-400">Loading SOPs…</div>}
        {loadError && <div className="py-6 text-center text-xs text-rose-600">{loadError}</div>}
        {sops !== null && !loadError && sops.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-xs font-semibold text-slate-500">No SOPs written for {departmentName} yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">Add the first one with “New SOP”.</p>
          </div>
        )}
        {(sops || []).map((doc) => (
          <div
            key={doc._id}
            className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-slate-50/60 px-2 rounded-xl transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="text-slate-300 text-sm select-none">📄</span>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-[#0f172a] tracking-tight group-hover:text-purple-900 transition-colors truncate">
                  {doc.title}
                </h4>
                <p className="text-[11px] text-slate-400 font-mono truncate">
                  {doc.category} · v{doc.version}{doc.updatedBy ? ` · ${doc.updatedBy}` : ''} · {new Date(doc.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setSelectedViewSop(doc)} className={btn}>View</button>
              <button onClick={() => openEditor(doc)} className={btn} title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => handleAssign(doc)} className={btn}>Send to team</button>
              <button onClick={() => handleDelete(doc)} className={`${btn} text-rose-600`} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      {selectedViewSop && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setSelectedViewSop(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4 flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">📄</div>
              <div>
                <h4 className="text-base font-bold text-slate-900">{selectedViewSop.title}</h4>
                <p className="text-xs text-slate-400 font-mono">
                  {[selectedViewSop.subtitle, `v${selectedViewSop.version}`].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 pr-2 text-xs text-slate-700 leading-relaxed">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 whitespace-pre-line font-mono text-[11px]">
                {selectedViewSop.content || 'No content yet.'}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-4 flex-shrink-0">
              <button type="button" onClick={() => setSelectedViewSop(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
                Close Document
              </button>
              <button
                type="button"
                onClick={() => { handleAssign(selectedViewSop); setSelectedViewSop(null); }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md flex items-center gap-1.5 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send to Team</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <form onSubmit={handleSave} className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-slate-200 shadow-2xl relative space-y-3 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
            <h4 className="text-base font-bold text-slate-900">{editing === 'new' ? 'New SOP' : `Edit "${editing.title}"`}</h4>
            {editing !== 'new' && <p className="text-[11px] text-slate-400">Saving creates version {editing.version + 1}.</p>}
            <input className={input} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <input className={input} placeholder="Subtitle (optional)" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <textarea className={`${input} font-mono`} rows={12} placeholder="Procedure…" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white shadow-md">
                {saving ? 'Saving…' : 'Save SOP'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
