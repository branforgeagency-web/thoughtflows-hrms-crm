import React from 'react';

// Trainer profile — rendered only from the Trainer roster record managed by
// admin in Trainer Settings. Nothing here is derived or invented.
export default function TrainingMyProfile({ trainer, currentUser = {}, profileError = '' }) {
  const name = trainer?.trainerName || currentUser?.userName || currentUser?.name || '';
  const id = trainer?.trainerId || currentUser?.trainerId || '';
  const role = trainer?.role || trainer?.specialization || currentUser?.role || '';
  const branch = trainer?.branchName || currentUser?.branch || '';
  const email = trainer?.email || currentUser?.email || '';
  const certifications = Array.isArray(trainer?.certifications) ? trainer.certifications : [];

  const identityDetails = [
    ['Trainer ID', id],
    ['Branch', branch],
    ['Shift', trainer?.shift],
    ['Working days', trainer?.workingDays],
    ['Email', email],
    ['Role', role],
    ['Experience level', trainer?.experienceLevel]
  ];

  const teachingDetails = [
    ['Primary course', trainer?.expertCourse || trainer?.courseKey],
    ['Specialization', trainer?.specialization],
    ['Languages', (trainer?.languages || []).join(', ')],
    ['Demo trainer', trainer ? (trainer.demoTrainer ? 'Yes' : 'No') : ''],
    ['Receives demo bookings', trainer ? (trainer.active !== false ? 'Active' : 'Inactive') : ''],
    ['Max sessions / day', trainer?.maxSessionsPerDay ? String(trainer.maxSessionsPerDay) : ''],
    ['Class Zoom link', trainer?.classZoomLink ? 'Configured' : '']
  ];

  const Row = ([label, value]) => (
    <div key={label} className="py-2.5 flex items-center justify-between gap-4">
      <span className="text-slate-500 font-medium">{label}</span>
      <span className={`text-right ${value ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>{value || 'Not set'}</span>
    </div>
  );

  return (
    <div className="space-y-6 pb-12 animate-fadeIn text-slate-800 max-w-[1200px]">
      {profileError && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          {profileError}. Profile details are managed by admin in Trainer Settings.
        </div>
      )}

      <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-[#0284c7] text-white flex items-center justify-center font-black text-2xl shadow-sm shrink-0">
          {(name || '?').charAt(0)}
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">{name}</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{[id, role, branch].filter(Boolean).join(' · ')}</p>
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            {certifications.map(cert => (
              <span key={cert} className="px-2.5 py-0.5 rounded-full bg-[#f3e8ff] text-[#7e22ce] text-[10px] font-bold tracking-wide">{cert}</span>
            ))}
            {certifications.length === 0 && <span className="text-[11px] text-slate-400">No certifications recorded</span>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Faculty Identity Details</h2>
          {trainer && (
            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${trainer.active !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
              {trainer.active !== false ? 'Active' : 'Inactive'}
            </span>
          )}
        </div>
        <div className="divide-y divide-slate-100 text-xs">{identityDetails.map(Row)}</div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4">
        <div className="pb-1 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Teaching Scope & Demo Routing</h2>
        </div>
        <div className="divide-y divide-slate-100 text-xs">{teachingDetails.map(Row)}</div>
      </div>
    </div>
  );
}
