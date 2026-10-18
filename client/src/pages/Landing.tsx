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
} from 'lucide-react';

interface LandingProps {
  onStartFocusing: () => void;
  onOpenLogin: () => void;
}

export const Landing: React.FC<LandingProps> = ({ onStartFocusing, onOpenLogin }) => {
  return (
    <div className="min-h-screen bg-[#070B16] text-[#F8FAFC] flex flex-col justify-between selection:bg-focus-500 selection:text-white relative overflow-hidden">
      {/* Background ambient lighting orbs (Deep study spectrum) */}
      <div className="fixed top-[-10%] left-[20%] w-[650px] h-[650px] bg-gradient-to-br from-blue-600/12 via-indigo-600/8 to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[15%] w-[550px] h-[550px] bg-gradient-to-tl from-emerald-600/10 via-teal-600/5 to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* 1. TOP NAVIGATION */}
      <header className="px-6 sm:px-12 py-5 flex items-center justify-between border-b border-white/[0.08] bg-[#070B16]/80 backdrop-blur-2xl sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-900 border border-blue-400/40 flex items-center justify-center shadow-lg shadow-blue-500/10">
            <img src="/logo-sm.png" alt="Cognify" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white block">Cognify</span>
            <span className="text-[10px] tracking-wider uppercase font-bold text-blue-400 block -mt-1">
              Focus deeper. Learn smarter.
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={onStartFocusing}
            className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 transition-colors hidden sm:inline-block"
          >
            Dashboard
          </button>
          <button
            onClick={onOpenLogin}
            className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={onStartFocusing}
            className="clay-btn clay-btn-focus px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-md"
          >
            Start Focusing
          </button>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <main className="flex-1 max-w-6xl mx-auto px-6 sm:px-12 py-12 sm:py-16 space-y-16 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="clay-chip inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-bold shadow-md shadow-blue-500/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Productivity Engineered for Deep Work</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Make every minute <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300">count.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto font-medium">
            A calmer workspace for deeper focus, better study sessions, and consistent progress.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              onClick={onStartFocusing}
              className="w-full sm:w-auto clay-btn clay-btn-focus px-9 py-4 rounded-2xl text-sm font-extrabold shadow-xl flex items-center justify-center space-x-2.5"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Focusing Now</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
            <button
              onClick={onOpenLogin}
              className="w-full sm:w-auto clay-btn clay-btn-slate px-7 py-4 rounded-2xl text-slate-200 hover:text-white font-bold text-sm shadow-lg"
            >
              Sign In with Google
            </button>
          </div>

          <p className="text-xs text-slate-400 flex items-center justify-center gap-2 pt-1 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Free &bull; No password setup &bull; Fast, secure Google Sign-In</span>
          </p>
        </div>

        {/* 3. POLISHED FOCUS TIMER PREVIEW CARD (Clay + Glass) */}
        <div className="max-w-2xl mx-auto clay-card p-6 sm:p-8 relative overflow-hidden text-center shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse ring-4 ring-blue-500/20" />
              <span className="text-xs font-bold text-slate-200">Cognify Focus Engine Preview</span>
            </div>
            <span className="clay-chip text-[11px] font-mono font-bold text-blue-300 bg-blue-500/15 px-3 py-1 rounded-lg border border-blue-400/30">
              Preset: 25 / 5
            </span>
          </div>

          {/* Circular Gauge with 3D dial backplate */}
          <div className="relative w-60 h-60 mx-auto my-6 flex items-center justify-center">
            <div className="absolute inset-2 clay-timer-dial pointer-events-none" />
            <svg className="w-full h-full -rotate-90 transform relative z-10" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="85" className="stroke-slate-800/60" strokeWidth="8" fill="transparent" />
              <circle
                cx="100"
                cy="100"
                r="85"
                className="stroke-blue-500"
                strokeWidth="8"
                strokeDasharray="534"
                strokeDashoffset="130"
                strokeLinecap="round"
                fill="transparent"
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(78, 117, 255, 0.6))',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-blue-400">FOCUS SESSION</span>
              <span className="text-4xl sm:text-5xl font-extrabold text-white font-mono tracking-tight my-1 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">21:40</span>
              <span className="text-[11px] font-semibold text-slate-300">Algorithms &amp; System Design</span>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={onStartFocusing}
              className="clay-btn clay-btn-focus px-7 py-3 rounded-xl text-xs font-extrabold shadow-lg flex items-center space-x-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Live Dashboard</span>
            </button>
          </div>
        </div>

        {/* 4. SHORT FEATURE SECTION (Clay Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div className="clay-card clay-card-interactive p-5 space-y-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-500/15 border border-blue-400/30 text-blue-400 flex items-center justify-center shadow-inner">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-extrabold text-white">Smart Focus Cycles</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drift-free Pomodoro intervals, custom presets (25/5, 50/10, 60/10, 90/20), and stopwatch mode.
            </p>
          </div>

          <div className="clay-card clay-card-interactive p-5 space-y-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shadow-inner">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-extrabold text-white">Tasks &amp; Subjects</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Organize study sessions by academic course with session estimates and progress tracking.
            </p>
          </div>

          <div className="clay-card clay-card-interactive p-5 space-y-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-400 flex items-center justify-center shadow-inner">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-extrabold text-white">Verified Analytics</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Track daily focus minutes, continuous study streaks, and weekly time distribution.
            </p>
          </div>

          <div className="clay-card clay-card-interactive p-5 space-y-2.5">
            <div className="w-9 h-9 rounded-2xl bg-violet-500/15 border border-violet-400/30 text-violet-400 flex items-center justify-center shadow-inner">
              <Volume2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-extrabold text-white">Calm Audio &amp; PiP</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Procedural ambient rain sounds and Picture-in-Picture floating mini-timer on any screen.
            </p>
          </div>
        </div>
      </main>

      {/* 5. RESPONSIVE FOOTER */}
      <footer className="px-6 sm:px-12 py-8 border-t border-white/[0.08] text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto w-full relative z-10">
        <div className="flex items-center space-x-2">
          <img src="/logo-sm.png" alt="Cognify" className="w-5 h-5 rounded-md object-cover" />
          <span className="font-extrabold text-slate-300">Cognify</span>
          <span>&mdash; Focus deeper. Learn smarter.</span>
        </div>
        <div>
          <span>&copy; {new Date().getFullYear()} Cognify. Designed for deep study.</span>
        </div>
      </footer>
    </div>
  );
};
