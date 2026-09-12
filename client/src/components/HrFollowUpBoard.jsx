import React, { useState } from 'react';
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

export default function HrFollowUpBoard() {
  const [activeFilter, setActiveFilter] = useState('all'); // all, overdue, today, tomorrow, this_week, demo, fee
  const [completedIds, setCompletedIds] = useState(new Set());
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleDone = (id, name) => {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast(`Reopened follow-up for ${name}`);
      } else {
        next.add(id);
        showToast(`✓ Marked follow-up for ${name} as Completed`);
      }
      return next;
    });
  };

  const FOLLOW_UPS = [
    {
      id: 'f1',
      name: 'Priya R.',
      phone: '98xxxxxx21',
      badge: 'NOW · overdue',
      badgeClass: 'bg-rose-100 text-rose-700 font-bold',
      borderColor: 'border-l-rose-500',
      timeframe: 'overdue',
      type: 'general',
      tags: [
        { label: 'First Call', class: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
        { label: 'NEW', class: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
      ],
      note: 'Google lead. BPO reject. Has not been reached yet — 2 attempts failed.',
      assigned: 'Kavitha'
    },
    {
      id: 'f2',
      name: 'Suresh M.',
      phone: '98xxxxxx88',
      badge: '09:30 · overdue',
      badgeClass: 'bg-rose-100 text-rose-700 font-bold',
      borderColor: 'border-l-rose-500',
      timeframe: 'overdue',
      type: 'fee',
      tags: [
        { label: 'Fee Follow-up', class: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
        { label: 'FEE', class: 'bg-amber-50 text-amber-800 border-amber-200' }
      ],
      note: 'Agreed CPC, asked to call back about EMI option this morning.',
      assigned: 'Kavitha'
    },
    {
      id: 'f3',
      name: 'Lavanya K.',
      phone: '73xxxxxx55',
      badge: '11:00 · overdue',
      badgeClass: 'bg-rose-100 text-rose-700 font-bold',
      borderColor: 'border-l-rose-500',
      timeframe: 'overdue',
      type: 'demo',
      tags: [
        { label: 'Demo Follow-up', class: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
        { label: 'DEMO', class: 'bg-purple-50 text-purple-700 border-purple-200' }
      ],
      note: 'Attended CPC demo yesterday, liked trainer. Push for fee discussion.',
      assigned: 'Kavitha'
    },
    {
      id: 'f4',
      name: 'Karthik V.',
      phone: '95xxxxxx48',
      badge: 'Today 2:00 PM',
      badgeClass: 'bg-amber-100 text-amber-900 font-bold',
      borderColor: 'border-l-purple-500',
      timeframe: 'today',
      type: 'demo',
      tags: [
        { label: 'Demo Confirm', class: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
        { label: 'DEMO', class: 'bg-purple-50 text-purple-700 border-purple-200' }
      ],
      note: 'Demo booked 4 PM today. Confirm attendance + send link.',
      assigned: 'Kavitha'
    },
    {
      id: 'f5',
      name: 'Divya P.',
      phone: '88xxxxxx12',
      badge: 'Today 4:30 PM',
      badgeClass: 'bg-amber-100 text-amber-900 font-bold',
      borderColor: 'border-l-teal-500',
      timeframe: 'today',
      type: 'fee',
      tags: [
        { label: 'Admission Follow-up', class: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
        { label: 'FEE', class: 'bg-amber-50 text-amber-800 border-amber-200' }
      ],
      note: 'Fee paid partial. Needs to bring documents to complete admission.',
      assigned: 'Kavitha'
    },
    {
      id: 'f6',
      name: 'Mohan B.',
      phone: '78xxxxxx33',
      badge: 'Tomorrow',
      badgeClass: 'bg-sky-100 text-sky-800 font-bold',
      borderColor: 'border-l-cyan-500',
      timeframe: 'tomorrow',
      type: 'general',
      tags: [
        { label: 'Reactivation', class: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
        { label: 'CONTACTED', class: 'bg-sky-50 text-sky-700 border-sky-200' }
      ],
      note: 'Cold lead from March. Re-engage with new batch + scholarship offer.',
      assigned: 'Kavitha'
    },
    {
      id: 'f7',
      name: 'Anitha S.',
      phone: '81xxxxxx76',
      badge: 'Tomorrow',
      badgeClass: 'bg-sky-100 text-sky-800 font-bold',
      borderColor: 'border-l-cyan-500',
      timeframe: 'tomorrow',
      type: 'general',
      tags: [
        { label: 'Parent Follow-up', class: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
        { label: 'INTERESTED', class: 'bg-amber-50 text-amber-800 border-amber-200' }
      ],
      note: 'Student keen, father wants to discuss placement guarantee.',
      assigned: 'Kavitha'
    },
    {
      id: 'f8',
      name: 'Ramesh K.',
      phone: '94xxxxxx19',
      badge: 'This week',
      badgeClass: 'bg-indigo-100 text-indigo-800 font-bold',
      borderColor: 'border-l-indigo-500',
      timeframe: 'this_week',
      type: 'demo',
      tags: [
        { label: 'Demo Follow-up', class: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
        { label: 'INTERESTED', class: 'bg-amber-50 text-amber-800 border-amber-200' }
      ],
      note: 'Wants to see one more demo before deciding. Book for Thursday.',
      assigned: 'Kavitha'
    }
  ];

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
