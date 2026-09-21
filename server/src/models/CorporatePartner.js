import mongoose from 'mongoose';

const corporatePartnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  city: {
    type: String,
    default: 'Chennai'
  },
  type: {
    type: String,
    default: 'Medical Coding'
  },
  contact: String,
  phone: String,
  email: String,
  hiring: {
    type: String,
    default: 'Actively Hiring'
  },
  trainingInterest: {
    type: String,
    default: 'No'
  },
  stage: {
    type: String,
    default: 'Identified'
  },
  activeVacancies: {
    type: Number,
    default: 10
  },
  notes: String
}, {
  timestamps: true
});

export default mongoose.models.CorporatePartner || mongoose.model('CorporatePartner', corporatePartnerSchema);
