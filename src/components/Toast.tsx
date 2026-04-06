import { useEffect, useState } from 'react';
import type { ToastType } from '../context/ToastContext';

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  onClose: () => void;
}

const ToastIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const ToastTitles: Record<ToastType, string> = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
};

const ToastColors: Record<ToastType, { border: string; bg: string; iconBg: string; title: string }> = {
  success: { border: '#059669', bg: '#f0fdf4', iconBg: '#059669', title: '#059669' },
  error: { border: '#dc2626', bg: '#fef2f2', iconBg: '#dc2626', title: '#dc2626' },
  warning: { border: '#d97706', bg: '#fffbeb', iconBg: '#d97706', title: '#d97706' },
  info: { border: '#3b82f6', bg: '#eff6ff', iconBg: '#3b82f6', title: '#3b82f6' },
};

export function Toast({ message, type, duration, onClose }: ToastProps) {
  const [isHiding, setIsHiding] = useState(false);
  const colors = ToastColors[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHiding(true);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsHiding(true);
    setTimeout(onClose, 300);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '16px 20px',
        borderRadius: '12px',
        background: colors.bg,
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        borderLeft: `4px solid ${colors.border}`,
        minWidth: '300px',
        maxWidth: '400px',
        position: 'relative',
        animation: isHiding ? 'toastSlideOut 0.3s ease-in forwards' : 'toastSlideIn 0.3s ease-out',
        transformOrigin: 'right',
      }}
    >
      <div
        style={{
          width: '24px',
          height: '24px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          fontSize: '14px',
          background: colors.iconBg,
          color: 'white',
        }}
      >
        {ToastIcons[type]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: '14px',
            color: colors.title,
            marginBottom: '2px',
          }}
        >
          {ToastTitles[type]}
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#4b5563',
            lineHeight: 1.4,
          }}
        >
          {message}
        </div>
      </div>
      <button
        onClick={handleClose}
        style={{
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          borderRadius: '4px',
          color: '#9ca3af',
          border: 'none',
          background: 'transparent',
          flexShrink: 0,
          fontSize: '16px',
          lineHeight: 1,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#4b5563';
          e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#9ca3af';
          e.currentTarget.style.background = 'transparent';
        }}
      >
        ×
      </button>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '3px',
          background: colors.border,
          borderRadius: '0 0 0 12px',
          animation: `toastProgress ${duration}ms linear`,
        }}
      />
      <style>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes toastSlideOut {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(100%) scale(0.9);
          }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
