import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('access_token');
    if (token) {
      validateToken(token).then(isValid => {
        setIsAuthenticated(isValid);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateToken = async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('validate_access_token', {
        token_input: token
      });

      if (error) throw error;
      return data === true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  const login = async (token: string): Promise<boolean> => {
    const isValid = await validateToken(token);

    if (isValid) {
      await supabase.rpc('update_token_usage', { token_input: token });
      sessionStorage.setItem('access_token', token);
      setIsAuthenticated(true);
      return true;
    }

    return false;
  };

  const logout = () => {
    sessionStorage.removeItem('access_token');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
