import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import './AuthPage.css';

export default function AuthPage({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, isAuthenticated, user } = useAuth();

  // If user is already authenticated, redirect them away from login/register
  useEffect(() => {
    if (isAuthenticated && user) {
      const destination = location.state?.from?.pathname || (user.role === 'ADMIN' ? '/students' : '/');
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [loginFieldErrors, setLoginFieldErrors] = useState({});

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState(null);
  const [regSuccess, setRegSuccess] = useState(null);
  const [regFieldErrors, setRegFieldErrors] = useState({});

  // Switch between tabs and clear temporary messages
  const handleSwitchMode = (newMode) => {
    setMode(newMode);
    setLoginError(null);
    setRegError(null);
    setRegSuccess(null);
    setLoginFieldErrors({});
    setRegFieldErrors({});
  };

  // -------------------------------------------------------------
  // 1. LOGIN SUBMIT HANDLER
  // -------------------------------------------------------------
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError(null);

    const errors = {};
    if (!loginEmail.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!loginPassword) {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      setLoginFieldErrors(errors);
      return;
    }
    setLoginFieldErrors({});

    setLoginLoading(true);

    try {
      const loggedInUser = await login(loginEmail, loginPassword, rememberMe);

      // Successfully logged in — determine redirect destination
      const fromPath = location.state?.from?.pathname;
      const destination = fromPath || (loggedInUser.role === 'ADMIN' ? '/students' : '/');
      navigate(destination, { replace: true });
    } catch (err) {
      setLoginError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 2. REGISTRATION SUBMIT HANDLER
  // -------------------------------------------------------------
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    const errors = {};
    if (!regName.trim()) {
      errors.name = 'Full name is required';
    } else if (regName.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!regEmail.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!regPassword) {
      errors.password = 'Password is required';
    } else if (regPassword.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }

    if (!regConfirmPassword) {
      errors.confirmPassword = 'Confirmation password is required';
    } else if (regPassword !== regConfirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setRegFieldErrors(errors);
      return;
    }
    setRegFieldErrors({});

    setRegLoading(true);

    try {
      const response = await signup(regName, regEmail, regPassword);

      setRegSuccess(
        response.message || 'Account created successfully! You can now sign in with your credentials.'
      );

      // Pre-fill login email and switch to login tab after brief delay
      setLoginEmail(regEmail);
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirmPassword('');

      setTimeout(() => {
        setMode('login');
      }, 1800);
    } catch (err) {
      setRegError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        
        {/* Header */}
        <div className="auth-header">
          <div className="auth-badge">
            Government of Rajasthan • Dept. of Technical Education
          </div>
          <h1 className="auth-title">
            Shiksha<span>Setu</span> Portal
          </h1>
          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Sign in to access your student profile or administrator console'
              : 'Create a new student account to explore colleges and track admissions'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('register')}
          >
            New Registration
          </button>
        </div>

        {/* Body */}
        <div className="auth-body">
          {mode === 'login' ? (
            /* ================= LOGIN FORM ================= */
            <form onSubmit={handleLoginSubmit} noValidate>
              {loginError && (
                <div className="auth-alert auth-alert-error" role="alert">
                  <span className="auth-alert-icon">⚠️</span>
                  <span>{loginError}</span>
                </div>
              )}

              {/* Email */}
              <div className="auth-form-group">
                <label htmlFor="login-email">
                  Email Address <span className="required-star">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="login-email"
                    type="email"
                    className={`auth-input ${loginFieldErrors.email ? 'has-error' : ''}`}
                    placeholder="student@example.com or admin@shikshasetu.gov.in"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      if (loginFieldErrors.email) {
                        setLoginFieldErrors((prev) => ({ ...prev, email: null }));
                      }
                    }}
                    autoComplete="email"
                    required
                  />
                </div>
                {loginFieldErrors.email && (
                  <span className="auth-field-error">{loginFieldErrors.email}</span>
                )}
              </div>

              {/* Password */}
              <div className="auth-form-group">
                <label htmlFor="login-password">
                  Password <span className="required-star">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    className={`auth-input auth-input-with-toggle ${loginFieldErrors.password ? 'has-error' : ''}`}
                    placeholder="Enter your account password"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (loginFieldErrors.password) {
                        setLoginFieldErrors((prev) => ({ ...prev, password: null }));
                      }
                    }}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {loginFieldErrors.password && (
                  <span className="auth-field-error">{loginFieldErrors.password}</span>
                )}
              </div>

              {/* Remember Me */}
              <div className="auth-options-row">
                <label className="auth-remember-label">
                  <input
                    type="checkbox"
                    className="auth-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Keep me signed in</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <>
                    <span className="auth-spinner" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              {/* Switch to Register */}
              <div className="auth-switch-prompt">
                Don't have an account yet?{' '}
                <button
                  type="button"
                  className="auth-switch-btn"
                  onClick={() => handleSwitchMode('register')}
                >
                  Register here
                </button>
              </div>

              {/* Educational Platform Guidance Note */}
              <div className="auth-info-footer">
                💡 <strong>Administrator Access:</strong> To access the Student Management directory, sign in with administrator credentials. Normal student accounts can view their academic profile and explore colleges.
              </div>
            </form>
          ) : (
            /* ================= REGISTRATION FORM ================= */
            <form onSubmit={handleRegisterSubmit} noValidate>
              {regError && (
                <div className="auth-alert auth-alert-error" role="alert">
                  <span className="auth-alert-icon">⚠️</span>
                  <span>{regError}</span>
                </div>
              )}

              {regSuccess && (
                <div className="auth-alert auth-alert-success" role="alert">
                  <span className="auth-alert-icon">✅</span>
                  <span>{regSuccess}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="auth-form-group">
                <label htmlFor="reg-name">
                  Full Name <span className="required-star">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="reg-name"
                    type="text"
                    className={`auth-input ${regFieldErrors.name ? 'has-error' : ''}`}
                    placeholder="e.g. Ramesh Kumar Sharma"
                    value={regName}
                    onChange={(e) => {
                      setRegName(e.target.value);
                      if (regFieldErrors.name) {
                        setRegFieldErrors((prev) => ({ ...prev, name: null }));
                      }
                    }}
                    autoComplete="name"
                    required
                  />
                </div>
                {regFieldErrors.name && (
                  <span className="auth-field-error">{regFieldErrors.name}</span>
                )}
              </div>

              {/* Email Address */}
              <div className="auth-form-group">
                <label htmlFor="reg-email">
                  Email Address <span className="required-star">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="reg-email"
                    type="email"
                    className={`auth-input ${regFieldErrors.email ? 'has-error' : ''}`}
                    placeholder="student@example.com"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      if (regFieldErrors.email) {
                        setRegFieldErrors((prev) => ({ ...prev, email: null }));
                      }
                    }}
                    autoComplete="email"
                    required
                  />
                </div>
                {regFieldErrors.email && (
                  <span className="auth-field-error">{regFieldErrors.email}</span>
                )}
              </div>

              {/* Password */}
              <div className="auth-form-group">
                <label htmlFor="reg-password">
                  Password <span className="required-star">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="reg-password"
                    type={showRegPassword ? 'text' : 'password'}
                    className={`auth-input auth-input-with-toggle ${regFieldErrors.password ? 'has-error' : ''}`}
                    placeholder="Minimum 6 characters"
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      if (regFieldErrors.password) {
                        setRegFieldErrors((prev) => ({ ...prev, password: null }));
                      }
                    }}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowRegPassword((prev) => !prev)}
                    title={showRegPassword ? 'Hide password' : 'Show password'}
                    aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {regFieldErrors.password && (
                  <span className="auth-field-error">{regFieldErrors.password}</span>
                )}
              </div>

              {/* Confirm Password */}
              <div className="auth-form-group">
                <label htmlFor="reg-confirm-password">
                  Confirm Password <span className="required-star">*</span>
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="reg-confirm-password"
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    className={`auth-input auth-input-with-toggle ${regFieldErrors.confirmPassword ? 'has-error' : ''}`}
                    placeholder="Re-enter password to confirm"
                    value={regConfirmPassword}
                    onChange={(e) => {
                      setRegConfirmPassword(e.target.value);
                      if (regFieldErrors.confirmPassword) {
                        setRegFieldErrors((prev) => ({ ...prev, confirmPassword: null }));
                      }
                    }}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowRegConfirmPassword((prev) => !prev)}
                    title={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                    aria-label={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {regFieldErrors.confirmPassword && (
                  <span className="auth-field-error">{regFieldErrors.confirmPassword}</span>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={regLoading}
              >
                {regLoading ? (
                  <>
                    <span className="auth-spinner" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  'Create Student Account'
                )}
              </button>

              {/* Switch to Login */}
              <div className="auth-switch-prompt">
                Already registered?{' '}
                <button
                  type="button"
                  className="auth-switch-btn"
                  onClick={() => handleSwitchMode('login')}
                >
                  Sign in here
                </button>
              </div>

              <div className="auth-info-footer">
                🔒 <strong>Account Security:</strong> Your password is encrypted using salted bcrypt hashing and stored securely in the PostgreSQL database.
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
