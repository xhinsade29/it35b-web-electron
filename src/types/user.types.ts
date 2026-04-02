/**
 * User Management Types
 * Based on PHP users.php
 */

export type UserRole = 'admin' | 'researcher' | 'operator' | 'viewer';

export interface User {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

export interface UserFormData {
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  password?: string;
  confirm_password?: string;
}

export interface UserStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  by_role: Record<UserRole, number>;
}

export interface UserFilters {
  search: string;
  role: UserRole | 'all';
  status: 'all' | 'active' | 'inactive';
}

export interface ValidationErrors {
  username?: string;
  email?: string;
  full_name?: string;
  password?: string;
  confirm_password?: string;
}
