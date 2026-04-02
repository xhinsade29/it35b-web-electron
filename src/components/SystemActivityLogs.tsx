import styles from "../assets/styles/Dashboard.module.css";
import type { Alert } from '../types/dashboard.types';

interface SystemActivityLogsProps {
  simulationLogs: Array<{
    id?: string;
    timestamp: string;
    message: string;
    type?: 'info' | 'error' | 'alert' | 'success';
  }>;
  alerts: Alert[];
}

export function SystemActivityLogs({ simulationLogs, alerts }: SystemActivityLogsProps) {
  // Combine simulation logs and alerts into system activities
  const activities = [
    // Recent alerts (last 10)
    ...alerts.slice(0, 10).map(alert => ({
      id: alert.alert_id,
      timestamp: alert.created_at,
      message: `🚨 Alert: ${alert.message || `${alert.sensor_type} ${alert.alert_type}`}`,
      type: 'alert' as const,
    })),
    // Simulation logs
    ...simulationLogs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      message: log.message,
      type: log.type || 'info',
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'error': return '#dc2626';
      case 'alert': return '#d97706';
      case 'success': return '#059669';
      default: return '#3d4a5c';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'error': return '❌';
      case 'alert': return '🚨';
      case 'success': return '✅';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          📋 System Activity Logs
          <span className={`${styles.tag} ${styles.tagInfo}`} style={{ marginLeft: '8px' }}>
            {activities.length} activities
          </span>
        </div>
      </div>
      <div className={styles.cardBody}>
        {activities.length === 0 ? (
          <div className={styles.empty} style={{ textAlign: 'center', padding: '40px', color: '#8897aa' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
            <div>No system activities yet</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Start simulation to see activity logs
            </div>
          </div>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {activities.map((activity, index) => (
              <div
                key={activity.id || index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '10px 12px',
                  borderBottom: '1px solid rgba(13,17,23,0.06)',
                  background: index % 2 === 0 ? '#fafafa' : '#fff',
                }}
              >
                <span style={{ fontSize: '14px' }}>{getActivityIcon(activity.type)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: getActivityColor(activity.type), lineHeight: '1.4' }}>
                    {activity.message}
                  </div>
                  <div style={{ fontSize: '10px', color: '#8897aa', marginTop: '2px', fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatTime(activity.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
