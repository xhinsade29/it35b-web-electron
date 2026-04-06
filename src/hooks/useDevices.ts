/**
 * Device API Hooks
 * React hooks for device management operations
 * Migrated from PHP device.php
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getAllDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  getAllLocations,
  getDeviceReadings,
  getDeviceHistory,
  getMapSyncData,
  filterDevices,
  getDeviceStatusColor,
} from '../services/deviceService';
import { checkDistanceToRiver } from '../utils/riverUtils';
import type {
  Device,
  DeviceLocation,
  DeviceReading,
  DeviceHistoryEntry,
  DeviceFormData,
  MapSyncResponse,
  DeviceFilterOptions,
  DeviceStatus,
  DeviceCondition,
  RiverSection,
} from '../types/device.types';

// ============================================================================
// useDevices - Hook for device list with filtering
// ============================================================================

interface UseDevicesReturn {
  devices: Device[];
  filteredDevices: Device[];
  loading: boolean;
  error: string | null;
  filterOptions: DeviceFilterOptions;
  setFilterOptions: (options: DeviceFilterOptions) => void;
  refresh: () => void;
  setDevices: React.Dispatch<React.SetStateAction<Device[]>>;
}

export function useDevices(): UseDevicesReturn {
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<DeviceFilterOptions>({
    status: 'all',
    condition: 'all',
    section: 'all',
    search: '',
  });

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllDevices();
      // Validate each device's location and mark as out_of_bound only if currently normal
      const validatedDevices = data.map(device => {
        if (device.latitude && device.longitude) {
          const isNearRiver = checkDistanceToRiver(device.latitude, device.longitude);
          // Only set to out_of_bound if condition is currently normal
          // Don't override manually set conditions like 'displaced'
          if (!isNearRiver && device.device_condition === 'normal') {
            return { ...device, device_condition: 'out_of_bound' as DeviceCondition };
          }
        }
        return device;
      });
      setDevices(validatedDevices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply filters
  useEffect(() => {
    setFilteredDevices(filterDevices(devices, filterOptions));
  }, [devices, filterOptions]);

  // Initial fetch
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  return {
    devices,
    filteredDevices,
    loading,
    error,
    filterOptions,
    setFilterOptions,
    refresh: fetchDevices,
    setDevices,
  };
}

// ============================================================================
// useDevice - Hook for single device operations
// ============================================================================

interface UseDeviceReturn {
  device: Device | null;
  loading: boolean;
  error: string | null;
  create: (data: DeviceFormData) => Promise<Device | null>;
  update: (data: DeviceFormData) => Promise<Device | null>;
  remove: () => Promise<boolean>;
  refresh: () => void;
}

export function useDevice(deviceId?: string): UseDeviceReturn {
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDevice = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDeviceById(deviceId);
      setDevice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch device');
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  const create = useCallback(async (data: DeviceFormData): Promise<Device | null> => {
    setLoading(true);
    setError(null);
    try {
      const newDevice = await createDevice(data);
      return newDevice;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create device');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (data: DeviceFormData): Promise<Device | null> => {
    if (!deviceId || !device) return null;
    setLoading(true);
    setError(null);
    try {
      const updated = await updateDevice(deviceId, data, device);
      setDevice(updated);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update device');
      return null;
    } finally {
      setLoading(false);
    }
  }, [deviceId, device]);

  const remove = useCallback(async (): Promise<boolean> => {
    if (!deviceId) return false;
    setLoading(true);
    setError(null);
    try {
      await deleteDevice(deviceId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete device');
      return false;
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  // Initial fetch
  useEffect(() => {
    if (deviceId) {
      fetchDevice();
    }
  }, [deviceId, fetchDevice]);

  return {
    device,
    loading,
    error,
    create,
    update,
    remove,
    refresh: fetchDevice,
  };
}

// ============================================================================
// useDeviceReadings - Hook for device sensor readings
// ============================================================================

interface UseDeviceReadingsReturn {
  readings: DeviceReading | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDeviceReadings(deviceId?: string): UseDeviceReadingsReturn {
  const [readings, setReadings] = useState<DeviceReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReadings = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDeviceReadings(deviceId);
      setReadings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch readings');
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  return { readings, loading, error, refresh: fetchReadings };
}

// ============================================================================
// useDeviceHistory - Hook for device activity history
// ============================================================================

interface UseDeviceHistoryReturn {
  history: DeviceHistoryEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDeviceHistory(deviceId?: string): UseDeviceHistoryReturn {
  const [history, setHistory] = useState<DeviceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDeviceHistory(deviceId);
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, error, refresh: fetchHistory };
}

// ============================================================================
// useLocations - Hook for all locations
// ============================================================================

interface UseLocationsReturn {
  locations: DeviceLocation[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useLocations(): UseLocationsReturn {
  const [locations, setLocations] = useState<DeviceLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllLocations();
      setLocations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return { locations, loading, error, refresh: fetchLocations };
}

// ============================================================================
// useMapSync - Hook for map synchronization
// ============================================================================

interface UseMapSyncReturn {
  mapData: MapSyncResponse | null;
  loading: boolean;
  error: string | null;
  sync: () => void;
  startAutoSync: (intervalMs?: number) => void;
  stopAutoSync: () => void;
}

export function useMapSync(): UseMapSyncReturn {
  const [mapData, setMapData] = useState<MapSyncResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncTimer, setSyncTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  const fetchMapData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMapSyncData();
      setMapData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch map data');
    } finally {
      setLoading(false);
    }
  }, []);

  const startAutoSync = useCallback((intervalMs = 10000) => {
    if (syncTimer) {
      clearInterval(syncTimer);
    }
    const timer = setInterval(fetchMapData, intervalMs);
    setSyncTimer(timer);
  }, [fetchMapData, syncTimer]);

  const stopAutoSync = useCallback(() => {
    if (syncTimer) {
      clearInterval(syncTimer);
      setSyncTimer(null);
    }
  }, [syncTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimer) {
        clearInterval(syncTimer);
      }
    };
  }, [syncTimer]);

  return {
    mapData,
    loading,
    error,
    sync: fetchMapData,
    startAutoSync,
    stopAutoSync,
  };
}

// ============================================================================
// useDeviceFilters - Hook for filter state management
// ============================================================================

interface UseDeviceFiltersReturn {
  filters: DeviceFilterOptions;
  setStatus: (status: DeviceStatus | 'all') => void;
  setCondition: (condition: DeviceCondition | 'all') => void;
  setSection: (section: RiverSection | 'all') => void;
  setSearch: (search: string) => void;
  resetFilters: () => void;
}

export function useDeviceFilters(): UseDeviceFiltersReturn {
  const [filters, setFilters] = useState<DeviceFilterOptions>({
    status: 'all',
    condition: 'all',
    section: 'all',
    search: '',
  });

  const setStatus = useCallback((status: DeviceStatus | 'all') => {
    setFilters(prev => ({ ...prev, status }));
  }, []);

  const setCondition = useCallback((condition: DeviceCondition | 'all') => {
    setFilters(prev => ({ ...prev, condition }));
  }, []);

  const setSection = useCallback((section: RiverSection | 'all') => {
    setFilters(prev => ({ ...prev, section }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      status: 'all',
      condition: 'all',
      section: 'all',
      search: '',
    });
  }, []);

  return {
    filters,
    setStatus,
    setCondition,
    setSection,
    setSearch,
    resetFilters,
  };
}

// ============================================================================
// Utility Exports
// ============================================================================

export { getDeviceStatusColor };
