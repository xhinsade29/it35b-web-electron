import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchDashboard,
  saveMonitorState,
  loadMonitorState,
  subscribeToSensorReadings,
  subscribeToAlerts
} from '../api/dashboardApi';
import type { DashboardSyncData, MonitorState } from '../types/dashboard.types';

// =====================================================
// Dashboard Sync Engine Hook
// Replaces PHP sync engine (_syncTimer, startSync, syncNow, _applySync)
// =====================================================

interface DashboardState {
  data: DashboardSyncData | null;
  loading: boolean;
  error: string | null;
  lastSync: Date | null;
  isSyncing: boolean;
}

interface SyncActions {
  refresh: () => Promise<void>;
  startSync: (intervalMs?: number) => void;
  stopSync: () => void;
  saveState: (state: Partial<MonitorState>) => Promise<void>;
}

export function useDashboardSync(initialInterval: number = 10000): [DashboardState, SyncActions] {
  const [state, setState] = useState<DashboardState>({
    data: null,
    loading: true,
    error: null,
    lastSync: null,
    isSyncing: false
  });

  const syncTimerRef = useRef<number | null>(null);
  const isSyncingRef = useRef(false);

  // Fetch dashboard data
  const syncNow = useCallback(async () => {
    if (isSyncingRef.current) return;
    
    isSyncingRef.current = true;
    setState(prev => ({ ...prev, isSyncing: true }));

    try {
      const data = await fetchDashboard();
      
      setState({
        data,
        loading: false,
        error: null,
        lastSync: new Date(),
        isSyncing: false
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
        isSyncing: false
      }));
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // Manual refresh
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    await syncNow();
  }, [syncNow]);

  // Start auto-sync
  const startSync = useCallback((intervalMs: number = initialInterval) => {
    // Stop existing sync first
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
    }
    
    // Initial fetch
    syncNow();
    
    // Set up interval
    syncTimerRef.current = window.setInterval(syncNow, intervalMs);
  }, [syncNow, initialInterval]);

  // Stop auto-sync
  const stopSync = useCallback(() => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  // Save monitor/simulation state
  const saveState = useCallback(async (monitorState: Partial<MonitorState>) => {
    try {
      await saveMonitorState({
        running: monitorState.running ?? false,
        mode: monitorState.mode,
        device_id: monitorState.device_id,
        interval: monitorState.interval
      });
    } catch (err) {
      console.error('Failed to save monitor state:', err);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    syncNow();

    // Cleanup on unmount
    return () => {
      stopSync();
    };
  }, [syncNow, stopSync]);

  return [
    state,
    { refresh, startSync, stopSync, saveState }
  ];
}

// =====================================================
// Real-time Sync Hook with Subscriptions
// Adds real-time updates from Supabase
// =====================================================

export function useRealtimeDashboard(initialInterval: number = 10000) {
  const [state, actions] = useDashboardSync(initialInterval);
  const [newReadings, setNewReadings] = useState<Array<{ sensor_id: string; value: number; recorded_at: string }>>([]);
  const [newAlerts, setNewAlerts] = useState<Array<{ alert_id: string; message: string }>>([]);

  useEffect(() => {
    // Subscribe to new sensor readings
    const readingsSubscription = subscribeToSensorReadings((reading) => {
      setNewReadings(prev => [...prev.slice(-9), reading]); // Keep last 10
      // Trigger a refresh to get updated data
      actions.refresh();
    });

    // Subscribe to new alerts
    const alertsSubscription = subscribeToAlerts((alert) => {
      setNewAlerts(prev => [...prev.slice(-4), { alert_id: alert.alert_id, message: alert.message }]);
      // Trigger a refresh to get updated data
      actions.refresh();
    });

    return () => {
      readingsSubscription.unsubscribe();
      alertsSubscription.unsubscribe();
    };
  }, [actions]);

  return {
    ...state,
    newReadings,
    newAlerts,
    actions
  };
}

// =====================================================
// Monitor State Hook
// Manages simulation/monitor state persistence
// =====================================================

export function useMonitorState() {
  const [state, setState] = useState<MonitorState | null>(null);
  const [loading, setLoading] = useState(true);

  const loadState = useCallback(async () => {
    try {
      setLoading(true);
      const result = await loadMonitorState();
      if (result.ok && result.state) {
        setState(result.state);
      }
    } catch (err) {
      console.error('Failed to load monitor state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateState = useCallback(async (newState: Partial<MonitorState>) => {
    const fullState: MonitorState = {
      running: newState.running ?? state?.running ?? false,
      mode: newState.mode ?? state?.mode ?? 'normal',
      device_id: newState.device_id ?? state?.device_id ?? '',
      interval: newState.interval ?? state?.interval ?? 5000,
      started_at: newState.started_at ?? state?.started_at,
      started_by: newState.started_by ?? state?.started_by
    };

    try {
      await saveMonitorState(fullState);
      setState(fullState);
    } catch (err) {
      console.error('Failed to update monitor state:', err);
    }
  }, [state]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  return {
    state,
    loading,
    loadState,
    updateState
  };
}
