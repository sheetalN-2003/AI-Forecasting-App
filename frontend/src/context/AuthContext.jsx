import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('retailpulse_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  // Accept (token, userObj) directly — used by AuthPage which already has the data
  const login = useCallback((tokenOrUsername, userObjOrPassword) => {
    // If called with (token, userObj) — new pattern from AuthPage
    if (typeof userObjOrPassword === 'object' && userObjOrPassword !== null) {
      const token = tokenOrUsername;
      const userObj = userObjOrPassword;
      localStorage.setItem('retailpulse_token', token);
      localStorage.setItem('retailpulse_user', JSON.stringify(userObj));
      setUser(userObj);
      return;
    }
    // Legacy pattern: (username, password) — not used by new AuthPage but kept for compat
    console.warn('AuthContext.login called with username/password - use AuthPage directly');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('retailpulse_token');
    localStorage.removeItem('retailpulse_user');
    setUser(null);
  }, []);

  // Allow updating user in context (e.g. after profile update)
  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('retailpulse_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
