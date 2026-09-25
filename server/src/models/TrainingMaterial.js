import mongoose from 'mongoose';

// Teaching material uploaded by a trainer. The file itself is stored inline
// (base64) and is only returned by the /file endpoint, never in list calls.
const trainingMaterialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'General' },
    fileName: { type: String, default: '' },
    fileFormat: { type: String, default: '' },
    mimeType: { type: String, default: 'application/octet-stream' },
    fileSize: { type: Number, default: 0 },
    data: { type: String, default: '', select: false },
    uploadedBy: { type: String, default: '' },
    uploaderId: { type: String, default: '' },
    branch: { type: String, default: '' },
    pinnedBy: { type: [String], default: [] },
    assignments: {
      type: [{ batch: String, module: String, note: String, by: String, at: Date }],
      default: []
    }
  },
  { timestamps: true }
);

export default mongoose.models.TrainingMaterial || mongoose.model('TrainingMaterial', trainingMaterialSchema);
