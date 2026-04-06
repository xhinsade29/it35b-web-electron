/**
 * Activity Timeline Component
 * Displays timeline of readings, alerts, and system logs
 */

import type { TimelineItem } from '../types/activity.types';
import styles from '../assets/styles/ActivityTimeline.module.css';

interface ActivityTimelineProps {
  items: TimelineItem[];
  eventCount: number;
  lastSync: Date | null;
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function parseChanges(message: string): { deviceInfo: string; changes: string[] } {
  if (message.includes(' | ')) {
    const parts = message.split(' | ');
    return {
      deviceInfo: parts[0],
      changes: parts.slice(1),
    };
  }
  return { deviceInfo: message, changes: [] };
}

function getChangeIcon(field: string): string {
  if (field === 'Name') return '🏷️';
  if (field === 'Status') return '🔘';
  if (field === 'Condition') return '🔧';
  if (field === 'Location') return '📍';
  return '📝';
}

function parseChangeDetail(change: string): { field: string; oldVal: string; newVal: string } | null {
  const match = change.match(/^([^:]+):\s*'(.+)'\s*→\s*'(.+)'$/);
  if (match) {
    return {
      field: match[1],
      oldVal: match[2],
      newVal: match[3],
    };
  }
  return null;
}

function ReadingItem({ item }: { item: Extract<TimelineItem, { type: 'reading' }> }) {
  return (
    <div className={styles.timelineItem}>
      <div className={`${styles.timelineIcon} ${styles.readingIcon}`}>📊</div>
      <div className={styles.timelineContent}>
        <div className={styles.timelineTitle}>
          Sensor Reading
          <span className={`${styles.timelineBadge} ${styles.badgeInfo}`}>Normal</span>
        </div>
        <div className={styles.timelineDesc}>{item.message}</div>
        <div className={styles.timelineMeta}>{formatDate(item.timestamp)}</div>
      </div>
    </div>
  );
}

function AlertItem({ item }: { item: Extract<TimelineItem, { type: 'alert' }> }) {
  return (
    <div className={styles.timelineItem}>
      <div className={`${styles.timelineIcon} ${styles[`alertIcon${capitalize(item.severity)}`]}`}>
        ⚠️
      </div>
      <div className={styles.timelineContent}>
        <div className={styles.timelineTitle}>
          Alert: {item.device_name || 'Unknown'}
          <span className={`${styles.timelineBadge} ${styles[`badge${capitalize(item.severity)}`]}`}>
            {capitalize(item.severity)}
          </span>
          {item.status === 'active' && (
            <span className={`${styles.timelineBadge} ${styles.badgeCritical}`}>Active</span>
          )}
        </div>
        <div className={styles.timelineDesc}>{item.message}</div>
        <div className={styles.timelineMeta}>
          {formatDate(item.timestamp)}
          {item.status === 'acknowledged' && ' • Acknowledged'}
          {item.status === 'resolved' && ' • Resolved'}
        </div>
      </div>
    </div>
  );
}

function SystemLogItem({ item }: { item: Extract<TimelineItem, { type: 'system' | 'device' }> }) {
  const { deviceInfo, changes } = parseChanges(item.message);
  
  let icon = '🔧';
  let bgColor = '#dbeafe';
  
  if (item.action === 'DEVICE_CREATE') {
    icon = '➕';
    bgColor = '#d1fae5';
  } else if (item.action === 'DEVICE_UPDATE') {
    icon = '✏️';
    bgColor = '#fef3c7';
  } else if (item.action === 'DEVICE_DELETE') {
    icon = '🗑️';
    bgColor = '#fee2e2';
  }

  return (
    <div className={styles.timelineItem}>
      <div className={styles.timelineIcon} style={{ background: bgColor }}>
        {icon}
      </div>
      <div className={styles.timelineContent}>
        <div className={styles.timelineTitle}>
          {item.action.replace(/_/g, ' ')}
          <span className={`${styles.timelineBadge} ${styles.badgeInfo}`}>
            {item.type === 'device' ? 'Device' : 'System'}
          </span>
        </div>
        <div className={styles.timelineDesc}>
          {deviceInfo}
          {changes.length > 0 && (
            <div className={styles.changesContainer}>
              {changes.map((change, idx) => {
                const parsed = parseChangeDetail(change);
                if (parsed) {
                  return (
                    <div key={idx} className={styles.changeItem}>
                      <span className={styles.changeField}>
                        {getChangeIcon(parsed.field)} {parsed.field}:
                      </span>
                      <span className={styles.changeOld}>{parsed.oldVal}</span>
                      <span className={styles.changeArrow}>→</span>
                      <span className={styles.changeNew}>{parsed.newVal}</span>
                    </div>
                  );
                }
                return (
                  <div key={idx} className={styles.changeRaw}>
                    {escapeHtml(change)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className={styles.timelineMeta}>
          {formatDate(item.timestamp)}
          • By: {item.user}
          {item.ip && ` • IP: ${item.ip}`}
        </div>
      </div>
    </div>
  );
}

export function ActivityTimeline({ items, eventCount, lastSync }: ActivityTimelineProps) {
  return (
    <div className={styles.timeline}>
      <div className={styles.timelineHeader}>
        <h2>Activity Timeline</h2>
        <span className={styles.eventCount}>
          {eventCount} events
          {lastSync && ` • Updated ${lastSync.toLocaleTimeString()}`}
        </span>
      </div>
      <div className={styles.timelineBody}>
        {items.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📭</div>
            <p>No activity recorded</p>
          </div>
        ) : (
          items.map((item, idx) => {
            if (item.type === 'reading') {
              return <ReadingItem key={idx} item={item} />;
            } else if (item.type === 'alert') {
              return <AlertItem key={idx} item={item} />;
            } else {
              return <SystemLogItem key={idx} item={item} />;
            }
          })
        )}
      </div>
    </div>
  );
}
