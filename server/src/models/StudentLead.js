import mongoose from 'mongoose';

const studentLeadSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: String,
  branch: {
    type: String,
    required: true
  },
  counselorAssigned: String,
  stage: {
    type: String,
    enum: [
      'first_call',
      'counseling_booked',
      'enrolled',
      'in_training',
      'cpc_exam_passed',
      'interview_prep',
      'placed',
      'first_paycheck'
    ],
    default: 'first_call'
  },
  courseEnrolled: {
    type: String,
    default: 'CPC Certified Medical Coding Masterclass'
  },
  batchDate: Date,
  placementCompany: String,
  firstSalary: Number
}, {
  timestamps: true
});

export default mongoose.models.StudentLead || mongoose.model('StudentLead', studentLeadSchema);
