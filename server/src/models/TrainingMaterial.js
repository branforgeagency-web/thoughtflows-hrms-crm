import mongoose from 'mongoose';

// Teaching material uploaded by a trainer.
// Files are stored in the academy's AWS S3 bucket ONLY: the browser uploads the
// bytes straight to S3 (multipart, up to 200 MB per file) and this row keeps
// just the metadata plus `storageKey` / `storageUrl`. File bytes are never
// written to MongoDB.
const trainingMaterialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'General' },
    folder: { type: String, default: '', trim: true },
    fileName: { type: String, default: '' },
    fileFormat: { type: String, default: '' },
    mimeType: { type: String, default: 'application/octet-stream' },
    fileSize: { type: Number, default: 0 },
    storageKey: { type: String, default: '' },
    storageUrl: { type: String, default: '' },
    storageProvider: { type: String, enum: ['amplify', 'inline'], default: 'amplify' },
    // DEPRECATED — legacy inline base64 bytes from before the S3-only move.
    // Nothing writes this field any more; it is kept (select:false) purely so
    // materials uploaded under the old scheme still open. 'inline' stays in the
    // storageProvider enum above for the same reason.
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
