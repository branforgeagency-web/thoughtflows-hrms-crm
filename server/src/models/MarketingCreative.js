import mongoose from 'mongoose';

const marketingCreativeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  format: {
    type: String,
    default: 'Poster'
  },
  campaignCode: String,
  author: String,
  priority: {
    type: String,
    default: 'medium'
  },
  status: {
    type: String,
    default: 'Submitted'
  },
  specs: String,
  previewColor: String,
  tagline: String,
  branch: String,
  notes: String
}, {
  timestamps: true
});

export default mongoose.models.MarketingCreative || mongoose.model('MarketingCreative', marketingCreativeSchema);
