import express from 'express';
import mongoose from 'mongoose';
import Department from '../models/Department.js';
import Branch from '../models/Branch.js';
import User from '../models/User.js';
import StudentLead from '../models/StudentLead.js';
import Student from '../models/Student.js';
import Demo from '../models/Demo.js';
import CourseFeeRate from '../models/CourseFeeRate.js';
import Approval from '../models/Approval.js';
import Escalation from '../models/Escalation.js';
import TeamMember from '../models/TeamMember.js';
import Attendance from '../models/Attendance.js';

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
  { id: 'b1', name: 'Saravanampatti', city: 'Coimbatore', state: 'Tamil Nadu', activeStudents: 430, staffCount: 28 },
  { id: 'b2', name: 'Gandhipuram', city: 'Coimbatore', state: 'Tamil Nadu', activeStudents: 410, staffCount: 26 },
  { id: 'b3', name: 'Hopes', city: 'Coimbatore', state: 'Tamil Nadu', activeStudents: 340, staffCount: 22 },
  { id: 'b4', name: 'Ameerpet', city: 'Hyderabad', state: 'Telangana', activeStudents: 380, staffCount: 24 },
  { id: 'b5', name: 'Dilsukhnagar', city: 'Hyderabad', state: 'Telangana', activeStudents: 310, staffCount: 19 },
  { id: 'b6', name: 'Kochi', city: 'Kochi', state: 'Kerala', activeStudents: 290, staffCount: 18 },
  { id: 'b7', name: 'Salem', city: 'Salem', state: 'Tamil Nadu', activeStudents: 260, staffCount: 16 },
  { id: 'b8', name: 'Tirupati', city: 'Tirupati', state: 'Andhra Pradesh', activeStudents: 235, staffCount: 14 },
  { id: 'b9', name: 'Trichy', city: 'Trichy', state: 'Tamil Nadu', activeStudents: 275, staffCount: 17 },
  { id: 'b10', name: 'Trivandrum', city: 'Trivandrum', state: 'Kerala', activeStudents: 240, staffCount: 15 },
  { id: 'b11', name: 'Vizag', city: 'Visakhapatnam', state: 'Andhra Pradesh', activeStudents: 310, staffCount: 20 },
  { id: 'b12', name: 'Kollapur', city: 'Kolhapur', state: 'Maharashtra', activeStudents: 230, staffCount: 14 },
  { id: 'b13', name: 'Pune', city: 'Pune', state: 'Maharashtra', activeStudents: 310, staffCount: 19 },
  { id: 'b14', name: 'Theni', city: 'Theni', state: 'Tamil Nadu', activeStudents: 215, staffCount: 13 }
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
  },
  {
    studentId: 'TF-CBG-CPC-OF-2603-0042',
    name: 'Keerthana R.',
    phone: '+91 98421 65042',
    email: 'keerthana.r@gmail.com',
    course: 'CPC — Certified Professional Coder',
    mode: 'Offline',
    batchDate: '20 May 2026',
    batchTiming: 'Mon – Fri · 7:00 PM – 9:00 PM',
    qualification: 'B.Sc Nursing - 2024',
    qualTag: 'Life Sci',
    collegeCompany: 'Anna University',
    location: 'Coimbatore Gandhipuram',
    hrName: 'Kavitha N.',
    source: 'DIRECT ADMISSION',
    dob: '12-08-2001',
    enqDate: 'May',
    onboardStatus: '7/7 ✓',
    syllabusModule: 'CPT Coding',
    mockInterview: '74/100 (Faith A.)',
    examStatus: 'Target Aug 2026',
    certified: 'In Preparation',
    placementStatus: 'In Preparation (Readiness 60/100)',
    feeStatus: 'Part Paid',
    feeAmount: '₹30,000 / ₹45,000',
    courseFee: 45000,
    statusGroup: 'in_course',
    handoverStatus: 'Ready'
  },
  {
    studentId: 'TFMC0Y6007',
    name: 'MANOJ K.',
    phone: '97890 67890',
    email: 'manoj.k.billing@gmail.com',
    course: 'CPB — Certified Professional Biller',
    mode: 'Online',
    batchDate: 'May 12',
    batchTiming: '8:00–10:00 AM Daily',
    qualification: 'BCom - 2023',
    qualTag: 'Non-LifeSci',
    collegeCompany: 'PSG College of Technology',
    location: 'Coimbatore',
    hrName: 'Kavitha N.',
    source: 'DIRECT ENQUIRY',
    dob: '18-03-2001',
    enqDate: 'May',
    onboardStatus: '7/7 ✓',
    syllabusModule: 'Hospital Claims & RCM',
    mockInterview: 'Pending',
    examStatus: 'Not Booked',
    certified: 'Non-certified',
    placementStatus: 'In course',
    feeStatus: 'Fully Paid',
    feeAmount: '₹24,000',
    courseFee: 24000,
    statusGroup: 'in_course',
    handoverStatus: 'Ready'
  },
  {
    studentId: 'TFMC0Y6008',
    name: 'DIVYA P.',
    phone: '98412 34567',
    email: 'divya.p.cpb@gmail.com',
    course: 'CPB — Certified Professional Biller',
    mode: 'Classroom',
    batchDate: 'May 15',
    batchTiming: '8:00–10:00 AM Daily',
    qualification: 'BBA Finance - 2022',
    qualTag: 'Non-LifeSci',
    collegeCompany: 'GRD College',
    location: 'Saravanampatti',
    hrName: 'Balaji R.',
    source: 'WALK-IN',
    dob: '22-09-2000',
    enqDate: 'May',
    onboardStatus: '7/7 ✓',
    syllabusModule: 'Denial Management & CMS-1500',
    mockInterview: 'Pending',
    examStatus: 'Not Booked',
    certified: 'Non-certified',
    placementStatus: 'In course',
    feeStatus: 'Part Paid',
    feeAmount: '₹14,000 / ₹24,000',
    courseFee: 24000,
    statusGroup: 'in_course',
    handoverStatus: 'Ready'
  },
  {
    studentId: 'TFMC0Y6009',
    name: 'NAVEEN S.',
    phone: '99432 88776',
    email: 'naveen.cpma@gmail.com',
    course: 'CPMA — Certified Professional Medical Auditor',
    mode: 'Online',
    batchDate: 'May 18',
    batchTiming: '10:00 AM–12:00 PM Daily',
    qualification: 'MSc Biochemistry - 2021',
    qualTag: 'Life Sci',
    collegeCompany: 'Bharathiar University',
    location: 'Hopes, Coimbatore',
    hrName: 'Kavitha N.',
    source: 'REFERRAL',
    dob: '11-11-1998',
    enqDate: 'May',
    onboardStatus: '7/7 ✓',
    syllabusModule: 'Chart Auditing Standards',
    mockInterview: 'Cleared ✓',
    examStatus: 'Target Sep 2026',
    certified: 'In Preparation',
    placementStatus: 'Interviewing',
    feeStatus: 'Fully Paid',
    feeAmount: '₹28,000',
    courseFee: 28000,
    statusGroup: 'in_course',
    handoverStatus: 'Ready'
  },
  {
    studentId: 'TFMC0Y6010',
    name: 'HARINI V.',
    phone: '94421 99881',
    email: 'harini.crc@gmail.com',
    course: 'CRC — Certified Risk Adjustment Coder',
    mode: 'Online',
    batchDate: 'May 20',
    batchTiming: '7:00–9:00 AM Daily',
    qualification: 'BSc Nursing - 2023',
    qualTag: 'Life Sci',
    collegeCompany: 'Sri Ramakrishna College of Nursing',
    location: 'Chennai',
    hrName: 'Pooja J.',
    source: 'WEBSITE',
    dob: '08-05-2001',
    enqDate: 'May',
    onboardStatus: '7/7 ✓',
    syllabusModule: 'HCC Models & Risk Adjustment',
    mockInterview: 'Pending',
    examStatus: 'Not Booked',
    certified: 'Non-certified',
    placementStatus: 'In course',
    feeStatus: 'Fully Paid',
    feeAmount: '₹26,000',
    courseFee: 26000,
    statusGroup: 'in_course',
    handoverStatus: 'Ready'
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

const SEED_USERS = [
  {
    name: 'Srithar S',
    email: 'srithar.brandforge@gmail.com',
    password: 'Thoughtflows@2026',
    role: 'Trainer',
    department: 'Medical Coding Faculty',
    branch: 'Gandhipuram',
    status: 'Active',
    lastLogin: 'Never',
    avatarBg: 'bg-indigo-600'
  },
  {
    name: 'Executive Founders Desk',
    email: 'admin@thoughtflows.in',
    password: 'admin123',
    role: 'Super Admin',
    department: 'Admin & Management',
    branch: 'Saravanampatti Hub',
    status: 'Active',
    lastLogin: 'Just now',
    avatarBg: 'bg-indigo-600'
  },
  {
    name: 'Kavitha N.',
    email: 'hr@thoughtflows.in',
    password: 'Kavitha@HR2026',
    role: 'Counseling Lead',
    department: 'Admissions & Counseling',
    branch: 'Gandhipuram',
    status: 'Active',
    lastLogin: '10 mins ago',
    avatarBg: 'bg-rose-500'
  },
  {
    name: 'Dr. Vikram C.',
    email: 'training@thoughtflows.in',
    password: 'Faculty#2026',
    role: 'Faculty Lead',
    department: 'Medical Coding Faculty',
    branch: 'Saravanampatti',
    status: 'Active',
    lastLogin: '25 mins ago',
    avatarBg: 'bg-sky-500'
  },
  {
    name: 'Meenakshi R.',
    email: 'cccp@thoughtflows.in',
    password: 'Placement@2026',
    role: 'Placement Head',
    department: 'Corporate Placements',
    branch: 'Hopes',
    status: 'Active',
    lastLogin: '1 hour ago',
    avatarBg: 'bg-emerald-600'
  },
  {
    name: 'Priya R.',
    email: 'marketing@thoughtflows.in',
    password: 'Growth#TF2026',
    role: 'Growth Lead',
    department: 'Growth & Marketing',
    branch: 'Dilsukhnagar',
    status: 'Active',
    lastLogin: '2 hours ago',
    avatarBg: 'bg-purple-600'
  },
  {
    name: 'Aswanth V K',
    email: 'aswanth@thoughtflows.in',
    password: 'Aswanth#Lead26',
    role: 'Regional head',
    department: 'Leadership & Operations',
    branch: '14 Hubs Overseer',
    status: 'Active',
    lastLogin: 'Yesterday',
    avatarBg: 'bg-orange-500'
  },
  {
    name: 'Keerthana R.',
    email: 'student@thoughtflows.in',
    password: 'Scholar#TF26',
    role: 'Student Scholar',
    department: 'Student Scholar',
    branch: 'Trichy',
    status: 'Active',
    lastLogin: '3 hours ago',
    avatarBg: 'bg-teal-600'
  }
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
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.insertMany(SEED_USERS);
      console.log('✓ [DB Seed] Seeded real user accounts');
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
// LEADERSHIP HUB — Approvals, Escalations, Team & Attendance
// ==========================================
const SEED_APPROVALS = [
  { title: 'Fee waiver for hardship case', kind: 'Fee Waiver', priority: 'high', departmentCode: 'ADM', branchName: 'Saravanampatti', requestedBy: 'Pooja J.' },
  { title: 'New AAPC mock exam slot', kind: 'Exam Slot', priority: 'medium', departmentCode: 'EXAM', branchName: 'Gandhipuram', requestedBy: 'Suresh V.' },
  { title: 'Corporate hiring drive sign-off', kind: 'Placement Drive', priority: 'high', departmentCode: 'CORP', branchName: 'Ameerpet', requestedBy: 'Meenakshi R.' },
  { title: 'New faculty onboarding', kind: 'Hiring', priority: 'medium', departmentCode: 'HR', branchName: 'Hopes', requestedBy: 'Balaji R.' },
  { title: 'LMS server upgrade budget', kind: 'IT Budget', priority: 'low', departmentCode: 'SYS', branchName: '', requestedBy: 'Dinesh P.' },
  { title: 'Installment plan restructure', kind: 'Finance', priority: 'medium', departmentCode: 'FIN', branchName: 'Kochi', requestedBy: 'Kavitha V.' }
];

const SEED_ESCALATIONS = [
  { title: 'Batch timing conflict', type: 'Scheduling', priority: 'urgent', departmentCode: 'ACAD', branchName: 'Salem', raisedBy: 'Dr. Vikram C.' },
  { title: 'Student attendance dispute', type: 'Academic', priority: 'normal', departmentCode: 'SUCC', branchName: 'Trichy', raisedBy: 'Priya R.' },
  { title: 'Delayed fee refund', type: 'Finance', priority: 'urgent', departmentCode: 'FIN', branchName: 'Trivandrum', raisedBy: 'Kavitha V.' },
  { title: 'LMS login outage', type: 'IT', priority: 'urgent', departmentCode: 'SYS', branchName: '', raisedBy: 'Dinesh P.' }
];

const SEED_TEAM = [
  { name: 'Anitha R.', role: 'Academic Counsellor', departmentCode: 'ADM', branchName: 'Saravanampatti', assigned: 24, completed: 20, pending: 4, quality: 88, shift: 'morning' },
  { name: 'Karthik S.', role: 'Academic Counsellor', departmentCode: 'ADM', branchName: 'Gandhipuram', assigned: 22, completed: 17, pending: 5, quality: 79, shift: 'general' },
  { name: 'Revathi K.', role: 'Senior Faculty (CPC SME)', departmentCode: 'ACAD', branchName: 'Gandhipuram', assigned: 30, completed: 27, pending: 3, quality: 92, shift: 'morning' },
  { name: 'Manjunath R.', role: 'Faculty (CPMA SME)', departmentCode: 'ACAD', branchName: 'Hopes', assigned: 26, completed: 21, pending: 5, quality: 85, shift: 'general' },
  { name: 'Divya M.', role: 'Mentorship Lead', departmentCode: 'SUCC', branchName: 'Salem', assigned: 18, completed: 16, pending: 2, quality: 90, shift: 'general' },
  { name: 'Arjun P.', role: 'Exam Coordinator', departmentCode: 'EXAM', branchName: 'Trichy', assigned: 20, completed: 18, pending: 2, quality: 87, shift: 'evening' },
  { name: 'Lakshmi N.', role: 'Placement Associate', departmentCode: 'CORP', branchName: 'Ameerpet', assigned: 15, completed: 11, pending: 4, quality: 81, shift: 'general' },
  { name: 'Suresh Babu', role: 'RCM Trainer (CPB SME)', departmentCode: 'ACAD', branchName: 'Dilsukhnagar', assigned: 24, completed: 19, pending: 5, quality: 83, shift: 'morning' },
  { name: 'Priyadharshini K.', role: 'Faculty (CIC SME)', departmentCode: 'ACAD', branchName: 'Kochi', assigned: 28, completed: 25, pending: 3, quality: 91, shift: 'general' },
  { name: 'Balaji R.', role: 'HR Coordinator', departmentCode: 'HR', branchName: 'Trivandrum', assigned: 12, completed: 10, pending: 2, quality: 86, shift: 'general' },
  { name: 'Dinesh P.', role: 'IT & LMS Support', departmentCode: 'SYS', branchName: 'Vizag', assigned: 16, completed: 13, pending: 3, quality: 84, shift: 'general' },
  { name: 'Kavitha V.', role: 'Branch Finance Officer', departmentCode: 'FIN', branchName: 'Kollapur', assigned: 14, completed: 12, pending: 2, quality: 88, shift: 'morning' },
  { name: 'Meenakshi R.', role: 'Placement Cell Head', departmentCode: 'CORP', branchName: 'Pune', assigned: 19, completed: 15, pending: 4, quality: 89, shift: 'general' },
  { name: 'Pooja J.', role: 'Admissions Counsellor', departmentCode: 'ADM', branchName: 'Theni', assigned: 21, completed: 18, pending: 3, quality: 90, shift: 'evening' }
];

let leadershipSeeded = false;
async function ensureLeadershipSeed() {
  if (leadershipSeeded) return;
  const [aCount, eCount, tCount] = await Promise.all([
    Approval.countDocuments(),
    Escalation.countDocuments(),
    TeamMember.countDocuments()
  ]);
  if (aCount === 0) await Approval.insertMany(SEED_APPROVALS);
  if (eCount === 0) await Escalation.insertMany(SEED_ESCALATIONS);
  if (tCount === 0) await TeamMember.insertMany(SEED_TEAM);
  leadershipSeeded = true;
}

// Org-wide summary for the Operational Head command view
router.get('/leadership/summary', async (req, res) => {
  try {
    await ensureLeadershipSeed();
    const [pendingApprovals, openEscalations] = await Promise.all([
      Approval.countDocuments({ status: 'pending' }),
      Escalation.countDocuments({ status: { $nin: ['resolved', 'closed'] } })
    ]);
    res.json({ pendingApprovals, openEscalations });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Approvals
router.get('/leadership/approvals', async (req, res) => {
  try {
    await ensureLeadershipSeed();
    const { departmentCode, branchName, status } = req.query;
    const query = {};
    if (departmentCode) query.departmentCode = departmentCode;
    if (branchName) query.branchName = branchName;
    if (status) query.status = status;
    const approvals = await Approval.find(query).sort({ createdAt: -1 });
    res.json(approvals);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/leadership/approvals', async (req, res) => {
  try {
    const created = await Approval.create(req.body);
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/leadership/approvals/:id/decision', async (req, res) => {
  try {
    const { action, decidedBy } = req.body; // action: 'approved' | 'rejected'
    const updated = await Approval.findByIdAndUpdate(
      req.params.id,
      { status: action, decidedBy: decidedBy || 'Ganesh N.', decidedAt: new Date() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Approval not found' });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Escalations
router.get('/leadership/escalations', async (req, res) => {
  try {
    await ensureLeadershipSeed();
    const { departmentCode, branchName, status } = req.query;
    const query = {};
    if (departmentCode) query.departmentCode = departmentCode;
    if (branchName) query.branchName = branchName;
    if (status) query.status = status;
    const escalations = await Escalation.find(query).sort({ createdAt: -1 });
    res.json(escalations);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/leadership/escalations', async (req, res) => {
  try {
    const created = await Escalation.create(req.body);
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/leadership/escalations/:id/status', async (req, res) => {
  try {
    const { action } = req.body; // action: 'resolved' | 'escalated' | 'in-progress'
    const update = { status: action };
    if (action === 'resolved' || action === 'closed') update.resolvedAt = new Date();
    const updated = await Escalation.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'Escalation not found' });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Team / Roster
router.get('/leadership/team', async (req, res) => {
  try {
    await ensureLeadershipSeed();
    const { departmentCode, branchName } = req.query;
    const query = {};
    if (departmentCode) query.departmentCode = departmentCode;
    if (branchName) query.branchName = branchName;
    const team = await TeamMember.find(query).sort({ quality: -1 });
    res.json(team);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/leadership/team/:id/shift', async (req, res) => {
  try {
    const { shift } = req.body;
    const updated = await TeamMember.findByIdAndUpdate(req.params.id, { shift }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Team member not found' });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Attendance
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

router.get('/leadership/attendance/branch/:branchName', async (req, res) => {
  try {
    await ensureLeadershipSeed();
    const branchName = req.params.branchName;
    const date = todayStr();
    const team = await TeamMember.find({ branchName });
    const existing = await Attendance.find({ branchName, date });
    const byName = {};
    existing.forEach((r) => { byName[r.employeeName] = r; });
    const rows = team.map((m) => byName[m.name] || { branchName, employeeName: m.name, date, status: 'absent', checkIn: null, checkOut: null, hoursWorked: 0 });
    res.json({
      date,
      total: rows.length,
      present: rows.filter((r) => r.status === 'in' || r.status === 'break').length,
      rows
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/leadership/attendance/org-summary', async (req, res) => {
  try {
    await ensureLeadershipSeed();
    const date = todayStr();
    const team = await TeamMember.find();
    const existing = await Attendance.find({ date });
    const byKey = {};
    existing.forEach((r) => { byKey[`${r.branchName}::${r.employeeName}`] = r; });
    let present = 0;
    let absent = 0;
    team.forEach((m) => {
      const rec = byKey[`${m.branchName}::${m.name}`];
      if (rec && (rec.status === 'in' || rec.status === 'break')) present += 1;
      else absent += 1;
    });
    res.json({ date, total: team.length, present, absent, attendanceRate: team.length ? Math.round((present / team.length) * 100) : 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/leadership/attendance/by-branch', async (req, res) => {
  try {
    await ensureLeadershipSeed();
    const date = todayStr();
    const [team, existing] = await Promise.all([TeamMember.find(), Attendance.find({ date })]);
    const byKey = {};
    existing.forEach((r) => { byKey[`${r.branchName}::${r.employeeName}`] = r; });
    const byBranch = {};
    team.forEach((m) => {
      const key = m.branchName || 'Unassigned';
      if (!byBranch[key]) byBranch[key] = { branchName: key, total: 0, present: 0, absent: 0 };
      byBranch[key].total += 1;
      const rec = byKey[`${m.branchName}::${m.name}`];
      if (rec && (rec.status === 'in' || rec.status === 'break')) byBranch[key].present += 1;
      else byBranch[key].absent += 1;
    });
    const rows = Object.values(byBranch).map((r) => ({ ...r, rate: r.total ? Math.round((r.present / r.total) * 100) : 0 }));
    res.json({ date, rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/leadership/attendance/clock-in', async (req, res) => {
  try {
    const { branchName, employeeName } = req.body;
    const date = todayStr();
    const checkIn = new Date().toTimeString().slice(0, 5);
    const updated = await Attendance.findOneAndUpdate(
      { branchName, employeeName, date },
      { branchName, employeeName, date, checkIn, status: 'in' },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/leadership/attendance/clock-out', async (req, res) => {
  try {
    const { branchName, employeeName } = req.body;
    const date = todayStr();
    const record = await Attendance.findOne({ branchName, employeeName, date });
    const checkOut = new Date().toTimeString().slice(0, 5);
    let hoursWorked = 0;
    if (record && record.checkIn) {
      const [inH, inM] = record.checkIn.split(':').map(Number);
      const [outH, outM] = checkOut.split(':').map(Number);
      hoursWorked = Math.max(0, Math.round((outH * 60 + outM - (inH * 60 + inM)) / 6) / 10);
    }
    const updated = await Attendance.findOneAndUpdate(
      { branchName, employeeName, date },
      { branchName, employeeName, date, checkOut, status: 'out', hoursWorked },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/leadership/attendance/break', async (req, res) => {
  try {
    const { branchName, employeeName, onBreak } = req.body;
    const date = todayStr();
    const updated = await Attendance.findOneAndUpdate(
      { branchName, employeeName, date },
      { branchName, employeeName, date, status: onBreak ? 'break' : 'in' },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
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

router.get('/students/:id', async (req, res) => {
  try {
    const isObjectId = mongoose.isValidObjectId(req.params.id);
    const student = await Student.findOne({
      $or: [
        ...(isObjectId ? [{ _id: req.params.id }] : []),
        { studentId: req.params.id },
        { email: req.params.id }
      ]
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
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

// Helper to convert time string like "6:00 AM", "17:00", "2:30 PM" to minutes from midnight
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const s = timeStr.trim().toLowerCase();

  // 12-hour format with AM/PM (e.g., "6:00 AM", "2:30 PM", "9 AM")
  const ampmMatch = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const mins = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const period = ampmMatch[3];
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    return hours * 60 + mins;
  }

  // 24-hour format (e.g., "17:00", "09:30")
  const h24Match = s.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    const hours = parseInt(h24Match[1], 10);
    const mins = parseInt(h24Match[2], 10);
    return hours * 60 + mins;
  }

  // Embedded time substring (e.g., "Today 11:00 AM", "17:00")
  const embeddedMatch = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (embeddedMatch) {
    let hours = parseInt(embeddedMatch[1], 10);
    const mins = embeddedMatch[2] ? parseInt(embeddedMatch[2], 10) : 0;
    const period = embeddedMatch[3];
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    return hours * 60 + mins;
  }

  return null;
}

// Helper to extract { startMin, endMin } from slot string like "6:00–8:00 AM", "4:00–6:00 PM"
function parseSlotToRange(slotStr) {
  if (!slotStr) return null;
  const s = slotStr.replace(/[–—]/g, '-').trim();
  const parts = s.split('-');
  if (parts.length === 2) {
    let startPart = parts[0].trim();
    let endPart = parts[1].trim();

    const endHasAmPm = /am|pm/i.test(endPart);
    if (endHasAmPm && !/am|pm/i.test(startPart)) {
      const period = endPart.toLowerCase().includes('pm') ? 'PM' : 'AM';
      const startHour = parseInt(startPart, 10);
      const endHour = parseInt(endPart, 10);
      if (period === 'PM' && startHour > endHour && startHour !== 12) {
        startPart = `${startPart} AM`;
      } else {
        startPart = `${startPart} ${period}`;
      }
    }

    const startMin = parseTimeToMinutes(startPart);
    const endMin = parseTimeToMinutes(endPart);
    if (startMin !== null && endMin !== null) {
      return { startMin, endMin };
    }
  }

  const singleMin = parseTimeToMinutes(slotStr);
  if (singleMin !== null) {
    return { startMin: singleMin, endMin: singleMin + 60 };
  }

  return null;
}

// Configurable Trainer Roster with Experience, Shifts, and Scheduled Classes
let inMemoryTrainerSettings = {
  'TR-CBG-001': {
    trainerId: 'TR-CBG-001',
    trainerName: 'Revathi K',
    courseKey: 'CPC',
    expertCourse: 'CPC — Certified Professional Coder',
    specialization: 'Anatomy, ICD-10-CM & CPT Surgery Coding Specialist',
    isExperienced: true,
    experienceLevel: 'Experienced (6+ Yrs)',
    shift: '6:00 AM – 2:00 PM',
    shiftStartMin: 360, // 06:00 AM
    shiftEndMin: 840,   // 02:00 PM
    scheduledClasses: [
      { name: 'CPC — Medical Coding Core (Batch 01)', timeSlot: '6:00–8:00 AM', startMin: 360, endMin: 480 },
      { name: 'ICD-10-CM Coding & Guidelines', timeSlot: '8:00–9:30 AM', startMin: 480, endMin: 570 },
      { name: 'CPT Surgery & Modifiers Workshop', timeSlot: '12:00–1:30 PM', startMin: 720, endMin: 810 }
    ]
  },
  'TR-CBG-002': {
    trainerId: 'TR-CBG-002',
    trainerName: 'Priyadharshini K.',
    courseKey: 'CIC',
    expertCourse: 'CIC — Certified Inpatient Coder',
    specialization: 'Inpatient Coding, ICD-10-PCS & IPDRG Specialist',
    isExperienced: true,
    experienceLevel: 'Experienced (5+ Yrs)',
    shift: '9:00 AM – 5:00 PM',
    shiftStartMin: 540, // 09:00 AM
    shiftEndMin: 1020,  // 05:00 PM
    scheduledClasses: [
      { name: 'CIC Inpatient Hospital PCS Lab', timeSlot: '9:00–11:00 AM', startMin: 540, endMin: 660 },
      { name: 'IPDRG Grouping & Case Studies', timeSlot: '1:00–3:00 PM', startMin: 780, endMin: 900 }
    ]
  },
  'TR-CBG-003': {
    trainerId: 'TR-CBG-003',
    trainerName: 'Suresh Babu',
    courseKey: 'CPB',
    expertCourse: 'CPB — Certified Professional Biller',
    specialization: 'US Healthcare RCM & Hospital Billing Specialist',
    isExperienced: true,
    experienceLevel: 'Experienced (7+ Yrs)',
    shift: '8:00 AM – 4:00 PM',
    shiftStartMin: 480, // 08:00 AM
    shiftEndMin: 960,   // 04:00 PM
    scheduledClasses: [
      { name: 'CPB Healthcare Billing & Claims', timeSlot: '8:00–10:00 AM', startMin: 480, endMin: 600 },
      { name: 'RCM Denial Management', timeSlot: '1:00–2:30 PM', startMin: 780, endMin: 870 }
    ]
  },
  'TR-CBG-004': {
    trainerId: 'TR-CBG-004',
    trainerName: 'Manjunath R.',
    courseKey: 'CPMA',
    expertCourse: 'CPMA — Certified Professional Medical Auditor',
    specialization: 'Chart Auditing, Compliance & HCPCS Specialist',
    isExperienced: true,
    experienceLevel: 'Experienced (8+ Yrs)',
    shift: '10:00 AM – 6:00 PM',
    shiftStartMin: 600, // 10:00 AM
    shiftEndMin: 1080,  // 06:00 PM
    scheduledClasses: [
      { name: 'CPMA Chart Auditing Fundamentals', timeSlot: '10:00–12:00 PM', startMin: 600, endMin: 720 },
      { name: 'AAPC Regulatory Compliance Drills', timeSlot: '2:00–4:00 PM', startMin: 840, endMin: 960 }
    ]
  },
  'TR-ACAD-001': {
    trainerId: 'TR-ACAD-001',
    trainerName: 'Dr. Vikram C.',
    courseKey: 'CRC',
    expertCourse: 'CRC — Certified Risk Adjustment Coder',
    specialization: 'HCC Risk Adjustment & Value-Based Healthcare Specialist',
    isExperienced: true,
    experienceLevel: 'Experienced (10+ Yrs Chief)',
    shift: '7:00 AM – 3:00 PM',
    shiftStartMin: 420, // 07:00 AM
    shiftEndMin: 900,   // 03:00 PM
    scheduledClasses: [
      { name: 'CRC Risk Adjustment Masterclass', timeSlot: '7:00–9:00 AM', startMin: 420, endMin: 540 },
      { name: 'COC Outpatient Procedures Review', timeSlot: '12:30–2:00 PM', startMin: 750, endMin: 840 }
    ]
  },
  'TR-ACAD-002': {
    trainerId: 'TR-ACAD-002',
    trainerName: 'Karthik V.',
    courseKey: 'CCS',
    expertCourse: 'CCS — Certified Coding Specialist',
    specialization: 'AHIMA Inpatient & Outpatient Hospital Specialist',
    isExperienced: true,
    experienceLevel: 'Experienced (6+ Yrs)',
    shift: '9:00 AM – 5:00 PM',
    shiftStartMin: 540, // 09:00 AM
    shiftEndMin: 1020,  // 05:00 PM
    scheduledClasses: [
      { name: 'AHIMA CCS Clinical Documentation', timeSlot: '9:00–11:00 AM', startMin: 540, endMin: 660 },
      { name: 'Inpatient PCS Code Building', timeSlot: '2:00–3:30 PM', startMin: 840, endMin: 930 }
    ]
  },
  'TR-KL-001': {
    trainerId: 'TR-KL-001',
    trainerName: 'Anjali Nair',
    courseKey: 'EMCT',
    expertCourse: 'EMCT Intermediate & Medical Terminology',
    specialization: 'Medical Terminology & Foundational Physiology',
    isExperienced: true,
    experienceLevel: 'Experienced (4+ Yrs)',
    shift: '8:00 AM – 4:00 PM',
    shiftStartMin: 480, // 08:00 AM
    shiftEndMin: 960,   // 04:00 PM
    scheduledClasses: [
      { name: 'Anatomy & Medical Terminology Foundation', timeSlot: '8:00–10:00 AM', startMin: 480, endMin: 600 }
    ]
  }
};

// Evaluate the 4 strict notification rules
function evaluateDemoNotificationEligibility(trainer, slotStr) {
  // Condition 1: Experienced Trainer
  if (!trainer.isExperienced) {
    return {
      eligible: false,
      reason: `Blocked: Trainer ${trainer.trainerName} is not marked as Experienced in settings. Notification not sent.`,
      conflictType: 'NOT_EXPERIENCED'
    };
  }

  // Parse demo slot
  const range = parseSlotToRange(slotStr);
  if (!range) {
    return {
      eligible: true,
      reason: 'Slot time pending standard parsing · Dispatched under default shift window.',
      conflictType: null
    };
  }

  const { startMin, endMin } = range;

  // Condition 4: Outside Shift Time
  if (startMin < trainer.shiftStartMin || endMin > trainer.shiftEndMin) {
    return {
      eligible: false,
      reason: `Blocked: Demo session (${slotStr}) is outside trainer's configured shift (${trainer.shift}). Notification not sent.`,
      conflictType: 'OUTSIDE_SHIFT'
    };
  }

  // Condition 2: Trainer Has a Class During the Demo Time (Overlap check)
  const overlappingClass = (trainer.scheduledClasses || []).find(cls => {
    return Math.max(startMin, cls.startMin) < Math.min(endMin, cls.endMin);
  });

  if (overlappingClass) {
    return {
      eligible: false,
      reason: `Blocked: Trainer already has scheduled class "${overlappingClass.name}" (${overlappingClass.timeSlot}) overlapping with demo (${slotStr}). Notification not sent.`,
      conflictType: 'CLASS_CONFLICT',
      conflictingClass: overlappingClass.name
    };
  }

  // Condition 3: Experienced + Within Shift + No Class During Demo Time
  return {
    eligible: true,
    reason: `Delivered: Trainer is Experienced · Within shift (${trainer.shift}) · No class conflict during ${slotStr}. Notification sent!`,
    conflictType: null
  };
}

const getExpertTrainerForCourse = (courseInput = '') => {
  const normalized = courseInput.toUpperCase();
  if (normalized.includes('CIC') || normalized.includes('INPATIENT')) {
    return inMemoryTrainerSettings['TR-CBG-002'];
  }
  if (normalized.includes('CPB') || normalized.includes('BILLING') || normalized.includes('RCM')) {
    return inMemoryTrainerSettings['TR-CBG-003'];
  }
  if (normalized.includes('CPMA') || normalized.includes('AUDIT')) {
    return inMemoryTrainerSettings['TR-CBG-004'];
  }
  if (normalized.includes('CCS')) {
    return inMemoryTrainerSettings['TR-ACAD-002'];
  }
  if (normalized.includes('CRC') || normalized.includes('RISK')) {
    return inMemoryTrainerSettings['TR-ACAD-001'];
  }
  if (normalized.includes('COC') || normalized.includes('OUTPATIENT')) {
    return inMemoryTrainerSettings['TR-ACAD-001'];
  }
  if (normalized.includes('EMCT') || normalized.includes('TERMINOLOGY')) {
    return inMemoryTrainerSettings['TR-KL-001'];
  }
  if (normalized.includes('IPDRG')) {
    return inMemoryTrainerSettings['TR-CBG-002'];
  }
  // Default to CPC Faculty Expert
  return inMemoryTrainerSettings['TR-CBG-001'];
};

// Trainer Settings Endpoints
router.get('/trainer/settings', (req, res) => {
  res.json(inMemoryTrainerSettings);
});

router.put('/trainer/settings/:id', (req, res) => {
  const { id } = req.params;
  if (!inMemoryTrainerSettings[id]) {
    inMemoryTrainerSettings[id] = { trainerId: id, ...req.body };
  } else {
    inMemoryTrainerSettings[id] = { ...inMemoryTrainerSettings[id], ...req.body };
  }
  res.json(inMemoryTrainerSettings[id]);
});

const SEED_INITIAL_DEMOS = [
  {
    candidateName: 'Keerthana R.',
    phone: '98421 65042',
    course: 'CPC Intensive Medical Coding',
    mode: 'Online (Zoom Live)',
    preferredDate: new Date().toISOString().split('T')[0],
    time: 'Today 10:30 AM',
    timeSlot: '10:00–11:30 AM',
    language: 'Tamil',
    trainer: 'Revathi K',
    trainerId: 'TR-CBG-001',
    trainerRole: 'Anatomy, ICD-10-CM & CPT Surgery Specialist',
    expertCourse: 'CPC — Certified Professional Coder',
    isExpertMatched: true,
    isExperienced: true,
    shiftTiming: '6:00 AM – 2:00 PM',
    hasConflict: false,
    notificationSent: true,
    notificationSentTo: 'TR-CBG-001',
    notificationSentToName: 'Revathi K',
    notificationRead: false,
    priority: 'Urgent - Subject Matter Expert First',
    status: 'booked',
    trainerMapping: '★ Notification Sent: Experienced Trainer · Within Shift (6:00 AM – 2:00 PM) · Zero Class Conflict'
  },
  {
    candidateName: 'Ajith Kumar A.',
    phone: '63801 18356',
    course: 'CPC — Medical Coding Core',
    mode: 'Online (Zoom Live)',
    preferredDate: new Date().toISOString().split('T')[0],
    time: 'Today 7:00 AM',
    timeSlot: '6:00–8:00 AM',
    language: 'Tamil',
    trainer: 'Revathi K',
    trainerId: 'TR-CBG-001',
    trainerRole: 'Anatomy, ICD-10-CM & CPT Surgery Specialist',
    expertCourse: 'CPC — Certified Professional Coder',
    isExpertMatched: true,
    isExperienced: true,
    shiftTiming: '6:00 AM – 2:00 PM',
    hasConflict: true,
    conflictReason: 'Trainer has scheduled class "CPC Morning Batch (6:00–8:00 AM)"',
    notificationSent: false,
    notificationBlockReason: 'Blocked: Trainer already has scheduled class "CPC — Medical Coding Core" (6:00–8:00 AM) overlapping with demo (6:00–8:00 AM). Notification not sent.',
    priority: 'Standard - No Alert Dispatched',
    status: 'booked',
    trainerMapping: '🔕 Notification Not Sent: Trainer has scheduled class "CPC — Medical Coding Core" overlapping with demo time.'
  },
  {
    candidateName: 'Dharshini S.',
    phone: '98402 88987',
    course: 'CIC — Certified Inpatient Coder',
    mode: 'Online (Zoom Live)',
    preferredDate: new Date().toISOString().split('T')[0],
    time: 'Today 11:30 AM',
    timeSlot: '11:00 AM–1:00 PM',
    language: 'Tamil',
    trainer: 'Priyadharshini K.',
    trainerId: 'TR-CBG-002',
    trainerRole: 'Inpatient Coding, ICD-10-PCS & IPDRG Specialist',
    expertCourse: 'CIC — Certified Inpatient Coder',
    isExpertMatched: true,
    isExperienced: true,
    shiftTiming: '9:00 AM – 5:00 PM',
    hasConflict: false,
    notificationSent: true,
    notificationSentTo: 'TR-CBG-002',
    notificationSentToName: 'Priyadharshini K.',
    notificationRead: false,
    priority: 'Urgent - Subject Matter Expert First',
    status: 'booked',
    trainerMapping: '★ Notification Sent: Experienced Trainer · Within Shift (9:00 AM – 5:00 PM) · Zero Class Conflict'
  }
];

// ==========================================
// REAL DEMOS API WITH EXPERT TRAINER ROUTING & NOTIFICATION RULES
// ==========================================
router.get('/demos', async (req, res) => {
  try {
    let demos = await Demo.find().sort({ createdAt: -1 });
    if (demos.length === 0) {
      await Demo.insertMany(SEED_INITIAL_DEMOS);
      demos = await Demo.find().sort({ createdAt: -1 });
    }
    res.json(demos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/demos', async (req, res) => {
  try {
    const rawData = req.body || {};
    const course = rawData.course || rawData.subject || 'CPC';
    
    // 1. Resolve designated expert trainer
    let expert = (rawData.trainerId && inMemoryTrainerSettings[rawData.trainerId])
      ? inMemoryTrainerSettings[rawData.trainerId]
      : getExpertTrainerForCourse(course);

    // Allow request to override isExperienced or shift if explicitly supplied
    if (rawData.isExperienced !== undefined) {
      expert = { ...expert, isExperienced: Boolean(rawData.isExperienced) };
    }

    const demoSlot = rawData.timeSlot || rawData.time || '10:00–11:30 AM';

    // 2. Evaluate Final Notification Rule:
    // Trainer = Experienced + Demo time is within trainer's shift + Trainer has no class during the demo time
    const evaluation = evaluateDemoNotificationEligibility(expert, demoSlot);

    console.log(`[DEMO NOTIFICATION EVALUATION] Trainer: ${expert.trainerName} | Slot: ${demoSlot} | Result: ${evaluation.eligible ? 'DELIVERED' : 'BLOCKED'} | Reason: ${evaluation.reason}`);

    const enrichedPayload = {
      ...rawData,
      candidateName: rawData.candidateName || rawData.studentName || rawData.name || 'Prospective Student',
      phone: rawData.phone || rawData.mobile || '+91 98400 00000',
      course: course,
      trainer: expert.trainerName,
      trainerId: expert.trainerId,
      trainerRole: expert.specialization,
      expertCourse: expert.expertCourse,
      isExpertMatched: true,
      
      // Strict Notification Decision Fields
      isExperienced: expert.isExperienced,
      shiftTiming: expert.shift,
      notificationSent: evaluation.eligible,
      notificationSentTo: evaluation.eligible ? expert.trainerId : null,
      notificationSentToName: evaluation.eligible ? expert.trainerName : null,
      notificationSentAt: evaluation.eligible ? new Date() : null,
      notificationRead: false,
      notificationBlockReason: evaluation.eligible ? '' : evaluation.reason,
      hasConflict: evaluation.conflictType === 'CLASS_CONFLICT',
      conflictReason: evaluation.eligible ? '' : evaluation.reason,
      priority: evaluation.eligible ? 'Urgent - Subject Matter Expert First' : 'Standard - No Alert Dispatched',
      
      trainerMapping: evaluation.eligible 
        ? `★ Notification Sent to ${expert.trainerName}: Experienced · Within Shift (${expert.shift}) · No Class Conflict`
        : `🔕 Notification Not Sent: ${evaluation.reason}`,
      status: rawData.status || 'booked'
    };

    const newDemo = new Demo(enrichedPayload);
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

router.put('/demos/:id/acknowledge', async (req, res) => {
  try {
    const updated = await Demo.findByIdAndUpdate(
      req.params.id,
      { $set: { notificationRead: true, status: 'confirmed', acknowledgedAt: new Date() } },
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

// Registered Academy Trainer Account (Srithar S)
const TRAINER_ACCOUNTS = {
  'srithar.brandforge@gmail.com': {
    id: 'TR-CBG-001',
    trainerId: 'TR-CBG-001',
    name: 'Srithar S',
    userName: 'Srithar S',
    email: 'srithar.brandforge@gmail.com',
    password: 'Thoughtflows@2026',
    department: 'training',
    departmentCode: 'ACAD',
    departmentName: 'Training & Faculty Department',
    role: 'Trainer',
    courseKey: 'CPC',
    course: 'CPC — Certified Professional Coder',
    expertCourse: 'CPC — Certified Professional Coder',
    specialization: 'Medical Coding Faculty',
    branch: 'Gandhipuram',
    shift: '6:00 AM – 2:00 PM',
    shiftStartMin: 360,
    shiftEndMin: 840,
    color: '#00897b'
  }
};

router.get('/auth/departments', (req, res) => {
  res.json(DEPARTMENT_PORTALS);
});

router.get('/auth/trainers', (req, res) => {
  res.json(Object.values(TRAINER_ACCOUNTS));
});

const mapRoleOrDeptToDashboard = (role = '', department = '') => {
  const r = (role || '').toLowerCase();
  const d = (department || '').toLowerCase();

  if (r.includes('trainer') || r.includes('faculty') || d.includes('faculty') || d.includes('training')) {
    return {
      department: 'training',
      departmentCode: 'ACAD',
      departmentName: 'Training & Faculty Department',
      color: '#0284c7'
    };
  }
  if (r.includes('admin') || d.includes('admin')) {
    return {
      department: 'admin',
      departmentCode: 'ADM',
      departmentName: 'Admin & Management',
      color: '#4338ca'
    };
  }
  if (r.includes('counsel') || r.includes('advisor') || d.includes('counsel') || d.includes('admission') || d === 'hr') {
    return {
      department: 'hr',
      departmentCode: 'HR',
      departmentName: 'HR & Counseling',
      color: '#ea580c'
    };
  }
  if (r.includes('placement') || d.includes('placement') || d.includes('cccp')) {
    return {
      department: 'cccp',
      departmentCode: 'CCCP',
      departmentName: 'Corporate Career & Placement Cell (CCCP)',
      color: '#059669'
    };
  }
  if (r.includes('growth') || r.includes('marketing') || d.includes('marketing')) {
    return {
      department: 'marketing',
      departmentCode: 'MKT',
      departmentName: 'Growth & Digital Marketing',
      color: '#9333ea'
    };
  }
  if (r.includes('regional') || r.includes('operations') || r.includes('leadership') || d.includes('leadership')) {
    return {
      department: 'leadership',
      departmentCode: 'LEAD',
      departmentName: 'Leadership & Regional Operations Hub',
      color: '#ea580c'
    };
  }
  if (r.includes('student') || r.includes('scholar') || d.includes('student')) {
    return {
      department: 'student',
      departmentCode: 'STU',
      departmentName: 'Student Learning & Exam Portal',
      color: '#0d9488'
    };
  }
  return {
    department: 'training',
    departmentCode: 'ACAD',
    departmentName: 'Training Department',
    color: '#0284c7'
  };
};

router.post('/auth/login', async (req, res) => {
  const { email, password, department } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both email and password.'
    });
  }

  const normalizedEmail = (email || '').trim().toLowerCase();

  // 1. Check MongoDB User model first (contains real seeded and admin-created accounts)
  try {
    const dbUser = await User.findOne({ email: normalizedEmail });
    if (dbUser) {
      if (dbUser.password && dbUser.password !== password) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password. Please check your credentials.'
        });
      }
      const mapping = mapRoleOrDeptToDashboard(dbUser.role, dbUser.department);
      return res.json({
        success: true,
        message: `Authenticated successfully for ${dbUser.name} (${dbUser.role})`,
        user: {
          id: dbUser._id ? dbUser._id.toString() : (dbUser.id || 'usr_' + Date.now()),
          name: dbUser.name,
          userName: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          branch: dbUser.branch || 'Gandhipuram',
          status: dbUser.status || 'Active',
          department: mapping.department,
          departmentCode: mapping.departmentCode,
          departmentName: mapping.departmentName,
          color: mapping.color,
          token: `jwt_tf_${dbUser.role}_${Date.now()}`
        }
      });
    }
  } catch (e) {
    console.warn('DB User lookup warning in /auth/login:', e.message);
  }

  // 2. Training Account Direct Verification (Srithar S)
  const trainerUser = TRAINER_ACCOUNTS[normalizedEmail];
  if (trainerUser) {
    if (trainerUser.password && password !== trainerUser.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please check your credentials.'
      });
    }
    return res.json({
      success: true,
      message: `Authenticated successfully for ${trainerUser.name} (${trainerUser.role})`,
      user: {
        ...trainerUser,
        department: 'training',
        token: `jwt_tf_trainer_${trainerUser.id}_token`
      }
    });
  }

  // 3. Fallback SEED_USERS verification
  const seedUser = SEED_USERS.find(u => u.email.toLowerCase() === normalizedEmail);
  if (seedUser) {
    if (seedUser.password && password !== seedUser.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please check your credentials.'
      });
    }
    const mapping = mapRoleOrDeptToDashboard(seedUser.role, seedUser.department);
    return res.json({
      success: true,
      message: `Authenticated successfully for ${seedUser.name} (${seedUser.role})`,
      user: {
        id: `usr_${Date.now()}`,
        name: seedUser.name,
        userName: seedUser.name,
        email: seedUser.email,
        role: seedUser.role,
        branch: seedUser.branch || 'Gandhipuram',
        status: seedUser.status || 'Active',
        department: mapping.department,
        departmentCode: mapping.departmentCode,
        departmentName: mapping.departmentName,
        color: mapping.color,
        token: `jwt_tf_${seedUser.role}_${Date.now()}`
      }
    });
  }

  // 4. Admin Management Authentication
  if (normalizedEmail === 'admin@thoughtflows.in' || normalizedEmail === 'admin') {
    const validAdminPasswords = ['admin123', 'Admin@2026', 'Admin@HQ2026'];
    if (!validAdminPasswords.includes(password)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin password. Default password is admin123'
      });
    }

    return res.json({
      success: true,
      message: 'Authenticated successfully for Executive Admin',
      user: {
        id: 'usr_1',
        name: 'Executive Founders Desk',
        userName: 'Executive Founders Desk',
        email: 'admin@thoughtflows.in',
        department: 'admin',
        departmentCode: 'ADM',
        departmentName: 'Admin & Management',
        role: 'Super Admin',
        branch: 'Thoughtflows Group HQ',
        color: '#4338ca',
        token: 'jwt_tf_admin_token_2026'
      }
    });
  }

  // 5. Check Student collection
  try {
    const student = await Student.findOne({ email: normalizedEmail });
    if (student) {
      return res.json({
        success: true,
        message: `Authenticated successfully for ${student.name} (Student)`,
        user: {
          id: student._id?.toString() || student.studentId,
          studentId: student.studentId,
          name: student.name,
          userName: student.name,
          email: student.email,
          role: 'Student Scholar',
          department: 'student',
          departmentCode: 'STU',
          departmentName: 'Student Learning & Exam Portal',
          branch: student.location || 'Gandhipuram',
          color: '#0d9488',
          token: `jwt_tf_student_${student.studentId}_token`
        }
      });
    }
  } catch (e) {}

  // 6. Default Department Portal Accounts
  const matchedDeptKey = Object.keys(DEPARTMENT_PORTALS).find(
    k => DEPARTMENT_PORTALS[k].defaultEmail.toLowerCase() === normalizedEmail
  );

  if (matchedDeptKey) {
    const dept = DEPARTMENT_PORTALS[matchedDeptKey];
    if (dept.defaultPassword && password !== dept.defaultPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please check your credentials.'
      });
    }

    return res.json({
      success: true,
      message: `Authenticated successfully for ${dept.name}`,
      user: {
        id: `usr_${dept.id}_${Date.now().toString().slice(-4)}`,
        name: dept.userName,
        userName: dept.userName,
        email: normalizedEmail,
        department: dept.id,
        departmentCode: dept.code,
        departmentName: dept.name,
        role: dept.role,
        branch: dept.branch,
        color: dept.color,
        token: `jwt_tf_${dept.id}_token_2026`
      }
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Access denied. Account is not registered in ThoughtFlows ERP.'
  });
});

// ==========================================
// REAL ADMIN & MANAGEMENT API
// ==========================================
let inMemorySlabs = [
  { id: 'slab_1', slab: 'Slab 1', range: '1 – 10 Admissions', min: 1, max: 10, rate: 500, labelRate: '₹500 / admission', status: 'Base Tier', note: 'Standard counselor qualification' },
  { id: 'slab_2', slab: 'Slab 2', range: '11 – 20 Admissions', min: 11, max: 20, rate: 700, labelRate: '₹700 / admission', status: 'Active Tier', note: 'Accelerated conversion bonus', isCurrent: true },
  { id: 'slab_3', slab: 'Slab 3', range: '21 – 25 Admissions', min: 21, max: 25, rate: 1000, labelRate: '₹1,000 / admission', status: 'High Performer', note: 'Top quartile counselor bonus' },
  { id: 'slab_4', slab: 'Slab 4', range: '26+ Admissions', min: 26, max: 999, rate: 1500, labelRate: '₹1,500 / admission + ₹8,000 Milestone Bonus', milestoneBonus: 8000, status: 'Super Performer', note: 'Executive milestone tier' }
];

let inMemoryAuditLogs = [
  { id: 'log_01', timestamp: '2026-09-16 09:38:12', user: 'Executive Admin', action: 'Incentive Slabs Verified', category: 'Policy', severity: 'Info', ip: '192.168.1.104', details: 'Slab 2 target set to 11–20 admissions at ₹700/adm' },
  { id: 'log_02', timestamp: '2026-09-16 09:24:45', user: 'Kavitha N. (HR)', action: 'Student Admission Confirmed', category: 'CRM', severity: 'Success', ip: '192.168.2.45', details: 'Enrolled Keerthana R. into Batch TF-CBE-CPC-07' },
  { id: 'log_03', timestamp: '2026-09-16 08:55:10', user: 'System (Automated)', action: 'Nightly Database Sync', category: 'System', severity: 'Info', ip: '10.0.0.1', details: 'Synced 3,970 active students & 487 leads' }
];

router.get('/admin/slabs', (req, res) => {
  res.json(inMemorySlabs);
});

router.put('/admin/slabs', (req, res) => {
  if (Array.isArray(req.body)) {
    inMemorySlabs = req.body;
  }
  res.json({ success: true, slabs: inMemorySlabs });
});

router.get('/admin/audit-logs', (req, res) => {
  res.json(inMemoryAuditLogs);
});

router.get('/admin/users', async (req, res) => {
  try {
    let users = await User.find().sort({ createdAt: -1 });
    if (!users || users.length === 0) {
      await User.insertMany(SEED_USERS);
      users = await User.find().sort({ createdAt: -1 });
    }
    const formatted = users.map(u => ({
      id: u._id.toString(),
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      password: u.password,
      role: u.role,
      department: u.department,
      branch: u.branch,
      status: u.status || 'Active',
      lastLogin: u.lastLogin || 'Never',
      avatarBg: u.avatarBg || 'bg-indigo-600'
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/users', async (req, res) => {
  try {
    const { name, email, password, role, department, branch, status, avatarBg } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    const user = new User({
      name: name || cleanEmail.split('@')[0],
      email: cleanEmail,
      password: password || 'Thoughtflows@2026',
      role: role || 'Staff',
      department: department || 'Medical Coding Faculty',
      branch: branch || 'Gandhipuram',
      status: status || 'Active',
      lastLogin: 'Never',
      avatarBg: avatarBg || 'bg-indigo-600'
    });
    await user.save();
    res.status(201).json({
      id: user._id.toString(),
      _id: user._id.toString(),
      ...user.toObject()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let user;
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findByIdAndUpdate(id, req.body, { new: true });
    } else {
      user = await User.findOneAndUpdate({ email: req.body.email }, req.body, { new: true });
    }
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.Types.ObjectId.isValid(id)) {
      await User.findByIdAndDelete(id);
    } else if (req.query.email) {
      await User.findOneAndDelete({ email: req.query.email });
    }
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// REAL TRAINER & FACULTY API
// ==========================================
let inMemoryTrainerDoubts = [
  {
    id: 'dbt-1',
    student: 'Keerthana R.',
    studentId: 'TF-CBG-CPC-OF-2603-0042',
    topic: 'ICD-10-CM',
    timeText: '14 hours ago',
    question: 'For neoplasm coding, how do I pick primary vs secondary site when pathology is pending?',
    batch: 'CPC — Certified Professional Coder (Offline)',
    slaBadge: 'SLA Normal · 24h',
    status: 'Pending',
    reply: ''
  },
  {
    id: 'dbt-2',
    student: 'Ajith Kumar A.',
    studentId: 'TFMC0Y6001',
    topic: 'E/M Coding',
    timeText: '5 hours ago',
    question: 'CPT 99213 vs 99214 — what level of Medical Decision Making (MDM) decides the code?',
    batch: 'IPDRG (Online)',
    slaBadge: 'SLA Normal · 24h',
    status: 'Pending',
    reply: ''
  },
  {
    id: 'dbt-3',
    student: 'Dharshini S.',
    studentId: 'TFMC0Y6002',
    topic: 'CPT Modifiers',
    timeText: '2 hours ago',
    question: 'When exactly is Modifier 59 used vs modifier XS for distinct anatomical procedural services?',
    batch: 'CIC (Online)',
    slaBadge: 'SLA Urgent · 12h',
    status: 'New',
    reply: ''
  },
  {
    id: 'dbt-4',
    student: 'Pooja R.',
    studentId: 'TFMC0Y6003',
    topic: 'Anatomy',
    timeText: '1 day ago',
    question: 'Are diagnostic endoscopic biopsies included in resection codes (e.g. CPT 43239)?',
    batch: 'CPC Inter (Online)',
    slaBadge: 'SLA Normal · 24h',
    status: 'Replied',
    reply: 'Diagnostic endoscopy is bundled into the surgical resection when performed in the same anatomical site during the same operative session.'
  },
  {
    id: 'dbt-5',
    student: 'MANOJ K.',
    studentId: 'TFMC0Y6007',
    topic: 'CMS-1500 & UB-04',
    timeText: '3 hours ago',
    question: 'When billing split shared E/M visits in hospital outpatient settings, which modifier applies on CMS-1500?',
    batch: 'CPB — Certified Professional Biller',
    slaBadge: 'SLA Urgent · 12h',
    status: 'New',
    reply: ''
  },
  {
    id: 'dbt-6',
    student: 'VIGNESH S.',
    studentId: 'TFMC0Y6009',
    topic: 'Compliance Audit Sampling',
    timeText: '4 hours ago',
    question: 'What is the minimum sample size formula required for RAT-STATS statistically valid random sampling in compliance audits?',
    batch: 'CPMA — Medical Auditing',
    slaBadge: 'SLA Normal · 24h',
    status: 'Pending',
    reply: ''
  }
];

let inMemoryTrainerAssessments = [
  {
    id: 'test-1',
    name: 'E/M Coding Weekly Test',
    type: 'Weekly Test',
    course: 'CPC — Medical Coding',
    batch: 'CPC — Certified Professional Coder',
    topic: 'E/M 99202–99215 MDM Matrix',
    date: '2026-09-12',
    timeLimit: '45 min',
    totalMarks: 50,
    passMark: 35,
    studentsCount: 6,
    status: 'Active',
    scores: {
      'TF-CBG-CPC-OF-2603-0042': 44,
      'TFMC0Y6001': 46,
      'TFMC0Y6002': 38,
      'TFMC0Y6003': 48,
      'TFMC0Y6004': 45,
      'TFMC0Y6005': 28
    },
    rationale: 'Modifier 25 requires a significant, separately identifiable E/M service on the same day as a minor procedure. Documentation must support independent medical decision making.'
  },
  {
    id: 'test-2',
    name: 'CPC Full AAPC Mock Exam',
    type: 'Mock Exam',
    course: 'CPC — Medical Coding',
    batch: 'All Batches',
    topic: 'Comprehensive 100-Question AAPC Pattern',
    date: '2026-09-15',
    timeLimit: '240 min',
    totalMarks: 100,
    passMark: 70,
    studentsCount: 6,
    status: 'Active',
    scores: {
      'TF-CBG-CPC-OF-2603-0042': 84,
      'TFMC0Y6001': 91,
      'TFMC0Y6002': 78,
      'TFMC0Y6003': 88,
      'TFMC0Y6004': 86,
      'TFMC0Y6005': 58
    },
    rationale: 'CPT 43239 includes biopsy. Polypectomy (CPT 43238 or 43250) on a separate lesion requires modifier 59 or XS with clear documentation of differing anatomical sites.'
  },
  {
    id: 'test-3',
    name: 'ICD-10-PCS Root Operations Assessment',
    type: 'Weekly Test',
    course: 'CIC — Certified Inpatient Coder',
    batch: 'CIC (Online)',
    topic: 'Excision vs Resection vs Destruction',
    date: '2026-09-14',
    timeLimit: '60 min',
    totalMarks: 50,
    passMark: 38,
    studentsCount: 3,
    status: 'Active',
    scores: {
      'TFMC0Y6001': 47,
      'TFMC0Y6002': 42
    },
    rationale: 'Resection cuts out all of a body part. Excision cuts out or off a portion of a body part without replacement.'
  },
  {
    id: 'test-4',
    name: 'CPB Claims & Denial Management Test',
    type: 'Weekly Test',
    course: 'CPB — Certified Professional Biller',
    batch: 'CPB — Certified Professional Biller',
    topic: 'CARC & RARC Remittance Advice Codes',
    date: '2026-09-13',
    timeLimit: '45 min',
    totalMarks: 50,
    passMark: 35,
    studentsCount: 2,
    status: 'Active',
    scores: {
      'TFMC0Y6007': 45,
      'TFMC0Y6008': 41
    },
    rationale: 'Claim Adjustment Reason Code (CARC) communicates why a claim or service line was paid differently than billed.'
  },
  {
    id: 'test-5',
    name: 'Medical Record Audit Sampling Exam',
    type: 'Mock Exam',
    course: 'CPMA — Medical Auditing',
    batch: 'CPMA — Medical Auditing',
    topic: 'OIG Work Plan Benchmarks & Compliance Ratios',
    date: '2026-09-16',
    timeLimit: '120 min',
    totalMarks: 100,
    passMark: 70,
    studentsCount: 2,
    status: 'Active',
    scores: {
      'TFMC0Y6009': 88
    },
    rationale: 'Compliance audit documentation requires medical necessity verification prior to level coding evaluation.'
  }
];

let inMemoryAttendanceRecords = {};

// GET Doubts
router.get('/trainer/doubts', (req, res) => {
  res.json(inMemoryTrainerDoubts);
});

// POST New Doubt
router.post('/trainer/doubts', (req, res) => {
  const newDoubt = {
    id: `dbt-${Date.now()}`,
    timeText: 'Just now',
    status: 'New',
    slaBadge: 'SLA Normal · 24h',
    reply: '',
    ...req.body
  };
  inMemoryTrainerDoubts.unshift(newDoubt);
  res.status(201).json(newDoubt);
});

// PUT Reply to Doubt
router.put('/trainer/doubts/:id/reply', (req, res) => {
  const { reply } = req.body;
  const item = inMemoryTrainerDoubts.find(d => d.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Doubt not found' });
  item.reply = reply;
  item.status = 'Replied';
  item.repliedAt = new Date().toISOString();
  res.json(item);
});

// GET Assessments
router.get('/trainer/assessments', (req, res) => {
  res.json(inMemoryTrainerAssessments);
});

// POST Create Assessment
router.post('/trainer/assessments', (req, res) => {
  const newTest = {
    id: `test-${Date.now()}`,
    status: 'Active',
    scores: {},
    rationale: req.body.rationale || 'AAPC guidelines and case rationale.',
    ...req.body
  };
  inMemoryTrainerAssessments.unshift(newTest);
  res.status(201).json(newTest);
});

// PUT Update Assessment Scores
router.put('/trainer/assessments/:id/scores', (req, res) => {
  const item = inMemoryTrainerAssessments.find(t => t.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Assessment not found' });
  item.scores = { ...item.scores, ...req.body.scores };
  res.json(item);
});

// PUT Update Assessment Rationale
router.put('/trainer/assessments/:id/rationale', (req, res) => {
  const item = inMemoryTrainerAssessments.find(t => t.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Assessment not found' });
  item.rationale = req.body.rationale;
  res.json(item);
});

// GET Attendance Records
router.get('/trainer/attendance', (req, res) => {
  res.json(inMemoryAttendanceRecords);
});

// POST Record Attendance
router.post('/trainer/attendance', (req, res) => {
  const { batch, date, records } = req.body;
  const key = `${batch || 'default'}_${date || new Date().toISOString().split('T')[0]}`;
  inMemoryAttendanceRecords[key] = {
    batch,
    date: date || new Date().toISOString().split('T')[0],
    records: records || {},
    updatedAt: new Date().toISOString()
  };
  res.json({ success: true, key, data: inMemoryAttendanceRecords[key] });
});

export default router;
