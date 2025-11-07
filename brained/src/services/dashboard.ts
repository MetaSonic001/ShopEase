import api from './api';

// Get dashboard overview
export const getDashboardOverview = async (projectId?: string, from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (projectId) params.append('projectId', projectId);
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const response = await api.get(`/api/dashboard/overview?${params.toString()}`);
  return response.data;
};

// Get page-specific analytics
export const getPageAnalytics = async (pageURL: string, projectId?: string, from?: string, to?: string) => {
  const params = new URLSearchParams({ pageURL });
  if (projectId) params.append('projectId', projectId);
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const response = await api.get(`/api/dashboard/page?${params.toString()}`);
  return response.data;
};

// Get user flow
export const getUserFlow = async (projectId?: string, from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (projectId) params.append('projectId', projectId);
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const response = await api.get(`/api/dashboard/user-flow?${params.toString()}`);
  return response.data;
};

// Session management
export const startSession = async (sessionData: any) => {
  const response = await api.post(`/api/sessions/start`, sessionData);
  return response.data;
};

export const updateSession = async (sessionId: string, data: any) => {
  const response = await api.put(`/api/sessions/${sessionId}`, data);
  return response.data;
};

export const endSession = async (sessionId: string) => {
  const response = await api.post(`/api/sessions/${sessionId}/end`);
  return response.data;
};

export const getActiveSessions = async (projectId?: string) => {
  const params = projectId ? `?projectId=${projectId}` : '';
  const response = await api.get(`/api/sessions/active${params}`);
  return response.data;
};
