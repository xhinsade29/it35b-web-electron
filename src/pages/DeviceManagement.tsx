/**
 * Device Management Page
 * Main page integrating all device components
 * Migrated from PHP device.php
 */

import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import { DeviceList } from '../components/DeviceList';
import { DeviceForm } from '../components/DeviceForm';
import { DeviceDetails } from '../components/DeviceDetails';
import { useDevices, useDevice } from '../hooks/useDevices';
import { getDeviceStatusColor } from '../services/deviceService';
import type { Device, DeviceFormData, DeviceStatus, DeviceCondition, RiverSection } from '../types/device.types';
import styles from './DeviceManagement.module.css';

type ViewMode = 'list' | 'add' | 'edit';

// River coordinates for the overview map
const RIVER_COORDS: [number, number][] = [
  [8.345958, 124.898607], [8.346955, 124.899036], [8.347603, 124.898081],
  [8.349471, 124.896461], [8.349216, 124.895474], [8.349535, 124.894755],
  [8.348909, 124.894058], [8.349881, 124.893209], [8.352050, 124.889584],
  [8.351096, 124.889497], [8.351978, 124.888415], [8.352369, 124.887056],
  [8.352210, 124.886676], [8.352643, 124.886427], [8.353468, 124.884863],
  [8.355492, 124.883376], [8.356292, 124.881332], [8.358270, 124.881140],
  [8.368532, 124.875713], [8.373977, 124.876690], [8.381657, 124.897203],
  [8.394810, 124.903483], [8.396343, 124.907500], [8.399906, 124.911121],
  [8.400757, 124.910773], [8.401407, 124.910581], [8.401636, 124.910868],
  [8.401774, 124.911007], [8.402125, 124.911168], [8.402489, 124.911218],
  [8.402853, 124.911196], [8.403020, 124.911119], [8.403792, 124.910506],
  [8.405310, 124.909972], [8.405901, 124.909983], [8.406337, 124.910087],
  [8.406533, 124.910179], [8.406700, 124.910291], [8.406745, 124.910385],
  [8.406713, 124.910512], [8.405924, 124.911388], [8.405818, 124.911576],
  [8.405829, 124.911689], [8.405924, 124.911801], [8.406275, 124.911984],
  [8.406715, 124.912414], [8.407049, 124.912661], [8.409034, 124.913466],
  [8.409793, 124.913708], [8.410064, 124.913713], [8.410472, 124.913676],
  [8.411629, 124.913198], [8.412245, 124.912800], [8.412515, 124.912462],
  [8.412632, 124.911962], [8.413237, 124.909739], [8.413179, 124.909497],
];

const DEFAULT_CENTER: [number, number] = [8.369297, 124.876785];

// Auto-fit map bounds to show all devices
function MapBounds({ devices }: { devices: Device[] }) {
  const map = useMap();

  useEffect(() => {
    const devicesWithCoords = devices.filter((d) => d.latitude && d.longitude);
    if (devicesWithCoords.length > 0) {
      const bounds = devicesWithCoords.map((d) => [d.latitude, d.longitude] as [number, number]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [devices, map]);

  return null;
}

export function DeviceManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const {
    devices,
    filteredDevices,
    loading,
    error,
    filterOptions,
    setFilterOptions,
    refresh: refreshDevices,
  } = useDevices();

  const {
    device: selectedDevice,
    create,
    update,
    remove,
  } = useDevice(selectedDeviceId || undefined);

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

  // Handle delete device
  const handleDelete = useCallback(async (device: Device) => {
    if (confirm(`Are you sure you want to delete ${device.device_name}?`)) {
      const success = await remove();
      if (success) {
        refreshDevices();
        if (selectedDeviceId === device.device_id) {
          setSelectedDeviceId(null);
        }
      }
    }
  }, [remove, refreshDevices, selectedDeviceId]);

  // Handle save device
  const handleSave = useCallback(async (formData: DeviceFormData) => {
    let success = false;

    if (viewMode === 'add') {
      const newDevice = await create(formData);
      success = !!newDevice;
    } else if (viewMode === 'edit' && selectedDeviceId) {
      const updated = await update(formData);
      success = !!updated;
    }

    if (success) {
      setViewMode('list');
      refreshDevices();
    }
  }, [viewMode, selectedDeviceId, create, update, refreshDevices]);

  // Handle cancel
  const handleCancel = () => {
    setViewMode('list');
    setSelectedDeviceId(null);
  };

  // Handle filter change
  const handleFilterChange = useCallback((filters: {
    status: DeviceStatus | 'all';
    condition: DeviceCondition | 'all';
    section: RiverSection | 'all';
    search: string;
  }) => {
    setFilterOptions(filters);
  }, [setFilterOptions]);

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
                  scrollWheelZoom={true}
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
                  {devices.filter(d => d.latitude && d.longitude).map((device) => {
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
                            <strong style={{ fontSize: 'var(--text-sm)', display: 'block', marginBottom: '4px' }}>{device.device_name}</strong>
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
                  })}
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
              isSubmitting={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
