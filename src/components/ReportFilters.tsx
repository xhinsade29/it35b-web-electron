/**
 * Report Filters Component
 * All filter controls for reports
 */

import type { ReportFilterOptions } from '../types/reports.types';
import styles from './ReportFilters.module.css';

interface ReportFiltersProps {
  filterOptions: ReportFilterOptions;
  devices: { device_id: string; device_name: string; status: string }[];
  onFilterChange: (options: ReportFilterOptions) => void;
  onReset: () => void;
  onExport: () => void;
}

const DAY_OPTIONS = [
  { value: 7, label: 'Last 7 Days' },
  { value: 14, label: 'Last 14 Days' },
  { value: 30, label: 'Last 30 Days' },
  { value: 90, label: 'Last 90 Days' },
];

const SENSOR_OPTIONS = [
  { value: '', label: 'All Sensors' },
  { value: 'temperature', label: 'Temperature' },
  { value: 'ph_level', label: 'pH Level' },
  { value: 'turbidity', label: 'Turbidity' },
  { value: 'dissolved_oxygen', label: 'Dissolved Oxygen' },
  { value: 'water_level', label: 'Water Level' },
  { value: 'sediments', label: 'Sediments' },
];

const SECTION_OPTIONS = [
  { value: '', label: 'All Sections' },
  { value: 'upstream', label: 'Upstream' },
  { value: 'midstream', label: 'Midstream' },
  { value: 'downstream', label: 'Downstream' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inactive', label: 'Inactive' },
];

export function ReportFilters({
  filterOptions,
  devices,
  onFilterChange,
  onReset,
  onExport,
}: ReportFiltersProps) {
  return (
    <div className={styles.filters}>
      <div className={styles.filterGroup}>
        <label>Time Range:</label>
        <select
          value={filterOptions.days}
          onChange={(e) => onFilterChange({ ...filterOptions, days: Number(e.target.value) })}
        >
          {DAY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.filterGroup}>
        <label>Device:</label>
        <select
          value={filterOptions.device_id || ''}
          onChange={(e) => onFilterChange({ ...filterOptions, device_id: e.target.value || null })}
        >
          <option value="">All Devices</option>
          {devices.map((d) => (
            <option key={d.device_id} value={d.device_id}>
              {d.device_name} ({d.status})
            </option>
          ))}
        </select>
      </div>
      <div className={styles.filterGroup}>
        <label>Sensor:</label>
        <select
          value={filterOptions.sensor || ''}
          onChange={(e) => onFilterChange({ ...filterOptions, sensor: e.target.value || null })}
        >
          {SENSOR_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.filterGroup}>
        <label>Section:</label>
        <select
          value={filterOptions.section || ''}
          onChange={(e) => onFilterChange({ ...filterOptions, section: e.target.value || null })}
        >
          {SECTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.filterGroup}>
        <label>Status:</label>
        <select
          value={filterOptions.status || ''}
          onChange={(e) => onFilterChange({ ...filterOptions, status: e.target.value || null })}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <button className={styles.btnSecondary} onClick={onReset}>
        Reset Filters
      </button>
      <button className={styles.btnPrimary} onClick={onExport}>
        📥 Export Report
      </button>
    </div>
  );
}
