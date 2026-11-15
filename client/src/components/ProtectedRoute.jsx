import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

/**
 * ProtectedRoute component
 * Wraps routes that require authentication (and optional specific roles like ADMIN).
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '16px',
        color: '#252525'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #E2E2E2',
          borderTopColor: '#D4AF37',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ fontSize: '14px', color: '#666' }}>Verifying authentication...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Not logged in -> redirect to /login preserving the requested location
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirement (e.g. ADMIN required for Student Management)
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div style={{
        maxWidth: '600px',
        margin: '60px auto',
        padding: '32px 24px',
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        border: '1px solid #E2E2E2',
        borderTop: '4px solid #C53030',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '44px', marginBottom: '16px' }}>🛡️</div>
        <h2 style={{ fontSize: '20px', color: '#252525', marginBottom: '8px' }}>
          Access Restricted: {requiredRole} Privileges Required
        </h2>
        <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6', marginBottom: '20px' }}>
          You are currently signed in as <strong>{user.name}</strong> ({user.email}) with the role of <strong>{user.role}</strong>.
          This section of the portal requires <strong>{requiredRole}</strong> authorization.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <Link
            to="/"
            style={{
              padding: '10px 20px',
              backgroundColor: '#F7F7F7',
              border: '1px solid #E2E2E2',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#252525'
            }}
          >
            ← Return to Home
          </Link>
          <Link
            to="/login"
            state={{ from: location }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#D4AF37',
              border: '1px solid #D4AF37',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#252525'
            }}
          >
            Sign in as Administrator
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
