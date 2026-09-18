import mongoose from 'mongoose';

const approvalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    kind: { type: String, default: 'General Approval' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    departmentCode: { type: String, required: true },
    branchName: String,
    requestedBy: String,
    decidedBy: String,
    decidedAt: Date
  },
  { timestamps: true }
);

export default mongoose.models.Approval || mongoose.model('Approval', approvalSchema);
