import React, { useEffect, useRef, useState } from 'react';

// Screen-capture deterrent for logged-in dashboards.
// Never hides page content — focus changes (confirm dialogs, date pickers, tab switches) are ignored.
// On a capture / print / devtools shortcut it blocks the key and shows "Unable to take screenshot".
// Right-click, copy/cut and drag of page text stay blocked (form fields still work).

const isEditable = (el) =>
  !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

const BLOCKED_KEYS = (e) => {
  const k = (e.key || '').toLowerCase();
  const ctrl = e.ctrlKey || e.metaKey;
  if (k === 'printscreen' || k === 'f12') return true;
  if (ctrl && ['p', 's', 'u'].includes(k)) return true;                     // print, save, view-source
  if (ctrl && e.shiftKey && ['i', 'j', 'c', 's', '3', '4', '5'].includes(k)) return true; // devtools, mac/edge captures
  if (e.metaKey && e.shiftKey && k === 's') return true;                    // Win+Shift+S snipping
  return false;
};

export default function ScreenGuard({ active }) {
  const [message, setMessage] = useState('');
  const [covered, setCovered] = useState(false);
  const hideTimer = useRef();

  useEffect(() => {
    if (!active) { setMessage(''); setCovered(false); return undefined; }

    // cover=true hides the page behind the message so a capture grabs the warning, not the data.
    // Always auto-clears on a timer (never waits for focus), so it can't get stuck.
    const notify = (text = 'Unable to take screenshot', cover = false) => {
      clearTimeout(hideTimer.current);
      setMessage(text);
      setCovered(cover);
      hideTimer.current = setTimeout(() => { setMessage(''); setCovered(false); }, cover ? 1800 : 2500);
    };
    const wipeClipboard = () => { try { navigator.clipboard?.writeText(''); } catch (_) {} };

    const onKeyDown = (e) => {
      const key = (e.key || '').toLowerCase();
      // Windows swallows Win+Shift+S (and Mac Cmd+Shift+3/4/5) before the page sees the last key,
      // so react as soon as Win/Cmd + Shift are held together — this paints before the snip freezes the screen.
      const modCombo = e.metaKey && e.shiftKey && ['shift', 'meta', 'os'].includes(key);
      if (modCombo || key === 'printscreen') {
        if (key === 'printscreen') { e.preventDefault(); wipeClipboard(); }
        notify('Unable to take screenshot', true);
        return;
      }
      if (!BLOCKED_KEYS(e)) return;
      e.preventDefault();
      e.stopPropagation();
      const k = (e.key || '').toLowerCase();
      if (k === 'printscreen') wipeClipboard();
      if ((e.ctrlKey || e.metaKey) && k === 'p') notify('Printing is not allowed');
      else notify();
    };
    const onKeyUp = (e) => {
      if (e.key === 'PrintScreen') { wipeClipboard(); notify('Unable to take screenshot', true); }
    };
    const onContextMenu = (e) => { if (!isEditable(e.target)) e.preventDefault(); };
    const onCopy = (e) => {
      if (isEditable(e.target) || isEditable(document.activeElement)) return;
      e.preventDefault();
      e.clipboardData?.setData('text/plain', '');
    };
    const onDragStart = (e) => { if (!isEditable(e.target)) e.preventDefault(); };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCopy);
    document.addEventListener('dragstart', onDragStart);
    document.documentElement.classList.add('screen-guard');

    return () => {
      clearTimeout(hideTimer.current);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCopy);
      document.removeEventListener('dragstart', onDragStart);
      document.documentElement.classList.remove('screen-guard');
    };
  }, [active]);

  if (!active || !message) return null;

  if (covered) {
    return (
      <div
        role="alert"
        className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 text-white select-none"
        style={{ zIndex: 2147483647 }}
      >
        <div className="text-4xl" aria-hidden="true">⛔</div>
        <div className="text-xl font-bold">{message}</div>
        <div className="text-sm text-slate-400">Screenshots are not permitted on this dashboard.</div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="fixed top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-2xl select-none pointer-events-none"
      style={{ zIndex: 2147483647 }}
    >
      <span aria-hidden="true">⛔</span>
      {message}
    </div>
  );
}
