import mongoose from 'mongoose';

const callRecordingSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentLead'
  },
  studentId: {
    type: String,
    default: '',
    index: true
  },
  studentMongoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  leadName: {
    type: String,
    required: true
  },
  leadPhone: {
    type: String,
    required: true
  },
  counselorName: {
    type: String,
    default: ''
  },
  counselorPhone: {
    type: String,
    default: ''
  },
  callSid: {
    type: String,
    default: ''
  },
  durationSeconds: {
    type: Number,
    default: 0
  },
  outcome: {
    type: String,
    default: 'Follow-up Needed'
  },
  notes: {
    type: String,
    default: ''
  },
  audioUrl: {
    type: String,
    default: ''
  },
  // Recording audio lives in AWS S3 ('amplify'), identified by storageKey.
  // 'external' means audioUrl is a link hosted by the telephony provider.
  // 'local' is LEGACY ONLY — recordings written to this server's own
  // (ephemeral) /recordings/<file> disk route before the move to S3. Nothing
  // writes 'local' any more; it stays in the enum so old rows still load.
  storageKey: {
    type: String,
    default: ''
  },
  storageUrl: {
    type: String,
    default: ''
  },
  storageProvider: {
    type: String,
    enum: ['amplify', 'external', 'local'],
    default: 'amplify'
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  source: {
    type: String,
    enum: ['knowlarity', 'exotel', 'edesy', 'browser_mic', 'uploaded', 'phone_upload', 'phone_sync', 'manual_upload'],
    default: 'browser_mic'
  },
  // Phone-sync: original file name on the counsellor's phone (used to skip duplicates)
  originalFileName: {
    type: String,
    default: ''
  },
  // When the call actually happened (parsed from the phone's file name)
  recordedAt: {
    type: Date
  }
}, {
  timestamps: true
});

callRecordingSchema.index({ isDeleted: 1, createdAt: -1 });
callRecordingSchema.index({ counselorName: 1, isDeleted: 1, createdAt: -1 });
callRecordingSchema.index({ leadId: 1, createdAt: -1 });

export default mongoose.models.CallRecording || mongoose.model('CallRecording', callRecordingSchema);
