import axios from 'axios';

//****** API client — axios instance + unwrapSuccess **************//

export const getApiBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 25_000,
});

export function extractApiErrorMessage(error, fallback = 'Something went wrong') {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Check that the API server is running and reachable.';
    }
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      return 'Could not reach the API. Is the backend running and NEXT_PUBLIC_API_BASE_URL correct?';
    }
    const data = error.response?.data;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.errors)) {
      return data.errors.map((e) => e.message || e.field || String(e)).join(', ');
    }
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function unwrapSuccess(response) {
  const body = response.data;
  if (body && body.success === true) return body.data;
  throw new Error(body?.message || 'Unexpected API response');
}

export function analyzeTender(payload) {
  return client.post('/api/tenders/analyze', payload).then(unwrapSuccess);
}

export function getTenders(filters = {}) {
  return client.get('/api/tenders', { params: filters }).then(unwrapSuccess);
}

export function getTenderById(id) {
  return client.get(`/api/tenders/${id}`).then(unwrapSuccess);
}

export function updateChecklistItem(tenderId, itemId, status) {
  return client
    .patch(`/api/tenders/${tenderId}/checklist/${itemId}`, { status })
    .then(unwrapSuccess);
}

export function createCalendarReminder(tenderId) {
  return client.post(`/api/tenders/${tenderId}/calendar`).then(unwrapSuccess);
}

export function sendTenderEmail(tenderId, to) {
  return client.post(`/api/tenders/${tenderId}/email`, { to }).then(unwrapSuccess);
}

export function runDeadlineCheck() {
  return client.post('/api/agent/run-deadline-check').then(unwrapSuccess);
}

export function getDashboardStats() {
  return client.get('/api/dashboard/stats').then(unwrapSuccess);
}

export function deleteTender(id) {
  return client.delete(`/api/tenders/${id}`).then(unwrapSuccess);
}
