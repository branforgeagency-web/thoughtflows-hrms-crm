import mongoose from 'mongoose';

const approvalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    kind: { type: String, default: 'General Approval' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'forwarded'], default: 'pending' },
    departmentCode: { type: String, required: true },
    branchName: String,
    requestedBy: String,
    decidedBy: String,
    decidedAt: Date,
    // The record this approval acts on (e.g. a marketing creative) — the
    // decision is written back to it so both dashboards stay in step
    refType: { type: String, default: '' },
    refId: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.models.Approval || mongoose.model('Approval', approvalSchema);
