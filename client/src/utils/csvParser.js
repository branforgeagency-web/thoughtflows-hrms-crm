/**
 * Google Sheet / CSV Parser for Bulk Enquiry Upload
 * Handles:
 * - Copy-paste from Google Sheets (Tab-Separated Values TSV)
 * - Uploaded CSV / TSV files
 * - Smart column matching for headers
 * - Auto-formatting 10-digit Indian phone numbers
 */

export function parseGoogleSheetOrCsv(rawText) {
  if (!rawText || !rawText.trim()) return [];

  // Split into raw lines
  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  // Detect delimiter from first row (Tab, Comma, Semicolon)
  const firstLine = lines[0];
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

  const parsedMatrix = lines.map(parseLine);
  if (!parsedMatrix.length) return [];

  // Check if first line contains header titles
  const headerRow = parsedMatrix[0].map(h => String(h || '').toLowerCase().trim());
  const hasRecognizedHeader = headerRow.some(h => 
    /name|phone|mobile|whatsapp|email|course|branch|source|qual|degree|passout|location|city|note/i.test(h)
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

  // Index mapping
  const fieldIndex = {};
  headers.forEach((h, idx) => {
    if (/^(name|full\s*name|candidate\s*name|student\s*name|candidate|lead\s*name)$/i.test(h)) fieldIndex.name = idx;
    else if (/^(phone|mobile|contact|mobile\s*no|phone\s*no|mobile\s*number|phone\s*number|contact\s*no|primary\s*mobile)$/i.test(h)) fieldIndex.phone = idx;
    else if (/^(whatsapp|whatsapp\s*no|whatsapp\s*number|wa|alt\s*phone|alternate\s*no|additional\s*no)$/i.test(h)) fieldIndex.whatsapp = idx;
    else if (/^(email|email\s*id|email\s*address|mail)$/i.test(h)) fieldIndex.email = idx;
    else if (/^(course|interested\s*course|program|training|course\s*name)$/i.test(h)) fieldIndex.course = idx;
    else if (/^(branch|preferred\s*branch|location\s*branch|centre|center|campus)$/i.test(h)) fieldIndex.branch = idx;
    else if (/^(source|lead\s*source|source\s*name|channel|mode\s*of\s*source|platform)$/i.test(h)) fieldIndex.source = idx;
    else if (/^(category|student\s*category|lead\s*category|type)$/i.test(h)) fieldIndex.category = idx;
    else if (/^(qualification|education|degree|qual|highest\s*qualification)$/i.test(h)) fieldIndex.qualification = idx;
    else if (/^(passout|passout\s*year|year\s*of\s*passing|passed\s*out|year|batch)$/i.test(h)) fieldIndex.passoutYear = idx;
    else if (/^(location|city|place|native|address)$/i.test(h)) fieldIndex.location = idx;
    else if (/^(note|notes|remarks|comment|comments|handover\s*note|enquiry\s*notes)$/i.test(h)) fieldIndex.notes = idx;
  });

  // Fallbacks if primary fields not mapped by name
  if (fieldIndex.name === undefined) fieldIndex.name = 0;
  if (fieldIndex.phone === undefined && headers.length > 1) fieldIndex.phone = 1;

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
    const branch = fieldIndex.branch !== undefined ? String(cols[fieldIndex.branch] || '').trim() : '';
    const sourceName = fieldIndex.source !== undefined ? String(cols[fieldIndex.source] || '').trim() : '';
    const category = fieldIndex.category !== undefined ? String(cols[fieldIndex.category] || '').trim() : '';
    const education = fieldIndex.qualification !== undefined ? String(cols[fieldIndex.qualification] || '').trim() : '';
    const passoutYear = fieldIndex.passoutYear !== undefined ? String(cols[fieldIndex.passoutYear] || '').trim() : '';
    const location = fieldIndex.location !== undefined ? String(cols[fieldIndex.location] || '').trim() : '';
    const notes = fieldIndex.notes !== undefined ? String(cols[fieldIndex.notes] || '').trim() : '';

    const hasName = Boolean(rawName && rawName.length >= 2);
    const hasContact = Boolean(cleanPhone && cleanPhone.length >= 10) || Boolean(email && email.includes('@'));
    const isValid = hasName && hasContact;

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
      category,
      education,
      passoutYear,
      location,
      notes,
      isValid,
      errorReason
    };
  });
}

export function downloadSampleGoogleSheetTemplate() {
  const headers = 'Full Name,Mobile Number,WhatsApp Number,Email Address,Course,Branch,Source,Qualification,Passout Year,Location,Notes\n';
  const sampleData = [
    'Ravi Kumar,9876543210,9876543210,ravi.kumar@gmail.com,CPC - Certified Professional Coder,Saravanampatti (CBE),Website Enquiry Form,B.Sc Life Sciences,2024,Coimbatore,Interested in weekday morning batch',
    'Priya Sharma,9123456789,9123456789,priya.s@gmail.com,AMCT Beginner (Classroom),Gandhipuram (CBE),Instagram Ads,B.Pharm,2023,Salem,Classroom batch preferred',
    'Ananya Das,9988776655,9988776655,ananya.d@gmail.com,CPC - Certified Professional Coder,Kochi,Meta Reels,B.Sc Nursing,2022,Kochi,Wants weekend online batch'
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
