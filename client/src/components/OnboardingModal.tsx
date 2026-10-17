import React, { useState } from 'react';
import { Flame, Clock, BookOpen, Check, ArrowRight } from 'lucide-react';
import { Modal } from './Modal';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';

const STARTER_SUBJECTS = [
  { name: 'Computer Science', color: '#3b82f6' },
  { name: 'Mathematics', color: '#10b981' },
  { name: 'Organic Chemistry', color: '#8b5cf6' },
  { name: 'History & Literature', color: '#f59e0b' },
  { name: 'Economics', color: '#ec4899' },
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
  const { user, updatePreferences, refreshSubjects } = useAuth();
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(120);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Computer Science', 'Mathematics']);
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-focus-600 to-focus-400 mx-auto flex items-center justify-center shadow-glow">
            <Flame className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Welcome to FocusFlow{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
          </h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            The study platform built to help college students enter flow states and make every hour count.
          </p>
        </div>

        {/* The Pomodoro Principle */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-focus-400 uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>The 25/5 Pomodoro Method</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Study with laser intensity for <strong className="text-white">25 minutes</strong>, followed by a{' '}
            <strong className="text-break-short">5-minute restorative break</strong>. Every 4 sessions,
            take a longer <strong className="text-break-long">15-minute recharge</strong>.
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
                    ? 'border-focus-500 bg-focus-500/15 text-focus-400 shadow-sm'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
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
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: sub.color }}
                  />
                  <span>{sub.name}</span>
                  {isSelected && <Check className="w-3 h-3 text-focus-400" />}
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
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-focus-500 hover:bg-focus-600 text-white text-xs font-bold shadow-glow transition-all disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Setting up...' : 'Start First Session'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
