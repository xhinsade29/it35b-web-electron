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
        <div className={styles.cardTitle} style={{ fontSize: '11px' }}>
          🚨 Active Alerts
          <span
            className={`${styles.tag} ${
              alertCount > 0 ? styles.tagCrit : styles.tagGood
            }`}
            style={{ marginLeft: '4px', fontSize: '9px', padding: '2px 4px' }}
          >
            {alertCount}
          </span>
        </div>
      </div>
      <div className={styles.cardBody} style={{ padding: '8px' }}>
        {alerts.length === 0 ? (
          <div className={styles.empty} style={{ padding: '12px' }}>
            <div className={styles.emptyIcon} style={{ fontSize: '20px', marginBottom: '4px' }}>✓</div>
            <p style={{ fontSize: '11px', margin: 0 }}>No active alerts</p>
          </div>
        ) : (
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {alerts.slice(0, 10).map((alert) => (
              <div key={alert.alert_id} className={styles.alertItem} style={{ padding: '6px', marginBottom: '4px' }}>
                <div
                  className={`${styles.alertIc} ${getSeverityClass(alert.alert_type)}`}
                  style={{ width: '24px', height: '24px', fontSize: '12px' }}
                >
                  {getSeverityIcon(alert.alert_type)}
                </div>
                <div>
                  <div className={styles.alertMsg} style={{ fontSize: '11px' }}>{alert.message}</div>
                  <div className={styles.alertMeta} style={{ fontSize: '9px' }}>
                    {alert.device_name} · {formatTime(alert.created_at)}
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
