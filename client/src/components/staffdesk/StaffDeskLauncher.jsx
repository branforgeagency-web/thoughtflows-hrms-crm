import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { getStaffDeskMe, getStaffLeaves } from '../../services/api';

// Small floating button shown inside every staff dashboard (Admin, Leadership,
// HR, Marketing, CCCP, Training leaders). Opens the Attendance & Leave desk
// (team view for heads / HR / Admin, "My Leave" for everyone else).
const AttendanceLeaveDesk = lazy(() => import('./AttendanceLeaveDesk'));

export default function StaffDeskLauncher() {
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(0);

  const refreshPending = useCallback(async (i) => {
    if (!i?.canOpenDesk) return;
    try { const r = await getStaffLeaves({ view: 'approvals' }); setPending((r.leaves || []).length); } catch (_) {}
  }, []);

  useEffect(() => {
    let alive = true;
    getStaffDeskMe()
      .then((i) => { if (alive) { setInfo(i); refreshPending(i); } })
      .catch(() => { if (alive) setInfo(null); });
    const t = setInterval(() => { if (alive) refreshPending(info); }, 120000);
    return () => { alive = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!info) return null;
  // Trainers (not leaders) keep their own leave flow in the Trainer dashboard
  if (info.scope === 'self' && info.usesTrainerLeave) return null;
  const label = info.canOpenDesk ? 'Attendance & Leave' : 'My Leave';

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={label}
          className="fixed bottom-5 right-5 z-[70] h-11 pl-3.5 pr-4 rounded-full bg-[#0f212d] hover:bg-[#15303f] text-white shadow-xl shadow-black/30 border border-white/10 flex items-center gap-2 text-sm font-bold cursor-pointer"
        >
          <CalendarCheck className="w-4 h-4 text-teal-300" />
          <span className="hidden sm:inline">{label}</span>
          {pending > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-slate-900 text-[11px] font-black flex items-center justify-center">{pending}</span>}
        </button>
      )}
      {open && (
        <Suspense fallback={<div className="fixed inset-0 z-[90] bg-white/70 flex items-center justify-center text-sm text-slate-600">Opening Attendance &amp; Leave…</div>}>
          <AttendanceLeaveDesk info={info} onClose={() => { setOpen(false); refreshPending(info); }} onChanged={() => refreshPending(info)} />
        </Suspense>
      )}
    </>
  );
}
