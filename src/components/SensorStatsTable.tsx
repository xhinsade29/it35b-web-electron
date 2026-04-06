/**
 * Sensor Statistics Table Component
 */

import type { SensorStats } from '../types/reports.types';
import styles from '../assets/styles/ReportTables.module.css';

interface SensorStatsTableProps {
  stats: SensorStats[];
  days: number;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getUnit(sensorType: string): string {
  switch (sensorType) {
    case 'temperature':
      return '°C';
    case 'ph_level':
      return 'pH';
    case 'turbidity':
      return 'NTU';
    case 'dissolved_oxygen':
      return 'mg/L';
    case 'water_level':
      return 'm';
    case 'sediments':
      return 'mg/L';
    default:
      return '';
  }
}

export function SensorStatsTable({ stats, days }: SensorStatsTableProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>Sensor Statistics ({days} Days)</h2>
      </div>
      <div className={styles.cardBody}>
        {stats.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📭</div>
            <p>No sensor data in the last {days} days</p>
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Sensor Type</th>
                  <th>Total Readings</th>
                  <th>Average</th>
                  <th>Minimum</th>
                  <th>Maximum</th>
                  <th>Std Deviation</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((sensor) => {
                  const unit = getUnit(sensor.sensor_type);
                  return (
                    <tr key={sensor.sensor_type}>
                      <td>{capitalize(sensor.sensor_type.replace(/_/g, ' '))}</td>
                      <td>{sensor.total_readings.toLocaleString()}</td>
                      <td>{sensor.avg_value.toFixed(2)} {unit}</td>
                      <td>{sensor.min_value.toFixed(2)} {unit}</td>
                      <td>{sensor.max_value.toFixed(2)} {unit}</td>
                      <td>{sensor.std_dev ? sensor.std_dev.toFixed(2) : 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
