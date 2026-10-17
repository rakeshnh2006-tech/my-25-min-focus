import React, { useEffect, useState, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  Flame,
  Target,
  Play,
  ArrowRight,
  BookOpen,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/StatCard';
import { apiRequest } from '../lib/api';
import { StudyTask, FocusSession } from '../types';

interface DashboardSummary {
  today: {
    date: string;
    formattedDate: string;
    focusedMinutes: number;
    completedPomodoros: number;
    dailyGoalMinutes: number;
    goalProgressPercentage: number;
  };
  streak: {
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
  };
  tasksDueToday: StudyTask[];
  recentSessions: FocusSession[];
}

interface DashboardProps {
  onNavigate: (page: string) => void;
  onSelectTaskForFocus?: (task: StudyTask) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onSelectTaskForFocus }) => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ day: string; minutes: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [sumRes, weekRes] = await Promise.all([
        apiRequest<DashboardSummary>('/api/dashboard/summary'),
        apiRequest<{ weekly: { day: string; minutes: number }[] }>('/api/dashboard/weekly'),
      ]);
      setSummary(sumRes);
      setWeeklyData(weekRes.weekly);
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleTaskCompletion = async (task: StudyTask) => {
    try {
      await apiRequest(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isCompleted: !task.isCompleted }),
      });
      fetchData();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatHoursMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Student';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800/80 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-bl from-focus-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Calendar className="w-3.5 h-3.5 text-focus-400" />
              <span>{summary?.today.formattedDate || 'Today'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {getGreeting()}, <span className="text-focus-400">{firstName}</span>!
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-lg">
              {summary && summary.today.focusedMinutes > 0
                ? `You've locked in ${formatHoursMinutes(summary.today.focusedMinutes)} of focused study today. Keep your momentum going!`
                : 'Ready to dive into deep work? Start your first Pomodoro interval and build your streak.'}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigate('timer')}
              className="flex items-center space-x-2.5 px-6 py-3.5 rounded-2xl bg-focus-500 hover:bg-focus-600 text-white font-bold text-sm shadow-glow transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Focusing</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Today's Focus Time"
          value={summary ? formatHoursMinutes(summary.today.focusedMinutes) : '0m'}
          subtitle={summary?.today.dailyGoalMinutes ? `Goal: ${summary.today.dailyGoalMinutes / 60}h / day` : undefined}
          icon={<Clock className="w-5 h-5 text-focus-400" />}
          accentColor="text-focus-400"
        />

        <StatCard
          title="Completed Sessions"
          value={summary ? `${summary.today.completedPomodoros}` : '0'}
          subtitle="25-minute Pomodoros today"
          icon={<CheckCircle2 className="w-5 h-5 text-break-short" />}
          accentColor="text-break-short"
        />

        <StatCard
          title="Daily Goal Progress"
          value={summary ? `${summary.today.goalProgressPercentage}%` : '0%'}
          subtitle={
            summary
              ? `${summary.today.focusedMinutes}m / ${summary.today.dailyGoalMinutes}m completed`
              : 'Target daily goal'
          }
          icon={<Target className="w-5 h-5 text-amber-400" />}
          accentColor="text-amber-400"
          progress={summary?.today.goalProgressPercentage || 0}
        />

        <StatCard
          title="Study Streak"
          value={summary ? `${summary.streak.currentStreak} Days` : '0 Days'}
          subtitle={summary ? `Longest streak: ${summary.streak.longestStreak} days` : 'Consecutive study days'}
          icon={<Flame className="w-5 h-5 text-focus-500" />}
          accentColor="text-focus-500"
        />
      </div>

      {/* Charts & Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Focus Time Bar Chart */}
        <div className="lg:col-span-7 glass-card rounded-2xl p-6 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Weekly Focus Hours</h2>
              <p className="text-xs text-slate-400">Total focused minutes over the past 7 days</p>
            </div>
            <button
              onClick={() => onNavigate('analytics')}
              className="text-xs text-focus-400 hover:text-focus-300 font-semibold flex items-center space-x-1"
            >
              <span>View Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full pt-2">
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="day"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val}m`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    contentStyle={{
                      backgroundColor: '#111827',
                      borderColor: '#1e293b',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: number) => [`${val} minutes focused`, 'Study Time']}
                  />
                  <Bar
                    dataKey="minutes"
                    fill="#f97316"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Loading weekly chart data...
              </div>
            )}
          </div>
        </div>

        {/* Tasks Due Today Widget */}
        <div className="lg:col-span-5 glass-card rounded-2xl p-6 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white tracking-tight">Tasks Due Today</h2>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs text-focus-400 hover:text-focus-300 font-semibold flex items-center space-x-1"
              >
                <span>Manage Tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {summary?.tasksDueToday && summary.tasksDueToday.length > 0 ? (
              <div className="space-y-2.5">
                {summary.tasksDueToday.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden mr-2">
                      <button
                        onClick={() => toggleTaskCompletion(task)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          task.isCompleted
                            ? 'bg-focus-500 border-focus-500 text-white'
                            : 'border-slate-700 hover:border-focus-400 text-transparent'
                        }`}
                        aria-label="Toggle task completion"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${task.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {task.title}
                        </p>
                        {task.subject && (
                          <span
                            className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-md mt-0.5"
                            style={{
                              backgroundColor: `${task.subject.color}15`,
                              color: task.subject.color,
                            }}
                          >
                            {task.subject.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (onSelectTaskForFocus) onSelectTaskForFocus(task);
                        onNavigate('timer');
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-focus-500 hover:text-white text-slate-300 font-medium transition-colors flex items-center space-x-1 flex-shrink-0"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Focus</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-800/60 mx-auto flex items-center justify-center text-slate-500">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-400">All caught up! No active tasks due today.</p>
                <button
                  onClick={() => onNavigate('tasks')}
                  className="text-xs text-focus-400 hover:underline font-semibold"
                >
                  Create a study task
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800/60 mt-4">
            <button
              onClick={() => onNavigate('tasks')}
              className="w-full py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-focus-500/50 hover:bg-slate-800/40 text-xs font-semibold text-slate-300 hover:text-white transition-all text-center block"
            >
              + Add New Task
            </button>
          </div>
        </div>
      </div>

      {/* Recently Completed Sessions */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Recent Activity</h2>
            <p className="text-xs text-slate-400">Your most recently completed study intervals</p>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs text-focus-400 hover:text-focus-300 font-semibold flex items-center space-x-1"
          >
            <span>View Full History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {summary?.recentSessions && summary.recentSessions.length > 0 ? (
          <div className="divide-y divide-slate-800/60">
            {summary.recentSessions.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-focus-500/10 border border-focus-500/20 flex items-center justify-center text-focus-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white">
                        {s.task?.title || (s.sessionType === 'FOCUS' ? 'Focus Session' : 'Break')}
                      </span>
                      {s.subject && (
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: `${s.subject.color}20`,
                            color: s.subject.color,
                          }}
                        >
                          {s.subject.name}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {Math.round(s.actualDuration / 60)} mins
                  </span>
                  <span className="block text-[10px] text-break-short font-semibold">Completed</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            No study sessions recorded yet. Start your first session above!
          </div>
        )}
      </div>
    </div>
  );
};
