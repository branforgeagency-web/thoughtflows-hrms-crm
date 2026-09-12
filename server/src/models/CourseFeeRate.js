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
  duration: {
    type: String,
    default: '3 Months'
  },
  registrationFee: {
    type: Number,
    default: 2000
  },
  trainingFee: {
    type: Number,
    default: 45000
  },
  studyMaterialFee: {
    type: Number,
    default: 3000
  },
  membershipFee: {
    type: Number,
    default: 5000
  },
  examFee: {
    type: Number,
    default: 22000
  },
  gstPercent: {
    type: Number,
    default: 18
  },
  maxDiscount: {
    type: Number,
    default: 5000
  },
  installments: {
    type: String,
    default: 'Full payment only'
  },
  currency: {
    type: String,
    default: 'INR'
  },
  courseFee: {
    type: Number,
    default: 21000
  },
  totalPayable: {
    type: Number,
    default: 90860
  }
}, {
  timestamps: true
});

export default mongoose.models.CourseFeeRate || mongoose.model('CourseFeeRate', courseFeeRateSchema);
