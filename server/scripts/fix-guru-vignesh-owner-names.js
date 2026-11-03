// One-time data fix: a bulk-uploaded sheet had Guru Vignesh's name typed
// as "guruvignesh" (no space) in the counselor/owner column, so his real
// account name ("Guru Vignesh") never matched it even after the matching
// logic in routes/api.js and the dashboard components was made space-
// insensitive. This script rewrites every owner field on StudentLead /
// Student that loosely matches "guru vignesh" (any spacing/case) to his
// exact account name, so the data itself is clean going forward too.
//
// Run from the server/ folder, on a machine with normal internet access
// to Atlas (this sandboxed bridge shell has none):
//   node scripts/fix-guru-vignesh-owner-names.js
// Add --apply to actually write; without it, it only PREVIEWS what would
// change.
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import StudentLead from '../src/models/StudentLead.js';
import Student from '../src/models/Student.js';
import User from '../src/models/User.js';

const APPLY = process.argv.includes('--apply');

const noSpace = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, '');

if (!(await connectDB())) process.exit(1);

// Find Guru's real account name — his User doc is the source of truth for
// what the "correct" spelling should be.
const guruUser = await User.findOne({ name: { $regex: '^guru\\s*vignesh$', $options: 'i' } }).lean();
if (!guruUser) {
  console.error('Could not find a user whose name matches "guru vignesh" (any spacing). Aborting — check the spelling in the Users collection.');
  await mongoose.disconnect();
  process.exit(1);
}
const correctName = guruUser.name;
console.log(`Found account: "${correctName}" (${guruUser.email || guruUser._id})`);

const target = noSpace(correctName); // "guruvignesh"
const ownerFields = ['counselorAssigned', 'allocatedTo', 'spokenBy', 'counselor', 'counselorName', 'hrName'];

let leadMatches = 0, leadUpdates = 0;
for await (const lead of StudentLead.find().cursor()) {
  const set = {};
  for (const f of ownerFields) {
    const v = lead[f];
    // Matches an exact spacing/case variant ("guruvignesh", "Guru Vignesh")
    // AND a >=4-char nickname/prefix ("Guru") of the single-word account
    // name "Guruvignesh" — the real cause behind the 43 records that were
    // never showing on his dashboard.
    const nv = v ? noSpace(v) : '';
    const isPrefixNickname = nv.length >= 4 && target.startsWith(nv);
    if (v && (nv === target || isPrefixNickname) && v !== correctName) {
      set[f] = correctName;
    }
  }
  if (Object.keys(set).length) {
    leadMatches += 1;
    console.log(`Lead ${lead._id} "${lead.fullName || lead.name}" —`, set);
    if (APPLY) {
      await StudentLead.updateOne({ _id: lead._id }, { $set: set });
      leadUpdates += 1;
    }
  }
}

let studentMatches = 0, studentUpdates = 0;
for await (const st of Student.find().cursor()) {
  if (st.hrName && noSpace(st.hrName) === target && st.hrName !== correctName) {
    studentMatches += 1;
    console.log(`Student ${st._id} "${st.name}" — hrName: "${st.hrName}" -> "${correctName}"`);
    if (APPLY) {
      await Student.updateOne({ _id: st._id }, { $set: { hrName: correctName } });
      studentUpdates += 1;
    }
  }
}

console.log('---');
console.log(`Leads matched: ${leadMatches}${APPLY ? ` (updated: ${leadUpdates})` : ' (PREVIEW ONLY — re-run with --apply to write)'}`);
console.log(`Students matched: ${studentMatches}${APPLY ? ` (updated: ${studentUpdates})` : ' (PREVIEW ONLY — re-run with --apply to write)'}`);

await mongoose.disconnect();
