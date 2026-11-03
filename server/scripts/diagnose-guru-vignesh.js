// Diagnostic only — makes NO changes. The fix script found his account
// name is "Guruvignesh" (one word) and found zero leads whose owner field
// loosely matches that but is spelled differently, which means the 43
// missing records are NOT a simple spelling/spacing mismatch. This dumps
// everything that could explain it:
//   - his exact User doc (name/email/role/department/branch)
//   - every StudentLead/Student whose owner-ish fields contain "guru" as a
//     loose substring (catches typos, extra words, truncation — not just
//     the exact "guruvignesh" comparison the fix script used)
//   - how many StudentLeads have NO owner field set at all
// Run: node scripts/diagnose-guru-vignesh.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import StudentLead from '../src/models/StudentLead.js';
import Student from '../src/models/Student.js';
import User from '../src/models/User.js';

if (!(await connectDB())) process.exit(1);

const guruUsers = await User.find({ name: { $regex: 'guru', $options: 'i' } }).lean();
console.log('=== Users matching "guru" ===');
console.log(JSON.stringify(guruUsers.map(u => ({
  _id: u._id, name: u.name, email: u.email, role: u.role, department: u.department, branch: u.branch
})), null, 2));

const ownerFields = ['counselorAssigned', 'allocatedTo', 'spokenBy', 'counselor', 'counselorName', 'hrName'];
const orConds = ownerFields.map((f) => ({ [f]: { $regex: 'guru', $options: 'i' } }));

const leads = await StudentLead.find({ $or: orConds }).select([...ownerFields, 'fullName', 'phone', 'branch', 'stage', 'createdAt'].join(' ')).lean();
console.log(`\n=== StudentLead rows where any owner field contains "guru" (${leads.length}) ===`);
leads.forEach((l) => {
  const owners = {};
  ownerFields.forEach((f) => { if (l[f]) owners[f] = l[f]; });
  console.log(`${l._id}  "${l.fullName}"  phone=${l.phone}  branch=${l.branch}  stage=${l.stage}  created=${l.createdAt?.toISOString?.()}  owners=${JSON.stringify(owners)}`);
});

const students = await Student.find({ hrName: { $regex: 'guru', $options: 'i' } }).select('name hrName phone branch createdAt').lean();
console.log(`\n=== Student rows where hrName contains "guru" (${students.length}) ===`);
students.forEach((s) => {
  console.log(`${s._id}  "${s.name}"  phone=${s.phone}  branch=${s.branch}  hrName="${s.hrName}"  created=${s.createdAt?.toISOString?.()}`);
});

const noOwnerCount = await StudentLead.countDocuments({
  $and: ownerFields.map((f) => ({ $or: [{ [f]: { $exists: false } }, { [f]: '' }, { [f]: null }] }))
});
console.log(`\n=== StudentLead rows with EVERY owner field empty/missing: ${noOwnerCount} ===`);

const totalLeads = await StudentLead.countDocuments({});
console.log(`\nTotal StudentLead rows in the DB: ${totalLeads}`);

await mongoose.disconnect();
