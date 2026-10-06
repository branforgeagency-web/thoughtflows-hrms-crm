import mongoose from 'mongoose';

// Marketing content calendar item
const contentPieceSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    channel: { type: String, default: 'Instagram' },
    category: { type: String, default: '' },
    dueDate: { type: String, default: '' }, // YYYY-MM-DD
    author: { type: String, default: '' },
    status: { type: String, default: 'Design Pending' },
    description: { type: String, default: '' },
    format: { type: String, default: '' },
    targetBranch: { type: String, default: 'All Branches' },
    caption: { type: String, default: '' },
    createdBy: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.models.ContentPiece || mongoose.model('ContentPiece', contentPieceSchema);
