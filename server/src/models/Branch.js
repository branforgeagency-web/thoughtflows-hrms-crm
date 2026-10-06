import mongoose from 'mongoose';

// Academy branch master. Student / staff / lead counts are NOT stored here —
// /api/branches computes them live from the Student, User and StudentLead
// collections, so the numbers can never drift from the real records.
const branchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  code: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    required: true
  },
  state: String,
  country: {
    type: String,
    default: 'India'
  },
  // Other spellings used in lead / student / user records ("SVM", "Kolhapur")
  aliases: {
    type: [String],
    default: []
  },
  manager: {
    type: String,
    default: ''
  },
  phone: String,
  image: {
    type: String,
    default: ''
  },
  // Seats per batch — set by Admin in Branch Setup (0 = not configured)
  capacity: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    default: 'Operational'
  },
  coordinates: {
    lat: Number,
    lng: Number
  }
}, {
  timestamps: true
});

export default mongoose.models.Branch || mongoose.model('Branch', branchSchema);
