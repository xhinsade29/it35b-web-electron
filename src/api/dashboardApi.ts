import { supabase } from '../lib/supabase';
import type { 
  DashboardSyncData, 
  SimulationResponse,
  MonitorState,
  Alert
} from '../types/dashboard.types';

// =====================================================
// Dashboard API Layer
// Replaces PHP endpoints: fetch, simulate, monitor_state
// =====================================================

/**
 * Fetch complete dashboard data
 * Replaces: av_overview_api_fetch() in PHP
 */
export async function fetchDashboard(): Promise<DashboardSyncData> {
  const { data, error } = await supabase
    .rpc('dashboard_fetch');

  if (error) {
    console.error('Dashboard fetch error:', error);
    throw new Error(`Failed to fetch dashboard: ${error.message}`);
  }

  if (!data || !data.ok) {
    throw new Error('Invalid dashboard response');
  }

  // Transform the RPC response to match DashboardSyncData type
  return {
    ok: data.ok,
    ts: data.ts,
    river_status: data.river_status,
    banner_color: data.banner_color,
    banner_emoji: data.banner_emoji,
    warn_count: data.warn_count,
    alert_count: data.alert_count,
    dev_counts: data.dev_counts,
    devices: data.devices || [],
    device_readings: data.device_readings || {},
    alerts: data.alerts || [],
    logs: data.logs || [],
    map_locations: data.map_locations || [],
    chart_data: transformChartData(data.chart_data),
    device_chart_data: data.device_chart_data || {},
    maintenance: data.maintenance || [],
    section_conditions: data.section_conditions || {
      upstream: {},
      midstream: {},
      downstream: {}
    }
  };
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

/**
 * Transform chart data from RPC format to array format (24 hours)
 */
function transformChartData(rawData: Record<string, Array<{ hour: number; avg_val: number }>> | null): {
  temperature: (number | null)[];
  pH: (number | null)[];
  turbidity: (number | null)[];
  dissolved_oxygen: (number | null)[];
  water_level: (number | null)[];
  sediments: (number | null)[];
} {
  const defaultArray = Array(24).fill(null);
  
  if (!rawData) {
    return {
      temperature: [...defaultArray],
      pH: [...defaultArray],
      turbidity: [...defaultArray],
      dissolved_oxygen: [...defaultArray],
      water_level: [...defaultArray],
      sediments: [...defaultArray]
    };
  }

  return {
    temperature: fillHourlyData(rawData.temperature),
    pH: fillHourlyData(rawData.pH),
    turbidity: fillHourlyData(rawData.turbidity),
    dissolved_oxygen: fillHourlyData(rawData.dissolved_oxygen),
    water_level: fillHourlyData(rawData.water_level),
    sediments: fillHourlyData(rawData.sediments)
  };
}

/**
 * Fill hourly data array from sparse database results
 */
function fillHourlyData(hourlyData: Array<{ hour: number; avg_val: number }> | null): (number | null)[] {
  const result = Array(24).fill(null);
  
  if (!hourlyData || !Array.isArray(hourlyData)) {
    return result;
  }

  hourlyData.forEach(item => {
    if (item.hour >= 0 && item.hour < 24 && item.avg_val !== null) {
      result[item.hour] = item.avg_val;
    }
  });

  return result;
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
