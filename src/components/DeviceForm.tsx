/**
 * Device Form Component
 * Add/Edit device with map location selection
 * Migrated from PHP device.php
 */

import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Device, DeviceFormData, DeviceStatus } from '../types/device.types';
import { useDeviceHistory } from '../hooks/useDevices';
import { checkDistanceToRiver, detectRiverSection } from '../utils/riverUtils';
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
  [8.345862, 124.898846], [8.345963, 124.898948], [8.346406, 124.899192], [8.346703, 124.899117], [8.346892, 124.899034],
  [8.347059, 124.898908], [8.347298, 124.898613], [8.347470, 124.898275], [8.347521, 124.898120], [8.347571, 124.898012],
  [8.347842, 124.897806], [8.348131, 124.897720], [8.348309, 124.897642], [8.349344, 124.896652], [8.349455, 124.896524],
  [8.349493, 124.896424], [8.349490, 124.896304], [8.349323, 124.895950], [8.349158, 124.895700], [8.349134, 124.895617],
  [8.349158, 124.895526], [8.349474, 124.895209], [8.349580, 124.895051], [8.349654, 124.894836], [8.349628, 124.894745],
  [8.349503, 124.894608], [8.349270, 124.894439], [8.348768, 124.894099], [8.348720, 124.894008], [8.348755, 124.893919],
  [8.349060, 124.893669], [8.349270, 124.893589], [8.349447, 124.893557], [8.349580, 124.893498], [8.349968, 124.892860],
  [8.350522, 124.891503], [8.351111, 124.890497], [8.351252, 124.890381], [8.351403, 124.890328], [8.351642, 124.890223],
  [8.351913, 124.889885], [8.351955, 124.889746], [8.351934, 124.889650], [8.351873, 124.889607], [8.351695, 124.889633],
  [8.351528, 124.889717], [8.351377, 124.889735], [8.351087, 124.889684], [8.350886, 124.889588], [8.350804, 124.889486],
  [8.350782, 124.889349], [8.350849, 124.889210], [8.351021, 124.889036], [8.351637, 124.888777], [8.351854, 124.888684],
  [8.352271, 124.888290], [8.352600, 124.887831], [8.352640, 124.887657], [8.352613, 124.887462], [8.352510, 124.887279],
  [8.352099, 124.886963], [8.352064, 124.886877], [8.352083, 124.886781], [8.352473, 124.886440], [8.352584, 124.886296],
  [8.352916, 124.885543], [8.353136, 124.885167], [8.353285, 124.885033], [8.353701, 124.884776], [8.353773, 124.884625],
  [8.353874, 124.884556], [8.354383, 124.884374], [8.354813, 124.884129], [8.355172, 124.883864], [8.355400, 124.883531],
  [8.355509, 124.882987], [8.355657, 124.882434], [8.355915, 124.881777], [8.356159, 124.881426], [8.356358, 124.881208],
  [8.356591, 124.881147], [8.356743, 124.881136], [8.357929, 124.881246], [8.358054, 124.881219], [8.358115, 124.881165],
  [8.358308, 124.880828], [8.358428, 124.880407], [8.358789, 124.879848], [8.359155, 124.879513], [8.359648, 124.879216],
  [8.359906, 124.879114], [8.360920, 124.878746], [8.361081, 124.878644], [8.361410, 124.878199], [8.361649, 124.877958],
  [8.362345, 124.877644], [8.363260, 124.877056], [8.363377, 124.876933], [8.364088, 124.875943], [8.364218, 124.875796],
  [8.364998, 124.875568], [8.365354, 124.875546], [8.365662, 124.875578], [8.365879, 124.875659], [8.366065, 124.875819],
  [8.366596, 124.876345], [8.366811, 124.876384], [8.366951, 124.876329], [8.367424, 124.876083], [8.368193, 124.875922],
  [8.368384, 124.875772], [8.368782, 124.874521], [8.368889, 124.874441], [8.368936, 124.874430], [8.369090, 124.874430],
  [8.369218, 124.874484], [8.369329, 124.874570], [8.369409, 124.874918], [8.369515, 124.875052], [8.371224, 124.875825],
  [8.372126, 124.875777], [8.372890, 124.875975], [8.373134, 124.876163], [8.373209, 124.876281], [8.373363, 124.876763],
  [8.373402, 124.876764], [8.373461, 124.877185], [8.373511, 124.877297], [8.374527, 124.877837], [8.375740, 124.878148],
  [8.376366, 124.880304], [8.376122, 124.881645], [8.376430, 124.881999], [8.376313, 124.882311], [8.376557, 124.882434],
  [8.376621, 124.884328], [8.376101, 124.884848], [8.375608, 124.885100], [8.375493, 124.885266], [8.375467, 124.885465],
  [8.375772, 124.885910], [8.377691, 124.887257], [8.377821, 124.887415], [8.377847, 124.887675], [8.377868, 124.888416],
  [8.377884, 124.888571], [8.377959, 124.888657], [8.378208, 124.888754], [8.378940, 124.888743], [8.379652, 124.888678],
  [8.379890, 124.888710], [8.380671, 124.889204], [8.380941, 124.889467], [8.380994, 124.889607], [8.380909, 124.890990],
  [8.380676, 124.891623], [8.380453, 124.892461], [8.381122, 124.893243], [8.381477, 124.893683], [8.381626, 124.894257],
  [8.381498, 124.897446], [8.381565, 124.897704], [8.381658, 124.897776], [8.381889, 124.897886], [8.382976, 124.898050],
  [8.383146, 124.898039], [8.383390, 124.897951], [8.384181, 124.897551], [8.384701, 124.897535], [8.384887, 124.897580],
  [8.386185, 124.898259], [8.387397, 124.898610], [8.387782, 124.898793], [8.388002, 124.898986], [8.388528, 124.899860],
  [8.388631, 124.899938], [8.390032, 124.899970], [8.390685, 124.900067], [8.390852, 124.900188], [8.390961, 124.900351],
  [8.391277, 124.901011], [8.391420, 124.901223], [8.391773, 124.901547], [8.393169, 124.902229], [8.394501, 124.903087],
  [8.394623, 124.903205], [8.394718, 124.903597], [8.394745, 124.903892], [8.394649, 124.904112], [8.393970, 124.904814],
  [8.393410, 124.905694], [8.393344, 124.905946], [8.393384, 124.906051], [8.393514, 124.906134], [8.394283, 124.906392],
  [8.394718, 124.906440], [8.395902, 124.906349], [8.396249, 124.906397], [8.396337, 124.906501], [8.396387, 124.906652],
  [8.396361, 124.906823], [8.396239, 124.907231], [8.396202, 124.907730], [8.396257, 124.907861], [8.396308, 124.907883],
  [8.396459, 124.907934], [8.398162, 124.907896], [8.398775, 124.907953], [8.399158, 124.908068], [8.399354, 124.908162],
  [8.399866, 124.908682], [8.399948, 124.908840], [8.400033, 124.909326], [8.399972, 124.909739], [8.399951, 124.909905],
  [8.399444, 124.910337], [8.399452, 124.910345], [8.399396, 124.910667], [8.399699, 124.911238], [8.399839, 124.911332],
  [8.399972, 124.911321], [8.400129, 124.911300], [8.400330, 124.911209], [8.400519, 124.911069], [8.400808, 124.910742],
  [8.401055, 124.910554], [8.401264, 124.910514], [8.401378, 124.910546], [8.401588, 124.910841], [8.401737, 124.910986],
  [8.401774, 124.911007], [8.402125, 124.911168], [8.402489, 124.911218], [8.402853, 124.911196], [8.403020, 124.911119],
  [8.403792, 124.910506], [8.405310, 124.909972], [8.405901, 124.909983], [8.406337, 124.910087], [8.406533, 124.910179],
  [8.406700, 124.910291], [8.406745, 124.910385], [8.406713, 124.910512], [8.405924, 124.911388], [8.405818, 124.911576],
  [8.405829, 124.911689], [8.405924, 124.911801], [8.406275, 124.911984], [8.406715, 124.912414], [8.407049, 124.912661],
  [8.409034, 124.913466], [8.409793, 124.913708], [8.410064, 124.913713], [8.410472, 124.913676], [8.411629, 124.913198],
  [8.412245, 124.912800], [8.412515, 124.912462], [8.412632, 124.911962], [8.413237, 124.909739], [8.413179, 124.909497],
];

const DEFAULT_CENTER: [number, number] = [8.369297, 124.876785];

interface DeviceFormProps {
  device?: Device | null;
  onSave: (data: DeviceFormData, originalDevice?: Device) => void;
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
    onSave(submitData, device || undefined);
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

                {/* Start and End markers */}
                <CircleMarker
                  center={[8.345862, 124.898846]}
                  radius={14}
                  pathOptions={{ fillColor: '#16a34a', color: '#fff', weight: 3, fillOpacity: 1 }}
                >
                  <Popup><b>Source:</b> Mangima River Origin</Popup>
                </CircleMarker>
                
                <CircleMarker
                  center={[8.413179, 124.909497]}
                  radius={14}
                  pathOptions={{ fillColor: '#ea580c', color: '#fff', weight: 3, fillOpacity: 1 }}
                >
                  <Popup><b>Mouth:</b> River Outlet</Popup>
                </CircleMarker>

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
