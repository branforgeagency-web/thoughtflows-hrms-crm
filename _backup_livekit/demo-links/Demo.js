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
  branch: {
    type: String,
    default: ''
  },
  counselor: {
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
  isSpecialty: {
    type: Boolean,
    default: false
  },
  courseType: {
    type: String,
    default: 'fresher' // 'fresher' | 'specialty'
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
  // Which platform `link` points to. Defaults to 'zoom' (the auto-created meeting
  // flow); set to 'google_meet' when a trainer pastes their own Google Meet link
  // for a group session instead — students join that external Meet directly,
  // while the trainer still runs the whole session (attendance, outcomes) here.
  meetingProvider: {
    type: String,
    default: 'zoom'
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
  },
  // Outside Fixed Timings — flagged for the respective Head to coordinate manually
  outsideFixedTiming: {
    type: Boolean,
    default: false
  },
  customTimeRequested: {
    type: String,
    default: ''
  },
  // Reassignment trail — set the first time a Head of Trainer moves this demo
  // off its original trainer (e.g. the original trainer went on leave).
  // trainerId/trainer above always hold the CURRENT trainer; these hold who
  // it was originally booked for, so both trainers' dashboards and the Head
  // of Trainer can always tell who was meant to take it vs who actually did.
  originalTrainerId: {
    type: String,
    default: ''
  },
  originalTrainerName: {
    type: String,
    default: ''
  },
  reassigned: {
    type: Boolean,
    default: false
  },
  reassignedAt: {
    type: Date,
    default: null
  },
  reassignedBy: {
    type: String,
    default: ''
  },
  reassignmentReason: {
    type: String,
    default: ''
  },
  // Full history, in case a demo is reassigned more than once
  reassignmentHistory: {
    type: [{
      fromTrainerId: String,
      fromTrainerName: String,
      toTrainerId: String,
      toTrainerName: String,
      reason: String,
      by: String,
      at: { type: Date, default: Date.now }
    }],
    default: []
  },
  // Auto-missed tracking — set by the background job when a booked/confirmed
  // demo's scheduled slot passes with nothing done about it. status becomes
  // 'missed' (same value a trainer's own "No-show" click sets), and autoMissed
  // distinguishes "the system gave up on this slot" from "trainer marked the
  // candidate a no-show after actually running the session".
  autoMissed: {
    type: Boolean,
    default: false
  },
  missedAt: {
    type: Date,
    default: null
  },
  missedReason: {
    type: String,
    default: ''
  },
  // Once auto-missed, the demo can no longer be "started" at its original
  // (now past) scheduled time — it stays on record, but needs a reschedule
  // (or reassignment) by the Head of Trainer before it can be conducted.
  disabledForStart: {
    type: Boolean,
    default: false
  },
  // History of date/time changes (and any trainer swap made at the same time)
  rescheduleHistory: {
    type: [{
      fromDate: String,
      fromTime: String,
      toDate: String,
      toTime: String,
      toTrainerId: String,
      toTrainerName: String,
      reason: String,
      by: String,
      at: { type: Date, default: Date.now }
    }],
    default: []
  }
}, {
  timestamps: true
});

// Index on trainerId, preferredDate, timeSlot for fast query lookups.
// Demos are conducted as group sessions (up to 6 students taken together in one demo session).
demoSchema.index({ trainerId: 1, preferredDate: 1, timeSlot: 1 });

export default mongoose.models.Demo || mongoose.model('Demo', demoSchema);
