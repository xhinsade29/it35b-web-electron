import { useReports } from '../hooks/useReports';
import { useDashboardSync } from '../hooks/useDashboardSync';
import { ThresholdCharts } from './ThresholdCharts';
import { ReportFilters } from '../components/ReportFilters';
import { ReportCharts } from '../components/ReportCharts';
import { AlertSummaryTable } from '../components/AlertSummaryTable';
import { DeviceActivityTable } from '../components/DeviceActivityTable';
import { RiverSectionTable } from '../components/RiverSectionTable';
import { SensorStatsTable } from '../components/SensorStatsTable';
import styles from '../assets/styles/Reports.module.css';

export function ReportsPage() {
  const [syncState] = useDashboardSync(30000);
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
    devices,
    loading,
    error,
    filterOptions,
    setFilterOptions,
    refresh,
  } = useReports();

  const handleResetFilters = () => {
    setFilterOptions({
      days: 7,
      device_id: null,
      sensor: null,
      section: null,
      status: null,
    });
  };

  if (loading && !sensorStats.length) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading reports data...</div>
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

      <ThresholdCharts sectionConditions={sectionConditions} />

      <div style={{ marginTop: '24px' }}>
        <ReportFilters
          filterOptions={filterOptions}
          devices={devices}
          onFilterChange={setFilterOptions}
          onReset={handleResetFilters}
        />
      </div>

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
