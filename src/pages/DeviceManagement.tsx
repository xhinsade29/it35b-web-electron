/**
 * Device Management Page
 * Main page integrating all device components
 * Migrated from PHP device.php
 */

import { useState, useCallback } from 'react';
import { DeviceList } from '../components/DeviceList';
import { DeviceForm } from '../components/DeviceForm';
import { DeviceMapOverview } from '../components/DeviceMapOverview';
import { DeviceDetails } from '../components/DeviceDetails';
import { DeviceLegend } from '../components/DeviceLegend';
import { useDevices, useDevice } from '../hooks/useDevices';
import type { Device, DeviceFormData, DeviceStatus, DeviceCondition, RiverSection } from '../types/device.types';
import styles from './DeviceManagement.module.css';

type ViewMode = 'list' | 'add' | 'edit';

export function DeviceManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const {
    devices,
    filteredDevices,
    loading,
    error,
    filterOptions,
    setFilterOptions,
    refresh: refreshDevices,
  } = useDevices();

  const {
    device: selectedDevice,
    create,
    update,
    remove,
  } = useDevice(selectedDeviceId || undefined);

  // Handle device selection
  const handleSelectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
  }, []);

  // Handle add device
  const handleAdd = () => {
    setViewMode('add');
    setSelectedDeviceId(null);
  };

  // Handle edit device
  const handleEdit = useCallback((device: Device) => {
    setSelectedDeviceId(device.device_id);
    setViewMode('edit');
  }, []);

  // Handle delete device
  const handleDelete = useCallback(async (device: Device) => {
    if (confirm(`Are you sure you want to delete ${device.device_name}?`)) {
      const success = await remove();
      if (success) {
        refreshDevices();
        if (selectedDeviceId === device.device_id) {
          setSelectedDeviceId(null);
        }
      }
    }
  }, [remove, refreshDevices, selectedDeviceId]);

  // Handle save device
  const handleSave = useCallback(async (formData: DeviceFormData) => {
    let success = false;

    if (viewMode === 'add') {
      const newDevice = await create(formData);
      success = !!newDevice;
    } else if (viewMode === 'edit' && selectedDeviceId) {
      const updated = await update(formData);
      success = !!updated;
    }

    if (success) {
      setViewMode('list');
      refreshDevices();
    }
  }, [viewMode, selectedDeviceId, create, update, refreshDevices]);

  // Handle cancel
  const handleCancel = () => {
    setViewMode('list');
    setSelectedDeviceId(null);
  };

  // Handle filter change
  const handleFilterChange = useCallback((filters: {
    status: DeviceStatus | 'all';
    condition: DeviceCondition | 'all';
    section: RiverSection | 'all';
    search: string;
  }) => {
    setFilterOptions(filters);
  }, [setFilterOptions]);

  // Get selected device for display
  const displayDevice = selectedDevice ||
    (selectedDeviceId ? devices.find(d => d.device_id === selectedDeviceId) : null);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>📡 Device Management</h1>
          <p className={styles.subtitle}>
            Manage monitoring equipment and station locations
          </p>
        </div>
        {viewMode === 'list' && (
          <button className={styles.btnPrimary} onClick={handleAdd}>
            + Add Device
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className={styles.error}>
          Error: {error}
        </div>
      )}

      {/* Content */}
      <div className={styles.content}>
        {viewMode === 'list' ? (
          <>
            {/* Top Row: Map + Legend + Details in 3 columns */}
            <div className={styles.topGrid}>
              {/* Device Locations (Map) - Takes more space */}
              <div className={styles.mapSection}>
                <DeviceMapOverview
                  devices={devices}
                  selectedDeviceId={selectedDeviceId}
                  onSelectDevice={handleSelectDevice}
                />
              </div>

              {/* Legend - Compact reference */}
              <div className={styles.legendSection}>
                <DeviceLegend />
              </div>

              {/* Device Details Panel */}
              <div className={styles.detailsSection}>
                {displayDevice ? (
                  <DeviceDetails
                    device={displayDevice}
                    onEdit={handleEdit}
                  />
                ) : (
                  <div className={styles.noSelection}>
                    <div className={styles.noSelectionIcon}>📡</div>
                    <p>Select a device to view details</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom: Device List */}
            <DeviceList
              devices={filteredDevices}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAdd}
              filters={filterOptions}
              onFilterChange={handleFilterChange}
            />
          </>
        ) : (
          /* Add/Edit Form */
          <div className={styles.formContainer}>
            <DeviceForm
              device={viewMode === 'edit' ? selectedDevice : null}
              onSave={handleSave}
              onCancel={handleCancel}
              existingDevices={devices}
              isSubmitting={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
