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
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import styles from '../pages/Dashboard.module.css';

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
        {/* Summary Description */}
        <div style={{
          background: 'linear-gradient(135deg, #1a56db 0%, #3b82f6 100%)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          color: 'white',
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', fontWeight: 600 }}>
            📊 Sensor Threshold Analytics
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.95rem', opacity: 0.95, lineHeight: 1.6 }}>
            Monitor water quality sensor readings across all river sections. Real-time threshold monitoring 
            helps identify critical conditions, warnings, and normal operating ranges for temperature, pH, 
            turbidity, dissolved oxygen, water level, and sediment levels.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginTop: '16px',
          }}>
            <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{totalReadings}</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Total Readings</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#d1fae5' }}>{totalNormal}</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Normal</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fef3c7' }}>{totalWarning}</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Warnings</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fee2e2' }}>{totalCritical}</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Critical</div>
            </div>
          </div>
        </div>
        
        {/* Sensor Line Charts Grid - 3 columns */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '16px',
          marginBottom: '20px'
        }}>
          {SENSORS.map(sensor => {
            const value = Object.values(sectionConditions)
              .map(s => s[sensor.key as keyof typeof s])
              .find(v => v !== null && v !== undefined) ?? null;
            
            // Create data points for the line chart
            const chartData = [
              { name: 'Min', value: sensor.min, threshold: 'limit' },
              { name: 'Safe Min', value: sensor.safeMin, threshold: 'safe' },
              { name: 'Current', value: value ?? sensor.safeMin, threshold: 'current' },
              { name: 'Safe Max', value: sensor.safeMax, threshold: 'safe' },
              { name: 'Max', value: sensor.max, threshold: 'limit' },
            ];
            
            return (
              <div key={sensor.key} style={{
                background: 'white',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid rgba(13,17,23,0.06)',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#3d4a5c' }}>
                    {sensor.label}
                  </span>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: value && (value < sensor.min || value > sensor.max) ? '#dc2626' : 
                           value && (value < sensor.safeMin || value > sensor.safeMax) ? '#d97706' : '#059669'
                  }}>
                    {value !== null && value !== undefined ? `${value.toFixed(1)} ${sensor.unit}` : '—'}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,17,23,0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 8 }} axisLine={false} interval={0} />
                    <YAxis domain={[sensor.min * 0.9, sensor.max * 1.1]} tick={{ fontSize: 8 }} width={30} />
                    <Tooltip 
                      contentStyle={{ background: 'rgba(13, 17, 23, 0.92)', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '10px' }}
                      formatter={(val) => [`${Number(val).toFixed(1)} ${sensor.unit}`, 'Value']}
                    />
                    {/* Safe zone area */}
                    <ReferenceArea x1="Safe Min" x2="Safe Max" fill="rgba(5, 150, 105, 0.1)" />
                    {/* Threshold lines */}
                    <ReferenceLine y={sensor.min} stroke="#dc2626" strokeDasharray="3 3" />
                    <ReferenceLine y={sensor.max} stroke="#dc2626" strokeDasharray="3 3" />
                    <ReferenceLine y={sensor.safeMin} stroke="#059669" strokeDasharray="2 2" />
                    <ReferenceLine y={sensor.safeMax} stroke="#059669" strokeDasharray="2 2" />
                    {/* Main value line */}
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={sensor.color} 
                      strokeWidth={3}
                      dot={{ fill: sensor.color, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>

        {/* Charts Row - 3 columns with larger charts */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '20px',
          marginBottom: '20px'
        }}>
          {/* Stacked Bar + Line Chart Combo */}
          <div style={{ 
            background: '#f9fafb', 
            borderRadius: '12px', 
            padding: '16px',
            border: '1px solid rgba(13,17,23,0.06)',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#3d4a5c', marginBottom: '8px' }}>
              Readings Distribution by Sensor
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', lineHeight: 1.5 }}>
              Stacked bars show Normal (green), Warning (orange), and Critical (red) readings per sensor. 
              Purple line indicates average sensor value across all readings.
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={distributionData} margin={{ left: 40, right: 20, top: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(13,17,23,0.07)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#3d4a5c' }} interval={0} height={50} angle={-45} textAnchor="end" />
                <YAxis type="number" tick={{ fontSize: 10, fill: '#8897aa' }} axisLine={false} />
                <Tooltip contentStyle={{ background: 'rgba(13, 17, 23, 0.92)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Bar dataKey="normal" stackId="a" fill="#059669" radius={[3, 3, 0, 0]} />
                <Bar dataKey="warning" stackId="a" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="critical" stackId="a" fill="#dc2626" radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="avg" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Radar Chart - Larger with Description */}
          <div style={{ 
            background: '#f9fafb', 
            borderRadius: '12px', 
            padding: '20px',
            border: '1px solid rgba(13,17,23,0.06)',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#3d4a5c', marginBottom: '8px', textAlign: 'center' }}>
              River Section Comparison
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', marginBottom: '16px', lineHeight: 1.5 }}>
              Compare normalized sensor readings across upstream, midstream, and downstream sections. 
              Higher values indicate readings closer to maximum thresholds for each sensor type.
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid gridType="polygon" />
                <PolarAngleAxis dataKey="sensor" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                <Radar name="Upstream" dataKey="upstream" stroke="#059669" fill="#059669" fillOpacity={0.3} />
                <Radar name="Midstream" dataKey="midstream" stroke="#d97706" fill="#d97706" fillOpacity={0.3} />
                <Radar name="Downstream" dataKey="downstream" stroke="#dc2626" fill="#dc2626" fillOpacity={0.3} />
                <Tooltip contentStyle={{ background: 'rgba(13, 17, 23, 0.92)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Stats Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '12px',
          }}>
            <div style={{ background: '#d1fae5', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#059669' }}>{totalNormal}</div>
              <div style={{ fontSize: '12px', color: '#065f46', fontWeight: 500 }}>✓ Normal</div>
            </div>
            <div style={{ background: '#fef3c7', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#d97706' }}>{totalWarning}</div>
              <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 500 }}>⚡ Warning</div>
            </div>
            <div style={{ background: '#fee2e2', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#dc2626' }}>{totalCritical}</div>
              <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: 500 }}>⚠ Critical</div>
            </div>
            <div style={{ background: '#e0e7ff', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#4f46e5' }}>{totalReadings}</div>
              <div style={{ fontSize: '12px', color: '#3730a3', fontWeight: 500 }}>📊 Total</div>
            </div>
          </div>
        </div>

        {/* Large Threshold Line Chart */}
        <div style={{ 
          background: '#f9fafb', 
          borderRadius: '12px', 
          padding: '20px',
          border: '1px solid rgba(13,17,23,0.06)',
          marginBottom: '20px',
        }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#3d4a5c', marginBottom: '16px' }}>
            Threshold Boundaries & Safe Zones
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
            Compare average readings against minimum, maximum, and safe zone thresholds for each sensor type.
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={thresholdLineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,17,23,0.07)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#3d4a5c' }} interval={0} height={40} />
              <YAxis tick={{ fontSize: 10, fill: '#8897aa' }} width={35} />
              <Tooltip contentStyle={{ background: 'rgba(13, 17, 23, 0.92)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
              <Line type="monotone" dataKey="max" stroke="#dc2626" strokeDasharray="5 5" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="min" stroke="#dc2626" strokeDasharray="5 5" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="safeMax" stroke="#059669" strokeDasharray="3 3" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="safeMin" stroke="#059669" strokeDasharray="3 3" dot={false} strokeWidth={2} />
              <Area type="monotone" dataKey="safeMax" stroke="none" fill="rgba(5, 150, 105, 0.15)" />
              <Line type="monotone" dataKey="avg" stroke="#7c3aed" strokeWidth={3} dot={{ fill: '#7c3aed', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats Row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ 
            background: 'white', 
            borderRadius: '12px', 
            padding: '20px', 
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #1a56db'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>
              {totalReadings.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
              Total Readings (7d)
            </div>
          </div>
          <div style={{ 
            background: 'white', 
            borderRadius: '12px', 
            padding: '20px', 
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #059669'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#059669' }}>
              {pieData.reduce((sum, d) => sum + d.value, 0) > 0 ? Math.round((totalNormal / totalReadings) * 100) + '%' : '0%'}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
              Normal Rate
            </div>
          </div>
          <div style={{ 
            background: 'white', 
            borderRadius: '12px', 
            padding: '20px', 
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #d97706'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#d97706' }}>
              {totalWarning + totalCritical}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
              Total Alerts
            </div>
          </div>
          <div style={{ 
            background: 'white', 
            borderRadius: '12px', 
            padding: '20px', 
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #7c3aed'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#7c3aed' }}>
              {SENSORS.length}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
              Sensor Types
            </div>
          </div>
        </div>

        {/* River Stream Analytics Section */}
        <div style={{
          background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          color: 'white',
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 600 }}>
            🌊 River Stream Analytics
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.95rem', opacity: 0.95, lineHeight: 1.5 }}>
            Monitor water quality across three river sections. Each section shows average readings 
            for all sensors with real-time status indicators.
          </p>

          {/* Stream Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '20px'
          }}>
            {['upstream', 'midstream', 'downstream'].map((section, idx) => {
              const sectionData = sectionReadings[section] || {};
              const readings = Object.values(sectionData);
              const hasData = readings.length > 0;
              const avgValue = hasData ? readings.reduce((a, b) => a + b, 0) / readings.length : 0;
              const colors = ['#059669', '#d97706', '#dc2626'];
              const bgColors = ['rgba(5, 150, 105, 0.2)', 'rgba(217, 119, 6, 0.2)', 'rgba(220, 38, 38, 0.2)'];
              
              return (
                <div key={section} style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'capitalize'
                  }}>
                    <span style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: colors[idx]
                    }} />
                    {section}
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px'
                  }}>
                    {SENSORS.slice(0, 4).map(sensor => {
                      const val = sectionData[sensor.key];
                      const isSafe = val && val >= sensor.safeMin && val <= sensor.safeMax;
                      const isWarn = val && (val < sensor.safeMin || val > sensor.safeMax) && val >= sensor.min && val <= sensor.max;
                      const isCritical = val && (val < sensor.min || val > sensor.max);
                      
                      return (
                        <div key={sensor.key} style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          padding: '10px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '0.7rem', opacity: 0.8, marginBottom: '4px' }}>
                            {sensor.label}
                          </div>
                          <div style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: isCritical ? '#fee2e2' : isWarn ? '#fef3c7' : isSafe ? '#d1fae5' : 'white'
                          }}>
                            {val !== undefined ? val.toFixed(1) : '—'}
                          </div>
                          <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>
                            {sensor.unit}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.85rem'
                  }}>
                    <span>Readings: {readings.length}</span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: hasData ? 'rgba(5, 150, 105, 0.3)' : 'rgba(100, 100, 100, 0.3)',
                      fontSize: '0.75rem'
                    }}>
                      {hasData ? 'Active' : 'No Data'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stream Comparison Bar Chart */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', textAlign: 'center' }}>
              Average Sensor Values by River Section
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={radarData} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                <XAxis 
                  dataKey="sensor" 
                  tick={{ fill: 'white', fontSize: 10 }} 
                  interval={0} 
                  angle={-30} 
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(13, 17, 23, 0.95)', 
                    border: 'none', 
                    borderRadius: '8px', 
                    color: '#fff',
                    fontSize: '11px'
                  }} 
                />
                <Bar dataKey="upstream" fill="#059669" radius={[4, 4, 0, 0]} name="Upstream" />
                <Bar dataKey="midstream" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Midstream" />
                <Bar dataKey="downstream" fill="#ef4444" radius={[4, 4, 0, 0]} name="Downstream" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
