import React from 'react';

const LEVEL_PCT = { L1: 25, L2: 50, L3: 75, L4: 100 };
const LEVEL_STYLE = {
  L4: 'bg-[#f3e8ff] text-[#7e22ce]',
  L3: 'bg-[#e0f2fe] text-[#0284c7]',
  L2: 'bg-[#eff6ff] text-[#2563eb]',
  L1: 'bg-[#fef3c7] text-[#d97706]'
};

// Skill matrix & special eligibility come from the Trainer roster record
export default function TrainingSkillsCourses({ trainer }) {
  const skills = (Array.isArray(trainer?.skills) ? trainer.skills : [])
    .filter(s => s && s.name)
    .sort((a, b) => String(b.level).localeCompare(String(a.level)));
  const eligibility = Array.isArray(trainer?.specialEligibility) ? trainer.specialEligibility : [];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn text-slate-800">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-bold text-base">🧩</span>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Skill & Course Mapping</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            L1 Assistant · L2 Regular · L3 Senior · L4 Lead. You can be allocated to a subject only at L2 or above.
          </p>
        </div>

        {skills.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">No skills mapped yet. Admin maps skill levels in Trainer Settings.</div>
        ) : (
          <div className="space-y-4 pt-2">
            {skills.map(skill => {
              const level = String(skill.level || '').toUpperCase();
              return (
                <div key={skill.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{skill.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${LEVEL_STYLE[level] || 'bg-slate-100 text-slate-600'}`}>{level || '—'}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#005f60] rounded-full transition-all duration-700 ease-out" style={{ width: `${LEVEL_PCT[level] || 0}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Special Eligibility</h2>
        {eligibility.length === 0 ? (
          <div className="py-3 text-xs text-slate-400">None recorded.</div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {eligibility.map(item => (
              <div key={item} className="py-2.5 flex items-center justify-between gap-4">
                <span className="text-slate-600 font-medium">{item}</span>
                <span className="font-semibold text-emerald-700">Eligible ✓</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
