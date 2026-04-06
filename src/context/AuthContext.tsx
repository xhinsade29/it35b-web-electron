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
  // For now, mock a logged in user - replace with actual Supabase auth later
  const [user, setUser] = useState<AuthUser | null>({
    user_id: 'mock-user-id',
    username: 'admin',
    email: 'admin@aqua-vision.com',
    full_name: 'System Administrator',
    role: 'admin',
    is_active: true,
  });

  const login = useCallback((newUser: AuthUser) => {
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
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
