// READ-ONLY. Lists admitted students saved more than once for the SAME course
// (same mobile number or email + same course). Changes nothing.
//   node scripts/find-duplicate-students.js            → summary + every group
//   node scripts/find-duplicate-students.js > dups.txt → save the list
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import Student from '../src/models/Student.js';

await connectDB();
const pk = (v) => { const d = String(v ?? '').replace(/\D/g, ''); return d.length >= 10 ? d.slice(-10) : ''; };
const ck = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
const rows = await Student.find().select('studentId name phone whatsappNumber email course hrName branch createdAt paidAmount receipts leadId').sort({ createdAt: 1 }).lean();

// Union-find: records sharing a phone or email (with the same course) are one person
const parent = rows.map((_, i) => i);
const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
const seen = new Map();
rows.forEach((r, i) => {
  const course = ck(r.course);
  if (!course) return;
  const keys = [pk(r.phone), pk(r.whatsappNumber)].filter(Boolean).map((k) => `p:${k}`);
  const em = String(r.email || '').trim().toLowerCase();
  if (em && !/^student\.\d+@thoughtflows\.in$/.test(em)) keys.push(`e:${em}`);
  keys.forEach((k) => {
    const key = `${k}|${course}`;
    if (seen.has(key)) parent[find(i)] = find(seen.get(key)); else seen.set(key, i);
  });
});
const groups = new Map();
rows.forEach((r, i) => { const g = find(i); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(r); });
const dups = [...groups.values()].filter((g) => g.length > 1);
const extra = dups.reduce((n, g) => n + g.length - 1, 0);
console.log(`\nStudents: ${rows.length} · duplicate groups (same person + same course): ${dups.length} · extra copies: ${extra}\n`);
const d = (v) => (v ? new Date(v).toISOString().slice(0, 16).replace('T', ' ') : '-');
dups.forEach((g, n) => {
  console.log(`#${n + 1} ${g[0].name} · ${g[0].phone || g[0].email} · ${g[0].course}`);
  g.forEach((r, j) => console.log(`   ${j === 0 ? 'KEEP ' : 'extra'} ${r.studentId}  created ${d(r.createdAt)}  HR ${r.hrName || '-'}  paid ${r.paidAmount ?? 0}  receipts ${(r.receipts || []).length}`));
});
await mongoose.disconnect();
process.exit(0);
