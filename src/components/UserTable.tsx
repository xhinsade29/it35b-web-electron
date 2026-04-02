/**
 * User Table Component
 * Displays users in a table with action buttons
 */

import type { User } from '../types/user.types';
import styles from './UserTable.module.css';

interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onToggleStatus: (user: User) => void;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRoleBadgeClass(role: string): string {
  switch (role) {
    case 'admin':
      return styles.badgeDanger;
    case 'researcher':
      return styles.badgeInfo;
    case 'operator':
      return styles.badgeWarning;
    default:
      return styles.badgeSecondary;
  }
}

export function UserTable({ users, onEdit, onDelete, onToggleStatus }: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateIcon}>👥</div>
        <p>No users found</p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.user_id}>
              <td>
                <div className={styles.userInfo}>
                  <div className={styles.userName}>{user.full_name}</div>
                  <div className={styles.userMeta}>{user.username} • {user.email}</div>
                </div>
              </td>
              <td>
                <span className={`${styles.badge} ${getRoleBadgeClass(user.role)}`}>
                  {user.role}
                </span>
              </td>
              <td>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={user.is_active}
                    onChange={() => onToggleStatus(user)}
                  />
                  <span className={styles.toggleSlider}></span>
                  <span className={styles.toggleLabel}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </label>
              </td>
              <td>{formatDate(user.created_at)}</td>
              <td>{formatDate(user.last_login)}</td>
              <td>
                <div className={styles.actions}>
                  <button
                    className={`${styles.btn} ${styles.btnEdit}`}
                    onClick={() => onEdit(user)}
                    title="Edit user"
                  >
                    ✏️
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnDelete}`}
                    onClick={() => onDelete(user.user_id)}
                    title="Delete user"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
