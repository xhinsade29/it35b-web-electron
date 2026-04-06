import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { DashboardSyncData, MonitorState } from '../types/dashboard.types';

// ========== DASHBOARD SYNC HOOK ==========
export function useDashboardSync(interval: number = 10000) {
  const [data, setData] = useState<DashboardSyncData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const syncTimerRef = useRef<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch devices with locations
      const { data: devices, error: devicesError } = await supabase
        .from('devices')
        .select('*, locations(*)')
        .eq('status', 'active');
      
      if (devicesError) throw devicesError;

      // Fetch active alerts
      const { data: alerts, error: alertsError } = await supabase
        .from('alerts')
        .select('*, sensors(*, devices(*, locations(*)))')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (alertsError) throw alertsError;

      // Fetch device counts
      const { data: deviceCounts, error: countError } = await supabase
        .from('devices')
        .select('status');
      
      if (countError) throw countError;

      // Calculate counts
      const devCounts = {
        total: deviceCounts?.length || 0,
        active: deviceCounts?.filter((d: { status: string }) => d.status === 'active').length || 0,
        offline: deviceCounts?.filter((d: { status: string }) => d.status === 'inactive').length || 0,
        maint: deviceCounts?.filter((d: { status: string }) => d.status === 'maintenance').length || 0,
      };

      // Fetch map locations
      const { data: mapLocations, error: mapError } = await supabase
        .from('locations')
        .select('*');
      
      if (mapError) throw mapError;

      // Build dashboard data
      const dashboardData: DashboardSyncData = {
        ok: true,
        ts: new Date().toISOString(),
        river_status: 'Normal',
        banner_color: '#16a34a',
        banner_emoji: '✅',
        warn_count: 0,
        alert_count: alerts?.length || 0,
        dev_counts: devCounts,
        device_readings: {},
        devices: (devices || []).map((d: { device_id: string; device_name: string; locations?: { location_name?: string; river_section?: string }; status: string; last_active?: string }) => ({
          device_id: d.device_id,
          device_name: d.device_name,
          location_name: d.locations?.location_name || '',
          river_section: (d.locations?.river_section || 'upstream') as 'upstream' | 'midstream' | 'downstream',
          status: d.status as 'active' | 'inactive' | 'maintenance' | 'offline' | 'unassigned',
          last_active: d.last_active,
        })),
        alerts: (alerts || []).map((a: { alert_id: string; alert_type: string; message: string; created_at: string; sensors?: { sensor_type?: string; devices?: { device_name?: string; locations?: { location_name?: string } } } }) => ({
          alert_id: a.alert_id,
          alert_type: a.alert_type as 'low' | 'high' | 'critical',
          message: a.message,
          created_at: a.created_at,
          device_name: a.sensors?.devices?.device_name || 'Unknown',
          location_name: a.sensors?.devices?.locations?.location_name || 'Unknown',
          sensor_type: a.sensors?.sensor_type || 'unknown',
        })),
        logs: [],
        map_locations: (mapLocations || []).map((l: { location_id: string; location_name: string; river_section: string; latitude: number; longitude: number }) => {
          const locationDevices = (devices || []).filter((d: { locations?: { location_id?: string } }) => d.locations?.location_id === l.location_id);
          return {
            location_id: l.location_id,
            location_name: l.location_name,
            river_section: l.river_section as 'upstream' | 'midstream' | 'downstream',
            latitude: l.latitude,
            longitude: l.longitude,
            total_devices: locationDevices.length,
            active_devices: locationDevices.filter((d: { status?: string }) => d.status === 'active').length,
            maint_devices: locationDevices.filter((d: { status?: string }) => d.status === 'maintenance').length,
          };
        }),
        chart_data: {
          temperature: Array(24).fill(null),
          pH: Array(24).fill(null),
          turbidity: Array(24).fill(null),
          dissolved_oxygen: Array(24).fill(null),
          water_level: Array(24).fill(null),
          sediments: Array(24).fill(null),
        },
        device_chart_data: {},
        maintenance: [],
        section_conditions: {
          upstream: {},
          midstream: {},
          downstream: {},
        },
      };

      setData(dashboardData);
      setLastSync(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Start sync
  useEffect(() => {
    fetchData();
    
    syncTimerRef.current = setInterval(fetchData, interval);
    
    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
      }
    };
  }, [fetchData, interval]);

  return { data, loading, error, lastSync, refetch: fetchData };
}

// ========== SENSOR READINGS HOOK ==========
export function useSensorReadings(deviceId?: string, limit: number = 50) {
  const [readings, setReadings] = useState<Array<{
    sensor_type: string;
    value: number;
    unit: string;
    recorded_at: string;
    min_threshold: number;
    max_threshold: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReadings() {
      try {
        setLoading(true);
        
        let query = supabase
          .from('sensor_readings')
          .select('*, sensors(*)')
          .order('recorded_at', { ascending: false })
          .limit(limit);

        if (deviceId) {
          query = query.eq('sensors.device_id', deviceId);
        }

        const { data, error } = await query;
        
        if (error) throw error;

        const mapped = (data || []).map((r: { sensors?: { sensor_type?: string; unit?: string; min_threshold?: number; max_threshold?: number }; value: number; recorded_at: string }) => ({
          sensor_type: r.sensors?.sensor_type || 'unknown',
          value: r.value,
          unit: r.sensors?.unit || '',
          recorded_at: r.recorded_at,
          min_threshold: r.sensors?.min_threshold || 0,
          max_threshold: r.sensors?.max_threshold || 100,
        }));

        setReadings(mapped);
      } catch (err) {
        console.error('Error fetching readings:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchReadings();
  }, [deviceId, limit]);

  return { readings, loading };
}

// ========== SIMULATION HOOK ==========
export function useSimulation() {
  const [isRunning, setIsRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [lastDevice, setLastDevice] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const simTimerRef = useRef<number | null>(null);

  const addLog = useCallback((message: string, color?: string) => {
    const now = new Date().toLocaleTimeString('en-PH', { hour12: false });
    const logEntry = color ? `[${now}] ${message}` : `[${now}]  ${message}`;
    setLogs(prev => [...prev.slice(-79), logEntry]);
  }, []);

  const simulateReading = useCallback(async (
    deviceId: string,
    mode: 'normal' | 'flood' | 'pollution' | 'drought' = 'normal'
  ) => {
    try {
      // Get device
      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select('*, locations(*)')
        .eq('device_id', deviceId)
        .single();
      
      if (deviceError || !device) {
        addLog(`ERROR Device ${deviceId}: Device not found`, 'var(--crit)');
        return null;
      }

      // Mode configurations
      const modes = {
        normal: {
          temperature: { base: 27, drift: 1.5, min: 24, max: 30 },
          ph_level: { base: 7.2, drift: 0.2, min: 6.8, max: 7.6 },
          turbidity: { base: 20, drift: 8, min: 5, max: 45 },
          dissolved_oxygen: { base: 7.5, drift: 0.5, min: 6.5, max: 8.5 },
          water_level: { base: 1.5, drift: 0.1, min: 1.2, max: 1.8 },
          sediments: { base: 40, drift: 10, min: 10, max: 80 },
        },
        flood: {
          temperature: { base: 26, drift: 1, min: 24, max: 28 },
          ph_level: { base: 6.8, drift: 0.3, min: 6.2, max: 7.2 },
          turbidity: { base: 120, drift: 30, min: 60, max: 200 },
          dissolved_oxygen: { base: 5.5, drift: 0.8, min: 4.0, max: 6.5 },
          water_level: { base: 2.7, drift: 0.2, min: 2.3, max: 3.5 },
          sediments: { base: 350, drift: 80, min: 200, max: 550 },
        },
        pollution: {
          temperature: { base: 29, drift: 1, min: 27, max: 32 },
          ph_level: { base: 5.8, drift: 0.4, min: 5.0, max: 6.8 },
          turbidity: { base: 80, drift: 20, min: 40, max: 130 },
          dissolved_oxygen: { base: 3.5, drift: 0.5, min: 2.5, max: 4.5 },
          water_level: { base: 1.4, drift: 0.1, min: 1.1, max: 1.6 },
          sediments: { base: 200, drift: 60, min: 100, max: 400 },
        },
        drought: {
          temperature: { base: 33, drift: 1.5, min: 30, max: 37 },
          ph_level: { base: 8.0, drift: 0.3, min: 7.5, max: 8.7 },
          turbidity: { base: 8, drift: 3, min: 3, max: 15 },
          dissolved_oxygen: { base: 9.0, drift: 0.5, min: 8.0, max: 10 },
          water_level: { base: 0.4, drift: 0.05, min: 0.3, max: 0.6 },
          sediments: { base: 15, drift: 5, min: 5, max: 30 },
        },
      };

      const config = modes[mode];
      const readings: Record<string, number> = {};
      
      // Generate readings for each sensor type
      for (const [sensorType, cfg] of Object.entries(config)) {
        const value = cfg.base + (Math.random() - 0.5) * cfg.drift;
        readings[sensorType] = Math.max(cfg.min, Math.min(cfg.max, value));
      }

      // Insert readings
      const insertedReadings: Record<string, { value: number; unit: string; reading_id: number }> = {};
      const alertsCreated: Array<{ type: string; message: string }> = [];

      for (const [sensorType, value] of Object.entries(readings)) {
        // Get or create sensor
        const { data: sensor } = await supabase
          .from('sensors')
          .select('sensor_id, unit, min_threshold, max_threshold')
          .eq('device_id', deviceId)
          .eq('sensor_type', sensorType)
          .single();

        if (!sensor) continue;

        // Insert reading
        const { data: reading, error: readingError } = await supabase
          .from('sensor_readings')
          .insert({
            sensor_id: sensor.sensor_id,
            value: parseFloat(value.toFixed(2)),
          })
          .select()
          .single();

        if (readingError) continue;

        insertedReadings[sensorType] = {
          value: value,
          unit: sensor.unit,
          reading_id: reading.reading_id,
        };

        // Check for alerts
        if (value < sensor.min_threshold || value > sensor.max_threshold) {
          const alertType = value < sensor.min_threshold ? 'low' : 'high';
          const label = sensorType.replace('_', ' ');
          const message = `${label} ${alertType}: ${value.toFixed(2)} (safe ${sensor.min_threshold}–${sensor.max_threshold})`;
          
          await supabase.from('alerts').insert({
            sensor_id: sensor.sensor_id,
            reading_id: reading.reading_id,
            alert_type: alertType,
            message: message,
            status: 'active',
          });

          alertsCreated.push({ type: alertType, message });
          setAlertCount(prev => prev + 1);
        }
      }

      // Update device last_active
      await supabase
        .from('devices')
        .update({ last_active: new Date().toISOString() })
        .eq('device_id', deviceId);

      // Log activity
      addLog(
        `✓ #${Object.values(insertedReadings)[0]?.reading_id || 0} ${device.device_name} [${mode.toUpperCase()}] — T:${readings.temperature.toFixed(1)} pH:${readings.ph_level.toFixed(1)} Tu:${readings.turbidity.toFixed(0)} DO:${readings.dissolved_oxygen.toFixed(1)} Lv:${readings.water_level.toFixed(1)} Sed:${readings.sediments.toFixed(0)}`,
        'var(--good)'
      );

      setCount(prev => prev + 1);
      setLastDevice(`${device.device_name}\n${device.locations?.river_section || ''}`);

      return {
        success: true,
        device_name: device.device_name,
        river_section: device.locations?.river_section,
        readings: insertedReadings,
        alerts_created: alertsCreated,
      };
    } catch (err) {
      addLog(`Fetch error Device ${deviceId}: ${err instanceof Error ? err.message : 'Unknown error'}`, 'var(--crit)');
      return null;
    }
  }, [addLog]);

  const startSimulation = useCallback(async (
    deviceIds: string[],
    interval: number = 10000,
    mode: 'normal' | 'flood' | 'pollution' | 'drought' = 'normal'
  ) => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
    }

    addLog(`Started — Mode: ${mode} · interval:${interval/1000}s`, '#7c3aed');
    setIsRunning(true);

    // Run immediately
    for (const deviceId of deviceIds) {
      await simulateReading(deviceId, mode);
    }

    // Set up interval
    simTimerRef.current = setInterval(async () => {
      for (const deviceId of deviceIds) {
        await simulateReading(deviceId, mode);
      }
    }, interval);
  }, [simulateReading, addLog]);

  const stopSimulation = useCallback(() => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    setIsRunning(false);
    addLog('■ Stopped.', 'var(--ink4)');
  }, [addLog]);

  useEffect(() => {
    return () => {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
      }
    };
  }, []);

  return {
    isRunning,
    count,
    alertCount,
    lastDevice,
    logs,
    startSimulation,
    stopSimulation,
  };
}

// ========== MONITOR STATE HOOK ==========
export function useMonitorState() {
  const saveState = useCallback(async (state: MonitorState) => {
    try {
      await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'live_monitor',
          setting_value: JSON.stringify(state),
          setting_type: 'json',
        });
    } catch (err) {
      console.error('Error saving monitor state:', err);
    }
  }, []);

  const loadState = useCallback(async (): Promise<MonitorState | null> => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'live_monitor')
        .single();

      if (error || !data) return null;
      
      return JSON.parse(data.setting_value) as MonitorState;
    } catch (err) {
      console.error('Error loading monitor state:', err);
      return null;
    }
  }, []);

  return { saveState, loadState };
}
