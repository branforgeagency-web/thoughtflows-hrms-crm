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

// Indexes for the dashboard / portal queries that filter and sort on these fields
placementRecordSchema.index({ studentId: 1 });
placementRecordSchema.index({ tfId: 1 });

export default mongoose.models.PlacementRecord || mongoose.model('PlacementRecord', placementRecordSchema);
