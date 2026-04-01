/**
 * Device Service Layer
 * Migrated from PHP device.php
 * Handles all device-related database operations via Supabase
 */

import { supabase, supabaseAdmin } from '../lib/supabase';
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
  let deviceCondition = formData.device_condition || 'normal';
  if (formData.status === 'active' && formData.latitude && formData.longitude) {
    const isNearRiver = await checkDistanceToRiver(formData.latitude, formData.longitude);
    if (!isNearRiver) {
      deviceCondition = 'displaced';
    }
  }

  const { data, error } = await supabaseAdmin
    .from('devices')
    .insert({
      device_name: formData.device_name,
      device_type: 'sensor', // Default device type
      status: formData.status,
      device_condition: deviceCondition,
      location_id: locationId,
      last_active: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating device:', error);
    throw new Error(`Failed to create device: ${error.message || error.details || 'Unknown error'}`);
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
  const { data: existing } = await supabaseAdmin
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

  const { data, error } = await supabaseAdmin
    .from('devices')
    .update({
      device_name: formData.device_name,
      device_type: formData.device_type || originalDevice?.device_type || 'sensor',
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
    throw new Error(`Failed to update device: ${error.message || error.details || 'Unknown error'}`);
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
 * Delete device with cascade delete using RPC
 */
export async function deleteDevice(deviceId: string): Promise<void> {
  // Use RPC for efficient server-side cascade delete
  const { error } = await supabaseAdmin.rpc('delete_device_cascade', {
    p_device_id: deviceId
  });

  if (error) {
    console.error('Error deleting device:', error);
    // Fallback to direct delete if RPC doesn't exist
    const { error: directError } = await supabaseAdmin
      .from('devices')
      .delete()
      .eq('device_id', deviceId);
    
    if (directError) {
      throw new Error(`Failed to delete device: ${directError.message || 'Database timeout - FK cascade too slow'}`);
    }
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
  const { data: existing } = await supabaseAdmin
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

  const { data, error } = await supabaseAdmin
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
    device_type: data.device_type || 'sensor',
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
    [8.345862, 124.898846], [8.345963, 124.898948], [8.346406, 124.899192], [8.346703, 124.899117], [8.346892, 124.899034],
    [8.347059, 124.898908], [8.347298, 124.898613], [8.347470, 124.898275], [8.347521, 124.898120], [8.347571, 124.898012],
    [8.347842, 124.897806], [8.348131, 124.897720], [8.348309, 124.897642], [8.349344, 124.896652], [8.349455, 124.896524],
    [8.349493, 124.896424], [8.349490, 124.896304], [8.349323, 124.895950], [8.349158, 124.895700], [8.349134, 124.895617],
    [8.349158, 124.895526], [8.349474, 124.895209], [8.349580, 124.895051], [8.349654, 124.894836], [8.349628, 124.894745],
    [8.349503, 124.894608], [8.349270, 124.894439], [8.348768, 124.894099], [8.348720, 124.894008], [8.348755, 124.893919],
    [8.349060, 124.893669], [8.349270, 124.893589], [8.349447, 124.893557], [8.349580, 124.893498], [8.349968, 124.892860],
    [8.350522, 124.891503], [8.351111, 124.890497], [8.351252, 124.890381], [8.351403, 124.890328], [8.351642, 124.890223],
    [8.351913, 124.889885], [8.351955, 124.889746], [8.351934, 124.889650], [8.351873, 124.889607], [8.351695, 124.889633],
    [8.351528, 124.889717], [8.351377, 124.889735], [8.351087, 124.889684], [8.350886, 124.889588], [8.350804, 124.889486],
    [8.350782, 124.889349], [8.350849, 124.889210], [8.351021, 124.889036], [8.351637, 124.888777], [8.351854, 124.888684],
    [8.352271, 124.888290], [8.352600, 124.887831], [8.352640, 124.887657], [8.352613, 124.887462], [8.352510, 124.887279],
    [8.352099, 124.886963], [8.352064, 124.886877], [8.352083, 124.886781], [8.352473, 124.886440], [8.352584, 124.886296],
    [8.352916, 124.885543], [8.353136, 124.885167], [8.353285, 124.885033], [8.353701, 124.884776], [8.353773, 124.884625],
    [8.353874, 124.884556], [8.354383, 124.884374], [8.354813, 124.884129], [8.355172, 124.883864], [8.355400, 124.883531],
    [8.355509, 124.882987], [8.355657, 124.882434], [8.355915, 124.881777], [8.356159, 124.881426], [8.356358, 124.881208],
    [8.356591, 124.881147], [8.356743, 124.881136], [8.357929, 124.881246], [8.358054, 124.881219], [8.358115, 124.881165],
    [8.358308, 124.880828], [8.358428, 124.880407], [8.358789, 124.879848], [8.359155, 124.879513], [8.359648, 124.879216],
    [8.359906, 124.879114], [8.360920, 124.878746], [8.361081, 124.878644], [8.361410, 124.878199], [8.361649, 124.877958],
    [8.362345, 124.877644], [8.363260, 124.877056], [8.363377, 124.876933], [8.364088, 124.875943], [8.364218, 124.875796],
    [8.364998, 124.875568], [8.365354, 124.875546], [8.365662, 124.875578], [8.365879, 124.875659], [8.366065, 124.875819],
    [8.366596, 124.876345], [8.366811, 124.876384], [8.366951, 124.876329], [8.367424, 124.876083], [8.368193, 124.875922],
    [8.368384, 124.875772], [8.368782, 124.874521], [8.368889, 124.874441], [8.368936, 124.874430], [8.369090, 124.874430],
    [8.369218, 124.874484], [8.369329, 124.874570], [8.369409, 124.874918], [8.369515, 124.875052], [8.371224, 124.875825],
    [8.372126, 124.875777], [8.372890, 124.875975], [8.373134, 124.876163], [8.373209, 124.876281], [8.373363, 124.876763],
    [8.373402, 124.876764], [8.373461, 124.877185], [8.373511, 124.877297], [8.374527, 124.877837], [8.375740, 124.878148],
    [8.376366, 124.880304], [8.376122, 124.881645], [8.376430, 124.881999], [8.376313, 124.882311], [8.376557, 124.882434],
    [8.376621, 124.884328], [8.376101, 124.884848], [8.375608, 124.885100], [8.375493, 124.885266], [8.375467, 124.885465],
    [8.375772, 124.885910], [8.377691, 124.887257], [8.377821, 124.887415], [8.377847, 124.887675], [8.377868, 124.888416],
    [8.377884, 124.888571], [8.377959, 124.888657], [8.378208, 124.888754], [8.378940, 124.888743], [8.379652, 124.888678],
    [8.379890, 124.888710], [8.380671, 124.889204], [8.380941, 124.889467], [8.380994, 124.889607], [8.380909, 124.890990],
    [8.380676, 124.891623], [8.380453, 124.892461], [8.381122, 124.893243], [8.381477, 124.893683], [8.381626, 124.894257],
    [8.381498, 124.897446], [8.381565, 124.897704], [8.381658, 124.897776], [8.381889, 124.897886], [8.382976, 124.898050],
    [8.383146, 124.898039], [8.383390, 124.897951], [8.384181, 124.897551], [8.384701, 124.897535], [8.384887, 124.897580],
    [8.386185, 124.898259], [8.387397, 124.898610], [8.387782, 124.898793], [8.388002, 124.898986], [8.388528, 124.899860],
    [8.388631, 124.899938], [8.390032, 124.899970], [8.390685, 124.900067], [8.390852, 124.900188], [8.390961, 124.900351],
    [8.391277, 124.901011], [8.391420, 124.901223], [8.391773, 124.901547], [8.393169, 124.902229], [8.394501, 124.903087],
    [8.394623, 124.903205], [8.394718, 124.903597], [8.394745, 124.903892], [8.394649, 124.904112], [8.393970, 124.904814],
    [8.393410, 124.905694], [8.393344, 124.905946], [8.393384, 124.906051], [8.393514, 124.906134], [8.394283, 124.906392],
    [8.394718, 124.906440], [8.395902, 124.906349], [8.396249, 124.906397], [8.396337, 124.906501], [8.396387, 124.906652],
    [8.396361, 124.906823], [8.396239, 124.907231], [8.396202, 124.907730], [8.396257, 124.907861], [8.396308, 124.907883],
    [8.396459, 124.907934], [8.398162, 124.907896], [8.398775, 124.907953], [8.399158, 124.908068], [8.399354, 124.908162],
    [8.399866, 124.908682], [8.399948, 124.908840], [8.400033, 124.909326], [8.399972, 124.909739], [8.399951, 124.909905],
    [8.399444, 124.910337], [8.399452, 124.910345], [8.399396, 124.910667], [8.399699, 124.911238], [8.399839, 124.911332],
    [8.399972, 124.911321], [8.400129, 124.911300], [8.400330, 124.911209], [8.400519, 124.911069], [8.400808, 124.910742],
    [8.401055, 124.910554], [8.401264, 124.910514], [8.401378, 124.910546], [8.401588, 124.910841], [8.401737, 124.910986],
    [8.401774, 124.911007], [8.402125, 124.911168], [8.402489, 124.911218], [8.402853, 124.911196], [8.403020, 124.911119],
    [8.403792, 124.910506], [8.405310, 124.909972], [8.405901, 124.909983], [8.406337, 124.910087], [8.406533, 124.910179],
    [8.406700, 124.910291], [8.406745, 124.910385], [8.406713, 124.910512], [8.405924, 124.911388], [8.405818, 124.911576],
    [8.405829, 124.911689], [8.405924, 124.911801], [8.406275, 124.911984], [8.406715, 124.912414], [8.407049, 124.912661],
    [8.409034, 124.913466], [8.409793, 124.913708], [8.410064, 124.913713], [8.410472, 124.913676], [8.411629, 124.913198],
    [8.412245, 124.912800], [8.412515, 124.912462], [8.412632, 124.911962], [8.413237, 124.909739], [8.413179, 124.909497],
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
  const { error } = await supabaseAdmin.from('system_logs').insert({
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
