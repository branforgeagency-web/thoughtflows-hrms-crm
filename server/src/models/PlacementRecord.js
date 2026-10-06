import mongoose from 'mongoose';

const placementRecordSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true
  },
  tfId: String,
  name: {
    type: String,
    required: true
  },
  company: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    default: ''
  },
  interview: String,
  interviewDate: Date,
  readiness: {
    type: String,
    default: ''
  },
  trainerRec: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    default: 'Company Mapped'
  }
}, {
  timestamps: true
});

export default mongoose.models.PlacementRecord || mongoose.model('PlacementRecord', placementRecordSchema);
