import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('kast_user');
      if (!saved || saved === 'undefined' || saved === 'null') return null;
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse kast_user from localStorage:', e);
      localStorage.removeItem('kast_user');
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('kast_token');
    if (!savedToken || savedToken === 'undefined' || savedToken === 'null') return null;
    return savedToken;
  });
  const [points, setPoints] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await API.get('/auth/me');
      if (res.success && res.data) {
        const fetchedUser = res.data.user || res.data;
        setUser(fetchedUser);
        setPoints(res.data.points || 0);
        setNotifications(res.data.notifications || []);
        localStorage.setItem('kast_user', JSON.stringify(fetchedUser));
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    if (res.success) {
      const { token: newToken, user: newUser } = res.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('kast_token', newToken);
      localStorage.setItem('kast_user', JSON.stringify(newUser));
      return newUser;
    } else {
      throw new Error(res.message || 'Login failed');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setPoints(0);
    setNotifications([]);
    localStorage.removeItem('kast_token');
    localStorage.removeItem('kast_user');
  };

  const markNotificationsRead = async () => {
    try {
      await API.post('/auth/notifications/read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      points,
      notifications,
      loading,
      login,
      logout,
      refreshProfile: fetchProfile,
      markNotificationsRead
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
