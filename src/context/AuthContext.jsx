import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../apiClient';

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const reauthenticate = async (currentUserId) => {
    setLoading(true);
    try {
        const response = await api.post('/api/auth/reauthenticate', { userId: currentUserId });
        const { token: newToken, user: newUser } = response.data;
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    } catch (error) {
        console.error("Failed to reauthenticate:", error);
        logout();
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Failed to parse stored user', err);
        logout(); // Logout if stored data is corrupt
      }
    }
    setLoading(false);
  }, []);


  const login = async (email, password) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(token);
      setUser(user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      const res = await api.post('/api/auth/register', userData);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(token);
      setUser(user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Registration failed' };
    }
  };

  const registerDriver = async (userData) => {
    try {
      const res = await api.post('/api/auth/register-driver', userData);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(token);
      setUser(user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Driver registration failed' };
    }
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
  };

  const updateUser = (newUserData) => {
    setUser(newUserData);
    localStorage.setItem('user', JSON.stringify(newUserData));
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, register, registerDriver, logout, loading, updateUser, reauthenticate }}
    >
      {children}
    </AuthContext.Provider>
  );
};
