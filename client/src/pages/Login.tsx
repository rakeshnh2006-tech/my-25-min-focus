import React, { useState, useEffect } from 'react';
import { AlertCircle, Sparkles, RefreshCw, HelpCircle, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRandomQuote, Quote } from '../lib/quotes';

interface LoginProps {
  onBackToApp?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onBackToApp }) => {
  const { status } = useAuth();
  const [errorParam, setErrorParam] = useState<string | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Dynamic quote picked whenever the page is opened or refreshed
  const [quote, setQuote] = useState<Quote>(() => getRandomQuote());

  // Automated time-aware welcome line
  const [welcomeInfo, setWelcomeInfo] = useState<{ greeting: string; subtitle: string; icon: string }>({
    greeting: 'Welcome to Cognify',
    subtitle: 'Sign in with Google to access your focus workspace.',
    icon: '✨',
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setWelcomeInfo({
        greeting: 'Good morning!',
        subtitle: 'Sign in to start your day with deep, intentional focus.',
        icon: '🌅',
      });
    } else if (hour >= 12 && hour < 17) {
      setWelcomeInfo({
        greeting: 'Good afternoon!',
        subtitle: 'Sign in to keep your academic momentum going strong.',
        icon: '⚡',
      });
    } else if (hour >= 17 && hour < 22) {
      setWelcomeInfo({
        greeting: 'Good evening!',
        subtitle: 'Sign in — every 25 minutes brings you closer to your goals.',
        icon: '🌙',
      });
    } else {
      setWelcomeInfo({
        greeting: 'Welcome, Night Owl!',
        subtitle: 'Quiet hours, peak clarity. Sign in to make it count.',
        icon: '🌌',
      });
    }

    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) {
      setErrorParam(err);
      if (err === 'oauth_not_configured' || err === 'db_connection_error') {
        setShowSetupGuide(true);
      }
    }
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const handleRefreshQuote = () => {
    setQuote(getRandomQuote());
  };

  const isConfigured = status?.googleOAuth?.configured && status?.database?.connected;

  return (
    <div className="min-h-screen bg-[#070B16] flex flex-col items-center justify-center p-4 sm:p-6 text-[#F8FAFC] selection:bg-focus-500 selection:text-white relative overflow-hidden">
      {/* Background ambient glowing mesh (Optimal cool study palette) */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/10 to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/3 translate-x-1/2 translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-bl from-emerald-600/10 via-teal-600/5 to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Main Login Card with Claymorphism & Frosted Glass */}
      <div className="w-full max-w-md clay-card p-8 sm:p-10 relative text-center">
        {/* Back navigation to landing page if available */}
        {onBackToApp && (
          <button
            onClick={onBackToApp}
            className="absolute top-6 left-6 p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Back to Landing Page"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        {/* Tactile 3D App Logo Emblem */}
        <div className="relative mx-auto w-20 h-20 mb-4 flex items-center justify-center">
          <div className="absolute inset-0 bg-blue-500/25 rounded-3xl blur-xl" />
          <img
            src="/logo-256.png"
            alt="Cognify Logo"
            className="relative w-20 h-20 rounded-2xl object-cover shadow-2xl border border-blue-400/40 hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* App Branding */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Cognify</h1>
        <p className="text-xs font-bold text-blue-400 tracking-wider uppercase mt-0.5">
          Focus deeper. Learn smarter.
        </p>

        {/* Automated Welcome Line */}
        <div className="mt-3.5 mb-5">
          <p className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
            <span>{welcomeInfo.icon}</span>
            <span>{welcomeInfo.greeting}</span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{welcomeInfo.subtitle}</p>
        </div>

        {/* Motivational Quote Box (Recessed Clay Well) */}
        <div className="my-5 p-4 rounded-2xl clay-inset text-left relative group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Focus Wisdom
            </span>
            <button
              onClick={handleRefreshQuote}
              title="Get another quote"
              className="text-slate-400 hover:text-blue-300 transition-colors p-1 rounded-lg hover:bg-white/[0.08]"
              aria-label="Refresh quote"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-slate-300 italic leading-relaxed">&ldquo;{quote.text}&rdquo;</p>
          <p className="text-[11px] font-semibold text-amber-400 mt-2 text-right">&mdash; {quote.author}</p>
        </div>

        {/* Error Notification Alert */}
        {errorParam && (
          <div className="mb-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs text-left flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block text-amber-300">Notice</strong>
              {errorParam === 'oauth_not_configured'
                ? 'Google OAuth credentials are not set in environment variables.'
                : errorParam === 'db_connection_error'
                ? 'Could not connect to database. Please verify DATABASE_URL in Vercel.'
                : errorParam === 'auth_failed'
                ? 'Google sign-in was cancelled or encountered an error. Please try again.'
                : `Notice: ${errorParam}`}
            </div>
          </div>
        )}

        {/* Action Controls - Google Authentication (Tactile Clay Button) */}
        <div className="space-y-3 pt-1">
          <button
            onClick={handleGoogleLogin}
            className="w-full clay-btn bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm py-4 rounded-2xl shadow-xl flex items-center justify-center space-x-3 transition-all"
          >
            {/* Google G SVG */}
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
            <span>Sign in with Google</span>
          </button>

          <p className="text-[11px] text-slate-400 pt-2 font-medium">
            Authentication is required to sync your focus sessions, tasks, and coursework.
          </p>
        </div>

        {/* Setup Drawer Toggle if database or oauth is not fully configured */}
        {(!isConfigured || errorParam) && (
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <button
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="text-[11px] text-slate-400 hover:text-blue-400 flex items-center justify-center space-x-1 mx-auto transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Database &amp; Cloud Setup Guide</span>
              {showSetupGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showSetupGuide && (
              <div className="mt-3 p-3.5 rounded-xl bg-[#080D1A] border border-slate-800 text-[11px] text-slate-300 text-left space-y-2">
                <p className="font-semibold text-white">Vercel Environment Setup:</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-400">
                  <li><strong className="text-slate-200">DATABASE_URL:</strong> PostgreSQL connection string (Supabase / Neon).</li>
                  <li><strong className="text-slate-200">GOOGLE_CLIENT_ID:</strong> From Google Cloud Console.</li>
                  <li><strong className="text-slate-200">GOOGLE_CLIENT_SECRET:</strong> From Google Cloud Console.</li>
                  <li><strong className="text-slate-200">SESSION_SECRET:</strong> Any secure 32+ character string.</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-[11px] text-slate-600">
        Cognify &bull; Focus deeper. Learn smarter.
      </div>
    </div>
  );
};
