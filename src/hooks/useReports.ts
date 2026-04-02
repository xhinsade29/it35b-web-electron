/**
 * useReports Hook
 * Manages reports data fetching and filtering with realtime sync
 */

import { useState, useEffect, useCallback } from 'react';
import { supabaseAdmin } from '../lib/supabase';
import {
  getSensorReadingsStats,
  getAlertSummary,
  getDeviceActivity,
  getDailyReadingsTrend,
  getRiverSectionStats,
  getDeviceSensorReadings,
  getDevicesForFilter,
  calculateReportSummary,
  exportReportToCSV,
} from '../services/reportService';
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

interface UseReportsReturn {
  sensorStats: SensorStats[];
  alertSummary: AlertSummary[];
  deviceActivity: DeviceActivity[];
  dailyTrend: DailyTrend[];
  sectionStats: SectionStats[];
  deviceReadings: DeviceReading[];
  devices: { device_id: string; device_name: string; status: string }[];
  summary: ReportSummary;
  loading: boolean;
  error: string | null;
  filterOptions: ReportFilterOptions;
  setFilterOptions: (options: ReportFilterOptions) => void;
  refresh: () => Promise<void>;
  exportCSV: () => string;
}

export function useReports(): UseReportsReturn {
  const [sensorStats, setSensorStats] = useState<SensorStats[]>([]);
  const [alertSummary, setAlertSummary] = useState<AlertSummary[]>([]);
  const [deviceActivity, setDeviceActivity] = useState<DeviceActivity[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);
  const [sectionStats, setSectionStats] = useState<SectionStats[]>([]);
  const [deviceReadings, setDeviceReadings] = useState<DeviceReading[]>([]);
  const [devices, setDevices] = useState<{ device_id: string; device_name: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<ReportFilterOptions>({
    days: 7,
    device_id: null,
    sensor: null,
    section: null,
    status: null,
  });

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[Reports] Fetching data at', new Date().toISOString());
      const [
        sensorData,
        alertData,
        activityData,
        trendData,
        sectionData,
        readingsData,
        devicesData,
      ] = await Promise.all([
        getSensorReadingsStats(filterOptions),
        getAlertSummary(filterOptions.days),
        getDeviceActivity(filterOptions),
        getDailyReadingsTrend(filterOptions),
        getRiverSectionStats(filterOptions),
        getDeviceSensorReadings(filterOptions, 10000000), // No limit - fetch all data
        getDevicesForFilter(),
      ]);

      const calculatedTotal = sensorData.reduce((sum, s) => sum + s.total_readings, 0);
      console.log('[Reports] Sensor stats:', sensorData.length, 'types,', calculatedTotal, 'total readings (filtered)');
      console.log('[Reports] Device activity:', activityData.length, 'devices,', activityData.reduce((s, x) => s + x.total_readings, 0), 'total readings');

      setSensorStats(sensorData);
      setAlertSummary(alertData);
      setDeviceActivity(activityData);
      setDailyTrend(trendData);
      setSectionStats(sectionData);
      setDeviceReadings(readingsData);
      setDevices(devicesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports data');
      console.error('Reports fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filterOptions]);

  const refresh = useCallback(async () => {
    await fetchAllData();
  }, [fetchAllData]);

  const exportCSV = useCallback(() => {
    const summary = calculateReportSummary(sensorStats, alertSummary, deviceActivity);
    return exportReportToCSV(summary, deviceActivity, filterOptions);
  }, [sensorStats, alertSummary, deviceActivity, filterOptions]);

  // Calculate summary using actual deviceActivity total (not limited by sensorStats)
  const actualTotalReadings = deviceActivity.reduce((sum, d) => sum + d.total_readings, 0);
  const summary: ReportSummary = {
    total_readings: actualTotalReadings || sensorStats.reduce((sum, s) => sum + s.total_readings, 0),
    active_devices: deviceActivity.filter((d) => d.total_readings > 0).length,
    total_devices: deviceActivity.length,
    total_alerts: alertSummary.reduce((sum, a) => sum + a.total_alerts, 0),
    sensor_type_count: sensorStats.length,
  };

  // Fetch data when filters change
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Realtime sync with database + polling fallback
  useEffect(() => {
    const channels: ReturnType<typeof supabaseAdmin.channel>[] = [];

    // Subscribe to sensor_readings changes
    const readingsChannel = supabaseAdmin
      .channel('reports-sensor-readings')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        (payload: { new: Record<string, unknown> }) => {
          console.log('[Reports] New sensor reading received:', payload);
          fetchAllData();
        }
      )
      .subscribe((status: string) => {
        console.log('[Reports] sensor_readings subscription status:', status);
      });
    channels.push(readingsChannel);

    // Subscribe to alerts changes
    const alertsChannel = supabaseAdmin
      .channel('reports-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => {
          console.log('[Reports] Alert changed, refreshing...');
          fetchAllData();
        }
      )
      .subscribe();
    channels.push(alertsChannel);

    // Subscribe to devices changes
    const devicesChannel = supabaseAdmin
      .channel('reports-devices')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices' },
        () => {
          console.log('[Reports] Device changed, refreshing...');
          fetchAllData();
        }
      )
      .subscribe();
    channels.push(devicesChannel);

    // Polling fallback - refresh every 5 seconds when visible
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log('[Reports] Polling refresh...');
        fetchAllData();
      }
    }, 5000);

    // Refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Reports] Page visible, refreshing...');
        fetchAllData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also refresh on window focus (more reliable in some browsers)
    const handleFocus = () => {
      console.log('[Reports] Window focused, refreshing...');
      fetchAllData();
    };
    window.addEventListener('focus', handleFocus);

    // Listen for simulation activity via BroadcastChannel
    let simChannel: BroadcastChannel | null = null;
    try {
      simChannel = new BroadcastChannel('aqua-vision-simulation');
      simChannel.onmessage = (event) => {
        if (event.data?.type === 'simulation_tick') {
          console.log('[Reports] Simulation tick detected, refreshing...');
          fetchAllData();
        }
      };
    } catch {
      console.log('[Reports] BroadcastChannel not supported');
    }

    // Cleanup subscriptions on unmount
    return () => {
      channels.forEach(channel => {
        supabaseAdmin.removeChannel(channel);
      });
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      simChannel?.close();
    };
  }, [fetchAllData]);

  return {
    sensorStats,
    alertSummary,
    deviceActivity,
    dailyTrend,
    sectionStats,
    deviceReadings,
    devices,
    summary,
    loading,
    error,
    filterOptions,
    setFilterOptions,
    refresh,
    exportCSV,
  };
}
