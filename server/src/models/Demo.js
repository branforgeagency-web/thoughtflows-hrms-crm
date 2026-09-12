import mongoose from 'mongoose';

const demoSchema = new mongoose.Schema({
  candidateName: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  course: {
    type: String,
    default: 'CPC Intensive Medical Coding'
  },
  mode: {
    type: String,
    default: 'Online (Zoom Live)'
  },
  preferredDate: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  },
  time: {
    type: String,
    default: 'Today 17:00'
  },
  timeSlot: {
    type: String,
    default: '4:00–6:00 PM'
  },
  language: {
    type: String,
    default: 'Tamil'
  },
  trainer: {
    type: String,
    default: 'Dr. Vikram C.'
  },
  trainerMapping: {
    type: String,
    default: 'Maps to Revathi K · Tamil · Anatomy + ICD-10-CM · 90% · load 2/5'
  },
  status: {
    type: String,
    enum: ['booked', 'confirmed', 'attended', 'missed', 'fee'],
    default: 'booked'
  },
  link: {
    type: String,
    default: 'https://zoom.us/j/9823412345'
  },
  note: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

export default mongoose.models.Demo || mongoose.model('Demo', demoSchema);
