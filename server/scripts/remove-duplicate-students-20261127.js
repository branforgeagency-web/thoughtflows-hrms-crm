// Removes the 6 duplicate admitted-student records created when one bulk upload
// was sent twice on 27 Nov 2026 (~13:06 IST). Each EXTRA is an exact copy of the
// KEEP record (same person, same course, same fee and receipts).
//
//   node scripts/remove-duplicate-students-20261127.js           → dry run, changes nothing
//   node scripts/remove-duplicate-students-20261127.js --apply   → backs up, then deletes
//
// What --apply does, per pair:
//   1. saves the extra record (and any lead only it uses) to scripts/backup-duplicate-students-20261127.json
//   2. leads pointing at the extra → deleted if the kept record already has its own lead,
//      otherwise re-pointed to the kept record
//   3. deletes the extra student record
// Student portal logins (User) are NOT touched — both copies share one login.
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import Student from '../src/models/Student.js';
import StudentLead from '../src/models/StudentLead.js';

const PAIRS = [
  ['TFDPOJ6001', 'TFDPOJ6002'],
  ['TFDPOJ6003', 'TFDPOJ6004'],
  ['TFDAIFJ6019', 'TFDAICJ6001'],
  ['TFDPOJ6005', 'TFDPOJ6006'],
  ['TFDCOJ6006', 'TFDCOJ6007'],
  ['TFDCOJ6008', 'TFDCOJ6009']
];
const APPLY = process.argv.includes('--apply');
const here = path.dirname(fileURLToPath(import.meta.url));
const backupFile = path.join(here, 'backup-duplicate-students-20261127.json');
const pk = (v) => String(v ?? '').replace(/\D/g, '').slice(-10);
const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

await connectDB();
const db = mongoose.connection.db;
const backup = { at: new Date().toISOString(), students: [], leadsDeleted: [], leadsRepointed: [] };
const plan = [];
let problems = 0;

for (const [keepId, extraId] of PAIRS) {
  const [keep, extra] = await Promise.all([
    Student.findOne({ studentId: keepId }).lean(),
    Student.findOne({ studentId: extraId }).lean()
  ]);
  if (!extra) { console.log(`- ${extraId}: already gone, skipping`); continue; }
  if (!keep) { console.log(`! ${keepId} (the record to keep) not found — NOT touching ${extraId}`); problems++; continue; }
  const samePerson = (pk(keep.phone) && pk(keep.phone) === pk(extra.phone)) || (keep.email && same(keep.email, extra.email));
  if (!samePerson || !same(keep.course, extra.course)) {
    console.log(`! ${keepId} / ${extraId}: not the same person + course — NOT touching`); problems++; continue;
  }
  const extraLeads = await StudentLead.find({ admittedStudentId: extraId }).lean();
  const keepHasLead = await StudentLead.exists({ admittedStudentId: keepId });
  // Other records that point at the extra id (should be none for a same-day copy)
  const refs = {};
  for (const col of ['placementrecords', 'testattempts', 'studentrequests', 'classattendances', 'lmsprogresses']) {
    try { const n = await db.collection(col).countDocuments({ studentId: extraId }); if (n) refs[col] = n; } catch (_) { /* no such collection */ }
  }
  plan.push({ keep, extra, extraLeads, keepHasLead, refs });
  console.log(`${extra.name} · ${extra.course}: keep ${keepId}, remove ${extraId}` +
    ` · leads on extra: ${extraLeads.length} (${extraLeads.length ? (keepHasLead ? 'delete — kept record has its own lead' : 're-point to ' + keepId) : '-'})` +
    (Object.keys(refs).length ? ` · other refs: ${JSON.stringify(refs)} → re-pointed` : ''));
}

if (!APPLY) {
  console.log(`\nDry run — nothing changed. ${plan.length} record(s) would be removed${problems ? `, ${problems} pair(s) skipped` : ''}.`);
  console.log('Run again with --apply to remove them.');
} else {
  plan.forEach((p) => backup.students.push(p.extra));
  plan.forEach((p) => { if (p.keepHasLead) backup.leadsDeleted.push(...p.extraLeads); });
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`\nBackup saved: ${backupFile}`);
  for (const p of plan) {
    const keepId = p.keep.studentId;
    const extraId = p.extra.studentId;
    if (p.extraLeads.length) {
      if (p.keepHasLead) await StudentLead.deleteMany({ _id: { $in: p.extraLeads.map((l) => l._id) } });
      else {
        await StudentLead.updateMany({ admittedStudentId: extraId }, { $set: { admittedStudentId: keepId } });
        backup.leadsRepointed.push(...p.extraLeads.map((l) => String(l._id)));
      }
    }
    for (const col of Object.keys(p.refs)) await db.collection(col).updateMany({ studentId: extraId }, { $set: { studentId: keepId } });
    const r = await Student.deleteOne({ _id: p.extra._id });
    console.log(`  ${r.deletedCount ? 'removed' : 'NOT removed'} ${extraId} (${p.extra.name})`);
  }
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log('Done.');
}
await mongoose.disconnect();
process.exit(0);
