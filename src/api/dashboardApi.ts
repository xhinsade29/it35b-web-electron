import { supabase } from '../lib/supabase';
import type { 
  DashboardSyncData, 
  SimulationResponse,
  MonitorState,
  Alert
} from '../types/dashboard.types';

// =====================================================
// Sensor Management
// =====================================================

const REQUIRED_SENSORS: Array<{ sensor_type: string; unit: string; min: number; max: number }> = [
  { sensor_type: 'temperature', unit: '°C', min: 20, max: 35 },
  { sensor_type: 'ph_level', unit: 'pH', min: 6.5, max: 8.5 },
  { sensor_type: 'turbidity', unit: 'NTU', min: 0, max: 50 },
  { sensor_type: 'dissolved_oxygen', unit: 'mg/L', min: 5, max: 14 },
  { sensor_type: 'water_level', unit: 'm', min: 0.5, max: 3.0 },
  { sensor_type: 'sediments', unit: 'mg/L', min: 0, max: 500 },
];

/**
 * Ensure a device has all required sensors, creating any that are missing
 */
export async function ensureDeviceSensors(deviceId: string): Promise<boolean> {
  try {
    // Fetch existing sensors for this device
    const { data: existingSensors, error } = await supabase
      .from('sensors')
      .select('sensor_type')
      .eq('device_id', deviceId);
    
    if (error) {
      console.error(`Error fetching sensors for device ${deviceId}:`, error);
      return false;
    }
    
    const existingTypes = new Set(existingSensors?.map((s: { sensor_type: string }) => s.sensor_type) || []);
    const missingSensors = REQUIRED_SENSORS.filter(s => !existingTypes.has(s.sensor_type));
    
    if (missingSensors.length === 0) {
      console.log(`Device ${deviceId} has all required sensors`);
      return true;
    }
    
    console.log(`Device ${deviceId} missing sensors:`, missingSensors.map(s => s.sensor_type));
    
    // Create missing sensors using RPC function (bypasses RLS)
    const { data, error: rpcError } = await supabase
      .rpc('dashboard_ensure_device_sensors', {
        p_device_id: deviceId
      });
    
    if (rpcError) {
      console.error(`Error creating sensors for device ${deviceId}:`, rpcError);
      return false;
    }
    
    if (data && data.success) {
      console.log(`Created ${data.created_count} sensors for device ${deviceId}`);
      return true;
    }
    
    return false;
  } catch (err) {
    console.error(`ensureDeviceSensors error for ${deviceId}:`, err);
    return false;
  }
}

/**
 * Ensure ALL devices have all required sensors
 */
export async function ensureAllDeviceSensors(deviceIds: string[]): Promise<void> {
  console.log(`Ensuring all ${deviceIds.length} devices have required sensors...`);
  
  const results = await Promise.all(
    deviceIds.map(id => ensureDeviceSensors(id))
  );
  
  const successCount = results.filter(r => r).length;
  console.log(`Sensor check complete: ${successCount}/${deviceIds.length} devices ready`);
}

/**
 * Fetch complete dashboard data
 * Replaces: av_overview_api_fetch() in PHP
 */
export async function fetchDashboard(): Promise<DashboardSyncData> {
  try {
    // Fetch all devices first (without joins to avoid syntax issues)
    const { data: devicesData, error: devicesError } = await supabase
      .from('devices')
      .select('*')
      .eq('status', 'active')
      .order('device_name');
    
    console.log('Devices fetch result:', { devicesData, devicesError, count: devicesData?.length });
    
    if (devicesError) {
      console.error('Devices fetch error:', devicesError);
      throw devicesError;
    }

    // Fetch locations separately
    const { data: locationsData, error: locationsError } = await supabase
      .from('locations')
      .select('*');
    
    console.log('Locations fetch result:', { locationsData, locationsError });
    
    if (locationsError) {
      console.error('Locations fetch error:', locationsError);
    }

    // Create location lookup
    const locationMap = new Map<string, { location_name?: string; river_section?: string }>();
    locationsData?.forEach((loc: { location_id: string; location_name?: string; river_section?: string }) => {
      locationMap.set(loc.location_id, loc);
    });

    // Transform devices with location data
    const transformedDevices = (devicesData || []).map((d: { 
      device_id: string; 
      device_name: string; 
      location_id?: string;
      status: string;
      last_active?: string;
    }) => {
      const location = d.location_id ? locationMap.get(d.location_id) : null;
      return {
        device_id: d.device_id,
        device_name: d.device_name,
        location_id: d.location_id,
        location_name: location?.location_name || 'Unknown',
        river_section: location?.river_section || 'upstream',
        status: d.status,
        last_active: d.last_active,
      };
    });

    // Fetch active alerts
    const { data: alertsData, error: alertsError } = await supabase
      .from('alerts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (alertsError) {
      console.error('Alerts fetch error:', alertsError);
    }

    // Get device counts
    const { data: deviceCounts, error: countError } = await supabase
      .from('devices')
      .select('status');
    
    if (countError) {
      console.error('Device counts error:', countError);
    }

    // Calculate counts
    const devCounts = {
      total: deviceCounts?.length || 0,
      active: deviceCounts?.filter((d: { status: string }) => d.status === 'active').length || 0,
      offline: deviceCounts?.filter((d: { status: string }) => d.status === 'inactive').length || 0,
      maint: deviceCounts?.filter((d: { status: string }) => d.status === 'maintenance').length || 0,
    };

    const alert_count = alertsData?.length || 0;

    // Transform alerts (simplified without nested joins)
    const transformedAlerts = (alertsData || []).map((a: { 
      alert_id: string; 
      alert_type: string; 
      message: string; 
      created_at: string;
    }) => ({
      alert_id: a.alert_id,
      alert_type: a.alert_type,
      message: a.message,
      created_at: a.created_at,
      device_name: 'Unknown',
      location_name: 'Unknown',
      sensor_type: 'unknown',
    }));

    // Fetch recent sensor readings for charts, sections, and logs
    // Add timestamp to bypass Supabase cache
    const cacheBuster = Date.now();
    const { data: readingsData, error: readingsError } = await supabase
      .from('sensor_readings')
      .select(`
        value, 
        recorded_at, 
        sensors!inner(sensor_type, device_id, devices!inner(device_name, location_id, locations!inner(location_name, river_section)))
      `)
      .order('recorded_at', { ascending: false })
      .limit(5000);
    
    if (readingsError) {
      console.error('Readings fetch error:', readingsError);
    }

    console.log('[FETCH] Raw readings sample (cacheBuster:', cacheBuster, '):', readingsData?.slice(0, 3));

    // Process the readings data
    const processedReadings = readingsData || [];
    const chartData = processChartData(processedReadings);
    const sectionConditions = processSectionConditions(processedReadings);
    const logs = processActivityLogs(processedReadings);
    const deviceChartData = processDeviceChartData(processedReadings, transformedDevices);
    const deviceReadings = processDeviceReadings(processedReadings);

    // Build map locations with device counts
    const mapLocations = (locationsData || []).map((loc: { 
      location_id: string; 
      location_name: string; 
      river_section: string;
      latitude: number;
      longitude: number;
    }) => {
      const locDevices = (devicesData || []).filter((d: { location_id?: string }) => d.location_id === loc.location_id);
      return {
        location_id: loc.location_id,
        location_name: loc.location_name,
        river_section: loc.river_section,
        latitude: loc.latitude,
        longitude: loc.longitude,
        total_devices: locDevices.length,
        active_devices: locDevices.filter((d: { status?: string }) => d.status === 'active').length,
        maint_devices: locDevices.filter((d: { status?: string }) => d.status === 'maintenance').length,
      };
    });

    return {
      ok: true,
      ts: new Date().toISOString(),
      river_status: alert_count > 0 ? 'Critical' : 'Normal',
      banner_color: alert_count > 0 ? '#d97706' : '#16a34a',
      banner_emoji: alert_count > 0 ? '⚠️' : '✅',
      warn_count: alert_count,
      alert_count: alert_count,
      dev_counts: devCounts,
      devices: transformedDevices,
      device_readings: deviceReadings,
      alerts: transformedAlerts,
      logs: logs,
      map_locations: mapLocations,
      chart_data: chartData,
      device_chart_data: deviceChartData,
      maintenance: [],
      section_conditions: sectionConditions,
    };
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    throw new Error(`Failed to fetch dashboard: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Simulate sensor readings for a device
 * Replaces: av_overview_api_simulate() in PHP
 */
export async function simulateDevice(
  deviceId: string,
  readings: {
    temperature?: number;
    ph_level?: number;
    turbidity?: number;
    dissolved_oxygen?: number;
    water_level?: number;
    sediments?: number;
  }
): Promise<SimulationResponse> {
  const { data, error } = await supabase
    .rpc('dashboard_simulate', {
      p_device_id: deviceId,
      p_temperature: readings.temperature ?? null,
      p_ph_level: readings.ph_level ?? null,
      p_turbidity: readings.turbidity ?? null,
      p_dissolved_oxygen: readings.dissolved_oxygen ?? null,
      p_water_level: readings.water_level ?? null,
      p_sediments: readings.sediments ?? null
    });

  if (error) {
    console.error('Simulation error:', error);
    throw new Error(`Simulation failed: ${error.message}`);
  }

  if (!data || !data.success) {
    throw new Error(data?.error || 'Simulation failed');
  }

  return {
    success: data.success,
    reading_id: data.reading_id,
    device_id: data.device_id,
    device_name: data.device_name,
    river_section: data.river_section,
    readings: data.readings || [],
    alerts_created: data.alerts_created || [],
    timestamp: data.timestamp
  };
}

/**
 * Simulate sensor readings for multiple devices in a single batch
 * Ensures all devices are inserted with the same timestamp
 */
export async function simulateDevicesBatch(
  devicesData: Array<{
    device_id: string;
    temperature?: number;
    ph_level?: number;
    turbidity?: number;
    dissolved_oxygen?: number;
    water_level?: number;
    sediments?: number;
  }>
): Promise<{ success: boolean; results: SimulationResponse[]; errors: string[] }> {
  const { data, error } = await supabase
    .rpc('dashboard_simulate_batch', {
      p_devices_data: devicesData
    });

  if (error) {
    console.error('Batch simulation error:', error);
    throw new Error(`Batch simulation failed: ${error.message}`);
  }

  if (!data || !data.success) {
    throw new Error(data?.error || 'Batch simulation failed');
  }

  return {
    success: data.success,
    results: data.results || [],
    errors: data.errors || []
  };
}

/**
 * Save monitor/simulation state
 * Replaces: av_overview_api_monitor_state() POST in PHP
 */
export async function saveMonitorState(state: {
  running: boolean;
  mode?: string;
  device_id?: string;
  interval?: number;
}): Promise<{ ok: boolean }> {
  const { data, error } = await supabase
    .rpc('dashboard_save_monitor_state', {
      running: state.running,
      mode: state.mode || 'normal',
      device_id: state.device_id || null,
      interval_ms: state.interval || 5000
    });

  if (error) {
    console.error('Save monitor state error:', error);
    throw new Error(`Failed to save state: ${error.message}`);
  }

  return { ok: data?.ok || false };
}

/**
 * Save simulation summary when stopping
 */
export async function saveSimulationSummary(summary: {
  mode: string;
  interval: number;
  total_ticks: number;
  total_alerts: number;
  started_at: string;
  stopped_at: string;
  last_device_id?: string;
  last_device_name?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase
    .rpc('dashboard_save_simulation_summary', {
      p_mode: summary.mode,
      p_interval: summary.interval,
      p_total_ticks: summary.total_ticks,
      p_total_alerts: summary.total_alerts,
      p_started_at: summary.started_at,
      p_stopped_at: summary.stopped_at,
      p_last_device_id: summary.last_device_id || null,
      p_last_device_name: summary.last_device_name || null
    });

  if (error) {
    console.error('Save simulation summary error:', error);
    return { ok: false, error: error.message };
  }

  return { ok: data?.ok || false };
}

/**
 * Load monitor/simulation state
 * Replaces: av_overview_api_monitor_state() GET in PHP
 */
export async function loadMonitorState(): Promise<{ ok: boolean; state?: MonitorState }> {
  const { data, error } = await supabase
    .rpc('dashboard_load_monitor_state');

  if (error) {
    console.error('Load monitor state error:', error);
    throw new Error(`Failed to load state: ${error.message}`);
  }

  if (!data || !data.ok) {
    return { ok: false };
  }

  return {
    ok: true,
    state: {
      running: data.state?.running || false,
      mode: data.state?.mode || 'normal',
      device_id: data.state?.device_id,
      interval: data.state?.interval || 5000,
      started_at: data.state?.started_at,
      started_by: data.state?.started_by
    }
  };
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string, userId: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase
    .rpc('dashboard_acknowledge_alert', {
      alert_id: alertId,
      user_id: userId
    });

  if (error) {
    console.error('Acknowledge alert error:', error);
    return { ok: false, error: error.message };
  }

  return { ok: data?.ok || false, error: data?.error };
}

/**
 * Resolve an alert
 */
export async function resolveAlert(alertId: string, userId: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase
    .rpc('dashboard_resolve_alert', {
      alert_id: alertId,
      user_id: userId
    });

  if (error) {
    console.error('Resolve alert error:', error);
    return { ok: false, error: error.message };
  }

  return { ok: data?.ok || false, error: data?.error };
}

// =====================================================
// Helper Functions
// =====================================================

interface SensorReading {
  value: number;
  recorded_at: string;
  sensors: {
    sensor_type: string;
    device_id: string;
    devices: {
      device_name: string;
      location_id: string;
      locations: {
        location_name: string;
        river_section: string;
      };
    };
  };
}

function processChartData(readings: SensorReading[]) {
  const defaultArray = Array(24).fill(null);
  const chartData = {
    temperature: [...defaultArray],
    pH: [...defaultArray],
    turbidity: [...defaultArray],
    dissolved_oxygen: [...defaultArray],
    water_level: [...defaultArray],
    sediments: [...defaultArray],
  };

  // Group by hour and calculate average
  const hourlyData: Record<string, Record<number, number[]>> = {
    temperature: {},
    ph_level: {},
    turbidity: {},
    dissolved_oxygen: {},
    water_level: {},
    sediments: {},
  };

  readings.forEach((r) => {
    const hour = new Date(r.recorded_at).getHours();
    const sensorType = r.sensors?.sensor_type;
    if (sensorType && hourlyData[sensorType]) {
      if (!hourlyData[sensorType][hour]) hourlyData[sensorType][hour] = [];
      hourlyData[sensorType][hour].push(r.value);
    }
  });

  // Calculate averages
  Object.entries(hourlyData).forEach(([sensorType, hours]) => {
    const key = sensorType === 'ph_level' ? 'pH' : sensorType;
    if (key in chartData) {
      Object.entries(hours).forEach(([hour, values]) => {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        chartData[key as keyof typeof chartData][parseInt(hour)] = parseFloat(avg.toFixed(2));
      });
    }
  });

  return chartData;
}

function processSectionConditions(readings: SensorReading[]) {
  const sections = {
    upstream: {} as Record<string, number>,
    midstream: {} as Record<string, number>,
    downstream: {} as Record<string, number>,
  };

  console.log('[SECTION] Processing', readings.length, 'readings for section conditions');

  // Get latest reading per sensor per section
  const latestReadings: Record<string, Record<string, { value: number; time: number }>> = {
    upstream: {},
    midstream: {},
    downstream: {},
  };

  readings.forEach((r) => {
    const section = r.sensors?.devices?.locations?.river_section || 'upstream';
    const sensorType = r.sensors?.sensor_type;
    
    if (!sensorType) {
      console.log('[SECTION] Skipping reading - no sensor type:', r);
      return;
    }
    
    if (!latestReadings[section as keyof typeof latestReadings]) {
      console.log('[SECTION] Unknown section:', section);
      return;
    }
    
    const time = new Date(r.recorded_at).getTime();
    const existing = latestReadings[section as keyof typeof latestReadings][sensorType];
    if (!existing || time > existing.time) {
      latestReadings[section as keyof typeof latestReadings][sensorType] = {
        value: r.value,
        time,
      };
    }
  });

  // Extract values
  Object.entries(latestReadings).forEach(([section, sensors]) => {
    Object.entries(sensors).forEach(([sensorType, data]) => {
      sections[section as keyof typeof sections][sensorType] = data.value;
    });
  });

  console.log('[SECTION] Final section conditions:', sections);
  return sections;
}

function processDeviceChartData(readings: SensorReading[], devices: { device_id: string; device_name: string }[]) {
  const defaultArray = Array(24).fill(null);
  
  // Initialize all devices with empty chart data (ensures all devices have entries)
  const deviceData: Record<string, {
    temperature: (number | null)[];
    pH: (number | null)[];
    turbidity: (number | null)[];
    dissolved_oxygen: (number | null)[];
    water_level: (number | null)[];
    sediments: (number | null)[];
  }> = {};
  
  devices.forEach((device) => {
    deviceData[device.device_id] = {
      temperature: [...defaultArray],
      pH: [...defaultArray],
      turbidity: [...defaultArray],
      dissolved_oxygen: [...defaultArray],
      water_level: [...defaultArray],
      sediments: [...defaultArray],
    };
  });

  // Group readings by device and hour
  const hourlyData: Record<string, Record<string, Record<number, number[]>>> = {};

  readings.forEach((r) => {
    const deviceId = r.sensors?.device_id;
    if (!deviceId) return;
    
    const hour = new Date(r.recorded_at).getHours();
    const sensorType = r.sensors?.sensor_type;
    if (!sensorType) return;

    if (!hourlyData[deviceId]) hourlyData[deviceId] = {};
    if (!hourlyData[deviceId][sensorType]) hourlyData[deviceId][sensorType] = {};
    if (!hourlyData[deviceId][sensorType][hour]) hourlyData[deviceId][sensorType][hour] = [];
    
    hourlyData[deviceId][sensorType][hour].push(r.value);
  });

  // Calculate averages for each device
  Object.entries(hourlyData).forEach(([deviceId, sensors]) => {
    // Ensure device exists in deviceData (in case reading references non-existent device)
    if (!deviceData[deviceId]) {
      deviceData[deviceId] = {
        temperature: [...defaultArray],
        pH: [...defaultArray],
        turbidity: [...defaultArray],
        dissolved_oxygen: [...defaultArray],
        water_level: [...defaultArray],
        sediments: [...defaultArray],
      };
    }

    Object.entries(sensors).forEach(([sensorType, hours]) => {
      const key = sensorType === 'ph_level' ? 'pH' : sensorType;
      if (key in deviceData[deviceId]) {
        Object.entries(hours).forEach(([hour, values]) => {
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          (deviceData[deviceId] as Record<string, (number | null)[]>)[key][parseInt(hour)] = parseFloat(avg.toFixed(2));
        });
      }
    });
  });

  // Debug logging
  console.log('Device Chart Data Summary:');
  Object.entries(deviceData).forEach(([deviceId, data]) => {
    const hasData = Object.values(data).some(arr => arr.some(v => v !== null));
    const sensorCounts = Object.entries(data).map(([key, arr]) => {
      const count = arr.filter(v => v !== null).length;
      return count > 0 ? `${key}:${count}` : null;
    }).filter(Boolean);
    console.log(`  ${deviceId}: ${hasData ? sensorCounts.join(', ') : 'NO DATA'}`);
  });

  return deviceData;
}

function processDeviceReadings(readings: SensorReading[]) {
  // Get latest reading per sensor per device
  const latestReadings: Record<string, Record<string, { value: number; recorded_at: string }>> = {};

  readings.forEach((r) => {
    const deviceId = r.sensors?.device_id;
    const sensorType = r.sensors?.sensor_type;
    if (!deviceId || !sensorType) return;

    if (!latestReadings[deviceId]) {
      latestReadings[deviceId] = {};
    }

    const time = new Date(r.recorded_at).getTime();
    const existing = latestReadings[deviceId][sensorType];
    if (!existing || time > new Date(existing.recorded_at).getTime()) {
      latestReadings[deviceId][sensorType] = {
        value: r.value,
        recorded_at: r.recorded_at,
      };
    }
  });

  // Convert to DeviceReading format
  const deviceReadings: Record<string, {
    temperature?: number;
    ph_level?: number;
    turbidity?: number;
    dissolved_oxygen?: number;
    water_level?: number;
    sediments?: number;
    recorded_at?: string;
  }> = {};

  Object.entries(latestReadings).forEach(([deviceId, sensors]) => {
    deviceReadings[deviceId] = {
      temperature: sensors.temperature?.value,
      ph_level: sensors.ph_level?.value,
      turbidity: sensors.turbidity?.value,
      dissolved_oxygen: sensors.dissolved_oxygen?.value,
      water_level: sensors.water_level?.value,
      sediments: sensors.sediments?.value,
      recorded_at: Object.values(sensors)[0]?.recorded_at,
    };
  });

  return deviceReadings;
}

function processActivityLogs(readings: SensorReading[]) {
  const unitMap: Record<string, string> = {
    temperature: '°C',
    ph_level: 'pH',
    turbidity: 'NTU',
    dissolved_oxygen: 'mg/L',
    water_level: 'm',
    sediments: 'mg/L',
  };

  // Return last 50 readings formatted for ActivityLogs component
  return readings.slice(0, 50).map((r) => ({
    sensor_type: r.sensors?.sensor_type || 'unknown',
    value: r.value,
    unit: unitMap[r.sensors?.sensor_type] || '',
    recorded_at: r.recorded_at,
    device_name: r.sensors?.devices?.device_name || 'Unknown',
    location_name: r.sensors?.devices?.locations?.location_name || 'Unknown',
  }));
}

// =====================================================
// Real-time Subscriptions
// =====================================================

/**
 * Subscribe to real-time sensor readings
 */
export function subscribeToSensorReadings(
  callback: (reading: { sensor_id: string; value: number; recorded_at: string }) => void
) {
  return supabase
    .channel('sensor-readings-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sensor_readings'
      },
      (payload: { new: Record<string, unknown> }) => {
        const newData = payload.new as { sensor_id: string; value: number; recorded_at: string };
        callback({
          sensor_id: newData.sensor_id,
          value: newData.value,
          recorded_at: newData.recorded_at
        });
      }
    )
    .subscribe();
}

/**
 * Subscribe to real-time alerts
 */
export function subscribeToAlerts(
  callback: (alert: Alert) => void
) {
  return supabase
    .channel('alerts-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'alerts'
      },
      (payload: { new: Record<string, unknown> }) => {
        callback((payload.new as unknown) as Alert);
      }
    )
    .subscribe();
}
