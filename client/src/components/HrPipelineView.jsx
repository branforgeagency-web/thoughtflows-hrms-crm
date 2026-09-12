import React, { useState } from 'react';
import { 
  Phone, 
  MessageSquare, 
  Clock, 
  Headphones, 
  Filter, 
  CheckCircle2, 
  Sparkles, 
  BookOpen, 
  ExternalLink,
  ChevronRight,
  Search,
  UserPlus
} from 'lucide-react';

export default function HrPipelineView({ onOpenCatalog }) {
  const [activeFilter, setActiveFilter] = useState('all'); // all, calls, overdue, audits
  const [actionNotice, setActionNotice] = useState(null);
  const [showCatalogModal, setShowCatalogModal] = useState(false);

  const triggerAction = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Pipeline columns data matching screenshot
  const PIPELINE_COLUMNS = [
    {
      id: 'new',
      title: 'NEW',
      count: 12,
      dotColor: 'bg-slate-900',
      cards: [
        {
          id: 'p1',
          name: 'Priya R.',
          isNew: true,
          sub: '98•••• 12345 · 24F',
          source: 'GOOGLE CALLS',
          sourceClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
          hasActions: true,
          phone: '+91 98765 12345',
          category: 'calls'
        },
        {
          id: 'p2',
          name: 'Manoj K.',
          isNew: true,
          sub: '97•••• 67890 · 23M',
          source: 'JUSTDIAL',
          sourceClass: 'bg-amber-50 text-amber-800 border-amber-200',
          hasActions: true,
          phone: '+91 97890 67890',
          category: 'calls'
        },
        {
          id: 'p3',
          name: 'Keerthana S.',
          isNew: false,
          sub: '94•••• 44321 · 22F',
          source: 'WEBSITE INQUIRY',
          sourceClass: 'bg-teal-50 text-teal-800 border-teal-200',
          hasActions: false,
          category: 'all'
        }
      ]
    },
    {
      id: 'contacted',
      title: 'CONTACTED',
      count: 18,
      dotColor: 'bg-slate-900',
      cards: [
        {
          id: 'c1',
          name: 'Karthik V.',
          sub: 'FU1 due today · BCom',
          source: 'DIRECT',
          sourceClass: 'bg-blue-50 text-blue-700 border-blue-200',
          category: 'calls'
        },
        {
          id: 'c2',
          name: 'Divya M.',
          sub: 'FU2 · interested · 26F',
          source: 'FACEBOOK',
          sourceClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          category: 'all'
        },
        {
          id: 'c3',
          name: 'Arun S.',
          sub: 'Overdue by 2 hours · 25M',
          source: 'GOOGLE ADS',
          sourceClass: 'bg-rose-50 text-rose-700 border-rose-200',
          category: 'overdue'
        }
      ]
    },
    {
      id: 'pitched',
      title: 'PITCHED',
      count: 9,
      dotColor: 'bg-slate-900',
      cards: [
        {
          id: 'pi1',
          name: 'Sneha P.',
          sub: 'Budget OK · weekend',
          source: 'REFERRAL',
          sourceClass: 'bg-teal-50 text-teal-700 border-teal-200',
          category: 'audits'
        },
        {
          id: 'pi2',
          name: 'Rajesh K.',
          sub: 'Family discussion',
          source: 'INSTAGRAM',
          sourceClass: 'bg-pink-50 text-pink-700 border-pink-200',
          category: 'all'
        },
        {
          id: 'pi3',
          name: 'Nandhini T.',
          sub: 'Syllabus reviewed · CPC Intro',
          source: 'LINKEDIN',
          sourceClass: 'bg-sky-50 text-sky-700 border-sky-200',
          category: 'audits'
        }
      ]
    },
    {
      id: 'demo',
      title: 'DEMO',
      count: 5,
      dotColor: 'bg-slate-900',
      cards: [
        {
          id: 'd1',
          name: 'Lakshmi N.',
          sub: 'Today 14:30 · Online',
          source: 'GOOGLE',
          sourceClass: 'bg-blue-50 text-blue-700 border-blue-200',
          category: 'calls'
        },
        {
          id: 'd2',
          name: 'Vignesh S.',
          sub: 'Tomorrow 11:00 · SV',
          source: 'WALK-IN',
          sourceClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
          category: 'all'
        },
        {
          id: 'd3',
          name: 'Swetha R.',
          sub: 'Scheduled 17:00 · Offline',
          source: 'SEMINAR',
          sourceClass: 'bg-purple-50 text-purple-700 border-purple-200',
          category: 'overdue'
        }
      ]
    },
    {
      id: 'converted',
      title: 'CONVERTED ✓',
      count: 23,
      dotColor: 'bg-emerald-600',
      isConvertedCol: true,
      cards: [
        {
          id: 'co1',
          name: 'Pooja R. ✓',
          sub: 'CPC Inter · ₹21K paid',
          source: 'JUST ADMITTED',
          sourceClass: 'bg-white text-emerald-800 border-emerald-300 font-bold',
          isAdmitted: true,
          category: 'all'
        },
        {
          id: 'co2',
          name: 'Ananya M. ✓',
          sub: 'CPC Prep · ₹25K paid',
          source: 'JUST ADMITTED',
          sourceClass: 'bg-white text-emerald-800 border-emerald-300 font-bold',
          isAdmitted: true,
          category: 'all'
        },
        {
          id: 'co3',
          name: 'Siddharth K. ✓',
          sub: 'Medical Terminology · Full Paid',
          source: 'BATCH ALLOCATED',
          sourceClass: 'bg-white text-teal-800 border-teal-300 font-bold',
          isAdmitted: true,
          category: 'all'
        }
      ]
    }
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

      {/* Page Title & Subtitle */}
      <div className="pt-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          My <span className="text-[#00897b]">Pipeline</span>
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1 font-mono">
          47 active leads · all stages, all daily tasks, all demos — one screen, filter by stage or task
        </p>
      </div>

      {/* Filter Buttons row ("SHOW") */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mr-1 select-none">
          SHOW
        </span>

        {/* All Leads */}
        <button
          onClick={() => setActiveFilter('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeFilter === 'all'
              ? 'bg-[#7c3aed] text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>All Leads</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
            activeFilter === 'all' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            47
          </span>
        </button>

        {/* Today's Calls */}
        <button
          onClick={() => setActiveFilter('calls')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeFilter === 'calls'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'bg-[#e6fffa] text-[#00796b] border border-teal-200 hover:bg-teal-100/60'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Today's Calls</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
            activeFilter === 'calls' ? 'bg-white/25 text-white' : 'bg-teal-100 text-[#00695c]'
          }`}>
            12
          </span>
        </button>

        {/* Overdue */}
        <button
          onClick={() => setActiveFilter('overdue')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeFilter === 'overdue'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-[#fee2e2] text-[#dc2626] border border-red-200 hover:bg-red-100/60'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Overdue</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
            activeFilter === 'overdue' ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-800'
          }`}>
            3
          </span>
        </button>

        {/* Call Audits */}
        <button
          onClick={() => setActiveFilter('audits')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeFilter === 'audits'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'bg-[#f3e8ff] text-[#7e22ce] border border-purple-200 hover:bg-purple-100/60'
          }`}
        >
          <Headphones className="w-3.5 h-3.5" />
          <span>Call Audits</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
            activeFilter === 'audits' ? 'bg-white/25 text-white' : 'bg-purple-100 text-purple-900'
          }`}>
            8
          </span>
        </button>
      </div>

      {/* 1. Pipeline at a glance Strip */}
      <div className="space-y-1">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider pl-0.5">
          Pipeline at a glance
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-2 sm:p-2.5 shadow-xs grid grid-cols-5 gap-2 items-center">
          {/* NEW */}
          <div className="flex items-center justify-between px-3 py-2 border-r border-slate-100">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 tracking-wider">NEW</span>
            <span className="text-lg sm:text-2xl font-black text-slate-900">12</span>
          </div>
          {/* CONTACTED */}
          <div className="flex items-center justify-between px-3 py-2 border-r border-slate-100">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 tracking-wider">CONTACTED</span>
            <span className="text-lg sm:text-2xl font-black text-slate-900">18</span>
          </div>
          {/* PITCHED */}
          <div className="flex items-center justify-between px-3 py-2 border-r border-slate-100">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 tracking-wider">PITCHED</span>
            <span className="text-lg sm:text-2xl font-black text-slate-900">9</span>
          </div>
          {/* DEMO */}
          <div className="flex items-center justify-between px-3 py-2 border-r border-slate-100">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 tracking-wider">DEMO</span>
            <span className="text-lg sm:text-2xl font-black text-slate-900">5</span>
          </div>
          {/* CONVERTED (mint highlighted card) */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#dcfce7] rounded-xl border border-emerald-200/60 shadow-xs">
            <span className="text-[10px] sm:text-xs font-bold text-[#15803d] tracking-wider">CONVERTED</span>
            <span className="text-lg sm:text-2xl font-black text-[#15803d]">23</span>
          </div>
        </div>
      </div>

      {/* 2. What leads called for Strip */}
      <div className="space-y-1">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider pl-0.5">
          What leads called for
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-2 sm:p-2.5 shadow-xs grid grid-cols-4 gap-2 sm:gap-4 items-center">
          {/* DEMO */}
          <div className="flex items-center justify-between px-3.5 py-2 border-l-4 border-[#7c3aed] bg-purple-50/20 rounded-r-lg">
            <span className="text-[10px] sm:text-xs font-bold text-purple-700 tracking-wider">DEMO</span>
            <span className="text-lg sm:text-2xl font-black text-slate-900">14</span>
          </div>
          {/* REGISTRATION */}
          <div className="flex items-center justify-between px-3.5 py-2 border-l-4 border-[#f97316] bg-amber-50/20 rounded-r-lg">
            <span className="text-[10px] sm:text-xs font-bold text-amber-700 tracking-wider">REGISTRATION</span>
            <span className="text-lg sm:text-2xl font-black text-slate-900">9</span>
          </div>
          {/* ADMISSION */}
          <div className="flex items-center justify-between px-3.5 py-2 border-l-4 border-[#10b981] bg-emerald-50/20 rounded-r-lg">
            <span className="text-[10px] sm:text-xs font-bold text-emerald-700 tracking-wider">ADMISSION</span>
            <span className="text-lg sm:text-2xl font-black text-slate-900">7</span>
          </div>
          {/* ENQUIRY */}
          <div className="flex items-center justify-between px-3.5 py-2 border-l-4 border-slate-400 bg-slate-50/40 rounded-r-lg">
            <span className="text-[10px] sm:text-xs font-bold text-slate-600 tracking-wider">ENQUIRY</span>
            <span className="text-lg sm:text-2xl font-black text-slate-900">17</span>
          </div>
        </div>
      </div>

      {/* 3. 5-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 pt-2">
        {PIPELINE_COLUMNS.map((col) => {
          const visibleCards = activeFilter === 'all'
            ? col.cards
            : col.cards.filter(c => c.category === activeFilter || c.category === 'all');

          return (
            <div key={col.id} className="flex flex-col space-y-2.5">
              {/* Column Header */}
              <div className="flex items-center justify-between px-1 pb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`}></span>
                  <span className="text-xs font-extrabold text-slate-800 tracking-wider uppercase">
                    {col.title}
                  </span>
                </div>
                <span className="text-sm font-black text-slate-900">
                  {col.count}
                </span>
              </div>

              {/* Cards in this column */}
              <div className="space-y-2.5 min-h-[420px]">
                {visibleCards.map((card) => {
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
                        </div>

                        <div className="text-[11px] text-emerald-800 font-medium mt-1">
                          {card.sub}
                        </div>

                        <div className="mt-2.5">
                          <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md border ${card.sourceClass}`}>
                            {card.source}
                          </span>
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
                      <div className="flex items-start justify-between">
                        <div className="font-extrabold text-slate-900 text-[13px]">
                          {card.name}
                        </div>
                        {card.isNew && (
                          <span className="bg-[#00897b] text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide">
                            NEW
                          </span>
                        )}
                      </div>

                      {/* Sub info */}
                      <div className="text-[11px] text-slate-500 font-mono mt-1">
                        {card.sub}
                      </div>

                      {/* Source Tag */}
                      <div className="mt-2">
                        <span className={`inline-block text-[9.5px] font-bold px-2 py-0.5 rounded-md border tracking-wider uppercase ${card.sourceClass}`}>
                          {card.source}
                        </span>
                      </div>

                      {/* Action Buttons for leads (Call & WhatsApp) */}
                      {card.hasActions && (
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-1 border-t border-slate-100">
                          <button
                            onClick={() => triggerAction(`Initiating call with ${card.name} (${card.phone})`)}
                            className="bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 shadow-xs transition-all active:scale-95"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Call</span>
                          </button>
                          <button
                            onClick={() => triggerAction(`Opening WhatsApp chat with ${card.name}`)}
                            className="bg-[#25d366] hover:bg-[#20bd5a] text-white font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 shadow-xs transition-all active:scale-95"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Floating "Course Catalog" Pill (shown at bottom of Column 1) */}
                {col.id === 'new' && (
                  <button
                    onClick={() => setShowCatalogModal(true)}
                    className="w-full flex items-center justify-center gap-1.5 bg-[#fef3c7] hover:bg-[#fde68a] text-[#92400e] border border-amber-300 font-bold text-xs py-2 px-3 rounded-full shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <span>💡</span>
                    <span>Course Catalog</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Course Catalog Interactive Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-amber-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💡</span>
                <h3 className="font-extrabold text-slate-900 text-base">Thoughtflows Medical Coding Catalog</h3>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200">
                <div className="font-bold text-teal-950 text-sm">CPC Intensive (AAPC Certified)</div>
                <div className="text-teal-700 mt-0.5">Duration: 3 Months • Anatomy, ICD-10-CM, CPT, HCPCS Level II</div>
                <div className="text-teal-900 font-black mt-1">Fee: ₹25,000 (Installments available)</div>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200">
                <div className="font-bold text-purple-950 text-sm">Comprehensive Medical Coding + Live Hospital Internship</div>
                <div className="text-purple-700 mt-0.5">Duration: 4.5 Months • US Healthcare RCM + Live EHR charting</div>
                <div className="text-purple-900 font-black mt-1">Fee: ₹32,000 (100% Placement Guarantee)</div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="font-bold text-amber-950 text-sm">Fast-Track Weekend Batch for Life Science Graduates</div>
                <div className="text-amber-700 mt-0.5">Duration: 8 Weeks • Saturday & Sunday • Mock Tests & AAPC Exam Prep</div>
                <div className="text-amber-900 font-black mt-1">Fee: ₹21,000</div>
              </div>
            </div>

            <button
              onClick={() => setShowCatalogModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all"
            >
              Close Catalog
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
