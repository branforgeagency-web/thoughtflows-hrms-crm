import mongoose from 'mongoose';

// Test Series — a set of online mock / practice tests for a course (e.g. "CPC
// Mock Exam Series"), open to every admitted student of that course from the
// Student Portal, not tied to one batch. The tests themselves are
// TrainerAssessment documents with seriesId = this series' _id, so they use the
// same online test engine (server timer, autosave, grading, leaderboard).
const testSeriesSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    // Course codes / names this series is for. A student sees the series when
    // their course matches one of these ("CPC" also covers "CPC Fast Track").
    // Empty = every admitted student.
    courses: { type: [String], default: [] },
    status: { type: String, enum: ['Draft', 'Published'], default: 'Draft' },
    createdBy: { type: String, default: '' },
    updatedBy: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.models.TestSeries || mongoose.model('TestSeries', testSeriesSchema);
