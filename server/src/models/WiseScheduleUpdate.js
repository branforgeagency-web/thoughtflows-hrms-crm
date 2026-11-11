import mongoose from 'mongoose';

const wiseScheduleUpdateSchema = new mongoose.Schema(
  {
    trainerId: { type: String, default: '' },
    trainerName: { type: String, required: true, trim: true },
    batchId: { type: String, default: '' },
    batchName: { type: String, required: true, trim: true },
    course: { type: String, default: 'CPC' },
    branch: { type: String, default: '' },
    scheduledDate: { type: String, required: true },
    timeSlot: { type: String, required: true },
    topic: { type: String, default: '' },
    mode: { type: String, enum: ['Online', 'Classroom', 'Hybrid'], default: 'Online' },
    status: {
      type: String,
      enum: ['Scheduled', 'Updated', 'Pending Update', 'Completed', 'Cancelled'],
      default: 'Scheduled'
    },
    changeNote: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
    tlFollowUpStatus: {
      type: String,
      enum: ['None', 'Follow-up Sent', 'Verified'],
      default: 'None'
    },
    tlFollowUpNote: { type: String, default: '' },
    tlFollowedUpBy: { type: String, default: '' },
    tlFollowedUpAt: { type: Date, default: null }
  },
  { timestamps: true }
);

wiseScheduleUpdateSchema.index({ scheduledDate: -1, status: 1 });
wiseScheduleUpdateSchema.index({ trainerId: 1 });

export default mongoose.models.WiseScheduleUpdate || mongoose.model('WiseScheduleUpdate', wiseScheduleUpdateSchema);
