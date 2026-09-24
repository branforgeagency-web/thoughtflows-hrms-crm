import React, { useEffect, useRef, useState } from 'react';
import { Video, ExternalLink, Copy, Check, AlertCircle } from 'lucide-react';

// Zoom Meeting SDK – Component View (embeds the meeting inside the page)
async function loadSdk() {
  const mod = await import('@zoom/meetingsdk/embedded');
  return mod.default?.createClient ? mod.default : (mod.ZoomMtgEmbedded || mod.default || mod);
}

export function parseZoomLink(link = '') {
  const m = link.match(/\/j\/(\d+)/);
  const p = link.match(/[?&]pwd=([^&]+)/);
  return { 
    meetingNumber: m ? m[1] : (link.match(/\b\d{9,11}\b/) ? link.match(/\b\d{9,11}\b/)[0] : ''), 
    password: p ? decodeURIComponent(p[1]) : '' 
  };
}

export default function ZoomMeeting({ link, demoId, studentEmail, userName = 'Trainer', height = 480 }) {
  const rootRef = useRef(null);
  const [status, setStatus] = useState('joining'); // joining | live | error
  const [error, setError] = useState('');
  const [meetingDetails, setMeetingDetails] = useState({ meetingNumber: '', password: '' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let Zoom = null;
    let client = null;

    (async () => {
      try {
        const { meetingNumber, password } = parseZoomLink(link);
        setMeetingDetails({ meetingNumber, password });

        Zoom = await loadSdk();
        let info;
        const apiBase = import.meta.env.VITE_API_URL || '';

        if (demoId) {
          const q = studentEmail ? `?as=student&email=${encodeURIComponent(studentEmail)}` : '';
          const res = await fetch(`${apiBase}/api/demos/${demoId}/zoom-join${q}`);
          let data;
          try { data = await res.json(); } catch { data = {}; }
          if (!res.ok) {
            throw new Error(data.error || `Could not fetch demo meeting (HTTP ${res.status})`);
          }
          info = data;
        } else {
          if (!meetingNumber) throw new Error('No Zoom meeting number found in session link');
          const res = await fetch(`${apiBase}/api/zoom-signature`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ meetingNumber, role: 0 }),
          });

          let data;
          try { data = await res.json(); } catch { data = {}; }

          if (!res.ok) {
            const msg = data.error || (res.status === 404 
              ? 'Backend API (/api/zoom-signature) returned 404 on Vercel.' 
              : `Signature request failed (HTTP ${res.status})`);
            throw new Error(msg);
          }
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
          signature: info.signature,
          meetingNumber: String(info.meetingNumber).replace(/\s/g, ''),
          password: info.password || '',
          userName,
          ...(info.zak ? { zak: info.zak } : {}),
        });
        if (!cancelled) setStatus('live');
      } catch (e) {
        if (!cancelled) {
          setError(e?.reason || e?.message || 'Could not initialize embedded Zoom');
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

  const activeLink = link || (meetingDetails.meetingNumber ? `https://zoom.us/j/${meetingDetails.meetingNumber}${meetingDetails.password ? `?pwd=${meetingDetails.password}` : ''}` : '');
  const webClientLink = meetingDetails.meetingNumber 
    ? `https://app.zoom.us/wc/${meetingDetails.meetingNumber}/join?prefer=1${meetingDetails.password ? `&pwd=${meetingDetails.password}` : ''}`
    : activeLink;

  const handleCopy = () => {
    if (activeLink) {
      navigator.clipboard.writeText(activeLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg flex flex-col justify-center items-center text-white" style={{ minHeight: height }}>
      <div ref={rootRef} style={{ width: '100%', minHeight: status === 'live' ? height : 0, display: status === 'live' ? 'block' : 'none' }} />

      {status === 'joining' && (
        <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="w-10 h-10 border-3 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <div className="text-xs font-semibold text-teal-300">
            Connecting to Zoom session…
          </div>
          <div className="text-[11px] text-slate-400">
            Initializing Meeting SDK credentials
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="max-w-md w-full mx-auto p-6 flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Video className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h4 className="text-base font-extrabold text-white">
              Live Zoom Meeting Ready
            </h4>
            <p className="text-xs text-slate-300">
              Join the live training session directly in your browser or the Zoom app.
            </p>
          </div>

          {meetingDetails.meetingNumber && (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 w-full flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Meeting ID:</span>
              <span className="text-teal-300 font-bold tracking-wide">{meetingDetails.meetingNumber}</span>
              {meetingDetails.password && (
                <>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-400">Passcode:</span>
                  <span className="text-white font-bold">{meetingDetails.password}</span>
                </>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
            {activeLink && (
              <a
                href={activeLink}
                target="_blank"
                rel="noreferrer"
                className="flex-1 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0e6977] hover:bg-[#0a4f5a] text-white text-xs font-bold shadow-md transition-all active:scale-95"
              >
                <Video className="w-4 h-4" />
                <span>Open Zoom App</span>
              </a>
            )}

            {webClientLink && (
              <a
                href={webClientLink}
                target="_blank"
                rel="noreferrer"
                className="flex-1 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-teal-300 text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Join in Browser</span>
              </a>
            )}
          </div>

          {activeLink && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Meeting Link Copied!' : 'Copy Meeting Invite Link'}</span>
            </button>
          )}

          <div className="pt-2 border-t border-slate-800/80 w-full flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="truncate" title={error}>
              {error.includes('404') ? 'Backend server running in offline/static mode' : error}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
