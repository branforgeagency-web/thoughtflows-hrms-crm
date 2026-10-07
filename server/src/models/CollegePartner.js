import mongoose from 'mongoose';

const collegePartnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  code: { type: String, default: '' },
  city: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'Arts & Science'
  },
  decisionMaker: String,
  phone: String,
  email: String,
  // 'Not Signed' | 'Draft' | 'Signed'
  mouStatus: {
    type: String,
    default: 'Not Signed'
  },
  studentStrength: { type: Number, default: null },
  workshopCount: {
    type: Number,
    default: 0
  },
  stage: {
    type: String,
    default: 'Listed'
  },
  status: {
    type: String,
    default: 'Active'
  },
  notes: String
}, {
  timestamps: true
});

export default mongoose.models.CollegePartner || mongoose.model('CollegePartner', collegePartnerSchema);
