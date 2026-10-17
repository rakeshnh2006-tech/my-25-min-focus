import React from 'react';
import { Menu, Bell, BellOff, Volume2, VolumeX, Play, LogOut } from 'lucide-react';
import { useTimer } from '../context/TimerContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title: string;
  onOpenMobile: () => void;
  onNavigate: (page: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onOpenMobile, onNavigate }) => {
  const {
    status,
    soundEnabled,
    setSoundEnabled,
    notificationsEnabled,
    setNotificationsEnabled,
  } = useTimer();
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 h-16 bg-[#0b0f19]/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight capitalize">
          {title}
        </h1>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Quick action: Jump to timer */}
        {status === 'IDLE' && (
          <button
            onClick={() => onNavigate('timer')}
            className="hidden sm:flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-focus-500 hover:bg-focus-600 text-white text-xs font-semibold shadow-glow transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Focusing</span>
          </button>
        )}

        {/* Audio notification toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'Sound alerts enabled' : 'Sound alerts muted'}
          className={`p-2 rounded-xl border transition-colors ${
            soundEnabled
              ? 'border-slate-700 bg-slate-800/60 text-focus-400'
              : 'border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          aria-label="Toggle sound alerts"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Browser notification toggle */}
        <button
          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
          title={notificationsEnabled ? 'Desktop notifications enabled' : 'Enable desktop notifications'}
          className={`p-2 rounded-xl border transition-colors ${
            notificationsEnabled
              ? 'border-slate-700 bg-slate-800/60 text-break-short'
              : 'border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          aria-label="Toggle desktop notifications"
        >
          {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </button>

        <div className="h-5 w-px bg-slate-800 mx-0.5 hidden sm:block" />

        {/* Sign Out Button */}
        <button
          onClick={logout}
          title="Sign out of FocusFlow"
          id="header-signout-button"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-semibold transition-all duration-200"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
