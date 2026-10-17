import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Volume2,
  Bell,
  Palette,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  Key,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { soundManager } from '../lib/sound';
import { AppTheme } from '../types';

export const SettingsPage: React.FC = () => {
  const { user, preference, updatePreferences, status, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  // Durations
  const [focusDuration, setFocusDuration] = useState(25);
  const [shortBreakDuration, setShortBreakDuration] = useState(5);
  const [longBreakDuration, setLongBreakDuration] = useState(15);
  const [longBreakInterval, setLongBreakInterval] = useState(4);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(120);

  // App Toggles
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [timezone, setTimezone] = useState('UTC');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load preferences from context
  useEffect(() => {
    if (preference) {
      setFocusDuration(preference.focusDuration);
      setShortBreakDuration(preference.shortBreakDuration);
      setLongBreakDuration(preference.longBreakDuration);
      setLongBreakInterval(preference.longBreakInterval);
      setDailyGoalMinutes(preference.dailyGoalMinutes);
      setSoundEnabled(preference.soundEnabled);
      setNotificationsEnabled(preference.notificationsEnabled);
      setTimezone(preference.timezone || 'UTC');
    }
  }, [preference]);

  const handleTestSound = () => {
    soundManager.playSessionComplete();
  };

  const handleToggleNotifications = async () => {
    const nextVal = !notificationsEnabled;
    if (nextVal && typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
      } else {
        setNotificationsEnabled(false);
        alert('Notification permission was blocked in your browser settings.');
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      await updatePreferences({
        focusDuration,
        shortBreakDuration,
        longBreakDuration,
        longBreakInterval,
        dailyGoalMinutes,
        soundEnabled,
        notificationsEnabled,
        theme,
        timezone,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Preferences & Settings</h1>
        <p className="text-xs text-slate-400">
          Tailor study interval lengths, break cadence, audio chimes, and account behavior.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Status Alerts */}
        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-break-short/10 border border-break-short/30 text-break-short text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Preferences saved successfully! Future sessions will use these settings.</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Pomodoro Durations */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-xl bg-focus-500/10 text-focus-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Timer Durations</h2>
              <p className="text-xs text-slate-400">Set the default lengths for your study and rest periods</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Focus Duration (Mins)
              </label>
              <input
                type="number"
                min={5}
                max={120}
                required
                value={focusDuration}
                onChange={(e) => setFocusDuration(parseInt(e.target.value, 10) || 25)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Standard: 25 minutes</span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Short Break (Mins)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                required
                value={shortBreakDuration}
                onChange={(e) => setShortBreakDuration(parseInt(e.target.value, 10) || 5)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Standard: 5 minutes</span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Long Break (Mins)
              </label>
              <input
                type="number"
                min={5}
                max={90}
                required
                value={longBreakDuration}
                onChange={(e) => setLongBreakDuration(parseInt(e.target.value, 10) || 15)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Standard: 15 minutes</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Long Break Interval (Sessions)
              </label>
              <input
                type="number"
                min={1}
                max={12}
                required
                value={longBreakInterval}
                onChange={(e) => setLongBreakInterval(parseInt(e.target.value, 10) || 4)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Number of sessions before long break</span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Daily Study Goal (Minutes)
              </label>
              <input
                type="number"
                min={10}
                max={1440}
                required
                value={dailyGoalMinutes}
                onChange={(e) => setDailyGoalMinutes(parseInt(e.target.value, 10) || 120)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Target daily focus: {(dailyGoalMinutes / 60).toFixed(1)} hours
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-focus-400 flex-shrink-0" />
            <span>
              Guaranteed safety: Modifying durations applies to future sessions and never alters an active in-flight timer.
            </span>
          </div>
        </div>

        {/* Section 2: Audio & Notifications */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-xl bg-break-short/10 text-break-short">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Audio & Alerts</h2>
              <p className="text-xs text-slate-400">Configure audible chimes and browser notifications</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white">Harmonic Audio Chime</span>
                <p className="text-[11px] text-slate-400">
                  Plays a synthesized bell when a Pomodoro interval or break ends
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleTestSound}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
                >
                  Test Sound
                </button>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-4 h-4 accent-focus-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white">Browser Notifications</span>
                <p className="text-[11px] text-slate-400">
                  Alerts you when working in other tabs or minimized windows
                </p>
              </div>
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={handleToggleNotifications}
                className="w-4 h-4 accent-focus-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Visual Theme & Timezone */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-xl bg-break-long/10 text-break-long">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Appearance & Timezone</h2>
              <p className="text-xs text-slate-400">Theme mode and streak calculation timezone</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Theme
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as AppTheme)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500"
              >
                <option value="dark">Dark Theme (Default)</option>
                <option value="light">Light Theme</option>
                <option value="system">System Preference</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Timezone (For Daily Streaks)
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500"
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">Eastern Time (US / Canada)</option>
                <option value="America/Chicago">Central Time (US / Canada)</option>
                <option value="America/Denver">Mountain Time (US / Canada)</option>
                <option value="America/Los_Angeles">Pacific Time (US / Canada)</option>
                <option value="Europe/London">London (GMT / BST)</option>
                <option value="Europe/Paris">Paris / Berlin (CET)</option>
                <option value="Asia/Kolkata">India Standard Time (IST)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: System Diagnostics */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-focus-400" />
            <span>System & Infrastructure Diagnostics</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-focus-400" />
                <span className="font-semibold text-slate-300">Google OAuth 2.0</span>
              </div>
              <span
                className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                  status?.googleOAuth?.configured
                    ? 'bg-break-short/10 text-break-short border border-break-short/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {status?.googleOAuth?.configured ? 'Configured ✅' : 'Pending .env'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-focus-400" />
                <span className="font-semibold text-slate-300">PostgreSQL (Prisma)</span>
              </div>
              <span
                className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                  status?.database?.connected
                    ? 'bg-break-short/10 text-break-short border border-break-short/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {status?.database?.connected ? 'Connected ✅' : 'Pending DB'}
              </span>
            </div>
          </div>
        </div>

        {/* Section: Account & Sign Out */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Account & Authentication</h2>
              <p className="text-xs text-slate-400">Manage your active Google session and sign out</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center space-x-3.5">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-11 h-11 rounded-full ring-2 ring-focus-500/30 object-cover"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-slate-800 ring-2 ring-slate-700 flex items-center justify-center text-base font-bold text-white">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-white">{user?.name || 'Logged In Student'}</p>
                <p className="text-xs text-slate-400">{user?.email || 'Google Account'}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              id="settings-signout-button"
              className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of FocusFlow</span>
            </button>
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 rounded-2xl bg-focus-500 hover:bg-focus-600 text-white font-bold text-sm shadow-glow transition-all duration-200 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
};
