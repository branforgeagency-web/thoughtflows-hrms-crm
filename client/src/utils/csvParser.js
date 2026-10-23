/**
 * Google Sheet / CSV Parser for Bulk Enquiry Upload
 * Handles:
 * - Copy-paste from Google Sheets (Tab-Separated Values TSV)
 * - Vertical cell paste streams (e.g. multi-cell vertical clipboard / copied columns)
 * - Uploaded CSV / TSV files
 * - Smart column matching for headers (DATE, NAME, CONTACT, EMAIL, FETCHED BY, ALLOCATED TO, MODE OF SOURCE, etc.)
 * - Auto-formatting 10-digit Indian phone numbers
 * - Stage auto-mapping (JOINED WITH US -> admitted, INTERESTED -> contacted, etc.)
 */

import { detectBranchFromText } from '../constants/branches.js';

// Known Google Sheet sources
const KNOWN_SOURCES = [
  'google calls',
  'justdial',
  'direct walkin',
  'walkin',
  'whatsup directly from student',
  'whatsapp',
  'old candidates references',
  'reference',
  'direct call',
  'instagram chatting',
  'instagram',
  'linkedin chatting',
  'linkedin',
  'website',
  'meta ads',
  'facebook'
];

// Known Counselors / Agents in ThoughtFlows
const KNOWN_COUNSELORS = [
  'vishnupriya',
  'priyanka',
  'arun sir',
  'sindhuja',
  'kavitha',
  'bhanu mam',
  'tejaswini',
  'manoj',
  'keerthika',
  'vaishna',
  'pavithra'
];

// Known Category statuses
const KNOWN_STATUSES = [
  'candidate busy',
  'interested',
  'joined with us',
  'need time',
  'not picking call',
  'not reachable',
  'not interested',
  'only job',
  'call disconnected',
  'over qualify',
  'other language'
];

// Helper to extract degree and passout year from text
function extractEduAndYear(text) {
  let education = '';
  let passoutYear = '';

  const yearMatch = text.match(/\b(19\d{2}|20[2-3]\d)\b/);
  if (yearMatch) {
    passoutYear = yearMatch[1];
  }

  const degreeMatch = text.match(/\b(b\s*pharmacy|m\s*pharmacy|b\.?pharm|m\.?pharm|bsc|msc|bcom|mcom|bca|mca|bba|mba|btech|mtech|be|me|bpt|mpt|microbiology|biomedical|biotechnology|life\s*sciences|food\s*science|cardiology|mlt)\b/i);
  if (degreeMatch) {
    education = degreeMatch[0].toUpperCase();
  }

  return { education, passoutYear };
}

const MONTH_NAMES = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

// Normalize a sheet's date cell ("12/10/2026", "2026-10-12", "12-Oct-2026", "12 Oct 2026" …)
// into { date: "YYYY-MM-DD", month: "YYYY-MM" }, or null if it doesn't look like a date.
// Indian sheets write dates DD/MM/YYYY, so a slash/dash numeric date is read day-first.
function parseDateCell(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); // YYYY-MM-DD
  if (m) {
    const [, y, mo, d] = m;
    return { date: `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`, month: `${y}-${mo.padStart(2, '0')}` };
  }

  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/); // DD/MM/YYYY or DD-MM-YY
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = (Number(y) > 50 ? '19' : '20') + y;
    if (Number(mo) > 12 && Number(d) <= 12) { [d, mo] = [mo, d]; } // tolerate an accidental MM/DD sheet
    if (Number(mo) >= 1 && Number(mo) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      return { date: `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`, month: `${y}-${mo.padStart(2, '0')}` };
    }
  }

  m = s.match(/^(\d{1,2})[\s\-]([a-zA-Z]{3,})[\s\-](\d{2,4})$/); // "12-Oct-2026" / "12 October 2026"
  if (m) {
    const [, d, monText, yRaw] = m;
    const mi = MONTH_NAMES.indexOf(monText.toLowerCase().slice(0, 3));
    if (mi >= 0) {
      const y = yRaw.length === 2 ? (Number(yRaw) > 50 ? '19' : '20') + yRaw : yRaw;
      const mo = String(mi + 1).padStart(2, '0');
      return { date: `${y}-${mo}-${d.padStart(2, '0')}`, month: `${y}-${mo}` };
    }
  }

  // "Sep 1" / "Sept 21" — month name first, no year at all. These running sheets
  // are updated through the same month, so the year is always the current one;
  // without this, an undated-looking cell like "Sep 1" fell all the way through
  // to today's month instead of the sheet's own month.
  m = s.match(/^([a-zA-Z]{3,})[\s\-]+(\d{1,2})(?:st|nd|rd|th)?$/i);
  if (m) {
    const [, monText, d] = m;
    const mi = MONTH_NAMES.indexOf(monText.toLowerCase().slice(0, 3));
    if (mi >= 0 && Number(d) >= 1 && Number(d) <= 31) {
      const y = new Date().getFullYear();
      const mo = String(mi + 1).padStart(2, '0');
      return { date: `${y}-${mo}-${d.padStart(2, '0')}`, month: `${y}-${mo}` };
    }
  }

  return null;
}

// Normalize a sheet's standalone month cell ("October 2026", "Oct-26", "10/2026") into "YYYY-MM".
function parseMonthCell(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';

  let m = s.match(/^(\d{4})-(\d{1,2})$/); // YYYY-MM
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}`;

  m = s.match(/^(\d{1,2})[\/\-](\d{2,4})$/); // MM/YYYY or MM-YY
  if (m) {
    let [, mo, y] = m;
    if (y.length === 2) y = (Number(y) > 50 ? '19' : '20') + y;
    if (Number(mo) >= 1 && Number(mo) <= 12) return `${y}-${mo.padStart(2, '0')}`;
  }

  m = s.match(/^([a-zA-Z]{3,})[\s\-,]*'?(\d{2,4})$/); // "October 2026" / "Oct-26"
  if (m) {
    const [, monText, yRaw] = m;
    const mi = MONTH_NAMES.indexOf(monText.toLowerCase().slice(0, 3));
    if (mi >= 0) {
      const y = yRaw.length === 2 ? (Number(yRaw) > 50 ? '19' : '20') + yRaw : yRaw;
      return `${y}-${String(mi + 1).padStart(2, '0')}`;
    }
  }

  // Bare month name, no year — assume the current year
  const mi = MONTH_NAMES.indexOf(s.toLowerCase().slice(0, 3));
  if (mi >= 0) return `${new Date().getFullYear()}-${String(mi + 1).padStart(2, '0')}`;

  return '';
}

// Map Google Sheet category to CRM pipeline stage
function mapCategoryToStage(cat) {
  if (!cat) return 'new';
  const c = cat.toLowerCase();
  if (c.includes('joined') || c.includes('admitted')) return 'admitted';
  if (c.includes('interested') || c.includes('need time') || c.includes('demo')) return 'contacted';
  if (c.includes('not interested')) return 'closed';
  return 'new';
}

/**
 * Vertical Stream Parser:
 * Detects records when data is pasted as a vertical list of cells (e.g. each column cell is on a newline).
 */
function parseVerticalStream(lines) {
  // Find all indices that contain a 10-digit Indian phone number
  const phoneLineIndices = [];
  lines.forEach((line, idx) => {
    const digits = line.replace(/\D+/g, '');
    if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
      phoneLineIndices.push(idx);
    }
  });

  if (phoneLineIndices.length === 0) return [];

  const records = [];

  for (let i = 0; i < phoneLineIndices.length; i++) {
    const pIdx = phoneLineIndices[i];
    const rawPhone = lines[pIdx];
    const cleanPhone = rawPhone.replace(/\D+/g, '').slice(-10);

    // Candidate name is usually 1 line before phone
    let name = pIdx > 0 ? lines[pIdx - 1] : 'Candidate';
    if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}[/-])/i.test(name) || name.length > 50) {
      name = 'Candidate';
    }

    // Date might be 2 lines before phone
    let dateStr = pIdx > 1 ? lines[pIdx - 2] : '';
    if (!/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}[/-])/i.test(dateStr)) {
      dateStr = '';
    }

    // Determine the boundary of the current record
    const nextBoundary = (i + 1 < phoneLineIndices.length)
      ? Math.max(pIdx + 1, phoneLineIndices[i + 1] - 2)
      : lines.length;

    const recordLines = lines.slice(pIdx + 1, nextBoundary);

    let source = '';
    let counselor = '';
    let fetchedBy = '';
    let category = '';
    let email = '';
    let education = '';
    let passoutYear = '';
    const noteParts = [];

    let branch = '';
    recordLines.forEach(l => {
      const lower = l.toLowerCase();
      if (!branch) {
        const detected = detectBranchFromText(l);
        if (detected) branch = detected;
      }
      if (!email && l.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l)) {
        email = l;
      } else if (!source && KNOWN_SOURCES.some(s => lower.includes(s))) {
        source = l;
      } else if (KNOWN_COUNSELORS.some(c => lower === c || lower.includes(c))) {
        if (!counselor && (lower.includes('vishnupriya') || lower.includes('priyanka'))) {
          counselor = l;
        } else if (!fetchedBy) {
          fetchedBy = l;
        }
      } else if (!category && KNOWN_STATUSES.some(st => lower === st)) {
        category = l.toUpperCase();
      } else {
        noteParts.push(l);
        // Try extracting degree & year
        if (!education || !passoutYear) {
          const extracted = extractEduAndYear(l);
          if (extracted.education && !education) education = extracted.education;
          if (extracted.passoutYear && !passoutYear) passoutYear = extracted.passoutYear;
        }
      }
    });

    const fullNotes = [
      fetchedBy ? `Fetched by: ${fetchedBy}` : '',
      dateStr ? `Sheet Date: ${dateStr}` : '',
      ...noteParts
    ].filter(Boolean).join(' | ');

    // The sheet date line often has no year (e.g. "12-Oct") — fall back to
    // a bare month-only read (assuming the current year) when a full date
    // can't be parsed.
    const parsedVDate = dateStr ? parseDateCell(dateStr) : null;
    const enquiryDate = parsedVDate ? parsedVDate.date : '';
    const enquiryMonth = (parsedVDate && parsedVDate.month) || (dateStr ? parseMonthCell(dateStr) : '');

    records.push({
      rowNumber: i + 1,
      fullName: name,
      name,
      phone: cleanPhone,
      whatsappNumber: cleanPhone,
      email,
      course: 'AMCT Beginner (Classroom)',
      branch: branch || '',
      sourceName: source || 'Google Sheet Import',
      counselorAssigned: counselor || '',
      allocatedTo: counselor || '',
      spokenBy: counselor || '',
      category: category || 'Enquiry',
      stage: mapCategoryToStage(category),
      education,
      passoutYear,
      location: '',
      enquiryDate,
      enquiryMonth,
      notes: fullNotes,
      // Every parsed row is imported — a missing/invalid phone number is
      // flagged as a warning only, never a reason to drop the row.
      isValid: true,
      errorReason: cleanPhone.length === 10 ? '' : 'Invalid or missing phone number'
    });
  }

  return records;
}

export function parseGoogleSheetOrCsv(rawText) {
  if (!rawText || !rawText.trim()) return [];

  // Split into raw lines. Deliberately NOT trimming each whole line here (only
  // dropping lines that are blank once trimmed) — a row whose first column is
  // blank (e.g. a tab-separated sheet's DATE cell left empty on a continuation
  // row) starts with a tab character, and String.trim() treats a tab as
  // whitespace too, so trimming the line would eat that leading empty column
  // and shift every value in the row one column to the left. Individual cells
  // are still trimmed per-cell below in parseLine().
  const rawLines = rawText
    .split(/\r?\n/)
    .filter(line => line.trim() !== '');

  if (!rawLines.length) return [];

  // Check if text is a vertical stream (few or no horizontal delimiters, but has phone numbers on separate lines)
  const hasTabs = rawLines.some(l => l.includes('\t'));
  const commaLines = rawLines.filter(l => l.includes(',')).length;
  const isTabular = hasTabs || (commaLines >= rawLines.length * 0.5);
  const hasPhoneLines = rawLines.some(l => /^[6-9]\d{9}$/.test(l.replace(/\D+/g, '')));

  if (!isTabular && hasPhoneLines) {
    const verticalResult = parseVerticalStream(rawLines);
    if (verticalResult.length > 0) {
      return verticalResult;
    }
  }

  // Detect delimiter from first row (Tab, Comma, Semicolon)
  const firstLine = rawLines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if (firstLine.includes(',')) {
    delimiter = ',';
  } else if (firstLine.includes(';')) {
    delimiter = ';';
  }

  // Parse a single line with support for quotes
  const parseLine = (line) => {
    if (delimiter === '\t') {
      return line.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
    }
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const parsedMatrix = rawLines.map(parseLine);
  if (!parsedMatrix.length) return [];

  // Check if first line contains header titles
  const headerRow = parsedMatrix[0].map(h => String(h || '').toLowerCase().trim());
  const hasRecognizedHeader = headerRow.some(h => 
    /name|phone|contact|mobile|whatsapp|email|course|branch|source|qual|degree|passout|location|city|note|category|remark|allocated|date|month/i.test(h)
  );

  let headers = [];
  let dataRows = [];

  if (hasRecognizedHeader) {
    headers = headerRow;
    dataRows = parsedMatrix.slice(1);
  } else {
    // Positional assumption if no header row present
    headers = ['name', 'phone', 'course', 'branch', 'email', 'whatsapp'];
    dataRows = parsedMatrix;
  }

  // Index mapping for all standard ThoughtFlows Google Sheet columns
  const fieldIndex = {};
  const extraNotesIndices = [];

  headers.forEach((h, idx) => {
    if (/^(name|full\s*name|candidate\s*name|student\s*name|candidate|lead\s*name)$/i.test(h)) fieldIndex.name = idx;
    else if (/^(phone|mobile|contact|contact\s*no|mobile\s*no|phone\s*no|mobile\s*number|phone\s*number|primary\s*mobile)$/i.test(h)) fieldIndex.phone = idx;
    else if (/^(whatsapp|whatsapp\s*no|whatsapp\s*number|wa|alt\s*phone|alternate\s*no|additional\s*no)$/i.test(h)) fieldIndex.whatsapp = idx;
    else if (/^(email|email\s*id|email\s*address|mail)$/i.test(h)) fieldIndex.email = idx;
    else if (/^(course|interested\s*course|program|training|course\s*name)$/i.test(h)) fieldIndex.course = idx;
    else if (/^(branch|preferred\s*branch|location\s*branch|centre|center|campus)$/i.test(h)) fieldIndex.branch = idx;
    else if (/^(source|lead\s*source|source\s*name|channel|mode\s*of\s*source|platform)$/i.test(h)) fieldIndex.source = idx;
    else if (/^(category|student\s*category|lead\s*category|type)$/i.test(h)) fieldIndex.category = idx;
    else if (/^(allocated(\s*to)?|counselor|counselor\s*assigned|assigned\s*to|lead\s*owner|owner|agent)$/i.test(h)) fieldIndex.counselor = idx;
    else if (/^(spoken\s*by|called\s*by|telecaller)$/i.test(h)) fieldIndex.spokenBy = idx;
    else if (/^(fetched\s*by|lead\s*by|captured\s*by|created\s*by)$/i.test(h)) fieldIndex.fetchedBy = idx;
    else if (/^(qualification|education|degree|qual|highest\s*qualification)$/i.test(h)) fieldIndex.qualification = idx;
    else if (/^(passout|passout\s*year|year\s*of\s*passing|passed\s*out|year|batch)$/i.test(h)) fieldIndex.passoutYear = idx;
    else if (/^(location|city|place|native|address|candidate\s*location)$/i.test(h)) fieldIndex.location = idx;
    else if (/^(date|enquiry\s*date|lead\s*date|entry\s*date|call\s*date|contact\s*date|registration\s*date)$/i.test(h)) fieldIndex.date = idx;
    else if (/^(month|enquiry\s*month|lead\s*month)$/i.test(h)) fieldIndex.month = idx;
    else if (/^(note|notes|remarks|comment|comments|handover\s*note|enquiry\s*notes|follow\s*up|follow\s*up\s*1|follow\s*up\s*2|hold|lost|lead)$/i.test(h)) {
      if (fieldIndex.notes === undefined) fieldIndex.notes = idx;
      else extraNotesIndices.push(idx);
    }
  });

  // Fallbacks if primary fields not mapped by name
  if (fieldIndex.name === undefined) fieldIndex.name = 0;
  if (fieldIndex.phone === undefined && headers.length > 1) fieldIndex.phone = 1;

  // Carried forward onto a row whose own Date/Month cell is blank — the sheet
  // only writes the date once per day and leaves it blank on the rows below.
  let lastEnquiryDate = '';
  let lastEnquiryMonth = '';

  return dataRows.map((cols, rowIdx) => {
    const rawName = String(cols[fieldIndex.name] || '').trim();
    const rawPhone = String(cols[fieldIndex.phone] || '').trim();
    const digitsOnly = rawPhone.replace(/\D+/g, '');
    const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

    const rawWa = fieldIndex.whatsapp !== undefined ? String(cols[fieldIndex.whatsapp] || '').trim() : '';
    const cleanWaDigits = rawWa.replace(/\D+/g, '');
    const cleanWa = cleanWaDigits.length >= 10 ? cleanWaDigits.slice(-10) : (cleanPhone || rawPhone);

    const email = fieldIndex.email !== undefined ? String(cols[fieldIndex.email] || '').trim() : '';
    const course = fieldIndex.course !== undefined ? String(cols[fieldIndex.course] || '').trim() : '';
    const location = fieldIndex.location !== undefined ? String(cols[fieldIndex.location] || '').trim() : '';
    const sourceName = fieldIndex.source !== undefined ? String(cols[fieldIndex.source] || '').trim() : '';
    const category = fieldIndex.category !== undefined ? String(cols[fieldIndex.category] || '').trim() : '';
    const counselorAssigned = fieldIndex.counselor !== undefined ? String(cols[fieldIndex.counselor] || '').trim() : '';
    const spokenBy = fieldIndex.spokenBy !== undefined ? String(cols[fieldIndex.spokenBy] || '').trim() : '';
    const fetchedBy = fieldIndex.fetchedBy !== undefined ? String(cols[fieldIndex.fetchedBy] || '').trim() : '';

    const dateCell = fieldIndex.date !== undefined ? String(cols[fieldIndex.date] || '').trim() : '';
    const monthCell = fieldIndex.month !== undefined ? String(cols[fieldIndex.month] || '').trim() : '';
    const parsedDate = dateCell ? parseDateCell(dateCell) : null;
    let enquiryDate = parsedDate ? parsedDate.date : '';
    let enquiryMonth = (parsedDate && parsedDate.month) || (monthCell ? parseMonthCell(monthCell) : '');
    if (enquiryDate || enquiryMonth) {
      lastEnquiryDate = enquiryDate;
      lastEnquiryMonth = enquiryMonth || lastEnquiryMonth;
    } else {
      enquiryDate = lastEnquiryDate;
      enquiryMonth = lastEnquiryMonth;
    }

    // Collect all remarks, follow ups, and comments
    const mainNote = fieldIndex.notes !== undefined ? String(cols[fieldIndex.notes] || '').trim() : '';
    const extraNotes = extraNotesIndices.map(idx => String(cols[idx] || '').trim()).filter(Boolean);
    const combinedNotes = [fetchedBy ? `Fetched by: ${fetchedBy}` : '', mainNote, ...extraNotes].filter(Boolean).join(' | ');

    let branch = fieldIndex.branch !== undefined ? String(cols[fieldIndex.branch] || '').trim() : '';
    if (branch) {
      const normalized = detectBranchFromText(branch);
      if (normalized) branch = normalized;
    } else {
      branch = detectBranchFromText(location + ' ' + combinedNotes);
    }

    let education = fieldIndex.qualification !== undefined ? String(cols[fieldIndex.qualification] || '').trim() : '';
    let passoutYear = fieldIndex.passoutYear !== undefined ? String(cols[fieldIndex.passoutYear] || '').trim() : '';

    // Extract degree & year from notes if missing
    if (!education || !passoutYear) {
      const extracted = extractEduAndYear(combinedNotes);
      if (extracted.education && !education) education = extracted.education;
      if (extracted.passoutYear && !passoutYear) passoutYear = extracted.passoutYear;
    }

    const hasName = Boolean(rawName && rawName.length >= 2);
    const hasContact = Boolean(cleanPhone && cleanPhone.length >= 10) || Boolean(email && email.includes('@'));
    // Every parsed row is imported — a missing name or a missing/invalid
    // mobile number is surfaced as a warning only, never a reason to skip
    // the row.
    const isValid = true;

    let errorReason = '';
    if (!hasName) errorReason = 'Missing candidate name';
    else if (!hasContact) errorReason = 'Missing or invalid 10-digit mobile number';

    return {
      rowNumber: rowIdx + 1,
      fullName: rawName,
      name: rawName,
      phone: cleanPhone || rawPhone,
      whatsappNumber: cleanWa || cleanPhone || rawPhone,
      email,
      course,
      branch,
      sourceName,
      counselorAssigned: counselorAssigned || spokenBy || '',
      allocatedTo: counselorAssigned || spokenBy || '',
      spokenBy: spokenBy || counselorAssigned || '',
      category,
      stage: mapCategoryToStage(category),
      education,
      passoutYear,
      location,
      enquiryDate,
      enquiryMonth,
      notes: combinedNotes,
      isValid,
      errorReason
    };
  });
}

export function downloadSampleGoogleSheetTemplate() {
  const headers = 'Full Name,Mobile Number,WhatsApp Number,Email Address,Course,Branch,Source,Allocated To,Qualification,Passout Year,Location,Notes\n';
  const sampleData = [
    'Ravi Kumar,9876543210,9876543210,ravi.kumar@gmail.com,CPC - Certified Professional Coder,Saravanampatti (CBE),Google calls,Vishnupriya,B.Sc Life Sciences,2024,Coimbatore,Interested in weekday morning batch',
    'Priya Sharma,9123456789,9123456789,priya.s@gmail.com,AMCT Beginner (Classroom),Gandhipuram (CBE),Instagram Ads,Priyanka,B.Pharm,2023,Salem,Classroom batch preferred',
    'Ananya Das,9988776655,9988776655,ananya.d@gmail.com,CPC - Certified Professional Coder,Kochi,Direct walkin,Vishnupriya,B.Sc Nursing,2022,Kochi,Wants weekend online batch'
  ].join('\n');

  const blob = new Blob([headers + sampleData], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'ThoughtFlows_Enquiry_Google_Sheet_Template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
