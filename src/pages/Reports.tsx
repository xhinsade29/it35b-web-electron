import { useReports } from '../hooks/useReports';
import { useDashboardSync } from '../hooks/useDashboardSync';
import { ReportStats } from '../components/ReportStats';
import { ReportFilters } from '../components/ReportFilters';
import { ReportCharts } from '../components/ReportCharts';
import { AlertSummaryTable } from '../components/AlertSummaryTable';
import { DeviceActivityTable } from '../components/DeviceActivityTable';
import { RiverSectionTable } from '../components/RiverSectionTable';
import { SensorStatsTable } from '../components/SensorStatsTable';
import { ThresholdCharts } from '../components/ThresholdCharts';
import styles from './Reports.module.css';

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
    summary,
    loading,
    error,
    filterOptions,
    setFilterOptions,
    refresh,
    exportCSV,
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

  const handleExport = () => {
    const csvContent = exportCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aqua-vision-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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

      <ReportFilters
        filterOptions={filterOptions}
        devices={devices}
        onFilterChange={setFilterOptions}
        onReset={handleResetFilters}
        onExport={handleExport}
      />

      <ReportCharts dailyTrend={dailyTrend} sensorStats={sensorStats} />

      <AlertSummaryTable alerts={alertSummary} days={filterOptions.days} />

      <DeviceActivityTable devices={deviceActivity} days={filterOptions.days} />

      <RiverSectionTable sections={sectionStats} />

      <SensorStatsTable stats={sensorStats} days={filterOptions.days} />
    </div>
  );
}
