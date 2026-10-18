import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { getRandomQuote, Quote } from '../lib/quotes';

interface FocusWisdomCardProps {
  className?: string;
  autoCycleIntervalMs?: number;
}

export const FocusWisdomCard: React.FC<FocusWisdomCardProps> = ({
  className = '',
  autoCycleIntervalMs = 20000,
}) => {
  const [quote, setQuote] = useState<Quote>(() => getRandomQuote());
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [renderKey, setRenderKey] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRefresh = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setQuote((prev) => getRandomQuote(prev.text));
      setRenderKey((prev) => prev + 1);
      setIsTransitioning(false);
    }, 240);
  }, [isTransitioning]);

  // Auto-cycle quote periodically unless hovered
  useEffect(() => {
    if (autoCycleIntervalMs <= 0 || isHovered) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, autoCycleIntervalMs);

    return () => clearInterval(interval);
  }, [autoCycleIntervalMs, handleRefresh, isHovered]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const words = quote.text.split(' ');

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-[#0C1427]/85 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/40 text-left group transition-all duration-300 hover:border-cyan-500/30 ${className}`}
    >
      {/* Top illuminated cyan specular accent */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

      {/* Ambient optical backlight glows */}
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Decorative typographic watermark quotation mark */}
      <div
        className="absolute right-3.5 top-1 font-serif text-5xl sm:text-6xl text-white/[0.035] select-none pointer-events-none leading-none"
        aria-hidden="true"
      >
        &ldquo;
      </div>

      {/* Card Header: Badge & Smooth Refresh Action */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center space-x-2">
          {/* Pulsing neon activity dot */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
          </span>

          <span className="text-[10px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
            Focus Wisdom
          </span>

          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded-full border border-white/[0.06]">
            <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
            <span>Daily Mindset</span>
          </span>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isTransitioning}
          title="Inspire me with another quote"
          className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 border border-white/[0.06] hover:border-cyan-500/30 text-slate-400 hover:text-cyan-300 transition-all duration-300 active:scale-90 group/btn focus:outline-none"
          aria-label="Get another focus quote"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 transition-transform duration-700 ease-out ${
              isTransitioning ? 'rotate-[360deg] text-cyan-400' : 'group-hover/btn:rotate-45'
            }`}
          />
        </button>
      </div>

      {/* Quote Body with Staggered Kinetic Blur-to-Focus Text Reveal */}
      <div
        key={renderKey}
        className={`relative z-10 min-h-[48px] sm:min-h-[52px] flex flex-col justify-between transition-all duration-200 ease-out ${
          isTransitioning
            ? 'opacity-0 -translate-y-1 scale-[0.98] filter blur-[4px]'
            : 'opacity-100 translate-y-0 scale-100 filter blur-0'
        }`}
      >
        <p className="text-xs sm:text-[13px] text-slate-200 font-normal leading-relaxed tracking-wide font-sans">
          <span className="text-cyan-400/80 mr-1 font-serif text-base">&ldquo;</span>
          {words.map((word, idx) => (
            <span
              key={`${renderKey}-${idx}-${word}`}
              className="inline-block mr-1 opacity-0"
              style={{
                animation: 'wordReveal 0.42s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                animationDelay: `${Math.min(idx * 22, 600)}ms`,
              }}
            >
              {word}
            </span>
          ))}
          <span className="text-cyan-400/80 ml-0.5 font-serif text-base">&rdquo;</span>
        </p>

        {/* Author Tag with Golden Glow */}
        <div
          className="mt-3 flex items-center justify-end gap-1.5 opacity-0"
          style={{
            animation: 'authorFadeIn 0.45s ease-out forwards',
            animationDelay: `${Math.min(words.length * 22 + 80, 750)}ms`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          <span className="text-[11px] font-semibold text-amber-300 tracking-wide">
            {quote.author}
          </span>
        </div>
      </div>
    </div>
  );
};
