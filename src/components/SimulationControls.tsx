import { useState } from 'react';
import styles from '../assets/styles/Dashboard.module.css';

interface SimulationControlsProps {
  devices: Array<{ device_id: string; device_name: string }>;
  onStart: (deviceIds: string[], interval: number, mode: 'normal' | 'flood' | 'pollution' | 'drought') => void;
  onStop: () => void;
  isRunning: boolean;
  count: number;
  alertCount: number;
  lastDevice: string;
  logs: string[];
}

const SIMULATION_MODES: Array<{ value: 'normal' | 'flood' | 'pollution' | 'drought'; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'flood', label: 'Flood' },
  { value: 'pollution', label: 'Pollution' },
  { value: 'drought', label: 'Drought' },
];

const INTERVAL_OPTIONS = [
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '1m' },
];

export function SimulationControls({
  devices,
  onStart,
  onStop,
  isRunning,
  count,
  alertCount,
  lastDevice,
  logs,
}: SimulationControlsProps) {
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [interval, setInterval] = useState(10000);
  const [mode, setMode] = useState<'normal' | 'flood' | 'pollution' | 'drought'>('normal');

  const handleStart = () => {
    const deviceIds = selectedDevices.length > 0 ? selectedDevices : devices.map(d => d.device_id);
    onStart(deviceIds, interval, mode);
  };

  const toggleDevice = (deviceId: string) => {
    setSelectedDevices(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const selectAll = () => {
    setSelectedDevices(devices.map(d => d.device_id));
  };

  const selectNone = () => {
    setSelectedDevices([]);
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>🔬 Simulation Controls</div>
        <span className={`${styles.tag} ${isRunning ? styles.tagGood : styles.tagMute}`}>
          {isRunning ? ' Running' : ' Stopped'}
        </span>
      </div>
      <div className={styles.cardBody}>
        {/* Controls */}
        <div className={styles.simControls}>
          <select
            className={styles.simSelect}
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
            disabled={isRunning}
          >
            {SIMULATION_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                Mode: {m.label}
              </option>
            ))}
          </select>
          
          <select
            className={styles.simSelect}
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            disabled={isRunning}
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Interval: {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Device Selection */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#e8ecf1', marginBottom: '6px' }}>
            Devices ({selectedDevices.length}/{devices.length} selected)
          </div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={selectAll} disabled={isRunning}>
              All
            </button>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={selectNone} disabled={isRunning}>
              None
            </button>
          </div>
          <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid rgba(73, 136, 196, 0.2)', borderRadius: '8px', padding: '8px', background: 'rgba(10, 22, 40, 0.3)' }}>
            {devices.map((device) => (
              <label
                key={device.device_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 0',
                  fontSize: '12px',
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  opacity: isRunning ? 0.5 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedDevices.includes(device.device_id)}
                  onChange={() => toggleDevice(device.device_id)}
                  disabled={isRunning}
                />
                {device.device_name}
              </label>
            ))}
          </div>
        </div>

        {/* Start/Stop Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleStart}
            disabled={isRunning || devices.length === 0}
          >
            ▶ Start
          </button>
          <button
            className={`${styles.btn} ${styles.btnOutline}`}
            onClick={onStop}
            disabled={!isRunning}
            style={{ opacity: isRunning ? 1 : 0.45 }}
          >
            ■ Stop
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          <div style={{ background: 'rgba(15, 40, 84, 0.4)', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>{count}</div>
            <div style={{ fontSize: '10px', color: '#8b9aae' }}>Readings</div>
          </div>
          <div style={{ background: 'rgba(15, 40, 84, 0.4)', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 600, color: alertCount > 0 ? '#f87171' : '#34d399' }}>
              {alertCount}
            </div>
            <div style={{ fontSize: '10px', color: '#8b9aae' }}>Alerts</div>
          </div>
        </div>

        {lastDevice && (
          <div style={{ fontSize: '11px', color: '#8b9aae', marginBottom: '8px' }}>
            Last: {lastDevice.split('\n')[0]}
          </div>
        )}

        {/* Log Output */}
        <div className={styles.simLog}>
          {logs.length === 0 ? (
            <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>Simulation log will appear here...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ color: log.includes('ERROR') ? '#dc2626' : log.includes('ALERT') ? '#d97706' : '#3d4a5c' }}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
