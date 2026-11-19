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
