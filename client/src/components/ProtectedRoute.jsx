import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px auto' }}></div>
        <p style={{ color: '#555', fontSize: '15px' }}>Verifying your session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px auto' }}></div>
        <p style={{ color: '#555', fontSize: '15px' }}>Checking administrator permissions...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="page-placeholder" style={{ maxWidth: '600px', margin: '40px auto' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔒</div>
        <h1 style={{ color: '#C62828' }}>Access Restricted</h1>
        <p style={{ marginBottom: '24px' }}>
          This section requires Administrator privileges under the Department of Technical Education.
          Your current account is registered as a Student.
        </p>
        <Link to="/dashboard" className="btn-primary" style={{ display: 'inline-block', padding: '10px 20px' }}>
          Return to Student Dashboard
        </Link>
      </div>
    );
  }

  return children;
}
