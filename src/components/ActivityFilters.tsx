/**
 * Activity Filters Component
 * Time range and device filter controls
 */

import type { ActivityFilterOptions } from '../types/activity.types';
import styles from './ActivityFilters.module.css';

interface ActivityFiltersProps {
  filterOptions: ActivityFilterOptions;
  devices: { device_id: string; device_name: string; status: string }[];
  onFilterChange: (options: ActivityFilterOptions) => void;
  onReset: () => void;
}

const HOUR_OPTIONS = [
  { value: 24, label: 'Last 24 Hours' },
  { value: 48, label: 'Last 48 Hours' },
  { value: 72, label: 'Last 72 Hours' },
  { value: 168, label: 'Last 7 Days' },
];

export function ActivityFilters({
  filterOptions,
  devices,
  onFilterChange,
  onReset,
}: ActivityFiltersProps) {
  const handleHoursChange = (hours: number) => {
    onFilterChange({ ...filterOptions, hours });
  };

  const handleDeviceChange = (deviceId: string | null) => {
    onFilterChange({ ...filterOptions, device_id: deviceId });
  };

  return (
    <div className={styles.filters}>
      <div className={styles.filterGroup}>
        <label>Time Range:</label>
        <select
          value={filterOptions.hours}
          onChange={(e) => handleHoursChange(Number(e.target.value))}
        >
          {HOUR_OPTIONS.map((opt) => (
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
          onChange={(e) => handleDeviceChange(e.target.value || null)}
        >
          <option value="">All Devices</option>
          {devices.map((d) => (
            <option key={d.device_id} value={d.device_id}>
              {d.device_name} ({d.status})
            </option>
          ))}
        </select>
      </div>
      <button className={styles.btnSecondary} onClick={onReset}>
        Reset Filters
      </button>
      <button className={styles.btnPrimary}>📥 Export CSV</button>
    </div>
  );
}
