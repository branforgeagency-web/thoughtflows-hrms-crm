import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    branchName: { type: String, required: true },
    employeeName: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    checkIn: String,
    checkOut: String,
    status: { type: String, enum: ['in', 'break', 'out', 'absent'], default: 'absent' },
    hoursWorked: { type: Number, default: 0 },
    // Break tracking (self clock-in from staff dashboards)
    breakMinutes: { type: Number, default: 0 },
    breakStartedAt: { type: Date, default: null },
    department: { type: String, default: '' }
  },
  { timestamps: true }
);

attendanceSchema.index({ branchName: 1, employeeName: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
