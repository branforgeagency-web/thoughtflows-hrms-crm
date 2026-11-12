import mongoose from 'mongoose';

const trainingFolderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    createdBy: { type: String, default: '' },
    createdById: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.models.TrainingFolder || mongoose.model('TrainingFolder', trainingFolderSchema);
