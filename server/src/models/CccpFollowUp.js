import mongoose from 'mongoose';

const cccpFollowUpSchema = new mongoose.Schema({
  title: String,
  who: String,
  action: String,
  vertical: String,
  date: String,
  time: String,
  targetName: String,
  type: {
    type: String,
    default: 'Campus'
  },
  status: {
    type: String,
    default: 'Upcoming'
  },
  notes: String
}, {
  timestamps: true
});

export default mongoose.models.CccpFollowUp || mongoose.model('CccpFollowUp', cccpFollowUpSchema);
