import React, { useMemo } from 'react';

export default function StatsBar({ tasks }) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const done = tasks.filter(t => t.status === 'done').length;
    const avgProgress = total
      ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / total)
      : 0;
    return { total, todo, inProgress, done, avgProgress };
  }, [tasks]);

  return (
    <div className="stats-bar">
      <div className="stat-card">
        <div className="stat-value">{stats.total}</div>
        <div className="stat-label">Total Tasks</div>
      </div>
      <div className="stat-card">
        <div className="stat-value" style={{ color: 'var(--info)' }}>{stats.todo}</div>
        <div className="stat-label">To Do</div>
      </div>
      <div className="stat-card">
        <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.inProgress}</div>
        <div className="stat-label">In Progress</div>
      </div>
      <div className="stat-card">
        <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.done}</div>
        <div className="stat-label">Done</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats.avgProgress}%</div>
        <div className="stat-label">Avg Progress</div>
      </div>
    </div>
  );
}
