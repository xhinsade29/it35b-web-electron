import { useState } from 'react';
import styles from './Dashboard.module.css';
import { useDashboardSync } from '../hooks/useDashboardSync';
import { useSimulationEngine } from '../hooks/useSimulation';
import type { DeviceReading } from '../types/dashboard.types';
import { RiverBanner } from '../components/RiverBanner';
import { KPICards } from '../components/KPICards';
import { DeviceReadingsPanel } from '../components/DeviceReadings';
import { AlertsPanel } from '../components/AlertsPanel';
import { TrendCharts } from '../components/TrendCharts';
import { WaterConditions } from '../components/WaterConditions';
import { LeafletMap } from '../components/LeafletMap';
import { SimulationControls } from '../components/SimulationControls';
import { ActivityLogs } from '../components/ActivityLogs';

export function DashboardPage() {
  const [{ data, loading, error, lastSync }, { refresh }] = useDashboardSync(10000);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  
  // Get device IDs for simulation
  const deviceIds = data?.devices?.map(d => d.device_id) || [];
  
  const {
    isRunning,
    tickCount,
    alertCount: simAlertCount,
    lastDeviceName,
    logs,
    start,
    stop,
    mode,
    setMode,
    setInterval: setSimInterval
  } = useSimulationEngine(deviceIds);

  // Handle loading state
  if (loading && !data) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.wrap}>
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>⏳</div>
            <p>Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error && !data) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.wrap}>
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>❌</div>
            <p>Error loading dashboard: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Use default data if none available
  const dashboardData = data || {
    ok: true,
    ts: new Date().toISOString(),
    river_status: 'Normal' as const,
    banner_color: '#059669',
    banner_emoji: '✅',
    warn_count: 0,
    alert_count: 0,
    dev_counts: { total: 0, active: 0, offline: 0, maint: 0 },
    device_readings: {},
    devices: [],
    alerts: [],
    logs: [],
    map_locations: [],
    chart_data: {
      temperature: Array(24).fill(null),
      pH: Array(24).fill(null),
      turbidity: Array(24).fill(null),
      dissolved_oxygen: Array(24).fill(null),
      water_level: Array(24).fill(null),
      sediments: Array(24).fill(null),
    },
    device_chart_data: {},
    maintenance: [],
    section_conditions: {
      upstream: {},
      midstream: {},
      downstream: {},
    },
  };

  const deviceReading = selectedDeviceId
    ? (dashboardData.device_readings as Record<string, DeviceReading | null>)[selectedDeviceId] || null
    : null;

  return (
    <div className={styles.dashboard}>
      <div className={styles.wrap}>
        {/* Topbar */}
        <div className={styles.topbar}>
          <div className={styles.topbarBrand}>
            <span className={styles.wordmark}>Aqua-Vision</span>
            <span className={styles.pageName}>Dashboard Overview</span>
          </div>
          <div className={styles.tsLine}>
            {lastSync
              ? `Last sync: ${lastSync.toLocaleTimeString('en-PH', { hour12: false })}`
              : 'Syncing...'}
          </div>
        </div>

        {/* River Status Banner */}
        <RiverBanner
          status={dashboardData.river_status}
          riverName="Mangima River"
          warnCount={dashboardData.warn_count}
          alertCount={dashboardData.alert_count}
          activeDevices={dashboardData.dev_counts.active}
          totalDevices={dashboardData.dev_counts.total}
        />

        {/* KPI Cards */}
        <KPICards
          totalDevices={dashboardData.dev_counts.total}
          activeDevices={dashboardData.dev_counts.active}
          alertCount={dashboardData.alert_count}
          maintenanceCount={dashboardData.dev_counts.maint}
          warnCount={dashboardData.warn_count}
        />

        {/* Main Grid - Device Panel + Alerts/Charts */}
        <div className={styles.gridMain}>
          {/* Left Column - Device Readings */}
          <DeviceReadingsPanel
            devices={dashboardData.devices}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={setSelectedDeviceId}
            deviceReading={deviceReading}
          />

          {/* Right Column - Alerts & Charts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <AlertsPanel
              alerts={dashboardData.alerts}
              alertCount={dashboardData.alert_count}
            />
            <TrendCharts chartData={dashboardData.chart_data} />
          </div>
        </div>

        {/* Bottom Grid - Map, Simulation, Water Conditions, Logs */}
        <div className={styles.gridBottom}>
          <LeafletMap
            locations={dashboardData.map_locations}
            devices={dashboardData.devices}
            onDeviceClick={setSelectedDeviceId}
          />
          <SimulationControls
            devices={dashboardData.devices}
            onStart={start}
            onStop={stop}
            isRunning={isRunning}
            count={tickCount}
            alertCount={simAlertCount}
            lastDevice={lastDeviceName}
            logs={logs.map(l => l.message)}
          />
        </div>

        {/* Water Conditions & Activity Logs */}
        <div className={styles.gridBottom} style={{ marginTop: '16px' }}>
          <WaterConditions
            sectionConditions={dashboardData.section_conditions}
          />
          <ActivityLogs logs={dashboardData.logs} />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
