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
 * Get sensor reading history with device info - actual database count
 */
async function getDeviceReadingHistory(hours: number = 24): Promise<TimelineItem[]> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  // Get actual total count
  const { count: totalCount, error: countError } = await supabaseAdmin
    .from('sensor_readings')
    .select('*', { count: 'exact', head: true })
    .gte('recorded_at', cutoffDate.toISOString());

  if (countError) {
    console.error('Error fetching reading count:', countError);
  }

  console.log(`[Activity] Total readings in ${hours}h: ${totalCount}`);

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
    .limit(5000);

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
 * Get recent alerts with device info - actual database count
 */
async function getAlertHistory(limit: number = 5000, hours: number = 24): Promise<TimelineItem[]> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  // Get actual total count
  const { count: totalCount, error: countError } = await supabaseAdmin
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', cutoffDate.toISOString());

  if (countError) {
    console.error('Error fetching alert count:', countError);
  }

  console.log(`[Activity] Total alerts in ${hours}h: ${totalCount}`);

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
 * Get system logs for device and system activities - actual database count
 */
async function getSystemLogs(hours: number = 24): Promise<TimelineItem[]> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  // Get actual total count
  const { count: totalCount, error: countError } = await supabaseAdmin
    .from('system_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', cutoffDate.toISOString());

  if (countError) {
    console.error('Error fetching system log count:', countError);
  }

  console.log(`[Activity] Total system logs in ${hours}h: ${totalCount}`);

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
    .limit(5000);

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
 * Get maintenance logs from operators - actual database count
 */
export async function getMaintenanceLogs(hours: number = 24): Promise<MaintenanceLog[]> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  // Get actual total count
  const { count: totalCount, error: countError } = await supabaseAdmin
    .from('maintenance_logs')
    .select('*', { count: 'exact', head: true })
    .gte('performed_at', cutoffDate.toISOString());

  if (countError) {
    console.error('Error fetching maintenance log count:', countError);
  }

  console.log(`[Activity] Total maintenance logs in ${hours}h: ${totalCount}`);

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
    .limit(5000);

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
 * Get alert statistics with actual database count
 */
export async function getAlertStats(hours: number = 24): Promise<AlertStats> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  // Get actual total count
  const { count: totalCount, error: countError } = await supabaseAdmin
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', cutoffDate.toISOString());

  if (countError) {
    console.error('Error fetching alert count:', countError);
  }

  console.log(`[Activity] Total alerts for stats: ${totalCount}`);

  // Get alert details for categorization
  const { data, error } = await supabaseAdmin
    .from('alerts')
    .select('status, alert_type')
    .gte('created_at', cutoffDate.toISOString())
    .limit(5000);

  if (error) {
    console.error('Error fetching alert stats:', error);
    return { active_alerts: 0, critical_alerts: 0, high_alerts: 0, low_alerts: 0 };
  }

  const alerts = data || [];
  
  // Scale the counts to match actual total
  const fetchedCount = alerts.length;
  const scaleFactor = (totalCount || 0) > fetchedCount && fetchedCount > 0 
    ? (totalCount || 0) / fetchedCount 
    : 1;

  return {
    active_alerts: Math.round(alerts.filter((a: any) => a.status === 'active').length * scaleFactor),
    critical_alerts: Math.round(alerts.filter((a: any) => a.alert_type === 'critical').length * scaleFactor),
    high_alerts: Math.round(alerts.filter((a: any) => a.alert_type === 'high').length * scaleFactor),
    low_alerts: Math.round(alerts.filter((a: any) => a.alert_type === 'low').length * scaleFactor),
  };
}

/**
 * Get reading statistics for the specified time range with actual database count
 */
export async function getReadingStats(hours: number = 24): Promise<ReadingStats> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  // Get actual total count
  const { count: totalCount, error: countError } = await supabaseAdmin
    .from('sensor_readings')
    .select('*', { count: 'exact', head: true })
    .gte('recorded_at', cutoffDate.toISOString());

  if (countError) {
    console.error('Error fetching reading count:', countError);
  }

  console.log(`[Activity] Total readings for stats: ${totalCount}`);

  // Get reading details
  const { data, error } = await supabaseAdmin
    .from('sensor_readings')
    .select('sensor_id, recorded_at')
    .gte('recorded_at', cutoffDate.toISOString())
    .limit(5000);

  if (error) {
    console.error('Error fetching reading stats:', error);
    return { total_readings: totalCount || 0, active_sensors: 0, last_reading: null };
  }

  const readings = data || [];
  const sensorIds = new Set(readings.map((r: any) => r.sensor_id));
  const lastReading = readings.length > 0
    ? readings.sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0].recorded_at
    : null;

  return {
    total_readings: totalCount || readings.length,
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
