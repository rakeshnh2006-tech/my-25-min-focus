import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { TimerProvider } from './context/TimerContext';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OnboardingModal } from './components/OnboardingModal';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { TimerPage } from './pages/Timer';
import { TasksPage } from './pages/Tasks';
import { SubjectsPage } from './pages/Subjects';
import { AnalyticsPage } from './pages/Analytics';
import { HistoryPage } from './pages/History';
import { SettingsPage } from './pages/Settings';
import { Flame } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, preference, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // Sync URL hash or initial page
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (['dashboard', 'timer', 'tasks', 'subjects', 'analytics', 'history', 'settings'].includes(hash)) {
      setCurrentPage(hash);
    }
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.location.hash = page;
  };

  // Check onboarding status
  useEffect(() => {
    if (user && preference && preference.hasCompletedOnboarding === false) {
      setShowOnboarding(true);
    }
  }, [user, preference]);

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center space-y-4 text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-focus-600 to-focus-400 flex items-center justify-center shadow-glow animate-pulse">
          <Flame className="w-6 h-6 text-white" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Loading FocusFlow...
        </p>
      </div>
    );
  }

  // Unauthenticated user -> Login Screen
  if (!user) {
    return <Login />;
  }

  // Authenticated user -> App Shell
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
        </main>
      </div>

      {/* Onboarding Dialog for First-Time Users */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onStartFirstSession={() => handleNavigate('timer')}
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
