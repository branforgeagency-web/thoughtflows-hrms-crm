import axios from 'axios';

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
    const u = JSON.parse(localStorage.getItem('thoughtflows_user') || 'null');
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
const FILE_TOKEN_REFRESH_MS = 10 * 60 * 1000;
export const ensureFileToken = () => {
  const session = getAuthToken();
  if (!session) return Promise.resolve('');
  const fresh = fileToken.value && fileToken.session === session && Date.now() - fileToken.at < FILE_TOKEN_REFRESH_MS;
  if (fresh) return Promise.resolve(fileToken.value);
  if (!fileTokenPromise) {
    fileTokenPromise = axios.post(`${API_BASE}/auth/file-token`, {}, { headers: { Authorization: `Bearer ${session}` } })
      .then((r) => {
        fileToken = { value: r.data?.token || '', at: Date.now(), session };
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('thoughtflows_file_token'));
        return fileToken.value;
      })
      .catch(() => '')
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
  // Keep the short-lived file-link token warm while the user is active
  if (t && !String(config.url || '').includes('/auth/file-token')) setTimeout(() => ensureFileToken(), 0);
  return config;
};

let sessionExpiredHandled = false;
const handleAuthError = (error) => {
  const code = error?.response?.data?.code;
  // Only log out a user who was logged in (a visitor with no token just gets the error)
  if (error?.response?.status === 401 && (code === 'AUTH_EXPIRED' || code === 'AUTH_REQUIRED') && getAuthToken() && !sessionExpiredHandled) {
    sessionExpiredHandled = true;
    try {
      localStorage.removeItem('thoughtflows_user');
      localStorage.removeItem('thoughtflows_dashboard');
    } catch (_) {}
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
  return Promise.reject(error);
};

api.interceptors.request.use(attachToken);
api.interceptors.response.use((r) => r, handleAuthError);
axios.interceptors.request.use(attachToken);
axios.interceptors.response.use((r) => r, handleAuthError);

// Real-Time Cross-Dashboard Sync Event Bus (in-tab + multi-tab)
export const notifyDataUpdate = (entity) => {
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

// Create / reset a student's portal login — returns { email, password } once
export const resetStudentLogin = async (id) => {
  const res = await api.post(`/students/${encodeURIComponent(id)}/reset-login`);
  return res.data;
};

export const updateStudent = async (id, studentData) => {
  const res = await api.put(`/students/${id}`, studentData);
  notifyDataUpdate('students');
  return res.data;
};

export const deleteStudent = async (id) => {
  const res = await api.delete(`/students/${id}`);
  notifyDataUpdate('students');
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

export const updateLead = async (id, leadData) => {
  const res = await api.put(`/leads/${id}`, leadData);
  surfaceLmsWarning(res.data);
  notifyDataUpdate('leads');
  return res.data;
};

export const deleteLead = async (id) => {
  const res = await api.delete(`/leads/${id}`);
  notifyDataUpdate('leads');
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
export const getDemos = async () => {
  const res = await api.get('/demos');
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

// Real Exotel click-to-call bridge — dials the HR's phone first, then the
// lead, and bridges them. No simulated call state anywhere in this file.
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

// Call Recordings API
export const getRecordings = async (params) => {
  const res = await api.get('/recordings', { params });
  return res.data;
};

export const saveRecording = async (recordingData) => {
  const res = await api.post('/recordings', recordingData);
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

// Leadership Hub API
export const getBranches = async () => {
  const res = await api.get('/branches');
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

export const updateEscalationStatus = async (id, action) => {
  const res = await api.patch(`/leadership/escalations/${id}/status`, { action });
  notifyDataUpdate('escalations');
  return res.data;
};

export const getTeam = async (params) => {
  const res = await api.get('/leadership/team', { params });
  return res.data;
};

export const setTeamMemberShift = async (id, shift) => {
  const res = await api.patch(`/leadership/team/${id}/shift`, { shift });
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
export const getTrainerClassJoin = async (sessionId) => {
  const res = await api.get(`/trainer/live-class/${sessionId}/join`);
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
export const joinStudentLiveClass = async () => {
  const res = await api.post('/student-portal/live-class/join');
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

// Self attendance (clock-in / break / end of day) for staff dashboards
export const getMyAttendance = async (branchName) => {
  const res = await api.get('/attendance/me', { params: branchName ? { branchName } : {} });
  return res.data;
};

export const setMyAttendance = async (action, branchName) => {
  const res = await api.post('/attendance/me', { action, ...(branchName ? { branchName } : {}) });
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
