import mongoose from 'mongoose';

const studentLeadSchema = new mongoose.Schema({
  fullName: {
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
  age: {
    type: String,
    default: ''
  },
  gender: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  education: {
    type: String,
    default: ''
  },
  passoutYear: {
    type: String,
    default: ''
  },
  branch: {
    type: String,
    default: ''
  },
  course: {
    type: String,
    default: ''
  },
  sourceId: {
    type: String,
    default: ''
  },
  sourceName: {
    type: String,
    default: ''
  },
  sourceTier: {
    type: String,
    default: ''
  },
  // Marketing campaign the lead came from (CAM-...) — drives campaign CPL / ROI
  campaignCode: {
    type: String,
    default: ''
  },
  sourceBadge: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: ''
  },
  stage: {
    type: String,
    enum: [
      'new',
      'contacted',
      'demo_booked',
      'demo_attended',
      'fee_followup',
      'admitted',
      'closed'
    ],
    default: 'new'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  counselorAssigned: {
    type: String,
    default: ''
  },
  followUpDate: {
    type: String,
    default: ''
  },
  followUpTime: {
    type: String,
    default: ''
  },
  followUpNote: {
    type: String,
    default: ''
  },
  callCount: {
    type: Number,
    default: 0
  },
  lastCallTime: {
    type: Date
  },
  demoBookedDate: {
    type: String
  },
  budget: {
    type: String,
    default: ''
  },
  batchTiming: {
    type: String,
    default: ''
  },
  currentRole: {
    type: String,
    default: ''
  },
  experienceYrs: {
    type: String,
    default: ''
  },
  decisionStatus: {
    type: String,
    default: ''
  },
  timeIn: {
    type: String,
    default: ''
  },
  fetchedBy: {
    type: String,
    default: ''
  },
  allocatedTo: {
    type: String,
    default: ''
  },
  // Student ID created when this lead was admitted (guards double admission)
  admittedStudentId: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  // Student referral: the enrolled student who referred this lead. When the
  // lead is admitted the referrer is credited reward points once.
  referredByStudentId: {
    type: String,
    default: ''
  },
  referredByName: {
    type: String,
    default: ''
  },
  referralRewarded: {
    type: Boolean,
    default: false
  },
  whatsappMessages: [{
    id: String,
    sender: { type: String, enum: ['counselor', 'student', 'system'], default: 'counselor' },
    senderName: { type: String, default: '' },
    text: { type: String, default: '' },
    time: { type: String, default: '' },
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'read' },
    mediaUrl: { type: String, default: '' },
    mediaType: { type: String, default: '' },
    mediaName: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

export default mongoose.models.StudentLead || mongoose.model('StudentLead', studentLeadSchema);
