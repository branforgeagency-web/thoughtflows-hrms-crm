import mongoose from 'mongoose';

const callRecordingSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentLead'
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
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  source: {
    type: String,
    enum: ['knowlarity', 'exotel', 'edesy', 'browser_mic', 'uploaded', 'phone_upload', 'phone_sync'],
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

export default mongoose.models.CallRecording || mongoose.model('CallRecording', callRecordingSchema);
