// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { 
  loginUser, 
  logoutUser, 
  getCurrentUserFromStorage,
  getUserRole 
} from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const user = getCurrentUserFromStorage();
    if (user) {
      setCurrentUser(user);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const result = await loginUser(email, password);
    if (result.success) {
      setCurrentUser(result.user);
    }
    return result;
  };

  const logout = async () => {
    const result = await logoutUser();
    if (result.success) {
      setCurrentUser(null);
    }
    return result;
  };

  const value = {
    currentUser,
    login,
    logout,
    isAuthenticated: !!currentUser,
    userRole: currentUser?.role || null,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};