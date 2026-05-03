import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/Sidebar';
import Login from './pages/Login';
import { isMockClient } from './lib/supabase';
import './App.css';

// Lazy load pages for code splitting
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const ActivityPage = lazy(() => import('./pages/Activity'));
const ReportsPage = lazy(() => import('./pages/Reports'));
const DevicesPage = lazy(() => import('./pages/Devices'));
const UsersPage = lazy(() => import('./pages/Users'));

// Loading fallback component
function PageLoader() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      color: '#4988C4'
    }}>
      <div>Loading...</div>
    </div>
  );
}

// Main app layout with sidebar
function AppLayout() {
  const { user, login, logout } = useAuth();
  const mockMode = isMockClient();

  // Show login page if not authenticated
  if (!user) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="app">
      {mockMode && (
        <div style={{
          background: '#f59e0b',
          color: '#000',
          padding: '8px 16px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 500
        }}>
          ⚠️ Running in mock mode - Database not connected. Check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
        </div>
      )}
      <Sidebar
        user={{
          user_id: user.user_id,
          full_name: user.full_name,
          role: user.role,
        }}
        onLogout={logout}
      />
      <main>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/users" element={<UsersPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <AppLayout />
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App
