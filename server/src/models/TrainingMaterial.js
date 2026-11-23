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
    },
    // Trainers this file is allocated to by the Trainer Head / Manager. Only
    // Head, Manager, Admin and Leadership see every file; TLs and trainers see
    // only the files whose list includes them.
    // Animated HTML5 copy of a PowerPoint (made by Aspose.Slides Cloud on upload).
    // '' = not a presentation / not converted yet; pending → processing → ready | failed
    html5Status: { type: String, enum: ['', 'pending', 'processing', 'ready', 'failed'], default: '' },
    html5Prefix: { type: String, default: '' }, // S3 folder holding the converted files
    html5Entry: { type: String, default: '' },  // start page inside that folder (e.g. index.html)
    html5Error: { type: String, default: '' },
    html5UpdatedAt: { type: Date },
    allocatedTrainers: {
      type: [{ trainerId: String, name: String, email: String, by: String, at: Date }],
      default: []
    }
  },
  { timestamps: true }
);

// Indexes for the dashboard / portal queries that filter and sort on these fields
trainingMaterialSchema.index({ 'assignments.batch': 1 });

export default mongoose.models.TrainingMaterial || mongoose.model('TrainingMaterial', trainingMaterialSchema);
