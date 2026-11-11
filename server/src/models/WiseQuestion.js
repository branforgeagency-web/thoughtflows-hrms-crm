import mongoose from 'mongoose';

const reportEntrySchema = new mongoose.Schema(
  {
    reportedBy: { type: String, default: 'Student' },
    reporterId: { type: String, default: '' },
    reason: { type: String, required: true },
    details: { type: String, default: '' },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
    resolvedBy: { type: String, default: '' },
    resolutionNote: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
    at: { type: Date, default: Date.now }
  },
  { _id: true }
);

const wiseQuestionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true, trim: true },
    options: { type: [String], default: ['', '', '', ''] },
    correctIndex: { type: Number, default: 0 },
    marks: { type: Number, default: 1 },
    chapter: { type: String, default: 'ICD-10-CM Coding Guidelines & Conventions' },
    course: { type: String, default: 'CPC' },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    explanation: { type: String, default: '' },
    testId: { type: String, default: '' },
    testName: { type: String, default: '' },
    status: { type: String, enum: ['Active', 'Draft', 'Archived'], default: 'Active' },
    reported: { type: Boolean, default: false },
    reportCount: { type: Number, default: 0 },
    reports: { type: [reportEntrySchema], default: [] },
    createdBy: { type: String, default: 'Admin' }
  },
  { timestamps: true }
);

wiseQuestionSchema.index({ course: 1, chapter: 1 });
wiseQuestionSchema.index({ reported: 1, status: 1 });
wiseQuestionSchema.index({ testId: 1 });

export default mongoose.models.WiseQuestion || mongoose.model('WiseQuestion', wiseQuestionSchema);
