import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'Staff'
  },
  department: {
    type: String,
    default: 'Medical Coding Faculty'
  },
  branch: {
    type: String,
    default: 'Gandhipuram'
  },
  status: {
    type: String,
    default: 'Active'
  },
  lastLogin: {
    type: String,
    default: 'Never'
  },
  initials: {
    type: String,
    default: 'TF'
  },
  avatarBg: {
    type: String,
    default: 'bg-indigo-600'
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.models.User || mongoose.model('User', userSchema);
