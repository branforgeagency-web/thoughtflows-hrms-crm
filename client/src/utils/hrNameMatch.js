import { detectBranchFromText } from '../constants/branches.js';

export const normHrName = (v) =>
  String(v || '')
    .replace(/[.\-_]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

export const normalizeBranchKey = (v) => {
  const raw = String(v || '').trim();
  if (!raw || /^not\s*mentioned$/i.test(raw)) return '';
  const detected = detectBranchFromText(raw) || raw;
  return detected
    .toLowerCase()
    .replace(/\s*(branch|\(.*\)|hq)\b/gi, '')
    .replace(/[^a-z0-9]/g, '');
};

export const branchesCompatible = (b1, b2) => {
  const k1 = normalizeBranchKey(b1);
  const k2 = normalizeBranchKey(b2);
  if (!k1 || !k2) return true;
  return k1 === k2 || k1.includes(k2) || k2.includes(k1);
};

/**
 * Match a record/sheet owner name against a dashboard user/member name,
 * disambiguating shared short/first names (e.g. "Pavithra" vs "Pavithra N")
 * by their branch when both branches are known.
 */
export const matchesHrOwnerName = (
  candidateName,
  loggedInName,
  candidateBranch = '',
  loggedInBranch = ''
) => {
  if (!candidateName || !loggedInName) return false;
  const c = normHrName(candidateName);
  const m = normHrName(loggedInName);
  if (!c || !m) return false;

  const cNoSpace = c.replace(/\s+/g, '');
  const mNoSpace = m.replace(/\s+/g, '');
  const cWords = c.split(' ').filter(Boolean);
  const mWords = m.split(' ').filter(Boolean);

  // Exact full multi-word match ("Pavithra N" === "Pavithra N") identifies the exact counselor
  if ((c === m || cNoSpace === mNoSpace) && Math.max(cWords.length, mWords.length) > 1) {
    return true;
  }

  let nameMatched = c === m || cNoSpace === mNoSpace;
  if (!nameMatched && c.length >= 4 && m.startsWith(c)) nameMatched = true;
  if (!nameMatched && m.length >= 4 && c.startsWith(m)) nameMatched = true;
  if (!nameMatched && cWords.length === 1 && cWords[0].length >= 3 && mWords.includes(cWords[0])) {
    nameMatched = true;
  }
  if (!nameMatched && mWords.length === 1 && mWords[0].length >= 3 && cWords.includes(mWords[0])) {
    nameMatched = true;
  }
  if (!nameMatched) return false;

  // For single-word / partial matches ("Pavithra" vs "Pavithra N", or two "Pavithra"s
  // across branches), check branch compatibility when both branches are known.
  return branchesCompatible(candidateBranch, loggedInBranch);
};
