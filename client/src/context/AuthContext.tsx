import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isLoading: boolean;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first load, restore session from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('quickbill_token');
    const storedUser = localStorage.getItem('quickbill_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  function login(user: User, token: string) {
    localStorage.setItem('quickbill_token', token);
    localStorage.setItem('quickbill_user', JSON.stringify(user));
    setUser(user);
    setToken(token);
  }

  function logout() {
    localStorage.removeItem('quickbill_token');
    localStorage.removeItem('quickbill_user');
    setUser(null);
    setToken(null);
  }

  function updateUser(updatedUser: User) {
    localStorage.setItem('quickbill_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}