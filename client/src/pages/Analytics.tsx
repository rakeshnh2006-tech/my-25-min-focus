import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  Award,
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
} from 'recharts';
import { StatCard } from '../components/StatCard';
import { apiRequest } from '../lib/api';
import { LocalStorageRepository } from '../lib/storage';
import { useAuth } from '../context/AuthContext';

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
  const { user } = useAuth();
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trends, setTrends] = useState<TrendDay[]>([]);
  const [subjectsData, setSubjectsData] = useState<SubjectBreakdownItem[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const computeLocalAnalytics = useCallback((selectedRange: '7d' | '30d' | '90d') => {
    const sessions = LocalStorageRepository.getSessions();
    const streak = LocalStorageRepository.getStreak();
    const tasks = LocalStorageRepository.getTasks();
    const subjects = LocalStorageRepository.getSubjects();

    const completed = sessions.filter(
      (s) => s.status === 'COMPLETED' && s.sessionType === 'FOCUS'
    );
    const totalSecs = completed.reduce(
      (acc, s) => acc + (s.actualDuration || s.plannedDuration || 0),
      0
    );
    const totalMins = Math.round(totalSecs / 60);
    const totalHrs = Number((totalMins / 60).toFixed(1));
    const avgMins = completed.length > 0 ? Math.round(totalMins / completed.length) : 0;

    const activeDaysSet = new Set(
      completed.map((s) => (s.startedAt || s.createdAt || new Date().toISOString()).split('T')[0])
    );
    const completedTasks = tasks.filter((t) => t.isCompleted).length;
    const taskRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    const localSummary: AnalyticsSummary = {
      totalFocusMinutes: totalMins,
      totalFocusHours: totalHrs,
      totalCompletedSessions: completed.length,
      averageSessionMinutes: avgMins,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalActiveDays: activeDaysSet.size,
      totalTasks: tasks.length,
      completedTasks,
      taskCompletionRate: taskRate,
    };

    const daysCount = selectedRange === '7d' ? 7 : selectedRange === '30d' ? 30 : 90;
    const localTrends: TrendDay[] = [];
    const now = new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const daySessions = completed.filter((s) =>
        (s.startedAt || s.createdAt || '').startsWith(dateStr)
      );
      const mins = Math.round(
        daySessions.reduce(
          (acc, s) => acc + (s.actualDuration || s.plannedDuration || 0),
          0
        ) / 60
      );
      localTrends.push({
        date: dateStr,
        day: dayName,
        minutes: mins,
        sessions: daySessions.length,
      });
    }

    const localSubjects: SubjectBreakdownItem[] = subjects.map((sub) => {
      const subSessions = completed.filter((s) => s.subjectId === sub.id);
      const subMins = Math.round(
        subSessions.reduce(
          (acc, s) => acc + (s.actualDuration || s.plannedDuration || 0),
          0
        ) / 60
      );
      const pct = totalMins > 0 ? Math.round((subMins / totalMins) * 100) : 0;
      return {
        id: sub.id,
        name: sub.name,
        color: sub.color,
        minutes: subMins,
        sessions: subSessions.length,
        percentage: pct,
      };
    });

    const localHeatmap: HeatmapDay[] = [];
    for (let i = 59; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const daySessions = completed.filter((s) =>
        (s.startedAt || s.createdAt || '').startsWith(dateStr)
      );
      const mins = Math.round(
        daySessions.reduce(
          (acc, s) => acc + (s.actualDuration || s.plannedDuration || 0),
          0
        ) / 60
      );
      let level = 0;
      if (mins > 100) level = 4;
      else if (mins > 50) level = 3;
      else if (mins > 25) level = 2;
      else if (mins > 0) level = 1;
      localHeatmap.push({
        date: dateStr,
        minutes: mins,
        sessions: daySessions.length,
        level,
      });
    }

    setSummary(localSummary);
    setTrends(localTrends);
    setSubjectsData(localSubjects);
    setHeatmap(localHeatmap);
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
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
    } catch {
      computeLocalAnalytics(range);
    } finally {
      setIsLoading(false);
    }
  }, [range, computeLocalAnalytics]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const heatmapColors = [
    'bg-slate-900 border-slate-800', // 0: 0 mins
    'bg-blue-500/20 border-blue-500/30', // 1: 1-25 mins
    'bg-blue-500/40 border-blue-500/50', // 2: 26-50 mins
    'bg-blue-500/70 border-blue-500/80', // 3: 51-100 mins
    'bg-focus-500 border-focus-400', // 4: >100 mins
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header and Date Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">Study Analytics</h1>
          <p className="text-xs text-[#94A3B8]">
            Insights on your focus duration, subject distribution, task velocity, and consistency.
          </p>
        </div>

        <div className="flex items-center space-x-1.5 p-1.5 rounded-2xl clay-inset max-w-full overflow-x-auto no-scrollbar">
          {(['7d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`clay-chip px-3.5 py-1.5 text-xs font-bold uppercase transition-all flex-shrink-0 ${
                range === r
                  ? 'clay-btn-focus shadow-md shadow-blue-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards (Rendered with claymorphism via StatCard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Focused Time"
          value={summary ? `${summary.totalFocusHours}h` : '0h'}
          subtitle={summary ? `${summary.totalFocusMinutes} focused minutes recorded` : undefined}
          icon={<Clock className="w-5 h-5 text-blue-400" />}
          accentColor="text-blue-400"
        />

        <StatCard
          title="Completed Sessions"
          value={summary ? summary.totalCompletedSessions : 0}
          subtitle="All-time verified focus sessions"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          accentColor="text-emerald-400"
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
          icon={<Award className="w-5 h-5 text-violet-400" />}
          accentColor="text-violet-400"
          progress={summary?.taskCompletionRate || 0}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Focus Time Area Chart (Clay Glass Panel) */}
        <div className="lg:col-span-8 clay-card p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight">Daily Focus Trend</h2>
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
                      <stop offset="5%" stopColor="#4E75FF" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#4E75FF" stopOpacity={0.0} />
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
                      backgroundColor: '#0A1020',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '1rem',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.8)',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: number) => [`${val} minutes`, 'Focus Time']}
                  />
                  <Area
                    type="monotone"
                    dataKey="minutes"
                    stroke="#4E75FF"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#focusGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No focus data recorded in this period yet.
              </div>
            )}
          </div>
        </div>

        {/* Subject Breakdown Donut Chart (Clay Glass Panel) */}
        <div className="lg:col-span-4 clay-card p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <PieIcon className="w-4 h-4 text-blue-400" />
              <h2 className="text-base font-extrabold text-white tracking-tight">Time by Subject</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4 font-medium">Distribution of total focused hours</p>

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
                        backgroundColor: '#0A1020',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '1rem',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.8)',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(val: number) => [`${val} mins`, 'Duration']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 text-center">
                  Study time by subject will display here as you complete sessions.
                </div>
              )}
            </div>
          </div>

          {/* Subject Legend List */}
          <div className="pt-3 border-t border-white/[0.08] space-y-1.5 max-h-36 overflow-y-auto">
            {subjectsData.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 truncate pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: sub.color }}
                  />
                  <span className="text-slate-300 truncate font-semibold">{sub.name}</span>
                </div>
                <span className="font-bold text-white flex-shrink-0">
                  {sub.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Study Activity Heatmap (Clay Glass Panel) */}
      <div className="clay-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <h2 className="text-base font-extrabold text-white tracking-tight">Study Heatmap (60 Days)</h2>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Consistency grid showing daily study intensity
            </p>
          </div>

          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-semibold">
            <span>Less</span>
            {heatmapColors.map((cls, idx) => (
              <div key={idx} className={`w-3.5 h-3.5 rounded-sm border ${cls}`} />
            ))}
            <span>More</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="pt-2 overflow-x-auto no-scrollbar">
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
