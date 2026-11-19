import mongoose from 'mongoose';

// Leave for every employee outside the trainer leave flow (HR, Marketing,
// CCCP, Admin, Leadership …). Approval: reporting head → HR.
//   pending_head → pending_hr → approved   (or rejected / cancelled)
// A head (nobody above them in the department) starts at pending_hr.
const decisionSchema = new mongoose.Schema(
  { by: String, byEmail: String, at: Date, note: String, action: String },
  { _id: false }
);

const leaveRequestSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    userId: { type: String, default: '' },
    employeeName: { type: String, required: true },
    department: { type: String, default: '' }, // normalised: hr | marketing | cccp | admin | leadership | training …
    role: { type: String, default: '' },
    branch: { type: String, default: '' },
    leaveType: { type: String, required: true }, // CL | SL | LOP (policy codes)
    from: { type: String, required: true }, // YYYY-MM-DD
    to: { type: String, required: true },
    halfDay: { type: String, enum: ['', 'first', 'second'], default: '' },
    days: { type: Number, required: true },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['pending_head', 'pending_hr', 'approved', 'rejected', 'cancelled'], default: 'pending_head' },
    headDecision: { type: decisionSchema, default: null },
    hrDecision: { type: decisionSchema, default: null },
    history: { type: [decisionSchema], default: [] }
  },
  { timestamps: true }
);

leaveRequestSchema.index({ email: 1, from: 1 });
leaveRequestSchema.index({ status: 1, department: 1 });

export default mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', leaveRequestSchema);
