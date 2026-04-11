import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API, { formatApiError } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await API.get('/auth/me');
      setUser(data.user);
    } catch {
      setUser(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    setUser(data.user);
    return data;
  };

  const register = async (email, password, name, referral_code) => {
    const { data } = await API.post('/auth/register', { email, password, name, referral_code: referral_code || undefined });
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try { await API.post('/auth/logout'); } catch {}
    setUser(false);
  };

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await API.get('/auth/me');
      setUser(data.user);
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
