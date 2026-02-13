import React, { useState, useEffect, useCallback } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import Controls from './components/Controls';
import TaskList from './components/TaskList';
import TaskModal from './components/TaskModal';
import NotesApp from './components/NotesApp';
import { loginRequest } from './authConfig';
import { fetchTasks, fetchAllTasks, fetchTask, createTask, updateTask, deleteTask as apiDeleteTask, addComment, deleteComment } from './api';

export default function App() {
  const isAuthenticated = useIsAuthenticated();
  const { instance, inProgress } = useMsal();
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('priority');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const handleLogin = () => instance.loginPopup(loginRequest);
  const handleLogout = () => instance.logoutPopup({ postLogoutRedirectUri: '/' });
  const account = instance.getActiveAccount();

  const loadTasks = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [filtered, all] = await Promise.all([
        fetchTasks(filter, sort),
        fetchAllTasks(),
      ]);
      setTasks(filtered);
      setAllTasks(all);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [filter, sort, isAuthenticated]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleNewTask = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const handleEditTask = async (id) => {
    try {
      const data = await fetchTask(id);
      setEditingTask(data);
      setModalOpen(true);
    } catch {
      alert('Could not load task');
    }
  };

  const handleSaveTask = async (taskData) => {
    if (editingTask) {
      await updateTask(editingTask.id, taskData);
    } else {
      await createTask(taskData);
    }
    setModalOpen(false);
    setEditingTask(null);
    loadTasks();
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Delete this task and all its comments?')) return;
    await apiDeleteTask(id);
    setModalOpen(false);
    setEditingTask(null);
    loadTasks();
  };

  const handleAddComment = async (taskId, text) => {
    await addComment(taskId, text);
    const data = await fetchTask(taskId);
    setEditingTask(data);
  };

  const handleDeleteComment = async (commentId, taskId) => {
    await deleteComment(commentId);
    const data = await fetchTask(taskId);
    setEditingTask(data);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingTask(null);
  };

  // Show loading while MSAL is initializing
  if (inProgress !== InteractionStatus.None) {
    return (
      <div className="app">
        <div className="loading">Authenticating...</div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="app">
        <header>
          <h1>📋 Task Tracker</h1>
          <p className="subtitle">Track your progress, manage priorities, take notes</p>
        </header>
        <div className="login-prompt">
          <div className="login-card">
            <div className="login-icon">🔐</div>
            <h2>Sign in to continue</h2>
            <p>Use your Microsoft account to access your tasks and notes.</p>
            <button className="btn btn-primary btn-login" onClick={handleLogin}>
              Sign in with Microsoft
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userName={account?.name}
        onLogout={handleLogout}
      />
      {activeTab === 'tasks' ? (
        <>
          <Controls
            filter={filter}
            sort={sort}
            onFilterChange={setFilter}
            onSortChange={setSort}
            onNewTask={handleNewTask}
          />
          <StatsBar tasks={allTasks} />
          <TaskList tasks={tasks} loading={loading} onTaskClick={handleEditTask} />
          {modalOpen && (
            <TaskModal
              task={editingTask}
              onClose={handleCloseModal}
              onSave={handleSaveTask}
              onDelete={handleDeleteTask}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
            />
          )}
        </>
      ) : (
        <NotesApp />
      )}
    </div>
  );
}
