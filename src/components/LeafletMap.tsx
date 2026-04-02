import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import styles from '../pages/Dashboard.module.css';
import type { DeviceInfo } from '../types/dashboard.types';

// Mangima River path coordinates (simplified from PHP)
const RIVER_PATH: [number, number][] = [
  [8.345958, 124.898607],
  [8.346955, 124.899036],
  [8.347603, 124.898081],
  [8.349471, 124.896461],
  [8.349216, 124.895474],
  [8.349535, 124.894755],
  [8.348909, 124.894058],
  [8.349881, 124.893209],
  [8.352050, 124.889584],
  [8.351096, 124.889497],
  [8.351978, 124.888415],
  [8.352369, 124.887056],
  [8.352210, 124.886676],
  [8.352643, 124.886427],
  [8.353468, 124.884863],
  [8.355492, 124.883376],
  [8.356292, 124.881332],
  [8.358270, 124.881140],
  [8.368532, 124.875713],
  [8.373977, 124.876690],
  [8.381657, 124.897203],
  [8.394810, 124.903483],
  [8.396343, 124.907500],
  [8.399906, 124.911121],
  [8.400757, 124.910773],
  [8.401407, 124.910581],
  [8.401636, 124.910868],
  [8.401774, 124.911007],
  [8.402125, 124.911168],
  [8.402489, 124.911218],
  [8.402853, 124.911196],
  [8.403020, 124.911119],
  [8.403792, 124.910506],
  [8.405310, 124.909972],
  [8.405901, 124.909983],
  [8.406337, 124.910087],
  [8.406533, 124.910179],
  [8.406700, 124.910291],
  [8.406745, 124.910385],
  [8.406713, 124.910512],
  [8.405924, 124.911388],
  [8.405818, 124.911576],
  [8.405829, 124.911689],
  [8.405924, 124.911801],
  [8.406275, 124.911984],
  [8.406715, 124.912414],
  [8.407049, 124.912661],
  [8.409034, 124.913466],
  [8.409793, 124.913708],
  [8.410064, 124.913713],
  [8.410472, 124.913676],
  [8.411629, 124.913198],
  [8.412245, 124.912800],
  [8.412515, 124.912462],
  [8.412632, 124.911962],
  [8.413237, 124.909739],
  [8.413179, 124.909497],
];

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

  // Get device color based on status
  const getDeviceColor = (device: DeviceInfo) => {
    if (device.device_condition && device.device_condition !== 'normal') {
      const conditionColors: Record<string, string> = {
        displaced: '#7c3aed',
        damaged: '#1f2937',
        malfunctioning: '#d97706',
      };
      return conditionColors[device.device_condition] || '#9ca3af';
    }
    
    const statusColors: Record<string, string> = {
      active: '#059669',
      maintenance: '#3b82f6',
      inactive: '#dc2626',
    };
    return statusColors[device.status] || '#9ca3af';
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
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
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
            
            {/* Start and End markers */}
            <CircleMarker
              center={[8.345958, 124.898607]}
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
            
            {/* Device markers */}
            {devices.map((device) => {
              if (!device.lat || !device.lng) return null;
              const color = getDeviceColor(device);
              
              return (
                <CircleMarker
                  key={device.device_id}
                  center={[device.lat, device.lng]}
                  radius={10}
                  pathOptions={{
                    fillColor: color,
                    color: '#fff',
                    weight: 2.5,
                    fillOpacity: 0.95,
                  }}
                  eventHandlers={{
                    click: () => onDeviceClick?.(device.device_id),
                  }}
                >
                  <Popup>
                    <div style={{ fontFamily: 'Instrument Sans, sans-serif', minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: color,
                          }}
                        />
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1117' }}>
                          {device.device_name}
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#3d4a5c', marginBottom: '4px' }}>
                        {device.location_name}
                      </div>
                      <div style={{ fontSize: '10px', color: '#0d1117', marginTop: '4px' }}>
                        Status: <span style={{ color }}>{device.status}</span>
                      </div>
                      {device.device_condition && device.device_condition !== 'normal' && (
                        <div style={{ fontSize: '10px', color: '#d97706', marginTop: '2px' }}>
                          ⚠️ {device.device_condition}
                        </div>
                      )}
                      <div style={{ fontSize: '10px', color: '#8897aa', marginTop: '6px', textAlign: 'center' }}>
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
