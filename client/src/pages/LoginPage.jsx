import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

function LoginPage() {
  const { login, register, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Tab: 'login' | 'register'
  const [activeTab, setActiveTab] = useState('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState('STUDENT');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const destination = location.state?.from?.pathname || (isAdmin ? '/admin' : '/dashboard');
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate, location]);

  const validateLogin = () => {
    const errors = {};
    if (!loginEmail.trim()) {
      errors.loginEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail.trim())) {
      errors.loginEmail = 'Enter a valid email address';
    }
    if (!loginPassword) {
      errors.loginPassword = 'Password is required';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateRegister = () => {
    const errors = {};
    if (!regName.trim()) {
      errors.regName = 'Full name is required';
    }
    if (!regEmail.trim()) {
      errors.regEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      errors.regEmail = 'Enter a valid email address';
    }
    if (!regPassword) {
      errors.regPassword = 'Password is required';
    } else if (regPassword.length < 6) {
      errors.regPassword = 'Password must be at least 6 characters long';
    }
    if (regPassword !== regConfirmPassword) {
      errors.regConfirmPassword = 'Passwords do not match';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!validateLogin()) return;

    setLoading(true);
    try {
      const res = await login({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
        remember: rememberMe,
      });

      const userRole = res.user?.role?.toUpperCase();
      const destination = location.state?.from?.pathname || (userRole === 'ADMIN' ? '/admin' : '/dashboard');
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!validateRegister()) return;

    setLoading(true);
    try {
      const res = await register({
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        role: regRole,
        remember: rememberMe,
      });

      const userRole = res.user?.role?.toUpperCase();
      const destination = location.state?.from?.pathname || (userRole === 'ADMIN' ? '/admin' : '/dashboard');
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        
        {/* Header Badge */}
        <div className="auth-badge">
          Government of Rajasthan • Department of Technical Education
        </div>

        <div className="auth-header">
          <h1 className="auth-title">
            Shiksha<span>Setu</span> Portal
          </h1>
          <p className="auth-subtitle">
            Sign in to access AI counseling, college recommendations, and admissions support.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('login');
              setError(null);
              setValidationErrors({});
            }}
          >
            Portal Login
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('register');
              setError(null);
              setValidationErrors({});
            }}
          >
            New Student Registration
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="auth-alert auth-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        {activeTab === 'login' && (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label htmlFor="loginEmail">Email Address</label>
              <input
                id="loginEmail"
                type="email"
                className={`form-input ${validationErrors.loginEmail ? 'input-error' : ''}`}
                placeholder="student@example.com or admin@dte.rajasthan.gov.in"
                value={loginEmail}
                onChange={(e) => {
                  setLoginEmail(e.target.value);
                  if (validationErrors.loginEmail) setValidationErrors({ ...validationErrors, loginEmail: null });
                }}
                disabled={loading}
              />
              {validationErrors.loginEmail && (
                <span className="field-error">{validationErrors.loginEmail}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="loginPassword">Password</label>
              <input
                id="loginPassword"
                type="password"
                className={`form-input ${validationErrors.loginPassword ? 'input-error' : ''}`}
                placeholder="Enter your account password"
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  if (validationErrors.loginPassword) setValidationErrors({ ...validationErrors, loginPassword: null });
                }}
                disabled={loading}
              />
              {validationErrors.loginPassword && (
                <span className="field-error">{validationErrors.loginPassword}</span>
              )}
            </div>

            <div className="form-row-between">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me on this device</span>
              </label>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner-sm"></span> Signing In...
                </span>
              ) : (
                'Sign In to ShikshaSetu'
              )}
            </button>
          </form>
        )}

        {/* Registration Form */}
        {activeTab === 'register' && (
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label htmlFor="regName">Student Full Name</label>
              <input
                id="regName"
                type="text"
                className={`form-input ${validationErrors.regName ? 'input-error' : ''}`}
                placeholder="e.g. Ramesh Kumar Sharma"
                value={regName}
                onChange={(e) => {
                  setRegName(e.target.value);
                  if (validationErrors.regName) setValidationErrors({ ...validationErrors, regName: null });
                }}
                disabled={loading}
              />
              {validationErrors.regName && (
                <span className="field-error">{validationErrors.regName}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="regEmail">Email Address</label>
              <input
                id="regEmail"
                type="email"
                className={`form-input ${validationErrors.regEmail ? 'input-error' : ''}`}
                placeholder="student@example.com"
                value={regEmail}
                onChange={(e) => {
                  setRegEmail(e.target.value);
                  if (validationErrors.regEmail) setValidationErrors({ ...validationErrors, regEmail: null });
                }}
                disabled={loading}
              />
              {validationErrors.regEmail && (
                <span className="field-error">{validationErrors.regEmail}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="regRole">Account Role</label>
              <select
                id="regRole"
                className="form-input"
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                disabled={loading}
              >
                <option value="STUDENT">Student (Admission Counseling & Assistance)</option>
                <option value="ADMIN">Administrator (College & Cutoff Management)</option>
              </select>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="regPassword">Password</label>
                <input
                  id="regPassword"
                  type="password"
                  className={`form-input ${validationErrors.regPassword ? 'input-error' : ''}`}
                  placeholder="At least 6 characters"
                  value={regPassword}
                  onChange={(e) => {
                    setRegPassword(e.target.value);
                    if (validationErrors.regPassword) setValidationErrors({ ...validationErrors, regPassword: null });
                  }}
                  disabled={loading}
                />
                {validationErrors.regPassword && (
                  <span className="field-error">{validationErrors.regPassword}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="regConfirmPassword">Confirm Password</label>
                <input
                  id="regConfirmPassword"
                  type="password"
                  className={`form-input ${validationErrors.regConfirmPassword ? 'input-error' : ''}`}
                  placeholder="Re-enter password"
                  value={regConfirmPassword}
                  onChange={(e) => {
                    setRegConfirmPassword(e.target.value);
                    if (validationErrors.regConfirmPassword) setValidationErrors({ ...validationErrors, regConfirmPassword: null });
                  }}
                  disabled={loading}
                />
                {validationErrors.regConfirmPassword && (
                  <span className="field-error">{validationErrors.regConfirmPassword}</span>
                )}
              </div>
            </div>

            <div className="form-row-between">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Keep me signed in</span>
              </label>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner-sm"></span> Registering Account...
                </span>
              ) : (
                'Create ShikshaSetu Account'
              )}
            </button>
          </form>
        )}

        <div className="auth-footer-help">
          <p>
            Having trouble accessing the portal?{' '}
            <Link to="/" className="auth-link">
              Return to Homepage
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}

export default LoginPage;
