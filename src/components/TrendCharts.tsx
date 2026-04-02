import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import styles from '../pages/Dashboard.module.css';
import type { ChartData } from '../types/dashboard.types';

interface TrendChartsProps {
  chartData: ChartData;
}

const SENSOR_CONFIG = [
  { key: 'temperature', label: 'Temperature', color: '#dc2626', unit: '°C' },
  { key: 'pH', label: 'pH Level', color: '#7c3aed', unit: 'pH' },
  { key: 'turbidity', label: 'Turbidity', color: '#059669', unit: 'NTU' },
  { key: 'dissolved_oxygen', label: 'Dissolved O₂', color: '#0891b2', unit: 'mg/L' },
  { key: 'water_level', label: 'Water Level', color: '#2563eb', unit: 'm' },
  { key: 'sediments', label: 'Sediments', color: '#a16207', unit: 'mg/L' },
];

// Transform time-series data for Recharts
const transformData = (chartData: ChartData) => {
  // Get all unique timestamps
  const timestamps = new Set<string>();
  Object.values(chartData).forEach((sensorData: Array<{ time: string; value: number }>) => {
    sensorData.forEach((point: { time: string }) => timestamps.add(point.time));
  });

  // Sort timestamps
  const sortedTimes = Array.from(timestamps).sort();

  // Build data points
  return sortedTimes.map(time => {
    const point: Record<string, string | number | null> = { 
      time: new Date(time).toLocaleTimeString('en-PH', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    };
    
    SENSOR_CONFIG.forEach(sensor => {
      const sensorData = chartData[sensor.key as keyof ChartData];
      const sensorPoint = sensorData.find((p: { time: string }) => p.time === time);
      point[sensor.label] = sensorPoint?.value ?? null;
    });
    
    return point;
  });
};

export function TrendCharts({ chartData }: TrendChartsProps) {
  const data = transformData(chartData);

  // Check if we have any data
  const hasData = data.some(d => 
    SENSOR_CONFIG.some(sensor => d[sensor.label] !== null)
  );

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ color: string; name: string; value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: 'rgba(13, 17, 23, 0.92)',
            padding: '10px',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '12px',
          }}
        >
          <div style={{ marginBottom: '4px', fontWeight: 600 }}>{label}</div>
          {payload.map((entry, index) => (
            <div key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value?.toFixed(2)}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!hasData) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle} style={{ fontSize: '13px' }}>📊 Sensor Trends</div>
        </div>
        <div className={styles.cardBody} style={{ padding: '40px', textAlign: 'center', color: '#8897aa' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📈</div>
          <div>No trend data available</div>
          <div style={{ fontSize: '11px', marginTop: '4px' }}>Start simulation to collect data</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle} style={{ fontSize: '13px' }}>📊 Sensor Trends</div>
      </div>
      <div className={styles.cardBody} style={{ padding: '12px' }}>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(13, 17, 23, 0.07)" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fill: '#8897aa' }}
              axisLine={{ stroke: 'rgba(13, 17, 23, 0.12)' }}
              tickLine={false}
              interval={Math.floor(data.length / 6)}
              height={20}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#8897aa' }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 9, paddingTop: '4px' }}
              iconSize={8}
              height={20}
            />
            {SENSOR_CONFIG.map((sensor) => (
              <Line
                key={sensor.key}
                type="monotone"
                dataKey={sensor.label}
                stroke={sensor.color}
                strokeWidth={1.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
