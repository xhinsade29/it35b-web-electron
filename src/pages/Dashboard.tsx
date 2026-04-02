import { useState, useCallback } from 'react';
import styles from '../assets/styles/Dashboard.module.css';
import { useDashboardSync } from '../hooks/useDashboardSync';
import { useSimulationEngine } from '../hooks/useSimulation';
import type { DeviceReading, TimeSeriesChartData } from '../types/dashboard.types';
import { RiverBanner } from '../components/RiverBanner';
import { KPICards } from '../components/KPICards';
import { DeviceReadingsPanel } from '../components/DeviceReadings';
import { DeviceReadingsChart } from '../components/DeviceReadingsChart';
import { AlertsPanel } from '../components/AlertsPanel';
import { TrendCharts } from '../components/TrendCharts';
import { WaterConditions } from '../components/WaterConditions';
import { LeafletMap } from '../components/LeafletMap';
import { SystemActivityLogs } from '../components/SystemActivityLogs';

export function DashboardPage() {
  const [{ data, loading, error, lastSync }] = useDashboardSync(10000);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  
  // Get device IDs for simulation - ensure devices is always an array
  const deviceIds = Array.isArray(data?.devices) ? data.devices.map(d => d.device_id) : [];
  
  // Simulation interval state - declare BEFORE useSimulationEngine
  const [simInterval, setSimInterval] = useState(10000);
  
  const {
    isRunning,
    tickCount,
    alertCount: simAlertCount,
    lastDeviceName,
    logs: simulationLogs,
    start,
    stop
  } = useSimulationEngine(deviceIds);
  
  // handleStart declared AFTER start is available
  const handleStart = useCallback(() => {
    start('normal', simInterval);
  }, [start, simInterval]);

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

        {/* Full Width Map */}
        <div className={styles.card} style={{ marginBottom: '16px' }}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>📍 Monitoring Locations — Active Devices</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`${styles.tag} ${isRunning ? styles.tagGood : styles.tagMute}`}>
                ● {isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
          </div>
          <div>
            <LeafletMap
              devices={dashboardData.devices}
              onDeviceClick={setSelectedDeviceId}
            />
            <div className={styles.mapLegend}>
              <div className={styles.leg}>
                <span className={styles.legDot} style={{ background: '#059669' }}></span>
                Upstream
              </div>
              <div className={styles.leg}>
                <span className={styles.legDot} style={{ background: '#d97706' }}></span>
                Midstream
              </div>
              <div className={styles.leg}>
                <span className={styles.legDot} style={{ background: '#dc2626' }}></span>
                Downstream
              </div>
            </div>
          </div>
        </div>

        {/* Simulation & Stacked Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
          {/* Simulation Controls */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>⚙️ Simulation Control</div>
            </div>
            <div className={styles.cardBody} style={{ padding: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div style={{ background: '#f9fafb', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#8897aa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Readings</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.5rem', fontWeight: 500, color: '#7c3aed', marginTop: '4px' }}>{tickCount}</div>
                </div>
                <div style={{ background: '#f9fafb', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#8897aa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Alerts</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.5rem', fontWeight: 500, color: simAlertCount > 0 ? '#dc2626' : '#059669', marginTop: '4px' }}>{simAlertCount}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <select
                  className={styles.simSelect}
                  value={simInterval}
                  onChange={(e) => setSimInterval(Number(e.target.value))}
                  disabled={isRunning}
                  style={{ flex: 1 }}
                >
                  <option value={5000}>5 s</option>
                  <option value={10000}>10 s</option>
                  <option value={30000}>30 s</option>
                  <option value={60000}>1 min</option>
                </select>
                <button
                  className={styles.btnPrimary}
                  onClick={handleStart}
                  disabled={isRunning || dashboardData.devices.length === 0}
                  style={{ height: '30px', padding: '0 14px', fontSize: '11px', fontWeight: 600 }}
                >
                  ▶ Start
                </button>
                <button
                  className={styles.btnOutline}
                  type="button"
                  onClick={() => { console.log('Stop clicked, isRunning:', isRunning); stop(); }}
                  disabled={!isRunning}
                  style={{ height: '30px', padding: '0 14px', fontSize: '11px', fontWeight: 600, opacity: isRunning ? 1 : 0.45, cursor: isRunning ? 'pointer' : 'not-allowed' }}
                >
                  ■ Stop
                </button>
              </div>
              <div style={{ background: '#f9fafb', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#8897aa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last Device</div>
                <div style={{ fontSize: '11px', color: '#3d4a5c', fontFamily: 'JetBrains Mono, monospace', marginTop: '4px' }}>
                  {lastDeviceName || '—'}
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '120px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#8897aa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Simulation Log</div>
                <div 
                  className={styles.simLog}
                  ref={(el) => {
                    if (el) el.scrollTop = el.scrollHeight;
                  }}
                  style={{ maxHeight: '150px' }}
                >
                  <div style={{ color: '#9ca3af', fontStyle: 'italic', marginBottom: '8px' }}>Press ▶ Start to begin simulation</div>
                  {simulationLogs.map((log, index) => (
                    <div key={log.id || index} style={{ color: log.type === 'error' ? '#dc2626' : log.type === 'alert' ? '#d97706' : '#3d4a5c', padding: '2px 0', fontSize: '11px' }}>
                      [{new Date(log.timestamp).toLocaleTimeString('en-PH', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}] {log.message}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stacked Device Charts */}
          <DeviceReadingsChart 
            devices={dashboardData.devices}
            deviceChartData={dashboardData.device_chart_data as Record<string, TimeSeriesChartData>}
          />
        </div>

        {/* Water Conditions by Section */}
        <div style={{ marginBottom: '16px' }}>
          <WaterConditions sectionConditions={dashboardData.section_conditions} />
        </div>

        {/* Device Readings */}
        <div style={{ marginBottom: '16px' }}>
          <DeviceReadingsPanel
            devices={dashboardData.devices}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={setSelectedDeviceId}
            deviceReading={deviceReading}
            deviceChartData={dashboardData.device_chart_data as Record<string, TimeSeriesChartData>}
          />
        </div>

        {/* Alerts & Trends Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <AlertsPanel alerts={dashboardData.alerts} alertCount={dashboardData.alert_count} />
          <TrendCharts chartData={dashboardData.chart_data} />
        </div>

        {/* System Activity Logs - Full Width */}
        <div style={{ marginBottom: '16px' }}>
          <SystemActivityLogs 
            simulationLogs={simulationLogs}
            alerts={dashboardData.alerts}
          />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
