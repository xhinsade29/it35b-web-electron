/**
 * Device Map Overview Component
 * Interactive map showing all devices
 * Migrated from PHP device.php
 */

import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import type { Device, DeviceMapData } from '../types/device.types';
import { getDeviceStatusColor } from '../services/deviceService';
import styles from './DeviceMapOverview.module.css';

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

interface DeviceMapOverviewProps {
  devices: Device[];
  selectedDeviceId?: string | null;
  onSelectDevice?: (deviceId: string) => void;
}

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

export function DeviceMapOverview({
  devices,
  selectedDeviceId,
  onSelectDevice,
}: DeviceMapOverviewProps) {
  const [visible, setVisible] = useState(true);

  const devicesWithCoords = devices.filter((d) => d.latitude && d.longitude);

  // Calculate center point
  const avgLat =
    devicesWithCoords.reduce((sum, d) => sum + (d.latitude || 0), 0) /
      devicesWithCoords.length || 8.369297;
  const avgLng =
    devicesWithCoords.reduce((sum, d) => sum + (d.longitude || 0), 0) /
      devicesWithCoords.length || 124.876785;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>📍 Device Locations</h3>
        <button
          className={styles.toggleBtn}
          onClick={() => setVisible(!visible)}
        >
          {visible ? 'Hide Map' : 'Show Map'}
        </button>
      </div>

      {visible && (
        <div className={styles.mapWrapper}>
          <MapContainer
            center={[avgLat, avgLng]}
            zoom={13}
            className={styles.map}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            {/* River polyline */}
            <Polyline
              positions={RIVER_COORDS}
              color="#3b82f6"
              weight={4}
              opacity={0.85}
            />

            {/* Device markers */}
            {devicesWithCoords.map((device) => {
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
                    click: () => onSelectDevice?.(device.device_id),
                  }}
                >
                  <Popup>
                    <div className={styles.popup}>
                      <strong>{device.device_name}</strong>
                      <div className={styles.popupRow}>
                        Status:
                        <span style={{ color }}>{device.status}</span>
                      </div>
                      {device.device_condition !== 'normal' && (
                        <div className={styles.popupWarning}>
                          ⚠️ {device.device_condition}
                        </div>
                      )}
                      {device.location_name && (
                        <div className={styles.popupRow}>
                          Location: {device.location_name}
                        </div>
                      )}
                      {device.river_section && (
                        <div className={styles.popupRow}>
                          {device.river_section.charAt(0).toUpperCase() +
                            device.river_section.slice(1)}{' '}
                          Section
                        </div>
                      )}
                      <div className={styles.popupCoords}>
                        {device.latitude?.toFixed(5)}°N, {device.longitude?.toFixed(5)}°E
                      </div>
                      <div className={styles.popupActions}>
                        <button
                          className={styles.popupBtn}
                          onClick={() => onSelectDevice?.(device.device_id)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            <MapBounds devices={devices} />
          </MapContainer>

          {/* Legend */}
          <div className={styles.legend}>
            <div className={styles.legendTitle}>Device Status</div>
            <div className={styles.legendItems}>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ background: '#059669' }}
                ></span>
                Active
              </div>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ background: '#3b82f6' }}
                ></span>
                Maintenance
              </div>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ background: '#7c3aed' }}
                ></span>
                Displaced
              </div>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ background: '#1f2937' }}
                ></span>
                Damaged
              </div>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ background: '#d97706' }}
                ></span>
                Malfunctioning
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
