// src/context/AuthContext.jsx
import  { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

// the hook lives next to its provider; fast refresh just reloads this file in full
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // only wait for /auth/me/ when a token survived the page refresh
  const [loading, setLoading] = useState(() => !!sessionStorage.getItem('access_token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // on start (e.g. after a page refresh) restore the user from the saved token
  useEffect(() => {
    if (!sessionStorage.getItem('access_token')) return;
    authService.getProfile()
      .then((response) => {
        setUser(response.data);
        setIsAuthenticated(true);
      })
      .catch((error) => {
        // token expired and could not be refreshed, or the account was rejected
        console.error('Error loading user:', error);
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
      })
      .finally(() => setLoading(false));
  }, []);

  // the refresh token expired: the api client tells us, so the ui stops showing us as logged in
  useEffect(() => {
    const onExpired = () => { setUser(null); setIsAuthenticated(false); };
    window.addEventListener('auth-expired', onExpired);
    return () => window.removeEventListener('auth-expired', onExpired);
  }, []);


  const login = async (username, password) => {
    try {
      const response = await authService.login({ username, password });
      const { user } = response.data;

      setUser(user);
      setIsAuthenticated(true);

      return { success: true, user };
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};