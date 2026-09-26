import mongoose from 'mongoose';

const courseFeeRateSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'Other Training Programmes'
  },
  duration: {
    type: String,
    default: '3 Months'
  },
  oldFee: {
    type: Number,
    default: 0
  },
  newFeeNoDiscount: {
    type: Number,
    default: 0
  },
  examFeeText: {
    type: String,
    default: 'NO EXAM'
  },
  registrationFee: {
    type: Number,
    default: 0
  },
  trainingFee: {
    type: Number,
    default: 0
  },
  studyMaterialFee: {
    type: Number,
    default: 0
  },
  membershipFee: {
    type: Number,
    default: 0
  },
  examFee: {
    type: Number,
    default: 0
  },
  gstPercent: {
    type: Number,
    default: 18
  },
  maxDiscount: {
    type: Number,
    default: 0
  },
  installments: {
    type: String,
    default: 'Full / Installment options available'
  },
  currency: {
    type: String,
    default: 'INR'
  },
  originalFee: {
    type: Number,
    default: 0
  },
  standardFee: {
    type: Number,
    default: 0
  },
  courseFee: {
    type: Number,
    default: 0
  },
  totalPayable: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.models.CourseFeeRate || mongoose.model('CourseFeeRate', courseFeeRateSchema);
