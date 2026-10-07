import mongoose from 'mongoose';

// One student's attempt at an online (MCQ) test. The server keeps the clock:
// endsAt is fixed when the attempt starts, and the attempt is graded on submit
// (or automatically once the time is over).
const testAttemptSchema = new mongoose.Schema(
  {
    assessmentId: { type: String, required: true },
    studentId: { type: String, required: true },
    studentKey: { type: String, default: '' }, // key used in TrainerAssessment.scores
    studentName: { type: String, default: '' },
    batch: { type: String, default: '' },
    startedAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    answers: { type: [Number], default: [] }, // option index per question, -1 = skipped
    status: { type: String, enum: ['in_progress', 'submitted'], default: 'in_progress' },
    submittedAt: { type: Date, default: null },
    autoSubmitted: { type: Boolean, default: false },
    late: { type: Boolean, default: false },
    score: { type: Number, default: null },
    totalMarks: { type: Number, default: 0 },
    correct: { type: Number, default: 0 }
  },
  { timestamps: true }
);

testAttemptSchema.index({ assessmentId: 1, studentId: 1 }, { unique: true });
testAttemptSchema.index({ studentId: 1 });

export default mongoose.models.TestAttempt || mongoose.model('TestAttempt', testAttemptSchema);
