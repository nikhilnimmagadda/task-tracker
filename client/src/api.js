const BASE = '';

export async function api(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
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
