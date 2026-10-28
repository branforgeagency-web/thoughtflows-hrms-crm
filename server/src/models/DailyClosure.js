import mongoose from 'mongoose';

const dailyClosureSchema = new mongoose.Schema({
  counselorName: {
    type: String,
    required: true
  },
  counselorEmail: {
    type: String,
    default: ''
  },
  branch: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    default: 'hr'
  },
  date: {
    type: String, // 'YYYY-MM-DD'
    required: true
  },
  // Detailed summary of work completed during the day
  summary: {
    type: String,
    default: ''
  },
  // Work session details associated with this EOD
  workStartTime: {
    type: String,
    default: ''
  },
  workEndTime: {
    type: String,
    default: ''
  },
  workingMinutes: {
    type: Number,
    default: 0
  },
  workingHoursText: {
    type: String,
    default: ''
  },
  workSessionStatus: {
    type: String,
    default: 'Not Started'
  },
  callsMade: {
    type: Number,
    default: 0
  },
  connected: {
    type: Number,
    default: 0
  },
  demosBooked: {
    type: Number,
    default: 0
  },
  admissions: {
    type: Number,
    default: 0
  },
  feesCollected: {
    type: Number,
    default: 0
  },
  pendingFus: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'submitted'],
    default: 'submitted'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: ''
  },
  // System-computed numbers at submit time and which ones the counsellor changed
  systemMetrics: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  editedFields: {
    type: [String],
    default: []
  },
  reviewedBy: {
    type: String,
    default: ''
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  submittedBy: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Ensure a counselor has only one closure per date
dailyClosureSchema.index({ counselorName: 1, date: 1 }, { unique: true });

export default mongoose.models.DailyClosure || mongoose.model('DailyClosure', dailyClosureSchema);
