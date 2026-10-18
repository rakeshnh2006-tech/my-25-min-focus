import React from 'react';
import { Menu, Bell, BellOff, Volume2, VolumeX, CloudRain, LogOut } from 'lucide-react';
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
  const { user, logout } = useAuth();

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
    <header className="sticky top-0 z-20 h-16 bg-[#070B16]/80 backdrop-blur-2xl border-b border-white/[0.08] px-4 sm:px-8 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
          <span>{getPageTitle(title)}</span>
        </h1>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Ambient Rain Sound Quick Toggle */}
        <button
          onClick={toggleRain}
          title={isRainPlaying ? 'Ambient rain sound is active (click to stop)' : 'Play ambient rain sound'}
          className={`clay-chip p-2 flex items-center gap-1.5 transition-all ${
            isRainPlaying
              ? 'bg-blue-600/20 text-blue-400 border border-blue-400/40 shadow-blue-500/20 shadow-lg'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/[0.06]'
          }`}
          aria-label="Toggle ambient rain sound"
        >
          <CloudRain className="w-4 h-4" />
          {isRainPlaying && <span className="text-[11px] font-bold text-blue-400 hidden md:inline">Rain</span>}
        </button>

        {/* Chime audio notification toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'Chime alerts enabled' : 'Chime alerts muted'}
          className={`clay-chip p-2 transition-all ${
            soundEnabled
              ? 'bg-slate-800/80 text-blue-400 border border-blue-500/30'
              : 'bg-slate-900/60 text-slate-500 hover:text-slate-300 border border-white/[0.06]'
          }`}
          aria-label="Toggle chime alerts"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Browser notification toggle */}
        <button
          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
          title={notificationsEnabled ? 'Desktop notifications enabled' : 'Enable desktop notifications'}
          className={`clay-chip p-2 transition-all ${
            notificationsEnabled
              ? 'bg-slate-800/80 text-emerald-400 border border-emerald-500/30'
              : 'bg-slate-900/60 text-slate-500 hover:text-slate-300 border border-white/[0.06]'
          }`}
          aria-label="Toggle desktop notifications"
        >
          {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </button>

        <div className="h-5 w-px bg-white/[0.08] mx-0.5 hidden sm:block" />

        {/* Sign Out Button */}
        <button
          onClick={logout}
          title="Sign out of Cognify"
          className="clay-chip flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900/70 hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 border border-white/[0.08] text-xs font-bold transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
