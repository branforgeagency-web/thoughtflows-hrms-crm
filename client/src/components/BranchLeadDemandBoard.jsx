import React, { useState } from 'react';
import { 
  X, 
  Rocket, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  Target, 
  TrendingUp,
  Clock,
  Layers,
  Building2,
  Users
} from 'lucide-react';

export const INITIAL_DEMANDS = [
  {
    id: 'dem-hyd',
    branch: 'Hyderabad',
    targetLeads: 150,
    deliveredLeads: 142,
    course: 'CPC',
    priority: 'high',
    requester: 'Deepa R. (HR Head)',
    language: 'Telugu',
    deadline: 'deadline this weekend',
    status: 'Campaign Live'
  },
  {
    id: 'dem-cbe',
    branch: 'Coimbatore',
    targetLeads: 60,
    deliveredLeads: 39,
    course: 'Medical Billing',
    priority: 'medium',
    requester: 'Kavitha N.',
    language: 'Tamil',
    deadline: 'deadline this month',
    status: 'Campaign Live'
  },
  {
    id: 'dem-slm',
    branch: 'Salem',
    targetLeads: 80,
    deliveredLeads: 61,
    course: 'CPC',
    priority: 'medium',
    requester: 'Branch Manager',
    language: 'Tamil',
    deadline: 'deadline 2 weeks',
    status: 'Leads Delivered'
  },
  {
    id: 'dem-koc',
    branch: 'Kochi',
    targetLeads: 50,
    deliveredLeads: 0,
    course: 'CPC',
    priority: 'low',
    requester: 'Branch Manager',
    language: 'Malayalam',
    deadline: 'deadline next month',
    status: 'Requested'
  }
];

export default function BranchLeadDemandBoard({ 
  onToast,
  onCampaignCreated,
  className = "" 
}) {
  const [demands, setDemands] = useState(() => {
    try {
      const saved = localStorage.getItem('thoughtflows_branch_demands');
      return saved ? JSON.parse(saved) : INITIAL_DEMANDS;
    } catch {
      return INITIAL_DEMANDS;
    }
  });

  const [selectedDemandForPlan, setSelectedDemandForPlan] = useState(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Campaign Planning Modal Form State
  const [planForm, setPlanForm] = useState({
    campaignName: '',
    channels: ['Instagram Ads', 'Meta Reels'],
    dailyBudget: 2500,
    estimatedCpl: 160,
    targetAudience: 'Life Science Freshers & College Final Years'
  });

  // New Lead Request Modal Form State
  const [requestForm, setRequestForm] = useState({
    branch: 'Chennai (Guindy HQ)',
    course: 'CPC',
    targetLeads: 100,
    priority: 'medium',
    requester: 'Praveen S. (Branch Manager)',
    language: 'Tamil',
    deadline: 'deadline 2 weeks'
  });

  // Save demands helper
  const updateDemands = (newDemands) => {
    setDemands(newDemands);
    try {
      localStorage.setItem('thoughtflows_branch_demands', JSON.stringify(newDemands));
    } catch (e) {
      console.warn('Failed to save branch demands', e);
    }
  };

  // Open Campaign Planning Modal for specific demand
  const handleOpenPlanModal = (demand) => {
    setSelectedDemandForPlan(demand);
    setPlanForm({
      campaignName: `${demand.course} Intake Sprint — ${demand.branch}`,
      channels: demand.course === 'CPC' ? ['Instagram Ads', 'Meta Reels', 'Google Ads'] : ['Facebook Ads', 'WhatsApp Campaign'],
      dailyBudget: 2500,
      estimatedCpl: 165,
      targetAudience: `${demand.language} speaking Life Science, Pharmacy & Biotech graduates in ${demand.branch}`
    });
  };

  // Launch Campaign from Planner
  const handleLaunchCampaign = (e) => {
    e.preventDefault();
    if (!selectedDemandForPlan) return;

    const remainingGap = Math.max(0, selectedDemandForPlan.targetLeads - selectedDemandForPlan.deliveredLeads);
    const simulatedDelivery = Math.min(
      selectedDemandForPlan.targetLeads,
      selectedDemandForPlan.deliveredLeads + Math.max(10, Math.floor(remainingGap * 0.4))
    );

    const updated = demands.map(d => {
      if (d.id === selectedDemandForPlan.id) {
        return {
          ...d,
          status: 'Campaign Live',
          deliveredLeads: simulatedDelivery
        };
      }
      return d;
    });

    updateDemands(updated);

    const message = `🚀 Campaign launched for ${selectedDemandForPlan.branch}! Status updated to "Campaign Live".`;
    if (onToast) {
      onToast(message);
    } else {
      alert(message);
    }

    if (onCampaignCreated) {
      onCampaignCreated({
        name: planForm.campaignName,
        branch: selectedDemandForPlan.branch,
        course: selectedDemandForPlan.course,
        dailyBudget: planForm.dailyBudget,
        channel: planForm.channels.join(', ')
      });
    }

    setSelectedDemandForPlan(null);
  };

  // Submit New Branch Demand Request
  const handleSubmitRequest = (e) => {
    e.preventDefault();
    const newDemand = {
      id: `dem-${Date.now()}`,
      branch: requestForm.branch,
      targetLeads: parseInt(requestForm.targetLeads, 10) || 50,
      deliveredLeads: 0,
      course: requestForm.course,
      priority: requestForm.priority,
      requester: requestForm.requester,
      language: requestForm.language,
      deadline: requestForm.deadline,
      status: 'Requested'
    };

    const updated = [newDemand, ...demands];
    updateDemands(updated);

    const message = `🏢 Demand for ${newDemand.targetLeads} ${newDemand.course} leads posted for ${newDemand.branch}!`;
    if (onToast) {
      onToast(message);
    } else {
      alert(message);
    }

    setIsRequestModalOpen(false);
  };

  // Badge styling matching the reference screenshot exactly
  const getPriorityBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-[#fee2e2]/70 text-[#ef4444] border border-[#fecaca]/60';
      case 'medium':
        return 'bg-[#fef3c7]/80 text-[#d97706] border border-[#fde68a]/70';
      case 'low':
      default:
        return 'bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]';
    }
  };

  // Status pill styling matching the reference screenshot exactly
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Campaign Live':
        return 'text-[#10b981] bg-[#ecfdf5] border border-[#a7f3d0]/60';
      case 'Leads Delivered':
        return 'text-[#10b981] bg-[#ecfdf5] border border-[#a7f3d0]/60';
      case 'Requested':
      default:
        return 'text-[#3b82f6] bg-[#eff6ff] border border-[#bfdbfe]/60';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Outer Card Container - Exact match to user reference screenshot */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-[0_4px_25px_-5px_rgba(15,23,42,0.05)]">
        
        {/* Header: Title + Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl leading-none select-none">🏢</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Branch Lead Demand Board
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-mono mt-1">
              Branches request leads · marketing delivers via campaigns
            </p>
          </div>

          {/* Quick Action: Request Leads Button */}
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Request Leads</span>
          </button>
        </div>

        {/* List of Branch Lead Demand Cards */}
        <div className="space-y-3.5 sm:space-y-4">
          {demands.map((item) => {
            const target = item.targetLeads || 1;
            const delivered = item.deliveredLeads || 0;
            const percent = Math.min(100, Math.round((delivered / target) * 100));

            // Determine progress bar fill color
            // Hyderabad (95%) is green (#10b981)
            // Coimbatore (65%) & Salem (76%) are amber (#f59e0b)
            // Kochi (0%) is empty / gray
            let barColor = 'bg-[#10b981]';
            if (percent === 0) {
              barColor = 'bg-slate-300';
            } else if (percent < 85) {
              barColor = 'bg-[#f59e0b]';
            }

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200/90 p-4 sm:p-5 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:shadow-xs"
              >
                {/* Left / Middle Section: Title, Subtitle, Progress Bar, Metrics */}
                <div className="flex-1 min-w-0 pr-0 sm:pr-4">
                  {/* Row 1: Title & Priority Pill */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                      {item.branch} — {item.targetLeads} {item.course} leads
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold lowercase ${getPriorityBadge(item.priority)}`}>
                      {item.priority}
                    </span>
                  </div>

                  {/* Row 2: Requester · Language · Deadline */}
                  <div className="text-xs text-slate-500 font-mono mt-1">
                    {item.requester} · {item.language} · {item.deadline}
                  </div>

                  {/* Row 3: Progress Bar */}
                  <div className="mt-3 w-full bg-[#f1f5f9] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {/* Row 4: Delivered vs Target Text */}
                  <div className="text-xs text-slate-500 font-mono mt-1.5">
                    {delivered} / {target} delivered ({percent}%)
                  </div>
                </div>

                {/* Right Section: Status Pill at Top + Plan Campaign Button */}
                <div className="shrink-0 flex sm:flex-col items-end justify-between sm:justify-center gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Status Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${getStatusBadge(item.status)}`}>
                    {item.status}
                  </span>

                  {/* Plan Campaign Button */}
                  <button
                    onClick={() => handleOpenPlanModal(item)}
                    className="border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-1.5 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    Plan Campaign
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================================= */}
      {/* MODAL 1: PLAN CAMPAIGN MODAL                                            */}
      {/* ======================================================================= */}
      {selectedDemandForPlan && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Plan Campaign: {selectedDemandForPlan.branch}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Fulfill {selectedDemandForPlan.targetLeads - selectedDemandForPlan.deliveredLeads} pending {selectedDemandForPlan.course} leads
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDemandForPlan(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleLaunchCampaign} className="py-4 space-y-4 text-xs">
              {/* Branch & Target Summary Banner */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Branch & Course:</span>
                  <span className="font-bold text-slate-900">{selectedDemandForPlan.branch} · {selectedDemandForPlan.course}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Requested By:</span>
                  <span className="text-slate-800">{selectedDemandForPlan.requester}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Current Delivery:</span>
                  <span className="font-bold text-emerald-600">
                    {selectedDemandForPlan.deliveredLeads} / {selectedDemandForPlan.targetLeads} leads ({Math.round((selectedDemandForPlan.deliveredLeads / selectedDemandForPlan.targetLeads) * 100)}%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Deadline:</span>
                  <span className="text-amber-700 font-bold">{selectedDemandForPlan.deadline}</span>
                </div>
              </div>

              {/* Campaign Title */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={planForm.campaignName}
                  onChange={(e) => setPlanForm({ ...planForm, campaignName: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Channels Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Delivery Channels</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Instagram Ads', 'Meta Reels', 'Facebook Ads', 'Google Ads', 'WhatsApp Campaign'].map((ch) => {
                    const isSelected = planForm.channels.includes(ch);
                    return (
                      <button
                        type="button"
                        key={ch}
                        onClick={() => {
                          if (isSelected) {
                            setPlanForm({ ...planForm, channels: planForm.channels.filter(c => c !== ch) });
                          } else {
                            setPlanForm({ ...planForm, channels: [...planForm.channels, ch] });
                          }
                        }}
                        className={`p-2 rounded-xl border text-left font-medium transition-all ${
                          isSelected
                            ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{ch}</span>
                          {isSelected && <span className="text-teal-600">✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Daily Budget Slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">Daily Ad Spend</label>
                  <span className="font-mono font-bold text-teal-700 text-sm">
                    ₹{planForm.dailyBudget.toLocaleString()}/day
                  </span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="500"
                  value={planForm.dailyBudget}
                  onChange={(e) => setPlanForm({ ...planForm, dailyBudget: parseInt(e.target.value, 10) })}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-1">
                  <span>₹500 (Pilot)</span>
                  <span>Est. ~{Math.round(planForm.dailyBudget / planForm.estimatedCpl)} leads/day</span>
                  <span>₹10,000 (Aggressive)</span>
                </div>
              </div>

              {/* Target Audience / Language */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Regional Audience &amp; Language</label>
                <input
                  type="text"
                  value={planForm.targetAudience}
                  onChange={(e) => setPlanForm({ ...planForm, targetAudience: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedDemandForPlan(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                  <span>Launch Campaign &amp; Fulfill Demand</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 2: REQUEST LEADS MODAL (FOR BRANCH HEADS / COUNSELORS)            */}
      {/* ======================================================================= */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏢</span>
                <h3 className="text-base font-bold text-slate-900">Branch Lead Request</h3>
              </div>
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Branch</label>
                <select
                  value={requestForm.branch}
                  onChange={(e) => setRequestForm({ ...requestForm, branch: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="Ameerpet">Ameerpet (Hyderabad)</option>
                  <option value="Dilsukhnagar">Dilsukhnagar (Hyderabad)</option>
                  <option value="Gandhipuram">Gandhipuram (Coimbatore)</option>
                  <option value="Hopes">Hopes (Coimbatore)</option>
                  <option value="Kochi">Kochi (Kerala)</option>
                  <option value="Salem">Salem (Tamil Nadu)</option>
                  <option value="Saravanampatti">Saravanampatti (Coimbatore)</option>
                  <option value="Tirupati">Tirupati (Andhra Pradesh)</option>
                  <option value="Trichy">Trichy (Tamil Nadu)</option>
                  <option value="Trivandrum">Trivandrum (Kerala)</option>
                  <option value="Vizag">Vizag (Andhra Pradesh)</option>
                  <option value="Pune">Pune (Maharashtra)</option>
                  <option value="Kollapur">Kollapur (Maharashtra)</option>
                  <option value="Theni">Theni (Tamil Nadu)</option>
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
                    <option value="CPC">CPC (Medical Coding)</option>
                    <option value="Medical Billing">Medical Billing (CPB)</option>
                    <option value="CIC">Inpatient Coding (CIC)</option>
                    <option value="CPMA">Medical Auditing (CPMA)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Leads Needed</label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    step="5"
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
                    <option value="Tamil">Tamil</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Malayalam">Malayalam</option>
                    <option value="Kannada">Kannada</option>
                    <option value="English">English</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Requested By (Name &amp; Role)</label>
                <input
                  type="text"
                  value={requestForm.requester}
                  onChange={(e) => setRequestForm({ ...requestForm, requester: e.target.value })}
                  placeholder="e.g. Deepa R. (HR Head)"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Intake Deadline</label>
                <select
                  value={requestForm.deadline}
                  onChange={(e) => setRequestForm({ ...requestForm, deadline: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="deadline this weekend">deadline this weekend</option>
                  <option value="deadline 2 weeks">deadline 2 weeks</option>
                  <option value="deadline this month">deadline this month</option>
                  <option value="deadline next month">deadline next month</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
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
