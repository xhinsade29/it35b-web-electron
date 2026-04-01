import type { SensorReading, DeviceReading, LogGroup, SectionConditions } from '../types/dashboard.types';

// =====================================================
// Data Transformation Utilities
// Converted from PHP helper functions
// =====================================================

// Sensor metadata matching PHP SENSOR_META
export const SENSOR_META: Record<string, { icon: string; label: string; unit: string; min: number; max: number }> = {
  temperature: { icon: '🌡', label: 'Temperature', unit: '°C', min: 20, max: 35 },
  ph_level: { icon: '🧪', label: 'pH Level', unit: 'pH', min: 6.5, max: 8.5 },
  turbidity: { icon: '🌫', label: 'Turbidity', unit: 'NTU', min: 0, max: 50 },
  dissolved_oxygen: { icon: '💧', label: 'Dissolved O₂', unit: 'mg/L', min: 5, max: 14 },
  water_level: { icon: '🌊', label: 'Water Level', unit: 'm', min: 0.5, max: 3.0 },
  sediments: { icon: '🟤', label: 'Sediments', unit: 'mg/L', min: 0, max: 500 }
};

// PHP mapping fix: pH in chart data maps to ph_level
export const SENSOR_TYPE_MAP: Record<string, string> = {
  pH: 'ph_level',
  ph_level: 'ph_level',
  temperature: 'temperature',
  turbidity: 'turbidity',
  dissolved_oxygen: 'dissolved_oxygen',
  water_level: 'water_level',
  sediments: 'sediments'
};

// Section metadata matching PHP SEC_META
export const SECTION_META: Record<string, { label: string; color: string; bg: string; tag: string }> = {
  upstream: { label: 'Upstream', color: '#059669', bg: '#d1fae5', tag: 'tag-up' },
  midstream: { label: 'Midstream', color: '#d97706', bg: '#fef3c7', tag: 'tag-mid' },
  downstream: { label: 'Downstream', color: '#dc2626', bg: '#fee2e2', tag: 'tag-down' }
};

// Status color mapping
export const STATUS_COLORS: Record<string, { color: string; label: string }> = {
  active: { color: '#059669', label: 'Active' },
  maintenance: { color: '#3b82f6', label: 'Maintenance' },
  inactive: { color: '#dc2626', label: 'Offline' },
  offline: { color: '#9ca3af', label: 'Offline' },
  normal: { color: '#059669', label: 'Normal' },
  warning: { color: '#d97706', label: 'Warning' },
  critical: { color: '#dc2626', label: 'Critical' }
};

// Maintenance type icons
export const MAINTENANCE_ICONS: Record<string, string> = {
  calibration: '📐',
  repair: '🔧',
  cleaning: '🧹',
  inspection: '🔍',
  replacement: '🔄',
  malfunction_fix: '🛠️'
};

// =====================================================
// Reading Transformations (from PHP: av_overview_last_readings, buildLogGroups)
// =====================================================

/**
 * Group sensor readings by device (like PHP buildLogGroups)
 */
export function buildLogGroups(readings: SensorReading[]): LogGroup[] {
  const groups: Record<string, LogGroup> = {};

  readings.forEach(reading => {
    const deviceName = reading.device_name || 'Unknown';
    const locationName = reading.location_name || 'Unknown';
    const key = `${deviceName}||${locationName}`;
    
    if (!groups[key]) {
      groups[key] = {
        device_id: reading.device_id,
        device_name: deviceName,
        location_name: locationName,
        river_section: reading.river_section,
        readings: {}
      };
    }

    // Keep the latest reading for each sensor type
    const existing = groups[key].readings[reading.sensor_type];
    if (!existing || reading.recorded_at > existing.recorded_at) {
      groups[key].readings[reading.sensor_type] = reading;
    }
  });

  return Object.values(groups);
}

/**
 * Format a sensor reading value with unit
 */
export function formatReadingValue(value: number | null, unit: string): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)} ${unit}`;
}

/**
 * Get sensor icon for a type
 */
export function getSensorIcon(sensorType: string): string {
  return SENSOR_META[sensorType]?.icon || '📊';
}

/**
 * Get sensor display label
 */
export function getSensorLabel(sensorType: string): string {
  return SENSOR_META[sensorType]?.label || sensorType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// =====================================================
// Status Calculations (from PHP: av_overview_calculate_device_status)
// =====================================================

/**
 * Calculate device status based on readings
 * Returns: 'normal', 'warning', or 'critical'
 */
export function calculateDeviceStatus(readings: DeviceReading | null): string {
  if (!readings) return 'offline';

  let warnCount = 0;
  let totalChecks = 0;

  Object.entries(SENSOR_META).forEach(([sensorType, meta]) => {
    const value = readings[sensorType as keyof DeviceReading] as number | null;
    if (value !== null && value !== undefined) {
      if (value < meta.min || value > meta.max) {
        warnCount++;
      }
      totalChecks++;
    }
  });

  if (totalChecks === 0) return 'offline';

  const warnRatio = warnCount / totalChecks;

  if (warnRatio >= 0.5) return 'critical';
  if (warnRatio >= 0.2) return 'warning';
  return 'normal';
}

/**
 * Calculate river section status
 */
export function calculateSectionStatus(conditions: SectionConditions | null): string {
  if (!conditions) return 'offline';

  let outOfRange = 0;

  Object.entries(SENSOR_META).forEach(([sensorType, meta]) => {
    const value = conditions[sensorType as keyof typeof conditions] as number | null;
    if (value !== null && value !== undefined) {
      if (value < meta.min || value > meta.max) {
        outOfRange++;
      }
    }
  });

  if (outOfRange === 0) return 'Normal';
  if (outOfRange <= 1) return 'Moderate';
  return 'Critical';
}

/**
 * Get status tag class based on status
 */
export function getStatusTagClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'normal':
    case 'active':
      return 'tag-good';
    case 'moderate':
    case 'warning':
      return 'tag-warn';
    case 'critical':
      return 'tag-crit';
    case 'offline':
    case 'inactive':
      return 'tag-mute';
    default:
      return 'tag-info';
  }
}

// =====================================================
// Time Formatting (from PHP: av_overview_time_ago)
// =====================================================

/**
 * Format time as "X minutes/hours/days ago"
 */
export function timeAgo(dateString: string | null): string {
  if (!dateString) return '—';

  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  const days = Math.floor(diff / 86400);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/**
 * Format date for display
 */
export function formatDateTime(dateString: string | null): string {
  if (!dateString) return '—';
  
  const date = new Date(dateString);
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Format time only
 */
export function formatTime(dateString: string | null): string {
  if (!dateString) return '—';
  
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

// =====================================================
// Alert Generation (from PHP: av_overview_generate_alerts_from_readings)
// =====================================================

export interface GeneratedAlert {
  device_name: string;
  location_name: string;
  sensor_type: string;
  alert_type: 'low' | 'high' | 'critical';
  severity: 'critical' | 'warning';
  message: string;
  value: number;
  unit: string;
  created_at: string;
}

/**
 * Generate alerts from out-of-range readings
 */
export function generateAlertsFromReadings(readings: SensorReading[]): GeneratedAlert[] {
  const alerts: GeneratedAlert[] = [];

  readings.forEach(reading => {
    const meta = SENSOR_META[reading.sensor_type];
    if (!meta) return;

    const value = reading.value;
    const { min, max, label, unit } = meta;

    if (value < min || value > max) {
      const alertType: 'low' | 'high' = value > max ? 'high' : 'low';
      const severity: 'critical' | 'warning' = 
        (value < min * 0.5 || value > max * 1.5) ? 'critical' : 'warning';

      const message = value > max
        ? `${label} too high: ${value} (max: ${max})`
        : `${label} too low: ${value} (min: ${min})`;

      alerts.push({
        device_name: reading.device_name || 'Unknown',
        location_name: reading.location_name || 'Unknown',
        sensor_type: reading.sensor_type,
        alert_type: alertType,
        severity,
        message,
        value,
        unit,
        created_at: reading.recorded_at
      });
    }
  });

  // Sort by severity (critical first) then by time
  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1 };
    if (a.severity !== b.severity) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }).slice(0, 10); // Return top 10
}

// =====================================================
// Chart Data Transformations
// =====================================================

/**
 * Transform chart data to Recharts format
 */
export function transformChartDataForRecharts(
  data: (number | null)[]
): Array<{ hour: string; value: number | null }> {
  return data.map((value, hour) => ({
    hour: `${hour.toString().padStart(2, '0')}:00`,
    value
  }));
}

/**
 * Get color for chart based on sensor type
 */
export function getChartColor(sensorType: string): string {
  const colors: Record<string, string> = {
    temperature: '#f59e0b',
    ph_level: '#3b82f6',
    turbidity: '#6b7280',
    dissolved_oxygen: '#06b6d4',
    water_level: '#1a56db',
    sediments: '#8b5cf6'
  };
  return colors[sensorType] || '#3b82f6';
}

// =====================================================
// Filter Helpers
// =====================================================

export interface LogFilter {
  device?: string;
  sensor?: string;
  status?: 'normal' | 'warn';
}

/**
 * Filter log groups based on criteria
 */
export function filterLogGroups(groups: LogGroup[], filter: LogFilter): LogGroup[] {
  return groups.filter(group => {
    // Filter by device
    if (filter.device && group.device_id !== filter.device) {
      return false;
    }

    // Filter by sensor type - check if group has that sensor reading
    if (filter.sensor) {
      const sensorKey = SENSOR_TYPE_MAP[filter.sensor] || filter.sensor;
      if (!group.readings[sensorKey]) {
        return false;
      }
    }

    // Filter by status - check if readings match status
    if (filter.status) {
      const readings = Object.values(group.readings) as SensorReading[];
      const hasMatchingStatus = readings.some((reading: SensorReading) => {
        const meta = SENSOR_META[reading.sensor_type];
        if (!meta) return false;
        const isNormal = reading.value >= meta.min && reading.value <= meta.max;
        return filter.status === 'normal' ? isNormal : !isNormal;
      });
      if (!hasMatchingStatus) return false;
    }

    return true;
  });
}
