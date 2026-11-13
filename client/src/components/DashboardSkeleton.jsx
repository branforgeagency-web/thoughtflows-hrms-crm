import React from 'react';

/**
 * Shown while a dashboard's code chunk is still downloading, and reusable as a
 * first-paint placeholder while a dashboard's own data is still arriving.
 *
 * Deliberately a layout skeleton rather than a spinner: the shape of the page
 * appears instantly, so the dashboard looks like it is filling in rather than
 * hanging on a blank screen.
 */
export default function DashboardSkeleton({ label = 'Dashboard', rows = 6, theme = 'classic' }) {
  const isClay = theme === 'clay';
  const base = isClay ? 'bg-stone-200/70' : 'bg-slate-200/70';

  return (
    <div
      className={`min-h-screen w-full ${isClay ? 'bg-stone-50' : 'bg-slate-50'} p-4 sm:p-6`}
      aria-busy="true"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-2xl ${base} tf-shimmer shrink-0`} />
          <div className="min-w-0 space-y-2">
            <div className={`h-4 w-44 max-w-full rounded-lg ${base} tf-shimmer`} />
            <div className={`h-3 w-28 rounded-lg ${base} tf-shimmer`} />
          </div>
        </div>
        <div className={`h-9 w-9 rounded-xl ${base} tf-shimmer shrink-0`} />
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`rounded-2xl border ${isClay ? 'border-stone-200 bg-white' : 'border-slate-200 bg-white'} p-4 space-y-3`}
          >
            <div className={`h-3 w-20 rounded ${base} tf-shimmer`} />
            <div className={`h-7 w-16 rounded-lg ${base} tf-shimmer`} />
            <div className={`h-2.5 w-24 rounded ${base} tf-shimmer`} />
          </div>
        ))}
      </div>

      {/* Table / list body */}
      <div className={`rounded-2xl border ${isClay ? 'border-stone-200' : 'border-slate-200'} bg-white overflow-hidden`}>
        <div className={`px-4 py-3 border-b ${isClay ? 'border-stone-100' : 'border-slate-100'} flex items-center gap-3`}>
          <div className={`h-3.5 w-32 rounded ${base} tf-shimmer`} />
          <div className={`h-3.5 w-16 rounded ${base} tf-shimmer ml-auto`} />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={`px-4 py-3.5 flex items-center gap-3 border-b last:border-0 ${isClay ? 'border-stone-50' : 'border-slate-50'}`}
            style={{ opacity: Math.max(0.35, 1 - i * 0.11) }}
          >
            <div className={`w-8 h-8 rounded-full ${base} tf-shimmer shrink-0`} />
            <div className="flex-1 min-w-0 space-y-2">
              <div className={`h-3 rounded ${base} tf-shimmer`} style={{ width: `${70 - i * 6}%` }} />
              <div className={`h-2.5 w-24 rounded ${base} tf-shimmer`} />
            </div>
            <div className={`h-6 w-16 rounded-full ${base} tf-shimmer shrink-0 hidden sm:block`} />
          </div>
        ))}
      </div>

      <p className="mt-5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Loading {label}&hellip;
      </p>

      <style>{`
        .tf-shimmer {
          position: relative;
          overflow: hidden;
        }
        .tf-shimmer::after {
          content: '';
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.75),
            transparent
          );
          animation: tfShimmer 1.4s ease-in-out infinite;
        }
        @keyframes tfShimmer {
          100% { transform: translateX(100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .tf-shimmer::after { animation: none; }
        }
      `}</style>
    </div>
  );
}
