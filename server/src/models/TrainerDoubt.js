import mongoose from 'mongoose';

const trainerDoubtSchema = new mongoose.Schema({
  student: {
    type: String,
    required: true
  },
  studentId: String,
  topic: {
    type: String,
    required: true
  },
  timeText: {
    type: String,
    default: 'Just now'
  },
  question: {
    type: String,
    required: true
  },
  batch: String,
  course: { type: String, default: '' },
  trainerId: { type: String, default: '' },
  trainerName: { type: String, default: '' },
  slaBadge: {
    type: String,
    default: 'SLA Normal · 24h'
  },
  status: {
    type: String,
    default: 'Pending'
  },
  reply: {
    type: String,
    default: ''
  },
  repliedAt: Date,
  // Follow-up conversation after the first question (student ⇄ trainer)
  thread: {
    type: [{ by: { type: String, enum: ['student', 'trainer'] }, name: String, text: String, at: Date }],
    default: []
  },
  lastStudentAt: Date, // SLA restarts from the student's latest message
  resolvedByStudent: { type: Boolean, default: false },
  resolvedAt: Date,
  // 24h reply SLA watchdog (see checkDoubtSLAs in routes/api.js)
  reminderSentAt: Date, // trainer nudged as the 24h deadline nears
  escalatedAt: Date     // Head of Trainer escalated once the 24h SLA is breached
}, {
  timestamps: true
});

export default mongoose.models.TrainerDoubt || mongoose.model('TrainerDoubt', trainerDoubtSchema);
