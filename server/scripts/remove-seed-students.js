// Removes the 20 generated seed / mock students (scratch/generate_20_students.js)
// and everything that points at them. A student is removed only when BOTH the
// seed phone (9840123401–9840123420) AND the seed name match, so no real
// student can be touched.
//
//   npm run remove:seed-students            → dry run: lists what would be deleted
//   npm run remove:seed-students -- --apply → deletes
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';

const APPLY = process.argv.includes('--apply');

const SEED_NAMES = [
  'Aadhira Suresh', 'Vigneshwaran K', 'Priyadharshini M', 'Karthikeyan R', 'Deepika Narayanan',
  'Rahul Varma', 'Sowmya Lakshmi', 'Naveen Prasath', 'Ananya Reddy', 'Harish Babu',
  'Meenakshi Sundaram', 'Arun Balaji', 'Keerthana Ramesh', 'Gowtham Raj', 'Fathima Zahra',
  'Venkata Sai Kumar', 'Divya Bharathi S', 'Saravanan Muthu', 'Monisha Selvaraj', 'Kavin Kumar P'
];
const SEED_PHONES = Array.from({ length: 20 }, (_, i) => `98401234${String(i + 1).padStart(2, '0')}`);
const norm = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
const digits = (v) => String(v || '').replace(/\D/g, '').slice(-10);

// Other collections that reference a student by studentId
const RELATED = ['callrecordings', 'classfeedbacks', 'escalations', 'notifications', 'placementrecords',
  'studentrequests', 'studentsubmissions', 'testattempts', 'trainerdoubts'];

if (!(await connectDB())) process.exit(1);
const db = mongoose.connection.db;

const candidates = await db.collection('students').find({
  $or: [{ phone: { $in: SEED_PHONES } }, { whatsappNumber: { $in: SEED_PHONES } }]
}).toArray();
const seeds = candidates.filter((s) => SEED_PHONES.includes(digits(s.phone || s.whatsappNumber))
  && SEED_NAMES.map(norm).includes(norm(s.name)));

console.log(`Seed students found: ${seeds.length}`);
seeds.forEach((s) => console.log(`  ${s.studentId || s._id}  ${s.name}  ${s.phone}  ${s.branch || ''}`));
const skipped = candidates.length - seeds.length;
if (skipped) console.log(`(${skipped} record(s) with a seed phone but a different name were left alone)`);

const keys = seeds.flatMap((s) => [s.studentId, String(s._id)]).filter(Boolean);
const ids = seeds.map((s) => s._id);

let related = 0;
for (const name of RELATED) {
  const n = await db.collection(name).countDocuments({ studentId: { $in: keys } }).catch(() => 0);
  if (n) console.log(`  ${name}: ${n} linked record(s)`);
  related += n;
}
const attendanceDocs = keys.length
  ? await db.collection('classattendances').countDocuments({ $or: keys.map((k) => ({ [`records.${k}`]: { $exists: true } })) }).catch(() => 0)
  : 0;
if (attendanceDocs) console.log(`  classattendances: ${attendanceDocs} class(es) with marks for these students`);
const leads = await db.collection('studentleads').countDocuments({ phone: { $in: SEED_PHONES }, name: { $in: SEED_NAMES } }).catch(() => 0);
if (leads) console.log(`  studentleads: ${leads} matching lead(s)`);

if (!APPLY) {
  console.log('\nDRY RUN — nothing deleted. Run again with --apply to delete.');
  await mongoose.disconnect();
  process.exit(0);
}

if (seeds.length) {
  for (const name of RELATED) await db.collection(name).deleteMany({ studentId: { $in: keys } }).catch(() => null);
  const unset = Object.fromEntries(keys.map((k) => [`records.${k}`, '']));
  await db.collection('classattendances').updateMany({}, { $unset: unset }).catch(() => null);
  await db.collection('liveclasssessions').updateMany({}, { $pull: { joins: { studentId: { $in: keys } } } }).catch(() => null);
  await db.collection('studentleads').deleteMany({ phone: { $in: SEED_PHONES }, name: { $in: SEED_NAMES } }).catch(() => null);
  const r = await db.collection('students').deleteMany({ _id: { $in: ids } });
  console.log(`\nDeleted ${r.deletedCount} seed student(s) and ${related} linked record(s).`);
} else {
  console.log('\nNothing to delete.');
}
await mongoose.disconnect();
