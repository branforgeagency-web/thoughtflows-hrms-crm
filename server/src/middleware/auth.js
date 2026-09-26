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

const matches = (list, method, path) => list.some(([m, rx]) => (m === '*' || m === method) && rx.test(path));

// Everything a student may call. Each rule can pin the request to the
// student's own record so one student can never read or write another's data.
const STUDENT_RULES = [
  ['GET', /^\/student-portal\/me$/, (req, u) => { req.query.studentId = u.studentId || ''; req.query.email = u.email || ''; }],
  ['PUT', /^\/student-portal\/([^/]+)\/profile$/, 'own'],
  ['POST', /^\/student-portal\/([^/]+)\/(referrals|submissions|requests)$/, 'own'],
  ['GET', /^\/student-portal\/submissions\/[^/]+\/file$/],
  ['GET', /^\/training\/materials\/[^/]+\/file$/],
  ['POST', /^\/trainer\/doubts$/, (req, u) => { req.body = { ...(req.body || {}), studentId: u.studentId }; }],
  ['POST', /^\/leadership\/escalations$/, (req, u) => { req.body = { ...(req.body || {}), raisedBy: `${u.name} (${u.studentId})` }; }],
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
  // ?token= lets <a href> downloads (materials, submissions) carry the session
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.query.token || '');
  if (!token) return res.status(401).json({ error: 'Please log in to continue.', code: 'AUTH_REQUIRED' });

  let user;
  try {
    user = jwt.verify(String(token), secret());
  } catch (_) {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.', code: 'AUTH_EXPIRED' });
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
  return next();
}

// Staff-only guard for static files (call recordings)
export function requireStaffToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.query.token || '');
  try {
    const user = jwt.verify(String(token), secret());
    if (user.department === 'student') return res.status(403).end();
    return next();
  } catch (_) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }
}
