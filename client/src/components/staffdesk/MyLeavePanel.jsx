import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, X } from 'lucide-react';
import { getStaffBalances, getStaffLeaves, applyStaffLeave, cancelStaffLeave } from '../../services/api';
import { todayKey, prettyDate, errMsg, LEAVE_STATUS } from './deskUtils';

// Every employee: leave balance, apply for leave, own history (cancel if needed)
export default function MyLeavePanel({ me, policy, usesTrainerLeave }) {
  const [bal, setBal] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState('');
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, l] = await Promise.all([getStaffBalances({ mine: 1 }), getStaffLeaves({ view: 'mine' })]);
      setBal(b.rows?.[0]?.balance || null);
      setLeaves(l.leaves || []);
    } catch (e) { flash(errMsg(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const cancel = async (l) => {
    if (!window.confirm(`Cancel your ${l.leaveType} leave from ${prettyDate(l.from)}?`)) return;
    try { await cancelStaffLeave(l.id); flash('Leave cancelled'); load(); } catch (e) { flash(errMsg(e)); }
  };

  if (usesTrainerLeave) {
    return <div className="p-6 rounded-2xl bg-white border border-slate-200 text-sm text-slate-600">Trainers apply for leave from the Trainer dashboard (Shift &amp; Leave). Your Team Lead / Manager / Head approves it there.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">My Leave</h3>
          <p className="text-xs text-slate-500">Approval: your reporting head, then HR. Balance resets every January.</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />}
          <button onClick={() => setApplying(true)} className="px-4 py-2.5 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer"><Plus className="w-4 h-4" />Apply Leave</button>
        </div>
      </div>

      {bal && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(bal).map(([code, b]) => (
            <div key={code} className="p-4 rounded-2xl bg-white border border-slate-200">
              <div className="text-[11px] font-bold uppercase text-slate-400">{b.name} ({code})</div>
              {b.perYear === null || b.perYear === undefined ? (
                <div className="text-2xl font-black text-slate-900 mt-1">{b.used}<span className="text-xs font-semibold text-slate-400"> day(s) taken</span></div>
              ) : (
                <>
                  <div className="text-2xl font-black text-teal-700 mt-1">{b.remaining}<span className="text-xs font-semibold text-slate-400"> / {b.perYear} left</span></div>
                  <div className="h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden"><div className="h-full bg-teal-500" style={{ width: `${Math.min(100, ((b.used + b.pending) / (b.perYear || 1)) * 100)}%` }} /></div>
                  <div className="text-[11px] text-slate-500 mt-1">{b.used} used{b.pending ? ` · ${b.pending} waiting` : ''}</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 text-xs text-slate-600"><tr>{['Type', 'Dates', 'Days', 'Reason', 'Status', ''].map((h) => <th key={h} className="text-left px-4 py-2.5 font-bold">{h}</th>)}</tr></thead>
          <tbody>
            {leaves.length === 0 && !loading && <tr><td colSpan={6} className="py-10 text-center text-slate-400">No leave applied yet.</td></tr>}
            {leaves.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-4 py-2.5 font-bold">{l.leaveType}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">{prettyDate(l.from)}{l.to !== l.from ? ` – ${prettyDate(l.to)}` : ''}{l.halfDay ? ` · ${l.halfDay} half` : ''}</td>
                <td className="px-4 py-2.5">{l.days}</td>
                <td className="px-4 py-2.5 text-slate-600 max-w-[240px] truncate" title={l.reason}>{l.reason}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${LEAVE_STATUS[l.status]?.cls}`}>{LEAVE_STATUS[l.status]?.label}</span>
                  {(l.hrDecision?.note || l.headDecision?.note) && <div className="text-[11px] text-slate-500 mt-0.5">“{l.hrDecision?.note || l.headDecision?.note}”</div>}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {(['pending_head', 'pending_hr'].includes(l.status) || (l.status === 'approved' && l.from > todayKey())) && (
                    <button onClick={() => cancel(l)} className="text-xs font-bold text-rose-600 hover:underline cursor-pointer">Cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {applying && <ApplyLeave policy={policy} balance={bal} onClose={() => setApplying(false)} onDone={() => { setApplying(false); flash('Leave applied · your head has been notified'); load(); }} />}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[140] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm shadow-xl">{toast}</div>}
    </div>
  );
}

function ApplyLeave({ policy, balance, onClose, onDone }) {
  const types = policy?.types || [];
  const [f, setF] = useState({ leaveType: types[0]?.code || 'CL', from: todayKey(), to: todayKey(), halfDay: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const single = f.from === f.to;
  const days = useMemo(() => {
    if (!f.from || !f.to || f.to < f.from) return 0;
    if (single && f.halfDay) return 0.5;
    const hol = new Set((policy?.holidays || []).map((h) => h.date));
    const off = policy?.weeklyOff || [];
    const W = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let n = 0;
    for (let d = new Date(`${f.from}T00:00:00`); d <= new Date(`${f.to}T00:00:00`); d.setDate(d.getDate() + 1)) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!off.includes(W[d.getDay()]) && !hol.has(k)) n += 1;
    }
    return n;
  }, [f.from, f.to, f.halfDay, single, policy]);
  const b = balance?.[f.leaveType];
  const over = b && b.perYear !== null && b.perYear !== undefined && days > b.remaining;

  const submit = async () => {
    setSaving(true); setError('');
    try { await applyStaffLeave({ ...f, halfDay: single ? f.halfDay : '' }); onDone(); }
    catch (e) { setError(errMsg(e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[130] bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 rounded-t-2xl">
          <div className="font-bold text-slate-900">Apply Leave</div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div className="flex flex-wrap gap-1.5">
            {types.map((t) => {
              const tb = balance?.[t.code];
              return (
                <button key={t.code} type="button" onClick={() => set('leaveType', t.code)} className={`px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer ${f.leaveType === t.code ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-200 text-slate-700'}`}>
                  {t.name}{tb && tb.perYear !== null && tb.perYear !== undefined ? ` · ${tb.remaining} left` : ''}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1"><span className="text-xs font-semibold text-slate-600">From</span><input type="date" value={f.from} onChange={(e) => setF((p) => ({ ...p, from: e.target.value, to: p.to < e.target.value ? e.target.value : p.to }))} className="w-full px-3 py-2 rounded-xl border border-slate-200" /></label>
            <label className="space-y-1"><span className="text-xs font-semibold text-slate-600">To</span><input type="date" value={f.to} min={f.from} onChange={(e) => set('to', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200" /></label>
          </div>
          {policy?.allowHalfDay && single && (
            <div className="flex gap-1.5 text-xs">
              {[['', 'Full day'], ['first', 'First half'], ['second', 'Second half']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => set('halfDay', v)} className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer ${f.halfDay === v ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600'}`}>{l}</button>
              ))}
            </div>
          )}
          <label className="space-y-1 block"><span className="text-xs font-semibold text-slate-600">Reason</span><textarea rows={3} value={f.reason} onChange={(e) => set('reason', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200" placeholder="e.g. Family function" /></label>
          <div className={`text-xs font-semibold ${over ? 'text-rose-600' : 'text-slate-600'}`}>
            {days} working day{days === 1 ? '' : 's'}{over ? ` — only ${b.remaining} ${f.leaveType} left. Apply the rest as Loss of Pay.` : ''} (week-offs &amp; holidays not counted)
          </div>
          {error && <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 font-semibold cursor-pointer">Cancel</button>
            <button onClick={submit} disabled={saving || !days || over || !f.reason.trim()} className="px-5 py-2 rounded-xl bg-[#00897b] text-white font-bold disabled:opacity-50 cursor-pointer">{saving ? 'Sending…' : 'Apply'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
