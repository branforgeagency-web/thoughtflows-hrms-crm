// Standard ThoughtFlows Student ID Generator
// ID Pattern: TF · Branch · Course · Type · Month · Year · Serial
// Example: TFSCOY6001 = TF (Company) - S (Saravanampatti) - C (CPC) - O (Online) - Y (May) - 6 (2026) - 001 (Serial)

export const BRANCH_MAP = {
  'S': 'Saravanampatti',
  'H': 'Hopes',
  'G': 'Gandhipuram',
  'C': 'Trichy',
  'M': 'Salem',
  'K': 'Kochi',
  'V': 'Trivandrum',
  'T': 'Tirupati',
  'D': 'Hyderabad Dilsukhnagar',
  'R': 'Hyderabad Ameerpet',
  'Z': 'Vizag',
  'P': 'Pune',
  'L': 'Kollapur',
  'N': 'Theni'
};

export const COURSE_MAP = {
  // AAPC Certifications
  'C': 'CPC - Certified Professional Coder',
  'E': 'CIC - Certified Inpatient Coder',
  'P': 'CPMA - Certified Professional Medical Auditor',
  'B': 'COC - Certified Outpatient Coder',
  'R': 'CRC - Certified Risk Adjustment Coder',
  'PB': 'CPB - Certified Professional Biller',
  'EDC': 'CEDC - Certified Emergency Department Coder',
  'CN': 'CEMC - Certified Evaluation and Management Coder',
  'CDO': 'CDEO - Certified Documentation Expert Outpatient',
  'CDEI': 'CDEI - Certified Documentation Expert Inpatient',
  'PPM': 'CPPM - Certified Physician Practice Manager',

  // Speciality Tracks
  'Y': 'Surgery - Specialty Surgery Coding',
  'D': 'ED - Emergency Department Coding',
  'N': 'EM - Evaluation and Management Coding',
  'RD': 'Radiology - Radiology Coding',
  'AN': 'Anesthesia - Anesthesia Coding',
  'I': 'IP DRG - Inpatient DRG Coding',
  'H': 'HCC - Risk Adjustment Coding',
  'IVR': 'IVR - Interventional Radiology Coding',
  'CDI': 'CDI - Clinical Documentation Improvement',

  // AHIMA Certifications
  'S': 'CCS - Certified Coding Specialist',
  'CSP': 'CCS-P - Certified Coding Specialist – Physician-based',
  'RIA': 'RHIA - Registered Health Information Administrator',
  'RIT': 'RHIT - Registered Health Information Technician',

  // HIMAA Certifications
  'CCC': 'CCC - Certified Clinical Coder',
  'HIM': 'HIM - Health Information Management',

  // Foundation & Prep Tracks
  'A': 'AMCT - Advanced Medical Coding',
  'AB': 'AMCT Beginner',
  'AI': 'AMCT Intermediate',
  'AA': 'AMCT Advanced',
  'F': 'CPC Crash Course',
  'T': 'CPT Coding',
  'Z': 'ICD-10 Coding',
  'O': 'Anatomy & Physiology'
};

export const TYPE_MAP = {
  'O': 'Online',
  'C': 'Classroom',
  'H': 'Hybrid'
};

export const MONTH_MAP = {
  'A': 'Jan',
  'B': 'Feb',
  'C': 'Mar',
  'D': 'Apr',
  'Y': 'May',
  'J': 'Jun',
  'L': 'Jul',
  'G': 'Aug',
  'S': 'Sep',
  'T': 'Oct',
  'N': 'Nov',
  'E': 'Dec'
};

export const YEAR_MAP = {
  '2': '2022',
  '3': '2023',
  '4': '2024',
  '5': '2025',
  '6': '2026',
  '7': '2027',
  '8': '2028',
  '9': '2029',
  '0': '2030'
};

// 0-indexed month array matching MONTH_MAP codes
const MONTH_INDEX_CODES = ['A', 'B', 'C', 'D', 'Y', 'J', 'L', 'G', 'S', 'T', 'N', 'E'];

/**
 * Resolve single-letter branch code from name or existing code
 */
export function getBranchCode(branch) {
  if (!branch) return 'S';
  const str = String(branch).trim();
  const upper = str.toUpperCase();
  if (BRANCH_MAP[upper]) return upper;

  const low = str.toLowerCase();
  if (low.includes('hopes')) return 'H';
  if (low.includes('gandhi') || low.includes('gpm')) return 'G';
  if (low.includes('trichy')) return 'C';
  if (low.includes('salem')) return 'M';
  if (low.includes('kochi') || low.includes('cochin')) return 'K';
  if (low.includes('trivandrum') || low.includes('thiruvananthapuram')) return 'V';
  if (low.includes('tirupati')) return 'T';
  if (low.includes('dilsukhnagar') || low.includes('dsnr')) return 'D';
  if (low.includes('ameerpet') || low.includes('hyderabad')) return 'R';
  if (low.includes('vizag') || low.includes('visakhapatnam')) return 'Z';
  if (low.includes('pune')) return 'P';
  if (low.includes('kollapur') || low.includes('kolhapur')) return 'L';
  if (low.includes('theni')) return 'N';
  if (low.includes('saravanampatti') || low.includes('cbe') || low.includes('coimbatore')) return 'S';

  return 'S';
}

/**
 * Resolve course code from name, course object, or code string
 */
export function getCourseCode(course) {
  if (!course) return 'C';
  const str = String(course).trim();
  const upper = str.toUpperCase();
  if (COURSE_MAP[upper]) return upper;

  if (upper.includes('CRASH')) return 'F';
  if (upper.includes('AMCT BEGINNER') || upper.includes('BEGINNER')) return 'AB';
  if (upper.includes('AMCT INTERMEDIATE') || upper.includes('INTERMEDIATE')) return 'AI';
  if (upper.includes('AMCT ADVANCED') || upper.includes('ADVANCED')) return 'AA';
  if (upper.includes('AMCT') || upper.includes('MCT')) return 'A';
  if (upper.includes('CPMA')) return 'P';
  if (upper.includes('COC')) return 'B';
  if (upper.includes('CRC')) return 'R';
  if (upper.includes('CPB')) return 'PB';
  if (upper.includes('CEDC')) return 'EDC';
  if (upper.includes('CEMC')) return 'CN';
  if (upper.includes('CDEO')) return 'CDO';
  if (upper.includes('CDEI')) return 'CDEI';
  if (upper.includes('CPPM') || upper.includes('PPM')) return 'PPM';
  if (upper.includes('CIC')) return 'E';
  if (upper.includes('SURGERY')) return 'Y';
  if (upper.includes('EMERGENCY') || upper.includes('ED -') || upper.includes('ED (')) return 'D';
  if (upper.includes('EVALUATION') || upper.includes('EM -') || upper.includes('E/M')) return 'N';
  if (upper.includes('RADIOLOGY') || upper.includes('RAD')) return 'RD';
  if (upper.includes('ANESTHESIA')) return 'AN';
  if (upper.includes('IP DRG') || upper.includes('IPDRG')) return 'I';
  if (upper.includes('HCC')) return 'H';
  if (upper.includes('IVR')) return 'IVR';
  if (upper.includes('CDI')) return 'CDI';
  if (upper.includes('CCS-P') || upper.includes('CCSP')) return 'CSP';
  if (upper.includes('CCS')) return 'S';
  if (upper.includes('RHIA')) return 'RIA';
  if (upper.includes('RHIT')) return 'RIT';
  if (upper.includes('CCC')) return 'CCC';
  if (upper.includes('HIM')) return 'HIM';
  if (upper.includes('CPT')) return 'T';
  if (upper.includes('ICD')) return 'Z';
  if (upper.includes('ANATOMY')) return 'O';
  if (upper.includes('CPC')) return 'C';

  return 'C';
}

/**
 * Resolve course type code (O = Online, C = Classroom, H = Hybrid)
 */
export function getCourseTypeCode(courseType) {
  if (!courseType) return 'O';
  const str = String(courseType).trim().toUpperCase();
  if (TYPE_MAP[str]) return str;

  if (str.startsWith('C') || str.includes('OFFLINE') || str.includes('CLASS')) return 'C';
  if (str.startsWith('H') || str.includes('HYBRID')) return 'H';
  return 'O';
}

/**
 * Resolve single-letter month code (A to E) from Date, string or month name
 */
export function getMonthCode(dateOrMonth) {
  if (!dateOrMonth) {
    const cur = new Date();
    return MONTH_INDEX_CODES[cur.getMonth()] || 'Y';
  }

  const str = String(dateOrMonth).trim().toUpperCase();
  if (MONTH_MAP[str]) return str;

  // Month name lookup
  const monthNames = {
    'JAN': 'A', 'JANUARY': 'A',
    'FEB': 'B', 'FEBRUARY': 'B',
    'MAR': 'C', 'MARCH': 'C',
    'APR': 'D', 'APRIL': 'D',
    'MAY': 'Y',
    'JUN': 'J', 'JUNE': 'J',
    'JUL': 'L', 'JULY': 'L',
    'AUG': 'G', 'AUGUST': 'G',
    'SEP': 'S', 'SEPTEMBER': 'S',
    'OCT': 'T', 'OCTOBER': 'T',
    'NOV': 'N', 'NOVEMBER': 'N',
    'DEC': 'E', 'DECEMBER': 'E'
  };
  if (monthNames[str]) return monthNames[str];

  // Try parsing date string (e.g. '2026-09-29' or Date object)
  const d = dateOrMonth instanceof Date ? dateOrMonth : new Date(dateOrMonth);
  if (!isNaN(d.getTime())) {
    return MONTH_INDEX_CODES[d.getMonth()] || 'Y';
  }

  return 'Y';
}

/**
 * Resolve single-digit year code (e.g. 2026 -> '6')
 */
export function getYearCode(dateOrYear) {
  if (!dateOrYear) {
    const cur = new Date();
    return String(cur.getFullYear()).slice(-1);
  }

  const str = String(dateOrYear).trim();
  if (str.length === 1 && YEAR_MAP[str]) return str;

  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 2020) {
    return String(num).slice(-1);
  }

  const d = dateOrYear instanceof Date ? dateOrYear : new Date(dateOrYear);
  if (!isNaN(d.getTime())) {
    return String(d.getFullYear()).slice(-1);
  }

  return String(new Date().getFullYear()).slice(-1);
}

/**
 * Calculate the next available 3-digit serial from existing students
 */
export function calculateNextSerial(prefix, existingStudents = []) {
  const targetPrefix = String(prefix || '').toUpperCase();
  let maxSerial = 0;

  if (Array.isArray(existingStudents) && existingStudents.length > 0) {
    existingStudents.forEach((st) => {
      const sId = (st?.studentId || st?.id || '').toString().trim().toUpperCase();
      if (sId.startsWith(targetPrefix)) {
        const suffix = sId.slice(targetPrefix.length);
        const match = suffix.match(/^(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSerial) {
            maxSerial = num;
          }
        }
      }
    });
  }

  const nextSerialNum = maxSerial + 1;
  return String(nextSerialNum).padStart(3, '0');
}

/**
 * Main generator function that builds student ID and all associated breakdown metadata
 */
export function generateStudentIdDetails({
  branch,
  course,
  courseType,
  date,
  month,
  year,
  serial,
  existingStudents = []
}) {
  const companyPrefix = 'TF';
  const branchCode = getBranchCode(branch);
  const courseCode = getCourseCode(course);
  const typeCode = getCourseTypeCode(courseType);
  const monthCode = month ? (MONTH_MAP[String(month).toUpperCase()] ? String(month).toUpperCase() : getMonthCode(month)) : getMonthCode(date);
  const yearCode = year ? (YEAR_MAP[String(year)] ? String(year) : getYearCode(year)) : getYearCode(date);

  const middleCode = `${branchCode}${courseCode}${typeCode}${monthCode}${yearCode}`;
  const prefix = `${companyPrefix}${middleCode}`;

  const resolvedSerial = (serial && String(serial).trim()) 
    ? String(serial).trim().padStart(3, '0') 
    : calculateNextSerial(prefix, existingStudents);

  const fullId = `${prefix}${resolvedSerial}`;

  const branchName = BRANCH_MAP[branchCode] || 'Saravanampatti';
  const courseName = COURSE_MAP[courseCode] || 'CPC - Certified Professional Coder';
  const typeName = TYPE_MAP[typeCode] || 'Online';
  const monthName = MONTH_MAP[monthCode] || 'May';
  const yearVal = YEAR_MAP[yearCode] || `${new Date().getFullYear()}`;

  const breakdownText = `${companyPrefix} · ${branchName} · ${courseName} · ${typeName} · ${monthName} · ${yearVal} · Serial ${resolvedSerial}`;

  return {
    studentId: fullId,
    fullId,
    companyPrefix,
    middleCode,
    prefix,
    serial: resolvedSerial,
    branchCode,
    courseCode,
    typeCode,
    monthCode,
    yearCode,
    branchName,
    courseName,
    typeName,
    monthName,
    yearVal,
    breakdownText
  };
}
