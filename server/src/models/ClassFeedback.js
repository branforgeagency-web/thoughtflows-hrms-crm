import mongoose from 'mongoose';

// Student feedback on a class session or on their trainer overall.
// Rolled up per trainer for HR and Leadership (trainer-quality score).
const classFeedbackSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true },
    studentName: { type: String, default: '' },
    trainerId: { type: String, default: '' },
    trainerName: { type: String, default: '' },
    batch: { type: String, default: '' },
    sessionId: { type: String, default: '' }, // LiveClassSession id when rating a class
    topic: { type: String, default: '' },
    kind: { type: String, enum: ['class', 'trainer'], default: 'class' },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '' }
  },
  { timestamps: true }
);

classFeedbackSchema.index({ trainerId: 1, createdAt: -1 });
classFeedbackSchema.index({ studentId: 1, sessionId: 1 });

export default mongoose.models.ClassFeedback || mongoose.model('ClassFeedback', classFeedbackSchema);
