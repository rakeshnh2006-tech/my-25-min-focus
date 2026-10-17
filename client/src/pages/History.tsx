import React, { useState, useEffect, useCallback } from 'react';
import {
  History as HistoryIcon,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Coffee,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { FocusSession } from '../types';

export const HistoryPage: React.FC = () => {
  const { subjects } = useAuth();

  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('sessionType', typeFilter);
      if (subjectFilter) params.append('subjectId', subjectFilter);

      const data = await apiRequest<{
        sessions: FocusSession[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>(`/api/sessions?${params.toString()}`);

      setSessions(data.sessions);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, typeFilter, subjectFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatSeconds = (secs: number) => {
    const mins = Math.round(secs / 60);
    return `${mins}m`;
  };

  const statusBadges = {
    COMPLETED: {
      label: 'Completed',
      class: 'bg-break-short/10 text-break-short border-break-short/20',
      icon: CheckCircle2,
    },
    ABANDONED: {
      label: 'Abandoned',
      class: 'bg-red-500/10 text-red-400 border-red-500/20',
      icon: XCircle,
    },
    SKIPPED: {
      label: 'Skipped',
      class: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: AlertTriangle,
    },
    RUNNING: {
      label: 'Active',
      class: 'bg-focus-500/10 text-focus-400 border-focus-500/20',
      icon: Clock,
    },
    PAUSED: {
      label: 'Paused',
      class: 'bg-slate-700/40 text-slate-400 border-slate-700',
      icon: Clock,
    },
    IDLE: {
      label: 'Idle',
      class: 'bg-slate-800 text-slate-500 border-slate-700',
      icon: Clock,
    },
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Session History</h1>
        <p className="text-xs text-slate-400">
          Complete, verifiable audit log of every study interval and break taken.
        </p>
      </div>

      {/* Filter Controls Bar */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-semibold mr-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-focus-500"
        >
          <option value="">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="ABANDONED">Abandoned</option>
          <option value="SKIPPED">Skipped</option>
        </select>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-focus-500"
        >
          <option value="">All Session Types</option>
          <option value="FOCUS">Focus Sessions</option>
          <option value="SHORT_BREAK">Short Breaks</option>
          <option value="LONG_BREAK">Long Breaks</option>
        </select>

        {/* Subject Filter */}
        <select
          value={subjectFilter}
          onChange={(e) => {
            setSubjectFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-focus-500"
        >
          <option value="">All Subjects</option>
          {subjects.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
            </option>
          ))}
        </select>

        {(statusFilter || typeFilter || subjectFilter) && (
          <button
            onClick={() => {
              setStatusFilter('');
              setTypeFilter('');
              setSubjectFilter('');
              setPage(1);
            }}
            className="text-xs text-focus-400 hover:underline font-semibold ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Sessions Table */}
      <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0d1322]/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">Date & Start Time</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Subject & Task</th>
                <th className="py-3.5 px-4">Planned Duration</th>
                <th className="py-3.5 px-4">Actual Focused</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {sessions.length > 0 ? (
                sessions.map((s) => {
                  const badge = statusBadges[s.status] || statusBadges.IDLE;
                  const StatusIcon = badge.icon;
                  const dateObj = new Date(s.startedAt);

                  return (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 font-medium text-white whitespace-nowrap">
                        <div>
                          {dateObj.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1.5 font-semibold text-white">
                          {s.sessionType === 'FOCUS' ? (
                            <Sparkles className="w-3.5 h-3.5 text-focus-400" />
                          ) : (
                            <Coffee className="w-3.5 h-3.5 text-break-short" />
                          )}
                          <span>
                            {s.sessionType === 'FOCUS'
                              ? 'Focus'
                              : s.sessionType === 'SHORT_BREAK'
                              ? 'Short Break'
                              : 'Long Break'}
                          </span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col space-y-0.5">
                          {s.subject ? (
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded w-fit"
                              style={{
                                backgroundColor: `${s.subject.color}15`,
                                color: s.subject.color,
                              }}
                            >
                              {s.subject.name}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">General Study</span>
                          )}
                          {s.task && (
                            <span className="text-xs text-slate-300 truncate max-w-xs">
                              {s.task.title}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {formatSeconds(s.plannedDuration)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                        {formatSeconds(s.actualDuration)}
                      </td>

                      <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${badge.class}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No sessions match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800/80 bg-[#0d1322]/50 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing {sessions.length} of {total} sessions
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-200">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
