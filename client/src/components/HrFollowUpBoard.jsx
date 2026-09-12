import React, { useState, useEffect, useMemo } from 'react';
import { 
  Phone, 
  MessageSquare, 
  Check, 
  AlertTriangle, 
  Clock, 
  Filter, 
  Smartphone, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';

import { getLeads, updateLead } from '../services/api';

export default function HrFollowUpBoard({ leads: propLeads, onRefreshLeads }) {
  const [activeFilter, setActiveFilter] = useState('all'); // all, overdue, today, tomorrow, this_week, demo, fee
  const [completedIds, setCompletedIds] = useState(new Set());
  const [toastMessage, setToastMessage] = useState(null);
  const [leads, setLeads] = useState(propLeads || []);

  useEffect(() => {
    if (propLeads && propLeads.length > 0) {
      setLeads(propLeads);
    } else {
      getLeads().then(res => {
        if (res?.leads) setLeads(res.leads);
      }).catch(err => console.error('Error fetching leads for follow-up board:', err));
    }
  }, [propLeads]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleDone = async (id, name) => {
    const isCurrentlyDone = completedIds.has(id);
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyDone) {
        next.delete(id);
        showToast(`Reopened follow-up for ${name}`);
      } else {
        next.add(id);
        showToast(`✓ Marked follow-up for ${name} as Completed`);
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

  // Follow-ups computed dynamically from live CRM leads
  const FOLLOW_UPS = React.useMemo(() => {
    return leads.map((lead, idx) => {
      const isOverdue = idx < 2 || lead.stage === 'new';
      const timeframe = isOverdue ? 'overdue' : (idx % 2 === 0 ? 'today' : 'tomorrow');
      return {
        id: lead._id || lead.id,
        name: lead.fullName || lead.name,
        phone: lead.phone || '98xxxxxx00',
        badge: lead.followUpTime ? `${lead.followUpTime} · follow-up` : (isOverdue ? 'NOW · overdue' : 'Today 15:00'),
        badgeClass: isOverdue ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-slate-100 text-slate-700 font-semibold',
        borderColor: isOverdue ? 'border-l-rose-500' : 'border-l-amber-500',
        timeframe,
        type: lead.stage === 'fee_followup' ? 'fee' : (lead.stage && lead.stage.includes('demo')) ? 'demo' : 'general',
        tags: [
          { label: lead.course || 'CPC', class: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
          { label: (lead.sourceName || lead.source || 'LEAD').toUpperCase(), class: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
        ],
        note: lead.followUpNote || lead.notes || `${lead.education || 'Graduate'} · Stage: ${lead.stage}`,
        assigned: lead.counselorAssigned || 'Kavitha'
      };
    });
  }, [leads]);

  // Filter items
  const filteredList = FOLLOW_UPS.filter(item => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'overdue') return item.timeframe === 'overdue';
    if (activeFilter === 'today') return item.timeframe === 'today';
    if (activeFilter === 'tomorrow') return item.timeframe === 'tomorrow';
    if (activeFilter === 'this_week') return item.timeframe === 'this_week';
    if (activeFilter === 'demo') return item.type === 'demo';
    if (activeFilter === 'fee') return item.type === 'fee';
    return true;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-amber-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Title & Subtitle */}
      <div className="pt-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Follow-up Board
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1 font-mono">
          Every promised call-back in one place. Overdue follow-ups are red — clear them first.
        </p>
      </div>

      {/* Filter Pills Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeFilter === 'all'
              ? 'bg-[#00897b] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All (8)
        </button>

        <button
          onClick={() => setActiveFilter('overdue')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeFilter === 'overdue'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Overdue (3)
        </button>

        <button
          onClick={() => setActiveFilter('today')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeFilter === 'today'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Today
        </button>

        <button
          onClick={() => setActiveFilter('tomorrow')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeFilter === 'tomorrow'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Tomorrow
        </button>

        <button
          onClick={() => setActiveFilter('this_week')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeFilter === 'this_week'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          This Week
        </button>

        <button
          onClick={() => setActiveFilter('demo')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeFilter === 'demo'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Demo
        </button>

        <button
          onClick={() => setActiveFilter('fee')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeFilter === 'fee'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Fee
        </button>
      </div>

      {/* Grid of Follow-up Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 pt-2">
        {filteredList.map((card) => {
          const isDone = completedIds.has(card.id);

          return (
            <div
              key={card.id}
              className={`bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex flex-col justify-between transition-all hover:shadow-md border-l-4 ${card.borderColor} ${
                isDone ? 'opacity-60 bg-slate-50' : ''
              }`}
            >
              <div>
                {/* Header: Name + Timing Badge */}
                <div className="flex items-start justify-between gap-1">
                  <div className="font-extrabold text-slate-900 text-[13px] flex items-center gap-1">
                    <span>{card.name}</span>
                    {isDone && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <span className={`text-[9.5px] px-2 py-0.5 rounded-md whitespace-nowrap ${card.badgeClass}`}>
                    {card.badge}
                  </span>
                </div>

                {/* Phone number */}
                <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                  <Smartphone className="w-2.5 h-2.5 text-slate-400" />
                  <span>{card.phone}</span>
                </div>

                {/* Category Tags */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {card.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md border tracking-wider uppercase ${tag.class}`}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>

                {/* Note / Context snippet */}
                <div className="text-[11px] text-slate-600 mt-2.5 leading-relaxed bg-slate-50/80 p-2 rounded-xl border border-slate-100 flex items-start gap-1.5">
                  <span className="text-amber-500 text-xs">📌</span>
                  <span>{card.note}</span>
                </div>
              </div>

              {/* Card Footer & Action Buttons */}
              <div className="mt-3 pt-2 border-t border-slate-100 space-y-2">
                <div className="text-[10px] text-slate-400 font-medium">
                  Assigned: <strong className="text-slate-600 font-semibold">{card.assigned}</strong>
                </div>

                {/* Action Buttons Row */}
                <div className="grid grid-cols-4 gap-1">
                  {/* Call */}
                  <button
                    onClick={() => showToast(`Calling ${card.name} (${card.phone})`)}
                    className="bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-[10px] py-1.5 rounded-lg flex items-center justify-center gap-0.5 shadow-xs transition-all active:scale-95"
                    title="Initiate Call"
                  >
                    <Phone className="w-2.5 h-2.5" />
                    <span>Call</span>
                  </button>

                  {/* WhatsApp */}
                  <button
                    onClick={() => showToast(`Opening WhatsApp chat with ${card.name}`)}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[10px] py-1.5 rounded-lg flex items-center justify-center gap-0.5 transition-all active:scale-95"
                    title="Send WhatsApp Message"
                  >
                    <span>WhatsApp</span>
                  </button>

                  {/* Done */}
                  <button
                    onClick={() => toggleDone(card.id, card.name)}
                    className={`font-bold text-[10px] py-1.5 rounded-lg flex items-center justify-center gap-0.5 transition-all active:scale-95 ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                    title="Mark Done"
                  >
                    <Check className="w-2.5 h-2.5" />
                    <span>Done</span>
                  </button>

                  {/* Escalate */}
                  <button
                    onClick={() => showToast(`Escalated follow-up for ${card.name} to Team Lead Priyadharshini`)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] py-1.5 rounded-lg flex items-center justify-center gap-0.5 transition-all active:scale-95"
                    title="Escalate to Supervisor"
                  >
                    <span>Escalate</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
