import mongoose from 'mongoose';

// One document per trainer + batch + class date. `records` maps a student key
// (Student.studentId, falling back to _id) to Present / Late / Absent.
const classAttendanceSchema = new mongoose.Schema(
  {
    trainerId: { type: String, default: '' },
    trainerName: { type: String, default: '' },
    batch: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    topic: { type: String, default: '' },
    records: { type: Map, of: String, default: {} }
  },
  { timestamps: true }
);

classAttendanceSchema.index({ trainerId: 1, batch: 1, date: 1 }, { unique: true });

export default mongoose.models.ClassAttendance || mongoose.model('ClassAttendance', classAttendanceSchema);
