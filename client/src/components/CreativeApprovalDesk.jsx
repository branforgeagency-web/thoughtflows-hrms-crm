import React, { useState } from 'react';
import { X, Plus, Check, AlertCircle, Palette, RotateCcw } from 'lucide-react';
import { createCreative, updateCreative } from '../services/api';

// Creatives live on the server. Submitting one also opens a Marketing approval
// in the Leadership Hub; approving / correcting here (or there) closes it.
const FORMATS = [
  { value: 'Poster', label: 'Poster (1080x1350)' },
  { value: 'Reel', label: 'Reel (9:16)' },
  { value: 'Ad creative', label: 'Square Ad Creative (1:1)' },
  { value: 'Flyer', label: 'Campus Flyer (A4 Print)' },
  { value: 'Video', label: 'Video (16:9)' },
  { value: 'Carousel', label: 'Carousel' }
];
// Card colour by format (purely visual)
const PREVIEW_BY_FORMAT = {
  Poster: 'from-blue-600 via-indigo-700 to-slate-950',
  Reel: 'from-purple-600 via-pink-600 to-rose-700',
  'Ad creative': 'from-emerald-600 via-teal-700 to-slate-900',
  Flyer: 'from-amber-500 via-orange-600 to-slate-900',
  Video: 'from-sky-600 via-cyan-700 to-slate-900',
  Carousel: 'from-teal-600 via-cyan-700 to-slate-900'
};

export default function CreativeApprovalDesk({
  creatives = [],
  campaigns = [],
  branches = [],
  currentUser,
  onToast,
  className = ''
}) {
  const toast = (m) => onToast && onToast(m);
  const [previewId, setPreviewId] = useState(null);
  const [correctionItem, setCorrectionItem] = useState(null);
  const [correctionNote, setCorrectionNote] = useState('');
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('Submitted');
  const preview = creatives.find((c) => (c._id || c.id) === previewId) || null;

  const emptyForm = () => ({
    title: '',
    format: 'Poster',
    campaignCode: '',
    author: currentUser?.name || '',
    priority: 'medium',
    tagline: '',
    specs: '',
    branch: 'All Branches',
    notes: ''
  });
  const [form, setForm] = useState(emptyForm);

  const counts = creatives.reduce((m, c) => ({ ...m, [c.status]: (m[c.status] || 0) + 1 }), {});
  const visible = filter === 'All' ? creatives : creatives.filter((c) => c.status === filter);

  const setStatus = async (item, status, extra = {}) => {
    try {
      await updateCreative(item._id || item.id, { status, ...extra });
      toast(status === 'Approved' ? `"${item.title}" approved` : status === 'Submitted' ? `"${item.title}" re-submitted for approval` : `Revision requested for "${item.title}"`);
      return true;
    } catch (err) {
      toast(err?.response?.data?.error || 'Could not update the creative');
      return false;
    }
  };

  const openCorrection = (e, item) => {
    if (e) e.stopPropagation();
    setCorrectionItem(item);
    setCorrectionNote(item.status === 'Needs Correction' ? item.notes || '' : '');
  };

  const submitCorrection = async (e) => {
    e.preventDefault();
    if (!correctionItem || !correctionNote.trim()) return;
    if (await setStatus(correctionItem, 'Needs Correction', { notes: correctionNote.trim() })) setCorrectionItem(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const created = await createCreative({
        ...form,
        title: form.title.trim(),
        tagline: form.tagline.trim() || form.title.trim(),
        previewColor: PREVIEW_BY_FORMAT[form.format] || PREVIEW_BY_FORMAT.Carousel
      });
      toast(`Creative "${created.title}" (${created.code}) submitted — also in Leadership approvals`);
      setIsSubmitOpen(false);
      setFilter('Submitted');
    } catch (err) {
      toast(err?.response?.data?.error || 'Could not submit the creative');
    } finally {
      setSaving(false);
    }
  };

  const badge = (status) => (status === 'Submitted'
    ? 'text-[#d97706] bg-[#fef3c7]/80 border border-[#fde68a]/70'
    : status === 'Needs Correction' ? 'text-[#ef4444] bg-[#fee2e2]/70 border border-[#fecaca]/70'
    : 'text-[#10b981] bg-[#ecfdf5] border border-[#a7f3d0]/70');
  const campaignName = (code) => campaigns.find((c) => c.code === code)?.name;
  const input = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none';

  return (
    <div className={`w-full ${className}`}>
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-[0_4px_25px_-5px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl leading-none select-none">🎨</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Creative Approval Desk</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-mono mt-1">No public post goes live without approval · synced with Leadership Hub</p>
          </div>
          <button
            onClick={() => { setForm(emptyForm()); setIsSubmitOpen(true); }}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Submit Creative</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pb-4">
          {['Submitted', 'Needs Correction', 'Approved', 'All'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-bold border ${filter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
            >
              {f} {f === 'All' ? creatives.length : counts[f] || 0}
            </button>
          ))}
        </div>

        <div className="space-y-3.5 sm:space-y-4">
          {visible.length === 0 && (
            <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              {creatives.length === 0 ? 'No creatives submitted yet.' : `Nothing in "${filter}".`}
            </div>
          )}
          {visible.map((item) => (
            <div
              key={item._id || item.id}
              onClick={() => setPreviewId(item._id || item.id)}
              className="rounded-2xl border border-slate-200/90 p-4 sm:p-5 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs cursor-pointer group"
            >
              <div className="flex-1 min-w-0 pr-0 sm:pr-4">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight group-hover:text-teal-900">{item.title}</span>
                  <span className="bg-[#e0f7f6] text-[#0d9488] font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-[#b2e8e5]">{item.code}</span>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  {[item.format, item.campaignCode || 'no campaign', item.author && `by ${item.author}`, item.priority].filter(Boolean).join(' · ')}
                </div>
              </div>

              <div className="shrink-0 flex sm:flex-col items-end justify-between sm:justify-center gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <span className={`px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap font-mono ${badge(item.status)}`}>{item.status}</span>
                <div className="flex items-center gap-2">
                  {item.status === 'Submitted' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setStatus(item, 'Approved'); }}
                      className="border border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      Approve
                    </button>
                  )}
                  {item.status !== 'Needs Correction' ? (
                    <button
                      onClick={(e) => openCorrection(e, item)}
                      className="border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      Correct
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setStatus(item, 'Submitted'); }}
                      className="border border-amber-200 hover:bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Re-submit
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">{preview.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5 font-mono text-xs">
                    <span className="text-[#0d9488] font-bold">{preview.code}</span>
                    {preview.campaignCode && <><span className="text-slate-300">•</span><span className="text-slate-500">{preview.campaignCode}</span></>}
                  </div>
                </div>
              </div>
              <button onClick={() => setPreviewId(null)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-4">
              <div className={`h-44 bg-gradient-to-br ${preview.previewColor || PREVIEW_BY_FORMAT[preview.format] || PREVIEW_BY_FORMAT.Carousel} rounded-2xl p-6 text-white flex flex-col justify-between shadow-inner relative overflow-hidden`}>
                <span className="self-start text-[10px] font-bold uppercase tracking-wider bg-black/40 px-2.5 py-1 rounded-full border border-white/20">{preview.format}</span>
                <div>
                  <div className="text-xs text-teal-200 font-semibold">{preview.branch || 'All Branches'}</div>
                  <div className="text-lg font-black leading-tight mt-1 drop-shadow">{preview.tagline || preview.title}</div>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 font-mono space-y-1.5">
                {[
                  ['Submitted by', preview.author || '—'],
                  ['Campaign', preview.campaignCode ? `${preview.campaignCode}${campaignName(preview.campaignCode) ? ` · ${campaignName(preview.campaignCode)}` : ''}` : '—'],
                  ['Specifications', preview.specs || '—'],
                  ['Submitted', preview.createdAt ? new Date(preview.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—']
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3"><span className="text-slate-500">{k}:</span><span className="font-bold text-slate-800 text-right">{v}</span></div>
                ))}
              </div>
              {preview.notes && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
                  <div className="font-bold text-amber-900 text-xs">Notes / feedback</div>
                  <p className="text-[11px] text-amber-800 mt-1 font-mono leading-relaxed whitespace-pre-wrap">{preview.notes}</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2.5 mt-4">
              <button type="button" onClick={() => setPreviewId(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Close</button>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { openCorrection(e, preview); setPreviewId(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95"
                >
                  Request Correction
                </button>
                {preview.status !== 'Approved' && (
                  <button
                    onClick={async () => { if (await setStatus(preview, 'Approved')) setPreviewId(null); }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm active:scale-95 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve &amp; Release</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {correctionItem && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">Request Revision</h3>
              </div>
              <button onClick={() => setCorrectionItem(null)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submitCorrection} className="py-4 space-y-3.5 text-xs">
              <p className="text-slate-600">
                Feedback for <strong>{correctionItem.author || 'the designer'}</strong> on <strong>{correctionItem.title}</strong>.
              </p>
              <textarea
                rows="4"
                required
                placeholder="What needs to change?"
                value={correctionNote}
                onChange={(e) => setCorrectionNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
              />
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button type="button" onClick={() => setCorrectionItem(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm active:scale-95 cursor-pointer">
                  Send Correction Notes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSubmitOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎨</span>
                <h3 className="text-base font-bold text-slate-900">Submit New Creative</h3>
              </div>
              <button onClick={() => setIsSubmitOpen(false)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Asset title</label>
                <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={input} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Format</label>
                  <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className={input}>
                    {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Campaign</label>
                  <select value={form.campaignCode} onChange={(e) => setForm({ ...form, campaignCode: e.target.value })} className={`${input} font-mono`}>
                    <option value="">— none —</option>
                    {campaigns.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Designer / author</label>
                  <input type="text" required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className={input} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={input}>
                    <option value="high">high</option>
                    <option value="medium">medium</option>
                    <option value="low">low</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Branch</label>
                  <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className={input}>
                    <option value="All Branches">All Branches</option>
                    {branches.map((b) => <option key={b._id || b.name} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Specs</label>
                  <input type="text" placeholder="size · file type" value={form.specs} onChange={(e) => setForm({ ...form, specs: e.target.value })} className={input} />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Headline / tagline</label>
                <input type="text" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className={input} />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes (asset link, context)</label>
                <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={input} />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button type="button" onClick={() => setIsSubmitOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 shadow-sm active:scale-95 cursor-pointer">
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
