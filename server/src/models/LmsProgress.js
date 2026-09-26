import mongoose from 'mongoose';

// One row per HR counsellor: lesson completion + assessment results per module.
// Module keys: SOP module names ('Brand Training', …) or 'course:<CODE>'.
const moduleSchema = new mongoose.Schema(
  {
    completedItems: { type: [Number], default: [] },
    passed: { type: Boolean, default: false },
    bestScore: { type: Number, default: 0 },
    lastScore: { type: Number, default: null },
    attempts: { type: Number, default: 0 },
    passedAt: { type: Date, default: null },
    lastAttemptAt: { type: Date, default: null }
  },
  { _id: false }
);

const lmsProgressSchema = new mongoose.Schema(
  {
    userKey: { type: String, required: true, unique: true }, // lower-cased email, else name
    userName: { type: String, default: '' },
    email: { type: String, default: '' },
    department: { type: String, default: '' },
    modules: { type: Map, of: moduleSchema, default: {} }
  },
  { timestamps: true }
);

lmsProgressSchema.index({ userName: 1 });

export default mongoose.models.LmsProgress || mongoose.model('LmsProgress', lmsProgressSchema);
