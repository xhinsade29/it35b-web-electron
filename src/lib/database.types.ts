// Aqua-Vision Database Types for Supabase
// Generated from MySQL schema migration

// Enums
export type UserRole = 'admin' | 'operator' | 'viewer' | 'researcher'
export type RiverSection = 'upstream' | 'midstream' | 'downstream'
export type LocationType = 'start' | 'end'
export type DeviceStatus = 'active' | 'inactive' | 'maintenance' | 'offline' | 'unassigned'
export type DeviceCondition = 'normal' | 'displaced' | 'damaged' | 'malfunctioning'
export type SensorType = 'temperature' | 'ph_level' | 'turbidity' | 'dissolved_oxygen' | 'water_level' | 'sediments' | 'conductivity' | 'humidity' | 'pressure' | 'flow_rate'
export type AlertType = 'low' | 'high' | 'critical'
export type AlertStatus = 'active' | 'acknowledged' | 'resolved'
export type MaintenanceType = 'calibration' | 'repair' | 'replacement' | 'cleaning' | 'inspection' | 'malfunction_fix'
export type DamageLevel = 'none' | 'low' | 'medium' | 'high'
export type NotificationType = 'info' | 'warning' | 'error' | 'success'
export type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom'
export type SettingType = 'string' | 'number' | 'boolean' | 'json'

// Tables
export interface User {
  user_id: string
  username: string
  email: string
  password_hash: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Location {
  location_id: string
  location_name: string
  river_section: RiverSection
  location_type: LocationType
  latitude: number
  longitude: number
  description: string | null
  created_at: string
}

export interface Device {
  device_id: string
  device_name: string
  device_type: string
  location_id: string | null
  status: DeviceStatus
  device_condition: DeviceCondition
  description: string | null
  installation_date: string | null
  last_active: string | null
  created_at: string
  updated_at: string
}

export interface Sensor {
  sensor_id: string
  device_id: string
  sensor_type: SensorType
  unit: string
  min_threshold: number
  max_threshold: number
  calibration_date: string | null
  created_at: string
}

export interface SensorReading {
  reading_id: string
  sensor_id: string
  value: number
  recorded_at: string
}

export interface Alert {
  alert_id: string
  sensor_id: string
  reading_id: string
  alert_type: AlertType
  message: string
  status: AlertStatus
  acknowledged_by: string | null
  acknowledged_at: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

export interface MaintenanceLog {
  maintenance_id: string
  device_id: string
  performed_by: string
  maintenance_type: MaintenanceType
  damage_level: DamageLevel
  malfunction_type: string | null
  notes: string | null
  parts_used: string | null
  cost: number | null
  duration_minutes: number | null
  performed_at: string
}

export interface Notification {
  notification_id: string
  user_id: string
  alert_id: string | null
  title: string
  message: string
  notification_type: NotificationType
  is_read: boolean
  created_at: string
  read_at: string | null
}

export interface Report {
  report_id: string
  report_name: string
  report_type: ReportType
  generated_by: string
  file_path: string | null
  parameters: Record<string, unknown> | null
  generated_at: string
}

export interface SystemLog {
  log_id: string
  user_id: string | null
  action: string
  details: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface SystemSetting {
  setting_id: string
  setting_key: string
  setting_value: string | null
  setting_type: SettingType
  description: string | null
  updated_by: string | null
  updated_at: string
}

// Database interface for Supabase client
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'user_id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<User, 'user_id'>>
      }
      locations: {
        Row: Location
        Insert: Omit<Location, 'location_id' | 'created_at'>
        Update: Partial<Omit<Location, 'location_id'>>
      }
      devices: {
        Row: Device
        Insert: Omit<Device, 'device_id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Device, 'device_id'>>
      }
      sensors: {
        Row: Sensor
        Insert: Omit<Sensor, 'sensor_id' | 'created_at'>
        Update: Partial<Omit<Sensor, 'sensor_id'>>
      }
      sensor_readings: {
        Row: SensorReading
        Insert: Omit<SensorReading, 'reading_id' | 'recorded_at'>
        Update: Partial<Omit<SensorReading, 'reading_id'>>
      }
      alerts: {
        Row: Alert
        Insert: Omit<Alert, 'alert_id' | 'created_at'>
        Update: Partial<Omit<Alert, 'alert_id'>>
      }
      maintenance_logs: {
        Row: MaintenanceLog
        Insert: Omit<MaintenanceLog, 'maintenance_id' | 'performed_at'>
        Update: Partial<Omit<MaintenanceLog, 'maintenance_id'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'notification_id' | 'created_at'>
        Update: Partial<Omit<Notification, 'notification_id'>>
      }
      reports: {
        Row: Report
        Insert: Omit<Report, 'report_id' | 'generated_at'>
        Update: Partial<Omit<Report, 'report_id'>>
      }
      system_logs: {
        Row: SystemLog
        Insert: Omit<SystemLog, 'log_id' | 'created_at'>
        Update: Partial<Omit<SystemLog, 'log_id'>>
      }
      system_settings: {
        Row: SystemSetting
        Insert: Omit<SystemSetting, 'setting_id' | 'updated_at'>
        Update: Partial<Omit<SystemSetting, 'setting_id'>>
      }
    }
  }
}
