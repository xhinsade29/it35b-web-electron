/**
 * Activity Service
 * Handles fetching activity timeline, stats, and maintenance logs
 */

import { supabaseAdmin } from '../lib/supabase';
import type {
  TimelineItem,
  AlertStats,
  ReadingStats,
  MaintenanceLog,
  SyncResponse,
} from '../types/activity.types';

/**
 * Get sensor reading history with device info
 */
async function getDeviceReadingHistory(hours: number = 24): Promise<TimelineItem[]> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  const { data, error } = await supabaseAdmin
    .from('sensor_readings')
    .select(`
      reading_id,
      value,
      recorded_at,
      sensors:sensor_id(
        sensor_type,
        unit,
        device_id,
        devices:device_id(device_name)
      )
    `)
    .gte('recorded_at', cutoffDate.toISOString())
    .order('recorded_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching reading history:', error);
    return [];
  }

  return (data || []).map((r: any) => ({
    type: 'reading' as const,
    timestamp: r.recorded_at,
    device_name: r.sensors?.devices?.device_name || null,
    message: `${r.sensors?.sensor_type || 'Unknown'}: ${r.value} ${r.sensors?.unit || ''}`,
    severity: 'info' as const,
    data: {
      reading_id: r.reading_id,
      value: r.value,
      recorded_at: r.recorded_at,
      sensor_type: r.sensors?.sensor_type || 'unknown',
      unit: r.sensors?.unit || '',
    },
  }));
}

/**
 * Get recent alerts with device info
 */
async function getAlertHistory(limit: number = 50, hours: number = 24): Promise<TimelineItem[]> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  const { data, error } = await supabaseAdmin
    .from('alerts')
    .select(`
      alert_id,
      alert_type,
      message,
      status,
      created_at,
      acknowledged_at,
      resolved_at,
      sensors:sensor_id(
        sensor_type,
        unit,
        devices:device_id(device_name)
      )
    `)
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching alert history:', error);
    return [];
  }

  return (data || []).map((a: any) => ({
    type: 'alert' as const,
    timestamp: a.created_at,
    device_name: a.sensors?.devices?.device_name || 'Unknown',
    message: a.message,
    severity: a.alert_type,
    status: a.status,
    data: {
      alert_id: a.alert_id,
      alert_type: a.alert_type,
      message: a.message,
      status: a.status,
      created_at: a.created_at,
      acknowledged_at: a.acknowledged_at,
      resolved_at: a.resolved_at,
      device_name: a.sensors?.devices?.device_name || 'Unknown',
      sensor_type: a.sensors?.sensor_type || 'unknown',
      unit: a.sensors?.unit || '',
    },
  }));
}

/**
 * Get system logs for device and system activities
 */
async function getSystemLogs(hours: number = 24): Promise<TimelineItem[]> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  const { data, error } = await supabaseAdmin
    .from('system_logs')
    .select(`
      log_id,
      action,
      details,
      ip_address,
      created_at,
      users:user_id(
        username,
        full_name
      )
    `)
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching system logs:', error);
    return [];
  }

  return (data || []).map((log: any) => {
    const isDeviceLog = ['DEVICE_CREATE', 'DEVICE_UPDATE', 'DEVICE_DELETE'].includes(log.action);
    
    return {
      type: isDeviceLog ? ('device' as const) : ('system' as const),
      timestamp: log.created_at,
      action: log.action,
      message: log.details,
      user: log.users?.full_name || log.users?.username || 'System',
      ip: log.ip_address,
      severity: 'info' as const,
      data: {
        log_id: log.log_id,
        action: log.action,
        details: log.details,
        ip_address: log.ip_address,
        created_at: log.created_at,
        username: log.users?.username,
        full_name: log.users?.full_name,
      },
    };
  });
}

/**
 * Get combined activity timeline
 */
export async function getActivityTimeline(hours: number = 24): Promise<TimelineItem[]> {
  const [readings, alerts, systemLogs] = await Promise.all([
    getDeviceReadingHistory(hours),
    getAlertHistory(50, hours),
    getSystemLogs(hours),
  ]);

  // Combine and sort by timestamp descending
  const timeline = [...readings, ...alerts, ...systemLogs];
  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return timeline.slice(0, 100);
}

/**
 * Get maintenance logs from operators
 */
export async function getMaintenanceLogs(hours: number = 24): Promise<MaintenanceLog[]> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  const { data, error } = await supabaseAdmin
    .from('maintenance_logs')
    .select(`
      maintenance_id,
      maintenance_type,
      notes,
      damage_level,
      malfunction_type,
      performed_at,
      devices:device_id(
        device_id,
        device_name
      ),
      users:performed_by(
        user_id,
        full_name
      )
    `)
    .gte('performed_at', cutoffDate.toISOString())
    .order('performed_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching maintenance logs:', error);
    return [];
  }

  return (data || []).map((log: any) => ({
    maintenance_id: log.maintenance_id,
    maintenance_type: log.maintenance_type,
    notes: log.notes,
    damage_level: log.damage_level,
    malfunction_type: log.malfunction_type,
    performed_at: log.performed_at,
    device_name: log.devices?.device_name || 'Unknown Device',
    device_id: log.devices?.device_id || '',
    operator_name: log.users?.full_name || 'Unknown Operator',
    user_id: log.users?.user_id || '',
  }));
}

/**
 * Get alert statistics
 */
export async function getAlertStats(): Promise<AlertStats> {
  const { data, error } = await supabaseAdmin
    .from('alerts')
    .select('status, alert_type');

  if (error) {
    console.error('Error fetching alert stats:', error);
    return { active_alerts: 0, critical_alerts: 0, high_alerts: 0, low_alerts: 0 };
  }

  const alerts = data || [];
  
  return {
    active_alerts: alerts.filter((a: any) => a.status === 'active').length,
    critical_alerts: alerts.filter((a: any) => a.alert_type === 'critical').length,
    high_alerts: alerts.filter((a: any) => a.alert_type === 'high').length,
    low_alerts: alerts.filter((a: any) => a.alert_type === 'low').length,
  };
}

/**
 * Get reading statistics for the specified time range
 */
export async function getReadingStats(hours: number = 24): Promise<ReadingStats> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  const { data, error } = await supabaseAdmin
    .from('sensor_readings')
    .select('sensor_id, recorded_at')
    .gte('recorded_at', cutoffDate.toISOString());

  if (error) {
    console.error('Error fetching reading stats:', error);
    return { total_readings: 0, active_sensors: 0, last_reading: null };
  }

  const readings = data || [];
  const sensorIds = new Set(readings.map((r: any) => r.sensor_id));
  const lastReading = readings.length > 0
    ? readings.sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0].recorded_at
    : null;

  return {
    total_readings: readings.length,
    active_sensors: sensorIds.size,
    last_reading: lastReading,
  };
}

/**
 * Fetch all data for sync endpoint (matches PHP ?action=fetch)
 */
export async function fetchActivitySync(hours: number = 24): Promise<SyncResponse> {
  const [timeline, alertStats, readingStats] = await Promise.all([
    getActivityTimeline(hours),
    getAlertStats(),
    getReadingStats(hours),
  ]);

  return {
    ok: true,
    timeline,
    alert_stats: alertStats,
    reading_stats: readingStats,
    timestamp: new Date().toISOString(),
  };
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
