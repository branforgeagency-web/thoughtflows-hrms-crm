import React, { useState, useEffect, useRef } from 'react';
import { resolveRecordingAudioUrl, recordingUrl } from '../services/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Browser (MediaRecorder) .webm files are saved without a duration header, so the
// <audio> player shows 0:00 and can't seek. Jumping to the end once forces the
// browser to scan the file and learn its real length, then we rewind.
export default function RecordingAudio({
  src,
  storageKey,
  recording,
  className = '',
  preload = 'metadata',
  onLoadedMetadata,
  onError,
  ...rest
}) {
  const audioRef = useRef(null);
  const rawUrl = src || recording?.audioUrl || '';
  const rawKey = storageKey || recording?.storageKey || '';

  const initialUrl = recordingUrl(rawUrl, rawKey);
  const [resolvedSrc, setResolvedSrc] = useState(initialUrl);
  const isDirectUrl = rawUrl.startsWith('blob:') || rawUrl.startsWith('data:');
  const [loading, setLoading] = useState(!isDirectUrl && Boolean(rawUrl || rawKey));
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Resolve guaranteed fresh signed URL (re-signs expired S3 links)
  useEffect(() => {
    let isMounted = true;

    if (!rawUrl && !rawKey) {
      setResolvedSrc('');
      setLoading(false);
      return;
    }

    if (isDirectUrl) {
      setResolvedSrc(rawUrl);
      setLoading(false);
      setLoadError(false);
      return;
    }

    setLoading(true);
    setLoadError(false);

    resolveRecordingAudioUrl(rawUrl, rawKey)
      .then((freshUrl) => {
        if (isMounted && freshUrl) {
          setResolvedSrc(freshUrl);
          setLoadError(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to resolve recording audio URL:', err);
        if (isMounted && !resolvedSrc) {
          setLoadError(true);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [rawUrl, rawKey, retryCount, isDirectUrl]);

  // Listen for file token updates for local server files
  useEffect(() => {
    const handleFileToken = () => {
      if (rawUrl && String(rawUrl).startsWith('/recordings')) {
        setResolvedSrc(recordingUrl(rawUrl));
      }
    };
    window.addEventListener('thoughtflows_file_token', handleFileToken);
    return () => window.removeEventListener('thoughtflows_file_token', handleFileToken);
  }, [rawUrl]);

  // Handle duration fix for .webm files
  const fixDuration = (e) => {
    const a = e.currentTarget;
    if (a.duration === Infinity || Number.isNaN(a.duration)) {
      const reset = () => {
        a.removeEventListener('timeupdate', reset);
        a.currentTime = 0;
      };
      a.addEventListener('timeupdate', reset);
      try {
        a.currentTime = 1e101;
      } catch (_) {}
    }
    if (onLoadedMetadata) onLoadedMetadata(e);
  };

  const handleAudioError = async (e) => {
    console.warn('Audio playback error, attempting to refresh URL:', resolvedSrc);
    // If not retried yet and has S3 key or URL, try one refresh
    if (retryCount === 0 && (rawKey || rawUrl.includes('amazonaws.com') || rawUrl.includes('recordings'))) {
      setRetryCount((c) => c + 1);
    } else {
      setLoadError(true);
      if (onError) onError(e);
    }
  };

  if (!rawUrl && !rawKey) {
    return <span className="text-slate-400 italic text-[11px]">No audio file</span>;
  }

  if (loadError) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate max-w-[120px]">Audio expired / unavailable</span>
        <button
          type="button"
          onClick={() => {
            setLoadError(false);
            setRetryCount((c) => c + 1);
          }}
          className="p-1 hover:bg-rose-100 rounded text-rose-800 transition-colors cursor-pointer"
          title="Retry loading audio"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      {loading && !resolvedSrc && (
        <div className="h-8 w-56 bg-slate-100 rounded-lg animate-pulse flex items-center px-3 text-[11px] text-slate-400">
          Loading audio player...
        </div>
      )}
      <audio
        ref={audioRef}
        controls
        preload={preload}
        src={resolvedSrc || undefined}
        onLoadedMetadata={fixDuration}
        onError={handleAudioError}
        className={`${className} ${loading && !resolvedSrc ? 'hidden' : ''}`}
        {...rest}
      />
    </div>
  );
}
