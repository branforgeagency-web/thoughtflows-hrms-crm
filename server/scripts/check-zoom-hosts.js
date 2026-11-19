// READ-ONLY check that every trainer can run a Zoom class at the same time as
// the others. Changes nothing. Run from the server folder:
//   node scripts/check-zoom-hosts.js
//
// Zoom allows only ONE live meeting per Zoom USER (two on Business /
// Education / Enterprise plans). Trainers who share a Zoom user — or have none
// and fall back to ZOOM_HOST_EMAIL — cannot all teach at once.
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import Trainer from '../src/models/Trainer.js';

const { ZOOM_ACCOUNT_ID, ZOOM_S2S_CLIENT_ID, ZOOM_S2S_CLIENT_SECRET } = process.env;
const shared = String(process.env.ZOOM_HOST_EMAIL || '').trim().toLowerCase();
const pool = String(process.env.ZOOM_HOST_POOL || '').split(/[\s,;]+/).map((h) => h.trim().toLowerCase()).filter(Boolean);

async function zoomToken() {
  if (!ZOOM_ACCOUNT_ID || !ZOOM_S2S_CLIENT_ID || !ZOOM_S2S_CLIENT_SECRET) return '';
  const basic = Buffer.from(`${ZOOM_S2S_CLIENT_ID}:${ZOOM_S2S_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`, { method: 'POST', headers: { Authorization: `Basic ${basic}` } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Zoom auth failed: ${d.reason || d.message || r.status}`);
  return d.access_token;
}
const TYPE = { 1: 'Basic (40-min limit!)', 2: 'Licensed', 3: 'On-prem', 99: 'None' };

if (!(await connectDB())) process.exit(1);
const trainers = await Trainer.find({}).select('trainerId trainerName zoomEmail classZoomLink active').lean();
const token = await zoomToken().catch((e) => { console.log('⚠', e.message); return ''; });
if (!token) console.log('⚠ Zoom API keys not set — only checking the database.\n');

const byHost = new Map();
const noZoom = [];
for (const t of trainers) {
  if (t.active === false) continue;
  const h = String(t.zoomEmail || '').trim().toLowerCase();
  if (!h) { noZoom.push(t); continue; }
  if (!byHost.has(h)) byHost.set(h, []);
  byHost.get(h).push(t);
}

const zoomUser = async (email) => {
  if (!token) return null;
  const r = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(email)}`, { headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json().catch(() => ({}));
  return r.ok ? d : { error: d.message || `HTTP ${r.status}` };
};

let problems = 0;
console.log('=== Trainers and their Zoom users ===');
for (const [host, list] of byHost) {
  const u = await zoomUser(host);
  const names = list.map((t) => `${t.trainerName} (${t.trainerId})`).join(', ');
  let note = '';
  if (u?.error) { note = `✗ NOT in your Zoom account: ${u.error}`; problems++; }
  else if (u && u.type !== 2) { note = `✗ ${TYPE[u.type] || `type ${u.type}`} — must be a Licensed user`; problems++; }
  else if (u) note = `✓ ${TYPE[u.type]}, ${u.status}`;
  if (list.length > 1) { note += `  ✗ SHARED by ${list.length} trainers — they can't teach at the same time`; problems++; }
  if (host === shared) { note += '  ⚠ same as ZOOM_HOST_EMAIL (fallback for everyone without a Zoom user)'; problems++; }
  console.log(`${host}\n   → ${names}\n   ${note}`);
}

console.log(`\n=== Trainers with NO Zoom email (${noZoom.length}) ===`);
noZoom.forEach((t) => console.log(`   ${t.trainerName} (${t.trainerId})${t.classZoomLink ? '  · has a fixed class link' : ''}`));
if (noZoom.length) problems++;

console.log('\n=== Fallback hosts (used when a trainer has no own Zoom user) ===');
for (const h of [...pool, shared].filter(Boolean)) {
  const u = await zoomUser(h);
  const used = byHost.has(h) ? `  ⚠ also a trainer's own Zoom email (${byHost.get(h).map((t) => t.trainerName).join(', ')})` : '';
  console.log(`   ${h}  ${u?.error ? `✗ ${u.error}` : u ? `${TYPE[u.type]}, ${u.status}` : ''}${used}`);
}
console.log(`   ZOOM_HOST_POOL has ${pool.length} host(s); ZOOM_MEETINGS_PER_HOST=${process.env.ZOOM_MEETINGS_PER_HOST || 1}`);
console.log(`   → at most ${pool.length + (shared ? 1 : 0)} trainers without their own Zoom user can teach at the same time.`);

console.log(problems ? `\n${problems} problem group(s) found — fix them to run all batches in parallel.` : '\n✓ Every trainer has their own licensed Zoom user.');
await mongoose.disconnect();
