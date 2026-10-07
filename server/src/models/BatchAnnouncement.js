import mongoose from 'mongoose';

// Trainer → whole batch notice (class moved, holiday, homework, exam tips…)
const batchAnnouncementSchema = new mongoose.Schema(
  {
    batch: { type: String, required: true },
    batchKey: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    trainerId: { type: String, default: '' },
    trainerName: { type: String, default: '' }
  },
  { timestamps: true }
);

batchAnnouncementSchema.index({ batchKey: 1, createdAt: -1 });

export default mongoose.models.BatchAnnouncement || mongoose.model('BatchAnnouncement', batchAnnouncementSchema);
