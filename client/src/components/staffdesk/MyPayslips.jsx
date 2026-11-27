import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, Wallet, Lock, Download, Clock, XCircle, EyeOff, ShieldCheck } from 'lucide-react';
import { getMyPayslips, requestPayslipDownload, downloadMyPayslip } from '../../services/api';
import { errMsg } from './deskUtils';
import { rupees, monthLabel, SLIP_STATUS, printPayslip } from './payrollUtils';
import { PayslipBreakdown } from './PayrollDesk';

// Every employee (HR, trainers, everyone): their own approved / paid payslips.
// View only. Downloading needs the Head of Department's approval (valid 48 h).
// Copy, right-click, print and screenshot keys are blocked and the payslip is
// hidden whenever the page loses focus; a name watermark covers it.
export default function MyPayslips() {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState('');
  const [viewer, setViewer] = useState('');

  const load = () => getMyPayslips().then((r) => {
    setList(r.payslips || []); setError('');
    if (r.payslips?.[0]) { setOpen((o) => o || r.payslips[0].id); setViewer(`${r.payslips[0].employeeName} · ${r.payslips[0].email}`); }
  }).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);
  const replace = (slip) => setList((l) => l.map((x) => (x.id === slip.id ? { ...x, download: slip.download } : x)));

  if (!list && !error) return <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />Loading payslips…</div>;
  return (
    <div className="space-y-3 max-w-4xl">
      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
      {list && list.length > 0 && (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
          Payslips are view-only. To download one, send a request — your Head of Department approves it and you can download it for 48 hours.
        </div>
      )}
      {list && list.length === 0 && (
        <div className="p-10 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
          <Wallet className="w-8 h-8 mx-auto mb-2 text-slate-300" />No payslips yet. They appear here once your salary for a month is approved.
        </div>
      )}
      {(list || []).map((p) => (
        <div key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button onClick={() => setOpen(open === p.id ? '' : p.id)} className="w-full px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-left cursor-pointer hover:bg-slate-50">
            <div>
              <div className="font-bold text-slate-800">{monthLabel(p.month)}</div>
              <div className="text-xs text-slate-500">Paid days {p.attendance?.paidDays ?? '—'}{p.attendance?.lopDays ? ` · LOP ${p.attendance.lopDays}` : ''}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${SLIP_STATUS[p.status]?.cls}`}>{SLIP_STATUS[p.status]?.label}{p.paidOn ? ` · ${p.paidOn}` : ''}</span>
              <span className="text-lg font-black text-emerald-700">{rupees(p.net)}</span>
            </div>
          </button>
          {open === p.id && (
            <div className="px-4 pb-4 border-t border-slate-100">
              <ProtectedView watermark={viewer}><PayslipBreakdown slip={p} /></ProtectedView>
              <DownloadControl slip={p} onChange={replace} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- download request / approved download
function DownloadControl({ slip, onChange }) {
  const d = slip.download || { status: 'none' };
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fmt = (t) => (t ? new Date(t).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '');

  const send = async () => {
    setBusy(true); setError('');
    try { onChange(await requestPayslipDownload(slip.id, { reason })); setAsking(false); setReason(''); } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };
  const download = async () => {
    setBusy(true); setError('');
    try {
      const full = await downloadMyPayslip(slip.id);
      onChange(full);
      if (!printPayslip(full)) setError('Your browser blocked the download window. Allow pop-ups for this site and try again.');
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="mt-3 space-y-2">
      {error && <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}
      {d.status === 'approved' && (
        <div className="flex flex-wrap items-center gap-2">
          <button disabled={busy} onClick={download} className="px-3 py-2 rounded-xl bg-[#00897b] text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"><Download className="w-4 h-4" />Download PDF</button>
          <span className="text-xs text-slate-500">Approved by {d.decidedBy} · available until {fmt(d.validUntil)}</span>
        </div>
      )}
      {d.status === 'pending' && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2"><Clock className="w-4 h-4" />Download requested on {fmt(d.requestedAt)} — waiting for your Head of Department to approve.</div>
      )}
      {d.status === 'rejected' && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"><XCircle className="w-4 h-4" />Not approved by {d.decidedBy}{d.note ? ` — "${d.note}"` : ''}. You can request again.</div>
      )}
      {d.status === 'expired' && <div className="text-xs text-slate-500">Your earlier download approval has expired.</div>}
      {['none', 'rejected', 'expired'].includes(d.status) && !asking && (
        <button onClick={() => setAsking(true)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold flex items-center gap-1.5 cursor-pointer hover:bg-slate-50"><Lock className="w-4 h-4" />Request download</button>
      )}
      {asking && (
        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
          <label className="text-xs font-bold text-slate-600">Why do you need to download it?
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. bank loan, visa, rental agreement" className="mt-1 block w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white" />
          </label>
          <div className="flex gap-2">
            <button disabled={busy || reason.trim().length < 3} onClick={send} className="px-3 py-2 rounded-xl bg-[#0f212d] text-white text-sm font-bold cursor-pointer disabled:opacity-50">Send to Head of Department</button>
            <button onClick={() => setAsking(false)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm cursor-pointer">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- view-only protection
// A web page cannot fully stop a screenshot, screen recorder or phone camera.
// This makes it hard and traceable: no select / copy / right-click / print,
// screenshot keys blank the payslip, it hides when the window loses focus
// (Snipping Tool, switching apps, recorder controls) and a name watermark
// sits over every part of it.
export function ProtectedView({ children, watermark = '' }) {
  const [hidden, setHidden] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    const hide = (ms = 0) => { setHidden(true); clearTimeout(timer.current); if (ms) timer.current = setTimeout(() => setHidden(false), ms); };
    const wipeClipboard = () => { try { navigator.clipboard?.writeText(''); } catch { /* not allowed */ } };
    const onKey = (e) => {
      const k = (e.key || '').toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (k === 'printscreen' || e.keyCode === 44) { e.preventDefault(); wipeClipboard(); hide(3000); return; }
      if ((mod && ['p', 's', 'c', 'x', 'u', 'a'].includes(k)) || (mod && e.shiftKey && ['s', 'i', 'c', 'j', '3', '4', '5'].includes(k)) || (e.metaKey && e.shiftKey) || k === 'f12') {
        e.preventDefault(); e.stopPropagation(); hide(1500);
      }
    };
    const onKeyUp = (e) => { if ((e.key || '').toLowerCase() === 'printscreen' || e.keyCode === 44) { wipeClipboard(); hide(3000); } };
    const onBlur = () => hide();
    const onFocus = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setHidden(false), 400); };
    const onVis = () => (document.hidden ? hide() : onFocus());
    const onPrint = () => hide();
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    window.addEventListener('beforeprint', onPrint);
    document.addEventListener('visibilitychange', onVis);
    if (!document.hasFocus()) setHidden(true);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('beforeprint', onPrint);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const block = (e) => e.preventDefault();
  const stamp = `${watermark} · ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`;
  return (
    <div className="relative payslip-protected select-none" style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
      onContextMenu={block} onCopy={block} onCut={block} onDragStart={block}>
      <style>{'@media print { .payslip-protected { display: none !important; } }'}</style>
      <div className={hidden ? 'blur-xl pointer-events-none' : ''} aria-hidden={hidden}>{children}</div>
      {watermark && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -inset-1/2 flex flex-wrap content-start gap-x-16 gap-y-12 rotate-[-25deg] opacity-[0.07] text-slate-900 text-sm font-bold whitespace-nowrap">
            {Array.from({ length: 60 }, (_, i) => <span key={i}>{stamp}</span>)}
          </div>
        </div>
      )}
      {hidden && (
        <button onClick={() => { if (document.hasFocus()) setHidden(false); }} className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60 text-slate-700 text-sm font-bold cursor-pointer">
          <EyeOff className="w-6 h-6" />Payslip hidden — screenshots and recording are not allowed. Click to view again.
        </button>
      )}
    </div>
  );
}
