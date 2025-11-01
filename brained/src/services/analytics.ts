import api from './api';
import trackingClient from './trackingClient';

export async function sendEvent(eventType: string, props: any = {}) {
  // Use custom tracking client
  try {
    trackingClient.trackCustomEvent(eventType, props);
  } catch (e) {
    console.error('Failed to track event', e);
  }
}

export async function sendPerformance(payload: any) {
  try {
    // Send performance metrics to backend
    await api.post('/api/analytics/performance', payload);
  } catch (e) {
    console.error('Failed to send performance metrics', e);
  }
}
