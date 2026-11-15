/**
 * api.js — Centralized API client and helpers for ShikshaSetu
 *
 * Provides typed, authenticated methods for communicating with the
 * Express backend (which proxies to the AI service and PostgreSQL database).
 */

/**
 * Resolves the API base URL:
 * 1. If import.meta.env.VITE_API_BASE is provided and non-empty, use it with trailing slashes removed.
 * 2. Otherwise, detect Electron desktop environment (window.location.protocol === 'file:' or window.electronAPI available).
 * 3. If Electron is detected, use 'http://localhost:5001'.
 * 4. Otherwise, return an empty string (preserves Vite development proxy and supports same-origin web deployments).
 */
const resolveApiBase = () => {
  const envBase = (import.meta.env.VITE_API_BASE || '').trim();
  if (envBase) {
    return envBase.replace(/\/+$/, '');
  }

  // Detect Electron desktop environment safely
  const isElectron =
    typeof window !== 'undefined' &&
    (window.location.protocol === 'file:' || Boolean(window.electronAPI));

  if (isElectron) {
    return 'http://localhost:5001';
  }

  return '';
};

export const apiBase = resolveApiBase();

// Warnings for production environments
if (import.meta.env.PROD && typeof window !== 'undefined') {
  const isElectron = window.location.protocol === 'file:' || Boolean(window.electronAPI);

  // Warn if production web build has an explicit localhost URL that is NOT being used by Electron
  if (!isElectron && (apiBase.startsWith('http://localhost') || apiBase.startsWith('http://127.0.0.1'))) {
    console.warn(
      `[ShikshaSetu] Warning: Production web build is configured with a localhost API URL (${apiBase}). ` +
      'External users will not be able to connect to this backend.'
    );
  } else if (!isElectron && !apiBase) {
    // If a production browser has an empty API base, log a non-blocking advisory
    console.warn(
      '[ShikshaSetu] Info: VITE_API_BASE is not configured. Requests will use relative paths (/api/*). ' +
      'If frontend and backend are hosted on separate domains, ensure VITE_API_BASE is set in your build settings.'
    );
  }
}

// Token storage helpers
export const getStoredToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || null;
};

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredAuth = (token, user, remember = true) => {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('token', token);
  storage.setItem('user', JSON.stringify(user));
  // Clean other storage to avoid desync
  const otherStorage = remember ? sessionStorage : localStorage;
  otherStorage.removeItem('token');
  otherStorage.removeItem('user');
};

export const clearStoredAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
};

/**
 * Common request wrapper with JSON headers, Authorization Bearer, and error handling.
 */
async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const url = `${apiBase}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    let data;
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      if (response.status === 401) {
        // Dispatch custom session-expired event if unauthorized
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
      const error = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (!err.status) {
      err.message = err.message || 'Network error: could not connect to server.';
    }
    throw err;
  }
}

// ============================================================================
// 1. Authentication API
// ============================================================================
export const authApi = {
  login: async ({ email, password }) => {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async ({ name, email, password, role = 'STUDENT' }) => {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
  },

  getCurrentUser: async () => {
    return request('/api/auth/me', {
      method: 'GET',
    });
  },
};

// ============================================================================
// 2. Student Profile API
// ============================================================================
export const studentApi = {
  getProfile: async () => {
    return request('/api/student/profile', {
      method: 'GET',
    });
  },

  saveProfile: async (profileData) => {
    // Uses PUT if exists, otherwise POST
    return request('/api/student/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  createProfile: async (profileData) => {
    return request('/api/student/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  },

  getProfileByUserId: async (userId) => {
    return request(`/api/student/profile/${userId}`, {
      method: 'GET',
    });
  },
};

// ============================================================================
// 3. Chat Sessions & Messages API
// ============================================================================
export const chatApi = {
  getSessions: async () => {
    return request('/api/chat/sessions', {
      method: 'GET',
    });
  },

  createSession: async (title = 'New Inquiry') => {
    return request('/api/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  getSessionById: async (sessionId) => {
    return request(`/api/chat/sessions/${sessionId}`, {
      method: 'GET',
    });
  },

  deleteSession: async (sessionId) => {
    return request(`/api/chat/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },

  saveMessage: async (sessionId, { content, sender, metadata }) => {
    return request(`/api/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, sender, metadata }),
    });
  },
};

// ============================================================================
// 4. AI Service Proxy API
// ============================================================================
export const aiApi = {
  askChatbot: async ({ query, sessionId, language = 'en' }) => {
    return request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ query, sessionId, language }),
    });
  },

  recommendColleges: async ({ percentile, category, branch, home_state = 'Rajasthan' }) => {
    return request('/api/ai/recommend-colleges', {
      method: 'POST',
      body: JSON.stringify({ percentile, category, branch, home_state }),
    });
  },

  predictCutoff: async ({ college_name, branch, category, year = 2026 }) => {
    return request('/api/ai/predict-cutoff', {
      method: 'POST',
      body: JSON.stringify({ college_name, branch, category, year }),
    });
  },
};

// ============================================================================
// 5. Colleges API
// ============================================================================
export const collegeApi = {
  getColleges: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.district) searchParams.append('district', params.district);
    if (params.page) searchParams.append('page', params.page);
    if (params.limit) searchParams.append('limit', params.limit);
    const qs = searchParams.toString();
    return request(`/api/colleges${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  getCollegeById: async (id) => {
    return request(`/api/colleges/${id}`, { method: 'GET' });
  },

  createCollege: async (data) => {
    return request('/api/colleges', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateCollege: async (id, data) => {
    return request(`/api/colleges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteCollege: async (id) => {
    return request(`/api/colleges/${id}`, {
      method: 'DELETE',
    });
  },

  addBranch: async (collegeId, branchData) => {
    return request(`/api/colleges/${collegeId}/branches`, {
      method: 'POST',
      body: JSON.stringify(branchData),
    });
  },
};

// ============================================================================
// 6. Cutoffs API
// ============================================================================
export const cutoffApi = {
  getCutoffs: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.collegeId) searchParams.append('collegeId', params.collegeId);
    if (params.course) searchParams.append('course', params.course);
    if (params.category) searchParams.append('category', params.category);
    if (params.admissionYear) searchParams.append('admissionYear', params.admissionYear);
    const qs = searchParams.toString();
    return request(`/api/cutoffs${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  createCutoff: async (data) => {
    return request('/api/cutoffs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
