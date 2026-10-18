import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Volume2,
  Bell,
  Palette,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  Key,
  LogOut,
  User as UserIcon,
  Download,
  Trash2,
  Cloud,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { soundManager } from '../lib/sound';
import { LocalStorageRepository } from '../lib/storage';
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

  // Ambient Rain Test
  const [testRainPlaying, setTestRainPlaying] = useState(false);
  const [ambientVolume, setAmbientVolume] = useState(0.5);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDbGuide, setShowDbGuide] = useState(false);

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

  const handleToggleRain = () => {
    if (testRainPlaying) {
      soundManager.stopAmbientRain();
      setTestRainPlaying(false);
    } else {
      soundManager.startAmbientRain(ambientVolume);
      setTestRainPlaying(true);
    }
  };

  const handleVolumeChange = (vol: number) => {
    setAmbientVolume(vol);
    soundManager.setRainVolume(vol);
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

  const handleExportData = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      app: 'Cognify',
      version: '2.0.0',
      sessions: LocalStorageRepository.getSessions(),
      tasks: LocalStorageRepository.getTasks(),
      subjects: LocalStorageRepository.getSubjects(),
      preference: LocalStorageRepository.getPreferences(),
      streak: LocalStorageRepository.getStreak(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cognify_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLocalData = () => {
    if (
      window.confirm(
        'Are you sure you want to clear your local offline study data? This will reset local tasks, sessions, and subjects.'
      )
    ) {
      LocalStorageRepository.clearAll();
      window.location.reload();
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
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">Preferences & Settings</h1>
        <p className="text-xs text-[#94A3B8]">
          Customize interval lengths, soundscapes, notifications, and cloud sync.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Preferences updated successfully!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Timer Durations */}
        <div className="bg-[#111827] rounded-2xl p-6 border border-slate-800 space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Timer Durations</h2>
              <p className="text-xs text-slate-400">Default lengths in minutes for standard intervals</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Focus Duration (Mins)
              </label>
              <input
                type="number"
                min={5}
                max={120}
                value={focusDuration}
                onChange={(e) => setFocusDuration(parseInt(e.target.value, 10) || 25)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Short Break (Mins)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={shortBreakDuration}
                onChange={(e) => setShortBreakDuration(parseInt(e.target.value, 10) || 5)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Long Break (Mins)
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={longBreakDuration}
                onChange={(e) => setLongBreakDuration(parseInt(e.target.value, 10) || 15)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Long Break Interval
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={longBreakInterval}
                onChange={(e) => setLongBreakInterval(parseInt(e.target.value, 10) || 4)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Sessions before long break</span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Daily Focus Target (Mins)
              </label>
              <input
                type="number"
                min={15}
                max={720}
                step={15}
                value={dailyGoalMinutes}
                onChange={(e) => setDailyGoalMinutes(parseInt(e.target.value, 10) || 120)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Target: {Number((dailyGoalMinutes / 60).toFixed(1))} hours/day
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Audio & Ambient Soundscape */}
        <div className="bg-[#111827] rounded-2xl p-6 border border-slate-800 space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Audio & Ambient Sound</h2>
              <p className="text-xs text-slate-400">Harmonious chimes and procedural pink-noise rain</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white">Completion Chimes</span>
                <p className="text-[11px] text-slate-400">
                  Synthesized harmonic bells when intervals complete
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleTestSound}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
                >
                  Test Chime
                </button>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-4 h-4 accent-focus-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white">Procedural Ambient Rain</span>
                  <p className="text-[11px] text-slate-400">
                    Synthetic pink noise generator &mdash; no external audio downloads required
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleRain}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    testRainPlaying
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {testRainPlaying ? 'Stop Rain Preview' : 'Preview Rain'}
                </button>
              </div>

              {testRainPlaying && (
                <div className="flex items-center space-x-3 pt-2">
                  <span className="text-[11px] text-slate-400 font-medium">Volume:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={ambientVolume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="flex-1 accent-focus-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-300 font-mono w-9 text-right">
                    {Math.round(ambientVolume * 100)}%
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800">
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
        <div className="bg-[#111827] rounded-2xl p-6 border border-slate-800 space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
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
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500"
              >
                <option value="dark">Cognify Dark (Default)</option>
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
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-focus-500"
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

        {/* Section 4: Data Management & Backup */}
        <div className="bg-[#111827] rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Data Portability & Offline Cache</h2>
              <p className="text-xs text-slate-400">Export your focus sessions, tasks, and history</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleExportData}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition-all"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export All Study Data (JSON)</span>
            </button>

            <button
              type="button"
              onClick={handleClearLocalData}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-semibold text-rose-400 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Reset Local Offline Cache</span>
            </button>
          </div>
        </div>

        {/* Section 5: System Diagnostics & Setup Help */}
        <div className="bg-[#111827] rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white">System & Cloud Infrastructure</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowDbGuide(!showDbGuide)}
              className="text-xs text-blue-400 hover:underline flex items-center space-x-1"
            >
              <span>{showDbGuide ? 'Hide Setup Guide' : 'How to Connect Cloud Database'}</span>
              {showDbGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cloud className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-slate-300">Offline Fallback</span>
              </div>
              <span className="font-semibold px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active &bull; Zero Lockout
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-slate-300">Google OAuth 2.0</span>
              </div>
              <span
                className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                  status?.googleOAuth?.configured
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {status?.googleOAuth?.configured ? 'Configured ✅' : 'Optional'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-slate-300">PostgreSQL</span>
              </div>
              <span
                className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                  status?.database?.connected
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {status?.database?.connected ? 'Connected ✅' : 'Local Mode'}
              </span>
            </div>
          </div>

          {showDbGuide && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2.5 animate-in fade-in">
              <p className="font-bold text-white">
                Connecting PostgreSQL & Google OAuth to Vercel:
              </p>
              <ol className="list-decimal pl-4 space-y-1.5 text-slate-400">
                <li>
                  Go to your <strong className="text-slate-200">Vercel Project &gt; Settings &gt; Environment Variables</strong>.
                </li>
                <li>
                  Set <code className="text-blue-400 bg-slate-800 px-1.5 py-0.5 rounded">DATABASE_URL</code> to your pooled PostgreSQL URL (e.g. from Supabase, Neon, or Railway) with <code className="text-blue-400 bg-slate-800 px-1.5 py-0.5 rounded">?sslmode=require&pgbouncer=true</code>.
                </li>
                <li>
                  Set <code className="text-blue-400 bg-slate-800 px-1.5 py-0.5 rounded">GOOGLE_CLIENT_ID</code> and <code className="text-blue-400 bg-slate-800 px-1.5 py-0.5 rounded">GOOGLE_CLIENT_SECRET</code> from the Google Cloud Console.
                </li>
                <li>
                  Set <code className="text-blue-400 bg-slate-800 px-1.5 py-0.5 rounded">SESSION_SECRET</code> to any secure 32+ character random string.
                </li>
              </ol>
              <p className="text-[11px] text-emerald-400 pt-1">
                Note: Even without any of these variables, Cognify works immediately for all users with client-side LocalStorage.
              </p>
            </div>
          )}
        </div>

        {/* Section 6: Account & Sign Out */}
        <div className="bg-[#111827] rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Account & Authentication</h2>
              <p className="text-xs text-slate-400">Manage your active session or switch modes</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center space-x-3.5">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-11 h-11 rounded-full ring-2 ring-blue-500/30 object-cover"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-slate-800 ring-2 ring-slate-700 flex items-center justify-center text-base font-bold text-white">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-white">{user?.name || 'Cognify Student'}</p>
                <p className="text-xs text-slate-400">
                  {user?.isGuest ? 'Offline / LocalStorage Guest Session' : user?.email || 'Google Account'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              id="settings-signout-button"
              className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>{user?.isGuest ? 'Exit Guest Session' : 'Sign Out of Cognify'}</span>
            </button>
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 rounded-2xl bg-focus-500 hover:bg-focus-600 text-white font-bold text-sm shadow-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
};
