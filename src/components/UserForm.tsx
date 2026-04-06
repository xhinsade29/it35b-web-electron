/**
 * User Form Component
 * Modal form for adding/editing users
 */

import type { UserFormData, UserRole, ValidationErrors } from '../types/user.types';
import styles from '../assets/styles/UserForm.module.css';

interface UserFormProps {
  isOpen: boolean;
  isEdit: boolean;
  formData: UserFormData;
  errors: ValidationErrors;
  onChange: (data: UserFormData) => void;
  onSave: () => void;
  onCancel: () => void;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'operator', label: 'Operator' },
  { value: 'viewer', label: 'Viewer' },
];

export function UserForm({ isOpen, isEdit, formData, errors, onChange, onSave, onCancel }: UserFormProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{isEdit ? '✏️ Edit User' : '➕ Add New User'}</h2>
          <button className={styles.closeBtn} onClick={onCancel}>×</button>
        </div>
        
        <div className={styles.formGroup}>
          <label>Username *</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => onChange({ ...formData, username: e.target.value })}
            className={errors.username ? styles.inputError : ''}
          />
          {errors.username && <span className={styles.errorText}>{errors.username}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>Email *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => onChange({ ...formData, email: e.target.value })}
            className={errors.email ? styles.inputError : ''}
          />
          {errors.email && <span className={styles.errorText}>{errors.email}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>Full Name *</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => onChange({ ...formData, full_name: e.target.value })}
            className={errors.full_name ? styles.inputError : ''}
          />
          {errors.full_name && <span className={styles.errorText}>{errors.full_name}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>Role</label>
          <select
            value={formData.role}
            onChange={(e) => onChange({ ...formData, role: e.target.value as UserRole })}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => onChange({ ...formData, is_active: e.target.checked })}
            />
            Active Account
          </label>
        </div>

        <div className={styles.formGroup}>
          <label>{isEdit ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => onChange({ ...formData, password: e.target.value })}
            className={errors.password ? styles.inputError : ''}
          />
          {errors.password && <span className={styles.errorText}>{errors.password}</span>}
        </div>

        <div className={styles.formGroup}>
          <label>Confirm Password {isEdit ? '(if changing)' : '*'}</label>
          <input
            type="password"
            value={formData.confirm_password}
            onChange={(e) => onChange({ ...formData, confirm_password: e.target.value })}
            className={errors.confirm_password ? styles.inputError : ''}
          />
          {errors.confirm_password && <span className={styles.errorText}>{errors.confirm_password}</span>}
        </div>

        <div className={styles.modalActions}>
          <button className={styles.btnSecondary} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.btnPrimary} onClick={onSave}>
            {isEdit ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}
