import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DeviceInfo, TimeSeriesChartData } from '../types/dashboard.types';

interface DeviceReadingsChartProps {
  devices: DeviceInfo[];
  deviceChartData?: Record<string, TimeSeriesChartData>;
}

const SENSOR_COLORS: Record<string, string> = {
  temperature: '#dc2626',
  ph_level: '#7c3aed',
  turbidity: '#059669',
  dissolved_oxygen: '#0891b2',
  water_level: '#2563eb',
  sediments: '#a16207',
};

const SENSOR_LABELS: Record<string, string> = {
  temperature: 'Temperature',
  ph_level: 'pH Level',
  turbidity: 'Turbidity',
  dissolved_oxygen: 'Dissolved O₂',
  water_level: 'Water Level',
  sediments: 'Sediments',
};

// Generate distinct colors for any number of devices
function getDeviceColor(index: number): string {
  const colors = [
    '#dc2626', '#2563eb', '#059669', '#d97706', '#7c3aed', 
    '#0891b2', '#db2777', '#7c2d12', '#166534', '#4338ca',
    '#9f1239', '#1d4ed8', '#15803d', '#b45309', '#6d28d9',
    '#0e7490', '#be185d', '#92400e', '#14532d', '#3730a3'
  ];
  if (index < colors.length) return colors[index];
  
  // Fallback: generate HSL colors for unlimited devices
  const hue = (index * 137.5) % 360;
  return `hsl(${hue}, 70%, 45%)`;
}

export function DeviceReadingsChart({ devices, deviceChartData }: DeviceReadingsChartProps) {
  if (!devices.length || !deviceChartData) {
    return (
      <div className="card" style={{ 
        background: '#fff', 
        borderRadius: '12px', 
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px'
      }}>
        <div style={{ textAlign: 'center', color: '#8897aa' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
          <div>No device data available</div>
        </div>
      </div>
    );
  }

  // Get active devices with data
  const activeDevices = devices
    .filter(d => deviceChartData[d.device_id]);

  if (activeDevices.length === 0) {
    return (
      <div className="card" style={{ 
        background: '#fff', 
        borderRadius: '12px', 
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px'
      }}>
        <div style={{ textAlign: 'center', color: '#8897aa' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
          <div>Waiting for sensor readings...</div>
        </div>
      </div>
    );
  }

  // Combine all device data into a single time series for each sensor
  const sensors = ['temperature', 'ph_level', 'turbidity', 'dissolved_oxygen', 'water_level', 'sediments'] as const;

  return (
    <div style={{ 
      background: '#fff', 
      borderRadius: '12px', 
      padding: '16px',
      border: '1px solid rgba(13,17,23,0.1)'
    }}>
      <div style={{ 
        fontSize: '14px', 
        fontWeight: 600, 
        color: '#0d1117', 
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>📈</span>
        <span>All Devices Sensor Trends</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {sensors.map((sensorKey) => {
          const sensorDataKey = sensorKey === 'ph_level' ? 'pH' : sensorKey;
          
          // Build combined dataset
          const timePoints = new Set<string>();
          const deviceSeries: Record<string, Array<{ time: string; value: number | null }>> = {};

          activeDevices.forEach(device => {
            const data = deviceChartData[device.device_id];
            if (!data) return;
            
            const series = data[sensorDataKey as keyof TimeSeriesChartData];
            if (!series || !Array.isArray(series)) return;

            deviceSeries[device.device_id] = series.map(p => ({
              time: new Date(p.time).toLocaleTimeString('en-PH', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              }),
              value: p.value,
            }));

            series.forEach(p => {
              timePoints.add(new Date(p.time).toLocaleTimeString('en-PH', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              }));
            });
          });

          // Sort time points
          const sortedTimes = Array.from(timePoints).sort();

          // Build chart data
          const chartData = sortedTimes.map(time => {
            const point: Record<string, string | number | null> = { time };
            activeDevices.forEach(device => {
              const devicePoint = deviceSeries[device.device_id]?.find(p => p.time === time);
              point[device.device_id] = devicePoint?.value ?? null;
            });
            return point;
          });

          const hasData = chartData.some(d => 
            activeDevices.some(device => d[device.device_id] !== null)
          );

          return (
            <div 
              key={sensorKey} 
              style={{ 
                border: '1px solid rgba(13,17,23,0.08)', 
                borderRadius: '8px', 
                padding: '8px',
                background: '#fafafa'
              }}
            >
              <div style={{ 
                fontSize: '11px', 
                fontWeight: 600, 
                color: '#0d1117',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: SENSOR_COLORS[sensorKey] 
                }} />
                {SENSOR_LABELS[sensorKey]}
              </div>
              
              {hasData ? (
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={chartData} margin={{ top: 2, right: 2, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="rgba(13,17,23,0.05)" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 7, fill: '#8897aa' }} 
                      axisLine={false} 
                      tickLine={false}
                      interval={Math.floor(chartData.length / 3)}
                    />
                    <YAxis 
                      tick={{ fontSize: 7, fill: '#8897aa' }} 
                      axisLine={false} 
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(13, 17, 23, 0.9)', 
                        border: 'none', 
                        borderRadius: '4px', 
                        fontSize: '9px', 
                        color: '#fff',
                        padding: '4px'
                      }}
                    />
                    {activeDevices.map((device, index) => (
                      <Line
                        key={device.device_id}
                        type="monotone"
                        dataKey={device.device_id}
                        stroke={getDeviceColor(index)}
                        strokeWidth={1.5}
                        dot={false}
                        connectNulls
                        name={device.device_name}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ 
                  height: 100, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#cbd5e1',
                  fontSize: '10px'
                }}>
                  No data
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Device Legend */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '8px', 
        marginTop: '12px',
        paddingTop: '8px',
        borderTop: '1px solid rgba(13,17,23,0.08)'
      }}>
        {activeDevices.map((device, index) => (
          <div 
            key={device.device_id}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              fontSize: '10px',
              color: '#3d4a5c'
            }}
          >
            <span style={{ 
              width: '8px', 
              height: '2px', 
              background: getDeviceColor(index)
            }} />
            {device.device_name}
          </div>
        ))}
      </div>
    </div>
  );
}
