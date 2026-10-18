import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { TimerProvider } from './context/TimerContext';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OnboardingModal } from './components/OnboardingModal';

import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { TimerPage } from './pages/Timer';
import { TasksPage } from './pages/Tasks';
import { SubjectsPage } from './pages/Subjects';
import { AnalyticsPage } from './pages/Analytics';
import { HistoryPage } from './pages/History';
import { SettingsPage } from './pages/Settings';

const getInitialPage = (): string => {
  if (typeof window !== 'undefined') {
    // 1. Check hash
    const hash = window.location.hash.replace('#', '').split('?')[0];
    if (
      ['landing', 'dashboard', 'timer', 'tasks', 'subjects', 'analytics', 'history', 'settings', 'login'].includes(
        hash
      )
    ) {
      return hash;
    }

    // 2. Check pathname
    const path = window.location.pathname.replace(/^\//, '').split('/')[0].split('?')[0];
    if (
      ['landing', 'dashboard', 'timer', 'tasks', 'subjects', 'analytics', 'history', 'settings', 'login'].includes(
        path
      )
    ) {
      return path;
    }
  }
  return 'dashboard';
};

const AppContent: React.FC = () => {
  const { user, preference, isLoading, loginAsGuest } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>(getInitialPage);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // Sync URL hash & history
  useEffect(() => {
    const handleUrlChange = () => {
      const page = getInitialPage();
      setCurrentPage(page);
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.location.hash = page;
  };

  // Check onboarding status for first-time logged in users
  useEffect(() => {
    if (user && preference && preference.hasCompletedOnboarding === false) {
      setShowOnboarding(true);
    }
  }, [user, preference]);

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080D1A] flex flex-col items-center justify-center space-y-4 text-white">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-lg animate-pulse" />
          <img
            src="/logo-256.png"
            alt="Cognify"
            className="w-14 h-14 rounded-2xl object-cover shadow-2xl border border-blue-500/30 animate-pulse"
          />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Loading Cognify...
        </p>
      </div>
    );
  }

  // 1. If viewing the login page (unauthenticated or guest wishing to connect Google / switch account)
  if (currentPage === 'login') {
    return <Login onBackToApp={() => handleNavigate(user ? 'dashboard' : 'landing')} />;
  }

  // 2. Unauthenticated user -> Landing
  if (!user) {
    return (
      <Landing
        onStartFocusing={() => {
          loginAsGuest();
          handleNavigate('dashboard');
        }}
        onOpenLogin={() => handleNavigate('login')}
      />
    );
  }

  // 3. If authenticated user explicitly browses to landing page
  if (currentPage === 'landing') {
    return (
      <Landing
        onStartFocusing={() => handleNavigate('dashboard')}
        onOpenLogin={() => handleNavigate('dashboard')}
      />
    );
  }

  // 4. Authenticated user -> Main App Shell
  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Header
          title={currentPage}
          onOpenMobile={() => setMobileSidebarOpen(true)}
          onNavigate={handleNavigate}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
          {currentPage === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
          {currentPage === 'timer' && <TimerPage />}
          {currentPage === 'tasks' && <TasksPage onNavigate={handleNavigate} />}
          {currentPage === 'subjects' && <SubjectsPage />}
          {currentPage === 'analytics' && <AnalyticsPage />}
          {currentPage === 'history' && <HistoryPage />}
          {currentPage === 'settings' && <SettingsPage />}
          {currentPage === 'login' && <Login onBackToApp={() => handleNavigate('dashboard')} />}
        </main>
      </div>

      {/* Onboarding Dialog for First-Time Users */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onStartFirstSession={() => handleNavigate('dashboard')}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TimerProvider>
          <AppContent />
        </TimerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
