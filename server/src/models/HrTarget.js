import mongoose from 'mongoose';

const hrTargetSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    target: { type: Number, required: true, default: 0 },
    achieved: { type: Number, default: 0 },
    unit: { type: String, default: 'Count' },
    period: { type: String, enum: ['today', 'week', 'month'], default: 'today' },
    assignedTo: { type: String, default: 'All HR' },
    departmentCode: { type: String, default: 'DEP-HR-001' },
    assignedBy: { type: String, default: 'Head of HR' }
  },
  { timestamps: true }
);

export default mongoose.models.HrTarget || mongoose.model('HrTarget', hrTargetSchema);
