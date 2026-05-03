/**
 * Users Management Page
 * Migrated from PHP users.php
 */

import { useUsers } from '../hooks/useUsers';
import { UserStats } from '../components/UserStats';
import { UserFilters } from '../components/UserFilters';
import { UserTable } from '../components/UserTable';
import { UserForm } from '../components/UserForm';
import { useToast } from '../context/ToastContext';
import { SkeletonStats, SkeletonTable, SkeletonText } from '../components/Skeleton';
import styles from '../assets/styles/Users.module.css';

export function UsersPage() {
  const { showToast } = useToast();
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
    handleSave: originalHandleSave,
    handleDelete: originalHandleDelete,
    handleToggleStatus: originalHandleToggleStatus,
    openAddModal,
    openEditModal,
    closeModal,
    refresh,
  } = useUsers();

  // Wrapped handlers with toast notifications
  const handleSave = async () => {
    try {
      await originalHandleSave();
      showToast(editingUser ? 'User updated successfully' : 'User created successfully', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save user';
      showToast(message, 'error');
    }
  };

  const handleDelete = async (userId: string) => {
    const user = filteredUsers.find(u => u.user_id === userId);
    try {
      await originalHandleDelete(userId);
      showToast(`User "${user?.username || ''}" deleted successfully`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      showToast(message, 'error');
    }
  };

  const handleToggleStatus = async (user: import('../types/user.types').User) => {
    try {
      await originalHandleToggleStatus(user);
      const newStatus = !user.is_active ? 'activated' : 'deactivated';
      showToast(`User "${user.username}" ${newStatus}`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle status';
      showToast(message, 'error');
    }
  };

  if (loading && !filteredUsers.length) {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1>👥 User Management</h1>
          <p>Manage system users, roles and permissions</p>
        </div>
        <SkeletonStats count={4} />
        <div style={{ marginBottom: '24px' }}>
          <SkeletonText lines={1} width={200} height={40} />
        </div>
        <SkeletonTable rows={5} columns={5} />
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

      <div style={{ marginBottom: '24px' }}>
        <UserStats stats={stats} />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <UserFilters
          filters={filters}
          onFilterChange={setFilters}
          onAddUser={openAddModal}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <UserTable
          users={filteredUsers}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
        />
      </div>

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

export default UsersPage;
