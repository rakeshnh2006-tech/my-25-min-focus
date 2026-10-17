import React from 'react';
import {
  LayoutDashboard,
  Timer,
  CheckSquare,
  BookOpen,
  BarChart2,
  History,
  Settings,
  LogOut,
  Flame,
  X,
  Play,
  Pause,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  mobileOpen,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();
  const { status, secondsRemaining, mode } = useTimer();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'timer', label: 'Focus Timer', icon: Timer, hasBadge: status === 'RUNNING' || status === 'PAUSED' },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'history', label: 'Session History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#0d1322] border-r border-slate-800/80 w-64 select-none">
      {/* Brand Header */}
      <div className="p-6 flex items-center justify-between border-b border-slate-800/50">
        <button
          onClick={() => {
            onNavigate('dashboard');
            onCloseMobile();
          }}
          className="flex items-center space-x-3 text-left focus:outline-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-focus-600 to-focus-400 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-white block">FocusFlow</span>
            <span className="text-[10px] tracking-wider uppercase font-semibold text-focus-400 block -mt-1">
              Study App
            </span>
          </div>
        </button>

        {mobileOpen && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Live active timer mini badge */}
      {(status === 'RUNNING' || status === 'PAUSED') && currentPage !== 'timer' && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-slate-900/90 border border-focus-500/30 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2.5">
            <div className={`p-1.5 rounded-lg ${status === 'RUNNING' ? 'bg-focus-500/20 text-focus-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {status === 'RUNNING' ? <Play className="w-3.5 h-3.5 fill-current animate-pulse" /> : <Pause className="w-3.5 h-3.5" />}
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
                {mode === 'FOCUS' ? 'Focusing' : 'On Break'}
              </span>
              <span className="text-sm font-mono font-bold text-white">
                {formatTime(secondsRemaining)}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              onNavigate('timer');
              onCloseMobile();
            }}
            className="text-xs px-2.5 py-1 rounded-md bg-focus-500 hover:bg-focus-600 text-white font-medium transition-colors"
          >
            View
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-focus-500/15 text-focus-400 font-semibold border border-focus-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-focus-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.hasBadge && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-focus-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-focus-500"></span>
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile & Sign Out */}
      <div className="p-4 border-t border-slate-800/60 bg-[#0a0f1c]/50 space-y-3">
        <div className="flex items-center space-x-3 overflow-hidden">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-9 h-9 rounded-full ring-2 ring-slate-700 object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-slate-800 ring-2 ring-slate-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{user?.name || 'Student'}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email || ''}</p>
          </div>
        </div>

        <button
          onClick={logout}
          id="sidebar-signout-button"
          title="Sign out of FocusFlow"
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all duration-200 shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-64 max-w-[80vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
