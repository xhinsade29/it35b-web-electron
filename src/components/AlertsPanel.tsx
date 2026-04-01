import styles from '../pages/Dashboard.module.css';
import type { Alert } from '../types/dashboard.types';

interface AlertsPanelProps {
  alerts: Alert[];
  alertCount: number;
}

export function AlertsPanel({ alerts, alertCount }: AlertsPanelProps) {
  // Format timestamp
  const formatTime = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
      hour12: false,
    });
  };

  // Get severity icon
  const getSeverityIcon = (type: string) => {
    if (type === 'critical' || type === 'high') return '🚨';
    return '⚠️';
  };

  // Get severity class
  const getSeverityClass = (type: string) => {
    if (type === 'critical' || type === 'high') return styles.alertIcCrit;
    return styles.alertIcWarn;
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          🚨 Active Alerts
          <span
            className={`${styles.tag} ${
              alertCount > 0 ? styles.tagCrit : styles.tagGood
            }`}
            style={{ marginLeft: '8px' }}
          >
            {alertCount} Active
          </span>
        </div>
      </div>
      <div className={styles.cardBody}>
        {alerts.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>✓</div>
            <p>No active alerts — all sensors nominal.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.alert_id} className={styles.alertItem}>
              <div
                className={`${styles.alertIc} ${getSeverityClass(alert.alert_type)}`}
              >
                {getSeverityIcon(alert.alert_type)}
              </div>
              <div>
                <div className={styles.alertMsg}>{alert.message}</div>
                <div className={styles.alertMeta}>
                  {alert.device_name} · {alert.location_name} · {formatTime(alert.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
