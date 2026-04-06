import styles from '../assets/styles/Dashboard.module.css';
import type { SectionConditions } from '../types/dashboard.types';

interface WaterConditionsProps {
  sectionConditions: Record<string, SectionConditions>;
}

const WC_SENSORS = [
  { key: 'temperature', icon: '🌡', label: 'Temperature', unit: '°C', min: 20, max: 35 },
  { key: 'ph_level', icon: '🧪', label: 'pH Level', unit: 'pH', min: 6.5, max: 8.5 },
  { key: 'turbidity', icon: '🌫', label: 'Turbidity', unit: 'NTU', min: 0, max: 50 },
  { key: 'dissolved_oxygen', icon: '💧', label: 'Dissolved O₂', unit: 'mg/L', min: 5, max: 14 },
  { key: 'water_level', icon: '🌊', label: 'Water Level', unit: 'm', min: 0.5, max: 3.0 },
  { key: 'sediments', icon: '🟤', label: 'Sediments', unit: 'mg/L', min: 0, max: 500 },
];

const SEC_META: Record<string, { label: string; color: string; bg: string; tag: string }> = {
  upstream: {
    label: 'Upstream',
    color: '#059669',
    bg: '#d1fae5',
    tag: 'tag-up',
  },
  midstream: {
    label: 'Midstream',
    color: '#d97706',
    bg: '#fef3c7',
    tag: 'tag-mid',
  },
  downstream: {
    label: 'Downstream',
    color: '#dc2626',
    bg: '#fee2e2',
    tag: 'tag-down',
  },
};

export function WaterConditions({ sectionConditions }: WaterConditionsProps) {
  // Calculate out-of-range count for a section
  const getOutOfRangeCount = (conditions: SectionConditions) => {
    let count = 0;
    WC_SENSORS.forEach((sensor) => {
      const value = conditions[sensor.key as keyof SectionConditions];
      if (value !== null && value !== undefined) {
        if (value < sensor.min || value > sensor.max) {
          count++;
        }
      }
    });
    return count;
  };

  // Get status for section
  const getSectionStatus = (outOfRange: number) => {
    if (outOfRange === 0) return { text: 'Normal', class: styles.tagGood };
    if (outOfRange <= 1) return { text: 'Moderate', class: styles.tagWarn };
    return { text: 'Critical', class: styles.tagCrit };
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>💧 Water Conditions by Section</div>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.wcGrid}>
          {Object.entries(SEC_META).map(([key, meta]) => {
            const conditions = sectionConditions[key] || {};
            const outOfRange = getOutOfRangeCount(conditions);
            const status = getSectionStatus(outOfRange);

            return (
              <div key={key} className={styles.wcSection}>
                <div className={styles.wcHead} style={{ background: meta.bg }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: meta.color,
                      }}
                    />
                    <span className={styles.wcTitle}>{meta.label}</span>
                  </div>
                  <span className={`${styles.tag} ${status.class}`}>{status.text}</span>
                </div>
                <div className={styles.wcMetrics}>
                  {WC_SENSORS.map((sensor) => {
                    const value = conditions[sensor.key as keyof SectionConditions];
                    const hasValue = value !== null && value !== undefined;
                    const isGood = hasValue
                      ? value >= sensor.min && value <= sensor.max
                      : null;

                    return (
                      <div key={sensor.key} className={styles.wcRow}>
                        <div className={styles.wcLabel}>
                          {sensor.icon} {sensor.label}
                        </div>
                        <div
                          className={styles.wcVal}
                          style={{
                            color:
                              isGood === true
                                ? '#059669'
                                : isGood === false
                                ? '#d97706'
                                : '#8897aa',
                          }}
                        >
                          {hasValue ? `${parseFloat(value.toString()).toFixed(1)} ${sensor.unit}` : '—'}
                          {isGood === false && (
                            <span style={{ fontSize: '9px', marginLeft: '4px' }}>⚠</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
