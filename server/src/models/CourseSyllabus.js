import mongoose from 'mongoose';

// The master syllabus for a COURSE (not a batch) — one canonical curriculum list
// that applies to every batch of that course. Only the Head of Trainer may add,
// remove, rename or reorder these modules (enforced server-side via
// isHeadOfTrainerUser); ordinary trainers can only view this list and tick off
// per-batch progress against it (see BatchSyllabus, which stores done/doneAt per
// batch but no longer accepts new module names from trainers).
const courseSyllabusSchema = new mongoose.Schema(
  {
    course: { type: String, required: true },
    courseKey: { type: String, required: true }, // course name with punctuation/case removed
    modules: {
      type: [{ name: String }],
      default: []
    },
    updatedBy: { type: String, default: '' }
  },
  { timestamps: true }
);

courseSyllabusSchema.index({ courseKey: 1 }, { unique: true });

export default mongoose.models.CourseSyllabus || mongoose.model('CourseSyllabus', courseSyllabusSchema);
