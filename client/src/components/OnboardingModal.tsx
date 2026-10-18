import React, { useState } from 'react';
import { Clock, BookOpen, Check, ArrowRight } from 'lucide-react';
import { Modal } from './Modal';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { LocalStorageRepository } from '../lib/storage';
import { Subject } from '../types';

const STARTER_SUBJECTS = [
  { name: 'Computer Science', color: '#4F7CFF' },
  { name: 'Mathematics', color: '#10B981' },
  { name: 'Machine Learning', color: '#7C3AED' },
  { name: 'Economics & Finance', color: '#F59E0B' },
  { name: 'Literature & Writing', color: '#EC4899' },
];

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartFirstSession: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onStartFirstSession,
}) => {
  const { user, updatePreferences, refreshSubjects, addSubject } = useAuth();
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(120);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    'Computer Science',
    'Mathematics',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSubject = (name: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const handleFinish = async (launchSession: boolean = false) => {
    setIsSubmitting(true);
    try {
      // 1. Update preferences
      await updatePreferences({
        hasCompletedOnboarding: true,
        dailyGoalMinutes,
      });

      // 2. Create chosen starter subjects
      for (const starter of STARTER_SUBJECTS) {
        if (selectedSubjects.includes(starter.name)) {
          const newSub: Subject = {
            id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            name: starter.name,
            color: starter.color,
            weeklyGoalMinutes: 300,
            createdAt: new Date().toISOString(),
          };
          addSubject(newSub);

          if (!user?.isGuest) {
            await apiRequest('/api/subjects', {
              method: 'POST',
              body: JSON.stringify({
                name: starter.name,
                color: starter.color,
                weeklyGoalMinutes: 300,
              }),
            }).catch(() => {});
          }
        }
      }

      await refreshSubjects();
      onClose();

      if (launchSession) {
        onStartFirstSession();
      }
    } catch (err) {
      console.error('Failed to save onboarding:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => handleFinish(false)} maxWidth="lg">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-blue-500/30 mx-auto flex items-center justify-center shadow-lg">
            <img src="/logo-sm.png" alt="Cognify" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Welcome to Cognify{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
          </h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Focus deeper. Learn smarter. The minimalist study app built for focused deep work.
          </p>
        </div>

        {/* The Pomodoro Principle */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>The 25/5 Pomodoro Method</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Study with laser focus for <strong className="text-white">25 minutes</strong>, followed by a{' '}
            <strong className="text-emerald-400">5-minute restorative break</strong>. Every 4 sessions,
            take a longer <strong className="text-violet-400">15-minute recharge</strong>.
          </p>
        </div>

        {/* Daily Study Goal */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Target Daily Study Goal
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[60, 120, 180, 240].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setDailyGoalMinutes(mins)}
                className={`py-2 px-3 rounded-xl text-center border text-xs font-semibold transition-all ${
                  dailyGoalMinutes === mins
                    ? 'border-focus-500 bg-focus-500/15 text-blue-400 shadow-sm'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                }`}
              >
                {mins / 60} hrs ({mins}m)
              </button>
            ))}
          </div>
        </div>

        {/* Starter Subjects */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Pick Starter Subjects (Optional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {STARTER_SUBJECTS.map((sub) => {
              const isSelected = selectedSubjects.includes(sub.name);
              return (
                <button
                  key={sub.name}
                  type="button"
                  onClick={() => toggleSubject(sub.name)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    isSelected
                      ? 'border-focus-500 bg-focus-500/10 text-white'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: sub.color }}
                  />
                  <span>{sub.name}</span>
                  {isSelected && <Check className="w-3 h-3 text-blue-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-between space-x-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleFinish(false)}
            className="text-xs text-slate-400 hover:text-white px-3 py-2 rounded-xl transition-colors"
          >
            Skip for now
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleFinish(true)}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-focus-500 hover:bg-focus-600 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
          >
            <span>{isSubmitting ? 'Setting up...' : 'Start First Session'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
