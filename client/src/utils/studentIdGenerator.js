// Standard ThoughtFlows Student ID Generator (Official ThoughtFlows System Specification)
// ID Pattern: 1.Company(TF) · 2.Branch · 3.Course · 4.CourseType · 5.Month · 6.Year · 7.Serial
// Example: TFSMON6001 = TF (Company) - S (Saravanampatti) - M (Course) - O (Online) - N (Nov) - 6 (2026) - 001 (Serial)
// Example with CPC: TFSCON6001 = TF - S (Saravanampatti) - C (CPC) - O (Online) - N (Nov) - 6 (2026) - 001 (Serial)

export const BRANCH_MAP = {
  'S': 'Saravanampatti',
  'H': 'Hopes',
  'T': 'Tirupati',
  'V': 'Trivandrum',
  'D': 'Hyderabad',
  'C': 'Trichy',
  'K': 'Kochi',
  'M': 'Salem',
  'R': 'DSNR',
  'Z': 'VIZAG',
  'G': 'GPM',
  'P': 'Pune',
  'L': 'Kollapur',
  'N': 'Theni'
};

export const COURSE_MAP = {
  // Official ThoughtFlows Course Name Mapping
  'AB': 'AMCT(Beginner)',
  'AI': 'AMCT(Intermediate)',
  'AA': 'AMCT(Advanced)',
  'A': 'AMCT',
  'C': 'CPC',
  'F': 'CPC crash course',
  'D': 'ED',
  'N': 'E/M',
  'I': 'IPDRG',
  'S': 'CCS',
  'P': 'CPMA',
  'E': 'CIC',
  'R': 'CRC',
  'Y': 'SUR',
  'T': 'CPT',
  'Z': 'ICD',
  'H': 'HCC',
  'O': 'ANATOMY',
  'CN': 'CEMC',
  'R_RAD': 'RADIOLOGY',

  // Medical Coding Internship Programmes
  'IB': 'Internship Beginner',
  'II': 'Internship Intermediate',
  'IA': 'Internship Advanced',

  // Additional AAPC / AHIMA / Speciality Programmes
  'B': 'COC',
  'PB': 'CPB',
  'EDC': 'CEDC',
  'CDO': 'CDEO',
  'CDEI': 'CDEI',
  'PPM': 'CPPM',
  'AN': 'Anesthesia',
  'IVR': 'IVR',
  'CDI': 'CDI',
  'CSP': 'CCS-P',
  'RIA': 'RHIA',
  'RIT': 'RHIT',
  'CCC': 'CCC',
  'HIM': 'HIM',
  'M': 'Medical Coding'
};

export const TYPE_MAP = {
  'O': 'Online',
  'C': 'Classroom',
  'H': 'Hybrid'
};

export const MONTH_MAP = {
  'J': 'Jan',
  'F': 'Feb',
  'M': 'Mar',
  'A': 'Apri',
  'Y': 'May',
  'E': 'June',
  'L': 'July',
  'U': 'August',
  'S': 'September',
  'O': 'October',
  'N': 'November',
  'D': 'December'
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

// 0-indexed month array matching official MONTH_MAP codes:
// Jan=J, Feb=F, Mar=M, Apri=A, May=Y, June=E, July=L, August=U, September=S, October=O, November=N, December=D
export const MONTH_INDEX_CODES = ['J', 'F', 'M', 'A', 'Y', 'E', 'L', 'U', 'S', 'O', 'N', 'D'];

/**
 * Resolve branch code (Saravanampatti=S, Hopes=H, Tirupati=T, Trivandrum=V, Hyderabad=D, Trichy=C, Kochi=K, Salem=M, DSNR=R, VIZAG=Z, GPM=G)
 */
export function getBranchCode(branch) {
  if (!branch) return 'S';
  const str = String(branch).trim();
  const upper = str.toUpperCase();
  if (BRANCH_MAP[upper]) return upper;

  const low = str.toLowerCase();
  if (low.includes('hopes')) return 'H';
  if (low.includes('tirupati')) return 'T';
  if (low.includes('trivandrum') || low.includes('thiruvananthapuram')) return 'V';
  if (low.includes('dsnr') || low.includes('dilsukhnagar')) return 'R';
  if (low.includes('hyderabad') || low.includes('ameerpet')) return 'D';
  if (low.includes('trichy')) return 'C';
  if (low.includes('kochi') || low.includes('cochin')) return 'K';
  if (low.includes('salem')) return 'M';
  if (low.includes('vizag') || low.includes('visakhapatnam')) return 'Z';
  if (low.includes('gandhi') || low.includes('gpm')) return 'G';
  if (low.includes('saravanampatti') || low.includes('svm') || low.includes('coimbatore') || low.includes('cbe')) return 'S';
  if (low.includes('pune')) return 'P';
  if (low.includes('kollapur') || low.includes('kolhapur')) return 'L';
  if (low.includes('theni')) return 'N';

  return 'S';
}

/**
 * Resolve course code according to official specification:
 * AMCT(Beginner)=AB, AMCT(Intermediate)=AI, AMCT(Advanced)=AA, AMCT=A, CPC=C, CPC crash course=F,
 * ED=D, E/M=N, IPDRG=I, CCS=S, CPMA=P, CIC=E, CRC=R, SUR=Y, CPT=T, ICD=Z, HCC=H, ANATOMY=O, CEMC=CN, RADIOLOGY=R
 */
export function getCourseCode(course) {
  if (!course) return 'C';
  const str = String(course).trim();
  const upper = str.toUpperCase();
  if (COURSE_MAP[upper]) return upper;

  if (upper.includes('CRASH')) return 'F';
  if (upper.includes('AMCT BEGINNER') || upper.includes('AMCT(BEGINNER)') || (upper.includes('AMCT') && upper.includes('BEGINNER'))) return 'AB';
  if (upper.includes('AMCT INTERMEDIATE') || upper.includes('AMCT(INTERMEDIATE)') || (upper.includes('AMCT') && upper.includes('INTERMEDIATE'))) return 'AI';
  if (upper.includes('AMCT ADVANCED') || upper.includes('AMCT(ADVANCED)') || (upper.includes('AMCT') && upper.includes('ADVANCED'))) return 'AA';
  if (upper.includes('AMCT') || upper.includes('MCT')) return 'A';
  if (upper.includes('INTERNSHIP BEGINNER')) return 'IB';
  if (upper.includes('INTERNSHIP INTERMEDIATE')) return 'II';
  if (upper.includes('INTERNSHIP ADVANCED')) return 'IA';
  if (upper.includes('INTERNSHIP')) return 'IB';
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
  if (upper.includes('SURGERY') || upper.includes('SUR')) return 'Y';
  if (upper.includes('EMERGENCY') || upper.includes('ED -') || upper.includes('ED (') || upper === 'ED') return 'D';
  if (upper.includes('EVALUATION') || upper.includes('EM -') || upper.includes('E/M') || upper === 'EM' || upper === 'E & M') return 'N';
  if (upper.includes('RADIOLOGY') || upper.includes('RAD')) return 'R';
  if (upper.includes('ANESTHESIA')) return 'AN';
  if (upper.includes('IP DRG') || upper.includes('IPDRG') || upper.includes('IP-DRG')) return 'I';
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
  if (upper.includes('CPC') || upper === 'C') return 'C';
  if (upper.includes('MEDICAL CODING') || upper === 'M') return 'M';

  return 'C';
}

/**
 * Resolve course type code (ONLINE = O, CLASSROOM / OFFLINE = C, HYBRID = H)
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
 * Resolve single-letter month code according to official specification:
 * Jan=J, Feb=F, Mar=M, Apri=A, May=Y, June=E, July=L, August=U, September=S, October=O, November=N, December=D
 */
export function getMonthCode(dateOrMonth) {
  if (!dateOrMonth) {
    const cur = new Date();
    return MONTH_INDEX_CODES[cur.getMonth()] || 'N';
  }

  const str = String(dateOrMonth).trim().toUpperCase();
  if (MONTH_MAP[str]) return str;

  const monthNames = {
    'JAN': 'J', 'JANUARY': 'J',
    'FEB': 'F', 'FEBRUARY': 'F',
    'MAR': 'M', 'MARCH': 'M',
    'APR': 'A', 'APRI': 'A', 'APRIL': 'A',
    'MAY': 'Y',
    'JUN': 'E', 'JUNE': 'E',
    'JUL': 'L', 'JULY': 'L',
    'AUG': 'U', 'AUGUST': 'U',
    'SEP': 'S', 'SEPTEMBER': 'S',
    'OCT': 'O', 'OCTOBER': 'O',
    'NOV': 'N', 'NOVEMBER': 'N',
    'DEC': 'D', 'DECEMBER': 'D'
  };
  if (monthNames[str]) return monthNames[str];

  const d = dateOrMonth instanceof Date ? dateOrMonth : new Date(dateOrMonth);
  if (!isNaN(d.getTime())) {
    return MONTH_INDEX_CODES[d.getMonth()] || 'N';
  }

  return 'N';
}

/**
 * Resolve single-digit year code (2022=2, 2023=3, 2024=4, 2025=5, 2026=6...)
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
 * Calculate the next available 3-digit serial from existing students (001, 002, 003...)
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
 * Main generator function that builds student ID matching ThoughtFlows official formula:
 * 1. Company name: TF
 * 2. Branch name (Saravanampatti=S, Hopes=H, Tirupati=T, Trivandrum=V, Hyderabad=D, Trichy=C, Kochi=K, Salem=M, DSNR=R, VIZAG=Z, GPM=G)
 * 3. Course name (AMCT Beginner=AB, CPC=C, etc.)
 * 4. Course type (ONLINE=O, CLASSROOM=C, HYBRID=H)
 * 5. Month (Jan=J, Feb=F, Mar=M, Apri=A, May=Y, June=E, July=L, August=U, September=S, October=O, November=N, December=D)
 * 6. Year (2026=6)
 * 7. Serial number (001, 002, 003...)
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
  const courseName = COURSE_MAP[courseCode] || 'CPC';
  const typeName = TYPE_MAP[typeCode] || 'Online';
  const monthName = MONTH_MAP[monthCode] || 'November';
  const yearVal = YEAR_MAP[yearCode] || `${new Date().getFullYear()}`;

  const breakdownText = `${companyPrefix} · ${branchName} (${branchCode}) · ${courseName} (${courseCode}) · ${typeName} (${typeCode}) · ${monthName} (${monthCode}) · ${yearVal} (${yearCode}) · Serial ${resolvedSerial}`;

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
