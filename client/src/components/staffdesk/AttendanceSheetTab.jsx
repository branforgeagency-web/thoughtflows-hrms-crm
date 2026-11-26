import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Upload, FileSpreadsheet, RefreshCw, Save, Trash2, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Search, ClipboardPaste, Download } from 'lucide-react';
import { previewAttendanceSheet, saveAttendanceSheet, getAttendanceSheet, deleteAttendanceSheet } from '../../services/api';
import PaginationBar from '../PaginationBar';
import { errMsg, downloadCsv } from './deskUtils';
import { monthLabel, prevMonth, thisMonth } from './payrollUtils';
import { readSheetFile, parseDelimited, compactGrid } from './sheetReader';

// Attendance Upload — the monthly LOGIN / LOGOUT / EOD sheet kept by branches.
// Upload it (Excel .xlsx, CSV or paste), check who each sheet name is, save.
// Payroll for that month then uses the sheet for every mapped employee
// (present, half days, leave, ML, week offs, holidays, blanks → LOP days).

const inputCls = 'px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white';
const Card = ({ children, className = '' }) => <div className={`bg-white rounded-2xl border border-slate-200 ${className}`}>{children}</div>;
const defaultMonth = () => (new Date().getDate() >= 20 ? thisMonth() : prevMonth());
const DEFAULT_OPTS = { leave: 'unpaid', ml: 'paid', blank: 'absent', halfDayMinutes: 240 };

const CODE_STYLE = {
  P: ['bg-emerald-100 text-emerald-800', 'P'], HD: ['bg-amber-100 text-amber-800', '½'], HL: ['bg-orange-100 text-orange-800', 'HL'],
  L: ['bg-sky-100 text-sky-800', 'L'], LU: ['bg-rose-100 text-rose-700', 'L'], A: ['bg-rose-200 text-rose-800', 'A'],
  WO: ['bg-slate-200 text-slate-600', 'WO'], H: ['bg-violet-100 text-violet-800', 'H'], '': ['bg-white text-slate-300 border border-dashed border-slate-200', '·']
};
const styleOf = (d) => CODE_STYLE[d.code === 'L' && d.unpaid ? 'LU' : d.code] || CODE_STYLE[''];

function DayStrip({ days }) {
  return (
    <div className="flex flex-wrap gap-1">
      {days.map((d) => {
        const [cls, txt] = styleOf(d);
        const tip = `${d.date} · ${d.label || (d.code ? d.code : 'Not over yet')}${d.login ? ` · ${d.login}–${d.logout || '?'}` : ''}${d.raw ? `\nSheet: ${d.raw}` : ''}${d.eod ? `\nEOD: ${d.eod}` : ''}`;
        return (
          <div key={d.date} title={tip} className={`w-9 rounded-md text-center leading-tight py-0.5 ${cls} ${d.blank ? 'ring-2 ring-rose-400' : ''}`}>
            <div className="text-[9px] opacity-60">{Number(d.date.slice(8))}</div>
            <div className="text-[10px] font-black">{d.code === 'HL' && d.leaveType === 'ML' ? 'HM' : txt}</div>
          </div>
        );
      })}
    </div>
  );
}

const Legend = () => (
  <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
    {[['P', 'Present'], ['HD', 'Half day (short hours)'], ['HL', 'Half-day leave'], ['L', 'Paid leave / ML'], ['LU', 'Unpaid leave (LOP)'], ['A', 'Absent / blank (LOP)'], ['WO', 'Week off'], ['H', 'Holiday'], ['', 'Not over yet']].map(([k, l]) => (
      <span key={k} className="flex items-center gap-1"><span className={`inline-block w-5 h-4 rounded text-[9px] font-black text-center ${CODE_STYLE[k][0]}`}>{CODE_STYLE[k][1]}</span>{l}</span>
    ))}
    <span className="flex items-center gap-1"><span className="inline-block w-5 h-4 rounded ring-2 ring-rose-400" />Blank cell in sheet</span>
  </div>
);

export default function AttendanceSheetTab() {
  const [month, setMonth] = useState(defaultMonth());
  const [saved, setSaved] = useState(null); // stored sheet of the month
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [file, setFile] = useState(null); // { fileName, sheets: [{name, grid}], pick }
  const [paste, setPaste] = useState(null); // textarea text or null
  const [opts, setOpts] = useState(DEFAULT_OPTS);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({}); // col → email
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(new Set());
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const loadSaved = useCallback(async () => {
    setLoadingSaved(true);
    try { setSaved((await getAttendanceSheet({ month })).sheet); } catch (e) { setError(errMsg(e)); } finally { setLoadingSaved(false); }
  }, [month]);
  useEffect(() => { loadSaved(); setPreview(null); setMsg(''); setError(''); }, [loadSaved]);

  const grid = file ? file.sheets[file.pick]?.grid : null;

  const runPreview = useCallback(async (g, o, keep = {}) => {
    setBusy(true); setError(''); setMsg('');
    try {
      const r = await previewAttendanceSheet({ month, grid: compactGrid(g), options: o });
      setPreview(r);
      const m = {};
      for (const c of r.columns) m[c.col] = keep[c.header] !== undefined ? keep[c.header] : c.email;
      setMapping(m);
      setPage(1);
    } catch (e) { setError(errMsg(e)); setPreview(null); } finally { setBusy(false); }
  }, [month]);

  // header → email the user already chose (kept when options change)
  const chosenByHeader = () => Object.fromEntries((preview?.columns || []).map((c) => [c.header, mapping[c.col] || '']));

  const onFile = async (f) => {
    if (!f) return;
    setError(''); setMsg('');
    try {
      const sheets = await readSheetFile(f);
      const pick = Math.max(0, sheets.findIndex((s) => s.grid.some((r) => r.some((c) => /^log\s*in$/i.test(String(c).trim())))));
      setFile({ fileName: f.name, sheets, pick });
      setPaste(null);
      await runPreview(sheets[pick].grid, opts);
    } catch (e) { setError(errMsg(e)); }
  };
  const onPaste = async () => {
    const g = parseDelimited(paste || '');
    if (!g.length) return;
    setFile({ fileName: 'Pasted from spreadsheet', sheets: [{ name: 'Pasted', grid: g }], pick: 0 });
    setPaste(null);
    await runPreview(g, opts);
  };
  const changeOpts = (patch) => {
    const o = { ...opts, ...patch };
    setOpts(o);
    if (grid) runPreview(grid, o, chosenByHeader());
  };

  const save = async () => {
    setBusy(true); setError(''); setMsg('');
    try {
      const r = await saveAttendanceSheet({ month, grid: compactGrid(grid), options: opts, fileName: file.fileName, mapping });
      setMsg(`Saved ${monthLabel(month)} attendance for ${r.saved} employee(s)${r.ignored ? ` · ${r.ignored} sheet name(s) not mapped were left out` : ''}. Open Monthly Payroll and click ${r.draftsToRecalculate ? '"Recalculate drafts"' : '"Generate payroll"'} to apply it.`);
      setPreview(null); setFile(null);
      await loadSaved();
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm(`Delete the uploaded attendance sheet for ${monthLabel(month)}? Payroll will go back to the app login register for this month (after you recalculate drafts).`)) return;
    setBusy(true);
    try { await deleteAttendanceSheet({ month }); setMsg('Sheet deleted.'); await loadSaved(); } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  const mode = preview ? 'preview' : 'saved';
  const columns = useMemo(() => (preview ? preview.columns : saved?.columns || []), [preview, saved]);
  const staff = preview?.staff || [];
  const staffBy = useMemo(() => new Map(staff.map((s) => [s.email, s])), [staff]);
  const emailOf = (c) => (mode === 'preview' ? mapping[c.col] || '' : c.email);
  const dupes = useMemo(() => {
    const seen = new Map(), d = new Set();
    for (const c of columns) { const e = emailOf(c); if (!e) continue; if (seen.has(e)) { d.add(e); } seen.set(e, true); }
    return d;
  }, [columns, mapping, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const ql = q.trim().toLowerCase();
  const rows = columns.filter((c) => {
    const e = emailOf(c);
    if (filter === 'unmapped' && e) return false;
    if (filter === 'issues' && !(c.issues.length || c.summary.blanks)) return false;
    if (filter === 'lop' && !c.summary.lop) return false;
    const name = e ? (staffBy.get(e)?.name || c.employeeName) : '';
    return !ql || `${c.header} ${name} ${e}`.toLowerCase().includes(ql);
  });
  const totalPages = Math.max(1, Math.ceil(rows.length / limit));
  const pageRows = rows.slice((Math.min(page, totalPages) - 1) * limit, Math.min(page, totalPages) * limit);
  const mappedCount = columns.filter((c) => emailOf(c)).length;
  const unmappedCount = columns.length - mappedCount;

  const exportCsv = () => downloadCsv(`attendance-${month}.csv`, [
    { label: 'Sheet name', key: 'header' }, { label: 'Employee', get: (c) => (emailOf(c) ? staffBy.get(emailOf(c))?.name || c.employeeName : 'NOT MAPPED') }, { label: 'Email', get: (c) => emailOf(c) },
    ...['present', 'halfDays', 'leave', 'ml', 'weekOffs', 'holidays', 'absent', 'blanks', 'lop', 'pending', 'hours', 'eodNotDone'].map((k) => ({ label: k, get: (c) => c.summary[k] })),
    ...(columns[0]?.days || []).map((d, i) => ({ label: d.date.slice(8), get: (c) => c.days[i]?.code || '' }))
  ], columns);

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input type="month" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} className={inputCls} />
          <label className="px-3.5 py-2 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-4 h-4" />Upload sheet (.xlsx / .csv)
            <input type="file" accept=".xlsx,.xlsm,.csv,.tsv,.txt" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          <button onClick={() => setPaste(paste === null ? '' : null)} className={`${inputCls} font-semibold flex items-center gap-1.5 cursor-pointer`}><ClipboardPaste className="w-4 h-4" />Paste from Excel / Google Sheets</button>
          {(busy || loadingSaved) && <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />}
        </div>
        {paste !== null && (
          <div className="space-y-2">
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={5} placeholder="Select the whole sheet in Excel / Google Sheets (Ctrl+A), copy (Ctrl+C) and paste here (Ctrl+V)" className={`${inputCls} w-full font-mono text-xs`} />
            <button disabled={!paste?.trim() || busy} onClick={onPaste} className="px-3.5 py-2 rounded-xl bg-[#0f212d] text-white text-sm font-bold cursor-pointer disabled:opacity-50">Read pasted sheet</button>
          </div>
        )}
        <div className="text-xs text-slate-500">
          Sheet layout: names in one row, <b>LOGIN · LOGOUT · EOD</b> under each name, one row per date (e.g. "Nov 1"). Words understood: WEEKOFF, … HOLIDAY, LEAVE, ML, HALF DAY LEAVE, HALF DAY ML, DISCONTINUED.
        </div>
        {file && file.sheets.length > 1 && (
          <label className="text-xs font-bold text-slate-500 flex items-center gap-2">Sheet tab
            <select value={file.pick} onChange={(e) => { const pick = Number(e.target.value); setFile({ ...file, pick }); runPreview(file.sheets[pick].grid, opts); }} className={inputCls}>
              {file.sheets.map((s, i) => <option key={s.name + i} value={i}>{s.name}</option>)}
            </select>
          </label>
        )}
        {preview && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
            {[
              ['"LEAVE" counts as', 'leave', [['unpaid', 'Unpaid — LOP'], ['paid', 'Paid leave']]],
              ['"ML" counts as', 'ml', [['paid', 'Paid leave'], ['unpaid', 'Unpaid — LOP']]],
              ['Blank cell (day over) counts as', 'blank', [['absent', 'Absent — LOP'], ['present', 'Present']]],
              ['Half day if worked less than', 'halfDayMinutes', [[180, '3 hours'], [240, '4 hours'], [300, '5 hours']]]
            ].map(([label, key, choices]) => (
              <label key={key} className="text-xs font-bold text-slate-500">{label}
                <select value={opts[key]} onChange={(e) => changeOpts({ [key]: key === 'halfDayMinutes' ? Number(e.target.value) : e.target.value })} className={`${inputCls} block mt-1 w-full`}>
                  {choices.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
            ))}
          </div>
        )}
      </Card>

      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
      {msg && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />{msg}</div>}

      {mode === 'saved' && !loadingSaved && !saved && (
        <Card className="p-8 text-center text-slate-500 text-sm">
          <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          No attendance sheet uploaded for {monthLabel(month)}. Payroll uses the app's own login register until you upload one.
        </Card>
      )}

      {(preview || saved) && (
        <>
          <div className={`p-3 rounded-xl border text-sm flex flex-wrap items-center justify-between gap-2 ${mode === 'preview' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-teal-50 border-teal-200 text-teal-900'}`}>
            <div>
              {mode === 'preview'
                ? <><b>Preview — not saved yet.</b> {file?.fileName} · {columns.length} names found · <b>{mappedCount}</b> matched to employees{unmappedCount ? <> · <b className="text-rose-700">{unmappedCount} not matched</b> (pick the employee, or leave blank to skip)</> : ''}{preview.existing ? <> · replaces the sheet uploaded by {preview.existing.uploadedBy}</> : ''}</>
                : <><b>In use for {monthLabel(month)} payroll.</b> {saved.fileName} · uploaded by {saved.uploadedBy} on {new Date(saved.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · {mappedCount} employees{saved.lastDataDate ? ` · data up to ${Number(saved.lastDataDate.slice(8))} ${monthLabel(month).split(' ')[0]}` : ''}</>}
            </div>
            <div className="flex gap-2">
              {mode === 'preview' && <button onClick={() => { setPreview(null); setFile(null); }} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold cursor-pointer">Cancel</button>}
              {mode === 'preview' && <button disabled={busy || !mappedCount || dupes.size > 0} onClick={save} className="px-3 py-1.5 rounded-lg bg-[#00897b] text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"><Save className="w-3.5 h-3.5" />Save & use for payroll</button>}
              {mode === 'saved' && <button disabled={busy} onClick={remove} className="px-3 py-1.5 rounded-lg border border-rose-300 bg-white text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer"><Trash2 className="w-3.5 h-3.5" />Delete sheet</button>}
            </div>
          </div>
          {dupes.size > 0 && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">Two sheet names are matched to the same employee ({[...dupes].map((e) => staffBy.get(e)?.name || e).join(', ')}). Fix it before saving.</div>}
          {((preview || saved).warnings || []).map((w) => <div key={w} className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex gap-2"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{w}</div>)}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {[['', `All (${columns.length})`], ['unmapped', `Not matched (${unmappedCount})`], ['issues', 'Blanks / issues'], ['lop', 'Has LOP']].map(([k, l]) => (
                <button key={k} onClick={() => { setFilter(k); setPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${filter === k ? 'bg-[#0f212d] text-white border-[#0f212d]' : 'bg-white border-slate-200 text-slate-600'}`}>{l}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name" className={`${inputCls} pl-8 w-44`} />
              </div>
              <button onClick={exportCsv} className={`${inputCls} font-semibold flex items-center gap-1.5 cursor-pointer`}><Download className="w-4 h-4" />Excel</button>
            </div>
          </div>
          <Legend />

          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="p-3 w-6" /><th className="p-3 text-left">Name in sheet</th><th className="p-3 text-left">Employee</th>
                  <th className="p-3 text-right">Present</th><th className="p-3 text-right">Leave</th><th className="p-3 text-right">ML</th><th className="p-3 text-right">WO</th><th className="p-3 text-right">Hol</th>
                  <th className="p-3 text-right">Blank</th><th className="p-3 text-right">LOP days</th><th className="p-3 text-right">Hours</th><th className="p-3 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && <tr><td colSpan={12} className="p-6 text-center text-slate-500">No names match the filter.</td></tr>}
                {pageRows.map((c) => {
                  const e = emailOf(c);
                  const s = c.summary;
                  const isOpen = open.has(c.col);
                  return (
                    <React.Fragment key={c.col}>
                      <tr className={`border-t border-slate-100 ${!e ? 'bg-rose-50/40' : ''}`}>
                        <td className="p-3"><button onClick={() => setOpen((o) => { const n = new Set(o); n.has(c.col) ? n.delete(c.col) : n.add(c.col); return n; })} className="cursor-pointer text-slate-500">{isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button></td>
                        <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">{c.header}{c.discontinued && <span className="ml-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">Discontinued</span>}</td>
                        <td className="p-3 min-w-[220px]">
                          {mode === 'preview' ? (
                            <select value={e} onChange={(ev) => setMapping({ ...mapping, [c.col]: ev.target.value })} className={`${inputCls} w-full ${!e ? 'border-rose-300' : dupes.has(e) ? 'border-rose-500' : ''}`}>
                              <option value="">— Not matched (skip) —</option>
                              {c.suggestions.length > 0 && <optgroup label="Suggested">{c.suggestions.map((x) => <option key={`s-${x.email}`} value={x.email}>{x.name} · {x.email}</option>)}</optgroup>}
                              <optgroup label="All staff">{staff.map((x) => <option key={x.email} value={x.email}>{x.name} · {x.role || x.deptLabel}{x.branch ? ` · ${x.branch}` : ''}</option>)}</optgroup>
                            </select>
                          ) : e ? <div><div className="font-semibold">{c.employeeName}</div><div className="text-xs text-slate-500">{e}</div></div> : <span className="text-rose-600 text-xs font-bold">Not matched — skipped</span>}
                          {mode === 'preview' && e && c.how === 'auto' && <div className="text-[10px] text-amber-600 font-semibold mt-0.5">auto-matched — please check</div>}
                        </td>
                        <td className="p-3 text-right font-semibold">{s.present}</td>
                        <td className="p-3 text-right">{s.leave || '—'}</td>
                        <td className="p-3 text-right">{s.ml || '—'}</td>
                        <td className="p-3 text-right text-slate-500">{s.weekOffs}</td>
                        <td className="p-3 text-right text-slate-500">{s.holidays}</td>
                        <td className={`p-3 text-right ${s.blanks ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>{s.blanks || '—'}</td>
                        <td className={`p-3 text-right ${s.lop ? 'text-rose-600 font-black' : 'text-slate-400'}`}>{s.lop || 0}</td>
                        <td className="p-3 text-right text-slate-600">{s.hours}</td>
                        <td className="p-3 text-xs text-slate-500 max-w-[220px]">
                          {c.issues.length > 0 && <span title={c.issues.map((i) => `${Number(i.date.slice(8))}: ${i.msg}`).join('\n')} className="text-amber-700 font-semibold">{c.issues.length} note(s)</span>}
                          {s.eodNotDone > 0 && <span className="ml-1">· EOD not done {s.eodNotDone}</span>}
                          {s.pending > 0 && <span className="ml-1">· {s.pending} day(s) not over</span>}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-50/60"><td /><td colSpan={11} className="p-3 space-y-2">
                          <DayStrip days={c.days} />
                          {c.issues.length > 0 && <ul className="text-xs text-amber-800 list-disc pl-4">{c.issues.map((i) => <li key={i.date + i.msg}>{Number(i.date.slice(8))}: {i.msg}</li>)}</ul>}
                        </td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <PaginationBar page={Math.min(page, totalPages)} totalPages={totalPages} totalCount={rows.length} limit={limit} onPageChange={setPage} onLimitChange={(n) => { setLimit(n); setPage(1); }} itemLabel="employees" />
          <div className="text-xs text-slate-500">
            LOP days = absent + blank days + unpaid leave (half-day leave = 0.5). Salary cut = monthly salary ÷ days (as per Payroll Settings) × LOP days. Days before an employee's joining date and days after a "Discontinued" mark are also LOP.
          </div>
        </>
      )}
    </div>
  );
}
