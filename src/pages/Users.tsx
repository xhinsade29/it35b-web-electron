import styles from '../components/Sidebar.module.css';

export function UsersPage() {
  return (
    <div className={styles.mainContent} style={{ padding: '2rem' }}>
      <h1>User Management</h1>
      <p>Roles and access control</p>
      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>System Users</h2>
        <p>This page will manage user accounts and permissions.</p>
      </div>
    </div>
  );
}
