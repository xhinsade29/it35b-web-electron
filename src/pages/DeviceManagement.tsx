/**
 * Device Management Page
 * Main page integrating all device components
 * Migrated from PHP device.php
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import { DeviceList } from '../components/DeviceList';
import { DeviceForm } from '../components/DeviceForm';
import { DeviceDetails } from '../components/DeviceDetails';
import { useDevices, useLocations } from '../hooks/useDevices';
import { createDevice, updateDevice, deleteDevice, getDeviceStatusColor } from '../services/deviceService';
import type { Device, DeviceFormData, DeviceStatus, DeviceCondition, RiverSection } from '../types/device.types';
import { DEFAULT_RIVER_COORDS } from '../utils/riverUtils';
import styles from './DeviceManagement.module.css';

type ViewMode = 'list' | 'add' | 'edit';

// Use shared river coordinates from riverUtils
const RIVER_COORDS: [number, number][] = DEFAULT_RIVER_COORDS;

const DEFAULT_CENTER: [number, number] = [8.369297, 124.876785];

// Section colors for legend
const SECTION_COLORS: Record<string, string> = {
  upstream: '#059669',
  midstream: '#d97706',
  downstream: '#dc2626',
};

// Auto-fit map bounds to show all devices
function MapBounds({ devices }: { devices: Device[] }) {
  const map = useMap();

  useEffect(() => {
    const devicesWithCoords = devices.filter((d) => d.latitude && d.longitude);
    
    if (devicesWithCoords.length === 0) return;
    
    const bounds = devicesWithCoords.map((d) => [d.latitude, d.longitude] as [number, number]);
    
    // Delay fitBounds to ensure map is ready
    setTimeout(() => {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: false });
    }, 100);
  }, [devices, map]);

  return null;
}

export function DeviceManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    devices,
    filteredDevices,
    loading,
    error,
    filterOptions,
    setFilterOptions,
    refresh: refreshDevices,
  } = useDevices();

  const { locations } = useLocations();

  // Group devices by location (sync with Dashboard approach)
  const locationDevices = useMemo(() => {
    const map = new Map<string, Device[]>();
    locations.forEach(loc => map.set(loc.location_id, []));
    devices.forEach(device => {
      if (device.location_id) {
        const list = map.get(device.location_id) || [];
        list.push(device);
        map.set(device.location_id, list);
      }
    });
    return map;
  }, [devices, locations]);

  // Get marker color based on location status
  const getMarkerColor = (location: typeof locations[0]) => {
    const locDevices = locationDevices.get(location.location_id) || [];
    const activeCount = locDevices.filter(d => d.status === 'active').length;
    if (activeCount === 0 && locDevices.length > 0) {
      return '#9ca3af'; // Gray for offline
    }
    return SECTION_COLORS[location.river_section] || '#3b82f6';
  };

  // Handle device selection
  const handleSelectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
  }, []);

  // Handle add device
  const handleAdd = () => {
    setViewMode('add');
    setSelectedDeviceId(null);
  };

  // Handle edit device
  const handleEdit = useCallback((device: Device) => {
    setSelectedDeviceId(device.device_id);
    setViewMode('edit');
  }, []);

  // Handle delete device - use deviceId directly from the device being deleted
  const handleDelete = useCallback(async (device: Device) => {
    if (confirm(`Are you sure you want to delete ${device.device_name}?`)) {
      try {
        await deleteDevice(device.device_id);
        refreshDevices();
        if (selectedDeviceId === device.device_id) {
          setSelectedDeviceId(null);
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete device');
      }
    }
  }, [refreshDevices, selectedDeviceId]);

  // Handle save device - call service functions directly
  const handleSave = useCallback(async (formData: DeviceFormData, originalDevice?: Device) => {
    setIsSubmitting(true);
    try {
      let success = false;

      if (viewMode === 'add') {
        const newDevice = await createDevice(formData);
        success = !!newDevice;
      } else if (viewMode === 'edit' && selectedDeviceId && originalDevice) {
        const updated = await updateDevice(selectedDeviceId, formData, originalDevice);
        success = !!updated;
      }

      if (success) {
        setViewMode('list');
        setSelectedDeviceId(null);
        refreshDevices();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save device');
    } finally {
      setIsSubmitting(false);
    }
  }, [viewMode, selectedDeviceId, refreshDevices]);

  // Handle cancel
  const handleCancel = () => {
    setViewMode('list');
    setSelectedDeviceId(null);
  };

  // Get selected device for edit form
  const selectedDevice = selectedDeviceId 
    ? devices.find(d => d.device_id === selectedDeviceId) 
    : null;

  // Handle filter change
  const handleFilterChange = useCallback((filters: {
    status: DeviceStatus | 'all';
    condition: DeviceCondition | 'all';
    section: RiverSection | 'all';
    search: string;
  }) => {
    setFilterOptions(filters);
  }, [setFilterOptions]);

  // Calculate device summary stats
  const deviceSummary = useMemo(() => {
    const total = devices.length;
    const active = devices.filter(d => d.status === 'active').length;
    const maintenance = devices.filter(d => d.status === 'maintenance').length;
    const offline = devices.filter(d => d.status === 'offline').length;
    const inactive = devices.filter(d => d.status === 'inactive').length;
    const displaced = devices.filter(d => d.device_condition === 'displaced').length;
    const damaged = devices.filter(d => d.device_condition === 'damaged').length;
    const malfunctioning = devices.filter(d => d.device_condition === 'malfunctioning').length;
    
    const upstream = devices.filter(d => d.river_section === 'upstream').length;
    const midstream = devices.filter(d => d.river_section === 'midstream').length;
    const downstream = devices.filter(d => d.river_section === 'downstream').length;

    return {
      total, active, maintenance, offline, inactive,
      displaced, damaged, malfunctioning,
      upstream, midstream, downstream
    };
  }, [devices]);

  // Get selected device for display
  const displayDevice = selectedDevice ||
    (selectedDeviceId ? devices.find(d => d.device_id === selectedDeviceId) : null);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>📡 Device Management</h1>
          <p className={styles.subtitle}>
            Manage monitoring equipment and station locations
          </p>
        </div>
        {viewMode === 'list' && (
          <button className={styles.btnPrimary} onClick={handleAdd}>
            + Add Device
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className={styles.error}>
          Error: {error}
        </div>
      )}

      {/* Content */}
      <div className={styles.content}>
        {viewMode === 'list' ? (
          <>
            {/* Device Summary */}
            <div className={styles.summarySection}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryValue}>{deviceSummary.total}</div>
                <div className={styles.summaryLabel}>Total Devices</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryValue} style={{ color: '#059669' }}>{deviceSummary.active}</div>
                <div className={styles.summaryLabel}>Active</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryValue} style={{ color: '#3b82f6' }}>{deviceSummary.maintenance}</div>
                <div className={styles.summaryLabel}>Maintenance</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryValue} style={{ color: '#6b7280' }}>{deviceSummary.offline + deviceSummary.inactive}</div>
                <div className={styles.summaryLabel}>Offline/Inactive</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryValue} style={{ color: '#d97706' }}>{deviceSummary.displaced + deviceSummary.damaged + deviceSummary.malfunctioning}</div>
                <div className={styles.summaryLabel}>Issues</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryValue} style={{ color: '#059669' }}>{deviceSummary.upstream}</div>
                <div className={styles.summaryLabel}>Upstream</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryValue} style={{ color: '#d97706' }}>{deviceSummary.midstream}</div>
                <div className={styles.summaryLabel}>Midstream</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryValue} style={{ color: '#dc2626' }}>{deviceSummary.downstream}</div>
                <div className={styles.summaryLabel}>Downstream</div>
              </div>
            </div>

            {/* Main Content: Map + Details side by side */}
            <div className={styles.mainContent}>
              {/* Map Section */}
              <div className={styles.mapSectionWithDetails}>
                <div className={styles.mapHeader}>
                  <h3 className={styles.mapTitle}>📍 Device Locations</h3>
                  <div className={styles.mapLegend}>
                    <span className={styles.legendDot} style={{ background: '#059669' }}></span> Active
                    <span className={styles.legendDot} style={{ background: '#3b82f6', marginLeft: '12px' }}></span> Maintenance
                    <span className={styles.legendDot} style={{ background: '#7c3aed', marginLeft: '12px' }}></span> Displaced
                    <span className={styles.legendDot} style={{ background: '#1f2937', marginLeft: '12px' }}></span> Damaged
                    <span className={styles.legendDot} style={{ background: '#d97706', marginLeft: '12px' }}></span> Malfunctioning
                  </div>
                </div>
                <MapContainer
                  center={DEFAULT_CENTER}
                  zoom={13}
                  className={styles.embeddedMap}
                  dragging={false}
                  touchZoom={false}
                  scrollWheelZoom={false}
                  doubleClickZoom={false}
                  boxZoom={false}
                  keyboard={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  />
                  <Polyline
                    positions={RIVER_COORDS}
                    color="#3b82f6"
                    weight={4}
                    opacity={0.85}
                  />
                  {/* Individual device markers */}
                  {(() => {
                    const devicesWithCoords = devices.filter(d => d.latitude && d.longitude);
                    console.log(`[MAP] Rendering ${devicesWithCoords.length} device markers`);
                    
                    return devicesWithCoords.map((device) => {
                      const isSelected = device.device_id === selectedDeviceId;
                      const color = getDeviceStatusColor(device.status, device.device_condition);
                      
                      return (
                        <CircleMarker
                          key={device.device_id}
                          center={[device.latitude!, device.longitude!]}
                          radius={isSelected ? 14 : 10}
                          fillColor={color}
                          color="#fff"
                          weight={isSelected ? 3 : 2}
                          fillOpacity={isSelected ? 1.0 : 0.9}
                          eventHandlers={{
                            click: () => handleSelectDevice(device.device_id),
                          }}
                        >
                          <Popup>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', minWidth: '150px' }}>
                              <strong style={{ fontSize: 'var(--text-sm)', display: 'block', marginBottom: '4px' }}>
                                {device.device_name}
                              </strong>
                              <div>Status: <span style={{ color }}>{device.status}</span></div>
                              {device.device_condition !== 'normal' && (
                                <div style={{ color: '#d97706' }}>⚠️ {device.device_condition}</div>
                              )}
                              {device.location_name && <div>Location: {device.location_name}</div>}
                              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                {device.latitude?.toFixed(5)}°N, {device.longitude?.toFixed(5)}°E
                              </div>
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    });
                  })()}
                  <MapBounds devices={devices} />
                </MapContainer>
              </div>

              {/* Device Details Panel with Dropdown */}
              <div className={styles.deviceInfoPanel}>
                <div className={styles.deviceSelector}>
                  <label className={styles.selectorLabel}>Select Device</label>
                  <select
                    className={styles.deviceDropdown}
                    value={selectedDeviceId || ''}
                    onChange={(e) => handleSelectDevice(e.target.value)}
                  >
                    <option value="">-- Select a device --</option>
                    {devices.map((device) => (
                      <option key={device.device_id} value={device.device_id}>
                        {device.device_name} ({device.status})
                      </option>
                    ))}
                  </select>
                </div>
                {displayDevice ? (
                  <DeviceDetails
                    device={displayDevice}
                    onEdit={handleEdit}
                  />
                ) : (
                  <div className={styles.noDeviceSelected}>
                    <p>Select a device from the dropdown to view details</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom: Device List */}
            <div className={styles.listSection}>
              <DeviceList
                devices={filteredDevices}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                filters={filterOptions}
                onFilterChange={handleFilterChange}
              />
            </div>
          </>
        ) : (
          /* Add/Edit Form */
          <div className={styles.formContainer}>
            <DeviceForm
              device={viewMode === 'edit' ? selectedDevice : null}
              onSave={handleSave}
              onCancel={handleCancel}
              existingDevices={devices}
              isSubmitting={isSubmitting}
            />
          </div>
        )}
      </div>
    </div>
  );
}
