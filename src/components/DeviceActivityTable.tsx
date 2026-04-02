/**
 * Device Activity Table Component
 */

import type { DeviceActivity } from '../types/reports.types';
import styles from './ReportTables.module.css';

interface DeviceActivityTableProps {
  devices: DeviceActivity[];
  days: number;
}

function formatDate(timestamp: string | null): string {
  if (!timestamp) return 'Never';
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'active':
      return styles.badgeSuccess;
    case 'maintenance':
      return styles.badgeWarning;
    case 'inactive':
    case 'offline':
      return styles.badgeDanger;
    default:
      return styles.badgeInfo;
  }
}

export function DeviceActivityTable({ devices, days }: DeviceActivityTableProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>Device Activity Report</h2>
      </div>
      <div className={styles.cardBody}>
        {devices.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📭</div>
            <p>No device activity in the last {days} days</p>
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Device Name</th>
                  <th>Status</th>
                  <th>Total Readings</th>
                  <th>Active Days</th>
                  <th>Last Reading</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.device_id}>
                    <td>{device.device_name}</td>
                    <td>
                      <span className={`${styles.badge} ${getStatusBadgeClass(device.status)}`}>
                        {device.status}
                      </span>
                    </td>
                    <td>{device.total_readings.toLocaleString()}</td>
                    <td>{device.active_days}</td>
                    <td>{formatDate(device.last_reading)}</td>
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
