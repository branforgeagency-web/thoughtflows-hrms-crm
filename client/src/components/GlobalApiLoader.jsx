import React, { useEffect, useRef, useState } from 'react';
import { subscribeApiLoading } from '../services/api';

/**
 * Global API & Data loading indicator rendered at the root of the app.
 *
 * Previously a full-screen blurred overlay: every background refresh — and
 * there is one after each save and each dashboard remount — froze the whole
 * UI behind a modal spinner, which is what made loading feel slow even when
 * it was quick.
 *
 * Now it is a non-blocking progress bar pinned to the top of the viewport,
 * so dashboards stay readable and interactive while data streams in. It only
 * appears if a request is genuinely slow (>280ms), so fast cached loads show
 * nothing at all instead of flashing.
 */
export default function GlobalApiLoader() {
  const [activeCount, setActiveCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const visibleRef = useRef(false);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const tickRef = useRef(null);

  useEffect(() => {
    const clearTimers = () => {
      if (showTimerRef.current) { clearTimeout(showTimerRef.current); showTimerRef.current = null; }
      if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    };

    const unsubscribe = subscribeApiLoading((count) => {
      setActiveCount(count);

      if (count > 0) {
        if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
        if (!visibleRef.current && !showTimerRef.current) {
          // Only surface the bar for requests that are actually slow — a cache
          // hit or a sub-280ms call should look instantaneous.
          showTimerRef.current = setTimeout(() => {
            showTimerRef.current = null;
            visibleRef.current = true;
            setVisible(true);
            setProgress(12);
            // Ease towards 90% so the bar always looks like it is advancing,
            // without ever claiming to be finished early.
            tickRef.current = setInterval(() => {
              setProgress((p) => (p >= 90 ? 90 : p + Math.max(0.6, (90 - p) * 0.09)));
            }, 180);
          }, 280);
        }
      } else {
        if (showTimerRef.current) { clearTimeout(showTimerRef.current); showTimerRef.current = null; }
        if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
        if (visibleRef.current && !hideTimerRef.current) {
          setProgress(100);
          hideTimerRef.current = setTimeout(() => {
            hideTimerRef.current = null;
            visibleRef.current = false;
            setVisible(false);
            setProgress(0);
          }, 260);
        }
      }
    });

    return () => { unsubscribe(); clearTimers(); };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      {/* Progress bar */}
      <div className="h-[3px] w-full bg-transparent overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#00897b] via-teal-400 to-[#00897b] shadow-[0_0_8px_rgba(0,137,123,0.6)]"
          style={{
            width: `${progress}%`,
            transition: progress === 100 ? 'width 180ms ease-out' : 'width 320ms ease-out'
          }}
        />
      </div>

      {/* Small corner chip — informative, never covers content */}
      <div className="flex justify-end px-3 pt-2">
        <div className="pointer-events-none flex items-center gap-2 rounded-full bg-white/92 backdrop-blur-sm border border-teal-500/25 shadow-md px-3 py-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-teal-400/70 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00897b]" />
          </span>
          <span className="text-[10.5px] font-semibold text-slate-600 tracking-tight">
            {activeCount > 1 ? `Syncing ${activeCount} requests` : 'Loading data'}
          </span>
        </div>
      </div>
    </div>
  );
}
