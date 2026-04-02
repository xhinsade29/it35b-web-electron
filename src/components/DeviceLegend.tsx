/**
 * Device Legend Component
 * Shows color coding for device status and conditions
 */

import styles from '../assets/styles/DeviceLegend.module.css';

export function DeviceLegend() {
  return (
    <div className={styles.container}>
      <h4 className={styles.title}>Legend</h4>
      
      <div className={styles.section}>
        <h5 className={styles.sectionTitle}>Device Status</h5>
        <div className={styles.items}>
          <div className={styles.item}>
            <span className={styles.dot} style={{ background: '#059669' }}></span>
            <span className={styles.label}>Active</span>
          </div>
          <div className={styles.item}>
            <span className={styles.dot} style={{ background: '#3b82f6' }}></span>
            <span className={styles.label}>Maintenance</span>
          </div>
          <div className={styles.item}>
            <span className={styles.dot} style={{ background: '#6b7280' }}></span>
            <span className={styles.label}>Offline</span>
          </div>
          <div className={styles.item}>
            <span className={styles.dot} style={{ background: '#dc2626' }}></span>
            <span className={styles.label}>Inactive</span>
          </div>
          <div className={styles.item}>
            <span className={styles.dot} style={{ background: '#9ca3af' }}></span>
            <span className={styles.label}>Unassigned</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h5 className={styles.sectionTitle}>Device Condition</h5>
        <div className={styles.items}>
          <div className={styles.item}>
            <span className={styles.dot} style={{ background: '#7c3aed' }}></span>
            <span className={styles.label}>Displaced</span>
          </div>
          <div className={styles.item}>
            <span className={styles.dot} style={{ background: '#1f2937' }}></span>
            <span className={styles.label}>Damaged</span>
          </div>
          <div className={styles.item}>
            <span className={styles.dot} style={{ background: '#d97706' }}></span>
            <span className={styles.label}>Malfunctioning</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h5 className={styles.sectionTitle}>River Section</h5>
        <div className={styles.items}>
          <div className={styles.item}>
            <span className={styles.badge} style={{ background: '#d1fae5', color: '#059669' }}>Up</span>
            <span className={styles.label}>Upstream</span>
          </div>
          <div className={styles.item}>
            <span className={styles.badge} style={{ background: '#fef3c7', color: '#d97706' }}>Mid</span>
            <span className={styles.label}>Midstream</span>
          </div>
          <div className={styles.item}>
            <span className={styles.badge} style={{ background: '#fee2e2', color: '#dc2626' }}>Down</span>
            <span className={styles.label}>Downstream</span>
          </div>
        </div>
      </div>
    </div>
  );
}
