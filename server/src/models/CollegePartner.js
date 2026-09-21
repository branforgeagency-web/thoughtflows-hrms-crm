import mongoose from 'mongoose';

const collegePartnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  city: {
    type: String,
    default: 'Coimbatore'
  },
  type: {
    type: String,
    default: 'Arts & Science'
  },
  decisionMaker: String,
  phone: String,
  email: String,
  mouStatus: {
    type: String,
    default: 'In Discussion'
  },
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
