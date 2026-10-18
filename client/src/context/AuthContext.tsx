import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, UserPreference, Subject, AuthStatusResponse } from '../types';
import { apiRequest } from '../lib/api';
import { LocalStorageRepository } from '../lib/storage';

interface AuthContextType {
  user: User | null;
  preference: UserPreference | null;
  subjects: Subject[];
  isLoading: boolean;
  status: AuthStatusResponse | null;
  isGuest: boolean;
  loginAsGuest: () => void;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
  updatePreferences: (updates: Partial<UserPreference>) => Promise<UserPreference>;
  refreshSubjects: () => Promise<void>;
  addSubject: (subject: Omit<Subject, 'id'>) => Promise<Subject>;
  deleteSubject: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [preference, setPreference] = useState<UserPreference | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<AuthStatusResponse | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiRequest<AuthStatusResponse>('/api/auth/status');
      setStatus(data);
    } catch (err) {
      console.warn('Backend status check unreachable, operating in resilient offline mode:', err);
      setStatus({
        status: 'offline',
        configured: false,
        database: { connected: false, error: 'Operating in Local Offline Mode' },
        googleOAuth: { configured: false, callbackUrl: '' },
      });
    }
  }, []);

  const refreshSubjects = useCallback(async () => {
    // If logged in to cloud, fetch from API
    if (user && !user.isGuest) {
      try {
        const data = await apiRequest<{ subjects: Subject[] }>('/api/subjects');
        setSubjects(data.subjects);
        LocalStorageRepository.saveSubjects(data.subjects);
        return;
      } catch (err) {
        console.warn('Failed to fetch subjects from cloud API, using local storage:', err);
      }
    }
    // Fallback to local storage
    const localSubs = LocalStorageRepository.getSubjects();
    setSubjects(localSubs);
  }, [user]);

  const loginAsGuest = useCallback(() => {
    const guestUser: User = {
      id: 'guest_user',
      name: 'Guest Scholar',
      email: 'guest@cognify.app',
      avatarUrl: null,
      isGuest: true,
    };
    setUser(guestUser);
    setIsGuest(true);
    const localPrefs = LocalStorageRepository.getPreferences();
    setPreference(localPrefs);
    const localSubs = LocalStorageRepository.getSubjects();
    setSubjects(localSubs);
    setIsLoading(false);
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const data = await apiRequest<{
        user: User;
        preference: UserPreference;
        subjects: Subject[];
      }>('/api/auth/me');

      setUser(data.user);
      setIsGuest(false);
      setPreference(data.preference);
      LocalStorageRepository.savePreferences(data.preference);
      if (data.subjects) {
        setSubjects(data.subjects);
        LocalStorageRepository.saveSubjects(data.subjects);
      }
    } catch {
      // Unauthenticated with server -> Initialize default guest session with localStorage
      const localPrefs = LocalStorageRepository.getPreferences();
      setPreference(localPrefs);
      const localSubs = LocalStorageRepository.getSubjects();
      setSubjects(localSubs);
      // We don't force login wall: allow user to be guest
      loginAsGuest();
    } finally {
      setIsLoading(false);
    }
  }, [loginAsGuest]);

  useEffect(() => {
    fetchStatus();
    refreshAuth();
  }, [fetchStatus, refreshAuth]);

  const logout = async () => {
    try {
      if (user && !user.isGuest) {
        await apiRequest('/api/auth/logout', { method: 'POST' });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      loginAsGuest();
      window.location.hash = 'landing';
    }
  };

  const updatePreferences = async (updates: Partial<UserPreference>): Promise<UserPreference> => {
    // Save to local storage first
    const updated = LocalStorageRepository.savePreferences(updates);
    setPreference(updated);

    // Sync to cloud API if authenticated
    if (user && !user.isGuest) {
      try {
        const data = await apiRequest<{ preference: UserPreference }>('/api/settings', {
          method: 'PATCH',
          body: JSON.stringify(updates),
        });
        setPreference(data.preference);
        return data.preference;
      } catch (err) {
        console.warn('Could not sync preferences to cloud API:', err);
      }
    }
    return updated;
  };

  const addSubject = async (subject: Omit<Subject, 'id'>): Promise<Subject> => {
    if (user && !user.isGuest) {
      try {
        const res = await apiRequest<{ subject: Subject }>('/api/subjects', {
          method: 'POST',
          body: JSON.stringify(subject),
        });
        await refreshSubjects();
        return res.subject;
      } catch (err) {
        console.warn('Could not add subject to server, saving locally:', err);
      }
    }
    const created = LocalStorageRepository.addSubject(subject);
    setSubjects(LocalStorageRepository.getSubjects());
    return created;
  };

  const deleteSubject = async (id: string): Promise<void> => {
    if (user && !user.isGuest) {
      try {
        await apiRequest(`/api/subjects/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Could not delete subject on server:', err);
      }
    }
    LocalStorageRepository.deleteSubject(id);
    setSubjects(LocalStorageRepository.getSubjects());
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        preference,
        subjects,
        isLoading,
        status,
        isGuest,
        loginAsGuest,
        refreshAuth,
        logout,
        updatePreferences,
        refreshSubjects,
        addSubject,
        deleteSubject,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
