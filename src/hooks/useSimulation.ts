import { useState, useCallback, useRef, useEffect } from 'react';
import {
  simulateDevicesBatch,
  simulateDevice,
  saveMonitorState,
  ensureAllDeviceSensors,
  saveSimulationSummary,
  loadMonitorState,
} from '../api/dashboardApi';
import { supabase } from '../lib/supabase';
import { useDashboardSync } from './useDashboardSync';
import type { SimulationResponse } from '../types/dashboard.types';

// =====================================================
// Simulation Engine Hook
// Replaces PHP simulation engine (MODES, _initDs, _next, _sendTick)
// Note: Simulation persists across page navigation until explicitly stopped
// =====================================================

export type SimulationMode = 'normal' | 'flood' | 'pollution' | 'drought';

// LocalStorage keys for persistent simulation state
const SIM_STORAGE_KEY = 'aqua-vision-simulation-state';
const SIM_STORAGE_LOGS = 'aqua-vision-simulation-logs';

interface PersistedSimulationState {
  isRunning: boolean;
  mode: SimulationMode;
  interval: number;
  tickCount: number;
  alertCount: number;
  deviceIds: string[];
  lastDeviceId?: string;
  lastDeviceName?: string;
  startedAt?: string;
}

interface SensorConfig {
  base: number;
  drift: number;
  min: number;
  max: number;
}

interface ModeConfig {
  temperature: SensorConfig;
  ph_level: SensorConfig;
  turbidity: SensorConfig;
  dissolved_oxygen: SensorConfig;
  water_level: SensorConfig;
  sediments: SensorConfig;
}

// Global timer reference that persists across hook instances
// This allows the simulation to continue even when component unmounts
let globalTimerRef: number | null = null;
let globalIsRunning = false;

// Mode configurations matching PHP MODES
const MODE_CONFIGS: Record<SimulationMode, ModeConfig> = {
  normal: {
    temperature: { base: 27, drift: 1.5, min: 24, max: 30 },
    ph_level: { base: 7.2, drift: 0.2, min: 6.8, max: 7.6 },
    turbidity: { base: 20, drift: 8, min: 5, max: 45 },
    dissolved_oxygen: { base: 7.5, drift: 0.5, min: 6.5, max: 8.5 },
    water_level: { base: 1.5, drift: 0.1, min: 1.2, max: 1.8 },
    sediments: { base: 40, drift: 10, min: 10, max: 80 }
  },
  flood: {
    temperature: { base: 26, drift: 1, min: 24, max: 28 },
    ph_level: { base: 6.8, drift: 0.3, min: 6.2, max: 7.2 },
    turbidity: { base: 120, drift: 30, min: 60, max: 200 },
    dissolved_oxygen: { base: 5.5, drift: 0.8, min: 4.0, max: 6.5 },
    water_level: { base: 2.7, drift: 0.2, min: 2.3, max: 3.5 },
    sediments: { base: 350, drift: 80, min: 200, max: 550 }
  },
  pollution: {
    temperature: { base: 29, drift: 1, min: 27, max: 32 },
    ph_level: { base: 5.8, drift: 0.4, min: 5.0, max: 6.8 },
    turbidity: { base: 80, drift: 20, min: 40, max: 130 },
    dissolved_oxygen: { base: 3.5, drift: 0.5, min: 2.5, max: 4.5 },
    water_level: { base: 1.4, drift: 0.1, min: 1.1, max: 1.6 },
    sediments: { base: 200, drift: 60, min: 100, max: 400 }
  },
  drought: {
    temperature: { base: 33, drift: 1.5, min: 30, max: 37 },
    ph_level: { base: 8.0, drift: 0.3, min: 7.5, max: 8.7 },
    turbidity: { base: 8, drift: 3, min: 3, max: 15 },
    dissolved_oxygen: { base: 9.0, drift: 0.5, min: 8.0, max: 10 },
    water_level: { base: 0.4, drift: 0.05, min: 0.3, max: 0.6 },
    sediments: { base: 15, drift: 5, min: 5, max: 30 }
  }
};

interface SimulationLog {
  id: string;
  timestamp: string;
  deviceId: string;
  deviceName: string;
  mode: SimulationMode;
  message: string;
  type: 'success' | 'alert' | 'error';
  readings?: Record<string, number>;
}

interface SimulationState {
  isRunning: boolean;
  mode: SimulationMode;
  interval: number;
  tickCount: number;
  alertCount: number;
  logs: SimulationLog[];
  lastDeviceId?: string;
  lastDeviceName?: string;
}

export function useSimulationEngine(deviceIds: string[]) {
  // Load persisted state on init
  const loadPersistedState = (): Partial<SimulationState> => {
    try {
      const saved = localStorage.getItem(SIM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PersistedSimulationState;
        return {
          isRunning: parsed.isRunning,
          mode: parsed.mode,
          interval: parsed.interval,
          tickCount: parsed.tickCount,
          alertCount: parsed.alertCount,
          lastDeviceId: parsed.lastDeviceId,
          lastDeviceName: parsed.lastDeviceName,
        };
      }
    } catch {
      // Ignore storage errors
    }
    return {};
  };

  const loadPersistedLogs = (): SimulationLog[] => {
    try {
      const saved = localStorage.getItem(SIM_STORAGE_LOGS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore storage errors
    }
    return [];
  };

  const persisted = loadPersistedState();

  const [state, setState] = useState<SimulationState>({
    isRunning: persisted.isRunning || false,
    mode: persisted.mode || 'normal',
    interval: persisted.interval || 5000,
    tickCount: persisted.tickCount || 0,
    alertCount: persisted.alertCount || 0,
    logs: loadPersistedLogs(),
    lastDeviceId: persisted.lastDeviceId,
    lastDeviceName: persisted.lastDeviceName,
  });

  // Device-specific modes (distributed round-robin)
  const deviceModesRef = useRef<Record<string, SimulationMode>>({});
  const deviceStatesRef = useRef<Record<string, Record<string, number>>>({});
  // Use global timer reference so simulation persists across component unmount
  const timerRef = useRef<number | null>(globalTimerRef);
  const isRunningRef = useRef(globalIsRunning);
  const lastRefreshRef = useRef<number>(0);
  const deviceIdsRef = useRef<string[]>(deviceIds);

  const [dashboardState, dashboardActions] = useDashboardSync();

  // Persist state to localStorage whenever it changes
  const persistState = useCallback((newState: SimulationState, devIds: string[]) => {
    try {
      const toSave: PersistedSimulationState = {
        isRunning: newState.isRunning,
        mode: newState.mode,
        interval: newState.interval,
        tickCount: newState.tickCount,
        alertCount: newState.alertCount,
        deviceIds: devIds,
        lastDeviceId: newState.lastDeviceId,
        lastDeviceName: newState.lastDeviceName,
        startedAt: newState.logs.find(l => l.message.includes('Started'))?.timestamp || new Date().toISOString(),
      };
      localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(toSave));
      localStorage.setItem(SIM_STORAGE_LOGS, JSON.stringify(newState.logs.slice(-80)));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Update global refs when deviceIds change
  useEffect(() => {
    deviceIdsRef.current = deviceIds;
  }, [deviceIds]);

  // Initialize device modes (distributed round-robin like PHP)
  const assignDeviceModes = useCallback(() => {
    const modes: SimulationMode[] = ['normal', 'flood', 'pollution', 'drought'];
    deviceIds.forEach((id, index) => {
      deviceModesRef.current[id] = modes[index % modes.length];
    });
  }, [deviceIds]);

  // Initialize device state for a mode
  const initDeviceState = useCallback((deviceId: string, mode: SimulationMode) => {
    const config = MODE_CONFIGS[mode];
    deviceStatesRef.current[deviceId] = {};
    
    Object.entries(config).forEach(([key, cfg]) => {
      const variation = (Math.random() - 0.5) * cfg.drift;
      deviceStatesRef.current[deviceId][key] = parseFloat((cfg.base + variation).toFixed(2));
    });
  }, []);

  // Generate next value for a sensor - always returns number
  const getNextValue = useCallback((deviceId: string, sensorType: keyof ModeConfig): number => {
    const mode = deviceModesRef.current[deviceId] || 'normal';
    const config = MODE_CONFIGS[mode][sensorType];
    
    if (!config) return 0;
    
    if (!deviceStatesRef.current[deviceId]) {
      initDeviceState(deviceId, mode);
    }
    
    const currentValue = deviceStatesRef.current[deviceId][sensorType];
    const drift = config.drift * 0.35;
    const variation = (Math.random() - 0.5) * drift;
    let newValue = currentValue + variation;
    
    // Clamp to min/max
    newValue = Math.max(config.min, Math.min(config.max, newValue));
    newValue = parseFloat(newValue.toFixed(2));
    
    deviceStatesRef.current[deviceId][sensorType] = newValue;
    return newValue;
  }, [initDeviceState]);

  // Add log entry
  const addLog = useCallback((log: Omit<SimulationLog, 'id' | 'timestamp'>) => {
    const entry: SimulationLog = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };
    
    setState(prev => {
      const newState = {
        ...prev,
        logs: [...prev.logs.slice(-79), entry] // Keep last 80 logs
      };
      // Persist logs immediately
      try {
        localStorage.setItem(SIM_STORAGE_LOGS, JSON.stringify(newState.logs));
      } catch {
        // Ignore storage errors
      }
      return newState;
    });
  }, []);

  // Execute a simulation tick for all devices
  const executeTick = useCallback(async () => {
    // Guard: don't execute if simulation has been stopped
    if (!globalIsRunning) {
      console.log('executeTick: skipped - not running');
      return;
    }

    // Use current device IDs from ref
    const currentDeviceIds = deviceIdsRef.current;

    if (currentDeviceIds.length === 0) {
      addLog({
        deviceId: '',
        deviceName: 'System',
        mode: state.mode,
        message: 'No active devices.',
        type: 'error'
      });
      return;
    }

    console.log(`[SIMULATION] Starting batch tick for ${currentDeviceIds.length} devices`);

    // Prepare all device data first
    const devicesData = currentDeviceIds.map(deviceId => {
      return {
        device_id: deviceId,
        temperature: getNextValue(deviceId, 'temperature'),
        ph_level: getNextValue(deviceId, 'ph_level'),
        turbidity: getNextValue(deviceId, 'turbidity'),
        dissolved_oxygen: getNextValue(deviceId, 'dissolved_oxygen'),
        water_level: getNextValue(deviceId, 'water_level'),
        sediments: getNextValue(deviceId, 'sediments')
      };
    });

    console.log('[SIMULATION] Batch data prepared:', devicesData);

    try {
      // Send all devices in a single batch API call
      const batchResult = await simulateDevicesBatch(devicesData);
      
      console.log('[SIMULATION] Batch result:', batchResult);

      // Broadcast simulation tick to other tabs/components
      try {
        const bc = new BroadcastChannel('aqua-vision-simulation');
        bc.postMessage({ type: 'simulation_tick', timestamp: Date.now() });
        bc.close();
      } catch {
        // BroadcastChannel not supported, ignore
      }
      
      // Process results
      let alertCount = 0;
      let lastSuccess: SimulationResponse | null = null;
      
      batchResult.results.forEach((result, index) => {
        const deviceId = devicesData[index].device_id;
        const mode = deviceModesRef.current[deviceId] || 'normal';
        const readings = devicesData[index];
        
        if (!result.success) {
          addLog({
            deviceId,
            deviceName: result.device_name || 'Unknown',
            mode,
            message: `Error: ${result.reading_id}`,
            type: 'error'
          });
          return;
        }
        
        lastSuccess = result;
        
        // Log alerts and save to database
        if (result.alerts_created && result.alerts_created.length > 0) {
          console.log('[SIMULATION] Alerts created for', result.device_name, ':', result.alerts_created);
          result.alerts_created.forEach(async (alert) => {
            const alertMessage = `${alert.sensor_type}: ${alert.value} (threshold: ${alert.threshold})`;
            addLog({
              deviceId,
              deviceName: result.device_name,
              mode,
              message: `⚠ ALERT [${alert.type.toUpperCase()}] ${alertMessage}`,
              type: 'alert'
            });

            // Insert alert into database - need to find actual sensor_id and reading_id (UUID)
            try {
              // First, get the sensor_id for this device and sensor_type
              const { data: sensorData, error: sensorError } = await supabase
                .from('sensors')
                .select('sensor_id')
                .eq('device_id', deviceId)
                .eq('sensor_type', alert.sensor_type)
                .single();

              if (sensorError || !sensorData) {
                console.error('[SIMULATION] Could not find sensor for device', deviceId, 'type', alert.sensor_type, sensorError);
                return;
              }

              // Get the most recent reading for this sensor (the one we just created)
              const { data: readingData, error: readingError } = await supabase
                .from('sensor_readings')
                .select('reading_id')
                .eq('sensor_id', sensorData.sensor_id)
                .order('recorded_at', { ascending: false })
                .limit(1)
                .single();

              if (readingError || !readingData) {
                console.error('[SIMULATION] Could not find reading for sensor', sensorData.sensor_id, readingError);
                return;
              }

              const { error } = await supabase
                .from('alerts')
                .insert({
                  sensor_id: sensorData.sensor_id,
                  reading_id: readingData.reading_id,
                  alert_type: alert.type || 'high',
                  message: `${result.device_name}: ${alert.sensor_type} is ${alert.value} (threshold: ${alert.threshold})`,
                  status: 'active',
                  created_at: new Date().toISOString()
                });
              if (error) {
                console.error('[SIMULATION] Failed to insert alert:', error);
              } else {
                console.log('[SIMULATION] Alert inserted successfully for sensor', sensorData.sensor_id, 'reading', readingData.reading_id);
              }
            } catch (err) {
              console.error('[SIMULATION] Error inserting alert:', err);
            }
          });
          alertCount += result.alerts_created.length;
        } else {
          console.log('[SIMULATION] No alerts created for', result.device_name);
        }
        
        // Log success - extract readings without device_id
        const deviceReadings = {
          temperature: readings.temperature,
          ph_level: readings.ph_level,
          turbidity: readings.turbidity,
          dissolved_oxygen: readings.dissolved_oxygen,
          water_level: readings.water_level,
          sediments: readings.sediments
        };
        addLog({
          deviceId,
          deviceName: result.device_name,
          mode,
          message: `✓ #${result.reading_id} ${result.device_name} [${mode.toUpperCase()}] — T:${deviceReadings.temperature} pH:${deviceReadings.ph_level} Tu:${deviceReadings.turbidity} DO:${deviceReadings.dissolved_oxygen} Lv:${deviceReadings.water_level} Sed:${deviceReadings.sediments}`,
          type: 'success',
          readings: deviceReadings
        });
      });
      
      // Update alert count and refresh dashboard to show new alerts
      if (alertCount > 0) {
        setState(prev => {
          const newState = {
            ...prev,
            alertCount: prev.alertCount + alertCount
          };
          persistState(newState, deviceIdsRef.current);
          return newState;
        });
        // Force dashboard refresh to show new alerts
        console.log('[SIMULATION] Refreshing dashboard to show', alertCount, 'new alerts');
        dashboardActions.refresh().catch(() => {});
      }
      
      // Update last device info
      if (lastSuccess) {
        const success = lastSuccess as SimulationResponse;
        setState(prev => {
          const newState = {
            ...prev,
            lastDeviceId: success.device_id,
            lastDeviceName: success.device_name
          };
          persistState(newState, deviceIdsRef.current);
          return newState;
        });
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[SIMULATION] Batch error:', err);
      addLog({
        deviceId: '',
        deviceName: 'System',
        mode: 'normal',
        message: `Batch error: ${errorMessage}`,
        type: 'error'
      });
    }
    
    // Guard: don't update state if simulation was stopped during execution
    if (!globalIsRunning) {
      console.log('executeTick: stopped during execution');
      return;
    }
    
    // Increment tick count
    setState(prev => {
      const newState = {
        ...prev,
        tickCount: prev.tickCount + 1
      };
      persistState(newState, deviceIdsRef.current);
      return newState;
    });

    // Refresh dashboard data only if still running and enough time has passed
    if (globalIsRunning) {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshRef.current;
      const refreshInterval = Math.max(8000, state.interval * 1.5);
      
      if (timeSinceLastRefresh >= refreshInterval) {
        lastRefreshRef.current = now;
        // Wait 2 seconds for data to be committed, then refresh
        setTimeout(() => {
          if (globalIsRunning) {
            dashboardActions.refresh().catch(() => {});
          }
        }, 2000);
      }
    }
  }, [state.mode, state.interval, getNextValue, addLog, dashboardActions]);

  // Simple interval-based simulation with proper cleanup
  const start = useCallback(async (mode?: SimulationMode, interval?: number) => {
    const simMode = mode || state.mode;
    const simInterval = interval || state.interval;

    // Stop any existing simulation first
    if (globalTimerRef) {
      clearInterval(globalTimerRef);
      globalTimerRef = null;
    }
    globalIsRunning = false;

    // Ensure all devices have required sensors BEFORE starting
    console.log('[SIMULATION] Checking sensors for all devices...');
    await ensureAllDeviceSensors(deviceIdsRef.current);

    // Small delay to ensure any pending async operations complete
    setTimeout(() => {
      // Reset state
      globalIsRunning = true;
      isRunningRef.current = true;
      
      // Assign modes to devices
      assignDeviceModes();

      // Initialize states
      deviceIdsRef.current.forEach(id => {
        const deviceMode = deviceModesRef.current[id] || simMode;
        initDeviceState(id, deviceMode);
      });

      addLog({
        deviceId: '',
        deviceName: 'System',
        mode: simMode,
        message: `Started — Mixed Modes · interval:${simInterval / 1000}s`,
        type: 'success'
      });

      // Set state and persist
      setState(prev => {
        const newState = {
          ...prev,
          isRunning: true,
          mode: simMode,
          interval: simInterval
        };
        persistState(newState, deviceIdsRef.current);
        return newState;
      });

      // Save state to server (fire-and-forget)
      saveMonitorState({
        running: true,
        mode: simMode,
        interval: simInterval
      }).catch(err => {
        console.warn('Failed to save monitor state (non-critical):', err);
      });

      // Execute first tick immediately
      executeTick();

      // Set up interval for subsequent ticks
      globalTimerRef = window.setInterval(() => {
        if (!globalIsRunning) {
          console.log('Interval: simulation not running, clearing');
          if (globalTimerRef) {
            clearInterval(globalTimerRef);
            globalTimerRef = null;
          }
          return;
        }
        executeTick();
      }, simInterval);
      
      // Sync the local ref
      timerRef.current = globalTimerRef;
    }, 100);
  }, [state.mode, state.interval, assignDeviceModes, initDeviceState, addLog, executeTick, persistState]);

  // Stop simulation
  const stop = useCallback(() => {
    console.log('STOP called - clearing interval and setting flags');
    
    // Clear the interval first
    if (globalTimerRef !== null) {
      clearInterval(globalTimerRef);
      globalTimerRef = null;
      timerRef.current = null;
      console.log('Interval cleared');
    }
    
    // Set running flags false
    globalIsRunning = false;
    isRunningRef.current = false;
    
    // Update state immediately and persist
    setState(prev => {
      const newState = {
        ...prev,
        isRunning: false,
        tickCount: prev.tickCount
      };
      persistState(newState, deviceIdsRef.current);
      return newState;
    });
    
    console.log('Simulation stopped');

    addLog({
      deviceId: '',
      deviceName: 'System',
      mode: state.mode,
      message: '■ Stopped.',
      type: 'error'
    });

    // Save state to server (fire-and-forget)
    saveMonitorState({
      running: false,
      mode: state.mode,
      interval: state.interval
    }).catch(() => {});

    // Insert simulation summary (non-blocking)
    (async () => {
      try {
        await saveSimulationSummary({
          mode: state.mode,
          interval: state.interval,
          total_ticks: state.tickCount,
          total_alerts: state.alertCount,
          started_at: state.logs.find(log => log.message.includes('Started'))?.timestamp || new Date().toISOString(),
          stopped_at: new Date().toISOString(),
          last_device_id: state.lastDeviceId,
          last_device_name: state.lastDeviceName
        });
        addLog({
          deviceId: '',
          deviceName: 'System',
          mode: state.mode,
          message: '✓ Summary saved',
          type: 'success'
        });
      } catch (err) {
        console.error('Failed to save summary:', err);
      }
    })();
    
    // Clear persisted state
    try {
      localStorage.removeItem(SIM_STORAGE_KEY);
      localStorage.removeItem(SIM_STORAGE_LOGS);
    } catch {
      // Ignore storage errors
    }
  }, [state.mode, state.interval, state.tickCount, state.alertCount, state.lastDeviceId, state.lastDeviceName, state.logs, addLog, persistState]);

  // Update mode (restart if running)
  const setMode = useCallback((mode: SimulationMode) => {
    setState(prev => {
      const newState = { ...prev, mode };
      persistState(newState, deviceIdsRef.current);
      return newState;
    });
    
    if (globalIsRunning && globalTimerRef) {
      // Restart with new mode
      start(mode, state.interval);
    }
  }, [start, state.interval, persistState]);

  // Update interval (restart if running)
  const setInterval = useCallback((interval: number) => {
    setState(prev => {
      const newState = { ...prev, interval };
      persistState(newState, deviceIdsRef.current);
      return newState;
    });
    
    if (globalIsRunning && globalTimerRef) {
      // Restart with new interval
      start(state.mode, interval);
    }
  }, [start, state.mode, persistState]);

  // Cleanup on unmount - DO NOT STOP SIMULATION
  // This allows simulation to continue running when user navigates away
  useEffect(() => {
    return () => {
      // Only sync the refs, don't stop the simulation
      timerRef.current = globalTimerRef;
      isRunningRef.current = globalIsRunning;
      console.log('Unmounting - simulation continues in background');
    };
  }, []);

  // Load saved state on mount - check localStorage and server state
  // This runs ONCE on mount and uses refs to access current values
  useEffect(() => {
    // Small delay to ensure deviceIds are loaded
    const initTimeout = setTimeout(() => {
      const loadSavedState = async () => {
        try {
          // First check if simulation is already running via global timer
          if (globalIsRunning && globalTimerRef) {
            console.log('[SIMULATION] Already running globally, taking over timer');
            
            // Clear old timer and restart with current instance's functions
            clearInterval(globalTimerRef);
            globalTimerRef = null;
            
            // Load persisted state to get current settings
            let savedMode: SimulationMode = 'normal';
            let savedInterval = 5000;
            try {
              const saved = localStorage.getItem(SIM_STORAGE_KEY);
              if (saved) {
                const parsed = JSON.parse(saved) as PersistedSimulationState;
                savedMode = parsed.mode || 'normal';
                savedInterval = parsed.interval || 5000;
              }
            } catch {
              // Ignore
            }
            
            // Sync state and restart timer with current instance
            setState(prev => ({
              ...prev,
              isRunning: true,
              mode: savedMode,
              interval: savedInterval
            }));
            
            // Restart timer with current executeTick
            globalTimerRef = window.setInterval(() => {
              if (!globalIsRunning) {
                clearInterval(globalTimerRef!);
                globalTimerRef = null;
                return;
              }
              executeTick();
            }, savedInterval);
            
            timerRef.current = globalTimerRef;
            return;
          }

          // Check localStorage for persisted state
          try {
            const saved = localStorage.getItem(SIM_STORAGE_KEY);
            if (saved) {
              const parsed = JSON.parse(saved) as PersistedSimulationState;
              // Only auto-restart if we have current devices AND saved state says running
              if (parsed.isRunning && deviceIdsRef.current.length > 0) {
                console.log('[SIMULATION] Resuming from localStorage');
                
                // Restore state first
                setState(prev => ({
                  ...prev,
                  isRunning: true,
                  mode: parsed.mode || 'normal',
                  interval: parsed.interval || 5000,
                  tickCount: parsed.tickCount || 0,
                  alertCount: parsed.alertCount || 0,
                  lastDeviceId: parsed.lastDeviceId,
                  lastDeviceName: parsed.lastDeviceName
                }));
                
                // Auto-start the simulation with current device IDs (not saved ones)
                start(parsed.mode || 'normal', parsed.interval || 5000);
                return;
              }
            }
          } catch {
            // Ignore localStorage errors
          }

          // Check server state (legacy) - only if no localStorage state
          const result = await loadMonitorState();
          
          if (result.ok && result.state) {
            // Just load the settings
            setState(prev => ({
              ...prev,
              mode: result.state?.mode || 'normal',
              interval: result.state?.interval || 5000
            }));
            
            // If server says it was running, note that it stopped
            if (result.state.running) {
              // Update server state to stopped
              saveMonitorState({
                running: false,
                mode: result.state?.mode || 'normal',
                interval: result.state?.interval || 5000
              }).catch(() => {});
            }
          }
        } catch (err) {
          console.error('Failed to load monitor state:', err);
        }
      };

      loadSavedState();
    }, 1000); // Wait 1 second for devices to load

    return () => clearTimeout(initTimeout);
  }, []);

  return {
    // State
    isRunning: state.isRunning,
    mode: state.mode,
    interval: state.interval,
    tickCount: state.tickCount,
    alertCount: state.alertCount,
    logs: state.logs,
    lastDeviceId: state.lastDeviceId,
    lastDeviceName: state.lastDeviceName,
    // deviceModes removed - was causing ref access lint error
    // Actions
    start,
    stop,
    setMode,
    setInterval: setInterval,
    executeTick,
    
    // Dashboard data
    dashboardData: dashboardState.data,
    dashboardLoading: dashboardState.loading,
    dashboardError: dashboardState.error,
    refreshDashboard: dashboardActions.refresh
  };
}

// =====================================================
// Single Device Simulation Hook (simpler version)
// =====================================================

export function useDeviceSimulation(deviceId: string | null) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [logs, setLogs] = useState<SimulationLog[]>([]);
  const [mode, setMode] = useState<SimulationMode>('normal');
  const timerRef = useRef<number | null>(null);
  const deviceStateRef = useRef<Record<string, number>>({});

  const initState = useCallback(() => {
    const config = MODE_CONFIGS[mode];
    deviceStateRef.current = {};
    
    Object.entries(config).forEach(([key, cfg]) => {
      const variation = (Math.random() - 0.5) * cfg.drift;
      deviceStateRef.current[key] = parseFloat((cfg.base + variation).toFixed(2));
    });
  }, [mode]);

  const getNextValue = useCallback((sensorType: keyof ModeConfig): number => {
    const config = MODE_CONFIGS[mode][sensorType];
    const currentValue = deviceStateRef.current[sensorType];
    const drift = config.drift * 0.35;
    const variation = (Math.random() - 0.5) * drift;
    let newValue = currentValue + variation;
    newValue = Math.max(config.min, Math.min(config.max, newValue));
    newValue = parseFloat(newValue.toFixed(2));
    deviceStateRef.current[sensorType] = newValue;
    return newValue;
  }, [mode]);

  const simulate = useCallback(async () => {
    if (!deviceId) return;

    const readings = {
      temperature: getNextValue('temperature'),
      ph_level: getNextValue('ph_level'),
      turbidity: getNextValue('turbidity'),
      dissolved_oxygen: getNextValue('dissolved_oxygen'),
      water_level: getNextValue('water_level'),
      sediments: getNextValue('sediments')
    };

    try {
      const result = await simulateDevice(deviceId, readings);
      
      const log: SimulationLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        deviceId,
        deviceName: result.device_name || 'Unknown',
        mode,
        message: result.success 
          ? `Reading #${result.reading_id}: ${Object.entries(readings).map(([k, v]) => `${k}=${v}`).join(', ')}`
          : `Error: ${result.reading_id}`,
        type: result.success ? 'success' : 'error',
        readings
      };

      setLogs(prev => [...prev.slice(-49), log]);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const log: SimulationLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        deviceId,
        deviceName: 'Unknown',
        mode,
        message: `Error: ${errorMessage}`,
        type: 'error'
      };
      setLogs(prev => [...prev.slice(-49), log]);
      throw err;
    }
  }, [deviceId, mode, getNextValue]);

  const start = useCallback((intervalMs: number = 5000) => {
    if (!deviceId || timerRef.current) return;
    
    initState();
    setIsSimulating(true);
    
    simulate(); // Immediate first tick
    timerRef.current = window.setInterval(simulate, intervalMs);
  }, [deviceId, initState, simulate]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsSimulating(false);
  }, []);

  const changeMode = useCallback((newMode: SimulationMode) => {
    setMode(newMode);
    if (isSimulating) {
      initState();
    }
  }, [isSimulating, initState]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    isSimulating,
    mode,
    logs,
    start,
    stop,
    setMode: changeMode,
    simulateOnce: simulate
  };
}
