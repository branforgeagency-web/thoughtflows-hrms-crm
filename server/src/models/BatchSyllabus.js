import mongoose from 'mongoose';

// The syllabus checklist a trainer keeps for one batch. Students see the
// progress on their dashboard; each newly completed module notifies the batch.
const batchSyllabusSchema = new mongoose.Schema(
  {
    batch: { type: String, required: true },
    batchKey: { type: String, required: true }, // batch name with punctuation/case removed
    course: { type: String, default: '' },
    trainerId: { type: String, default: '' },
    trainerName: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
    modules: {
      type: [{ name: String, done: { type: Boolean, default: false }, doneAt: Date, doneBy: String }],
      default: []
    }
  },
  { timestamps: true }
);

batchSyllabusSchema.index({ batchKey: 1 }, { unique: true });

export default mongoose.models.BatchSyllabus || mongoose.model('BatchSyllabus', batchSyllabusSchema);
