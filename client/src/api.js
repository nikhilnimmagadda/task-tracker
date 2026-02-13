import { msalInstance } from './main';
import { loginRequest } from './authConfig';

const BASE = '';

/**
 * Get access token silently, falling back to interactive popup.
 */
async function getAccessToken() {
  if (!msalInstance) return null;
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) return null;

  try {
    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0]
    });
    return response.accessToken;
  } catch {
    try {
      const response = await msalInstance.acquireTokenPopup(loginRequest);
      return response.accessToken;
    } catch {
      return null;
    }
  }
}

export async function api(url, options = {}) {
  const token = await getAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${url}`, {
    headers,
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    const accounts = msalInstance?.getAllAccounts() || [];
    if (accounts.length > 0) {
      try { await msalInstance.acquireTokenPopup(loginRequest); } catch { /* user cancelled */ }
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error);
  }
  return res.json();
}

export function fetchTasks(filter, sort) {
  const params = new URLSearchParams({ sort });
  if (filter !== 'all') params.set('status', filter);
  return api(`/api/tasks?${params}`);
}

export function fetchAllTasks() {
  return api('/api/tasks');
}

export function fetchTask(id) {
  return api(`/api/tasks/${id}`);
}

export function createTask(body) {
  return api('/api/tasks', { method: 'POST', body });
}

export function updateTask(id, body) {
  return api(`/api/tasks/${id}`, { method: 'PUT', body });
}

export function deleteTask(id) {
  return api(`/api/tasks/${id}`, { method: 'DELETE' });
}

export function addComment(taskId, text) {
  return api(`/api/tasks/${taskId}/comments`, { method: 'POST', body: { text } });
}

export function deleteComment(commentId) {
  return api(`/api/comments/${commentId}`, { method: 'DELETE' });
}
