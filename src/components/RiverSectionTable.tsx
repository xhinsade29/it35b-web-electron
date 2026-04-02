/**
 * River Section Table Component
 */

import type { SectionStats } from '../types/reports.types';
import styles from '../assets/styles/ReportTables.module.css';

interface RiverSectionTableProps {
  sections: SectionStats[];
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatNumber(num: number | null, decimals: number = 1, suffix: string = ''): string {
  if (num === null) return 'N/A';
  return `${num.toFixed(decimals)}${suffix ? ' ' + suffix : ''}`;
}

export function RiverSectionTable({ sections }: RiverSectionTableProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>River Section Analysis</h2>
      </div>
      <div className={styles.cardBody}>
        {sections.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📭</div>
            <p>No river section data available</p>
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>River Section</th>
                  <th>Devices</th>
                  <th>Total Readings</th>
                  <th>Avg Temperature</th>
                  <th>Avg pH</th>
                  <th>Avg Turbidity</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => (
                  <tr key={section.river_section}>
                    <td>{capitalize(section.river_section || 'Unknown')}</td>
                    <td>{section.device_count}</td>
                    <td>{section.total_readings.toLocaleString()}</td>
                    <td>{formatNumber(section.avg_temp, 1, '°C')}</td>
                    <td>{formatNumber(section.avg_ph, 2)}</td>
                    <td>{formatNumber(section.avg_turbidity, 1, 'NTU')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
