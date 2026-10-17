import React, { useState, useEffect } from 'react';
import {
  Flame,
  CheckCircle2,
  Clock,
  BarChart3,
  BookOpen,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { status } = useAuth();
  const [errorParam, setErrorParam] = useState<string | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) {
      setErrorParam(err);
      if (err === 'oauth_not_configured') {
        setShowSetupGuide(true);
      }
    }
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const isConfigured = status?.googleOAuth?.configured;

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col justify-between text-slate-100 selection:bg-focus-500 selection:text-white">
      {/* Top Navbar */}
      <header className="px-6 sm:px-12 py-6 flex items-center justify-between border-b border-slate-800/60 bg-[#0d1322]/60 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-focus-600 to-focus-400 flex items-center justify-center shadow-glow">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">FocusFlow</span>
        </div>
        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <span className="hidden sm:inline">Built for College Students</span>
          <span className="w-1.5 h-1.5 rounded-full bg-focus-500"></span>
          <span className="text-focus-400 font-semibold">25/5 Technique</span>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="flex-1 max-w-7xl mx-auto px-6 sm:px-12 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left Column: Value Prop & Google Sign-In */}
        <div className="lg:col-span-6 space-y-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-focus-500/10 border border-focus-500/20 text-focus-400 text-xs font-semibold">
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>Distraction-Free Productivity Platform</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
              Make every study session <span className="text-transparent bg-clip-text bg-gradient-to-r from-focus-400 to-amber-300">count.</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed">
              Supercharge your coursework with structured Pomodoro cycles, seamless task planning, subject goal tracking, and verifiable study analytics.
            </p>
          </div>

          {/* Authentication Alert/Errors */}
          {errorParam && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">Authentication Notice</strong>
                {errorParam === 'oauth_not_configured'
                  ? 'Google OAuth credentials have not been configured yet in the .env file.'
                  : errorParam === 'db_connection_error'
                  ? 'Database Connection Error: Could not reach PostgreSQL. Please configure a valid DATABASE_URL in your .env file.'
                  : errorParam === 'auth_failed'
                  ? 'Google sign-in was cancelled or encountered an error. Please try again.'
                  : `Sign-in notice: ${errorParam}`}
              </div>
            </div>
          )}

          {/* Google Sign-in CTA */}
          <div className="space-y-4 pt-2">
            <button
              onClick={handleGoogleLogin}
              className="w-full sm:w-auto min-w-[280px] flex items-center justify-center space-x-3 px-8 py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-base shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.99] group"
            >
              {/* Official Google 'G' SVG Logo */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <p className="text-xs text-slate-500">
              Zero passwords to remember. Your academic study logs remain strictly private.
            </p>
          </div>

          {/* Quick Feature Pillars */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
                <Clock className="w-3.5 h-3.5 text-focus-400" />
                <span>Smart Timer</span>
              </div>
              <p className="text-[11px] text-slate-500">Accurate background clock tracking</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
                <BookOpen className="w-3.5 h-3.5 text-break-short" />
                <span>Subject Goals</span>
              </div>
              <p className="text-[11px] text-slate-500">Target hours for exams & classes</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
                <BarChart3 className="w-3.5 h-3.5 text-break-long" />
                <span>Real Analytics</span>
              </div>
              <p className="text-[11px] text-slate-500">Streaks & weekly study heatmaps</p>
            </div>
          </div>

          {/* Google OAuth Configuration Drawer Toggle */}
          <div className="pt-2">
            <button
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="text-xs text-slate-400 hover:text-focus-400 flex items-center space-x-1.5 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Google OAuth & Database Setup Guide</span>
              {showSetupGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showSetupGuide && (
              <div className="mt-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-3">
                <p className="font-semibold text-white">How Google OAuth is Configured:</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-400">
                  <li>
                    Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-focus-400 underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-2.5 h-2.5" /></a>
                  </li>
                  <li>Configure the OAuth consent screen with <strong className="text-slate-200">External</strong> user type.</li>
                  <li>Create Credentials &gt; OAuth client ID &gt; Application type: <strong className="text-slate-200">Web application</strong>.</li>
                  <li>
                    Add Authorized redirect URI:
                    <div className="mt-1 p-2 bg-slate-950 font-mono rounded text-slate-200 select-all">
                      http://localhost:5000/api/auth/google/callback
                    </div>
                  </li>
                  <li>
                    Status: {isConfigured ? (
                      <span className="text-break-short font-semibold">Configured with your client ID ✅</span>
                    ) : (
                      <span className="text-amber-400 font-semibold">Pending configuration in .env</span>
                    )}
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Productivity Dashboard Preview */}
        <div className="lg:col-span-6 relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-focus-500/20 to-purple-600/20 rounded-3xl blur-2xl opacity-50"></div>
          
          <div className="relative glass-card rounded-2xl p-6 sm:p-8 border border-slate-700/60 shadow-glass space-y-6">
            {/* Mock Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-focus-400">
                  FF
                </div>
                <div>
                  <div className="text-sm font-bold text-white">College Study Dashboard</div>
                  <div className="text-xs text-slate-400">Semester Exam Sprint</div>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-focus-500/10 text-focus-400 text-xs font-semibold">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>5 Day Streak</span>
              </div>
            </div>

            {/* Mock Circular Timer Visual */}
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    className="stroke-slate-800"
                    strokeWidth="6"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    className="stroke-focus-500"
                    strokeWidth="6"
                    strokeDasharray="263.89"
                    strokeDashoffset="65"
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-focus-400">
                    FOCUS SESSION
                  </span>
                  <span className="text-3xl font-extrabold text-white font-mono tracking-tight my-0.5">
                    18:42
                  </span>
                  <span className="text-[11px] text-slate-400">Algorithms & DS</span>
                </div>
              </div>
            </div>

            {/* Mock Metrics Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] uppercase font-semibold text-slate-400">Today</div>
                <div className="text-base font-bold text-white">3h 25m</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] uppercase font-semibold text-slate-400">Pomodoros</div>
                <div className="text-base font-bold text-focus-400">7 Done</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] uppercase font-semibold text-slate-400">Daily Goal</div>
                <div className="text-base font-bold text-break-short">85%</div>
              </div>
            </div>

            {/* Mock Subjects Pills */}
            <div className="flex items-center space-x-2 pt-2">
              <span className="text-xs text-slate-400">Active subjects:</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[11px] font-medium border border-blue-500/20">
                Computer Science
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[11px] font-medium border border-emerald-500/20">
                Calculus III
              </span>
              <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-[11px] font-medium border border-purple-500/20">
                Physics
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 sm:px-12 py-6 border-t border-slate-800/60 text-center text-xs text-slate-500">
        FocusFlow &copy; {new Date().getFullYear()} &mdash; Designed specifically for college students and deep learners.
      </footer>
    </div>
  );
};
