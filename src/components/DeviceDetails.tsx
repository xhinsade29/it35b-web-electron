/**
 * Device Details Panel
 * Shows device info, sensor readings, and activity history
 * Migrated from PHP device.php
 */

import { useDeviceReadings } from '../hooks/useDevices';
import type { Device } from '../types/device.types';
import styles from './DeviceDetails.module.css';

interface DeviceDetailsProps {
  device: Device;
  onEdit?: (device: Device) => void;
}

const SENSOR_CONFIG = [
  { key: 'temperature', label: '🌡️ Temperature', unit: '°C', format: (v: number) => v?.toFixed(1) },
  { key: 'ph_level', label: '🧪 pH Level', unit: '', format: (v: number) => v?.toFixed(2) },
  { key: 'turbidity', label: '🌫️ Turbidity', unit: 'NTU', format: (v: number) => v?.toFixed(1) },
  { key: 'dissolved_oxygen', label: '💧 Dissolved O₂', unit: 'mg/L', format: (v: number) => v?.toFixed(1) },
  { key: 'water_level', label: '🌊 Water Level', unit: 'm', format: (v: number) => v?.toFixed(2) },
  { key: 'sediments', label: '🟤 Sediments', unit: 'mg/L', format: (v: number) => v?.toFixed(0) },
];

export function DeviceDetails({ device, onEdit }: DeviceDetailsProps) {
  const { readings, loading: readingsLoading } = useDeviceReadings(device.device_id);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string, condition?: string) => {
    if (condition && condition !== 'normal') {
      const colors: Record<string, string> = {
        displaced: '#7c3aed',
        damaged: '#1f2937',
        malfunctioning: '#d97706',
      };
      return colors[condition] || '#9ca3af';
    }
    const colors: Record<string, string> = {
      active: '#059669',
      maintenance: '#3b82f6',
      inactive: '#dc2626',
      offline: '#6b7280',
      unassigned: '#9ca3af',
    };
    return colors[status] || '#9ca3af';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>📊 Device Information</h3>
        {onEdit && (
          <button className={styles.editBtn} onClick={() => onEdit(device)}>
            ✏️ Edit
          </button>
        )}
      </div>

      <div className={styles.content}>
        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: getStatusColor(device.status, device.device_condition) }}>
              ID #{device.device_id.slice(0, 8)}
            </div>
            <div className={styles.statLabel}>Device ID</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: getStatusColor(device.status) }}>
              {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
            </div>
            <div className={styles.statLabel}>Current Status</div>
          </div>
        </div>

        {/* Info Section */}
        <div className={styles.infoSection}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Current Location</span>
            <span className={styles.infoValue}>
              {device.location_name || <span className={styles.unassigned}>Unassigned</span>}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Last Active</span>
            <span className={styles.infoValue}>{formatDate(device.last_active)}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Coordinates</span>
            <span className={styles.infoValue}>
              {device.latitude && device.longitude ? (
                <span className={styles.coords}>
                  {device.latitude.toFixed(5)}°N, {device.longitude.toFixed(5)}°E
                </span>
              ) : (
                <span className={styles.unassigned}>Not set</span>
              )}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Last Updated</span>
            <span className={styles.infoValue}>{formatDate(device.updated_at)}</span>
          </div>
        </div>

        {/* Condition Badge */}
        {device.device_condition !== 'normal' && (
          <div className={`${styles.conditionBadge} ${styles.conditionWarning}`}>
            ⚠️ Device is {device.device_condition}
          </div>
        )}

        {/* Sensor Readings */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Last Sensor Readings</h4>
          <div className={styles.readingsGrid}>
            {readingsLoading ? (
              <div className={styles.loading}>Loading readings...</div>
            ) : !readings || Object.values(readings).every(v => v === null || v === undefined) ? (
              <div className={styles.noReadings}>
                <p>No sensor readings available</p>
                <small>Device may not have sensors configured or no data has been recorded yet.</small>
              </div>
            ) : (
              SENSOR_CONFIG.map((sensor) => {
                const value = readings?.[sensor.key as keyof typeof readings];
                return (
                  <div key={sensor.key} className={styles.readingItem}>
                    <span className={styles.readingLabel}>{sensor.label}</span>
                    <span className={styles.readingValue}>
                      {value !== null && value !== undefined
                        ? sensor.format(value) + sensor.unit
                        : '--' + sensor.unit}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
