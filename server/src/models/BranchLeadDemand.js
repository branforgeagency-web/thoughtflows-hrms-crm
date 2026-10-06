import mongoose from 'mongoose';

// A branch's request to Marketing for more leads. Delivered leads are counted
// live from StudentLead (branch + course, created since the request).
const branchLeadDemandSchema = new mongoose.Schema(
  {
    branch: { type: String, required: true },
    course: { type: String, default: 'CPC' },
    targetLeads: { type: Number, required: true, min: 1 },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    requester: { type: String, default: '' },
    language: { type: String, default: '' },
    deadline: { type: String, default: '' }, // YYYY-MM-DD
    status: { type: String, default: 'Requested' }, // Requested | Campaign Live | Leads Delivered | Closed
    campaignCode: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.models.BranchLeadDemand || mongoose.model('BranchLeadDemand', branchLeadDemandSchema);
