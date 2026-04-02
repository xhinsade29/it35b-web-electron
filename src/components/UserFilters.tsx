/**
 * User Filters Component
 * Search and filter controls
 */

import type { UserFilters, UserRole } from '../types/user.types';
import styles from './UserFilters.module.css';

interface UserFiltersProps {
  filters: UserFilters;
  onFilterChange: (filters: UserFilters) => void;
  onAddUser: () => void;
}

const ROLE_OPTIONS: { value: UserRole | 'all'; label: string }[] = [
  { value: 'all', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'operator', label: 'Operator' },
  { value: 'viewer', label: 'Viewer' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export function UserFilters({ filters, onFilterChange, onAddUser }: UserFiltersProps) {
  return (
    <div className={styles.filters}>
      <div className={styles.searchGroup}>
        <input
          type="text"
          placeholder="Search users..."
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          className={styles.searchInput}
        />
      </div>
      <div className={styles.filterGroup}>
        <select
          value={filters.role}
          onChange={(e) => onFilterChange({ ...filters, role: e.target.value as UserRole | 'all' })}
          className={styles.select}
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value as 'all' | 'active' | 'inactive' })}
          className={styles.select}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <button className={styles.btnPrimary} onClick={onAddUser}>
        ➕ Add User
      </button>
    </div>
  );
}
