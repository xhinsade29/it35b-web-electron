import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import styles from "../assets/styles/Dashboard.module.css";
import type { DeviceInfo } from '../types/dashboard.types';
import { DEFAULT_RIVER_COORDS } from '../utils/riverUtils';

// Use shared river coordinates from riverUtils
const RIVER_PATH: [number, number][] = DEFAULT_RIVER_COORDS;

interface LeafletMapProps {
  devices: DeviceInfo[];
  onDeviceClick?: (deviceId: string) => void;
}

// Map bounds setter - focuses on device locations
function MapBounds({ devices }: { devices: DeviceInfo[] }) {
  const map = useMap();
  
  useEffect(() => {
    const devicesWithCoords = devices.filter((d): d is typeof d & { lat: number; lng: number } => 
      typeof d.lat === 'number' && typeof d.lng === 'number'
    );
    if (devicesWithCoords.length === 0) return;
    
    const bounds: [number, number][] = devicesWithCoords.map(d => [d.lat, d.lng]);
    
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [map, devices]);

  return null;
}

export function LeafletMap({ devices, onDeviceClick }: LeafletMapProps) {
  // Calculate center point
  const centerLat = (8.345958 + 8.413179) / 2;
  const centerLng = (124.898607 + 124.909497) / 2;

  // Get device color based on river_section
  const getDeviceColor = (device: DeviceInfo) => {
    const streamColors: Record<string, string> = {
      upstream: '#059669',
      midstream: '#d97706',
      downstream: '#dc2626',
    };
    return streamColors[device.river_section] || '#9ca3af';
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>🗺️ River Map</div>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.mapContainer}>
          <MapContainer
            center={[centerLat, centerLng]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            dragging={false}
            touchZoom={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            boxZoom={false}
            keyboard={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            {/* River path */}
            <Polyline
              positions={RIVER_PATH}
              pathOptions={{ color: '#0d1117', weight: 18, opacity: 0.12 }}
            />
            <Polyline
              positions={RIVER_PATH}
              pathOptions={{ color: '#1a56db', weight: 8, opacity: 0.55 }}
            />
            <Polyline
              positions={RIVER_PATH}
              pathOptions={{ color: '#60a5fa', weight: 4, opacity: 0.85 }}
            />

            {/* Device markers */}
            {devices.map((device) => {
              if (!device.lat || !device.lng) return null;
              const color = getDeviceColor(device);
              
              return (
                <CircleMarker
                  key={device.device_id}
                  center={[device.lat, device.lng]}
                  radius={6}
                  pathOptions={{
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    fillOpacity: 0.95,
                  }}
                  eventHandlers={{
                    click: () => onDeviceClick?.(device.device_id),
                  }}
                >
                  <Popup>
                    <div style={{ fontFamily: 'Instrument Sans, sans-serif', minWidth: '200px', background: 'rgba(15, 40, 84, 0.95)', padding: '12px', borderRadius: '8px', color: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: color,
                          }}
                        />
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                          {device.device_name}
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#8b9aae', marginBottom: '4px' }}>
                        {device.location_name}
                      </div>
                      <div style={{ fontSize: '10px', color: '#e8ecf1', marginTop: '4px' }}>
                        Status: <span style={{ color }}>{device.status}</span>
                      </div>
                      {device.device_condition && device.device_condition !== 'normal' && (
                        <div style={{ fontSize: '10px', color: '#fbbf24', marginTop: '2px' }}>
                          ⚠️ {device.device_condition}
                        </div>
                      )}
                      <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '6px', textAlign: 'center' }}>
                        {device.lat.toFixed(5)}°N · {device.lng.toFixed(5)}°E
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
            
            <MapBounds devices={devices} />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
