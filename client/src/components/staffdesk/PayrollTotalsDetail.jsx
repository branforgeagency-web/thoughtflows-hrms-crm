import React, { useMemo, useState } from 'react';
import { X, Search, Download, CheckCircle2, Users, Wallet, IndianRupee, MinusCircle, Banknote, Send } from 'lucide-react';
import { downloadCsv } from './deskUtils';
import { rupees, monthLabel, SLIP_STATUS } from './payrollUtils';

// Detail panel behind the summary cards on Monthly Payroll
// kind: employees | payslips | gross | deductions | net | waiting
const TITLES = {
  employees: ['Employees', Users], payslips: ['Payslips', Wallet], gross: ['Gross pay', IndianRupee],
  deductions: ['Deductions', MinusCircle], net: ['Net payable', Banknote], waiting: ['Waiting approval', Send]
};
const inputCls = 'px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white';
const Status = ({ s }) => <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${SLIP_STATUS[s]?.cls || ''}`}>{SLIP_STATUS[s]?.label || s}</span>;
const sum = (list, f) => list.reduce((t, x) => t + (Number(f(x)) || 0), 0);

function groupSum(slips, listKey) {
  const m = new Map();
  for (const s of slips) for (const x of s[listKey] || []) {
    const g = m.get(x.code) || { code: x.code, label: x.label.replace(/\s*\(.*\)$/, ''), amount: 0, count: 0 };
    g.amount += x.amount; g.count += 1; m.set(x.code, g);
  }
  return [...m.values()].sort((a, b) => b.amount - a.amount);
}
function byBranch(slips) {
  const m = new Map();
  for (const s of slips) {
    const k = s.branch || 'No branch';
    const g = m.get(k) || { branch: k, count: 0, gross: 0, deductions: 0, net: 0, lop: 0 };
    g.count += 1; g.gross += s.gross; g.deductions += s.totalDeductions; g.net += s.net; g.lop += s.lopAmount || 0; m.set(k, g);
  }
  return [...m.values()].sort((a, b) => b.net - a.net);
}

const Box = ({ title, children }) => (
  <div className="rounded-xl border border-slate-200 overflow-hidden">
    <div className="px-3 py-2 bg-slate-50 text-xs font-bold text-slate-600 uppercase">{title}</div>
    {children}
  </div>
);
const Line = ({ l, v, strong, tone = '' }) => (
  <div className={`px-3 py-1.5 flex justify-between text-sm border-t border-slate-100 ${strong ? 'font-black' : ''} ${tone}`}><span>{l}</span><span className="font-semibold">{v}</span></div>
);

export default function PayrollTotalsDetail({ kind, month, data, access, initialFilter = '', onClose, onOpenSlip, onBulk, busy }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState(initialFilter);
  const slips = data?.payslips || [];
  const [title, Icon] = TITLES[kind] || ['Details', Users];

  // Everyone in scope: with a payslip, salary set but not generated, or no salary yet
  const people = useMemo(() => [
    ...slips.map((s) => ({ key: s.id, name: s.employeeName, email: s.email, role: s.designation || s.role, dept: s.deptLabel, branch: s.branch, state: s.status, slip: s })),
    ...(data?.notGenerated || []).map((e) => ({ key: e.email, name: e.name, email: e.email, role: e.role, dept: e.deptLabel, branch: e.branch, state: 'notGenerated' })),
    ...(data?.noStructure || []).map((e) => ({ key: e.email, name: e.name, email: e.email, role: e.role, dept: e.deptLabel, branch: e.branch, state: 'noSalary' }))
  ].sort((a, b) => (a.branch || '').localeCompare(b.branch || '') || (a.name || '').localeCompare(b.name || '')), [slips, data]);

  const ql = q.trim().toLowerCase();
  const match = (x) => !ql || `${x.name || x.employeeName} ${x.email} ${x.role || ''} ${x.designation || ''} ${x.branch || ''}`.toLowerCase().includes(ql);
  const waiting = slips.filter((s) => s.status === 'submitted');

  let body = null;
  if (kind === 'employees') {
    const counts = { '': people.length, slip: slips.length, notGenerated: data?.notGenerated?.length || 0, noSalary: data?.noStructure?.length || 0 };
    const rows = people.filter((p) => match(p) && (!filter || (filter === 'slip' ? p.slip : p.state === filter)));
    body = (
      <>
        <Chips value={filter} onChange={setFilter} items={[['', `All (${counts['']})`], ['slip', `Payslip made (${counts.slip})`], ['notGenerated', `Salary set, no payslip (${counts.notGenerated})`], ['noSalary', `No salary set (${counts.noSalary})`]]} />
        <Table head={['Employee', 'Department', 'Branch', 'Payroll status', 'Net pay']} rows={rows} empty="No employees match." render={(p) => (
          <tr key={p.key} onClick={() => p.slip && onOpenSlip(p.slip.id)} className={`border-t border-slate-100 ${p.slip ? 'cursor-pointer hover:bg-slate-50' : ''}`}>
            <td className="p-2.5"><div className="font-semibold text-slate-800">{p.name}</div><div className="text-xs text-slate-500">{p.role}</div></td>
            <td className="p-2.5 text-slate-600">{p.dept}</td><td className="p-2.5 text-slate-600">{p.branch || '—'}</td>
            <td className="p-2.5">{p.slip ? <Status s={p.state} /> : p.state === 'noSalary' ? <span className="text-xs font-bold text-rose-600">No salary set</span> : <span className="text-xs font-bold text-amber-600">Not generated</span>}</td>
            <td className="p-2.5 text-right font-bold text-emerald-700">{p.slip ? rupees(p.slip.net) : '—'}</td>
          </tr>
        )} />
        {counts.noSalary > 0 && <p className="text-xs text-slate-500">Employees with no salary are left out of payroll — add them in <b>Salary Structures</b>.</p>}
      </>
    );
  } else if (kind === 'payslips' || kind === 'net' || kind === 'waiting') {
    const base = kind === 'waiting' ? waiting : slips;
    const rows = base.filter((s) => match(s) && (!filter || s.status === filter));
    const statusSums = ['draft', 'submitted', 'approved', 'paid'].map((st) => [st, slips.filter((s) => s.status === st)]);
    body = (
      <>
        {kind === 'net' && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Box title="Net pay by status">
              {statusSums.map(([st, l]) => <Line key={st} l={`${SLIP_STATUS[st].label} (${l.length})`} v={rupees(sum(l, (s) => s.net))} />)}
              <Line strong l="Total net payable" v={rupees(sum(slips, (s) => s.net))} />
            </Box>
            <Box title="Net pay by branch">
              <div className="max-h-48 overflow-y-auto">{byBranch(slips).map((b) => <Line key={b.branch} l={`${b.branch} (${b.count})`} v={rupees(b.net)} />)}</div>
            </Box>
          </div>
        )}
        {kind === 'payslips' && <Chips value={filter} onChange={setFilter} items={[['', `All (${slips.length})`], ...statusSums.map(([st, l]) => [st, `${SLIP_STATUS[st].label} (${l.length})`])]} />}
        {kind === 'waiting' && waiting.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
            <span><b>{waiting.length}</b> payslip(s) · net {rupees(sum(waiting, (s) => s.net))} submitted for approval.</span>
            {access.canApprove
              ? <button disabled={busy} onClick={() => onBulk('approve', waiting.map((s) => s.id))} className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"><CheckCircle2 className="w-3.5 h-3.5" />Approve all {waiting.length}</button>
              : <span className="text-xs">A Department Head approves these.</span>}
          </div>
        )}
        <Table head={['Employee', 'Branch', 'Paid days', 'LOP', 'Gross', 'Deductions', 'Net pay', 'Status']} rows={kind === 'net' ? [...rows].sort((a, b) => b.net - a.net) : rows}
          empty={kind === 'waiting' ? 'Nothing is waiting for approval.' : 'No payslips match.'}
          foot={rows.length > 0 && <tr className="border-t-2 border-slate-200 font-black"><td className="p-2.5" colSpan={4}>Total ({rows.length})</td><td className="p-2.5 text-right">{rupees(sum(rows, (s) => s.gross))}</td><td className="p-2.5 text-right text-rose-600">{rupees(sum(rows, (s) => s.totalDeductions))}</td><td className="p-2.5 text-right text-emerald-700">{rupees(sum(rows, (s) => s.net))}</td><td /></tr>}
          render={(s) => (
            <tr key={s.id} onClick={() => onOpenSlip(s.id)} className="border-t border-slate-100 cursor-pointer hover:bg-slate-50">
              <td className="p-2.5"><div className="font-semibold text-slate-800">{s.employeeName}</div><div className="text-xs text-slate-500">{s.designation || s.role}</div></td>
              <td className="p-2.5 text-slate-600">{s.branch || '—'}</td>
              <td className="p-2.5 text-right">{s.attendance?.paidDays}/{s.attendance?.basisDays}</td>
              <td className={`p-2.5 text-right ${s.attendance?.lopDays ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>{s.attendance?.lopDays || 0}</td>
              <td className="p-2.5 text-right">{rupees(s.gross)}</td><td className="p-2.5 text-right text-rose-600">{rupees(s.totalDeductions)}</td>
              <td className="p-2.5 text-right font-black text-emerald-700">{rupees(s.net)}</td><td className="p-2.5"><Status s={s.status} /></td>
            </tr>
          )} />
      </>
    );
  } else if (kind === 'gross') {
    const comps = groupSum(slips, 'earnings');
    const full = sum(slips, (s) => s.fullGross), lop = sum(slips, (s) => s.lopAmount), gross = sum(slips, (s) => s.gross);
    const rows = slips.filter(match).sort((a, b) => b.gross - a.gross);
    body = (
      <>
        <div className="grid sm:grid-cols-2 gap-3">
          <Box title="How gross is made up">
            <Line l="Full monthly salary (no LOP)" v={rupees(full)} />
            <Line l="Less: LOP cut" v={`−${rupees(lop)}`} tone="text-rose-600" />
            {comps.filter((c) => ['INC', 'BON', 'ARR', 'OE'].includes(c.code)).map((c) => <Line key={c.code} l={`Add: ${c.label} (${c.count})`} v={rupees(c.amount)} tone="text-emerald-700" />)}
            <Line strong l="Gross pay" v={rupees(gross)} />
          </Box>
          <Box title="Gross by salary component">
            {comps.map((c) => <Line key={c.code} l={`${c.label} (${c.count})`} v={rupees(c.amount)} />)}
          </Box>
        </div>
        <Box title="Gross by branch">
          <div className="max-h-44 overflow-y-auto">{byBranch(slips).map((b) => <Line key={b.branch} l={`${b.branch} (${b.count})${b.lop ? ` · LOP −${rupees(b.lop)}` : ''}`} v={rupees(b.gross)} />)}</div>
        </Box>
        <Table head={['Employee', 'Branch', 'Monthly salary', 'LOP days', 'LOP cut', 'Additions', 'Gross']} rows={rows} empty="No payslips yet." render={(s) => {
          const add = sum((s.earnings || []).filter((e) => ['INC', 'BON', 'ARR', 'OE'].includes(e.code)), (e) => e.amount);
          return (
            <tr key={s.id} onClick={() => onOpenSlip(s.id)} className="border-t border-slate-100 cursor-pointer hover:bg-slate-50">
              <td className="p-2.5 font-semibold text-slate-800">{s.employeeName}</td><td className="p-2.5 text-slate-600">{s.branch || '—'}</td>
              <td className="p-2.5 text-right">{rupees(s.fullGross)}</td><td className="p-2.5 text-right">{s.attendance?.lopDays || 0}</td>
              <td className="p-2.5 text-right text-rose-600">{s.lopAmount ? `−${rupees(s.lopAmount)}` : '—'}</td>
              <td className="p-2.5 text-right text-emerald-700">{add ? rupees(add) : '—'}</td><td className="p-2.5 text-right font-black">{rupees(s.gross)}</td>
            </tr>
          );
        }} />
      </>
    );
  } else if (kind === 'deductions') {
    const ded = groupSum(slips, 'deductions');
    const emp = groupSum(slips, 'employer');
    const codes = ['PF', 'ESI', 'PT', 'TDS', 'ADV', 'OD'];
    const get = (s, c) => (s.deductions || []).find((d) => d.code === c)?.amount || 0;
    const rows = slips.filter(match).filter((s) => s.totalDeductions > 0).sort((a, b) => b.totalDeductions - a.totalDeductions);
    body = (
      <>
        <div className="grid sm:grid-cols-2 gap-3">
          <Box title="Deducted from employees">
            {ded.length === 0 && <Line l="No deductions" v="—" />}
            {ded.map((d) => <Line key={d.code} l={`${d.label} (${d.count} employee${d.count > 1 ? 's' : ''})`} v={rupees(d.amount)} />)}
            <Line strong l="Total deductions" v={rupees(sum(slips, (s) => s.totalDeductions))} tone="text-rose-600" />
          </Box>
          <Box title="Employer contribution (paid by company, not deducted)">
            {emp.length === 0 && <Line l="None" v="—" />}
            {emp.map((d) => <Line key={d.code} l={d.label} v={rupees(d.amount)} />)}
            <Line strong l="Total employer cost" v={rupees(sum(slips, (s) => s.employerTotal))} />
          </Box>
        </div>
        <Table head={['Employee', 'Branch', 'PF', 'ESI', 'PT', 'TDS', 'Advance / other', 'Total']} rows={rows} empty="No deductions for this month." render={(s) => (
          <tr key={s.id} onClick={() => onOpenSlip(s.id)} className="border-t border-slate-100 cursor-pointer hover:bg-slate-50">
            <td className="p-2.5 font-semibold text-slate-800">{s.employeeName}</td><td className="p-2.5 text-slate-600">{s.branch || '—'}</td>
            {codes.slice(0, 4).map((c) => <td key={c} className="p-2.5 text-right">{get(s, c) ? rupees(get(s, c)) : '—'}</td>)}
            <td className="p-2.5 text-right">{get(s, 'ADV') + get(s, 'OD') ? rupees(get(s, 'ADV') + get(s, 'OD')) : '—'}</td>
            <td className="p-2.5 text-right font-black text-rose-600">{rupees(s.totalDeductions)}</td>
          </tr>
        )} />
      </>
    );
  }

  const exportRows = () => {
    if (kind === 'employees') {
      downloadCsv(`payroll-employees-${month}.csv`, [{ label: 'Employee', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Role', key: 'role' }, { label: 'Department', key: 'dept' }, { label: 'Branch', key: 'branch' },
        { label: 'Payroll status', get: (p) => (p.slip ? SLIP_STATUS[p.state]?.label : p.state === 'noSalary' ? 'No salary set' : 'Not generated') }, { label: 'Net pay', get: (p) => p.slip?.net ?? '' }], people);
    } else {
      downloadCsv(`payroll-${kind}-${month}.csv`, [{ label: 'Employee', key: 'employeeName' }, { label: 'Email', key: 'email' }, { label: 'Branch', key: 'branch' }, { label: 'Paid days', get: (s) => s.attendance?.paidDays }, { label: 'LOP days', get: (s) => s.attendance?.lopDays },
        { label: 'Monthly salary', key: 'fullGross' }, { label: 'LOP amount', key: 'lopAmount' }, { label: 'Gross', key: 'gross' }, ...['PF', 'ESI', 'PT', 'TDS', 'ADV', 'OD'].map((c) => ({ label: c, get: (s) => (s.deductions || []).find((d) => d.code === c)?.amount || '' })),
        { label: 'Total deductions', key: 'totalDeductions' }, { label: 'Net pay', key: 'net' }, { label: 'Status', key: 'status' }], kind === 'waiting' ? waiting : slips);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-4xl h-full bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <div>
            <div className="text-lg font-black text-slate-800 flex items-center gap-2"><Icon className="w-5 h-5 text-teal-600" />{title}</div>
            <div className="text-xs text-slate-500">{monthLabel(month)} · click a row to open the payslip</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search employee" className={`${inputCls} pl-8 w-44`} />
            </div>
            <button onClick={exportRows} className={`${inputCls} font-semibold flex items-center gap-1.5 cursor-pointer`}><Download className="w-4 h-4" />Excel</button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">{body}</div>
      </div>
    </div>
  );
}

function Chips({ value, onChange, items }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(([k, l]) => <button key={k} onClick={() => onChange(k)} className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${value === k ? 'bg-[#0f212d] text-white border-[#0f212d]' : 'bg-white border-slate-200 text-slate-600'}`}>{l}</button>)}
    </div>
  );
}

function Table({ head, rows, render, empty, foot }) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
          <tr>{head.map((h, i) => <th key={h} className={`p-2.5 ${i >= 2 && !['Payroll status', 'Status', 'Branch', 'Department'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={head.length} className="p-6 text-center text-slate-500">{empty}</td></tr>}
          {rows.map(render)}
          {foot}
        </tbody>
      </table>
    </div>
  );
}
