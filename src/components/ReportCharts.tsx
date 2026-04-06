/**
 * Report Charts Component
 * Daily trend line chart and sensor distribution doughnut chart
 */

import type { DailyTrend, SensorStats } from '../types/reports.types';
import styles from '../assets/styles/ReportCharts.module.css';

interface ReportChartsProps {
  dailyTrend: DailyTrend[];
  sensorStats: SensorStats[];
}

const COLORS = ['#1a56db', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

export function ReportCharts({ dailyTrend, sensorStats }: ReportChartsProps) {
  // Simple SVG line chart for daily trend
  const maxReadings = Math.max(...dailyTrend.map((d) => d.total_readings), 1);
  const chartWidth = 500;
  const chartHeight = 240;
  const padding = 30;

  const points = dailyTrend.map((d, i) => {
    const x = padding + (i / (dailyTrend.length - 1 || 1)) * (chartWidth - 2 * padding);
    const y = chartHeight - padding - (d.total_readings / maxReadings) * (chartHeight - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  // Calculate sensor distribution
  const totalSensorReadings = sensorStats.reduce((sum, s) => sum + s.total_readings, 0);
  let currentAngle = 0;

  return (
    <div className={styles.chartsGrid}>
      {/* Daily Readings Trend */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Daily Readings Trend</h2>
        </div>
        <div className={styles.cardBody}>
          <p className={styles.chartDescription}>
            Shows the total number of sensor readings collected per day over the selected time period. 
            This helps identify data collection patterns and detect any gaps in monitoring.
          </p>
          <div className={styles.chartContainer}>
            {dailyTrend.length === 0 ? (
              <div className={styles.emptyState}>No data available</div>
            ) : (
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className={styles.lineChart}>
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                  <line
                    key={pct}
                    x1={padding}
                    y1={chartHeight - padding - pct * (chartHeight - 2 * padding)}
                    x2={chartWidth - padding}
                    y2={chartHeight - padding - pct * (chartHeight - 2 * padding)}
                    stroke="rgba(73, 136, 196, 0.2)"
                    strokeDasharray="4"
                  />
                ))}
                {/* Line */}
                <polyline
                  fill="none"
                  stroke="#4988C4"
                  strokeWidth="2"
                  points={points}
                />
                {/* Area under line */}
                <polygon
                  fill="rgba(73, 136, 196, 0.2)"
                  points={`${padding},${chartHeight - padding} ${points} ${chartWidth - padding},${chartHeight - padding}`}
                />
                {/* Data points */}
                {dailyTrend.map((d, i) => {
                  const x = padding + (i / (dailyTrend.length - 1 || 1)) * (chartWidth - 2 * padding);
                  const y = chartHeight - padding - (d.total_readings / maxReadings) * (chartHeight - 2 * padding);
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#4988C4"
                    />
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Sensor Distribution */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Sensor Readings Distribution</h2>
        </div>
        <div className={styles.cardBody}>
          <p className={styles.chartDescription}>
            Displays the proportion of readings from each sensor type (temperature, pH, turbidity, etc.). 
            This visualization helps understand which sensors are most active and contributing data.
          </p>
          <div className={styles.chartContainer}>
            {sensorStats.length === 0 ? (
              <div className={styles.emptyState}>No data available</div>
            ) : (
              <div className={styles.doughnutChart}>
                <svg viewBox="0 0 200 200" className={styles.doughnutSvg}>
                  {sensorStats.map((sensor, i) => {
                    const percentage = sensor.total_readings / totalSensorReadings;
                    const angle = percentage * 360;
                    const startAngle = currentAngle;
                    currentAngle += angle;
                    
                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = ((startAngle + angle) * Math.PI) / 180;
                    
                    const x1 = 100 + 80 * Math.cos(startRad);
                    const y1 = 100 + 80 * Math.sin(startRad);
                    const x2 = 100 + 80 * Math.cos(endRad);
                    const y2 = 100 + 80 * Math.sin(endRad);
                    
                    const largeArc = angle > 180 ? 1 : 0;
                    
                    return (
                      <path
                        key={sensor.sensor_type}
                        d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={COLORS[i % COLORS.length]}
                        stroke="white"
                        strokeWidth="2"
                      />
                    );
                  })}
                  <circle cx="100" cy="100" r="50" fill="rgba(10, 22, 40, 0.8)" />
                </svg>
                <div className={styles.legend}>
                  {sensorStats.map((sensor, i) => (
                    <div key={sensor.sensor_type} className={styles.legendItem}>
                      <span
                        className={styles.legendColor}
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className={styles.legendLabel}>
                        {sensor.sensor_type.replace(/_/g, ' ')}
                      </span>
                      <span className={styles.legendValue}>
                        {sensor.total_readings}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
