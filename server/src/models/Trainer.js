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
    // This trainer's own Zoom user (licensed, inside the same Zoom account).
    // Demo meetings are created under and hosted by this user so several
    // trainers can run demos at the same time. Falls back to ZOOM_HOST_EMAIL.
    zoomEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true
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
    // Login email of the trainer's portal account — used to attach this
    // roster record to the signed-in trainer
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true
    },
    role: { type: String, default: '' },
    // Recurring batch class link used in the Class Session Room
    classZoomLink: { type: String, default: '' },
    workingDays: { type: String, default: '' },
    maxSessionsPerDay: { type: Number, default: 0 },
    certifications: { type: [String], default: [] },
    // Skill matrix: level L1–L4 (only L2+ can be allocated a subject)
    skills: {
      type: [{ name: String, level: String }],
      default: []
    },
    specialEligibility: { type: [String], default: [] },
    // Pay configuration (admin-managed). 0 = not configured.
    variablePayBase: { type: Number, default: 0 },
    demoIncentive: { type: Number, default: 0 },
    admissionIncentive: { type: Number, default: 0 },
    scheduledClasses: {
      type: [
        {
          name: String,
          timeSlot: String,
          startMin: Number,
          endMin: Number,
          // Batch this class belongs to (shown on the students' timetable) and
          // the weekdays it runs on, e.g. "Mon-Fri" / "Mon,Wed,Fri" (blank = every working day)
          batch: String,
          days: String
        }
      ],
      default: []
    },
    // Leave / unavailable days — demo matching skips the trainer on these dates
    leaves: {
      type: [
        {
          from: String, // YYYY-MM-DD
          to: String, // YYYY-MM-DD (inclusive)
          reason: String,
          createdAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

export default mongoose.models.Trainer || mongoose.model('Trainer', trainerSchema);
