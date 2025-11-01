import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get dashboard overview
export const getDashboardOverview = async (projectId?: string, from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (projectId) params.append('projectId', projectId);
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const response = await axios.get(`${API_URL}/dashboard/overview?${params.toString()}`);
  return response.data;
};

// Get page-specific analytics
export const getPageAnalytics = async (pageURL: string, projectId?: string, from?: string, to?: string) => {
  const params = new URLSearchParams({ pageURL });
  if (projectId) params.append('projectId', projectId);
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const response = await axios.get(`${API_URL}/dashboard/page?${params.toString()}`);
  return response.data;
};

// Get user flow
export const getUserFlow = async (projectId?: string, from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (projectId) params.append('projectId', projectId);
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const response = await axios.get(`${API_URL}/dashboard/user-flow?${params.toString()}`);
  return response.data;
};

// Session management
export const startSession = async (sessionData: any) => {
  const response = await axios.post(`${API_URL}/sessions/start`, sessionData);
  return response.data;
};

export const updateSession = async (sessionId: string, data: any) => {
  const response = await axios.put(`${API_URL}/sessions/${sessionId}`, data);
  return response.data;
};

export const endSession = async (sessionId: string) => {
  const response = await axios.post(`${API_URL}/sessions/${sessionId}/end`);
  return response.data;
};

export const getActiveSessions = async (projectId?: string) => {
  const params = projectId ? `?projectId=${projectId}` : '';
  const response = await axios.get(`${API_URL}/sessions/active${params}`);
  return response.data;
};
