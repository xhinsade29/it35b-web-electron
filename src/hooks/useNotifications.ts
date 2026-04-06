import { useState, useEffect, useCallback } from 'react';
import { subscribeToAlerts, subscribeToSensorReadings } from '../api/dashboardApi';
import type { Alert, SensorReading } from '../types/dashboard.types';

// =====================================================
// Real-time Alerts Hook
// Subscribes to Supabase real-time changes
// =====================================================

export interface AlertNotification {
  id: string;
  type: 'alert' | 'reading';
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  data?: Alert | SensorReading;
}

export function useRealtimeAlerts() {
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastAlert, setLastAlert] = useState<Alert | null>(null);
  const [lastReading, setLastReading] = useState<SensorReading | null>(null);

  const addNotification = useCallback((notification: Omit<AlertNotification, 'id' | 'timestamp'>) => {
    const newNotification: AlertNotification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep last 50
    if (notification.severity !== 'info') {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    // Subscribe to new alerts
    const alertsSubscription = subscribeToAlerts((alert) => {
      setLastAlert(alert);
      
      const severity = alert.alert_type === 'critical' ? 'error' : 
                       alert.alert_type === 'high' ? 'warning' : 'warning';
      
      addNotification({
        type: 'alert',
        severity,
        title: `Alert: ${alert.alert_type.toUpperCase()}`,
        message: alert.message,
        data: alert
      });
    });

    // Subscribe to new sensor readings (throttled)
    let lastReadingTime = 0;
    const readingsSubscription = subscribeToSensorReadings((reading) => {
      const now = Date.now();
      // Throttle reading notifications to once per 5 seconds
      if (now - lastReadingTime > 5000) {
        lastReadingTime = now;
        setLastReading(reading as unknown as SensorReading);
        
        // Only notify for significant changes (outside safe range)
        // This would need sensor metadata to determine
        // For now, just log the reading without notification
      }
    });

    return () => {
      alertsSubscription.unsubscribe();
      readingsSubscription.unsubscribe();
    };
  }, [addNotification]);

  return {
    notifications,
    unreadCount,
    lastAlert,
    lastReading,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications
  };
}

// =====================================================
// Toast Notification Hook
// Manages toast display state
// =====================================================

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  duration: number;
}

export function useToastNotifications() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, toast]);
    
    // Auto-remove after duration
    setTimeout(() => {
      removeToast(id);
    }, duration);
    
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return {
    toasts,
    showToast,
    removeToast
  };
}

// =====================================================
// Alert Polling Hook (fallback for non-realtime)
// =====================================================

export function useAlertPolling(intervalMs: number = 30000) {
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAlerts = async () => {
      try {
        // Import here to avoid circular dependencies
        const { supabase } = await import('../lib/supabase');
        const { data, error } = await supabase
          .from('alerts')
          .select('*, sensors(*, devices(*, locations(*)))')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!error && data) {
          const transformed: Alert[] = data.map((a: { alert_id: string; alert_type: string; message: string; created_at: string; sensors: { sensor_type: string; devices: { device_name: string; locations: { location_name: string } } } }) => ({
            alert_id: a.alert_id,
            alert_type: a.alert_type as 'low' | 'high' | 'critical',
            message: a.message,
            created_at: a.created_at,
            sensor_type: a.sensors?.sensor_type || 'unknown',
            device_name: a.sensors?.devices?.device_name || 'Unknown',
            location_name: a.sensors?.devices?.locations?.location_name || 'Unknown'
          }));
          setActiveAlerts(transformed);
        }
      } catch (err) {
        console.error('Alert polling error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return { activeAlerts, loading };
}
