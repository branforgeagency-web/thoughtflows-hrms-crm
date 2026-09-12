import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
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
  manager: String,
  phone: String,
  activeStudents: {
    type: Number,
    default: 0
  },
  staffCount: {
    type: Number,
    default: 0
  },
  coordinates: {
    lat: Number,
    lng: Number
  }
}, {
  timestamps: true
});

export default mongoose.models.Branch || mongoose.model('Branch', branchSchema);
