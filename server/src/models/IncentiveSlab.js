import mongoose from 'mongoose';

const incentiveSlabSchema = new mongoose.Schema({
  slab: {
    type: String,
    required: true
  },
  range: {
    type: String,
    required: true
  },
  min: {
    type: Number,
    required: true
  },
  max: {
    type: Number,
    required: true
  },
  rate: {
    type: Number,
    required: true
  },
  labelRate: String,
  milestoneBonus: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    default: 'Active Tier'
  },
  note: String,
  isCurrent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.models.IncentiveSlab || mongoose.model('IncentiveSlab', incentiveSlabSchema);
