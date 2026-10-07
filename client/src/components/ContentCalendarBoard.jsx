import React, { useState } from 'react';
import { X, Plus, Calendar, Trash2 } from 'lucide-react';
import { createContentPiece, updateContentPiece, deleteContentPiece } from '../services/api';

// Content calendar — every piece is a ContentPiece record on the server
const STAGES = [
  { label: 'Script', status: 'Script Pending' },
  { label: 'Design', status: 'Design Pending' },
  { label: 'Approval', status: 'Approval Pending' },
  { label: 'Scheduled', status: 'Scheduled' },
  { label: 'Published', status: 'Published' }
];
const CHANNELS = ['Instagram', 'YouTube', 'WhatsApp', 'LinkedIn', 'Facebook', 'Website / Blog'];
const CATEGORIES = ['CPC Exam Tips', 'Placement Proof', 'Career Growth', 'Branch Promotion', 'Student Spotlight', 'Event / Workshop'];
const FORMATS = ['Reel (9:16 Video)', 'Carousel (1080x1350)', 'Post (1080x1080)', 'Video (16:9)', 'Story', 'Flyer', 'Article'];

const localDateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDue = (d) => {
  if (!d) return 'no date';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d; // older free-text values
  const today = localDateKey();
  const tomorrow = localDateKey(new Date(Date.now() + 86400000));
  if (d === today) return 'today';
  if (d === tomorrow) return 'tomorrow';
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

export default function ContentCalendarBoard({ pieces = [], branches = [], currentUser, onToast, className = '' }) {
  const toast = (m) => onToast && onToast(m);
  const [selectedId, setSelectedId] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const selected = pieces.find((p) => (p._id || p.id) === selectedId) || null;

  const emptyForm = () => ({
    title: '',
    channel: 'Instagram',
    category: CATEGORIES[0],
    dueDate: localDateKey(),
    author: currentUser?.name || '',
    status: 'Script Pending',
    description: '',
    caption: '',
    format: FORMATS[0],
    targetBranch: 'All Branches'
  });
  const [form, setForm] = useState(emptyForm);

  const sorted = [...pieces].sort((a, b) => {
    const pa = a.status === 'Published' ? 1 : 0;
    const pb = b.status === 'Published' ? 1 : 0;
    return pa - pb || String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999'));
  });
  const today = localDateKey();
  const inFlight = pieces.filter((p) => p.status !== 'Published').length;

  const handleStatusChange = async (piece, status) => {
    try {
      await updateContentPiece(piece._id || piece.id, { status });
      toast(`"${piece.title}" → ${status}`);
    } catch (err) {
      toast(err?.response?.data?.error || 'Could not update the content piece');
    }
  };

  const handleDelete = async (piece) => {
    if (!window.confirm(`Delete "${piece.title}"?`)) return;
    try {
      await deleteContentPiece(piece._id || piece.id);
      setSelectedId(null);
      toast('Content piece removed');
    } catch (err) {
      toast(err?.response?.data?.error || 'Could not delete');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const created = await createContentPiece({ ...form, title: form.title.trim() });
      toast(`Scheduled "${created.title}" (${created.code})`);
      setIsAddOpen(false);
    } catch (err) {
      toast(err?.response?.data?.error || 'Could not save the content piece');
    } finally {
      setSaving(false);
    }
  };

  const badge = (status) => {
    switch (status) {
      case 'Approval Pending':
      case 'Design Pending':
        return 'text-[#d97706] bg-[#fef3c7]/80 border border-[#fde68a]/70';
      case 'Script Pending':
        return 'text-[#3b82f6] bg-[#eff6ff] border border-[#bfdbfe]/70';
      case 'Published':
        return 'text-slate-600 bg-slate-100 border border-slate-200';
      default:
        return 'text-[#10b981] bg-[#ecfdf5] border border-[#a7f3d0]/70';
    }
  };

  const input = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none';

  return (
    <div className={`w-full ${className}`}>
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-[0_4px_25px_-5px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl leading-none select-none">📅</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Content Calendar</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-mono mt-1">{inFlight} pieces in flight</p>
          </div>
          <button
            onClick={() => { setForm(emptyForm()); setIsAddOpen(true); }}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Piece</span>
          </button>
        </div>

        <div className="space-y-3.5 sm:space-y-4">
          {sorted.length === 0 && (
            <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              Nothing on the calendar yet. Use "Schedule Piece" to add the first one.
            </div>
          )}
          {sorted.map((piece) => {
            const overdue = piece.dueDate && /^\d{4}-/.test(piece.dueDate) && piece.dueDate < today && !['Scheduled', 'Published'].includes(piece.status);
            return (
              <div
                key={piece._id || piece.id}
                onClick={() => setSelectedId(piece._id || piece.id)}
                className="rounded-2xl border border-slate-200/90 p-4 sm:p-5 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs cursor-pointer group"
              >
                <div className="flex-1 min-w-0 pr-0 sm:pr-4">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight group-hover:text-teal-900">{piece.title}</span>
                    <span className="bg-[#e0f7f6] text-[#0d9488] font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-[#b2e8e5]">{piece.code}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-1">
                    {[piece.channel, piece.category, `due ${fmtDue(piece.dueDate)}`, piece.author].filter(Boolean).join(' · ')}
                    {overdue && <span className="ml-2 text-rose-600 font-bold">overdue</span>}
                  </div>
                </div>
                <div className="shrink-0 flex items-center justify-end">
                  <span className={`px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap font-mono ${badge(piece.status)}`}>{piece.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">{selected.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5 font-mono text-xs">
                    <span className="text-[#0d9488] font-bold">{selected.code}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">{selected.channel}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedId(null)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 font-mono">
                {[
                  ['Owner', selected.author || '—'],
                  ['Category & format', [selected.category, selected.format].filter(Boolean).join(' · ') || '—'],
                  ['Target branch', selected.targetBranch || 'All Branches'],
                  ['Due', fmtDue(selected.dueDate)]
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center gap-3">
                    <span className="text-slate-500">{k}:</span>
                    <span className="font-bold text-slate-800 text-right">{v}</span>
                  </div>
                ))}
              </div>

              {selected.description && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Brief</label>
                  <p className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.description}</p>
                </div>
              )}
              {selected.caption && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Caption</label>
                  <p className="p-3 rounded-xl bg-teal-50/40 border border-teal-200/60 text-slate-800 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">{selected.caption}</p>
                </div>
              )}

              <div className="pt-2">
                <label className="block font-bold text-slate-700 mb-2">Update Stage</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 font-mono text-center">
                  {STAGES.map((st) => (
                    <button
                      key={st.status}
                      type="button"
                      onClick={() => handleStatusChange(selected, st.status)}
                      className={`p-2 rounded-xl text-xs font-semibold border transition-all ${selected.status === st.status ? 'bg-slate-900 text-white border-slate-900' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between">
              <button onClick={() => handleDelete(selected)} className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button onClick={() => setSelectedId(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Close</button>
            </div>
          </div>
        </div>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">📅</span>
                <h3 className="text-base font-bold text-slate-900">Schedule Content Piece</h3>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Title</label>
                <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={input} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Channel</label>
                  <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className={input}>
                    {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={input}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Format</label>
                  <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className={input}>
                    {FORMATS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Due date</label>
                  <input type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={input} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Owner</label>
                  <input type="text" required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className={input} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target branch</label>
                  <select value={form.targetBranch} onChange={(e) => setForm({ ...form, targetBranch: e.target.value })} className={input}>
                    <option value="All Branches">All Branches</option>
                    {branches.map((b) => <option key={b._id || b.name} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={input}>
                  {STAGES.map((s) => <option key={s.status} value={s.status}>{s.status}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Brief</label>
                <textarea rows="2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={input} />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Caption (optional)</label>
                <textarea rows="2" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} className={input} />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 shadow-sm active:scale-95 cursor-pointer">
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
