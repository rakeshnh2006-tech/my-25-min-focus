import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  Flame,
  Award,
  BookOpen,
  Calendar,
  PieChart as PieIcon,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { StatCard } from '../components/StatCard';
import { apiRequest } from '../lib/api';

interface AnalyticsSummary {
  totalFocusMinutes: number;
  totalFocusHours: number;
  totalCompletedSessions: number;
  averageSessionMinutes: number;
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  totalTasks: number;
  completedTasks: number;
  taskCompletionRate: number;
}

interface TrendDay {
  date: string;
  day: string;
  minutes: number;
  sessions: number;
}

interface SubjectBreakdownItem {
  id: string;
  name: string;
  color: string;
  minutes: number;
  sessions: number;
  percentage: number;
}

interface HeatmapDay {
  date: string;
  minutes: number;
  sessions: number;
  level: number;
}

export const AnalyticsPage: React.FC = () => {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trends, setTrends] = useState<TrendDay[]>([]);
  const [subjectsData, setSubjectsData] = useState<SubjectBreakdownItem[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const [sumRes, trendRes, subRes, heatRes] = await Promise.all([
        apiRequest<{ summary: AnalyticsSummary }>('/api/analytics/summary'),
        apiRequest<{ trends: TrendDay[] }>(`/api/analytics/trends?range=${range}`),
        apiRequest<{ subjects: SubjectBreakdownItem[]; totalMinutes: number }>('/api/analytics/subjects'),
        apiRequest<{ heatmap: HeatmapDay[] }>('/api/analytics/heatmap'),
      ]);

      setSummary(sumRes.summary);
      setTrends(trendRes.trends);
      setSubjectsData(subRes.subjects);
      setHeatmap(heatRes.heatmap);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const heatmapColors = [
    'bg-slate-800/40 border-slate-800', // 0: 0 mins
    'bg-focus-500/30 border-focus-500/40', // 1: 1-25 mins
    'bg-focus-500/60 border-focus-500/70', // 2: 26-50 mins
    'bg-focus-500/80 border-focus-500/90', // 3: 51-100 mins
    'bg-focus-500 border-focus-400', // 4: >100 mins
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header and Date Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Study Analytics</h1>
          <p className="text-xs text-slate-400">
            Insights on your focus duration, subject distribution, task velocity, and consistency.
          </p>
        </div>

        <div className="flex items-center space-x-1.5 p-1 rounded-xl glass-card border border-slate-800 w-fit">
          {(['7d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all ${
                range === r
                  ? 'bg-focus-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Focused Time"
          value={summary ? `${summary.totalFocusHours}h` : '0h'}
          subtitle={summary ? `${summary.totalFocusMinutes} focused minutes recorded` : undefined}
          icon={<Clock className="w-5 h-5 text-focus-400" />}
          accentColor="text-focus-400"
        />

        <StatCard
          title="Completed Sessions"
          value={summary ? summary.totalCompletedSessions : 0}
          subtitle="All-time verified Pomodoros"
          icon={<CheckCircle2 className="w-5 h-5 text-break-short" />}
          accentColor="text-break-short"
        />

        <StatCard
          title="Average Session Duration"
          value={summary ? `${summary.averageSessionMinutes}m` : '0m'}
          subtitle="Actual uninterrupted study time"
          icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
          accentColor="text-amber-400"
        />

        <StatCard
          title="Task Completion Rate"
          value={summary ? `${summary.taskCompletionRate}%` : '0%'}
          subtitle={
            summary
              ? `${summary.completedTasks} of ${summary.totalTasks} study tasks done`
              : 'Tasks marked completed'
          }
          icon={<Award className="w-5 h-5 text-break-long" />}
          accentColor="text-break-long"
          progress={summary?.taskCompletionRate || 0}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Focus Time Area Chart */}
        <div className="lg:col-span-8 glass-card rounded-2xl p-6 border border-slate-800/80 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Daily Focus Trend</h2>
            <p className="text-xs text-slate-400">
              Focused minutes recorded per day for the selected timeframe ({range})
            </p>
          </div>

          <div className="h-72 w-full pt-2">
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val}m`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      borderColor: '#1e293b',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: number) => [`${val} minutes`, 'Focus Time']}
                  />
                  <Area
                    type="monotone"
                    dataKey="minutes"
                    stroke="#f97316"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#focusGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No focus data recorded in this period yet.
              </div>
            )}
          </div>
        </div>

        {/* Subject Breakdown Donut Chart */}
        <div className="lg:col-span-4 glass-card rounded-2xl p-6 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <PieIcon className="w-4 h-4 text-focus-400" />
              <h2 className="text-base font-bold text-white tracking-tight">Time by Subject</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">Distribution of total focused hours</p>

            <div className="h-48 w-full">
              {subjectsData.length > 0 && subjectsData.some((s) => s.minutes > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subjectsData.filter((s) => s.minutes > 0)}
                      dataKey="minutes"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {subjectsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        borderColor: '#1e293b',
                        borderRadius: '0.75rem',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(val: number) => [`${val} mins`, 'Duration']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 text-center">
                  Study time by subject will display here as you complete sessions.
                </div>
              )}
            </div>
          </div>

          {/* Subject Legend List */}
          <div className="pt-3 border-t border-slate-800/60 space-y-1.5 max-h-36 overflow-y-auto">
            {subjectsData.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 truncate pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: sub.color }}
                  />
                  <span className="text-slate-300 truncate">{sub.name}</span>
                </div>
                <span className="font-semibold text-slate-200 flex-shrink-0">
                  {sub.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 90-Day Study Activity Heatmap */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-focus-400" />
              <h2 className="text-base font-bold text-white tracking-tight">Study Heatmap (90 Days)</h2>
            </div>
            <p className="text-xs text-slate-400">
              Consistency grid showing daily study intensity
            </p>
          </div>

          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
            <span>Less</span>
            {heatmapColors.map((cls, idx) => (
              <div key={idx} className={`w-3 h-3 rounded-sm border ${cls}`} />
            ))}
            <span>More</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="pt-2 overflow-x-auto">
          <div className="grid grid-flow-col grid-rows-7 gap-1.5 w-max">
            {heatmap.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.minutes} mins (${day.sessions} sessions)`}
                className={`w-3.5 h-3.5 rounded-sm border transition-transform hover:scale-125 cursor-pointer ${heatmapColors[day.level]}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
