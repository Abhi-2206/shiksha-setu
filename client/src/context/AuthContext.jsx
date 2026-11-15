import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  authApi,
  getStoredToken,
  getStoredUser,
  setStoredAuth,
  clearStoredAuth,
} from '../api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  // Synchronize and verify current user on mount if token exists
  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      const storedToken = getStoredToken();
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const res = await authApi.getCurrentUser();
        if (isMounted && res.success && res.user) {
          setUser(res.user);
          // Update cached user
          const isRemembered = Boolean(localStorage.getItem('token'));
          setStoredAuth(storedToken, res.user, isRemembered);
        }
      } catch (err) {
        // If token is invalid or expired, clear session
        if (err.status === 401 && isMounted) {
          clearStoredAuth();
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    verifySession();

    // Listen for custom 401 session expiry event
    const handleExpired = () => {
      clearStoredAuth();
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth:expired', handleExpired);
    return () => {
      isMounted = false;
      window.removeEventListener('auth:expired', handleExpired);
    };
  }, []);

  const login = useCallback(async ({ email, password, remember = true }) => {
    const res = await authApi.login({ email, password });
    if (res.success && res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      setStoredAuth(res.token, res.user, remember);
      return res;
    }
    throw new Error(res.message || 'Login failed');
  }, []);

  const register = useCallback(async ({ name, email, password, role = 'STUDENT', remember = true }) => {
    const res = await authApi.register({ name, email, password, role });
    if (res.success && res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      setStoredAuth(res.token, res.user, remember);
      return res;
    }
    throw new Error(res.message || 'Registration failed');
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.getCurrentUser();
      if (res.success && res.user) {
        setUser(res.user);
        const isRemembered = Boolean(localStorage.getItem('token'));
        setStoredAuth(token, res.user, isRemembered);
      }
    } catch (_err) {
      // Ignored
    }
  }, [token]);

  const value = {
    token,
    user,
    loading,
    isAuthenticated: Boolean(token && user),
    isAdmin: user?.role === 'ADMIN' || user?.role === 'admin',
    isStudent: user?.role === 'STUDENT' || user?.role === 'student' || (!user?.role && Boolean(user)),
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
