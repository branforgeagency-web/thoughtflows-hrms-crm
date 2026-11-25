// Helpers shared by the Payroll desk and My Payslips
export const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
export const monthLabel = (m) => (m ? new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '');
export const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
export const prevMonth = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

export const SLIP_STATUS = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-700' },
  submitted: { label: 'Waiting approval', cls: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Approved', cls: 'bg-sky-100 text-sky-800' },
  paid: { label: 'Paid', cls: 'bg-emerald-100 text-emerald-800' }
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Net pay in words (Indian numbering)
export function inWords(num) {
  const n = Math.round(Number(num) || 0);
  if (!n) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x) => (x < 20 ? a[x] : `${b[Math.floor(x / 10)]}${x % 10 ? ` ${a[x % 10]}` : ''}`);
  const three = (x) => `${x >= 100 ? `${a[Math.floor(x / 100)]} Hundred${x % 100 ? ' ' : ''}` : ''}${x % 100 ? two(x % 100) : ''}`;
  const parts = [];
  const cr = Math.floor(n / 1e7), lk = Math.floor((n % 1e7) / 1e5), th = Math.floor((n % 1e5) / 1e3), rest = n % 1e3;
  if (cr) parts.push(`${three(cr)} Crore`);
  if (lk) parts.push(`${two(lk)} Lakh`);
  if (th) parts.push(`${two(th)} Thousand`);
  if (rest) parts.push(three(rest));
  return parts.join(' ');
}

// Opens a print-ready payslip (Print → Save as PDF)
export function printPayslip(p) {
  const at = p.attendance || {};
  const rows = Math.max(p.earnings?.length || 0, p.deductions?.length || 0);
  let lines = '';
  for (let i = 0; i < rows; i++) {
    const e = p.earnings?.[i], d = p.deductions?.[i];
    lines += `<tr><td>${e ? esc(e.label) : ''}</td><td class="r">${e ? rupees(e.amount) : ''}</td><td>${d ? esc(d.label) : ''}</td><td class="r">${d ? rupees(d.amount) : ''}</td></tr>`;
  }
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payslip ${esc(p.employeeName)} ${esc(p.month)}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;color:#0f212d;margin:32px;font-size:13px}h1{margin:0;font-size:20px}.muted{color:#64748b}
.head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #00897b;padding-bottom:10px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;margin-top:10px}td,th{border:1px solid #cbd5e1;padding:7px 9px;text-align:left}th{background:#f1f5f9}.r{text-align:right}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px}.net{margin-top:14px;padding:12px;background:#ecfdf5;border:1px solid #a7f3d0;font-size:15px}
@media print{button{display:none}body{margin:12mm}}</style></head><body>
<div class="head"><div><h1>Thoughtflows Medical Coding Academy</h1><div class="muted">Payslip for ${esc(monthLabel(p.month))}</div></div><div class="muted">${esc(p.branch || '')}</div></div>
<div class="grid"><div><b>Employee:</b> ${esc(p.employeeName)}</div><div><b>Employee code:</b> ${esc(p.employeeCode || '—')}</div>
<div><b>Designation:</b> ${esc(p.designation || p.role || '')}</div><div><b>Department:</b> ${esc(p.deptLabel || p.department || '')}</div>
<div><b>Days in month:</b> ${at.daysInMonth ?? ''}</div><div><b>Paid days:</b> ${at.paidDays ?? ''}${at.lopDays ? ` (LOP ${at.lopDays})` : ''}</div>
<div><b>Present:</b> ${at.present ?? ''} · <b>Leave:</b> ${(at.paidLeave || 0) + (at.unpaidLeave || 0)}</div><div><b>Pay mode:</b> ${esc(p.structure?.payMode || '')}${p.paidOn ? ` · paid ${esc(p.paidOn)}` : ''}</div></div>
<table><thead><tr><th>Earnings</th><th class="r">Amount</th><th>Deductions</th><th class="r">Amount</th></tr></thead><tbody>${lines}
<tr><th>Gross earnings</th><th class="r">${rupees(p.gross)}</th><th>Total deductions</th><th class="r">${rupees(p.totalDeductions)}</th></tr></tbody></table>
<div class="net"><b>Net pay: ${rupees(p.net)}</b><br><span class="muted">Rupees ${esc(inWords(p.net))} only</span></div>
${p.lopAmount ? `<p class="muted">LOP: ${rupees(p.fullGross)} ÷ ${at.basisDays} days × ${at.lopDays} day(s) = ${rupees(p.lopAmount)} (monthly salary ${rupees(p.fullGross)})</p>` : ''}
${(p.employer || []).length ? `<table><thead><tr><th>Employer contribution (not deducted) · PF wage ${rupees(p.pf?.wage)}</th><th class="r">Amount</th></tr></thead><tbody>${p.employer.map((e) => `<tr><td>${esc(e.label)}</td><td class="r">${rupees(e.amount)}</td></tr>`).join('')}</tbody></table>` : ''}
<p class="muted" style="margin-top:24px">This is a system-generated payslip.</p>
<button onclick="window.print()" style="padding:8px 16px;margin-top:8px;cursor:pointer">Print / Save as PDF</button>
<script>setTimeout(function(){window.print()},300)</script></body></html>`;
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
