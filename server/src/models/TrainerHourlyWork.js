import mongoose from 'mongoose';

// Slot Schema for an individual 1-hour slot in an 8-hour workday
const hourlySlotSchema = new mongoose.Schema(
  {
    slotIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 12
    },
    timeSlot: {
      type: String,
      required: true // e.g. "09:00 AM - 10:00 AM"
    },
    slotType: {
      type: String,
      enum: ['working', 'break', 'meeting', 'leave'],
      default: 'working'
    },
    plannedTask: {
      type: String,
      default: ''
    },
    actualWork: {
      type: String,
      default: ''
    },
    relatedEntity: {
      type: String,
      default: '' // Name/ID of related trainer, batch, or student
    },
    relatedEntityType: {
      type: String,
      enum: ['batch', 'student', 'trainer', 'pod', 'general'],
      default: 'general'
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Delayed', 'Break', 'Leave'],
      default: 'Pending'
    },
    remarks: {
      type: String,
      default: '' // Reason for incomplete work or delay
    },
    plannedHours: {
      type: Number,
      default: 1, // 1 for regular working slots, 0 for breaks/leave
      min: 0,
      max: 1
    },
    actualHours: {
      type: Number,
      default: 0, // 1 if Completed, 0.5 if In Progress, 0 if Pending/Delayed
      min: 0,
      max: 1
    },
    plannedBy: {
      type: String,
      default: '' // TL id/name or self
    },
    updatedBy: {
      type: String,
      default: '' // User who submitted actual progress
    },
    completedAt: {
      type: Date
    }
  },
  { _id: true, timestamps: true }
);

// Daily record tracking hourly work planning and execution for an employee
const trainerHourlyWorkSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    userName: {
      type: String,
      required: true
    },
    userRole: {
      type: String,
      enum: ['trainer', 'tl', 'manager', 'head'],
      required: true,
      index: true
    },
    teamLeadId: {
      type: String,
      default: '',
      index: true
    },
    teamLeadName: {
      type: String,
      default: ''
    },
    managerId: {
      type: String,
      default: '',
      index: true
    },
    managerName: {
      type: String,
      default: ''
    },
    branchName: {
      type: String,
      default: ''
    },
    zone: {
      type: String,
      default: ''
    },
    course: {
      type: String,
      default: '' // e.g. CPC, CIC, CPB, CPMA, CRC — for the Utilization Sheet view
    },
    employmentType: {
      type: String,
      enum: ['Full Time', 'Part Time'],
      default: 'Full Time'
    },
    date: {
      type: String,
      required: true,
      index: true // Format YYYY-MM-DD (IST)
    },
    isLeave: {
      type: Boolean,
      default: false
    },
    leaveReason: {
      type: String,
      default: ''
    },
    slots: {
      type: [hourlySlotSchema],
      default: []
    },
    totalPlannedHours: {
      type: Number,
      default: 8
    },
    totalActualHours: {
      type: Number,
      default: 0
    },
    utilizationPercentage: {
      type: Number,
      default: 0
    },
    completedTasksCount: {
      type: Number,
      default: 0
    },
    pendingTasksCount: {
      type: Number,
      default: 0
    },
    inProgressTasksCount: {
      type: Number,
      default: 0
    },
    delayedTasksCount: {
      type: Number,
      default: 0
    },
    reviewedBy: {
      type: String,
      default: ''
    },
    reviewNotes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

// Ensure one log per user per date
trainerHourlyWorkSchema.index({ userId: 1, date: 1 }, { unique: true });
trainerHourlyWorkSchema.index({ teamLeadId: 1, date: 1 });
trainerHourlyWorkSchema.index({ managerId: 1, date: 1 });
trainerHourlyWorkSchema.index({ userRole: 1, date: 1 });

// Helper to compute hours and utilization percentage accurately
trainerHourlyWorkSchema.methods.recalculateMetrics = function () {
  if (this.isLeave) {
    this.totalPlannedHours = 0;
    this.totalActualHours = 0;
    this.utilizationPercentage = 100; // Exempted leave
    this.completedTasksCount = 0;
    this.pendingTasksCount = 0;
    this.inProgressTasksCount = 0;
    this.delayedTasksCount = 0;
    return;
  }

  let planned = 0;
  let actual = 0;
  let completed = 0;
  let pending = 0;
  let inProgress = 0;
  let delayed = 0;

  (this.slots || []).forEach((slot) => {
    if (slot.slotType === 'break' || slot.slotType === 'leave') {
      slot.plannedHours = 0;
      slot.actualHours = 0;
      return;
    }

    const slotPlanned = typeof slot.plannedHours === 'number' ? slot.plannedHours : 1;
    planned += slotPlanned;

    if (slot.status === 'Completed') {
      slot.actualHours = slotPlanned;
      actual += slotPlanned;
      completed += 1;
    } else if (slot.status === 'In Progress') {
      slot.actualHours = slotPlanned * 0.5;
      actual += slotPlanned * 0.5;
      inProgress += 1;
    } else if (slot.status === 'Delayed') {
      slot.actualHours = 0;
      delayed += 1;
    } else {
      // Pending
      slot.actualHours = 0;
      pending += 1;
    }
  });

  this.totalPlannedHours = planned;
  this.totalActualHours = actual;
  this.utilizationPercentage = planned > 0 ? Math.round((actual / planned) * 1000) / 10 : 0;
  this.completedTasksCount = completed;
  this.pendingTasksCount = pending;
  this.inProgressTasksCount = inProgress;
  this.delayedTasksCount = delayed;
};

// Auto-recalculate before saving
trainerHourlyWorkSchema.pre('save', function (next) {
  this.recalculateMetrics();
  next();
});

export default mongoose.models.TrainerHourlyWork || mongoose.model('TrainerHourlyWork', trainerHourlyWorkSchema);
