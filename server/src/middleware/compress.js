import zlib from 'zlib';

/**
 * Response compression without an extra dependency (`npm i compression` is not
 * available in this deployment), built on Node's own zlib.
 *
 * Dashboard endpoints return large JSON arrays — a full student or lead list is
 * easily several MB of raw text. JSON compresses by roughly 85-92%, so this is
 * the single largest reduction in "data takes forever to load" on slow or
 * mobile connections, and it costs a few ms of CPU per response.
 *
 * Only `res.json` / `res.send` bodies are touched: streamed responses
 * (recordings, file downloads) pass straight through untouched.
 */

const MIN_BYTES = 1024; // below this, framing overhead outweighs the saving

const pickEncoding = (header = '') => {
  const accepted = String(header).toLowerCase();
  // br gives ~15-20% better ratios than gzip on JSON, at similar speed on level 4
  if (/\bbr\b/.test(accepted) && typeof zlib.brotliCompress === 'function') return 'br';
  if (/\bgzip\b/.test(accepted)) return 'gzip';
  if (/\bdeflate\b/.test(accepted)) return 'deflate';
  return null;
};

const compressBuffer = (buf, encoding) =>
  new Promise((resolve, reject) => {
    const done = (err, out) => (err ? reject(err) : resolve(out));
    if (encoding === 'br') {
      zlib.brotliCompress(
        buf,
        {
          params: {
            // Level 4 is the sweet spot for API JSON: near-gzip speed,
            // better-than-gzip ratio. Level 11 would add ~100ms+ per MB.
            [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
            [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length,
            [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT
          }
        },
        done
      );
    } else if (encoding === 'deflate') {
      zlib.deflate(buf, { level: 6 }, done);
    } else {
      zlib.gzip(buf, { level: 6 }, done);
    }
  });

export const compressResponses = () => (req, res, next) => {
  if (req.method === 'HEAD') return next();

  const encoding = pickEncoding(req.headers['accept-encoding']);
  if (!encoding) return next();

  const originalSend = res.send.bind(res);
  let compressing = false;

  res.send = function patchedSend(body) {
    if (compressing || res.headersSent) return originalSend(body);

    // Opt-out hook for any route that must not be re-encoded
    if (res.getHeader('Content-Encoding') || res.locals?.noCompress) return originalSend(body);

    const isBuffer = Buffer.isBuffer(body);
    if (!isBuffer && typeof body !== 'string') return originalSend(body);

    const buf = isBuffer ? body : Buffer.from(body, 'utf8');
    if (buf.length < MIN_BYTES) return originalSend(body);

    const type = String(res.getHeader('Content-Type') || 'application/json');
    if (!/json|text|javascript|xml|svg|csv/i.test(type)) return originalSend(body);

    compressing = true;
    compressBuffer(buf, encoding)
      .then((out) => {
        if (res.headersSent) return;
        // Nothing gained (already-compressed payload) — send the original
        if (out.length >= buf.length) {
          compressing = false;
          return originalSend(body);
        }
        res.setHeader('Content-Encoding', encoding);
        res.setHeader('Content-Length', out.length);
        res.setHeader('Vary', 'Accept-Encoding');
        res.removeHeader('Content-MD5');
        originalSend(out);
      })
      .catch(() => {
        compressing = false;
        if (!res.headersSent) originalSend(body);
      });

    return res;
  };

  next();
};

export default compressResponses;
