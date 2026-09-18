import React from 'react';
import { 
  Users, 
  GraduationCap, 
  PenTool, 
  Volume2, 
  MapPin, 
  BookOpen, 
  Crown, 
  ArrowRight,
  Lock,
  CheckCircle2
} from 'lucide-react';

const DASHBOARD_CARDS = [
  {
    id: 'hr',
    title: 'HR Department',
    status: 'LIVE',
    statusColor: 'text-[#10b981]',
    statusDotBg: 'bg-[#10b981]',
    description: 'Academic counsellors who turn enquiries into futures · lead capture, calls, follow-ups & admissions',
    tag: '487 ACTIVE LEADS',
    tagStyle: 'bg-[#fee2e2]/70 text-[#ef4444] border-[#fecaca]',
    ctaText: 'ENTER DASHBOARD',
    ctaColor: 'text-[#ef4444] hover:text-[#dc2626]',
    iconGradient: 'from-[#ff5b5b] to-[#ee5253]',
    iconShadow: 'shadow-rose-500/20',
    cornerGlow: 'from-rose-50/40',
    icon: Users,
  },
  {
    id: 'training',
    title: 'Training Department',
    status: '3 LIVE',
    statusColor: 'text-[#0284c7]',
    statusDotBg: 'bg-[#0284c7]',
    description: 'Trainers across 12 branches running batches, attendance, assessments & mastery tracking',
    tag: '38 BATCHES · 42 TRAINERS',
    tagStyle: 'bg-[#e0f2fe]/70 text-[#0284c7] border-[#bae6fd]',
    ctaText: 'ENTER DASHBOARD',
    ctaColor: 'text-[#0284c7] hover:text-[#0369a1]',
    iconGradient: 'from-[#38bdf8] to-[#2563eb]',
    iconShadow: 'shadow-blue-500/20',
    cornerGlow: 'from-sky-50/40',
    icon: GraduationCap,
  },
  {
    id: 'cccp',
    title: 'CCCP Dashboard',
    status: '8 TODAY',
    statusColor: 'text-[#10b981]',
    statusDotBg: 'bg-[#10b981]',
    description: 'Placement Cell · Examination Cell · College & Company Cell — three cells, one career path',
    tag: '156 JOB-READY',
    tagStyle: 'bg-[#d1fae5]/70 text-[#059669] border-[#a7f3d0]',
    ctaText: 'OPEN 3 CELLS',
    ctaColor: 'text-[#059669] hover:text-[#047857]',
    iconGradient: 'from-[#34d399] to-[#059669]',
    iconShadow: 'shadow-emerald-500/20',
    cornerGlow: 'from-emerald-50/40',
    icon: PenTool,
  },
  {
    id: 'marketing',
    title: 'Marketing Department',
    status: 'ACTIVE',
    statusColor: 'text-[#10b981]',
    statusDotBg: 'bg-[#10b981]',
    description: 'Digital, outdoor & campaigns driving 100+ lead sources every month across all branches',
    tag: '377 LEADS · ₹174 CPL',
    tagStyle: 'bg-[#f3e8ff]/70 text-[#9333ea] border-[#e9d5ff]',
    ctaText: 'ENTER DASHBOARD',
    ctaColor: 'text-[#9333ea] hover:text-[#7e22ce]',
    iconGradient: 'from-[#c084fc] to-[#7c3aed]',
    iconShadow: 'shadow-purple-500/20',
    cornerGlow: 'from-purple-50/40',
    icon: Volume2,
  },
  {
    id: 'leadership',
    title: 'Leadership Hub',
    status: '4 ROLES',
    statusColor: 'text-[#f59e0b]',
    statusDotBg: 'bg-[#f59e0b]',
    description: 'All the heads in one place — Operational, Department, Regional & Branch. Open to pick your role.',
    tag: 'OPERATIONAL · DEPARTMENT · REGIONAL · BRANCH',
    tagStyle: 'bg-[#ffedd5]/70 text-[#ea580c] border-[#fed7aa]',
    ctaText: 'ENTER LEADERSHIP HUB',
    ctaColor: 'text-[#ea580c] hover:text-[#c2410c]',
    iconGradient: 'from-[#fb923c] to-[#ea580c]',
    iconShadow: 'shadow-orange-500/20',
    cornerGlow: 'from-amber-50/40',
    icon: MapPin,
  },
  {
    id: 'student',
    title: 'Student Dashboard',
    status: '247 ONLINE',
    statusColor: 'text-[#0d9488]',
    statusDotBg: 'bg-[#0d9488]',
    description: 'Students log in here to track attendance, syllabus, exam slot bookings, assignments & placement opportunities',
    tag: '2,563 ENROLLED · 156 READY',
    tagStyle: 'bg-[#ccfbf1]/70 text-[#0d9488] border-[#99f6e4]',
    ctaText: 'ENTER STUDENT PORTAL',
    ctaColor: 'text-[#0d9488] hover:text-[#0f766e]',
    iconGradient: 'from-[#22d3ee] to-[#0d9488]',
    iconShadow: 'shadow-teal-500/20',
    cornerGlow: 'from-teal-50/40',
    icon: BookOpen,
  },
  {
    id: 'admin',
    title: 'Admin & Management',
    status: '3 ALERTS',
    statusColor: 'text-[#10b981]',
    statusDotBg: 'bg-[#10b981]',
    description: "Founders' command bridge · back-office operations · strategy, red-line alerts & administration",
    tag: 'MTD —',
    tagStyle: 'bg-[#e0e7ff]/70 text-[#4338ca] border-[#c7d2fe]',
    ctaText: 'ENTER DASHBOARD',
    ctaColor: 'text-[#4338ca] hover:text-[#3730a3]',
    iconGradient: 'from-[#4f46e5] to-[#1e1b4b]',
    iconShadow: 'shadow-indigo-500/20',
    cornerGlow: 'from-indigo-50/40',
    icon: Crown,
  },
];

const CLAY_CARD_CLASSES = {
  hr: 'clay-card-hr',
  training: 'clay-card-training',
  cccp: 'clay-card-cccp',
  marketing: 'clay-card-marketing',
  leadership: 'clay-card-leadership',
  student: 'clay-card-student',
  admin: 'clay-card-admin',
};

export default function SevenDashboardsSection({ onSelectDashboard, currentUser, theme = 'clay' }) {
  const isClay = theme === 'clay';
  const rowOneCards = DASHBOARD_CARDS.slice(0, 4);
  const rowTwoCards = DASHBOARD_CARDS.slice(4);

  const renderCard = (card) => {
    const IconComponent = card.icon;
    const isAuthedForThisDept = currentUser && (currentUser.department === card.id || currentUser.department === 'admin');
    const clayDeptClass = CLAY_CARD_CLASSES[card.id] || 'clay-card-student';

    return (
      <div
        key={card.id}
        onClick={() => onSelectDashboard && onSelectDashboard(card)}
        className={`group relative flex flex-col justify-between p-6 sm:p-7 cursor-pointer overflow-hidden text-left transition-all duration-300 ${
          isClay
            ? `clay-card clay-card-interactive ${clayDeptClass} rounded-[28px]`
            : 'rounded-[24px] bg-white border border-[#e2f0ee] shadow-[0_8px_30px_rgba(7,55,52,0.04)] hover:shadow-[0_22px_48px_rgba(7,55,52,0.09)] hover:-translate-y-1.5'
        }`}
      >
        {/* Soft background glow */}
        <div 
          className={`absolute -top-16 -right-16 w-36 h-36 rounded-full bg-gradient-to-br ${card.cornerGlow} to-transparent pointer-events-none opacity-70 group-hover:scale-125 transition-transform duration-500`} 
        />

        {/* Card Header: Icon & Status Badge */}
        <div>
          <div className="flex items-center justify-between">
            {/* 3D Squircle Gradient Icon */}
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.iconGradient} flex items-center justify-center text-white transition-all duration-300 group-hover:scale-110 ${
              isClay ? 'clay-squircle' : `shadow-md ${card.iconShadow}`
            }`}>
              <IconComponent className="w-5 h-5 stroke-[2.2]" />
            </div>

            {/* Top Right Live / Active Status & Auth Indicator */}
            <div className="flex items-center gap-1.5">
              {isAuthedForThisDept ? (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9.5px] font-extrabold ${
                  isClay
                    ? 'clay-pill text-emerald-700 bg-emerald-50/80 border-emerald-200/80'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  LOGGED IN
                </span>
              ) : (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9.5px] font-bold ${
                  isClay
                    ? 'clay-pill text-slate-500 bg-slate-50/90 border-slate-200/80'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>
                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                  LOGIN REQUIRED
                </span>
              )}
              <div className={`flex items-center gap-1 text-[10px] font-extrabold tracking-wider ${card.statusColor} uppercase ml-1`}>
                <span className={`w-2 h-2 rounded-full ${card.statusDotBg} shadow-sm animate-pulse`} />
                <span>{card.status}</span>
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <h3 className="text-lg font-extrabold text-[#073734] mt-5 mb-2 group-hover:text-[#0b6b66] transition-colors">
            {card.title}
          </h3>
          <p className="text-[12.5px] text-[#557b77] leading-[1.65] mb-5 line-clamp-3">
            {card.description}
          </p>
        </div>

        {/* Card Footer: Metrics Tag & Action Arrow */}
        <div className="pt-2">
          {/* Pill Metric Tag */}
          <div className="mb-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide border transition-all ${
              isClay 
                ? `clay-pill ${card.tagStyle}` 
                : card.tagStyle
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
              <span>{card.tag}</span>
            </span>
          </div>

          {/* Action Link with Arrow */}
          <div className={`inline-flex items-center gap-1.5 text-xs font-extrabold tracking-wider uppercase ${card.ctaColor} transition-all duration-200 group-hover:gap-2.5 ${
            isClay ? 'py-1 px-2 -ml-2 rounded-lg' : ''
          }`}>
            <span>{isAuthedForThisDept ? 'ENTER NOW' : `LOGIN & ${card.ctaText}`}</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <section id="dashboards-section" className="relative z-20 w-full py-16 sm:py-20 lg:py-24 px-4 sm:px-8 md:px-12 lg:px-16">
      <div className="max-w-[1360px] mx-auto w-full">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          {/* Mini Pill Badge */}
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-4 transition-all ${
            isClay
              ? 'clay-pill clay-pill-mint'
              : 'bg-[#dcfce7]/60 border border-[#86efac]/70 backdrop-blur-sm'
          }`}>
            <span className="text-[10.5px] font-extrabold tracking-[0.22em] text-[#065f46] uppercase">
              SEVEN DASHBOARDS &nbsp;•&nbsp; ONE MISSION
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#073734] tracking-tight leading-[1.15]">
            Seven dashboards. <span className="text-[#009688]">One mission.</span>
          </h2>

          {/* Subtitle */}
          <p className="mt-4 text-xs sm:text-sm md:text-[15px] text-[#426a66] leading-relaxed">
            From the first lead to the first paycheck — seven dashboards for everyone who makes Thoughtflows run. Including the students themselves.
          </p>
        </div>

        {/* Row 1: 4 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {rowOneCards.map(renderCard)}
        </div>

        {/* Row 2: 3 Cards Centered (desktop: matching width of row 1) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 max-w-[1014px] mx-auto mt-5 lg:mt-6">
          {rowTwoCards.map(renderCard)}
        </div>
      </div>
    </section>
  );
}
