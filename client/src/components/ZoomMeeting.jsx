import React, { useEffect, useRef, useState } from 'react';

// Zoom Meeting SDK – Component View (embeds the meeting inside the page)
async function loadSdk() {
  const mod = await import('@zoom/meetingsdk/embedded');
  return mod.default?.createClient ? mod.default : (mod.ZoomMtgEmbedded || mod.default || mod);
}

export function parseZoomLink(link = '') {
  const m = link.match(/\/j\/(\d+)/);
  const p = link.match(/[?&]pwd=([^&]+)/);
  return { meetingNumber: m ? m[1] : '', password: p ? decodeURIComponent(p[1]) : '' };
}

export default function ZoomMeeting({ link, demoId, studentEmail, userName = 'Trainer', height = 480 }) {
  const rootRef = useRef(null);
  const [status, setStatus] = useState('joining'); // joining | live | error
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let Zoom = null;
    let client = null;

    (async () => {
      try {
        Zoom = await loadSdk();
        let info;
        if (demoId) {
          const q = studentEmail ? `?as=student&email=${encodeURIComponent(studentEmail)}` : '';
          const res = await fetch(`/api/demos/${demoId}/zoom-join${q}`);
          info = await res.json();
          if (!res.ok) throw new Error(info.error || 'Could not get demo meeting');
        } else {
          const { meetingNumber, password } = parseZoomLink(link);
          if (!meetingNumber) throw new Error('No Zoom meeting number found in session link');
          const res = await fetch('/api/zoom-signature', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ meetingNumber, role: 0 }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Signature request failed');
          info = { ...data, meetingNumber, password };
        }
        if (cancelled) return;

        const root = rootRef.current;
        client = Zoom.createClient();
        await client.init({
          zoomAppRoot: root,
          language: 'en-US',
          patchJsMedia: true,
          customize: {
            video: {
              isResizable: false,
              viewSizes: { default: { width: root.clientWidth, height } },
            },
          },
        });
        if (cancelled) return;
        await client.join({
          sdkKey: info.sdkKey,
          signature: info.signature,
          meetingNumber: info.meetingNumber,
          password: info.password,
          userName,
          ...(info.zak ? { zak: info.zak } : {}),
        });
        if (!cancelled) setStatus('live');
      } catch (e) {
        if (!cancelled) {
          setError(e?.reason || e?.message || 'Could not join Zoom');
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      try { client?.leaveMeeting(); } catch (_) {}
      try { Zoom?.destroyClient(); } catch (_) {}
    };
  }, [link, demoId, studentEmail, userName, height]);

  return (
    <div className="relative bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg" style={{ minHeight: height }}>
      <div ref={rootRef} style={{ width: '100%', minHeight: height }} />
      {status === 'joining' && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-teal-300">
          Joining Zoom session…
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
          <div className="text-xs font-bold text-rose-300">{error}</div>
          {link && (
            <a href={link} target="_blank" rel="noreferrer" className="text-xs text-teal-300 underline">
              Open in Zoom app instead
            </a>
          )}
        </div>
      )}
    </div>
  );
}
