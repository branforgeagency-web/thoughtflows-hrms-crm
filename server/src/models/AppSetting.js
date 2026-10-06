import mongoose from 'mongoose';

// Org-wide settings shared by every dashboard (e.g. the incentive policy Admin
// sets and HR's target banner reads). One document per key.
const appSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    updatedBy: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.models.AppSetting || mongoose.model('AppSetting', appSettingSchema);
