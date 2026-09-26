import mongoose from 'mongoose';

// Cross-department notification feed (HR ⇄ Training).
// audience: 'hr' | 'trainer' | 'student' | 'cccp'. recipientId / recipientName
// narrow it to one person; `batch` targets every student of a batch; when all
// are empty every user of that audience sees it. Targeted notifications use
// `read`; shared ones track each reader in `readBy` so one user marking it
// read doesn't hide it for everyone else.
const notificationSchema = new mongoose.Schema(
  {
    audience: { type: String, enum: ['hr', 'trainer', 'student', 'cccp'], required: true },
    recipientId: { type: String, default: '' },
    recipientName: { type: String, default: '' },
    type: { type: String, default: 'info' },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    studentId: { type: String, default: '' },
    batch: { type: String, default: '' },
    demoId: { type: String, default: '' },
    createdBy: { type: String, default: '' },
    read: { type: Boolean, default: false },
    readBy: { type: [String], default: [] }
  },
  { timestamps: true }
);

notificationSchema.index({ audience: 1, recipientId: 1, recipientName: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
