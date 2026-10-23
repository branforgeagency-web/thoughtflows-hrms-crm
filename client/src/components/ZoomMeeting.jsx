import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, AlertCircle, X } from 'lucide-react';
import ZoomMtgEmbedded from '@zoom/meetingsdk/embedded';
import { authHeaders } from '../services/api';

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
// Zoom SDK's own wording when a ZAK (host-start) token can't be used to open
// this particular meeting — usually because the host Zoom account/plan
// doesn't support starting via token. The meeting itself is fine (join_before_host
// is on), so we just rejoin as a regular participant instead of hard-failing.
const isNoHostTokenError = (err) => err?.errorCode === 200 || /not support start meeting via tokens/i.test(err?.reason || err?.message || '');

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
  isTrainerHost = true,
  // Optional async () => { meetingNumber, password, signature, sdkKey, zak }
  // used by live classes (server issues host / student credentials)
  getJoinDetails,
  onJoined,
  // Called once when Zoom reports this host already has another live
  // meeting — lets the parent offer a Google Meet fallback instead of
  // forcing the trainer to end the other session first.
  onBusy,
  // Called when the SDK reports the connection closed (the user clicked
  // Zoom's own Leave button, or the host ended the meeting) — the parent
  // can close its modal / reset its "in a meeting" state instead of being
  // left showing a dead call.
  onLeft
}) {
  const getJoinRef = useRef(getJoinDetails);
  getJoinRef.current = getJoinDetails;
  const onJoinedRef = useRef(onJoined);
  onJoinedRef.current = onJoined;
  const onBusyRef = useRef(onBusy);
  onBusyRef.current = onBusy;
  const onLeftRef = useRef(onLeft);
  onLeftRef.current = onLeft;
  const useLoader = Boolean(getJoinDetails);
  const containerRef = useRef(null);
  const runRef = useRef(0); // increments per attempt; stale attempts bail out
  const forceNoHostRef = useRef(false); // set after a "can't start via token" error — rejoin as participant
  const [status, setStatus] = useState('loading'); // 'loading' | 'joined' | 'error'
  const [error, setError] = useState('');
  const [meetingNo, setMeetingNo] = useState('');
  const [rootKey, setRootKey] = useState(0); // fresh DOM root for the SDK on every retry
  const debugRef = useRef(null);

  // Fresh join details from the server on EVERY attempt (server frees the trainer's Zoom user first)
  const fetchDetails = useCallback(async (reset = false) => {
    if (useLoader) {
      const data = await getJoinRef.current(reset, forceNoHostRef.current);
      return {
        meetingNumber: String(data.meetingNumber || '').replace(/\D/g, ''),
        password: data.password || '',
        signature: data.signature,
        sdkKey: data.sdkKey,
        zak: data.zak || ''
      };
    }
    if (demoId) {
      const params = new URLSearchParams();
      if (studentEmail) { params.set('as', 'student'); params.set('email', studentEmail); }
      else if (reset) params.set('reset', '1');
      if (forceNoHostRef.current) params.set('noHost', '1');
      const q = params.toString() ? `?${params}` : '';
      const res = await fetch(`${apiBase}/api/demos/${demoId}/zoom-join${q}`, { headers: authHeaders() });
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
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ meetingNumber, role: 0 })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Zoom signature unavailable from server');
    return { meetingNumber, password: parsed.password, signature: data.signature, sdkKey: data.sdkKey || data.appKey, zak: '' };
  }, [demoId, studentEmail, link, useLoader]);

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
      // Left unconfigured, the SDK renders as its own small (~244px) floating,
      // draggable "smart mode" widget instead of filling our container — that's
      // why the native Leave-meeting confirmation looked cut off to just a
      // "Cancel" button, there simply wasn't room for the rest of it. Locking
      // an explicit size + disabling drag/resize (per Zoom's documented
      // customize.video options) makes it fill the room instead.
      const rect = containerRef.current.getBoundingClientRect();
      const viewWidth = Math.round(Math.min(1400, Math.max(360, rect.width || 900)));
      const viewHeight = Math.round(Math.min(810, Math.max(240, rect.height || height)));
      await client.init({
        zoomAppRoot: containerRef.current,
        language: 'en-US',
        patchJsMedia: true,
        customize: {
          video: {
            popper: { disableDraggable: true },
            isResizable: false,
            viewSizes: { default: { width: viewWidth, height: viewHeight } }
          }
        }
      });
      if (run !== runRef.current) return;

      // Fires when the user leaves via Zoom's own Leave button, or the host
      // ends the meeting — otherwise our side would never learn the call ended.
      client.on('connection-change', (payload) => {
        if (payload?.state === 'Closed' && run === runRef.current) onLeftRef.current?.();
      });
      await client.join({
        sdkKey: d.sdkKey,
        signature: d.signature,
        meetingNumber: d.meetingNumber,
        password: d.password,
        userName,
        userEmail: studentEmail || undefined,
        zak: d.zak || undefined
      });
      if (run === runRef.current) { setStatus('joined'); onJoinedRef.current?.(); }
    } catch (err) {
      if (run !== runRef.current) return;
      const msg = err?.response?.data?.error || err?.reason || err?.message || 'Failed to connect Zoom Meeting SDK';
      // Host's previous meeting was still closing — server ends it on the next fetch, so retry automatically
      if (isBusyError(msg) && attempt < 3) {
        await resetSharedClient();
        setTimeout(() => { if (run === runRef.current) connect(attempt + 1); }, 2500 * attempt);
        return;
      }
      // This Zoom account/plan can't START the meeting via a host token — the
      // meeting itself still works (join_before_host is on), so drop the host
      // token and rejoin as a regular participant instead of failing outright.
      if (isNoHostTokenError(err) && !forceNoHostRef.current && attempt < 3) {
        forceNoHostRef.current = true;
        await resetSharedClient();
        setTimeout(() => { if (run === runRef.current) connect(attempt + 1); }, 1000);
        return;
      }
      console.warn('Zoom SDK join error:', err);
      if (isBusyError(msg)) onBusyRef.current?.();
      setError(
        isBusyError(msg)
          ? 'This trainer\'s Zoom account is still running another meeting. End it and retry, or start this session on Google Meet instead.'
          : err?.errorCode === 3707
            ? 'Zoom says this meeting ID does not exist for this SDK app. Check ZOOM_SDK_KEY/SECRET come from the SAME Zoom account that creates the meetings (S2S app).'
          : err?.errorCode === 3712
            ? 'Zoom SDK signature rejected (SDK key/secret mismatch on server).'
          : isNoHostTokenError(err)
            ? 'This Zoom account cannot start the meeting via a host token. Retry — we\'ll rejoin you as a participant automatically.'
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

  // Our OWN leave control. Zoom's native floating toolbar's leave button
  // renders its confirmation popup inside the SDK's own DOM, independent of
  // our markup — when that popup misbehaves in an embedded context there is
  // nothing in our CSS left to fix. This calls the SDK's leaveMeeting()
  // directly, so leaving never depends on that popup rendering correctly.
  const handleLeave = async () => {
    const run = runRef.current;
    try { await sharedClient?.leaveMeeting(); } catch (_) {}
    await resetSharedClient();
    if (run === runRef.current) {
      setStatus('left');
      onLeftRef.current?.();
    }
  };

  return (
    <div
      // overflow was previously "hidden" to keep the rounded corners clean,
      // but the Zoom SDK renders its own native popups (notably the Leave-
      // meeting confirmation) positioned relative to this box — "hidden"
      // clipped off everything past this box's edge, which is exactly why
      // only the "Cancel" button was ever visible/clickable. "visible" lets
      // those popups render in full; the corners staying square underneath
      // a popup is a much smaller tradeoff than Leave not working at all.
      className="relative bg-[#07151c] rounded-2xl border border-[#1a4250] overflow-visible shadow-2xl text-white flex flex-col w-full h-full"
      style={{ minHeight: height, height: '100%' }}
    >
      <div className="relative flex-1 w-full h-full bg-[#030b0f] rounded-2xl flex flex-col items-center justify-center">
        {status === 'joined' && (
          <button
            onClick={handleLeave}
            title="Leave this call"
            className="absolute top-3 right-3 z-20 px-3 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg backdrop-blur-sm"
          >
            <X className="w-3.5 h-3.5" />
            <span>Leave call</span>
          </button>
        )}
        {status === 'left' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6 z-10">
            <div className="w-14 h-14 rounded-2xl bg-slate-700/40 border border-slate-600 flex items-center justify-center shadow-xl">
              <X className="w-7 h-7 text-slate-300" />
            </div>
            <h4 className="text-base font-extrabold text-white">You left the call</h4>
            <button
              onClick={() => connect(1)}
              className="mt-1 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Rejoin</span>
            </button>
          </div>
        )}

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
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => connect(2)}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry</span>
              </button>
              {isBusyError(error) && (
                <button
                  onClick={() => onBusyRef.current?.()}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <span>Use Google Meet instead</span>
                </button>
              )}
            </div>
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
