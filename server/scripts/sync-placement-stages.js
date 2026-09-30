// One-time backfill: re-derive placementStage / placementStatus / statusGroup
// for every student using the pipeline rules. Run: npm run sync:placement
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import Student from '../src/models/Student.js';
import { derivePlacementFields } from '../src/constants/placement.js';

if (!(await connectDB())) process.exit(1);
let changed = 0;
for await (const st of Student.find().cursor()) {
  const set = derivePlacementFields(st);
  if (!Object.keys(set).length) continue;
  await Student.updateOne({ _id: st._id }, { $set: set });
  changed += 1;
  console.log(`${st.studentId || st._id}  ${st.name}  →`, set);
}
console.log(`Done. ${changed} student(s) updated.`);
await mongoose.disconnect();
