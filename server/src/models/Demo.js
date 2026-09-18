import mongoose from 'mongoose';

const demoSchema = new mongoose.Schema({
  candidateName: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  course: {
    type: String,
    default: 'CPC Intensive Medical Coding'
  },
  mode: {
    type: String,
    default: 'Online (Zoom Live)'
  },
  preferredDate: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  },
  time: {
    type: String,
    default: 'Today 17:00'
  },
  timeSlot: {
    type: String,
    default: '4:00–6:00 PM'
  },
  language: {
    type: String,
    default: 'Tamil'
  },
  trainer: {
    type: String,
    default: 'Dr. Vikram C.'
  },
  trainerMapping: {
    type: String,
    default: 'Maps to Revathi K · Tamil · Anatomy + ICD-10-CM · 90% · load 2/5'
  },
  trainerId: {
    type: String,
    default: 'TR-CBG-001'
  },
  trainerRole: {
    type: String,
    default: 'AAPC Certified Faculty'
  },
  expertCourse: {
    type: String,
    default: 'CPC — Certified Professional Coder'
  },
  isExpertMatched: {
    type: Boolean,
    default: true
  },
  notificationSentTo: {
    type: String,
    default: 'TR-CBG-001'
  },
  notificationSentToName: {
    type: String,
    default: 'Revathi K'
  },
  notificationSentAt: {
    type: Date,
    default: Date.now
  },
  notificationRead: {
    type: Boolean,
    default: false
  },
  isExperienced: {
    type: Boolean,
    default: true
  },
  shiftTiming: {
    type: String,
    default: '6:00 AM – 2:00 PM'
  },
  hasConflict: {
    type: Boolean,
    default: false
  },
  conflictReason: {
    type: String,
    default: ''
  },
  notificationSent: {
    type: Boolean,
    default: true
  },
  notificationBlockReason: {
    type: String,
    default: ''
  },
  priority: {
    type: String,
    default: 'Urgent - Subject Matter Expert First'
  },
  status: {
    type: String,
    default: 'booked'
  },
  link: {
    type: String,
    default: 'https://zoom.us/j/9823412345'
  },
  note: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

export default mongoose.models.Demo || mongoose.model('Demo', demoSchema);
