import React, { useState, useEffect, useCallback } from 'react';
import {
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Coffee,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { LocalStorageRepository } from '../lib/storage';
import { FocusSession } from '../types';
import { Modal } from '../components/Modal';

export const HistoryPage: React.FC = () => {
  const { user, subjects } = useAuth();

  const [sessions, setSessions] = useState<FocusSession[]>(() =>
    LocalStorageRepository.getSessions().slice(0, 15)
  );
  const [total, setTotal] = useState<number>(() =>
    LocalStorageRepository.getSessions().length
  );
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState<number>(() =>
    Math.max(1, Math.ceil(LocalStorageRepository.getSessions().length / 15))
  );

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Selection & Deletion state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sessionToDelete, setSessionToDelete] = useState<FocusSession | null>(null);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    } catch {
      // Local cache fallback if cloud API temporarily fails
      let local = LocalStorageRepository.getSessions();
      if (statusFilter) local = local.filter((s) => s.status === statusFilter);
      if (typeFilter) local = local.filter((s) => s.sessionType === typeFilter);
      if (subjectFilter) local = local.filter((s) => s.subjectId === subjectFilter);

      const totalCount = local.length;
      const pages = Math.ceil(totalCount / limit) || 1;
      const startIndex = (page - 1) * limit;
      const pageSessions = local.slice(startIndex, startIndex + limit);

      setSessions(pageSessions);
      setTotal(totalCount);
      setTotalPages(pages);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, typeFilter, subjectFilter]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const pageIds = sessions.map((s) => s.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const confirmDeleteSingle = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      if (user) {
        await apiRequest(`/api/sessions/${sessionToDelete.id}`, { method: 'DELETE' }).catch(() => {});
      }
      LocalStorageRepository.deleteSession(sessionToDelete.id);
      setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setSelectedIds((prev) => prev.filter((id) => id !== sessionToDelete.id));
      setSessionToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteBatch = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      if (user) {
        await apiRequest('/api/sessions', {
          method: 'DELETE',
          body: JSON.stringify({ sessionIds: selectedIds }),
        }).catch(() => {});
      }
      LocalStorageRepository.deleteSessions(selectedIds);
      setSessions((prev) => prev.filter((s) => !selectedIds.includes(s.id)));
      setTotal((prev) => Math.max(0, prev - selectedIds.length));
      setSelectedIds([]);
      setShowBatchDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

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
      class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: CheckCircle2,
    },
    ABANDONED: {
      label: 'Abandoned',
      class: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      icon: XCircle,
    },
    SKIPPED: {
      label: 'Skipped',
      class: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: AlertTriangle,
    },
    RUNNING: {
      label: 'Active',
      class: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
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
        <h1 className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">Session History</h1>
        <p className="text-xs text-[#94A3B8]">
          Complete, verifiable log of every study interval and break taken.
        </p>
      </div>

      {/* Filter Controls Bar (Clay Glass Panel) */}
      <div className="clay-card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-1.5 text-xs text-blue-400 font-bold mr-1">
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
          className="clay-inset-sm rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-400 cursor-pointer"
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
          className="clay-inset-sm rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-400 cursor-pointer"
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
          className="clay-inset-sm rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-400 cursor-pointer"
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
            className="text-xs text-blue-400 hover:text-blue-300 font-bold ml-1 sm:ml-auto transition-colors"
          >
            Clear Filters
          </button>
        )}

        {/* Delete History Button for Selected Sessions */}
        {selectedIds.length > 0 && (
          <button
            onClick={() => setShowBatchDeleteModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-bold transition-all shadow-lg shadow-rose-500/25 ml-auto active:scale-95"
            title="Delete selected sessions from history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected ({selectedIds.length})</span>
          </button>
        )}
      </div>

      {/* Sessions Table (Clay Glass Container) */}
      <div className="clay-card overflow-hidden shadow-2xl p-0">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-slate-900/60 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-4 px-3 sm:px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={sessions.length > 0 && sessions.every((s) => selectedIds.includes(s.id))}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500 cursor-pointer"
                    aria-label="Select all sessions on this page"
                  />
                </th>
                <th className="py-4 px-4 sm:px-6">Date &amp; Start Time</th>
                <th className="py-4 px-4">Type</th>
                <th className="py-4 px-4">Subject &amp; Task</th>
                <th className="py-4 px-4">Planned Duration</th>
                <th className="py-4 px-4">Actual Focused</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-4 sm:px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-slate-300">
              {sessions.length > 0 ? (
                sessions.map((s) => {
                  const badge = statusBadges[s.status] || statusBadges.IDLE;
                  const StatusIcon = badge.icon;
                  const dateObj = new Date(s.startedAt || s.createdAt || Date.now());
                  const isSelected = selectedIds.includes(s.id);

                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-white/[0.04] transition-colors ${
                        isSelected ? 'bg-blue-500/[0.07]' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3 sm:px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(s.id)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500 cursor-pointer"
                          aria-label={`Select session ${s.id}`}
                        />
                      </td>

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
                            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                          ) : (
                            <Coffee className="w-3.5 h-3.5 text-emerald-400" />
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
                                backgroundColor: `${s.subject.color}20`,
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
                        {formatSeconds(s.plannedDuration || 1500)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                        {formatSeconds(s.actualDuration || 0)}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${badge.class}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSessionToDelete(s)}
                          title="Delete this session from history"
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/30"
                          aria-label="Delete session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No sessions match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800 bg-[#0d1322]/50 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing {sessions.length} of {total} sessions
            {selectedIds.length > 0 && ` (${selectedIds.length} selected)`}
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

      {/* Delete Single Session Confirmation Modal */}
      <Modal
        isOpen={Boolean(sessionToDelete)}
        onClose={() => setSessionToDelete(null)}
        title="Delete Session History?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to delete this{' '}
            <span className="text-white font-bold">
              {sessionToDelete?.sessionType === 'FOCUS' ? 'Focus Session' : 'Break'}
            </span>{' '}
            from your history? This will remove{' '}
            <span className="text-white font-bold">
              {formatSeconds(sessionToDelete?.actualDuration || 0)}
            </span>{' '}
            of recorded study time.
          </p>
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setSessionToDelete(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteSingle}
              disabled={isDeleting}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-bold shadow-lg shadow-rose-500/20 disabled:opacity-50 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Delete Session'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Batch Confirmation Modal */}
      <Modal
        isOpen={showBatchDeleteModal}
        onClose={() => setShowBatchDeleteModal(false)}
        title="Delete Selected Sessions?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to delete the{' '}
            <span className="text-white font-bold">{selectedIds.length}</span> selected
            session(s) from your history? This action is permanent and cannot be undone.
          </p>
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setShowBatchDeleteModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteBatch}
              disabled={isDeleting}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-bold shadow-lg shadow-rose-500/20 disabled:opacity-50 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : `Delete ${selectedIds.length} Sessions`}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
