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

interface ChartData {
  temperature: (number | null)[];
  pH: (number | null)[];
  turbidity: (number | null)[];
  dissolved_oxygen: (number | null)[];
  water_level: (number | null)[];
  sediments: (number | null)[];
}

interface TrendChartsProps {
  chartData: ChartData;
}

// Generate 24-hour labels
const HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

// Transform data for Recharts
const transformData = (chartData: ChartData) => {
  return HOURS.map((hour, index) => ({
    hour,
    Temperature: chartData.temperature[index],
    'pH Level': chartData.pH[index],
    Turbidity: chartData.turbidity[index],
    'Dissolved O₂': chartData.dissolved_oxygen[index],
    'Water Level': chartData.water_level[index],
    Sediments: chartData.sediments[index],
  }));
};

const SENSOR_CONFIG = [
  { key: 'Temperature', color: '#dc2626', unit: '°C' },
  { key: 'pH Level', color: '#7c3aed', unit: 'pH' },
  { key: 'Turbidity', color: '#059669', unit: 'NTU' },
  { key: 'Dissolved O₂', color: '#0891b2', unit: 'mg/L' },
  { key: 'Water Level', color: '#2563eb', unit: 'm' },
  { key: 'Sediments', color: '#a16207', unit: 'mg/L' },
];

export function TrendCharts({ chartData }: TrendChartsProps) {
  const data = transformData(chartData);

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

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>📊 24-Hour Trends</div>
      </div>
      <div className={styles.cardBody}>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(13, 17, 23, 0.07)" />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 11, fill: '#8897aa' }}
              axisLine={{ stroke: 'rgba(13, 17, 23, 0.12)' }}
              tickLine={false}
              interval={3}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#8897aa' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
              iconType="line"
            />
            {SENSOR_CONFIG.map((sensor) => (
              <Line
                key={sensor.key}
                type="monotone"
                dataKey={sensor.key}
                stroke={sensor.color}
                strokeWidth={2}
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
