/**
 * Report Stats Component
 * Displays statistics cards for reports
 */

import type { ReportSummary } from '../types/reports.types';
import styles from './ReportStats.module.css';

interface ReportStatsProps {
  summary: ReportSummary;
  days: number;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function ReportStats({ summary, days }: ReportStatsProps) {
  return (
    <div className={styles.statsGrid}>
      <div className={`${styles.statCard} ${styles.statCardSuccess}`}>
        <h3>{formatNumber(summary.total_readings)}</h3>
        <p>Total Readings ({days}d)</p>
      </div>
      <div className={`${styles.statCard} ${styles.statCardInfo}`}>
        <h3>{summary.active_devices}/{summary.total_devices}</h3>
        <p>Active Devices</p>
      </div>
      <div className={`${styles.statCard} ${styles.statCardWarning}`}>
        <h3>{formatNumber(summary.total_alerts)}</h3>
        <p>Total Alerts</p>
      </div>
      <div className={styles.statCard}>
        <h3>{summary.sensor_type_count}</h3>
        <p>Sensor Types</p>
      </div>
    </div>
  );
}
