import styles from '../assets/styles/Dashboard.module.css';

interface RiverBannerProps {
  status: 'Normal' | 'Moderate' | 'Critical';
  riverName?: string;
  warnCount: number;
  alertCount: number;
  activeDevices: number;
  totalDevices: number;
  lastReadingTime?: string;
}

export function RiverBanner({
  status,
  riverName = 'Mangima River',
  warnCount,
  alertCount,
  activeDevices,
  totalDevices,
  lastReadingTime,
}: RiverBannerProps) {
  // Determine status color and emoji
  const statusConfig = {
    Normal: {
      color: '#34d399',
      bg: 'rgba(5, 150, 105, 0.2)',
      emoji: '✅',
    },
    Moderate: {
      color: '#fbbf24',
      bg: 'rgba(217, 119, 6, 0.2)',
      emoji: '⚠️',
    },
    Critical: {
      color: '#f87171',
      bg: 'rgba(220, 38, 38, 0.2)',
      emoji: '🚨',
    },
  };

  const config = statusConfig[status];

  // Format last reading time
  const formatLastReading = (time?: string) => {
    if (!time) return '--:--';
    const date = new Date(time);
    return date.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div
      className={styles.riverBanner}
      style={
        {
          '--status-color': config.color,
          '--status-bg': config.bg,
        } as React.CSSProperties
      }
    >
      <div className={styles.bannerStatusDot}>{config.emoji}</div>
      <div className={styles.bannerBody}>
        <div className={styles.bannerTitle}>
          {riverName} — {status}
        </div>
        <div className={styles.bannerSub}>
          {warnCount === 0
            ? 'All sensor readings are within safe thresholds.'
            : `${warnCount} parameter(s) outside safe range`}
        </div>
      </div>
      <div className={styles.bannerStats}>
        <div className={styles.bstat}>
          <div className={styles.bstatV}>{alertCount}</div>
          <div className={styles.bstatL}>Alerts</div>
        </div>
        <div className={styles.bstat}>
          <div className={styles.bstatV}>
            {activeDevices}/{totalDevices}
          </div>
          <div className={styles.bstatL}>Active</div>
        </div>
        <div className={styles.bstat}>
          <div className={styles.bstatV}>{formatLastReading(lastReadingTime)}</div>
          <div className={styles.bstatL}>Last Update</div>
        </div>
      </div>
    </div>
  );
}
