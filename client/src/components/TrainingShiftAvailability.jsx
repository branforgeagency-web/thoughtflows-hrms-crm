import React, { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { parseSlotToRange, minutesToLabel, evaluateDemoSlot } from '../utils/slotUtils';

// Shift, scheduled classes and demo-notification eligibility — all read from
// the trainer's roster record (admin: Trainer Settings) and real demo bookings.
export default function TrainingShiftAvailability({ trainer, demos = [], batches = [] }) {
  const [testSlot, setTestSlot] = useState('');
  const todayKey = new Date().toISOString().split('T')[0];

  const shiftStart = Number.isFinite(trainer?.shiftStartMin) ? trainer.shiftStartMin : null;
  const shiftEnd = Number.isFinite(trainer?.shiftEndMin) ? trainer.shiftEndMin : null;
  const shiftLabel = trainer?.shift || (shiftStart !== null && shiftEnd !== null && !(shiftStart === 0 && shiftEnd === 1440) ? `${minutesToLabel(shiftStart)} – ${minutesToLabel(shiftEnd)}` : '');

  // Day timeline = scheduled classes + today's accepted demos + free windows inside the shift
  const timeline = useMemo(() => {
    if (!trainer) return [];
    const items = [];
    (trainer.scheduledClasses || []).forEach((c) => {
      const r = Number.isFinite(c.startMin) && Number.isFinite(c.endMin) ? { startMin: c.startMin, endMin: c.endMin } : parseSlotToRange(c.timeSlot);
      if (r) items.push({ ...r, title: c.name, type: 'Scheduled Class' });
    });
    demos
      .filter(d => d.preferredDate === todayKey && ['booked', 'confirmed'].includes(String(d.status).toLowerCase()) && (!d.trainerId || d.trainerId === trainer.trainerId))
      .forEach((d) => {
        const r = parseSlotToRange(d.timeSlot);
        if (r) items.push({ ...r, title: `Demo · ${d.candidateName} (${d.course})`, type: 'Demo' });
      });
    items.sort((a, b) => a.startMin - b.startMin);
    if (shiftStart === null || shiftEnd === null || shiftEnd <= shiftStart) return items;
    const withFree = [];
    let cursor = shiftStart;
    items.forEach((it) => {
      if (it.startMin > cursor) withFree.push({ startMin: cursor, endMin: it.startMin, title: 'Free — demo notifications allowed', type: 'Free Slot' });
      withFree.push(it);
      cursor = Math.max(cursor, it.endMin);
    });
    if (cursor < shiftEnd) withFree.push({ startMin: cursor, endMin: shiftEnd, title: 'Free — demo notifications allowed', type: 'Free Slot' });
    return withFree;
  }, [trainer, demos, todayKey, shiftStart, shiftEnd]);

  const testResult = testSlot.trim() ? evaluateDemoSlot(trainer, testSlot.trim()) : null;
  const classesCount = (trainer?.scheduledClasses || []).length;
  const maxLoad = Number(trainer?.maxSessionsPerDay) || 0;

  if (!trainer) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200/90 text-center text-xs text-slate-500">
        Your trainer roster record is not linked to this login yet, so shift and availability can't be shown. Ask the admin to set your email on your record in Trainer Settings.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fadeIn text-slate-800 max-w-[1280px]">
      <div className="bg-[#0f212d] text-white rounded-3xl p-6 sm:p-7 border border-[#1b3446] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white tracking-tight">{trainer.trainerName}</h2>
            <p className="text-xs text-slate-300 font-medium">
              {[trainer.trainerId, trainer.branchName, shiftLabel && `Shift: ${shiftLabel}`, trainer.workingDays].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`px-3 py-1.5 rounded-xl font-bold border ${trainer.active !== false ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' : 'bg-rose-500/20 text-rose-300 border-rose-500/40'}`}>
              {trainer.active !== false ? 'Receives demo bookings' : 'Inactive for demos'}
            </span>
            <span className="px-3 py-1.5 rounded-xl font-bold border bg-slate-800 text-slate-200 border-slate-600">
              Languages: {(trainer.languages || []).join(', ') || 'not set'}
            </span>
            <span className="px-3 py-1.5 rounded-xl font-bold border bg-slate-800 text-slate-200 border-slate-600">
              Load: {classesCount} classes · {batches.length} batches{maxLoad ? ` · max ${maxLoad}/day` : ''}
            </span>
          </div>
        </div>
        {maxLoad > 0 && classesCount > maxLoad && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold">
            Over max load: {classesCount} scheduled classes vs a limit of {maxLoad} per day.
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Check a demo time</h3>
          <p className="text-[11px] text-slate-500">Uses the same rules as the booking engine: inside your shift and no overlap with your classes.</p>
        </div>
        <input
          value={testSlot}
          onChange={(e) => setTestSlot(e.target.value)}
          placeholder="e.g. 10:00–11:30 AM"
          className="w-full sm:w-72 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-500"
        />
        {testResult && (
          <div className={`p-3 rounded-xl border text-xs font-semibold ${testResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
            {testResult.ok ? '✓ ' : '✕ '}{testResult.reason}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Today's Schedule & Free Demo Windows</h2>
            <p className="text-xs text-slate-500">Scheduled classes from your roster record plus demos booked for you today.</p>
          </div>
          {shiftLabel && <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#eff6ff] text-[#2563eb]">Shift: {shiftLabel}</span>}
        </div>
        {timeline.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">No shift or scheduled classes configured yet (admin → Trainer Settings).</div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {timeline.map((item, index) => (
              <div key={index} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-xl">
                <div className="w-40 font-bold text-slate-900 shrink-0 font-mono text-[11.5px]">{minutesToLabel(item.startMin)} – {minutesToLabel(item.endMin)}</div>
                <div className="flex-1 font-bold text-slate-800 text-xs flex items-center gap-2">
                  <span>{item.title}</span>
                  <span className={`text-[9.5px] px-2 rounded-full font-bold ${item.type === 'Scheduled Class' ? 'bg-blue-100 text-blue-800' : item.type === 'Demo' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{item.type}</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${item.type === 'Free Slot' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'}`}>
                  {item.type === 'Free Slot' ? 'Notification OK' : 'Alert Blocked'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 text-xs text-slate-600 flex items-start gap-2.5 shadow-xs leading-relaxed">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          A demo booking notifies you only when: you are active for demos, the student's language and branch match yours, the slot is inside your shift, and you have no class or other demo at that time. Shift and classes are edited by admin in Trainer Settings.
        </div>
      </div>
    </div>
  );
}
