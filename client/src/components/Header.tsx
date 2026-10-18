import React from 'react';
import { Menu, Bell, BellOff, Volume2, VolumeX, CloudRain, LogIn, LogOut } from 'lucide-react';
import { useTimer } from '../context/TimerContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title: string;
  onOpenMobile: () => void;
  onNavigate: (page: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onOpenMobile, onNavigate }) => {
  const {
    soundEnabled,
    setSoundEnabled,
    notificationsEnabled,
    setNotificationsEnabled,
    isRainPlaying,
    toggleRain,
  } = useTimer();
  const { user, isGuest, logout } = useAuth();

  const getPageTitle = (id: string) => {
    switch (id) {
      case 'dashboard':
        return 'Focus Dashboard';
      case 'tasks':
        return 'Study Tasks';
      case 'subjects':
        return 'Academic Subjects';
      case 'analytics':
        return 'Focus Analytics';
      case 'history':
        return 'Session History';
      case 'settings':
        return 'Preferences & Settings';
      case 'login':
        return 'Authentication';
      default:
        return id;
    }
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-[#080D1A]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
          {getPageTitle(title)}
        </h1>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Ambient Rain Sound Quick Toggle */}
        <button
          onClick={toggleRain}
          title={isRainPlaying ? 'Ambient rain sound is active (click to stop)' : 'Play ambient rain sound'}
          className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 ${
            isRainPlaying
              ? 'border-blue-500/40 bg-blue-500/15 text-blue-400'
              : 'border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          aria-label="Toggle ambient rain sound"
        >
          <CloudRain className="w-4 h-4" />
          {isRainPlaying && <span className="text-[11px] font-semibold text-blue-400 hidden md:inline">Rain</span>}
        </button>

        {/* Chime audio notification toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'Chime alerts enabled' : 'Chime alerts muted'}
          className={`p-2 rounded-xl border transition-colors ${
            soundEnabled
              ? 'border-slate-700 bg-slate-800/60 text-focus-400'
              : 'border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          aria-label="Toggle chime alerts"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Browser notification toggle */}
        <button
          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
          title={notificationsEnabled ? 'Desktop notifications enabled' : 'Enable desktop notifications'}
          className={`p-2 rounded-xl border transition-colors ${
            notificationsEnabled
              ? 'border-slate-700 bg-slate-800/60 text-emerald-400'
              : 'border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          aria-label="Toggle desktop notifications"
        >
          {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </button>

        <div className="h-5 w-px bg-slate-800 mx-0.5 hidden sm:block" />

        {/* Sign in / Guest Sync Button or Sign Out */}
        {isGuest ? (
          <button
            onClick={() => {
              window.location.href = '/api/auth/google';
            }}
            title="Sign in with Google to enable cloud sync"
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 text-xs font-semibold transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="hidden sm:inline">Connect Google</span>
          </button>
        ) : (
          <button
            onClick={logout}
            title="Sign out of Cognify"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
};
