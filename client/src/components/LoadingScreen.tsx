import React, { useState, useEffect } from 'react';

interface LoadingScreenProps {
  isLoading: boolean;
  onFinished?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading, onFinished }) => {
  const [progress, setProgress] = useState(12);
  const [statusMessage, setStatusMessage] = useState('Initializing workspace...');
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  // Progressive realistic loading sequence
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isLoading) {
      // Smoothly advance progress while waiting for authentication and initial data
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 35) {
            setStatusMessage('Configuring focus environment...');
            return prev + Math.floor(Math.random() * 8) + 4;
          } else if (prev < 65) {
            setStatusMessage('Syncing study intervals & tasks...');
            return prev + Math.floor(Math.random() * 6) + 3;
          } else if (prev < 88) {
            setStatusMessage('Preparing cognitive dashboard...');
            return prev + Math.floor(Math.random() * 4) + 1;
          }
          return prev; // Hold at ~88-92% until isLoading turns false
        });
      }, 90);
    } else {
      // Completed loading: smoothly shoot to 100% and trigger exit fade
      setProgress(100);
      setStatusMessage('Workspace ready!');

      const exitTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 200);

      const unmountTimer = setTimeout(() => {
        setShouldRender(false);
        if (onFinished) onFinished();
      }, 500);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(unmountTimer);
      };
    }

    return () => clearInterval(interval);
  }, [isLoading, onFinished]);

  if (!shouldRender) return null;

  return (
    <div
      className={`cognify-loading-screen fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 select-none transition-all duration-300 ease-out ${
        isFadingOut ? 'opacity-0 scale-[0.98] pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{ backgroundColor: '#070B16', color: '#F8FAFC' }}
      role="status"
      aria-live="polite"
    >
      {/* Dynamic ambient lighting orbs (study-optimal optical calming) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] xs:w-[420px] sm:w-[600px] h-[300px] xs:h-[420px] sm:h-[600px] bg-gradient-to-tr from-blue-600/18 via-indigo-600/10 to-transparent rounded-full blur-[90px] sm:blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[250px] sm:w-[450px] h-[250px] sm:h-[450px] bg-gradient-to-bl from-emerald-600/12 via-teal-600/6 to-transparent rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

      {/* Main Glassmorphic Card Container */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full mx-auto px-4">
        {/* Tactile 3D Squircle Logo Emblem */}
        <div className="relative w-18 h-18 sm:w-22 sm:h-22 mb-4 sm:mb-5 flex items-center justify-center">
          <div className="absolute inset-0 bg-blue-500/28 rounded-3xl blur-xl animate-pulse" />
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-900/90 border border-blue-400/40 shadow-2xl shadow-blue-500/20 flex items-center justify-center">
            <img
              src="/logo-256.png"
              alt="Cognify"
              className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
            />
          </div>
        </div>

        {/* Branding Title */}
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white mb-1">
          Cognify
        </h1>
        <p className="text-xs sm:text-sm font-medium text-slate-400 mb-6">
          Focus deeper. Learn smarter.
        </p>

        {/* Progress Bar Component */}
        <div className="w-full max-w-[240px] sm:max-w-[280px] space-y-2">
          {/* Progress Bar Track */}
          <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-white/10 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-200 ease-out relative overflow-hidden shadow-[0_0_12px_rgba(59,130,246,0.5)]"
              style={{ width: `${Math.min(100, progress)}%` }}
            >
              {/* Shimmer sweep effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
            </div>
          </div>

          {/* Progress Status Row */}
          <div className="flex items-center justify-between text-[11px] font-semibold px-0.5">
            <span className="text-slate-400 tracking-wide truncate max-w-[190px]">
              {statusMessage}
            </span>
            <span className="font-mono text-blue-400 font-bold ml-2">
              {Math.min(100, progress)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
