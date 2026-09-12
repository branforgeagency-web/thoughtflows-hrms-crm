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

export const deleteDemo = async (id) => {
  const res = await api.delete(`/demos/${id}`);
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

export default api;
