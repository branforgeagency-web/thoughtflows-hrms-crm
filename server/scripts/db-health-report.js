// READ-ONLY. Size, index usage and empty-field report for the big collections,
// to decide what to clean up. Changes nothing.
//   node scripts/db-health-report.js > db-report.txt
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';

await connectDB();
const db = mongoose.connection.db;
const MB = (b) => `${(b / 1048576).toFixed(2)} MB`;
const cols = ['studentleads', 'students', 'demos', 'callrecordings', 'notifications', 'auditlogs', 'attendances', 'classattendances', 'dailyclosures'];

const all = await db.listCollections().toArray();
const sizes = [];
for (const c of all) {
  try {
    const s = await db.command({ collStats: c.name });
    if (!s) continue;
    sizes.push({ name: c.name, count: s.count, data: s.size, storage: s.storageSize, idx: s.totalIndexSize, nIdx: s.nindexes, avg: s.avgObjSize || 0 });
  } catch (_) { /* views etc. */ }
}
sizes.sort((a, b) => (b.data + b.idx) - (a.data + a.idx));
console.log('\n=== Biggest collections ===');
sizes.slice(0, 20).forEach((s) => console.log(`${s.name.padEnd(26)} ${String(s.count).padStart(7)} docs  data ${MB(s.data).padStart(10)}  avg ${String(Math.round(s.avg)).padStart(6)} B  indexes ${String(s.nIdx).padStart(3)} = ${MB(s.idx)}`));
const tot = sizes.reduce((a, s) => ({ d: a.d + s.data, i: a.i + s.idx, st: a.st + s.storage }), { d: 0, i: 0, st: 0 });
console.log(`TOTAL data ${MB(tot.d)} · on disk ${MB(tot.st)} · indexes ${MB(tot.i)}`);

for (const name of cols) {
  if (!all.some((c) => c.name === name)) continue;
  const col = db.collection(name);
  const stats = await col.aggregate([{ $indexStats: {} }]).toArray().catch(() => []);
  const cs = await db.command({ collStats: name }).catch(() => ({}));
  console.log(`\n=== ${name}: index usage since the server last restarted (${stats[0]?.accesses?.since ? new Date(stats[0].accesses.since).toISOString().slice(0, 16) : '?'}) ===`);
  stats.sort((a, b) => Number(a.accesses.ops) - Number(b.accesses.ops))
    .forEach((s) => console.log(`  ${String(s.accesses.ops).padStart(9)} uses  ${MB(cs.indexSizes?.[s.name] || 0).padStart(9)}  ${s.name}`));

  // Empty / null fields stored on documents (sample of up to 3000)
  const sample = await col.aggregate([{ $sample: { size: 3000 } }]).toArray();
  if (!sample.length) continue;
  const empty = new Map();
  let emptyBytes = 0;
  let totalBytes = 0;
  for (const d of sample) {
    totalBytes += Buffer.byteLength(JSON.stringify(d));
    for (const [k, v] of Object.entries(d)) {
      const isEmpty = v === '' || v === null || (Array.isArray(v) && v.length === 0) || (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !v._bsontype && Object.keys(v).length === 0);
      if (isEmpty) { empty.set(k, (empty.get(k) || 0) + 1); emptyBytes += k.length + 6; }
    }
  }
  console.log(`  empty fields ≈ ${Math.round((emptyBytes / totalBytes) * 100)}% of document size (sample ${sample.length})`);
  console.log('  most often empty: ' + [...empty].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, n]) => `${k} ${Math.round((n / sample.length) * 100)}%`).join(', '));
}
await mongoose.disconnect();
process.exit(0);
