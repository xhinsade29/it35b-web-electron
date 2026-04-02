/**
 * useUsers Hook
 * Manages users data, filtering, and CRUD operations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAllUsers,
  getUserStats,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  validateUserForm,
} from '../services/userService';
import type { User, UserFormData, UserStats, UserFilters, ValidationErrors } from '../types/user.types';

interface UseUsersReturn {
  users: User[];
  filteredUsers: User[];
  stats: UserStats;
  loading: boolean;
  error: string | null;
  filters: UserFilters;
  setFilters: (filters: UserFilters) => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  editingUser: User | null;
  setEditingUser: (user: User | null) => void;
  formData: UserFormData;
  setFormData: (data: UserFormData) => void;
  formErrors: ValidationErrors;
  validateForm: () => boolean;
  handleSave: () => Promise<void>;
  handleDelete: (userId: string) => Promise<void>;
  handleToggleStatus: (user: User) => Promise<void>;
  openAddModal: () => void;
  openEditModal: (user: User) => void;
  closeModal: () => void;
  refresh: () => Promise<void>;
}

const DEFAULT_FORM_DATA: UserFormData = {
  username: '',
  email: '',
  full_name: '',
  role: 'viewer',
  is_active: true,
  password: '',
  confirm_password: '',
};

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    total_users: 0,
    active_users: 0,
    inactive_users: 0,
    by_role: { admin: 0, researcher: 0, operator: 0, viewer: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    status: 'all',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(DEFAULT_FORM_DATA);
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, statsData] = await Promise.all([getAllUsers(), getUserStats()]);
      setUsers(usersData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        filters.search === '' ||
        user.username.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.email.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.full_name.toLowerCase().includes(filters.search.toLowerCase());

      const matchesRole = filters.role === 'all' || user.role === filters.role;
      const matchesStatus =
        filters.status === 'all' ||
        (filters.status === 'active' && user.is_active) ||
        (filters.status === 'inactive' && !user.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, filters]);

  const validateForm = useCallback(() => {
    const errors = validateUserForm(formData, !!editingUser);
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, editingUser]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    try {
      if (editingUser) {
        await updateUser(editingUser.user_id, formData);
      } else {
        await createUser(formData);
      }
      await fetchData();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    }
  }, [formData, editingUser, validateForm, fetchData]);

  const handleDelete = useCallback(async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUser(userId);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  }, [fetchData]);

  const handleToggleStatus = useCallback(
    async (user: User) => {
      try {
        await toggleUserStatus(user.user_id, !user.is_active);
        await fetchData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to toggle status');
      }
    },
    [fetchData]
  );

  const openAddModal = useCallback(() => {
    setEditingUser(null);
    setFormData(DEFAULT_FORM_DATA);
    setFormErrors({});
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      password: '',
      confirm_password: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData(DEFAULT_FORM_DATA);
    setFormErrors({});
  }, []);

  const refresh = fetchData;

  return {
    users,
    filteredUsers,
    stats,
    loading,
    error,
    filters,
    setFilters,
    isModalOpen,
    setIsModalOpen,
    editingUser,
    setEditingUser,
    formData,
    setFormData,
    formErrors,
    validateForm,
    handleSave,
    handleDelete,
    handleToggleStatus,
    openAddModal,
    openEditModal,
    closeModal,
    refresh,
  };
}
