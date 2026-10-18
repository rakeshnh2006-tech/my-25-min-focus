import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { apiRequest } from '../lib/api';
import { LocalStorageRepository } from '../lib/storage';
import { Subject } from '../types';

const COLOR_PALETTE = [
  '#4F7CFF', // Electric Blue (Primary)
  '#7C3AED', // Violet (Secondary)
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#F43F5E', // Rose
];

const STARTER_SUGGESTIONS = [
  { name: 'Computer Science', color: '#4F7CFF', description: 'Algorithms, systems, and software engineering' },
  { name: 'Mathematics & Stats', color: '#10B981', description: 'Calculus, linear algebra, and statistical modeling' },
  { name: 'Machine Learning', color: '#7C3AED', description: 'Neural networks, optimization, and data pipelines' },
  { name: 'Economics & Finance', color: '#F59E0B', description: 'Markets, economic principles, and quantitative analysis' },
];

export const SubjectsPage: React.FC = () => {
  const { user, subjects, refreshSubjects, addSubject, deleteSubject } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#4F7CFF');
  const [weeklyGoalHours, setWeeklyGoalHours] = useState(5);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal state
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingSubject(null);
    setName('');
    setDescription('');
    setColor('#4F7CFF');
    setWeeklyGoalHours(5);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (sub: Subject) => {
    setEditingSubject(sub);
    setName(sub.name);
    setDescription(sub.description || '');
    setColor(sub.color || '#4F7CFF');
    setWeeklyGoalHours(Math.round((sub.weeklyGoalMinutes || 0) / 60));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Subject name is required');
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      weeklyGoalMinutes: Math.max(0, weeklyGoalHours * 60),
    };

    try {
      if (editingSubject) {
        const updated: Subject = {
          ...editingSubject,
          ...payload,
        };
        LocalStorageRepository.saveSubject(updated);

        if (!user?.isGuest) {
          try {
            await apiRequest(`/api/subjects/${editingSubject.id}`, {
              method: 'PATCH',
              body: JSON.stringify(payload),
            });
          } catch {
            // Local update succeeded
          }
        }
      } else {
        const newSubject: Subject = {
          id: 'sub_' + Date.now(),
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          weeklyGoalMinutes: Math.max(0, weeklyGoalHours * 60),
          createdAt: new Date().toISOString(),
        };
        addSubject(newSubject);

        if (!user?.isGuest) {
          try {
            await apiRequest('/api/subjects', {
              method: 'POST',
              body: JSON.stringify(payload),
            });
          } catch {
            // Local update succeeded
          }
        }
      }

      setIsModalOpen(false);
      refreshSubjects();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save subject');
    }
  };

  const handleDeleteSubject = async () => {
    if (!deletingSubjectId) return;
    try {
      deleteSubject(deletingSubjectId);
      if (!user?.isGuest) {
        try {
          await apiRequest(`/api/subjects/${deletingSubjectId}`, { method: 'DELETE' });
        } catch {
          // Local delete succeeded
        }
      }
      setDeletingSubjectId(null);
      refreshSubjects();
    } catch (err) {
      console.error('Failed to delete subject:', err);
    }
  };

  const addStarterSubject = async (starter: { name: string; color: string; description: string }) => {
    try {
      const newSubject: Subject = {
        id: 'sub_' + Date.now(),
        name: starter.name,
        color: starter.color,
        description: starter.description,
        weeklyGoalMinutes: 300,
        createdAt: new Date().toISOString(),
      };
      addSubject(newSubject);

      if (!user?.isGuest) {
        try {
          await apiRequest('/api/subjects', {
            method: 'POST',
            body: JSON.stringify({
              name: starter.name,
              color: starter.color,
              description: starter.description,
              weeklyGoalMinutes: 300,
            }),
          });
        } catch {
          // Local add succeeded
        }
      }
      refreshSubjects();
    } catch (err) {
      console.error('Failed to add starter subject:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">Academic Subjects</h1>
          <p className="text-xs text-[#94A3B8]">
            Organize coursework by topic, assign color themes, and track progress against weekly targets.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-focus-500 hover:bg-focus-600 text-white font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Subject</span>
        </button>
      </div>

      {/* Quick Starter Suggestions */}
      {subjects.length < 3 && (
        <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Quick Suggestions &mdash; 1-Click Setup</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STARTER_SUGGESTIONS.filter(
              (s) => !subjects.some((sub) => sub.name.toLowerCase() === s.name.toLowerCase())
            ).map((starter) => (
              <button
                key={starter.name}
                onClick={() => addStarterSubject(starter)}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-all group"
              >
                <div className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: starter.color }}
                  />
                  <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                    + {starter.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{starter.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.length > 0 ? (
          subjects.map((sub) => {
            const weeklyHoursGoal = Math.round((sub.weeklyGoalMinutes || 0) / 60);
            const totalHours = Number(((sub.totalFocusMinutes || 0) / 60).toFixed(1));
            return (
              <div
                key={sub.id}
                className="bg-[#111827] rounded-2xl p-6 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between relative overflow-hidden group"
              >
                {/* Accent top color strip */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: sub.color }}
                />

                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: sub.color }}
                      />
                      <h2 className="text-lg font-bold text-white tracking-tight truncate">
                        {sub.name}
                      </h2>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditModal(sub)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        title="Edit subject"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingSubjectId(sub.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Delete subject"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {sub.description && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                      {sub.description}
                    </p>
                  )}
                </div>

                {/* Subject Statistics */}
                <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                        Study Time
                      </span>
                      <span className="text-xs font-bold text-white mt-0.5 block">
                        {totalHours}h
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                        Sessions
                      </span>
                      <span className="text-xs font-bold text-blue-400 mt-0.5 block">
                        {sub.completedSessionsCount || 0}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                        Tasks
                      </span>
                      <span className="text-xs font-bold text-slate-300 mt-0.5 block">
                        {sub.taskCount || 0}
                      </span>
                    </div>
                  </div>

                  {weeklyHoursGoal > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Weekly Goal:</span>
                      <span className="font-semibold text-slate-200">
                        {weeklyHoursGoal} hours / week
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full bg-[#111827] rounded-2xl p-12 text-center space-y-3 border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500">
              <BookOpen className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-white">No subjects added yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Add your current courses or subjects to categorize your focused study sessions.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-2 text-xs font-bold text-blue-400 hover:underline"
            >
              + Create your first subject
            </button>
          </div>
        )}
      </div>

      {/* Create / Edit Subject Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSubject ? 'Edit Subject' : 'Create Subject'}
      >
        <form onSubmit={handleSaveSubject} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Subject Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Distributed Systems"
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
              placeholder="Course code, professor, or notes..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Subject Color
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-white shadow-lg' : 'hover:scale-110 opacity-80'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Weekly Study Goal (Hours)
            </label>
            <input
              type="number"
              min={0}
              max={60}
              value={weeklyGoalHours}
              onChange={(e) => setWeeklyGoalHours(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500"
            />
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
              {editingSubject ? 'Save Changes' : 'Create Subject'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingSubjectId)}
        onClose={() => setDeletingSubjectId(null)}
        title="Delete Subject?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Deleting this subject will not delete your past sessions or tasks; they will simply be unassigned to general study.
          </p>
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={() => setDeletingSubjectId(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteSubject}
              className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-colors"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
