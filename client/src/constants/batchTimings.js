// Canonical Batch Timings & Class Allocation Schedule based on official 2026 Timetable
// Maps exact courses, modes, branches, timing slots, and allocated faculty trainers.

export const BATCH_SCHEDULE = [
  // ── ONLINE BATCHES ──────────────────────────────────────────────────────────
  // Online AMCT (Weekdays)
  {
    course: 'AMCT',
    mode: 'Online',
    timing: '6:00 AM – 8:00 AM',
    trainer: 'Karkuzhazhi',
    type: 'Weekdays',
    value: '6:00 AM – 8:00 AM · Trainer: Karkuzhazhi',
    label: '6:00 AM – 8:00 AM · Trainer: Karkuzhazhi (AMCT Online)'
  },
  {
    course: 'AMCT',
    mode: 'Online',
    timing: '9:00 AM – 11:00 AM',
    trainer: 'Santhiya',
    type: 'Weekdays',
    value: '9:00 AM – 11:00 AM · Trainer: Santhiya',
    label: '9:00 AM – 11:00 AM · Trainer: Santhiya (AMCT Online)'
  },
  {
    course: 'AMCT',
    mode: 'Online',
    timing: '11:30 AM – 1:30 PM',
    trainer: 'Sowmiya',
    type: 'Weekdays',
    value: '11:30 AM – 1:30 PM · Trainer: Sowmiya',
    label: '11:30 AM – 1:30 PM · Trainer: Sowmiya (AMCT Online)'
  },
  {
    course: 'AMCT',
    mode: 'Online',
    timing: '2:30 PM – 4:30 PM',
    trainer: 'Aleena',
    type: 'Weekdays',
    value: '2:30 PM – 4:30 PM · Trainer: Aleena',
    label: '2:30 PM – 4:30 PM · Trainer: Aleena (AMCT Online)'
  },
  {
    course: 'AMCT',
    mode: 'Online',
    timing: '4:00 PM – 6:00 PM',
    trainer: 'Santhiya',
    type: 'Weekdays',
    value: '4:00 PM – 6:00 PM · Trainer: Santhiya',
    label: '4:00 PM – 6:00 PM · Trainer: Santhiya (AMCT Online)'
  },
  {
    course: 'AMCT',
    mode: 'Online',
    timing: '6:30 PM – 8:30 PM',
    trainer: 'Kavitha',
    type: 'Weekdays',
    value: '6:30 PM – 8:30 PM · Trainer: Kavitha',
    label: '6:30 PM – 8:30 PM · Trainer: Kavitha (AMCT Online)'
  },

  // Kerala Online Batch (AMCT / CPC)
  {
    course: 'AMCT / CPC',
    mode: 'Online',
    timing: '9:30 AM – 11:30 AM',
    trainer: 'Shilpa',
    type: 'Weekdays',
    region: 'Kerala',
    value: '9:30 AM – 11:30 AM · Trainer: Shilpa (Kerala)',
    label: '9:30 AM – 11:30 AM · Trainer: Shilpa (Kerala Online · AMCT/CPC)'
  },
  {
    course: 'AMCT / CPC',
    mode: 'Online',
    timing: '2:30 PM – 4:30 PM',
    trainer: 'Aswini',
    type: 'Weekdays',
    region: 'Kerala',
    value: '2:30 PM – 4:30 PM · Trainer: Aswini (Kerala)',
    label: '2:30 PM – 4:30 PM · Trainer: Aswini (Kerala Online · AMCT/CPC)'
  },

  // Online CPC (Weekdays)
  {
    course: 'CPC',
    mode: 'Online',
    timing: '6:00 AM – 8:00 AM',
    trainer: 'Lavanya',
    type: 'Weekdays',
    value: '6:00 AM – 8:00 AM · Trainer: Lavanya',
    label: '6:00 AM – 8:00 AM · Trainer: Lavanya (CPC Online)'
  },
  {
    course: 'CPC',
    mode: 'Online',
    timing: '9:00 AM – 11:00 AM',
    trainer: 'Mounika',
    type: 'Weekdays',
    value: '9:00 AM – 11:00 AM · Trainer: Mounika',
    label: '9:00 AM – 11:00 AM · Trainer: Mounika (CPC Online)'
  },
  {
    course: 'CPC',
    mode: 'Online',
    timing: '3:00 PM – 5:00 PM',
    trainer: 'Pooja',
    type: 'Weekdays',
    value: '3:00 PM – 5:00 PM · Trainer: Pooja',
    label: '3:00 PM – 5:00 PM · Trainer: Pooja (CPC Online)'
  },
  {
    course: 'CPC',
    mode: 'Online',
    timing: '7:30 PM – 9:30 PM',
    trainer: 'Santhosh',
    type: 'Weekdays',
    value: '7:30 PM – 9:30 PM · Trainer: Santhosh',
    label: '7:30 PM – 9:30 PM · Trainer: Santhosh (CPC Online)'
  },

  // Online Specialty Tracks (Weekdays)
  {
    course: 'IPDRG / CIC / CCS',
    mode: 'Online',
    timing: '8:00 PM – 10:00 PM',
    trainer: 'Pavithra',
    type: 'Weekdays',
    value: '8:00 PM – 10:00 PM · Trainer: Pavithra',
    label: '8:00 PM – 10:00 PM · Trainer: Pavithra (IPDRG / CIC / CCS Online)'
  },
  {
    course: 'Surgery',
    mode: 'Online',
    timing: '7:30 PM – 9:30 PM',
    trainer: 'Kaviya Priya',
    type: 'Weekdays',
    value: '7:30 PM – 9:30 PM · Trainer: Kaviya Priya',
    label: '7:30 PM – 9:30 PM · Trainer: Kaviya Priya (Surgery Online)'
  },
  {
    course: 'CPMA',
    mode: 'Online',
    timing: '7:30 PM – 9:30 PM',
    trainer: 'Shiny',
    type: 'Weekdays',
    value: '7:30 PM – 9:30 PM · Trainer: Shiny',
    label: '7:30 PM – 9:30 PM · Trainer: Shiny (CPMA Online)'
  },
  {
    course: 'CRC',
    mode: 'Online',
    timing: '7:30 PM – 9:30 PM',
    trainer: 'Sophiga',
    type: 'Weekdays',
    value: '7:30 PM – 9:30 PM · Trainer: Sophiga',
    label: '7:30 PM – 9:30 PM · Trainer: Sophiga (CRC Online Weekdays)'
  },

  // Online Weekend Batches
  {
    course: 'AMCT',
    mode: 'Online',
    timing: '2:00 PM – 4:00 PM',
    trainer: 'Tharani / Sowmiya',
    type: 'Weekends',
    value: '2:00 PM – 4:00 PM · Trainer: Tharani / Sowmiya',
    label: '2:00 PM – 4:00 PM (Weekend) · Trainer: Tharani / Sowmiya (AMCT Anatomy)'
  },
  {
    course: 'AMCT',
    mode: 'Online',
    timing: '4:30 PM – 6:30 PM',
    trainer: 'Tharani / Sowmiya',
    type: 'Weekends',
    value: '4:30 PM – 6:30 PM · Trainer: Tharani / Sowmiya',
    label: '4:30 PM – 6:30 PM (Weekend) · Trainer: Tharani / Sowmiya (AMCT Anatomy)'
  },
  {
    course: 'CPC',
    mode: 'Online',
    timing: '10:00 AM – 12:00 PM',
    trainer: 'CBE / DSNR Trainers',
    type: 'Weekends',
    value: '10:00 AM – 12:00 PM · Trainer: CBE / DSNR Trainers',
    label: '10:00 AM – 12:00 PM (Weekend) · Trainer: CBE / DSNR Trainers (CPC Online)'
  },
  {
    course: 'CPC',
    mode: 'Online',
    timing: '2:00 PM – 4:00 PM',
    trainer: 'CBE / DSNR Trainers',
    type: 'Weekends',
    value: '2:00 PM – 4:00 PM · Trainer: CBE / DSNR Trainers',
    label: '2:00 PM – 4:00 PM (Weekend) · Trainer: CBE / DSNR Trainers (CPC Online)'
  },
  {
    course: 'CRC',
    mode: 'Online',
    timing: '2:00 PM – 5:00 PM',
    trainer: 'Ram Balaji',
    type: 'Weekends',
    value: '2:00 PM – 5:00 PM · Trainer: Ram Balaji',
    label: '2:00 PM – 5:00 PM (Weekend) · Trainer: Ram Balaji (CRC Online)'
  },

  // ── OFFLINE / CLASSROOM BATCHES (BY BRANCH) ─────────────────────────────────
  // Saravanampatti (SVM)
  {
    course: 'AMCT',
    mode: 'Classroom',
    branch: 'Saravanampatti (CBE)',
    timing: '9:00 AM – 11:00 AM',
    trainer: 'Tharani',
    value: '9:00 AM – 11:00 AM · Trainer: Tharani (SVM)',
    label: '9:00 AM – 11:00 AM · Trainer: Tharani (Saravanampatti · AMCT Anatomy)'
  },
  {
    course: 'AMCT / CPC',
    mode: 'Classroom',
    branch: 'Saravanampatti (CBE)',
    timing: '11:00 AM – 1:00 PM',
    trainer: 'Tharani',
    value: '11:00 AM – 1:00 PM · Trainer: Tharani (SVM)',
    label: '11:00 AM – 1:00 PM · Trainer: Tharani (Saravanampatti · AMCT/CPC)'
  },

  // Hopes (CBE)
  {
    course: 'AMCT / CPC',
    mode: 'Classroom',
    branch: 'Hopes (CBE)',
    timing: '9:00 AM – 11:00 AM',
    trainer: 'Jennifer',
    value: '9:00 AM – 11:00 AM · Trainer: Jennifer (Hopes)',
    label: '9:00 AM – 11:00 AM · Trainer: Jennifer (Hopes · AMCT/CPC)'
  },
  {
    course: 'AMCT',
    mode: 'Classroom',
    branch: 'Hopes (CBE)',
    timing: '9:00 AM – 11:00 AM',
    trainer: 'Sowmiya',
    value: '9:00 AM – 11:00 AM · Trainer: Sowmiya (Hopes)',
    label: '9:00 AM – 11:00 AM · Trainer: Sowmiya (Hopes · AMCT Anatomy)'
  },
  {
    course: 'AMCT / CPC',
    mode: 'Classroom',
    branch: 'Hopes (CBE)',
    timing: '2:00 PM – 4:00 PM',
    trainer: 'Jennifer',
    value: '2:00 PM – 4:00 PM · Trainer: Jennifer (Hopes)',
    label: '2:00 PM – 4:00 PM · Trainer: Jennifer (Hopes · AMCT/CPC)'
  },
  {
    course: 'AMCT / CPC',
    mode: 'Classroom',
    branch: 'Hopes (CBE)',
    timing: '4:30 PM – 6:00 PM',
    trainer: 'Jennifer',
    value: '4:30 PM – 6:00 PM · Trainer: Jennifer (Hopes)',
    label: '4:30 PM – 6:00 PM · Trainer: Jennifer (Hopes · AMCT/CPC)'
  },

  // Gandhipuram (GPM)
  {
    course: 'AMCT / CPC',
    mode: 'Classroom',
    branch: 'Gandhipuram (CBE)',
    timing: '9:30 AM – 11:30 AM',
    trainer: 'Keerthi',
    value: '9:30 AM – 11:30 AM · Trainer: Keerthi (GPM)',
    label: '9:30 AM – 11:30 AM · Trainer: Keerthi (Gandhipuram · AMCT/CPC)'
  },
  {
    course: 'AMCT',
    mode: 'Classroom',
    branch: 'Gandhipuram (CBE)',
    timing: '11:30 AM – 1:30 PM',
    trainer: 'Karkuzhazhi',
    value: '11:30 AM – 1:30 PM · Trainer: Karkuzhazhi (GPM)',
    label: '11:30 AM – 1:30 PM · Trainer: Karkuzhazhi (Gandhipuram · AMCT Anatomy)'
  },

  // Trichy
  {
    course: 'AMCT',
    mode: 'Classroom',
    branch: 'Trichy (Tamil Nadu)',
    timing: '9:30 AM – 11:30 AM',
    trainer: 'Kaviya',
    value: '9:30 AM – 11:30 AM · Trainer: Kaviya (Trichy)',
    label: '9:30 AM – 11:30 AM · Trainer: Kaviya (Trichy · AMCT Anatomy)'
  },
  {
    course: 'AMCT / CPC',
    mode: 'Classroom',
    branch: 'Trichy (Tamil Nadu)',
    timing: '9:30 AM – 11:30 AM',
    trainer: 'Sharon',
    value: '9:30 AM – 11:30 AM · Trainer: Sharon (Trichy)',
    label: '9:30 AM – 11:30 AM · Trainer: Sharon (Trichy · AMCT/CPC)'
  },
  {
    course: 'AMCT',
    mode: 'Classroom',
    branch: 'Trichy (Tamil Nadu)',
    timing: '11:30 AM – 1:30 PM',
    trainer: 'Kaviya',
    value: '11:30 AM – 1:30 PM · Trainer: Kaviya (Trichy)',
    label: '11:30 AM – 1:30 PM · Trainer: Kaviya (Trichy · AMCT Anatomy)'
  },
  {
    course: 'AMCT / CPC',
    mode: 'Classroom',
    branch: 'Trichy (Tamil Nadu)',
    timing: '11:30 AM – 1:30 PM',
    trainer: 'Sharon',
    value: '11:30 AM – 1:30 PM · Trainer: Sharon (Trichy)',
    label: '11:30 AM – 1:30 PM · Trainer: Sharon (Trichy · AMCT/CPC)'
  },
  {
    course: 'AMCT',
    mode: 'Classroom',
    branch: 'Trichy (Tamil Nadu)',
    timing: '2:30 PM – 4:30 PM',
    trainer: 'Kaviya',
    value: '2:30 PM – 4:30 PM · Trainer: Kaviya (Trichy)',
    label: '2:30 PM – 4:30 PM · Trainer: Kaviya (Trichy · AMCT Anatomy)'
  },
  {
    course: 'AMCT / CPC',
    mode: 'Classroom',
    branch: 'Trichy (Tamil Nadu)',
    timing: '2:30 PM – 4:30 PM',
    trainer: 'Sharon',
    value: '2:30 PM – 4:30 PM · Trainer: Sharon (Trichy)',
    label: '2:30 PM – 4:30 PM · Trainer: Sharon (Trichy · AMCT/CPC)'
  },

  // Salem
  {
    course: 'AMCT',
    mode: 'Classroom',
    branch: 'Salem (Tamil Nadu)',
    timing: '9:00 AM – 11:00 AM',
    trainer: 'Sumaiya',
    value: '9:00 AM – 11:00 AM · Trainer: Sumaiya (Salem)',
    label: '9:00 AM – 11:00 AM · Trainer: Sumaiya (Salem · AMCT Anatomy)'
  },
  {
    course: 'AMCT / CPC',
    mode: 'Classroom',
    branch: 'Salem (Tamil Nadu)',
    timing: '9:00 AM – 11:00 AM',
    trainer: 'Priya',
    value: '9:00 AM – 11:00 AM · Trainer: Priya (Salem)',
    label: '9:00 AM – 11:00 AM · Trainer: Priya (Salem · AMCT/CPC)'
  },
  {
    course: 'AMCT / CPC',
    mode: 'Classroom',
    branch: 'Salem (Tamil Nadu)',
    timing: '11:00 AM – 1:00 PM',
    trainer: 'Priya',
    value: '11:00 AM – 1:00 PM · Trainer: Priya (Salem)',
    label: '11:00 AM – 1:00 PM · Trainer: Priya (Salem · AMCT/CPC)'
  },
  {
    course: 'AMCT',
    mode: 'Classroom',
    branch: 'Salem (Tamil Nadu)',
    timing: '11:00 AM – 1:00 PM',
    trainer: 'Sumaiya',
    value: '11:00 AM – 1:00 PM · Trainer: Sumaiya (Salem)',
    label: '11:00 AM – 1:00 PM · Trainer: Sumaiya (Salem · AMCT Anatomy)'
  },

  // Dilsukhnagar (DSNR, Hyderabad)
  {
    course: 'AMCT',
    mode: 'Classroom',
    branch: 'Dilsukhnagar (Hyderabad)',
    timing: '9:30 AM – 11:30 AM',
    trainer: 'Pooja',
    value: '9:30 AM – 11:30 AM · Trainer: Pooja (DSNR)',
    label: '9:30 AM – 11:30 AM · Trainer: Pooja (DSNR · AMCT ICD)'
  },
  {
    course: 'CPC',
    mode: 'Classroom',
    branch: 'Dilsukhnagar (Hyderabad)',
    timing: '11:30 AM – 1:30 PM',
    trainer: 'Pooja',
    value: '11:30 AM – 1:30 PM · Trainer: Pooja (DSNR)',
    label: '11:30 AM – 1:30 PM · Trainer: Pooja (DSNR · CPC)'
  },
  {
    course: 'CPC',
    mode: 'Classroom',
    branch: 'Dilsukhnagar (Hyderabad)',
    timing: '11:30 AM – 1:30 PM',
    trainer: 'Mounika',
    value: '11:30 AM – 1:30 PM · Trainer: Mounika (DSNR)',
    label: '11:30 AM – 1:30 PM · Trainer: Mounika (DSNR · CPC)'
  },
  {
    course: 'AMCT',
    mode: 'Classroom',
    branch: 'Dilsukhnagar (Hyderabad)',
    timing: '2:00 PM – 4:00 PM',
    trainer: 'Mounika',
    value: '2:00 PM – 4:00 PM · Trainer: Mounika (DSNR)',
    label: '2:00 PM – 4:00 PM · Trainer: Mounika (DSNR · AMCT Anatomy)'
  },

  // Ameerpet (Hyderabad)
  {
    course: 'AMCT',
    mode: 'Classroom',
    branch: 'Ameerpet (Hyderabad)',
    timing: '9:30 AM – 11:30 AM',
    trainer: 'Varsha',
    value: '9:30 AM – 11:30 AM · Trainer: Varsha (Ameerpet)',
    label: '9:30 AM – 11:30 AM · Trainer: Varsha (Ameerpet · AMCT ICD)'
  },
  {
    course: 'AMCT',
    mode: 'Classroom',
    branch: 'Ameerpet (Hyderabad)',
    timing: '11:30 AM – 1:30 PM',
    trainer: 'Varsha',
    value: '11:30 AM – 1:30 PM · Trainer: Varsha (Ameerpet)',
    label: '11:30 AM – 1:30 PM · Trainer: Varsha (Ameerpet · AMCT Anatomy)'
  },
  {
    course: 'CPC',
    mode: 'Classroom',
    branch: 'Ameerpet (Hyderabad)',
    timing: '2:30 PM – 4:30 PM',
    trainer: 'Varsha',
    value: '2:30 PM – 4:30 PM · Trainer: Varsha (Ameerpet)',
    label: '2:30 PM – 4:30 PM · Trainer: Varsha (Ameerpet · CPC)'
  }
];

// Helper to normalize branch names for matching
export function normBranch(branchStr = '') {
  const b = String(branchStr).toLowerCase();
  if (b.includes('saravanampatti') || b.includes('svm')) return 'Saravanampatti (CBE)';
  if (b.includes('hopes')) return 'Hopes (CBE)';
  if (b.includes('gandhipuram') || b.includes('gpm')) return 'Gandhipuram (CBE)';
  if (b.includes('trichy')) return 'Trichy (Tamil Nadu)';
  if (b.includes('salem')) return 'Salem (Tamil Nadu)';
  if (b.includes('dilsukh') || b.includes('dsnr')) return 'Dilsukhnagar (Hyderabad)';
  if (b.includes('ameerpet')) return 'Ameerpet (Hyderabad)';
  if (b.includes('kochi') || b.includes('kerala')) return 'Kochi (Kerala)';
  return branchStr;
}

// Helper to normalize course keyword for matching
export function matchCourse(courseStr = '', entryCourse = '') {
  const c = String(courseStr).toUpperCase();
  const e = String(entryCourse).toUpperCase();
  if (e.includes('AMCT / CPC') && (c.includes('AMCT') || c.includes('CPC'))) return true;
  if (c.includes('AMCT') && e.includes('AMCT')) return true;
  if (c.includes('CPC') && e.includes('CPC')) return true;
  if (c.includes('CRC') && e.includes('CRC')) return true;
  if (c.includes('SURGERY') && e.includes('SURGERY')) return true;
  if (c.includes('CPMA') && e.includes('CPMA')) return true;
  if ((c.includes('CIC') || c.includes('CCS') || c.includes('IPDRG') || c.includes('IP')) &&
      (e.includes('CIC') || e.includes('CCS') || e.includes('IPDRG') || e.includes('IP'))) return true;
  return false;
}

// Dynamic timing slots filtered strictly by course, mode, and branch
export function getAvailableTimingSlots({ course = '', mode = '', branch = '' } = {}) {
  const isClassroom = String(mode).toLowerCase().includes('class') || 
                      String(mode).toLowerCase().includes('offline') ||
                      (!mode && String(course).toLowerCase().includes('class'));
  const isOnline = String(mode).toLowerCase().includes('online') ||
                   (!mode && String(course).toLowerCase().includes('online'));
  const normalizedBranch = normBranch(branch);

  if (isClassroom || (!isOnline && branch && normBranch(branch) !== branch)) {
    // Look up offline branch batches
    const branchBatches = BATCH_SCHEDULE.filter(
      item => item.mode === 'Classroom' && normBranch(item.branch) === normalizedBranch
    );

    if (branchBatches.length > 0) {
      if (course) {
        const courseFiltered = branchBatches.filter(item => matchCourse(course, item.course));
        if (courseFiltered.length > 0) return courseFiltered;
      }
      return branchBatches;
    }
  }

  // Look up Online batches
  if (isOnline || !isClassroom) {
    const onlineBatches = BATCH_SCHEDULE.filter(item => item.mode === 'Online');
    if (course) {
      const courseFiltered = onlineBatches.filter(item => matchCourse(course, item.course));
      if (courseFiltered.length > 0) return courseFiltered;
    }
    return onlineBatches;
  }

  // Fallback: full schedule
  return BATCH_SCHEDULE;
}

// Grouped categories for complete view across Online & Offline branches
export const BATCH_TIMING_GROUPS = [
  {
    group: 'online_amct',
    title: '🌐 Online AMCT Batches (Weekdays)',
    slots: BATCH_SCHEDULE.filter(s => s.mode === 'Online' && s.course === 'AMCT' && s.type === 'Weekdays')
  },
  {
    group: 'online_cpc',
    title: '🌐 Online CPC Batches (Weekdays)',
    slots: BATCH_SCHEDULE.filter(s => s.mode === 'Online' && s.course === 'CPC' && s.type === 'Weekdays')
  },
  {
    group: 'online_kerala',
    title: '🌴 Kerala Online Batches (AMCT / CPC)',
    slots: BATCH_SCHEDULE.filter(s => s.mode === 'Online' && s.region === 'Kerala')
  },
  {
    group: 'online_weekend',
    title: '⚡ Online Weekend Batches (AMCT / CPC / CRC)',
    slots: BATCH_SCHEDULE.filter(s => s.mode === 'Online' && s.type === 'Weekends')
  },
  {
    group: 'online_specialty',
    title: '🎯 Online Specialty Batches (Surgery / CPMA / CRC / IPDRG)',
    slots: BATCH_SCHEDULE.filter(s => s.mode === 'Online' && !['AMCT', 'CPC'].includes(s.course) && s.type === 'Weekdays' && !s.region)
  },
  {
    group: 'offline_cbe',
    title: '🏫 Coimbatore Offline Batches (SVM, Hopes, Gandhipuram)',
    slots: BATCH_SCHEDULE.filter(s => s.mode === 'Classroom' && ['Saravanampatti (CBE)', 'Hopes (CBE)', 'Gandhipuram (CBE)'].includes(s.branch))
  },
  {
    group: 'offline_tn',
    title: '🏫 Tamil Nadu Offline Batches (Trichy & Salem)',
    slots: BATCH_SCHEDULE.filter(s => s.mode === 'Classroom' && ['Trichy (Tamil Nadu)', 'Salem (Tamil Nadu)'].includes(s.branch))
  },
  {
    group: 'offline_hyd',
    title: '🏫 Hyderabad Offline Batches (DSNR & Ameerpet)',
    slots: BATCH_SCHEDULE.filter(s => s.mode === 'Classroom' && ['Dilsukhnagar (Hyderabad)', 'Ameerpet (Hyderabad)'].includes(s.branch))
  }
];

// Flat canonical list of timing labels with trainers for dropdown options
export const CANONICAL_TIMING_OPTIONS = BATCH_SCHEDULE.map(item => item.label);

// Export alias for backward compatibility
export const TIMING_OPTIONS = CANONICAL_TIMING_OPTIONS;
