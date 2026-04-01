import styles from '../components/Sidebar.module.css';

export function ActivityPage() {
  return (
    <div className={styles.mainContent} style={{ padding: '2rem' }}>
      <h1>Activity Logs</h1>
      <p>Historical data and trends</p>
      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Recent Activity</h2>
        <p>This page will show sensor readings history and activity logs.</p>
      </div>
    </div>
  );
}
