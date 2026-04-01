/**
 * Device Management Types
 * Migrated from PHP device.php
 */

export type DeviceStatus = 'active' | 'maintenance' | 'inactive' | 'offline' | 'unassigned';
export type DeviceCondition = 'normal' | 'displaced' | 'damaged' | 'malfunctioning';
export type RiverSection = 'upstream' | 'midstream' | 'downstream' | 'custom';

export interface Device {
  device_id: string;
  device_name: string;
  status: DeviceStatus;
  device_condition: DeviceCondition;
  location_id: string | null;
  location_name: string | null;
  river_section: RiverSection | null;
  latitude: number | null;
  longitude: number | null;
  last_active: string | null;
  updated_at: string | null;
  created_at: string;
}

export interface DeviceLocation {
  location_id: string;
  location_name: string;
  river_section: RiverSection;
  latitude: number;
  longitude: number;
  description?: string;
  total_devices: number;
  active_devices: number;
  maint_devices: number;
}

export interface DeviceReading {
  temperature: number | null;
  ph_level: number | null;
  turbidity: number | null;
  dissolved_oxygen: number | null;
  water_level: number | null;
  sediments: number | null;
}

export interface DeviceHistoryEntry {
  log_id: string;
  action: string;
  details: string;
  created_at: string;
  user_name: string | null;
  user_id: string | null;
}

export interface DeviceMapData {
  device_id: string;
  device_name: string;
  status: DeviceStatus;
  device_condition: DeviceCondition;
  lat: number;
  lng: number;
  location_name: string | null;
  river_section: RiverSection | null;
}

export interface DeviceFormData {
  device_name: string;
  status: DeviceStatus;
  device_condition?: DeviceCondition;
  latitude?: number;
  longitude?: number;
  location_name?: string;
}

export interface MapSyncResponse {
  ok: boolean;
  timestamp: string;
  locations: DeviceLocation[];
  devices: DeviceMapData[];
}

export interface DeviceFilterOptions {
  status: DeviceStatus | 'all';
  condition: DeviceCondition | 'all';
  section: RiverSection | 'all';
  search: string;
}
