import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Students API
export const getStudents = async (params) => {
  const res = await api.get('/students', { params });
  return res.data;
};

export const createStudent = async (studentData) => {
  const res = await api.post('/students', studentData);
  return res.data;
};

export const updateStudent = async (id, studentData) => {
  const res = await api.put(`/students/${id}`, studentData);
  return res.data;
};

export const deleteStudent = async (id) => {
  const res = await api.delete(`/students/${id}`);
  return res.data;
};

// Leads & Pipeline API
export const getLeads = async () => {
  const res = await api.get('/leads');
  return res.data;
};

export const createLead = async (leadData) => {
  const res = await api.post('/leads', leadData);
  return res.data;
};

export const updateLead = async (id, leadData) => {
  const res = await api.put(`/leads/${id}`, leadData);
  return res.data;
};

export const deleteLead = async (id) => {
  const res = await api.delete(`/leads/${id}`);
  return res.data;
};

// Demos API
export const getDemos = async () => {
  const res = await api.get('/demos');
  return res.data;
};

export const createDemo = async (demoData) => {
  const res = await api.post('/demos', demoData);
  return res.data;
};

export const updateDemo = async (id, demoData) => {
  const res = await api.put(`/demos/${id}`, demoData);
  return res.data;
};

export const acknowledgeDemo = async (id) => {
  const res = await api.put(`/demos/${id}/acknowledge`);
  return res.data;
};

export const deleteDemo = async (id) => {
  const res = await api.delete(`/demos/${id}`);
  return res.data;
};

// Trainer Notification Settings & Shifts API
export const getTrainerSettings = async () => {
  const res = await api.get('/trainer/settings');
  return res.data;
};

export const updateTrainerSettings = async (id, data) => {
  const res = await api.put(`/trainer/settings/${id}`, data);
  return res.data;
};

// Fees & Course Rates API
export const getCourseFeeRates = async () => {
  const res = await api.get('/fees/rates');
  return res.data;
};

export const saveCourseFeeRate = async (rateData) => {
  const res = await api.post('/fees/rates', rateData);
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
  return res.data;
};

export const replyTrainerDoubt = async (id, reply) => {
  const res = await api.put(`/trainer/doubts/${id}/reply`, { reply });
  return res.data;
};

export const getTrainerAssessments = async () => {
  const res = await api.get('/trainer/assessments');
  return res.data;
};

export const createTrainerAssessment = async (assessmentData) => {
  const res = await api.post('/trainer/assessments', assessmentData);
  return res.data;
};

export const updateAssessmentScores = async (id, scores) => {
  const res = await api.put(`/trainer/assessments/${id}/scores`, { scores });
  return res.data;
};

export const updateAssessmentRationale = async (id, rationale) => {
  const res = await api.put(`/trainer/assessments/${id}/rationale`, { rationale });
  return res.data;
};

export const getTrainerAttendance = async () => {
  const res = await api.get('/trainer/attendance');
  return res.data;
};

export const recordTrainerAttendance = async (attendanceData) => {
  const res = await api.post('/trainer/attendance', attendanceData);
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

export const decideApproval = async (id, action) => {
  const res = await api.patch(`/leadership/approvals/${id}/decision`, { action });
  return res.data;
};

export const getEscalations = async (params) => {
  const res = await api.get('/leadership/escalations', { params });
  return res.data;
};

export const updateEscalationStatus = async (id, action) => {
  const res = await api.patch(`/leadership/escalations/${id}/status`, { action });
  return res.data;
};

export const getTeam = async (params) => {
  const res = await api.get('/leadership/team', { params });
  return res.data;
};

export const setTeamMemberShift = async (id, shift) => {
  const res = await api.patch(`/leadership/team/${id}/shift`, { shift });
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
  return res.data;
};

export const clockOut = async (branchName, employeeName) => {
  const res = await api.post('/leadership/attendance/clock-out', { branchName, employeeName });
  return res.data;
};

export const setAttendanceBreak = async (branchName, employeeName, onBreak) => {
  const res = await api.post('/leadership/attendance/break', { branchName, employeeName, onBreak });
  return res.data;
};

export default api;
