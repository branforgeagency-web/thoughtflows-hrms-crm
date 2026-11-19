import mongoose from 'mongoose';

// Consultations → Booking Links (Head of Trainer). A public page
// /book/<slug> lets a candidate pick a free slot; booking creates a Demo.
const bookingLinkSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    durationMin: { type: Number, default: 60 },
    // Courses the candidate can choose from (blank = any course)
    courses: { type: [String], default: [] },
    languages: { type: [String], default: ['Tamil', 'English'] },
    branch: { type: String, default: '' },
    // 'auto' = any free matching trainer; 'trainer' = always this trainer
    hostMode: { type: String, enum: ['auto', 'trainer'], default: 'auto' },
    trainerId: { type: String, default: '' },
    trainerName: { type: String, default: '' },
    // Bookable window
    days: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
    windowStartMin: { type: Number, default: 10 * 60 },
    windowEndMin: { type: Number, default: 18 * 60 },
    minNoticeHours: { type: Number, default: 2 },
    maxDaysAhead: { type: Number, default: 14 },
    active: { type: Boolean, default: true },
    createdBy: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.models.BookingLink || mongoose.model('BookingLink', bookingLinkSchema);
