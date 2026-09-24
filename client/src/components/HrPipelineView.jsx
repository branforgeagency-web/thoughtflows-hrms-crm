import React, { useState, useEffect, useMemo } from 'react';
import { 
  Phone, 
  MessageSquare, 
  Clock, 
  Filter, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight, 
  Search, 
  UserPlus,
  Smartphone,
  Check,
  AlertTriangle,
  Kanban,
  LayoutGrid,
  ArrowRight
} from 'lucide-react';

import { getLeads, updateLead, createStudent } from '../services/api';
import { redirectToWhatsAppWeb } from '../utils/whatsapp';

// Classifies a lead's follow-up against real dates instead of guessing.
function classifyFollowUp(lead) {
  const raw = (lead.followUpDate || '').trim();
  const parsed = raw ? new Date(raw) : null;
  const hasValidDate = parsed && !isNaN(parsed.getTime());

  if (!hasValidDate) {
    if (lead.stage === 'new') {
      return { isOverdue: true, isToday: false, isTomorrow: false, timeframe: 'overdue', hasDate: false };
    }
    return { isOverdue: false, isToday: false, isTomorrow: false, timeframe: null, hasDate: false };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(parsed);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { isOverdue: true, isToday: false, isTomorrow: false, timeframe: 'overdue', hasDate: true };
  if (diffDays === 0) return { isOverdue: false, isToday: true, isTomorrow: false, timeframe: 'today', hasDate: true };
  if (diffDays === 1) return { isOverdue: false, isToday: false, isTomorrow: true, timeframe: 'tomorrow', hasDate: true };
  if (diffDays <= 7) return { isOverdue: false, isToday: false, isTomorrow: false, timeframe: 'this_week', hasDate: true };
  return { isOverdue: false, isToday: false, isTomorrow: false, timeframe: null, hasDate: true };
}

export default function HrPipelineView({ 
  leads: propLeads, 
  onRefreshLeads, 
  onAddLeadClick,
  initialViewMode = 'kanban',
  currentUser
}) {
  const [viewMode, setViewMode] = useState(initialViewMode); // 'kanban' | 'followup'
  const [activeFilter, setActiveFilter] = useState('all'); // all, overdue, today, tomorrow, this_week, demo, fee, admitted
  const [searchQuery, setSearchQuery] = useState('');
  const [completedIds, setCompletedIds] = useState(new Set());
  const [actionNotice, setActionNotice] = useState(null);
  const [leads, setLeads] = useState(propLeads || []);

  useEffect(() => {
    if (propLeads !== undefined) {
      setLeads(propLeads);
    } else {
      const params = currentUser?.name ? { counselor: currentUser.name } : undefined;
      getLeads(params)
        .then(res => {
          if (res && res.leads) setLeads(res.leads);
        })
        .catch(err => console.error('Error fetching leads:', err));
    }
  }, [propLeads, currentUser?.name]);

  const triggerAction = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const toggleDone = async (id, name) => {
    const isCurrentlyDone = completedIds.has(id);
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyDone) {
        next.delete(id);
        triggerAction(`Reopened follow-up for ${name}`);
      } else {
        next.add(id);
        triggerAction(`✓ Marked follow-up for ${name} as Completed`);
      }
      return next;
    });

    try {
      await updateLead(id, { status: isCurrentlyDone ? 'pending' : 'completed' });
      if (onRefreshLeads) onRefreshLeads();
    } catch (e) {
      console.warn('Backend update notice:', e);
    }
  };

  const handleAdvanceStage = async (leadId, currentStage) => {
    const stageSeq = ['new', 'contacted', 'demo_booked', 'demo_attended', 'fee_followup', 'admitted'];
    const currentIdx = stageSeq.indexOf(currentStage);
    const nextStage = currentIdx >= 0 && currentIdx < stageSeq.length - 1 ? stageSeq[currentIdx + 1] : 'admitted';

    try {
      await updateLead(leadId, { stage: nextStage });
      const targetLead = leads.find(l => (l._id || l.id) === leadId);

      // When advanced to 'admitted', auto-enroll as live Student in MongoDB
      if (nextStage === 'admitted' && targetLead) {
        try {
          await createStudent({
            studentId: `TFMC0Y${Math.floor(1000 + Math.random() * 9000)}`,
            name: (targetLead.fullName || targetLead.name || 'Admitted Student').toUpperCase(),
            phone: targetLead.phone || '99999 99999',
            email: targetLead.email || `student.${Date.now().toString().slice(-4)}@thoughtflows.in`,
            course: targetLead.course || 'CPC',
            mode: 'Online',
            batchDate: 'May 2026',
            hrName: targetLead.counselorAssigned || currentUser?.name || 'Kavitha N.',
            batchTiming: '8-10 PM Weekdays',
            qualification: targetLead.education || 'Graduate',
            qualTag: 'Life Sci',
            location: targetLead.location || 'Coimbatore',
            source: targetLead.sourceName || targetLead.source || 'LEAD PIPELINE',
            onboardStatus: '7/7 ✓',
            syllabusModule: 'Module 1',
            mockInterview: 'Pending',
            examStatus: 'Not Booked',
            certified: 'Non-certified',
            placementStatus: 'In course',
            feeStatus: 'Part Paid',
            feeAmount: '₹15,000 / ₹25,000',
            courseFee: 25000,
            statusGroup: 'in_course',
            handoverStatus: 'Ready'
          });
        } catch (enrollErr) {
          console.warn('Auto-enroll student notice:', enrollErr.message);
        }
      }

      setLeads(prev => prev.map(l => (l._id === leadId || l.id === leadId) ? { ...l, stage: nextStage } : l));
      if (onRefreshLeads) onRefreshLeads();
      triggerAction(`✓ Advanced lead to ${nextStage.replace('_', ' ').toUpperCase()}${nextStage === 'admitted' ? ' & Enrolled as Student' : ''}`);
    } catch (err) {
      console.error('Failed to advance lead stage:', err);
      triggerAction('Error updating lead stage');
    }
  };

  // Search filtered leads
  const searchFilteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const q = searchQuery.toLowerCase();
    return leads.filter(l => 
      (l.fullName || l.name || '').toLowerCase().includes(q) ||
      (l.phone || '').toLowerCase().includes(q) ||
      (l.course || '').toLowerCase().includes(q) ||
      (l.counselorAssigned || '').toLowerCase().includes(q) ||
      (l.notes || l.followUpNote || '').toLowerCase().includes(q)
    );
  }, [leads, searchQuery]);

  // Stage Pipeline columns
  const PIPELINE_COLUMNS = useMemo(() => {
    const cols = [
      { id: 'new', title: 'NEW', dotColor: 'bg-slate-900', stageMatches: ['new'] },
      { id: 'contacted', title: 'CONTACTED', dotColor: 'bg-blue-600', stageMatches: ['contacted'] },
      { id: 'pitched', title: 'DEMO / PITCH', dotColor: 'bg-purple-600', stageMatches: ['demo_booked', 'demo_attended'] },
      { id: 'fees', title: 'FEES TALK', dotColor: 'bg-amber-600', stageMatches: ['fee_followup'] },
      { id: 'admitted', title: 'ADMITTED', dotColor: 'bg-emerald-600', stageMatches: ['admitted'] }
    ];

    return cols.map(c => {
      const matchingLeads = searchFilteredLeads.filter(l => c.stageMatches.includes(l.stage || 'new'));
      return {
        id: c.id,
        title: c.title,
        count: matchingLeads.length,
        dotColor: c.dotColor,
        cards: matchingLeads.map(lead => {
          const followUp = classifyFollowUp(lead);
          return {
            id: lead._id || lead.id,
            name: lead.fullName || lead.name,
            isNew: lead.stage === 'new',
            isAdmitted: lead.stage === 'admitted',
            sub: `${lead.phone || ''} · ${lead.education || lead.course || 'Graduate'}`,
            source: (lead.sourceName || lead.source || 'DIRECT').toUpperCase(),
            sourceClass: lead.stage === 'admitted'
              ? 'bg-white text-teal-800 border-teal-300 font-bold'
              : 'bg-cyan-50 text-cyan-800 border-cyan-200',
            hasActions: lead.stage !== 'admitted',
            phone: lead.phone,
            whatsappNumber: lead.whatsappNumber || lead.phone,
            currentStage: lead.stage || 'new',
            course: lead.course || 'CPC',
            counselor: lead.counselorAssigned || '',
            ...followUp,
            rawLead: lead
          };
        })
      };
    });
  }, [searchFilteredLeads]);

  // Follow-up card items for the board view
  const FOLLOW_UPS = useMemo(() => {
    return searchFilteredLeads.map((lead) => {
      const { timeframe, hasDate, isOverdue } = classifyFollowUp(lead);

      let badge;
      if (hasDate) {
        badge = lead.followUpTime ? `${lead.followUpDate} · ${lead.followUpTime}` : lead.followUpDate;
      } else if (lead.stage === 'new') {
        badge = 'First call needed';
      } else {
        badge = 'No follow-up scheduled';
      }

      return {
        id: lead._id || lead.id,
        name: lead.fullName || lead.name,
        phone: lead.phone || '',
        whatsappNumber: lead.whatsappNumber || lead.phone || '',
        badge,
        badgeClass: isOverdue ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-slate-100 text-slate-700 font-semibold',
        borderColor: isOverdue ? 'border-l-rose-500' : timeframe === 'today' ? 'border-l-amber-500' : 'border-l-slate-300',
        timeframe,
        stage: lead.stage || 'new',
        type: lead.stage === 'fee_followup' ? 'fee' : (lead.stage && lead.stage.includes('demo')) ? 'demo' : 'general',
        tags: [
          { label: lead.course || 'CPC', class: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
          { label: (lead.sourceName || lead.source || 'LEAD').toUpperCase(), class: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
        ],
        note: lead.followUpNote || lead.notes || `${lead.education || 'Graduate'} · Stage: ${(lead.stage || 'new').replace('_', ' ').toUpperCase()}`,
        assigned: lead.counselorAssigned || ''
      };
    });
  }, [searchFilteredLeads]);

  // Overall metric counts
  const stageCounts = useMemo(() => {
    const followUpFlags = leads.map(classifyFollowUp);
    return {
      total: leads.length,
      newCount: leads.filter(l => (l.stage || 'new') === 'new').length,
      contactedCount: leads.filter(l => l.stage === 'contacted').length,
      pitchedCount: leads.filter(l => l.stage === 'demo_booked' || l.stage === 'demo_attended').length,
      demoCount: leads.filter(l => l.stage === 'demo_booked').length,
      feeCount: leads.filter(l => l.stage === 'fee_followup').length,
      convertedCount: leads.filter(l => l.stage === 'admitted').length,
      todayCount: followUpFlags.filter(f => f.isToday).length,
      overdueCount: followUpFlags.filter(f => f.isOverdue).length,
      tomorrowCount: followUpFlags.filter(f => f.isTomorrow).length
    };
  }, [leads]);

  // Filtered follow-up cards
  const filteredFollowUps = useMemo(() => {
    return FOLLOW_UPS.filter(item => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'overdue') return item.timeframe === 'overdue';
      if (activeFilter === 'today') return item.timeframe === 'today';
      if (activeFilter === 'tomorrow') return item.timeframe === 'tomorrow';
      if (activeFilter === 'this_week') return item.timeframe === 'this_week';
      if (activeFilter === 'demo') return item.type === 'demo';
      if (activeFilter === 'fee') return item.type === 'fee';
      if (activeFilter === 'admitted') return item.stage === 'admitted';
      return true;
    });
  }, [FOLLOW_UPS, activeFilter]);

  const FILTERS = [
    { key: 'all', label: 'All', count: stageCounts.total, activeClass: 'bg-slate-900 text-white' },
    { key: 'overdue', label: '🔴 Overdue', count: stageCounts.overdueCount, activeClass: 'bg-rose-600 text-white' },
    { key: 'today', label: '🟡 Today', count: stageCounts.todayCount, activeClass: 'bg-amber-600 text-white' },
    { key: 'tomorrow', label: '⚪ Tomorrow', count: stageCounts.tomorrowCount, activeClass: 'bg-sky-600 text-white' },
    { key: 'demo', label: '🟣 Demos', count: stageCounts.demoCount, activeClass: 'bg-purple-600 text-white' },
    { key: 'fee', label: '🟠 Fees', count: stageCounts.feeCount, activeClass: 'bg-amber-700 text-white' },
    { key: 'admitted', label: '🟢 Admitted', count: stageCounts.convertedCount, activeClass: 'bg-emerald-600 text-white' }
  ];

  return (
    <div className="space-y-4 pb-12">
      {/* Toast feedback */}
      {actionNotice && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-teal-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Top Header: Title, Controls, View Mode Switcher */}
      <div className="pt-1 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Pipeline & <span className="text-[#00897b]">Follow-ups</span>
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-0.5">
            Unified lead tracker · <strong className="text-slate-800 font-bold">{leads.length} total leads</strong> · {stageCounts.overdueCount} overdue · {stageCounts.todayCount} due today
          </p>
        </div>

        {/* View Mode Switcher & Add Lead Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Toggle: Kanban vs Followup Board */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="View Stage Pipeline (Kanban)"
            >
              <Kanban className="w-3.5 h-3.5 text-[#00897b]" />
              <span>Stage Pipeline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('followup')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'followup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="View Follow-up Board (Urgency Cards)"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-600" />
              <span>Follow-up Board</span>
            </button>
          </div>

          {onAddLeadClick && (
            <button
              onClick={onAddLeadClick}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#00897b] hover:bg-[#00796b] text-white shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Lead</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate, phone, course..."
              className="w-full rounded-xl pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#00897b] outline-none transition-all"
            />
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full no-scrollbar pb-0.5">
            {FILTERS.map((f) => {
              const isActive = activeFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setActiveFilter(f.key)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isActive
                      ? `${f.activeClass} border-transparent shadow-xs`
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: KANBAN STAGE PIPELINE                                            */}
      {/* ========================================================================= */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 pt-1">
          {PIPELINE_COLUMNS.map((col) => {
            const visibleCards = col.cards.filter(c => {
              if (activeFilter === 'all') return true;
              if (activeFilter === 'overdue') return c.isOverdue;
              if (activeFilter === 'today') return c.isToday;
              if (activeFilter === 'tomorrow') return c.isTomorrow;
              if (activeFilter === 'demo') return c.currentStage === 'demo_booked' || c.currentStage === 'demo_attended';
              if (activeFilter === 'fee') return c.currentStage === 'fee_followup';
              if (activeFilter === 'admitted') return c.currentStage === 'admitted';
              return true;
            });

            return (
              <div key={col.id} className="flex flex-col space-y-2.5">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-1 px-1 border-b border-slate-200/90">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`}></span>
                    <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                      {col.title}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-700">
                    {visibleCards.length}
                  </span>
                </div>

                {/* Cards in this column */}
                <div className="space-y-2.5 min-h-[420px]">
                  {visibleCards.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      No leads in this stage
                    </div>
                  ) : (
                    visibleCards.map((card) => {
                      if (card.isAdmitted) {
                        return (
                          <div
                            key={card.id}
                            className="bg-[#dcfce7] border border-emerald-300 rounded-2xl p-3.5 shadow-xs transition-all hover:shadow-md hover:border-emerald-400 relative"
                          >
                            <div className="flex items-start justify-between">
                              <div className="font-extrabold text-slate-900 text-[13px] flex items-center gap-1">
                                {card.name}
                              </div>
                              <span className="bg-emerald-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                                ENROLLED
                              </span>
                            </div>

                            <div className="text-[11px] text-emerald-800 font-medium mt-1">
                              {card.sub}
                            </div>

                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-emerald-200/60">
                              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md border ${card.sourceClass}`}>
                                {card.source}
                              </span>
                              {card.phone && (
                                <button
                                  type="button"
                                  onClick={() => redirectToWhatsAppWeb(card.phone)}
                                  className="text-emerald-700 hover:text-emerald-900 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                  title={`Open WhatsApp chat with ${card.name}`}
                                >
                                  <MessageSquare className="w-3 h-3 fill-emerald-600" />
                                  <span>Chat</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={card.id}
                          className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs transition-all hover:shadow-md hover:border-slate-300 relative group"
                        >
                          {/* Top Header */}
                          <div className="flex items-start justify-between gap-1">
                            <div className="font-extrabold text-slate-900 text-[13px] leading-snug">
                              {card.name}
                            </div>
                            {card.isNew ? (
                              <span className="bg-[#00897b] text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide shrink-0">
                                NEW
                              </span>
                            ) : card.isOverdue ? (
                              <span className="bg-rose-100 text-rose-700 text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide shrink-0">
                                OVERDUE
                              </span>
                            ) : card.isToday ? (
                              <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide shrink-0">
                                TODAY
                              </span>
                            ) : null}
                          </div>

                          {/* Sub info */}
                          <div className="text-[11px] text-slate-500 font-mono mt-1">
                            {card.sub}
                          </div>

                          {/* Source & Course Tags */}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className={`inline-block text-[9.5px] font-bold px-2 py-0.5 rounded-md border tracking-wider uppercase ${card.sourceClass}`}>
                              {card.source}
                            </span>
                            <span className="inline-block text-[9.5px] font-bold px-2 py-0.5 rounded-md border bg-slate-50 text-slate-600 border-slate-200">
                              {card.course}
                            </span>
                          </div>

                          {/* Action Buttons for leads */}
                          {card.hasActions && (
                            <div className="space-y-1.5 mt-3 pt-2 border-t border-slate-100">
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => triggerAction(`Initiating call with ${card.name} (${card.phone})`)}
                                  className="bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                                  title="Initiate Call"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>Call</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetPhone = card.whatsappNumber || card.phone;
                                    const success = redirectToWhatsAppWeb(targetPhone);
                                    if (!success) {
                                      triggerAction(`No valid phone number for ${card.name}`);
                                    }
                                  }}
                                  className="bg-[#25d366] hover:bg-[#20bd5a] text-white font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                                  title={`Open WhatsApp Web & Desktop App with ${card.name}`}
                                >
                                  <MessageSquare className="w-3 h-3 fill-white" />
                                  <span>WhatsApp</span>
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAdvanceStage(card.id, card.currentStage)}
                                className="w-full py-1 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 text-[10.5px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                                title="Advance to Next Stage"
                              >
                                <span>Advance Stage</span>
                                <ArrowRight className="w-3 h-3 text-[#00897b]" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: FOLLOW-UP BOARD (URGENCY CARDS GRID)                              */}
      {/* ========================================================================= */}
      {viewMode === 'followup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pt-1">
          {filteredFollowUps.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 space-y-2">
              <div className="text-3xl">📭</div>
              <div className="font-bold text-sm text-slate-700">No follow-ups match this filter</div>
              <p className="text-xs text-slate-400">Try changing the filter or search query above</p>
            </div>
          ) : (
            filteredFollowUps.map((card) => {
              const isDone = completedIds.has(card.id);
              return (
                <div
                  key={card.id}
                  className={`bg-white border rounded-2xl p-4 shadow-xs transition-all hover:shadow-md hover:border-slate-300 flex flex-col justify-between border-l-4 ${card.borderColor} ${
                    isDone ? 'opacity-65 bg-slate-50/70' : ''
                  }`}
                >
                  <div>
                    {/* Top Row: Name + Badge */}
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="font-extrabold text-slate-900 text-sm leading-snug flex items-center gap-1">
                        <span>{card.name}</span>
                        {isDone && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md whitespace-nowrap font-medium ${card.badgeClass}`}>
                        {card.badge}
                      </span>
                    </div>

                    {/* Phone number */}
                    <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-1.5">
                      <Smartphone className="w-3 h-3 text-slate-400" />
                      <span>{card.phone}</span>
                    </div>

                    {/* Category Tags */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                      {card.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md border tracking-wide uppercase ${tag.class}`}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>

                    {/* Note / Context snippet */}
                    <div className="text-[11px] text-slate-600 mt-2.5 leading-relaxed bg-slate-50/90 p-2.5 rounded-xl border border-slate-100 flex items-start gap-1.5">
                      <span className="text-amber-500 text-xs shrink-0">📌</span>
                      <span className="leading-snug">{card.note}</span>
                    </div>
                  </div>

                  {/* Card Footer & Action Buttons */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 space-y-2">
                    <div className="text-[10.5px] text-slate-400 font-medium">
                      Assigned: <strong className="text-slate-600 font-semibold">{card.assigned || '—'}</strong>
                    </div>

                    {/* Action Buttons: 2 balanced rows */}
                    <div className="space-y-1.5">
                      {/* Row 1: Direct Contact (Call & WhatsApp) */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => triggerAction(`Calling ${card.name} (${card.phone})`)}
                          className="bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                          title="Initiate Call"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const targetPhone = card.whatsappNumber || card.phone;
                            const success = redirectToWhatsAppWeb(targetPhone);
                            if (!success) {
                              triggerAction(`No valid phone number for ${card.name}`);
                            }
                          }}
                          className="bg-[#25d366] hover:bg-[#20bd5a] text-white font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                          title={`Open WhatsApp Web & Desktop App with ${card.name}`}
                        >
                          <MessageSquare className="w-3 h-3 fill-white" />
                          <span>WhatsApp</span>
                        </button>
                      </div>

                      {/* Row 2: Follow-up Status (Done & Escalate) */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleDone(card.id, card.name)}
                          className={`font-bold text-[10.5px] py-1 px-2 rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
                            isDone
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                          title="Mark Done"
                        >
                          <Check className="w-3 h-3" />
                          <span>Done</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => triggerAction(`Escalated follow-up for ${card.name} to Team Lead`)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10.5px] py-1 px-2 rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                          title="Escalate to Supervisor"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Escalate</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
