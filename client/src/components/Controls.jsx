import React from 'react';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export default function Controls({ filter, sort, onFilterChange, onSortChange, onNewTask }) {
  return (
    <div className="controls">
      <div className="filters">
        {FILTERS.map(f => (
          <button
            key={f.value}
            className={`filter-btn ${filter === f.value ? 'active' : ''}`}
            onClick={() => onFilterChange(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="sort-controls">
        <label>Sort by:</label>
        <select value={sort} onChange={e => onSortChange(e.target.value)}>
          <option value="priority">Priority</option>
          <option value="date">Date</option>
          <option value="progress">Progress</option>
        </select>
      </div>
      <button className="btn btn-primary" onClick={onNewTask}>
        + New Task
      </button>
    </div>
  );
}
