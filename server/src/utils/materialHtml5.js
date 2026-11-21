// Animated HTML5 copies of PowerPoint training materials.
//
// When a PPT/PPTX is uploaded, the server sends it to Aspose.Slides Cloud,
// which turns it into an HTML5 slideshow that keeps the slide animations and
// transitions. The result (a ZIP of index.html + scripts + images) is unpacked
// into the academy S3 bucket under training-html5/<materialId>/<stamp>/ and is
// served back only through the login-protected API, so the original .pptx is
// never handed to the viewer.
//
// Needs in server/.env:
//   ASPOSE_CLIENT_ID, ASPOSE_CLIENT_SECRET   (from https://dashboard.aspose.cloud → Applications)
//   ASPOSE_API_BASE                          (optional, default https://api.aspose.cloud)
// For decks over ~95 MB (Aspose refuses uploads over 100,000,000 bytes) link a
// separate, empty S3 bucket as storage in the Aspose dashboard and set:
//   ASPOSE_STORAGE_NAME    the "Storage Name" given in the Aspose dashboard
//   ASPOSE_STORAGE_BUCKET  that S3 bucket's name (same AWS region as the main bucket)
// The server then copies each deck into that bucket (S3 → S3, nothing is
// downloaded) and Aspose reads it from there — no size limit from uploading.
import https from 'https';
import zlib from 'zlib';
import crypto from 'crypto';
import TrainingMaterial from '../models/TrainingMaterial.js';
import { isS3Configured, signedUrlForStoredFile, putObjectBuffer, copyStoredFileToBucket, deleteObjectIn } from './s3Storage.js';

export const HTML5_PRESENTATION_EXTS = new Set(['ppt', 'pptx', 'pps', 'ppsx', 'pot', 'potx', 'pptm', 'odp', 'zip']);
export const API_BASE = () => String(process.env.ASPOSE_API_BASE || 'https://api.aspose.cloud').replace(/\/+$/, '');
const TEMP_FOLDER = 'thoughtflows-tmp';
const ASPOSE_UPLOAD_MAX_BYTES = 100000000; // Aspose Cloud's request-body limit
const linkedStorage = () => {
  const name = String(process.env.ASPOSE_STORAGE_NAME || '').trim();
  const bucket = String(process.env.ASPOSE_STORAGE_BUCKET || '').trim();
  return name && bucket ? { name, bucket } : null;
};
// Tried in order until one works (each try is one Aspose API call)
export const HTML5_OPTION_SETS = [
  { Format: 'html5', AnimateShapes: true, AnimateTransitions: true },
  { AnimateShapes: true, AnimateTransitions: true },
  null // Aspose defaults
];
const CONVERT_TIMEOUT_MS = 30 * 60 * 1000; // big decks can take many minutes

export const isAsposeConfigured = () => Boolean(process.env.ASPOSE_CLIENT_ID && process.env.ASPOSE_CLIENT_SECRET);
export const isPresentationMaterial = (doc) =>
  HTML5_PRESENTATION_EXTS.has(String(doc?.fileName || '').split('.').pop().toLowerCase());

// ---------------------------------------------------------------------------
// HTTPS helper — node's fetch gives up waiting for headers after 5 minutes,
// which a long conversion can exceed, so plain https is used instead.
// ---------------------------------------------------------------------------
export function httpsRequest(url, { method = 'GET', headers = {}, body = null, timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`Aspose request timed out after ${Math.round(timeoutMs / 60000)} min`)));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
const errText = (r) => {
  const t = r.body.toString('utf8').slice(0, 400);
  try { const j = JSON.parse(t); return j?.error?.message || j?.message || j?.error_description || t; } catch (_) { return t; }
};

let tokenCache = { value: '', until: 0 };
export async function asposeToken() {
  if (tokenCache.value && Date.now() < tokenCache.until) return tokenCache.value;
  const form = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.ASPOSE_CLIENT_ID,
    client_secret: process.env.ASPOSE_CLIENT_SECRET
  }).toString();
  const r = await httpsRequest(`${API_BASE()}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'Content-Length': Buffer.byteLength(form) },
    body: form
  });
  if (r.status !== 200) throw new Error(`Aspose sign-in failed (${r.status}): ${errText(r)}`);
  const j = JSON.parse(r.body.toString('utf8'));
  tokenCache = { value: j.access_token, until: Date.now() + Math.max(60, (Number(j.expires_in) || 3600) - 120) * 1000 };
  return tokenCache.value;
}

// ---------------------------------------------------------------------------
// Aspose: upload to its temp storage → convert to HTML5 → delete temp copy
// ---------------------------------------------------------------------------
// Run the HTML5 conversion on a file already in Aspose-visible storage.
async function convertStored(remoteName, storageName = '') {
  const token = await asposeToken();
  const auth = { Authorization: `Bearer ${token}` };
  const qs = `folder=${encodeURIComponent(TEMP_FOLDER)}${storageName ? `&storage=${encodeURIComponent(storageName)}` : ''}`;
  // Aspose's engine sometimes rejects an option set with "Operation is not valid
  // due to the current state of the object" — so try the full animated settings
  // first, then simpler ones.
  let lastErr = '';
  for (const opts of HTML5_OPTION_SETS) {
    const body = opts ? JSON.stringify(opts) : '';
    const conv = await httpsRequest(`${API_BASE()}/v3.0/slides/${encodeURIComponent(remoteName)}/html5?${qs}`, {
      method: 'POST',
      headers: {
        ...auth, Accept: '*/*',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        'Content-Length': Buffer.byteLength(body)
      },
      body: body || null,
      timeoutMs: CONVERT_TIMEOUT_MS
    });
    if (conv.status === 200 && conv.body.length) {
      if (opts !== HTML5_OPTION_SETS[0]) console.log('Aspose HTML5 converted with fallback options:', body || '(none)');
      return conv.body;
    }
    lastErr = `(${conv.status}): ${errText(conv)}`;
    // Only an engine error (500) is worth another try; auth / quota / bad request is not
    if (conv.status !== 500) break;
  }
  throw new Error(`Aspose HTML5 conversion failed ${lastErr}`);
}

// Small decks: upload straight to Aspose's own storage, convert, delete.
async function convertViaUpload(buffer, fileName) {
  const token = await asposeToken();
  const auth = { Authorization: `Bearer ${token}` };
  const storagePath = `${TEMP_FOLDER}/${encodeURIComponent(fileName)}`;
  const boundary = `----tf${crypto.randomBytes(12).toString('hex')}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName.replace(/"/g, '')}"\r\n` +
    'Content-Type: application/octet-stream\r\n\r\n'
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const multipart = Buffer.concat([head, buffer, tail]);
  const up = await httpsRequest(`${API_BASE()}/v3.0/slides/storage/file/${storagePath}`, {
    method: 'PUT',
    headers: { ...auth, 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': multipart.length },
    body: multipart,
    timeoutMs: CONVERT_TIMEOUT_MS
  });
  if (up.status < 200 || up.status >= 300) throw new Error(`Aspose upload failed (${up.status}): ${errText(up)}`);
  try {
    return await convertStored(fileName);
  } finally {
    httpsRequest(`${API_BASE()}/v3.0/slides/storage/file/${storagePath}`, { method: 'DELETE', headers: auth }).catch(() => {});
  }
}

// Any size: copy the deck into the S3 bucket linked to Aspose, convert there, delete.
async function convertViaLinkedStorage(doc, fileName) {
  const ls = linkedStorage();
  const key = `${TEMP_FOLDER}/${fileName}`;
  await copyStoredFileToBucket(doc, ls.bucket, key);
  try {
    return await convertStored(fileName, ls.name);
  } finally {
    deleteObjectIn(ls.bucket, key).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Minimal ZIP reader (stored + deflate entries) — no extra package needed
// ---------------------------------------------------------------------------
export function unzipBuffer(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Converted output is not a valid ZIP file');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Broken ZIP directory in converted output');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8').replace(/\\/g, '/');
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) continue;
    if (name.startsWith('/') || name.split('/').includes('..')) continue; // never write outside the folder
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const start = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.slice(start, start + compSize);
    let data;
    if (method === 0) data = raw;
    else if (method === 8) data = zlib.inflateRawSync(raw);
    else throw new Error(`Unsupported ZIP compression (${method}) in converted output`);
    files.push({ path: name, data });
  }
  return files;
}

const CONTENT_TYPES = {
  html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8', js: 'application/javascript; charset=utf-8',
  mjs: 'application/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  bmp: 'image/bmp', ico: 'image/x-icon', emf: 'image/emf', wmf: 'image/wmf',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', eot: 'application/vnd.ms-fontobject',
  mp4: 'video/mp4', webm: 'video/webm', m4v: 'video/mp4', mov: 'video/quicktime',
  mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg', txt: 'text/plain; charset=utf-8', xml: 'application/xml'
};
export const contentTypeFor = (p) => CONTENT_TYPES[String(p).split('.').pop().toLowerCase()] || 'application/octet-stream';

// ZIP (normal case) or a single HTML file → list of files + the start page
function outputFiles(body) {
  if (body.readUInt32LE(0) === 0x04034b50) {
    const files = unzipBuffer(body);
    if (!files.length) throw new Error('The converted HTML5 package is empty');
    // Strip one shared top folder, if every file sits inside it
    const tops = new Set(files.map((f) => (f.path.includes('/') ? f.path.split('/')[0] : '')));
    if (tops.size === 1 && !tops.has('')) {
      const top = [...tops][0] + '/';
      files.forEach((f) => { f.path = f.path.slice(top.length); });
    }
    const htmls = files.filter((f) => /\.html?$/i.test(f.path))
      .sort((a, b) => a.path.split('/').length - b.path.split('/').length);
    const entry = (htmls.find((f) => /(^|\/)index\.html?$/i.test(f.path)) || htmls[0])?.path;
    if (!entry) throw new Error('The converted HTML5 package has no HTML page');
    return { files, entry };
  }
  return { files: [{ path: 'index.html', data: body }], entry: 'index.html' };
}

// ---------------------------------------------------------------------------
// Conversion queue — one deck at a time so the server's memory stays bounded
// ---------------------------------------------------------------------------
const queue = [];
const queued = new Set();
let running = false;

// Direct extraction for pre-packaged HTML5 / SCORM presentation ZIPs (e.g. from iSpring / Articulate)
export async function processPresentationZip(doc) {
  if (!doc) return false;
  const ext = String(doc.fileName || '').split('.').pop().toLowerCase();
  if (ext !== 'zip') return false;

  await TrainingMaterial.updateOne({ _id: doc._id }, { html5Status: 'processing', html5Error: '', html5UpdatedAt: new Date() });
  try {
    const fileUrl = signedUrlForStoredFile({ storageKey: doc.storageKey, storageUrl: doc.storageUrl, expiresIn: 3600, download: false, fileName: doc.fileName });
    if (!fileUrl) throw new Error('The ZIP file is not in cloud storage');
    const src = await fetch(fileUrl);
    if (!src.ok) throw new Error(`Could not read the ZIP from storage (${src.status})`);
    const buffer = Buffer.from(await src.arrayBuffer());

    let packageData;
    try {
      packageData = outputFiles(buffer);
    } catch (parseErr) {
      // If it doesn't contain HTML files, it is just a regular archive file, not a presentation
      console.log(`ZIP "${doc.fileName}" is not an HTML5 presentation (${parseErr.message})`);
      await TrainingMaterial.updateOne({ _id: doc._id }, { html5Status: '', html5UpdatedAt: new Date() });
      return false;
    }

    const { files, entry } = packageData;
    if (!files.length || !entry) {
      await TrainingMaterial.updateOne({ _id: doc._id }, { html5Status: '', html5UpdatedAt: new Date() });
      return false;
    }

    const prefix = `training-html5/${doc._id}/${Date.now()}/`;
    for (const f of files) {
      await putObjectBuffer(prefix + f.path, f.data, contentTypeFor(f.path));
    }
    await TrainingMaterial.updateOne({ _id: doc._id }, {
      html5Status: 'ready',
      html5Prefix: prefix,
      html5Entry: entry,
      html5Error: '',
      html5UpdatedAt: new Date()
    });
    console.log(`Presentation ZIP ready for "${doc.title}" (${files.length} files, entry: ${entry})`);
    return true;
  } catch (err) {
    console.error(`Presentation ZIP extraction failed for "${doc.title}":`, err.message);
    await TrainingMaterial.updateOne({ _id: doc._id }, {
      html5Status: 'failed',
      html5Error: String(err.message || err).slice(0, 500),
      html5UpdatedAt: new Date()
    });
    return false;
  }
}

async function convertOne(id) {
  const doc = await TrainingMaterial.findById(id);
  if (!doc || !isPresentationMaterial(doc)) return;
  doc.html5Status = 'processing';
  doc.html5Error = '';
  doc.html5UpdatedAt = new Date();
  await doc.save();
  try {
    const ext = String(doc.fileName).split('.').pop().toLowerCase();
    const remoteName = `${doc._id}-${Date.now()}.${ext}`;
    let body;
    if (linkedStorage()) {
      // Preferred: Aspose reads the deck from the linked bucket — any size, and
      // this server never holds the whole file in memory.
      body = await convertViaLinkedStorage(doc, remoteName);
    } else {
      if (Number(doc.fileSize) >= ASPOSE_UPLOAD_MAX_BYTES - 1024 * 1024) {
        throw new Error(`This deck is ${(Number(doc.fileSize) / 1048576).toFixed(0)} MB; Aspose accepts uploads only up to about 95 MB. Admin needs to link S3 storage in the Aspose dashboard (ASPOSE_STORAGE_NAME / ASPOSE_STORAGE_BUCKET).`);
      }
      const fileUrl = signedUrlForStoredFile({ storageKey: doc.storageKey, storageUrl: doc.storageUrl, expiresIn: 3600, download: false, fileName: doc.fileName });
      if (!fileUrl) throw new Error('The PowerPoint file is not in cloud storage');
      const src = await fetch(fileUrl);
      if (!src.ok) throw new Error(`Could not read the PowerPoint from storage (${src.status})`);
      body = await convertViaUpload(Buffer.from(await src.arrayBuffer()), remoteName);
    }
    const { files, entry } = outputFiles(body);

    const prefix = `training-html5/${doc._id}/${Date.now()}/`;
    for (const f of files) {
      await putObjectBuffer(prefix + f.path, f.data, contentTypeFor(f.path));
    }
    await TrainingMaterial.updateOne({ _id: doc._id }, {
      html5Status: 'ready', html5Prefix: prefix, html5Entry: entry, html5Error: '', html5UpdatedAt: new Date()
    });
    console.log(`HTML5 slides ready for "${doc.title}" (${files.length} files)`);
  } catch (err) {
    console.error(`HTML5 conversion failed for "${doc.title}":`, err.message);
    await TrainingMaterial.updateOne({ _id: doc._id }, {
      html5Status: 'failed', html5Error: String(err.message || err).slice(0, 500), html5UpdatedAt: new Date()
    });
  }
}

async function runQueue() {
  if (running) return;
  running = true;
  try {
    while (queue.length) {
      const id = queue.shift();
      try { await convertOne(id); } catch (e) { console.error('HTML5 queue error:', e.message); }
      queued.delete(id);
    }
  } finally {
    running = false;
  }
}

// Returns false when conversion is not set up or the file isn't a presentation.
export async function queueHtml5Conversion(doc) {
  if (!doc || !isPresentationMaterial(doc) || !isS3Configured()) return false;
  const ext = String(doc?.fileName || '').split('.').pop().toLowerCase();
  if (ext === 'zip') {
    return processPresentationZip(doc);
  }
  if (!isAsposeConfigured()) return false;
  const id = String(doc._id);
  if (queued.has(id)) return true;
  queued.add(id);
  queue.push(id);
  await TrainingMaterial.updateOne({ _id: id }, { html5Status: 'pending', html5Error: '', html5UpdatedAt: new Date() });
  setImmediate(runQueue);
  return true;
}

// After a server restart, pick up decks that were waiting or mid-conversion.
let resumed = false;
export async function resumeHtml5Queue() {
  if (resumed || !isS3Configured()) return;
  resumed = true;
  const stuck = await TrainingMaterial.find({ html5Status: { $in: ['pending', 'processing'] } }).select('_id fileName').lean();
  for (const d of stuck) await queueHtml5Conversion(d);
}

export const html5QueueLength = () => queue.length + (running ? 1 : 0);
