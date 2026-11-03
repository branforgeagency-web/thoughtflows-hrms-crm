import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

const uri = process.env.MONGO_URI;
await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
console.log('connected to', mongoose.connection.host);

const db = mongoose.connection.db;
const usersColl = db.collection('users');
const teamColl = db.collection('teammembers');
const leadsColl = db.collection('studentleads');
const studentsColl = db.collection('students');

const rx = /poojitha/i;

const users = await usersColl.find({ name: rx }).project({ name:1, role:1, department:1, branch:1, email:1 }).toArray();
console.log('USERS:', JSON.stringify(users, null, 2));

const team = await teamColl.find({ name: rx }).project({ name:1, role:1, departmentCode:1, branchName:1 }).toArray();
console.log('TEAM MEMBERS:', JSON.stringify(team, null, 2));

const leadFields = ['counselorAssigned','allocatedTo','spokenBy','counselor','counselorName','hrName'];
for (const f of leadFields) {
  const count = await leadsColl.countDocuments({ [f]: rx });
  if (count) console.log(`leads.${f} matches /poojitha/i:`, count);
}

const distinctVals = new Set();
const sample = await leadsColl.find({ $or: leadFields.map(f => ({ [f]: rx })) }).project(Object.fromEntries(leadFields.map(f=>[f,1]))).limit(50).toArray();
sample.forEach(doc => leadFields.forEach(f => { if (doc[f]) distinctVals.add(doc[f]); }));
console.log('Distinct raw values found in leads containing "poojitha":', [...distinctVals]);
console.log('Total matching lead docs (any field, loose):', await leadsColl.countDocuments({ $or: leadFields.map(f => ({ [f]: rx })) }));

const studFields = ['hrName','counselorAssigned','allocatedTo'];
for (const f of studFields) {
  try {
    const count = await studentsColl.countDocuments({ [f]: rx });
    if (count) console.log(`students.${f} matches:`, count);
  } catch(e) {}
}

await mongoose.disconnect();
