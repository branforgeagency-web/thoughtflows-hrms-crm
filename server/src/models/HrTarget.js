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
    assignedBy: { type: String, default: '' },
    // Monthly task allocation (Branch Head / HR Department Head → branch HRs)
    month: { type: String, default: '' },        // "YYYY-MM" the task is for
    metric: { type: String, default: 'custom' }, // admissions | fees | demos | calls | leads | custom
    branch: { type: String, default: '' },       // branch the task was assigned for ("All HR" of this branch)
    notes: { type: String, default: '' },
    // Manual progress for "custom" tasks, logged by the HR: { hr, date "YYYY-MM-DD", count }
    entries: { type: [{ hr: String, date: String, count: Number, at: Date }], default: [] }
  },
  { timestamps: true }
);

export default mongoose.models.HrTarget || mongoose.model('HrTarget', hrTargetSchema);
