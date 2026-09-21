import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  timestamp: {
    type: String,
    default: () => new Date().toISOString().replace('T', ' ').slice(0, 19)
  },
  user: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'General'
  },
  severity: {
    type: String,
    default: 'Info'
  },
  ip: {
    type: String,
    default: '127.0.0.1'
  },
  details: String
}, {
  timestamps: true
});

export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
