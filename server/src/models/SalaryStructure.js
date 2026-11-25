import mongoose from 'mongoose';

// Monthly salary set-up of one employee (staff User, matched by email).
// Set by the Branch Head / Business Lead (own branch) or a Department Head /
// Admin (everyone). Payroll runs prorate it by the attendance of the month.
const changeSchema = new mongoose.Schema(
  { by: String, byEmail: String, at: Date, note: String, snapshot: mongoose.Schema.Types.Mixed },
  { _id: false }
);

const salaryStructureSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    employeeName: { type: String, default: '' },
    employeeCode: { type: String, default: '' },
    department: { type: String, default: '' },
    role: { type: String, default: '' },
    branch: { type: String, default: '' },
    designation: { type: String, default: '' },
    joiningDate: { type: String, default: '' }, // YYYY-MM-DD
    // monthly = fixed salary prorated by paid days · daily = rate × days worked
    // hourly = rate × hours logged (part-time trainers)
    payType: { type: String, enum: ['monthly', 'daily', 'hourly'], default: 'monthly' },
    // Monthly components (₹ per month, full attendance)
    basic: { type: Number, default: 0 },
    da: { type: Number, default: 0 }, // dearness allowance (counts in PF wages)
    hra: { type: Number, default: 0 },
    conveyance: { type: Number, default: 0 },
    special: { type: Number, default: 0 },
    otherAllowance: { type: Number, default: 0 },
    // daily / hourly rate (₹)
    rate: { type: Number, default: 0 },
    pfApplicable: { type: Boolean, default: true },
    esiApplicable: { type: Boolean, default: false },
    ptApplicable: { type: Boolean, default: true },
    tdsMonthly: { type: Number, default: 0 },
    payMode: { type: String, default: 'Bank transfer' },
    active: { type: Boolean, default: true },
    updatedBy: { type: String, default: '' },
    history: { type: [changeSchema], default: [] }
  },
  { timestamps: true }
);

salaryStructureSchema.index({ branch: 1 });

export default mongoose.models.SalaryStructure || mongoose.model('SalaryStructure', salaryStructureSchema);
