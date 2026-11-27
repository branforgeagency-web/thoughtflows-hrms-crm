import mongoose from 'mongoose';

// One employee's pay for one month, worked out from the Attendance & Leave
// register. draft → submitted (Branch Head / Business Lead) → approved
// (Department Head / Admin) → paid. Only drafts can be recalculated or edited.
const lineSchema = new mongoose.Schema({ code: String, label: String, amount: Number }, { _id: false });
const stepSchema = new mongoose.Schema({ by: String, byEmail: String, at: Date, action: String, note: String }, { _id: false });

const payslipSchema = new mongoose.Schema(
  {
    month: { type: String, required: true }, // YYYY-MM
    email: { type: String, required: true, lowercase: true, trim: true },
    employeeName: { type: String, default: '' },
    employeeCode: { type: String, default: '' },
    department: { type: String, default: '' },
    role: { type: String, default: '' },
    designation: { type: String, default: '' },
    branch: { type: String, default: '' },
    payType: { type: String, default: 'monthly' },
    structure: { type: mongoose.Schema.Types.Mixed, default: {} }, // snapshot used for this month
    attendance: { type: mongoose.Schema.Types.Mixed, default: {} }, // day counts + LOP
    earnings: { type: [lineSchema], default: [] },
    deductions: { type: [lineSchema], default: [] },
    employer: { type: [lineSchema], default: [] }, // employer PF / EPS / EDLI / admin (not deducted)
    employerTotal: { type: Number, default: 0 },
    pf: { type: mongoose.Schema.Types.Mixed, default: {} }, // { wage, wageFull, employee }
    lopAmount: { type: Number, default: 0 },
    perDay: { type: Number, default: 0 },
    ctc: { type: Number, default: 0 },
    adjustments: {
      incentive: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
      arrears: { type: Number, default: 0 },
      otherEarning: { type: Number, default: 0 },
      advance: { type: Number, default: 0 },
      otherDeduction: { type: Number, default: 0 },
      lopOverride: { type: Number, default: null }, // manual LOP days (null = from attendance)
      note: { type: String, default: '' }
    },
    fullGross: { type: Number, default: 0 },
    gross: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    net: { type: Number, default: 0 },
    provisional: { type: Boolean, default: false }, // month not over when calculated
    warnings: { type: [String], default: [] },
    status: { type: String, enum: ['draft', 'submitted', 'approved', 'paid'], default: 'draft' },
    paidOn: { type: String, default: '' },
    paymentRef: { type: String, default: '' },
    generatedBy: { type: String, default: '' },
    generatedAt: { type: Date, default: null },
    history: { type: [stepSchema], default: [] },
    // Employees can only view their payslip; a download needs the Head of
    // Department's approval. { status: none|pending|approved|rejected, reason,
    // requestedAt, decidedBy, decidedByEmail, decidedAt, note, validUntil, count, lastAt }
    download: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

payslipSchema.index({ month: 1, email: 1 }, { unique: true });
payslipSchema.index({ email: 1, month: -1 });
payslipSchema.index({ month: 1, branch: 1, status: 1 });

export default mongoose.models.Payslip || mongoose.model('Payslip', payslipSchema);
