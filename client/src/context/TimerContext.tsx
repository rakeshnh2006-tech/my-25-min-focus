import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { SessionType, TimerMode, SessionStatus, FocusSession, TimerPreset } from '../types';
import { apiRequest } from '../lib/api';
import { soundManager } from '../lib/sound';
import { LocalStorageRepository, ActiveTimerSnapshot } from '../lib/storage';
import { useAuth } from './AuthContext';

interface TimerContextType {
  status: SessionStatus;
  mode: TimerMode;
  secondsRemaining: number;
  totalDuration: number;
  cycleCount: number; // 1 to 4
  activeSession: FocusSession | null;
  selectedSubjectId: string | null;
  selectedTaskId: string | null;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  showCompletionModal: boolean;
  lastCompletedMode: TimerMode | null;
  activePreset: TimerPreset;
  stopwatchElapsedSeconds: number;
  isRainPlaying: boolean;
  rainVolume: number;
  isPiPActive: boolean;

  startTimer: () => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  endSession: (taskIdOverride?: string | null) => Promise<void>;
  resetTimer: () => Promise<void>;
  skipSession: () => Promise<void>;
  abandonSession: () => Promise<void>;
  switchMode: (newMode: TimerMode) => void;
  applyPreset: (preset: TimerPreset) => void;
  setSelectedSubjectId: (id: string | null) => void;
  setSelectedTaskId: (id: string | null) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  closeCompletionModal: () => void;
  proceedToNextSession: () => void;
  toggleRain: () => void;
  setRainVolume: (volume: number) => void;
  togglePiP: () => Promise<void>;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const PRESET_DURATIONS: Record<TimerPreset, { focus: number; shortBreak: number; longBreak: number }> = {
  '25/5': { focus: 25, shortBreak: 5, longBreak: 15 },
  '50/10': { focus: 50, shortBreak: 10, longBreak: 20 },
  '60/10': { focus: 60, shortBreak: 10, longBreak: 25 },
  '90/20': { focus: 90, shortBreak: 20, longBreak: 30 },
  custom: { focus: 25, shortBreak: 5, longBreak: 15 },
};

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, preference, updatePreferences } = useAuth();

  // Load saved snapshot on initialization if page was refreshed
  const initialSnapshot = useRef<ActiveTimerSnapshot | null>(
    typeof window !== 'undefined' ? LocalStorageRepository.getActiveTimerSnapshot() : null
  ).current;

  const [activePreset, setActivePreset] = useState<TimerPreset>(() => {
    if (initialSnapshot?.activePreset) return initialSnapshot.activePreset;
    return preference?.activePreset || '25/5';
  });

  const currentDurations = PRESET_DURATIONS[activePreset] || PRESET_DURATIONS['25/5'];
  const focusDurationSecs = (preference?.focusDuration || currentDurations.focus) * 60;
  const shortBreakDurationSecs = (preference?.shortBreakDuration || currentDurations.shortBreak) * 60;
  const longBreakDurationSecs = (preference?.longBreakDuration || currentDurations.longBreak) * 60;
  const longBreakInterval = preference?.longBreakInterval || 4;

  const getDefaultDurationForMode = useCallback(
    (m: TimerMode) => {
      if (m === 'FOCUS') return focusDurationSecs;
      if (m === 'SHORT_BREAK') return shortBreakDurationSecs;
      if (m === 'LONG_BREAK') return longBreakDurationSecs;
      return 0;
    },
    [focusDurationSecs, shortBreakDurationSecs, longBreakDurationSecs]
  );

  const [mode, setMode] = useState<TimerMode>(() => initialSnapshot?.mode || 'FOCUS');

  const [status, setStatus] = useState<SessionStatus>(() => {
    if (!initialSnapshot) return 'IDLE';
    if (initialSnapshot.status === 'RUNNING') {
      if (initialSnapshot.mode === 'STOPWATCH') return 'RUNNING';
      if (initialSnapshot.targetEndMs && initialSnapshot.targetEndMs <= Date.now()) {
        return 'COMPLETED';
      }
      return 'RUNNING';
    }
    if (initialSnapshot.status === 'PAUSED') return 'PAUSED';
    return 'IDLE';
  });

  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    () => initialSnapshot?.selectedSubjectId || null
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    () => initialSnapshot?.selectedTaskId || null
  );

  const [cycleCount, setCycleCount] = useState<number>(() => initialSnapshot?.cycleCount || 1);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [lastCompletedMode, setLastCompletedMode] = useState<TimerMode | null>(null);

  // Stopwatch state
  const [stopwatchElapsedSeconds, setStopwatchElapsedSeconds] = useState<number>(() => {
    if (initialSnapshot?.mode === 'STOPWATCH' && initialSnapshot.stopwatchStartMs) {
      return Math.max(
        0,
        Math.floor((Date.now() - initialSnapshot.stopwatchStartMs - (initialSnapshot.totalPausedMs || 0)) / 1000)
      );
    }
    return 0;
  });

  // Ambient rain sound state
  const [isRainPlaying, setIsRainPlaying] = useState<boolean>(false);
  const [rainVolume, setRainVolumeState] = useState<number>(preference?.ambientVolume ?? 0.5);

  // Picture in picture state
  const [isPiPActive, setIsPiPActive] = useState<boolean>(false);
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);

  const [totalDuration, setTotalDuration] = useState<number>(() => {
    if (initialSnapshot?.totalDuration) return initialSnapshot.totalDuration;
    return focusDurationSecs;
  });

  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (!initialSnapshot) return focusDurationSecs;
    if (initialSnapshot.status === 'RUNNING') {
      if (initialSnapshot.mode === 'STOPWATCH') {
        return Math.max(
          0,
          Math.floor((Date.now() - (initialSnapshot.stopwatchStartMs || Date.now()) - (initialSnapshot.totalPausedMs || 0)) / 1000)
        );
      }
      if (initialSnapshot.targetEndMs) {
        return Math.max(0, Math.ceil((initialSnapshot.targetEndMs - Date.now()) / 1000));
      }
    }
    if (initialSnapshot.status === 'PAUSED') {
      return initialSnapshot.remainingAtPause ?? initialSnapshot.secondsRemaining ?? focusDurationSecs;
    }
    return focusDurationSecs;
  });

  const [soundEnabled, setSoundEnabledState] = useState<boolean>(preference?.soundEnabled ?? true);
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(
    preference?.notificationsEnabled ?? false
  );

  // Wall clock references
  const targetEndRef = useRef<number | null>(
    initialSnapshot?.status === 'RUNNING' && initialSnapshot.targetEndMs ? initialSnapshot.targetEndMs : null
  );
  const pauseStartRef = useRef<number | null>(
    initialSnapshot?.status === 'PAUSED' && initialSnapshot.pauseStartMs ? initialSnapshot.pauseStartMs : null
  );
  const stopwatchStartRef = useRef<number | null>(
    initialSnapshot?.mode === 'STOPWATCH' && initialSnapshot.stopwatchStartMs
      ? initialSnapshot.stopwatchStartMs
      : null
  );
  const startedAtMsRef = useRef<number>(initialSnapshot?.startedAtMs || Date.now());
  const totalPausedMsRef = useRef<number>(initialSnapshot?.totalPausedMs || 0);

  const intervalIdRef = useRef<any>(null);
  const isCompletingRef = useRef<boolean>(false);
  const isActionInProgressRef = useRef<boolean>(false);

  // Sync preference updates to timer defaults when idle
  useEffect(() => {
    if (status === 'IDLE') {
      const dur = getDefaultDurationForMode(mode);
      setTotalDuration(dur);
      setSecondsRemaining(dur);
    }
  }, [mode, status, getDefaultDurationForMode]);

  // Persist active timer snapshot to LocalStorage for tab refresh / browser recovery
  useEffect(() => {
    if (status === 'RUNNING' || status === 'PAUSED') {
      LocalStorageRepository.saveActiveTimerSnapshot({
        sessionId: activeSession?.id || null,
        mode,
        status,
        totalDuration,
        secondsRemaining,
        targetEndMs: targetEndRef.current,
        pauseStartMs: pauseStartRef.current,
        remainingAtPause: status === 'PAUSED' ? secondsRemaining : null,
        stopwatchStartMs: stopwatchStartRef.current,
        startedAtMs: startedAtMsRef.current,
        totalPausedMs: totalPausedMsRef.current,
        selectedSubjectId,
        selectedTaskId,
        cycleCount,
        activePreset,
        updatedAtMs: Date.now(),
      });
    } else {
      LocalStorageRepository.clearActiveTimerSnapshot();
    }
  }, [
    status,
    mode,
    totalDuration,
    secondsRemaining,
    selectedSubjectId,
    selectedTaskId,
    cycleCount,
    activePreset,
    activeSession?.id,
  ]);

  // Synchronize with server active session on login / mount
  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    apiRequest<{ session: FocusSession | null }>('/api/sessions/active')
      .then((data) => {
        if (isCancelled || !data?.session) return;
        const serverSession = data.session;
        setActiveSession(serverSession);

        // If local status is IDLE, hydrate from server active session
        if (status === 'IDLE') {
          if (serverSession.status === 'RUNNING' && serverSession.targetEndAt) {
            const endMs = new Date(serverSession.targetEndAt).getTime();
            const now = Date.now();
            if (endMs <= now) {
              // Server session completed while user was away
              apiRequest(`/api/sessions/${serverSession.id}/complete`, {
                method: 'POST',
                body: JSON.stringify({ actualDuration: serverSession.plannedDuration }),
              }).catch(() => {});
            } else {
              setMode(serverSession.sessionType as TimerMode);
              setTotalDuration(serverSession.plannedDuration);
              const remaining = Math.max(0, Math.ceil((endMs - now) / 1000));
              setSecondsRemaining(remaining);
              targetEndRef.current = endMs;
              startedAtMsRef.current = new Date(serverSession.startedAt).getTime();
              setStatus('RUNNING');
            }
          } else if (serverSession.status === 'PAUSED') {
            setMode(serverSession.sessionType as TimerMode);
            setTotalDuration(serverSession.plannedDuration);
            setStatus('PAUSED');
          }
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [user]);

  // Browser Tab Countdown Title Synchronization
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (status === 'RUNNING' || status === 'PAUSED') {
      const mins = Math.floor(secondsRemaining / 60);
      const secs = secondsRemaining % 60;
      const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      const prefix = status === 'PAUSED' ? '❚❚ ' : '';
      const modeLabel = mode === 'FOCUS' ? 'Focus' : mode === 'STOPWATCH' ? 'Stopwatch' : 'Break';
      document.title = `${prefix}(${timeStr}) Cognify • ${modeLabel}`;
    } else {
      document.title = 'Cognify — Focus deeper. Learn smarter.';
    }
  }, [secondsRemaining, status, mode]);

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    updatePreferences({ soundEnabled: enabled }).catch(() => {});
  };

  const setNotificationsEnabled = async (enabled: boolean) => {
    if (enabled && typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabledState(true);
        updatePreferences({ notificationsEnabled: true }).catch(() => {});
      } else {
        setNotificationsEnabledState(false);
      }
    } else {
      setNotificationsEnabledState(false);
      updatePreferences({ notificationsEnabled: false }).catch(() => {});
    }
  };

  // Ambient Rain Controls
  const toggleRain = () => {
    if (isRainPlaying) {
      soundManager.stopRain();
      setIsRainPlaying(false);
    } else {
      soundManager.startRain(rainVolume);
      setIsRainPlaying(true);
    }
  };

  const setRainVolume = (volume: number) => {
    setRainVolumeState(volume);
    soundManager.setRainVolume(volume);
    updatePreferences({ ambientVolume: volume }).catch(() => {});
  };

  // Preset Switcher
  const applyPreset = (preset: TimerPreset) => {
    setActivePreset(preset);
    const d = PRESET_DURATIONS[preset] || PRESET_DURATIONS['25/5'];
    updatePreferences({
      activePreset: preset,
      focusDuration: d.focus,
      shortBreakDuration: d.shortBreak,
      longBreakDuration: d.longBreak,
    }).catch(() => {});

    if (status === 'IDLE') {
      if (mode === 'FOCUS') {
        setTotalDuration(d.focus * 60);
        setSecondsRemaining(d.focus * 60);
      } else if (mode === 'SHORT_BREAK') {
        setTotalDuration(d.shortBreak * 60);
        setSecondsRemaining(d.shortBreak * 60);
      } else if (mode === 'LONG_BREAK') {
        setTotalDuration(d.longBreak * 60);
        setSecondsRemaining(d.longBreak * 60);
      }
    }
  };

  // Complete session handler (Atomic execution, exactly once)
  const handleSessionComplete = useCallback(async () => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    targetEndRef.current = null;
    pauseStartRef.current = null;
    LocalStorageRepository.clearActiveTimerSnapshot();

    setStatus('COMPLETED');
    setSecondsRemaining(0);
    setLastCompletedMode(mode);

    // Audio chime
    if (soundEnabled) {
      if (mode === 'FOCUS') {
        soundManager.playSessionComplete();
      } else {
        soundManager.playBreakComplete();
      }
    }

    // Browser Notification
    if (notificationsEnabled && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const title = mode === 'FOCUS' ? 'Focus Session Complete! 🎉' : 'Break Ended! ⏰';
        const body =
          mode === 'FOCUS'
            ? 'Awesome work! Take a well-deserved break to recharge.'
            : 'Ready to get back in the flow? Start your next focus interval.';
        try {
          new Notification(title, { body, icon: '/favicon.png' });
        } catch {
          // ignore
        }
      }
    }

    // Save session completion (Unified offline & cloud) with deduplication
    const duration = totalDuration;
    const currentSessionId = activeSession?.id;

    if (mode === 'FOCUS' || mode === 'SHORT_BREAK' || mode === 'LONG_BREAK') {
      LocalStorageRepository.recordCompletedSession(
        mode as SessionType,
        duration,
        selectedSubjectId,
        selectedTaskId,
        currentSessionId,
        totalDuration
      );
    }

    if (activeSession && user) {
      try {
        await apiRequest(`/api/sessions/${activeSession.id}/complete`, {
          method: 'POST',
          body: JSON.stringify({ actualDuration: duration }),
        });
      } catch (err) {
        console.warn('Failed to complete session on server (persisted locally):', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('focusflow_session_completed'));
    }

    setActiveSession(null);

    // Update cycle counts if Focus completed
    if (mode === 'FOCUS') {
      setCycleCount((prev) => (prev >= longBreakInterval ? 1 : prev + 1));
    }

    setShowCompletionModal(true);
    isCompletingRef.current = false;
  }, [
    mode,
    activeSession,
    totalDuration,
    selectedSubjectId,
    selectedTaskId,
    user,
    soundEnabled,
    notificationsEnabled,
    longBreakInterval,
  ]);

  // Tick calculation based strictly on authoritative wall clock
  const updateTick = useCallback(() => {
    if (mode === 'STOPWATCH') {
      if (!stopwatchStartRef.current) return;
      const now = Date.now();
      const elapsed = Math.max(
        0,
        Math.floor((now - stopwatchStartRef.current - totalPausedMsRef.current) / 1000)
      );
      setStopwatchElapsedSeconds(elapsed);
      setSecondsRemaining(elapsed);
      return;
    }

    if (!targetEndRef.current) return;
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((targetEndRef.current - now) / 1000));
    setSecondsRemaining(remaining);

    // Guard against negative countdown and duplicate completion triggers
    if (remaining <= 0) {
      if (isCompletingRef.current) return;
      isCompletingRef.current = true;
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      targetEndRef.current = null;
      handleSessionComplete();
    }
  }, [mode, handleSessionComplete]);

  // Handle page load recovery if timer reached zero while tab was closed/reloaded
  useEffect(() => {
    if (
      initialSnapshot?.status === 'RUNNING' &&
      initialSnapshot.mode !== 'STOPWATCH' &&
      initialSnapshot.targetEndMs &&
      initialSnapshot.targetEndMs <= Date.now()
    ) {
      if (!isCompletingRef.current) {
        isCompletingRef.current = true;
        handleSessionComplete();
      }
    }
  }, [initialSnapshot, handleSessionComplete]);

  // Tab visibility, focus, and device wake-up synchronization
  useEffect(() => {
    const handleSync = () => {
      if (status === 'RUNNING') {
        updateTick();
      }
    };
    document.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);
    window.addEventListener('pageshow', handleSync);
    return () => {
      document.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('pageshow', handleSync);
    };
  }, [status, updateTick]);

  // Running interval
  useEffect(() => {
    if (status === 'RUNNING') {
      intervalIdRef.current = setInterval(updateTick, 250);
    } else {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    }
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [status, updateTick]);

  // Timer controls
  const startTimer = async () => {
    if (isActionInProgressRef.current || status === 'RUNNING') return;
    isCompletingRef.current = false;
    isActionInProgressRef.current = true;

    try {
      soundManager.playTick();
      const duration = getDefaultDurationForMode(mode);

      setTotalDuration(duration);
      setSecondsRemaining(duration);

      const now = Date.now();
      startedAtMsRef.current = now;
      totalPausedMsRef.current = 0;
      pauseStartRef.current = null;

      if (mode === 'STOPWATCH') {
        stopwatchStartRef.current = now;
        setStopwatchElapsedSeconds(0);
        setStatus('RUNNING');
      } else {
        targetEndRef.current = now + duration * 1000;
        setStatus('RUNNING');
      }

      // Save initial snapshot immediately
      LocalStorageRepository.saveActiveTimerSnapshot({
        sessionId: null,
        mode,
        status: 'RUNNING',
        totalDuration: duration,
        secondsRemaining: duration,
        targetEndMs: targetEndRef.current,
        pauseStartMs: null,
        remainingAtPause: null,
        stopwatchStartMs: stopwatchStartRef.current,
        startedAtMs: now,
        totalPausedMs: 0,
        selectedSubjectId,
        selectedTaskId,
        cycleCount,
        activePreset,
        updatedAtMs: now,
      });

      // Cloud session creation if authenticated
      if (user && (mode === 'FOCUS' || mode === 'SHORT_BREAK' || mode === 'LONG_BREAK')) {
        try {
          const data = await apiRequest<{ session: FocusSession }>('/api/sessions', {
            method: 'POST',
            body: JSON.stringify({
              sessionType: mode,
              plannedDuration: duration,
              subjectId: selectedSubjectId || undefined,
              taskId: selectedTaskId || undefined,
            }),
          });
          setActiveSession(data.session);
          // Update snapshot with authoritative session ID
          LocalStorageRepository.saveActiveTimerSnapshot({
            sessionId: data.session.id,
            mode,
            status: 'RUNNING',
            totalDuration: duration,
            secondsRemaining: duration,
            targetEndMs: targetEndRef.current,
            pauseStartMs: null,
            remainingAtPause: null,
            stopwatchStartMs: stopwatchStartRef.current,
            startedAtMs: now,
            totalPausedMs: 0,
            selectedSubjectId,
            selectedTaskId,
            cycleCount,
            activePreset,
            updatedAtMs: Date.now(),
          });
        } catch (err) {
          console.warn('Could not record session initiation on cloud API:', err);
        }
      }
    } finally {
      isActionInProgressRef.current = false;
    }
  };

  const pauseTimer = async () => {
    if (isActionInProgressRef.current || status !== 'RUNNING') return;
    isActionInProgressRef.current = true;

    try {
      soundManager.playTick();
      const now = Date.now();
      pauseStartRef.current = now;
      setStatus('PAUSED');

      // Persist pause snapshot immediately
      LocalStorageRepository.saveActiveTimerSnapshot({
        sessionId: activeSession?.id || null,
        mode,
        status: 'PAUSED',
        totalDuration,
        secondsRemaining,
        targetEndMs: targetEndRef.current,
        pauseStartMs: now,
        remainingAtPause: secondsRemaining,
        stopwatchStartMs: stopwatchStartRef.current,
        startedAtMs: startedAtMsRef.current,
        totalPausedMs: totalPausedMsRef.current,
        selectedSubjectId,
        selectedTaskId,
        cycleCount,
        activePreset,
        updatedAtMs: now,
      });

      if (activeSession && user) {
        try {
          await apiRequest(`/api/sessions/${activeSession.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ action: 'PAUSE' }),
          });
        } catch (err) {
          console.warn('Could not update pause on cloud server:', err);
        }
      }
    } finally {
      isActionInProgressRef.current = false;
    }
  };

  const resumeTimer = async () => {
    if (isActionInProgressRef.current || status !== 'PAUSED') return;
    isActionInProgressRef.current = true;

    try {
      soundManager.playTick();
      const now = Date.now();

      if (mode === 'STOPWATCH') {
        if (pauseStartRef.current && stopwatchStartRef.current) {
          const pausedMs = now - pauseStartRef.current;
          totalPausedMsRef.current += pausedMs;
          stopwatchStartRef.current += pausedMs;
        }
        pauseStartRef.current = null;
        setStatus('RUNNING');
      } else {
        if (pauseStartRef.current) {
          const pauseDuration = now - pauseStartRef.current;
          totalPausedMsRef.current += pauseDuration;
        }
        // Authoritative new target end derived from remaining seconds
        targetEndRef.current = now + secondsRemaining * 1000;
        pauseStartRef.current = null;
        setStatus('RUNNING');
      }

      // Update snapshot immediately
      LocalStorageRepository.saveActiveTimerSnapshot({
        sessionId: activeSession?.id || null,
        mode,
        status: 'RUNNING',
        totalDuration,
        secondsRemaining,
        targetEndMs: targetEndRef.current,
        pauseStartMs: null,
        remainingAtPause: null,
        stopwatchStartMs: stopwatchStartRef.current,
        startedAtMs: startedAtMsRef.current,
        totalPausedMs: totalPausedMsRef.current,
        selectedSubjectId,
        selectedTaskId,
        cycleCount,
        activePreset,
        updatedAtMs: now,
      });

      if (activeSession && user) {
        try {
          await apiRequest(`/api/sessions/${activeSession.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ action: 'RESUME' }),
          });
        } catch (err) {
          console.warn('Could not update resume on cloud server:', err);
        }
      }
    } finally {
      isActionInProgressRef.current = false;
    }
  };

  const resetTimer = async () => {
    soundManager.playTick();
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    targetEndRef.current = null;
    pauseStartRef.current = null;
    stopwatchStartRef.current = null;
    setStopwatchElapsedSeconds(0);
    LocalStorageRepository.clearActiveTimerSnapshot();

    const defaultDuration = getDefaultDurationForMode(mode);
    setSecondsRemaining(defaultDuration);
    setTotalDuration(defaultDuration);
    setStatus('IDLE');

    if (activeSession && user) {
      try {
        await apiRequest(`/api/sessions/${activeSession.id}/abandon`, { method: 'POST' });
      } catch {
        // ignore
      }
    }
    setActiveSession(null);
  };

  const endSession = async (taskIdOverride?: string | null) => {
    if (isCompletingRef.current) return;
    isCompletingRef.current = true;

    try {
      soundManager.playTick();
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      targetEndRef.current = null;
      pauseStartRef.current = null;
      LocalStorageRepository.clearActiveTimerSnapshot();

      const effectiveTaskId = taskIdOverride !== undefined ? taskIdOverride : selectedTaskId;

      // Authoritative elapsed time calculation
      let elapsedSeconds = 0;
      if (mode === 'STOPWATCH') {
        elapsedSeconds = Math.max(1, stopwatchElapsedSeconds);
      } else {
        elapsedSeconds = Math.max(1, Math.min(totalDuration, totalDuration - secondsRemaining));
      }

      setStatus('COMPLETED');
      setSecondsRemaining(0);
      setLastCompletedMode(mode);

      // Audio chime
      if (soundEnabled) {
        if (mode === 'FOCUS') {
          soundManager.playSessionComplete();
        } else {
          soundManager.playBreakComplete();
        }
      }

      // Browser Notification
      if (notificationsEnabled && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          const title = mode === 'FOCUS' ? 'Session Concluded! 🎯' : 'Break Ended! ⏰';
          const mins = Math.max(1, Math.round(elapsedSeconds / 60));
          const body =
            mode === 'FOCUS'
              ? `Great focus! You completed ${mins} ${mins === 1 ? 'minute' : 'minutes'} of deep study.`
              : 'Break completed. Ready to get back into focus?';
          try {
            new Notification(title, { body, icon: '/favicon.png' });
          } catch {
            // ignore
          }
        }
      }

      // Save session completion (Unified offline & cloud)
      const currentSessionId = activeSession?.id;
      if (mode === 'FOCUS' || mode === 'SHORT_BREAK' || mode === 'LONG_BREAK') {
        LocalStorageRepository.recordCompletedSession(
          mode as SessionType,
          elapsedSeconds,
          selectedSubjectId,
          effectiveTaskId,
          currentSessionId,
          totalDuration
        );
      }

      if (activeSession && user) {
        try {
          await apiRequest(`/api/sessions/${activeSession.id}/complete`, {
            method: 'POST',
            body: JSON.stringify({
              actualDuration: elapsedSeconds,
              taskId: effectiveTaskId || undefined,
            }),
          });
        } catch (err) {
          console.warn('Failed to complete session on server (persisted locally):', err);
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('focusflow_session_completed'));
      }

      setActiveSession(null);

      // Update cycle counts if Focus completed
      if (mode === 'FOCUS') {
        setCycleCount((prev) => (prev >= longBreakInterval ? 1 : prev + 1));
      }

      setShowCompletionModal(true);
    } finally {
      isCompletingRef.current = false;
    }
  };

  const abandonSession = async () => {
    await resetTimer();
  };

  const skipSession = async () => {
    soundManager.playTick();
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    targetEndRef.current = null;
    pauseStartRef.current = null;
    LocalStorageRepository.clearActiveTimerSnapshot();

    if (activeSession && user) {
      try {
        await apiRequest(`/api/sessions/${activeSession.id}/abandon`, { method: 'POST' });
      } catch {
        // ignore
      }
    }
    setActiveSession(null);

    setStatus('IDLE');

    // Cycle modes
    if (mode === 'FOCUS') {
      if (cycleCount >= longBreakInterval) {
        switchMode('LONG_BREAK');
      } else {
        switchMode('SHORT_BREAK');
      }
    } else {
      switchMode('FOCUS');
    }
  };

  const switchMode = (newMode: TimerMode) => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    targetEndRef.current = null;
    pauseStartRef.current = null;
    stopwatchStartRef.current = null;
    LocalStorageRepository.clearActiveTimerSnapshot();

    setMode(newMode);
    setStatus('IDLE');

    const newDuration = getDefaultDurationForMode(newMode);
    setTotalDuration(newDuration);
    setSecondsRemaining(newDuration);
  };

  const closeCompletionModal = () => {
    setShowCompletionModal(false);
    setStatus('IDLE');
    const defaultDur = getDefaultDurationForMode(mode);
    setTotalDuration(defaultDur);
    setSecondsRemaining(defaultDur);
  };

  const proceedToNextSession = () => {
    setShowCompletionModal(false);
    if (lastCompletedMode === 'FOCUS') {
      if (cycleCount === 1) {
        switchMode('LONG_BREAK');
      } else {
        switchMode('SHORT_BREAK');
      }
    } else {
      switchMode('FOCUS');
    }
  };

  // Picture in Picture Canvas Engine
  const updatePiPCanvas = useCallback(() => {
    if (!pipCanvasRef.current) return;
    const canvas = pipCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#080D1A';
    ctx.fillRect(0, 0, w, h);

    // Circular Ring
    const centerX = w / 2;
    const centerY = h / 2 - 20;
    const radius = 100;

    // Track ring
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Progress ring
    const progress = totalDuration > 0 ? (totalDuration - secondsRemaining) / totalDuration : 0;
    const color = mode === 'FOCUS' ? '#4F7CFF' : mode === 'SHORT_BREAK' ? '#10B981' : '#7C3AED';
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - progress));
    ctx.stroke();

    // Time text
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 44px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeStr, centerX, centerY);

    // Mode label
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 16px Inter, sans-serif';
    const label = mode === 'FOCUS' ? 'FOCUS' : mode === 'STOPWATCH' ? 'STOPWATCH' : 'BREAK';
    ctx.fillText(label, centerX, centerY + 35);

    // Status footer
    ctx.fillStyle = status === 'RUNNING' ? '#10B981' : status === 'PAUSED' ? '#F59E0B' : '#64748B';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillText(status, centerX, h - 35);
  }, [secondsRemaining, totalDuration, mode, status]);

  useEffect(() => {
    if (isPiPActive) {
      updatePiPCanvas();
    }
  }, [isPiPActive, updatePiPCanvas]);

  const togglePiP = async () => {
    if (typeof document === 'undefined') return;

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      setIsPiPActive(false);
      return;
    }

    try {
      if (!pipCanvasRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 320;
        pipCanvasRef.current = canvas;
      }
      updatePiPCanvas();

      if (!pipVideoRef.current) {
        const video = document.createElement('video');
        video.muted = true;
        video.width = 320;
        video.height = 320;
        pipVideoRef.current = video;
      }

      const video = pipVideoRef.current;
      const stream = (pipCanvasRef.current as any).captureStream(10);
      video.srcObject = stream;
      await video.play();
      await video.requestPictureInPicture();
      setIsPiPActive(true);

      video.addEventListener(
        'leavepictureinpicture',
        () => {
          setIsPiPActive(false);
        },
        { once: true }
      );
    } catch (err) {
      console.warn('Picture in Picture failed to launch:', err);
      setIsPiPActive(false);
    }
  };

  return (
    <TimerContext.Provider
      value={{
        status,
        mode,
        secondsRemaining,
        totalDuration,
        cycleCount,
        activeSession,
        selectedSubjectId,
        selectedTaskId,
        soundEnabled,
        notificationsEnabled,
        showCompletionModal,
        lastCompletedMode,
        activePreset,
        stopwatchElapsedSeconds,
        isRainPlaying,
        rainVolume,
        isPiPActive,

        startTimer,
        pauseTimer,
        resumeTimer,
        endSession,
        resetTimer,
        skipSession,
        abandonSession,
        switchMode,
        applyPreset,
        setSelectedSubjectId,
        setSelectedTaskId,
        setSoundEnabled,
        setNotificationsEnabled,
        closeCompletionModal,
        proceedToNextSession,
        toggleRain,
        setRainVolume,
        togglePiP,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};
