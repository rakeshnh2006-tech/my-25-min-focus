import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  BarChart2,
  History,
  Settings,
  LogOut,
  Globe,
  X,
  Play,
  Pause,
  LogIn,
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
  const isGuest = user?.isGuest;
  const { status, secondsRemaining, mode } = useTimer();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard & Timer', icon: LayoutDashboard, hasBadge: status === 'RUNNING' || status === 'PAUSED' },
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
    <div className="flex flex-col h-full bg-[#080D1A] border-r border-slate-800/80 w-64 select-none">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-slate-800/80">
        <button
          onClick={() => {
            onNavigate('dashboard');
            onCloseMobile();
          }}
          className="flex items-center space-x-3 text-left focus:outline-none group"
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-900 border border-blue-500/30 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform flex-shrink-0">
            <img src="/logo-sm.png" alt="Cognify" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white block">Cognify</span>
            <span className="text-[10px] tracking-wider uppercase font-semibold text-blue-400 block -mt-1">
              Focus &bull; Study
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

      {/* Live active timer mini badge if on other pages */}
      {(status === 'RUNNING' || status === 'PAUSED') && currentPage !== 'dashboard' && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-[#111827] border border-blue-500/30 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2.5">
            <div className={`p-1.5 rounded-lg ${status === 'RUNNING' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {status === 'RUNNING' ? <Play className="w-3.5 h-3.5 fill-current animate-pulse" /> : <Pause className="w-3.5 h-3.5" />}
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                {mode === 'FOCUS' ? 'Focusing' : 'Break'}
              </span>
              <span className="text-sm font-mono font-bold text-white">
                {formatTime(secondsRemaining)}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              onNavigate('dashboard');
              onCloseMobile();
            }}
            className="text-[11px] font-semibold text-blue-400 hover:text-blue-300"
          >
            View
          </button>
        </div>
      )}

      {/* Main Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
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
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#111827] text-white border border-slate-700/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#111827]/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-focus-500' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.hasBadge && (
                <span className="w-2 h-2 rounded-full bg-focus-500 animate-pulse" />
              )}
            </button>
          );
        })}

        {/* View Landing Page Link */}
        <button
          onClick={() => {
            onNavigate('landing');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            currentPage === 'landing'
              ? 'bg-[#111827] text-white border border-slate-700/80'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#111827]/50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <Globe className="w-4 h-4 text-slate-500" />
            <span>Landing Page</span>
          </div>
        </button>
      </nav>

      {/* User / Session Footer */}
      <div className="p-4 border-t border-slate-800/80">
        {user ? (
          <div className="p-2.5 rounded-xl bg-[#111827] border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-7 h-7 rounded-lg object-cover border border-slate-700 flex-shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'C'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {isGuest ? 'Local / Offline Mode' : 'Cloud Sync Active'}
                </p>
              </div>
            </div>

            {isGuest ? (
              <button
                onClick={() => onNavigate('login')}
                title="Sign in with Google"
                className="p-1.5 text-blue-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <LogIn className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={logout}
                title="Log out"
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="relative flex-1 flex flex-col max-w-xs w-full bg-[#080D1A] z-10 shadow-2xl">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
