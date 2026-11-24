import mongoose from 'mongoose';

// Question Bank — one document per question, so a bank of 20,000+ questions
// can be listed, filtered and searched with indexes instead of unpacking every
// test. A question either sits in the bank only (testId '') or belongs to one
// Test Series test (testId + order). The test keeps a copy of its questions in
// TrainerAssessment.questions (same _id) because the online test engine,
// grading and attempts read them from there; the server rebuilds that copy
// whenever a test's questions change here (syncTestFromBank).
const bankQuestionSchema = new mongoose.Schema(
  {
    testId: { type: String, default: '' },
    order: { type: Number, default: 0 },
    q: { type: String, required: true },
    options: { type: [String], default: [] },
    answer: { type: Number, default: 0 },
    marks: { type: Number, default: 1 },
    negMarks: { type: Number, default: 0 },
    bonusMarks: { type: Number, default: 0 },
    qType: { type: String, default: 'MCQ' },
    subject: { type: String, default: '' },
    topic: { type: String, default: '' },
    language: { type: String, default: 'English' },
    difficulty: { type: String, default: '' },
    hint: { type: String, default: '' },
    font: { type: String, default: '' },
    passage: { type: String, default: '' },
    instruction: { type: String, default: '' },
    rationale: { type: String, default: '' },
    chapter: { type: String, default: '' },
    audioRationaleUrl: { type: String, default: '' },
    reports: {
      type: [{ studentId: String, studentName: String, reason: String, at: { type: Date, default: Date.now } }],
      default: []
    },
    reportCount: { type: Number, default: 0 },
    // lower-case plain text of question + options + solution, for search
    searchText: { type: String, default: '' },
    // which upload created it — lets a whole bad import be undone
    importBatch: { type: String, default: '' },
    createdBy: { type: String, default: '' },
    updatedBy: { type: String, default: '' }
  },
  { timestamps: true }
);

bankQuestionSchema.index({ testId: 1, order: 1 });
bankQuestionSchema.index({ createdAt: -1 });
bankQuestionSchema.index({ subject: 1, topic: 1 });
bankQuestionSchema.index({ language: 1 });
bankQuestionSchema.index({ qType: 1 });
bankQuestionSchema.index({ reportCount: 1 });
bankQuestionSchema.index({ importBatch: 1 });

export default mongoose.models.BankQuestion || mongoose.model('BankQuestion', bankQuestionSchema);
