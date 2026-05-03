import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// User type based on database schema
export interface AuthUser {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'operator' | 'viewer' | 'researcher';
  is_active: boolean;
}

// Auth context type
interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  // Storage key for localStorage (inside component for fast refresh)
  const AUTH_STORAGE_KEY = 'aqua-vision-auth-user';

  // Load user from localStorage on initial render
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as AuthUser;
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  });

  const login = useCallback((newUser: AuthUser) => {
    setUser(newUser);
    // Save to localStorage
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    // Clear localStorage
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    // In production, also call Supabase signOut
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
