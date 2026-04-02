/**
 * Maintenance Logs Component
 * Displays operator maintenance entries
 */

import type { MaintenanceLog } from '../types/activity.types';
import styles from '../assets/styles/MaintenanceLogs.module.css';

interface MaintenanceLogsProps {
  logs: MaintenanceLog[];
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function MaintenanceLogs({ logs }: MaintenanceLogsProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span>🔧 Operator Maintenance Logs ({logs.length})</span>
      </div>
      <div className={styles.body}>
        {logs.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📭</div>
            <p>No maintenance logs recorded</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.maintenance_id} className={styles.timelineItem}>
              <div className={styles.icon}>🔧</div>
              <div className={styles.content}>
                <div className={styles.title}>
                  {capitalize(log.maintenance_type.replace(/_/g, ' '))}
                  <span className={`${styles.badge} ${styles.badgeInfo}`}>Maintenance</span>
                  {log.damage_level !== 'none' && (
                    <span className={`${styles.badge} ${styles.badgeCritical}`}>
                      Damage: {capitalize(log.damage_level)}
                    </span>
                  )}
                </div>
                <div className={styles.desc}>
                  <strong>{log.device_name}</strong>
                  {log.malfunction_type && (
                    <>
                      <br />
                      <span className={styles.warning}>⚠️ {log.malfunction_type}</span>
                    </>
                  )}
                  {log.notes && (
                    <div className={styles.notes}>{log.notes}</div>
                  )}
                </div>
                <div className={styles.meta}>
                  {formatDate(log.performed_at)}
                  • By: {log.operator_name}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
