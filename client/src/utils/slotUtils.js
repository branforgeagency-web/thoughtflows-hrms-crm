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

// Check if a course is a Specialty Course vs a Fresher / Foundation Track
export function isSpecialtyCourse(course) {
  if (!course) return false;
  const c = String(course).toLowerCase();
  if (c.includes('fresher') || c.includes('beginner') || c.includes('foundation')) {
    return false;
  }
  const specialtyKeys = [
    'surgery', 'cgsc', 'cpma', 'auditing', 'emergency', 'ed profee', 'ed facility',
    'em ip', 'cedc', 'cemc', 'e/m', 'ed&e/m', 'cpc+ed', 'cpc+e/m', 'ip-drg', 'ipdrg',
    'ip specialty', 'ccs', 'hcc', 'crc', 'risk adjustment', 'ivr', 'radiology',
    'anesthesia', 'canpc', 'cobgc', 'cpcd', 'cardiology', 'orthopedic', 'pediatrics',
    'specialty', 'exp in ipdrg'
  ];
  return specialtyKeys.some((k) => c.includes(k));
}

// Rules applied before notifying a trainer about a demo:
// - Fresher demo experts: available throughout the day
// - Specialty course demos: scheduled according to trainer availability (shift & classes)
export function evaluateDemoSlot(trainer, slotStr, course = '') {
  if (!trainer) return { ok: false, reason: 'No trainer roster record.' };
  if (trainer.active === false) return { ok: false, reason: 'You are marked inactive for demo bookings.' };
  
  const specialty = isSpecialtyCourse(course);
  const isFresherExpert = trainer.experienceLevel === 'fresher_expert' || /fresher/i.test(trainer.role || '') || !specialty;

  // Fresher demo experts are available throughout the day
  if (!specialty && isFresherExpert) {
    return { ok: true, reason: 'Fresher Demo Expert — available throughout the day across all demo slots.' };
  }

  // Specialty course demo: evaluate shift and scheduled classes
  const slot = parseSlotToRange(slotStr);
  if (!slot) return { ok: false, reason: `Could not read the time "${slotStr}".` };
  const start = Number.isFinite(trainer.shiftStartMin) ? trainer.shiftStartMin : 0;
  const end = Number.isFinite(trainer.shiftEndMin) ? trainer.shiftEndMin : 1440;
  const inShift = end > start ? slot.startMin >= start && slot.endMin <= end : slot.startMin >= start || slot.endMin <= end;
  if (!inShift) return { ok: false, reason: `Outside shift (${trainer.shift || `${minutesToLabel(start)} – ${minutesToLabel(end)}`}). Specialty demos must follow trainer availability.` };
  const clash = (trainer.scheduledClasses || []).find((c) => {
    const r = Number.isFinite(c.startMin) && Number.isFinite(c.endMin) ? { startMin: c.startMin, endMin: c.endMin } : parseSlotToRange(c.timeSlot);
    return r && Math.max(r.startMin, slot.startMin) < Math.min(r.endMin, slot.endMin);
  });
  if (clash) return { ok: false, reason: `Overlaps class "${clash.name}" (${clash.timeSlot}). Specialty demos must follow trainer availability.` };
  return { ok: true, reason: 'In shift and no class overlap — scheduled according to trainer availability.' };
}
