import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'counselor', 'trainer', 'staff'],
    default: 'staff'
  },
  department: {
    type: String,
    default: 'Academics & Training'
  },
  branch: {
    type: String,
    default: 'Main Branch'
  },
  initials: {
    type: String,
    default: 'TF'
  },
  avatarBg: {
    type: String,
    default: '#14b8a6'
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.models.User || mongoose.model('User', userSchema);
