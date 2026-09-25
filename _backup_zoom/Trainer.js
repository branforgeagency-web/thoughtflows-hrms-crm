import mongoose from 'mongoose';

const trainerSchema = new mongoose.Schema(
  {
    trainerId: {
      type: String,
      required: true,
      unique: true
    },
    trainerName: {
      type: String,
      required: true
    },
    courseKey: {
      type: String,
      default: ''
    },
    expertCourse: {
      type: String,
      default: ''
    },
    specialization: {
      type: String,
      default: ''
    },
    // Languages this trainer can conduct a demo/class in
    languages: {
      type: [String],
      default: ['Tamil', 'English']
    },
    // Home branch/location this trainer is attached to
    branchName: {
      type: String,
      default: ''
    },
    // "Experienced in Demo" / "Demo Trainer" flag - must be explicitly enabled
    // by an admin before this trainer can receive demo booking notifications
    demoTrainer: {
      type: Boolean,
      default: false
    },
    // Active & eligible to receive demo bookings at all
    active: {
      type: Boolean,
      default: true
    },
    isExperienced: {
      type: Boolean,
      default: true
    },
    experienceLevel: {
      type: String,
      default: ''
    },
    shift: {
      type: String,
      default: ''
    },
    shiftStartMin: {
      type: Number,
      default: 0
    },
    shiftEndMin: {
      type: Number,
      default: 1440
    },
    scheduledClasses: {
      type: [
        {
          name: String,
          timeSlot: String,
          startMin: Number,
          endMin: Number
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

export default mongoose.models.Trainer || mongoose.model('Trainer', trainerSchema);
