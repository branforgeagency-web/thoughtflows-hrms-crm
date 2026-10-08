import React, { useEffect, useState } from 'react';

// Screen-capture deterrent for logged-in dashboards.
// A browser cannot truly block OS screenshots / recorders, so this:
//  1. blanks the screen when capture shortcuts are pressed or the window loses focus
//     (PrintScreen, Win+Shift+S / Snipping Tool, Mac Cmd+Shift+3/4/5, tab switch)
//  2. blocks print, save-page, view-source, devtools shortcuts and right-click
//  3. blocks copying / selecting page text (form fields still work)

const isEditable = (el) =>
  !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

const BLOCKED_KEYS = (e) => {
  const k = (e.key || '').toLowerCase();
  const ctrl = e.ctrlKey || e.metaKey;
  if (k === 'printscreen' || k === 'f12') return true;
  if (ctrl && ['p', 's', 'u'].includes(k)) return true;                     // print, save, view-source
  if (ctrl && e.shiftKey && ['i', 'j', 'c', 's', '3', '4', '5'].includes(k)) return true; // devtools, mac/edge captures
  return false;
};

export default function ScreenGuard({ active }) {
  const [shielded, setShielded] = useState(false);

  useEffect(() => {
    if (!active) { setShielded(false); return undefined; }

    let releaseTimer;
    const shield = () => { clearTimeout(releaseTimer); setShielded(true); };
    // Stay blank briefly after the trigger ends so a delayed capture still gets a blank frame
    const release = (ms = 1200) => {
      clearTimeout(releaseTimer);
      releaseTimer = setTimeout(() => { if (document.hasFocus() && !document.hidden) setShielded(false); }, ms);
    };
    const wipeClipboard = () => { try { navigator.clipboard?.writeText(''); } catch (_) {} };

    const onKeyDown = (e) => {
      // Win / Cmd key starts every OS capture shortcut — blank before the snip freezes the screen
      if (e.key === 'Meta' || e.key === 'OS') { shield(); return; }
      if (BLOCKED_KEYS(e)) {
        e.preventDefault();
        e.stopPropagation();
        shield();
        if (e.key === 'PrintScreen') wipeClipboard();
        release(1500);
      }
    };
    const onKeyUp = (e) => {
      if (e.key === 'PrintScreen') { wipeClipboard(); shield(); release(1500); return; }
      if (e.key === 'Meta' || e.key === 'OS') release();
    };
    // Focus moving into an embedded iframe (PDF viewer, Zoom) also fires blur — the user is still on the page
    const onBlur = () => setTimeout(() => { if (document.activeElement?.tagName !== 'IFRAME') shield(); }, 0);
    const onFocus = () => release(600);
    const onVisibility = () => (document.hidden ? shield() : release(600));
    const onContextMenu = (e) => { if (!isEditable(e.target)) e.preventDefault(); };
    const onCopy = (e) => {
      if (isEditable(e.target) || isEditable(document.activeElement)) return;
      e.preventDefault();
      e.clipboardData?.setData('text/plain', '');
    };
    const onDragStart = (e) => { if (!isEditable(e.target)) e.preventDefault(); };
    const onBeforePrint = () => shield();
    const onAfterPrint = () => release();

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCopy);
    document.addEventListener('dragstart', onDragStart);
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    document.documentElement.classList.add('screen-guard');
    if (!document.hasFocus()) shield();

    return () => {
      clearTimeout(releaseTimer);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCopy);
      document.removeEventListener('dragstart', onDragStart);
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
      document.documentElement.classList.remove('screen-guard');
    };
  }, [active]);

  if (!active || !shielded) return null;

  return (
    <div
      className="screen-guard-shield fixed inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 text-slate-300 select-none"
      style={{ zIndex: 2147483647 }}
    >
      <div className="text-lg font-bold text-white">Content hidden</div>
      <div className="text-sm">Screenshots and screen recording are not permitted. Click here to continue.</div>
    </div>
  );
}
