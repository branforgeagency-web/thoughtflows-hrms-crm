import mongoose from 'mongoose';

// One document per class session a trainer runs for a batch. The trainer
// starts it from the Class Session Room (a fresh Zoom meeting is created on
// the trainer's own Zoom user), students join from their portal, and the
// join log + session notes stay with the batch after the class ends.
const liveClassSessionSchema = new mongoose.Schema(
  {
    trainerId: { type: String, required: true },
    trainerName: { type: String, default: '' },
    batch: { type: String, required: true },
    course: { type: String, default: '' },
    topic: { type: String, default: '' },
    // Zoom meeting created for this session (or the trainer's fixed class link)
    zoomMeetingId: { type: String, default: '' },
    zoomHostEmail: { type: String, default: '' },
    zoomJoinUrl: { type: String, default: '' },
    zoomPassword: { type: String, default: '' },
    meetingSource: { type: String, enum: ['zoom_api', 'class_link', ''], default: '' },
    isLive: { type: Boolean, default: false },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    // Students who joined through the portal (first join time kept)
    joins: {
      type: [{ studentId: String, name: String, joinedAt: Date, lastJoinAt: Date, count: { type: Number, default: 1 } }],
      default: []
    },
    // Notes the trainer adds during class — shown to the batch afterwards
    notes: { type: [{ text: String, at: Date }], default: [] },
    attendanceSaved: { type: Boolean, default: false }
  },
  { timestamps: true }
);

liveClassSessionSchema.index({ trainerId: 1, isLive: 1 });
liveClassSessionSchema.index({ batch: 1, isLive: 1, startedAt: -1 });

export default mongoose.models.LiveClassSession || mongoose.model('LiveClassSession', liveClassSessionSchema);
