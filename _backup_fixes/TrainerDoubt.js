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
  repliedAt: Date
}, {
  timestamps: true
});

export default mongoose.models.TrainerDoubt || mongoose.model('TrainerDoubt', trainerDoubtSchema);
