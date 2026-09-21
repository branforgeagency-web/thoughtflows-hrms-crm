import mongoose from 'mongoose';

const billingDealSchema = new mongoose.Schema({
  deal: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'Campus'
  },
  amount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    default: 'Payment Pending'
  },
  invoiceDate: String,
  paidDate: String,
  notes: String
}, {
  timestamps: true
});

export default mongoose.models.BillingDeal || mongoose.model('BillingDeal', billingDealSchema);
