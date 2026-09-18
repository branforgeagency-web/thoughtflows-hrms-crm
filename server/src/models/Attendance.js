import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    branchName: { type: String, required: true },
    employeeName: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    checkIn: String,
    checkOut: String,
    status: { type: String, enum: ['in', 'break', 'out', 'absent'], default: 'absent' },
    hoursWorked: { type: Number, default: 0 }
  },
  { timestamps: true }
);

attendanceSchema.index({ branchName: 1, employeeName: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
