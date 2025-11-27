import api from '../utils/api';

// ============================
// Auth Service
// Centralized client-side logic for authentication & user identity
// ============================

// Minimal user shape we rely on in the frontend
// { id, name, email }

// Utility helpers: unified read / write for localStorage
const USER_INFO_KEY = 'userInfo';

const saveUserToStorage = (user) => {
  if (!user) return;
  localStorage.setItem(
    USER_INFO_KEY,
    JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
    })
  );
};

const getUserFromStorage = () => {
  const raw = localStorage.getItem(USER_INFO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse userInfo from localStorage', e);
    return null;
  }
};

// ============== Auth business functions ==============

// Login: call /api/users/login and cache normalized user info
export const login = async (email, password) => {
  const { data } = await api.post('/users/login', { email, password });
  // Backend returns: { _id, name, email }
  const normalized = {
    id: data._id || data.id,
    name: data.name,
    email: data.email,
  };
  saveUserToStorage(normalized);
  return normalized;
};

// Register: call /api/users/register and cache normalized user info
export const register = async (name, email, password) => {
  const { data } = await api.post('/users/register', { name, email, password });
  const normalized = {
    id: data._id || data.id,
    name: data.name,
    email: data.email,
  };
  saveUserToStorage(normalized);
  return normalized;
};

// Logout: call /api/users/logout and clear local cache
export const logout = async () => {
  try {
    await api.post('/users/logout');
  } catch (err) {
    console.error('Logout request failed', err);
  }

  localStorage.removeItem(USER_INFO_KEY);
  localStorage.removeItem('token');
};

// Get current user: prefer localStorage; fall back to /api/users/me when needed
export const getCurrentUser = async () => {
  const cached = getUserFromStorage();
  if (cached) return cached;

  try {
    const { data } = await api.get('/users/me');
    const normalized = {
      id: data.id || data._id,
      name: data.name,
      email: data.email,
    };
    saveUserToStorage(normalized);
    return normalized;
  } catch (err) {
    console.error('Failed to fetch current user from /users/me', err);
    return null;
  }
};


