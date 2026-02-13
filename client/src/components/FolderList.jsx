import React, { useState } from 'react';

export default function FolderList({ folders, loading, selectedId, onSelect, onCreate, onRename, onDelete }) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [showNew, setShowNew] = useState(false);

  const handleCreate = (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    onCreate(name);
    setNewName('');
    setShowNew(false);
  };

  const startRename = (folder) => {
    setEditingId(folder.id);
    setEditName(folder.name);
  };

  const handleRename = (e) => {
    e.preventDefault();
    if (editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
  };

  if (loading) {
    return <div className="notes-section"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="notes-section">
      <div className="notes-section-header">
        <h3>📁 Folders</h3>
        <button className="btn-icon" onClick={() => setShowNew(!showNew)} title="New folder">+</button>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="notes-inline-form">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Folder name..."
            autoFocus
            maxLength={50}
          />
          <button type="submit" className="btn-icon" title="Create">✓</button>
          <button type="button" className="btn-icon" onClick={() => setShowNew(false)} title="Cancel">✕</button>
        </form>
      )}

      <ul className="notes-list">
        {folders.length === 0 && !showNew && (
          <li className="notes-list-empty">No folders yet</li>
        )}
        {folders.map(folder => (
          <li
            key={folder.id}
            className={`notes-list-item ${selectedId === folder.id ? 'active' : ''}`}
            onClick={() => onSelect(folder.id)}
          >
            {editingId === folder.id ? (
              <form onSubmit={handleRename} className="notes-inline-form" onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  autoFocus
                  maxLength={50}
                />
                <button type="submit" className="btn-icon">✓</button>
                <button type="button" className="btn-icon" onClick={() => setEditingId(null)}>✕</button>
              </form>
            ) : (
              <>
                <span className="notes-list-name">📁 {folder.name}</span>
                <span className="notes-list-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-icon-sm" onClick={() => startRename(folder)} title="Rename">✏️</button>
                  <button className="btn-icon-sm" onClick={() => onDelete(folder.id)} title="Delete">🗑️</button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
