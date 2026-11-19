import mongoose from 'mongoose';

// One scheduled 1:1 class. Runs in the ThoughtFlows Live Classroom: the
// trainer starts it from their dashboard, the student joins with a no-login
// link /join/session/<joinCode>.
const sessionSchema = new mongoose.Schema(
  {
    enrollmentId: { type: String, required: true },
    studentId: { type: String, default: '' },
    studentName: { type: String, default: '' },
    phone: { type: String, default: '' },
    course: { type: String, default: '' },
    trainerId: { type: String, required: true },
    trainerName: { type: String, default: '' },
    date: { type: String, required: true }, // YYYY-MM-DD
    startMin: { type: Number, required: true },
    endMin: { type: Number, required: true },
    topic: { type: String, default: '' },
    // scheduled → live → completed | no_show (credit used) | cancelled (no credit)
    status: { type: String, enum: ['scheduled', 'live', 'completed', 'no_show', 'cancelled'], default: 'scheduled' },
    creditCharged: { type: Boolean, default: false },
    roomName: { type: String, default: '' },
    joinCode: { type: String, default: '' },
    liveAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    studentJoinedAt: { type: Date, default: null },
    createdBy: { type: String, default: '' }
  },
  { timestamps: true }
);

sessionSchema.index({ trainerId: 1, date: 1 });
sessionSchema.index({ enrollmentId: 1, date: 1 });
sessionSchema.index({ joinCode: 1 }, { sparse: true });

export default mongoose.models.OneOnOneSession || mongoose.model('OneOnOneSession', sessionSchema);
