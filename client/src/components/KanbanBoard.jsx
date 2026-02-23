import React, { useState, useRef } from 'react';
import { PRIORITY_LABELS, timeAgo } from '../utils';

const COLUMNS = [
  { id: 'todo', label: 'To Do', icon: '📋', color: 'var(--info)' },
  { id: 'in-progress', label: 'In Progress', icon: '🔄', color: 'var(--warning)' },
  { id: 'done', label: 'Done', icon: '✅', color: 'var(--success)' },
];

function KanbanCard({ task, onClick, onDragStart }) {
  return (
    <div
      className={`kanban-card priority-border-${task.priority}`}
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onClick(task.id)}
    >
      <div className="kanban-card-header">
        <span className="kanban-card-title">{task.title}</span>
        <span className="badge-priority badge-priority-small">{PRIORITY_LABELS[task.priority]}</span>
      </div>
      {task.description && (
        <p className="kanban-card-desc">{task.description}</p>
      )}
      <div className="kanban-card-footer">
        <div className="kanban-progress">
          <div className="kanban-progress-bar">
            <div
              className={`kanban-progress-fill ${task.progress >= 80 ? 'high' : ''}`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="kanban-progress-text">{task.progress}%</span>
        </div>
        <span className="kanban-card-time">{timeAgo(task.createdAt)}</span>
      </div>
    </div>
  );
}

export default function KanbanBoard({ tasks, loading, onTaskClick, onStatusChange, onNewTask }) {
  const [dragOverCol, setDragOverCol] = useState(null);
  const dragTaskId = useRef(null);

  const handleDragStart = (e, taskId) => {
    dragTaskId.current = taskId;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = dragTaskId.current;
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      onStatusChange(taskId, newStatus);
    }
    dragTaskId.current = null;
  };

  if (loading) {
    return (
      <div className="kanban-board">
        <div className="loading">Loading board...</div>
      </div>
    );
  }

  return (
    <div className="kanban-board">
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id);
        return (
          <div
            key={col.id}
            className={`kanban-column ${dragOverCol === col.id ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="kanban-column-header">
              <span className="kanban-column-title">
                {col.icon} {col.label}
              </span>
              <span className="kanban-column-count" style={{ background: col.color }}>
                {colTasks.length}
              </span>
            </div>
            <div className="kanban-column-body">
              {colTasks.length === 0 ? (
                <div className="kanban-empty">Drop tasks here</div>
              ) : (
                colTasks.map(task => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    onClick={onTaskClick}
                    onDragStart={handleDragStart}
                  />
                ))
              )}
            </div>
            {col.id === 'todo' && (
              <button className="kanban-add-btn" onClick={onNewTask}>
                + Add Task
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
