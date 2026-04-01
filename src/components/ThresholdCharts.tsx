import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import styles from '../pages/Dashboard.module.css';

interface ThresholdChartProps {
  value: number | null;
  min: number;
  max: number;
  unit: string;
  label: string;
  color: string;
}

function ThresholdGauge({ value, min, max, unit, label, color }: ThresholdChartProps) {
  const hasValue = value !== null && value !== undefined;
  
  // Calculate percentage position for the threshold bar
  const range = max - min;
  
  // Calculate safe zone (middle 50%)
  const safeStart = min + range * 0.25;
  const safeEnd = min + range * 0.75;
  
  // Current value position
  const valuePercent = hasValue 
    ? Math.max(0, Math.min(100, ((value - min) / range) * 100))
    : 50;

  const isWarn = hasValue && (value < safeStart || value > safeEnd) && (value >= min && value <= max);
  const isCritical = hasValue && (value < min || value > max);

  return (
    <div style={{ 
      background: '#f9fafb', 
      borderRadius: '12px', 
      padding: '16px',
      border: '1px solid rgba(13,17,23,0.06)',
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#3d4a5c' }}>
          {label}
        </span>
        <span style={{ 
          fontSize: '14px', 
          fontWeight: 700, 
          color: isCritical ? '#dc2626' : isWarn ? '#d97706' : '#059669',
          fontFamily: 'JetBrains Mono, monospace'
        }}>
          {hasValue ? `${value.toFixed(1)} ${unit}` : '—'}
        </span>
      </div>

      {/* Threshold bar */}
      <div style={{ position: 'relative', height: '24px', marginBottom: '8px' }}>
        {/* Background track */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          height: '8px',
          background: '#e5e7eb',
          borderRadius: '4px',
        }}>
          {/* Safe zone */}
          <div style={{
            position: 'absolute',
            left: '25%',
            width: '50%',
            height: '100%',
            background: 'rgba(5, 150, 105, 0.3)',
            borderRadius: '2px',
          }} />
        </div>

        {/* Threshold markers */}
        <div style={{
          position: 'absolute',
          left: '0%',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '2px',
          height: '14px',
          background: '#dc2626',
          borderRadius: '1px',
        }} title={`Min: ${min}`} />
        <div style={{
          position: 'absolute',
          left: '100%',
          transform: 'translateX(-100%) translateY(-50%)',
          top: '50%',
          width: '2px',
          height: '14px',
          background: '#dc2626',
          borderRadius: '1px',
        }} title={`Max: ${max}`} />

        {/* Current value indicator */}
        {hasValue && (
          <div style={{
            position: 'absolute',
            left: `${valuePercent}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '12px',
            height: '20px',
            background: isCritical ? '#dc2626' : isWarn ? '#d97706' : color,
            borderRadius: '6px',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            zIndex: 10,
          }} />
        )}
      </div>

      {/* Labels */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        fontSize: '10px',
        color: '#8897aa'
      }}>
        <span>{min} {unit}</span>
        <span style={{ color: '#059669', fontWeight: 500 }}>Safe Zone</span>
        <span>{max} {unit}</span>
      </div>

      {/* Status badge */}
      <div style={{ marginTop: '8px', textAlign: 'center' }}>
        <span style={{
          fontSize: '11px',
          padding: '4px 10px',
          borderRadius: '12px',
          fontWeight: 500,
          background: isCritical ? '#fee2e2' : isWarn ? '#fef3c7' : '#d1fae5',
          color: isCritical ? '#dc2626' : isWarn ? '#d97706' : '#059669',
        }}>
          {isCritical ? '⚠ Critical' : isWarn ? '⚡ Warning' : '✓ Normal'}
        </span>
      </div>
    </div>
  );
}

interface ThresholdChartsProps {
  sectionConditions: Record<string, {
    temperature?: number | null;
    ph_level?: number | null;
    turbidity?: number | null;
    dissolved_oxygen?: number | null;
    water_level?: number | null;
    sediments?: number | null;
  }>;
}

const SENSORS = [
  { key: 'temperature', label: 'Temperature', unit: '°C', min: 20, max: 35, color: '#dc2626', safeMin: 24, safeMax: 30 },
  { key: 'ph_level', label: 'pH Level', unit: 'pH', min: 6.5, max: 8.5, color: '#7c3aed', safeMin: 7.0, safeMax: 8.0 },
  { key: 'turbidity', label: 'Turbidity', unit: 'NTU', min: 0, max: 50, color: '#059669', safeMin: 5, safeMax: 25 },
  { key: 'dissolved_oxygen', label: 'Dissolved O₂', unit: 'mg/L', min: 5, max: 14, color: '#0891b2', safeMin: 6.5, safeMax: 11 },
  { key: 'water_level', label: 'Water Level', unit: 'm', min: 0.5, max: 3.0, color: '#2563eb', safeMin: 1.0, safeMax: 2.5 },
  { key: 'sediments', label: 'Sediments', unit: 'mg/L', min: 0, max: 500, color: '#a16207', safeMin: 10, safeMax: 300 },
];

export function ThresholdCharts({ sectionConditions }: ThresholdChartsProps) {
  // Get readings by section
  const allReadings: Record<string, number[]> = {};
  const sectionReadings: Record<string, Record<string, number>> = {
    upstream: {},
    midstream: {},
    downstream: {},
  };
  
  SENSORS.forEach(sensor => {
    allReadings[sensor.key] = [];
    Object.entries(sectionConditions).forEach(([sectionName, section]) => {
      const value = section[sensor.key as keyof typeof section];
      if (value !== null && value !== undefined) {
        allReadings[sensor.key].push(value);
        sectionReadings[sectionName][sensor.key] = value;
      }
    });
  });

  // Distribution data for stacked bar
  const distributionData = SENSORS.map(sensor => {
    const values = allReadings[sensor.key] || [];
    let normal = 0, warning = 0, critical = 0;
    
    values.forEach(v => {
      if (v >= sensor.safeMin && v <= sensor.safeMax) normal++;
      else if (v >= sensor.min && v <= sensor.max) warning++;
      else critical++;
    });
    
    return {
      name: sensor.label,
      normal,
      warning,
      critical,
      total: values.length,
      avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
    };
  });

  // Section comparison data for radar chart
  const radarData = SENSORS.map(sensor => {
    return {
      sensor: sensor.label,
      upstream: Math.round((sectionReadings.upstream[sensor.key] || 0) / sensor.max * 100),
      midstream: Math.round((sectionReadings.midstream[sensor.key] || 0) / sensor.max * 100),
      downstream: Math.round((sectionReadings.downstream[sensor.key] || 0) / sensor.max * 100),
      fullMark: 100,
    };
  });

  // Pie chart data for overall status
  const totalReadings = Object.values(allReadings).flat().length;
  let totalNormal = 0, totalWarning = 0, totalCritical = 0;
  
  SENSORS.forEach(sensor => {
    const values = allReadings[sensor.key] || [];
    values.forEach(v => {
      if (v >= sensor.safeMin && v <= sensor.safeMax) totalNormal++;
      else if (v >= sensor.min && v <= sensor.max) totalWarning++;
      else totalCritical++;
    });
  });

  const pieData = [
    { name: 'Normal', value: totalNormal, color: '#059669' },
    { name: 'Warning', value: totalWarning, color: '#f59e0b' },
    { name: 'Critical', value: totalCritical, color: '#dc2626' },
  ].filter(d => d.value > 0);

  // Threshold boundary line data
  const thresholdLineData = SENSORS.map(sensor => ({
    name: sensor.label,
    min: sensor.min,
    max: sensor.max,
    safeMin: sensor.safeMin,
    safeMax: sensor.safeMax,
    avg: distributionData.find(d => d.name === sensor.label)?.avg || 0,
  }));

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>📊 Sensor Threshold Analytics</div>
      </div>
      <div className={styles.cardBody}>
        
        {/* Compact Layout - Gauges + Pie in 2 columns */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr', 
          gap: '12px',
          marginBottom: '12px'
        }}>
          {/* Compact Gauges - 3x2 grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '8px',
          }}>
            {SENSORS.map(sensor => {
              const value = Object.values(sectionConditions)
                .map(s => s[sensor.key as keyof typeof s])
                .find(v => v !== null && v !== undefined) ?? null;
              
              return (
                <ThresholdGauge
                  key={sensor.key}
                  value={value}
                  min={sensor.min}
                  max={sensor.max}
                  unit={sensor.unit}
                  label={sensor.label}
                  color={sensor.color}
                />
              );
            })}
          </div>

          {/* Compact Pie Chart */}
          <div style={{ 
            background: '#f9fafb', 
            borderRadius: '8px', 
            padding: '12px',
            border: '1px solid rgba(13,17,23,0.06)',
          }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: 600, 
              color: '#3d4a5c',
              marginBottom: '4px',
              textAlign: 'center'
            }}>
              Status Distribution
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(13, 17, 23, 0.92)', 
                    border: 'none', 
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '11px'
                  }} 
                />
                <Legend verticalAlign="bottom" height={20} iconSize={8} wrapperStyle={{fontSize: '10px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Compact Charts Row - 3 columns */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '12px',
          marginBottom: '12px'
        }}>
          {/* Stacked Bar */}
          <div style={{ 
            background: '#f9fafb', 
            borderRadius: '8px', 
            padding: '12px',
            border: '1px solid rgba(13,17,23,0.06)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#3d4a5c', marginBottom: '8px' }}>
              Distribution
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={distributionData} layout="vertical" margin={{ left: 60, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(13,17,23,0.07)" />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#8897aa' }} axisLine={false} hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#3d4a5c' }} width={55} axisLine={false} />
                <Tooltip contentStyle={{ background: 'rgba(13, 17, 23, 0.92)', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px' }} />
                <Bar dataKey="normal" stackId="a" fill="#059669" radius={[0, 2, 2, 0]} />
                <Bar dataKey="warning" stackId="a" fill="#f59e0b" radius={[0, 2, 2, 0]} />
                <Bar dataKey="critical" stackId="a" fill="#dc2626" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar Chart */}
          <div style={{ 
            background: '#f9fafb', 
            borderRadius: '8px', 
            padding: '12px',
            border: '1px solid rgba(13,17,23,0.06)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#3d4a5c', marginBottom: '4px', textAlign: 'center' }}>
              Section Comparison
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <RadarChart data={radarData}>
                <PolarGrid gridType="polygon" />
                <PolarAngleAxis dataKey="sensor" tick={{ fontSize: 8 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                <Radar name="Up" dataKey="upstream" stroke="#059669" fill="#059669" fillOpacity={0.3} />
                <Radar name="Mid" dataKey="midstream" stroke="#d97706" fill="#d97706" fillOpacity={0.3} />
                <Radar name="Down" dataKey="downstream" stroke="#dc2626" fill="#dc2626" fillOpacity={0.3} />
                <Tooltip contentStyle={{ background: 'rgba(13, 17, 23, 0.92)', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '10px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Compact Summary Stats */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '8px',
          }}>
            <div style={{ background: '#d1fae5', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#059669' }}>{totalNormal}</div>
              <div style={{ fontSize: '9px', color: '#3d4a5c' }}>Normal</div>
            </div>
            <div style={{ background: '#fef3c7', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#d97706' }}>{totalWarning}</div>
              <div style={{ fontSize: '9px', color: '#3d4a5c' }}>Warning</div>
            </div>
            <div style={{ background: '#fee2e2', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#dc2626' }}>{totalCritical}</div>
              <div style={{ fontSize: '9px', color: '#3d4a5c' }}>Critical</div>
            </div>
            <div style={{ background: '#e0e7ff', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#4f46e5' }}>{totalReadings}</div>
              <div style={{ fontSize: '9px', color: '#3d4a5c' }}>Total</div>
            </div>
          </div>
        </div>

        {/* Compact Line Chart */}
        <div style={{ 
          background: '#f9fafb', 
          borderRadius: '8px', 
          padding: '12px',
          border: '1px solid rgba(13,17,23,0.06)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#3d4a5c', marginBottom: '8px' }}>
            Threshold Boundaries
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <ComposedChart data={thresholdLineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,17,23,0.07)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#3d4a5c' }} interval={0} height={30} />
              <YAxis tick={{ fontSize: 9, fill: '#8897aa' }} width={30} />
              <Tooltip contentStyle={{ background: 'rgba(13, 17, 23, 0.92)', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '10px' }} />
              <Line type="monotone" dataKey="max" stroke="#dc2626" strokeDasharray="5 5" dot={false} strokeWidth={1} />
              <Line type="monotone" dataKey="min" stroke="#dc2626" strokeDasharray="5 5" dot={false} strokeWidth={1} />
              <Line type="monotone" dataKey="safeMax" stroke="#059669" strokeDasharray="3 3" dot={false} strokeWidth={1} />
              <Line type="monotone" dataKey="safeMin" stroke="#059669" strokeDasharray="3 3" dot={false} strokeWidth={1} />
              <Area type="monotone" dataKey="safeMax" stroke="none" fill="rgba(5, 150, 105, 0.15)" />
              <Line type="monotone" dataKey="avg" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
