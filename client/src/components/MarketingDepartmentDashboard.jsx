import React, { useState } from 'react';
import { 
  Activity, 
  Rocket, 
  Target, 
  Building2, 
  Calendar, 
  Palette, 
  TrendingUp, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  Zap, 
  X, 
  CheckCircle2, 
  Repeat, 
  Plus, 
  Sparkles, 
  Play, 
  Pause, 
  Check,
  LogOut
} from 'lucide-react';
import logoImg from '../assets/thoughtflows-logo.png';
import BranchLeadDemandBoard from './BranchLeadDemandBoard';
import ContentCalendarBoard from './ContentCalendarBoard';
import CreativeApprovalDesk from './CreativeApprovalDesk';
import RoiReportsBoard from './RoiReportsBoard';

export default function MarketingDepartmentDashboard({
  onClose,
  currentUser,
  onLogout,
  onSwitchDepartment,
  theme = 'clay'
}) {
  // Navigation Tabs: matching the user's reference image
  const [activeTab, setActiveTab] = useState('command-center');
  
  // Pending approvals state (starts with 2 as in screenshot badge)
  const [pendingApprovals, setPendingApprovals] = useState([
    {
      id: 'app-1',
      title: 'Hyderabad job drive poster',
      type: 'Poster (1080x1350)',
      branch: 'Hyderabad - Madhapur & Ameerpet',
      submittedBy: 'Kavya M. (Graphic Designer)',
      submittedAt: 'Today, 09:30 AM',
      previewColor: 'from-blue-600 to-indigo-900',
      tagline: 'Mega Healthcare Job Fair • 40+ RCM Recruiters',
      specs: 'Dimensions: 1080x1350 • Format: PNG • Size: 2.4 MB'
    },
    {
      id: 'app-2',
      title: 'Placement proof reel v2',
      type: 'Instagram Reel (9:16)',
      branch: 'All Branches (Coimbatore HQ)',
      submittedBy: 'Arun V. (Video Editor)',
      submittedAt: 'Yesterday, 06:15 PM',
      previewColor: 'from-purple-600 to-pink-600',
      tagline: 'Student Journey: From Life Science Graduate to CPC Certified Analyst',
      specs: 'Duration: 38s • 1080x1920 • 60fps • 4K Audio'
    }
  ]);

  // Needs Action items state (7 items matching the screenshot)
  const [needsActionItems, setNeedsActionItems] = useState([
    {
      id: 'act-1',
      type: 'HIGH CPL',
      badgeClass: 'bg-rose-50 text-rose-600 border-rose-200',
      title: 'Medical Coding Awareness — Coimbatore — ₹379/lead',
      campaignId: 'cmp-1',
      details: {
        metric: 'CPL ₹379',
        target: '₹160/lead',
        issue: 'Fatigue in Meta Audience creative #3. Daily spend ₹2,200.',
        remedy: 'Rotate ad creative or tighten age demographic (20-25 yrs)'
      }
    },
    {
      id: 'act-2',
      type: 'LEAD GAP',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      title: 'Hyderabad needs 8 more CPC leads',
      branch: 'Hyderabad - Ameerpet',
      course: 'CPC',
      gap: 8,
      target: 65,
      achieved: 57
    },
    {
      id: 'act-3',
      type: 'LEAD GAP',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      title: 'Coimbatore needs 21 more Medical Billing leads',
      branch: 'Coimbatore - Gandhipuram',
      course: 'Medical Billing (CPB)',
      gap: 21,
      target: 70,
      achieved: 49
    },
    {
      id: 'act-4',
      type: 'LEAD GAP',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      title: 'Salem needs 19 more CPC leads',
      branch: 'Salem Main',
      course: 'CPC',
      gap: 19,
      target: 45,
      achieved: 26
    },
    {
      id: 'act-5',
      type: 'LEAD GAP',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      title: 'Kochi needs 50 more CPC leads',
      branch: 'Kochi - MG Road',
      course: 'CPC',
      gap: 50,
      target: 90,
      achieved: 40
    },
    {
      id: 'act-6',
      type: 'APPROVAL',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      title: 'Hyderabad job drive poster',
      approvalId: 'app-1'
    },
    {
      id: 'act-7',
      type: 'APPROVAL',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      title: 'Placement proof reel v2',
      approvalId: 'app-2'
    }
  ]);

  // Interactive Action Modal State
  const [selectedAction, setSelectedAction] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [totalLeadsCount, setTotalLeadsCount] = useState(377);
  const [generatedLeadModal, setGeneratedLeadModal] = useState(null);

  // Campaign Desk specific campaigns (Matching reference screenshot)
  const [campaignDeskList, setCampaignDeskList] = useState([
    {
      id: 'cam-1',
      code: 'CAM-TF-2026-1001',
      name: 'CPC Weekend Job Drive — Hyderabad',
      status: 'Live',
      statusClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      channel: 'Instagram Ads',
      branch: 'Hyderabad',
      course: 'CPC',
      spent: '28,400',
      budget: '35,000',
      leads: 142,
      cpl: 200,
      admissions: 9,
      roi: '565%'
    },
    {
      id: 'cam-2',
      code: 'CAM-TF-2026-1002',
      name: 'Placement Proof Reels',
      status: 'High Performing',
      statusClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      channel: 'YouTube Ads',
      branch: 'All',
      course: 'CPC',
      spent: '19,100',
      budget: '20,000',
      leads: 89,
      cpl: 217,
      admissions: 6,
      roi: '560%'
    },
    {
      id: 'cam-3',
      code: 'CAM-TF-2026-1003',
      name: 'Medical Coding Awareness — Coimbatore',
      status: 'Underperforming',
      statusClass: 'bg-rose-50 text-rose-600 border-rose-200',
      channel: 'Facebook Ads',
      branch: 'Coimbatore',
      course: 'Medical Billing',
      spent: '14,800',
      budget: '15,000',
      leads: 39,
      cpl: 379,
      admissions: 2,
      roi: '184%'
    },
    {
      id: 'cam-4',
      code: 'CAM-TF-2026-1004',
      name: 'Free Workshop — Salem College',
      status: 'Live',
      statusClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      channel: 'WhatsApp Campaign',
      branch: 'Salem',
      course: 'CPC',
      spent: '3,200',
      budget: '5,000',
      leads: 61,
      cpl: 52,
      admissions: 4,
      roi: '2525%'
    }
  ]);

  // Live Campaigns State
  const [campaigns, setCampaigns] = useState([
    {
      id: 'cmp-1',
      name: 'Medical Coding Awareness — Coimbatore',
      platform: 'Meta Ads (IG / FB)',
      status: 'Underperforming',
      statusColor: 'bg-rose-50 text-rose-700 border-rose-200',
      dailyBudget: 2200,
      spendMonth: 24800,
      leads: 65,
      cpl: 379,
      targetCpl: 160,
      ctr: '1.2%'
    },
    {
      id: 'cmp-2',
      name: 'CPC Certification Super FastTrack 2026',
      platform: 'Google Search & YouTube',
      status: 'Live',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dailyBudget: 3500,
      spendMonth: 28400,
      leads: 198,
      cpl: 143,
      targetCpl: 175,
      ctr: '4.8%'
    },
    {
      id: 'cmp-3',
      name: 'Life Science Freshers High-Pay Careers',
      platform: 'Meta Ads (Reels Video)',
      status: 'Live',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dailyBudget: 1500,
      spendMonth: 12800,
      leads: 114,
      cpl: 112,
      targetCpl: 150,
      ctr: '3.6%'
    }
  ]);

  // Lead Source Tracker Rows (Exact match to user reference screenshot)
  const [leadSourceRows, setLeadSourceRows] = useState([
    {
      source: 'Instagram',
      leads: 142,
      valid: 118,
      dup: 14,
      dupHighlight: true,
      connected: 96,
      demos: 31,
      adm: 9,
      cpl: '₹200',
      quality: 'Medium Quality',
      qualityClass: 'bg-[#fffbeb] text-[#b45309] border border-[#fef3c7]'
    },
    {
      source: 'YouTube',
      leads: 89,
      valid: 80,
      dup: 5,
      dupHighlight: false,
      connected: 64,
      demos: 22,
      adm: 6,
      cpl: '₹217',
      quality: 'Medium Quality',
      qualityClass: 'bg-[#fffbeb] text-[#b45309] border border-[#fef3c7]'
    },
    {
      source: 'Facebook',
      leads: 39,
      valid: 24,
      dup: 9,
      dupHighlight: false,
      connected: 15,
      demos: 4,
      adm: 2,
      cpl: '₹379',
      quality: 'Low Quality',
      qualityClass: 'bg-[#fef2f2] text-[#dc2626] border border-[#fee2e2]'
    },
    {
      source: 'WhatsApp Campaign',
      leads: 61,
      valid: 55,
      dup: 3,
      dupHighlight: false,
      connected: 48,
      demos: 14,
      adm: 4,
      cpl: '₹52',
      quality: 'High Quality',
      qualityClass: 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]'
    },
    {
      source: 'Website / Landing',
      leads: 47,
      valid: 43,
      dup: 2,
      dupHighlight: false,
      connected: 38,
      demos: 12,
      adm: 5,
      cpl: '—',
      quality: 'High Quality',
      qualityClass: 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]'
    }
  ]);

  const [selectedSourceDetail, setSelectedSourceDetail] = useState(null);

  const handleGenerateLead = (campaign) => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const leadId = `L-TF-2026-${randomNum}`;
    
    const sampleStudents = {
      'Hyderabad': { name: 'K. Sai Teja', phone: '+91 98480 23145', qual: 'B.Sc Biotechnology' },
      'All': { name: 'Pooja Sundaram', phone: '+91 98410 76543', qual: 'B.Pharm' },
      'Coimbatore': { name: 'M. Vignesh Kumar', phone: '+91 97892 11098', qual: 'B.Sc Microbiology' },
      'Salem': { name: 'R. Soundarya', phone: '+91 94432 89012', qual: 'B.Sc Biochemistry' }
    };
    
    const candidate = sampleStudents[campaign.branch] || { name: 'A. Rahul', phone: '+91 99401 55678', qual: 'B.Sc Life Sciences' };
    
    const newLead = {
      id: leadId,
      leadId: leadId,
      fullName: candidate.name,
      name: candidate.name,
      phone: candidate.phone,
      qualification: candidate.qual,
      course: campaign.course,
      branch: campaign.branch === 'All' ? 'Hyderabad - Ameerpet' : `${campaign.branch} Main`,
      source: campaign.name,
      campaignCode: campaign.code,
      channel: campaign.channel,
      status: 'New Lead',
      stage: 'Lead Inbound',
      createdAt: new Date().toISOString(),
      counselorAssigned: null
    };

    try {
      const existing = JSON.parse(localStorage.getItem('thoughtflows_leads') || '[]');
      localStorage.setItem('thoughtflows_leads', JSON.stringify([newLead, ...existing]));
    } catch (e) {
      console.warn(e);
    }

    setCampaignDeskList(prev => prev.map(c => c.id === campaign.id ? { ...c, leads: c.leads + 1 } : c));
    setTotalLeadsCount(prev => prev + 1);

    setGeneratedLeadModal({
      isOpen: true,
      lead: newLead,
      campaign: campaign
    });

    showToast(`⚡ Generated Lead ${leadId} → Routed to Branch Manager queue!`);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Resolve an approval item
  const handleApproveCreative = (approvalId) => {
    setPendingApprovals(prev => prev.filter(item => item.id !== approvalId));
    setNeedsActionItems(prev => prev.filter(item => item.approvalId !== approvalId));
    setSelectedAction(null);
    showToast('Creative approved and scheduled for publishing!');
  };

  // Pause or fix underperforming campaign
  const handleFixCampaign = (action) => {
    if (action === 'pause') {
      setCampaigns(prev => prev.map(c => c.id === 'cmp-1' ? { ...c, status: 'Paused', statusColor: 'bg-slate-100 text-slate-600 border-slate-200' } : c));
      setNeedsActionItems(prev => prev.filter(item => item.id !== 'act-1'));
      showToast('Campaign paused. Daily ad spend halted.');
    } else if (action === 'reallocate') {
      setCampaigns(prev => prev.map(c => c.id === 'cmp-1' ? { ...c, dailyBudget: 800, status: 'Optimizing', statusColor: 'bg-amber-50 text-amber-700 border-amber-200' } : c));
      setNeedsActionItems(prev => prev.filter(item => item.id !== 'act-1'));
      showToast('Budget reduced to ₹800/day and switched to lookalike audience.');
    }
    setSelectedAction(null);
  };

  // Resolve lead gap
  const handleResolveLeadGap = (itemId, branchName) => {
    setNeedsActionItems(prev => prev.filter(item => item.id !== itemId));
    setSelectedAction(null);
    showToast(`Instant ₹2,500 ad boost allocated for ${branchName}!`);
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
        {/* Left Section: Exit Button + Thoughtflows Logo + Title & Subtitle */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Exit Button */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a1f24]/90 hover:bg-[#07171b] text-white border border-white/10 shadow-sm transition-all active:scale-95 text-xs font-semibold shrink-0"
            title="Exit to Portal"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-slate-300" />
            <span>Exit</span>
          </button>

          {/* Thoughtflows Brand Logo in Header / Navbar */}
          <div className="flex items-center gap-3 pl-1 sm:pl-2 border-l border-white/20">
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

        {/* Right Section: Marketing Head Badge + Quick Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="px-4 py-1.5 rounded-full bg-[#00897b] hover:bg-[#00796b] text-white text-xs font-bold shadow-sm border border-teal-300/30 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            title="Marketing Head Profile & Actions"
          >
            <span>Marketing Head</span>
            <ChevronDown className={`w-3 h-3 text-teal-100 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* User & Navigation Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 z-50 animate-fadeIn">
              <div className="px-4 py-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900">Priya R.</div>
                <div className="text-[10px] text-slate-400">Head of Growth · Hyderabad</div>
              </div>

              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  onSwitchDepartment?.();
                }}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
              >
                <Repeat className="w-3.5 h-3.5 text-slate-400" />
                <span>Switch Department</span>
              </button>

              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  (onLogout || onClose)?.();
                }}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
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
              {pendingApprovals.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center shadow-xs">
                  {pendingApprovals.length}
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
                    {totalLeadsCount}
                  </div>
                  <div className="mt-3">
                    <div className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                      Leads This Month
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      from all sources
                    </div>
                  </div>
                </div>

                {/* 2. Avg Cost / Lead: Royal Blue */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-t-[3.5px] border-t-blue-600 flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 tracking-tight">
                    ₹174
                  </div>
                  <div className="mt-3">
                    <div className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                      Avg Cost / Lead
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      blended
                    </div>
                  </div>
                </div>

                {/* 3. Admissions: Green */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-t-[3.5px] border-t-emerald-500 flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 tracking-tight">
                    26
                  </div>
                  <div className="mt-3">
                    <div className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                      Admissions
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      marketing-sourced
                    </div>
                  </div>
                </div>

                {/* 4. Spend: Black / Slate */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-t-[3.5px] border-t-[#0f172a] flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] tracking-tight">
                    ₹66k
                  </div>
                  <div className="mt-3">
                    <div className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                      Spend
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      this month
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
                    <p className="text-xs text-slate-400">Real-time CPL and spend monitoring across Meta & Google Ads</p>
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
                        <th className="pb-2.5 text-right">MTD Spend</th>
                        <th className="pb-2.5 text-right">Leads</th>
                        <th className="pb-2.5 text-right">Blended CPL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {campaigns.map(cmp => (
                        <tr key={cmp.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 font-bold text-slate-800">{cmp.name}</td>
                          <td className="py-3 text-slate-600">{cmp.platform}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cmp.statusColor}`}>
                              {cmp.status}
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono">₹{cmp.dailyBudget.toLocaleString()}</td>
                          <td className="py-3 text-right font-mono">₹{cmp.spendMonth.toLocaleString()}</td>
                          <td className="py-3 text-right font-bold text-slate-900">{cmp.leads}</td>
                          <td className="py-3 text-right font-bold font-mono">
                            <span className={cmp.cpl > 200 ? 'text-rose-600' : 'text-emerald-600'}>
                              ₹{cmp.cpl}
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
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚀</span>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Campaign Desk</h2>
                  </div>
                  <p className="font-mono text-xs text-slate-500 mt-1">
                    {campaignDeskList.length} campaigns · tap a campaign to generate a live lead
                  </p>
                </div>

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
                        {camp.channel} · {camp.branch} · {camp.course} · ₹{camp.spent}/{camp.budget}
                      </div>

                      {/* Bottom Row: Stats + Generate Lead Button */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
                        <div className="text-xs text-slate-500 font-mono">
                          {camp.leads} leads · ₹{camp.cpl} CPL · {camp.admissions} admissions · ROI {camp.roi}
                        </div>

                        <button
                          onClick={() => handleGenerateLead(camp)}
                          className="self-end sm:self-auto border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-1.5 rounded-lg active:scale-95 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <span>+ Generate Lead → HR</span>
                        </button>
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
                  Every "Generate Lead" creates a real Lead ID (L-TF-...), drops it into the shared lead pool, and it appears in the <strong>Branch Manager's allocation queue</strong> — ready to assign to an HR. No lead reaches HR without a Lead ID.
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
                onToast={showToast}
                onCampaignCreated={(newCamp) => {
                  showToast(`🚀 Campaign planned for ${newCamp.branch}! Added to Campaign Desk.`);
                  // Sync with needsActionItems (remove any lead gap item for this branch)
                  setNeedsActionItems(prev => prev.filter(item => !item.branch?.toLowerCase().includes(newCamp.branch.toLowerCase())));
                }}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: CONTENT CALENDAR                                                   */}
          {/* ========================================================================= */}
          {activeTab === 'content-calendar' && (
            <div className="space-y-6 animate-fadeIn">
              <ContentCalendarBoard onToast={showToast} />
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: CREATIVE APPROVAL                                                  */}
          {/* ========================================================================= */}
          {activeTab === 'creative-approval' && (
            <div className="space-y-6 animate-fadeIn">
              <CreativeApprovalDesk 
                onToast={showToast}
                onQueueCountChange={(count) => {
                  setPendingApprovals(new Array(count).fill({}));
                }}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: ROI REPORTS                                                        */}
          {/* ========================================================================= */}
          {activeTab === 'roi-reports' && (
            <div className="space-y-6 animate-fadeIn">
              <RoiReportsBoard onToast={showToast} />
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
                    <span className="text-rose-700 font-bold">Current CPL: ₹379</span>
                    <span className="text-slate-600">Target: ₹160/lead</span>
                  </div>
                  <p className="text-xs text-rose-900 leading-relaxed">
                    Creative fatigue detected on Meta campaign. Daily burn rate is ₹2,200. We recommend pausing this ad set or capping daily spend immediately.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleFixCampaign('pause')}
                      className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs"
                    >
                      Pause Ad Set
                    </button>
                    <button
                      onClick={() => handleFixCampaign('reallocate')}
                      className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold transition-all"
                    >
                      Cap to ₹800/day
                    </button>
                  </div>
                </div>
              )}

              {/* LEAD GAP SPECIFIC ACTIONS */}
              {selectedAction.type === 'LEAD GAP' && (
                <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-3">
                  <div className="text-xs text-amber-900">
                    This branch is running behind on incoming enquiries for the next classroom batch. 
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-700">
                    <span>Target: {selectedAction.target || 65} leads</span>
                    <span className="text-amber-700">Shortfall: {selectedAction.gap || 8} leads</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        setSelectedAction(null);
                        setActiveTab('branch-demand');
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold transition-all"
                    >
                      Open Demand Board
                    </button>
                    <button
                      onClick={() => handleResolveLeadGap(selectedAction.id, selectedAction.branch || 'Branch')}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Boost Ads (+₹2.5k)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* APPROVAL SPECIFIC ACTIONS */}
              {selectedAction.type === 'APPROVAL' && (
                <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-200 space-y-3">
                  <p className="text-xs text-purple-950">
                    Creative is awaiting marketing lead sign-off before publishing to Instagram and offline campus networks.
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

      {/* LEAD GENERATED CONFIRMATION MODAL */}
      {generatedLeadModal?.isOpen && (
        <div className="fixed inset-0 z-[65] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/80 p-6 animate-scaleUp relative">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-emerald-500" />
            </div>

            <h3 className="text-lg font-black text-slate-900">Lead Dispatched to Branch Manager!</h3>
            <p className="text-xs text-slate-500 mt-1">
              Successfully generated with verified Lead ID and dropped into the CRM allocation queue.
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
                <span className="font-bold text-slate-900">{generatedLeadModal.lead.branch}</span>
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
                  <strong className="font-mono">{Math.round((selectedSourceDetail.valid / selectedSourceDetail.leads) * 100)}%</strong>
                </div>
                <div className="flex justify-between">
                  <span>Lead-to-Admission Rate:</span>
                  <strong className="font-mono">{((selectedSourceDetail.adm / selectedSourceDetail.leads) * 100).toFixed(1)}%</strong>
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
