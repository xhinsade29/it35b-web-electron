import { useState } from 'react';
import styles from '../pages/Dashboard.module.css';
import type { SensorReading } from '../types/dashboard.types';

interface ActivityLogsProps {
  logs: SensorReading[];
}

const SENSOR_META: Record<string, { icon: string; label: string; unit: string; min: number; max: number }> = {
  temperature: { icon: '🌡', label: 'Temperature', unit: '°C', min: 20, max: 35 },
  ph_level: { icon: '🧪', label: 'pH Level', unit: 'pH', min: 6.5, max: 8.5 },
  turbidity: { icon: '🌫', label: 'Turbidity', unit: 'NTU', min: 0, max: 50 },
  dissolved_oxygen: { icon: '💧', label: 'Dissolved O₂', unit: 'mg/L', min: 5, max: 14 },
  water_level: { icon: '🌊', label: 'Water Level', unit: 'm', min: 0.5, max: 3.0 },
  sediments: { icon: '🟤', label: 'Sediments', unit: 'mg/L', min: 0, max: 500 },
};

export function ActivityLogs({ logs }: ActivityLogsProps) {
  const [filterSensor, setFilterSensor] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (filterSensor && log.sensor_type !== filterSensor) return false;
    if (filterStatus) {
      const meta = SENSOR_META[log.sensor_type];
      if (meta) {
        const isNormal = log.value >= meta.min && log.value <= meta.max;
        if (filterStatus === 'normal' && !isNormal) return false;
        if (filterStatus === 'warn' && isNormal) return false;
      }
    }
    return true;
  });

  // Group logs by device
  const groupedLogs = filteredLogs.reduce((acc, log) => {
    const key = `${log.device_name}-${log.location_name}`;
    if (!acc[key]) {
      acc[key] = {
        device_name: log.device_name || 'Unknown Device',
        location_name: log.location_name || 'Unknown Location',
        readings: {},
      };
    }
    acc[key].readings[log.sensor_type] = log;
    return acc;
  }, {} as Record<string, { device_name: string; location_name: string; readings: Record<string, SensorReading> }>);

  // Format timestamp
  const formatTime = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          📋 Activity Logs
          <span className={`${styles.tag} ${styles.tagInfo}`} style={{ marginLeft: '8px' }}>
            Latest {logs.length}
          </span>
        </div>
      </div>
      <div className={styles.cardBody}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <select
            className={styles.simSelect}
            value={filterSensor}
            onChange={(e) => setFilterSensor(e.target.value)}
          >
            <option value="">All Sensors</option>
            {Object.entries(SENSOR_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.icon} {meta.label}
              </option>
            ))}
          </select>
          
          <select
            className={styles.simSelect}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="normal">Normal</option>
            <option value="warn">Warning</option>
          </select>
        </div>

        {/* Logs Table */}
        {Object.keys(groupedLogs).length === 0 ? (
          <div className={styles.empty}>No readings match the selected filters.</div>
        ) : (
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {Object.values(groupedLogs).map((group, groupIndex) => {
              const latestTimestamp = Object.values(group.readings)
                .map((r) => r.recorded_at)
                .sort()
                .reverse()[0];

              return (
                <div
                  key={groupIndex}
                  style={{
                    borderBottom: '1px solid rgba(13,17,23,0.07)',
                    marginBottom: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  {/* Group Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px',
                      background: '#f9fafb',
                      borderRadius: '6px',
                      marginBottom: '6px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1117' }}>
                        📡 {group.device_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8897aa' }}>
                        📍 {group.location_name}
                      </div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#8897aa', fontFamily: 'JetBrains Mono, monospace' }}>
                      {formatTime(latestTimestamp)}
                    </div>
                  </div>

                  {/* Sensor Readings */}
                  <table style={{ width: '100%', fontSize: '12px' }}>
                    <tbody>
                      {Object.entries(SENSOR_META).map(([sensorKey, meta]) => {
                        const reading = group.readings[sensorKey];
                        if (!reading) return null;

                        const isGood = reading.value >= meta.min && reading.value <= meta.max;

                        return (
                          <tr
                            key={sensorKey}
                            style={{
                              background: isGood ? 'transparent' : '#fef3c7',
                            }}
                          >
                            <td style={{ padding: '6px 8px', width: '30px', textAlign: 'center' }}>
                              {meta.icon}
                            </td>
                            <td style={{ padding: '6px 8px', color: '#3d4a5c' }}>{meta.label}</td>
                            <td
                              style={{
                                padding: '6px 8px',
                                textAlign: 'right',
                                fontFamily: 'JetBrains Mono, monospace',
                                color: isGood ? '#059669' : '#d97706',
                                fontWeight: 500,
                              }}
                            >
                              {reading.value.toFixed(reading.value % 1 === 0 ? 0 : 1)} {meta.unit}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', width: '80px' }}>
                              {isGood ? (
                                <span className={`${styles.tag} ${styles.tagGood}`}>✓ Normal</span>
                              ) : (
                                <span className={`${styles.tag} ${styles.tagWarn}`}>
                                  ⚠ {reading.value < meta.min ? 'Low' : 'High'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
