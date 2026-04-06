import { useState } from 'react';
import { useReports } from '../hooks/useReports';
import { useDashboardSync } from '../hooks/useDashboardSync';
import { ThresholdCharts } from './ThresholdCharts';
import { ReportCharts } from '../components/ReportCharts';
import { AlertSummaryTable } from '../components/AlertSummaryTable';
import { DeviceActivityTable } from '../components/DeviceActivityTable';
import { RiverSectionTable } from '../components/RiverSectionTable';
import { SensorStatsTable } from '../components/SensorStatsTable';
import { ReadingsSummaryTable } from '../components/ReadingsSummaryTable';
import styles from '../assets/styles/Reports.module.css';

export function ReportsPage() {
  const [syncState] = useDashboardSync(30000);
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const dashboardData = syncState.data;
  const sectionConditions = dashboardData?.section_conditions || {
    upstream: {},
    midstream: {},
    downstream: {},
  };

  const {
    sensorStats,
    alertSummary,
    deviceActivity,
    dailyTrend,
    sectionStats,
    summary,
    thresholdStats,
    error,
    filterOptions,
    refresh,
  } = useReports();

  if (error && !sensorStats.length) {
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
        <h1>📊 Reports & Analytics</h1>
        <p>Comprehensive water quality analysis and system performance reports</p>
      </div>

      {/* Summary Stats */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{summary.total_readings.toLocaleString()}</div>
          <div className={styles.summaryLabel}>Total Readings</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{summary.active_devices}/{summary.total_devices}</div>
          <div className={styles.summaryLabel}>Active Devices</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{summary.total_alerts}</div>
          <div className={styles.summaryLabel}>Total Alerts</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{summary.sensor_type_count}</div>
          <div className={styles.summaryLabel}>Sensor Types</div>
        </div>
      </div>

      <ThresholdCharts 
        sectionConditions={sectionConditions} 
        totalReadings={summary.total_readings}
        thresholdStats={thresholdStats}
      />

      <ReadingsSummaryTable 
        timePeriod={timePeriod}
        onTimePeriodChange={setTimePeriod}
        filters={filterOptions}
      />

      <div style={{ marginTop: '24px' }}>
        <ReportCharts dailyTrend={dailyTrend} sensorStats={sensorStats} />
      </div>

      <AlertSummaryTable alerts={alertSummary} days={filterOptions.days} />

      <DeviceActivityTable devices={deviceActivity} days={filterOptions.days} />

      <RiverSectionTable sections={sectionStats} />

      <SensorStatsTable stats={sensorStats} days={filterOptions.days} />
    </div>
  );
}
