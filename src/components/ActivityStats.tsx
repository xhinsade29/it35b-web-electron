/**
 * Activity Stats Component
 * Displays statistics cards for readings and alerts
 */

import type { AlertStats, ReadingStats } from '../types/activity.types';
import styles from '../assets/styles/ActivityStats.module.css';

interface ActivityStatsProps {
  readingStats: ReadingStats;
  alertStats: AlertStats;
  hoursFilter: number;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function ActivityStats({ readingStats, alertStats, hoursFilter }: ActivityStatsProps) {
  return (
    <div className={styles.statsGrid}>
      <div className={`${styles.statCard} ${styles.statCardSuccess}`}>
        <h3>{formatNumber(readingStats.total_readings)}</h3>
        <p>Sensor Readings ({hoursFilter}h)</p>
      </div>
      <div className={`${styles.statCard} ${styles.statCardWarning}`}>
        <h3>{alertStats.active_alerts}</h3>
        <p>Active Alerts</p>
      </div>
      <div className={`${styles.statCard} ${styles.statCardDanger}`}>
        <h3>{alertStats.critical_alerts}</h3>
        <p>Critical Alerts</p>
      </div>
      <div className={styles.statCard}>
        <h3>{alertStats.high_alerts}</h3>
        <p>High Priority</p>
      </div>
    </div>
  );
}
