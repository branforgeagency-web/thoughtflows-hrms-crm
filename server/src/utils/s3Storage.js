// Server-side AWS S3 access for call recordings that arrive from telephony
// webhooks (Edesy / Knowlarity). Browser uploads go to the same bucket through
// Amplify Storage; this module lets the API server put provider recordings there
// too, and stream any recording back without a link that expires.
//
// Needs in server/.env: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION and
// AWS_STORAGE_BUCKET_NAME (the Amplify bucket from amplify_outputs.json).
import crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

let client = null;

export const s3Bucket = () => process.env.AWS_STORAGE_BUCKET_NAME || process.env.S3_BUCKET || '';
const s3Region = () => process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';

export function isS3Configured() {
  return Boolean(s3Bucket() && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

function s3() {
  if (!client) client = new S3Client({ region: s3Region() });
  return client;
}

const safe = (v) => String(v || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
const extFor = (contentType = '', url = '') => {
  const ct = String(contentType).toLowerCase();
  if (ct.includes('wav')) return 'wav';
  if (ct.includes('ogg')) return 'ogg';
  if (ct.includes('webm')) return 'webm';
  if (ct.includes('mp4') || ct.includes('m4a') || ct.includes('aac')) return 'm4a';
  if (ct.includes('mpeg') || ct.includes('mp3')) return 'mp3';
  const m = String(url).split('?')[0].match(/\.(mp3|wav|ogg|webm|m4a|aac)$/i);
  return m ? m[1].toLowerCase() : 'mp3';
};

export async function putRecordingBuffer(buffer, { prefix = 'general', contentType = 'audio/mpeg', ext } = {}) {
  const key = `recordings/${safe(prefix)}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext || extFor(contentType)}`;
  await s3().send(new PutObjectCommand({ Bucket: s3Bucket(), Key: key, Body: buffer, ContentType: contentType }));
  return key;
}

// Download a provider recording (often a link that expires in ~1 hour) and keep
// a permanent copy in S3. Returns the S3 key, or '' if it could not be copied.
export async function copyRemoteRecordingToS3(remoteUrl, prefix = 'provider') {
  if (!remoteUrl || !isS3Configured()) return '';
  try {
    const response = await fetch(remoteUrl);
    if (!response.ok) return '';
    const contentType = (response.headers.get('content-type') || 'audio/mpeg').split(';')[0].trim();
    if (/text\/html|application\/json/i.test(contentType)) return '';
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) return '';
    return await putRecordingBuffer(buffer, { prefix, contentType, ext: extFor(contentType, remoteUrl) });
  } catch (err) {
    console.error('Recording copy to S3 failed:', err.message);
    return '';
  }
}

// Stream an S3 object to an Express response, honouring Range so the audio
// player can seek. Uses the server's own credentials, so it never expires.
export async function streamS3Object(key, req, res) {
  const range = req.headers.range;
  const out = await s3().send(new GetObjectCommand({ Bucket: s3Bucket(), Key: key, ...(range ? { Range: range } : {}) }));
  res.status(range && out.ContentRange ? 206 : 200);
  res.setHeader('Content-Type', out.ContentType || 'audio/mpeg');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  if (out.ContentLength != null) res.setHeader('Content-Length', String(out.ContentLength));
  if (out.ContentRange) res.setHeader('Content-Range', out.ContentRange);
  out.Body.pipe(res);
}

// ---------------------------------------------------------------------------
// Signed (presigned) GET links for private bucket objects — AWS SigV4 query
// signing, done here so no extra package is needed. The bucket is private, so
// a plain https://<bucket>.s3...amazonaws.com/<key> link is always refused
// (AccessDenied); use these signed links instead.
// ---------------------------------------------------------------------------
const rfc3986 = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data, 'utf8').digest();
const sha256hex = (data) => crypto.createHash('sha256').update(data, 'utf8').digest('hex');

// { bucket, region, key } from "https://<bucket>.s3.<region>.amazonaws.com/<key>" (or path-style)
export function parseS3Url(url = '') {
  try {
    const u = new URL(url);
    let m = u.hostname.match(/^(.+)\.s3[.-]([a-z0-9-]+)\.amazonaws\.com$/);
    if (m) return { bucket: m[1], region: m[2] === 'external-1' ? 'us-east-1' : m[2], key: decodeURIComponent(u.pathname.slice(1)) };
    m = u.hostname.match(/^(.+)\.s3\.amazonaws\.com$/);
    if (m) return { bucket: m[1], region: 'us-east-1', key: decodeURIComponent(u.pathname.slice(1)) };
    m = u.hostname.match(/^s3[.-]([a-z0-9-]+)\.amazonaws\.com$/);
    if (m) { const [b, ...rest] = u.pathname.slice(1).split('/'); return { bucket: b, region: m[1], key: decodeURIComponent(rest.join('/')) }; }
  } catch (_) {}
  return null;
}

export function presignGetUrl({ bucket = s3Bucket(), region = s3Region(), key, expiresIn = 3600, host, date = new Date(),
  accessKeyId = process.env.AWS_ACCESS_KEY_ID, secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY, sessionToken = process.env.AWS_SESSION_TOKEN,
  responseContentDisposition } = {}) {
  if (!bucket || !key || !accessKeyId || !secretAccessKey) return '';
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = amzDate.slice(0, 8);
  const scope = `${day}/${region}/s3/aws4_request`;
  const h = host || `${bucket}.s3.${region}.amazonaws.com`;
  const path = '/' + String(key).split('/').map(rfc3986).join('/');
  const params = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(Math.min(604800, Math.max(1, Math.round(expiresIn)))),
    'X-Amz-SignedHeaders': 'host'
  };
  if (sessionToken) params['X-Amz-Security-Token'] = sessionToken;
  if (responseContentDisposition) params['response-content-disposition'] = responseContentDisposition;
  const query = Object.keys(params).sort().map((k) => `${rfc3986(k)}=${rfc3986(params[k])}`).join('&');
  const canonical = ['GET', path, query, `host:${h}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonical)].join('\n');
  const kSigning = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, day), region), 's3'), 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(toSign, 'utf8').digest('hex');
  return `https://${h}${path}?${query}&X-Amz-Signature=${signature}`;
}

// Signed link for a stored file given its saved key and/or saved URL. The
// bucket in the saved URL wins, so files uploaded from another environment
// (e.g. the deployed app vs local sandbox) are signed for the right bucket.
export function signedUrlForStoredFile({ storageKey = '', storageUrl = '', expiresIn = 3600, download = false, fileName = '' } = {}) {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) return '';
  const fromUrl = storageUrl ? parseS3Url(storageUrl) : null;
  const key = storageKey || fromUrl?.key || '';
  if (!key) return '';
  return presignGetUrl({
    bucket: fromUrl?.bucket || s3Bucket(), region: fromUrl?.region || s3Region(), key, expiresIn,
    responseContentDisposition: download ? `attachment; filename="${String(fileName || key.split('/').pop()).replace(/"/g, '')}"` : undefined
  });
}

// ---------------------------------------------------------------------------
// Generic object helpers (used for the HTML5 versions of training slides)
// ---------------------------------------------------------------------------
export async function putObjectBuffer(key, buffer, contentType = 'application/octet-stream') {
  await s3().send(new PutObjectCommand({ Bucket: s3Bucket(), Key: key, Body: buffer, ContentType: contentType }));
  return key;
}

// Stream one stored object back with the given content type (no download prompt).
export async function streamS3File(key, res, contentType) {
  const out = await s3().send(new GetObjectCommand({ Bucket: s3Bucket(), Key: key }));
  res.status(200);
  res.setHeader('Content-Type', contentType || out.ContentType || 'application/octet-stream');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (out.ContentLength != null) res.setHeader('Content-Length', String(out.ContentLength));
  out.Body.pipe(res);
}
