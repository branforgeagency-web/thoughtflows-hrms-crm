import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Video, Clock, User, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import LiveClassroom from './LiveClassroom';
import { getPublicDemo, joinPublicDemo, getPublicSession, joinPublicSession } from '../services/api';

// Public class page: /join/demo/<code> (demo candidates) and /join/session/<code> (1:1 students).
// Opened from WhatsApp / email on a phone or lab PC.
// No login. Waits until the trainer starts the demo, then joins the classroom.
const ROOM_DELETED = 5; // LiveKit DisconnectReason: trainer ended the class

export default function DemoJoinPage({ code, kind = 'demo' }) {
  const isSession = kind === 'session';
  const fetchInfo = isSession ? getPublicSession : getPublicDemo;
  const joinRoom = isSession ? joinPublicSession : joinPublicDemo;
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [inClass, setInClass] = useState(false);
  const [ended, setEnded] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await fetchInfo(code);
      setInfo(d);
      if (d.ended) setEnded(true);
      setError('');
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not load your demo. Check your internet and refresh.');
    }
  }, [code]);

  useEffect(() => { load(); }, [load]);

  // While waiting for the trainer, check every 8 seconds
  useEffect(() => {
    if (inClass || ended || !info || info.isLive) return undefined;
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [inClass, ended, info, load]);

  if (inClass) {
    return (
      <div className="fixed inset-0 bg-[#030b0f]">
        <LiveClassroom
          getJoinDetails={() => joinRoom(code)}
          height="100%"
          onLeft={(reason) => {
            setInClass(false);
            if (reason === ROOM_DELETED) { setEnded(true); setInfo((i) => (i ? { ...i, isLive: false } : i)); }
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#e8f7f5] to-white flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-teal-100 p-6 space-y-5">
        <div className="text-center">
          <div className="text-[11px] font-bold tracking-widest text-teal-700 uppercase">Thoughtflows Academy</div>
          <h1 className="text-xl font-extrabold text-slate-900 mt-1">{isSession ? 'Live 1:1 Class' : 'Live Demo Class'}</h1>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span>
          </div>
        )}

        {!info && !error && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin text-teal-600" />Loading your demo…
          </div>
        )}

        {info && (
          <>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-sm text-slate-700">
              <Row icon={User}>Hi <b>{info.candidateName}</b></Row>
              {info.course && <Row icon={BookOpen}>{info.course}{info.language ? ` · ${info.language}` : ''}</Row>}
              {info.trainer && <Row icon={Video}>Trainer: <b>{info.trainer}</b></Row>}
              {(info.preferredDate || info.timeSlot) && <Row icon={Clock}>{[info.preferredDate, info.timeSlot].filter(Boolean).join(' · ')}</Row>}
            </div>

            {ended ? (
              <div className="text-center space-y-2 py-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <div className="font-bold text-slate-900">{info.cancelled ? 'This class was cancelled' : isSession ? 'This class has ended' : 'The demo has ended'}</div>
                <div className="text-sm text-slate-500">{info.cancelled ? 'Please contact Thoughtflows Academy for a new time.' : isSession ? 'Thank you! See you in your next session.' : 'Thank you for attending! Our counsellor will contact you shortly.'}</div>
              </div>
            ) : info.isLive ? (
              <button
                onClick={() => setInClass(true)}
                className="w-full py-4 rounded-2xl bg-[#009688] hover:bg-[#00897b] text-white text-base font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Video className="w-5 h-5" />{isSession ? 'Join Class' : 'Join Demo Class'}
              </button>
            ) : (
              <div className="text-center space-y-2 py-2">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />Waiting for your trainer to start…
                </div>
                <div className="text-xs text-slate-500">Keep this page open. The Join button appears automatically when the class starts.</div>
              </div>
            )}

            <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
              <li>Works in your phone or computer browser — no app or login needed.</li>
              <li>Tap <b>Allow</b> when asked for microphone and camera.</li>
              <li>In a lab, please use headphones.</li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ icon: Icon, children }) {
  return <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-teal-600 shrink-0" /><span>{children}</span></div>;
}
