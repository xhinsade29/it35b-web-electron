import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/Dashboard';
import { ActivityPage } from './pages/Activity';
import { ReportsPage } from './pages/Reports';
import { DevicesPage } from './pages/Devices';
import { UsersPage } from './pages/Users';
import './App.css';

// Main app layout with sidebar
function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <Sidebar 
        user={user ? {
          user_id: user.user_id,
          full_name: user.full_name,
          role: user.role,
        } : undefined} 
        onLogout={logout} 
      />
      <main>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Routes>
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
