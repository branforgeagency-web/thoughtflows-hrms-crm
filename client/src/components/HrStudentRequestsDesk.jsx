import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox, Ticket, X, RefreshCw } from 'lucide-react';
import { getStudentRequests, respondStudentRequest, getStudentTickets, respondStudentTicket, onDataUpdate } from '../services/api';
import StudentTimeline from './StudentTimeline';

// HR side of the Student Portal: admin requests (fee query, payment link,
// profile edit, points redemption) and branch support tickets.
const REQ_LABEL = { fee_query: 'Fee query', payment_link: 'Payment link', profile_edit: 'Profile edit', redeem_points: 'Redeem points' };
const REQ_TONE = { Open: 'bg-amber-100 text-amber-700', Scheduled: 'bg-sky-100 text-sky-700', Resolved: 'bg-emerald-100 text-emerald-700', Declined: 'bg-slate-200 text-slate-600' };
const TICKET_TONE = { open: 'bg-amber-100 text-amber-700', 'in-progress': 'bg-sky-100 text-sky-700', resolved: 'bg-emerald-100 text-emerald-700', closed: 'bg-slate-200 text-slate-600' };
const ago = (d) => {
  const h = Math.floor((Date.now() - new Date(d).getTime()) / 36e5);
  return h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};

export default function HrStudentRequestsDesk({ currentUser, onCountChange }) {
  const userName = currentUser?.name || currentUser?.userName || '';
  const [view, setView] = useState('requests');
  const [scope, setScope] = useState('mine');
  const [statusFilter, setStatusFilter] = useState('open');
  const [requests, setRequests] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null); // { kind, item }
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [timelineFor, setTimelineFor] = useState(null);

  const load = useCallback(async () => {
    try {
      const [r, t] = await Promise.all([
        getStudentRequests({ audience: 'hr' }).catch(() => []),
        getStudentTickets().catch(() => [])
      ]);
      setRequests(Array.isArray(r) ? r : []);
      setTickets(Array.isArray(t) ? t : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    const off = onDataUpdate(load);
    return () => { clearInterval(t); off(); };
  }, [load]);

  const mine = useCallback((hrName) => scope === 'all' || !userName || String(hrName || '').trim().toLowerCase() === userName.trim().toLowerCase(), [scope, userName]);
  const isOpenReq = (r) => r.status === 'Open' || r.status === 'Scheduled';
  const isOpenTicket = (t) => t.status === 'open' || t.status === 'in-progress';

  const reqList = useMemo(() => requests.filter((r) => mine(r.hrName) && (statusFilter === 'all' || isOpenReq(r))), [requests, mine, statusFilter]);
  const ticketList = useMemo(() => tickets.filter((t) => mine(t.hrName) && (statusFilter === 'all' || isOpenTicket(t))), [tickets, mine, statusFilter]);
  const openCount = requests.filter((r) => mine(r.hrName) && r.status === 'Open').length + tickets.filter((t) => mine(t.hrName) && t.status === 'open').length;

  useEffect(() => { if (onCountChange) onCountChange(openCount); }, [openCount, onCountChange]);

  const openRespond = (kind, item) => {
    setError('');
    setActive({ kind, item });
    setForm(kind === 'request'
      ? { status: item.status === 'Open' ? 'Resolved' : item.status, response: item.response || '', scheduledFor: item.scheduledFor || '' }
      : { action: item.status === 'open' ? 'in-progress' : item.status, response: item.response || '' });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      if (active.kind === 'request') {
        await respondStudentRequest(active.item._id, { ...form, respondedBy: userName });
      } else {
        await respondStudentTicket(active.item._id, { action: form.action, response: form.response });
      }
      setActive(null);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const Chip = ({ on, children, onClick }) => (
    <button type="button" onClick={onClick} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${on ? 'bg-[#0e6977] text-white border-[#0e6977]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{children}</button>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-2">
          <Chip on={view === 'requests'} onClick={() => setView('requests')}><Inbox className="w-3.5 h-3.5 inline mr-1" />Requests ({requests.filter((r) => mine(r.hrName) && r.status === 'Open').length})</Chip>
          <Chip on={view === 'tickets'} onClick={() => setView('tickets')}><Ticket className="w-3.5 h-3.5 inline mr-1" />Support tickets ({tickets.filter((t) => mine(t.hrName) && t.status === 'open').length})</Chip>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Chip on={scope === 'mine'} onClick={() => setScope('mine')}>My students</Chip>
          <Chip on={scope === 'all'} onClick={() => setScope('all')}>All branches</Chip>
          <span className="w-px h-5 bg-slate-200 mx-1" />
          <Chip on={statusFilter === 'open'} onClick={() => setStatusFilter('open')}>Open</Chip>
          <Chip on={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All</Chip>
          <button type="button" onClick={load} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500 p-6 text-center">Loading…</div>
      ) : view === 'requests' ? (
        reqList.length === 0 ? <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">No {statusFilter === 'open' ? 'open ' : ''}student requests.</div> : (
          <div className="grid gap-3 md:grid-cols-2">
            {reqList.map((r) => (
              <div key={r._id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{REQ_LABEL[r.type] || r.type}</div>
                    <div className="font-bold text-slate-800 text-sm truncate">{r.subject || REQ_LABEL[r.type]}</div>
                    <div className="text-xs text-slate-500">{r.studentName} · {r.studentId} · {r.course}</div>
                  </div>
                  <span className={`text-[10px] h-fit font-bold px-2 py-0.5 rounded-full ${REQ_TONE[r.status] || ''}`}>{r.status}</span>
                </div>
                {r.message && <p className="text-xs text-slate-700 mt-2 whitespace-pre-line">{r.message}</p>}
                {r.type === 'redeem_points' && r.details?.points ? <p className="text-xs text-amber-700 mt-1 font-semibold">{r.details.points} points · resolving deducts them from the student's balance</p> : null}
                {r.response && <p className="text-xs text-slate-600 mt-2 bg-slate-50 rounded-lg px-2 py-1.5">↩ {r.response}{r.respondedBy ? ` — ${r.respondedBy}` : ''}</p>}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] text-slate-400">{ago(r.createdAt)}{scope === 'all' && r.hrName ? ` · HR: ${r.hrName}` : ''}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setTimelineFor({ id: r.studentId, name: r.studentName })} className="text-xs font-semibold text-slate-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-100">Timeline</button>
                    <button type="button" onClick={() => openRespond('request', r)} className="text-xs font-semibold text-white bg-[#0e6977] px-3 py-1.5 rounded-lg hover:opacity-90">Respond</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        ticketList.length === 0 ? <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">No {statusFilter === 'open' ? 'open ' : ''}support tickets.</div> : (
          <div className="grid gap-3 md:grid-cols-2">
            {ticketList.map((t) => (
              <div key={t._id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t.type} · {t.departmentCode}</div>
                    <div className="font-bold text-slate-800 text-sm truncate">{t.title}</div>
                    <div className="text-xs text-slate-500">{t.raisedBy}{t.branchName ? ` · ${t.branchName}` : ''}</div>
                  </div>
                  <span className={`text-[10px] h-fit font-bold px-2 py-0.5 rounded-full ${TICKET_TONE[t.status] || 'bg-slate-100 text-slate-600'}`}>{t.status}</span>
                </div>
                {t.description && <p className="text-xs text-slate-700 mt-2 whitespace-pre-line">{t.description}</p>}
                {t.response && <p className="text-xs text-slate-600 mt-2 bg-slate-50 rounded-lg px-2 py-1.5">↩ {t.response}{t.respondedBy ? ` — ${t.respondedBy}` : ''}</p>}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] text-slate-400">{ago(t.createdAt)}{scope === 'all' && t.hrName ? ` · HR: ${t.hrName}` : ''}</span>
                  <div className="flex gap-2">
                    {t.studentId && <button type="button" onClick={() => setTimelineFor({ id: t.studentId, name: t.raisedBy })} className="text-xs font-semibold text-slate-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-100">Timeline</button>}
                    <button type="button" onClick={() => openRespond('ticket', t)} className="text-xs font-semibold text-white bg-[#0e6977] px-3 py-1.5 rounded-lg hover:opacity-90">Update</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {active && (
        <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-4" onClick={() => !saving && setActive(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-bold text-slate-800">{active.kind === 'request' ? 'Respond to request' : 'Update ticket'}</div>
                <div className="text-xs text-slate-500">{active.item.subject || active.item.title} · {active.item.studentName || active.item.raisedBy}</div>
              </div>
              <button type="button" onClick={() => setActive(null)} className="p-1 rounded-lg hover:bg-slate-100" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
            {active.kind === 'request' ? (
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3">
                {['Open', 'Scheduled', 'Resolved', 'Declined'].map((s) => <option key={s}>{s}</option>)}
              </select>
            ) : (
              <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3">
                {['open', 'in-progress', 'resolved', 'closed'].map((s) => <option key={s}>{s}</option>)}
              </select>
            )}
            {active.kind === 'request' && form.status === 'Scheduled' && (
              <>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Scheduled for</label>
                <input type="datetime-local" value={form.scheduledFor} onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3" />
              </>
            )}
            <label className="block text-xs font-semibold text-slate-600 mb-1">{active.item.type === 'payment_link' ? 'Reply (paste the payment link here)' : 'Reply to student'}</label>
            <textarea rows={4} value={form.response} onChange={(e) => setForm({ ...form, response: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="The student sees this in their portal and gets a notification." />
            {error && <div className="text-xs text-rose-600 mt-2">{error}</div>}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setActive(null)} className="text-sm px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="button" disabled={saving} onClick={save} className="text-sm font-semibold px-4 py-2 rounded-lg text-white bg-[#0e6977] disabled:opacity-50">{saving ? 'Saving…' : 'Send'}</button>
            </div>
          </div>
        </div>
      )}

      {timelineFor && (
        <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setTimelineFor(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div className="font-bold text-slate-800">Timeline · {timelineFor.name}</div>
              <button type="button" onClick={() => setTimelineFor(null)} className="p-1 rounded-lg hover:bg-slate-100" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <StudentTimeline studentId={timelineFor.id} />
          </div>
        </div>
      )}
    </div>
  );
}
