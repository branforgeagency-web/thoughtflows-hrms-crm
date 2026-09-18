import React from 'react';
import { ArrowRight, GraduationCap, Users, BarChart3 } from 'lucide-react';

export default function PortalHero({ onOpenDashboard, onExploreDepartments, theme = 'clay' }) {
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
              className={`group flex items-center justify-center gap-2.5 px-8 py-3.5 text-sm font-bold transition-all duration-200 ${
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

          {/* Metrics & Indicator Stats */}
          {isClay ? (
            <div className="mt-10 sm:mt-12 flex flex-wrap items-center gap-3 sm:gap-4">
              {/* Metric 1 */}
              <div className="clay-card px-4 py-2.5 flex items-center gap-3 rounded-2xl hover:scale-[1.02] transition-transform">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0d9488] to-[#047857] text-white flex items-center justify-center clay-squircle">
                  <GraduationCap className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="text-left text-xs font-bold text-[#094743] leading-tight">
                  <div>Students</div>
                  <div className="text-[11px] font-medium text-[#557b77]">Empowered</div>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="clay-card px-4 py-2.5 flex items-center gap-3 rounded-2xl hover:scale-[1.02] transition-transform">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0284c7] to-[#0369a1] text-white flex items-center justify-center clay-squircle">
                  <Users className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="text-left text-xs font-bold text-[#094743] leading-tight">
                  <div>Branches</div>
                  <div className="text-[11px] font-medium text-[#557b77]">United (12 Hubs)</div>
                </div>
              </div>

              {/* Metric 3 */}
              <div className="clay-card px-4 py-2.5 flex items-center gap-3 rounded-2xl hover:scale-[1.02] transition-transform">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#ea580c] text-white flex items-center justify-center clay-squircle">
                  <BarChart3 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="text-left text-xs font-bold text-[#094743] leading-tight">
                  <div>Careers</div>
                  <div className="text-[11px] font-medium text-[#557b77]">Transformed</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-10 sm:mt-12 flex items-center gap-4 sm:gap-7">
              {/* Metric 1 */}
              <div className="flex items-center gap-3">
                <div className="text-[#094743]">
                  <GraduationCap className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="text-left text-xs font-semibold text-[#094743] leading-tight">
                  <div>Students</div>
                  <div>Empowered</div>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="h-7 w-[1px] bg-[#094743]/25" />

              {/* Metric 2 */}
              <div className="flex items-center gap-3">
                <div className="text-[#094743]">
                  <Users className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="text-left text-xs font-semibold text-[#094743] leading-tight">
                  <div>Branches</div>
                  <div>United</div>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="h-7 w-[1px] bg-[#094743]/25" />

              {/* Metric 3 */}
              <div className="flex items-center gap-3">
                <div className="text-[#094743]">
                  <BarChart3 className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="text-left text-xs font-semibold text-[#094743] leading-tight">
                  <div>Careers</div>
                  <div>Transformed</div>
                </div>
              </div>
            </div>
          )}
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
