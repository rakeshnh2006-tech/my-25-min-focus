import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accentColor?: string;
  progress?: number; // 0 to 100 optional
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  accentColor = 'text-focus-500',
  progress,
}) => {
  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800/80 transition-all duration-200 hover:border-slate-700 relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl bg-slate-800/60 ${accentColor}`}>
          {icon}
        </div>
      </div>

      <div className="mt-3 flex items-baseline space-x-2">
        <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {value}
        </span>
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
          {subtitle}
        </p>
      )}

      {typeof progress === 'number' && (
        <div className="mt-3 w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-focus-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
};
