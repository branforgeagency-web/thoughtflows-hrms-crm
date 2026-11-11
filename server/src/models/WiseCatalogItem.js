import mongoose from 'mongoose';

const wiseCatalogItemSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      required: true,
      enum: [
        'course',
        'sub_course',
        'subject',
        'chapter',
        'topic',
        'instruction_file',
        'document',
        'news',
        'notification',
        'passage',
        'instruction_part',
        'test_series',
        'video_series',
        'pdf'
      ]
    },
    title: { type: String, required: true, trim: true },
    code: { type: String, default: '', trim: true },
    parentName: { type: String, default: '', trim: true },
    course: { type: String, default: '', trim: true },
    subject: { type: String, default: '', trim: true },
    chapter: { type: String, default: '', trim: true },
    description: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    linkedCount: { type: Number, default: 0 },
    targetAudience: { type: String, default: 'All' },
    status: { type: String, enum: ['Active', 'Draft', 'Archived'], default: 'Active' },
    order: { type: Number, default: 0 },
    createdBy: { type: String, default: 'WiseApp Admin' }
  },
  { timestamps: true }
);

wiseCatalogItemSchema.index({ kind: 1, status: 1, createdAt: -1 });

export default mongoose.models.WiseCatalogItem || mongoose.model('WiseCatalogItem', wiseCatalogItemSchema);
