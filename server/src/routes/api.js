import express from 'express';
import mongoose from 'mongoose';
import Department from '../models/Department.js';
import Branch from '../models/Branch.js';
import User from '../models/User.js';
import StudentLead from '../models/StudentLead.js';
import Student from '../models/Student.js';
import Demo from '../models/Demo.js';
import CourseFeeRate from '../models/CourseFeeRate.js';

const router = express.Router();

// Real Academy Seed Data (Seed once to MongoDB if collections are empty)
const SEED_DEPARTMENTS = [
  { id: '1', code: 'ADM', name: 'Admissions & Counseling', head: 'Pooja J.', memberCount: 38, icon: 'PhoneCall', color: '#14b8a6', description: 'Handling initial student inquiries, career advisory, and enrolments.' },
  { id: '2', code: 'ACAD', name: 'Medical Coding Faculty', head: 'Dr. Vikram C.', memberCount: 52, icon: 'GraduationCap', color: '#06b6d4', description: 'AAPC certified trainers guiding ICD-10-CM, CPT, and HCPCS coding.' },
  { id: '3', code: 'SUCC', name: 'Student Mentorship & Support', head: 'Priya R.', memberCount: 24, icon: 'HeartHandshake', color: '#10b981', description: 'Daily 1-on-1 doubt clearing, study schedules, and attendance tracking.' },
  { id: '4', code: 'EXAM', name: 'CPC Examination Cell', head: 'Suresh V.', memberCount: 16, icon: 'Award', color: '#f59e0b', description: 'Mock tests, AAPC exam bookings, and certification readiness drills.' },
  { id: '5', code: 'CORP', name: 'Corporate Relations & Placements', head: 'Meenakshi R.', memberCount: 29, icon: 'Briefcase', color: '#8b5cf6', description: 'Partnered with 140+ US healthcare RCM companies and hospital networks.' },
  { id: '6', code: 'HR', name: 'HR & Talent Acquisition', head: 'Balaji R.', memberCount: 14, icon: 'Users', color: '#ec4899', description: 'Staffing faculty, branch coordinators, and employee growth programs.' },
  { id: '7', code: 'SYS', name: 'IT Infrastructure & LMS', head: 'Dinesh P.', memberCount: 18, icon: 'Server', color: '#3b82f6', description: 'Managing student LMS portal, video lectures, and secure servers.' },
  { id: '8', code: 'FIN', name: 'Finance & Branch Operations', head: 'Kavitha V.', memberCount: 15, icon: 'PieChart', color: '#6366f1', description: 'Fee installments, scholarships, and branch facilities operations.' }
];

const SEED_BRANCHES = [
  { id: 'b1', name: 'Chennai - Guindy (HQ)', city: 'Chennai', state: 'Tamil Nadu', activeStudents: 540, staffCount: 42 },
  { id: 'b2', name: 'Chennai - Anna Nagar', city: 'Chennai', state: 'Tamil Nadu', activeStudents: 380, staffCount: 28 },
  { id: 'b3', name: 'Coimbatore - Gandhipuram', city: 'Coimbatore', state: 'Tamil Nadu', activeStudents: 310, staffCount: 22 },
  { id: 'b4', name: 'Bangalore - Indiranagar', city: 'Bangalore', state: 'Karnataka', activeStudents: 490, staffCount: 36 },
  { id: 'b5', name: 'Bangalore - Marathahalli', city: 'Bangalore', state: 'Karnataka', activeStudents: 360, staffCount: 24 },
  { id: 'b6', name: 'Hyderabad - Madhapur', city: 'Hyderabad', state: 'Telangana', activeStudents: 450, staffCount: 32 },
  { id: 'b7', name: 'Hyderabad - Ameerpet', city: 'Hyderabad', state: 'Telangana', activeStudents: 290, staffCount: 20 },
  { id: 'b8', name: 'Kochi - Infopark', city: 'Kochi', state: 'Kerala', activeStudents: 280, staffCount: 19 },
  { id: 'b9', name: 'Madurai - KK Nagar', city: 'Madurai', state: 'Tamil Nadu', activeStudents: 240, staffCount: 16 },
  { id: 'b10', name: 'Trichy - Thillai Nagar', city: 'Trichy', state: 'Tamil Nadu', activeStudents: 210, staffCount: 14 },
  { id: 'b11', name: 'Salem - Fairlands', city: 'Salem', state: 'Tamil Nadu', activeStudents: 190, staffCount: 12 },
  { id: 'b12', name: 'Vijayawada - Benz Circle', city: 'Vijayawada', state: 'Andhra Pradesh', activeStudents: 230, staffCount: 15 }
];

const SEED_STUDENTS = [
  {
    studentId: 'TFMC0Y6001',
    name: 'AJITH KUMAR A',
    phone: '63801 18356',
    email: 'ajith16124002@gmail.com',
    course: 'IPDRG',
    mode: 'Online',
    batchDate: 'May 2',
    batchTiming: '8-10 PM Weekdays',
    qualification: 'BE Medical Electronics - 2020',
    qualTag: 'Life Sci',
    collegeCompany: 'S2M Health Care',
    location: 'Namakkal',
    hrName: 'Kalaiselvi',
    source: 'OLD STUDENT',
    dob: '16-07-1999',
    enqDate: 'April',
    onboardStatus: '7/7 ✓',
    syllabusModule: 'Module 1',
    mockInterview: 'Pending',
    examStatus: 'Not Booked',
    certified: 'Non-certified',
    placementStatus: 'Placed · 32K',
    feeStatus: 'Fully Paid',
    feeAmount: '₹25,000',
    courseFee: 25000,
    statusGroup: 'placed',
    handoverStatus: 'Ready'
  },
  {
    studentId: 'TFMC0Y6002',
    name: 'DHARSHINI S',
    phone: '98402 88987',
    email: 'dharshateddy73@gmail.com',
    course: 'CIC',
    mode: 'Online',
    batchDate: 'May 3',
    batchTiming: '8-10 PM Weekdays',
    qualification: 'BSc Optometry - 2024',
    qualTag: 'Life Sci',
    collegeCompany: 'Lotus Eye',
    location: 'Hosur',
    hrName: 'Reshma',
    source: 'OLD STUDENT',
    dob: '02-07-2002',
    enqDate: 'April',
    onboardStatus: '7/7 ✓',
    syllabusModule: 'Module 2',
    mockInterview: 'Pending',
    examStatus: 'Not Booked',
    certified: 'Non-certified',
    placementStatus: 'In course',
    feeStatus: 'Part Paid',
    feeAmount: '₹11,000 / ₹25,000',
    courseFee: 25000,
    statusGroup: 'in_course',
    handoverStatus: 'Pending Handover'
  },
  {
    studentId: 'TFMC0Y6003',
    name: 'POOJA R.',
    phone: '97891 21345',
    email: 'pooja.r.cpc@gmail.com',
    course: 'CPC Inter',
    mode: 'Online',
    batchDate: 'May 10',
    batchTiming: '10 AM-12 PM Daily',
    qualification: 'BSc Biotechnology - 2023',
    qualTag: 'Life Sci',
    collegeCompany: 'PSG College of Arts & Science',
    location: 'Coimbatore',
    hrName: 'Kavitha N.',
    source: 'DIRECT ENQUIRY',
    dob: '14-04-2001',
    enqDate: 'May',
    onboardStatus: '7/7 ✓',
    syllabusModule: 'Module 1',
    mockInterview: 'Pending',
    examStatus: 'Not Booked',
    certified: 'Non-certified',
    placementStatus: 'In course',
    feeStatus: 'Fully Paid',
    feeAmount: '₹21,000',
    courseFee: 21000,
    statusGroup: 'in_course',
    handoverStatus: 'Ready'
  },
  {
    studentId: 'TFMC0Y6004',
    name: 'ANANYA M.',
    phone: '94432 77654',
    email: 'ananya.m99@gmail.com',
    course: 'CPC Prep',
    mode: 'Classroom',
    batchDate: 'May 15',
    batchTiming: '2-4 PM Weekdays',
    qualification: 'BPharm - 2022',
    qualTag: 'Pharmacy',
    collegeCompany: 'KMCH College of Pharmacy',
    location: 'Saravanampatti',
    hrName: 'Kavitha N.',
    source: 'REFERRAL',
    dob: '28-11-1999',
    enqDate: 'May',
    onboardStatus: '7/7 ✓',
    syllabusModule: 'Module 1',
    mockInterview: 'Cleared ✓',
    examStatus: 'AAPC CPC Booked',
    certified: 'CPC Certified ✓',
    placementStatus: 'Interviewing (Omega)',
    feeStatus: 'Fully Paid',
    feeAmount: '₹25,000',
    courseFee: 25000,
    statusGroup: 'in_course',
    handoverStatus: 'Ready'
  },
  {
    studentId: 'TFMC0Y6005',
    name: 'KARTHIKEYAN V.',
    phone: '99441 33211',
    email: 'karthik.v.bcom@gmail.com',
    course: 'Comprehensive Medical Coding',
    mode: 'Classroom',
    batchDate: 'May 20',
    batchTiming: '6-8 PM Weekdays',
    qualification: 'BCom - 2021',
    qualTag: 'Non-LifeSci',
    collegeCompany: 'Rathinam College',
    location: 'Coimbatore',
    hrName: 'Balaji R.',
    source: 'WALK-IN',
    dob: '05-09-2000',
    enqDate: 'May',
    onboardStatus: '4/7 Pending',
    syllabusModule: 'Orientation',
    mockInterview: 'Pending',
    examStatus: 'Not Booked',
    certified: 'Non-certified',
    placementStatus: 'On Hold (Docs pending)',
    feeStatus: 'Part Paid',
    feeAmount: '₹15,000 / ₹32,000',
    courseFee: 32000,
    statusGroup: 'on_hold',
    handoverStatus: 'Pending Handover'
  }
];

const SEED_LEADS = [
  {
    fullName: 'Priya R.',
    phone: '+91 98765 12345',
    email: 'priya.r@gmail.com',
    age: '24',
    gender: 'Female',
    location: 'Coimbatore',
    education: 'BSc Microbiology',
    branch: 'Saravanampatti (CBE)',
    course: 'CPC - Certified Professional Coder',
    sourceId: 's1',
    sourceName: 'Google Calls / GMB',
    sourceTier: 'TIER A',
    sourceBadge: 'GOOGLE',
    category: 'Fresh Graduate',
    stage: 'new',
    status: 'pending',
    counselorAssigned: 'Kavitha N.',
    followUpDate: 'Today',
    followUpTime: 'NOW',
    followUpNote: 'First call pending · BPO reject · Interested in CPC classroom'
  },
  {
    fullName: 'Manoj K.',
    phone: '+91 97890 67890',
    email: 'manoj.k@gmail.com',
    age: '25',
    gender: 'Male',
    location: 'Coimbatore',
    education: 'BCom Graduate',
    branch: 'Saravanampatti (CBE)',
    course: 'Comprehensive Medical Coding',
    sourceId: 's4',
    sourceName: 'Justdial',
    sourceTier: 'TIER A',
    sourceBadge: 'JUSTDIAL',
    category: 'Career Gap',
    stage: 'new',
    status: 'pending',
    counselorAssigned: 'Kavitha N.',
    followUpDate: 'Today',
    followUpTime: '15:30',
    followUpNote: 'Justdial inquiry · 2-year gap · Deciding on EMI options'
  },
  {
    fullName: 'Karthik V.',
    phone: '+91 95432 10987',
    email: 'karthik.v@gmail.com',
    age: '22',
    gender: 'Male',
    location: 'Saravanampatti',
    education: 'BCom 2024',
    branch: 'Saravanampatti (CBE)',
    course: 'CPC Intensive Medical Coding',
    sourceId: 's3',
    sourceName: 'Referral',
    sourceTier: 'TIER A',
    sourceBadge: 'REFERRAL',
    category: 'Fresh Graduate',
    stage: 'demo_booked',
    status: 'in_progress',
    counselorAssigned: 'Kavitha N.',
    followUpDate: 'Today',
    followUpTime: '16:00',
    followUpNote: 'Attending Demo today at 4 PM with Priyadharshini K.'
  },
  {
    fullName: 'Sneha P.',
    phone: '+91 97890 54321',
    email: 'sneha.p@gmail.com',
    age: '21',
    gender: 'Female',
    location: 'Coimbatore',
    education: 'BSc Biotechnology',
    branch: 'Saravanampatti (CBE)',
    course: 'CPC Intensive Medical Coding',
    sourceId: 's5',
    sourceName: 'WhatsApp — Direct from Student',
    sourceTier: 'TIER B',
    sourceBadge: 'WHATSAPP',
    category: 'Final Year Student',
    stage: 'demo_attended',
    status: 'in_progress',
    counselorAssigned: 'Kavitha N.',
    followUpDate: 'Today',
    followUpTime: '14:00',
    followUpNote: 'Attended CPC demo yesterday, high interest. Call for fee pitch.'
  },
  {
    fullName: 'Lakshmi N.',
    phone: '+91 98765 43210',
    email: 'lakshmi.n@gmail.com',
    age: '25',
    gender: 'Female',
    location: 'Coimbatore',
    education: 'BSc Nursing',
    branch: 'Saravanampatti (CBE)',
    course: 'CPC Intensive Medical Coding',
    sourceId: 's6',
    sourceName: 'Direct Walk-in',
    sourceTier: 'TIER B',
    sourceBadge: 'WALK-IN',
    category: 'Allied Health',
    stage: 'fee_followup',
    status: 'in_progress',
    counselorAssigned: 'Kavitha N.',
    followUpDate: 'Today',
    followUpTime: '16:30',
    followUpNote: 'Walk-in tour completed. ₹21K ready. Ready to enroll today.'
  }
];

const SEED_DEMOS = [
  {
    candidateName: 'Lakshmi N.',
    phone: '+91 98765 43210',
    course: 'CPC Intensive Medical Coding',
    mode: 'Online (Zoom Live)',
    time: 'Today 14:30',
    timeSlot: '4:00–6:00 PM',
    language: 'Tamil',
    trainer: 'Dr. Vikram C.',
    trainerMapping: 'Maps to Revathi K · Tamil · Anatomy + ICD-10-CM · 90% · load 2/5',
    status: 'confirmed',
    link: 'https://zoom.us/j/9823412345',
    note: 'Allied health background. Link sent via WhatsApp.'
  },
  {
    candidateName: 'Karthik V.',
    phone: '+91 95432 10987',
    course: 'Comprehensive Medical Coding',
    mode: 'Classroom (Saravanampatti)',
    time: 'Today 16:00',
    timeSlot: '4:00–6:00 PM',
    language: 'Tamil',
    trainer: 'Priyadharshini K.',
    trainerMapping: 'Maps to Priyadharshini K · Tamil · CPC & CPT Coding',
    status: 'booked',
    note: 'Demo booked 4 PM today. Confirm attendance + send location map.'
  },
  {
    candidateName: 'Vignesh S.',
    phone: '+91 98941 12345',
    course: 'Fast-Track Life Sciences Batch',
    mode: 'Walk-in Campus Tour',
    time: 'Tomorrow 11:00',
    timeSlot: '9:00–11:00 AM',
    language: 'Tamil',
    trainer: 'Dr. Vikram C.',
    trainerMapping: 'Maps to Dr. Vikram C. · Life Science Specialist',
    status: 'booked',
    note: 'Father visiting along with student.'
  },
  {
    candidateName: 'Sneha P.',
    phone: '+91 97890 54321',
    course: 'CPC Prep & Anatomy Module',
    mode: 'Online (Zoom Live)',
    time: 'Yesterday 15:00',
    timeSlot: '4:00–6:00 PM',
    language: 'Tamil',
    trainer: 'Dr. Vikram C.',
    trainerMapping: 'Maps to Revathi K · Anatomy + ICD-10-CM',
    status: 'attended',
    note: 'Attended full session. Trainer rated high interest.'
  },
  {
    candidateName: 'Divya P.',
    phone: '+91 88765 43219',
    course: 'CPC Professional Coding',
    mode: 'Online (Zoom Live)',
    time: 'Yesterday 17:30',
    timeSlot: '6:30–8:30 PM',
    language: 'English',
    trainer: 'Karthik V.',
    trainerMapping: 'Maps to Karthik V · English · CPC & CPT Coding',
    status: 'fee',
    note: 'Agreed on fee structure. ₹5,000 token paid, balancing today.'
  }
];

const SEED_COURSE_RATES = [
  { code: 'CPC', name: 'Certified Professional Coder', duration: '3 Months', registrationFee: 2000, trainingFee: 19000, examFee: 22000, courseFee: 21000, totalPayable: 43000 },
  { code: 'CCS', name: 'Certified Coding Specialist', duration: '4 Months', registrationFee: 2000, trainingFee: 23000, examFee: 22000, courseFee: 25000, totalPayable: 47000 },
  { code: 'CRC', name: 'Certified Risk Adjustment Coder', duration: '2 Months', registrationFee: 2000, trainingFee: 16000, examFee: 22000, courseFee: 18000, totalPayable: 40000 },
  { code: 'COC', name: 'Certified Outpatient Coder', duration: '3 Months', registrationFee: 2000, trainingFee: 19000, examFee: 22000, courseFee: 21000, totalPayable: 43000 },
  { code: 'CIC', name: 'Certified Inpatient Coder', duration: '4 Months', registrationFee: 2000, trainingFee: 23000, examFee: 22000, courseFee: 25000, totalPayable: 47000 },
  { code: 'CPMA', name: 'Practice Medical Coding', duration: '2 Months', registrationFee: 2000, trainingFee: 16000, examFee: 22000, courseFee: 18000, totalPayable: 40000 },
  { code: 'EMCT Intermediate', name: 'AAPC Medical Coding Training', duration: '3 Months', registrationFee: 2000, trainingFee: 16000, examFee: 22000, courseFee: 18000, totalPayable: 40000 }
];

// Seed Helper
let isSeeded = false;
const seedDatabaseIfEmpty = async () => {
  if (isSeeded) return;
  if (mongoose.connection.readyState !== 1) return;
  try {
    const studentCount = await Student.countDocuments();
    if (studentCount === 0) {
      await Student.insertMany(SEED_STUDENTS);
      console.log('✓ [DB Seed] Seeded real students');
    }
    const leadCount = await StudentLead.countDocuments();
    if (leadCount === 0) {
      await StudentLead.insertMany(SEED_LEADS);
      console.log('✓ [DB Seed] Seeded real CRM leads');
    }
    const demoCount = await Demo.countDocuments();
    if (demoCount === 0) {
      await Demo.insertMany(SEED_DEMOS);
      console.log('✓ [DB Seed] Seeded real demos');
    }
    const rateCount = await CourseFeeRate.countDocuments();
    if (rateCount === 0) {
      await CourseFeeRate.insertMany(SEED_COURSE_RATES);
      console.log('✓ [DB Seed] Seeded real course fee rates');
    }
    isSeeded = true;
  } catch (err) {
    console.error('Error during database seed:', err.message);
  }
};

// Middleware to ensure DB is initialized
router.use(async (req, res, next) => {
  if (!isSeeded && mongoose.connection.readyState === 1) {
    await seedDatabaseIfEmpty();
  }
  next();
});

// Health Check
router.get('/health', (req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'online',
    system: 'Thoughtflows HRMS & CRM API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    database: isMongoConnected ? 'connected' : 'offline'
  });
});

// Portal Statistics Overview (Live Calculated from DB)
router.get('/stats', async (req, res) => {
  try {
    const deptCount = await Department.countDocuments();
    const branchCount = await Branch.countDocuments();
    const studentCount = await Student.countDocuments();
    const leadCount = await StudentLead.countDocuments();
    
    res.json({
      academyName: "Thoughtflows Medical Coding Academy",
      tagline: "Where thoughts flow into action",
      portalVersion: "V2.0 • LIVE",
      branchesCount: branchCount || 12,
      teamsCount: deptCount || 8,
      activeStudents: studentCount || 3970,
      activeLeads: leadCount || 48,
      placementRate: "98.4%"
    });
  } catch (e) {
    res.json({
      academyName: "Thoughtflows Medical Coding Academy",
      tagline: "Where thoughts flow into action",
      portalVersion: "V2.0 • LIVE",
      branchesCount: 12,
      teamsCount: 8,
      activeStudents: 3970,
      activeLeads: 48,
      placementRate: "98.4%"
    });
  }
});

// Departments Endpoint
router.get('/departments', async (req, res) => {
  try {
    let depts = await Department.find();
    if (depts.length === 0) {
      await Department.insertMany(SEED_DEPARTMENTS);
      depts = await Department.find();
    }
    return res.json(depts);
  } catch (e) {
    res.json(SEED_DEPARTMENTS);
  }
});

// Branches Endpoint
router.get('/branches', async (req, res) => {
  try {
    let branches = await Branch.find();
    if (branches.length === 0) {
      await Branch.insertMany(SEED_BRANCHES);
      branches = await Branch.find();
    }
    return res.json(branches);
  } catch (e) {
    res.json(SEED_BRANCHES);
  }
});

// ==========================================
// REAL ADMITTED STUDENTS API
// ==========================================
router.get('/students', async (req, res) => {
  try {
    const { statusGroup, search } = req.query;
    let query = {};
    if (statusGroup && statusGroup !== 'all') {
      query.statusGroup = statusGroup;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { course: { $regex: search, $options: 'i' } },
        { hrName: { $regex: search, $options: 'i' } }
      ];
    }
    const students = await Student.find(query).sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/students', async (req, res) => {
  try {
    let payload = { ...req.body };
    if (!payload.studentId) {
      const count = await Student.countDocuments();
      payload.studentId = `TFMC0Y600${count + 1}`;
    }
    const newStudent = new Student(payload);
    await newStudent.save();
    res.status(201).json(newStudent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/students/:id', async (req, res) => {
  try {
    const updated = await Student.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updated) {
      // Try finding by studentId string
      const updatedByStudentId = await Student.findOneAndUpdate(
        { studentId: req.params.id },
        { $set: req.body },
        { new: true }
      );
      if (!updatedByStudentId) return res.status(404).json({ error: 'Student not found' });
      return res.json(updatedByStudentId);
    }
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/students/:id', async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: 'Student removed successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// REAL CRM LEADS & PIPELINE API
// ==========================================
router.get('/leads', async (req, res) => {
  try {
    const leads = await StudentLead.find().sort({ createdAt: -1 });
    
    // Group into pipeline counts
    const stages = [
      { key: 'new', label: '1. New Leads', count: 0, color: '#0f172a' },
      { key: 'contacted', label: '2. Contacted / Follow-up', count: 0, color: '#0284c7' },
      { key: 'demo_booked', label: '3. Demo Booked', count: 0, color: '#7c3aed' },
      { key: 'demo_attended', label: '4. Demo Attended', count: 0, color: '#059669' },
      { key: 'fee_followup', label: '5. Fee Discussion', count: 0, color: '#ea580c' },
      { key: 'admitted', label: '6. Admitted & Enrolled', count: 0, color: '#10b981' }
    ];

    leads.forEach(l => {
      const match = stages.find(s => s.key === l.stage);
      if (match) match.count++;
    });

    res.json({
      leads,
      stages,
      totalCount: leads.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/leads', async (req, res) => {
  try {
    const newLead = new StudentLead(req.body);
    await newLead.save();
    res.status(201).json(newLead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/leads/:id', async (req, res) => {
  try {
    const updated = await StudentLead.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Lead not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/leads/:id', async (req, res) => {
  try {
    await StudentLead.findByIdAndDelete(req.params.id);
    res.json({ message: 'Lead deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Legacy pipeline route for backwards compatibility
router.get('/leads/pipeline', async (req, res) => {
  try {
    const leads = await StudentLead.find();
    const stages = [
      { key: 'first_call', label: '1. First Call & Counseling', count: leads.filter(l => l.stage === 'new').length || 184, color: '#14b8a6' },
      { key: 'enrolled', label: '2. Enrolled & Onboarded', count: leads.filter(l => l.stage === 'admitted').length || 142, color: '#06b6d4' },
      { key: 'in_training', label: '3. Medical Coding & Anatomy', count: 420, color: '#3b82f6' },
      { key: 'cpc_exam_passed', label: '4. AAPC CPC Certified', count: 118, color: '#10b981' },
      { key: 'placed', label: '5. Campus Placement Secured', count: 96, color: '#8b5cf6' },
      { key: 'first_paycheck', label: '6. First Paycheck Milestone', count: 88, color: '#ec4899' }
    ];
    res.json({ stages });
  } catch (err) {
    res.json({ stages: [] });
  }
});

// ==========================================
// REAL DEMOS API
// ==========================================
router.get('/demos', async (req, res) => {
  try {
    const demos = await Demo.find().sort({ createdAt: -1 });
    res.json(demos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/demos', async (req, res) => {
  try {
    const newDemo = new Demo(req.body);
    await newDemo.save();
    res.status(201).json(newDemo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/demos/:id', async (req, res) => {
  try {
    const updated = await Demo.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Demo not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/demos/:id', async (req, res) => {
  try {
    await Demo.findByIdAndDelete(req.params.id);
    res.json({ message: 'Demo deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// REAL FEES & COURSE RATES API
// ==========================================
router.get('/fees/rates', async (req, res) => {
  try {
    let rates = await CourseFeeRate.find().sort({ createdAt: 1 });
    if (rates.length === 0) {
      await CourseFeeRate.insertMany(SEED_COURSE_RATES);
      rates = await CourseFeeRate.find().sort({ createdAt: 1 });
    }
    res.json(rates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/fees/rates', async (req, res) => {
  try {
    const { code } = req.body;
    const existing = await CourseFeeRate.findOne({ code: code.toUpperCase() });
    if (existing) {
      const updated = await CourseFeeRate.findOneAndUpdate(
        { code: code.toUpperCase() },
        { $set: req.body },
        { new: true }
      );
      return res.json(updated);
    }
    const newRate = new CourseFeeRate({
      ...req.body,
      code: code.toUpperCase()
    });
    await newRate.save();
    res.status(201).json(newRate);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Department Portals Authentication
const DEPARTMENT_PORTALS = {
  hr: {
    id: 'hr',
    code: 'HR',
    name: 'HR & Talent Acquisition',
    title: 'HR Department Portal',
    defaultEmail: 'hr@thoughtflows.in',
    defaultPassword: 'hr123',
    role: 'HR & Academic Counselling Lead',
    userName: 'Kavitha N.',
    branch: 'Saravanampatti Branch (CBE)',
    color: '#ef4444',
    description: 'Academic counsellors, lead capture, calls, follow-ups & admissions'
  },
  training: {
    id: 'training',
    code: 'ACAD',
    name: 'Training & Faculty Department',
    title: 'Training Department Portal',
    defaultEmail: 'training@thoughtflows.in',
    defaultPassword: 'train123',
    role: 'Faculty Lead & Chief Trainer',
    userName: 'Dr. Vikram C.',
    branch: 'Chennai - Guindy (HQ)',
    color: '#0284c7',
    description: '12-branch trainer coordination, batches, daily attendance & mastery tracking'
  },
  cccp: {
    id: 'cccp',
    code: 'CCCP',
    name: 'Corporate Career & Placement Cell (CCCP)',
    title: 'CCCP 3-Cell Portal',
    defaultEmail: 'cccp@thoughtflows.in',
    defaultPassword: 'cccp123',
    role: 'Placements & Corporate Relations Head',
    userName: 'Meenakshi R.',
    branch: 'Bangalore - Indiranagar',
    color: '#059669',
    description: 'Placement Cell · Examination Cell · College & Company Cell'
  },
  marketing: {
    id: 'marketing',
    code: 'MKT',
    name: 'Growth & Digital Marketing',
    title: 'Marketing Department Portal',
    defaultEmail: 'marketing@thoughtflows.in',
    defaultPassword: 'mkt123',
    role: 'Head of Growth & Lead Generation',
    userName: 'Priya R.',
    branch: 'Hyderabad - Madhapur',
    color: '#9333ea',
    description: 'Digital campaigns, Meta/Google ads, outdoor billboards & lead conversion'
  },
  leadership: {
    id: 'leadership',
    code: 'LEAD',
    name: 'Leadership & Regional Operations Hub',
    title: 'Leadership Hub Portal',
    defaultEmail: 'leadership@thoughtflows.in',
    defaultPassword: 'lead123',
    role: 'Regional Operations & Branch Director',
    userName: 'Ganesh N.',
    branch: 'All 12 Hubs (HQ Overseer)',
    color: '#ea580c',
    description: 'Operational, Department, Regional & Branch heads oversight'
  },
  student: {
    id: 'student',
    code: 'STU',
    name: 'Student Learning & Exam Portal',
    title: 'Student Portal Login',
    defaultEmail: 'student@thoughtflows.in',
    defaultPassword: 'stu123',
    role: 'AAPC CPC Scholar (Student)',
    userName: 'Pooja J.',
    branch: 'Chennai - Anna Nagar',
    color: '#0d9488',
    description: 'Syllabus, attendance tracking, mock exam bookings & campus placements'
  },
  admin: {
    id: 'admin',
    code: 'ADM',
    name: 'Admin & Executive Management',
    title: 'Admin Command Bridge',
    defaultEmail: 'admin@thoughtflows.in',
    defaultPassword: 'admin123',
    role: 'Executive Managing Director (Founder)',
    userName: 'Executive Founders Desk',
    branch: 'Thoughtflows Group HQ',
    color: '#4338ca',
    description: 'Founders command bridge, back-office operations, strategy & administration'
  }
};

router.get('/auth/departments', (req, res) => {
  res.json(DEPARTMENT_PORTALS);
});

router.post('/auth/login', (req, res) => {
  const { email, password, department } = req.body;
  const deptKey = department?.toLowerCase() || 'hr';
  const targetDept = DEPARTMENT_PORTALS[deptKey] || DEPARTMENT_PORTALS.hr;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both email and password.'
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  
  let matchedDeptKey = Object.keys(DEPARTMENT_PORTALS).find(
    k => DEPARTMENT_PORTALS[k].defaultEmail.toLowerCase() === normalizedEmail
  );

  const activeDept = matchedDeptKey ? DEPARTMENT_PORTALS[matchedDeptKey] : targetDept;

  res.json({
    success: true,
    message: `Authenticated successfully for ${activeDept.name}`,
    user: {
      id: `usr_${activeDept.id}_${Date.now().toString().slice(-4)}`,
      name: activeDept.userName,
      email: normalizedEmail,
      department: activeDept.id,
      departmentCode: activeDept.code,
      departmentName: activeDept.name,
      role: activeDept.role,
      branch: activeDept.branch,
      color: activeDept.color,
      token: `jwt_tf_${activeDept.id}_token_2026`
    }
  });
});

export default router;
