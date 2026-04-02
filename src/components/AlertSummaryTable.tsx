/**
 * Alert Summary Table Component
 */

import type { AlertSummary } from '../types/reports.types';
import styles from './ReportTables.module.css';

interface AlertSummaryTableProps {
  alerts: AlertSummary[];
  days: number;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function AlertSummaryTable({ alerts, days }: AlertSummaryTableProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>Alert Summary</h2>
      </div>
      <div className={styles.cardBody}>
        {alerts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📭</div>
            <p>No alerts in the last {days} days</p>
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Alert Type</th>
                  <th>Total</th>
                  <th>Active</th>
                  <th>Resolved</th>
                  <th>Acknowledged</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.alert_type}>
                    <td>{capitalize(alert.alert_type)}</td>
                    <td>{alert.total_alerts}</td>
                    <td>{alert.active_alerts}</td>
                    <td>{alert.resolved_alerts}</td>
                    <td>{alert.acknowledged_alerts}</td>
                    <td>
                      {alert.active_alerts > 0 ? (
                        <span className={`${styles.badge} ${styles.badgeDanger}`}>Active</span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeSuccess}`}>All Clear</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
