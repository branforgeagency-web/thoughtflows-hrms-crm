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
        <div className="fixed inset-0 z-[100] bg-[#030b0f] flex flex-col w-screen h-screen overflow-hidden">
          <div className="px-4 sm:px-6 py-2.5 bg-[#07151c] border-b border-[#1b3446] flex items-center justify-between gap-3 text-white flex-shrink-0 z-20 shadow-md">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider">
                  Live Demo Session
                </span>
                <div className="text-sm sm:text-base font-extrabold">{room.course}</div>
              </div>
              <div className="text-xs text-slate-300 mt-0.5">Faculty Trainer: <b className="text-teal-300">{room.trainer}</b> · {room.time || room.timeSlot}</div>
            </div>
            <button
              onClick={() => setRoom(null)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5"
            >
              Leave Demo
            </button>
          </div>
          <div className="flex-1 w-full h-full relative bg-[#030b0f] overflow-hidden flex flex-col">
            <ZoomMeeting
              demoId={room._id}
              studentEmail={email}
              userName={name || 'Student'}
              isTrainerHost={false}
              height="100%"
              onLeft={() => setRoom(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
