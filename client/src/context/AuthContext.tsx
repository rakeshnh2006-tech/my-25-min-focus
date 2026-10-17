import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, UserPreference, Subject, AuthStatusResponse } from '../types';
import { apiRequest } from '../lib/api';

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
      console.warn('Failed to fetch auth/system status:', err);
    }
  }, []);

  const refreshSubjects = useCallback(async () => {
    try {
      const data = await apiRequest<{ subjects: Subject[] }>('/api/subjects');
      setSubjects(data.subjects);
    } catch (err) {
      console.warn('Failed to fetch subjects:', err);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const data = await apiRequest<{
        user: User;
        preference: UserPreference;
        subjects: Subject[];
      }>('/api/auth/me');

      setUser(data.user);
      setPreference(data.preference);
      if (data.subjects) {
        setSubjects(data.subjects);
      }
    } catch {
      setUser(null);
      setPreference(null);
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
      window.location.href = '/login';
    }
  };

  const updatePreferences = async (updates: Partial<UserPreference>): Promise<UserPreference> => {
    const data = await apiRequest<{ preference: UserPreference }>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    setPreference(data.preference);
    return data.preference;
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
