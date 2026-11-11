import mongoose from 'mongoose';

const wiseVideoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    course: { type: String, default: 'CPC' },
    chapter: { type: String, default: 'General' },
    batch: { type: String, default: '' },
    trainerId: { type: String, default: '' },
    trainerName: { type: String, default: '' },
    videoType: { type: String, enum: ['recorded', 'live'], default: 'recorded' },
    videoUrl: { type: String, default: '' },
    duration: { type: String, default: '45 min' },
    scheduledAt: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Published', 'Scheduled', 'Live', 'Completed', 'Draft'],
      default: 'Published'
    },
    views: { type: Number, default: 0 },
    description: { type: String, default: '' },
    createdBy: { type: String, default: 'Admin' }
  },
  { timestamps: true }
);

wiseVideoSchema.index({ videoType: 1, status: 1 });
wiseVideoSchema.index({ course: 1 });

export default mongoose.models.WiseVideo || mongoose.model('WiseVideo', wiseVideoSchema);
