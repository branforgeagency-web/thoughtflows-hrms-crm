import { useEffect, useState } from 'react';
import { ensureFileToken } from '../services/api';

// Re-render when the short-lived file-link token arrives or refreshes, so
// <a href>, <audio src> and <iframe src> built with withAuthToken() stay valid.
export default function useFileToken() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener('thoughtflows_file_token', bump);
    ensureFileToken();
    const t = setInterval(() => ensureFileToken(), 5 * 60 * 1000);
    return () => { window.removeEventListener('thoughtflows_file_token', bump); clearInterval(t); };
  }, []);
  return tick;
}
