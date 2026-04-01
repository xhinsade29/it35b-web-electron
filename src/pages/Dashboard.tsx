import styles from '../components/Sidebar.module.css';

export function DashboardPage() {
  return (
    <div className={styles.mainContent} style={{ padding: '2rem' }}>
      <h1>Dashboard</h1>
      <p>Welcome to Aqua-Vision River Monitor Dashboard</p>
      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>River Health Overview</h2>
        <p>This page will display real-time river health metrics and alerts.</p>
      </div>
    </div>
  );
}
