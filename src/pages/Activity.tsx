/**
 * Activity Page
 * History & Activity Log - migrated from PHP activitylog.php
 */

import { useEffect, useState } from 'react';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { MaintenanceLogs } from '../components/MaintenanceLogs';
import { ActivityStats } from '../components/ActivityStats';
import { ActivityFilters } from '../components/ActivityFilters';
import { useActivity } from '../hooks/useActivity';
import styles from '../assets/styles/Activity.module.css';

type TabId = 'overview' | 'timeline' | 'maintenance';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'timeline', label: 'Activity Timeline', icon: '📜' },
  { id: 'maintenance', label: 'Maintenance Logs', icon: '🔧' },
];

export function ActivityPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
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

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '1px solid rgba(73, 136, 196, 0.2)',
        paddingBottom: '12px',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab.id
                ? 'linear-gradient(135deg, #0F2854 0%, #4988C4 100%)'
                : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : '#8b9aae',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          <div style={{ marginBottom: '24px' }}>
            <ActivityStats
              readingStats={readingStats}
              alertStats={alertStats}
              hoursFilter={filterOptions.hours}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <ActivityFilters
              filterOptions={filterOptions}
              devices={devices}
              onFilterChange={setFilterOptions}
              onReset={handleResetFilters}
            />
          </div>
        </>
      )}

      {activeTab === 'timeline' && (
        <div style={{ marginBottom: '24px' }}>
          <ActivityTimeline
            items={timeline}
            eventCount={timeline.length}
            lastSync={lastSync}
          />
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div style={{ marginTop: '24px' }}>
          <MaintenanceLogs logs={maintenanceLogs} />
        </div>
      )}
    </div>
  );
}
