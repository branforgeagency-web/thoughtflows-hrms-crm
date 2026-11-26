import mongoose from 'mongoose';

// Monthly attendance sheet uploaded on the Payroll desk (LOGIN / LOGOUT / EOD
// per employee per day). One document per month; the latest upload replaces
// the earlier one. When it exists, payroll uses it for every employee mapped
// in it instead of the app's own login register.
const daySchema = new mongoose.Schema(
  {
    date: String, code: String, label: String, login: String, logout: String, minutes: Number,
    leaveType: String, unpaid: Boolean, blank: Boolean, worked: Boolean, eod: String, raw: String
  },
  { _id: false }
);

const columnSchema = new mongoose.Schema(
  {
    header: String, // name as written in the sheet
    email: { type: String, default: '' }, // mapped staff login ('' = not mapped, ignored)
    employeeName: { type: String, default: '' },
    discontinued: Boolean,
    issues: { type: [{ date: String, msg: String, _id: false }], default: [] },
    days: { type: [daySchema], default: [] }
  },
  { _id: false }
);

const attendanceSheetSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true }, // YYYY-MM
    fileName: { type: String, default: '' },
    options: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastDataDate: { type: String, default: '' },
    warnings: { type: [String], default: [] },
    columns: { type: [columnSchema], default: [] },
    uploadedBy: { type: String, default: '' },
    uploadedByEmail: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.models.AttendanceSheet || mongoose.model('AttendanceSheet', attendanceSheetSchema);
