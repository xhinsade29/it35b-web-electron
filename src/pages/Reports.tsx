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
import { ReportsLoadingModal } from '../components/ReportsLoadingModal';
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
    deviceReadings,
    summary,
    loading,
    error,
    filterOptions,
    refresh,
  } = useReports();

  if (loading) {
    // Calculate loading progress based on data fetched
    const totalSteps = 7;
    let completedSteps = 0;
    if (sensorStats.length > 0) completedSteps++;
    if (alertSummary.length > 0) completedSteps++;
    if (deviceActivity.length > 0) completedSteps++;
    if (dailyTrend.length > 0) completedSteps++;
    if (sectionStats.length > 0) completedSteps++;
    if (deviceReadings.length > 0) completedSteps++;
    if (summary.total_readings > 0) completedSteps++;
    
    const progress = Math.round((completedSteps / totalSteps) * 100);
    
    // Get all three totals like console logs show
    const sensorTotal = sensorStats.reduce((s, x) => s + x.total_readings, 0);
    const deviceTotal = deviceActivity.reduce((s, x) => s + x.total_readings, 0);
    const actualTotal = summary.total_readings;
    
    // Build message showing all totals
    const parts = [];
    if (sensorTotal > 0) parts.push(`Sensor: ${sensorTotal.toLocaleString()}`);
    if (deviceTotal > 0) parts.push(`Device: ${deviceTotal.toLocaleString()}`);
    if (actualTotal > 0) parts.push(`Total: ${actualTotal.toLocaleString()}`);
    
    const message = parts.length > 0 
      ? `Fetched: ${parts.join(' | ')} readings`
      : 'Fetching data from database...';
    
    return (
      <div className={styles.container}>
        <ReportsLoadingModal
          message={message}
          progress={progress}
        />
      </div>
    );
  }

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
      />

      <ReadingsSummaryTable 
        readings={deviceReadings} 
        totalCount={summary.total_readings} 
        timePeriod={timePeriod}
        onTimePeriodChange={setTimePeriod}
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
