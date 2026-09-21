import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function PortalHero({ 
  onOpenDashboard, 
  onExploreDepartments, 
  theme = 'classic' 
}) {
  const isClay = theme === 'clay';

  return (
    <section className="relative z-20 w-full flex-1 flex flex-col justify-between px-6 sm:px-10 md:px-14 lg:px-16 pt-2 sm:pt-4 pb-8">
      {/* Single-column Hero: content anchored to the left — the right-side artwork lives in the banner background */}
      <div className="max-w-[1400px] mx-auto w-full flex-1 my-auto flex items-center">

        {/* Left Column: Typography, CTAs, Metrics */}
        <div className={`w-full max-w-2xl xl:max-w-3xl flex flex-col justify-center text-left z-10 pt-2 sm:pt-0 rounded-3xl ${
          isClay ? 'p-2 sm:p-0' : 'backdrop-blur-[1px] sm:backdrop-blur-none bg-[#f4fcfb]/25 sm:bg-transparent p-2 sm:p-0'
        }`}>

          {/* Status Badge: ● INTERNAL PORTAL • V2.0 • LIVE */}
          <div className={`inline-flex items-center gap-2.5 px-4 py-1.5 w-fit mb-6 sm:mb-8 transition-all ${
            isClay
              ? 'clay-pill clay-pill-mint'
              : 'rounded-full bg-[#7be0d4]/25 border border-[#30c8ba]/40 backdrop-blur-md shadow-sm'
          }`}>
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981] animate-pulse"></span>
            <span className="text-[11px] sm:text-xs font-extrabold tracking-[0.18em] text-[#0d5952] uppercase">
              INTERNAL PORTAL &nbsp;•&nbsp; V2.0 &nbsp;•&nbsp; LIVE
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] xl:text-[4.75rem] font-extrabold text-[#073734] tracking-tight leading-[1.06] select-none">
            Where thoughts <br />
            <span className="font-serifItalic italic font-normal text-[#009688]">flow</span> into action<span className="text-[#073734]">.</span>
          </h1>

          {/* Subtitle Description */}
          <p className="mt-6 text-sm sm:text-base md:text-[17px] text-[#2d5552] font-normal max-w-xl leading-relaxed">
            Asia's <strong className="font-bold text-[#073734]">No.1 Medical Coding Academy</strong>. Eight teams across twelve
            branches working as one system — guiding students from first call to first paycheck.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 max-w-md sm:max-w-none">
            {/* Open My Dashboard Button */}
            <button
              onClick={onOpenDashboard}
              className={`group flex items-center justify-center gap-2.5 px-8 py-3.5 text-sm font-bold transition-all duration-200 cursor-pointer ${
                isClay
                  ? 'clay-btn clay-btn-primary'
                  : 'rounded-full bg-[#0b6b66] hover:bg-[#085551] text-white shadow-xl shadow-[#0b6b66]/25 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              <span>Open My Dashboard</span>
              <ArrowRight className="w-4 h-4 text-white transition-transform group-hover:translate-x-1" />
            </button>

            {/* Explore Departments Button */}
            <button
              onClick={onExploreDepartments}
              className={`flex items-center justify-center px-8 py-3.5 text-sm font-bold transition-all duration-200 ${
                isClay
                  ? 'clay-btn clay-btn-secondary'
                  : 'rounded-full bg-transparent hover:bg-white/60 border border-[#0b6b66]/35 text-[#073734] backdrop-blur-sm hover:border-[#0b6b66]/60 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              Explore Departments
            </button>
          </div>

          {/* Stats Strip */}
          <div className="mt-10 sm:mt-12 flex flex-nowrap items-center gap-5 sm:gap-8">
            {[
              { value: '35,000+', label: 'STUDENTS TRAINED' },
              { value: '25,000+', label: 'PLACED IN CAREERS' },
              { value: '15',      label: 'BRANCHES ACROSS INDIA' },
              { value: '121',     label: 'ACTIVE COURSES' },
            ].map((stat, i) => (
              <React.Fragment key={stat.label}>
                {i > 0 && (
                  <div className="h-8 w-px bg-[#094743]/20 shrink-0" />
                )}
                <div className="text-left shrink-0">
                  <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                    i === 0 ? 'text-[#f59e0b]' :
                    i === 1 ? 'text-[#10b981]' :
                    'text-[#073734]'
                  }`}>
                    {stat.value}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.16em] text-[#4d7874] uppercase mt-0.5">
                    {stat.label}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Micro Footer: PEOPLE | PROCESS | POSSIBILITIES */}
      <div className="max-w-[1400px] mx-auto w-full pt-6 text-left">
        <p className="text-[10px] sm:text-[11px] font-medium tracking-[0.28em] text-[#6b9691] uppercase select-none">
          PEOPLE &nbsp;&nbsp;|&nbsp;&nbsp; PROCESS &nbsp;&nbsp;|&nbsp;&nbsp; POSSIBILITIES
        </p>
      </div>
    </section>
  );
}
