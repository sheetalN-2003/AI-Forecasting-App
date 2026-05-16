import React, { useState, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { AuthPage } from './pages/AuthPage';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load heavy components for enterprise performance
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const AnalystDashboard = lazy(() => import('./pages/AnalystDashboard').then(module => ({ default: module.AnalystDashboard })));
const UserDashboard = lazy(() => import('./pages/UserDashboard').then(module => ({ default: module.UserDashboard })));
const Forecasting = lazy(() => import('./pages/Forecasting').then(module => ({ default: module.Forecasting })));
const Inventory = lazy(() => import('./pages/Inventory').then(module => ({ default: module.Inventory })));
const Insights = lazy(() => import('./pages/Insights').then(module => ({ default: module.Insights })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const ApiDocs = lazy(() => import('./pages/ApiDocs').then(module => ({ default: module.ApiDocs })));

const AppContent = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!user) return <AuthPage />;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        if (user?.role === 'Admin') return <AdminDashboard />;
        if (user?.role === 'Analyst') return <AnalystDashboard />;
        return <UserDashboard />;
      case 'forecasting': return <Forecasting setActiveTab={setActiveTab} />;
      case 'inventory':   return <Inventory />;
      case 'insights':    return <Insights />;
      case 'api':         return <ApiDocs />;
      case 'settings':    return <Settings />;
      default:            
        if (user?.role === 'Admin') return <AdminDashboard />;
        if (user?.role === 'Analyst') return <AnalystDashboard />;
        return <UserDashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <Suspense fallback={
        <div className="p-8 space-y-6 animate-pulse">
          <div className="h-12 bg-slate-800 rounded-2xl w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="h-32 bg-slate-800 rounded-2xl"></div>
            <div className="h-32 bg-slate-800 rounded-2xl"></div>
            <div className="h-32 bg-slate-800 rounded-2xl"></div>
            <div className="h-32 bg-slate-800 rounded-2xl"></div>
          </div>
          <div className="h-96 bg-slate-800 rounded-2xl"></div>
        </div>
      }>
        {renderContent()}
      </Suspense>
    </Layout>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
