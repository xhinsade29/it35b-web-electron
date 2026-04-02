import { useState, useCallback, useRef, useEffect } from 'react';
import { simulateDevicesBatch, simulateDevice, saveMonitorState, ensureAllDeviceSensors } from '../api/dashboardApi';
import { useDashboardSync } from './useDashboardSync';
import type { SimulationResponse } from '../types/dashboard.types';

// =====================================================
// Simulation Engine Hook
// Replaces PHP simulation engine (MODES, _initDs, _next, _sendTick)
// =====================================================

export type SimulationMode = 'normal' | 'flood' | 'pollution' | 'drought';

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
  const [state, setState] = useState<SimulationState>({
    isRunning: false,
    mode: 'normal',
    interval: 5000,
    tickCount: 0,
    alertCount: 0,
    logs: []
  });

  // Device-specific modes (distributed round-robin)
  const deviceModesRef = useRef<Record<string, SimulationMode>>({});
  const deviceStatesRef = useRef<Record<string, Record<string, number>>>({});
  const timerRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const lastRefreshRef = useRef<number>(0);

  const [dashboardState, dashboardActions] = useDashboardSync();

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
    
    setState(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-79), entry] // Keep last 80 logs
    }));
  }, []);

  // Execute a simulation tick for all devices
  const executeTick = useCallback(async () => {
    // Guard: don't execute if simulation has been stopped
    if (!isRunningRef.current) {
      console.log('executeTick: skipped - not running');
      return;
    }

    if (deviceIds.length === 0) {
      addLog({
        deviceId: '',
        deviceName: 'System',
        mode: state.mode,
        message: 'No active devices.',
        type: 'error'
      });
      return;
    }

    console.log(`[SIMULATION] Starting batch tick for ${deviceIds.length} devices`);

    // Prepare all device data first
    const devicesData = deviceIds.map(deviceId => {
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
        
        // Log alerts
        if (result.alerts_created && result.alerts_created.length > 0) {
          result.alerts_created.forEach(alert => {
            const alertMessage = `${alert.sensor_type}: ${alert.value} (threshold: ${alert.threshold})`;
            addLog({
              deviceId,
              deviceName: result.device_name,
              mode,
              message: `⚠ ALERT [${alert.type.toUpperCase()}] ${alertMessage}`,
              type: 'alert'
            });
          });
          alertCount += result.alerts_created.length;
        }
        
        // Log success
        const { device_id: _deviceId, ...sensorReadings } = readings;
        const deviceReadings = sensorReadings as Record<string, number>;
        addLog({
          deviceId,
          deviceName: result.device_name,
          mode,
          message: `✓ #${result.reading_id} ${result.device_name} [${mode.toUpperCase()}] — T:${deviceReadings.temperature} pH:${deviceReadings.ph_level} Tu:${deviceReadings.turbidity} DO:${deviceReadings.dissolved_oxygen} Lv:${deviceReadings.water_level} Sed:${deviceReadings.sediments}`,
          type: 'success',
          readings: deviceReadings
        });
      });
      
      // Update alert count
      if (alertCount > 0) {
        setState(prev => ({
          ...prev,
          alertCount: prev.alertCount + alertCount
        }));
      }
      
      // Update last device info
      if (lastSuccess) {
        const success = lastSuccess as SimulationResponse;
        setState(prev => ({
          ...prev,
          lastDeviceId: success.device_id,
          lastDeviceName: success.device_name
        }));
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
    if (!isRunningRef.current) {
      console.log('executeTick: stopped during execution');
      return;
    }
    
    // Increment tick count
    setState(prev => ({
      ...prev,
      tickCount: prev.tickCount + 1
    }));

    // Refresh dashboard data only if still running and enough time has passed
    if (isRunningRef.current) {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshRef.current;
      const refreshInterval = Math.max(15000, state.interval * 2);
      
      if (timeSinceLastRefresh >= refreshInterval) {
        lastRefreshRef.current = now;
        // Fire and forget - don't block simulation
        dashboardActions.refresh().catch(() => {});
      }
    }
  }, [deviceIds, state.mode, state.interval, getNextValue, addLog, dashboardActions]);

  // Simple interval-based simulation with proper cleanup
  const start = useCallback(async (mode?: SimulationMode, interval?: number) => {
    const simMode = mode || state.mode;
    const simInterval = interval || state.interval;

    // Stop any existing simulation first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    isRunningRef.current = false;

    // Ensure all devices have required sensors BEFORE starting
    console.log('[SIMULATION] Checking sensors for all devices...');
    await ensureAllDeviceSensors(deviceIds);

    // Small delay to ensure any pending async operations complete
    setTimeout(() => {
      // Reset state
      isRunningRef.current = true;
      
      // Assign modes to devices
      assignDeviceModes();

      // Initialize states
      deviceIds.forEach(id => {
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

      // Set state
      setState(prev => ({
        ...prev,
        isRunning: true,
        mode: simMode,
        interval: simInterval
      }));

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
      timerRef.current = window.setInterval(() => {
        if (!isRunningRef.current) {
          console.log('Interval: simulation not running, clearing');
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return;
        }
        executeTick();
      }, simInterval);
    }, 100);
  }, [state.mode, state.interval, assignDeviceModes, initDeviceState, deviceIds, addLog, executeTick]);

  // Stop simulation
  const stop = useCallback(() => {
    console.log('STOP called - clearing interval and setting flags');
    
    // Clear the interval first
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      console.log('Interval cleared');
    }
    
    // Set running flag false
    isRunningRef.current = false;
    
    // Update state immediately
    setState(prev => ({
      ...prev,
      isRunning: false,
      tickCount: prev.tickCount
    }));
    
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
        const { saveSimulationSummary } = await import('../api/dashboardApi');
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
  }, [state.mode, state.interval, state.tickCount, state.alertCount, state.lastDeviceId, state.lastDeviceName, state.logs, addLog]);

  // Update mode (restart if running)
  const setMode = useCallback((mode: SimulationMode) => {
    setState(prev => ({ ...prev, mode }));
    
    if (isRunningRef.current && timerRef.current) {
      // Restart with new mode
      start(mode, state.interval);
    }
  }, [start, state.interval]);

  // Update interval (restart if running)
  const setInterval = useCallback((interval: number) => {
    setState(prev => ({ ...prev, interval }));
    
    if (isRunningRef.current && timerRef.current) {
      // Restart with new interval
      start(state.mode, interval);
    }
  }, [start, state.mode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Unmounting - stopping simulation');
      isRunningRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Load saved state on mount - but DON'T auto-start
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const { loadMonitorState } = await import('../api/dashboardApi');
        const result = await loadMonitorState();
        
        if (result.ok && result.state) {
          // Just load the settings, don't auto-start
          setState(prev => ({
            ...prev,
            mode: result.state?.mode || 'normal',
            interval: result.state?.interval || 5000
          }));
          
          // If it was running, log that it was stopped
          if (result.state.running) {
            addLog({
              deviceId: '',
              deviceName: 'System',
              mode: result.state?.mode || 'normal',
              message: `Previous simulation was stopped. Press ▶ Start to begin.`,
              type: 'success'
            });
            
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
  }, [addLog]);

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
    deviceModes: deviceModesRef.current,
    
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
