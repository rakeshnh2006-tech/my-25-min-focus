import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Volume2,
  Bell,
  Palette,
  CheckCircle2,
  AlertCircle,
  LogOut,
  User as UserIcon,
  Download,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { soundManager } from '../lib/sound';
import { LocalStorageRepository } from '../lib/storage';
import { AppTheme } from '../types';

const MAJOR_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  // Americas
  { value: 'America/New_York', label: 'Eastern Time (US / Canada) — New York, Toronto' },
  { value: 'America/Chicago', label: 'Central Time (US / Canada) — Chicago, Dallas' },
  { value: 'America/Denver', label: 'Mountain Time (US / Canada) — Denver, Phoenix' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US / Canada) — Los Angeles, Vancouver' },
  { value: 'America/Anchorage', label: 'Alaska Time — Anchorage' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time — Honolulu' },
  { value: 'America/Sao_Paulo', label: 'Brasilia Time — São Paulo, Rio' },
  { value: 'America/Buenos_Aires', label: 'Argentina Time — Buenos Aires' },
  // Europe & Africa
  { value: 'Europe/London', label: 'London, Dublin (GMT / BST)' },
  { value: 'Europe/Paris', label: 'Paris, Amsterdam, Brussels (CET / CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin, Rome, Madrid, Vienna (CET / CEST)' },
  { value: 'Europe/Athens', label: 'Athens, Bucharest, Helsinki (EET / EEST)' },
  { value: 'Africa/Cairo', label: 'Cairo (Egypt)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (South Africa)' },
  // Asia & Middle East
  { value: 'Asia/Dubai', label: 'Dubai, Abu Dhabi (Gulf Standard Time)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST) — Mumbai, Delhi, Bengaluru' },
  { value: 'Asia/Calcutta', label: 'India (Asia/Calcutta Alias)' },
  { value: 'Asia/Dhaka', label: 'Bangladesh — Dhaka' },
  { value: 'Asia/Bangkok', label: 'Indochina — Bangkok, Jakarta, Hanoi' },
  { value: 'Asia/Singapore', label: 'Singapore, Kuala Lumpur (SGT)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong, Beijing, Shanghai (HKT)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST) — Tokyo, Osaka' },
  { value: 'Asia/Seoul', label: 'Korea Standard Time (KST) — Seoul' },
  // Australia & Pacific
  { value: 'Australia/Perth', label: 'Western Australia — Perth' },
  { value: 'Australia/Adelaide', label: 'Central Australia — Adelaide' },
  { value: 'Australia/Sydney', label: 'Eastern Australia — Sydney, Melbourne (AEST)' },
  { value: 'Pacific/Auckland', label: 'New Zealand — Auckland, Wellington (NZST)' },
];

export const SettingsPage: React.FC = () => {
  const { user, preference, updatePreferences, logout } = useAuth();
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
  const [timezone, setTimezone] = useState(() => {
    return typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      : 'UTC';
  });

  const systemTimezone = typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    : 'UTC';

  // Compute timezone options ensuring current and system timezone are always selectable
  const timezoneOptions = [...MAJOR_TIMEZONES];
  if (timezone && !timezoneOptions.some((t) => t.value === timezone)) {
    timezoneOptions.unshift({ value: timezone, label: `${timezone} (Current)` });
  }
  if (systemTimezone && !timezoneOptions.some((t) => t.value === systemTimezone)) {
    timezoneOptions.unshift({ value: systemTimezone, label: `${systemTimezone} (System Detected)` });
  }

  // Ambient Rain Test
  const [testRainPlaying, setTestRainPlaying] = useState(false);
  const [ambientVolume, setAmbientVolume] = useState(0.5);

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
      setTimezone(preference.timezone || systemTimezone);
      if (preference.theme && preference.theme !== theme) {
        setTheme(preference.theme);
      }
    }
  }, [preference]);

  const handleThemeChange = async (newTheme: AppTheme) => {
    setTheme(newTheme);
    try {
      await updatePreferences({ theme: newTheme });
    } catch {
      // Local fallback handled in AuthContext
    }
  };

  const handleTimezoneChange = async (newTz: string) => {
    setTimezone(newTz);
    try {
      await updatePreferences({ timezone: newTz });
    } catch {
      // Local fallback handled in AuthContext
    }
  };

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
        <div className="clay-card p-4 sm:p-6 space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-white/[0.08]">
            <div className="p-2.5 rounded-2xl bg-blue-500/15 border border-blue-400/30 text-blue-400 shadow-inner">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">Timer Durations</h2>
              <p className="text-xs text-slate-400 font-medium">Default lengths in minutes for standard intervals</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Focus Duration (Mins)
              </label>
              <input
                type="number"
                min={5}
                max={120}
                value={focusDuration}
                onChange={(e) => setFocusDuration(parseInt(e.target.value, 10) || 25)}
                className="w-full clay-inset rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Short Break (Mins)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={shortBreakDuration}
                onChange={(e) => setShortBreakDuration(parseInt(e.target.value, 10) || 5)}
                className="w-full clay-inset rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Long Break (Mins)
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={longBreakDuration}
                onChange={(e) => setLongBreakDuration(parseInt(e.target.value, 10) || 15)}
                className="w-full clay-inset rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Long Break Interval
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={longBreakInterval}
                onChange={(e) => setLongBreakInterval(parseInt(e.target.value, 10) || 4)}
                className="w-full clay-inset rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-400"
              />
              <span className="text-[10px] text-slate-400 mt-1 block font-medium">Sessions before long break</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Daily Focus Target (Mins)
              </label>
              <input
                type="number"
                min={15}
                max={720}
                step={15}
                value={dailyGoalMinutes}
                onChange={(e) => setDailyGoalMinutes(parseInt(e.target.value, 10) || 120)}
                className="w-full clay-inset rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-400"
              />
              <span className="text-[10px] text-slate-400 mt-1 block font-medium">
                Target: {Number((dailyGoalMinutes / 60).toFixed(1))} hours/day
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Audio & Ambient Soundscape */}
        <div className="clay-card p-4 sm:p-6 space-y-5">
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
        <div className="clay-card p-4 sm:p-6 space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-white/[0.08]">
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-400/30 text-indigo-400 shadow-inner">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">Appearance &amp; Timezone</h2>
              <p className="text-xs text-slate-400 font-medium">Theme mode and streak calculation timezone</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Theme
              </label>
              <select
                value={theme}
                onChange={(e) => handleThemeChange(e.target.value as AppTheme)}
                className="w-full clay-inset rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-400 cursor-pointer"
              >
                <option value="dark">🌙 Cognify Dark (Default)</option>
                <option value="light">☀️ Light Theme</option>
                <option value="system">💻 System Preference</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block font-medium">
                Active: {theme === 'dark' ? 'Dark Mode' : theme === 'light' ? 'Light Mode' : 'System Matched'}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Timezone (For Daily Streaks)
                </label>
                <button
                  type="button"
                  onClick={() => handleTimezoneChange(systemTimezone)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-bold transition-colors"
                >
                  Use System ({systemTimezone})
                </button>
              </div>
              <select
                value={timezone}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                className="w-full clay-inset rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-400 cursor-pointer"
              >
                {timezoneOptions.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block font-medium">
                Active: {timezone} &bull; Daily streaks reset at local midnight
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Data Management & Backup */}
        <div className="clay-card p-4 sm:p-6 space-y-4">
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

        {/* Section 5: Account & Sign Out */}
        <div className="clay-card p-4 sm:p-6 space-y-4">
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
                  {user?.email || 'Google Account'}
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
              <span>Sign Out of Cognify</span>
            </button>
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto clay-btn clay-btn-focus px-9 py-3.5 rounded-2xl text-sm font-extrabold shadow-xl disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
};
