import mongoose from 'mongoose';

// First-class Batch entity grouping students under one assigned trainer,
// course, and scheduled time slot (recommended 10–15 students per batch).
const batchSchema = new mongoose.Schema(
  {
    batchCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    batchName: {
      type: String,
      required: true,
      trim: true
    },
    batchKey: {
      type: String,
      required: true,
      unique: true
    },
    course: {
      type: String,
      required: true,
      trim: true
    },
    trainerId: {
      type: String,
      required: true,
      trim: true
    },
    trainerName: {
      type: String,
      required: true,
      trim: true
    },
    scheduledTime: {
      type: String,
      required: true,
      trim: true
    },
    mode: {
      type: String,
      enum: ['Online', 'Classroom'],
      default: 'Online'
    },
    branch: {
      type: String,
      default: '',
      trim: true
    },
    days: {
      type: String,
      default: 'Weekdays',
      trim: true
    },
    startDate: {
      type: String,
      default: ''
    },
    minStudents: {
      type: Number,
      default: 10
    },
    maxStudents: {
      type: Number,
      default: 15
    },
    status: {
      type: String,
      enum: ['Forming', 'Active', 'Completed', 'Archived'],
      default: 'Active'
    },
    notes: {
      type: String,
      default: ''
    },
    createdBy: {
      type: String,
      default: ''
    },
    updatedBy: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

batchSchema.index({ trainerId: 1, course: 1, scheduledTime: 1 });
batchSchema.index({ status: 1 });

export default mongoose.models.Batch || mongoose.model('Batch', batchSchema);
