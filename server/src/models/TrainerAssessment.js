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
  scores: {
    type: Map,
    of: Number,
    default: {}
  },
  rationale: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

export default mongoose.models.TrainerAssessment || mongoose.model('TrainerAssessment', trainerAssessmentSchema);
