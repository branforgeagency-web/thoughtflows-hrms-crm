import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { getNotifications, markNotificationRead, markNotificationsRead, onDataUpdate } from '../services/api';

// Reusable notification bell (Student Portal, CCCP …). HR and Training keep
// their own richer feeds. Polls every 60s and on cross-dashboard data events.
const ago = (d) => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const TYPE_ICON = {
  doubt: '💬', assessment: '📝', score: '🏅', material: '📚', live: '🔴', handover: '👩‍🏫', syllabus: '🎓',
  submission: '📤', request: '📨', ticket: '🎫', attendance: '⚠️', recommendation: '✅', feedback: '⭐', demo: '🖥️'
};

export default function NotificationBell({ audience, recipientId, recipientName, onOpenItem, onNew, className = '', tone = 'light' }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const seen = useRef(null); // ids already known — anything new triggers onNew
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  const load = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return; // don't poll background tabs
    try {
      const list = await getNotifications({ audience, recipientId, recipientName, limit: 40 });
      const arr = Array.isArray(list) ? list : [];
      if (seen.current && onNewRef.current) {
        const fresh = arr.filter((n) => !seen.current.has(n._id) && !n.read);
        if (fresh.length) onNewRef.current(fresh);
      }
      seen.current = new Set(arr.map((n) => n._id));
      setItems(arr);
    } catch (_) { /* offline / not allowed — keep last list */ }
  }, [audience, recipientId, recipientName]);

  useEffect(() => {
    load();
    const t = setInterval(load, 45000);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    const off = onDataUpdate(() => load());
    return () => { clearInterval(t); off(); document.removeEventListener('visibilitychange', onVisible); };
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const unread = items.filter((n) => !n.read);

  const readOne = async (n) => {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      try { await markNotificationRead(n._id); } catch (_) {}
    }
    if (onOpenItem) { onOpenItem(n); setOpen(false); }
  };

  const readAll = async () => {
    const ids = unread.map((n) => n._id);
    if (!ids.length) return;
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    try { await markNotificationsRead(ids); } catch (_) {}
  };

  const btnCls = tone === 'dark'
    ? 'text-white/80 hover:text-white hover:bg-white/10'
    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100';

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button type="button" aria-label={`Notifications${unread.length ? ` (${unread.length} unread)` : ''}`} onClick={() => setOpen((o) => !o)} className={`relative p-2 rounded-xl transition ${btnCls}`}>
        <Bell className="w-5 h-5" />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(92vw,360px)] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="font-bold text-sm text-slate-800">Notifications</div>
            <div className="flex items-center gap-1">
              {unread.length > 0 && (
                <button type="button" onClick={readAll} className="text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">You're all caught up.</div>
            ) : items.map((n) => (
              <button type="button" key={n._id} onClick={() => readOne(n)} className={`w-full text-left px-4 py-3 border-b border-slate-50 flex gap-3 hover:bg-slate-50 ${n.read ? '' : 'bg-indigo-50/40'}`}>
                <span className="text-lg leading-none mt-0.5">{TYPE_ICON[n.type] || (String(n.type).startsWith('request') ? '📨' : '🔔')}</span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-xs ${n.read ? 'text-slate-700' : 'text-slate-900 font-bold'}`}>{n.title}</span>
                  {n.message && <span className="block text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</span>}
                  <span className="block text-[10px] text-slate-400 mt-1">{ago(n.createdAt)}{n.createdBy ? ` · ${n.createdBy}` : ''}</span>
                </span>
                {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
