/**
 * Reports Service
 * Handles fetching reports and analytics data
 */

import { supabaseAdmin } from '../lib/supabase';
import type {
  SensorStats,
  AlertSummary,
  DeviceActivity,
  DailyTrend,
  SectionStats,
  DeviceReading,
  ReportFilterOptions,
  ReportSummary,
} from '../types/reports.types';

/**
 * Get actual total count of sensor readings (not limited)
 */
export async function getTotalReadingsCount(
  filters: ReportFilterOptions
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - filters.days);

  // Build the base query with proper joins for filtering
  let query = supabaseAdmin
    .from('sensor_readings')
    .select(`
      reading_id,
      sensors:sensor_id(
        sensor_type,
        device_id,
        devices:device_id(
          status,
          location_id,
          locations:location_id(river_section)
        )
      )
    `, { count: 'exact', head: true })
    .gte('recorded_at', cutoffDate.toISOString());

  if (filters.device_id) {
    query = query.eq('sensors.device_id', filters.device_id);
  }
  if (filters.sensor) {
    query = query.eq('sensors.sensor_type', filters.sensor);
  }
  if (filters.section) {
    query = query.eq('sensors.devices.locations.river_section', filters.section);
  }
  if (filters.status) {
    query = query.eq('sensors.devices.status', filters.status);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error getting readings count:', error);
    return 0;
  }

  console.log('[Reports] Actual total readings count:', count);
  return count || 0;
}

/**
 * Get sensor readings statistics with aggregations (no limit)
 */
export async function getSensorReadingsStats(
  filters: ReportFilterOptions
): Promise<SensorStats[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - filters.days);

  let query = supabaseAdmin
    .from('sensor_readings')
    .select(`
      value,
      sensors:sensor_id(
        sensor_type,
        device_id,
        devices:device_id(
          device_id,
          status,
          location_id,
          locations:location_id(river_section)
        )
      )
    `)
    .gte('recorded_at', cutoffDate.toISOString());

  // Apply filters
  if (filters.device_id) {
    query = query.eq('sensors.device_id', filters.device_id);
  }
  if (filters.sensor) {
    query = query.eq('sensors.sensor_type', filters.sensor);
  }
  if (filters.section) {
    query = query.eq('sensors.devices.locations.river_section', filters.section);
  }
  if (filters.status) {
    query = query.eq('sensors.devices.status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching sensor stats:', error);
    return [];
  }

  // Group by sensor type and calculate statistics
  const grouped: Record<string, number[]> = {};
  (data || []).forEach((row: any) => {
    const sensorType = row.sensors?.sensor_type || 'unknown';
    if (!grouped[sensorType]) grouped[sensorType] = [];
    grouped[sensorType].push(row.value);
  });

  return Object.entries(grouped).map(([sensor_type, values]) => {
    const sum = values.reduce((a: number, b: number) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Calculate standard deviation
    const variance = values.reduce((acc: number, val: number) => acc + Math.pow(val - avg, 2), 0) / values.length;
    const std_dev = Math.sqrt(variance);

    return {
      sensor_type,
      total_readings: values.length,
      avg_value: parseFloat(avg.toFixed(2)),
      min_value: parseFloat(min.toFixed(2)),
      max_value: parseFloat(max.toFixed(2)),
      std_dev: parseFloat(std_dev.toFixed(2)),
    };
  });
}

/**
 * Get alert summary by type
 */
export async function getAlertSummary(days: number): Promise<{ summary: AlertSummary[]; actualTotal: number }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // First get the actual count (no row limit)
  const { count: totalCount, error: countError } = await supabaseAdmin
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', cutoffDate.toISOString());

  if (countError) {
    console.error('Error fetching alert count:', countError);
  }

  // Then fetch the data (may be limited to 1000 by Supabase)
  const { data, error } = await supabaseAdmin
    .from('alerts')
    .select('alert_type, status')
    .gte('created_at', cutoffDate.toISOString())
    .limit(100000);

  if (error) {
    console.error('Error fetching alert summary:', error);
    return { summary: [], actualTotal: 0 };
  }

  const alerts = data || [];
  console.log('[Database] Total alerts count:', totalCount || 'unknown', '| Fetched rows:', alerts.length);
  const grouped = alerts.reduce((acc: Record<string, any[]>, alert: any) => {
    if (!acc[alert.alert_type]) acc[alert.alert_type] = [];
    acc[alert.alert_type].push(alert);
    return acc;
  }, {});

  const summary = Object.entries(grouped).map(([alert_type, items]) => {
    const alertItems = items as { status: string }[];
    return {
      alert_type,
      total_alerts: alertItems.length,
      active_alerts: alertItems.filter((a) => a.status === 'active').length,
      resolved_alerts: alertItems.filter((a) => a.status === 'resolved').length,
      acknowledged_alerts: alertItems.filter((a) => a.status === 'acknowledged').length,
    };
  });

  return { summary, actualTotal: totalCount || alerts.length };
}

/**
 * Get device activity report
 */
export async function getDeviceActivity(
  filters: ReportFilterOptions
): Promise<DeviceActivity[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - filters.days);

  let devicesQuery = supabaseAdmin
    .from('devices')
    .select(`
      device_id,
      device_name,
      status,
      sensors:sensors(sensor_id)
    `);

  if (filters.status) {
    devicesQuery = devicesQuery.eq('status', filters.status);
  }
  if (filters.section) {
    devicesQuery = devicesQuery.eq('locations.river_section', filters.section);
  }

  const { data: devicesData, error: devicesError } = await devicesQuery;

  if (devicesError) {
    console.error('Error fetching devices:', devicesError);
    return [];
  }

  const devices = devicesData || [];

  // Get readings for each device
  const deviceActivity = await Promise.all(
    devices.map(async (device: any) => {
      const sensorIds = device.sensors?.map((s: any) => s.sensor_id) || [];
      
      if (sensorIds.length === 0) {
        return {
          device_name: device.device_name,
          device_id: device.device_id,
          status: device.status,
          total_readings: 0,
          last_reading: null,
          active_days: 0,
        };
      }

      let readingsQuery = supabaseAdmin
        .from('sensor_readings')
        .select('recorded_at')
        .gte('recorded_at', cutoffDate.toISOString())
        .in('sensor_id', sensorIds);

      const { data: readingsData } = await readingsQuery;
      const readings = readingsData || [];

      // Calculate unique days
      const uniqueDays = new Set(
        readings.map((r: any) => new Date(r.recorded_at).toDateString())
      );

      const lastReading = readings.length > 0
        ? readings.sort((a: any, b: any) => 
            new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
          )[0].recorded_at
        : null;

      return {
        device_name: device.device_name,
        device_id: device.device_id,
        status: device.status,
        total_readings: readings.length,
        last_reading: lastReading,
        active_days: uniqueDays.size,
      };
    })
  );

  // Filter by device_id if specified
  return filters.device_id
    ? deviceActivity.filter((d) => d.device_id === filters.device_id)
    : deviceActivity;
}

/**
 * Get daily readings trend
 */
export async function getDailyReadingsTrend(
  filters: ReportFilterOptions
): Promise<DailyTrend[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - filters.days);

  let query = supabaseAdmin
    .from('sensor_readings')
    .select(`
      recorded_at,
      sensors:sensor_id(
        sensor_type,
        device_id,
        devices:device_id(
          device_id,
          status,
          location_id,
          locations:location_id(river_section)
        )
      )
    `)
    .gte('recorded_at', cutoffDate.toISOString())
    .order('recorded_at', { ascending: true });

  if (filters.device_id) {
    query = query.eq('sensors.device_id', filters.device_id);
  }
  if (filters.sensor) {
    query = query.eq('sensors.sensor_type', filters.sensor);
  }
  if (filters.section) {
    query = query.eq('sensors.devices.locations.river_section', filters.section);
  }
  if (filters.status) {
    query = query.eq('sensors.devices.status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching daily trend:', error);
    return [];
  }

  console.log('Daily trend raw data:', data?.length || 0, 'records');

  // Group by date
  const grouped = (data || []).reduce((acc: Record<string, number>, row: any) => {
    const date = new Date(row.recorded_at).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const result = Object.entries(grouped)
    .map(([reading_date, total_readings]) => ({
      reading_date,
      total_readings: total_readings as number,
    }))
    .sort((a, b) => a.reading_date.localeCompare(b.reading_date));

  console.log('Daily trend processed:', result);
  return result;
}

/**
 * Get river section statistics
 */
export async function getRiverSectionStats(
  filters: ReportFilterOptions
): Promise<SectionStats[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - filters.days);

  const { data, error } = await supabaseAdmin
    .from('locations')
    .select(`
      river_section,
      devices:devices(
        device_id,
        sensors:sensors(
          sensor_id,
          sensor_type,
          sensor_readings:sensor_readings!inner(
            value,
            recorded_at
          )
        )
      )
    `)
    .not('devices', 'is', null);

  if (error) {
    console.error('Error fetching section stats:', error);
    return [];
  }

  // Process data
  const sections = (data || []).map((loc: any) => {
    let deviceCount = 0;
    let totalReadings = 0;
    const temps: number[] = [];
    const phValues: number[] = [];
    const turbidityValues: number[] = [];

    (loc.devices || []).forEach((device: any) => {
      let hasReadings = false;
      (device.sensors || []).forEach((sensor: any) => {
        (sensor.sensor_readings || []).forEach((reading: any) => {
          const readingDate = new Date(reading.recorded_at);
          if (readingDate >= cutoffDate) {
            hasReadings = true;
            totalReadings++;
            if (sensor.sensor_type === 'temperature') temps.push(reading.value);
            if (sensor.sensor_type === 'ph_level') phValues.push(reading.value);
            if (sensor.sensor_type === 'turbidity') turbidityValues.push(reading.value);
          }
        });
      });
      if (hasReadings) deviceCount++;
    });

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    return {
      river_section: loc.river_section,
      device_count: deviceCount,
      total_readings: totalReadings,
      avg_temp: avg(temps),
      avg_ph: avg(phValues),
      avg_turbidity: avg(turbidityValues),
    };
  });

  return sections.filter((s: SectionStats) => s.total_readings > 0);
}

/**
 * Get device sensor readings with filters
 */
export async function getDeviceSensorReadings(
  filters: ReportFilterOptions,
  limit: number = 100
): Promise<DeviceReading[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - filters.days);

  let query = supabaseAdmin
    .from('sensor_readings')
    .select(`
      reading_id,
      value,
      recorded_at,
      sensors:sensor_id(
        sensor_type,
        unit,
        device_id,
        devices:device_id(
          device_name,
          status,
          location_id,
          locations:location_id(river_section)
        )
      )
    `)
    .gte('recorded_at', cutoffDate.toISOString())
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (filters.device_id) {
    query = query.eq('sensors.device_id', filters.device_id);
  }
  if (filters.sensor) {
    query = query.eq('sensors.sensor_type', filters.sensor);
  }
  if (filters.section) {
    query = query.eq('sensors.devices.locations.river_section', filters.section);
  }
  if (filters.status) {
    query = query.eq('sensors.devices.status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching device readings:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    reading_id: row.reading_id,
    value: row.value,
    recorded_at: row.recorded_at,
    sensor_type: row.sensors?.sensor_type || 'unknown',
    unit: row.sensors?.unit || '',
    device_name: row.sensors?.devices?.device_name || 'Unknown Device',
  }));
}

/**
 * Get all devices for filter dropdown
 */
export async function getDevicesForFilter(): Promise<{ device_id: string; device_name: string; status: string }[]> {
  const { data, error } = await supabaseAdmin
    .from('devices')
    .select('device_id, device_name, status')
    .order('device_name');

  if (error) {
    console.error('Error fetching devices:', error);
    return [];
  }

  return (data || []) as { device_id: string; device_name: string; status: string }[];
}

/**
 * Calculate report summary
 */
export function calculateReportSummary(
  sensorStats: SensorStats[],
  alertSummary: AlertSummary[],
  deviceActivity: DeviceActivity[]
): ReportSummary {
  const totalReadings = sensorStats.reduce((sum, s) => sum + s.total_readings, 0);
  const activeDevices = deviceActivity.filter((d) => d.total_readings > 0).length;
  const totalAlerts = alertSummary.reduce((sum, a) => sum + a.total_alerts, 0);

  return {
    total_readings: totalReadings,
    active_devices: activeDevices,
    total_devices: deviceActivity.length,
    total_alerts: totalAlerts,
    sensor_type_count: sensorStats.length,
  };
}

/**
 * Export report as CSV
 */
export function exportReportToCSV(
  summary: ReportSummary,
  deviceActivity: DeviceActivity[],
  filters: ReportFilterOptions
): string {
  const csvRows = [
    ['Report Period', `Last ${filters.days} Days`],
    ['Generated At', new Date().toLocaleString()],
    [''],
    ['Summary Statistics'],
    ['Total Readings', summary.total_readings.toString()],
    ['Active Devices', `${summary.active_devices}/${summary.total_devices}`],
    ['Total Alerts', summary.total_alerts.toString()],
    [''],
    ['Device Activity'],
    ['Device Name', 'Status', 'Total Readings', 'Active Days', 'Last Reading'],
    ...deviceActivity.map((d) => [
      d.device_name,
      d.status,
      d.total_readings.toString(),
      d.active_days.toString(),
      d.last_reading ? new Date(d.last_reading).toLocaleString() : 'Never',
    ]),
  ];

  return csvRows.map((row) => row.join(',')).join('\n');
}
