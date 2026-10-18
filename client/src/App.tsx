import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { TimerProvider } from './context/TimerContext';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OnboardingModal } from './components/OnboardingModal';
import { LoadingScreen } from './components/LoadingScreen';

import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { TimerPage } from './pages/Timer';
import { TasksPage } from './pages/Tasks';
import { SubjectsPage } from './pages/Subjects';
import { AnalyticsPage } from './pages/Analytics';
import { HistoryPage } from './pages/History';
import { SettingsPage } from './pages/Settings';

const AppContent: React.FC = () => {
  const { user, preference, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (
        ['landing', 'dashboard', 'timer', 'tasks', 'subjects', 'analytics', 'history', 'settings', 'login'].includes(
          hash
        )
      ) {
        return hash;
      }
    }
    return 'dashboard';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [loadingDismissed, setLoadingDismissed] = useState<boolean>(false);

  // Sync URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (
        ['landing', 'dashboard', 'timer', 'tasks', 'subjects', 'analytics', 'history', 'settings', 'login'].includes(
          hash
        )
      ) {
        setCurrentPage(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
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

  return (
    <>
      {/* Premium Branded Loading Overlay with Progress Bar */}
      {!loadingDismissed && (
        <LoadingScreen
          isLoading={isLoading}
          onFinished={() => setLoadingDismissed(true)}
        />
      )}

      {/* Render content once auth state is resolved */}
      {!user ? (
        currentPage === 'landing' ? (
          <Landing
            onStartFocusing={() => {
              window.location.href = '/api/auth/google';
            }}
            onOpenLogin={() => handleNavigate('login')}
          />
        ) : (
          <Login onBackToApp={() => handleNavigate('landing')} />
        )
      ) : currentPage === 'landing' ? (
        <Landing
          onStartFocusing={() => handleNavigate('dashboard')}
          onOpenLogin={() => handleNavigate('dashboard')}
        />
      ) : (
        <div className="min-h-screen bg-[#070B16] text-[#F8FAFC] flex flex-col lg:flex-row relative overflow-x-hidden selection:bg-focus-500 selection:text-white">
          {/* Ambient Study Lighting Orbs (Optimal for optical calm and depth) */}
          <div className="fixed top-[-10%] left-[15%] w-[650px] h-[650px] bg-gradient-to-br from-blue-600/12 via-indigo-600/8 to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />
          <div className="fixed bottom-[-10%] right-[10%] w-[550px] h-[550px] bg-gradient-to-tl from-emerald-600/10 via-teal-600/6 to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />
          <div className="fixed top-[45%] right-[25%] w-[400px] h-[400px] bg-gradient-to-tr from-violet-600/6 via-fuchsia-600/4 to-transparent rounded-full blur-[130px] pointer-events-none -z-10" />

          {/* Sidebar */}
          <Sidebar
            currentPage={currentPage}
            onNavigate={handleNavigate}
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />

          {/* Main Content Area */}
          <div className="flex-1 lg:pl-64 flex flex-col min-h-screen relative z-10">
            <Header
              title={currentPage}
              onOpenMobile={() => setMobileSidebarOpen(true)}
              onNavigate={handleNavigate}
            />

            <main className="flex-1 p-3 xs:p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
              {/* Hardware-accelerated smooth page transition wrapper */}
              <div key={currentPage} className="animate-in fade-in-50 duration-200">
                {currentPage === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
                {currentPage === 'timer' && <TimerPage />}
                {currentPage === 'tasks' && <TasksPage onNavigate={handleNavigate} />}
                {currentPage === 'subjects' && <SubjectsPage />}
                {currentPage === 'analytics' && <AnalyticsPage />}
                {currentPage === 'history' && <HistoryPage />}
                {currentPage === 'settings' && <SettingsPage />}
              </div>
            </main>
          </div>

          {/* Onboarding Dialog for First-Time Users */}
          <OnboardingModal
            isOpen={showOnboarding}
            onClose={() => setShowOnboarding(false)}
            onStartFirstSession={() => handleNavigate('dashboard')}
          />
        </div>
      )}
    </>
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
