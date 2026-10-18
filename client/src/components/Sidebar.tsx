import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  BarChart2,
  History,
  Settings,
  LogOut,
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
    <div className="flex flex-col h-full bg-[#0A1020]/85 backdrop-blur-2xl border-r border-white/[0.08] w-64 select-none relative z-20">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-white/[0.07]">
        <button
          onClick={() => {
            onNavigate('dashboard');
            onCloseMobile();
          }}
          className="flex items-center space-x-3 text-left focus:outline-none group"
        >
          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-900/90 border border-blue-400/40 flex items-center justify-center shadow-lg shadow-blue-500/10 group-hover:scale-105 group-hover:border-blue-400/70 transition-all duration-300 flex-shrink-0">
            <img src="/logo-sm.png" alt="Cognify" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white block">Cognify</span>
            <span className="text-[10px] tracking-wider uppercase font-bold text-blue-400 block -mt-0.5">
              Focus &bull; Study
            </span>
          </div>
        </button>

        {mobileOpen && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Live active timer mini badge if on other pages */}
      {(status === 'RUNNING' || status === 'PAUSED') && currentPage !== 'dashboard' && (
        <div className="mx-3.5 mt-4 p-3 rounded-2xl bg-slate-900/70 border border-blue-500/30 flex items-center justify-between shadow-xl shadow-black/40 backdrop-blur-md">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl ${status === 'RUNNING' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {status === 'RUNNING' ? <Play className="w-3.5 h-3.5 fill-current animate-pulse" /> : <Pause className="w-3.5 h-3.5" />}
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                {mode === 'FOCUS' ? 'Focusing' : 'Break'}
              </span>
              <span className="text-sm font-mono font-extrabold text-white">
                {formatTime(secondsRemaining)}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              onNavigate('dashboard');
              onCloseMobile();
            }}
            className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-[11px] font-bold text-blue-400 transition-colors"
          >
            View
          </button>
        </div>
      )}

      {/* Main Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
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
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/10 text-white border border-blue-500/35 shadow-lg shadow-blue-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`p-1.5 rounded-xl transition-colors ${
                    isActive ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span>{item.label}</span>
              </div>
              {item.hasBadge && (
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse ring-4 ring-blue-500/20" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User / Session Footer (Tactile Clay Inset) */}
      <div className="p-3.5 border-t border-white/[0.07]">
        {user ? (
          <div className="p-2.5 rounded-2xl bg-[#080D1A]/90 border border-white/[0.06] shadow-inner flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-8 h-8 rounded-xl object-cover border border-blue-400/30 shadow-sm flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-extrabold shadow-sm flex-shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'C'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user.email || 'Google Account'}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign out of Cognify"
              className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
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
