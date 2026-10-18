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
  accentColor = 'text-blue-400',
  progress,
}) => {
  return (
    <div className="clay-card clay-card-interactive p-5 flex flex-col justify-between relative overflow-hidden group">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            {title}
          </span>
          <div className={`p-2.5 rounded-2xl bg-slate-900/80 border border-white/[0.08] shadow-inner ${accentColor}`}>
            {icon}
          </div>
        </div>

        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {value}
          </span>
        </div>

        {subtitle && (
          <p className="mt-1 text-xs text-slate-400 font-medium">
            {subtitle}
          </p>
        )}
      </div>

      {typeof progress === 'number' && (
        <div className="mt-4 w-full clay-inset-sm rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-400 h-full rounded-full transition-all duration-500 shadow-sm shadow-blue-500/40"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
};
