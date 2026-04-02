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
    <div className={styles.card} style={{
      background: 'linear-gradient(135deg, #0F2854 0%, #0a1f42 100%)',
      border: '1px solid rgba(73, 136, 196, 0.2)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
      marginBottom: '24px'
    }}>
      <div className={styles.cardHeader} style={{
        background: 'linear-gradient(135deg, #0a1f42 0%, #0F2854 100%)',
        borderBottom: '1px solid rgba(73, 136, 196, 0.2)',
        padding: '16px 20px'
      }}>
      </div>
      <div className={styles.cardBody}>
        {/* Summary Description */}
        <div style={{
          background: 'linear-gradient(135deg, #0a1628 0%, #0F2854 100%)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          color: '#e8ecf1',
          border: '1px solid rgba(73, 136, 196, 0.3)',
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', fontWeight: 600, color: '#ffffff' }}>
            📊 Sensor Threshold Analytics
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#8b9aae', lineHeight: 1.6 }}>
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
            <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(10, 22, 40, 0.6)', borderRadius: '8px', border: '1px solid rgba(73, 136, 196, 0.2)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ffffff' }}>{totalReadings}</div>
              <div style={{ fontSize: '0.85rem', color: '#8b9aae' }}>Total Readings</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(5, 150, 105, 0.2)', borderRadius: '8px', border: '1px solid rgba(5, 150, 105, 0.3)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#34d399' }}>{totalNormal}</div>
              <div style={{ fontSize: '0.85rem', color: '#8b9aae' }}>Normal</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(217, 119, 6, 0.2)', borderRadius: '8px', border: '1px solid rgba(217, 119, 6, 0.3)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fbbf24' }}>{totalWarning}</div>
              <div style={{ fontSize: '0.85rem', color: '#8b9aae' }}>Warnings</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(220, 38, 38, 0.2)', borderRadius: '8px', border: '1px solid rgba(220, 38, 38, 0.3)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f87171' }}>{totalCritical}</div>
              <div style={{ fontSize: '0.85rem', color: '#8b9aae' }}>Critical</div>
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
                background: 'linear-gradient(135deg, #0F2854 0%, #0a1f42 100%)',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(73, 136, 196, 0.2)',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
                    {sensor.label}
                  </span>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: value && (value < sensor.min || value > sensor.max) ? '#f87171' : 
                           value && (value < sensor.safeMin || value > sensor.safeMax) ? '#fbbf24' : '#34d399'
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
            background: 'linear-gradient(135deg, #0F2854 0%, #0a1f42 100%)', 
            borderRadius: '12px', 
            padding: '16px',
            border: '1px solid rgba(73, 136, 196, 0.2)',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
              Readings Distribution by Sensor
            </div>
            <p style={{ fontSize: '12px', color: '#8b9aae', marginBottom: '12px', lineHeight: 1.5 }}>
              Stacked bars show Normal (green), Warning (orange), and Critical (red) readings per sensor. 
              Purple line indicates average sensor value across all readings.
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={distributionData} margin={{ left: 50, right: 30, top: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(73, 136, 196, 0.2)" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#e8ecf1' }} 
                  interval={0} 
                  height={60} 
                  angle={-30} 
                  textAnchor="end"
                  tickMargin={10}
                />
                <YAxis 
                  type="number" 
                  tick={{ fontSize: 11, fill: '#8b9aae' }} 
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 'auto']}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={{ background: 'rgba(10, 22, 40, 0.95)', border: '1px solid rgba(73, 136, 196, 0.3)', borderRadius: '8px', color: '#e8ecf1', fontSize: '12px' }} />
                <Bar dataKey="normal" stackId="a" fill="#059669" radius={[3, 3, 0, 0]} />
                <Bar dataKey="warning" stackId="a" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="critical" stackId="a" fill="#dc2626" radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="avg" stroke="#818cf8" strokeWidth={2} dot={{ fill: '#818cf8', r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Radar Chart - Larger with Description */}
          <div style={{ 
            background: 'linear-gradient(135deg, #0F2854 0%, #0a1f42 100%)', 
            borderRadius: '12px', 
            padding: '20px',
            border: '1px solid rgba(73, 136, 196, 0.2)',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', marginBottom: '8px', textAlign: 'center' }}>
              River Section Comparison
            </div>
            <p style={{ fontSize: '13px', color: '#8b9aae', textAlign: 'center', marginBottom: '16px', lineHeight: 1.5 }}>
              Compare normalized sensor readings across upstream, midstream, and downstream sections. 
              Higher values indicate readings closer to maximum thresholds for each sensor type.
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid gridType="polygon" stroke="rgba(73, 136, 196, 0.2)" />
                <PolarAngleAxis dataKey="sensor" tick={{ fontSize: 11, fill: '#e8ecf1' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                <Radar name="Upstream" dataKey="upstream" stroke="#34d399" fill="#34d399" fillOpacity={0.3} />
                <Radar name="Midstream" dataKey="midstream" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.3} />
                <Radar name="Downstream" dataKey="downstream" stroke="#f87171" fill="#f87171" fillOpacity={0.3} />
                <Tooltip contentStyle={{ background: 'rgba(10, 22, 40, 0.95)', border: '1px solid rgba(73, 136, 196, 0.3)', borderRadius: '8px', color: '#e8ecf1', fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

            {/* Summary Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              <div style={{ background: 'rgba(5, 150, 105, 0.15)', border: '1px solid rgba(5, 150, 105, 0.3)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#34d399' }}>{totalNormal}</div>
                <div style={{ fontSize: '12px', color: '#8b9aae', fontWeight: 500 }}>✓ Normal</div>
              </div>
              <div style={{ background: 'rgba(217, 119, 6, 0.15)', border: '1px solid rgba(217, 119, 6, 0.3)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#fbbf24' }}>{totalWarning}</div>
                <div style={{ fontSize: '12px', color: '#8b9aae', fontWeight: 500 }}>⚡ Warning</div>
              </div>
              <div style={{ background: 'rgba(220, 38, 38, 0.15)', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#f87171' }}>{totalCritical}</div>
                <div style={{ fontSize: '12px', color: '#8b9aae', fontWeight: 500 }}>⚠ Critical</div>
              </div>
              <div style={{ background: 'rgba(79, 70, 229, 0.15)', border: '1px solid rgba(79, 70, 229, 0.3)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#818cf8' }}>{totalReadings}</div>
                <div style={{ fontSize: '12px', color: '#8b9aae', fontWeight: 500 }}>📊 Total</div>
              </div>
            </div>
        </div>

        {/* Large Threshold Line Chart */}
        <div style={{
          background: 'linear-gradient(135deg, #0F2854 0%, #0a1f42 100%)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(73, 136, 196, 0.2)',
          marginBottom: '20px',
        }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
            Threshold Boundaries & Safe Zones
          </div>
          <div style={{ fontSize: '13px', color: '#8b9aae', marginBottom: '16px' }}>
            Compare average readings against minimum, maximum, and safe zone thresholds for each sensor type.
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={thresholdLineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(73, 136, 196, 0.2)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#e8ecf1' }} interval={0} height={40} />
              <YAxis tick={{ fontSize: 10, fill: '#8b9aae' }} width={35} />
              <Tooltip contentStyle={{ background: 'rgba(10, 22, 40, 0.95)', border: '1px solid rgba(73, 136, 196, 0.3)', borderRadius: '8px', color: '#e8ecf1', fontSize: '11px' }} />
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
            background: 'linear-gradient(135deg, #0F2854 0%, #0a1f42 100%)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(73, 136, 196, 0.2)',
            borderLeft: '4px solid #4988C4'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ffffff' }}>
              {totalReadings.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#8b9aae', marginTop: '4px' }}>
              Total Readings (7d)
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #0F2854 0%, #0a1f42 100%)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(73, 136, 196, 0.2)',
            borderLeft: '4px solid #34d399'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#34d399' }}>
              {pieData.reduce((sum, d) => sum + d.value, 0) > 0 ? Math.round((totalNormal / totalReadings) * 100) + '%' : '0%'}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#8b9aae', marginTop: '4px' }}>
              Normal Rate
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #0F2854 0%, #0a1f42 100%)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(73, 136, 196, 0.2)',
            borderLeft: '4px solid #fbbf24'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fbbf24' }}>
              {totalWarning + totalCritical}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#8b9aae', marginTop: '4px' }}>
              Total Alerts
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #0F2854 0%, #0a1f42 100%)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(73, 136, 196, 0.2)',
            borderLeft: '4px solid #818cf8'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#818cf8' }}>
              {SENSORS.length}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#8b9aae', marginTop: '4px' }}>
              Sensor Types
            </div>
          </div>
        </div>

        {/* River Stream Analytics Section */}
        <div style={{
          background: 'linear-gradient(135deg, #0F2854 0%, #0a1f42 100%)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          color: '#e8ecf1',
          border: '1px solid rgba(73, 136, 196, 0.2)',
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 600, color: '#ffffff' }}>
            🌊 River Stream Analytics
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.95rem', color: '#8b9aae', lineHeight: 1.5 }}>
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
              const colors = ['#059669', '#d97706', '#dc2626'];
              
              return (
                <div key={section} style={{
                  background: 'rgba(10, 22, 40, 0.6)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid rgba(73, 136, 196, 0.3)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    color: '#ffffff'
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
                          background: 'rgba(73, 136, 196, 0.15)',
                          borderRadius: '8px',
                          padding: '10px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '0.7rem', color: '#8b9aae', marginBottom: '4px' }}>
                            {sensor.label}
                          </div>
                          <div style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: isCritical ? '#f87171' : isWarn ? '#fbbf24' : isSafe ? '#34d399' : '#e8ecf1'
                          }}>
                            {val !== undefined ? val.toFixed(1) : '—'}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#8b9aae' }}>
                            {sensor.unit}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(73, 136, 196, 0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.85rem',
                    color: '#8b9aae'
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
            background: 'rgba(10, 22, 40, 0.6)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(73, 136, 196, 0.3)',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', textAlign: 'center', color: '#ffffff' }}>
              Average Sensor Values by River Section
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={radarData} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(73, 136, 196, 0.2)" />
                <XAxis 
                  dataKey="sensor" 
                  tick={{ fill: '#e8ecf1', fontSize: 10 }} 
                  interval={0} 
                  angle={-30} 
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fill: '#8b9aae', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(10, 22, 40, 0.95)', 
                    border: '1px solid rgba(73, 136, 196, 0.3)', 
                    borderRadius: '8px', 
                    color: '#e8ecf1',
                    fontSize: '11px'
                  }} 
                />
                <Bar dataKey="upstream" fill="#34d399" radius={[4, 4, 0, 0]} name="Upstream" />
                <Bar dataKey="midstream" fill="#fbbf24" radius={[4, 4, 0, 0]} name="Midstream" />
                <Bar dataKey="downstream" fill="#f87171" radius={[4, 4, 0, 0]} name="Downstream" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
