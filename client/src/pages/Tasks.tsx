import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  CheckCircle2,
  Calendar,
  Clock,
  Play,
  Trash2,
  Edit2,
  Filter,
  AlertCircle,
  CheckSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';
import { Modal } from '../components/Modal';
import { apiRequest } from '../lib/api';
import { LocalStorageRepository } from '../lib/storage';
import { StudyTask, TaskPriority } from '../types';

interface TasksPageProps {
  onNavigate: (page: string) => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({ onNavigate }) => {
  const { user, subjects } = useAuth();
  const { setSelectedSubjectId, setSelectedTaskId } = useTimer();

  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'completed'>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [estimatedSessions, setEstimatedSessions] = useState(2);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm modal state
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      let query = `/api/tasks?filter=${filter}`;
      if (selectedSubjectFilter !== 'ALL') {
        query += `&subjectId=${selectedSubjectFilter}`;
      }
      const data = await apiRequest<{ tasks: StudyTask[] }>(query);
      setTasks(data.tasks);
      LocalStorageRepository.saveTasks(data.tasks);
    } catch {
      // Local cache fallback if server/db is unreachable
      let localTasks = LocalStorageRepository.getTasks();
      if (selectedSubjectFilter !== 'ALL') {
        localTasks = localTasks.filter((t) => t.subjectId === selectedSubjectFilter);
      }
      if (filter === 'completed') {
        localTasks = localTasks.filter((t) => t.isCompleted);
      } else {
        localTasks = localTasks.filter((t) => !t.isCompleted);
      }
      setTasks(localTasks);
    }
  }, [filter, selectedSubjectFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const openCreateModal = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setSubjectId('');
    setDueDate('');
    setPriority('MEDIUM');
    setEstimatedSessions(2);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task: StudyTask) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setSubjectId(task.subjectId || '');
    setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    setPriority(task.priority);
    setEstimatedSessions(task.estimatedSessions);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Task title is required');
      return;
    }

    const payload: Partial<StudyTask> = {
      title: title.trim(),
      description: description.trim() || undefined,
      subjectId: subjectId || undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      priority,
      estimatedSessions,
    };

    try {
      if (editingTask) {
        const updated: StudyTask = {
          ...editingTask,
          ...payload,
        };
        LocalStorageRepository.saveTask(updated);

        try {
          await apiRequest(`/api/tasks/${editingTask.id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
        } catch {
          // Local update succeeded, ignore temporary server failure
        }
      } else {
        const newTask: StudyTask = {
          id: 'task_' + Date.now(),
          title: title.trim(),
          description: description.trim() || undefined,
          subjectId: subjectId || undefined,
          priority,
          estimatedSessions,
          completedSessions: 0,
          isCompleted: false,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          createdAt: new Date().toISOString(),
        };
        LocalStorageRepository.saveTask(newTask);

        try {
          await apiRequest('/api/tasks', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        } catch {
          // Local update succeeded
        }
      }

      setIsModalOpen(false);
      fetchTasks();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save task');
    }
  };

  const handleDeleteTask = async () => {
    if (!deletingTaskId) return;
    try {
      LocalStorageRepository.deleteTask(deletingTaskId);
      try {
        await apiRequest(`/api/tasks/${deletingTaskId}`, { method: 'DELETE' });
      } catch {
        // Local delete succeeded
      }
      setDeletingTaskId(null);
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const toggleTaskCompletion = async (task: StudyTask) => {
    try {
      LocalStorageRepository.toggleTask(task.id);
      try {
        await apiRequest(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ isCompleted: !task.isCompleted }),
        });
      } catch {
        // Local update succeeded
      }
      fetchTasks();
    } catch (err) {
      console.error('Failed to toggle completion:', err);
    }
  };

  const handleFocusOnTask = (task: StudyTask) => {
    setSelectedTaskId(task.id);
    if (task.subjectId) {
      setSelectedSubjectId(task.subjectId);
    }
    onNavigate('dashboard');
  };

  const priorityColors = {
    HIGH: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    MEDIUM: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    LOW: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">Study Tasks</h1>
          <p className="text-xs text-[#94A3B8]">
            Plan coursework, break assignments into focus intervals, and track milestones.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-focus-500 hover:bg-focus-600 text-white font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Tabs & Subject Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-[#111827] border border-slate-800 w-fit overflow-x-auto">
          {(['all', 'today', 'upcoming', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filter === tab
                  ? 'bg-focus-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'all' ? 'All Tasks' : tab}
            </button>
          ))}
        </div>

        {/* Filter by Subject */}
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="bg-[#111827] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-focus-500"
          >
            <option value="ALL">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <div
              key={task.id}
              className="bg-[#111827] rounded-2xl p-4 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="flex items-start space-x-3.5 overflow-hidden">
                <button
                  onClick={() => toggleTaskCompletion(task)}
                  className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors flex-shrink-0 ${
                    task.isCompleted
                      ? 'bg-focus-500 border-focus-500 text-white'
                      : 'border-slate-700 hover:border-focus-400 text-transparent'
                  }`}
                  aria-label="Toggle completed"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span
                      className={`text-sm font-bold ${
                        task.isCompleted ? 'line-through text-slate-500' : 'text-white'
                      }`}
                    >
                      {task.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        priorityColors[task.priority]
                      }`}
                    >
                      {task.priority}
                    </span>
                    {task.subject && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: `${task.subject.color}20`,
                          color: task.subject.color,
                        }}
                      >
                        {task.subject.name}
                      </span>
                    )}
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-400 line-clamp-1">{task.description}</p>
                  )}

                  <div className="flex items-center space-x-4 text-[11px] text-slate-400 pt-0.5">
                    {task.dueDate && (
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                      </span>
                    )}
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-focus-400" />
                      <span>
                        {task.completedSessions}/{task.estimatedSessions} Focus Sessions
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 self-end sm:self-center flex-shrink-0">
                {!task.isCompleted && (
                  <button
                    onClick={() => handleFocusOnTask(task)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-focus-500/10 hover:bg-focus-500 text-focus-400 hover:text-white border border-focus-500/30 text-xs font-semibold transition-all"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Focus</span>
                  </button>
                )}
                <button
                  onClick={() => openEditModal(task)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Edit task"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingTaskId(task.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-[#111827] rounded-2xl p-12 text-center space-y-3 border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500">
              <CheckSquare className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-white">No tasks found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {filter === 'completed'
                ? "You haven't completed any tasks in this filter yet."
                : 'Create tasks to organize your study sessions and stay on track.'}
            </p>
            {filter !== 'completed' && (
              <button
                onClick={openCreateModal}
                className="mt-2 text-xs font-bold text-focus-400 hover:underline"
              >
                + Add your first task
              </button>
            )}
          </div>
        )}
      </div>

      {/* Task Creation / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? 'Edit Study Task' : 'Create Study Task'}
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 4 Practice Problems"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-focus-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key notes, textbook pages, or specific objectives..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Subject
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500"
              >
                <option value="">No Subject</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Estimated Sessions
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={estimatedSessions}
                onChange={(e) => setEstimatedSessions(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-focus-500 hover:bg-focus-600 text-white font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95"
            >
              {editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingTaskId)}
        onClose={() => setDeletingTaskId(null)}
        title="Delete Study Task?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to delete this task? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={() => setDeletingTaskId(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteTask}
              className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
