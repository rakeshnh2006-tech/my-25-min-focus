import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { SessionType, SessionStatus, FocusSession } from '../types';
import { apiRequest } from '../lib/api';
import { soundManager } from '../lib/sound';
import { useAuth } from './AuthContext';

interface TimerContextType {
  status: SessionStatus;
  mode: SessionType;
  secondsRemaining: number;
  totalDuration: number;
  cycleCount: number; // 1 to 4
  activeSession: FocusSession | null;
  selectedSubjectId: string | null;
  selectedTaskId: string | null;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  showCompletionModal: boolean;
  lastCompletedMode: SessionType | null;

  startTimer: () => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  resetTimer: () => Promise<void>;
  skipSession: () => Promise<void>;
  abandonSession: () => Promise<void>;
  switchMode: (newMode: SessionType) => void;
  setSelectedSubjectId: (id: string | null) => void;
  setSelectedTaskId: (id: string | null) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  closeCompletionModal: () => void;
  proceedToNextSession: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, preference, updatePreferences } = useAuth();

  const [mode, setMode] = useState<SessionType>('FOCUS');
  const [status, setStatus] = useState<SessionStatus>('IDLE');
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [cycleCount, setCycleCount] = useState<number>(1);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [lastCompletedMode, setLastCompletedMode] = useState<SessionType | null>(null);

  // Preference derived durations (in seconds)
  const focusDurationSecs = (preference?.focusDuration || 25) * 60;
  const shortBreakDurationSecs = (preference?.shortBreakDuration || 5) * 60;
  const longBreakDurationSecs = (preference?.longBreakDuration || 15) * 60;
  const longBreakInterval = preference?.longBreakInterval || 4;

  const [totalDuration, setTotalDuration] = useState<number>(focusDurationSecs);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(focusDurationSecs);

  const [soundEnabled, setSoundEnabledState] = useState<boolean>(preference?.soundEnabled ?? true);
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(
    preference?.notificationsEnabled ?? false
  );

  // Sync preference updates to timer defaults when idle
  useEffect(() => {
    if (status === 'IDLE') {
      if (mode === 'FOCUS') {
        setTotalDuration(focusDurationSecs);
        setSecondsRemaining(focusDurationSecs);
      } else if (mode === 'SHORT_BREAK') {
        setTotalDuration(shortBreakDurationSecs);
        setSecondsRemaining(shortBreakDurationSecs);
      } else if (mode === 'LONG_BREAK') {
        setTotalDuration(longBreakDurationSecs);
        setSecondsRemaining(longBreakDurationSecs);
      }
    }
  }, [mode, status, focusDurationSecs, shortBreakDurationSecs, longBreakDurationSecs]);

  // Clock calculation references
  const targetEndRef = useRef<number | null>(null);
  const pauseStartRef = useRef<number | null>(null);
  const intervalIdRef = useRef<any>(null);

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    if (preference) {
      updatePreferences({ soundEnabled: enabled }).catch(() => {});
    }
  };

  const setNotificationsEnabled = async (enabled: boolean) => {
    if (enabled && typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabledState(true);
        if (preference) {
          updatePreferences({ notificationsEnabled: true }).catch(() => {});
        }
      } else {
        setNotificationsEnabledState(false);
      }
    } else {
      setNotificationsEnabledState(false);
      if (preference) {
        updatePreferences({ notificationsEnabled: false }).catch(() => {});
      }
    }
  };

  // Complete session handler
  const handleSessionComplete = useCallback(async () => {
    if (intervalIdRef.current) clearInterval(intervalIdRef.current);
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
          new Notification(title, { body, icon: '/favicon.ico' });
        } catch {
          // Ignore notification display failures
        }
      }
    }

    // Save session completion to backend
    if (activeSession) {
      try {
        await apiRequest(`/api/sessions/${activeSession.id}/complete`, {
          method: 'POST',
        });
      } catch (err) {
        console.error('Failed to complete session on server:', err);
      }
    }

    // Update cycle counts if Focus completed
    if (mode === 'FOCUS') {
      setCycleCount((prev) => (prev >= longBreakInterval ? 1 : prev + 1));
    }

    setShowCompletionModal(true);
  }, [mode, activeSession, soundEnabled, notificationsEnabled, longBreakInterval]);

  // Tick calculation based on wall clock
  const updateTick = useCallback(() => {
    if (!targetEndRef.current) return;
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((targetEndRef.current - now) / 1000));
    setSecondsRemaining(remaining);

    if (remaining <= 0) {
      handleSessionComplete();
    }
  }, [handleSessionComplete]);

  // Handle visibility change (drifting tabs / sleep)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'RUNNING') {
        updateTick();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status, updateTick]);

  // Running interval
  useEffect(() => {
    if (status === 'RUNNING') {
      intervalIdRef.current = setInterval(updateTick, 250);
    } else {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    }
    return () => {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    };
  }, [status, updateTick]);

  // Restore active session from backend on user login
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    apiRequest<{ session: FocusSession | null }>('/api/sessions/active')
      .then((data) => {
        if (!isMounted) return;
        const session = data.session;
        if (session) {
          setActiveSession(session);
          setMode(session.sessionType);
          setTotalDuration(session.plannedDuration);
          if (session.subjectId) setSelectedSubjectId(session.subjectId);
          if (session.taskId) setSelectedTaskId(session.taskId);

          const now = Date.now();
          if (session.status === 'RUNNING' && session.targetEndAt) {
            const targetMs = new Date(session.targetEndAt).getTime();
            targetEndRef.current = targetMs;
            const remaining = Math.max(0, Math.ceil((targetMs - now) / 1000));
            setSecondsRemaining(remaining);
            if (remaining > 0) {
              setStatus('RUNNING');
            } else {
              setStatus('COMPLETED');
            }
          } else if (session.status === 'PAUSED') {
            setStatus('PAUSED');
            if (session.targetEndAt) {
              const targetMs = new Date(session.targetEndAt).getTime();
              targetEndRef.current = targetMs;
              const remaining = Math.max(0, Math.ceil((targetMs - now) / 1000));
              setSecondsRemaining(remaining);
            }
          }
        }
      })
      .catch((err) => {
        console.warn('Could not restore active session:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Timer controls
  const startTimer = async () => {
    const duration =
      mode === 'FOCUS'
        ? focusDurationSecs
        : mode === 'SHORT_BREAK'
        ? shortBreakDurationSecs
        : longBreakDurationSecs;

    setTotalDuration(duration);
    setSecondsRemaining(duration);

    const now = Date.now();
    targetEndRef.current = now + duration * 1000;
    setStatus('RUNNING');

    try {
      const data = await apiRequest<{ session: FocusSession }>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          sessionType: mode,
          plannedDuration: duration,
          subjectId: selectedSubjectId,
          taskId: selectedTaskId,
        }),
      });
      setActiveSession(data.session);
    } catch (err) {
      console.error('Failed to create session on server:', err);
    }
  };

  const pauseTimer = async () => {
    if (status !== 'RUNNING') return;
    setStatus('PAUSED');
    pauseStartRef.current = Date.now();

    if (activeSession) {
      try {
        const data = await apiRequest<{ session: FocusSession }>(`/api/sessions/${activeSession.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ action: 'PAUSE' }),
        });
        setActiveSession(data.session);
      } catch (err) {
        console.error('Failed to pause session on server:', err);
      }
    }
  };

  const resumeTimer = async () => {
    if (status !== 'PAUSED') return;

    if (pauseStartRef.current && targetEndRef.current) {
      const pausedMs = Date.now() - pauseStartRef.current;
      targetEndRef.current += pausedMs;
    }
    pauseStartRef.current = null;
    setStatus('RUNNING');

    if (activeSession) {
      try {
        const data = await apiRequest<{ session: FocusSession }>(`/api/sessions/${activeSession.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ action: 'RESUME' }),
        });
        setActiveSession(data.session);
      } catch (err) {
        console.error('Failed to resume session on server:', err);
      }
    }
  };

  const resetTimer = async () => {
    if (activeSession && (status === 'RUNNING' || status === 'PAUSED')) {
      try {
        await apiRequest(`/api/sessions/${activeSession.id}/abandon`, { method: 'POST' });
      } catch (err) {
        console.error('Failed to abandon session on reset:', err);
      }
    }

    if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    targetEndRef.current = null;
    pauseStartRef.current = null;
    setActiveSession(null);
    setStatus('IDLE');

    const duration =
      mode === 'FOCUS'
        ? focusDurationSecs
        : mode === 'SHORT_BREAK'
        ? shortBreakDurationSecs
        : longBreakDurationSecs;
    setTotalDuration(duration);
    setSecondsRemaining(duration);
  };

  const abandonSession = async () => {
    if (activeSession) {
      try {
        await apiRequest(`/api/sessions/${activeSession.id}/abandon`, { method: 'POST' });
      } catch (err) {
        console.error('Failed to abandon session:', err);
      }
    }
    await resetTimer();
  };

  const skipSession = async () => {
    if (activeSession) {
      try {
        await apiRequest(`/api/sessions/${activeSession.id}/abandon`, { method: 'POST' });
      } catch (err) {
        console.error('Failed to abandon skipped session:', err);
      }
    }

    // Switch to recommended next mode
    if (mode === 'FOCUS') {
      const nextMode = cycleCount >= longBreakInterval ? 'LONG_BREAK' : 'SHORT_BREAK';
      switchMode(nextMode);
    } else {
      switchMode('FOCUS');
    }
  };

  const switchMode = (newMode: SessionType) => {
    if (status === 'RUNNING' || status === 'PAUSED') {
      if (!window.confirm('Switching modes will abandon your active session. Proceed?')) {
        return;
      }
      if (activeSession) {
        apiRequest(`/api/sessions/${activeSession.id}/abandon`, { method: 'POST' }).catch(() => {});
      }
    }

    if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    targetEndRef.current = null;
    pauseStartRef.current = null;
    setActiveSession(null);
    setStatus('IDLE');
    setMode(newMode);

    const duration =
      newMode === 'FOCUS'
        ? focusDurationSecs
        : newMode === 'SHORT_BREAK'
        ? shortBreakDurationSecs
        : longBreakDurationSecs;
    setTotalDuration(duration);
    setSecondsRemaining(duration);
  };

  const closeCompletionModal = () => {
    setShowCompletionModal(false);
  };

  const proceedToNextSession = () => {
    setShowCompletionModal(false);
    if (lastCompletedMode === 'FOCUS') {
      const nextMode = cycleCount === 1 ? 'LONG_BREAK' : 'SHORT_BREAK';
      switchMode(nextMode);
    } else {
      switchMode('FOCUS');
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
        startTimer,
        pauseTimer,
        resumeTimer,
        resetTimer,
        skipSession,
        abandonSession,
        switchMode,
        setSelectedSubjectId,
        setSelectedTaskId,
        setSoundEnabled,
        setNotificationsEnabled,
        closeCompletionModal,
        proceedToNextSession,
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
