/**
 * useActivity Hook
 * Manages activity data fetching and auto-sync
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getActivityTimeline,
  getMaintenanceLogs,
  getAlertStats,
  getReadingStats,
  getDevicesForFilter,
  fetchActivitySync,
} from '../services/activityService';
import { useToast } from '../context/ToastContext';
import type {
  TimelineItem,
  AlertStats,
  ReadingStats,
  MaintenanceLog,
  ActivityFilterOptions,
} from '../types/activity.types';

interface UseActivityReturn {
  timeline: TimelineItem[];
  maintenanceLogs: MaintenanceLog[];
  alertStats: AlertStats;
  readingStats: ReadingStats;
  devices: { device_id: string; device_name: string; status: string }[];
  loading: boolean;
  error: string | null;
  filterOptions: ActivityFilterOptions;
  setFilterOptions: (options: ActivityFilterOptions) => void;
  lastSync: Date | null;
  isSyncing: boolean;
  refresh: () => Promise<void>;
  startSync: (intervalMs?: number) => void;
  stopSync: () => void;
}

export function useActivity(): UseActivityReturn {
  const { showToast } = useToast();
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [alertStats, setAlertStats] = useState<AlertStats>({
    active_alerts: 0,
    critical_alerts: 0,
    high_alerts: 0,
    low_alerts: 0,
  });
  const [readingStats, setReadingStats] = useState<ReadingStats>({
    total_readings: 0,
    active_sensors: 0,
    last_reading: null,
  });
  const [devices, setDevices] = useState<{ device_id: string; device_name: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<ActivityFilterOptions>({
    hours: 24,
    device_id: null,
  });
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncBusyRef = useRef(false);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [timelineData, maintenanceData, alertData, readingData, devicesData] = await Promise.all([
        getActivityTimeline(filterOptions.hours),
        getMaintenanceLogs(filterOptions.hours),
        getAlertStats(),
        getReadingStats(filterOptions.hours),
        getDevicesForFilter(),
      ]);

      setTimeline(timelineData);
      setMaintenanceLogs(maintenanceData);
      setAlertStats(alertData);
      setReadingStats(readingData);
      setDevices(devicesData);
      setLastSync(new Date());
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch activity data';
      setError(errorMsg);
      showToast(`Failed to load activity data: ${errorMsg}`, 'error', 5000);
      console.error('Activity fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filterOptions.hours]);

  const refresh = useCallback(async () => {
    showToast('Refreshing activity data...', 'info', 2000);
    await fetchAllData();
    showToast('Activity data refreshed', 'success', 3000);
  }, [fetchAllData, showToast]);

  const syncNow = useCallback(async () => {
    if (syncBusyRef.current) return;
    syncBusyRef.current = true;
    setIsSyncing(true);
    try {
      const syncData = await fetchActivitySync(filterOptions.hours);
      if (syncData.ok) {
        setTimeline(syncData.timeline);
        setAlertStats(syncData.alert_stats);
        setReadingStats(syncData.reading_stats);
        setLastSync(new Date());
        showToast('Activity data synchronized', 'success', 3000);
      }
    } catch (err) {
      console.error('Sync error:', err);
      showToast('Failed to sync activity data', 'error', 5000);
    } finally {
      syncBusyRef.current = false;
      setIsSyncing(false);
    }
  }, [filterOptions.hours]);

  const stopSync = useCallback(() => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  const startSync = useCallback((intervalMs: number = 10000) => {
    showToast(`Auto-sync started (${intervalMs / 1000}s interval)`, 'info', 3000);
    stopSync();
    syncNow();
    syncTimerRef.current = setInterval(syncNow, intervalMs);
  }, [syncNow, stopSync, showToast]);

  // Initial fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSync();
    };
  }, [stopSync]);

  return {
    timeline,
    maintenanceLogs,
    alertStats,
    readingStats,
    devices,
    loading,
    error,
    filterOptions,
    setFilterOptions,
    lastSync,
    isSyncing,
    refresh,
    startSync,
    stopSync,
  };
}
