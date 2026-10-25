import { lazy, Suspense, useState } from 'react';
import { AppProvider, useApp } from './context/AppContextSupabase';
import Layout from './components/Layout';
import { PageSkeleton } from './components/Skeleton';
import ToastHost from './components/ToastHost';
import Login from './pages/Login';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Members = lazy(() => import('./pages/Members'));
const Caisse = lazy(() => import('./pages/Caisse'));
const Mouvements = lazy(() => import('./pages/Mouvements'));
const Loans = lazy(() => import('./pages/Loans'));
const Meetings = lazy(() => import('./pages/Meetings'));
const Tontine = lazy(() => import('./pages/Tontine'));
const Distributions = lazy(() => import('./pages/Distributions'));
const MySpace = lazy(() => import('./pages/MySpace'));
const Reports = lazy(() => import('./pages/Reports'));
const Statuts = lazy(() => import('./pages/Statuts'));
const SettingsPage = lazy(() => import('./pages/Settings'));

function AppContent() {
  const { currentUser } = useApp();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!currentUser) {
    return <Login />;
  }

  const renderPage = () => {
    // Les membres ordinaires n'ont pas accès aux distributions ni aux rapports
    if (currentUser.role === 'membre' && (currentPage === 'distributions' || currentPage === 'reports')) {
      return <Dashboard />;
    }
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'members': return <Members />;
      case 'caisse': return <Caisse />;
      case 'mouvements': return <Mouvements />;
      case 'loans': return <Loans />;
      case 'meetings': return <Meetings />;
      case 'tontine': return <Tontine />;
      case 'distributions': return <Distributions />;
      case 'myspace': return <MySpace onNavigate={setCurrentPage} />;
      case 'reports': return <Reports onNavigate={setCurrentPage} />;
      case 'statuts': return <Statuts />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      <Suspense fallback={<PageSkeleton />}>{renderPage()}</Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
      <ToastHost />
    </AppProvider>
  );
}
