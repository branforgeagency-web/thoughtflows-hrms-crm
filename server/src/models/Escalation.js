import mongoose from 'mongoose';

const escalationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    type: { type: String, default: 'Operational Issue' },
    priority: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
    status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' },
    departmentCode: { type: String, required: true },
    branchName: String,
    raisedBy: String,
    // Student tickets: routed to the student's HR counsellor as well as Leadership
    studentId: { type: String, default: '' },
    hrName: { type: String, default: '' },
    response: { type: String, default: '' },
    respondedBy: { type: String, default: '' },
    resolvedAt: Date
  },
  { timestamps: true }
);

export default mongoose.models.Escalation || mongoose.model('Escalation', escalationSchema);
