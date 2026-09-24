import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Real-Time Cross-Dashboard Sync Event Bus
export const notifyDataUpdate = (entity) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('thoughtflows_data_updated', { detail: { entity } }));
  }
};

export const onDataUpdate = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => {
    if (callback) callback(e.detail?.entity);
  };
  window.addEventListener('thoughtflows_data_updated', handler);
  return () => {
    window.removeEventListener('thoughtflows_data_updated', handler);
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

export const createLead = async (leadData) => {
  const res = await api.post('/leads', leadData);
  notifyDataUpdate('leads');
  return res.data;
};

export const updateLead = async (id, leadData) => {
  const res = await api.put(`/leads/${id}`, leadData);
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

export const dialCall = async ({ leadPhone, agentPhone }) => {
  const res = await api.post('/calls/dial', { leadPhone, agentPhone });
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

export const sendDemoLinkEmail = async (id) => {
  const res = await api.post(`/demos/${id}/send-link`);
  return res.data;
};

export const getMyDemos = async (email) => {
  const res = await api.get('/demos/mine', { params: { email } });
  return res.data;
};

export const acknowledgeDemo = async (id) => {
  const res = await api.put(`/demos/${id}/acknowledge`);
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
export const getTrainerDoubts = async () => {
  const res = await api.get('/trainer/doubts');
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

export const getTrainerAssessments = async () => {
  const res = await api.get('/trainer/assessments');
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

export const getTrainerAttendance = async () => {
  const res = await api.get('/trainer/attendance');
  return res.data;
};

export const recordTrainerAttendance = async (attendanceData) => {
  const res = await api.post('/trainer/attendance', attendanceData);
  notifyDataUpdate('trainer_attendance');
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

