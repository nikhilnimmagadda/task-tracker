import React from 'react';

export default function Header({ activeTab, onTabChange, userName, onLogout }) {
  return (
    <header>
      <div className="header-top">
        <h1>📋 Task Tracker</h1>
        {userName && (
          <div className="user-info">
            <span className="user-name">👤 {userName}</span>
            <button className="btn btn-secondary btn-small" onClick={onLogout}>
              Sign out
            </button>
          </div>
        )}
      </div>
      <p className="subtitle">Track your progress, manage priorities, take notes</p>
      <nav className="nav-tabs">
        <button
          className={`nav-tab${activeTab === 'tasks' ? ' active' : ''}`}
          onClick={() => onTabChange('tasks')}
        >
          📋 Tasks
        </button>
        <button
          className={`nav-tab${activeTab === 'kanban' ? ' active' : ''}`}
          onClick={() => onTabChange('kanban')}
        >
          📊 Board
        </button>
        <button
          className={`nav-tab${activeTab === 'notes' ? ' active' : ''}`}
          onClick={() => onTabChange('notes')}
        >
          📝 Notes
        </button>
      </nav>
    </header>
  );
}
