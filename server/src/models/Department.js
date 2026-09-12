import mongoose from 'mongoose';

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
  description: String,
  head: String,
  memberCount: {
    type: Number,
    default: 0
  },
  icon: String,
  color: String
}, {
  timestamps: true
});

export default mongoose.models.Department || mongoose.model('Department', departmentSchema);
