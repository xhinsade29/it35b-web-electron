import styles from '../components/Sidebar.module.css';

export function DevicesPage() {
  return (
    <div className={styles.mainContent} style={{ padding: '2rem' }}>
      <h1>Devices</h1>
      <p>Equipment status management</p>
      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Device Management</h2>
        <p>This page will list and manage water quality monitoring devices.</p>
      </div>
    </div>
  );
}
