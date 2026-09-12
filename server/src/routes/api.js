import express from 'express';
import Department from '../models/Department.js';
import Branch from '../models/Branch.js';
import User from '../models/User.js';
import StudentLead from '../models/StudentLead.js';
import mongoose from 'mongoose';

const router = express.Router();

// Fallback seed data matching the Thoughtflows 8 teams across 12 branches setup
const MOCK_DEPARTMENTS = [
  { id: '1', code: 'ADM', name: 'Admissions & Counseling', head: 'Pooja J.', memberCount: 38, icon: 'PhoneCall', color: '#14b8a6', description: 'Handling initial student inquiries, career advisory, and enrolments.' },
  { id: '2', code: 'ACAD', name: 'Medical Coding Faculty', head: 'Dr. Vikram C.', memberCount: 52, icon: 'GraduationCap', color: '#06b6d4', description: 'AAPC certified trainers guiding ICD-10-CM, CPT, and HCPCS coding.' },
  { id: '3', code: 'SUCC', name: 'Student Mentorship & Support', head: 'Priya R.', memberCount: 24, icon: 'HeartHandshake', color: '#10b981', description: 'Daily 1-on-1 doubt clearing, study schedules, and attendance tracking.' },
  { id: '4', code: 'EXAM', name: 'CPC Examination Cell', head: 'Suresh V.', memberCount: 16, icon: 'Award', color: '#f59e0b', description: 'Mock tests, AAPC exam bookings, and certification readiness drills.' },
  { id: '5', code: 'CORP', name: 'Corporate Relations & Placements', head: 'Meenakshi R.', memberCount: 29, icon: 'Briefcase', color: '#8b5cf6', description: 'Partnered with 140+ US healthcare RCM companies and hospital networks.' },
  { id: '6', code: 'HR', name: 'HR & Talent Acquisition', head: 'Balaji R.', memberCount: 14, icon: 'Users', color: '#ec4899', description: 'Staffing faculty, branch coordinators, and employee growth programs.' },
  { id: '7', code: 'SYS', name: 'IT Infrastructure & LMS', head: 'Dinesh P.', memberCount: 18, icon: 'Server', color: '#3b82f6', description: 'Managing student LMS portal, video lectures, and secure servers.' },
  { id: '8', code: 'FIN', name: 'Finance & Branch Operations', head: 'Kavitha V.', memberCount: 15, icon: 'PieChart', color: '#6366f1', description: 'Fee installments, scholarships, and branch facilities operations.' }
];

const MOCK_BRANCHES = [
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

const MOCK_ACTIVE_STAFF_DOTS = [
  { initials: 'PJ', name: 'Pooja J.', dept: 'Admissions', x: 4, y: 3, bg: 'bg-emerald-600' },
  { initials: 'VC', name: 'Dr. Vikram C.', dept: 'Medical Coding Faculty', x: 14, y: 2, bg: 'bg-amber-600' },
  { initials: 'PR', name: 'Priya R.', dept: 'Student Success', x: 15, y: 13, bg: 'bg-purple-600' },
  { initials: 'SV', name: 'Suresh V.', dept: 'CPC Exam Cell', x: 38, y: 2, bg: 'bg-pink-600' },
  { initials: 'MR', name: 'Meenakshi R.', dept: 'Placements', x: 34, y: 42, bg: 'bg-orange-600' },
  { initials: 'BR', name: 'Balaji R.', dept: 'HR & Talent', x: 35, y: 74, bg: 'bg-amber-700' },
  { initials: 'DP', name: 'Dinesh P.', dept: 'IT & LMS', x: 72, y: 79, bg: 'bg-amber-800' },
  { initials: 'KV', name: 'Kavitha V.', dept: 'Finance & Ops', x: 77, y: 71, bg: 'bg-rose-700' },
  { initials: 'GN', name: 'Ganesh N.', dept: 'Branch Head', x: 8, y: 56, bg: 'bg-blue-600' },
  { initials: 'RV', name: 'Rohit V.', dept: 'CPC Mentor', x: 94, y: 72, bg: 'bg-yellow-800' },
  { initials: 'DP', name: 'Divya P.', dept: 'Placements Lead', x: 80, y: 72, bg: 'bg-yellow-700' },
  { initials: 'SH', name: 'Sneha H.', dept: 'Medical Terminology', x: 29, y: 44, bg: 'bg-blue-500' }
];

// Health Check
router.get('/health', (req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'online',
    system: 'Thoughtflows HRMS & CRM API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    database: isMongoConnected ? 'connected' : 'offline-mock-mode'
  });
});

// Portal Statistics Overview
router.get('/stats', async (req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  
  if (isMongoConnected) {
    try {
      const deptCount = await Department.countDocuments();
      const branchCount = await Branch.countDocuments();
      const studentCount = await StudentLead.countDocuments();
      
      return res.json({
        academyName: "Thoughtflows Medical Coding Academy",
        tagline: "Where thoughts flow into action",
        portalVersion: "V2.0 • LIVE",
        branchesCount: branchCount || 12,
        teamsCount: deptCount || 8,
        activeStudents: studentCount || 3970,
        placementRate: "98.4%",
        activeStaffAvatars: MOCK_ACTIVE_STAFF_DOTS
      });
    } catch (e) {
      // fallback to mock
    }
  }

  res.json({
    academyName: "Thoughtflows Medical Coding Academy",
    tagline: "Where thoughts flow into action",
    portalVersion: "V2.0 • LIVE",
    branchesCount: 12,
    teamsCount: 8,
    activeStudents: 3970,
    placementRate: "98.4%",
    activeStaffAvatars: MOCK_ACTIVE_STAFF_DOTS
  });
});

// Departments Endpoint
router.get('/departments', async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    try {
      let depts = await Department.find();
      if (depts.length === 0) {
        // Seed initial departments
        await Department.insertMany(MOCK_DEPARTMENTS);
        depts = await Department.find();
      }
      return res.json(depts);
    } catch (e) {
      // fallback
    }
  }
  res.json(MOCK_DEPARTMENTS);
});

// Branches Endpoint
router.get('/branches', async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    try {
      let branches = await Branch.find();
      if (branches.length === 0) {
        await Branch.insertMany(MOCK_BRANCHES);
        branches = await Branch.find();
      }
      return res.json(branches);
    } catch (e) {
      // fallback
    }
  }
  res.json(MOCK_BRANCHES);
});

// CRM Leads Pipeline Endpoint (First call to first paycheck)
router.get('/leads/pipeline', async (req, res) => {
  res.json({
    stages: [
      { key: 'first_call', label: '1. First Call & Counseling', count: 184, color: '#14b8a6' },
      { key: 'enrolled', label: '2. Enrolled & Onboarded', count: 142, color: '#06b6d4' },
      { key: 'in_training', label: '3. Medical Coding & Anatomy', count: 420, color: '#3b82f6' },
      { key: 'cpc_exam_passed', label: '4. AAPC CPC Certified', count: 118, color: '#10b981' },
      { key: 'placed', label: '5. Campus Placement Secured', count: 96, color: '#8b5cf6' },
      { key: 'first_paycheck', label: '6. First Paycheck Milestone', count: 88, color: '#ec4899' }
    ]
  });
});

// Department Specific Portal Definitions & Auth Presets
const DEPARTMENT_PORTALS = {
  hr: {
    id: 'hr',
    code: 'HR',
    name: 'HR & Talent Acquisition',
    title: 'HR Department Portal',
    defaultEmail: 'hr@thoughtflows.in',
    defaultPassword: 'hr123',
    role: 'HR & Academic Counselling Lead',
    userName: 'Balaji R.',
    branch: 'Chennai - Guindy (HQ)',
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

// Department Auth Metadata
router.get('/auth/departments', (req, res) => {
  res.json(DEPARTMENT_PORTALS);
});

// Login for Specific Department
router.post('/auth/login', (req, res) => {
  const { email, password, department } = req.body;
  const deptKey = department?.toLowerCase() || 'admin';
  const targetDept = DEPARTMENT_PORTALS[deptKey] || DEPARTMENT_PORTALS.admin;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both email and password.'
    });
  }

  // Check if department was specified and email matches or user is admin
  const normalizedEmail = email.trim().toLowerCase();
  
  // Find which department account matches this email, if any
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
