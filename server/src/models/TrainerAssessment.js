import mongoose from 'mongoose';

const trainerAssessmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'Weekly Test'
  },
  course: {
    type: String,
    default: ''
  },
  batch: {
    type: String,
    default: ''
  },
  trainerId: { type: String, default: '' },
  trainerName: { type: String, default: '' },
  topic: String,
  date: String,
  timeLimit: {
    type: String,
    default: '45 min'
  },
  totalMarks: {
    type: Number,
    default: 50
  },
  passMark: {
    type: Number,
    default: 35
  },
  studentsCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    default: 'Active'
  },
  testCode: {
    type: String,
    default: ''
  },
  openDate: {
    type: String,
    default: ''
  },
  closeDate: {
    type: String,
    default: ''
  },
  publishResult: {
    type: Boolean,
    default: true
  },
  scores: {
    type: Map,
    of: Number,
    default: {}
  },
  rationale: {
    type: String,
    default: ''
  },
  // 'online' = MCQ test taken in the Student Portal and graded automatically
  // Set when the test belongs to a Test Series (open to a whole course, no batch)
  seriesId: { type: String, default: '', index: true },
  seriesOrder: { type: Number, default: 0 },
  mode: { type: String, enum: ['offline', 'online'], default: 'offline' },
  durationMin: { type: Number, default: null },
  questions: {
    type: [{
      q: String,
      options: [String],
      answer: Number,
      marks: { type: Number, default: 1 },
      chapter: { type: String, default: '' },
      rationale: { type: String, default: '' },
      audioRationaleUrl: { type: String, default: '' },
      audioRationaleText: { type: String, default: '' }
    }],
    default: []
  }
}, {
  timestamps: true
});

// Indexes for the dashboard / portal queries that filter and sort on these fields
trainerAssessmentSchema.index({ batch: 1, createdAt: -1 });
trainerAssessmentSchema.index({ trainerId: 1, createdAt: -1 });

export default mongoose.models.TrainerAssessment || mongoose.model('TrainerAssessment', trainerAssessmentSchema);
