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
import { SkeletonStats, SkeletonTable, SkeletonText } from '../components/Skeleton';
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
    // loading, // unused - mock data warning takes precedence
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

  // Check if we're using mock data (no real database connection)
  const isMockData = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Show skeleton while loading
  if (!timeline.length && !error) {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1>📜 History & Activity Log</h1>
          <p>View sensor readings, alerts, device activity, and system logs over time</p>
        </div>
        <SkeletonStats count={3} />
        <div style={{ marginBottom: '24px' }}>
          <SkeletonText lines={1} width={200} height={40} />
        </div>
        <SkeletonTable rows={6} columns={4} />
      </div>
    );
  }

  if (isMockData) {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1>📜 History & Activity Log</h1>
          <p>View sensor readings, alerts, device activity, and system logs over time</p>
        </div>
        <div style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#92400e' }}>⚠️ Database Not Connected</h3>
          <p style={{ margin: 0, color: '#92400e' }}>
            Activity data is not available because the database is not configured.
            Please set the <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> environment variables in your Vercel dashboard.
          </p>
        </div>
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

          {/* Recent Activity Section */}
          <div style={{
            background: 'linear-gradient(135deg, #0F2854 0%, #0a1f42 100%)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid rgba(73, 136, 196, 0.2)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#e8ecf1', fontSize: '1.1rem' }}>
              🔔 Recent Activity (Latest 10)
            </h3>
            {timeline.length === 0 ? (
              <p style={{ color: '#8b9aae', textAlign: 'center', padding: '20px' }}>
                No recent activity
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {timeline.slice(0, 10).map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      background: 'rgba(10, 22, 40, 0.6)',
                      borderRadius: '8px',
                      borderLeft: `3px solid ${
                        item.type === 'alert' ? '#f87171' :
                        item.type === 'reading' ? '#34d399' :
                        item.type === 'system' ? '#818cf8' : '#fbbf24'
                      }`,
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>
                      {item.type === 'alert' ? '⚠️' :
                       item.type === 'reading' ? '📊' :
                       item.type === 'system' || item.type === 'device' ? '⚙️' : '📝'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#e8ecf1', fontSize: '0.9rem', fontWeight: 500 }}>
                        {item.message}
                      </div>
                      <div style={{ color: '#8b9aae', fontSize: '0.75rem' }}>
                        {item.type === 'reading' && item.device_name ? 
                          `${item.device_name} • ${item.data.value}${item.data.unit}` :
                          item.type === 'alert' ?
                          `${item.device_name || 'Unknown'} • ${item.status}` :
                          item.type === 'system' || item.type === 'device' ?
                          `By ${item.user}${item.ip ? ` (${item.ip})` : ''}` :
                          ''}
                      </div>
                    </div>
                    <div style={{ color: '#4988C4', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {new Date(item.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {timeline.length > 10 && (
              <button
                onClick={() => setActiveTab('timeline')}
                style={{
                  marginTop: '16px',
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid rgba(73, 136, 196, 0.3)',
                  borderRadius: '8px',
                  color: '#4988C4',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  width: '100%',
                }}
              >
                View All {timeline.length} Activities →
              </button>
            )}
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

export default ActivityPage;
