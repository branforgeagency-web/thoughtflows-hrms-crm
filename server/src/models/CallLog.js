import mongoose from 'mongoose';

// One row per counsellor call outcome (logged from the HR call modal), so the
// daily call count lives on the server — not in one browser's storage.
const callLogSchema = new mongoose.Schema(
  {
    counselorName: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD (IST)
    leadId: { type: String, default: '' },
    leadName: { type: String, default: '' },
    outcome: { type: String, default: '' },
    durationSeconds: { type: Number, default: 0 },
    connected: { type: Boolean, default: false },
    callSid: { type: String, default: '' }
  },
  { timestamps: true }
);

callLogSchema.index({ counselorName: 1, date: 1 });

export default mongoose.models.CallLog || mongoose.model('CallLog', callLogSchema);
