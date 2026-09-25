import mongoose from 'mongoose';

// Cross-department notification feed (HR ⇄ Training).
// audience: 'hr' | 'trainer'. recipientId / recipientName narrow it to one
// person; when both are empty every user of that audience sees it.
const notificationSchema = new mongoose.Schema(
  {
    audience: { type: String, enum: ['hr', 'trainer'], required: true },
    recipientId: { type: String, default: '' },
    recipientName: { type: String, default: '' },
    type: { type: String, default: 'info' },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    studentId: { type: String, default: '' },
    demoId: { type: String, default: '' },
    createdBy: { type: String, default: '' },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

notificationSchema.index({ audience: 1, recipientId: 1, recipientName: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
