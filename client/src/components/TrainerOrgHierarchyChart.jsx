import React from 'react';
import { User, ChevronRight, Sparkles } from 'lucide-react';
import { TRAINER_HIERARCHY } from '../constants/trainerHierarchy';

export default function TrainerOrgHierarchyChart({ onSelectNode }) {
  const { head, managers, teamLeads } = TRAINER_HIERARCHY;

  const tlTN = teamLeads.find((t) => t.id === 'ram_balaji');
  const tlKL = teamLeads.find((t) => t.id === 'vaishna');
  const tlAP = teamLeads.find((t) => t.id === 'mounika');

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs overflow-x-auto select-none">
      {/* Header with Thoughtflows Academy Branding */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-xl px-2 py-1 shadow-xs border border-slate-100">
            <img src="/thoughtflows-logo.png" alt="Thoughtflows" className="h-8 w-auto object-contain" />
          </div>
          <div>
            <div className="text-xs font-black tracking-widest text-[#00897b] uppercase">NO:1 MEDICAL CODING ACADEMY</div>
            <div className="text-base font-extrabold text-slate-900 tracking-tight">Training Department Organization Hierarchy</div>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Click any role to enter its dashboard
        </div>
      </div>

      <div className="min-w-[960px] flex flex-col items-center">
        {/* Level 1: Head of Training Department (Manoj) */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => onSelectNode && onSelectNode({ roleType: 'head', id: 'manoj', name: 'Manoj' })}
            className="group relative flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-[#005a9c] hover:bg-[#004b82] text-white shadow-md transition-all hover:-translate-y-0.5 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-lg font-black tracking-tight leading-tight group-hover:text-blue-100">
                {head.name}
              </div>
              <div className="text-xs text-blue-100/90 font-medium">
                {head.role}
              </div>
            </div>
          </button>

          {/* Stem line down */}
          <div className="w-0.5 h-7 bg-slate-300"></div>

          {/* Horizontal crossbar to 2 Managers */}
          <div className="w-[58%] h-0.5 bg-slate-300 relative">
            {/* Left drop line */}
            <div className="absolute left-0 top-0 w-0.5 h-7 bg-slate-300"></div>
            {/* Right drop line */}
            <div className="absolute right-0 top-0 w-0.5 h-7 bg-slate-300"></div>
          </div>
        </div>

        {/* Level 2: Training Managers (Keerthi & Pavithra) */}
        <div className="w-full grid grid-cols-2 gap-10 mt-7">
          {/* Manager 1: Keerthi (TN / KL) */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => onSelectNode && onSelectNode({ roleType: 'manager', id: 'keerthi', name: 'Keerthi', zone: 'TN / KL' })}
              className="group flex items-center gap-3 px-7 py-3 rounded-2xl bg-[#00828a] hover:bg-[#006f76] text-white shadow-md transition-all hover:-translate-y-0.5 cursor-pointer w-[280px]"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <div className="text-base font-extrabold leading-tight">Keerthi</div>
                <div className="text-[11px] text-teal-100 font-medium">Training Manager (TN / KL)</div>
              </div>
            </button>

            {/* Stem line down */}
            <div className="w-0.5 h-6 bg-slate-300"></div>

            {/* Horizontal crossbar to Ram Balaji & Vaishna */}
            <div className="w-[82%] h-0.5 bg-slate-300 relative">
              <div className="absolute left-0 top-0 w-0.5 h-6 bg-slate-300"></div>
              <div className="absolute right-0 top-0 w-0.5 h-6 bg-slate-300"></div>
            </div>

            {/* Level 3 & 4 under Keerthi: 2 Columns (TN & KL) */}
            <div className="w-full grid grid-cols-2 gap-4 mt-6">
              {/* TL 1: Ram Balaji (TN) */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => onSelectNode && onSelectNode({ roleType: 'tl', id: 'ram_balaji', name: 'Ram Balaji', zone: 'TN' })}
                  className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#2e7d32] hover:bg-[#256628] text-white shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer w-full justify-center"
                >
                  <User className="w-4 h-4 text-white" />
                  <div className="text-left">
                    <div className="text-sm font-extrabold leading-tight">Ram Balaji</div>
                    <div className="text-[10.5px] text-emerald-100 font-medium">Team Lead (TN)</div>
                  </div>
                </button>

                <div className="w-0.5 h-4 bg-slate-300"></div>

                {/* 10 Trainers Card */}
                <div className="w-full bg-[#f0fdf4] border-2 border-[#bbf7d0] rounded-2xl p-3 shadow-xs">
                  <div className="w-full py-1 rounded-full bg-[#2e7d32] text-white text-[11px] font-black text-center uppercase tracking-wider mb-2.5 shadow-xs">
                    10 Trainers
                  </div>
                  <div className="space-y-1.5">
                    {tlTN?.trainers.map((t, idx) => (
                      <div
                        key={t.id}
                        onClick={() => onSelectNode && onSelectNode({ roleType: 'trainer', id: t.id, name: t.name })}
                        className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-emerald-100/60 transition-colors cursor-pointer text-xs font-semibold text-slate-800"
                      >
                        <span className="w-4 h-4 rounded-full bg-[#2e7d32] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate">{t.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* TL 2: Vaishna (KL) */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => onSelectNode && onSelectNode({ roleType: 'tl', id: 'vaishna', name: 'Vaishna', zone: 'KL' })}
                  className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer w-full justify-center"
                >
                  <User className="w-4 h-4 text-white" />
                  <div className="text-left">
                    <div className="text-sm font-extrabold leading-tight">Vaishna</div>
                    <div className="text-[10.5px] text-sky-100 font-medium">Team Lead (KL)</div>
                  </div>
                </button>

                <div className="w-0.5 h-4 bg-slate-300"></div>

                {/* 7 Trainers Card */}
                <div className="w-full bg-[#f0f9ff] border-2 border-[#bae6fd] rounded-2xl p-3 shadow-xs">
                  <div className="w-full py-1 rounded-full bg-[#0284c7] text-white text-[11px] font-black text-center uppercase tracking-wider mb-2.5 shadow-xs">
                    7 Trainers
                  </div>
                  <div className="space-y-1.5">
                    {tlKL?.trainers.map((t, idx) => (
                      <div
                        key={t.id}
                        onClick={() => onSelectNode && onSelectNode({ roleType: 'trainer', id: t.id, name: t.name })}
                        className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-sky-100/60 transition-colors cursor-pointer text-xs font-semibold text-slate-800"
                      >
                        <span className="w-4 h-4 rounded-full bg-[#0284c7] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate">{t.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Manager 2: Pavithra (AP / TS) */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => onSelectNode && onSelectNode({ roleType: 'manager', id: 'pavithra', name: 'Pavithra', zone: 'AP / TS' })}
              className="group flex items-center gap-3 px-7 py-3 rounded-2xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white shadow-md transition-all hover:-translate-y-0.5 cursor-pointer w-[280px]"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <div className="text-base font-extrabold leading-tight">Pavithra</div>
                <div className="text-[11px] text-purple-100 font-medium">Training Manager (AP / TS)</div>
              </div>
            </button>

            {/* Stem line down */}
            <div className="w-0.5 h-6 bg-slate-300"></div>

            {/* Direct vertical drop to Mounika */}
            <div className="w-full flex flex-col items-center mt-0.5 max-w-[280px]">
              {/* TL 3: Mounika (AP / TS) */}
              <button
                onClick={() => onSelectNode && onSelectNode({ roleType: 'tl', id: 'mounika', name: 'Mounika', zone: 'AP / TS' })}
                className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#be185d] hover:bg-[#9d174d] text-white shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer w-full justify-center"
              >
                <User className="w-4 h-4 text-white" />
                <div className="text-left">
                  <div className="text-sm font-extrabold leading-tight">Mounika</div>
                  <div className="text-[10.5px] text-pink-100 font-medium">Team Lead (AP / TS)</div>
                </div>
              </button>

              <div className="w-0.5 h-4 bg-slate-300"></div>

              {/* 8 Trainers Card */}
              <div className="w-full bg-[#fdf2f8] border-2 border-[#fbcfe8] rounded-2xl p-3 shadow-xs">
                <div className="w-full py-1 rounded-full bg-[#be185d] text-white text-[11px] font-black text-center uppercase tracking-wider mb-2.5 shadow-xs">
                  8 Trainers
                </div>
                <div className="space-y-1.5">
                  {tlAP?.trainers.map((t, idx) => (
                    <div
                      key={t.id}
                      onClick={() => onSelectNode && onSelectNode({ roleType: 'trainer', id: t.id, name: t.name })}
                      className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-pink-100/60 transition-colors cursor-pointer text-xs font-semibold text-slate-800"
                    >
                      <span className="w-4 h-4 rounded-full bg-[#be185d] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate">{t.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
