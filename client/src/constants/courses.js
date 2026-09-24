// Canonical Course Definitions based on ThoughtFlows Academy & Healthcare Accreditation Boards
// Categories: AAPC, Speciality, AHIMA, HIMAA + Foundation Tracks

export const COURSE_CATEGORIES = [
  {
    category: 'AAPC',
    title: 'AAPC Certifications',
    courses: [
      { 
        code: 'CPC', 
        name: 'Certified Professional Coder', 
        duration: '3 Months', 
        originalFee: 22000, 
        standardFee: 16000, 
        fee: 15000, 
        examFee: 22000, 
        total: 37000, 
        desc: 'Outpatient physician office & clinic coding credential' 
      },
      { 
        code: 'CIC', 
        name: 'Certified Inpatient Coder', 
        duration: '4 Months', 
        originalFee: 29000, 
        standardFee: 25000, 
        fee: 23000, 
        examFee: 22000, 
        total: 45000, 
        desc: 'Inpatient hospital facility coding & ICD-10-PCS' 
      },
      { 
        code: 'CPMA', 
        name: 'Certified Professional Medical Auditor', 
        duration: '2 Months', 
        originalFee: 22000, 
        standardFee: 18000, 
        fee: 16000, 
        examFee: 22000, 
        total: 38000, 
        desc: 'Medical chart auditing, compliance & fraud prevention' 
      },
      { 
        code: 'COC', 
        name: 'Certified Outpatient Coder', 
        duration: '3 Months', 
        originalFee: 25000, 
        standardFee: 21000, 
        fee: 19000, 
        examFee: 22000, 
        total: 41000, 
        desc: 'Hospital outpatient clinic, ASC & emergency coding' 
      },
      { 
        code: 'CRC', 
        name: 'Certified Risk Adjustment Coder', 
        duration: '2 Months', 
        originalFee: 22000, 
        standardFee: 18000, 
        fee: 16000, 
        examFee: 22000, 
        total: 38000, 
        desc: 'Medicare Advantage HCC risk adjustment documentation' 
      },
      { 
        code: 'CPB', 
        name: 'Certified Professional Biller', 
        duration: '2 Months', 
        originalFee: 20000, 
        standardFee: 17000, 
        fee: 15000, 
        examFee: 22000, 
        total: 37000, 
        desc: 'Healthcare reimbursement, revenue cycle management & claim life cycle' 
      },
      { 
        code: 'CEDC', 
        name: 'Certified Emergency Department Coder', 
        duration: '2 Months', 
        originalFee: 22000, 
        standardFee: 18000, 
        fee: 16000, 
        examFee: 22000, 
        total: 38000, 
        desc: 'Emergency department surgical and E/M coding' 
      },
      { 
        code: 'CEMC', 
        name: 'Certified Evaluation and Management Coder', 
        duration: '2 Months', 
        originalFee: 22000, 
        standardFee: 18000, 
        fee: 16000, 
        examFee: 22000, 
        total: 38000, 
        desc: 'Complex E/M level selection, MDM calculations and guidelines' 
      },
      { 
        code: 'CDEO', 
        name: 'Certified Documentation Expert Outpatient', 
        duration: '2 Months', 
        originalFee: 22000, 
        standardFee: 18000, 
        fee: 16000, 
        examFee: 22000, 
        total: 38000, 
        desc: 'Outpatient clinical documentation integrity & provider communication' 
      },
      { 
        code: 'CDEI', 
        name: 'Certified Documentation Expert Inpatient', 
        duration: '2 Months', 
        originalFee: 22000, 
        standardFee: 18000, 
        fee: 16000, 
        examFee: 22000, 
        total: 38000, 
        desc: 'Inpatient clinical documentation integrity & DRG accuracy' 
      },
      { 
        code: 'CPPM', 
        name: 'Certified Physician Practice Manager', 
        duration: '3 Months', 
        originalFee: 24000, 
        standardFee: 20000, 
        fee: 18000, 
        examFee: 22000, 
        total: 40000, 
        desc: 'Medical practice operations, revenue management & compliance' 
      }
    ]
  },
  {
    category: 'Speciality',
    title: 'Speciality Coding Tracks',
    courses: [
      { 
        code: 'Surgery', 
        name: 'Surgery Coding Specialty', 
        duration: '2 Months', 
        originalFee: 25000, 
        standardFee: 23000, 
        fee: 20000, 
        examFee: 18000, 
        total: 38000, 
        desc: 'General & specialized operative report procedural coding' 
      },
      { 
        code: 'ED', 
        name: 'Emergency Department Coding', 
        duration: '2 Months', 
        originalFee: 15000, 
        standardFee: 12000, 
        fee: 10000, 
        examFee: 18000, 
        total: 28000, 
        desc: 'Emergency room rapid triage, facility & professional coding' 
      },
      { 
        code: 'EM', 
        name: 'Evaluation and Management (E/M)', 
        duration: '2 Months', 
        originalFee: 15000, 
        standardFee: 12000, 
        fee: 10000, 
        examFee: 18000, 
        total: 28000, 
        desc: 'Medical decision making, MDM levels, time-based coding' 
      },
      { 
        code: 'Radiology', 
        name: 'Radiology Coding Specialty', 
        duration: '2 Months', 
        originalFee: 23000, 
        standardFee: 19000, 
        fee: 17000, 
        examFee: 18000, 
        total: 35000, 
        desc: 'Diagnostic imaging, ultrasound, CT, MRI and nuclear medicine' 
      },
      { 
        code: 'Anesthesia', 
        name: 'Anesthesia Coding Specialty', 
        duration: '2 Months', 
        originalFee: 23000, 
        standardFee: 19000, 
        fee: 17000, 
        examFee: 18000, 
        total: 35000, 
        desc: 'Base values, time units, physical status modifiers & pain management' 
      },
      { 
        code: 'IP DRG', 
        name: 'Inpatient DRG & Hospital Coding', 
        duration: '3 Months', 
        originalFee: 25000, 
        standardFee: 21000, 
        fee: 20000, 
        examFee: 20000, 
        total: 40000, 
        desc: 'MS-DRG, APR-DRG assignment, MCC/CC complication captures' 
      },
      { 
        code: 'HCC', 
        name: 'HCC & Risk Adjustment', 
        duration: '2 Months', 
        originalFee: 22000, 
        standardFee: 18000, 
        fee: 16000, 
        examFee: 18000, 
        total: 34000, 
        desc: 'Hierarchical Condition Categories & RAF score optimization' 
      },
      { 
        code: 'IVR', 
        name: 'Interventional Radiology Coding', 
        duration: '2 Months', 
        originalFee: 25000, 
        standardFee: 21000, 
        fee: 19000, 
        examFee: 18000, 
        total: 37000, 
        desc: 'Catheter placement, diagnostic & therapeutic vascular interventions' 
      },
      { 
        code: 'CDI', 
        name: 'Clinical Documentation Improvement', 
        duration: '2 Months', 
        originalFee: 24000, 
        standardFee: 20000, 
        fee: 18000, 
        examFee: 18000, 
        total: 36000, 
        desc: 'Bridging physician documentation with coding accuracy' 
      }
    ]
  },
  {
    category: 'AHIMA',
    title: 'AHIMA Certifications',
    courses: [
      { 
        code: 'CCS', 
        name: 'Certified Coding Specialist (Experienced)', 
        duration: '4 Months', 
        originalFee: 45000, 
        standardFee: 32000, 
        fee: 20000, 
        examFee: 24000, 
        total: 44000, 
        desc: 'For experienced medical coders mastering inpatient & outpatient hospital coding' 
      },
      { 
        code: 'CCS-Fresher', 
        name: 'Certified Coding Specialist (Fresher)', 
        duration: '4 Months', 
        originalFee: 45000, 
        standardFee: 32000, 
        fee: 26000, 
        examFee: 24000, 
        total: 50000, 
        desc: 'Comprehensive hospital coding track tailored for fresh graduates' 
      },
      { 
        code: 'CCS-Other', 
        name: 'Certified Coding Specialist (Other Field Exp)', 
        duration: '4 Months', 
        originalFee: 45000, 
        standardFee: 32000, 
        fee: 23000, 
        examFee: 24000, 
        total: 47000, 
        desc: 'For experienced professionals transitioning into medical coding from other domains' 
      },
      { 
        code: 'CCS-P', 
        name: 'Certified Coding Specialist – Physician-based', 
        duration: '4 Months', 
        originalFee: 45000, 
        standardFee: 32000, 
        fee: 25000, 
        examFee: 24000, 
        total: 49000, 
        desc: 'Physician practice & multi-specialty clinical coding mastery' 
      },
      { 
        code: 'RHIA', 
        name: 'Registered Health Information Administrator', 
        duration: '6 Months', 
        originalFee: 35000, 
        standardFee: 30000, 
        fee: 28000, 
        examFee: 26000, 
        total: 54000, 
        desc: 'Health data administration, privacy, governance & analytics' 
      },
      { 
        code: 'RHIT', 
        name: 'Registered Health Information Technician', 
        duration: '5 Months', 
        originalFee: 32000, 
        standardFee: 27000, 
        fee: 25000, 
        examFee: 24000, 
        total: 49000, 
        desc: 'Electronic health record systems, data integrity & compliance' 
      }
    ]
  },
  {
    category: 'HIMAA',
    title: 'HIMAA Certifications',
    courses: [
      { 
        code: 'CCC', 
        name: 'Certified Clinical Coder', 
        duration: '3 Months', 
        originalFee: 28000, 
        standardFee: 24000, 
        fee: 22000, 
        examFee: 20000, 
        total: 42000, 
        desc: 'HIMAA international clinical coding & classification standard' 
      },
      { 
        code: 'HIM', 
        name: 'Health Information Management', 
        duration: '4 Months', 
        originalFee: 30000, 
        standardFee: 26000, 
        fee: 24000, 
        examFee: 20000, 
        total: 44000, 
        desc: 'HIMAA healthcare information infrastructure & clinical governance' 
      }
    ]
  },
  {
    category: 'Foundation',
    title: 'Foundation & AMCT Tracks',
    courses: [
      { 
        code: 'AMCT Beginner', 
        name: 'AMCT Foundation Track', 
        duration: '45 Days', 
        originalFee: 25000, 
        standardFee: 19000, 
        fee: 17000, 
        examFee: 0, 
        total: 17000, 
        desc: 'Medical anatomy, physiology, ICD-10 foundation for freshers' 
      },
      { 
        code: 'AMCT Intermediate', 
        name: 'AMCT Comprehensive Coding', 
        duration: '60 Days', 
        originalFee: 35000, 
        standardFee: 23000, 
        fee: 21000, 
        examFee: 22000, 
        total: 43000, 
        desc: 'Full CPT, ICD-10-CM & HCPCS Level II + CPC prep' 
      },
      { 
        code: 'AMCT Advanced', 
        name: 'AMCT Advanced + Specialty', 
        duration: '90 Days', 
        originalFee: 45000, 
        standardFee: 32000, 
        fee: 29000, 
        examFee: 22000, 
        total: 51000, 
        desc: 'Core CPC curriculum + chosen specialty certification' 
      },
      { 
        code: 'CPC Crash Course', 
        name: 'CPC Fast-Track Exam Prep', 
        duration: '30 Days', 
        originalFee: 18000, 
        standardFee: 16000, 
        fee: 15000, 
        examFee: 22000, 
        total: 37000, 
        desc: 'Rapid revision and timed mock exam marathons' 
      }
    ]
  }
];

// Flat list of all courses
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
