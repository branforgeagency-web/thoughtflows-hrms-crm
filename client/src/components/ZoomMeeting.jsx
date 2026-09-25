import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import ZoomMtgEmbedded from '@zoom/meetingsdk/embedded';

export function parseZoomLink(link = '') {
  if (!link) return { meetingNumber: '', password: '' };
  const m = link.match(/\/j\/(\d+)/);
  const p = link.match(/[?&]pwd=([^&]+)/);
  const num = m ? m[1] : (link.match(/\b\d{9,11}\b/) ? link.match(/\b\d{9,11}\b/)[0] : '');
  const pwd = p ? decodeURIComponent(p[1]) : '';
  return { meetingNumber: num, password: pwd };
}

const apiBase = import.meta.env.VITE_API_URL || '';
const isBusyError = (msg = '') => /already has other meetings in progress/i.test(msg);

// One embedded client per browser tab. Zoom's embedded SDK can only be in one
// meeting at a time, so every mount reuses/cleans the same instance.
let sharedClient = null;
async function resetSharedClient() {
  if (!sharedClient) return;
  try { await sharedClient.leaveMeeting(); } catch (_) {}
  try { ZoomMtgEmbedded.destroyClient(); } catch (_) {}
  sharedClient = null;
}

export default function ZoomMeeting({
  link,
  demoId,
  studentEmail,
  userName = 'Trainer',
  height = 580,
  isTrainerHost = true
}) {
  const containerRef = useRef(null);
  const runRef = useRef(0); // increments per attempt; stale attempts bail out
  const [status, setStatus] = useState('loading'); // 'loading' | 'joined' | 'error'
  const [error, setError] = useState('');
  const [meetingNo, setMeetingNo] = useState('');
  const [rootKey, setRootKey] = useState(0); // fresh DOM root for the SDK on every retry
  const debugRef = useRef(null);

  // Fresh join details from the server on EVERY attempt (server frees the trainer's Zoom user first)
  const fetchDetails = useCallback(async (reset = false) => {
    if (demoId) {
      const params = new URLSearchParams();
      if (studentEmail) { params.set('as', 'student'); params.set('email', studentEmail); }
      else if (reset) params.set('reset', '1');
      const q = params.toString() ? `?${params}` : '';
      const res = await fetch(`${apiBase}/api/demos/${demoId}/zoom-join${q}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load Zoom meeting details');
      debugRef.current = data.debug || null;
      return {
        meetingNumber: String(data.meetingNumber || '').replace(/\D/g, ''),
        password: data.password || '',
        signature: data.signature,
        sdkKey: data.sdkKey,
        zak: data.zak || ''
      };
    }
    const parsed = parseZoomLink(link || import.meta.env.VITE_ZOOM_MEETING_LINK || '');
    const meetingNumber = String(parsed.meetingNumber || '').replace(/\D/g, '');
    if (!meetingNumber) throw new Error('No Zoom meeting configured for this class');
    const res = await fetch(`${apiBase}/api/zoom-signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingNumber, role: 0 })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Zoom signature unavailable from server');
    return { meetingNumber, password: parsed.password, signature: data.signature, sdkKey: data.sdkKey || data.appKey, zak: '' };
  }, [demoId, studentEmail, link]);

  const connect = useCallback(async (attempt = 1) => {
    const run = ++runRef.current;
    setStatus('loading');
    setError('');
    try {
      // Retry after a 'busy' error = hard reset: server ends stuck meetings and issues a brand-new one
      const d = await fetchDetails(attempt > 1);
      if (run !== runRef.current) return;
      setMeetingNo(d.meetingNumber);
      if (!d.signature || !d.sdkKey) throw new Error('Zoom SDK signature unavailable from server');

      await resetSharedClient();
      if (attempt > 1) { setRootKey(k => k + 1); await new Promise(r => setTimeout(r, 300)); }
      if (run !== runRef.current || !containerRef.current) return;

      const client = ZoomMtgEmbedded.createClient();
      sharedClient = client;
      await client.init({ zoomAppRoot: containerRef.current, language: 'en-US', patchJsMedia: true });
      if (run !== runRef.current) return;

      await client.join({
        sdkKey: d.sdkKey,
        signature: d.signature,
        meetingNumber: d.meetingNumber,
        password: d.password,
        userName,
        userEmail: studentEmail || undefined,
        zak: d.zak || undefined
      });
      if (run === runRef.current) setStatus('joined');
    } catch (err) {
      if (run !== runRef.current) return;
      const msg = err?.reason || err?.message || 'Failed to connect Zoom Meeting SDK';
      // Host's previous meeting was still closing — server ends it on the next fetch, so retry automatically
      if (isBusyError(msg) && attempt < 3) {
        await resetSharedClient();
        setTimeout(() => { if (run === runRef.current) connect(attempt + 1); }, 2500 * attempt);
        return;
      }
      console.warn('Zoom SDK join error:', err);
      setError(
        isBusyError(msg)
          ? 'This trainer\'s Zoom account is still running another meeting. End it and retry.'
          : err?.errorCode === 3707
            ? 'Zoom says this meeting ID does not exist for this SDK app. Check ZOOM_SDK_KEY/SECRET come from the SAME Zoom account that creates the meetings (S2S app).'
          : err?.errorCode === 3712
            ? 'Zoom SDK signature rejected (SDK key/secret mismatch on server).'
            : msg
      );
      setStatus('error');
    }
  }, [fetchDetails, userName, studentEmail]);

  useEffect(() => {
    // Deferred so React StrictMode's mount→unmount→mount only ever starts ONE join
    const t = setTimeout(() => connect(), 0);
    return () => {
      clearTimeout(t);
      runRef.current++; // cancel in-flight attempt
      resetSharedClient();
    };
  }, [connect]);

  return (
    <div
      className="relative bg-[#07151c] rounded-2xl border border-[#1a4250] overflow-hidden shadow-2xl text-white flex flex-col w-full h-full"
      style={{ minHeight: height, height: '100%' }}
    >
      <div className="relative flex-1 w-full h-full bg-[#030b0f] flex flex-col items-center justify-center">
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6 z-10 pointer-events-none">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center shadow-xl">
              <RefreshCw className="w-7 h-7 animate-spin text-teal-300" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-white">Connecting Zoom…</h4>
              {meetingNo && <p className="text-xs text-teal-300 font-mono mt-1">Meeting ID: {meetingNo}</p>}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute z-10 flex flex-col items-center justify-center gap-3 text-center p-6 max-w-md bg-slate-900/95 rounded-2xl border border-rose-500/40 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400 shadow-xl">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-white">Zoom connection failed</h4>
              <p className="text-xs text-rose-300 font-medium mt-1">{error}</p>
              {debugRef.current && (
                <p className="text-[10px] text-slate-400 font-mono mt-2 break-all">
                  host: {debugRef.current.host || '-'}{debugRef.current.dedicated === false ? ' (shared)' : ''}
                  {' · '}live: {(debugRef.current.liveBefore || []).join(',') || 'none'}
                  {debugRef.current.liveError ? ` · liveErr: ${debugRef.current.liveError}` : ''}
                  {debugRef.current.meetingId ? ` · mtg: ${debugRef.current.meetingId}` : ''}
                  {debugRef.current.staleMeeting ? ` · recreated (was ${debugRef.current.staleMeeting})` : ''}
                  {debugRef.current.zakError ? ` · zakErr: ${debugRef.current.zakError}` : ''}
                </p>
              )}
            </div>
            <button
              onClick={() => connect(2)}
              className="mt-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        )}

        <div
          key={rootKey}
          ref={containerRef}
          id="zoomSDKContainer"
          className="w-full h-full flex-1"
          style={{ width: '100%', height: '100%', minHeight: height }}
        />
      </div>
    </div>
  );
}
