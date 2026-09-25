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
  email: {
    type: String,
    default: '',
    trim: true,
    lowercase: true
  },
  course: {
    type: String,
    default: ''
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
    default: ''
  },
  timeSlot: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'Tamil'
  },
  // Student's selected branch/location - must match the assigned trainer's
  // branchName for a demo notification to be sent (see findEligibleTrainers)
  location: {
    type: String,
    default: ''
  },
  trainer: {
    type: String,
    default: ''
  },
  trainerMapping: {
    type: String,
    default: ''
  },
  trainerId: {
    type: String,
    default: ''
  },
  trainerRole: {
    type: String,
    default: ''
  },
  expertCourse: {
    type: String,
    default: ''
  },
  isExpertMatched: {
    type: Boolean,
    default: false
  },
  notificationSentTo: {
    type: String,
    default: ''
  },
  notificationSentToName: {
    type: String,
    default: ''
  },
  notificationSentAt: {
    type: Date,
    default: null
  },
  notificationRead: {
    type: Boolean,
    default: false
  },
  isExperienced: {
    type: Boolean,
    default: false
  },
  shiftTiming: {
    type: String,
    default: ''
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
    default: false
  },
  notificationBlockReason: {
    type: String,
    default: ''
  },
  // All trainers that satisfied every matching condition (language, location,
  // free at the slot, marked demo-experienced, active) and were notified
  notifiedTrainerIds: {
    type: [String],
    default: []
  },
  notifiedTrainerNames: {
    type: [String],
    default: []
  },
  // Populated when zero trainers matched, explaining why nobody was notified
  noEligibleTrainerReason: {
    type: String,
    default: ''
  },
  priority: {
    type: String,
    default: ''
  },
  // HR counsellor who booked the demo — receives the trainer's outcome notification
  bookedBy: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    default: 'booked'
  },
  link: {
    type: String,
    default: ''
  },
  zoomMeetingId: {
    type: String,
    default: ''
  },
  // Zoom user that owns/hosts this demo's meeting (the trainer's own Zoom user)
  zoomHostEmail: {
    type: String,
    default: ''
  },
  note: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Prevents the same trainer from ending up CONFIRMED into two demos at the
// same date + time slot. This is enforced at the DB level (not just in the
// route handler) so it holds even under concurrent confirmations.
demoSchema.index(
  { trainerId: 1, preferredDate: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'confirmed' }
  }
);

export default mongoose.models.Demo || mongoose.model('Demo', demoSchema);
