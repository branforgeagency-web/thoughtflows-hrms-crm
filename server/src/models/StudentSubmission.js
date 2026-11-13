import mongoose from 'mongoose';

// Work a student sends to their trainer from the Student Portal: assignments,
// resume, video introduction, improvement tasks. Files are stored in the
// academy's AWS S3 bucket ONLY — this row keeps the metadata plus `storageKey`
// / `storageUrl`. File bytes are never written to MongoDB.
const studentSubmissionSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true },
    studentName: { type: String, default: '' },
    course: { type: String, default: '' },
    batch: { type: String, default: '' },
    trainerId: { type: String, default: '' },
    trainerName: { type: String, default: '' },
    type: {
      type: String,
      enum: ['assignment', 'resume', 'video_intro', 'improvement_task'],
      required: true
    },
    title: { type: String, required: true },
    note: { type: String, default: '' },
    link: { type: String, default: '' },
    materialId: { type: String, default: '' },
    fileName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    storageKey: { type: String, default: '' },
    storageUrl: { type: String, default: '' },
    storageProvider: { type: String, enum: ['amplify', 'inline'], default: 'amplify' },
    // DEPRECATED — legacy inline base64 bytes from before the S3-only move.
    // Nothing writes this any more; kept (select:false) so older submissions
    // still open. 'inline' stays in the enum above for the same reason.
    data: { type: String, default: '', select: false },
    status: {
      type: String,
      enum: ['Submitted', 'Approved', 'Needs Revision'],
      default: 'Submitted'
    },
    score: { type: Number, default: null },
    feedback: { type: String, default: '' },
    reviewedBy: { type: String, default: '' },
    reviewedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

studentSubmissionSchema.index({ studentId: 1, createdAt: -1 });
studentSubmissionSchema.index({ trainerId: 1, status: 1 });

export default mongoose.models.StudentSubmission || mongoose.model('StudentSubmission', studentSubmissionSchema);
