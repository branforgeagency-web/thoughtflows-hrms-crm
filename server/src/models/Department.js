import mongoose from 'mongoose';

// Department master. memberCount and head are computed live from staff
// accounts (User collection) by /api/departments.
const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  code: {
    type: String,
    required: true
  },
  // Dashboard id this department logs into (hr, training, cccp, ...)
  dashboard: {
    type: String,
    default: ''
  },
  description: String,
  head: {
    type: String,
    default: ''
  },
  icon: String,
  color: String
}, {
  timestamps: true
});

export default mongoose.models.Department || mongoose.model('Department', departmentSchema);
