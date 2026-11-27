import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Inbox } from 'lucide-react';
import { getDownloadRequests, decideDownloadRequest } from '../../services/api';
import { errMsg } from './deskUtils';
import { rupees, monthLabel } from './payrollUtils';

// Head of Department / Admin: approve or reject employees' requests to download a payslip.
// Department Heads see their own department; Admin / Leadership see everyone.
const fmt = (t) => (t ? new Date(t).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const BADGE = { pending: 'bg-amber-100 text-amber-800', approved: 'bg-emerald-100 text-emerald-800', rejected: 'bg-rose-100 text-rose-700', expired: 'bg-slate-100 text-slate-600' };

export default function PayslipDownloadRequests() {
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [notes, setNotes] = useState({});

  const load = useCallback(async () => {
    try { setRows((await getDownloadRequests({ status })).requests); setError(''); } catch (e) { setError(errMsg(e)); }
  }, [status]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const decide = async (id, decision) => {
    if (decision === 'reject' && !(notes[id] || '').trim() && !window.confirm('Reject without a note?')) return;
    setBusy(id);
    try { await decideDownloadRequest(id, { decision, note: notes[id] || '' }); await load(); } catch (e) { setError(errMsg(e)); } finally { setBusy(''); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {[['pending', 'Waiting'], ['all', 'All requests']].map(([k, l]) => (
            <button key={k} onClick={() => setStatus(k)} className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${status === k ? 'bg-[#0f212d] text-white border-[#0f212d]' : 'bg-white border-slate-200 text-slate-600'}`}>{l}</button>
          ))}
        </div>
        <span className="text-xs text-slate-500">Approved downloads stay open for 48 hours.</span>
      </div>
      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
      {!rows && !error && <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />Loading…</div>}
      {rows && rows.length === 0 && (
        <div className="p-10 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-sm"><Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />{status === 'pending' ? 'No download requests waiting.' : 'No requests yet.'}</div>
      )}
      {(rows || []).map((r) => (
        <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[220px]">
            <div className="font-bold text-slate-800">{r.employeeName} <span className="text-xs font-semibold text-slate-500">· {r.designation} · {r.deptLabel}{r.branch ? ` · ${r.branch}` : ''}</span></div>
            <div className="text-sm text-slate-600">{monthLabel(r.month)} payslip · net {rupees(r.net)}</div>
            <div className="text-sm mt-1"><span className="text-slate-500">Reason:</span> <b>{r.download.reason}</b></div>
            <div className="text-xs text-slate-400 mt-0.5">Requested {fmt(r.download.requestedAt)}{r.download.decidedBy ? ` · ${r.download.status} by ${r.download.decidedBy} on ${fmt(r.download.decidedAt)}` : ''}{r.download.count ? ` · downloaded ${r.download.count}×` : ''}</div>
          </div>
          {r.download.status === 'pending' ? (
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <input value={notes[r.id] || ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} placeholder="Note to employee (optional)" className="px-3 py-2 rounded-xl border border-slate-200 text-sm w-full sm:w-64" />
              <div className="flex gap-2">
                <button disabled={busy === r.id} onClick={() => decide(r.id, 'approve')} className="flex-1 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"><CheckCircle2 className="w-4 h-4" />Approve</button>
                <button disabled={busy === r.id} onClick={() => decide(r.id, 'reject')} className="flex-1 px-3 py-2 rounded-xl border border-rose-300 text-rose-700 text-sm font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"><XCircle className="w-4 h-4" />Reject</button>
              </div>
            </div>
          ) : <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${BADGE[r.download.status] || ''}`}>{r.download.status}{r.download.status === 'approved' && r.download.validUntil ? ` until ${fmt(r.download.validUntil)}` : ''}</span>}
        </div>
      ))}
    </div>
  );
}
