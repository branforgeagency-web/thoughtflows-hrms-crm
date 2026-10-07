import mongoose from 'mongoose';

// Requests a student raises from the portal. Academic ones (mock interview,
// trainer consultation) go to the allocated trainer; admin ones (fee query,
// payment link, profile edit, points redemption) go to the student's HR.
export const TRAINER_REQUEST_TYPES = ['mock_interview', 'consultation'];
export const HR_REQUEST_TYPES = ['fee_query', 'payment_link', 'profile_edit', 'redeem_points'];

const studentRequestSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true },
    studentName: { type: String, default: '' },
    course: { type: String, default: '' },
    batch: { type: String, default: '' },
    type: { type: String, enum: [...TRAINER_REQUEST_TYPES, ...HR_REQUEST_TYPES], required: true },
    audience: { type: String, enum: ['trainer', 'hr'], required: true },
    trainerId: { type: String, default: '' },
    trainerName: { type: String, default: '' },
    hrName: { type: String, default: '' },
    subject: { type: String, default: '' },
    message: { type: String, default: '' },
    preferredDate: { type: String, default: '' },
    details: { type: Object, default: {} },
    status: { type: String, enum: ['Open', 'Scheduled', 'Resolved', 'Declined'], default: 'Open' },
    scheduledFor: { type: String, default: '' },
    response: { type: String, default: '' },
    respondedBy: { type: String, default: '' },
    respondedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

studentRequestSchema.index({ studentId: 1, createdAt: -1 });
studentRequestSchema.index({ audience: 1, trainerId: 1, status: 1 });

export default mongoose.models.StudentRequest || mongoose.model('StudentRequest', studentRequestSchema);
