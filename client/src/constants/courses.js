// Canonical Course Definitions based on ThoughtFlows Academy Master Fee Sheet
// All Exam Fees converted from USD to INR (1 USD = ₹85)

export const COURSE_CATEGORIES = [
  {
    category: 'CPC Certification Programmes',
    title: 'CPC Certification Programmes',
    icon: '🎯',
    courses: [
      {
        code: 'CPC',
        name: 'CPC – Certified Professional Coder',
        oldFee: 12000,
        newFeeNoDiscount: 15000,
        standardFee: 15000,
        originalFee: 15000,
        courseFee: 14000,
        fee: 14000,
        duration: '45 DAYS',
        examFeeText: '₹70,207 ($814.20 + ₹1k tx fees)',
        examFee: 70207,
        desc: 'Outpatient physician practice & clinic coding credential (AAPC)'
      },
      {
        code: 'CPC Fast track',
        name: 'CPC Fast Track',
        oldFee: 10000,
        newFeeNoDiscount: 13000,
        standardFee: 13000,
        originalFee: 13000,
        courseFee: 11500,
        fee: 11500,
        duration: '30 Days',
        examFeeText: '₹70,207 ($814.20 + ₹1k tx fees)',
        examFee: 70207,
        desc: 'Accelerated CPC exam preparation and intensive mock marathons'
      },
      {
        code: 'CPC+ED',
        name: 'CPC + ED (Emergency Department)',
        oldFee: 18000,
        newFeeNoDiscount: 23000,
        standardFee: 23000,
        originalFee: 23000,
        courseFee: 21000,
        fee: 21000,
        duration: '2 Months',
        examFeeText: '₹70,207 ($814.20 + ₹1k tx fees)',
        examFee: 70207,
        desc: 'Dual certification track: Outpatient CPC plus Emergency Department specialty'
      },
      {
        code: 'CPC+E/M',
        name: 'CPC + E/M (Evaluation & Management)',
        oldFee: 18000,
        newFeeNoDiscount: 23000,
        standardFee: 23000,
        originalFee: 23000,
        courseFee: 21000,
        fee: 21000,
        duration: '2 Months',
        examFeeText: '₹70,207 ($814.20 + ₹1k tx fees)',
        examFee: 70207,
        desc: 'Dual track: Core CPC plus Evaluation & Management specialized coding'
      }
    ]
  },
  {
    category: 'Inpatient Training programmes',
    title: 'Inpatient Training Programmes',
    icon: '🏥',
    courses: [
      {
        code: 'CIC for freshers',
        name: 'CIC for Freshers',
        oldFee: 25000,
        newFeeNoDiscount: 30000,
        standardFee: 30000,
        originalFee: 30000,
        courseFee: 29000,
        fee: 29000,
        duration: '2 Months',
        examFeeText: '₹71,230 ($838 USD)',
        examFee: 71230,
        desc: 'Certified Inpatient Coder track tailored for fresh healthcare graduates'
      },
      {
        code: 'CIC (Exp in IPDRG)',
        name: 'CIC (If candidate has experience in IPDRG)',
        oldFee: 18000,
        newFeeNoDiscount: 23000,
        standardFee: 23000,
        originalFee: 23000,
        courseFee: 21000,
        fee: 21000,
        duration: '2 Months',
        examFeeText: '₹71,230 ($838 USD)',
        examFee: 71230,
        desc: 'Advanced Inpatient coding track for experienced IPDRG coders'
      },
      {
        code: 'IP-DRG',
        name: 'IP-DRG (Inpatient Diagnosis Related Groups)',
        oldFee: 15000,
        newFeeNoDiscount: 20000,
        standardFee: 20000,
        originalFee: 20000,
        courseFee: 17500,
        fee: 17500,
        duration: '45 DAYS',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'MS-DRG, APR-DRG assignment, MCC/CC complication captures'
      },
      {
        code: 'CIC Fast Track',
        name: 'CIC Fast Track',
        oldFee: 10000,
        newFeeNoDiscount: 12000,
        standardFee: 12000,
        originalFee: 12000,
        courseFee: 10000,
        fee: 10000,
        duration: '30 Days',
        examFeeText: 'No booking',
        examFee: 0,
        desc: 'Rapid inpatient coding revision for experienced hospital coders'
      },
      {
        code: 'CCS',
        name: 'CCS – Certified Coding Specialist (AHIMA)',
        oldFee: 25000,
        newFeeNoDiscount: 30000,
        standardFee: 30000,
        originalFee: 30000,
        courseFee: 29000,
        fee: 29000,
        duration: '45 Days',
        examFeeText: '₹33,915 ($399 USD)',
        examFee: 33915,
        desc: 'AHIMA hospital inpatient & outpatient coding mastery'
      },
      {
        code: 'CCS (Exp in IPDRG)',
        name: 'CCS (If candidate has experience in IPDRG)',
        oldFee: 18000,
        newFeeNoDiscount: 23000,
        standardFee: 23000,
        originalFee: 23000,
        courseFee: 21000,
        fee: 21000,
        duration: '45 Days',
        examFeeText: '₹33,915 ($399 USD)',
        examFee: 33915,
        desc: 'AHIMA CCS certification for coders with prior IPDRG experience'
      },
      {
        code: 'CIC + IP Specialty',
        name: 'CIC + IP Specialty',
        oldFee: 25000,
        newFeeNoDiscount: 30000,
        standardFee: 30000,
        originalFee: 30000,
        courseFee: 29000,
        fee: 29000,
        duration: '2 Months',
        examFeeText: '₹71,230 ($838 USD)',
        examFee: 71230,
        desc: 'Inpatient coding plus advanced hospital facility specialty'
      },
      {
        code: 'CCS + IP Specialty',
        name: 'CCS + IP Specialty',
        oldFee: 25000,
        newFeeNoDiscount: 30000,
        standardFee: 30000,
        originalFee: 30000,
        courseFee: 29000,
        fee: 29000,
        duration: '2 Months',
        examFeeText: '₹33,915 ($399 USD)',
        examFee: 33915,
        desc: 'AHIMA CCS combined with inpatient hospital specialty'
      },
      {
        code: 'CPC+CIC',
        name: 'CPC + CIC (Fresher progression without anatomy)',
        oldFee: 35000,
        newFeeNoDiscount: 40000,
        standardFee: 40000,
        originalFee: 40000,
        courseFee: 35000,
        fee: 35000,
        duration: '3 Months',
        examFeeText: 'AAPC / AHIMA Vouchers',
        examFee: 70207,
        desc: 'Comprehensive progression track: CPC outpatient to CIC inpatient'
      }
    ]
  },
  {
    category: 'Outpatient Training programme',
    title: 'Outpatient Training Programme',
    icon: '🏢',
    courses: [
      {
        code: 'COC',
        name: 'COC – Certified Outpatient Coder',
        oldFee: 12000,
        newFeeNoDiscount: 15000,
        standardFee: 15000,
        originalFee: 15000,
        courseFee: 14000,
        fee: 14000,
        duration: '45 DAYS',
        examFeeText: '₹72,230 ($838 + ₹1k tx fees)',
        examFee: 72230,
        desc: 'Hospital outpatient clinic, ASC & emergency coding credential'
      }
    ]
  },
  {
    category: 'Surgery Training programme',
    title: 'Surgery Training Programme',
    icon: '✂️',
    courses: [
      {
        code: 'Surgery',
        name: 'Surgery Specialty Coding',
        oldFee: 15000,
        newFeeNoDiscount: 20000,
        standardFee: 20000,
        originalFee: 20000,
        courseFee: 17500,
        fee: 17500,
        duration: '45 DAYS',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'Operative report procedural coding across surgical subspecialties'
      },
      {
        code: 'CGSC',
        name: 'CGSC – Certified General Surgery Coder',
        oldFee: 20000,
        newFeeNoDiscount: 25000,
        standardFee: 25000,
        originalFee: 25000,
        courseFee: 23500,
        fee: 23500,
        duration: '60 Days',
        examFeeText: '₹72,230 ($838 + ₹1k tx fees)',
        examFee: 72230,
        desc: 'AAPC General surgery specialty certification track'
      }
    ]
  },
  {
    category: 'Auditing Training programme',
    title: 'Auditing Training Programme',
    icon: '🔍',
    courses: [
      {
        code: 'CPMA',
        name: 'CPMA – Certified Professional Medical Auditor',
        oldFee: 15000,
        newFeeNoDiscount: 20000,
        standardFee: 20000,
        originalFee: 20000,
        courseFee: 17500,
        fee: 17500,
        duration: '45 DAYS',
        examFeeText: '₹72,230 ($838 + ₹1k tx fees)',
        examFee: 72230,
        desc: 'Medical chart auditing, compliance rules & fraud prevention'
      }
    ]
  },
  {
    category: 'E/M and ED Training programmes',
    title: 'E/M and ED Training Programmes',
    icon: '🚑',
    courses: [
      {
        code: 'ED',
        name: 'ED – Emergency Department Coding',
        oldFee: 7000,
        newFeeNoDiscount: 10000,
        standardFee: 10000,
        originalFee: 10000,
        courseFee: 8000,
        fee: 8000,
        duration: '20 Days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'Emergency room rapid triage, facility & professional coding'
      },
      {
        code: 'E/M',
        name: 'E/M – Evaluation and Management',
        oldFee: 7000,
        newFeeNoDiscount: 10000,
        standardFee: 10000,
        originalFee: 10000,
        courseFee: 8000,
        fee: 8000,
        duration: '20 Days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'Medical decision making complexity & time-based E/M coding'
      },
      {
        code: 'ED&E/M',
        name: 'ED & E/M Combined Training',
        oldFee: 13000,
        newFeeNoDiscount: 17000,
        standardFee: 17000,
        originalFee: 17000,
        courseFee: 15000,
        fee: 15000,
        duration: '30 Days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'Combined Emergency Department and Evaluation & Management coding'
      },
      {
        code: 'ED Profee',
        name: 'ED Profee (Professional Fee Coding)',
        oldFee: 3500,
        newFeeNoDiscount: 5000,
        standardFee: 5000,
        originalFee: 5000,
        courseFee: 4000,
        fee: 4000,
        duration: '10 days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'Emergency physician professional fee component coding'
      },
      {
        code: 'ED Facility',
        name: 'ED Facility Coding',
        oldFee: 3500,
        newFeeNoDiscount: 5000,
        standardFee: 5000,
        originalFee: 5000,
        courseFee: 4000,
        fee: 4000,
        duration: '10 days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'Emergency hospital facility level assignment and coding'
      },
      {
        code: 'EM IP & OP',
        name: 'E/M Inpatient & Outpatient',
        oldFee: 10000,
        newFeeNoDiscount: 13000,
        standardFee: 13000,
        originalFee: 13000,
        courseFee: 11500,
        fee: 11500,
        duration: '30 Days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'Full spectrum Evaluation & Management for hospital & clinic settings'
      },
      {
        code: 'CEDC',
        name: 'CEDC – Certified Emergency Department Coder',
        oldFee: 18000,
        newFeeNoDiscount: 23000,
        standardFee: 23000,
        originalFee: 23000,
        courseFee: 21000,
        fee: 21000,
        duration: '45 Days',
        examFeeText: '₹72,230 ($838 + ₹1k tx fees)',
        examFee: 72230,
        desc: 'AAPC specialty certification for Emergency Department coders'
      },
      {
        code: 'CEMC',
        name: 'CEMC – Certified Evaluation & Management Coder',
        oldFee: 18000,
        newFeeNoDiscount: 23000,
        standardFee: 23000,
        originalFee: 23000,
        courseFee: 21000,
        fee: 21000,
        duration: '45 Days',
        examFeeText: '₹72,230 ($838 + ₹1k tx fees)',
        examFee: 72230,
        desc: 'AAPC specialty certification for E/M coding professionals'
      }
    ]
  },
  {
    category: 'Risk Adjustment Training Programmes',
    title: 'Risk Adjustment Training Programmes',
    icon: '📈',
    courses: [
      {
        code: 'HCC',
        name: 'HCC Risk Adjustment Coding',
        oldFee: 10000,
        newFeeNoDiscount: 13000,
        standardFee: 13000,
        originalFee: 13000,
        courseFee: 11500,
        fee: 11500,
        duration: '30 days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'Hierarchical Condition Categories (HCC) & RAF score documentation'
      },
      {
        code: 'CRC',
        name: 'CRC – Certified Risk Adjustment Coder',
        oldFee: 12000,
        newFeeNoDiscount: 15000,
        standardFee: 15000,
        originalFee: 15000,
        courseFee: 14000,
        fee: 14000,
        duration: '45 Days',
        examFeeText: '₹72,230 ($838 + ₹1k tx fees)',
        examFee: 72230,
        desc: 'AAPC Medicare Advantage & Commercial Risk Adjustment credential'
      }
    ]
  },
  {
    category: 'Other Training Programmes',
    title: 'Other Training Programmes',
    icon: '📚',
    courses: [
      {
        code: 'IVR Specialty',
        name: 'Interventional Radiology Specialty',
        oldFee: 15000,
        newFeeNoDiscount: 20000,
        standardFee: 20000,
        originalFee: 20000,
        courseFee: 17500,
        fee: 17500,
        duration: '20 days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'Vascular catheterization & diagnostic/therapeutic IVR coding'
      },
      {
        code: 'Radiology',
        name: 'Radiology Specialty Coding',
        oldFee: 15000,
        newFeeNoDiscount: 20000,
        standardFee: 20000,
        originalFee: 20000,
        courseFee: 17500,
        fee: 17500,
        duration: '20-25 days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'Diagnostic imaging, CT, MRI, Ultrasound & Nuclear Medicine'
      },
      {
        code: 'Anesthesia',
        name: 'Anesthesia Specialty Coding',
        oldFee: 10000,
        newFeeNoDiscount: 13000,
        standardFee: 13000,
        originalFee: 13000,
        courseFee: 11500,
        fee: 11500,
        duration: '30 days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'Base units, time calculations, physical status modifiers & pain management'
      },
      {
        code: 'CPB',
        name: 'CPB – Certified Professional Biller',
        oldFee: 15000,
        newFeeNoDiscount: 20000,
        standardFee: 20000,
        originalFee: 20000,
        courseFee: 17500,
        fee: 17500,
        duration: '45 Days',
        examFeeText: '₹72,230 ($838 + ₹1k tx fees)',
        examFee: 72230,
        desc: 'AAPC revenue cycle management & claims life cycle credential'
      },
      {
        code: 'Anatomy Alone',
        name: 'Medical Anatomy Alone',
        oldFee: 7000,
        newFeeNoDiscount: 9000,
        standardFee: 9000,
        originalFee: 9000,
        courseFee: 8000,
        fee: 8000,
        duration: '15 Days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'Human anatomy, medical terminology & body systems foundation'
      },
      {
        code: 'CPT Alone',
        name: 'CPT Coding Alone',
        oldFee: 7000,
        newFeeNoDiscount: 9000,
        standardFee: 9000,
        originalFee: 9000,
        courseFee: 8000,
        fee: 8000,
        duration: '20 Days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'AMA CPT procedural coding guidelines & surgical coding rules'
      },
      {
        code: 'ICD Alone',
        name: 'ICD-10-CM Alone',
        oldFee: 7000,
        newFeeNoDiscount: 9000,
        standardFee: 9000,
        originalFee: 9000,
        courseFee: 8000,
        fee: 8000,
        duration: '15 Days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'ICD-10-CM diagnostic classification & official coding guidelines'
      },
      {
        code: 'Anatomy + PCS',
        name: 'Anatomy + ICD-10-PCS Combined',
        oldFee: 15000,
        newFeeNoDiscount: 18000,
        standardFee: 18000,
        originalFee: 18000,
        courseFee: 17000,
        fee: 17000,
        duration: '30 Days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'Medical anatomy foundation combined with hospital ICD-10-PCS'
      },
      {
        code: 'Anatomy + CCS',
        name: 'Anatomy + CCS Track',
        oldFee: 27000,
        newFeeNoDiscount: 27000,
        standardFee: 27000,
        originalFee: 27000,
        courseFee: 25000,
        fee: 25000,
        duration: '45 Days',
        examFeeText: '₹33,915 ($399 USD)',
        examFee: 33915,
        desc: 'Anatomy foundation combined with AHIMA CCS hospital credential'
      },
      {
        code: 'PCS Alone',
        name: 'ICD-10-PCS Alone',
        oldFee: 10000,
        newFeeNoDiscount: 13000,
        standardFee: 13000,
        originalFee: 13000,
        courseFee: 11500,
        fee: 11500,
        duration: '20 Days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'Inpatient procedural coding system (ICD-10-PCS) standalone track'
      },
      {
        code: 'AR calling (with billing)',
        name: 'AR Calling (With Billing)',
        oldFee: 12000,
        newFeeNoDiscount: 15000,
        standardFee: 15000,
        originalFee: 15000,
        courseFee: 13500,
        fee: 13500,
        duration: '30 Days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'Accounts Receivable follow-up & US medical billing processes'
      },
      {
        code: 'AR calling (Without billing)',
        name: 'AR Calling (Without Billing)',
        oldFee: 8000,
        newFeeNoDiscount: 11000,
        standardFee: 11000,
        originalFee: 11000,
        courseFee: 9500,
        fee: 9500,
        duration: '20 Days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'Insurance denial resolution & AR caller voice/process training'
      },
      {
        code: 'CPT + HCPCS',
        name: 'CPT + HCPCS (without ICD)',
        oldFee: 10000,
        newFeeNoDiscount: 13000,
        standardFee: 13000,
        originalFee: 13000,
        courseFee: 11500,
        fee: 11500,
        duration: '25 Days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'Outpatient procedural CPT & HCPCS Level II coding without ICD'
      },
      {
        code: 'SDS',
        name: 'SDS – Same Day Surgery',
        oldFee: 10000,
        newFeeNoDiscount: 13000,
        standardFee: 13000,
        originalFee: 13000,
        courseFee: 11500,
        fee: 11500,
        duration: '25 to 30 days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'Ambulatory surgical center & same-day surgery coding'
      },
      {
        code: 'Home Health Coding',
        name: 'Home Health Coding',
        oldFee: 10000,
        newFeeNoDiscount: 15000,
        standardFee: 15000,
        originalFee: 15000,
        courseFee: 13000,
        fee: 13000,
        duration: '30 Days',
        examFeeText: 'NO EXAM',
        examFee: 0,
        desc: 'OASIS documentation & home health agency clinical coding'
      },
      {
        code: 'Anesthesia+CCS(Fresher)',
        name: 'Anesthesia + CCS (Fresher)',
        oldFee: 28000,
        newFeeNoDiscount: 33000,
        standardFee: 33000,
        originalFee: 33000,
        courseFee: 31000,
        fee: 31000,
        duration: '60 Days',
        examFeeText: '₹33,915 ($399 USD)',
        examFee: 33915,
        desc: 'Combined Anesthesia specialty & AHIMA CCS hospital track for freshers'
      },
      {
        code: 'Anesthesia+CCS(Exp)',
        name: 'Anesthesia + CCS (Exp in IPDRG)',
        oldFee: 22000,
        newFeeNoDiscount: 26000,
        standardFee: 26000,
        originalFee: 26000,
        courseFee: 24000,
        fee: 24000,
        duration: '45 Days',
        examFeeText: '₹33,915 ($399 USD)',
        examFee: 33915,
        desc: 'Anesthesia + CCS track tailored for coders with prior IPDRG experience'
      }
    ]
  }
];

// Flat list of all 44 courses
export const ALL_COURSES = COURSE_CATEGORIES.flatMap(cat =>
  cat.courses.map(c => ({
    ...c,
    category: cat.category,
    categoryTitle: cat.title,
    fullLabel: `${c.code} — ${c.name}`
  }))
);

// Trainer Courses for Demo booking and faculty allocation
export const TRAINER_COURSES = ALL_COURSES.map(c => ({
  key: c.code,
  label: `${c.code} — ${c.name}`,
  category: c.category
}));

// Quick lookup map by code
export const COURSE_BY_CODE = ALL_COURSES.reduce((acc, c) => {
  acc[c.code.toUpperCase()] = c;
  return acc;
}, {});

// Helper to format course name nicely
export const formatCourseDisplay = (courseStr = '') => {
  if (!courseStr) return '';
  const clean = courseStr.trim().toUpperCase();
  if (COURSE_BY_CODE[clean]) {
    return `${COURSE_BY_CODE[clean].code} — ${COURSE_BY_CODE[clean].name}`;
  }
  return courseStr;
};
