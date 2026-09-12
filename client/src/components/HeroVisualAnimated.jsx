import React from 'react';
import {
  ArrowRight,
  GraduationCap,
  Stethoscope,
  FileText,
  Activity,
  BarChart3,
} from 'lucide-react';

/**
 * Fully coded, animated replacement for the old hero photograph.
 * No raster image anywhere — everything below is SVG + CSS animation
 * (see tailwind.config.js: sway / draw-slow / twinkle / dash-flow / nudge-x / breathe).
 */
export default function HeroVisualAnimated({ onExploreDepartments }) {
  return (
    <div className="relative w-full max-w-[480px] xl:max-w-[560px] aspect-square">

      {/* Dashed orbit line with an animated "flowing" dash */}
      <svg className="absolute left-[10%] top-[6%] h-[88%] w-px overflow-visible" viewBox="0 0 2 400" preserveAspectRatio="none">
        <line
          x1="1" y1="0" x2="1" y2="400"
          stroke="#0b6b66" strokeOpacity="0.35" strokeWidth="2"
          strokeDasharray="6 8"
          className="animate-dash-flow"
        />
      </svg>

      {/* Orbit icon badges, each floating at its own pace */}
      <div className="absolute left-0 top-0 h-full w-[22%] flex flex-col items-center justify-between py-2 z-20">
        <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-[#0b6b66] animate-float-fast">
          <Stethoscope className="w-4 h-4" />
        </div>
        <div className="w-12 h-12 rounded-full bg-white/95 shadow-md flex items-center justify-center text-[#0b6b66] animate-float-medium">
          <FileText className="w-5 h-5" />
        </div>
        <div className="w-14 h-14 rounded-full bg-[#0b6b66] shadow-lg flex items-center justify-center text-white animate-float-slow">
          <Activity className="w-6 h-6" />
        </div>
        <div className="w-12 h-12 rounded-full bg-white/95 shadow-md flex items-center justify-center text-[#0b6b66] animate-float-medium">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div className="w-11 h-11 rounded-full bg-[#0b6b66] shadow-lg flex items-center justify-center text-white animate-float-fast">
          <GraduationCap className="w-5 h-5" />
        </div>
      </div>

      {/* Main portal circle — animated flat-illustration scene, no photo */}
      <div className="absolute right-0 top-0 w-[82%] h-[82%] rounded-full overflow-hidden bg-gradient-to-br from-white via-[#eafaf7] to-[#bcefe6] shadow-[inset_0_0_40px_rgba(11,107,102,0.08)]">
        <svg viewBox="0 0 400 400" className="w-full h-full">
          {/* Window with soft daylight */}
          <rect x="150" y="18" width="220" height="230" rx="10" fill="#ffffff" fillOpacity="0.35" />
          <line x1="260" y1="18" x2="260" y2="248" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="3" />
          <line x1="150" y1="130" x2="370" y2="130" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="3" />

          {/* Potted plant, gently swaying */}
          <g className="animate-sway" style={{ transformOrigin: '95px 235px' }}>
            <ellipse cx="95" cy="235" rx="22" ry="10" fill="#0b6b66" />
            <path d="M95,235 C80,200 70,175 78,150" stroke="#12a39d" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M95,235 C100,195 112,168 108,140" stroke="#0d7d79" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M95,235 C92,205 82,190 68,178" stroke="#38d5cc" strokeWidth="5" fill="none" strokeLinecap="round" />
          </g>

          {/* Book stack, floating slowly */}
          <g className="animate-float-slow">
            <rect x="150" y="255" width="190" height="34" rx="5" fill="#ffffff" stroke="#0b6b66" strokeOpacity="0.25" />
            <text x="245" y="277" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0b6b66" fontFamily="Inter, sans-serif" letterSpacing="1">KNOWLEDGE</text>

            <rect x="150" y="291" width="190" height="34" rx="5" fill="#18bab3" />
            <text x="245" y="313" textAnchor="middle" fontSize="14" fontWeight="700" fill="#ffffff" fontFamily="Inter, sans-serif" letterSpacing="1">SKILLS</text>

            <rect x="150" y="327" width="190" height="34" rx="5" fill="#0d7d79" />
            <text x="245" y="349" textAnchor="middle" fontSize="13" fontWeight="700" fill="#ffffff" fontFamily="Inter, sans-serif" letterSpacing="1">BETTER TOMORROW</text>
          </g>

          {/* Stethoscope, drawn on with an animated stroke */}
          <g className="animate-breathe" style={{ transformOrigin: '190px 375px' }}>
            <path
              d="M120,300 C100,330 105,360 140,368 C165,373 178,362 178,345 L178,320"
              fill="none" stroke="#073734" strokeWidth="5" strokeLinecap="round"
              strokeDasharray="600" className="animate-draw-slow"
            />
            <path
              d="M230,300 C250,330 245,360 210,368 C185,373 178,362 178,345"
              fill="none" stroke="#073734" strokeWidth="5" strokeLinecap="round"
              strokeDasharray="600" className="animate-draw-slow"
            />
            <circle cx="120" cy="298" r="7" fill="#073734" />
            <circle cx="230" cy="298" r="7" fill="#073734" />
            <circle cx="190" cy="378" r="16" fill="none" stroke="#073734" strokeWidth="5" />
            <circle cx="190" cy="378" r="6" fill="#073734" />
          </g>
        </svg>

        {/* Code / Learn / Grow wordmark */}
        <span className="absolute top-[16%] right-[12%] font-serifItalic italic text-[#0b6b66]/75 text-base sm:text-lg leading-tight text-right -rotate-3 select-none">
          Code<br />Learn<br />Grow
        </span>
      </div>

      {/* Dot-mesh "globe" accent, twinkling */}
      <div
        className="absolute -bottom-3 -right-3 w-[38%] h-[38%] rounded-full animate-twinkle pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#0b6b66 1.4px, transparent 1.4px)',
          backgroundSize: '9px 9px',
          WebkitMaskImage: 'radial-gradient(circle at 32% 32%, black 55%, transparent 100%)',
          maskImage: 'radial-gradient(circle at 32% 32%, black 55%, transparent 100%)',
        }}
      />

      {/* Interactive hotspot over the portal circle */}
      <button
        onClick={onExploreDepartments}
        className="absolute right-0 top-0 w-[82%] h-[82%] rounded-full cursor-pointer opacity-0 hover:opacity-10 transition-opacity bg-teal-500"
        title="Explore Medical Careers & Curriculum"
      >
        <span className="sr-only">Explore Healthcare Careers</span>
      </button>

      {/* Badge: A BRIGHTER HEALTHCARE TOMORROW */}
      <button
        onClick={onExploreDepartments}
        className="absolute -bottom-6 right-2 z-20 flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/75 backdrop-blur-md shadow-lg hover:bg-white/90 transition-colors animate-float-medium"
      >
        <span className="text-[10px] sm:text-[11px] font-semibold text-[#073734] uppercase tracking-wide leading-tight text-left">
          A <span className="font-extrabold text-[#0b6b66]">BRIGHTER</span><br />HEALTHCARE TOMORROW
        </span>
        <ArrowRight className="w-4 h-4 text-[#0b6b66] shrink-0 animate-nudge-x" />
      </button>
    </div>
  );
}
