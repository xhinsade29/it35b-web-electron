/**
 * Device Form Component
 * Add/Edit device with map location selection
 * Migrated from PHP device.php
 */

import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Device, DeviceFormData, DeviceStatus } from '../types/device.types';
import { useDeviceHistory } from '../hooks/useDevices';
import styles from './DeviceForm.module.css';

// Fix Leaflet default icon using inline SVG data URLs
const defaultIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIuNSAwQzUuNjAwMDEgMCAwIDUuMzkgMCAxMi4wMkMwIDIxLjE3IDEyLjUgNDEgMTIuNSA0MUMxMi41IDQxIDI1IDIxLjE3IDI1IDEyLjAyQzI1IDUuMzkgMTkuNCAwIDEyLjUgMFoiIGZpbGw9IiMzQjgyRjYiLz48cGF0aCBkPSJNMTIuNSAxOUMxNC45ODUzIDE5IDE3IDE2Ljk4NTMgMTcgMTQuNUMxNyAxMi4wMTQ3IDE0Ljk4NTMgMTAgMTIuNSAxMEMxMC4wMTQ3IDEwIDggMTIuMDE0NyA4IDE0LjVDOCAxNi45ODUzIDEwLjAxNDcgMTkgMTIuNSAxOVoiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = defaultIcon;

// Mangima River coordinates
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

interface DeviceFormProps {
  device?: Device | null;
  onSave: (data: DeviceFormData) => void;
  onCancel: () => void;
  existingDevices: Device[];
  isSubmitting?: boolean;
}

const STATUS_OPTIONS: { value: DeviceStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'offline', label: 'Offline' },
  { value: 'unassigned', label: 'Unassigned' },
];


// Map click handler component
function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Map resizer to fix rendering issues
function MapResizer() {
  const map = useMapEvents({});
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export function DeviceForm({
  device,
  onSave,
  onCancel,
  existingDevices,
  isSubmitting = false,
}: DeviceFormProps) {
  const isEditing = !!device;

  const { history, loading: historyLoading } = useDeviceHistory(isEditing ? device?.device_id : undefined);

  const [formData, setFormData] = useState<DeviceFormData>({
    device_name: '',
    status: 'active',
    latitude: undefined,
    longitude: undefined,
    location_name: '',
  });

  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);

  // Initialize form data when editing
  useEffect(() => {
    if (device) {
      setFormData({
        device_name: device.device_name,
        status: device.status,
        latitude: device.latitude || undefined,
        longitude: device.longitude || undefined,
        location_name: device.location_name || '',
      });
      if (device.latitude && device.longitude) {
        setMarkerPosition([device.latitude, device.longitude]);
      }
      setShowMap(device.status === 'active');
    }
  }, [device]);

  // Handle status change - show/hide map
  const handleStatusChange = (status: DeviceStatus) => {
    setFormData((prev) => ({ ...prev, status }));
    setShowMap(status === 'active');
    if (status !== 'active') {
      setMarkerPosition(null);
      setFormData((prev) => ({
        ...prev,
        latitude: undefined,
        longitude: undefined,
        location_name: '',
      }));
    }
  };

  // Handle map click
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setMarkerPosition([lat, lng]);

    const isNearRiver = checkDistanceToRiver(lat, lng, RIVER_COORDS);
    const section = detectRiverSection(lng);
    const locationName = `${section.charAt(0).toUpperCase() + section.slice(1)} Section`;

    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      location_name: locationName,
      device_condition: isNearRiver ? 'normal' : 'displaced',
    }));

    if (!isNearRiver) {
      setWarning('⚠️ This location is far from Mangima River. Condition will be set to "Displaced".');
    } else {
      setWarning(null);
    }
  }, []);

  // Handle marker drag
  const handleMarkerDrag = (e: L.DragEndEvent) => {
    const marker = e.target;
    const position = marker.getLatLng();
    handleMapClick(position.lat, position.lng);
  };

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: DeviceFormData = {
      ...formData,
      device_condition: formData.latitude && formData.longitude 
        ? (checkDistanceToRiver(formData.latitude, formData.longitude, RIVER_COORDS) ? 'normal' : 'displaced')
        : 'normal',
    };
    onSave(submitData);
  };

  // Get status color
  const getStatusColor = (status: string, condition?: string) => {
    if (condition && condition !== 'normal') {
      const conditionColors: Record<string, string> = {
        displaced: '#7c3aed',
        damaged: '#1f2937',
        malfunctioning: '#d97706',
      };
      return conditionColors[condition] || '#9ca3af';
    }
    const statusColors: Record<string, string> = {
      active: '#059669',
      maintenance: '#3b82f6',
      inactive: '#dc2626',
      offline: '#6b7280',
      unassigned: '#9ca3af',
    };
    return statusColors[status] || '#9ca3af';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {isEditing ? 'Edit Device' : 'Add New Device'}
        </h2>
      </div>

      <div className={styles.content}>
        {/* Map Section - Now on the LEFT */}
        <div className={styles.mapSection}>
          {showMap ? (
            <>
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={13}
                className={styles.map}
                scrollWheelZoom={true}
                doubleClickZoom={false}
                touchZoom={true}
                boxZoom={false}
                keyboard={true}
                dragging={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

                {/* River polyline */}
                <Polyline
                  positions={RIVER_COORDS}
                  color="#3b82f6"
                  weight={4}
                  opacity={0.85}
                />

                {/* Existing devices */}
                {existingDevices.map((existingDevice) => {
                  if (!existingDevice.latitude || !existingDevice.longitude) return null;
                  if (isEditing && existingDevice.device_id === device?.device_id) return null;

                  const color = getStatusColor(
                    existingDevice.status,
                    existingDevice.device_condition
                  );

                  return (
                    <Marker
                      key={existingDevice.device_id}
                      position={[existingDevice.latitude, existingDevice.longitude]}
                      icon={L.divIcon({
                        className: styles.existingMarker,
                        html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                        iconSize: [16, 16],
                        iconAnchor: [8, 8],
                      })}
                    >
                      <Popup>
                        <div className={styles.popup}>
                          <strong>{existingDevice.device_name}</strong>
                          <div>Status: {existingDevice.status}</div>
                          {existingDevice.device_condition !== 'normal' && (
                            <div>⚠️ {existingDevice.device_condition}</div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Draggable marker */}
                {markerPosition && (
                  <Marker
                    position={markerPosition}
                    draggable={true}
                    eventHandlers={{
                      dragend: handleMarkerDrag,
                    }}
                    icon={L.divIcon({
                      className: styles.newMarker,
                      html: `<div style="background-color: #1a56db; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>`,
                      iconSize: [22, 22],
                      iconAnchor: [11, 11],
                    })}
                  />
                )}

                <MapClickHandler onClick={handleMapClick} />
                <MapResizer />
              </MapContainer>
              <p className={styles.mapHint}>
                💡 Click on the map to set device location, or drag the marker
              </p>
            </>
          ) : (
            <div className={styles.mapPlaceholder}>
              <div className={styles.mapPlaceholderIcon}>📍</div>
              <p>Select "Active" status to enable map location assignment</p>
            </div>
          )}
        </div>

        {/* Form Section - Now on the RIGHT */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Device Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              value={formData.device_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, device_name: e.target.value }))
              }
              placeholder="Enter device name"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Status</label>
            <select
              className={styles.select}
              value={formData.status}
              onChange={(e) => handleStatusChange(e.target.value as DeviceStatus)}
              disabled={isSubmitting}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {showMap && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Latitude</label>
                <input
                  type="number"
                  className={styles.input}
                  value={formData.latitude || ''}
                  readOnly
                  placeholder="Click on map to set"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Longitude</label>
                <input
                  type="number"
                  className={styles.input}
                  value={formData.longitude || ''}
                  readOnly
                  placeholder="Click on map to set"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Stream Assigned</label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.location_name || ''}
                  readOnly
                  placeholder="Auto-detected from map"
                />
              </div>
            </>
          )}

          {warning && <div className={styles.warning}>{warning}</div>}

          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={isSubmitting || !formData.device_name}
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Device'}
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Device Information & History - Beside the form when editing */}
        {isEditing && device && (
          <div className={styles.deviceInfoColumn}>
            <h4 className={styles.infoSectionTitle}>Device Information</h4>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabelSmall}>Device ID</span>
                <span className={styles.infoValueSmall}>#{device.device_id.slice(0, 8)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabelSmall}>Current Status</span>
                <span className={styles.infoValueSmall} style={{ color: getStatusColor(device.status, device.device_condition) }}>
                  {device.status}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabelSmall}>Current Location</span>
                <span className={styles.infoValueSmall}>
                  {device.latitude && device.longitude
                    ? `${device.latitude.toFixed(5)}°N, ${device.longitude.toFixed(5)}°E`
                    : 'Not set'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabelSmall}>Created</span>
                <span className={styles.infoValueSmall}>
                  {device.created_at ? new Date(device.created_at).toLocaleDateString('en-PH') : 'N/A'}
                </span>
              </div>
            </div>

            <h4 className={styles.infoSectionTitle}>Activity History</h4>
            <div className={styles.historyList}>
              {historyLoading ? (
                <div className={styles.historyLoading}>Loading history...</div>
              ) : history.length === 0 ? (
                <div className={styles.historyEmpty}>No history available</div>
              ) : (
                history.slice(0, 10).map((entry) => {
                  const date = new Date(entry.created_at);
                  const dateStr = date.toLocaleDateString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                  });
                  const timeStr = date.toLocaleTimeString('en-PH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  const getActionIcon = (action: string) => {
                    if (action.includes('CREATE')) return '➕';
                    if (action.includes('UPDATE')) return '✏️';
                    if (action.includes('DELETE')) return '🗑️';
                    return '📝';
                  };

                  return (
                    <div key={entry.log_id} className={styles.historyEntry}>
                      <div className={styles.historyEntryHeader}>
                        <span className={styles.historyEntryAction}>
                          {getActionIcon(entry.action)} {entry.action}
                        </span>
                        <span className={styles.historyEntryDate}>
                          {dateStr}, {timeStr}
                        </span>
                      </div>
                      <div className={styles.historyEntryDetails}>{entry.details}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
