/**
 * Activity Timeline Types
 * Based on PHP activitylog.php
 */

export interface TimelineReading {
  type: 'reading';
  timestamp: string;
  device_name: string | null;
  message: string;
  severity: 'info';
  data: {
    reading_id: string;
    value: number;
    recorded_at: string;
    sensor_type: string;
    unit: string;
  };
}

export interface TimelineAlert {
  type: 'alert';
  timestamp: string;
  device_name: string | null;
  message: string;
  severity: 'critical' | 'high' | 'low';
  status: 'active' | 'acknowledged' | 'resolved';
  data: {
    alert_id: string;
    alert_type: string;
    message: string;
    status: string;
    created_at: string;
    acknowledged_at: string | null;
    resolved_at: string | null;
    device_name: string;
    sensor_type: string;
    unit: string;
  };
}

export interface TimelineSystemLog {
  type: 'system' | 'device';
  timestamp: string;
  action: string;
  message: string;
  user: string;
  ip: string | null;
  severity: 'info';
  data: {
    log_id: string;
    action: string;
    details: string;
    ip_address: string | null;
    created_at: string;
    username: string | null;
    full_name: string | null;
  };
}

export type TimelineItem = TimelineReading | TimelineAlert | TimelineSystemLog;

export interface AlertStats {
  active_alerts: number;
  critical_alerts: number;
  high_alerts: number;
  low_alerts: number;
}

export interface ReadingStats {
  total_readings: number;
  active_sensors: number;
  last_reading: string | null;
}

export interface MaintenanceLog {
  maintenance_id: string;
  maintenance_type: string;
  notes: string | null;
  damage_level: 'none' | 'minor' | 'moderate' | 'severe';
  malfunction_type: string | null;
  performed_at: string;
  device_name: string;
  device_id: string;
  operator_name: string;
  user_id: string;
}

export interface ActivityFilterOptions {
  hours: number;
  device_id: string | null;
}

export interface SyncResponse {
  ok: boolean;
  timeline: TimelineItem[];
  alert_stats: AlertStats;
  reading_stats: ReadingStats;
  timestamp: string;
}
