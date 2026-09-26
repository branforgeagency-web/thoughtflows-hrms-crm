import mongoose from 'mongoose';

// Work a student sends to their trainer from the Student Portal: assignments,
// resume, video introduction, improvement tasks. The file is stored inline
// (base64) and only returned by the /file endpoint, never in list calls.
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
