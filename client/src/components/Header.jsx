import React from 'react';

export default function Header({ activeTab, onTabChange }) {
  return (
    <header>
      <h1>📋 Task Tracker</h1>
      <p className="subtitle">Track your progress, manage priorities, take notes</p>
      <nav className="nav-tabs">
        <button
          className={`nav-tab${activeTab === 'tasks' ? ' active' : ''}`}
          onClick={() => onTabChange('tasks')}
        >
          📋 Tasks
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
