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
  whatsappNumber: {
    type: String,
    default: ''
  },
  additionalNumber: {
    type: String,
    default: ''
  },
  alternatePhone: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
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
    default: ''
  },
  batchTiming: {
    type: String,
    default: ''
  },
  qualification: {
    type: String,
    default: ''
  },
  qualTag: {
    type: String,
    default: ''
  },
  collegeCompany: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  hrName: {
    type: String,
    default: ''
  },
  source: {
    type: String,
    default: 'WALK-IN'
  },
  dob: {
    type: String,
    default: ''
  },
  enqDate: {
    type: String,
    default: ''
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
    default: 'Pending'
  },
  feeAmount: {
    type: String,
    default: ''
  },
  courseFee: {
    type: Number,
    default: 0
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  pendingBalance: {
    type: Number,
    default: 0
  },
  paymentPlan: {
    type: String,
    default: 'Full Payment'
  },
  nextDueDate: {
    type: String,
    default: ''
  },
  examFee: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    default: ''
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
  // Filled from real class attendance recorded by the trainer (ClassAttendance)
  attendancePct: {
    type: Number,
    default: null
  },
  // Average of the trainer-entered scores (mock / technical / assessment)
  readinessScore: {
    type: Number,
    default: null
  },
  // ---- HR → Training handover & trainer allocation ----
  trainerId: { type: String, default: '' },
  trainerName: { type: String, default: '' },
  batchName: { type: String, default: '' },
  trainerNote: { type: String, default: '' },
  handedOverBy: { type: String, default: '' },
  handedOverAt: { type: Date, default: null },
  // ---- Trainer → HR / CCCP progress ----
  assessmentScore: { type: Number, default: null },
  mockScore: { type: Number, default: null },
  technicalScore: { type: Number, default: null },
  syllabusCompleted: { type: Boolean, default: false },
  syllabusCompletedAt: { type: Date, default: null },
  trainerRecommendation: { type: String, default: '' },
  trainerRecommendationAt: { type: Date, default: null },
  remedialActions: {
    type: [{ action: String, note: String, by: String, at: Date }],
    default: []
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
  },
  skills: {
    type: [String],
    default: []
  },
  // Cities the student is open to work in (set from the Student Portal)
  preferredLocations: {
    type: [String],
    default: []
  },
  certificates: {
    type: [Object],
    default: []
  },
  receipts: {
    type: [Object],
    default: []
  },
  rewardPoints: {
    type: Number,
    default: 0
  },
  interviews: {
    type: [Object],
    default: []
  },
  placementCompany: {
    type: String,
    default: ''
  },
  placementRole: {
    type: String,
    default: ''
  },
  placementPackage: {
    type: String,
    default: ''
  },
  placementStage: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.models.Student || mongoose.model('Student', studentSchema);
