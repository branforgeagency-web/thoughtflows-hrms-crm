import mongoose from 'mongoose';
import { derivePlacementFields } from '../constants/placement.js';

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
  // Course mode (Online/Classroom) can be changed only once after admission —
  // typically a student moving from offline (Classroom) to online. Once that
  // one change is used, further mode edits are blocked server-side so the
  // student completes the course in whichever mode they switched to.
  modeChangeUsed: {
    type: Boolean,
    default: false
  },
  modeChangedAt: {
    type: Date,
    default: null
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
  passoutYear: {
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
  branch: {
    type: String,
    default: ''
  },
  leadBranch: {
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
  // Structured enquiry month/date ("YYYY-MM" / "YYYY-MM-DD") — carried over
  // from the lead's own enquiryMonth/enquiryDate at admission (set from the
  // bulk upload sheet), or from the registration date for walk-ins. enqDate
  // above is kept only for older records that predate these fields.
  enquiryMonth: {
    type: String,
    default: ''
  },
  enquiryDate: {
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
  examDate: { type: String, default: '' }, // set when HR schedules the AAPC exam slot
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
  // Exam fee paid in the same transaction as the course fee, or on its own
  examPaidWithCourseFee: {
    type: Boolean,
    default: true
  },
  examTransactionId: {
    type: String,
    default: ''
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
  // Student break tracking (break request and approval)
  breakStatus: {
    type: String,
    enum: ['none', 'pending_approval', 'approved', 'completed'],
    default: 'none'
  },
  breakStartDate: { type: String, default: '' },
  breakEndDate: { type: String, default: '' },
  breakReason: { type: String, default: '' },
  breakApprovedBy: { type: String, default: '' },
  breakApprovedAt: { type: Date, default: null },
  handoverStatus: {
    type: String,
    default: 'Pending Handover'
  },
  // The pipeline lead this admission came from
  leadId: {
    type: String,
    default: ''
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
  headOfTrainer: { type: String, default: '' },
  headOfTrainerId: { type: String, default: '' },
  allocatedByHead: { type: String, default: '' },
  allocatedByHeadAt: { type: Date, default: null },
  allocatedTrainerAt: { type: Date, default: null },
  // ---- Trainer → HR / CCCP progress ----
  assessmentScore: { type: Number, default: null },
  mockScore: { type: Number, default: null },
  // ---- Mock Interview Two-Attempt Allowance & Progress Tracking ----
  mockInterviewAttemptsCount: { type: Number, default: 0 },
  mockInterviewAttempts: [
    {
      attemptNumber: { type: Number, required: true }, // 1 or 2
      requestId: { type: String, default: '' },
      date: { type: Date, default: Date.now },
      score: { type: Number, default: null },
      feedback: { type: String, default: '' },
      conductedBy: { type: String, default: '' },
      status: { type: String, default: 'Completed' },
      improvementNotes: { type: String, default: '' }
    }
  ],
  technicalScore: { type: Number, default: null },
  communicationScore: { type: Number, default: null },
  interviewPrepScore: { type: Number, default: null },
  jobReadyStatus: { type: String, default: '' },
  readinessFeedback: { type: String, default: '' },
  readinessEvaluatedBy: { type: String, default: '' },
  readinessEvaluatedAt: { type: Date, default: null },
  syllabusCompleted: { type: Boolean, default: false },
  syllabusCompletedAt: { type: Date, default: null },
  trainerRecommendation: { type: String, default: '' },
  trainerRecommendationAt: { type: Date, default: null },
  // ---- Weekly Star Rating (Attendance, Assessment, Syllabus, Participation) ----
  weeklyRating: {
    stars: { type: Number, default: 0 },
    tier: { type: String, default: '' },
    weekLabel: { type: String, default: '' },
    weekNumber: { type: Number, default: 0 },
    year: { type: Number, default: 0 },
    attendanceScore: { type: Number, default: 0 },
    assessmentScore: { type: Number, default: 0 },
    syllabusScore: { type: Number, default: 0 },
    participationScore: { type: Number, default: 0 },
    feedback: { type: String, default: '' },
    evaluatedAt: { type: Date, default: null },
    evaluatedBy: { type: String, default: '' },
    history: {
      type: [{
        weekLabel: String,
        weekNumber: Number,
        year: Number,
        stars: Number,
        tier: String,
        attendanceScore: Number,
        assessmentScore: Number,
        syllabusScore: Number,
        participationScore: Number,
        feedback: String,
        evaluatedAt: { type: Date, default: Date.now },
        evaluatedBy: String
      }],
      default: []
    }
  },
  // ---- Trainer Approval for Course Completion Certificate & Exam Approval ----
  // Policy: The respective trainer must approve course completion certificate and exam approval,
  // verifying syllabus completion, assessments, and overall readiness.
  courseCompletionApproved: { type: Boolean, default: false },
  courseCompletionApprovedAt: { type: Date, default: null },
  courseCompletionApprovedBy: { type: String, default: '' },
  courseCompletionTrainerNotes: { type: String, default: '' },
  courseCompletionStatus: { type: String, enum: ['Pending Approval', 'Approved', 'Declined'], default: 'Pending Approval' },

  // ---- Mandatory Student Seminar (every student presents before course completion) ----
  seminarCompleted: { type: Boolean, default: false },
  seminarCompletedAt: { type: Date, default: null },
  seminarEvaluatedBy: { type: String, default: '' },
  seminarFeedback: { type: String, default: '' },

  examApprovedByTrainer: { type: Boolean, default: false },
  examApprovedAt: { type: Date, default: null },
  examApprovedBy: { type: String, default: '' },
  examTrainerNotes: { type: String, default: '' },
  examApprovalStatus: { type: String, enum: ['Pending Approval', 'Approved', 'Declined'], default: 'Pending Approval' },

  trainerApprovalVerification: {
    syllabusVerified: { type: Boolean, default: false },
    syllabusCompleted: { type: Boolean, default: false },
    modulesCompletedCount: { type: Number, default: 0 },
    assessmentsVerified: { type: Boolean, default: false },
    assessmentAverage: { type: Number, default: null },
    assessmentsClearedCount: { type: Number, default: 0 },
    readinessVerified: { type: Boolean, default: false },
    readinessScore: { type: Number, default: null },
    attendancePct: { type: Number, default: null },
    jobReadyStatus: { type: String, default: '' },
    seminarVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: String, default: '' }
  },
  // Batch conversion ticket - student is permitted to raise this ticket only once
  batchConversionTicketRaised: { type: Boolean, default: false },
  batchConversionTicketAt: { type: Date, default: null },
  batchConversionTicketId: { type: String, default: '' },
  // Batch transition & history (e.g. Anatomy to Medical Coding conversion)
  batchHistory: {
    type: [{
      fromBatch: String,
      toBatch: String,
      fromTrainerId: String,
      fromTrainerName: String,
      toTrainerId: String,
      toTrainerName: String,
      transitionType: { type: String, default: 'conversion' }, // 'anatomy_to_coding' | 'regular_reassign' | 'timing_change' | 'conversion'
      transitionedAt: { type: Date, default: Date.now },
      transitionedBy: String,
      preservedSyllabusModule: String,
      notes: String,
      timing: String
    }],
    default: []
  },
  // Preserved completed modules across batch transitions
  completedModules: {
    type: [String],
    default: []
  },
  // Anatomy foundation completion tracking
  anatomyCompleted: { type: Boolean, default: false },
  anatomyCompletedAt: { type: Date, default: null },
  anatomyCompletedBy: { type: String, default: '' },
  codingBatchEnrolledAt: { type: Date, default: null },
  // Latest trainer review of the student's resume / video intro (Student Portal
  // submissions) — CCCP uses these for the "Talentera Synced" stage
  resumeStatus: { type: String, default: '' },          // '' | 'Submitted' | 'Approved' | 'Needs Revision'
  resumeReviewedAt: { type: Date, default: null },
  videoIntroStatus: { type: String, default: '' },
  videoIntroReviewedAt: { type: Date, default: null },
  remedialActions: {
    type: [{ action: String, note: String, by: String, at: Date }],
    default: []
  },
  checklist: {
    course: { type: Boolean, default: true },
    branch: { type: Boolean, default: true },
    batchMode: { type: Boolean, default: true },
    paymentStatus: { type: Boolean, default: false },
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

// Placement stage is always derived here, whichever route wrote the student
studentSchema.pre('save', function (next) {
  const changes = derivePlacementFields(this);
  Object.entries(changes).forEach(([k, v]) => this.set(k, v));
  next();
});
studentSchema.post('findOneAndUpdate', async function (res) {
  try {
    const doc = await this.model.findOne(this.getQuery());
    if (!doc) return;
    const changes = derivePlacementFields(doc);
    if (!Object.keys(changes).length) return;
    await this.model.updateOne({ _id: doc._id }, { $set: changes });
    if (res && typeof res.set === 'function' && String(res._id) === String(doc._id)) res.set(changes);
  } catch (e) {
    console.warn('placement stage sync failed:', e.message);
  }
});

export default mongoose.models.Student || mongoose.model('Student', studentSchema);
