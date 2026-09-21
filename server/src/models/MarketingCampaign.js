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
    default: 'Meta Ads (IG / FB)'
  },
  branch: {
    type: String,
    default: 'All'
  },
  course: {
    type: String,
    default: 'CPC'
  },
  dailyBudget: {
    type: Number,
    default: 2000
  },
  spent: {
    type: Number,
    default: 0
  },
  budget: {
    type: Number,
    default: 25000
  },
  leads: {
    type: Number,
    default: 0
  },
  cpl: {
    type: Number,
    default: 150
  },
  targetCpl: {
    type: Number,
    default: 160
  },
  admissions: {
    type: Number,
    default: 0
  },
  roi: {
    type: String,
    default: '450%'
  },
  ctr: {
    type: String,
    default: '3.2%'
  }
}, {
  timestamps: true
});

export default mongoose.models.MarketingCampaign || mongoose.model('MarketingCampaign', marketingCampaignSchema);
