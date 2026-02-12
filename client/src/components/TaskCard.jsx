import React from 'react';
import { PRIORITY_LABELS, STATUS_LABELS, timeAgo } from '../utils';

export default function TaskCard({ task, onClick }) {
  return (
    <div
      className={`task-card status-${task.status}`}
      onClick={onClick}
    >
      <div className={`priority-indicator priority-${task.priority}`} />
      <div className="task-content">
        <div className="task-header">
          <div className="task-title">{task.title}</div>
          <div className="task-badges">
            <span className={`badge badge-${task.status}`}>
              {STATUS_LABELS[task.status]}
            </span>
            <span className="badge-priority">{PRIORITY_LABELS[task.priority]}</span>
          </div>
        </div>
        {task.description && <div className="task-desc">{task.description}</div>}
        <div className="task-footer">
          <div className="progress-bar-container">
            <div
              className={`progress-bar-fill ${task.progress >= 80 ? 'high' : ''}`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <div className="task-meta">
            <span>{task.progress}%</span>
            <span>{timeAgo(task.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
