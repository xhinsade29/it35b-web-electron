/**
 * useReports Hook
 * Manages reports data fetching and filtering
 */

import { useState, useEffect, useCallback } from 'react';
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
        getDeviceSensorReadings(filterOptions, 100),
        getDevicesForFilter(),
      ]);

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

  // Calculate summary
  const summary = calculateReportSummary(sensorStats, alertSummary, deviceActivity);

  // Fetch data when filters change
  useEffect(() => {
    fetchAllData();
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
