import mongoose from 'mongoose';

const wiseServicePackageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: ['package', 'exclusive_service', 'store_item'],
      default: 'package'
    },
    course: { type: String, default: 'CPC' },
    category: { type: String, default: 'Medical Coding' },
    price: { type: Number, default: 0 },
    duration: { type: String, default: '3 Months' },
    features: { type: [String], default: [] },
    testsIncluded: { type: Number, default: 0 },
    videosIncluded: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    enrolledCount: { type: Number, default: 0 },
    description: { type: String, default: '' },
    createdBy: { type: String, default: 'Admin' }
  },
  { timestamps: true }
);

wiseServicePackageSchema.index({ kind: 1, status: 1 });

export default mongoose.models.WiseServicePackage || mongoose.model('WiseServicePackage', wiseServicePackageSchema);
