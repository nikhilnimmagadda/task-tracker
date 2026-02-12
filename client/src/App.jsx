import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import Controls from './components/Controls';
import TaskList from './components/TaskList';
import TaskModal from './components/TaskModal';
import { fetchTasks, fetchAllTasks, fetchTask, createTask, updateTask, deleteTask as apiDeleteTask, addComment, deleteComment } from './api';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('priority');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const loadTasks = useCallback(async () => {
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
  }, [filter, sort]);

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

  return (
    <div className="app">
      <Header />
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
    </div>
  );
}
