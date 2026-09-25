// Client copy of the server's slot parsing (server/src/routes/api.js) so the
// trainer's shift view evaluates demo slots with exactly the same rules.
export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const s = String(timeStr).trim().toLowerCase();
  const ampm = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = ampm[2] ? parseInt(ampm[2], 10) : 0;
    if (ampm[3] === 'pm' && h < 12) h += 12;
    if (ampm[3] === 'am' && h === 12) h = 0;
    return h * 60 + m;
  }
  const h24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) return parseInt(h24[1], 10) * 60 + parseInt(h24[2], 10);
  const emb = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (emb) {
    let h = parseInt(emb[1], 10);
    const m = emb[2] ? parseInt(emb[2], 10) : 0;
    if (emb[3] === 'pm' && h < 12) h += 12;
    if (emb[3] === 'am' && h === 12) h = 0;
    return h * 60 + m;
  }
  return null;
}

export function parseSlotToRange(slotStr) {
  if (!slotStr) return null;
  const s = String(slotStr).replace(/[–—]/g, '-').trim();
  const parts = s.split('-');
  if (parts.length === 2) {
    let startPart = parts[0].trim();
    const endPart = parts[1].trim();
    if (/am|pm/i.test(endPart) && !/am|pm/i.test(startPart)) {
      const period = endPart.toLowerCase().includes('pm') ? 'PM' : 'AM';
      const startHour = parseInt(startPart, 10);
      const endHour = parseInt(endPart, 10);
      startPart = period === 'PM' && startHour > endHour && startHour !== 12 ? `${startPart} AM` : `${startPart} ${period}`;
    }
    const startMin = parseTimeToMinutes(startPart);
    const endMin = parseTimeToMinutes(endPart);
    if (startMin !== null && endMin !== null) return { startMin, endMin };
  }
  const single = parseTimeToMinutes(slotStr);
  return single !== null ? { startMin: single, endMin: single + 60 } : null;
}

export const minutesToLabel = (min) => {
  if (!Number.isFinite(min)) return '';
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

// Same rules the server applies before notifying a trainer about a demo
export function evaluateDemoSlot(trainer, slotStr) {
  if (!trainer) return { ok: false, reason: 'No trainer roster record.' };
  if (trainer.active === false) return { ok: false, reason: 'You are marked inactive for demo bookings.' };
  const slot = parseSlotToRange(slotStr);
  if (!slot) return { ok: false, reason: `Could not read the time "${slotStr}".` };
  const start = Number.isFinite(trainer.shiftStartMin) ? trainer.shiftStartMin : 0;
  const end = Number.isFinite(trainer.shiftEndMin) ? trainer.shiftEndMin : 1440;
  const inShift = end > start ? slot.startMin >= start && slot.endMin <= end : slot.startMin >= start || slot.endMin <= end;
  if (!inShift) return { ok: false, reason: `Outside your shift (${trainer.shift || `${minutesToLabel(start)} – ${minutesToLabel(end)}`}).` };
  const clash = (trainer.scheduledClasses || []).find((c) => {
    const r = Number.isFinite(c.startMin) && Number.isFinite(c.endMin) ? { startMin: c.startMin, endMin: c.endMin } : parseSlotToRange(c.timeSlot);
    return r && Math.max(r.startMin, slot.startMin) < Math.min(r.endMin, slot.endMin);
  });
  if (clash) return { ok: false, reason: `Overlaps your class "${clash.name}" (${clash.timeSlot}).` };
  return { ok: true, reason: 'In shift and no class overlap — you would be notified (if language & branch match).' };
}
