import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Download, Search, Calculator, Send, CheckCircle2, Banknote, Undo2, Printer, X, AlertTriangle, Pencil, Trash2, Plus, Users, Wallet, MinusCircle, IndianRupee } from 'lucide-react';
import {
  getPayrollMe, getPayrollRun, generatePayroll, savePayslipAdjustments, payslipAction, payrollBulkAction, deletePayslip,
  getSalaryStructures, saveSalaryStructure, savePayrollSettings
} from '../../services/api';
import PaginationBar from '../PaginationBar';
import { errMsg, downloadCsv, todayKey } from './deskUtils';
import { rupees, monthLabel, prevMonth, thisMonth, SLIP_STATUS, printPayslip } from './payrollUtils';

// Payroll — salary from the Attendance & Leave register.
//   Branch Head / Business Lead: own branch — salaries, generate, adjust, submit.
//   Department Head / Admin: every branch — plus approve, mark paid, settings.
export default function PayrollDesk() {
  const [access, setAccess] = useState(null);
  const [error, setError] = useState('');
  const [sub, setSub] = useState('run');
  useEffect(() => { getPayrollMe().then(setAccess).catch((e) => setError(errMsg(e))); }, []);

  if (error) return <Err e={error} />;
  if (!access) return <Loading />;
  if (!access.canPrepare) return <Err e={access.noBranch ? 'No branch is set on your account, so there is no branch payroll to show. Ask Admin to set your branch.' : 'Payroll is managed by Branch Heads, Business Leads and Department Heads.'} />;
  const subs = [['run', 'Monthly Payroll'], ['structures', 'Salary Structures'], ...(access.canEditSettings ? [['settings', 'Payroll Settings']] : [])];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 p-1 bg-white rounded-xl border border-slate-200">
          {subs.map(([k, l]) => (
            <button key={k} onClick={() => setSub(k)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer ${sub === k ? 'bg-[#0f212d] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{l}</button>
          ))}
        </div>
        <div className="text-xs text-slate-500">
          {access.canApprove ? 'All employees · you can approve and mark salaries paid' : 'All employees · you prepare and submit; a Department Head approves'}
        </div>
      </div>
      {sub === 'run' && <RunTab access={access} />}
      {sub === 'structures' && <StructuresTab access={access} />}
      {sub === 'settings' && <SettingsTab settings={access.settings} onSaved={(s) => setAccess({ ...access, settings: s })} />}
    </div>
  );
}

// ---------------------------------------------------------------- shared bits
const Card = ({ children, className = '' }) => <div className={`bg-white rounded-2xl border border-slate-200 ${className}`}>{children}</div>;
const Err = ({ e }) => (e ? <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{e}</div> : null);
const Ok = ({ m }) => (m ? <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">{m}</div> : null);
const Loading = () => <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />Loading…</div>;
const Status = ({ s }) => <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${SLIP_STATUS[s]?.cls || ''}`}>{SLIP_STATUS[s]?.label || s}</span>;
const inputCls = 'px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white';

function usePaged(rows) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const totalPages = Math.max(1, Math.ceil(rows.length / limit));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const pageRows = rows.slice((page - 1) * limit, page * limit);
  const bar = <PaginationBar page={page} totalPages={totalPages} totalCount={rows.length} limit={limit} onPageChange={setPage} onLimitChange={(n) => { setLimit(n); setPage(1); }} itemLabel="employees" />;
  return { pageRows, bar };
}

function BranchPicker({ access, value, onChange }) {
  if (access.scope !== 'org') return null;
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      <option value="all">All branches</option>
      {(access.branches || []).map((b) => <option key={b} value={b}>{b}</option>)}
      <option value="none">No branch (HQ / Online)</option>
    </select>
  );
}

// Attendance + earnings / deductions of one payslip (also used in My Payslips)
export function PayslipBreakdown({ slip }) {
  const a = slip.attendance || {};
  const chips = [
    ['Days in month', a.daysInMonth], ['Week offs', a.weekOffs], ['Holidays', a.holidays], ['Present', a.present],
    ['Paid leave', a.paidLeave], ['Unpaid leave', a.unpaidLeave], ['Absent', a.absent], ['Late logins', a.lateMarks],
    ['LOP days', a.lopDays], ['Paid days', a.paidDays]
  ];
  return (
    <div className="space-y-3 mt-3">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {chips.map(([l, v]) => (
          <div key={l} className={`p-2 rounded-xl border ${l === 'Paid days' ? 'border-emerald-200 bg-emerald-50' : l === 'LOP days' && v ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-400">{l}</div>
            <div className="text-base font-black text-slate-800">{v ?? 0}</div>
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-3 py-2 bg-emerald-50 text-xs font-bold text-emerald-800 uppercase">Earnings</div>
          {(slip.earnings || []).map((e) => <div key={e.code + e.label} className="px-3 py-1.5 flex justify-between text-sm border-t border-slate-100"><span>{e.label}</span><span className="font-semibold">{rupees(e.amount)}</span></div>)}
          <div className="px-3 py-2 flex justify-between text-sm border-t border-slate-200 font-black"><span>Gross</span><span>{rupees(slip.gross)}</span></div>
        </div>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-3 py-2 bg-rose-50 text-xs font-bold text-rose-800 uppercase">Deductions</div>
          {(slip.deductions || []).length === 0 && <div className="px-3 py-1.5 text-sm text-slate-400 border-t border-slate-100">None</div>}
          {(slip.deductions || []).map((d) => <div key={d.code + d.label} className="px-3 py-1.5 flex justify-between text-sm border-t border-slate-100"><span>{d.label}</span><span className="font-semibold">{rupees(d.amount)}</span></div>)}
          <div className="px-3 py-2 flex justify-between text-sm border-t border-slate-200 font-black"><span>Total</span><span>{rupees(slip.totalDeductions)}</span></div>
        </div>
      </div>
      {slip.lopAmount > 0 && (
        <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
          LOP cut: {rupees(slip.fullGross)} monthly ÷ {a.basisDays} days = {rupees(slip.perDay)} per day × {a.lopDays} LOP day(s) = <b>{rupees(slip.lopAmount)}</b>
        </div>
      )}
      <div className="p-3 rounded-xl bg-[#0f212d] text-white flex justify-between items-center"><span className="font-bold">Net pay</span><span className="text-xl font-black">{rupees(slip.net)}</span></div>
      {(slip.employer || []).length > 0 && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-3 py-2 bg-slate-50 text-xs font-bold text-slate-600 uppercase">Employer contribution (paid by company — not deducted) · PF wage {rupees(slip.pf?.wage)}</div>
          {slip.employer.map((e) => <div key={e.code} className="px-3 py-1.5 flex justify-between text-sm border-t border-slate-100"><span>{e.label}</span><span className="font-semibold">{rupees(e.amount)}</span></div>)}
          <div className="px-3 py-2 flex justify-between text-sm border-t border-slate-200 font-black"><span>Total employer contribution</span><span>{rupees(slip.employerTotal)}</span></div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Monthly payroll
function RunTab({ access }) {
  const [month, setMonth] = useState(prevMonth());
  const [branch, setBranch] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [picked, setPicked] = useState(new Set());
  const [openId, setOpenId] = useState('');
  const [payForm, setPayForm] = useState(null); // { paidOn, paymentRef }

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getPayrollRun({ month, branch })); setError(''); } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  }, [month, branch]);
  useEffect(() => { load(); setPicked(new Set()); }, [load]);

  const slips = data?.payslips || [];
  const ql = q.trim().toLowerCase();
  const filtered = slips.filter((s) => (!status || s.status === status) && (!ql || `${s.employeeName} ${s.email} ${s.role} ${s.branch}`.toLowerCase().includes(ql)));
  const { pageRows, bar } = usePaged(filtered);
  const open = slips.find((s) => s.id === openId);

  const run = async (fn, okText) => {
    setBusy(true); setMsg(''); setError('');
    try { const r = await fn(); setMsg(typeof okText === 'function' ? okText(r) : okText); await load(); setPicked(new Set()); } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };
  const generate = () => run(() => generatePayroll({ month, branch }), (r) => `Payroll for ${monthLabel(month)}: ${r.created} new, ${r.updated} recalculated${r.locked ? `, ${r.locked} already submitted/approved (not changed)` : ''}.`);
  const bulk = (action, extra = {}) => run(() => payrollBulkAction({ action, ids: [...picked], ...extra }), (r) => `${r.done} payslip(s) updated.${r.skipped?.length ? ` Skipped: ${r.skipped.slice(0, 3).join('; ')}${r.skipped.length > 3 ? '…' : ''}` : ''}`);

  const pickedSlips = slips.filter((s) => picked.has(s.id));
  const allOnPage = pageRows.length > 0 && pageRows.every((s) => picked.has(s.id));
  const toggleAll = () => setPicked((p) => { const n = new Set(p); pageRows.forEach((s) => (allOnPage ? n.delete(s.id) : n.add(s.id))); return n; });
  const t = data?.totals || {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input type="month" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} className={inputCls} />
          <BranchPicker access={access} value={branch} onChange={setBranch} />
          <button disabled={busy} onClick={generate} className="px-3.5 py-2 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
            <Calculator className="w-4 h-4" />{slips.length ? 'Recalculate drafts' : 'Generate payroll'}
          </button>
          {(loading || busy) && <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search employee" className={`${inputCls} pl-8 w-48`} />
          </div>
          <button onClick={() => downloadCsv(`payroll-${month}${branch !== 'all' ? `-${branch}` : ''}.csv`, [
            { label: 'Employee', key: 'employeeName' }, { label: 'Code', key: 'employeeCode' }, { label: 'Email', key: 'email' }, { label: 'Department', key: 'deptLabel' },
            { label: 'Designation', key: 'designation' }, { label: 'Branch', key: 'branch' }, { label: 'Days in month', get: (s) => s.attendance?.daysInMonth },
            { label: 'Present', get: (s) => s.attendance?.present }, { label: 'Paid leave', get: (s) => s.attendance?.paidLeave }, { label: 'LOP days', get: (s) => s.attendance?.lopDays },
            { label: 'Paid days', get: (s) => s.attendance?.paidDays }, { label: 'Monthly salary', key: 'fullGross' }, { label: 'LOP amount', key: 'lopAmount' }, ...['BASIC', 'DA', 'HRA', 'CONV', 'SPL', 'OTH', 'INC', 'BON', 'ARR', 'OE'].map((c) => ({ label: c, get: (s) => s.earnings.find((e) => e.code === c)?.amount || '' })),
            { label: 'Gross', key: 'gross' }, ...['PF', 'ESI', 'PT', 'TDS', 'ADV', 'OD'].map((c) => ({ label: c, get: (s) => s.deductions.find((d) => d.code === c)?.amount || '' })),
            { label: 'Total deductions', key: 'totalDeductions' }, { label: 'Net pay', key: 'net' }, { label: 'PF wage', get: (s) => s.pf?.wage || '' },
            ...['EPF_ER', 'EPS', 'EDLI', 'PFADM'].map((c) => ({ label: `Employer ${c}`, get: (s) => (s.employer || []).find((e) => e.code === c)?.amount || '' })), { label: 'Pay mode', get: (s) => s.structure?.payMode }, { label: 'Status', key: 'status' }, { label: 'Paid on', key: 'paidOn' }, { label: 'Payment ref', key: 'paymentRef' }
          ], filtered)} className={`${inputCls} font-semibold flex items-center gap-1.5 cursor-pointer`}><Download className="w-4 h-4" />Excel</button>
        </div>
      </div>
      <Err e={error} /><Ok m={msg} />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[['Employees', t.employees, Users, 'text-slate-700'], ['Payslips', t.payslips, Wallet, 'text-teal-700'], ['Gross', rupees(t.gross), IndianRupee, 'text-slate-800'],
          ['Deductions', rupees(t.deductions), MinusCircle, 'text-rose-600'], ['Net payable', rupees(t.net), Banknote, 'text-emerald-700'], ['Waiting approval', t.submitted, Send, 'text-amber-600']].map(([l, v, Icon, tone]) => (
          <Card key={l} className="p-3.5">
            <div className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1"><Icon className={`w-3.5 h-3.5 ${tone}`} />{l}</div>
            <div className={`text-xl font-black ${tone}`}>{v ?? 0}</div>
          </Card>
        ))}
      </div>

      {(data?.noStructure?.length > 0 || data?.notGenerated?.length > 0) && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            {data.noStructure.length > 0 && <div><b>{data.noStructure.length}</b> employee(s) have no salary set and are left out: {data.noStructure.slice(0, 6).map((e) => e.name).join(', ')}{data.noStructure.length > 6 ? '…' : ''} — add them in <b>Salary Structures</b>.</div>}
            {data.notGenerated.length > 0 && <div><b>{data.notGenerated.length}</b> employee(s) with a salary have no payslip for this month yet — click <b>{slips.length ? 'Recalculate drafts' : 'Generate payroll'}</b>.</div>}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {[['', `All (${slips.length})`], ['draft', `Draft (${t.draft || 0})`], ['submitted', `Waiting approval (${t.submitted || 0})`], ['approved', `Approved (${t.approved || 0})`], ['paid', `Paid (${t.paid || 0})`]].map(([k, l]) => (
            <button key={k} onClick={() => setStatus(k)} className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${status === k ? 'bg-[#0f212d] text-white border-[#0f212d]' : 'bg-white border-slate-200 text-slate-600'}`}>{l}</button>
          ))}
        </div>
        {picked.size > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">{picked.size} selected</span>
            {pickedSlips.some((s) => s.status === 'draft') && <button disabled={busy} onClick={() => bulk('submit')} className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"><Send className="w-3.5 h-3.5" />Submit for approval</button>}
            {access.canApprove && pickedSlips.some((s) => ['draft', 'submitted'].includes(s.status)) && <button disabled={busy} onClick={() => bulk('approve')} className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"><CheckCircle2 className="w-3.5 h-3.5" />Approve</button>}
            {access.canApprove && pickedSlips.some((s) => s.status === 'approved') && <button disabled={busy} onClick={() => setPayForm({ paidOn: todayKey(), paymentRef: '' })} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"><Banknote className="w-3.5 h-3.5" />Mark paid</button>}
            {pickedSlips.some((s) => s.status === 'submitted') && <button disabled={busy} onClick={() => bulk(access.canApprove ? 'reject' : 'reopen')} className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"><Undo2 className="w-3.5 h-3.5" />Back to draft</button>}
          </div>
        )}
      </div>

      {payForm && (
        <Card className="p-3 flex flex-wrap items-end gap-2">
          <label className="text-xs font-bold text-slate-500">Paid on<input type="date" value={payForm.paidOn} onChange={(e) => setPayForm({ ...payForm, paidOn: e.target.value })} className={`${inputCls} block mt-1`} /></label>
          <label className="text-xs font-bold text-slate-500">Payment / UTR reference<input value={payForm.paymentRef} onChange={(e) => setPayForm({ ...payForm, paymentRef: e.target.value })} placeholder="optional" className={`${inputCls} block mt-1 w-56`} /></label>
          <button disabled={busy} onClick={async () => { await bulk('paid', payForm); setPayForm(null); }} className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold cursor-pointer">Mark {pickedSlips.filter((s) => s.status === 'approved').length} as paid</button>
          <button onClick={() => setPayForm(null)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm cursor-pointer">Cancel</button>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
            <tr>
              <th className="p-3 w-8"><input type="checkbox" checked={allOnPage} onChange={toggleAll} /></th>
              <th className="p-3 text-left">Employee</th><th className="p-3 text-left">Branch</th>
              <th className="p-3 text-right">Paid days</th><th className="p-3 text-right">LOP</th>
              <th className="p-3 text-right">Gross</th><th className="p-3 text-right">Deductions</th><th className="p-3 text-right">Net pay</th>
              <th className="p-3 text-left">Status</th><th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={10} className="p-8 text-center text-slate-500">{slips.length ? 'No payslips match the filter.' : `No payroll for ${monthLabel(month)} yet. Set salaries in Salary Structures, then click Generate payroll.`}</td></tr>
            )}
            {pageRows.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="p-3"><input type="checkbox" checked={picked.has(s.id)} onChange={() => setPicked((p) => { const n = new Set(p); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; })} /></td>
                <td className="p-3">
                  <div className="font-semibold text-slate-800 flex items-center gap-1">{s.employeeName}{s.warnings?.length > 0 && <AlertTriangle title={s.warnings.join('\n')} className="w-3.5 h-3.5 text-amber-500" />}</div>
                  <div className="text-xs text-slate-500">{s.designation || s.role} · {s.deptLabel}</div>
                </td>
                <td className="p-3 text-slate-600">{s.branch || '—'}</td>
                <td className="p-3 text-right font-semibold">{s.attendance?.paidDays}/{s.attendance?.basisDays}</td>
                <td className={`p-3 text-right ${s.attendance?.lopDays ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>{s.attendance?.lopDays || 0}{s.lopAmount > 0 && <div className="text-[10px] font-semibold">−{rupees(s.lopAmount)}</div>}</td>
                <td className="p-3 text-right">{rupees(s.gross)}</td>
                <td className="p-3 text-right text-rose-600">{rupees(s.totalDeductions)}</td>
                <td className="p-3 text-right font-black text-emerald-700">{rupees(s.net)}</td>
                <td className="p-3"><Status s={s.status} />{s.provisional && <div className="text-[10px] text-amber-600 font-bold mt-0.5">provisional</div>}</td>
                <td className="p-3 text-right"><button onClick={() => setOpenId(s.id)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold cursor-pointer hover:bg-white">{s.status === 'draft' ? 'Review / edit' : 'View'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {bar}

      {open && <SlipPanel slip={open} access={access} onClose={() => setOpenId('')} onChanged={load} />}
    </div>
  );
}

// ---------------------------------------------------------------- one payslip (side panel)
function SlipPanel({ slip, access, onClose, onChanged }) {
  const [adj, setAdj] = useState(() => ({ ...{ incentive: 0, bonus: 0, arrears: 0, otherEarning: 0, advance: 0, otherDeduction: 0, lopOverride: null, note: '' }, ...(slip.adjustments || {}) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(slip);
  useEffect(() => { setCurrent(slip); }, [slip]);
  const draft = current.status === 'draft';

  const save = async () => {
    setBusy(true); setError('');
    try { setCurrent(await savePayslipAdjustments(current.id, adj)); onChanged(); } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };
  const act = async (action, extra = {}) => {
    setBusy(true); setError('');
    try { setCurrent(await payslipAction(current.id, { action, ...extra })); onChanged(); } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm(`Remove the draft payslip of ${current.employeeName}? You can generate it again later.`)) return;
    setBusy(true);
    try { await deletePayslip(current.id); onChanged(); onClose(); } catch (e) { setError(errMsg(e)); setBusy(false); }
  };
  const field = (k, label) => (
    <label key={k} className="text-xs font-bold text-slate-500">{label}
      <input type="number" min="0" disabled={!draft} value={adj[k] ?? 0} onChange={(e) => setAdj({ ...adj, [k]: e.target.value })} className={`${inputCls} block mt-1 w-full disabled:bg-slate-50`} />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[95] bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-2xl h-full bg-[#f4f8f8] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-lg font-black text-slate-800">{current.employeeName}</div>
            <div className="text-xs text-slate-500">{current.designation || current.role} · {current.deptLabel} · {current.branch || 'No branch'} · {monthLabel(current.month)}</div>
            <div className="mt-1 flex items-center gap-2"><Status s={current.status} />{current.paidOn && <span className="text-xs text-slate-500">Paid {current.paidOn}{current.paymentRef ? ` · ${current.paymentRef}` : ''}</span>}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <Err e={error} />
        {current.warnings?.length > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-0.5">{current.warnings.map((w) => <div key={w}>• {w}</div>)}</div>
        )}
        <PayslipBreakdown slip={current} />

        <Card className="p-4 mt-3">
          <div className="text-sm font-bold text-slate-700 mb-2">Adjustments {draft ? '' : '(locked — send back to draft to change)'}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {field('incentive', 'Incentive (+)')}{field('bonus', 'Bonus (+)')}{field('arrears', 'Arrears (+)')}{field('otherEarning', 'Other earning (+)')}
            {field('advance', 'Advance recovery (−)')}{field('otherDeduction', 'Other deduction (−)')}
            <label className="text-xs font-bold text-slate-500">LOP days (override)
              <input type="number" min="0" step="0.5" disabled={!draft} value={adj.lopOverride ?? ''} placeholder={`auto: ${current.attendance?.attendanceLop ?? 0}`} onChange={(e) => setAdj({ ...adj, lopOverride: e.target.value === '' ? null : e.target.value })} className={`${inputCls} block mt-1 w-full disabled:bg-slate-50`} />
            </label>
            <label className="text-xs font-bold text-slate-500 col-span-2">Note
              <input disabled={!draft} value={adj.note || ''} onChange={(e) => setAdj({ ...adj, note: e.target.value })} placeholder="e.g. October incentive, 2 LOP waived" className={`${inputCls} block mt-1 w-full disabled:bg-slate-50`} />
            </label>
          </div>
          {draft && <button disabled={busy} onClick={save} className="mt-3 px-3.5 py-2 rounded-xl bg-[#0f212d] text-white text-sm font-bold cursor-pointer disabled:opacity-50">Save &amp; recalculate</button>}
        </Card>

        <div className="mt-3 flex flex-wrap gap-2">
          {draft && <button disabled={busy} onClick={() => act('submit')} className="px-3.5 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer"><Send className="w-4 h-4" />Submit for approval</button>}
          {access.canApprove && ['draft', 'submitted'].includes(current.status) && <button disabled={busy} onClick={() => act('approve')} className="px-3.5 py-2 rounded-xl bg-sky-600 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer"><CheckCircle2 className="w-4 h-4" />Approve</button>}
          {access.canApprove && current.status === 'approved' && <button disabled={busy} onClick={() => act('paid', { paidOn: todayKey() })} className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer"><Banknote className="w-4 h-4" />Mark paid today</button>}
          {current.status === 'submitted' && <button disabled={busy} onClick={() => act(access.canApprove ? 'reject' : 'reopen')} className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold flex items-center gap-1.5 cursor-pointer"><Undo2 className="w-4 h-4" />Back to draft</button>}
          {access.canApprove && current.status === 'approved' && <button disabled={busy} onClick={() => act('reject')} className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold flex items-center gap-1.5 cursor-pointer"><Undo2 className="w-4 h-4" />Back to draft</button>}
          <button onClick={() => printPayslip(current)} className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold flex items-center gap-1.5 cursor-pointer"><Printer className="w-4 h-4" />Print payslip</button>
          {draft && <button disabled={busy} onClick={remove} className="px-3.5 py-2 rounded-xl text-rose-600 text-sm font-bold flex items-center gap-1.5 cursor-pointer hover:bg-rose-50"><Trash2 className="w-4 h-4" />Remove draft</button>}
        </div>

        {(current.history || []).length > 0 && (
          <div className="mt-4 text-xs text-slate-500 space-y-0.5">
            <div className="font-bold text-slate-600">History</div>
            {[...current.history].reverse().slice(0, 12).map((h, i) => <div key={i}>{new Date(h.at).toLocaleString('en-IN')} · {h.action} by {h.by}{h.note ? ` — ${h.note}` : ''}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Salary structures
const EMPTY = { payType: 'monthly', employeeCode: '', designation: '', joiningDate: '', basic: 0, da: 0, hra: 0, conveyance: 0, special: 0, otherAllowance: 0, pfApplicable: true, esiApplicable: false, ptApplicable: true, tdsMonthly: 0, payMode: 'Bank transfer', active: true, note: '' };

function StructuresTab({ access }) {
  const [branch, setBranch] = useState('all');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [only, setOnly] = useState('');
  const [edit, setEdit] = useState(null);

  const load = useCallback(() => getSalaryStructures({ branch }).then((r) => { setRows(r.rows || []); setError(''); }).catch((e) => setError(errMsg(e))), [branch]);
  useEffect(() => { load(); }, [load]);

  const ql = q.trim().toLowerCase();
  const list = (rows || []).filter((r) => (!only || (only === 'missing' ? !r.structure : !!r.structure)) && (!ql || `${r.name} ${r.email} ${r.role} ${r.branch}`.toLowerCase().includes(ql)));
  const { pageRows, bar } = usePaged(list);
  const missing = (rows || []).filter((r) => !r.structure).length;
  const monthlyGross = (s) => (s ? ['basic', 'da', 'hra', 'conveyance', 'special', 'otherAllowance'].reduce((t, k) => t + (Number(s[k]) || 0), 0) : 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <BranchPicker access={access} value={branch} onChange={setBranch} />
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search employee" className={`${inputCls} pl-8 w-52`} />
          </div>
          <select value={only} onChange={(e) => setOnly(e.target.value)} className={inputCls}>
            <option value="">Everyone ({rows?.length || 0})</option>
            <option value="missing">Salary not set ({missing})</option>
            <option value="set">Salary set ({(rows?.length || 0) - missing})</option>
          </select>
        </div>
        <button onClick={() => downloadCsv('salary-structures.csv', [
          { label: 'Employee', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Department', key: 'deptLabel' }, { label: 'Role', key: 'role' }, { label: 'Branch', key: 'branch' },
          { label: 'Basic', get: (r) => r.structure?.basic ?? '' }, { label: 'DA', get: (r) => r.structure?.da ?? '' }, { label: 'HRA', get: (r) => r.structure?.hra ?? '' },
          { label: 'Conveyance', get: (r) => r.structure?.conveyance ?? '' }, { label: 'Special', get: (r) => r.structure?.special ?? '' }, { label: 'Other', get: (r) => r.structure?.otherAllowance ?? '' },
          { label: 'Monthly salary', get: (r) => monthlyGross(r.structure) || '' }, { label: 'PF', get: (r) => (r.structure?.pfApplicable ? 'Yes' : '') }, { label: 'ESI', get: (r) => (r.structure?.esiApplicable ? 'Yes' : '') }
        ], list)} className={`${inputCls} font-semibold flex items-center gap-1.5 cursor-pointer`}><Download className="w-4 h-4" />Excel</button>
      </div>
      <Err e={error} />
      {!rows && !error && <Loading />}
      {rows && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr><th className="p-3 text-left">Employee</th><th className="p-3 text-left">Branch</th><th className="p-3 text-right">Basic + DA</th><th className="p-3 text-right">Monthly salary</th><th className="p-3 text-left">Statutory</th><th className="p-3 text-left">Updated</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">No employees here.</td></tr>}
              {pageRows.map((r) => {
                const s = r.structure;
                return (
                  <tr key={r.email} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-3"><div className="font-semibold text-slate-800">{r.name}</div><div className="text-xs text-slate-500">{r.role} · {r.deptLabel}</div></td>
                    <td className="p-3 text-slate-600">{r.branch || '—'}</td>
                    <td className="p-3 text-right">{s ? rupees((s.basic || 0) + (s.da || 0)) : <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold">Not set</span>}</td>
                    <td className="p-3 text-right font-semibold">{s ? rupees(monthlyGross(s)) : '—'}</td>
                    <td className="p-3 text-xs text-slate-600">{s ? [s.pfApplicable && 'PF', s.esiApplicable && 'ESI', s.ptApplicable && 'PT', s.tdsMonthly ? 'TDS' : ''].filter(Boolean).join(' · ') || '—' : ''}</td>
                    <td className="p-3 text-xs text-slate-500">{s?.updatedBy || ''}</td>
                    <td className="p-3 text-right"><button onClick={() => setEdit(r)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold cursor-pointer hover:bg-white flex items-center gap-1 ml-auto">{s ? <><Pencil className="w-3 h-3" />Edit</> : <><Plus className="w-3 h-3" />Set salary</>}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      {rows && bar}
      {edit && <StructureForm row={edit} settings={access.settings} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function StructureForm({ row, settings, onClose, onSaved }) {
  const [f, setF] = useState(() => ({ ...EMPTY, ...(row.structure || {}), designation: row.structure?.designation || row.role || '' }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const gross = ['basic', 'da', 'hra', 'conveyance', 'special', 'otherAllowance'].reduce((t, k) => t + (Number(f[k]) || 0), 0);
  // PF preview for a full month (same rule as the server)
  const st = settings || {};
  const basicDa = (Number(f.basic) || 0) + (Number(f.da) || 0);
  const pfWageFull = st.pf50Rule !== false ? Math.max(basicDa, gross / 2) : basicDa;
  const pfWage = Math.round(st.pfRestrictToCeiling !== false ? Math.min(pfWageFull, Number(st.pfWageCap) || Infinity) : pfWageFull);
  const empPf = f.pfApplicable ? Math.round(pfWage * (Number(st.pfRate) || 12) / 100) : 0;
  // Quick split: Basic 50% · HRA 20% · Special 30%
  const split = () => {
    const g = Number(window.prompt('Monthly gross salary (₹)?', gross || '')) || 0;
    if (!g) return;
    const basic = Math.round(g * 0.5), hra = Math.round(g * 0.2);
    setF((x) => ({ ...x, basic, da: 0, hra, conveyance: 0, otherAllowance: 0, special: g - basic - hra }));
  };
  const save = async () => {
    setBusy(true); setError('');
    try { await saveSalaryStructure(row.email, f); onSaved(); } catch (e) { setError(errMsg(e)); setBusy(false); }
  };
  const num = (k, label) => (
    <label key={k} className="text-xs font-bold text-slate-500">{label}
      <input type="number" min="0" value={f[k] ?? 0} onChange={(e) => set(k, e.target.value)} className={`${inputCls} block mt-1 w-full`} />
    </label>
  );
  const check = (k, label) => (
    <label key={k} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={!!f[k]} onChange={(e) => set(k, e.target.checked)} />{label}</label>
  );
  return (
    <div className="fixed inset-0 z-[95] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div><div className="text-lg font-black text-slate-800">Salary — {row.name}</div><div className="text-xs text-slate-500">{row.role} · {row.deptLabel} · {row.branch || 'No branch'} · {row.email}</div></div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <Err e={error} />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          <label className="text-xs font-bold text-slate-500">Employee code<input value={f.employeeCode} onChange={(e) => set('employeeCode', e.target.value)} className={`${inputCls} block mt-1 w-full`} /></label>
          <label className="text-xs font-bold text-slate-500">Designation<input value={f.designation} onChange={(e) => set('designation', e.target.value)} className={`${inputCls} block mt-1 w-full`} /></label>
          <label className="text-xs font-bold text-slate-500">Joining date<input type="date" value={f.joiningDate || ''} onChange={(e) => set('joiningDate', e.target.value)} className={`${inputCls} block mt-1 w-full`} /></label>
          <label className="text-xs font-bold text-slate-500">Pay mode
            <select value={f.payMode} onChange={(e) => set('payMode', e.target.value)} className={`${inputCls} block mt-1 w-full`}><option>Bank transfer</option><option>UPI</option><option>Cheque</option><option>Cash</option></select>
          </label>
          {num('tdsMonthly', 'TDS per month (₹)')}
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between"><div className="text-sm font-bold text-slate-700">Monthly salary (full month)</div><button onClick={split} className="text-xs font-bold text-teal-700 cursor-pointer">Split a gross amount…</button></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {num('basic', 'Basic')}{num('da', 'DA (if any)')}{num('hra', 'HRA')}{num('conveyance', 'Conveyance')}{num('special', 'Special allowance')}{num('otherAllowance', 'Other allowance')}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200"><div className="text-[10px] font-bold uppercase text-emerald-700">Monthly salary</div><div className="text-lg font-black text-emerald-800">{rupees(gross)}</div></div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200"><div className="text-[10px] font-bold uppercase text-slate-500">PF wage (full month)</div><div className="text-lg font-black text-slate-800">{f.pfApplicable ? rupees(pfWage) : '—'}</div></div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200"><div className="text-[10px] font-bold uppercase text-slate-500">Employee PF</div><div className="text-lg font-black text-slate-800">{f.pfApplicable ? rupees(empPf) : '—'}</div></div>
          </div>
          <div className="text-xs text-slate-500 mt-1">LOP cut = monthly salary ÷ days × LOP days. PF = {st.pfRate || 12}% of PF wage (Basic + DA, at least 50% of salary), capped at ₹{Number(st.pfWageCap || 25000).toLocaleString('en-IN')}; reduced in LOP months.</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">{check('pfApplicable', 'PF')}{check('esiApplicable', 'ESI')}{check('ptApplicable', 'Professional tax')}{check('active', 'Include in payroll')}</div>
        <label className="text-xs font-bold text-slate-500 block mt-3">Reason for change (optional)<input value={f.note || ''} onChange={(e) => set('note', e.target.value)} placeholder="e.g. Increment from Nov 2026" className={`${inputCls} block mt-1 w-full`} /></label>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm cursor-pointer">Cancel</button>
          <button disabled={busy} onClick={save} className="px-4 py-2 rounded-xl bg-[#00897b] text-white text-sm font-bold cursor-pointer disabled:opacity-50">Save salary</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Settings
function SettingsTab({ settings, onSaved }) {
  const [f, setF] = useState(() => JSON.parse(JSON.stringify(settings || {})));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const states = useMemo(() => Object.keys(f.ptSlabs || {}), [f.ptSlabs]);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setSlab = (state, i, k, v) => setF((x) => {
    const slabs = { ...x.ptSlabs, [state]: x.ptSlabs[state].map((s, j) => (j === i ? { ...s, [k]: v === '' && k === 'upto' ? null : v } : s)) };
    return { ...x, ptSlabs: slabs };
  });
  const save = async () => {
    setBusy(true); setError(''); setMsg('');
    try {
      const body = { ...f, unpaidLeaveCodes: String(f.unpaidLeaveCodes || '').split ? String(f.unpaidLeaveCodes).split(',').map((s) => s.trim()) : f.unpaidLeaveCodes };
      const s = await savePayrollSettings(body); setF(s); onSaved(s); setMsg('Payroll settings saved. Recalculate draft payslips to apply them.');
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };
  const n = (k, label, hint) => (
    <label className="text-xs font-bold text-slate-500">{label}
      <input type="number" min="0" step="any" value={f[k] ?? ''} onChange={(e) => set(k, e.target.value)} className={`${inputCls} block mt-1 w-full`} />
      {hint && <span className="font-normal text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
  return (
    <div className="space-y-4 max-w-4xl">
      <Err e={error} /><Ok m={msg} />
      <Card className="p-4">
        <div className="text-sm font-bold text-slate-700 mb-3">Attendance → pay</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <label className="text-xs font-bold text-slate-500">Per-day salary basis
            <select value={f.lopBasis} onChange={(e) => set('lopBasis', e.target.value)} className={`${inputCls} block mt-1 w-full`}>
              <option value="calendar">Calendar days (÷ 28–31)</option><option value="working">Working days (week-offs & holidays excluded)</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500">Unpaid leave types
            <input value={Array.isArray(f.unpaidLeaveCodes) ? f.unpaidLeaveCodes.join(', ') : f.unpaidLeaveCodes || ''} onChange={(e) => set('unpaidLeaveCodes', e.target.value)} className={`${inputCls} block mt-1 w-full`} />
            <span className="font-normal text-[11px] text-slate-400">Leave codes cut from salary, e.g. LOP</span>
          </label>
        </div>
        <div className="text-xs text-slate-500 mt-2">LOP days = absent days + ½ for each half day (worked less than the half-day minutes in Policy &amp; Holidays) + unpaid leave. Approved paid leave, week-offs and holidays are paid. Late logins do not cut salary.</div>
      </Card>
      <Card className="p-4">
        <div className="text-sm font-bold text-slate-700 mb-1">Provident Fund (EPF Scheme 2026)</div>
        <div className="text-xs text-slate-500 mb-3">PF wage = Basic + DA, but at least 50% of the monthly salary; reduced in LOP months. Employee and employer each pay {f.pfRate || 12}% of PF wage. Ceiling ₹25,000 from 17 Sep 2026 (was ₹15,000).</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {n('pfRate', 'PF % (employee & employer)')}{n('pfWageCap', 'PF wage ceiling (₹)')}{n('epsRate', 'Employer EPS %', 'rest of employer 12% goes to EPF')}{n('edliRate', 'EDLI %')}{n('pfAdminRate', 'PF admin charges %')}
        </div>
        <div className="mt-3 flex flex-wrap gap-5 text-sm text-slate-700">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.pfRestrictToCeiling !== false} onChange={(e) => set('pfRestrictToCeiling', e.target.checked)} />Restrict PF to the wage ceiling (max ₹{Math.round((Number(f.pfWageCap) || 0) * (Number(f.pfRate) || 0) / 100).toLocaleString('en-IN')}/month)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.pf50Rule !== false} onChange={(e) => set('pf50Rule', e.target.checked)} />50% wage rule (Labour Codes)</label>
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-sm font-bold text-slate-700 mb-3">ESI (only for employees ticked for ESI)</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {n('esiRate', 'ESI %')}{n('esiGrossLimit', 'ESI applies up to salary (₹)')}
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-bold text-slate-700">Professional tax (per month, on gross) — by branch state</div>
          <label className="text-xs font-bold text-slate-500 flex items-center gap-2">Online / no-branch staff use
            <select value={f.defaultState} onChange={(e) => set('defaultState', e.target.value)} className={inputCls}>{states.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
        </div>
        <div className="text-xs text-amber-700 mb-3">These are starting values — please confirm the current slabs with your accountant before running payroll.</div>
        <div className="grid sm:grid-cols-2 gap-3">
          {states.map((st) => (
            <div key={st} className="rounded-xl border border-slate-200 p-3">
              <div className="font-bold text-sm text-slate-700 mb-1">{st}</div>
              {(f.ptSlabs[st] || []).map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs mb-1">
                  <span className="text-slate-500 w-16">Gross ≤</span>
                  <input type="number" value={s.upto ?? ''} placeholder="above" onChange={(e) => setSlab(st, i, 'upto', e.target.value)} className="px-2 py-1 rounded-lg border border-slate-200 w-24" />
                  <span className="text-slate-500">PT ₹</span>
                  <input type="number" value={s.amount} onChange={(e) => setSlab(st, i, 'amount', e.target.value)} className="px-2 py-1 rounded-lg border border-slate-200 w-20" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
      <button disabled={busy} onClick={save} className="px-4 py-2 rounded-xl bg-[#00897b] text-white text-sm font-bold cursor-pointer disabled:opacity-50">Save payroll settings</button>
    </div>
  );
}
