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
    default: 'Saravanampatti Branch (CBE)'
  },
  date: {
    type: String, // 'YYYY-MM-DD'
    required: true
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
  }
}, {
  timestamps: true
});

// Ensure a counselor has only one closure per date
dailyClosureSchema.index({ counselorName: 1, date: 1 }, { unique: true });

export default mongoose.models.DailyClosure || mongoose.model('DailyClosure', dailyClosureSchema);
