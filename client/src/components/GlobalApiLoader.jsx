import React, { useEffect, useRef, useState } from 'react';
import { subscribeApiLoading } from '../services/api';

/**
 * Global API & Data Loader rendered at the root of the app.
 * Automatically activates whenever any dashboard or modal loads data via `api` or `axios`.
 */
export default function GlobalApiLoader() {
  const [activeCount, setActiveCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const shownAtRef = useRef(0);

  useEffect(() => {
    const unsubscribe = subscribeApiLoading((count) => {
      setActiveCount(count);

      if (count > 0) {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        if (!visibleRef.current && !showTimerRef.current) {
          showTimerRef.current = setTimeout(() => {
            showTimerRef.current = null;
            shownAtRef.current = Date.now();
            visibleRef.current = true;
            setVisible(true);
          }, 100);
        }
      } else {
        if (showTimerRef.current) {
          clearTimeout(showTimerRef.current);
          showTimerRef.current = null;
        }
        if (visibleRef.current && !hideTimerRef.current) {
          const elapsed = Date.now() - shownAtRef.current;
          const remaining = Math.max(0, 220 - elapsed);
          hideTimerRef.current = setTimeout(() => {
            hideTimerRef.current = null;
            visibleRef.current = false;
            setVisible(false);
          }, remaining);
        }
      }
    });

    return () => {
      unsubscribe();
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/25 backdrop-blur-sm transition-opacity duration-200"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Centered animated loader card */}
      <div className="bg-white/95 backdrop-blur-md border border-teal-500/25 shadow-2xl rounded-3xl px-8 py-6 flex flex-col items-center gap-4 min-w-[200px]">
        {/* Multi-ring animated orbital spinner */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* Outer pulsing glow */}
          <span className="absolute inset-0 rounded-full bg-teal-400/20 animate-ping" />
          {/* Outer rotating ring */}
          <span
            className="absolute inset-0 rounded-full border-[3.5px] border-teal-100 border-t-[#00897b] border-r-teal-400"
            style={{ animation: 'globalSpinCw 0.9s linear infinite' }}
          />
          {/* Inner counter-rotating ring */}
          <span
            className="absolute inset-2.5 rounded-full border-[3px] border-slate-100 border-b-[#0f242d] border-l-teal-500"
            style={{ animation: 'globalSpinCcw 0.7s linear infinite' }}
          />
          {/* Center pulsing dot */}
          <span className="w-2.5 h-2.5 rounded-full bg-[#00897b] animate-pulse" />
        </div>

        {/* Animated text & dots */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-800 tracking-tight">
            <span>Loading</span>
            <span className="inline-flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00897b] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#00897b] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#00897b] animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-500">
            {activeCount > 1 ? `Syncing ${activeCount} requests…` : 'Fetching latest data…'}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes globalSpinCw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes globalSpinCcw {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
