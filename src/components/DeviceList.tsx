/**
 * Device List Component
 * Displays devices in a table with filtering capabilities
 */

import { useState } from 'react';
import type { Device, DeviceStatus, DeviceCondition, RiverSection } from '../types/device.types';
import { getDeviceStatusColor } from '../services/deviceService';
import styles from './DeviceList.module.css';

interface DeviceListProps {
  devices: Device[];
  loading: boolean;
  onEdit: (device: Device) => void;
  onDelete: (device: Device) => void;
  filters: {
    status: DeviceStatus | 'all';
    condition: DeviceCondition | 'all';
    section: RiverSection | 'all';
    search: string;
  };
  onFilterChange: (filters: {
    status: DeviceStatus | 'all';
    condition: DeviceCondition | 'all';
    section: RiverSection | 'all';
    search: string;
  }) => void;
}

const STATUS_OPTIONS: { value: DeviceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'offline', label: 'Offline' },
  { value: 'unassigned', label: 'Unassigned' },
];

const CONDITION_OPTIONS: { value: DeviceCondition | 'all'; label: string }[] = [
  { value: 'all', label: 'All Conditions' },
  { value: 'normal', label: 'Normal' },
  { value: 'displaced', label: 'Displaced' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'malfunctioning', label: 'Malfunctioning' },
];

const SECTION_OPTIONS: { value: RiverSection | 'all'; label: string }[] = [
  { value: 'all', label: 'All Sections' },
  { value: 'upstream', label: 'Upstream' },
  { value: 'midstream', label: 'Midstream' },
  { value: 'downstream', label: 'Downstream' },
];

export function DeviceList({
  devices,
  loading,
  onEdit,
  onDelete,
  filters,
  onFilterChange,
}: DeviceListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<Device | null>(null);

  const handleDeleteClick = (device: Device) => {
    setDeleteConfirm(device);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      onDelete(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const getStatusBadgeClass = (status: string, condition: string) => {
    if (condition && condition !== 'normal') {
      return styles.badgeWarning;
    }
    switch (status) {
      case 'active':
        return styles.badgeSuccess;
      case 'maintenance':
        return styles.badgeInfo;
      case 'inactive':
      case 'offline':
        return styles.badgeDanger;
      default:
        return styles.badgeMute;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading devices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Filters Row */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <input
            type="text"
            placeholder="Search devices..."
            className={styles.searchInput}
            value={filters.search}
            onChange={(e) =>
              onFilterChange({ ...filters, search: e.target.value })
            }
          />
        </div>

        <div className={styles.filterGroup}>
          <select
            className={styles.select}
            value={filters.status}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                status: e.target.value as DeviceStatus | 'all',
              })
            }
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <select
            className={styles.select}
            value={filters.condition}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                condition: e.target.value as DeviceCondition | 'all',
              })
            }
          >
            {CONDITION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <select
            className={styles.select}
            value={filters.section}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                section: e.target.value as RiverSection | 'all',
              })
            }
          >
            {SECTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <button
            className={styles.btnSecondary}
            onClick={() =>
              onFilterChange({
                status: 'all',
                condition: 'all',
                section: 'all',
                search: '',
              })
            }
          >
            Reset
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className={styles.resultsInfo}>
        Showing {devices.length} device{devices.length !== 1 ? 's' : ''}
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Device</th>
              <th>Status</th>
              <th>Condition</th>
              <th>Location</th>
              <th>Section</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyRow}>
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📡</div>
                    <p>No devices found</p>
                    <p className={styles.emptySub}>
                      {filters.search ||
                      filters.status !== 'all' ||
                      filters.condition !== 'all' ||
                      filters.section !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Add your first device to get started'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              devices.map((device) => (
                <tr key={device.device_id} className={styles.tableRow}>
                  <td>
                    <div className={styles.deviceCell}>
                      <div
                        className={styles.statusDot}
                        style={{
                          background: getDeviceStatusColor(
                            device.status,
                            device.device_condition
                          ),
                        }}
                      ></div>
                      <div>
                        <div className={styles.deviceName}>
                          {device.device_name}
                        </div>
                        <div className={styles.deviceId}>
                          ID: {device.device_id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${getStatusBadgeClass(
                        device.status,
                        device.device_condition
                      )}`}
                    >
                      {device.status}
                    </span>
                  </td>
                  <td>
                    {device.device_condition !== 'normal' ? (
                      <span className={`${styles.badge} ${styles.badgeWarning}`}>
                        ⚠️ {device.device_condition}
                      </span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                        Normal
                      </span>
                    )}
                  </td>
                  <td>
                    <div className={styles.locationCell}>
                      {device.location_name || (
                        <span className={styles.unassigned}>Unassigned</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {device.river_section ? (
                      <span
                        className={`${styles.sectionBadge} ${
                          styles[`section${
                            device.river_section.charAt(0).toUpperCase() +
                            device.river_section.slice(1)
                          }`]
                        }`}
                      >
                        {device.river_section}
                      </span>
                    ) : (
                      <span className={styles.unassigned}>-</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.dateCell}>
                      {formatDate(device.last_active)}
                    </div>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.btnIcon}
                        onClick={() => onEdit(device)}
                        title="Edit device"
                      >
                        ✏️
                      </button>
                      <button
                        className={`${styles.btnIcon} ${styles.btnDanger}`}
                        onClick={() => handleDeleteClick(device)}
                        title="Delete device"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Confirm Delete</h3>
            <p className={styles.modalText}>
              Are you sure you want to delete{' '}
              <strong>{deleteConfirm.device_name}</strong>? This action cannot be
              undone.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.btnSecondary}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button className={styles.btnDanger} onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
