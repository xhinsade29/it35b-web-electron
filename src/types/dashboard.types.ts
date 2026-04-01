// Dashboard Types - Based on PHP API responses

// Sensor Reading
export interface SensorReading {
  sensor_id?: string;
  sensor_type: string;
  value: number;
  unit: string;
  recorded_at: string;
  min_threshold?: number;
  max_threshold?: number;
  device_id?: string;
  device_name?: string;
  location_name?: string;
  river_section?: string;
}

// Device Info
export interface DeviceInfo {
  device_id: string;
  device_name: string;
  location_id?: string;
  location_name: string;
  river_section: 'upstream' | 'midstream' | 'downstream';
  status: 'active' | 'inactive' | 'maintenance' | 'offline' | 'unassigned';
  last_active?: string;
}

// Device Reading with all sensors
export interface DeviceReading {
  recorded_at?: string;
  temperature?: number;
  ph_level?: number;
  turbidity?: number;
  dissolved_oxygen?: number;
  water_level?: number;
  sediments?: number;
}

// Alert
export interface Alert {
  alert_id: string;
  alert_type: 'low' | 'high' | 'critical';
  message: string;
  created_at: string;
  device_name: string;
  location_name: string;
  sensor_type: string;
  value?: number;
  unit?: string;
  status?: 'active' | 'acknowledged' | 'resolved';
}

// Maintenance Log
export interface MaintenanceLog {
  maintenance_id?: string;
  maintenance_type: 'calibration' | 'repair' | 'replacement' | 'cleaning' | 'inspection' | 'malfunction_fix';
  notes: string;
  performed_at: string;
  device_name: string;
  full_name: string;
}

// Location with device counts
export interface MapLocation {
  location_id: string;
  location_name: string;
  river_section: 'upstream' | 'midstream' | 'downstream';
  latitude: number;
  longitude: number;
  total_devices: number;
  active_devices: number;
  maint_devices: number;
  device_id?: string;
}

// Chart Data (24 hour trend)
export interface ChartData {
  temperature: (number | null)[];
  pH: (number | null)[];
  turbidity: (number | null)[];
  dissolved_oxygen: (number | null)[];
  water_level: (number | null)[];
  sediments: (number | null)[];
}

// Section Conditions
export interface SectionConditions {
  temperature?: number | null;
  ph_level?: number | null;
  turbidity?: number | null;
  dissolved_oxygen?: number | null;
  water_level?: number | null;
  sediments?: number | null;
}

// Dashboard Sync Response
export interface DashboardSyncData {
  ok: boolean;
  ts: string;
  river_status: 'Normal' | 'Moderate' | 'Critical';
  banner_color: string;
  banner_emoji: string;
  warn_count: number;
  alert_count: number;
  dev_counts: {
    total: number;
    active: number;
    offline: number;
    maint: number;
  };
  device_readings: Record<string, DeviceReading | null>;
  devices: DeviceInfo[];
  alerts: Alert[];
  logs: SensorReading[];
  map_locations: MapLocation[];
  chart_data: ChartData;
  device_chart_data: Record<string, ChartData>;
  maintenance: MaintenanceLog[];
  section_conditions: Record<'upstream' | 'midstream' | 'downstream', SectionConditions>;
}

// Simulation Response
export interface SimulationResponse {
  success: boolean;
  reading_id: number;
  device_id: string;
  device_name: string;
  river_section: string;
  readings: Record<string, {
    value: number;
    unit: string;
    reading_id: number;
  }>;
  alerts_created: {
    type: string;
    message: string;
    sensor_type: string;
    value: number;
  }[];
  timestamp: string;
  sync?: DashboardSyncData;
}

// Monitor State
export interface MonitorState {
  running: boolean;
  mode: 'normal' | 'flood' | 'pollution' | 'drought';
  device_id: number;
  interval: number;
  started_at?: string;
  started_by?: string;
}

// Sensor Meta
export interface SensorMeta {
  key: string;
  icon: string;
  label: string;
  unit: string;
  min: number;
  max: number;
}

// Log Group (for grouped sensor readings by device)
export interface LogGroup {
  device_id?: string;
  device_name: string;
  location_name: string;
  river_section?: string;
  readings: Record<string, SensorReading>;
}
