import mongoose from 'mongoose';

// Daily team task set by a department head (Leadership → Daily Tracker)
const teamTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    assignedTo: { type: String, required: true },
    departmentCode: { type: String, default: 'DEP-HR-001' },
    dueTime: { type: String, default: '' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['not-started', 'in-progress', 'completed', 'delayed'], default: 'not-started' },
    date: { type: String, required: true }, // YYYY-MM-DD (IST) the task belongs to
    createdBy: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.models.TeamTask || mongoose.model('TeamTask', teamTaskSchema);
