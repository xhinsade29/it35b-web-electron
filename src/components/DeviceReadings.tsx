import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import styles from '../pages/Dashboard.module.css';
import type { DeviceInfo, DeviceReading, ChartData } from '../types/dashboard.types';

interface DeviceReadingsPanelProps {
  devices: DeviceInfo[];
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string) => void;
  deviceReading: DeviceReading | null;
  deviceChartData?: Record<string, ChartData>;
}

const SENSOR_META = [
  { key: 'temperature', icon: '🌡', label: 'Temperature', unit: '°C', min: 20, max: 35 },
  { key: 'ph_level', icon: '🧪', label: 'pH Level', unit: 'pH', min: 6.5, max: 8.5 },
  { key: 'turbidity', icon: '🌫', label: 'Turbidity', unit: 'NTU', min: 0, max: 50 },
  { key: 'dissolved_oxygen', icon: '💧', label: 'Dissolved O₂', unit: 'mg/L', min: 5, max: 14 },
  { key: 'water_level', icon: '🌊', label: 'Water Level', unit: 'm', min: 0.5, max: 3.0 },
  { key: 'sediments', icon: '🟤', label: 'Sediments', unit: 'mg/L', min: 0, max: 500 },
];

const SECT_TAG: Record<string, string> = {
  upstream: 'tag-up',
  midstream: 'tag-mid',
  downstream: 'tag-down',
};

const SECT_LBL: Record<string, string> = {
  upstream: 'Upstream',
  midstream: 'Midstream',
  downstream: 'Downstream',
};

export function DeviceReadingsPanel({
  devices,
  selectedDeviceId,
  onSelectDevice,
  deviceReading,
  deviceChartData,
}: DeviceReadingsPanelProps) {
  const selectedDevice = devices.find(d => d.device_id === selectedDeviceId);
  const chartData = selectedDeviceId ? deviceChartData?.[selectedDeviceId] : null;

  // Transform chart data for each sensor
  const getSensorChartData = (sensorKey: string) => {
    if (!chartData) return [];
    const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    const key = sensorKey === 'ph_level' ? 'pH' : sensorKey;
    return hours.map((hour, index) => ({
      hour,
      value: chartData[key as keyof ChartData]?.[index] ?? null,
    })).filter(d => d.value !== null);
  };

  // Format timestamp
  const formatTimestamp = (ts?: string) => {
    if (!ts) return '--:--';
    const date = new Date(ts);
    return date.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: '#059669',
      maintenance: '#3b82f6',
      inactive: '#dc2626',
      offline: '#9ca3af',
    };
    return colors[status] || '#9ca3af';
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>📡 Device Readings</div>
      </div>
      <div className={styles.cardBody}>
        {/* Device Selector */}
        <select
          className={styles.deviceSelector}
          value={selectedDeviceId || ''}
          onChange={(e) => onSelectDevice(e.target.value)}
        >
          <option value="">Select a device...</option>
          {devices.map((device) => (
            <option key={device.device_id} value={device.device_id}>
              {device.device_name} — {device.location_name}
            </option>
          ))}
        </select>

        {/* Device Display */}
        {selectedDevice ? (
          <div className={styles.deviceDisplay}>
            {/* Header */}
            <div className={styles.devHeader}>
              <div>
                <div className={styles.devName}>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: getStatusColor(selectedDevice.status),
                      display: 'inline-block',
                    }}
                  />
                  {selectedDevice.device_name}
                </div>
                <div className={styles.devLoc}>
                  📍 {selectedDevice.location_name}
                  {selectedDevice.river_section && ` — ${SECT_LBL[selectedDevice.river_section]}`}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span className={`${styles.tag} ${styles[SECT_TAG[selectedDevice.river_section]] || styles.tagInfo}`}>
                  {SECT_LBL[selectedDevice.river_section] || selectedDevice.river_section}
                </span>
                {deviceReading?.recorded_at && (
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '10px',
                      color: '#8897aa',
                      marginTop: '4px',
                    }}
                  >
                    {formatTimestamp(deviceReading.recorded_at)}
                  </div>
                )}
              </div>
            </div>

            {/* Two Column Layout: Sensor Rows | Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Left Column - Sensor Rows */}
              <div>
                {SENSOR_META.map((sensor) => {
                  const value = deviceReading?.[sensor.key as keyof DeviceReading] as number | undefined;
                  const hasValue = value !== null && value !== undefined;
                  const isGood = hasValue ? value >= sensor.min && value <= sensor.max : null;

                  return (
                    <div
                      key={sensor.key}
                      className={`${styles.sensorRow} ${isGood === false ? styles.sensorRowOut : ''}`}
                    >
                      <div className={styles.sensorIcon}>{sensor.icon}</div>
                      <div className={styles.sensorLabel}>
                        <div className={styles.sensorName}>{sensor.label}</div>
                        <div className={styles.sensorRange}>
                          Safe {sensor.min} – {sensor.max} {sensor.unit}
                        </div>
                      </div>
                      <div
                        className={styles.sensorVal}
                        style={{
                          color: isGood === true ? '#059669' : isGood === false ? '#d97706' : '#8897aa',
                        }}
                      >
                        {hasValue ? value.toFixed(value % 1 === 0 ? 0 : 1) : '—'}
                        {hasValue && <span className={styles.sensorUnit}>{sensor.unit}</span>}
                      </div>
                      <div className={styles.sensorStatus}>
                        {isGood === true ? (
                          <span className={`${styles.tag} ${styles.tagGood}`}>✓ Normal</span>
                        ) : isGood === false ? (
                          <span className={`${styles.tag} ${styles.tagWarn}`}>
                            ⚠ {value! < sensor.min ? 'Low' : 'High'}
                          </span>
                        ) : (
                          <span className={`${styles.tag} ${styles.tagMute}`}>— No data</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column - Individual Sensor Charts */}
              {selectedDevice && chartData && (
                <div style={{ padding: '8px', borderLeft: '1px solid rgba(13,17,23,0.07)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#0d1117', marginBottom: '8px' }}>
                    📊 Sensor Trends with Thresholds
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {SENSOR_META.map((sensor) => {
                      const data = getSensorChartData(sensor.key);
                      const hasData = data.length > 0;
                      const color = sensor.key === 'temperature' ? '#dc2626' : 
                                    sensor.key === 'ph_level' ? '#7c3aed' :
                                    sensor.key === 'turbidity' ? '#059669' :
                                    sensor.key === 'dissolved_oxygen' ? '#0891b2' :
                                    sensor.key === 'water_level' ? '#2563eb' : '#a16207';
                      
                      return (
                        <div key={sensor.key} style={{ border: '1px solid rgba(13,17,23,0.1)', borderRadius: '8px', padding: '6px' }}>
                          <div style={{ fontSize: '9px', fontWeight: 600, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span>{sensor.icon}</span>
                            <span>{sensor.label}</span>
                          </div>
                          {hasData ? (
                            <ResponsiveContainer width="100%" height={60}>
                              <LineChart data={data} margin={{ top: 3, right: 3, left: -15, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(13, 17, 23, 0.05)" />
                                <XAxis dataKey="hour" tick={{ fontSize: 6, fill: '#8897aa' }} axisLine={false} tickLine={false} interval={5} />
                                <YAxis tick={{ fontSize: 6, fill: '#8897aa' }} axisLine={false} tickLine={false} domain={[sensor.min - (sensor.max - sensor.min) * 0.2, sensor.max + (sensor.max - sensor.min) * 0.2]} />
                                <Tooltip 
                                  contentStyle={{ background: 'rgba(13, 17, 23, 0.9)', border: 'none', borderRadius: '4px', fontSize: '8px', color: '#fff', padding: '3px' }}
                                  itemStyle={{ fontSize: '8px' }}
                                />
                                <ReferenceLine y={sensor.min} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1} />
                                <ReferenceLine y={sensor.max} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1} />
                                <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} connectNulls />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '10px' }}>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '14px', marginBottom: '2px' }}>📊</div>
                                <div>No data</div>
                              </div>
                            </div>
                          )}
                          <div style={{ fontSize: '7px', color: '#8897aa', textAlign: 'center', marginTop: '1px' }}>
                            Safe: {sensor.min} – {sensor.max}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📡</div>
            <p>Select a device to view real-time sensor readings</p>
          </div>
        )}
      </div>
    </div>
  );
}
