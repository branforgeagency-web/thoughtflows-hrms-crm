import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------
let fallbackSecret = null;
const secret = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (!fallbackSecret) {
    fallbackSecret = crypto.randomBytes(32).toString('hex');
    console.warn('⚠ JWT_SECRET is not set — using a temporary secret. Everyone is logged out on every restart. Set JWT_SECRET in the environment.');
  }
  return fallbackSecret;
};
const TOKEN_TTL = process.env.JWT_EXPIRES_IN || '7d';

export function signToken(user) {
  const payload = {
    sub: String(user.id || user._id || user.email),
    email: user.email || '',
    name: user.name || user.userName || '',
    role: user.role || '',
    department: user.department || '',
    studentId: user.studentId || undefined,
    trainerId: user.trainerId || undefined
  };
  return jwt.sign(payload, secret(), { expiresIn: TOKEN_TTL });
}

// Short-lived token for links the browser opens itself (<a href>, <audio src>,
// <iframe src>). It only works as ?token= on GET file routes and expires in
// 15 minutes, so a leaked URL (history, logs, shared link) is useless quickly.
// The long-lived session token is never put in a URL.
const FILE_TOKEN_TTL = '15m';
export function signFileToken(user) {
  const { iat, exp, typ, ...claims } = user || {};
  return jwt.sign({ ...claims, typ: 'file' }, secret(), { expiresIn: FILE_TOKEN_TTL });
}
const FILE_ROUTES = [/^\/training\/materials\/[^/]+\/file$/, /^\/student-portal\/submissions\/[^/]+\/file$/];

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------
const isHashed = (v) => /^\$2[aby]\$\d{2}\$/.test(String(v || ''));

export const hashPassword = (plain) => bcrypt.hash(String(plain), 10);

// Returns { ok, needsUpgrade } — legacy plain-text passwords still work once
// and are upgraded to a hash by the caller.
export async function checkPassword(entered, stored) {
  if (!entered || !stored) return { ok: false };
  if (isHashed(stored)) return { ok: await bcrypt.compare(String(entered), stored), needsUpgrade: false };
  const a = Buffer.from(String(entered));
  const b = Buffer.from(String(stored));
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { ok, needsUpgrade: ok };
}

export const hashIfPlain = async (v) => (!v || isHashed(v) ? v : hashPassword(v));

// ---------------------------------------------------------------------------
// Request guard
// ---------------------------------------------------------------------------
const PUBLIC_ROUTES = [
  ['GET', /^\/health$/],
  ['POST', /^\/auth\/login$/],
  ['GET', /^\/auth\/departments$/],
  ['GET', /^\/departments$/],
  ['GET', /^\/auth\/dev-accounts$/],
  ['POST', /^\/auth\/dev-login$/],
  ['POST', /^\/calls\/exotel\/webhook$/]
];

// Staff routes limited to Admin / Leadership
const ADMIN_ROUTES = [
  ['*', /^\/admin\/users(\/|$)/],
  ['PUT', /^\/admin\/slabs$/]
];

// Department guards for staff writes. Admin & Leadership may do everything;
// any other department must be listed. Reads stay open to all staff.
const FULL_ACCESS = ['admin', 'leadership'];
const STAFF_RULES = [
  // Leads & admissions (HR); Marketing can add leads from campaigns
  ['POST', /^\/leads$/, ['hr', 'marketing']],
  ['PUT', /^\/leads\/[^/]+$/, ['hr']],
  ['DELETE', /^\/leads\/[^/]+$/, ['hr']],
  ['POST', /^\/leads\/[^/]+\/whatsapp$/, ['hr']],
  ['POST', /^\/students$/, ['hr']],
  ['DELETE', /^\/students\/[^/]+$/, []],
  ['POST', /^\/students\/[^/]+\/reset-login$/, ['hr']],
  ['PUT', /^\/students\/[^/]+$/, ['hr', 'cccp']],
  ['POST', /^\/students\/[^/]+\/handover$/, ['hr']],
  ['POST', /^\/fees\/rates$/, ['hr']],
  ['POST', /^\/closures$/, ['hr']],
  ['*', /^\/calls\/(dial|log|[^/]+\/hangup)$/, ['hr']],
  ['POST', /^\/recordings$/, ['hr']],
  ['DELETE', /^\/recordings\/[^/]+$/, ['hr']],
  ['POST', /^\/hr\/targets$/, ['hr']],
  ['PUT', /^\/hr\/targets\/[^/]+$/, ['hr']],
  ['DELETE', /^\/hr\/targets\/[^/]+$/, ['hr']],
  // Training
  ['PUT', /^\/students\/[^/]+\/(syllabus-complete|recommendation)$/, ['training']],
  ['POST', /^\/students\/[^/]+\/remedial$/, ['training']],
  ['PUT', /^\/trainer\/doubts\/[^/]+\/reply$/, ['training']],
  ['POST', /^\/trainer\/assessments$/, ['training']],
  ['PUT', /^\/trainer\/assessments\/[^/]+\/(scores|rationale)$/, ['training']],
  ['POST', /^\/trainer\/attendance$/, ['training']],
  ['POST', /^\/training\/materials(\/[^/]+\/assign)?$/, ['training']],
  ['PUT', /^\/training\/materials\/[^/]+\/pin$/, ['training']],
  ['DELETE', /^\/training\/materials\/[^/]+$/, ['training']],
  ['PUT', /^\/student-portal\/submissions\/[^/]+\/review$/, ['training']],
  ['*', /^\/trainer\/live-class\/(start|end|[^/]+\/(notes|attendance-saved))$/, ['training']],
  ['PUT', /^\/trainer\/settings\/[^/]+$/, []],
  ['*', /^\/trainer\/settings\/[^/]+\/leaves/, ['training']], // own-record check is in the route
  // Student requests: trainer answers academic ones, HR the admin ones
  ['PUT', /^\/student-portal\/requests\/[^/]+$/, ['training', 'hr']],
  // Placement & marketing
  ['*', /^\/cccp\//, ['cccp']],
  ['*', /^\/marketing\/(campaigns|creatives)/, ['marketing']],
  // Leadership desk
  ['PATCH', /^\/leadership\/approvals\/[^/]+\/decision$/, ['marketing']],
  ['PATCH', /^\/leadership\/escalations\/[^/]+\/status$/, ['hr']],
  ['PUT', /^\/admin\/audit-logs/, []]
];

// Reads that stay with the owning department
const READ_RULES = [
  [/^\/leads(\/(?!pipeline$)|$)/, ['hr', 'marketing', 'cccp']], // pipeline counts stay open
  [/^\/(recordings|closures|calls)(\/|$)/, ['hr']]
];

function staffAllowed(req, user) {
  const dept = String(user.department || '').toLowerCase();
  if (req.method === 'GET') {
    if (FULL_ACCESS.includes(dept)) return true;
    const rule = READ_RULES.find(([rx]) => rx.test(req.path));
    return rule ? rule[1].includes(dept) : true;
  }
  if (FULL_ACCESS.includes(dept)) return true;
  for (const [m, rx, depts] of STAFF_RULES) {
    if ((m === '*' || m === req.method) && rx.test(req.path)) return depts.includes(dept);
  }
  return true;
}

const matches = (list, method, path) => list.some(([m, rx]) => (m === '*' || m === method) && rx.test(path));

// Everything a student may call. Each rule can pin the request to the
// student's own record so one student can never read or write another's data.
const STUDENT_RULES = [
  ['GET', /^\/student-portal\/me$/, (req, u) => { req.query.studentId = u.studentId || ''; req.query.email = u.email || ''; }],
  ['PUT', /^\/student-portal\/([^/]+)\/profile$/, 'own'],
  ['POST', /^\/student-portal\/([^/]+)\/(referrals|submissions|requests|feedback)$/, 'own'],
  ['POST', /^\/auth\/file-token$/],
  // Own notification bell (the route pins the query to the student's own id / batch)
  ['GET', /^\/notifications$/],
  ['PUT', /^\/notifications\/read-all$/],
  ['PUT', /^\/notifications\/[^/]+\/read$/],
  ['GET', /^\/student-portal\/submissions\/[^/]+\/file$/],
  ['GET', /^\/training\/materials\/[^/]+\/file$/],
  ['POST', /^\/trainer\/doubts$/, (req, u) => { req.body = { ...(req.body || {}), studentId: u.studentId }; }],
  ['POST', /^\/leadership\/escalations$/, (req, u) => { req.body = { ...(req.body || {}), raisedBy: `${u.name} (${u.studentId})`, studentId: u.studentId || '' }; }],
  ['POST', /^\/demos$/],
  ['GET', /^\/demos\/eligible-trainers$/],
  ['GET', /^\/demos\/mine$/, (req, u) => { req.query.email = u.email; }],
  ['GET', /^\/demos\/[^/]+\/zoom-join$/, (req, u) => { req.query.as = 'student'; req.query.email = u.email; }],
  ['POST', /^\/zoom-signature$/, (req) => { req.body = { ...(req.body || {}), role: 0 }; }],
  ['POST', /^\/student-portal\/live-class\/join$/]
];

function allowStudent(req, user) {
  for (const [m, rx, fix] of STUDENT_RULES) {
    if (m !== req.method) continue;
    const hit = req.path.match(rx);
    if (!hit) continue;
    if (fix === 'own') {
      const id = decodeURIComponent(hit[1] || '');
      return Boolean(user.studentId) && id === user.studentId;
    }
    if (typeof fix === 'function') fix(req, user);
    return true;
  }
  return false;
}

export function requireAuth(req, res, next) {
  if (req.method === 'OPTIONS' || matches(PUBLIC_ROUTES, req.method, req.path)) return next();

  const header = req.headers.authorization || '';
  const fromHeader = header.startsWith('Bearer ');
  // ?token= is only for short-lived file tokens on file downloads (see signFileToken)
  const token = fromHeader ? header.slice(7) : (req.query.token || '');
  if (!token) return res.status(401).json({ error: 'Please log in to continue.', code: 'AUTH_REQUIRED' });

  let user;
  try {
    user = jwt.verify(String(token), secret());
  } catch (_) {
    return res.status(401).json({ error: fromHeader ? 'Your session has expired. Please log in again.' : 'This link has expired. Open it again from the dashboard.', code: fromHeader ? 'AUTH_EXPIRED' : 'LINK_EXPIRED' });
  }
  if (fromHeader && user.typ === 'file') return res.status(401).json({ error: 'Invalid session token.', code: 'AUTH_REQUIRED' });
  if (!fromHeader && (user.typ !== 'file' || req.method !== 'GET' || !FILE_ROUTES.some((rx) => rx.test(req.path)))) {
    return res.status(401).json({ error: 'This link is not valid. Open it again from the dashboard.', code: 'LINK_INVALID' });
  }
  if (req.query.token) delete req.query.token;
  req.user = user;

  if (user.department === 'student') {
    if (!allowStudent(req, user)) return res.status(403).json({ error: 'Not allowed for student accounts.' });
    return next();
  }
  if (matches(ADMIN_ROUTES, req.method, req.path) && !['admin', 'leadership'].includes(user.department)) {
    return res.status(403).json({ error: 'Only Admin / Leadership can do this.' });
  }
  if (!staffAllowed(req, user)) {
    return res.status(403).json({ error: `Your department (${user.department || 'unknown'}) can't do this.` });
  }
  return next();
}

// Staff-only guard for static files (call recordings)
export function requireStaffToken(req, res, next) {
  const header = req.headers.authorization || '';
  const fromHeader = header.startsWith('Bearer ');
  const token = fromHeader ? header.slice(7) : (req.query.token || '');
  try {
    const user = jwt.verify(String(token), secret());
    // Links (<audio src>) must carry a short-lived file token, never the session token
    if (fromHeader ? user.typ === 'file' : user.typ !== 'file') return res.status(401).json({ error: 'This link has expired. Open it again from the dashboard.' });
    if (user.department === 'student') return res.status(403).end();
    return next();
  } catch (_) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }
}
