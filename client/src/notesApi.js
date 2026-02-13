import { api } from './api';

// ─── Folders ────────────────────────────────────────
export function fetchFolders() {
  return api('/api/folders');
}

export function createFolder(name) {
  return api('/api/folders', { method: 'POST', body: { name } });
}

export function updateFolder(id, name) {
  return api(`/api/folders/${id}`, { method: 'PUT', body: { name } });
}

export function deleteFolder(id) {
  return api(`/api/folders/${id}`, { method: 'DELETE' });
}

// ─── Pages ──────────────────────────────────────────
export function fetchPages(folderId) {
  return api(`/api/folders/${folderId}/pages`);
}

export function fetchPage(id) {
  return api(`/api/pages/${id}`);
}

export function createPage(folderId, title, content = '') {
  return api(`/api/folders/${folderId}/pages`, { method: 'POST', body: { title, content } });
}

export function updatePage(id, data) {
  return api(`/api/pages/${id}`, { method: 'PUT', body: data });
}

export function deletePage(id) {
  return api(`/api/pages/${id}`, { method: 'DELETE' });
}
