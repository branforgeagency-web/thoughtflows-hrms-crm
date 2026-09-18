import React from 'react';
import { Layers, CheckCircle2, Award, Zap } from 'lucide-react';

export default function TrainingSkillsCourses() {
  const skills = [
    { name: 'CPT Coding', level: 'L4', percentage: 100, levelStyle: 'bg-[#f3e8ff] text-[#7e22ce]' },
    { name: 'ICD-10-CM', level: 'L4', percentage: 100, levelStyle: 'bg-[#f3e8ff] text-[#7e22ce]' },
    { name: 'CPC Exam Prep', level: 'L3', percentage: 78, levelStyle: 'bg-[#e0f2fe] text-[#0284c7]' },
    { name: 'E/M Coding', level: 'L3', percentage: 75, levelStyle: 'bg-[#e0f2fe] text-[#0284c7]' },
    { name: 'Surgery Coding', level: 'L3', percentage: 72, levelStyle: 'bg-[#e0f2fe] text-[#0284c7]' },
    { name: 'Anatomy & Terminology', level: 'L2', percentage: 55, levelStyle: 'bg-[#eff6ff] text-[#2563eb]' },
    { name: 'HCPCS Level II', level: 'L2', percentage: 50, levelStyle: 'bg-[#eff6ff] text-[#2563eb]' },
    { name: 'Medical Billing & RCM', level: 'L1', percentage: 28, levelStyle: 'bg-[#fef3c7] text-[#d97706]' }
  ];

  const eligibility = [
    { label: 'Mock interview', value: 'Yes ✓' },
    { label: 'Technical round evaluation', value: 'Yes ✓' },
    { label: 'Communication training', value: 'Yes ✓' }
  ];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn text-slate-800">
      
      {/* CARD 1: SKILL & COURSE MAPPING */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-bold text-base">🧩</span>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Skill & Course Mapping
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            L1 Assistant · L2 Regular · L3 Senior · L4 Lead. You can be allocated to a subject only at L2 or above.
          </p>
        </div>

        {/* Skills Progress Bar List */}
        <div className="space-y-4 pt-2">
          {skills.map(skill => (
            <div key={skill.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">{skill.name}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${skill.levelStyle}`}>
                  {skill.level}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#005f60] rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${skill.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CARD 2: SPECIAL ELIGIBILITY */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
        <div className="pb-1">
          <h2 className="text-sm font-bold text-slate-900">Special Eligibility</h2>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {eligibility.map(item => (
            <div key={item.label} className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-slate-500 font-medium">{item.label}</span>
              <span className="font-semibold text-slate-900 text-right">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
