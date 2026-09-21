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
    default: 'Partner Company'
  },
  role: {
    type: String,
    default: 'Medical Coder'
  },
  interview: String,
  interviewDate: Date,
  readiness: {
    type: String,
    default: '85%'
  },
  trainerRec: {
    type: String,
    default: 'Ready'
  },
  status: {
    type: String,
    default: 'Company Mapped'
  }
}, {
  timestamps: true
});

export default mongoose.models.PlacementRecord || mongoose.model('PlacementRecord', placementRecordSchema);
