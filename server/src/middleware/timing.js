// Request timing: adds a Server-Timing header (visible in the browser's
// Network tab → Timing) and logs every API call slower than SLOW_REQUEST_MS
// (default 800 ms) as  [slow] 2350ms GET /api/leads?branch=Hopes … (user, role)
// so the calls that keep a dashboard from loading in 2 s can be found in the
// Render logs.
const SLOW_MS = Number(process.env.SLOW_REQUEST_MS) || 800;

export function requestTiming() {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    const ms = () => Number(process.hrtime.bigint() - start) / 1e6;
    const writeHead = res.writeHead;
    res.writeHead = function patchedWriteHead(...args) {
      if (!res.headersSent) {
        try { res.setHeader('Server-Timing', `app;dur=${ms().toFixed(1)}`); } catch (_) { /* headers already sent */ }
      }
      return writeHead.apply(this, args);
    };
    res.on('finish', () => {
      const t = ms();
      if (t < SLOW_MS) return;
      const who = req.user ? ` (${req.user.name || req.user.email || '?'} · ${req.user.role || '-'})` : '';
      const url = String(req.originalUrl || req.url || '').slice(0, 220);
      console.warn(`[slow] ${Math.round(t)}ms ${req.method} ${url} → ${res.statusCode}${who}`);
    });
    next();
  };
}
