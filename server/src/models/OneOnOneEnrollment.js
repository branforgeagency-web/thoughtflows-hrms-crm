import mongoose from 'mongoose';

// 1:1 Sessions — a student paired with a dedicated trainer, with a number of
// session credits. Each completed (or no-show) session uses one credit.
const enrollmentSchema = new mongoose.Schema(
  {
    studentId: { type: String, default: '' },
    studentName: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '', trim: true, lowercase: true },
    course: { type: String, default: '' },
    trainerId: { type: String, required: true },
    trainerName: { type: String, default: '' },
    totalCredits: { type: Number, default: 10, min: 0 },
    usedCredits: { type: Number, default: 0, min: 0 },
    sessionMinutes: { type: Number, default: 60 },
    status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
    notes: { type: String, default: '' },
    createdBy: { type: String, default: '' }
  },
  { timestamps: true }
);

enrollmentSchema.index({ trainerId: 1, status: 1 });

export default mongoose.models.OneOnOneEnrollment || mongoose.model('OneOnOneEnrollment', enrollmentSchema);
