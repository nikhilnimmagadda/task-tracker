import React, { useState, useEffect, useCallback } from 'react';
import FolderList from './FolderList';
import PageList from './PageList';
import PageEditor from './PageEditor';
import { fetchFolders, createFolder, updateFolder, deleteFolder, fetchPages, createPage, updatePage, deletePage } from '../notesApi';

export default function NotesApp() {
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadFolders = useCallback(async () => {
    try {
      const data = await fetchFolders();
      setFolders(data);
    } catch {
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const loadPages = useCallback(async (folderId) => {
    if (!folderId) { setPages([]); return; }
    try {
      const data = await fetchPages(folderId);
      setPages(data);
    } catch {
      setPages([]);
    }
  }, []);

  useEffect(() => {
    loadPages(selectedFolderId);
  }, [selectedFolderId, loadPages]);

  // ─── Folder handlers ─────────────────────────────
  const handleCreateFolder = async (name) => {
    await createFolder(name);
    await loadFolders();
  };

  const handleRenameFolder = async (id, name) => {
    await updateFolder(id, name);
    await loadFolders();
  };

  const handleDeleteFolder = async (id) => {
    if (!window.confirm('Delete this folder and all its pages?')) return;
    await deleteFolder(id);
    if (selectedFolderId === id) {
      setSelectedFolderId(null);
      setSelectedPage(null);
      setPages([]);
    }
    await loadFolders();
  };

  // ─── Page handlers ───────────────────────────────
  const handleCreatePage = async (title) => {
    if (!selectedFolderId) return;
    const page = await createPage(selectedFolderId, title);
    await loadPages(selectedFolderId);
    setSelectedPage(page);
  };

  const handleSelectPage = (page) => {
    setSelectedPage(page);
  };

  const handleSavePage = async (id, data) => {
    const updated = await updatePage(id, data);
    setSelectedPage(updated);
    await loadPages(selectedFolderId);
  };

  const handleDeletePage = async (id) => {
    if (!window.confirm('Delete this page?')) return;
    await deletePage(id);
    if (selectedPage?.id === id) setSelectedPage(null);
    await loadPages(selectedFolderId);
  };

  const handleSelectFolder = (id) => {
    setSelectedFolderId(id);
    setSelectedPage(null);
  };

  return (
    <div className="notes-app">
      <div className="notes-sidebar">
        <FolderList
          folders={folders}
          loading={loading}
          selectedId={selectedFolderId}
          onSelect={handleSelectFolder}
          onCreate={handleCreateFolder}
          onRename={handleRenameFolder}
          onDelete={handleDeleteFolder}
        />
        {selectedFolderId && (
          <PageList
            pages={pages}
            selectedId={selectedPage?.id}
            onSelect={handleSelectPage}
            onCreate={handleCreatePage}
            onDelete={handleDeletePage}
          />
        )}
      </div>
      <div className="notes-content">
        {selectedPage ? (
          <PageEditor page={selectedPage} onSave={handleSavePage} />
        ) : (
          <div className="notes-empty">
            <div className="empty-icon">📝</div>
            <p>{selectedFolderId ? 'Select or create a page' : 'Select or create a folder to get started'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
