import mongoose from 'mongoose';

const teamMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: { type: String, default: 'Staff' },
    departmentCode: { type: String, required: true },
    branchName: String,
    assigned: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    quality: { type: Number, default: 80 },
    available: { type: Boolean, default: true },
    shift: { type: String, default: 'general' },
    weeklySchedule: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

export default mongoose.models.TeamMember || mongoose.model('TeamMember', teamMemberSchema);
