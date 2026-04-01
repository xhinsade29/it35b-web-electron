import styles from '../pages/Dashboard.module.css';

interface KPICardProps {
  label: string;
  value: string | number;
  subtext?: string;
  badge?: string;
  badgeType?: 'good' | 'warn' | 'crit' | 'info';
}

function KPICard({ label, value, subtext, badge, badgeType = 'good' }: KPICardProps) {
  const badgeClass = {
    good: styles.kpiBadgeGood,
    warn: styles.kpiBadgeWarn,
    crit: styles.kpiBadgeCrit,
    info: styles.kpiBadgeInfo,
  }[badgeType];

  return (
    <div className={styles.kpi}>
      {badge && (
        <div className={`${styles.kpiBadge} ${badgeClass}`}>{badge}</div>
      )}
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue}>{value}</div>
      {subtext && <div className={styles.kpiSub}>{subtext}</div>}
    </div>
  );
}

interface KPICardsProps {
  totalDevices: number;
  activeDevices: number;
  alertCount: number;
  maintenanceCount: number;
  warnCount: number;
}

export function KPICards({
  totalDevices,
  activeDevices,
  alertCount,
  maintenanceCount,
  warnCount,
}: KPICardsProps) {
  const getAlertBadgeType = () => {
    if (alertCount === 0) return 'good';
    if (alertCount <= 2) return 'warn';
    return 'crit';
  };

  const getWarningBadgeType = () => {
    if (warnCount === 0) return 'good';
    if (warnCount <= 2) return 'warn';
    return 'crit';
  };

  return (
    <div className={styles.kpiRow}>
      <KPICard
        label="Total Devices"
        value={totalDevices}
        subtext={`${activeDevices} active`}
        badge="📡"
        badgeType="info"
      />
      <KPICard
        label="Active Alerts"
        value={alertCount}
        subtext={alertCount === 0 ? 'All clear' : `${alertCount} need attention`}
        badge={alertCount > 0 ? '!' : '✓'}
        badgeType={getAlertBadgeType()}
      />
      <KPICard
        label="Warnings"
        value={warnCount}
        subtext={warnCount === 0 ? 'Within thresholds' : 'Parameters outside range'}
        badge={warnCount > 0 ? '⚠' : '✓'}
        badgeType={getWarningBadgeType()}
      />
      <KPICard
        label="Maintenance"
        value={maintenanceCount}
        subtext={maintenanceCount === 0 ? 'No pending tasks' : 'Scheduled maintenance'}
        badge="🔧"
        badgeType={maintenanceCount > 0 ? 'warn' : 'good'}
      />
    </div>
  );
}
