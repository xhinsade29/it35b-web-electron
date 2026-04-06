import { createContext, useContext, useState, useCallback, type ReactNode, useEffect } from 'react';
import { Toast } from '../components/Toast';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  return url && key && url.startsWith('https://');
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showConfigWarning, setShowConfigWarning] = useState(false);

  useEffect(() => {
    // Show configuration warning if Supabase is not configured
    if (!isSupabaseConfigured()) {
      setShowConfigWarning(true);
    }
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {/* Configuration Warning Banner */}
      {showConfigWarning && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            background: '#dc2626',
            color: 'white',
            padding: '12px 20px',
            zIndex: 10001,
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          ⚠️ Database not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables in Vercel.
          <button
            onClick={() => setShowConfigWarning(false)}
            style={{
              marginLeft: '16px',
              padding: '4px 12px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      <div
        style={{
          position: 'fixed',
          top: showConfigWarning ? '50px' : '20px',
          right: '20px',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '400px',
        }}
      >
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
