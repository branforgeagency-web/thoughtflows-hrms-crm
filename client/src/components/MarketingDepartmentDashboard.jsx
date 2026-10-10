import React, { useState, useEffect } from 'react';
import {
  Activity,
  Rocket,
  Target,
  Building2,
  Calendar,
  Palette,
  TrendingUp,
  ChevronRight,
  Zap,
  X,
  CheckCircle2,
  Plus,
  Sparkles,
  LogOut,
  Pencil
} from 'lucide-react';
import logoImg from '../assets/thoughtflows-logo.png';
import BranchLeadDemandBoard from './BranchLeadDemandBoard';
import ContentCalendarBoard from './ContentCalendarBoard';
import CreativeApprovalDesk from './CreativeApprovalDesk';
import RoiReportsBoard from './RoiReportsBoard';
import NotificationBell from './NotificationBell';
import DashboardNavSwitcher from './DashboardNavSwitcher';
import {
  getLeads, createLead, onDataUpdate, getCampaigns, createCampaign, updateCampaign, getMarketingSources,
  getLeadDemands, getCreatives, updateCreative, getContentPieces, getBranches
} from '../services/api';
import { ALL_COURSES } from '../constants/courses';

const CAMPAIGN_CHANNELS = ['Instagram Ads', 'Meta Reels', 'Facebook Ads', 'Google Ads', 'YouTube Ads', 'WhatsApp Campaign', 'Campus / Offline', 'Referral'];
const CAMPAIGN_STATUSES = ['Live', 'Paused', 'Planned', 'Completed'];

export default function MarketingDepartmentDashboard({
  onClose,
  currentUser,
  onLogout,
  onSwitchDepartment,
  theme = 'classic'
}) {
  const [activeTab, setActiveTab] = useState('command-center');

  // Live marketing data — every figure on this dashboard is computed from these records
  const [leads, setLeads] = useState([]);
  const [campaignRows, setCampaignRows] = useState([]);
  const [leadSourceRows, setLeadSourceRows] = useState([]);
  const [demands, setDemands] = useState([]);
  const [creatives, setCreatives] = useState([]);
  const [contentPieces, setContentPieces] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [selectedAction, setSelectedAction] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [generatedLeadModal, setGeneratedLeadModal] = useState(null);
  const [leadFormCampaign, setLeadFormCampaign] = useState(null);
  const [leadForm, setLeadForm] = useState({ fullName: '', phone: '', email: '', location: '', branch: '', course: '' });
  const [savingLead, setSavingLead] = useState(false);
  const [selectedSourceDetail, setSelectedSourceDetail] = useState(null);
  // Campaign create / edit (spend & budget are typed in from the ad platforms)
  const [campaignForm, setCampaignForm] = useState(null);
  const [savingCampaign, setSavingCampaign] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchLiveMarketingData = async () => {
      const [leadsData, campaignsData, sourcesData, demandsData, creativesData, contentData, branchData] = await Promise.all([
        getLeads().catch(() => null),
        getCampaigns().catch(() => null),
        getMarketingSources().catch(() => null),
        getLeadDemands().catch(() => null),
        getCreatives().catch(() => null),
        getContentPieces().catch(() => null),
        getBranches().catch(() => null)
      ]);
      if (!isMounted) return;
      if (leadsData && Array.isArray(leadsData.leads)) setLeads(leadsData.leads);
      else if (Array.isArray(leadsData)) setLeads(leadsData);
      if (Array.isArray(campaignsData)) setCampaignRows(campaignsData);
      if (Array.isArray(sourcesData)) setLeadSourceRows(sourcesData);
      if (Array.isArray(demandsData)) setDemands(demandsData);
      if (Array.isArray(creativesData)) setCreatives(creativesData);
      if (Array.isArray(contentData)) setContentPieces(contentData);
      if (Array.isArray(branchData)) setBranches(branchData);
      setLoaded(true);
    };
    fetchLiveMarketingData();
    const unsub = onDataUpdate((entity) => {
      if (['leads', 'approvals', 'students', 'campaigns', 'marketing_campaigns', 'demands', 'creatives', 'content', 'branches'].includes(entity)) {
        fetchLiveMarketingData();
      }
    });
    // HR lead outcomes and Leadership approval decisions happen on other machines
    const poll = setInterval(fetchLiveMarketingData, 60000);
    return () => {
      isMounted = false;
      unsub();
      clearInterval(poll);
    };
  }, []);

  const inr = (n) => (n === null || n === undefined ? '—' : `₹${(Number(n) || 0).toLocaleString('en-IN')}`);
  const shortInr = (n) => {
    const v = Number(n) || 0;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)}k`;
    return `₹${v}`;
  };
  const now = new Date();
  const leadsThisMonth = leads.filter((l) => {
    const d = new Date(l.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const totalSpend = campaignRows.reduce((s, c) => s + (Number(c.spent) || 0), 0);
  // Logged spend changes dated this month (server keeps a spend log per campaign)
  const spendThisMonth = campaignRows.reduce((s, c) => s + (Number(c.spentThisMonth) || 0), 0);
  const campaignLeads = campaignRows.reduce((s, c) => s + (c.leads || 0), 0);
  const campaignAdmissions = campaignRows.reduce((s, c) => s + (c.admissions || 0), 0);
  const blendedCpl = totalSpend && campaignLeads ? Math.round(totalSpend / campaignLeads) : null;
  const isUnderperforming = (c) => c.status === 'Underperforming' || (c.overTargetCpl && c.status !== 'Paused');
  const statusClassOf = (c) => (c.status === 'Paused' || c.status === 'Completed'
    ? 'bg-slate-100 text-slate-600 border-slate-200'
    : isUnderperforming(c) ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200');

  const campaignDeskList = campaignRows.map((c) => ({ ...c, statusClass: statusClassOf(c) }));
  const campaigns = campaignRows.map((c) => ({
    id: c.id || c._id,
    name: c.name,
    platform: c.channel || '—',
    status: isUnderperforming(c) ? 'Underperforming' : c.status,
    statusColor: statusClassOf(c),
    dailyBudget: Number(c.dailyBudget) || 0,
    spendMonth: Number(c.spent) || 0,
    leads: c.leads || 0,
    cpl: c.cpl,
    targetCpl: c.targetCpl
  }));
  const pendingCreatives = creatives.filter((c) => c.status === 'Submitted');
  const pendingApprovalCount = pendingCreatives.length;

  // "Needs Action": over-target CPL, open branch lead gaps, creatives awaiting sign-off
  const needsActionItems = [
    ...campaignRows.filter((c) => c.status !== 'Paused' && c.overTargetCpl).map((c) => ({
      id: `cpl-${c._id}`,
      type: 'HIGH CPL',
      badgeClass: 'bg-rose-50 text-rose-600 border-rose-200',
      title: `${c.name} — ${inr(c.cpl)}/lead`,
      campaign: c,
      campaignId: c._id,
      cpl: c.cpl,
      targetCpl: c.targetCpl,
      dailyBudget: c.dailyBudget
    })),
    ...demands.filter((d) => d.gap > 0 && d.status !== 'Closed').map((d) => ({
      id: `gap-${d._id}`,
      type: 'LEAD GAP',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      title: `${d.branch} needs ${d.gap} more ${d.course} leads`,
      branch: d.branch,
      target: d.targetLeads,
      delivered: d.deliveredLeads,
      gap: d.gap,
      deadline: d.deadline,
      campaignCode: d.campaignCode
    })),
    ...pendingCreatives.map((c) => ({
      id: `apr-${c._id}`,
      type: 'APPROVAL',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      title: c.title,
      approvalId: c._id,
      creative: c
    }))
  ];

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Log a real enquiry against a campaign → shared lead pool (HR allocation)
  const handleGenerateLead = (campaign) => {
    setLeadFormCampaign(campaign);
    setLeadForm({ fullName: '', phone: '', email: '', location: '', branch: campaign.branch && campaign.branch !== 'All' ? campaign.branch : '', course: campaign.course || '' });
  };

  const handleSubmitCampaignLead = async (e) => {
    e.preventDefault();
    const campaign = leadFormCampaign;
    if (!campaign || !leadForm.fullName.trim() || !leadForm.phone.trim()) return;
    setSavingLead(true);
    try {
      const created = await createLead({
        fullName: leadForm.fullName.trim(),
        phone: leadForm.phone.trim(),
        email: leadForm.email.trim(),
        location: leadForm.location.trim(),
        branch: leadForm.branch.trim(),
        course: leadForm.course.trim(),
        source: campaign.name,
        sourceName: campaign.name,
        campaignCode: campaign.code,
        sourceBadge: campaign.channel || '',
        fetchedBy: currentUser?.name || 'Marketing',
        stage: 'new'
      });
      setLeadFormCampaign(null);
      setGeneratedLeadModal({ isOpen: true, lead: created, campaign });
      showToast(`Lead ${created.fullName} added to the HR allocation pool`);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Could not save the lead');
    } finally {
      setSavingLead(false);
    }
  };

  // Approve a creative — also closes its Leadership approval (server side)
  const handleApproveCreative = async (creativeId) => {
    setSelectedAction(null);
    try {
      await updateCreative(creativeId, { status: 'Approved' });
      showToast('Creative approved');
    } catch (e) {
      showToast(e?.response?.data?.error || 'Could not approve the creative');
    }
  };

  const handlePauseCampaign = async (campaignId) => {
    try {
      await updateCampaign(campaignId, { status: 'Paused' });
      showToast('Campaign paused');
      setSelectedAction(null);
    } catch (e) {
      showToast(e?.response?.data?.error || 'Could not update the campaign');
    }
  };

  const openCampaignForm = (camp = null) => {
    setCampaignForm(camp
      ? {
        _id: camp._id || camp.id,
        name: camp.name || '',
        channel: camp.channel || '',
        branch: camp.branch || 'All',
        course: camp.course || '',
        status: camp.status || 'Live',
        dailyBudget: camp.dailyBudget ?? '',
        budget: camp.budget ?? '',
        spent: camp.spent ?? '',
        targetCpl: camp.targetCpl ?? ''
      }
      : { name: '', channel: '', branch: 'All', course: '', status: 'Live', dailyBudget: '', budget: '', spent: '', targetCpl: '' });
  };

  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    const f = campaignForm;
    if (!f || !f.name.trim()) return;
    const num = (v) => Math.max(0, parseInt(v, 10) || 0);
    const payload = {
      name: f.name.trim(),
      channel: f.channel,
      branch: f.branch || 'All',
      course: f.course,
      status: f.status,
      dailyBudget: num(f.dailyBudget),
      budget: num(f.budget),
      spent: num(f.spent),
      targetCpl: num(f.targetCpl)
    };
    setSavingCampaign(true);
    try {
      if (f._id) {
        await updateCampaign(f._id, payload);
        showToast(`Campaign "${payload.name}" updated`);
      } else {
        const created = await createCampaign(payload);
        showToast(`Campaign ${created.code} created`);
      }
      setCampaignForm(null);
      setSelectedAction(null);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Could not save the campaign');
    } finally {
      setSavingCampaign(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col bg-[#f8fafc] text-slate-900 select-none animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[70] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-slideDown">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER BAR (MATCHING USER REFERENCE DESIGN) */}
      <header className="h-16 bg-gradient-to-r from-[#051c20] via-[#09323a] to-[#0a585c] border-b border-[#0f464e] px-4 sm:px-6 flex items-center justify-between shadow-md shrink-0 relative">
        {/* Left Section: Thoughtflows Logo + Title & Subtitle */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Thoughtflows Brand Logo in Header / Navbar */}
          <div className="flex items-center gap-3">
            <div className="bg-white px-2.5 py-1 rounded-xl shadow-xs border border-white/20 flex items-center shrink-0">
              <img 
                src={logoImg} 
                alt="Thoughtflows" 
                className="h-6 sm:h-7 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/thoughtflows-logo.png';
                }}
              />
            </div>

            <div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                Marketing Command Center
              </h1>
              <div className="text-[11px] font-medium text-[#2dd4bf] tracking-wide leading-tight mt-0.5">
                ThoughtFlows · Digital &amp; Growth
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: nav switcher + notifications + logout */}
        <div className="flex items-center gap-2">
        <DashboardNavSwitcher currentDepartment="marketing" onSwitchDepartment={onSwitchDepartment} />
        <NotificationBell
          audience="marketing"
          tone="dark"
          onOpenItem={(n) => setActiveTab(n?.type === 'demand' ? 'branch-demand' : n?.type === 'creative' ? 'creative-approval' : n?.type === 'approval' ? 'roi-reports' : 'command-center')}
        />
        <button
          onClick={() => (onLogout || onClose)?.()}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm border border-rose-400/30 transition-all active:scale-95 cursor-pointer"
          title="Logout"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-100" />
          <span>Logout</span>
        </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#f4f7fb]">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ========================================================================= */}
          {/* TAB PILLS NAVIGATION (MATCHING SCREENSHOT)                                */}
          {/* ========================================================================= */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 1. Command Center (Active Pill in Screenshot: Dark Navy #0F172A) */}
            <button
              onClick={() => setActiveTab('command-center')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                activeTab === 'command-center'
                  ? 'bg-[#0f172a] text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90'
              }`}
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Command Center</span>
            </button>

            {/* 2. Campaign Desk */}
            <button
              onClick={() => setActiveTab('campaign-desk')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                activeTab === 'campaign-desk'
                  ? 'bg-[#0f172a] text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90'
              }`}
            >
              <Rocket className="w-4 h-4 text-rose-500" />
              <span>Campaign Desk</span>
            </button>

            {/* 3. Lead Source Tracker */}
            <button
              onClick={() => setActiveTab('lead-source')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                activeTab === 'lead-source'
                  ? 'bg-[#0f172a] text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90'
              }`}
            >
              <Target className="w-4 h-4 text-indigo-500" />
              <span>Lead Source Tracker</span>
            </button>

            {/* 4. Branch Lead Demand */}
            <button
              onClick={() => setActiveTab('branch-demand')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                activeTab === 'branch-demand'
                  ? 'bg-[#0f172a] text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90'
              }`}
            >
              <Building2 className="w-4 h-4 text-cyan-600" />
              <span>Branch Lead Demand</span>
            </button>

            {/* 5. Content Calendar */}
            <button
              onClick={() => setActiveTab('content-calendar')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                activeTab === 'content-calendar'
                  ? 'bg-[#0f172a] text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90'
              }`}
            >
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>Content Calendar</span>
            </button>

            {/* 6. Creative Approval (with yellow/amber badge 2) */}
            <button
              onClick={() => setActiveTab('creative-approval')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                activeTab === 'creative-approval'
                  ? 'bg-[#0f172a] text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90'
              }`}
            >
              <Palette className="w-4 h-4 text-pink-500" />
              <span>Creative Approval</span>
              {pendingApprovalCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center shadow-xs">
                  {pendingApprovalCount}
                </span>
              )}
            </button>

            {/* 7. ROI Reports */}
            <button
              onClick={() => setActiveTab('roi-reports')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                activeTab === 'roi-reports'
                  ? 'bg-[#0f172a] text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-teal-600" />
              <span>ROI Reports</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: COMMAND CENTER (THE EXACT VIEW FROM USER'S SCREENSHOT)             */}
          {/* ========================================================================= */}
          {activeTab === 'command-center' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* ROW OF 6 METRIC CARDS MATCHING SCREENSHOT */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {/* 1. Leads This Month: Cyan */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-t-[3.5px] border-t-cyan-500 flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="text-3xl sm:text-4xl font-extrabold text-cyan-500 tracking-tight">
                    {leadsThisMonth}
                  </div>
                  <div className="mt-3">
                    <div className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                      Leads This Month
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {loaded ? `${leads.length} in pool · all sources` : 'loading…'}
                    </div>
                  </div>
                </div>

                {/* 2. Avg Cost / Lead: Royal Blue */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-t-[3.5px] border-t-blue-600 flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 tracking-tight">
                    {blendedCpl === null ? '—' : `₹${blendedCpl.toLocaleString('en-IN')}`}
                  </div>
                  <div className="mt-3">
                    <div className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                      Avg Cost / Lead
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      spend ÷ campaign leads
                    </div>
                  </div>
                </div>

                {/* 3. Admissions: Green */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-t-[3.5px] border-t-emerald-500 flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 tracking-tight">
                    {campaignAdmissions}
                  </div>
                  <div className="mt-3">
                    <div className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                      Admissions
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      from campaign leads
                    </div>
                  </div>
                </div>

                {/* 4. Spend: Black / Slate */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-t-[3.5px] border-t-[#0f172a] flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] tracking-tight">
                    {shortInr(spendThisMonth)}
                  </div>
                  <div className="mt-3">
                    <div className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                      Spend
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      this month · {shortInr(totalSpend)} total
                    </div>
                  </div>
                </div>

                {/* 5. Campaigns Live: Teal */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-t-[3.5px] border-t-teal-500 flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="text-3xl sm:text-4xl font-extrabold text-teal-600 tracking-tight">
                    {campaigns.filter(c => c.status === 'Live').length}
                  </div>
                  <div className="mt-3">
                    <div className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                      Campaigns Live
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      running now
                    </div>
                  </div>
                </div>

                {/* 6. Underperforming: Red */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-t-[3.5px] border-t-rose-500 flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="text-3xl sm:text-4xl font-extrabold text-rose-600 tracking-tight">
                    {campaigns.filter(c => c.status === 'Underperforming').length}
                  </div>
                  <div className="mt-3">
                    <div className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                      Underperforming
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      need action
                    </div>
                  </div>
                </div>
              </div>

              {/* ===================================================================== */}
              {/* "⚡ NEEDS ACTION" SECTION (EXACT LAYOUT FROM USER'S SCREENSHOT)         */}
              {/* ===================================================================== */}
              <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] space-y-4">
                {/* Section Header */}
                <div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Needs Action</h2>
                  </div>
                  <p className="font-mono text-xs text-slate-500 mt-1">
                    Campaigns wasting money, branch lead gaps, approvals waiting
                  </p>
                </div>

                {/* Items List (7 rows matching screenshot) */}
                <div className="space-y-2.5 pt-1">
                  {needsActionItems.length === 0 ? (
                    <div className="py-8 text-center bg-emerald-50/50 rounded-xl border border-emerald-100">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <div className="text-sm font-bold text-emerald-800">All caught up!</div>
                      <div className="text-xs text-emerald-600">No urgent marketing alerts or pending approvals right now.</div>
                    </div>
                  ) : (
                    needsActionItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedAction(item)}
                        className="group flex items-center justify-between px-4 py-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70 transition-all cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Badge pill */}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0 border ${item.badgeClass}`}>
                            {item.type}
                          </span>
                          {/* Title text */}
                          <span className="text-sm font-bold text-slate-800 truncate group-hover:text-slate-950">
                            {item.title}
                          </span>
                        </div>

                        {/* Chevron right */}
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* LIVE CAMPAIGNS QUICK OVERVIEW */}
              <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Active Ad Campaigns Pulse</h3>
                    <p className="text-xs text-slate-400">CPL = recorded spend ÷ leads tagged with the campaign code</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('campaign-desk')}
                    className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    View All Campaigns <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        <th className="pb-2.5">Campaign Name</th>
                        <th className="pb-2.5">Channel</th>
                        <th className="pb-2.5">Status</th>
                        <th className="pb-2.5 text-right">Daily Budget</th>
                        <th className="pb-2.5 text-right">Spend</th>
                        <th className="pb-2.5 text-right">Leads</th>
                        <th className="pb-2.5 text-right">Blended CPL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {campaigns.length === 0 && (
                        <tr><td colSpan={7} className="py-8 text-center text-slate-400">No campaigns yet — create one from the Campaign Desk.</td></tr>
                      )}
                      {campaigns.map(cmp => (
                        <tr key={cmp.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 font-bold text-slate-800">{cmp.name}</td>
                          <td className="py-3 text-slate-600">{cmp.platform}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cmp.statusColor}`}>
                              {cmp.status}
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono">{inr(cmp.dailyBudget)}</td>
                          <td className="py-3 text-right font-mono">{inr(cmp.spendMonth)}</td>
                          <td className="py-3 text-right font-bold text-slate-900">{cmp.leads}</td>
                          <td className="py-3 text-right font-bold font-mono">
                            <span className={cmp.cpl === null || cmp.cpl === undefined ? 'text-slate-400' : cmp.targetCpl && cmp.cpl > cmp.targetCpl ? 'text-rose-600' : 'text-emerald-600'}>
                              {inr(cmp.cpl)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: CAMPAIGN DESK (EXACT MATCH TO USER REFERENCE SCREENSHOT)          */}
          {/* ========================================================================= */}
          {activeTab === 'campaign-desk' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Main Container */}
              <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🚀</span>
                      <h2 className="text-lg font-black text-slate-900 tracking-tight">Campaign Desk</h2>
                    </div>
                    <p className="font-mono text-xs text-slate-500 mt-1">
                      {campaignDeskList.length} campaigns · log an enquiry against a campaign to send it to HR
                    </p>
                  </div>
                  <button
                    onClick={() => openCampaignForm()}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Campaign
                  </button>
                </div>
                {campaignDeskList.length === 0 && (
                  <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    No campaigns yet. Create one here or from a branch lead demand.
                  </div>
                )}

                {/* 4 Campaign Cards */}
                <div className="space-y-3 pt-1">
                  {campaignDeskList.map(camp => (
                    <div
                      key={camp.id}
                      className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 hover:border-slate-300 hover:shadow-2xs transition-all bg-white flex flex-col justify-between gap-2.5"
                    >
                      {/* Top Row: Title + Code + Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                            {camp.name}
                          </h3>
                          <span className="bg-[#e0f7f6] text-[#0d9488] font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-[#b2e8e5]">
                            {camp.code}
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${camp.statusClass}`}>
                          {camp.status}
                        </span>
                      </div>

                      {/* Middle Row: Platform · Branch · Course · Spend/Budget */}
                      <div className="text-xs text-slate-500 font-mono">
                        {[camp.channel || 'no channel', camp.branch || 'All', camp.course || 'all courses'].join(' · ')} · spent {inr(camp.spent)} of {inr(camp.budget)} · {inr(camp.spentThisMonth || 0)} this month{camp.targetCpl ? ` · target CPL ${inr(camp.targetCpl)}` : ''}
                      </div>

                      {/* Bottom Row: Stats + Generate Lead Button */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
                        <div className="text-xs text-slate-500 font-mono">
                          {camp.leads || 0} leads · {inr(camp.cpl)} CPL · {camp.admissions || 0} admissions · ROI {camp.roi || '—'}
                        </div>

                        <div className="self-end sm:self-auto flex items-center gap-2">
                        <button
                          onClick={() => openCampaignForm(camp)}
                          className="border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Pencil className="w-3 h-3" /> Spend / Edit
                        </button>
                        <button
                          onClick={() => handleGenerateLead(camp)}
                          className="self-end sm:self-auto border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-1.5 rounded-lg active:scale-95 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <span>+ Log Lead → HR</span>
                        </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom "Live connection" Callout Box (Exact match to screenshot) */}
              <div className="bg-[#e6f7f6]/80 border border-[#b2e8e5] rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-base">🔗</span>
                  <span>Live connection</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed mt-1 font-normal">
                  Every "Log Lead" creates a real lead tagged with the campaign code, drops it into the shared lead pool, and it appears in <strong>HR's allocation queue</strong> for the branch. Its outcome (connected → demo → admitted) flows back here as campaign leads, CPL and admissions.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: LEAD SOURCE TRACKER (EXACT MATCH TO USER REFERENCE SCREENSHOT)     */}
          {/* ========================================================================= */}
          {activeTab === 'lead-source' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Main Container Card */}
              <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] space-y-5">
                {/* Header */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Lead Source Tracker</h2>
                  </div>
                  <p className="font-mono text-xs text-slate-500 mt-1">
                    Source-wise quality &amp; conversion · the connectivity heart
                  </p>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        <th className="pb-3 text-left">SOURCE</th>
                        <th className="pb-3 text-left">LEADS</th>
                        <th className="pb-3 text-left">VALID</th>
                        <th className="pb-3 text-left">DUP</th>
                        <th className="pb-3 text-left">CONNECTED</th>
                        <th className="pb-3 text-left">DEMOS</th>
                        <th className="pb-3 text-left">ADM</th>
                        <th className="pb-3 text-left">CPL</th>
                        <th className="pb-3 text-left">QUALITY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/90 text-xs">
                      {leadSourceRows.length === 0 && (
                        <tr><td colSpan={9} className="py-8 text-center text-slate-400">No leads in the pool yet.</td></tr>
                      )}
                      {leadSourceRows.map((row, idx) => (
                        <tr 
                          key={idx} 
                          onClick={() => setSelectedSourceDetail(row)}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                        >
                          <td className="py-4 font-bold text-slate-900 text-sm">
                            {row.source}
                          </td>
                          <td className="py-4 font-bold text-slate-900 font-mono">
                            {row.leads}
                          </td>
                          <td className="py-4 font-medium text-slate-800 font-mono">
                            {row.valid}
                          </td>
                          <td className="py-4 font-mono font-bold">
                            <span className={row.dupHighlight ? 'text-rose-600' : 'text-slate-600'}>
                              {row.dup}
                            </span>
                          </td>
                          <td className="py-4 font-medium text-slate-800 font-mono">
                            {row.connected}
                          </td>
                          <td className="py-4 font-medium text-slate-800 font-mono">
                            {row.demos}
                          </td>
                          <td className="py-4 font-bold text-slate-900 font-mono">
                            {row.adm}
                          </td>
                          <td className="py-4 font-bold text-slate-900 font-mono">
                            {row.cpl}
                          </td>
                          <td className="py-4">
                            <span className={`px-3 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap inline-block ${row.qualityClass}`}>
                              {row.quality}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom "Live connection" Callout Box (Exact match to user screenshot) */}
              <div className="bg-[#e6f7f6]/80 border border-[#b2e8e5] rounded-2xl p-4 sm:p-5 shadow-xs">
                <p className="text-xs text-slate-800 leading-relaxed font-normal">
                  <span className="text-base mr-1.5 align-middle">🔗</span>
                  HR updates each lead's outcome (<strong>connected → demo → admission</strong>) and it flows back here as source-wise conversion. Marketing sees which source gives quality leads; HR owns the counselling notes — Marketing can't edit them.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: BRANCH LEAD DEMAND                                                 */}
          {/* ========================================================================= */}
          {activeTab === 'branch-demand' && (
            <div className="space-y-6 animate-fadeIn">
              <BranchLeadDemandBoard
                demands={demands}
                campaigns={campaignRows}
                branches={branches}
                currentUser={currentUser}
                onToast={showToast}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: CONTENT CALENDAR                                                   */}
          {/* ========================================================================= */}
          {activeTab === 'content-calendar' && (
            <div className="space-y-6 animate-fadeIn">
              <ContentCalendarBoard pieces={contentPieces} branches={branches} currentUser={currentUser} onToast={showToast} />
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: CREATIVE APPROVAL                                                  */}
          {/* ========================================================================= */}
          {activeTab === 'creative-approval' && (
            <div className="space-y-6 animate-fadeIn">
              <CreativeApprovalDesk
                creatives={creatives}
                campaigns={campaignRows}
                branches={branches}
                currentUser={currentUser}
                onToast={showToast}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: ROI REPORTS                                                        */}
          {/* ========================================================================= */}
          {activeTab === 'roi-reports' && (
            <div className="space-y-6 animate-fadeIn">
              <RoiReportsBoard
                campaigns={campaignRows}
                sources={leadSourceRows}
                demands={demands}
                creatives={creatives}
                leads={leads}
                branches={branches}
                currentUser={currentUser}
                onToast={showToast}
              />
            </div>
          )}

        </div>
      </main>

      {/* ========================================================================= */}
      {/* INTERACTIVE ACTION DRILLDOWN MODAL                                        */}
      {/* ========================================================================= */}
      {selectedAction && (
        <div className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/80 overflow-hidden p-6 sm:p-7 animate-scaleUp relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${selectedAction.badgeClass}`}>
                  {selectedAction.type}
                </span>
                <h3 className="text-base font-bold text-slate-900">Action Details</h3>
              </div>
              <button
                onClick={() => setSelectedAction(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div>
                <div className="text-xs text-slate-400 font-medium">Issue / Item</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">{selectedAction.title}</div>
              </div>

              {/* HIGH CPL SPECIFIC ACTIONS */}
              {selectedAction.type === 'HIGH CPL' && (
                <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-rose-700 font-bold">Current CPL: {inr(selectedAction.cpl)}</span>
                    <span className="text-slate-600">Target: {inr(selectedAction.targetCpl)}/lead</span>
                  </div>
                  <p className="text-xs text-rose-900 leading-relaxed">
                    {selectedAction.campaign?.leads || 0} leads on {inr(selectedAction.campaign?.spent)} spent · daily budget {inr(selectedAction.dailyBudget)}.
                    Pause it, or lower the daily budget / update spend from the ad platform.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handlePauseCampaign(selectedAction.campaignId)}
                      className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs"
                    >
                      Pause Campaign
                    </button>
                    <button
                      onClick={() => openCampaignForm(selectedAction.campaign)}
                      className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold transition-all"
                    >
                      Edit budget / spend
                    </button>
                  </div>
                </div>
              )}

              {/* LEAD GAP SPECIFIC ACTIONS */}
              {selectedAction.type === 'LEAD GAP' && (
                <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-700">
                    <span>Target: {selectedAction.target} leads</span>
                    <span>Delivered: {selectedAction.delivered || 0}</span>
                    <span className="text-amber-700">Gap: {selectedAction.gap}</span>
                  </div>
                  <div className="text-xs text-amber-900">
                    {selectedAction.campaignCode ? `Linked campaign: ${selectedAction.campaignCode}.` : 'No campaign linked yet.'}
                    {selectedAction.deadline ? ` Deadline ${selectedAction.deadline}.` : ''}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedAction(null);
                      setActiveTab('branch-demand');
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Open Demand Board · plan campaign</span>
                  </button>
                </div>
              )}

              {/* APPROVAL SPECIFIC ACTIONS */}
              {selectedAction.type === 'APPROVAL' && (
                <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-200 space-y-3">
                  <p className="text-xs text-purple-950">
                    {[selectedAction.creative?.format, selectedAction.creative?.campaignCode, selectedAction.creative?.author && `by ${selectedAction.creative.author}`].filter(Boolean).join(' · ')}
                    {' '}— awaiting sign-off. The same item is in Leadership Hub approvals; deciding here closes it there.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        setSelectedAction(null);
                        setActiveTab('creative-approval');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all"
                    >
                      View in Creative Desk
                    </button>
                    <button
                      onClick={() => handleApproveCreative(selectedAction.approvalId)}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
                    >
                      Quick Approve
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedAction(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOG A LEAD AGAINST A CAMPAIGN → shared lead pool (HR allocation) */}
      {leadFormCampaign && (
        <div className="fixed inset-0 z-[65] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Log lead → HR</h3>
                <p className="text-[11px] text-slate-400 font-mono">{leadFormCampaign.code} · {leadFormCampaign.name}</p>
              </div>
              <button onClick={() => setLeadFormCampaign(null)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitCampaignLead} className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full name *</label>
                  <input required value={leadForm.fullName} onChange={(e) => setLeadForm({ ...leadForm, fullName: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone *</label>
                  <input required type="tel" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input type="email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location</label>
                  <input value={leadForm.location} onChange={(e) => setLeadForm({ ...leadForm, location: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Branch</label>
                  <select value={leadForm.branch} onChange={(e) => setLeadForm({ ...leadForm, branch: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none">
                    <option value="">Unassigned</option>
                    {branches.map((b) => <option key={b._id || b.name} value={b.name}>{b.name}</option>)}
                    {leadForm.branch && !branches.some((b) => b.name === leadForm.branch) && <option value={leadForm.branch}>{leadForm.branch}</option>}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course</label>
                  <select value={leadForm.course} onChange={(e) => setLeadForm({ ...leadForm, course: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none">
                    <option value="">Not decided</option>
                    {ALL_COURSES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                    {leadForm.course && !ALL_COURSES.some((c) => c.code === leadForm.course) && <option value={leadForm.course}>{leadForm.course}</option>}
                  </select>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button type="button" onClick={() => setLeadFormCampaign(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={savingLead} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 shadow-sm">
                  {savingLead ? 'Saving…' : 'Send to HR pool'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT CAMPAIGN */}
      {campaignForm && (
        <div className="fixed inset-0 z-[66] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">{campaignForm._id ? 'Edit campaign' : 'New campaign'}</h3>
              <button onClick={() => setCampaignForm(null)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCampaign} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Name *</label>
                <input required value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Channel</label>
                  <input list="mkt-channels" value={campaignForm.channel} onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                  <datalist id="mkt-channels">{CAMPAIGN_CHANNELS.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select value={campaignForm.status} onChange={(e) => setCampaignForm({ ...campaignForm, status: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none">
                    {(CAMPAIGN_STATUSES.includes(campaignForm.status) ? CAMPAIGN_STATUSES : [campaignForm.status, ...CAMPAIGN_STATUSES]).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Branch</label>
                  <select value={campaignForm.branch} onChange={(e) => setCampaignForm({ ...campaignForm, branch: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none">
                    <option value="All">All branches</option>
                    {branches.map((b) => <option key={b._id || b.name} value={b.name}>{b.name}</option>)}
                    {campaignForm.branch && campaignForm.branch !== 'All' && !branches.some((b) => b.name === campaignForm.branch) && <option value={campaignForm.branch}>{campaignForm.branch}</option>}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course</label>
                  <select value={campaignForm.course} onChange={(e) => setCampaignForm({ ...campaignForm, course: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none">
                    <option value="">All courses</option>
                    {ALL_COURSES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                    {campaignForm.course && !ALL_COURSES.some((c) => c.code === campaignForm.course) && <option value={campaignForm.course}>{campaignForm.course}</option>}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['dailyBudget', 'Daily budget ₹'], ['budget', 'Total budget ₹'], ['spent', 'Spent so far ₹'], ['targetCpl', 'Target CPL ₹']].map(([k, l]) => (
                  <div key={k}>
                    <label className="block font-bold text-slate-700 mb-1">{l}</label>
                    <input type="number" min="0" value={campaignForm[k]} onChange={(e) => setCampaignForm({ ...campaignForm, [k]: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">Leads, admissions, CPL and ROI are counted automatically from the lead pool — only spend &amp; budget are typed in.</p>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button type="button" onClick={() => setCampaignForm(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={savingCampaign} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 shadow-sm">
                  {savingCampaign ? 'Saving…' : 'Save campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAD GENERATED CONFIRMATION MODAL */}
      {generatedLeadModal?.isOpen && (
        <div className="fixed inset-0 z-[65] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-emerald-500" />
            </div>

            <h3 className="text-lg font-black text-slate-900">Lead sent to HR</h3>
            <p className="text-xs text-slate-500 mt-1">
              Saved in the shared lead pool with the campaign code — HR allocates it from their queue.
            </p>

            <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Lead ID:</span>
                <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {generatedLeadModal.lead.leadId}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Candidate:</span>
                <span className="font-bold text-slate-800">{generatedLeadModal.lead.fullName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Phone:</span>
                <span className="font-mono text-slate-700">{generatedLeadModal.lead.phone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Campaign Source:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[220px]">{generatedLeadModal.campaign.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Target Branch:</span>
                <span className="font-bold text-slate-900">{generatedLeadModal.lead.branch || 'Unassigned'}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={() => setGeneratedLeadModal(null)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEAD SOURCE DETAIL MODAL */}
      {selectedSourceDetail && (
        <div className="fixed inset-0 z-[65] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-base">🎯</span>
                <h3 className="text-base font-bold text-slate-900">{selectedSourceDetail.source} Funnel</h3>
              </div>
              <button
                onClick={() => setSelectedSourceDetail(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Channel Quality Tier:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${selectedSourceDetail.qualityClass}`}>
                  {selectedSourceDetail.quality}
                </span>
              </div>

              {/* Conversion Funnel Mini Grid */}
              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Total Leads</div>
                  <div className="text-base font-extrabold text-slate-900">{selectedSourceDetail.leads}</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Connected</div>
                  <div className="text-base font-extrabold text-slate-900">{selectedSourceDetail.connected}</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Admissions</div>
                  <div className="text-base font-extrabold text-emerald-600">{selectedSourceDetail.adm}</div>
                </div>
              </div>

              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100/80 text-xs text-teal-900 space-y-1">
                <div className="flex justify-between">
                  <span>Lead Cost (CPL):</span>
                  <strong className="font-mono">{selectedSourceDetail.cpl}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Valid Contact Rate:</span>
                  <strong className="font-mono">{selectedSourceDetail.leads ? Math.round((selectedSourceDetail.valid / selectedSourceDetail.leads) * 100) : 0}%</strong>
                </div>
                <div className="flex justify-between">
                  <span>Lead-to-Admission Rate:</span>
                  <strong className="font-mono">{selectedSourceDetail.leads ? ((selectedSourceDetail.adm / selectedSourceDetail.leads) * 100).toFixed(1) : '0.0'}%</strong>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedSourceDetail(null)}
                className="w-full py-2 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-sm active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
