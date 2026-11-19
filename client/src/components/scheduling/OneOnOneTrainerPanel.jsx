import React, { useCallback, useEffect, useState } from 'react';
import { Play, Send, Copy, X, User } from 'lucide-react';
import LiveClassroom from '../LiveClassroom';
import { getMyOneOnOneSessions, getOneOnOneJoin, endOneOnOneSession } from '../../services/api';
import { redirectToWhatsAppWeb } from '../../utils/whatsapp';
import { prettyDate, todayKey, copyText, errMsg } from './schedUtils';

// Trainer → Class Session Room: today's and upcoming 1:1 sessions scheduled
// by the Head of Trainer. Start opens the live classroom as host; End uses
// one of the student's credits.
export default function OneOnOneTrainerPanel({ trainerId }) {
  const [list, setList] = useState([]);
  const [room, setRoom] = useState(null);
  const [toast, setToast] = useState('');
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    try { setList(await getMyOneOnOneSessions(trainerId ? { trainerId } : undefined)); } catch (_) {}
  }, [trainerId]);
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const end = async (s, outcome) => {
    const q = outcome === 'no_show' ? 'Mark this session as student no-show? It uses 1 credit.' : 'End this 1:1 session? It is marked completed and uses 1 credit.';
    if (!window.confirm(q)) return;
    try { await endOneOnOneSession(s.id, outcome); setRoom(null); flash(outcome === 'no_show' ? 'Marked as no-show' : 'Session completed'); load(); }
    catch (e) { flash(errMsg(e)); }
  };
  const sendLink = (s) => {
    const msg = `Hi ${s.studentName}, your 1:1 ${s.course || ''} class is on ${prettyDate(s.date)} at ${s.timeSlot}. Join here (no app or login needed): ${s.joinLink}`;
    if (!redirectToWhatsAppWeb(s.phone, msg)) copyText(s.joinLink).then(() => flash('No phone on file — link copied'));
  };

  const open = list.filter((s) => ['scheduled', 'live'].includes(s.status));
  if (!open.length && !room) return null;
  const today = todayKey();

  return (
    <div className="bg-white rounded-2xl border border-teal-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><User className="w-4 h-4 text-teal-600" />My 1:1 Sessions</div>
        <span className="text-[11px] text-slate-500">Scheduled by the Head of Trainer · student joins with their own link</span>
      </div>
      <div className="space-y-1.5">
        {open.map((s) => (
          <div key={s.id} className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs ${s.status === 'live' ? 'border-emerald-300 bg-emerald-50' : s.date === today ? 'border-teal-200 bg-teal-50/40' : 'border-slate-200 bg-slate-50'}`}>
            <div className="min-w-0">
              <b className="text-slate-900">{s.studentName}</b> <span className="text-slate-500">{s.course}</span>
              <div className="text-slate-600">{s.date === today ? 'Today' : prettyDate(s.date)} · {s.timeSlot}{s.topic ? ` · ${s.topic}` : ''}{s.status === 'live' ? ' · LIVE' : ''}</div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => sendLink(s)} title="Send join link on WhatsApp" className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 cursor-pointer"><Send className="w-3.5 h-3.5" /></button>
              <button onClick={async () => flash((await copyText(s.joinLink)) ? 'Join link copied' : s.joinLink)} title="Copy join link" className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 cursor-pointer"><Copy className="w-3.5 h-3.5" /></button>
              <button onClick={() => setRoom(s)} className="px-3 py-1.5 rounded-lg bg-[#009688] hover:bg-[#00897b] text-white font-bold flex items-center gap-1 cursor-pointer"><Play className="w-3.5 h-3.5 fill-current" />{s.status === 'live' ? 'Rejoin' : 'Start'}</button>
              {s.status === 'live' && <button onClick={() => end(s, 'completed')} className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer">End</button>}
            </div>
          </div>
        ))}
      </div>

      {room && (
        <div className="fixed inset-0 z-[90] bg-[#030b0f] flex flex-col">
          <div className="px-4 py-2.5 bg-[#07151c] border-b border-[#1b3446] flex flex-wrap items-center justify-between gap-2 text-white">
            <div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mr-2">1:1 Live</span>
              <b>{room.studentName}</b> <span className="text-xs text-slate-300">· {room.course} · {room.timeSlot}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => sendLink(room)} className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold cursor-pointer">Send link to student</button>
              <button onClick={() => end(room, 'no_show')} className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold cursor-pointer">Student didn't come</button>
              <button onClick={() => end(room, 'completed')} className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold cursor-pointer">End session</button>
              <button onClick={() => { setRoom(null); load(); }} title="Hide (session stays live)" className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex-1">
            <LiveClassroom key={room.id} isHost height="100%" getJoinDetails={() => getOneOnOneJoin(room.id)}
              onLeft={() => flash('You left the classroom. Rejoin, or End the session when you are done.')} />
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm shadow-xl">{toast}</div>}
    </div>
  );
}
