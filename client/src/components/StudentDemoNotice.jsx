import React, { useEffect, useState } from 'react';
import { getMyDemos, onDataUpdate } from '../services/api';
import ZoomMeeting from './ZoomMeeting';

// Demo-class notifications for the logged-in student + one-click join (embedded Zoom)
export default function StudentDemoNotice({ email, name }) {
  const [demos, setDemos] = useState([]);
  const [room, setRoom] = useState(null);

  useEffect(() => {
    if (!email) return undefined;
    let alive = true;
    const load = async () => {
      try { const d = await getMyDemos(email); if (alive) setDemos(Array.isArray(d) ? d : []); } catch (_) {}
    };
    load();
    const timer = setInterval(load, 15000); // picks up "trainer started the demo"
    const unsub = onDataUpdate((entity) => { if (entity === 'demos') load(); });
    return () => { alive = false; clearInterval(timer); if (unsub) unsub(); };
  }, [email]);

  const upcoming = demos.filter(d => !['attended', 'missed'].includes(String(d.status || '').toLowerCase()));

  if (upcoming.length === 0 && !room) return null;

  return (
    <>
      {upcoming.map(d => (
        <div key={d._id} className="bg-gradient-to-r from-amber-50 to-teal-50 border-2 border-teal-400 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-amber-700">
              <span>🔔 Demo class booked</span>
              {d.hasMeeting && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">Live now</span>}
            </div>
            <div className="text-sm font-extrabold text-slate-900 mt-1">{d.course}</div>
            <div className="text-xs text-slate-600 mt-0.5">
              {d.time || d.timeSlot} · Trainer: <b>{d.trainer}</b> · {d.mode}
            </div>
          </div>
          <button
            disabled={!d.hasMeeting}
            onClick={() => setRoom(d)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold shrink-0 ${d.hasMeeting ? 'bg-[#009688] hover:bg-[#00897b] text-white cursor-pointer' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
          >
            {d.hasMeeting ? '▶ Join Demo' : 'Waiting for trainer to start'}
          </button>
        </div>
      ))}

      {room && (
        <div className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#0f212d] rounded-2xl w-full max-w-6xl p-4 sm:p-5 space-y-3 border border-[#1b3446] shadow-2xl">
            <div className="flex items-center justify-between text-white">
              <div>
                <div className="text-sm sm:text-base font-extrabold">Demo class · {room.course}</div>
                <div className="text-xs text-slate-300">Trainer: {room.trainer}</div>
              </div>
              <button onClick={() => setRoom(null)} className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer">Leave</button>
            </div>
            <ZoomMeeting demoId={room._id} studentEmail={email} userName={name || 'Student'} isTrainerHost={false} height={580} />
          </div>
        </div>
      )}
    </>
  );
}
