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
    required: true
  },
  source: {
    type: String,
    enum: ['exotel', 'browser_mic', 'uploaded'],
    default: 'browser_mic'
  }
}, {
  timestamps: true
});

export default mongoose.models.CallRecording || mongoose.model('CallRecording', callRecordingSchema);
