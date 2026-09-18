import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    default: 'student@thoughtflows.in'
  },
  course: {
    type: String,
    required: true
  },
  mode: {
    type: String,
    enum: ['Online', 'Classroom'],
    default: 'Online'
  },
  batchDate: {
    type: String,
    default: 'May 2026'
  },
  batchTiming: {
    type: String,
    default: '8-10 PM Weekdays'
  },
  qualification: {
    type: String,
    default: 'BSc Graduate'
  },
  qualTag: {
    type: String,
    default: 'Life Sci'
  },
  collegeCompany: {
    type: String,
    default: 'Coimbatore'
  },
  location: {
    type: String,
    default: 'Coimbatore'
  },
  hrName: {
    type: String,
    default: 'Kavitha N.'
  },
  source: {
    type: String,
    default: 'WALK-IN'
  },
  dob: {
    type: String,
    default: '01-01-2001'
  },
  enqDate: {
    type: String,
    default: 'May'
  },
  onboardStatus: {
    type: String,
    default: '7/7 ✓'
  },
  syllabusModule: {
    type: String,
    default: 'Module 1'
  },
  mockInterview: {
    type: String,
    default: 'Pending'
  },
  examStatus: {
    type: String,
    default: 'Not Booked'
  },
  certified: {
    type: String,
    default: 'Non-certified'
  },
  placementStatus: {
    type: String,
    default: 'In course'
  },
  feeStatus: {
    type: String,
    default: 'Fully Paid'
  },
  feeAmount: {
    type: String,
    default: '₹25,000'
  },
  courseFee: {
    type: Number,
    default: 21000
  },
  statusGroup: {
    type: String,
    enum: ['all', 'in_course', 'placed', 'on_hold'],
    default: 'in_course'
  },
  handoverStatus: {
    type: String,
    default: 'Pending Handover'
  },
  attendancePct: {
    type: Number,
    default: 92
  },
  readinessScore: {
    type: Number,
    default: 85
  },
  checklist: {
    course: { type: Boolean, default: true },
    branch: { type: Boolean, default: true },
    batchMode: { type: Boolean, default: true },
    paymentStatus: { type: Boolean, default: true },
    studentId: { type: Boolean, default: true },
    language: { type: Boolean, default: true },
    education: { type: Boolean, default: true },
    careerGoal: { type: Boolean, default: true },
    trainerNote: { type: Boolean, default: false },
    documents: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

export default mongoose.models.Student || mongoose.model('Student', studentSchema);
