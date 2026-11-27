import React, { useEffect, useState } from 'react';
import { Printer, RefreshCw, Wallet } from 'lucide-react';
import { getMyPayslips } from '../../services/api';
import { errMsg } from './deskUtils';
import { rupees, monthLabel, SLIP_STATUS, printPayslip } from './payrollUtils';
import { PayslipBreakdown } from './PayrollDesk';

// Every employee: their own approved / paid payslips
export default function MyPayslips() {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState('');

  const load = () => getMyPayslips().then((r) => { setList(r.payslips || []); setError(''); if (r.payslips?.[0]) setOpen((o) => o || r.payslips[0].id); }).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  if (!list && !error) return <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />Loading payslips…</div>;
  return (
    <div className="space-y-3 max-w-4xl">
      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
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
              <PayslipBreakdown slip={p} />
              <button onClick={() => printPayslip(p)} className="mt-3 px-3 py-2 rounded-xl bg-[#00897b] text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer"><Printer className="w-4 h-4" />Print / Download PDF</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
