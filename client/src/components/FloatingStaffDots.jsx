import React from 'react';

// Exact floating avatar nodes from the reference screenshot
const STAFF_NODES = [
  { id: 1, initials: 'PJ', name: 'Pooja J.', dept: 'Admissions Lead', top: '3%', left: '3.5%', bg: 'bg-[#1e824c]', delay: '0s', dur: '6s' },
  { id: 2, initials: 'VC', name: 'Dr. Vikram C.', dept: 'Academic Director', top: '2.5%', left: '13.5%', bg: 'bg-[#ca8a04]', delay: '1s', dur: '7s' },
  { id: 3, initials: 'SV', name: 'Suresh V.', dept: 'Exam Cell Head', top: '2%', left: '38%', bg: 'bg-[#ec4899]', delay: '2s', dur: '5.5s' },
  { id: 4, initials: 'PR', name: 'Priya R.', dept: 'Student Mentorship', top: '12%', left: '14.5%', bg: 'bg-[#8b5cf6]', delay: '1.5s', dur: '6.5s' },
  { id: 5, initials: 'SR', name: 'Sandhya R.', dept: 'Faculty - ICD-10', top: '38%', left: '6%', bg: 'bg-[#a855f7]', delay: '0.5s', dur: '8s' },
  { id: 6, initials: 'VG', name: 'Vijay G.', dept: 'Branch Coordinator', top: '49%', left: '2.5%', bg: 'bg-[#ea580c]', delay: '2.5s', dur: '6s' },
  { id: 7, initials: 'GN', name: 'Ganesh N.', dept: 'Branch Manager - Guindy', top: '56%', left: '7.8%', bg: 'bg-[#2563eb]', delay: '3s', dur: '7.5s' },
  { id: 8, initials: 'MR', name: 'Meenakshi R.', dept: 'Corporate Relations', top: '41.5%', left: '33.8%', bg: 'bg-[#c2410c]', delay: '1.2s', dur: '5s' },
  { id: 9, initials: 'SH', name: 'Sneha H.', dept: 'Medical Terminology', top: '43.5%', left: '28.8%', bg: 'bg-[#0284c7]', delay: '2.8s', dur: '6.8s' },
  { id: 10, initials: 'RV', name: 'Raghav V.', dept: 'Student Mentor', top: '65%', left: '23%', bg: 'bg-[#b45309]', delay: '3.2s', dur: '7s' },
  { id: 11, initials: 'BR', name: 'Balaji R.', dept: 'Talent Acquisition', top: '73%', left: '34.8%', bg: 'bg-[#b45309]', delay: '0.8s', dur: '6.2s' },
  { id: 12, initials: 'DM', name: 'Deepa M.', dept: 'Quality & Audit', top: '58%', left: '70%', bg: 'bg-[#854d0e]', delay: '1.7s', dur: '6.8s' },
  { id: 13, initials: 'KV', name: 'Kavitha V.', dept: 'Finance Officer', top: '80%', left: '60.8%', bg: 'bg-[#db2777]', delay: '2.1s', dur: '7.2s' },
  { id: 14, initials: 'KV', name: 'Kiran V.', dept: 'Corporate Trainer', top: '70%', left: '76.8%', bg: 'bg-[#9a3412]', delay: '3.5s', dur: '5.8s' },
  { id: 15, initials: 'DP', name: 'Dinesh P.', dept: 'IT Systems Head', top: '72%', left: '79.6%', bg: 'bg-[#d97706]', delay: '1.4s', dur: '6.4s' },
  { id: 16, initials: 'DP', name: 'Divya P.', dept: 'Placement Executive', top: '78%', left: '72%', bg: 'bg-[#ca8a04]', delay: '2.6s', dur: '7.1s' },
  { id: 17, initials: 'RV', name: 'Rohit V.', dept: 'AAPC CPC Mentor', top: '71%', left: '94%', bg: 'bg-[#a16207]', delay: '0.9s', dur: '8.2s' },
];

export default function FloatingStaffDots({ onNodeClick }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {STAFF_NODES.map((node) => (
        <div
          key={node.id}
          style={{
            top: node.top,
            left: node.left,
            animationDelay: node.delay,
            animationDuration: node.dur,
          }}
          className="absolute pointer-events-auto group animate-float-slow transition-transform hover:scale-125 hover:z-30 cursor-pointer"
          onClick={() => onNodeClick && onNodeClick(node)}
        >
          {/* Avatar Dot */}
          <div
            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full ${node.bg} bg-opacity-80 backdrop-blur-sm border border-white/40 flex items-center justify-center text-[10px] sm:text-[11px] font-bold text-white shadow-lg shadow-black/20 ring-2 ring-white/10 transition-all group-hover:ring-teal-300/60 group-hover:shadow-teal-400/30`}
          >
            {node.initials}
          </div>

          {/* Hover Tooltip card */}
          <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 absolute left-1/2 -translate-x-1/2 bottom-full mb-2 whitespace-nowrap z-50 bg-slate-900/90 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg border border-teal-500/30 shadow-xl">
            <div className="font-semibold text-teal-300">{node.name}</div>
            <div className="text-[10px] text-slate-300">{node.dept}</div>
            <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-r border-b border-teal-500/30"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
