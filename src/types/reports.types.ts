/**
 * Reports & Analytics Types
 * Based on PHP reports.php
 */

export interface SensorStats {
  sensor_type: string;
  total_readings: number;
  avg_value: number;
  min_value: number;
  max_value: number;
  std_dev: number | null;
}

export interface AlertSummary {
  alert_type: string;
  total_alerts: number;
  active_alerts: number;
  resolved_alerts: number;
  acknowledged_alerts: number;
}

export interface DeviceActivity {
  device_name: string;
  device_id: string;
  status: string;
  total_readings: number;
  last_reading: string | null;
  active_days: number;
}

export interface DailyTrend {
  reading_date: string;
  total_readings: number;
}

export interface SectionStats {
  river_section: string;
  device_count: number;
  total_readings: number;
  avg_temp: number | null;
  avg_ph: number | null;
  avg_turbidity: number | null;
}

export interface DeviceReading {
  reading_id: string;
  value: number;
  recorded_at: string;
  sensor_type: string;
  unit: string;
  device_name: string;
}

export interface ReportFilterOptions {
  days: number;
  device_id: string | null;
  sensor: string | null;
  section: string | null;
  status: string | null;
}

export interface ReportSummary {
  total_readings: number;
  active_devices: number;
  total_devices: number;
  total_alerts: number;
  sensor_type_count: number;
}
