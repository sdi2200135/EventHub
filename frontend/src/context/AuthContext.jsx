// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('access_token');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      // ============================================
      // MOCK MODE: Διάβασε τον user από sessionStorage
      // ============================================
      // Χωρίς αυτό, το getProfile() επιστρέφει πάντα τον
      // hardcoded participant του MockData, με αποτέλεσμα ο
      // organizer/admin να χάνει τον ρόλο του μετά από refresh.
      if (USE_MOCK) {
        const savedUser = sessionStorage.getItem('mock_user');
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            setUser(parsed);
            setIsAuthenticated(true);
            setLoading(false);
            return;
          } catch (e) {
            console.error('Error parsing mock_user:', e);
            // Πέφτει στο getProfile() ως fallback
          }
        }
      }

      const response = await authService.getProfile();
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error loading user:', error);
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('mock_user');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await authService.login({ username, password });
      const { access, refresh, user } = response.data;

      sessionStorage.setItem('access_token', access);
      sessionStorage.setItem('refresh_token', refresh);

      // ============================================
      // MOCK MODE: Αποθήκευσε τον user στο sessionStorage
      // ============================================
      if (USE_MOCK) {
        sessionStorage.setItem('mock_user', JSON.stringify(user));
      }

      setUser(user);
      setIsAuthenticated(true);

      // Ενημέρωση του last_login μέσω API call
      try {
        await authService.updateLastLogin();
      } catch (e) {
        console.log('Could not update last_login:', e);
      }

      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        error.message ||
        'Invalid username or password';
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Register error:', error);
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        return { success: false, error: errorData };
      }
      const message = error.response?.data?.detail || error.message || 'Registration failed';
      return { success: false, error: message };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('mock_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    setUser,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    loadUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};