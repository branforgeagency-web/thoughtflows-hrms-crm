// Lead sources were typed by hand for years, so the same source is stored many
// ways ("Instagram Chat", "Instagram Chatting", "Instragram", "Diect Call"...).
// canonicalLeadSource() maps every variant to ONE name — the official names from
// client/src/constants/leadSources.js — so filters show each source once.
// KEEP IN SYNC with client/src/constants/leadSourceCanon.js (same file).

const PLACEHOLDERS = new Set(['n/a', 'na', 'none', 'nil', 'null', 'undefined', 'unknown', 'not mentioned', '-']);

const toTitle = (str) =>
  str.replace(/\w\S*/g, (w) => (w.length <= 2 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()));

// Common misspellings → correct word (applied to the lowercased value)
const TYPOS = [
  [/\binst?r?a?g?ram\b|\binstragram\b|\binstagaram\b|\binstagarm\b|\binsta\b/g, 'instagram'],
  [/\bdiect\b|\bdirct\b|\bdrect\b|\bdirec\b|\bdierct\b/g, 'direct'],
  [/\bwalk\s*-?\s*in\b|\bwalking\b/g, 'walkin'],
  [/\bfb\b|\bface\s*book\b/g, 'facebook'],
  [/\byou\s*tube\b|\byt\b/g, 'youtube'],
  [/\blinked\s*in\b/g, 'linkedin'],
  [/\bwhats\s*app\b|\bwa\b/g, 'whatsapp'],
  [/\bjust\s*dial\b|\bjd\b/g, 'justdial'],
  [/\bcalls\b/g, 'call']
];

// First matching rule wins — the more specific rules come first.
const RULES = [
  [/instagram/, (k) => (/call/.test(k) ? 'Instagram Direct Call' : /comment/.test(k) ? 'Instagram Comments' : 'Instagram Chatting')],
  [/facebook/, (k) => (/call/.test(k) ? 'Facebook Direct Call' : /comment/.test(k) ? 'FB Comments' : /messenger/.test(k) ? 'FB Messenger' : /job/.test(k) ? 'Facebook Job Post' : 'Facebook Chatting')],
  [/linkedin/, (k) => (/call/.test(k) ? 'LinkedIn Direct Call' : /comment/.test(k) ? 'LinkedIn Comments' : 'LinkedIn Chatting')],
  [/youtube/, (k) => (/comment/.test(k) ? 'YouTube Comments' : 'YouTube DM')],
  [/whatsapp/, () => 'WhatsApp — Direct from Student'],
  [/justdial/, () => 'Justdial'],
  [/telegram/, () => 'Telegram'],
  [/naukri|job\s*portal/, () => 'Job Portals (Naukri)'],
  [/webinar/, () => 'Webinars'],
  [/workshop/, () => 'Workshop'],
  [/google.*(sheet|import)|bulk\s*import/, () => 'Google Sheet Bulk Import'],
  [/google\s*my\s*business/, () => 'Google My Business'],
  [/google|gmb/, () => 'Google Calls / GMB'],
  [/walkin/, () => 'Direct Walk-in'],
  [/corporate/, () => 'Corporate Referrals'],
  [/refer/, () => 'Referral'],
  [/website|web\s*(enquiry|inquiry|form)|enquiry\s*form/, () => 'Website Enquiry Form'],
  [/e-?mail/, () => 'Email Enquiry'],
  [/college.*demo|bulk\s*demo/, () => 'College Bulk Demo'],
  [/^e\s*\/?\s*m\s*demo/, () => 'E/M Demo'],
  [/^demo(\s*call)?$/, () => 'Demo'],
  [/^(direct\s*)?(phone\s*)?call(\s*for\s*students?)?$|^direct$/, () => 'Direct Call'],
  [/pre\s*-?\s*covid/, () => 'Pre-COVID Old Follow-up'],
  [/old\s*smo|smo\s*follow/, () => 'Old SMO Follow-up'],
  [/old\s*student|repeat/, () => 'Old Student (Repeat)'],
  [/consult/, () => 'Consulting Firms']
];

export function canonicalLeadSource(raw) {
  const tidy = String(raw || '').replace(/\s*\/\s*/g, ' / ').replace(/\s+/g, ' ').trim();
  if (!tidy || !/[a-zA-Z]/.test(tidy)) return '';
  let k = tidy.toLowerCase();
  if (PLACEHOLDERS.has(k)) return '';
  TYPOS.forEach(([rx, to]) => { k = k.replace(rx, to); });
  k = k.replace(/\s+/g, ' ').trim();
  for (const [rx, name] of RULES) {
    if (rx.test(k)) return name(k);
  }
  return toTitle(tidy);
}
