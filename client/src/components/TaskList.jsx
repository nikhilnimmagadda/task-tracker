import React from 'react';
import TaskCard from './TaskCard';

export default function TaskList({ tasks, loading, onTaskClick }) {
  if (loading) {
    return (
      <div className="task-list">
        <div className="loading">Loading tasks...</div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="task-list">
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <p>No tasks yet. Click <strong>+ New Task</strong> to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-list">
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
      ))}
    </div>
  );
}
