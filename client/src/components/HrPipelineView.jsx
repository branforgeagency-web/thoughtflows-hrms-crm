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
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Kanban,
  LayoutGrid,
  LayoutList,
  Edit2,
  ArrowRight,
  Trash2,
  Loader2,
  ChevronDown
} from 'lucide-react';

import { getLeads, updateLead, deleteLead, createEscalation } from '../services/api';
import { redirectToWhatsAppWeb } from '../utils/whatsapp';
import EditLeadModal from './EditLeadModal';

const STAGE_ORDER = ['new', 'contacted', 'demo_booked', 'demo_attended', 'fee_followup', 'admitted'];

const STAGE_LABELS = {
  new: 'New Lead',
  contacted: 'Contacted',
  demo_booked: 'Demo Booked',
  demo_attended: 'Demo Attended',
  fee_followup: 'Fee Follow-up',
  admitted: 'Admitted & Enrolled'
};

const NEXT_STAGE_LABELS = {
  new: 'Contacted',
  contacted: 'Demo Booked',
  demo_booked: 'Demo Attended',
  demo_attended: 'Fee Follow-up',
  fee_followup: 'Admit Student'
};

// Classifies a lead's follow-up against real dates instead of guessing.
function classifyFollowUp(lead) {
  const rawFollowUpStatus = (lead.followUpStatus || '').toLowerCase();
  const rawDecision = (lead.decisionStatus || '').toLowerCase();
  const noteStr = (lead.followUpNote || lead.notes || '');
  const isResolved = lead.stage === 'admitted' || lead.stage === 'closed' ||
    rawFollowUpStatus === 'no_followup_needed' || rawFollowUpStatus === 'not_interested' || rawFollowUpStatus === 'done' ||
    rawDecision.includes('no follow') || rawDecision.includes('not interest') ||
    noteStr.includes('No Follow-up Needed - Done') || noteStr.includes('Not Interested - Done');

  const raw = (lead.followUpDate || '').trim();
  let target = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    target = new Date(y, m - 1, d);
  } else if (raw) {
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) target = parsed;
  }

  if (isResolved) {
    return { isOverdue: false, isToday: false, isTomorrow: false, timeframe: 'resolved', hasDate: Boolean(target) };
  }

  if (!target) {
    if (lead.stage === 'new') {
      return { isOverdue: true, isToday: false, isTomorrow: false, timeframe: 'overdue', hasDate: false };
    }
    return { isOverdue: false, isToday: false, isTomorrow: false, timeframe: null, hasDate: false };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
  onAdmitLead,
  onCallLead,
  initialViewMode = 'kanban',
  currentUser
}) {
  const [viewMode, setViewMode] = useState(initialViewMode); // 'kanban' | 'followup' | 'table'
  const [activeFilter, setActiveFilter] = useState('all'); // all, overdue, today, tomorrow, this_week, demo, fee, admitted
  const [searchQuery, setSearchQuery] = useState('');
  const [actionNotice, setActionNotice] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [escalatedIds, setEscalatedIds] = useState(new Set());
  const [leads, setLeads] = useState(propLeads || []);
  const [editingLead, setEditingLead] = useState(null);
  const [deletingLead, setDeletingLead] = useState(null);
  const [isDeletingLead, setIsDeletingLead] = useState(false);
  const [doneMenuCardId, setDoneMenuCardId] = useState(null);

  const handleConfirmDeleteLead = async () => {
    if (!deletingLead) return;
    setIsDeletingLead(true);
    try {
      const targetId = deletingLead._id || deletingLead.id;
      await deleteLead(targetId);
      setLeads(prev => prev.filter(l => (l._id || l.id) !== targetId));
      triggerAction(`✓ Deleted enquiry for ${deletingLead.fullName || deletingLead.name}`);
      setDeletingLead(null);
      if (onRefreshLeads) onRefreshLeads();
    } catch (err) {
      console.error('Failed to delete enquiry:', err);
      triggerAction(`⚠ ${err?.response?.data?.error || 'Could not delete enquiry'}`);
    } finally {
      setIsDeletingLead(false);
    }
  };

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
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleAdvanceStage = async (leadId, currentStage) => {
    const currentIdx = STAGE_ORDER.indexOf(currentStage || 'new');
    const nextStage = currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentIdx + 1] : 'admitted';

    const targetLead = leads.find(l => (l._id || l.id) === leadId);
    // Admission needs the fee & payment details, so it goes through the
    // registration form; creating the student moves the lead to Admitted.
    if (nextStage === 'admitted') {
      if (targetLead && onAdmitLead) onAdmitLead(targetLead);
      return;
    }

    setActionLoading(prev => ({ ...prev, [leadId]: 'advance' }));
    try {
      await updateLead(leadId, {
        stage: nextStage,
        status: 'in_progress',
        lastCallTime: new Date()
      });
      setLeads(prev => prev.map(l => ((l._id || l.id) === leadId) ? { ...l, stage: nextStage, status: 'in_progress' } : l));
      if (onRefreshLeads) onRefreshLeads();
      const nextStageName = NEXT_STAGE_LABELS[currentStage] || STAGE_LABELS[nextStage] || nextStage;
      triggerAction(`✓ Advanced lead to ${nextStageName.toUpperCase()}`);
    } catch (err) {
      console.error('Failed to advance lead stage:', err);
      triggerAction('Error updating lead stage');
    } finally {
      setActionLoading(prev => ({ ...prev, [leadId]: false }));
    }
  };

  const handleMarkDoneStatus = async (card, statusType) => {
    const leadId = card.id;
    setDoneMenuCardId(null);
    setActionLoading(prev => ({ ...prev, [leadId]: statusType }));

    try {
      if (statusType === 'no_followup_needed') {
        const dateStr = new Date().toLocaleDateString();
        const existingNote = card.rawLead?.followUpNote || '';
        const updatedNote = existingNote 
          ? `[No Follow-up Needed - Done on ${dateStr}]: ${existingNote}`
          : `[No Follow-up Needed - Done on ${dateStr}]`;

        const updateData = {
          followUpStatus: 'no_followup_needed',
          decisionStatus: 'No Follow-up Needed',
          status: 'completed',
          followUpNote: updatedNote
        };

        await updateLead(leadId, updateData);
        setLeads(prev => prev.map(l => ((l._id || l.id) === leadId) ? { ...l, ...updateData } : l));
        triggerAction(`✓ Marked as No Follow-up Needed Done for ${card.name}`);
        if (onRefreshLeads) onRefreshLeads();
      } else if (statusType === 'not_interested') {
        const dateStr = new Date().toLocaleDateString();
        const existingNote = card.rawLead?.followUpNote || '';
        const updatedNote = existingNote 
          ? `[Not Interested - Done on ${dateStr}]: ${existingNote}`
          : `[Not Interested - Done on ${dateStr}]`;

        const updateData = {
          followUpStatus: 'not_interested',
          decisionStatus: 'Not Interested',
          stage: 'closed',
          status: 'cancelled',
          followUpNote: updatedNote
        };

        await updateLead(leadId, updateData);
        setLeads(prev => prev.map(l => ((l._id || l.id) === leadId) ? { ...l, ...updateData } : l));
        triggerAction(`✓ Marked as Not Interested Done for ${card.name}`);
        if (onRefreshLeads) onRefreshLeads();
      } else if (statusType === 'done') {
        const currentStage = card.stage || 'new';
        const currentIdx = STAGE_ORDER.indexOf(currentStage);
        const nextStage = currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentIdx + 1] : 'admitted';

        const targetLead = leads.find(l => (l._id || l.id) === leadId) || card.rawLead;

        if (nextStage === 'admitted') {
          if (targetLead && onAdmitLead) {
            onAdmitLead(targetLead);
            triggerAction(`✓ Opening Admission & Enrollment form for ${card.name}...`);
          } else {
            triggerAction(`Ready for Admission: ${card.name}`);
          }
          return;
        }

        const nextStageName = NEXT_STAGE_LABELS[currentStage] || STAGE_LABELS[nextStage] || nextStage;

        const updateData = {
          stage: nextStage,
          followUpStatus: 'done',
          decisionStatus: 'Follow-up Done',
          status: 'in_progress',
          lastCallTime: new Date()
        };

        await updateLead(leadId, updateData);
        setLeads(prev => prev.map(l => ((l._id || l.id) === leadId) ? { ...l, ...updateData } : l));
        triggerAction(`✓ Follow-up Done! Moved ${card.name} → ${nextStageName}`);
        if (onRefreshLeads) onRefreshLeads();
      }
    } catch (err) {
      console.error('Failed to update follow-up status:', err);
      triggerAction('Error updating follow-up status');
    } finally {
      setActionLoading(prev => ({ ...prev, [leadId]: false }));
    }
  };

  const handleReopenFollowUp = async (card) => {
    const leadId = card.id;
    setActionLoading(prev => ({ ...prev, [leadId]: 'reopen' }));
    try {
      const resetStage = card.rawLead?.stage === 'closed' ? 'contacted' : (card.rawLead?.stage || 'new');
      const updateData = {
        followUpStatus: '',
        decisionStatus: '',
        stage: resetStage,
        status: 'in_progress'
      };
      await updateLead(leadId, updateData);
      setLeads(prev => prev.map(l => ((l._id || l.id) === leadId) ? { ...l, ...updateData } : l));
      triggerAction(`Follow-up reopened for ${card.name}`);
      if (onRefreshLeads) onRefreshLeads();
    } catch (err) {
      console.error('Failed to reopen follow-up:', err);
      triggerAction('Could not reopen follow-up');
    } finally {
      setActionLoading(prev => ({ ...prev, [leadId]: false }));
    }
  };

  const handleDoneFollowUp = (card) => handleMarkDoneStatus(card, 'done');

  const handleEscalate = async (card) => {
    const leadId = card.id;
    setActionLoading(prev => ({ ...prev, [leadId]: 'escalate' }));
    try {
      await createEscalation({
        title: `Follow-up Escalation: ${card.name} (${card.phone || 'No phone'})`,
        description: `Urgent follow-up escalation for candidate ${card.name}. Course: ${card.course || '—'}. Current stage: ${(STAGE_LABELS[card.stage] || card.stage || 'new')}. Assigned counsellor: ${card.assigned || currentUser?.name || 'HR Team'}.`,
        departmentCode: 'DEP-HR-001',
        branchName: card.rawLead?.branch || currentUser?.branch || '',
        studentId: '',
        raisedBy: currentUser?.name || card.assigned || 'HR Counsellor',
        priority: 'urgent',
        type: 'Operational Issue',
        status: 'open'
      });

      const updatedNote = card.rawLead?.followUpNote 
        ? `[ESCALATED to Supervisor on ${new Date().toLocaleDateString()}]: ${card.rawLead.followUpNote}`
        : `[ESCALATED to Supervisor on ${new Date().toLocaleDateString()}]`;

      await updateLead(leadId, {
        decisionStatus: 'escalated',
        followUpNote: updatedNote
      });

      setEscalatedIds(prev => new Set(prev).add(leadId));
      setLeads(prev => prev.map(l => ((l._id || l.id) === leadId) ? { ...l, decisionStatus: 'escalated', followUpNote: updatedNote } : l));
      triggerAction(`🚨 Follow-up escalated for ${card.name} to Supervisor & Leadership Hub`);
      if (onRefreshLeads) onRefreshLeads();
    } catch (err) {
      console.error('Failed to escalate follow-up:', err);
      triggerAction('Could not escalate follow-up');
    } finally {
      setActionLoading(prev => ({ ...prev, [leadId]: false }));
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
      (l.allocatedTo || '').toLowerCase().includes(q) ||
      (l.spokenBy || '').toLowerCase().includes(q) ||
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

      const isEscalated = lead.decisionStatus === 'escalated' || 
        escalatedIds.has(lead._id || lead.id) || 
        Boolean(lead.notes && lead.notes.includes('[ESCALATED]')) || 
        Boolean(lead.followUpNote && lead.followUpNote.includes('[ESCALATED]'));

      const rawFollowUpStatus = (lead.followUpStatus || '').toLowerCase();
      const rawDecision = (lead.decisionStatus || '').toLowerCase();
      const noteStr = (lead.followUpNote || lead.notes || '');

      let followUpDoneStatus = null;
      if (rawFollowUpStatus === 'no_followup_needed' || rawDecision.includes('no follow') || noteStr.includes('No Follow-up Needed - Done')) {
        followUpDoneStatus = 'no_followup_needed';
      } else if (rawFollowUpStatus === 'not_interested' || rawDecision.includes('not interest') || noteStr.includes('Not Interested - Done')) {
        followUpDoneStatus = 'not_interested';
      } else if (rawFollowUpStatus === 'done' || rawDecision === 'follow-up done' || rawDecision === 'done' || noteStr.includes('[Follow-up Done')) {
        followUpDoneStatus = 'done';
      }

      const isDone = Boolean(followUpDoneStatus);

      let badge;
      let badgeClass = isOverdue ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-slate-100 text-slate-700 font-semibold';
      let borderColor = isEscalated ? 'border-l-rose-600' : isOverdue ? 'border-l-rose-500' : timeframe === 'today' ? 'border-l-amber-500' : 'border-l-slate-300';

      if (lead.stage === 'admitted') {
        badge = 'Admitted & Enrolled';
        badgeClass = 'bg-emerald-100 text-emerald-800 font-bold';
        borderColor = 'border-l-emerald-500';
      } else if (followUpDoneStatus === 'no_followup_needed') {
        badge = 'No follow-up needed (Done)';
        badgeClass = 'bg-slate-100 text-slate-700 font-bold';
        borderColor = 'border-l-slate-400';
      } else if (followUpDoneStatus === 'not_interested') {
        badge = 'Not interested (Done)';
        badgeClass = 'bg-rose-100 text-rose-700 font-bold';
        borderColor = 'border-l-rose-400';
      } else if (followUpDoneStatus === 'done') {
        badge = 'Follow-up done';
        badgeClass = 'bg-emerald-100 text-emerald-800 font-bold';
        borderColor = 'border-l-emerald-400';
      } else if (hasDate) {
        badge = lead.followUpTime ? `${lead.followUpDate} · ${lead.followUpTime}` : lead.followUpDate;
      } else if (lead.stage === 'new') {
        badge = 'First call needed';
        borderColor = isEscalated ? 'border-l-rose-600' : 'border-l-teal-500';
      } else {
        badge = 'No follow-up scheduled';
      }

      const currentStageLabel = STAGE_LABELS[lead.stage] || (lead.stage || 'NEW').replace('_', ' ');

      const statusTag = followUpDoneStatus === 'no_followup_needed'
        ? { label: 'NO FOLLOW-UP', class: 'bg-slate-100 text-slate-700 border-slate-300 font-bold' }
        : followUpDoneStatus === 'not_interested'
          ? { label: 'NOT INTERESTED', class: 'bg-rose-100 text-rose-700 border-rose-300 font-bold' }
          : followUpDoneStatus === 'done'
            ? { label: 'DONE', class: 'bg-emerald-100 text-emerald-700 border-emerald-300 font-bold' }
            : null;

      return {
        id: lead._id || lead.id,
        name: lead.fullName || lead.name,
        phone: lead.phone || '',
        whatsappNumber: lead.whatsappNumber || lead.phone || '',
        badge,
        badgeClass,
        borderColor,
        timeframe,
        stage: lead.stage || 'new',
        isEscalated,
        followUpDoneStatus,
        isDone,
        type: lead.stage === 'fee_followup' ? 'fee' : (lead.stage && lead.stage.includes('demo')) ? 'demo' : 'general',
        tags: [
          lead.stage === 'admitted'
            ? { label: 'ENROLLED', class: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold' }
            : { label: currentStageLabel.toUpperCase(), class: 'bg-teal-50 text-teal-800 border-teal-200 font-bold' },
          statusTag,
          isEscalated
            ? { label: 'ESCALATED', class: 'bg-rose-100 text-rose-700 border-rose-300 font-bold' }
            : null,
          { label: lead.course || 'CPC', class: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
          { label: (lead.sourceName || lead.source || 'LEAD').toUpperCase(), class: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
        ].filter(Boolean),
        note: lead.followUpNote || lead.notes || `${lead.education || 'Graduate'} · Stage: ${currentStageLabel.toUpperCase()}`,
        assigned: lead.counselorAssigned || '',
        course: lead.course || 'CPC',
        rawLead: lead
      };
    });
  }, [searchFilteredLeads, escalatedIds]);

  // Overall metric counts
  const stageCounts = useMemo(() => {
    const followUpFlags = leads.map(classifyFollowUp);
    const doneFollowUpsCount = leads.filter(l => {
      const raw = (l.followUpStatus || '').toLowerCase();
      const dec = (l.decisionStatus || '').toLowerCase();
      const note = (l.followUpNote || l.notes || '');
      return raw === 'no_followup_needed' || raw === 'not_interested' || raw === 'done' ||
        dec.includes('no follow') || dec.includes('not interest') ||
        note.includes('No Follow-up Needed - Done') || note.includes('Not Interested - Done');
    }).length;

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
      tomorrowCount: followUpFlags.filter(f => f.isTomorrow).length,
      doneCount: doneFollowUpsCount
    };
  }, [leads]);

  // Filtered follow-up cards
  const filteredFollowUps = useMemo(() => {
    return FOLLOW_UPS.filter(item => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'overdue') return item.timeframe === 'overdue' && !item.isDone;
      if (activeFilter === 'today') return item.timeframe === 'today' && !item.isDone;
      if (activeFilter === 'tomorrow') return item.timeframe === 'tomorrow' && !item.isDone;
      if (activeFilter === 'this_week') return item.timeframe === 'this_week' && !item.isDone;
      if (activeFilter === 'demo') return item.type === 'demo';
      if (activeFilter === 'fee') return item.type === 'fee';
      if (activeFilter === 'admitted') return item.stage === 'admitted';
      if (activeFilter === 'done') return item.isDone;
      return true;
    });
  }, [FOLLOW_UPS, activeFilter]);

  // Filtered leads for Table view
  const tableLeads = useMemo(() => {
    return searchFilteredLeads.filter(lead => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'done') {
        const raw = (lead.followUpStatus || '').toLowerCase();
        const dec = (lead.decisionStatus || '').toLowerCase();
        const note = (lead.followUpNote || lead.notes || '');
        return raw === 'no_followup_needed' || raw === 'not_interested' || raw === 'done' ||
          dec.includes('no follow') || dec.includes('not interest') ||
          note.includes('No Follow-up Needed - Done') || note.includes('Not Interested - Done');
      }
      const flags = classifyFollowUp(lead);
      if (activeFilter === 'overdue') return flags.timeframe === 'overdue';
      if (activeFilter === 'today') return flags.timeframe === 'today';
      if (activeFilter === 'tomorrow') return flags.timeframe === 'tomorrow';
      if (activeFilter === 'demo') return (lead.stage || '').includes('demo');
      if (activeFilter === 'fee') return lead.stage === 'fee_followup';
      if (activeFilter === 'admitted') return lead.stage === 'admitted';
      return true;
    });
  }, [searchFilteredLeads, activeFilter]);

  const FILTERS = [
    { key: 'all', label: 'All', count: stageCounts.total, activeClass: 'bg-slate-900 text-white' },
    { key: 'overdue', label: '🔴 Overdue', count: stageCounts.overdueCount, activeClass: 'bg-rose-600 text-white' },
    { key: 'today', label: '🟡 Today', count: stageCounts.todayCount, activeClass: 'bg-amber-600 text-white' },
    { key: 'tomorrow', label: '⚪ Tomorrow', count: stageCounts.tomorrowCount, activeClass: 'bg-sky-600 text-white' },
    { key: 'demo', label: '🟣 Demos', count: stageCounts.demoCount, activeClass: 'bg-purple-600 text-white' },
    { key: 'fee', label: '🟠 Fees', count: stageCounts.feeCount, activeClass: 'bg-amber-700 text-white' },
    { key: 'admitted', label: '🟢 Admitted', count: stageCounts.convertedCount, activeClass: 'bg-emerald-600 text-white' },
    { key: 'done', label: '✓ Done', count: stageCounts.doneCount, activeClass: 'bg-slate-700 text-white' }
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
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="View Enquiries Table"
            >
              <LayoutList className="w-3.5 h-3.5 text-teal-600" />
              <span>Enquiries Table</span>
            </button>
          </div>

          {onAddLeadClick && (
            <button
              onClick={onAddLeadClick}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#00897b] hover:bg-[#00796b] text-white shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Enquiry</span>
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
                            <div className="flex items-center gap-1 shrink-0">
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

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingLead(card.rawLead || card);
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-[#00897b] hover:bg-teal-50 transition-colors cursor-pointer"
                                title={`Edit enquiry for ${card.name}`}
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingLead(card.rawLead || card);
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title={`Delete enquiry for ${card.name}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
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
                                  onClick={() => {
                                    if (onCallLead) {
                                      onCallLead(card.rawLead || card);
                                    } else if (card.phone) {
                                      window.location.href = `tel:${card.phone}`;
                                    } else {
                                      triggerAction(`No phone number for ${card.name}`);
                                    }
                                  }}
                                  className="bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                                  title={`Call ${card.name} (${card.phone})`}
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
                                disabled={Boolean(actionLoading[card.id])}
                                onClick={() => handleAdvanceStage(card.id, card.currentStage)}
                                className="w-full py-1 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 text-[10.5px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                                title="Advance to Next Stage"
                              >
                                {actionLoading[card.id] ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin text-[#00897b]" />
                                    <span>Moving...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>Advance Stage</span>
                                    <ArrowRight className="w-3 h-3 text-[#00897b]" />
                                  </>
                                )}
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
              return (
                <div
                  key={card.id}
                  className={`bg-white border rounded-2xl p-4 shadow-xs transition-all hover:shadow-md hover:border-slate-300 flex flex-col justify-between border-l-4 ${card.borderColor} ${
                    card.stage === 'admitted' || card.isDone ? 'opacity-85 bg-slate-50/50' : ''
                  }`}
                >
                  <div>
                    {/* Top Row: Name + Badge */}
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="font-extrabold text-slate-900 text-sm leading-snug flex items-center gap-1">
                        <span>{card.name}</span>
                        {card.stage === 'admitted' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md whitespace-nowrap font-medium ${card.badgeClass}`}>
                          {card.badge}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLead(card.rawLead || card);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-[#00897b] hover:bg-teal-50 transition-colors cursor-pointer"
                          title={`Edit enquiry for ${card.name}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingLead(card.rawLead || card);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title={`Delete enquiry for ${card.name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
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
                          onClick={() => {
                            if (onCallLead) {
                              onCallLead(card.rawLead || card);
                            } else if (card.phone) {
                              window.location.href = `tel:${card.phone}`;
                            } else {
                              triggerAction(`No phone number for ${card.name}`);
                            }
                          }}
                          className="bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                          title={`Call ${card.name} (${card.phone})`}
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

                      {/* Row 2: Follow-up Status or Admitted Badge */}
                      {card.stage === 'admitted' ? (
                        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold text-[11px] py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Student Admitted & Enrolled</span>
                        </div>
                      ) : card.followUpDoneStatus ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <button
                            type="button"
                            disabled
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border font-bold text-[10.5px] cursor-not-allowed shadow-2xs opacity-95 ${
                              card.followUpDoneStatus === 'no_followup_needed'
                                ? 'bg-slate-100 text-slate-700 border-slate-300'
                                : card.followUpDoneStatus === 'not_interested'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            }`}
                          >
                            {card.followUpDoneStatus === 'no_followup_needed' ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="truncate">No Follow-up Needed Done</span>
                              </>
                            ) : card.followUpDoneStatus === 'not_interested' ? (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span className="truncate">Not Interested Done</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate">Follow-up Done</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={Boolean(actionLoading[card.id])}
                            onClick={() => handleReopenFollowUp(card)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold transition-all cursor-pointer shrink-0"
                            title="Reopen follow-up or change status"
                          >
                            {actionLoading[card.id] === 'reopen' ? (
                              <Loader2 className="w-3 h-3 animate-spin text-slate-600" />
                            ) : (
                              <span className="flex items-center gap-0.5">
                                <RotateCcw className="w-3 h-3" />
                                <span className="text-[9.5px]">Change</span>
                              </span>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5 relative">
                          {/* Done Dropdown Trigger */}
                          <div className="relative">
                            <button
                              type="button"
                              disabled={Boolean(actionLoading[card.id])}
                              onClick={() => setDoneMenuCardId(prev => prev === card.id ? null : card.id)}
                              className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold text-[10.5px] py-1 px-2 rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                              title="Click to complete follow-up with status"
                            >
                              {actionLoading[card.id] ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                                  <span>Saving...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Done</span>
                                  <ChevronDown className="w-2.5 h-2.5 text-emerald-600" />
                                </>
                              )}
                            </button>

                            {/* Done Status Selection Popover Menu */}
                            {doneMenuCardId === card.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-30"
                                  onClick={() => setDoneMenuCardId(null)}
                                />
                                <div className="absolute bottom-full left-0 mb-1.5 w-56 sm:w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 z-40 text-left animate-in fade-in zoom-in-95">
                                  <div className="text-[9.5px] font-black uppercase text-slate-400 px-2.5 py-1 font-mono tracking-wider border-b border-slate-100 mb-1">
                                    Select Done Status:
                                  </div>

                                  {/* 1. No Follow-up Needed */}
                                  <button
                                    type="button"
                                    onClick={() => handleMarkDoneStatus(card, 'no_followup_needed')}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 flex items-start gap-2 transition-colors cursor-pointer group"
                                  >
                                    <span className="text-xs leading-none mt-0.5">🚫</span>
                                    <div>
                                      <div className="text-[11px] font-bold text-slate-800 group-hover:text-slate-900">
                                        No Follow-up Needed
                                      </div>
                                      <div className="text-[9.5px] text-slate-500">
                                        Mark as No Follow-up Needed Done
                                      </div>
                                    </div>
                                  </button>

                                  {/* 2. Not Interested */}
                                  <button
                                    type="button"
                                    onClick={() => handleMarkDoneStatus(card, 'not_interested')}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 flex items-start gap-2 transition-colors cursor-pointer group"
                                  >
                                    <span className="text-xs leading-none mt-0.5">⛔</span>
                                    <div>
                                      <div className="text-[11px] font-bold text-rose-700 group-hover:text-rose-800">
                                        Not Interested
                                      </div>
                                      <div className="text-[9.5px] text-rose-500">
                                        Mark as Not Interested Done
                                      </div>
                                    </div>
                                  </button>

                                  {/* 3. Follow-up Done / Next Process */}
                                  <button
                                    type="button"
                                    onClick={() => handleMarkDoneStatus(card, 'done')}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 flex items-start gap-2 transition-colors cursor-pointer group"
                                  >
                                    <span className="text-xs leading-none mt-0.5">✓</span>
                                    <div>
                                      <div className="text-[11px] font-bold text-emerald-700 group-hover:text-emerald-800">
                                        Follow-up Done
                                      </div>
                                      <div className="text-[9.5px] text-emerald-600">
                                        Move to {NEXT_STAGE_LABELS[card.stage] || 'Next Process'}
                                      </div>
                                    </div>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>

                          {card.isEscalated ? (
                            <div
                              className="bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10.5px] py-1 px-2 rounded-lg flex items-center justify-center gap-1 cursor-default shadow-2xs"
                              title="Follow-up escalated to Supervisor / Team Lead"
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                              <span className="truncate">Escalated 🚨</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={Boolean(actionLoading[card.id])}
                              onClick={() => handleEscalate(card)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10.5px] py-1 px-2 rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                              title="Escalate to Supervisor / Team Lead"
                            >
                              {actionLoading[card.id] === 'escalate' ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin text-rose-600" />
                                  <span>Saving...</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Escalate</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: ENQUIRIES TABLE VIEW                                              */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase whitespace-nowrap">
                  <th className="py-3 px-3.5">Candidate Name</th>
                  <th className="py-3 px-3.5">Contact</th>
                  <th className="py-3 px-3.5">Interested Course</th>
                  <th className="py-3 px-3.5">Preferred Branch</th>
                  <th className="py-3 px-3.5">Stage</th>
                  <th className="py-3 px-3.5">Source</th>
                  <th className="py-3 px-3.5">Follow-up</th>
                  <th className="py-3 px-3.5">Counsellor</th>
                  <th className="py-3 px-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {tableLeads.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-400">
                      <div className="text-3xl mb-1">📭</div>
                      <div className="font-bold text-slate-600">No student enquiries found</div>
                      <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search query or filter</p>
                    </td>
                  </tr>
                ) : (
                  tableLeads.map((lead, idx) => {
                    const flags = classifyFollowUp(lead);
                    const leadId = lead._id || lead.id || idx;
                    const stageLabel = (lead.stage || 'new').replace('_', ' ').toUpperCase();
                    const stageColor = lead.stage === 'admitted'
                      ? 'bg-emerald-100 text-emerald-800'
                      : lead.stage === 'fee_followup'
                        ? 'bg-amber-100 text-amber-900'
                        : lead.stage?.includes('demo')
                          ? 'bg-purple-100 text-purple-900'
                          : lead.stage === 'contacted'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-slate-100 text-slate-700';

                    return (
                      <tr key={leadId} className="hover:bg-teal-50/50 transition-colors group">
                        {/* Name */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="font-extrabold text-slate-900 group-hover:text-[#00897b] transition-colors">
                            {lead.fullName || lead.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {lead.education || 'Graduate'} {lead.passoutYear ? `(${lead.passoutYear})` : ''}
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="font-mono text-slate-700 font-bold">{lead.phone}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (onCallLead) onCallLead(lead);
                                else if (lead.phone) window.location.href = `tel:${lead.phone}`;
                              }}
                              className="p-1 rounded-md bg-[#00897b]/10 hover:bg-[#00897b] text-[#00897b] hover:text-white transition-colors cursor-pointer"
                              title={`Call ${lead.fullName || lead.name}`}
                            >
                              <Phone className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => redirectToWhatsAppWeb(lead.whatsappNumber || lead.phone)}
                              className="p-1 rounded-md bg-[#25d366]/15 hover:bg-[#25d366] text-[#25d366] hover:text-white transition-colors cursor-pointer"
                              title={`WhatsApp ${lead.fullName || lead.name}`}
                            >
                              <MessageSquare className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </td>

                        {/* Course */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="font-bold text-slate-800">{lead.course || 'AMCT'}</span>
                          {lead.batchTiming && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{lead.batchTiming}</div>
                          )}
                        </td>

                        {/* Branch */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 font-medium">
                          {lead.branch || '—'}
                        </td>

                        {/* Stage */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${stageColor}`}>
                            {stageLabel}
                          </span>
                        </td>

                        {/* Source */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="bg-purple-50 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-purple-200">
                            {lead.sourceName || lead.source || 'DIRECT'}
                          </span>
                        </td>

                        {/* Follow-up */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {lead.followUpDate ? (
                            <div>
                              <div className={`font-bold font-mono text-[10.5px] ${flags.isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                                {lead.followUpDate}
                              </div>
                              <div className="text-[9.5px] text-slate-400">{lead.followUpTime || 'Morning'}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px]">No schedule</span>
                          )}
                        </td>

                        {/* Counsellor */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 font-medium">
                          {lead.counselorAssigned || '—'}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingLead(lead)}
                              className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-[#00897b] text-[#00897b] hover:text-white border border-[#00897b]/30 hover:border-[#00897b] transition-all cursor-pointer shadow-2xs active:scale-95"
                              title={`Edit enquiry for ${lead.fullName || lead.name}`}
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>

                            {lead.stage !== 'admitted' && (
                              <button
                                type="button"
                                disabled={Boolean(actionLoading[leadId])}
                                onClick={() => handleAdvanceStage(leadId, lead.stage || 'new')}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
                                title="Advance Stage"
                              >
                                {actionLoading[leadId] ? (
                                  <>
                                    <Loader2 className="w-2.5 h-2.5 animate-spin text-[#00897b]" />
                                    <span>Moving...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>Advance</span>
                                    <ArrowRight className="w-2.5 h-2.5 text-[#00897b]" />
                                  </>
                                )}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setDeletingLead(lead)}
                              className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 transition-all cursor-pointer shadow-2xs active:scale-95"
                              title={`Delete enquiry for ${lead.fullName || lead.name}`}
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {editingLead && (
        <EditLeadModal
          isOpen={!!editingLead}
          lead={editingLead}
          onClose={() => setEditingLead(null)}
          onSuccess={(updated) => {
            setLeads(prev => prev.map(l => {
              const match = (l._id && l._id === updated._id) || (l.id && l.id === updated.id);
              return match ? { ...l, ...updated } : l;
            }));
            triggerAction(`✓ Updated enquiry details for ${updated.fullName || updated.name}`);
            if (onRefreshLeads) onRefreshLeads();
          }}
          onDelete={(targetId) => {
            setLeads(prev => prev.filter(l => (l._id || l.id) !== targetId));
            triggerAction('✓ Enquiry removed');
            if (onRefreshLeads) onRefreshLeads();
          }}
        />
      )}

      {/* Delete Enquiry Confirmation Modal */}
      {deletingLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-left animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Delete Enquiry</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete enquiry for <strong className="text-slate-900">{deletingLead.fullName || deletingLead.name}</strong> ({deletingLead.phone || deletingLead.email || 'No contact'})?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingLead(null)}
                disabled={isDeletingLead}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteLead}
                disabled={isDeletingLead}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingLead ? 'Deleting...' : 'Delete Enquiry'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
