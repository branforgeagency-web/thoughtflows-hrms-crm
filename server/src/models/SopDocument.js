import mongoose from 'mongoose';

// Department SOPs — written and versioned by department heads in the SOP Hub
const sopDocumentSchema = new mongoose.Schema(
  {
    department: { type: String, default: 'HR' },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    category: { type: String, default: 'General' },
    version: { type: Number, default: 1 },
    content: { type: String, default: '' },
    updatedBy: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.models.SopDocument || mongoose.model('SopDocument', sopDocumentSchema);
