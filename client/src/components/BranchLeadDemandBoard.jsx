import React, { useState } from 'react';
import { X, Rocket, Plus, Sparkles } from 'lucide-react';
import { createLeadDemand, updateLeadDemand, createCampaign } from '../services/api';
import { ALL_COURSES } from '../constants/courses';

// Branch requests for leads. Every figure comes from the server: "delivered"
// is the count of real leads for that branch + course (or the linked
// campaign) created since the request was raised.
const CHANNELS = ['Instagram Ads', 'Meta Reels', 'Facebook Ads', 'Google Ads', 'YouTube Ads', 'WhatsApp Campaign', 'Offline / Walk-in'];
const LANGUAGES = ['Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Hindi', 'Marathi', 'English'];
const STATUSES = ['Requested', 'Campaign Live', 'Leads Delivered', 'Closed'];

const fmtDate = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const todayKey = () => {
  const x = new Date();
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export default function BranchLeadDemandBoard({
  demands = [],
  campaigns = [],
  branches = [],
  currentUser,
  onToast,
  onCampaignCreated,
  className = ''
}) {
  const toast = (m) => onToast && onToast(m);
  const [planFor, setPlanFor] = useState(null);
  const [planForm, setPlanForm] = useState(null);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyRequest = () => ({
    branch: branches[0]?.name || '',
    course: 'CPC',
    targetLeads: '',
    priority: 'medium',
    requester: currentUser?.name || '',
    language: '',
    deadline: '',
    notes: ''
  });
  const [requestForm, setRequestForm] = useState(emptyRequest);

  const openPlan = (demand) => {
    setPlanFor(demand);
    setPlanForm({
      mode: 'new',
      existingCode: '',
      name: `${demand.course || 'Course'} intake — ${demand.branch}`,
      channels: [],
      dailyBudget: '',
      budget: '',
      targetCpl: ''
    });
  };

  const handleLaunch = async (e) => {
    e.preventDefault();
    if (!planFor || !planForm) return;
    setSaving(true);
    try {
      let code = planForm.existingCode;
      let created = null;
      if (planForm.mode === 'new') {
        if (!planForm.name.trim()) { toast('Campaign name is required'); return; }
        created = await createCampaign({
          name: planForm.name.trim(),
          channel: planForm.channels.join(', '),
          branch: planFor.branch,
          course: planFor.course,
          status: 'Live',
          dailyBudget: Math.max(0, parseInt(planForm.dailyBudget, 10) || 0),
          budget: Math.max(0, parseInt(planForm.budget, 10) || 0),
          targetCpl: Math.max(0, parseInt(planForm.targetCpl, 10) || 0)
        });
        code = created.code;
      }
      if (!code) { toast('Pick a campaign to link'); return; }
      await updateLeadDemand(planFor._id || planFor.id, { status: 'Campaign Live', campaignCode: code });
      toast(created ? `Campaign ${created.code} created and linked to ${planFor.branch}` : `Linked ${code} to ${planFor.branch}`);
      if (created && onCampaignCreated) onCampaignCreated(created);
      setPlanFor(null);
    } catch (err) {
      toast(err?.response?.data?.error || 'Could not save the campaign');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    const target = parseInt(requestForm.targetLeads, 10);
    if (!requestForm.branch || !(target > 0)) { toast('Branch and a lead target above 0 are required'); return; }
    setSaving(true);
    try {
      const created = await createLeadDemand({ ...requestForm, targetLeads: target });
      toast(`Demand for ${created.targetLeads} ${created.course} leads raised for ${created.branch}`);
      setIsRequestOpen(false);
    } catch (err) {
      toast(err?.response?.data?.error || 'Could not raise the demand');
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (demand, status) => {
    try {
      await updateLeadDemand(demand._id || demand.id, { status });
      toast(`${demand.branch}: ${status}`);
    } catch (err) {
      toast(err?.response?.data?.error || 'Could not update the demand');
    }
  };

  const priorityBadge = (p) => (p === 'high'
    ? 'bg-[#fee2e2]/70 text-[#ef4444] border border-[#fecaca]/60'
    : p === 'medium' ? 'bg-[#fef3c7]/80 text-[#d97706] border border-[#fde68a]/70'
    : 'bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]');
  const statusBadge = (s) => (s === 'Campaign Live' || s === 'Leads Delivered'
    ? 'text-[#10b981] bg-[#ecfdf5] border-[#a7f3d0]/60'
    : s === 'Closed' ? 'text-slate-500 bg-slate-100 border-slate-200'
    : 'text-[#3b82f6] bg-[#eff6ff] border-[#bfdbfe]/60');

  const estPerDay = planForm && Number(planForm.targetCpl) > 0 && Number(planForm.dailyBudget) > 0
    ? Math.round(Number(planForm.dailyBudget) / Number(planForm.targetCpl))
    : null;

  return (
    <div className={`w-full ${className}`}>
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-[0_4px_25px_-5px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl leading-none select-none">🏢</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Branch Lead Demand Board</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-mono mt-1">
              Branches request leads · delivered = real leads created since the request
            </p>
          </div>
          <button
            onClick={() => { setRequestForm(emptyRequest()); setIsRequestOpen(true); }}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Request Leads</span>
          </button>
        </div>

        <div className="space-y-3.5 sm:space-y-4">
          {demands.length === 0 && (
            <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              No branch lead requests yet. Use "Request Leads" to raise one.
            </div>
          )}
          {demands.map((item) => {
            const target = item.targetLeads || 0;
            const delivered = item.deliveredLeads || 0;
            const percent = target ? Math.min(100, Math.round((delivered / target) * 100)) : 0;
            const barColor = percent === 0 ? 'bg-slate-300' : percent < 85 ? 'bg-[#f59e0b]' : 'bg-[#10b981]';
            const overdue = item.deadline && item.deadline < todayKey() && item.status !== 'Closed' && delivered < target;
            return (
              <div key={item.id || item._id} className="rounded-2xl border border-slate-200/90 p-4 sm:p-5 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div className="flex-1 min-w-0 pr-0 sm:pr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                      {item.branch} — {target} {item.course} leads
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold lowercase ${priorityBadge(item.priority)}`}>{item.priority}</span>
                    {item.campaignCode && (
                      <span className="bg-[#e0f7f6] text-[#0d9488] font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-[#b2e8e5]">{item.campaignCode}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-1">
                    {[item.requester, item.language, item.deadline ? `due ${fmtDate(item.deadline)}` : ''].filter(Boolean).join(' · ') || '—'}
                    {overdue && <span className="ml-2 text-rose-600 font-bold">overdue</span>}
                  </div>
                  <div className="mt-3 w-full bg-[#f1f5f9] h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${percent}%` }} />
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-1.5">
                    {delivered} / {target} delivered ({percent}%) · gap {item.gap ?? Math.max(0, target - delivered)}
                  </div>
                </div>

                <div className="shrink-0 flex sm:flex-col items-end justify-between sm:justify-center gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <select
                    value={item.status || 'Requested'}
                    onChange={(e) => handleStatus(item, e.target.value)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border outline-none cursor-pointer ${statusBadge(item.status)}`}
                  >
                    {(STATUSES.includes(item.status) ? STATUSES : [item.status, ...STATUSES]).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {item.status !== 'Closed' && (
                    <button
                      onClick={() => openPlan(item)}
                      className="border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-1.5 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      {item.campaignCode ? 'Change Campaign' : 'Plan Campaign'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PLAN CAMPAIGN — creates a real campaign (or links one) and ties it to the demand */}
      {planFor && planForm && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Plan Campaign: {planFor.branch}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {planFor.gap ?? 0} {planFor.course} leads still needed
                  </p>
                </div>
              </div>
              <button onClick={() => setPlanFor(null)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLaunch} className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                {[['new', 'New campaign'], ['link', 'Link existing']].map(([v, l]) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => setPlanForm({ ...planForm, mode: v })}
                    className={`p-2 rounded-xl border font-bold ${planForm.mode === v ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {planForm.mode === 'link' ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Campaign</label>
                  <select
                    value={planForm.existingCode}
                    onChange={(e) => setPlanForm({ ...planForm, existingCode: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="">Select a campaign…</option>
                    {campaigns.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name} ({c.branch || 'All'})</option>)}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Campaign Name</label>
                    <input
                      type="text"
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Channels</label>
                    <div className="grid grid-cols-2 gap-2">
                      {CHANNELS.map((ch) => {
                        const on = planForm.channels.includes(ch);
                        return (
                          <button
                            type="button"
                            key={ch}
                            onClick={() => setPlanForm({ ...planForm, channels: on ? planForm.channels.filter((c) => c !== ch) : [...planForm.channels, ch] })}
                            className={`p-2 rounded-xl border text-left font-medium transition-all ${on ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                          >
                            <div className="flex items-center justify-between"><span>{ch}</span>{on && <span className="text-teal-600">✓</span>}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[['dailyBudget', 'Daily budget ₹'], ['budget', 'Total budget ₹'], ['targetCpl', 'Target CPL ₹']].map(([k, l]) => (
                      <div key={k}>
                        <label className="block font-bold text-slate-700 mb-1">{l}</label>
                        <input
                          type="number"
                          min="0"
                          value={planForm[k]}
                          onChange={(e) => setPlanForm({ ...planForm, [k]: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                  {estPerDay !== null && (
                    <div className="text-[11px] text-slate-500 font-mono">At target CPL: ~{estPerDay} leads/day</div>
                  )}
                </>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button type="button" onClick={() => setPlanFor(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                  <span>{planForm.mode === 'new' ? 'Create & link campaign' : 'Link campaign'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RAISE A BRANCH LEAD REQUEST */}
      {isRequestOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏢</span>
                <h3 className="text-base font-bold text-slate-900">Branch Lead Request</h3>
              </div>
              <button onClick={() => setIsRequestOpen(false)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Branch</label>
                <select
                  value={requestForm.branch}
                  onChange={(e) => setRequestForm({ ...requestForm, branch: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="">Select branch…</option>
                  {branches.map((b) => <option key={b._id || b.name} value={b.name}>{b.name}{b.city ? ` (${b.city})` : ''}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course</label>
                  <select
                    value={requestForm.course}
                    onChange={(e) => setRequestForm({ ...requestForm, course: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {ALL_COURSES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Leads needed</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={requestForm.targetLeads}
                    onChange={(e) => setRequestForm({ ...requestForm, targetLeads: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={requestForm.priority}
                    onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Language</label>
                  <select
                    value={requestForm.language}
                    onChange={(e) => setRequestForm({ ...requestForm, language: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="">—</option>
                    {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Requested by</label>
                  <input
                    type="text"
                    required
                    value={requestForm.requester}
                    onChange={(e) => setRequestForm({ ...requestForm, requester: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={requestForm.deadline}
                    onChange={(e) => setRequestForm({ ...requestForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows="2"
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button type="button" onClick={() => setIsRequestOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 shadow-sm active:scale-95 cursor-pointer">
                  Submit Demand Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
