import React, { useEffect, useRef, useState } from 'react';
import { Video, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import ZoomMtgEmbedded from '@zoom/meetingsdk/embedded';

export function parseZoomLink(link = '') {
  if (!link) return { meetingNumber: '', password: '' };
  const m = link.match(/\/j\/(\d+)/);
  const p = link.match(/[?&]pwd=([^&]+)/);
  const num = m ? m[1] : (link.match(/\b\d{9,11}\b/) ? link.match(/\b\d{9,11}\b/)[0] : '');
  const pwd = p ? decodeURIComponent(p[1]) : '';
  return { meetingNumber: num, password: pwd };
}

export default function ZoomMeeting({ 
  link, 
  demoId, 
  studentEmail, 
  userName = 'Trainer', 
  height = 580,
  topic = 'Live Virtual Classroom',
  batchName = 'Thoughtflows Medical Coding Academy',
  isTrainerHost = true
}) {
  const zoomSDKContainerRef = useRef(null);
  const zoomClientRef = useRef(null);

  const [meetingDetails, setMeetingDetails] = useState({ meetingNumber: '', password: '', signature: '', sdkKey: '', zak: '' });
  const [sdkStatus, setSdkStatus] = useState('idle'); // 'idle' | 'loading' | 'joined' | 'error'
  const [sdkError, setSdkError] = useState('');

  // 1. Fetch meeting info & signature
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let num = '';
        let pwd = '';
        let sig = '';
        let key = '';
        let hostZak = '';

        if (demoId) {
          const apiBase = import.meta.env.VITE_API_URL || '';
          const q = studentEmail ? `?as=student&email=${encodeURIComponent(studentEmail)}` : '';
          const res = await fetch(`${apiBase}/api/demos/${demoId}/zoom-join${q}`);
          if (res.ok) {
            const data = await res.json();
            if (!cancelled && data) {
              num = String(data.meetingNumber || '').replace(/\D/g, '');
              pwd = data.password || '';
              sig = data.signature || '';
              key = data.sdkKey || '';
              hostZak = data.zak || '';
            }
          }
        } else {
          const resolvedLink = link || import.meta.env.VITE_ZOOM_MEETING_LINK || 'https://zoom.us/j/84366394686?pwd=7Pgqkoyz1uUSk7Rl-6hCiN7BygDQ0je.1';
          const parsed = parseZoomLink(resolvedLink);
          num = String(parsed.meetingNumber || '84366394686').replace(/\D/g, '');
          pwd = parsed.password || '7Pgqkoyz1uUSk7Rl-6hCiN7BygDQ0je.1';

          try {
            const apiBase = import.meta.env.VITE_API_URL || '';
            const sigRes = await fetch(`${apiBase}/api/zoom-signature`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ meetingNumber: num, role: isTrainerHost ? 1 : 0 })
            });
            if (sigRes.ok) {
              const sigData = await sigRes.json();
              sig = sigData.signature;
              key = sigData.sdkKey || sigData.appKey;
            }
          } catch (_) {}
        }

        if (!cancelled) {
          setMeetingDetails({ meetingNumber: num, password: pwd, signature: sig, sdkKey: key, zak: hostZak });
        }
      } catch (e) {
        console.warn('Error loading meeting details:', e);
      }
    })();

    return () => { cancelled = true; };
  }, [link, demoId, studentEmail, isTrainerHost]);

  // Clean up Zoom SDK client on unmount or retry
  const destroyZoomClient = async () => {
    if (zoomClientRef.current) {
      try {
        await zoomClientRef.current.leaveMeeting();
      } catch (_) {}
      try {
        await zoomClientRef.current.destroyClient();
      } catch (_) {}
      zoomClientRef.current = null;
    }
  };

  // 2. Auto-initialize and join Zoom SDK when details are ready
  const connectSDK = async () => {
    const cleanMn = String(meetingDetails.meetingNumber || '').replace(/\D/g, '');
    if (!cleanMn) return;

    setSdkStatus('loading');
    setSdkError('');

    try {
      await destroyZoomClient();

      if (!zoomSDKContainerRef.current) return;
      
      const client = ZoomMtgEmbedded.createClient();
      zoomClientRef.current = client;

      await client.init({
        zoomAppRoot: zoomSDKContainerRef.current,
        language: 'en-US',
        patchJsMedia: true
      });

      let signature = meetingDetails.signature;
      let sdkKey = meetingDetails.sdkKey;

      if (!signature) {
        const apiBase = import.meta.env.VITE_API_URL || '';
        const sigRes = await fetch(`${apiBase}/api/zoom-signature`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingNumber: cleanMn, role: isTrainerHost ? 1 : 0 })
        });
        if (sigRes.ok) {
          const sigData = await sigRes.json();
          signature = sigData.signature;
          sdkKey = sigData.sdkKey || sigData.appKey;
        }
      }

      if (!signature || !sdkKey) {
        throw new Error('Zoom SDK authentication signature unavailable from server');
      }

      await client.join({
        sdkKey: sdkKey,
        signature: signature,
        meetingNumber: cleanMn,
        password: meetingDetails.password,
        userName: userName,
        userEmail: studentEmail || 'user@thoughtflows.in',
        zak: meetingDetails.zak || undefined
      });

      setSdkStatus('joined');
    } catch (err) {
      console.warn('Zoom SDK join error:', err);
      let msg = err.reason || err.message || 'Failed to connect Zoom Meeting SDK';
      if (msg.includes('Already has other meetings in progress')) {
        msg = 'Another active Zoom meeting is currently running on this account.';
      } else if (err.errorCode === 3712) {
        msg = 'Zoom SDK signature rejected (App Marketplace key mismatch).';
      }
      setSdkStatus('error');
      setSdkError(msg);
    }
  };

  useEffect(() => {
    if (meetingDetails.meetingNumber) {
      connectSDK();
    }
    return () => {
      destroyZoomClient();
    };
  }, [meetingDetails]);

  const cleanNum = String(meetingDetails.meetingNumber || '').replace(/\D/g, '');
  const directAppUrl = `https://zoom.us/j/${cleanNum}?pwd=${encodeURIComponent(meetingDetails.password || '')}`;

  return (
    <div 
      className="relative bg-[#07151c] rounded-2xl border border-[#1a4250] overflow-hidden shadow-2xl text-white flex flex-col w-full h-full"
      style={{ minHeight: height, height: '100%' }}
    >
      {/* Zoom Meeting SDK Root Viewport */}
      <div className="relative flex-1 w-full h-full bg-[#030b0f] flex flex-col items-center justify-center">
        
        {/* Loading State */}
        {sdkStatus === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-3 text-center p-6 z-10 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shadow-xl">
              <RefreshCw className="w-7 h-7 animate-spin text-teal-300" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-white">Connecting Zoom Live SDK…</h4>
              <p className="text-xs text-teal-300 font-mono mt-1">Meeting ID: {cleanNum}</p>
            </div>
          </div>
        )}

        {/* Error / Active Meeting Fallback State */}
        {sdkStatus === 'error' && (
          <div className="flex flex-col items-center justify-center gap-3 text-center p-6 z-10 max-w-md bg-slate-900/95 rounded-2xl border border-rose-500/40 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400 shadow-xl">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-white">Zoom Meeting SDK Notice</h4>
              <p className="text-xs text-rose-300 font-medium mt-1">{sdkError}</p>
              <p className="text-xs text-slate-400 mt-2">
                Click below to retry connecting or join the active meeting session directly:
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              <button
                onClick={connectSDK}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry SDK</span>
              </button>

              <a
                href={directAppUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Join Active Session</span>
              </a>
            </div>
          </div>
        )}

        {/* DOM Element where Zoom Meeting SDK Client View renders */}
        <div 
          ref={zoomSDKContainerRef}
          id="zoomSDKContainer"
          className="w-full h-full flex-1"
          style={{ width: '100%', height: '100%', minHeight: height }}
        />
      </div>
    </div>
  );
}
