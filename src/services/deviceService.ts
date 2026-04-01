/**
 * Device Service Layer
 * Migrated from PHP device.php
 * Handles all device-related database operations via Supabase
 */

import { supabase } from '../lib/supabase';
import type {
  Device,
  DeviceLocation,
  DeviceReading,
  DeviceHistoryEntry,
  DeviceMapData,
  DeviceFormData,
  MapSyncResponse,
  DeviceFilterOptions,
  RiverSection,
} from '../types/device.types';

// ============================================================================
// Device CRUD Operations
// ============================================================================

/**
 * Get all devices with location info
 */
export async function getAllDevices(): Promise<Device[]> {
  const { data, error } = await supabase
    .from('devices')
    .select(`
      *,
      locations!left(location_name, river_section, latitude, longitude)
    `)
    .order('device_name');

  if (error) {
    console.error('Error fetching devices:', error);
    throw new Error('Failed to fetch devices');
  }

  return (data || []).map(transformDeviceFromDB);
}

/**
 * Get device by ID
 */
export async function getDeviceById(deviceId: string): Promise<Device | null> {
  const { data, error } = await supabase
    .from('devices')
    .select(`
      *,
      locations!left(location_name, river_section, latitude, longitude)
    `)
    .eq('device_id', deviceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching device:', error);
    throw new Error('Failed to fetch device');
  }

  return data ? transformDeviceFromDB(data) : null;
}

/**
 * Create new device
 */
export async function createDevice(formData: DeviceFormData): Promise<Device> {
  // Check for duplicate name
  const { data: existing } = await supabase
    .from('devices')
    .select('device_id')
    .eq('device_name', formData.device_name)
    .single();

  if (existing) {
    throw new Error(`Device name '${formData.device_name}' is already taken`);
  }

  let locationId: string | null = null;

  // Create location if active and has coordinates
  if (formData.status === 'active' && formData.latitude && formData.longitude) {
    locationId = await createOrGetLocation(
      formData.latitude,
      formData.longitude,
      formData.location_name
    );
  }

  // Check distance to river and set condition if needed
  let deviceCondition = formData.device_condition;
  if (formData.status === 'active' && formData.latitude && formData.longitude) {
    const isNearRiver = await checkDistanceToRiver(formData.latitude, formData.longitude);
    if (!isNearRiver) {
      deviceCondition = 'displaced';
    }
  }

  const { data, error } = await supabase
    .from('devices')
    .insert({
      device_name: formData.device_name,
      status: formData.status,
      device_condition: deviceCondition,
      location_id: locationId,
      last_active: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating device:', error);
    throw new Error('Failed to create device');
  }

  // Log activity
  await logActivity('DEVICE_CREATE', `Created new device: ${formData.device_name} (Status: ${formData.status})`);

  return transformDeviceFromDB(data);
}

/**
 * Update existing device
 */
export async function updateDevice(
  deviceId: string,
  formData: DeviceFormData,
  originalDevice?: Device
): Promise<Device> {
  // Check for duplicate name
  const { data: existing } = await supabase
    .from('devices')
    .select('device_id')
    .eq('device_name', formData.device_name)
    .neq('device_id', deviceId)
    .single();

  if (existing) {
    throw new Error(`Device name '${formData.device_name}' is already taken`);
  }

  let locationId: string | null = null;
  let conditionChanged = false;

  // Create location if active and has coordinates
  if (formData.status === 'active' && formData.latitude && formData.longitude) {
    locationId = await createOrGetLocation(
      formData.latitude,
      formData.longitude,
      formData.location_name
    );

    // Check distance to river
    const isNearRiver = await checkDistanceToRiver(formData.latitude, formData.longitude);
    if (!isNearRiver && formData.device_condition === 'normal') {
      formData.device_condition = 'displaced';
      conditionChanged = true;
    }
  }

  const { data, error } = await supabase
    .from('devices')
    .update({
      device_name: formData.device_name,
      status: formData.status,
      device_condition: formData.device_condition,
      location_id: locationId,
      updated_at: new Date().toISOString(),
    })
    .eq('device_id', deviceId)
    .select()
    .single();

  if (error) {
    console.error('Error updating device:', error);
    throw new Error('Failed to update device');
  }

  // Build change log
  const changes: string[] = [];
  if (originalDevice) {
    if (originalDevice.device_name !== formData.device_name) {
      changes.push(`Name: '${originalDevice.device_name}' → '${formData.device_name}'`);
    }
    if (originalDevice.status !== formData.status) {
      changes.push(`Status: '${originalDevice.status}' → '${formData.status}'`);
    }
    if (originalDevice.device_condition !== formData.device_condition) {
      changes.push(`Condition: '${originalDevice.device_condition}' → '${formData.device_condition}'`);
    }
    if (conditionChanged) {
      changes.push('Auto-changed to Displaced (far from river)');
    }
    if (originalDevice.latitude !== formData.latitude || originalDevice.longitude !== formData.longitude) {
      const oldLat = originalDevice.latitude ? originalDevice.latitude.toFixed(5) : 'none';
      const oldLng = originalDevice.longitude ? originalDevice.longitude.toFixed(5) : 'none';
      const newLat = formData.latitude ? formData.latitude.toFixed(5) : 'none';
      const newLng = formData.longitude ? formData.longitude.toFixed(5) : 'none';
      changes.push(`Location: (${oldLat}, ${oldLng}) → (${newLat}, ${newLng})`);
    }
  }

  const logDetails = `Updated device ID: ${deviceId}${changes.length > 0 ? ' | ' + changes.join(' | ') : ''}`;
  await logActivity('DEVICE_UPDATE', logDetails);

  return transformDeviceFromDB(data);
}

/**
 * Delete device
 */
export async function deleteDevice(deviceId: string): Promise<void> {
  // Check if device has readings
  const { count, error: countError } = await supabase
    .from('sensor_readings')
    .select('reading_id', { count: 'exact', head: true })
    .eq('device_id', deviceId);

  if (countError) {
    console.error('Error checking readings:', countError);
    throw new Error('Failed to check device readings');
  }

  if (count && count > 0) {
    throw new Error(`Cannot delete device: It has ${count} sensor readings. Delete readings first.`);
  }

  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('device_id', deviceId);

  if (error) {
    console.error('Error deleting device:', error);
    throw new Error('Failed to delete device');
  }

  await logActivity('DEVICE_DELETE', `Deleted device ID: ${deviceId}`);
}

// ============================================================================
// Location Operations
// ============================================================================

/**
 * Get all locations
 */
export async function getAllLocations(): Promise<DeviceLocation[]> {
  const { data, error } = await supabase
    .from('locations')
    .select(`
      *,
      devices!left(count),
      devices!left(status)
    `)
    .order('location_name');

  if (error) {
    console.error('Error fetching locations:', error);
    throw new Error('Failed to fetch locations');
  }

  return (data || []).map(transformLocationFromDB);
}

/**
 * Create or get existing location
 */
async function createOrGetLocation(
  latitude: number,
  longitude: number,
  locationName?: string
): Promise<string | null> {
  // Try to find existing location with similar coordinates
  const { data: existing } = await supabase
    .from('locations')
    .select('location_id')
    .gte('latitude', latitude - 0.001)
    .lte('latitude', latitude + 0.001)
    .gte('longitude', longitude - 0.001)
    .lte('longitude', longitude + 0.001)
    .single();

  if (existing) {
    return existing.location_id;
  }

  // Detect river section
  const riverSection = detectRiverSection(longitude);
  const name = locationName || `${riverSection.charAt(0).toUpperCase() + riverSection.slice(1)} Section`;

  const { data, error } = await supabase
    .from('locations')
    .insert({
      location_name: name,
      river_section: riverSection,
      latitude,
      longitude,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating location:', error);
    return null;
  }

  return data.location_id;
}

// ============================================================================
// Device Readings & History
// ============================================================================

/**
 * Get latest sensor readings for device
 */
export async function getDeviceReadings(deviceId: string): Promise<DeviceReading> {
  const { data: sensors, error: sensorError } = await supabase
    .from('sensors')
    .select('sensor_id, sensor_type')
    .eq('device_id', deviceId);

  if (sensorError) {
    console.error('Error fetching sensors:', sensorError);
    throw new Error('Failed to fetch sensors');
  }

  const readings: DeviceReading = {
    temperature: null,
    ph_level: null,
    turbidity: null,
    dissolved_oxygen: null,
    water_level: null,
    sediments: null,
  };

  for (const sensor of sensors || []) {
    const { data: reading } = await supabase
      .from('sensor_readings')
      .select('value')
      .eq('sensor_id', sensor.sensor_id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (reading) {
      readings[sensor.sensor_type as keyof DeviceReading] = reading.value;
    }
  }

  return readings;
}

/**
 * Get device activity history
 */
export async function getDeviceHistory(deviceId: string): Promise<DeviceHistoryEntry[]> {
  const { data, error } = await supabase
    .from('system_logs')
    .select(`
      log_id,
      action,
      details,
      created_at,
      user_id,
      users!left(full_name)
    `)
    .or(`details.ilike.%ID: ${deviceId}%,details.ilike.%device_id: ${deviceId}%`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching device history:', error);
    throw new Error('Failed to fetch device history');
  }

  return (data || []).map((entry: {
    log_id: string;
    action: string;
    details: string;
    created_at: string;
    user_id: string | null;
    users?: { full_name: string } | null;
  }) => ({
    log_id: entry.log_id,
    action: entry.action,
    details: entry.details,
    created_at: entry.created_at,
    user_id: entry.user_id,
    user_name: entry.users?.full_name || null,
  }));
}

// ============================================================================
// Map Sync
// ============================================================================

/**
 * Get map sync data (locations and devices)
 */
export async function getMapSyncData(): Promise<MapSyncResponse> {
  // Get locations with device counts
  const { data: locations, error: locError } = await supabase
    .from('locations')
    .select(`
      location_id,
      location_name,
      latitude,
      longitude,
      river_section,
      devices!left(count),
      devices!left(status, device_condition)
    `);

  if (locError) {
    console.error('Error fetching map locations:', locError);
    throw new Error('Failed to fetch map data');
  }

  // Get all active devices
  const { data: devices, error: devError } = await supabase
    .from('devices')
    .select(`
      device_id,
      device_name,
      status,
      device_condition,
      locations!left(location_id, location_name, river_section, latitude, longitude)
    `)
    .eq('status', 'active');

  if (devError) {
    console.error('Error fetching map devices:', devError);
    throw new Error('Failed to fetch map data');
  }

  return {
    ok: true,
    timestamp: new Date().toISOString(),
    locations: (locations || []).map(transformLocationFromDB),
    devices: (devices || []).map(transformDeviceMapData),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transform device from DB format
 */
function transformDeviceFromDB(data: any): Device {
  return {
    device_id: data.device_id,
    device_name: data.device_name,
    status: data.status,
    device_condition: data.device_condition || 'normal',
    location_id: data.location_id,
    location_name: data.locations?.location_name || null,
    river_section: data.locations?.river_section || null,
    latitude: data.locations?.latitude || null,
    longitude: data.locations?.longitude || null,
    last_active: data.last_active,
    updated_at: data.updated_at,
    created_at: data.created_at,
  };
}

/**
 * Transform location from DB format
 */
function transformLocationFromDB(data: any): DeviceLocation {
  const devices = data.devices || [];
  return {
    location_id: data.location_id,
    location_name: data.location_name,
    river_section: data.river_section,
    latitude: data.latitude,
    longitude: data.longitude,
    description: data.description,
    total_devices: devices.length,
    active_devices: devices.filter((d: any) => d.status === 'active').length,
    maint_devices: devices.filter((d: any) => d.status === 'maintenance').length,
  };
}

/**
 * Transform device for map data
 */
function transformDeviceMapData(data: any): DeviceMapData {
  return {
    device_id: data.device_id,
    device_name: data.device_name,
    status: data.status,
    device_condition: data.device_condition || 'normal',
    lat: data.locations?.latitude || 0,
    lng: data.locations?.longitude || 0,
    location_name: data.locations?.location_name || null,
    river_section: data.locations?.river_section || null,
  };
}

/**
 * Check distance to Mangima River
 */
async function checkDistanceToRiver(lat: number, lng: number): Promise<boolean> {
  const MAX_DISTANCE_KM = 0.5;

  // Mangima River coordinates (simplified polyline)
  const riverCoords: [number, number][] = [
    [8.345958, 124.898607], [8.346955, 124.899036], [8.347603, 124.898081],
    [8.349471, 124.896461], [8.349216, 124.895474], [8.349535, 124.894755],
    [8.348909, 124.894058], [8.349881, 124.893209], [8.352050, 124.889584],
    [8.351096, 124.889497], [8.351978, 124.888415], [8.352369, 124.887056],
    [8.352210, 124.886676], [8.352643, 124.886427], [8.353468, 124.884863],
    [8.355492, 124.883376], [8.356292, 124.881332], [8.358270, 124.881140],
    [8.368532, 124.875713], [8.373977, 124.876690], [8.381657, 124.897203],
    [8.394810, 124.903483], [8.396343, 124.907500], [8.399906, 124.911121],
    [8.400757, 124.910773], [8.401407, 124.910581], [8.401636, 124.910868],
    [8.401774, 124.911007], [8.402125, 124.911168], [8.402489, 124.911218],
    [8.402853, 124.911196], [8.403020, 124.911119], [8.403792, 124.910506],
    [8.405310, 124.909972], [8.405901, 124.909983], [8.406337, 124.910087],
    [8.406533, 124.910179], [8.406700, 124.910291], [8.406745, 124.910385],
    [8.406713, 124.910512], [8.405924, 124.911388], [8.405818, 124.911576],
    [8.405829, 124.911689], [8.405924, 124.911801], [8.406275, 124.911984],
    [8.406715, 124.912414], [8.407049, 124.912661], [8.409034, 124.913466],
    [8.409793, 124.913708], [8.410064, 124.913713], [8.410472, 124.913676],
    [8.411629, 124.913198], [8.412245, 124.912800], [8.412515, 124.912462],
    [8.412632, 124.911962], [8.413237, 124.909739], [8.413179, 124.909497],
  ];

  let minDistance = Infinity;

  for (const [riverLat, riverLng] of riverCoords) {
    const distance = calculateDistance(lat, lng, riverLat, riverLng);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance <= MAX_DISTANCE_KM;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Detect river section based on longitude
 */
function detectRiverSection(lng: number): RiverSection {
  const midstreamStart = 124.876785;
  const midstreamEnd = 124.903068;

  if (lng < midstreamStart) return 'upstream';
  if (lng >= midstreamStart && lng <= midstreamEnd) return 'midstream';
  return 'downstream';
}

/**
 * Log activity to system logs
 */
async function logActivity(action: string, details: string): Promise<void> {
  const { error } = await supabase.from('system_logs').insert({
    action,
    details,
    // user_id will be set by RLS/policy
  });

  if (error) {
    console.error('Error logging activity:', error);
  }
}

// ============================================================================
// Filter Functions
// ============================================================================

/**
 * Filter devices based on options
 */
export function filterDevices(devices: Device[], options: DeviceFilterOptions): Device[] {
  return devices.filter((device) => {
    if (options.status && options.status !== 'all' && device.status !== options.status) {
      return false;
    }
    if (options.condition && options.condition !== 'all' && device.device_condition !== options.condition) {
      return false;
    }
    if (options.section && options.section !== 'all' && device.river_section !== options.section) {
      return false;
    }
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      const matchName = device.device_name.toLowerCase().includes(searchLower);
      const matchLocation = device.location_name?.toLowerCase().includes(searchLower);
      if (!matchName && !matchLocation) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Get device status color
 */
export function getDeviceStatusColor(status: string, condition?: string): string {
  // Condition takes priority
  if (condition && condition !== 'normal') {
    const conditionColors: Record<string, string> = {
      displaced: '#7c3aed', // Purple
      damaged: '#1f2937', // Dark gray
      malfunctioning: '#d97706', // Orange
    };
    return conditionColors[condition] || '#9ca3af';
  }

  const statusColors: Record<string, string> = {
    active: '#059669', // Green
    maintenance: '#3b82f6', // Blue
    inactive: '#dc2626', // Red
    offline: '#6b7280', // Gray
    unassigned: '#9ca3af', // Light gray
  };

  return statusColors[status] || '#9ca3af';
}
