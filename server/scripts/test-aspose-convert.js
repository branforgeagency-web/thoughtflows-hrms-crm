// Diagnose Aspose HTML5 conversion for ONE PowerPoint on this computer.
// Uploads it once, then tries each conversion setting the server uses and
// saves every result that works into scripts/aspose-test-output/.
// Uses about 2 + (number of settings tried) of the monthly Aspose API calls.
//
// Run from the server folder:
//   node scripts/test-aspose-convert.js "C:\path\to\small-deck.pptx"
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();
const { httpsRequest, asposeToken, API_BASE, HTML5_OPTION_SETS, unzipBuffer } = await import('../src/utils/materialHtml5.js');

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.log('Usage: node scripts/test-aspose-convert.js "<path to a .pptx>"');
  process.exit(1);
}
const outDir = path.resolve('scripts/aspose-test-output');
fs.mkdirSync(outDir, { recursive: true });
const ext = path.extname(file).slice(1).toLowerCase() || 'pptx';
const remote = `diag-${Date.now()}.${ext}`;
const folder = 'thoughtflows-tmp';
const buf = fs.readFileSync(file);
console.log(`Deck: ${path.basename(file)} (${(buf.length / 1048576).toFixed(1)} MB)`);

const token = await asposeToken();
const auth = { Authorization: `Bearer ${token}` };
const boundary = `----tf${crypto.randomBytes(8).toString('hex')}`;
const body = Buffer.concat([
  Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${remote}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
  buf, Buffer.from(`\r\n--${boundary}--\r\n`)
]);
const up = await httpsRequest(`${API_BASE()}/v3.0/slides/storage/file/${folder}/${remote}`, {
  method: 'PUT', headers: { ...auth, 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length },
  body, timeoutMs: 30 * 60 * 1000
});
console.log(`Upload: HTTP ${up.status}`);
if (up.status >= 300) { console.log(up.body.toString().slice(0, 400)); process.exit(1); }

try {
  for (const [i, opts] of HTML5_OPTION_SETS.entries()) {
    const json = opts ? JSON.stringify(opts) : '';
    process.stdout.write(`Setting ${i + 1}: ${json || '(Aspose defaults)'} … `);
    const t0 = Date.now();
    const r = await httpsRequest(`${API_BASE()}/v3.0/slides/${remote}/html5?folder=${folder}`, {
      method: 'POST',
      headers: { ...auth, Accept: '*/*', ...(json ? { 'Content-Type': 'application/json' } : {}), 'Content-Length': Buffer.byteLength(json) },
      body: json || null, timeoutMs: 30 * 60 * 1000
    });
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    if (r.status === 200 && r.body.length) {
      const isZip = r.body.readUInt32LE(0) === 0x04034b50;
      const out = path.join(outDir, `setting-${i + 1}.${isZip ? 'zip' : 'html'}`);
      fs.writeFileSync(out, r.body);
      const count = isZip ? unzipBuffer(r.body).length : 1;
      console.log(`OK in ${secs}s — ${count} file(s) saved to ${out}`);
      break; // first working setting is what the server will use
    }
    console.log(`FAILED HTTP ${r.status} in ${secs}s: ${r.body.toString().slice(0, 300)}`);
  }
} finally {
  await httpsRequest(`${API_BASE()}/v3.0/slides/storage/file/${folder}/${remote}`, { method: 'DELETE', headers: auth }).catch(() => {});
}
process.exit(0);
