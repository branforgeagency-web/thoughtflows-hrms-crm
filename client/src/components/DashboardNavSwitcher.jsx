import React, { useState, useRef, useEffect } from 'react';
import { 
  Crown, 
  Users, 
  GraduationCap, 
  Briefcase, 
  Megaphone, 
  Settings, 
  BookOpen, 
  ChevronDown, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const ALL_DASHBOARDS = [
  {
    id: 'leadership',
    label: 'Leadership Hub',
    badge: 'CONTROL',
    role: 'Operational & Department Heads',
    icon: Crown,
    accent: 'bg-indigo-600',
    hoverBorder: 'hover:border-indigo-400',
    badgeColor: 'bg-indigo-100 text-indigo-700'
  },
  {
    id: 'hr',
    label: 'HR & Admissions',
    badge: 'LIVE',
    role: 'Leads, Calling & Enrolments',
    icon: Users,
    accent: 'bg-rose-600',
    hoverBorder: 'hover:border-rose-400',
    badgeColor: 'bg-rose-100 text-rose-700'
  },
  {
    id: 'training',
    label: 'Training & Faculty',
    badge: 'ACADEMIC',
    role: 'Batches, Attendance & Scores',
    icon: GraduationCap,
    accent: 'bg-sky-600',
    hoverBorder: 'hover:border-sky-400',
    badgeColor: 'bg-sky-100 text-sky-700'
  },
  {
    id: 'cccp',
    label: 'CCCP & Placement',
    badge: 'CAREER',
    role: 'Colleges, Companies & Hiring',
    icon: Briefcase,
    accent: 'bg-emerald-600',
    hoverBorder: 'hover:border-emerald-400',
    badgeColor: 'bg-emerald-100 text-emerald-700'
  },
  {
    id: 'marketing',
    label: 'Marketing & Growth',
    badge: 'DEMAND',
    role: 'Campaigns, Ads & CPL ROI',
    icon: Megaphone,
    accent: 'bg-amber-600',
    hoverBorder: 'hover:border-amber-400',
    badgeColor: 'bg-amber-100 text-amber-700'
  },
  {
    id: 'admin',
    label: 'Admin & Management',
    badge: 'GOVERNANCE',
    role: 'Settings, Slates, Fees & Audits',
    icon: Settings,
    accent: 'bg-violet-600',
    hoverBorder: 'hover:border-violet-400',
    badgeColor: 'bg-violet-100 text-violet-700'
  },
  {
    id: 'student',
    label: 'Student Portal',
    badge: 'PORTAL',
    role: 'Learning, Tests & LMS Access',
    icon: BookOpen,
    accent: 'bg-teal-600',
    hoverBorder: 'hover:border-teal-400',
    badgeColor: 'bg-teal-100 text-teal-700'
  }
];

export default function DashboardNavSwitcher({
  currentDepartment = 'leadership',
  onSwitchDepartment,
  lightTheme = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!onSwitchDepartment) return null;

  const activeDashboard = ALL_DASHBOARDS.find(d => d.id === currentDepartment) || ALL_DASHBOARDS[0];
  const ActiveIcon = activeDashboard.icon;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer border ${
          lightTheme
            ? 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            : 'bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/40 backdrop-blur-md'
        }`}
        title="Switch to another operational dashboard"
      >
        <span className={`w-2 h-2 rounded-full ${activeDashboard.accent}`} />
        <ActiveIcon className="w-3.5 h-3.5 opacity-90" />
        <span className="truncate max-w-[140px] sm:max-w-none">{activeDashboard.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-80 rounded-2xl bg-white shadow-2xl border border-slate-200/90 py-2.5 z-50 animate-fadeIn">
          <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Connected Dashboards
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <Sparkles className="w-2.5 h-2.5" /> 100% Live MongoDB
            </span>
          </div>

          <div className="max-h-[360px] overflow-y-auto p-1.5 space-y-1">
            {ALL_DASHBOARDS.map((d) => {
              const Icon = d.icon;
              const isCurrent = d.id === currentDepartment;
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    setIsOpen(false);
                    if (!isCurrent) {
                      onSwitchDepartment(d.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                    isCurrent
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : `bg-white hover:bg-slate-50 text-slate-700 border-transparent ${d.hoverBorder}`
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white ${d.accent}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold truncate ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                          {d.label}
                        </span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md ${
                          isCurrent ? 'bg-white/20 text-white' : d.badgeColor
                        }`}>
                          {d.badge}
                        </span>
                      </div>
                      <p className={`text-[10px] truncate mt-0.5 ${isCurrent ? 'text-slate-300' : 'text-slate-400 font-medium'}`}>
                        {d.role}
                      </p>
                    </div>
                  </div>

                  {isCurrent ? (
                    <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 bg-white/10 rounded-full flex-shrink-0">
                      Current
                    </span>
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
