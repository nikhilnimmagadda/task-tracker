import React, { useState, useEffect, useRef } from 'react';
import CommentSection from './CommentSection';

export default function TaskModal({ task, onClose, onSave, onDelete, onAddComment, onDeleteComment }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(3);
  const [status, setStatus] = useState('todo');
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);

  const isEditing = !!task;

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || 3);
      setStatus(task.status || 'todo');
      setProgress(task.progress || 0);
    }
    setTimeout(() => titleRef.current?.focus(), 100);
  }, [task]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        title,
        description,
        priority: parseInt(priority),
        status,
        progress: parseInt(progress),
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay open" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Task' : 'New Task'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} id="taskForm">
          <div className="form-group">
            <label htmlFor="taskTitleInput">Title *</label>
            <input
              ref={titleRef}
              type="text"
              id="taskTitleInput"
              placeholder="What needs to be done?"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="taskDesc">Description</label>
            <textarea
              id="taskDesc"
              rows="3"
              placeholder="Add details..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="taskPriority">Priority</label>
              <select
                id="taskPriority"
                value={priority}
                onChange={e => setPriority(e.target.value)}
              >
                <option value="1">🔴 Critical</option>
                <option value="2">🟠 High</option>
                <option value="3">🟡 Medium</option>
                <option value="4">🔵 Low</option>
                <option value="5">⚪ Minimal</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="taskStatus">Status</label>
              <select
                id="taskStatus"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="taskProgress">Progress: {progress}%</label>
              <input
                type="range"
                id="taskProgress"
                min="0"
                max="100"
                value={progress}
                onChange={e => setProgress(e.target.value)}
              />
            </div>
          </div>

          {isEditing && (
            <CommentSection
              comments={task.comments || []}
              taskId={task.id}
              onAddComment={onAddComment}
              onDeleteComment={onDeleteComment}
            />
          )}

          <div className="form-actions">
            {isEditing && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => onDelete(task.id)}
              >
                Delete
              </button>
            )}
            <div className="form-actions-right" style={!isEditing ? { marginLeft: 'auto' } : undefined}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
