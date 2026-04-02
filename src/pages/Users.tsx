/**
 * Users Management Page
 * Migrated from PHP users.php
 */

import { useUsers } from '../hooks/useUsers';
import { UserStats } from '../components/UserStats';
import { UserFilters } from '../components/UserFilters';
import { UserTable } from '../components/UserTable';
import { UserForm } from '../components/UserForm';
import styles from './Users.module.css';

export function UsersPage() {
  const {
    filteredUsers,
    stats,
    loading,
    error,
    filters,
    setFilters,
    isModalOpen,
    editingUser,
    formData,
    setFormData,
    formErrors,
    handleSave,
    handleDelete,
    handleToggleStatus,
    openAddModal,
    openEditModal,
    closeModal,
    refresh,
  } = useUsers();

  if (loading && !filteredUsers.length) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading users...</div>
      </div>
    );
  }

  if (error && !filteredUsers.length) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>Error: {error}</p>
          <button onClick={refresh}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1>👥 User Management</h1>
        <p>Manage system users, roles and permissions</p>
      </div>

      <UserStats stats={stats} />

      <UserFilters
        filters={filters}
        onFilterChange={setFilters}
        onAddUser={openAddModal}
      />

      <UserTable
        users={filteredUsers}
        onEdit={openEditModal}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
      />

      <UserForm
        isOpen={isModalOpen}
        isEdit={!!editingUser}
        formData={formData}
        errors={formErrors}
        onChange={setFormData}
        onSave={handleSave}
        onCancel={closeModal}
      />
    </div>
  );
}
