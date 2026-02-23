import React, { useState, useEffect, useCallback } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import Controls from './components/Controls';
import TaskList from './components/TaskList';
import TaskModal from './components/TaskModal';
import NotesApp from './components/NotesApp';
import logger from './logger';
import { fetchTasks, fetchAllTasks, fetchTask, createTask, updateTask, deleteTask as apiDeleteTask, addComment, deleteComment, setCredential } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('priority');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('google_access_token');
    if (token) {
      // Validate the stored token is still valid
      fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Token expired');
          return res.json();
        })
        .then(profile => {
          setCredential(token);
          setUser({ name: profile.name, email: profile.email });
          logger.info('[App] Session restored from localStorage', { email: profile.email });
        })
        .catch(() => {
          localStorage.removeItem('google_access_token');
          logger.info('[App] Stored token expired, cleared');
        });
    }
  }, []);

  const isAuthenticated = !!user;

  const handleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: (response) => {
      // Use the id_token from the implicit flow
      // We need to exchange the access_token for user info
      fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${response.access_token}` }
      })
        .then(res => res.json())
        .then(profile => {
          // Store access token as our credential
          setCredential(response.access_token);
          localStorage.setItem('google_access_token', response.access_token);
          setUser({ name: profile.name, email: profile.email });
          logger.info('[App] Google login success', { email: profile.email });
        })
        .catch(err => logger.error('[App] Failed to fetch user profile', err));
    },
    onError: (error) => logger.error('[App] Google login failed', error),
  });

  const handleLogout = () => {
    googleLogout();
    setUser(null);
    setCredential(null);
    localStorage.removeItem('google_credential');
    localStorage.removeItem('google_access_token');
    logger.info('[App] User signed out');
  };

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
            <p>Use your Google account to access your tasks and notes.</p>
            <button className="btn btn-primary btn-login" onClick={() => handleLogin()}>
              Sign in with Google
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
        userName={user?.name}
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
