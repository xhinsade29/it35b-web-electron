/**
 * Activity Page
 * History & Activity Log - migrated from PHP activitylog.php
 */

import { useEffect } from 'react';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { MaintenanceLogs } from '../components/MaintenanceLogs';
import { ActivityStats } from '../components/ActivityStats';
import { ActivityFilters } from '../components/ActivityFilters';
import { useActivity } from '../hooks/useActivity';
import styles from './Activity.module.css';

export function ActivityPage() {
  const {
    timeline,
    maintenanceLogs,
    alertStats,
    readingStats,
    devices,
    loading,
    error,
    filterOptions,
    setFilterOptions,
    lastSync,
    refresh,
    startSync,
    stopSync,
  } = useActivity();

  // Start auto-sync on mount
  useEffect(() => {
    startSync(10000); // Sync every 10 seconds
    return () => stopSync();
  }, [startSync, stopSync]);

  const handleResetFilters = () => {
    setFilterOptions({ hours: 24, device_id: null });
  };

  if (loading && !timeline.length) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading activity data...</div>
      </div>
    );
  }

  if (error && !timeline.length) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>Error: {error}</p>
          <button onClick={refresh}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1>📜 History & Activity Log</h1>
        <p>View sensor readings, alerts, device activity, and system logs over time</p>
      </div>

      <ActivityStats
        readingStats={readingStats}
        alertStats={alertStats}
        hoursFilter={filterOptions.hours}
      />

      <ActivityFilters
        filterOptions={filterOptions}
        devices={devices}
        onFilterChange={setFilterOptions}
        onReset={handleResetFilters}
      />

      <ActivityTimeline
        items={timeline}
        eventCount={timeline.length}
        lastSync={lastSync}
      />

      <div style={{ marginTop: '24px' }}>
        <MaintenanceLogs logs={maintenanceLogs} />
      </div>
    </div>
  );
}
