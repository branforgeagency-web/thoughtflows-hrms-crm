import axios from 'axios';
import { isAmplifyStorageConfigured, uploadRecordingFile } from './amplifyStorage';

const RAW_API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = RAW_API_URL 
  ? (RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL}/api`)
  : '/api';

if (RAW_API_URL) {
  axios.defaults.baseURL = RAW_API_URL;
}

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ---------------------------------------------------------------------------
// Login session: every API call carries the signed token from /auth/login
// ---------------------------------------------------------------------------
export const getAuthToken = () => {
  try {
    const raw = sessionStorage.getItem('thoughtflows_user') || localStorage.getItem('thoughtflows_user');
    const u = JSON.parse(raw || 'null');
    return u?.token || '';
  } catch (_) {
    return '';
  }
};

export const authHeaders = () => {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

// For links opened directly by the browser (downloads, <audio>, <iframe>):
// a short-lived *file* token from /auth/file-token — never the session token.
// It is fetched in the background with the first API call and refreshed
// every 10 minutes (it lives 15).
let fileToken = { value: '', at: 0, session: '' };
let fileTokenPromise = null;
let fileTokenFailUntil = 0;
const FILE_TOKEN_REFRESH_MS = 10 * 60 * 1000;
export const ensureFileToken = () => {
  const session = getAuthToken();
  if (!session) return Promise.resolve('');
  const fresh = fileToken.value && fileToken.session === session && Date.now() - fileToken.at < FILE_TOKEN_REFRESH_MS;
  if (fresh) return Promise.resolve(fileToken.value);
  if (Date.now() < fileTokenFailUntil) return Promise.resolve(fileToken.value || '');
  if (!fileTokenPromise) {
    fileTokenPromise = axios.post(`${API_BASE}/auth/file-token`, {}, { headers: { Authorization: `Bearer ${session}` } })
      .then((r) => {
        fileToken = { value: r.data?.token || '', at: Date.now(), session };
        fileTokenFailUntil = 0;
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('thoughtflows_file_token'));
        return fileToken.value;
      })
      .catch((err) => {
        const cooldown = err?.response?.status === 429 ? 60000 : 30000;
        fileTokenFailUntil = Date.now() + cooldown;
        return '';
      })
      .finally(() => { fileTokenPromise = null; });
  }
  return fileTokenPromise;
};
export const withAuthToken = (url) => {
  const t = fileToken.session === getAuthToken() ? fileToken.value : '';
  if (!t) ensureFileToken();
  return t ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(t)}` : url;
};
// Open a protected file in a new tab, making sure the file token is fresh first
export const openProtectedFile = async (url) => {
  const win = typeof window !== 'undefined' ? window.open('', '_blank') : null;
  await ensureFileToken();
  const target = withAuthToken(url);
  if (win) win.location.href = target; else if (typeof window !== 'undefined') window.location.href = target;
};

// Call recordings saved on our server need the session token to play
export const recordingUrl = (url) => (url && String(url).startsWith('/recordings') ? withAuthToken(url) : url);

const attachToken = (config) => {
  const t = getAuthToken();
  if (t && !config.headers?.Authorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  // Warm the short-lived file-link token once per session instead of spamming on every request
  if (
    t &&
    !String(config.url || '').includes('/auth/file-token') &&
    (fileToken.session !== t || !fileToken.value) &&
    Date.now() > fileTokenFailUntil
  ) {
    setTimeout(() => ensureFileToken(), 150);
  }
  return config;
};

// ---------------------------------------------------------------------------
// GET deduplication, short-TTL cache, concurrency pacer & 429 backoff
// Prevents dashboard mounts from firing 15+ simultaneous requests that trip
// upstream edge rate limits (HTTP 429 Too Many Requests).
// ---------------------------------------------------------------------------
const MAX_CONCURRENT_GETS = 3;
const MIN_DISPATCH_GAP_MS = 45;
const inFlightGets = new Map();
const getResponseCache = new Map();
const getQueue = [];
let activeGets = 0;
let lastDispatchAt = 0;
let rateLimitedUntil = 0;
let pumpTimer = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const clearApiGetCache = () => {
  getResponseCache.clear();
};

const getCacheTtlMs = (url, config) => {
  if (config?.responseType || config?.skipCache) return 0;
  const u = String(url || '').toLowerCase();
  if (u.startsWith('/auth/')) return 0;
  if (['/branches', '/departments', '/settings', '/trainer/heads'].some((p) => u.startsWith(p))) return 30000;
  if (['/stats', '/hr/hub-summary', '/hr/targets', '/leadership/team', '/hr/staff-attendance', '/notifications', '/student-requests', '/student-tickets'].some((p) => u.startsWith(p))) {
    return 12000;
  }
  return 2500;
};

const buildGetCacheKey = (url, config) => {
  const params = config?.params;
  let paramStr = '';
  if (params && typeof params === 'object') {
    const sorted = Object.keys(params)
      .filter((k) => params[k] !== undefined)
      .sort()
      .reduce((acc, k) => { acc[k] = params[k]; return acc; }, {});
    paramStr = JSON.stringify(sorted);
  }
  return `${url}|${paramStr}|${getAuthToken().slice(-12)}`;
};

const parseRetryAfterMs = (err, attempt) => {
  const ra = err?.response?.headers?.['retry-after'];
  if (ra !== undefined && ra !== null && String(ra).trim() !== '') {
    const secs = Number(ra);
    if (!Number.isNaN(secs) && secs >= 0) {
      return Math.min(15000, Math.max(1000, Math.round(secs * 1000)));
    }
  }
  return Math.min(12000, 2000 * Math.pow(2, attempt) + Math.floor(Math.random() * 400));
};

const pumpGetQueue = () => {
  if (pumpTimer) {
    clearTimeout(pumpTimer);
    pumpTimer = null;
  }
  while (activeGets < MAX_CONCURRENT_GETS && getQueue.length > 0) {
    const now = Date.now();
    const waitMs = Math.max(rateLimitedUntil - now, lastDispatchAt + MIN_DISPATCH_GAP_MS - now);
    if (waitMs > 0) {
      pumpTimer = setTimeout(() => {
        pumpTimer = null;
        pumpGetQueue();
      }, waitMs);
      return;
    }
    const task = getQueue.shift();
    if (!task) return;
    activeGets += 1;
    lastDispatchAt = Date.now();
    task();
  }
};

const enqueueGet = (fn) => new Promise((resolve, reject) => {
  getQueue.push(() => {
    Promise.resolve()
      .then(fn)
      .then(resolve, reject)
      .finally(() => {
        activeGets = Math.max(0, activeGets - 1);
        pumpGetQueue();
      });
  });
  pumpGetQueue();
});

const rawApiGet = api.get.bind(api);
api.get = (url, config = {}) => {
  const ttl = getCacheTtlMs(url, config);
  const key = buildGetCacheKey(url, config);

  if (ttl > 0 && getResponseCache.has(key)) {
    const cached = getResponseCache.get(key);
    if (Date.now() - cached.at < ttl) {
      return Promise.resolve(cached.res);
    }
    getResponseCache.delete(key);
  }

  if (inFlightGets.has(key)) {
    return inFlightGets.get(key);
  }

  const reqPromise = (async () => {
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        const res = await enqueueGet(() => rawApiGet(url, config));
        if (ttl > 0) {
          if (getResponseCache.size >= 200) getResponseCache.clear();
          getResponseCache.set(key, { at: Date.now(), res });
        }
        return res;
      } catch (err) {
        if (err?.response?.status === 429 && attempt < 2) {
          const waitMs = parseRetryAfterMs(err, attempt);
          rateLimitedUntil = Math.max(rateLimitedUntil, Date.now() + waitMs);
          await sleep(waitMs);
          continue;
        }
        throw err;
      }
    }
  })().finally(() => {
    inFlightGets.delete(key);
  });

  inFlightGets.set(key, reqPromise);
  return reqPromise;
};

let sessionExpiredHandled = false;
const handleAuthError = (error) => {
  const code = error?.response?.data?.code;
  // Only log out a user who was logged in (a visitor with no token just gets the error)
  if (error?.response?.status === 401 && (code === 'AUTH_EXPIRED' || code === 'AUTH_REQUIRED') && getAuthToken() && !sessionExpiredHandled) {
    sessionExpiredHandled = true;
    try {
      sessionStorage.removeItem('thoughtflows_user');
      sessionStorage.removeItem('thoughtflows_dashboard');
      sessionStorage.removeItem('thoughtflows_hr_user');
      sessionStorage.removeItem('thoughtflows_hr_role');
      sessionStorage.removeItem('thoughtflows_hr_active_tab');
      localStorage.removeItem('thoughtflows_user');
      localStorage.removeItem('thoughtflows_dashboard');
    } catch (_) {}
    const isRegisterPage = typeof window !== 'undefined' && (
      window.location.pathname.includes('/register') ||
      window.location.search.includes('register')
    );
    if (!isRegisterPage && typeof window !== 'undefined') {
      window.location.reload();
    }
  }
  return Promise.reject(error);
};

// ---------------------------------------------------------------------------
// Global API Loading Tracker (tracks all `api` and `axios` requests)
// ---------------------------------------------------------------------------
let activeLoaderRequests = 0;
const loaderListeners = new Set();

const notifyLoaderListeners = () => {
  loaderListeners.forEach((fn) => {
    try {
      fn(activeLoaderRequests);
    } catch (_) {}
  });
};

export const subscribeApiLoading = (listener) => {
  if (typeof listener !== 'function') return () => {};
  loaderListeners.add(listener);
  listener(activeLoaderRequests);
  return () => loaderListeners.delete(listener);
};

const isSilentLoaderUrl = (url = '') => {
  const u = String(url).toLowerCase();
  return u.includes('/health') || u.includes('/auth/file-token');
};

const trackRequestStart = (config) => {
  if (config && !config.silentLoader && !isSilentLoaderUrl(config.url) && !config._trackedLoader) {
    config._trackedLoader = true;
    activeLoaderRequests += 1;
    notifyLoaderListeners();
  }
  return config;
};

const trackRequestEnd = (config) => {
  if (config?._trackedLoader) {
    config._trackedLoader = false;
    activeLoaderRequests = Math.max(0, activeLoaderRequests - 1);
    notifyLoaderListeners();
  }
};

api.interceptors.request.use((config) => trackRequestStart(attachToken(config)));
api.interceptors.response.use(
  (r) => {
    trackRequestEnd(r?.config);
    const method = String(r?.config?.method || 'get').toLowerCase();
    if (!['get', 'head', 'options'].includes(method)) clearApiGetCache();
    return r;
  },
  (err) => {
    trackRequestEnd(err?.config);
    return handleAuthError(err);
  }
);
axios.interceptors.request.use((config) => trackRequestStart(attachToken(config)));
axios.interceptors.response.use(
  (r) => {
    trackRequestEnd(r?.config);
    return r;
  },
  (err) => {
    trackRequestEnd(err?.config);
    return handleAuthError(err);
  }
);

// Real-Time Cross-Dashboard Sync Event Bus (in-tab + multi-tab)
export const notifyDataUpdate = (entity) => {
  clearApiGetCache();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('thoughtflows_data_updated', { detail: { entity } }));
    try {
      localStorage.setItem('thoughtflows_sync_event', JSON.stringify({ entity, time: Date.now() }));
    } catch (_) {}
  }
};

export const onDataUpdate = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => {
    if (callback) callback(e.detail?.entity);
  };
  const storageHandler = (e) => {
    if (e.key === 'thoughtflows_sync_event' && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        if (callback) callback(data?.entity);
      } catch (_) {}
    }
  };
  window.addEventListener('thoughtflows_data_updated', handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener('thoughtflows_data_updated', handler);
    window.removeEventListener('storage', storageHandler);
  };
};

// Students API
export const getStudents = async (params) => {
  const res = await api.get('/students', { params });
  return res.data;
};

export const createStudent = async (studentData) => {
  const res = await api.post('/students', studentData);
  notifyDataUpdate('students');
  return res.data;
};

// Check for duplicate student/lead registration by phone or email
export const checkDuplicateStudent = async (params) => {
  const res = await api.get('/students/check-duplicate', { params });
  return res.data;
};

// Public next student ID preview for registration form
export const getNextStudentId = async (params) => {
  const res = await api.get('/students/next-id', { params });
  return res.data;
};

// Training hierarchy and credentials (heads, managers, team leads, faculty)
export const getTrainerCredentials = async () => {
  const res = await api.get('/auth/trainer-credentials');
  return res.data;
};

// Create / reset a student's portal login — returns { email, password } once
export const resetStudentLogin = async (id) => {
  const res = await api.post(`/students/${encodeURIComponent(id)}/reset-login`);
  return res.data;
};

export const updateStudent = async (id, studentData) => {
  const res = await api.put(`/students/${id}`, studentData);
  notifyDataUpdate('students');
  notifyDataUpdate('leads');
  notifyDataUpdate('placements');
  notifyDataUpdate('student_requests');
  notifyDataUpdate('student_submissions');
  notifyDataUpdate('users');
  return res.data;
};

export const deleteStudent = async (id) => {
  const res = await api.delete(`/students/${id}`);
  notifyDataUpdate('students');
  notifyDataUpdate('leads');
  notifyDataUpdate('placements');
  notifyDataUpdate('student_requests');
  notifyDataUpdate('student_submissions');
  notifyDataUpdate('users');
  return res.data;
};

// Leads & Pipeline API
export const getLeads = async (params) => {
  const res = await api.get('/leads', { params });
  return res.data;
};

// Server attaches lmsWarning when a lead goes to a counsellor who hasn't finished
// LMS certification; dashboards show it as a toast.
const surfaceLmsWarning = (data) => {
  if (data?.lmsWarning && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('thoughtflows_lms_warning', { detail: { message: data.lmsWarning } }));
  }
};

export const createLead = async (leadData) => {
  const res = await api.post('/leads', leadData);
  surfaceLmsWarning(res.data);
  notifyDataUpdate('leads');
  return res.data;
};

export const createLeadsBulk = async (leads, defaultOptions = {}) => {
  const res = await api.post('/leads/bulk', { leads, ...defaultOptions });
  notifyDataUpdate('leads');
  return res.data;
};

const SYNTH_LEAD_ERROR = 'This admitted student has no lead record — open them from Admitted Students to make changes.';
const isSyntheticLeadId = (id) => String(id || '').startsWith('synth-');
export const updateLead = async (id, leadData) => {
  if (isSyntheticLeadId(id)) throw new Error(SYNTH_LEAD_ERROR);
  const res = await api.put(`/leads/${id}`, leadData);
  surfaceLmsWarning(res.data);
  notifyDataUpdate('leads');
  return res.data;
};

export const deleteLead = async (id) => {
  if (isSyntheticLeadId(id)) throw new Error(SYNTH_LEAD_ERROR);
  const res = await api.delete(`/leads/${id}`);
  notifyDataUpdate('leads');
  notifyDataUpdate('students');
  return res.data;
};

export const getLeadWhatsAppMessages = async (id) => {
  const res = await api.get(`/leads/${id}/whatsapp`);
  return res.data;
};

export const sendLeadWhatsAppMessage = async (id, data) => {
  const res = await api.post(`/leads/${id}/whatsapp`, data);
  return res.data;
};

// Demos API
export const getDemos = async (params) => {
  const res = await api.get('/demos', { params });
  return res.data;
};
// Trainer Head & Trainer Manager — assign an unassigned demo to a faculty member
export const assignDemo = async (id, { toTrainerId, reason }) => {
  const res = await api.post(`/demos/${id}/assign`, { toTrainerId, reason });
  notifyDataUpdate('demos');
  return res.data;
};

// Trainer Head & Trainer Manager — move one demo (or every upcoming demo of a trainer,
// optionally scoped to one date) to a different trainer, e.g. on leave.
export const reassignDemo = async (id, { toTrainerId, reason }) => {
  const res = await api.post(`/demos/${id}/reassign`, { toTrainerId, reason });
  notifyDataUpdate('demos');
  return res.data;
};
export const bulkReassignDemos = async ({ fromTrainerId, toTrainerId, date, reason }) => {
  const res = await api.post('/demos/bulk-reassign', { fromTrainerId, toTrainerId, date, reason });
  notifyDataUpdate('demos');
  return res.data;
};
// Move a (typically missed) demo to a new date/time, optionally to a different
// trainer in the same step. Head of Trainer only.
export const rescheduleDemo = async (id, { preferredDate, timeSlot, toTrainerId, reason }) => {
  const res = await api.post(`/demos/${id}/reschedule`, { preferredDate, timeSlot, toTrainerId, reason });
  notifyDataUpdate('demos');
  return res.data;
};

// Live preview of which trainers will be notified for a given
// language + location + date + time (Demo Booking Notification Requirement)
export const getEligibleTrainers = async ({ language, location, preferredDate, timeSlot, course }) => {
  const res = await api.get('/demos/eligible-trainers', {
    params: { language, location, preferredDate, timeSlot, course }
  });
  return res.data;
};

// Real click-to-call bridge (Knowlarity or Edesy — set by TELEPHONY_PROVIDER on the server) — dials
// the HR's phone first, then the lead, and bridges them. No simulated call state anywhere in this file.
export const getCallConfigStatus = async () => {
  const res = await api.get('/calls/config-status');
  return res.data;
};

export const dialCall = async ({ leadPhone, agentPhone, leadId, leadName }) => {
  const res = await api.post('/calls/dial', { leadPhone, agentPhone, leadId, leadName });
  return res.data;
};

export const getCallStatus = async (callSid) => {
  const res = await api.get(`/calls/${callSid}/status`);
  return res.data;
};

export const hangupCall = async (callSid) => {
  const res = await api.post(`/calls/${callSid}/hangup`);
  return res.data;
};

export const syncEdesyRecordings = async () => {
  const res = await api.post('/calls/edesy/sync');
  return res.data;
};

// Call Recordings API
export const getRecordings = async (params) => {
  const res = await api.get('/recordings', { params });
  return res.data;
};

// Recordings saved on the server's local disk don't survive a redeploy/restart
// (Render's filesystem is ephemeral), so whenever Amplify S3 Storage is configured
// we upload the audio straight to S3 from the browser and send only the resulting
// storage key/URL — never the raw base64 — to the server. If Amplify isn't
// configured (or the upload fails), we fall back to the original base64-to-disk path.
const offloadAudioToS3 = async (payload, prefix) => {
  if (!payload.audioBase64 || !isAmplifyStorageConfigured()) return payload;
  try {
    const file = base64ToAudioFile(payload.audioBase64, payload.fileName);
    const uploaded = await uploadRecordingFile(file, prefix || 'general');
    const { audioBase64, ...rest } = payload;
    return {
      ...rest,
      fileName: payload.fileName || file.name,
      storageKey: uploaded.storageKey,
      storageUrl: uploaded.storageUrl,
      storageProvider: 'amplify'
    };
  } catch (err) {
    console.warn('S3 recording upload failed, falling back to server storage:', err?.message || err);
    return payload;
  }
};

const base64ToAudioFile = (dataUrl, fileName) => {
  const [header, data] = String(dataUrl).split(',');
  const mime = (String(header).match(/data:([^;]+)/) || [])[1] || 'audio/webm';
  const ext = (fileName && fileName.split('.').pop()) || mime.split('/')[1] || 'webm';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], fileName || `call_${Date.now()}.${ext}`, { type: mime });
};

export const saveRecording = async (recordingData) => {
  const payload = await offloadAudioToS3(recordingData, recordingData.leadPhone || recordingData.studentId);
  const res = await api.post('/recordings', payload);
  notifyDataUpdate('recordings');
  return res.data;
};

// Phone-sync: upload one call recording from the counsellor's phone; the server
// matches it to a lead by the number in the file name
export const syncPhoneRecording = async (data) => {
  const payload = await offloadAudioToS3(data, 'phone-sync');
  const res = await api.post('/recordings/phone-sync', payload);
  notifyDataUpdate('recordings');
  return res.data;
};

export const deleteRecording = async (id) => {
  const res = await api.delete(`/recordings/${id}`);
  notifyDataUpdate('recordings');
  return res.data;
};

// Daily End-of-Day Closures API
export const getTodayClosure = async (counselorName, date) => {
  const params = { counselor: counselorName };
  if (date) params.date = date;
  const res = await api.get('/closures/today', { params });
  return res.data;
};

export const saveDailyClosure = async (closureData) => {
  const res = await api.post('/closures', closureData);
  notifyDataUpdate('closures');
  return res.data;
};

export const getDailyClosures = async (params) => {
  const res = await api.get('/closures', { params });
  return res.data;
};

// HR Targets API
export const getHrTargets = async (params) => {
  const res = await api.get('/hr/targets', { params });
  return res.data;
};

export const createHrTarget = async (targetData) => {
  const res = await api.post('/hr/targets', targetData);
  notifyDataUpdate('targets');
  return res.data;
};

export const updateHrTarget = async (id, targetData) => {
  const res = await api.put(`/hr/targets/${id}`, targetData);
  notifyDataUpdate('targets');
  return res.data;
};

export const deleteHrTarget = async (id) => {
  const res = await api.delete(`/hr/targets/${id}`);
  notifyDataUpdate('targets');
  return res.data;
};

export const createDemo = async (demoData) => {
  const res = await api.post('/demos', demoData);
  notifyDataUpdate('demos');
  return res.data;
};

export const updateDemo = async (id, demoData) => {
  const res = await api.put(`/demos/${id}`, demoData);
  notifyDataUpdate('demos');
  return res.data;
};

export const createDemoMeeting = async (id) => {
  const res = await api.post(`/demos/${id}/zoom-meeting`);
  notifyDataUpdate('demos');
  return res.data;
};

// A trainer's own Google Meet link for a group demo session — shared with
// every student booked at that same trainer + date + time slot.
export const setDemoMeetingLink = async (id, link) => {
  const res = await api.put(`/demos/${id}/meeting-link`, { link });
  notifyDataUpdate('demos');
  return res.data;
};

export const endDemoMeeting = async (id) => {
  const res = await api.post(`/demos/${id}/zoom-end`);
  return res.data;
};

export const sendDemoLinkEmail = async (id) => {
  const res = await api.post(`/demos/${id}/send-link`);
  return res.data;
};

export const getMyDemos = async (email) => {
  const res = await api.get('/demos/mine', { params: { email } });
  return res.data;
};

export const acknowledgeDemo = async (id, data) => {
  const res = await api.put(`/demos/${id}/acknowledge`, data || {});
  notifyDataUpdate('demos');
  return res.data;
};

export const updateDemosBulkOutcome = async (ids, status) => {
  const res = await api.post('/demos/bulk-outcome', { ids, status, updatedBy: 'trainer' });
  notifyDataUpdate('demos');
  return res.data;
};

export const deleteDemo = async (id) => {
  const res = await api.delete(`/demos/${id}`);
  notifyDataUpdate('demos');
  return res.data;
};

// Trainer Notification Settings & Shifts API
export const getTrainerSettings = async () => {
  const res = await api.get('/trainer/settings');
  return res.data;
};

export const updateTrainerSettings = async (id, data) => {
  const res = await api.put(`/trainer/settings/${id}`, data);
  notifyDataUpdate('trainer_settings');
  return res.data;
};

// Head of Trainer: reassign which Manager a Team Lead reports to (zone/state included)
export const updateTrainerRoleAccount = async (id, data) => {
  const res = await api.put(`/trainer/role-accounts/${id}`, data);
  notifyDataUpdate('trainer_settings');
  return res.data;
};

// Fees & Course Rates API
export const getCourseFeeRates = async () => {
  const res = await api.get('/fees/rates');
  return res.data;
};

export const saveCourseFeeRate = async (rateData) => {
  const res = await api.post('/fees/rates', rateData);
  notifyDataUpdate('fee_rates');
  return res.data;
};

// Portal Stats & Health
export const getPortalStats = async () => {
  const res = await api.get('/stats');
  return res.data;
};

// Trainer & Faculty API
export const getTrainerProfile = async ({ trainerId, email, name } = {}) => {
  const res = await api.get('/trainer/me', { params: { trainerId, email, name } });
  return res.data;
};

export const getTrainerDoubts = async (params) => {
  const res = await api.get('/trainer/doubts', { params });
  return res.data;
};

export const createTrainerDoubt = async (doubtData) => {
  const res = await api.post('/trainer/doubts', doubtData);
  notifyDataUpdate('doubts');
  return res.data;
};

export const replyTrainerDoubt = async (id, reply) => {
  const res = await api.put(`/trainer/doubts/${id}/reply`, { reply });
  notifyDataUpdate('doubts');
  return res.data;
};

export const getTrainerAssessments = async (params) => {
  const res = await api.get('/trainer/assessments', { params });
  return res.data;
};

export const createTrainerAssessment = async (assessmentData) => {
  const res = await api.post('/trainer/assessments', assessmentData);
  notifyDataUpdate('assessments');
  return res.data;
};

export const updateAssessmentScores = async (id, scores) => {
  const res = await api.put(`/trainer/assessments/${id}/scores`, { scores });
  notifyDataUpdate('assessments');
  return res.data;
};

export const updateAssessmentRationale = async (id, rationale) => {
  const res = await api.put(`/trainer/assessments/${id}/rationale`, { rationale });
  notifyDataUpdate('assessments');
  return res.data;
};

export const getTrainerAttendance = async (params) => {
  const res = await api.get('/trainer/attendance', { params });
  return res.data;
};

export const recordTrainerAttendance = async (attendanceData) => {
  const res = await api.post('/trainer/attendance', attendanceData);
  notifyDataUpdate('trainer_attendance');
  notifyDataUpdate('students');
  return res.data;
};

// HR → Training handover & Training → HR progress
// Existing batch names (optionally one trainer's) with student counts
export const getBatches = async (params = {}) => {
  const res = await api.get('/batches', { params });
  return res.data;
};

export const getBatchDetail = async (id) => {
  const res = await api.get(`/batches/${encodeURIComponent(id)}`);
  return res.data;
};

export const createBatch = async (data) => {
  const res = await api.post('/batches', data);
  notifyDataUpdate('batches');
  notifyDataUpdate('students');
  notifyDataUpdate('notifications');
  return res.data;
};

export const updateBatch = async (id, data) => {
  const res = await api.put(`/batches/${encodeURIComponent(id)}`, data);
  notifyDataUpdate('batches');
  notifyDataUpdate('students');
  return res.data;
};

export const assignStudentsToBatch = async (id, data) => {
  const res = await api.post(`/batches/${encodeURIComponent(id)}/assign-students`, data);
  notifyDataUpdate('batches');
  notifyDataUpdate('students');
  notifyDataUpdate('notifications');
  return res.data;
};

export const removeStudentFromBatch = async (batchId, studentId) => {
  const res = await api.delete(`/batches/${encodeURIComponent(batchId)}/students/${encodeURIComponent(studentId)}`);
  notifyDataUpdate('batches');
  notifyDataUpdate('students');
  return res.data;
};

export const autoGroupBatches = async (data) => {
  const res = await api.post('/batches/auto-group', data);
  notifyDataUpdate('batches');
  notifyDataUpdate('students');
  notifyDataUpdate('notifications');
  return res.data;
};

export const updateStudentBatchProgress = async (studentId, data) => {
  const res = await api.put(`/students/${encodeURIComponent(studentId)}/batch-progress`, data);
  notifyDataUpdate('students');
  notifyDataUpdate('syllabus');
  return res.data;
};

// HR records a fee instalment — returns the updated student (receipt added, balance recomputed)
export const recordStudentPayment = async (id, data) => {
  const res = await api.post(`/students/${encodeURIComponent(id)}/payments`, data);
  notifyDataUpdate('students');
  return res.data;
};

export const handoverStudentToHead = async (id, data) => {
  const res = await api.post(`/students/${id}/handover-to-head`, data);
  notifyDataUpdate('students');
  notifyDataUpdate('notifications');
  return res.data;
};

export const allocateTrainerToStudent = async (id, data) => {
  const res = await api.post(`/students/${id}/allocate-trainer`, data);
  notifyDataUpdate('students');
  notifyDataUpdate('notifications');
  return res.data;
};

export const getHeadOfTrainers = async () => {
  const res = await api.get('/trainer/heads');
  return res.data;
};

export const handoverStudentToTrainer = async (id, data) => {
  const res = await api.post(`/students/${id}/handover`, data);
  notifyDataUpdate('students');
  notifyDataUpdate('notifications');
  return res.data;
};

export const markSyllabusComplete = async (id, data) => {
  const res = await api.put(`/students/${id}/syllabus-complete`, data);
  notifyDataUpdate('students');
  notifyDataUpdate('notifications');
  return res.data;
};

export const setTrainerRecommendation = async (id, data) => {
  const res = await api.put(`/students/${id}/recommendation`, data);
  notifyDataUpdate('students');
  notifyDataUpdate('notifications');
  return res.data;
};

export const updateStudentReadiness = async (id, data) => {
  const res = await api.put(`/students/${id}/readiness`, data);
  notifyDataUpdate('students');
  notifyDataUpdate('notifications');
  return res.data;
};

export const updateStudentWeeklyRating = async (id, data) => {
  const res = await api.put(`/students/${id}/weekly-rating`, data);
  notifyDataUpdate('students');
  notifyDataUpdate('notifications');
  return res.data;
};

export const updateTrainerApproval = async (id, data) => {
  const res = await api.put(`/students/${id}/trainer-approval`, data);
  notifyDataUpdate('students');
  notifyDataUpdate('notifications');
  return res.data;
};

export const logRemedialAction = async (id, data) => {
  const res = await api.post(`/students/${id}/remedial`, data);
  notifyDataUpdate('students');
  notifyDataUpdate('notifications');
  return res.data;
};

// Cross-department notifications (HR ⇄ Training)
export const getNotifications = async (params) => {
  const res = await api.get('/notifications', { params });
  return res.data;
};

export const markNotificationRead = async (id) => {
  const res = await api.put(`/notifications/${id}/read`);
  notifyDataUpdate('notifications');
  return res.data;
};

export const markNotificationsRead = async (ids) => {
  const res = await api.put('/notifications/read-all', { ids });
  notifyDataUpdate('notifications');
  return res.data;
};

// Training library & materials
export const getTrainingMaterials = async (params) => {
  const res = await api.get('/training/materials', { params });
  return res.data;
};

export const uploadTrainingMaterial = async (data) => {
  const res = await api.post('/training/materials', data);
  notifyDataUpdate('materials');
  return res.data;
};

export const trainingMaterialFileUrl = (id, download = false) =>
  withAuthToken(`${API_BASE}/training/materials/${id}/file${download ? '?download=1' : ''}`);

export const fetchTrainingMaterialBuffer = async (id) => {
  const res = await api.get(`/training/materials/${id}/file`, {
    params: { stream: 1 },
    responseType: 'arraybuffer'
  });
  return res.data;
};

export const pinTrainingMaterial = async (id, trainerId, pinned) => {
  const res = await api.put(`/training/materials/${id}/pin`, { trainerId, pinned });
  notifyDataUpdate('materials');
  return res.data;
};

export const assignTrainingMaterial = async (id, data) => {
  const res = await api.post(`/training/materials/${id}/assign`, data);
  notifyDataUpdate('materials');
  return res.data;
};

export const deleteTrainingMaterial = async (id) => {
  const res = await api.delete(`/training/materials/${id}`);
  notifyDataUpdate('materials');
  return res.data;
};

export const moveTrainingMaterialFolder = async (id, folder) => {
  const res = await api.put(`/training/materials/${id}/move`, { folder });
  notifyDataUpdate('materials');
  return res.data;
};

export const getTrainingFolders = async () => {
  const res = await api.get('/training/folders');
  return res.data;
};

export const createTrainingFolder = async (data) => {
  const res = await api.post('/training/folders', data);
  notifyDataUpdate('materials');
  return res.data;
};

export const renameTrainingFolder = async (id, name) => {
  const res = await api.put(`/training/folders/${id}`, { name });
  notifyDataUpdate('materials');
  return res.data;
};

export const deleteTrainingFolder = async (id) => {
  const res = await api.delete(`/training/folders/${id}`);
  notifyDataUpdate('materials');
  return res.data;
};

// Leadership Hub API
export const getBranches = async () => {
  const res = await api.get('/branches');
  return res.data;
};

export const getAdminUsers = async () => {
  const res = await api.get('/admin/users');
  return res.data;
};

export const getDepartments = async () => {
  const res = await api.get('/departments');
  return res.data;
};

export const getLeadershipSummary = async () => {
  const res = await api.get('/leadership/summary');
  return res.data;
};

export const getApprovals = async (params) => {
  const res = await api.get('/leadership/approvals', { params });
  return res.data;
};

export const createApproval = async (approvalData) => {
  const res = await api.post('/leadership/approvals', approvalData);
  notifyDataUpdate('approvals');
  return res.data;
};

export const decideApproval = async (id, action) => {
  const res = await api.patch(`/leadership/approvals/${id}/decision`, { action });
  notifyDataUpdate('approvals');
  // A creative's approval also changes the creative on the Marketing desk
  if (res.data?.refType === 'creative') notifyDataUpdate('creatives');
  return res.data;
};

export const getEscalations = async (params) => {
  const res = await api.get('/leadership/escalations', { params });
  return res.data;
};

export const createEscalation = async (escalationData) => {
  const res = await api.post('/leadership/escalations', escalationData);
  notifyDataUpdate('escalations');
  return res.data;
};

export const updateEscalationStatus = async (id, action, response) => {
  const res = await api.patch(`/leadership/escalations/${id}/status`, { action, ...(response ? { response } : {}) });
  notifyDataUpdate('escalations');
  return res.data;
};

export const getHrMyTeam = async () => {
  const res = await api.get('/hr/my-team');
  return res.data;
};

export const getHrHubSummary = async () => {
  const res = await api.get('/hr/hub-summary');
  return res.data;
};

export const getHrStaffAttendance = async (params = {}) => {
  const res = await api.get('/hr/staff-attendance', { params });
  return res.data;
};

export const getTeam = async (params) => {
  const res = await api.get('/leadership/team', { params });
  return res.data;
};

// `update` is a shift name, or { shift, weeklySchedule, available, name }
export const setTeamMemberShift = async (id, update) => {
  const body = update && typeof update === 'object' ? update : { shift: update };
  const res = await api.patch(`/leadership/team/${id}/shift`, body);
  notifyDataUpdate('team');
  return res.data;
};

export const getBranchAttendance = async (branchName) => {
  const res = await api.get(`/leadership/attendance/branch/${encodeURIComponent(branchName)}`);
  return res.data;
};

export const getOrgAttendanceSummary = async () => {
  const res = await api.get('/leadership/attendance/org-summary');
  return res.data;
};

export const getAttendanceByBranch = async () => {
  const res = await api.get('/leadership/attendance/by-branch');
  return res.data;
};

export const clockIn = async (branchName, employeeName) => {
  const res = await api.post('/leadership/attendance/clock-in', { branchName, employeeName });
  notifyDataUpdate('attendance');
  return res.data;
};

export const clockOut = async (branchName, employeeName) => {
  const res = await api.post('/leadership/attendance/clock-out', { branchName, employeeName });
  notifyDataUpdate('attendance');
  return res.data;
};

export const setAttendanceBreak = async (branchName, employeeName, onBreak) => {
  const res = await api.post('/leadership/attendance/break', { branchName, employeeName, onBreak });
  notifyDataUpdate('attendance');
  return res.data;
};

// Admin Slabs & Audit Logs API
export const getAdminSlabs = async () => {
  const res = await api.get('/admin/slabs');
  return res.data;
};

export const updateAdminSlabs = async (slabs) => {
  const res = await api.put('/admin/slabs', slabs);
  notifyDataUpdate('slabs');
  return res.data;
};

export const getAuditLogs = async () => {
  const res = await api.get('/admin/audit-logs');
  return res.data;
};

export const createAuditLog = async (data) => {
  const res = await api.post('/admin/audit-logs', data);
  notifyDataUpdate('audit_logs');
  return res.data;
};

export const getStats = async () => {
  const res = await api.get('/stats');
  return res.data;
};

// ==========================================
// CCCP API (Colleges, Companies, Placements, Billing, Follow-ups)
// ==========================================
export const getColleges = async () => {
  const res = await api.get('/cccp/colleges');
  return res.data;
};

export const createCollege = async (data) => {
  const res = await api.post('/cccp/colleges', data);
  notifyDataUpdate('cccp_colleges');
  return res.data;
};

export const updateCollege = async (id, data) => {
  const res = await api.put(`/cccp/colleges/${id}`, data);
  notifyDataUpdate('cccp_colleges');
  return res.data;
};

export const deleteCollege = async (id) => {
  const res = await api.delete(`/cccp/colleges/${id}`);
  notifyDataUpdate('cccp_colleges');
  return res.data;
};

// Campus student list → HR lead pool (duplicates by phone are skipped server-side)
export const handoverCollegeStudents = async (id, data) => {
  const res = await api.post(`/cccp/colleges/${id}/handover`, data);
  notifyDataUpdate('cccp_colleges');
  notifyDataUpdate('leads');
  return res.data;
};

export const getCompanies = async () => {
  const res = await api.get('/cccp/companies');
  return res.data;
};

export const createCompany = async (data) => {
  const res = await api.post('/cccp/companies', data);
  notifyDataUpdate('cccp_companies');
  return res.data;
};

export const updateCompany = async (id, data) => {
  const res = await api.put(`/cccp/companies/${id}`, data);
  notifyDataUpdate('cccp_companies');
  return res.data;
};

export const deleteCompany = async (id) => {
  const res = await api.delete(`/cccp/companies/${id}`);
  notifyDataUpdate('cccp_companies');
  return res.data;
};

export const getPlacements = async () => {
  const res = await api.get('/cccp/placements');
  return res.data;
};

export const createPlacement = async (data) => {
  const res = await api.post('/cccp/placements', data);
  notifyDataUpdate('cccp_placements');
  notifyDataUpdate('students');
  return res.data;
};

export const updatePlacement = async (id, data) => {
  const res = await api.put(`/cccp/placements/${id}`, data);
  notifyDataUpdate('cccp_placements');
  notifyDataUpdate('students');
  return res.data;
};

export const deletePlacement = async (id) => {
  const res = await api.delete(`/cccp/placements/${id}`);
  notifyDataUpdate('cccp_placements');
  return res.data;
};

export const getBillingDeals = async () => {
  const res = await api.get('/cccp/billing');
  return res.data;
};

export const createBillingDeal = async (data) => {
  const res = await api.post('/cccp/billing', data);
  notifyDataUpdate('cccp_billing');
  return res.data;
};

export const updateBillingDeal = async (id, data) => {
  const res = await api.put(`/cccp/billing/${id}`, data);
  notifyDataUpdate('cccp_billing');
  return res.data;
};

export const deleteBillingDeal = async (id) => {
  const res = await api.delete(`/cccp/billing/${id}`);
  notifyDataUpdate('cccp_billing');
  return res.data;
};

export const getCccpFollowUps = async () => {
  const res = await api.get('/cccp/followups');
  return res.data;
};

export const createCccpFollowUp = async (data) => {
  const res = await api.post('/cccp/followups', data);
  notifyDataUpdate('cccp_followups');
  return res.data;
};

export const updateCccpFollowUp = async (id, data) => {
  const res = await api.put(`/cccp/followups/${id}`, data);
  notifyDataUpdate('cccp_followups');
  return res.data;
};

export const deleteCccpFollowUp = async (id) => {
  const res = await api.delete(`/cccp/followups/${id}`);
  notifyDataUpdate('cccp_followups');
  return res.data;
};

// ==========================================
// Marketing API (Campaigns, Creatives, Sources)
// ==========================================
export const getCampaigns = async () => {
  const res = await api.get('/marketing/campaigns');
  return res.data;
};

export const createCampaign = async (data) => {
  const res = await api.post('/marketing/campaigns', data);
  notifyDataUpdate('campaigns');
  return res.data;
};

export const updateCampaign = async (id, data) => {
  const res = await api.put(`/marketing/campaigns/${id}`, data);
  notifyDataUpdate('campaigns');
  return res.data;
};

export const deleteCampaign = async (id) => {
  const res = await api.delete(`/marketing/campaigns/${id}`);
  notifyDataUpdate('campaigns');
  return res.data;
};

export const getCreatives = async () => {
  const res = await api.get('/marketing/creatives');
  return res.data;
};

export const createCreative = async (data) => {
  const res = await api.post('/marketing/creatives', data);
  notifyDataUpdate('creatives');
  notifyDataUpdate('approvals');
  return res.data;
};

export const updateCreative = async (id, data) => {
  const res = await api.put(`/marketing/creatives/${id}`, data);
  notifyDataUpdate('creatives');
  notifyDataUpdate('approvals');
  return res.data;
};

export const deleteCreative = async (id) => {
  const res = await api.delete(`/marketing/creatives/${id}`);
  notifyDataUpdate('creatives');
  return res.data;
};

export const getMarketingSources = async () => {
  const res = await api.get('/marketing/sources');
  return res.data;
};

// Content calendar
export const getContentPieces = async () => {
  const res = await api.get('/marketing/content');
  return res.data;
};

export const createContentPiece = async (data) => {
  const res = await api.post('/marketing/content', data);
  notifyDataUpdate('content');
  return res.data;
};

export const updateContentPiece = async (id, data) => {
  const res = await api.put(`/marketing/content/${id}`, data);
  notifyDataUpdate('content');
  return res.data;
};

export const deleteContentPiece = async (id) => {
  const res = await api.delete(`/marketing/content/${id}`);
  notifyDataUpdate('content');
  return res.data;
};

// Branch lead demand (branches ask Marketing for leads)
export const getLeadDemands = async () => {
  const res = await api.get('/marketing/demands');
  return res.data;
};

export const createLeadDemand = async (data) => {
  const res = await api.post('/marketing/demands', data);
  notifyDataUpdate('demands');
  return res.data;
};

export const updateLeadDemand = async (id, data) => {
  const res = await api.put(`/marketing/demands/${id}`, data);
  notifyDataUpdate('demands');
  return res.data;
};

export const deleteLeadDemand = async (id) => {
  const res = await api.delete(`/marketing/demands/${id}`);
  notifyDataUpdate('demands');
  return res.data;
};

// ==========================================
// Org master data, shared settings & SOPs
// ==========================================
export const createBranch = async (data) => {
  const res = await api.post('/branches', data);
  notifyDataUpdate('branches');
  return res.data;
};

export const updateBranch = async (id, data) => {
  const res = await api.put(`/branches/${id}`, data);
  notifyDataUpdate('branches');
  return res.data;
};

export const deleteBranch = async (id) => {
  const res = await api.delete(`/branches/${id}`);
  notifyDataUpdate('branches');
  return res.data;
};

export const getPipeline = async () => {
  const res = await api.get('/leads/pipeline');
  return res.data;
};

export const getTeamTasks = async (params) => {
  const res = await api.get('/leadership/tasks', { params });
  return res.data;
};

export const createTeamTask = async (data) => {
  const res = await api.post('/leadership/tasks', data);
  notifyDataUpdate('tasks');
  return res.data;
};

export const updateTeamTaskStatus = async (id, status) => {
  const res = await api.patch(`/leadership/tasks/${id}`, { status });
  notifyDataUpdate('tasks');
  return res.data;
};

export const reviewDailyClosure = async (id) => {
  const res = await api.patch(`/closures/${id}/review`);
  notifyDataUpdate('closures');
  return res.data;
};

export const sendStaffReminder = async ({ name, departmentCode, message }) => {
  const res = await api.post('/notifications/remind', { name, departmentCode, message });
  return res.data;
};

export const getSetting = async (key) => {
  const res = await api.get(`/settings/${key}`);
  return res.data;
};

export const saveSetting = async (key, value) => {
  const res = await api.put(`/settings/${key}`, { value });
  notifyDataUpdate('settings');
  return res.data;
};

export const getSops = async (params) => {
  const res = await api.get('/sops', { params });
  return res.data;
};

export const createSop = async (data) => {
  const res = await api.post('/sops', data);
  notifyDataUpdate('sops');
  return res.data;
};

export const updateSop = async (id, data) => {
  const res = await api.put(`/sops/${id}`, data);
  notifyDataUpdate('sops');
  return res.data;
};

export const deleteSop = async (id) => {
  const res = await api.delete(`/sops/${id}`);
  notifyDataUpdate('sops');
  return res.data;
};

export const assignSop = async (id) => {
  const res = await api.post(`/sops/${id}/assign`);
  return res.data;
};

export default api;


// ==========================================
// Student Portal ⇄ Trainer data flow
// ==========================================
export const getStudentPortal = async ({ studentId, email } = {}) => {
  const res = await api.get('/student-portal/me', { params: { studentId, email } });
  return res.data;
};

export const updateStudentPortalProfile = async (studentId, data) => {
  const res = await api.put(`/student-portal/${encodeURIComponent(studentId)}/profile`, data);
  notifyDataUpdate('students');
  return res.data;
};

export const createStudentReferral = async (studentId, data) => {
  const res = await api.post(`/student-portal/${encodeURIComponent(studentId)}/referrals`, data);
  notifyDataUpdate('leads');
  return res.data;
};

export const createStudentSubmission = async (studentId, data) => {
  const res = await api.post(`/student-portal/${encodeURIComponent(studentId)}/submissions`, data);
  notifyDataUpdate('student_submissions');
  return res.data;
};

export const getStudentSubmissions = async (params) => {
  const res = await api.get('/student-portal/submissions', { params });
  return res.data;
};

export const studentSubmissionFileUrl = (id, download = false) =>
  withAuthToken(`${API_BASE}/student-portal/submissions/${id}/file${download ? '?download=1' : ''}`);

export const reviewStudentSubmission = async (id, data) => {
  const res = await api.put(`/student-portal/submissions/${id}/review`, data);
  notifyDataUpdate('student_submissions');
  return res.data;
};

export const createStudentRequest = async (studentId, data) => {
  const res = await api.post(`/student-portal/${encodeURIComponent(studentId)}/requests`, data);
  notifyDataUpdate('student_requests');
  return res.data;
};

export const getStudentRequests = async (params) => {
  const res = await api.get('/student-portal/requests', { params });
  return res.data;
};

export const respondStudentRequest = async (id, data) => {
  const res = await api.put(`/student-portal/requests/${id}`, data);
  notifyDataUpdate('student_requests');
  return res.data;
};

export const studentRequestDocumentUrl = (id) => `${apiBase}/api/student-portal/requests/${id}/document`;

export const getLiveClasses = async (params) => {
  const res = await api.get('/trainer/live-class', { params });
  return res.data;
};

// Starts the class: server creates the Zoom meeting on the trainer's Zoom user
export const startLiveClass = async (data) => {
  const res = await api.post('/trainer/live-class/start', data);
  notifyDataUpdate('live_class');
  return res.data;
};

// Host join details (signature + ZAK) for the trainer's own session
export const getTrainerClassJoin = async (sessionId, { noHost } = {}) => {
  const q = noHost ? '?noHost=1' : '';
  const res = await api.get(`/trainer/live-class/${sessionId}/join${q}`);
  return res.data;
};

export const addLiveClassNote = async (sessionId, text) => {
  const res = await api.post(`/trainer/live-class/${sessionId}/notes`, { text });
  return res.data;
};

export const endLiveClass = async (data) => {
  const res = await api.post('/trainer/live-class/end', data);
  notifyDataUpdate('live_class');
  return res.data;
};

export const markLiveClassAttendanceSaved = async (sessionId) => {
  const res = await api.put(`/trainer/live-class/${sessionId}/attendance-saved`);
  return res.data;
};

// Student joins the live class of their batch (logged for attendance)
export const joinStudentLiveClass = async (data = {}) => {
  const payload = typeof data === 'object' && data !== null ? data : {};
  const res = await api.post('/student-portal/live-class/join', payload);
  return res.data;
};

// Periodic heartbeat while in live class (tracks online duration for 1 hr 45 min Present rule)
export const sendLiveClassHeartbeat = async (data = {}) => {
  const payload = typeof data === 'object' && data !== null ? data : {};
  const res = await api.post('/student-portal/live-class/heartbeat', payload);
  return res.data;
};

// ============================================
// CROSS-DASHBOARD CONNECTIONS (HR ⇄ Trainer ⇄ Student ⇄ CCCP)
// ============================================

// Student support tickets (Escalation rows raised from the Student Portal)
export const getStudentTickets = async (params = {}) => {
  const res = await api.get('/leadership/escalations', { params: { studentsOnly: 1, ...params } });
  return res.data;
};

export const respondStudentTicket = async (id, { action, response }) => {
  const res = await api.patch(`/leadership/escalations/${id}/status`, { action, response });
  notifyDataUpdate('escalations');
  return res.data;
};

// Trainer leave / unavailable days
export const addTrainerLeave = async (trainerId, data) => {
  const res = await api.post(`/trainer/settings/${encodeURIComponent(trainerId)}/leaves`, data);
  notifyDataUpdate('trainers');
  return res.data;
};

// Leave approvals by the trainer's TL / Manager / Department Head
export const getTrainerLeaveRequests = async () => {
  const res = await api.get('/trainer/leave-requests');
  return res.data;
};

export const decideTrainerLeave = async (trainerId, leaveId, action, note = '') => {
  const res = await api.patch(`/trainer/settings/${encodeURIComponent(trainerId)}/leaves/${leaveId}/decision`, { action, note });
  notifyDataUpdate('trainers');
  return res.data;
};

// Trainer Manager / Team Lead leave — decided by the Department Head of Training
export const getLeaderLeaves = async (params = {}) => {
  const res = await api.get('/trainer/leader-leaves', { params });
  return res.data;
};

export const applyLeaderLeave = async (data) => {
  const res = await api.post('/trainer/leader-leaves', data);
  notifyDataUpdate('leader_leaves');
  return res.data;
};

export const decideLeaderLeave = async (id, action, note = '') => {
  const res = await api.patch(`/trainer/leader-leaves/${id}/decision`, { action, note });
  notifyDataUpdate('leader_leaves');
  return res.data;
};

export const deleteTrainerLeave = async (trainerId, leaveId) => {
  const res = await api.delete(`/trainer/settings/${encodeURIComponent(trainerId)}/leaves/${leaveId}`);
  notifyDataUpdate('trainers');
  return res.data;
};

// Student feedback on classes / trainer
export const submitStudentFeedback = async (studentId, data) => {
  const res = await api.post(`/student-portal/${encodeURIComponent(studentId)}/feedback`, data);
  notifyDataUpdate('feedback');
  return res.data;
};

export const getFeedbackSummary = async (params) => {
  const res = await api.get('/feedback/summary', { params });
  return res.data;
};

// One timeline per student (HR profile)
export const getStudentTimeline = async (id) => {
  const res = await api.get(`/students/${encodeURIComponent(id)}/timeline`);
  return res.data;
};

// Training staff (Trainer, TL, Manager, Head): logout closes today's attendance.
// Reads the token *now* (before the caller clears the session) and uses a
// keepalive request so it still goes out while the page is changing.
export const recordTrainingLogout = () => {
  try {
    const raw = sessionStorage.getItem('thoughtflows_user') || localStorage.getItem('thoughtflows_user');
    const u = JSON.parse(raw || 'null');
    const token = u?.token || '';
    if (!token || !(u?.department === 'training' || u?.trainerRole || u?.trainerId)) return Promise.resolve(null);
    return fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: '{}'
    })
      .then((r) => r.json().catch(() => null))
      .catch(() => null)
      .finally(() => notifyDataUpdate('attendance'));
  } catch (_) {
    return Promise.resolve(null);
  }
};

// Login / logout attendance of training staff (scoped by role on the server)
export const getStaffAttendance = async (params = {}) => {
  const res = await api.get('/trainer/staff-attendance', { params });
  return res.data;
};

// Self attendance (clock-in / break / end of day) for staff dashboards
export const getMyAttendance = async (branchName) => {
  const res = await api.get('/attendance/me', { params: branchName ? { branchName } : {} });
  return res.data;
};

export const setMyAttendance = async (action, branchName) => {
  const res = await api.post('/attendance/me', { action, ...(branchName ? { branchName } : {}) });
  notifyDataUpdate('attendance');
  return res.data;
};

export const startMyWork = async (branchName) => {
  const res = await api.post('/attendance/me', { action: 'start_work', ...(branchName ? { branchName } : {}) });
  notifyDataUpdate('attendance');
  return res.data;
};

export const closeMyWork = async (branchName) => {
  const res = await api.post('/attendance/me', { action: 'close_work', ...(branchName ? { branchName } : {}) });
  notifyDataUpdate('attendance');
  return res.data;
};

// HR LMS (lesson progress, graded assessments, certification)
export const getLmsProgress = async (params) => {
  const res = await api.get('/hr/lms/progress', { params });
  return res.data;
};
export const markLmsItem = async (moduleKey, itemId, done = true) => {
  const res = await api.put('/hr/lms/progress/item', { moduleKey, itemId, done });
  return res.data;
};
export const getLmsAssessment = async (moduleKey) => {
  const res = await api.get(`/hr/lms/assessment/${encodeURIComponent(moduleKey)}`);
  return res.data;
};
export const submitLmsAssessment = async (moduleKey, answers) => {
  const res = await api.post(`/hr/lms/assessment/${encodeURIComponent(moduleKey)}`, { answers });
  notifyDataUpdate('lms');
  return res.data;
};
export const getLmsCertifications = async () => {
  const res = await api.get('/hr/lms/certifications');
  return res.data;
};

// Counsellor call log (server-side daily call count)
export const logCall = async (data) => {
  const res = await api.post('/calls/log', data);
  return res.data;
};
export const getTodayCallLog = async (params) => {
  const res = await api.get('/calls/log', { params });
  return res.data;
};

// ---- Learning features: syllabus, announcements, online tests, recordings, doubt follow-ups ----
// Course syllabus (the master module list) is Head-of-Trainer-managed only — see
// getCourseSyllabus/saveCourseSyllabus below. getBatchSyllabus/saveBatchSyllabus
// only read/write a batch's progress (done/undone) against that master list.
export const getBatchSyllabus = async (batch, course) => {
  const res = await api.get('/training/syllabus', { params: { batch, course } });
  return res.data;
};
export const saveBatchSyllabus = async (data) => {
  const res = await api.put('/training/syllabus', data);
  notifyDataUpdate('syllabus');
  return res.data;
};
export const getCourseSyllabus = async (course) => {
  const res = await api.get('/training/course-syllabus', { params: { course } });
  return res.data;
};
export const getAllCourseSyllabi = async () => {
  const res = await api.get('/training/course-syllabus/all');
  return res.data;
};
export const saveCourseSyllabus = async (data) => {
  const res = await api.put('/training/course-syllabus', data);
  notifyDataUpdate('syllabus');
  return res.data;
};
export const getBatchAnnouncements = async (params) => {
  const res = await api.get('/training/announcements', { params });
  return res.data;
};
export const createBatchAnnouncement = async (data) => {
  const res = await api.post('/training/announcements', data);
  notifyDataUpdate('announcements');
  return res.data;
};
export const deleteBatchAnnouncement = async (id) => {
  const res = await api.delete(`/training/announcements/${id}`);
  notifyDataUpdate('announcements');
  return res.data;
};
export const saveTestQuestions = async (id, data) => {
  const res = await api.put(`/trainer/assessments/${id}/questions`, data);
  notifyDataUpdate('assessments');
  return res.data;
};
export const getTestAttempts = async (id) => {
  const res = await api.get(`/trainer/assessments/${id}/attempts`);
  return res.data;
};
export const getLiveClassHistory = async (params) => {
  const res = await api.get('/trainer/live-class/history', { params });
  return res.data;
};
export const saveLiveClassRecording = async (id, url) => {
  const res = await api.post(`/trainer/live-class/${id}/recording`, { url });
  notifyDataUpdate('live_class');
  return res.data;
};
export const getStudentTest = async (id) => {
  const res = await api.get(`/student-portal/tests/${id}`);
  return res.data;
};
export const startStudentTest = async (id) => {
  const res = await api.post(`/student-portal/tests/${id}/start`);
  return res.data;
};
export const saveStudentTestAnswers = async (id, answers) => {
  const res = await api.post(`/student-portal/tests/${id}/save`, { answers });
  return res.data;
};
export const submitStudentTest = async (id, answers) => {
  const res = await api.post(`/student-portal/tests/${id}/submit`, { answers });
  notifyDataUpdate('assessments');
  return res.data;
};
export const getTestLeaderboard = async (id, params) => {
  const res = await api.get(`/student-portal/tests/${id}/leaderboard`, { params });
  return res.data;
};
export const reallocateTestAttempt = async (id, data) => {
  const res = await api.post(`/trainer/assessments/${id}/reallocate`, data);
  notifyDataUpdate('assessments');
  return res.data;
};
export const reallocateStudentTest = async (id, data) => {
  const res = await api.post(`/student-portal/tests/${id}/reallocate`, data);
  notifyDataUpdate('assessments');
  return res.data;
};
export const followUpDoubt = async (id, text) => {
  const res = await api.post(`/student-portal/doubts/${id}/followup`, { text });
  notifyDataUpdate('doubts');
  return res.data;
};
export const resolveDoubt = async (id) => {
  const res = await api.post(`/student-portal/doubts/${id}/resolve`);
  notifyDataUpdate('doubts');
  return res.data;
};

// ==========================================
// UTILIZATION DASHBOARD & HOURLY WORK TRACKER
// ==========================================
export const getTrainerUtilization = async (params = {}) => {
  const res = await api.get('/trainer/utilization', { params });
  return res.data;
};

export const saveTrainerHourlyPlan = async (data) => {
  const res = await api.post('/trainer/utilization/plan', data);
  notifyDataUpdate('trainer_utilization');
  return res.data;
};

export const updateTrainerSlotActual = async (data) => {
  const res = await api.put('/trainer/utilization/actual', data);
  notifyDataUpdate('trainer_utilization');
  return res.data;
};

export const bulkSaveTrainerHourlyPlans = async (data) => {
  const res = await api.post('/trainer/utilization/bulk-plan', data);
  notifyDataUpdate('trainer_utilization');
  return res.data;
};

export const setTrainerLeave = async (data) => {
  const res = await api.post('/trainer/utilization/leave', data);
  notifyDataUpdate('trainer_utilization');
  return res.data;
};

export const getTrainerUtilizationReport = async (params = {}) => {
  const res = await api.get('/trainer/utilization/report', { params });
  return res.data;
};

// ==========================================
// WISEAPP ACADEMY PORTAL (LMS, TESTS, SCHEDULES, ALLOCATIONS)
// ==========================================
export const getWiseAppOverview = async () => (await api.get('/wiseapp/overview')).data;
export const getWiseAppStudents = async (params = {}) => (await api.get('/wiseapp/students', { params })).data;
export const updateWiseAppStudentOnboarding = async (id, data) => {
  const res = await api.put(`/wiseapp/students/${id}/onboarding`, data);
  notifyDataUpdate('students');
  return res.data;
};
export const getWiseAppTeachers = async () => (await api.get('/wiseapp/teachers')).data;
export const getWiseAppSchedules = async (params = {}) => (await api.get('/wiseapp/schedules', { params })).data;
export const createWiseAppSchedule = async (data) => (await api.post('/wiseapp/schedules', data)).data;
export const updateWiseAppSchedule = async (id, data) => (await api.put(`/wiseapp/schedules/${id}`, data)).data;
export const followUpWiseAppSchedule = async (id, data) => (await api.patch(`/wiseapp/schedules/${id}/followup`, data)).data;
export const deleteWiseAppSchedule = async (id) => (await api.delete(`/wiseapp/schedules/${id}`)).data;
export const getWiseAppAllocations = async () => (await api.get('/wiseapp/allocations')).data;
export const assignWiseAppAllocation = async (data) => {
  const res = await api.post('/wiseapp/allocations/assign', data);
  notifyDataUpdate('students');
  return res.data;
};
export const getWiseAppQuestions = async (params = {}) => (await api.get('/wiseapp/questions', { params })).data;
export const createWiseAppQuestion = async (data) => (await api.post('/wiseapp/questions', data)).data;
export const bulkCreateWiseAppQuestions = async (questions) => (await api.post('/wiseapp/questions/bulk', { questions })).data;
export const updateWiseAppQuestion = async (id, data) => (await api.put(`/wiseapp/questions/${id}`, data)).data;
export const deleteWiseAppQuestion = async (id) => (await api.delete(`/wiseapp/questions/${id}`)).data;
export const reportWiseAppQuestion = async (id, data) => (await api.post(`/wiseapp/questions/${id}/report`, data)).data;
export const resolveWiseAppQuestionReport = async (id, data) => (await api.patch(`/wiseapp/questions/${id}/resolve-report`, data)).data;
export const getWiseAppTests = async () => (await api.get('/wiseapp/tests')).data;
export const createWiseAppTest = async (data) => {
  const res = await api.post('/wiseapp/tests', data);
  notifyDataUpdate('assessments');
  return res.data;
};
export const updateWiseAppTest = async (id, data) => {
  const res = await api.put(`/wiseapp/tests/${id}`, data);
  notifyDataUpdate('assessments');
  return res.data;
};
export const deleteWiseAppTest = async (id) => (await api.delete(`/wiseapp/tests/${id}`)).data;
export const getWiseAppVideos = async (params = {}) => (await api.get('/wiseapp/videos', { params })).data;
export const createWiseAppVideo = async (data) => (await api.post('/wiseapp/videos', data)).data;
export const updateWiseAppVideo = async (id, data) => (await api.put(`/wiseapp/videos/${id}`, data)).data;
export const deleteWiseAppVideo = async (id) => (await api.delete(`/wiseapp/videos/${id}`)).data;
export const getWiseAppPackages = async (params = {}) => (await api.get('/wiseapp/packages', { params })).data;
export const createWiseAppPackage = async (data) => (await api.post('/wiseapp/packages', data)).data;
export const updateWiseAppPackage = async (id, data) => (await api.put(`/wiseapp/packages/${id}`, data)).data;
export const deleteWiseAppPackage = async (id) => (await api.delete(`/wiseapp/packages/${id}`)).data;
export const getWiseAppFeedback = async () => (await api.get('/wiseapp/feedback')).data;
export const submitWiseAppFeedback = async (data) => (await api.post('/wiseapp/feedback', data)).data;
export const getWiseAppResources = async () => (await api.get('/wiseapp/resources')).data;
export const getWiseAppAttendance = async () => (await api.get('/wiseapp/attendance')).data;
export const getWiseAppReports = async () => (await api.get('/wiseapp/reports')).data;
export const getWiseAppCatalog = async (params = {}) => (await api.get('/wiseapp/catalog', { params })).data;
export const createWiseAppCatalogItem = async (data) => (await api.post('/wiseapp/catalog', data)).data;
export const updateWiseAppCatalogItem = async (id, data) => (await api.put(`/wiseapp/catalog/${id}`, data)).data;
export const deleteWiseAppCatalogItem = async (id) => (await api.delete(`/wiseapp/catalog/${id}`)).data;
export const getWiseAppCenters = async () => (await api.get('/wiseapp/centers')).data;
