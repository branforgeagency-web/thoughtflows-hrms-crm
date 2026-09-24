import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck, Mail, Phone, Calendar, Award } from 'lucide-react';

export default function TrainingMyProfile({
  currentUser = {}
}) {
  const trainerName = currentUser?.userName || currentUser?.name || 'Faculty Member';
  const trainerId = currentUser?.trainerId || currentUser?.id || currentUser?._id || 'TR-FACULTY';
  const trainerRole = currentUser?.role || 'Medical Coding Faculty';
  const trainerBranch = currentUser?.branch || 'Gandhipuram';
  const trainerEmail = currentUser?.email || (currentUser?.username ? `${currentUser.username}@thoughtflows.in` : 'faculty@thoughtflows.in');
  const trainerShift = currentUser?.shift || '6:00 AM – 2:00 PM';
  const trainerCourse = currentUser?.courseKey || (
    currentUser?.role?.includes('CIC') ? 'CIC' :
    currentUser?.role?.includes('CPB') ? 'CPB' :
    currentUser?.role?.includes('CPMA') ? 'CPMA' :
    currentUser?.role?.includes('CRC') ? 'CRC' :
    currentUser?.role?.includes('CPC') ? 'CPC' :
    'CPC'
  );

  const certifications = trainerCourse === 'CIC' 
    ? ['CIC', 'AAPC Certified', 'ICD-10-PCS Expert', 'IPDRG Specialist']
    : trainerCourse === 'CPB'
    ? ['CPB', 'RCM Professional', 'HIPAA Certified', 'Hospital Billing Specialist']
    : trainerCourse === 'CPMA'
    ? ['CPMA', 'Chart Auditor', 'Compliance Officer', 'AAPC Member']
    : trainerCourse === 'CRC'
    ? ['CRC', 'COC', 'CPC-I (Instructor)', 'Fellow AAPC']
    : ['CPC', 'CCS', 'AAPC Approved Instructor', 'ICD-10-CM Specialist'];

  const identityDetails = [
    { label: 'Trainer ID', value: trainerId },
    { label: 'Assigned Branch', value: trainerBranch },
    { label: 'Shift Timing', value: trainerShift },
    { label: 'Email', value: trainerEmail },
    { label: 'Role & Title', value: trainerRole },
    { label: 'Teaching Domain', value: currentUser?.expertCourse || `${trainerCourse} Certification Specialist` },
    { label: 'Access Level', value: 'Authorized Faculty & Demo Specialist' }
  ];

  const teachingDetails = [
    { 
      label: 'Primary Course', 
      value: trainerCourse === 'CIC' ? 'CIC — Certified Inpatient Coder & IPDRG' :
             trainerCourse === 'CPB' ? 'CPB — Certified Professional Biller & RCM' :
             trainerCourse === 'CPMA' ? 'CPMA — Certified Professional Medical Auditor' :
             trainerCourse === 'CRC' ? 'CRC — Risk Adjustment & Outpatient Services' :
             'CPC — Certified Professional Coder (Anatomy, ICD-10-CM, CPT Surgery)'
    },
    { label: 'Shift Availability', value: trainerShift },
    { label: 'Demo Auto-Routing', value: 'Designated 1st Priority Course Expert ✓' },
    { label: 'Notification Status', value: 'Active (Sent when inside shift & no class conflict)' },
    { label: 'Max Sessions / Day', value: '4 Sessions Protection' }
  ];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn text-slate-800 max-w-[1200px]">
      
      {/* TOP PROFILE HEADER */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-[#0284c7] text-white flex items-center justify-center font-black text-2xl shadow-sm shrink-0">
          {trainerName.charAt(0)}
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
            {trainerName}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {trainerId} · {trainerRole} · {trainerBranch}
          </p>
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            {certifications.map(cert => (
              <span
                key={cert}
                className="px-2.5 py-0.5 rounded-full bg-[#f3e8ff] text-[#7e22ce] text-[10px] font-bold tracking-wide"
              >
                {cert}
              </span>
            ))}
            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-bold border border-teal-200">
              Shift: {trainerShift}
            </span>
          </div>
        </div>
      </div>

      {/* CARD 1: IDENTITY */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Faculty Identity Details</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-100">
            Active Faculty Roster
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {identityDetails.map(item => (
            <div key={item.label} className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-slate-500 font-medium">{item.label}</span>
              <span className="font-semibold text-slate-900 text-right">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CARD 2: TEACHING & DEMOS */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4">
        <div className="pb-1 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Teaching Scope & Demo Routing</h2>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {teachingDetails.map(item => (
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
