// ─── State ──────────────────────────────────────────
let tasks = [];
let currentFilter = 'all';
let currentSort = 'priority';

// ─── DOM Elements ───────────────────────────────────
const taskList = document.getElementById('taskList');
const statsBar = document.getElementById('statsBar');
const taskModal = document.getElementById('taskModal');
const taskForm = document.getElementById('taskForm');
const modalTitle = document.getElementById('modalTitle');
const taskIdInput = document.getElementById('taskId');
const titleInput = document.getElementById('taskTitleInput');
const descInput = document.getElementById('taskDesc');
const priorityInput = document.getElementById('taskPriority');
const statusInput = document.getElementById('taskStatus');
const progressInput = document.getElementById('taskProgress');
const progressValue = document.getElementById('progressValue');
const commentsSection = document.getElementById('commentsSection');
const commentList = document.getElementById('commentList');
const commentInput = document.getElementById('commentInput');
const addCommentBtn = document.getElementById('addCommentBtn');
const deleteTaskBtn = document.getElementById('deleteTaskBtn');
const sortSelect = document.getElementById('sortSelect');

// ─── API Helpers ────────────────────────────────────
async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error);
  }
  return res.json();
}

// ─── Load & Render ──────────────────────────────────
async function loadTasks() {
  try {
    const params = new URLSearchParams({ sort: currentSort });
    if (currentFilter !== 'all') params.set('status', currentFilter);
    tasks = await api(`/api/tasks?${params}`);
    renderTasks();
    renderStats();
  } catch (e) {
    taskList.innerHTML = `<div class="empty-state"><p>Error loading tasks</p></div>`;
  }
}

function renderStats() {
  api('/api/tasks').then(allTasks => {
    const total = allTasks.length;
    const todo = allTasks.filter(t => t.status === 'todo').length;
    const inProgress = allTasks.filter(t => t.status === 'in-progress').length;
    const done = allTasks.filter(t => t.status === 'done').length;
    const avgProgress = total ? Math.round(allTasks.reduce((s, t) => s + t.progress, 0) / total) : 0;

    statsBar.innerHTML = `
      <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Total Tasks</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--info)">${todo}</div><div class="stat-label">To Do</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--warning)">${inProgress}</div><div class="stat-label">In Progress</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--success)">${done}</div><div class="stat-label">Done</div></div>
      <div class="stat-card"><div class="stat-value">${avgProgress}%</div><div class="stat-label">Avg Progress</div></div>
    `;
  });
}

const priorityLabels = {
  1: '🔴 Critical',
  2: '🟠 High',
  3: '🟡 Medium',
  4: '🔵 Low',
  5: '⚪ Minimal'
};

const statusLabels = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'done': 'Done'
};

function renderTasks() {
  if (tasks.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <p>No tasks yet. Click <strong>+ New Task</strong> to get started!</p>
      </div>`;
    return;
  }

  taskList.innerHTML = tasks.map(task => `
    <div class="task-card status-${task.status}" data-id="${task.id}" onclick="openEditTask('${task.id}')">
      <div class="priority-indicator priority-${task.priority}"></div>
      <div class="task-content">
        <div class="task-header">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-badges">
            <span class="badge badge-${task.status}">${statusLabels[task.status]}</span>
            <span class="badge-priority">${priorityLabels[task.priority]}</span>
          </div>
        </div>
        ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-footer">
          <div class="progress-bar-container">
            <div class="progress-bar-fill ${task.progress >= 80 ? 'high' : ''}" style="width:${task.progress}%"></div>
          </div>
          <div class="task-meta">
            <span>${task.progress}%</span>
            <span>${timeAgo(task.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// ─── Modal Logic ────────────────────────────────────
function openModal() {
  taskModal.classList.add('open');
  setTimeout(() => titleInput.focus(), 100);
}

function closeModal() {
  taskModal.classList.remove('open');
  taskForm.reset();
  taskIdInput.value = '';
  progressValue.textContent = '0';
  commentsSection.style.display = 'none';
  deleteTaskBtn.style.display = 'none';
}

document.getElementById('addTaskBtn').addEventListener('click', () => {
  modalTitle.textContent = 'New Task';
  taskIdInput.value = '';
  taskForm.reset();
  progressValue.textContent = '0';
  commentsSection.style.display = 'none';
  deleteTaskBtn.style.display = 'none';
  openModal();
});

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);

taskModal.addEventListener('click', (e) => {
  if (e.target === taskModal) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ─── Edit Task ──────────────────────────────────────
async function openEditTask(id) {
  try {
    const data = await api(`/api/tasks/${id}`);
    modalTitle.textContent = 'Edit Task';
    taskIdInput.value = data.id;
    titleInput.value = data.title;
    descInput.value = data.description || '';
    priorityInput.value = data.priority;
    statusInput.value = data.status;
    progressInput.value = data.progress;
    progressValue.textContent = data.progress;
    deleteTaskBtn.style.display = 'block';

    // Render comments
    commentsSection.style.display = 'block';
    renderComments(data.comments || []);

    openModal();
  } catch (e) {
    alert('Could not load task');
  }
}

function renderComments(comments) {
  if (comments.length === 0) {
    commentList.innerHTML = '<div class="no-comments">No comments yet</div>';
    return;
  }
  commentList.innerHTML = comments.map(c => `
    <div class="comment-item">
      <div>
        <div class="comment-text">${escapeHtml(c.text)}</div>
        <div class="comment-time">${timeAgo(c.createdAt)}</div>
      </div>
      <button class="comment-delete" onclick="deleteComment(event, '${c.id}')" title="Delete comment">&times;</button>
    </div>
  `).join('');
}

// ─── Save Task ──────────────────────────────────────
taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    title: titleInput.value,
    description: descInput.value,
    priority: parseInt(priorityInput.value),
    status: statusInput.value,
    progress: parseInt(progressInput.value)
  };

  try {
    if (taskIdInput.value) {
      await api(`/api/tasks/${taskIdInput.value}`, { method: 'PUT', body });
    } else {
      await api('/api/tasks', { method: 'POST', body });
    }
    closeModal();
    loadTasks();
  } catch (e) {
    alert(e.message);
  }
});

// ─── Delete Task ────────────────────────────────────
deleteTaskBtn.addEventListener('click', async () => {
  if (!taskIdInput.value) return;
  if (!confirm('Delete this task and all its comments?')) return;
  try {
    await api(`/api/tasks/${taskIdInput.value}`, { method: 'DELETE' });
    closeModal();
    loadTasks();
  } catch (e) {
    alert(e.message);
  }
});

// ─── Comments ───────────────────────────────────────
addCommentBtn.addEventListener('click', async () => {
  const text = commentInput.value.trim();
  if (!text || !taskIdInput.value) return;
  try {
    await api(`/api/tasks/${taskIdInput.value}/comments`, { method: 'POST', body: { text } });
    commentInput.value = '';
    const data = await api(`/api/tasks/${taskIdInput.value}`);
    renderComments(data.comments || []);
  } catch (e) {
    alert(e.message);
  }
});

commentInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addCommentBtn.click();
  }
});

async function deleteComment(event, commentId) {
  event.stopPropagation();
  try {
    await api(`/api/comments/${commentId}`, { method: 'DELETE' });
    const data = await api(`/api/tasks/${taskIdInput.value}`);
    renderComments(data.comments || []);
  } catch (e) {
    alert(e.message);
  }
}

// ─── Progress Slider ────────────────────────────────
progressInput.addEventListener('input', () => {
  progressValue.textContent = progressInput.value;
});

// ─── Filters ────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    loadTasks();
  });
});

sortSelect.addEventListener('change', () => {
  currentSort = sortSelect.value;
  loadTasks();
});

// ─── Utilities ──────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

// ─── Init ───────────────────────────────────────────
loadTasks();
