import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, AlertCircle, Video } from 'lucide-react';

// ThoughtFlows Live Classroom — replaces the embedded Zoom meeting for live
// classes. The server issues a short-lived LiveKit token for this person:
//   trainer → GET  /trainer/live-class/:id/join       (host / room admin)
//   student → POST /student-portal/live-class/join    (participant, join logged)
const LiveClassroomCall = lazy(() => import('./LiveClassroomCall'));

const errText = (e) => e?.response?.data?.error || e?.message || 'Could not open the classroom';

export default function LiveClassroom({
  // async () => { provider: 'livekit', serverUrl, token }
  getJoinDetails,
  isHost = false,
  height = '100%',
  // Called when the person leaves, or the trainer ends the class for everyone
  onLeft
}) {
  const getJoinRef = useRef(getJoinDetails);
  getJoinRef.current = getJoinDetails;
  const onLeftRef = useRef(onLeft);
  onLeftRef.current = onLeft;
  const runRef = useRef(0);
  const [status, setStatus] = useState('loading'); // loading | ready | left | error
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');

  const join = useCallback(async () => {
    const run = ++runRef.current;
    setStatus('loading');
    setError('');
    setDetails(null);
    try {
      const d = await getJoinRef.current?.();
      if (run !== runRef.current) return;
      if (!d?.token || !d?.serverUrl) throw new Error(d?.error || 'The classroom did not return a join token');
      setDetails(d);
      setStatus('ready');
    } catch (e) {
      if (run !== runRef.current) return;
      setError(errText(e));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    join();
    return () => { runRef.current += 1; };
  }, [join]);

  const handleDisconnected = useCallback((reason) => {
    setStatus('left');
    setDetails(null);
    onLeftRef.current?.(reason);
  }, []);

  const handleError = useCallback((e) => {
    setError(errText(e));
    setStatus('error');
  }, []);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-[#030b0f] text-white" style={{ height }}>
      {status === 'ready' && details && (
        <Suspense fallback={<Centered><RefreshCw className="w-6 h-6 animate-spin text-teal-400" /><span>Loading classroom…</span></Centered>}>
          <LiveClassroomCall
            serverUrl={details.serverUrl}
            token={details.token}
            isHost={isHost}
            onDisconnected={handleDisconnected}
            onError={handleError}
          />
        </Suspense>
      )}

      {status === 'loading' && (
        <Centered><RefreshCw className="w-6 h-6 animate-spin text-teal-400" /><span>Connecting to the classroom…</span></Centered>
      )}

      {status === 'left' && (
        <Centered>
          <Video className="w-8 h-8 text-teal-400" />
          <span className="font-semibold">You are out of the classroom</span>
          {isHost && <span className="text-xs text-slate-400">The class is still live for students until you click End Class.</span>}
          <button onClick={join} className="mt-1 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-bold cursor-pointer">Rejoin classroom</button>
        </Centered>
      )}

      {status === 'error' && (
        <Centered>
          <AlertCircle className="w-8 h-8 text-rose-400" />
          <span className="font-semibold text-center max-w-md">{error}</span>
          <button onClick={join} className="mt-1 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-bold cursor-pointer">Try again</button>
        </Centered>
      )}
    </div>
  );
}

function Centered({ children }) {
  return <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-slate-300 p-6">{children}</div>;
}
