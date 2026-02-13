import React, { useState } from 'react';
import { timeAgo } from '../utils';

export default function PageList({ pages, selectedId, onSelect, onCreate, onDelete }) {
  const [newTitle, setNewTitle] = useState('');
  const [showNew, setShowNew] = useState(false);

  const handleCreate = (e) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    onCreate(title);
    setNewTitle('');
    setShowNew(false);
  };

  return (
    <div className="notes-section">
      <div className="notes-section-header">
        <h3>📄 Pages</h3>
        <button className="btn-icon" onClick={() => setShowNew(!showNew)} title="New page">+</button>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="notes-inline-form">
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Page title..."
            autoFocus
            maxLength={100}
          />
          <button type="submit" className="btn-icon" title="Create">✓</button>
          <button type="button" className="btn-icon" onClick={() => setShowNew(false)} title="Cancel">✕</button>
        </form>
      )}

      <ul className="notes-list">
        {pages.length === 0 && !showNew && (
          <li className="notes-list-empty">No pages yet</li>
        )}
        {pages.map(page => (
          <li
            key={page.id}
            className={`notes-list-item ${selectedId === page.id ? 'active' : ''}`}
            onClick={() => onSelect(page)}
          >
            <div className="notes-page-info">
              <span className="notes-list-name">{page.title}</span>
              <span className="notes-page-meta">{timeAgo(page.updatedAt)}</span>
            </div>
            <span className="notes-list-actions" onClick={e => e.stopPropagation()}>
              <button className="btn-icon-sm" onClick={() => onDelete(page.id)} title="Delete">🗑️</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
