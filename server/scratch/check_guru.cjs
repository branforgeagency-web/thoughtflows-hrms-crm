const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({ name: { $regex: 'guru', $options: 'i' } }).toArray();
  console.log('USERS matching guru:', JSON.stringify(users.map(u => ({_id: u._id, name: u.name, userName: u.userName, department: u.department, role: u.role})), null, 2));

  const leadFields = ['counselorAssigned','allocatedTo','spokenBy','counselor','counselorName','hrName'];
  const orConds = leadFields.map(f => ({ [f]: { $regex: 'guru', $options: 'i' } }));
  const leads = await db.collection('studentleads').find({ $or: orConds }).limit(1000).toArray();
  console.log('TOTAL leads matching guru (any field):', leads.length);
  const distinctVals = new Set();
  leads.forEach(l => leadFields.forEach(f => { if (l[f] && /guru/i.test(l[f])) distinctVals.add(f + '=' + JSON.stringify(l[f])); }));
  console.log('Distinct field=value combos:', JSON.stringify([...distinctVals], null, 2));

  await mongoose.disconnect();
})().catch(e => { console.error('ERR', e); process.exit(1); });
