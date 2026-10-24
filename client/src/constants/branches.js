/**
 * Comprehensive master branches list for ThoughtFlows HRMS & CRM
 */

export const ALL_BRANCH_OPTIONS = [
  { value: 'Ameerpet (Hyderabad)', label: 'Ameerpet (Hyderabad)', city: 'Hyderabad', short: 'Ameerpet' },
  { value: 'Dilsukhnagar (Hyderabad)', label: 'Dilsukhnagar (Hyderabad)', city: 'Hyderabad', short: 'Dilsukhnagar' },
  { value: 'Gandhipuram (CBE)', label: 'Gandhipuram (Coimbatore)', city: 'Coimbatore', short: 'Gandhipuram' },
  { value: 'Saravanampatti (CBE)', label: 'Saravanampatti (Coimbatore)', city: 'Coimbatore', short: 'Saravanampatti' },
  { value: 'Hopes (CBE)', label: 'Hopes (Coimbatore)', city: 'Coimbatore', short: 'Hopes' },
  { value: 'Kochi (Kerala)', label: 'Kochi (Kerala)', city: 'Kochi', short: 'Kochi' },
  { value: 'Tirupati (Andhra)', label: 'Tirupati / Tripathi (Andhra)', city: 'Tirupati', short: 'Tirupati' },
  { value: 'Vizag (Visakhapatnam)', label: 'Vizag (Visakhapatnam)', city: 'Visakhapatnam', short: 'Vizag' },
  { value: 'Pune (Maharashtra)', label: 'Pune (Maharashtra)', city: 'Pune', short: 'Pune' },
  { value: 'Salem (Tamil Nadu)', label: 'Salem (Tamil Nadu)', city: 'Salem', short: 'Salem' },
  { value: 'Trichy (Tamil Nadu)', label: 'Trichy (Tamil Nadu)', city: 'Trichy', short: 'Trichy' },
  { value: 'Trivandrum (Kerala)', label: 'Trivandrum (Kerala)', city: 'Trivandrum', short: 'Trivandrum' },
  { value: 'Kollapur (Maharashtra)', label: 'Kollapur (Maharashtra)', city: 'Kolhapur', short: 'Kollapur' },
  { value: 'Theni (Tamil Nadu)', label: 'Theni (Tamil Nadu)', city: 'Theni', short: 'Theni' },
  { value: 'Anna Nagar (Chennai)', label: 'Anna Nagar (Chennai)', city: 'Chennai', short: 'Anna Nagar' },
  { value: 'OMR (Chennai)', label: 'OMR (Chennai)', city: 'Chennai', short: 'OMR' },
  { value: 'Tambaram (Chennai)', label: 'Tambaram (Chennai)', city: 'Chennai', short: 'Tambaram' },
  { value: 'Madurai', label: 'Madurai', city: 'Madurai', short: 'Madurai' },
  { value: 'Bangalore', label: 'Bangalore', city: 'Bangalore', short: 'Bangalore' },
  { value: 'Not Mentioned', label: 'Not Mentioned', city: 'Not Mentioned', short: 'Not Mentioned' }
];

/**
 * Smart detect branch from text, location, or notes
 */
export function detectBranchFromText(text = '') {
  if (!text) return '';
  const t = String(text).toLowerCase();

  if (/\b(dsnr|dilsukhnagar|dilsuknagar|dilsukh|hyderabad\s*dsnr)\b/i.test(t)) return 'Dilsukhnagar (Hyderabad)';
  if (/\b(amp|ameerpet|ameerpet\s*branch|hyderabad\s*amp)\b/i.test(t)) return 'Ameerpet (Hyderabad)';
  if (/\b(gandhipuram|gpm|cbe\s*gpm)\b/i.test(t)) return 'Gandhipuram (CBE)';
  if (/\b(saravanampatti|svm|cbe\s*svm)\b/i.test(t)) return 'Saravanampatti (CBE)';
  if (/\b(hopes|hopes\s*college|cbe\s*hopes)\b/i.test(t)) return 'Hopes (CBE)';
  if (/\b(kochi|cochin|ernakulam|kerala)\b/i.test(t)) return 'Kochi (Kerala)';
  if (/\b(tirupati|tripathi|tirupathi|tpt)\b/i.test(t)) return 'Tirupati (Andhra)';
  if (/\b(vizag|visakhapatnam|vzg)\b/i.test(t)) return 'Vizag (Visakhapatnam)';
  if (/\b(pune|pun|maharashtra\s*pune)\b/i.test(t)) return 'Pune (Maharashtra)';
  if (/\b(salem|slm)\b/i.test(t)) return 'Salem (Tamil Nadu)';
  if (/\b(trichy|tiruchirappalli|tiruchi|try)\b/i.test(t)) return 'Trichy (Tamil Nadu)';
  if (/\b(trivandrum|thiruvananthapuram|trv)\b/i.test(t)) return 'Trivandrum (Kerala)';
  if (/\b(kollapur|kolhapur|klp)\b/i.test(t)) return 'Kollapur (Maharashtra)';
  if (/\b(theni|thn)\b/i.test(t)) return 'Theni (Tamil Nadu)';
  if (/\b(anna\s*nagar|omr|tambaram|chennai)\b/i.test(t)) return 'Anna Nagar (Chennai)';
  if (/\b(bangalore|bengaluru)\b/i.test(t)) return 'Bangalore';
  if (/\b(madurai)\b/i.test(t)) return 'Madurai';

  return '';
}
