import React, { useMemo, useState } from 'react';
import { X, Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, RefreshCw, Table } from 'lucide-react';
import { ALL_BRANCH_OPTIONS, detectBranchFromText } from '../constants/branches';
import { createStudentsBulk, notifyDataUpdate } from '../services/api';

/**
 * Bulk upload of ADMITTED students — takes the branch admission sheet as-is
 * (S.NO, STUDENT ID, NAME, CONTACT, COURSE, HR Name, BRANCH, MOJ, DOJ, …,
 * TOTAL FEE, FIRST INSTALLMENT, MODE OF PAYMENT, TRANSACTION ID, DATE,
 * SECOND INSTALLMENT, …). Paste straight from Google Sheets or pick a CSV.
 * Every row is admitted by the server exactly like a single walk-in
 * (duplicate check, Student ID, lead link, receipts, portal login).
 */

const CHUNK = 10;

const SHEET_TEMPLATE_HEADERS = [
  'S.NO', 'STUDENT ID', 'NAME', 'CONTACT', 'COURSE', 'HR Name', 'BRANCH', 'MOJ', 'DOJ',
  'BATCH TIMING', 'BATCH TYPE', 'MAIL ID', 'QUALIFICATION', 'YEAR OF PASSED OUT',
  'LIFE SCIENCE/NON LIFE SCIENCE', 'COLLEGE/COMPANY', 'CANDIDATE LOCATION', 'DOB',
  'MODE OF SOURCE', 'MONTH OF ENQUIRY', 'TOTAL FEE',
  'FIRST INSTALLMENT', 'MODE OF PAYMENT-Online', 'TRANSACTION ID', 'DATE',
  'SECOND INSTALLMENT', 'MODE OF PAYMENT-Online', 'TRANSACTION ID', 'DATE',
  'BALANCE FEE', 'FEES REMARKS', 'REMARKS'
];

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const pad = (n) => String(n).padStart(2, '0');
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const num = (v) => {
  const n = Number(String(v ?? '').replace(/[₹,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const monthIndex = (v) => {
  const m = clean(v).toUpperCase().slice(0, 3);
  return MONTHS.indexOf(m);
};
const titleCase = (v) => clean(v).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// Same rule as the server: Indian mobile, +91 / 0 prefix allowed
const normalizeMobile = (v) => {
  let d = String(v || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : '';
};

// "02-11-2026", "2/11/2026", "2026-11-02", "Nov 2", "2 Nov", "November 2" → "YYYY-MM-DD"
function parseSheetDate(v, defaultYear) {
  const s = clean(v);
  if (!s) return '';
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${pad(m[2])}-${pad(m[1])}`;
  }
  m = s.match(/^([A-Za-z]+)\.?\s*(\d{1,2})(?:,?\s*(\d{4}))?$/);
  if (m && monthIndex(m[1]) >= 0) return `${m[3] || defaultYear}-${pad(monthIndex(m[1]) + 1)}-${pad(m[2])}`;
  m = s.match(/^(\d{1,2})\s*([A-Za-z]+)\.?(?:,?\s*(\d{4}))?$/);
  if (m && monthIndex(m[2]) >= 0) return `${m[3] || defaultYear}-${pad(monthIndex(m[2]) + 1)}-${pad(m[1])}`;
  return '';
}

// Quoted-cell aware parser for TSV (Google Sheets copy) and CSV
function parseTable(text) {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim()) || '';
  const delim = firstLine.includes('\t') ? '\t' : ',';
  const rows = [];
  let row = [];
  let cell = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') inQ = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => clean(c)));
}

const normHeader = (h) => clean(h).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

// Header → field. Instalment columns (MODE OF PAYMENT / TRANSACTION ID / DATE)
// repeat, so they attach to whichever instalment column came just before.
function buildColumnMap(headers) {
  const map = [];
  let inst = -1;
  headers.forEach((raw, idx) => {
    const h = normHeader(raw);
    let key = null;
    if (/^S ?NO$|^SL ?NO$|^SERIAL/.test(h)) key = null;
    else if (h === 'STUDENT ID' || h === 'ID') key = 'studentId';
    else if (['NAME', 'STUDENT NAME', 'CANDIDATE NAME', 'FULL NAME'].includes(h)) key = 'name';
    else if (/^(CONTACT|MOBILE|PHONE)/.test(h)) key = 'phone';
    else if (/WHATSAPP/.test(h)) key = 'whatsappNumber';
    else if (h === 'COURSE') key = 'course';
    else if (h === 'HR NAME' || h === 'HR' || h === 'COUNSELLOR' || h === 'COUNSELOR') key = 'hrName';
    else if (h === 'BRANCH') key = 'branch';
    else if (h === 'MOJ' || h === 'MONTH OF JOINING') key = 'moj';
    else if (h === 'DOJ' || h === 'DATE OF JOINING') key = 'doj';
    else if (h === 'BATCH TIMING') key = 'batchTiming';
    else if (h === 'BATCH TYPE') key = 'batchType';
    else if (/^(MAIL ID|EMAIL|E MAIL|MAIL)/.test(h)) key = 'email';
    else if (h === 'QUALIFICATION') key = 'qualification';
    else if (/YEAR OF PASS|PASS ?OUT|PASSED OUT/.test(h)) key = 'passoutYear';
    else if (/LIFE SCIENCE/.test(h)) key = 'qualTag';
    else if (/COLLEGE/.test(h)) key = 'collegeCompany';
    else if (/LOCATION/.test(h)) key = 'location';
    else if (h === 'DOB' || h === 'DATE OF BIRTH') key = 'dob';
    else if (/SOURCE/.test(h)) key = 'source';
    else if (/MONTH OF ENQUIRY|ENQUIRY MONTH/.test(h)) key = 'enquiryMonth';
    else if (h === 'TOTAL FEE' || h === 'COURSE FEE' || h === 'FEE') key = 'totalFee';
    else if (/^(FIRST|1ST|SECOND|2ND|THIRD|3RD|FOURTH|4TH) INSTAL/.test(h)) {
      inst = ['FIRST', '1ST', 'SECOND', '2ND', 'THIRD', '3RD', 'FOURTH', '4TH'].findIndex((w) => h.startsWith(w)) >> 1;
      key = `inst${inst}.amount`;
    } else if (/^MODE OF PAYMENT/.test(h) && inst >= 0) key = `inst${inst}.mode`;
    else if (/^TRANSACTION/.test(h) && inst >= 0) key = `inst${inst}.reference`;
    else if (h === 'DATE' && inst >= 0) key = `inst${inst}.date`;
    else if (/^BALANCE/.test(h)) key = 'balance';
    else if (h === 'FEES REMARKS' || h === 'FEE REMARKS') key = 'feeRemarks';
    else if (h === 'REMARKS') key = 'remarks';
    map[idx] = key;
  });
  return map;
}

function normalizeCourse(raw, mode) {
  const c = clean(raw);
  const u = c.toUpperCase();
  if (/AMCT/.test(u)) {
    const level = /INTER/.test(u) ? 'Intermediate' : /ADV/.test(u) ? 'Advanced' : /BEGIN/.test(u) ? 'Beginner' : '';
    if (level) return `AMCT ${level} (${mode})`;
  }
  return c;
}

function mapRow(cells, colMap, opts, rowNo) {
  const r = { inst: [] };
  colMap.forEach((key, idx) => {
    if (!key) return;
    const v = cells[idx] ?? '';
    if (key.startsWith('inst')) {
      const [k, f] = key.split('.');
      const i = Number(k.slice(4));
      r.inst[i] = r.inst[i] || {};
      r.inst[i][f] = clean(v);
    } else if (key === 'remarks' && r.remarks) r.remarks += ` ${clean(v)}`;
    else r[key] = clean(v);
  });

  const branchRaw = r.branch || '';
  const mode = /online/i.test(branchRaw) ? 'Online' : 'Classroom';
  const branch = detectBranchFromText(branchRaw) || opts.defaultBranch || '';
  const batchDate = parseSheetDate(r.doj, opts.year);
  const joinMonth = batchDate ? Number(batchDate.slice(5, 7)) - 1 : new Date().getMonth();
  const joinYear = batchDate ? Number(batchDate.slice(0, 4)) : Number(opts.year);
  const enqIdx = monthIndex(r.enquiryMonth);
  const enquiryMonth = enqIdx >= 0 ? `${enqIdx > joinMonth ? joinYear - 1 : joinYear}-${pad(enqIdx + 1)}` : '';

  const installments = (r.inst || []).filter(Boolean).map((x) => ({
    amount: num(x.amount),
    mode: titleCase(x.mode || ''),
    reference: clean(x.reference),
    date: parseSheetDate(x.date, joinYear) || batchDate
  })).filter((x) => x.amount > 0);
  const paidAmount = installments.reduce((a, x) => a + x.amount, 0);
  const courseFee = num(r.totalFee);

  const dobIso = parseSheetDate(r.dob, joinYear);
  const qt = clean(r.qualTag).toUpperCase();
  const bt = clean(r.batchType).toUpperCase();
  const notes = [r.feeRemarks && `Fees: ${r.feeRemarks}`, r.remarks].filter(Boolean).join(' · ');

  const payload = {
    rowNo,
    studentId: clean(r.studentId).toUpperCase(),
    name: clean(r.name).toUpperCase(),
    phone: clean(r.phone),
    whatsappNumber: clean(r.whatsappNumber || r.phone),
    email: clean(r.email).toLowerCase(),
    course: normalizeCourse(r.course, mode),
    hrName: clean(r.hrName),
    branch,
    leadBranch: branch,
    mode,
    batchDate,
    registeredAt: batchDate ? new Date(`${batchDate}T10:00:00+05:30`).toISOString() : undefined,
    batchTiming: clean(r.batchTiming),
    batchType: bt.includes('/') || bt.includes('BOTH') ? 'Both' : bt.startsWith('WEEKEND') ? 'Weekends' : bt.startsWith('WEEKDAY') ? 'Weekdays' : titleCase(bt),
    qualification: clean(r.qualification),
    qualTag: qt.startsWith('NON') ? 'Grad' : qt.includes('LIFE') ? 'Life Sci' : '',
    passoutYear: clean(r.passoutYear),
    collegeCompany: clean(r.collegeCompany),
    college: clean(r.collegeCompany),
    location: titleCase(r.location),
    dob: dobIso || clean(r.dob),
    source: titleCase(r.source) || 'Bulk Upload',
    leadCameFor: 'Admission',
    enquiryMonth,
    courseFee,
    paidAmount,
    installments,
    paymentMethod: installments[0]?.mode || '',
    paymentReference: installments[0]?.reference || '',
    notes,
    statusGroup: 'in_course'
  };

  const errors = [];
  const warnings = [];
  if (!payload.name) errors.push('Name missing');
  if (!payload.course) errors.push('Course missing');
  if (!normalizeMobile(payload.phone)) errors.push(payload.phone ? `Contact ${payload.phone} is not a 10-digit Indian mobile` : 'Contact missing');
  if (courseFee > 0 && paidAmount > courseFee) errors.push(`Paid ₹${paidAmount} is more than fee ₹${courseFee}`);
  if (!batchDate) warnings.push(r.doj ? `DOJ "${r.doj}" not understood — today's date will be used` : 'No DOJ');
  if (!payload.email) warnings.push('No email — no portal login will be created');
  if (!detectBranchFromText(branchRaw)) warnings.push(`Branch "${branchRaw || 'blank'}" → ${branch || 'none'}`);
  if (r.balance !== undefined && clean(r.balance) !== '' && courseFee > 0 && num(r.balance) !== courseFee - paidAmount) {
    warnings.push(`Sheet balance ₹${num(r.balance)} ≠ fee − paid (₹${courseFee - paidAmount})`);
  }
  if (!courseFee) warnings.push('No total fee — course rate card will be used');
  return { payload, errors, warnings };
}

function downloadCsv(filename, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function BulkAdmitStudentsModal({ isOpen, onClose, onDone, currentUser }) {
  const [text, setText] = useState('');
  const [defaultBranch, setDefaultBranch] = useState(() => detectBranchFromText(currentUser?.branch || '') || 'Hopes (CBE)');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [parsed, setParsed] = useState(null); // { rows: [{payload, errors, warnings}], unknownHeaders }
  const [parseError, setParseError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState(null);

  const readyRows = useMemo(() => (parsed?.rows || []).filter((r) => !r.errors.length), [parsed]);
  const blockedRows = useMemo(() => (parsed?.rows || []).filter((r) => r.errors.length), [parsed]);

  if (!isOpen) return null;

  const handleParse = (content = text) => {
    setParseError('');
    setResults(null);
    try {
      const table = parseTable(String(content || ''));
      if (table.length < 2) throw new Error('Paste the header row and at least one student row.');
      const headerIdx = table.findIndex((r) => r.some((c) => /^(NAME|STUDENT NAME)$/i.test(clean(c))));
      if (headerIdx < 0) throw new Error('Header row not found — it needs at least a NAME column (copy the sheet including its header row).');
      const colMap = buildColumnMap(table[headerIdx]);
      if (!colMap.includes('phone')) throw new Error('No CONTACT / Mobile column found in the header row.');
      const rows = table.slice(headerIdx + 1)
        .map((cells, i) => ({ cells, rowNo: headerIdx + i + 2 }))
        .filter(({ cells }) => cells.some((c, idx) => ['name', 'phone'].includes(colMap[idx]) && clean(c)))
        .map(({ cells, rowNo }) => mapRow(cells, colMap, { defaultBranch, year }, rowNo));
      if (!rows.length) throw new Error('No student rows found under the header.');
      setParsed({ rows });
    } catch (e) {
      setParsed(null);
      setParseError(e.message);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (/\.xlsx?$/i.test(file.name)) {
      setParseError('Excel files can’t be read directly — in Excel/Google Sheets use File → Download → CSV, or just copy the rows and paste them here.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = String(evt.target?.result || '');
      setText(content);
      handleParse(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!readyRows.length) return;
    setUploading(true);
    setProgress({ done: 0, total: readyRows.length });
    const all = [];
    try {
      for (let i = 0; i < readyRows.length; i += CHUNK) {
        const chunk = readyRows.slice(i, i + CHUNK).map((r) => r.payload);
        try {
          const res = await createStudentsBulk(chunk);
          all.push(...(res.results || []));
        } catch (err) {
          const msg = err?.response?.data?.error || err.message || 'Upload failed';
          chunk.forEach((p) => all.push({ rowNo: p.rowNo, ok: false, name: p.name, phone: p.phone, error: msg }));
        }
        setProgress({ done: Math.min(i + CHUNK, readyRows.length), total: readyRows.length });
      }
    } finally {
      const blocked = blockedRows.map((r) => ({ rowNo: r.payload.rowNo, ok: false, name: r.payload.name, phone: r.payload.phone, error: r.errors.join('; '), skipped: true }));
      const final = [...all, ...blocked].sort((a, b) => a.rowNo - b.rowNo);
      setResults(final);
      setUploading(false);
      if (all.some((r) => r.ok)) {
        notifyDataUpdate('students');
        notifyDataUpdate('leads');
        if (onDone) onDone(final);
      }
    }
  };

  const downloadResults = () => {
    downloadCsv(`Bulk_Admission_Result_${Date.now()}.csv`, [
      ['SHEET ROW', 'NAME', 'CONTACT', 'RESULT', 'STUDENT ID', 'HR NAME', 'PORTAL LOGIN EMAIL', 'PORTAL PASSWORD', 'REASON'],
      ...results.map((r) => [
        r.rowNo, r.name, r.phone,
        r.ok ? 'Admitted' : r.skipped ? 'Not sent' : r.duplicate ? 'Duplicate' : 'Failed',
        r.studentId || '', r.hrName || '',
        r.studentLogin?.email || '', r.studentLogin?.password || '',
        r.error || (r.studentLogin?.existing ? 'Login already existed' : '')
      ])
    ]);
  };

  const okCount = results?.filter((r) => r.ok).length || 0;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-200 bg-[#00796b] text-white">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              <h2 className="font-extrabold text-base sm:text-lg">Bulk Upload · Admitted Students</h2>
            </div>
            <p className="text-xs text-teal-100 mt-1">
              Paste rows from your branch admission sheet (with the header row) or pick a CSV. Each row is admitted like a walk-in: duplicate check, Student ID, fee receipts and portal login.
            </p>
          </div>
          <button onClick={onClose} disabled={uploading} className="p-1.5 rounded-lg hover:bg-white/15 disabled:opacity-40" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!results && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="text-xs font-bold text-slate-700">
                  Branch for rows marked only “ONLINE” / blank
                  <select value={defaultBranch} onChange={(e) => setDefaultBranch(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm font-medium">
                    {ALL_BRANCH_OPTIONS.filter((b) => b.value !== 'Not Mentioned').map((b) => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Year for dates like “Nov 2”
                  <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm font-medium" />
                </label>
                <div className="flex items-end gap-2">
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg px-3 py-2 text-xs font-bold text-slate-800">
                    <Upload className="w-4 h-4" /> Choose CSV
                    <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={handleFile} className="hidden" />
                  </label>
                  <button
                    onClick={() => downloadCsv('Admitted_Students_Template.csv', [SHEET_TEMPLATE_HEADERS])}
                    className="flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <Download className="w-4 h-4" /> Template
                  </button>
                </div>
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={parsed ? 4 : 10}
                placeholder={'Copy from Google Sheets (header row + students) and paste here…\nS.NO\tSTUDENT ID\tNAME\tCONTACT\tCOURSE\tHR Name\tBRANCH\tMOJ\tDOJ\t…'}
                className="w-full border border-slate-300 rounded-xl p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              />

              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => handleParse()} disabled={!text.trim()} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-xl">
                  <Table className="w-4 h-4" /> Preview rows
                </button>
                <span className="text-[11px] text-slate-500">
                  Counsellor logins always admit under their own name; branch heads / admins keep each row’s HR Name. A Student ID already in use gets the next free ID.
                </span>
              </div>

              {parseError && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {parseError}
                </div>
              )}

              {parsed && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700">
                    {parsed.rows.length} rows · <span className="text-emerald-700">{readyRows.length} ready</span>
                    {blockedRows.length > 0 && <> · <span className="text-rose-700">{blockedRows.length} can’t be admitted (fix in the sheet and re-paste)</span></>}
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="min-w-full text-[11px]">
                      <thead className="bg-slate-50 text-slate-600 font-bold uppercase">
                        <tr>
                          {['Row', 'Student ID', 'Name', 'Contact', 'Course', 'Mode', 'Branch', 'HR', 'DOJ', 'Fee', 'Paid', 'Check'].map((h) => (
                            <th key={h} className="px-2 py-2 text-left whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.rows.map(({ payload: p, errors, warnings }) => (
                          <tr key={p.rowNo} className={`border-t border-slate-100 ${errors.length ? 'bg-rose-50/60' : ''}`}>
                            <td className="px-2 py-1.5 text-slate-500">{p.rowNo}</td>
                            <td className="px-2 py-1.5 font-mono">{p.studentId || <span className="text-slate-400">auto</span>}</td>
                            <td className="px-2 py-1.5 font-semibold text-slate-900 whitespace-nowrap">{p.name}</td>
                            <td className="px-2 py-1.5 font-mono">{p.phone}</td>
                            <td className="px-2 py-1.5 whitespace-nowrap">{p.course}</td>
                            <td className="px-2 py-1.5">{p.mode}</td>
                            <td className="px-2 py-1.5 whitespace-nowrap">{p.branch}</td>
                            <td className="px-2 py-1.5 whitespace-nowrap">{p.hrName}</td>
                            <td className="px-2 py-1.5 whitespace-nowrap">{p.batchDate || '—'}</td>
                            <td className="px-2 py-1.5">₹{p.courseFee.toLocaleString('en-IN')}</td>
                            <td className="px-2 py-1.5">₹{p.paidAmount.toLocaleString('en-IN')}{p.installments.length > 1 ? ` (${p.installments.length})` : ''}</td>
                            <td className="px-2 py-1.5 min-w-[220px]">
                              {errors.map((e) => <div key={e} className="text-rose-700 font-bold">✗ {e}</div>)}
                              {!errors.length && warnings.map((w) => <div key={w} className="text-amber-700">• {w}</div>)}
                              {!errors.length && !warnings.length && <span className="text-emerald-700 font-bold">✓ Ready</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {results && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div className="text-sm font-bold text-emerald-900">
                  {okCount} admitted · {results.length - okCount} not admitted
                </div>
                <button onClick={downloadResults} className="ml-auto flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-lg">
                  <Download className="w-4 h-4" /> Download result + logins (CSV)
                </button>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="min-w-full text-[11px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase">
                    <tr>{['Row', 'Name', 'Contact', 'Result', 'Student ID', 'Portal login', 'Reason'].map((h) => <th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={`${r.rowNo}-${r.name}`} className={`border-t border-slate-100 ${r.ok ? '' : 'bg-rose-50/60'}`}>
                        <td className="px-2 py-1.5 text-slate-500">{r.rowNo}</td>
                        <td className="px-2 py-1.5 font-semibold whitespace-nowrap">{r.name}</td>
                        <td className="px-2 py-1.5 font-mono">{r.phone}</td>
                        <td className={`px-2 py-1.5 font-bold ${r.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {r.ok ? 'Admitted' : r.skipped ? 'Not sent' : r.duplicate ? 'Duplicate' : 'Failed'}
                        </td>
                        <td className="px-2 py-1.5 font-mono">{r.studentId || ''}</td>
                        <td className="px-2 py-1.5">{r.studentLogin?.created ? `${r.studentLogin.email} / ${r.studentLogin.password}` : r.studentLogin?.existing ? 'Already existed' : ''}</td>
                        <td className="px-2 py-1.5 text-slate-600 max-w-[380px]">{r.error || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-600 font-semibold">
            {uploading && <span className="flex items-center gap-1.5"><RefreshCw className="w-4 h-4 animate-spin" /> Admitting {progress.done} / {progress.total}…</span>}
          </div>
          <div className="flex items-center gap-2">
            {results ? (
              <>
                <button onClick={() => { setResults(null); setParsed(null); setText(''); }} className="text-xs font-bold px-4 py-2 rounded-xl border border-slate-300 hover:bg-white">Upload another sheet</button>
                <button onClick={onClose} className="text-xs font-bold px-4 py-2 rounded-xl bg-[#00796b] text-white">Done</button>
              </>
            ) : (
              <>
                <button onClick={onClose} disabled={uploading} className="text-xs font-bold px-4 py-2 rounded-xl border border-slate-300 hover:bg-white disabled:opacity-40">Cancel</button>
                <button
                  onClick={handleImport}
                  disabled={uploading || !readyRows.length}
                  className="flex items-center gap-1.5 text-xs font-extrabold px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 disabled:opacity-40"
                >
                  <Upload className="w-4 h-4" /> Admit {readyRows.length} student{readyRows.length === 1 ? '' : 's'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
