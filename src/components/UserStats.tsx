/**
 * User Stats Component
 * Displays user statistics cards
 */

import type { UserStats } from '../types/user.types';
import styles from './UserStats.module.css';

interface UserStatsProps {
  stats: UserStats;
}

export function UserStats({ stats }: UserStatsProps) {
  return (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <h3>{stats.total_users}</h3>
        <p>Total Users</p>
      </div>
      <div className={`${styles.statCard} ${styles.statCardSuccess}`}>
        <h3>{stats.active_users}</h3>
        <p>Active Users</p>
      </div>
      <div className={`${styles.statCard} ${styles.statCardDanger}`}>
        <h3>{stats.inactive_users}</h3>
        <p>Inactive Users</p>
      </div>
      <div className={`${styles.statCard} ${styles.statCardInfo}`}>
        <h3>{stats.by_role.admin}</h3>
        <p>Admins</p>
      </div>
      <div className={styles.statCard}>
        <h3>{stats.by_role.researcher}</h3>
        <p>Researchers</p>
      </div>
      <div className={styles.statCard}>
        <h3>{stats.by_role.operator}</h3>
        <p>Operators</p>
      </div>
    </div>
  );
}
