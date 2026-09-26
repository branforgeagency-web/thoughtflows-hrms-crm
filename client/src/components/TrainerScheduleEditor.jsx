import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { getTrainerSettings, updateTrainerSettings, getStudents } from '../services/api';

// Admin / Leadership: each trainer's weekly class slots. Batch + days drive the
// students' timetable; times + days block demo bookings during class.
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const toMin = (hhmm) => { const [h, m] = String(hhmm || '').split(':').map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : null; };
const toHHMM = (min) => (Number.isFinite(min) ? `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}` : '');
const label = (min) => { if (!Number.isFinite(min)) return ''; const h = Math.floor(min / 60); return `${((h + 11) % 12) + 1}:${String(min % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

export default function TrainerScheduleEditor() {
  const [trainers, setTrainers] = useState([]);
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState('');
  const [rows, setRows] = useState([]);
  const [maxPerDay, setMaxPerDay] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getTrainerSettings().then((t) => setTrainers(Array.isArray(t) ? t : [])).catch(() => {});
    getStudents().then((s) => setStudents(Array.isArray(s) ? s : [])).catch(() => {});
  }, []);

  const trainer = trainers.find((t) => t.trainerId === selected) || null;
  const batches = useMemo(() => [...new Set(students.filter((s) => s.trainerId === selected).map((s) => s.batchName || s.course).filter(Boolean))], [students, selected]);

  useEffect(() => {
    setMsg('');
    if (!trainer) { setRows([]); return; }
    setRows((trainer.scheduledClasses || []).map((c) => ({
      name: c.name || '', batch: c.batch || '',
      days: c.days ? c.days.split(',').map((d) => d.trim()).filter(Boolean) : [],
      start: toHHMM(c.startMin), end: toHHMM(c.endMin)
    })));
    setMaxPerDay(trainer.maxSessionsPerDay || '');
  }, [trainer]);

  const setRow = (i, patch) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = async () => {
    const bad = rows.find((r) => !r.name.trim() || toMin(r.start) === null || toMin(r.end) === null || toMin(r.end) <= toMin(r.start));
    if (bad) { setMsg('Each class needs a name and an end time after its start time.'); return; }
    setSaving(true); setMsg('');
    try {
      const scheduledClasses = rows.map((r) => ({
        name: r.name.trim(), batch: r.batch, days: r.days.join(','),
        startMin: toMin(r.start), endMin: toMin(r.end), timeSlot: `${label(toMin(r.start))} – ${label(toMin(r.end))}`
      }));
      const updated = await updateTrainerSettings(selected, { scheduledClasses, maxSessionsPerDay: Number(maxPerDay) || 0 });
      setTrainers((prev) => prev.map((t) => (t.trainerId === selected ? updated : t)));
      setMsg('✓ Saved. Students of each batch now see these slots on their timetable.');
    } catch (e) {
      setMsg(e?.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const input = 'px-2.5 py-2 rounded-lg border border-slate-200 text-xs bg-white';
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900">🗓 Trainer class schedule</h3>
          <p className="text-xs text-slate-500">Weekly class slots per trainer. Batch + days feed the student timetable; demo bookings skip these times.</p>
        </div>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className={`${input} min-w-[220px]`}>
          <option value="">Select a trainer…</option>
          {trainers.map((t) => <option key={t.trainerId} value={t.trainerId}>{t.trainerName} · {t.trainerId}</option>)}
        </select>
      </div>

      {trainer && (
        <>
          <div className="text-[11px] text-slate-500">Shift: <b>{trainer.shift || 'not set'}</b>{trainer.workingDays ? ` · ${trainer.workingDays}` : ''} · Batches with allocated students: <b>{batches.join(', ') || 'none yet'}</b></div>
          <div className="space-y-2">
            {rows.length === 0 && <div className="text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl p-4 text-center">No classes yet.</div>}
            {rows.map((r, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-2">
                <input value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="Class name (e.g. CPC Morning)" className={`${input} flex-1 min-w-[160px]`} aria-label="Class name" />
                <select value={r.batch} onChange={(e) => setRow(i, { batch: e.target.value })} className={input} aria-label="Batch">
                  <option value="">All my batches</option>
                  {[...new Set([...batches, r.batch].filter(Boolean))].map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                <input type="time" value={r.start} onChange={(e) => setRow(i, { start: e.target.value })} className={input} aria-label="Start" />
                <span className="text-xs text-slate-400">to</span>
                <input type="time" value={r.end} onChange={(e) => setRow(i, { end: e.target.value })} className={input} aria-label="End" />
                <div className="flex gap-1">
                  {DAYS.map((d) => {
                    const on = r.days.includes(d);
                    return (
                      <button key={d} type="button" onClick={() => setRow(i, { days: on ? r.days.filter((x) => x !== d) : DAYS.filter((x) => x === d || r.days.includes(x)) })}
                        className={`w-9 py-1.5 rounded-md text-[10px] font-bold border ${on ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}>{d}</button>
                    );
                  })}
                </div>
                <button type="button" onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" aria-label="Remove class"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setRows((prev) => [...prev, { name: '', batch: batches[0] || '', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start: '10:00', end: '11:30' }])}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1"><Plus className="w-3.5 h-3.5" />Add class</button>
              <label className="text-xs text-slate-600 flex items-center gap-2">Max sessions/day <input type="number" min={0} value={maxPerDay} onChange={(e) => setMaxPerDay(e.target.value)} className={`${input} w-20`} /></label>
            </div>
            <button type="button" disabled={saving} onClick={save} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1"><Save className="w-3.5 h-3.5" />{saving ? 'Saving…' : 'Save schedule'}</button>
          </div>
          {msg && <div className="text-xs font-semibold text-slate-700">{msg}</div>}
        </>
      )}
    </div>
  );
}
