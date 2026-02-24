import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import ClientDashboard from './pages/ClientDashboard';
import AccountantDashboard from './pages/AccountantDashboard';

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole?: 'client' | 'accountant' }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {user?.role === 'accountant' ? <AccountantDashboard /> : <ClientDashboard />}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/client/*"
        element={
          <ProtectedRoute allowedRole="client">
            <ClientDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/accountant/*"
        element={
          <ProtectedRoute allowedRole="accountant">
            <AccountantDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
