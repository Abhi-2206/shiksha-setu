import { useState, useEffect } from 'react';
import { AuthContext } from './authContextInstance';
import { apiBase } from '../api';

const getStoredToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

const getStoredUser = () => {
  const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const clearStorage = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(() => Boolean(getStoredToken()));

  useEffect(() => {
    let isMounted = true;
    const storedToken = getStoredToken();

    if (!storedToken) {
      return;
    }

    fetch(`${apiBase}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storedToken}`,
      },
    })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (!isMounted) return;
        if (data && data.success && data.user) {
          setUser(data.user);
          if (localStorage.getItem('token')) {
            localStorage.setItem('user', JSON.stringify(data.user));
          } else {
            sessionStorage.setItem('user', JSON.stringify(data.user));
          }
        } else {
          clearStorage();
          setUser(null);
          setToken(null);
        }
      })
      .catch((err) => {
        console.warn('Authentication token verification failed:', err.message);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Log in user with email and password
   * @param {string} email
   * @param {string} password
   * @param {boolean} rememberMe - Persist in localStorage (true) or sessionStorage (false)
   */
  const login = async (email, password, rememberMe = true) => {
    const response = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      const errorMsg = data.message || `Login failed (Status: ${response.status})`;
      throw new Error(errorMsg);
    }

    const { token: receivedToken, user: receivedUser } = data;

    clearStorage();

    if (rememberMe) {
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(receivedUser));
    } else {
      sessionStorage.setItem('token', receivedToken);
      sessionStorage.setItem('user', JSON.stringify(receivedUser));
    }

    setToken(receivedToken);
    setUser(receivedUser);

    return receivedUser;
  };

  /**
   * Register a new student account
   * @param {string} name
   * @param {string} email
   * @param {string} password
   */
  const signup = async (name, email, password) => {
    const response = await fetch(`${apiBase}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        password,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      const errorMsg = data.message || `Registration failed (Status: ${response.status})`;
      throw new Error(errorMsg);
    }

    return data;
  };

  /**
   * Log out the current user
   */
  const logout = async () => {
    const storedToken = getStoredToken();
    try {
      if (storedToken) {
        await fetch(`${apiBase}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${storedToken}`,
          },
        }).catch(() => {});
      }
    } finally {
      clearStorage();
      setUser(null);
      setToken(null);
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(user && token),
    isAdmin: user?.role === 'ADMIN',
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
