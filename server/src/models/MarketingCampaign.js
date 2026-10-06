import mongoose from 'mongoose';

const marketingCampaignSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'Live'
  },
  statusClass: String,
  channel: {
    type: String,
    default: ''
  },
  branch: {
    type: String,
    default: 'All'
  },
  course: {
    type: String,
    default: ''
  },
  dailyBudget: {
    type: Number,
    default: 0
  },
  spent: {
    type: Number,
    default: 0
  },
  budget: {
    type: Number,
    default: 0
  },
  targetCpl: {
    type: Number,
    default: 0
  },
  ctr: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

export default mongoose.models.MarketingCampaign || mongoose.model('MarketingCampaign', marketingCampaignSchema);
