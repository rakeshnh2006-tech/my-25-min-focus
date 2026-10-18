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

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiRequest<AuthStatusResponse>('/api/auth/status');
      setStatus(data);
    } catch (err) {
      console.warn('Backend status check unreachable:', err);
      setStatus({
        status: 'offline',
        configured: false,
        database: { connected: false, error: 'Database unreachable' },
        googleOAuth: { configured: false, callbackUrl: '' },
      });
    }
  }, []);

  const refreshSubjects = useCallback(async () => {
    if (!user) {
      setSubjects([]);
      return;
    }
    try {
      const data = await apiRequest<{ subjects: Subject[] }>('/api/subjects');
      setSubjects(data.subjects);
      LocalStorageRepository.saveSubjects(data.subjects);
    } catch (err) {
      console.warn('Failed to fetch subjects from cloud API, using local storage cache:', err);
      const localSubs = LocalStorageRepository.getSubjects();
      setSubjects(localSubs);
    }
  }, [user]);

  const refreshAuth = useCallback(async () => {
    // Clear any legacy guest sessions
    try {
      localStorage.removeItem('cognify_guest_session');
      localStorage.removeItem('focusflow_guest_session');
    } catch {
      // ignore
    }

    try {
      const data = await apiRequest<{
        user: User;
        preference: UserPreference;
        subjects: Subject[];
      }>('/api/auth/me');

      setUser(data.user);
      setPreference(data.preference);
      LocalStorageRepository.savePreferences(data.preference);
      if (data.subjects) {
        setSubjects(data.subjects);
        LocalStorageRepository.saveSubjects(data.subjects);
      }
    } catch {
      // Unauthenticated -> User is null, must log in with Google
      setUser(null);
      setPreference(null);
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    refreshAuth();
  }, [fetchStatus, refreshAuth]);

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setPreference(null);
      setSubjects([]);
      window.location.hash = 'login';
    }
  };

  const updatePreferences = async (updates: Partial<UserPreference>): Promise<UserPreference> => {
    const updated = LocalStorageRepository.savePreferences(updates);
    setPreference(updated);

    if (user) {
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
    if (user) {
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
    if (user) {
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
