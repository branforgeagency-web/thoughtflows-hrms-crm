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
    default: '24'
  },
  gender: {
    type: String,
    default: 'Female'
  },
  location: {
    type: String,
    default: 'Coimbatore'
  },
  education: {
    type: String,
    default: 'Fresh Graduate'
  },
  branch: {
    type: String,
    default: 'Saravanampatti (CBE)'
  },
  course: {
    type: String,
    default: 'CPC - Certified Professional Coder'
  },
  sourceId: {
    type: String,
    default: 's21'
  },
  sourceName: {
    type: String,
    default: 'Facebook Job Post'
  },
  sourceTier: {
    type: String,
    default: 'TIER C'
  },
  sourceBadge: {
    type: String,
    default: 'FB POST'
  },
  category: {
    type: String,
    default: 'Fresh Graduate'
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
    default: 'Kavitha N.'
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
    default: '₹20K-30K'
  },
  batchTiming: {
    type: String,
    default: 'Weekend (Sat-Sun)'
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
    default: 'Google Ad ⚡'
  },
  allocatedTo: {
    type: String,
    default: 'Priyadharshini'
  },
  notes: {
    type: String,
    default: ''
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
