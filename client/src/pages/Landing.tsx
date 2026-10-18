import React from 'react';
import {
  Play,
  Clock,
  CheckCircle2,
  BarChart3,
  BookOpen,
  Volume2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Laptop,
} from 'lucide-react';

interface LandingProps {
  onStartFocusing: () => void;
  onOpenLogin: () => void;
}

export const Landing: React.FC<LandingProps> = ({ onStartFocusing, onOpenLogin }) => {
  return (
    <div className="min-h-screen bg-[#080D1A] text-[#F8FAFC] flex flex-col justify-between selection:bg-focus-500 selection:text-white">
      {/* 1. TOP NAVIGATION */}
      <header className="px-6 sm:px-12 py-5 flex items-center justify-between border-b border-slate-800/80 bg-[#080D1A]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-blue-500/30 flex items-center justify-center shadow-lg">
            <img src="/logo-sm.png" alt="Cognify" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white block">Cognify</span>
            <span className="text-[10px] tracking-wider uppercase font-semibold text-blue-400 block -mt-1">
              Focus deeper. Learn smarter.
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={onStartFocusing}
            className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 transition-colors hidden sm:inline-block"
          >
            Dashboard
          </button>
          <button
            onClick={onOpenLogin}
            className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={onStartFocusing}
            className="px-4 sm:px-5 py-2 rounded-xl bg-focus-500 hover:bg-focus-600 text-white font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95"
          >
            Start Focusing
          </button>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <main className="flex-1 max-w-6xl mx-auto px-6 sm:px-12 py-12 sm:py-16 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Productivity Engineered for Deep Work</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Make every minute <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">count.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            A calmer workspace for deeper focus, better study sessions, and consistent progress.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onStartFocusing}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-focus-500 hover:bg-focus-600 text-white font-bold text-sm shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center space-x-2.5"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Focusing Now</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
            <button
              onClick={onOpenLogin}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-[#111827] hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-sm border border-slate-800 transition-all"
            >
              Sign In with Google
            </button>
          </div>

          <p className="text-xs text-slate-500 flex items-center justify-center gap-2 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Free &bull; No password setup &bull; Fast, secure Google Sign-In</span>
          </p>
        </div>

        {/* 3. POLISHED FOCUS TIMER PREVIEW CARD */}
        <div className="max-w-2xl mx-auto bg-[#111827] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-300">Cognify Focus Engine Preview</span>
            </div>
            <span className="text-[11px] font-mono font-medium text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/20">
              Preset: 25 / 5
            </span>
          </div>

          {/* Circular Gauge */}
          <div className="relative w-56 h-56 mx-auto my-6 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="85" className="stroke-slate-800" strokeWidth="8" fill="transparent" />
              <circle
                cx="100"
                cy="100"
                r="85"
                className="stroke-focus-500"
                strokeWidth="8"
                strokeDasharray="534"
                strokeDashoffset="130"
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400">FOCUS SESSION</span>
              <span className="text-4xl font-extrabold text-white font-mono tracking-tight my-1">21:40</span>
              <span className="text-[11px] text-slate-400">Algorithms &amp; System Design</span>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={onStartFocusing}
              className="px-6 py-2.5 rounded-xl bg-focus-500 hover:bg-focus-600 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Try Live Dashboard</span>
            </button>
          </div>
        </div>

        {/* 4. SHORT FEATURE SECTION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Smart Focus Cycles</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drift-free Pomodoro intervals, custom presets (25/5, 50/10, 60/10, 90/20), and stopwatch mode.
            </p>
          </div>

          <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Tasks &amp; Subjects</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Organize study sessions by academic course with session estimates and progress tracking.
            </p>
          </div>

          <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Verified Analytics</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Track daily focus minutes, continuous study streaks, and weekly time distribution.
            </p>
          </div>

          <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <Volume2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Calm Audio &amp; PiP</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Procedural ambient rain sounds and Picture-in-Picture floating mini-timer on any screen.
            </p>
          </div>
        </div>
      </main>

      {/* 5. RESPONSIVE FOOTER */}
      <footer className="px-6 sm:px-12 py-8 border-t border-slate-800/80 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center space-x-2">
          <img src="/logo-sm.png" alt="Cognify" className="w-5 h-5 rounded-md object-cover" />
          <span className="font-bold text-slate-400">Cognify</span>
          <span>&mdash; Focus deeper. Learn smarter.</span>
        </div>
        <div>
          <span>&copy; {new Date().getFullYear()} Cognify. Designed for deep study.</span>
        </div>
      </footer>
    </div>
  );
};
