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
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

export default mongoose.models.StudentLead || mongoose.model('StudentLead', studentLeadSchema);
