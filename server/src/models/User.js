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
  username: {
    type: String,
    default: '',
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    default: ''
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
    default: ''
  },
  // Training org-chart assignment (Head of Trainer settable) — which zone a
  // Trainer Manager/TL covers, and which Manager a Trainer TL reports to.
  zone: {
    type: String,
    default: ''
  },
  zoneLabel: {
    type: String,
    default: ''
  },
  managerId: {
    type: String,
    default: ''
  },
  managerName: {
    type: String,
    default: ''
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
  // Employee photo (small JPEG data URL, resized in the browser). select:false keeps it
  // out of every user list — ask for it with .select('+photo') where it is shown.
  photo: {
    type: String,
    default: '',
    select: false
  },
  avatarBg: {
    type: String,
    default: 'bg-indigo-600'
  },
  createdFrom: {
    type: String,
    default: ''
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

userSchema.index({ department: 1, active: 1, status: 1 });
userSchema.index({ branch: 1, active: 1 });
userSchema.index({ role: 1, active: 1 });

export default mongoose.models.User || mongoose.model('User', userSchema);
