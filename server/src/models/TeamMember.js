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
    shift: { type: String, enum: ['morning', 'general', 'evening', 'off'], default: 'general' }
  },
  { timestamps: true }
);

export default mongoose.models.TeamMember || mongoose.model('TeamMember', teamMemberSchema);
