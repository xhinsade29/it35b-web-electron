/**
 * User Service
 * Handles user CRUD operations
 */

import { supabaseAdmin } from '../lib/supabase';
import type { User, UserFormData, UserStats } from '../types/user.types';

/**
 * Get all users
 */
export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return (data || []) as User[];
}

/**
 * Get user statistics
 */
export async function getUserStats(): Promise<UserStats> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('role, is_active');

  if (error) {
    console.error('Error fetching user stats:', error);
    throw new Error(`Failed to fetch user stats: ${error.message}`);
  }

  const users = data || [];
  const active = users.filter((u: User) => u.is_active).length;
  const byRole = users.reduce((acc: Record<string, number>, u: User) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return {
    total_users: users.length,
    active_users: active,
    inactive_users: users.length - active,
    by_role: {
      admin: byRole.admin || 0,
      researcher: byRole.researcher || 0,
      operator: byRole.operator || 0,
      viewer: byRole.viewer || 0,
    },
  };
}

/**
 * Create new user
 */
export async function createUser(formData: UserFormData): Promise<User> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      username: formData.username,
      email: formData.email,
      full_name: formData.full_name,
      role: formData.role,
      is_active: formData.is_active,
      password_hash: formData.password, // In production, hash this
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return data as User;
}

/**
 * Update existing user
 */
export async function updateUser(userId: string, formData: Partial<UserFormData>): Promise<User> {
  const updateData: any = {
    username: formData.username,
    email: formData.email,
    full_name: formData.full_name,
    role: formData.role,
    is_active: formData.is_active,
    updated_at: new Date().toISOString(),
  };

  if (formData.password) {
    updateData.password_hash = formData.password;
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    throw new Error(`Failed to update user: ${error.message}`);
  }

  return data as User;
}

/**
 * Delete user
 */
export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting user:', error);
    throw new Error(`Failed to delete user: ${error.message}`);
  }
}

/**
 * Toggle user active status
 */
export async function toggleUserStatus(userId: string, isActive: boolean): Promise<void> {
  const { error } = await supabaseAdmin
    .from('users')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    console.error('Error toggling user status:', error);
    throw new Error(`Failed to update user status: ${error.message}`);
  }
}

/**
 * Validate user form
 */
export function validateUserForm(data: UserFormData, isEdit: boolean = false): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.username || data.username.length < 3) {
    errors.username = 'Username must be at least 3 characters';
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Valid email is required';
  }

  if (!data.full_name || data.full_name.length < 2) {
    errors.full_name = 'Full name is required';
  }

  if (!isEdit) {
    if (!data.password || data.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (data.password !== data.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
  } else if (data.password) {
    if (data.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (data.password !== data.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
  }

  return errors;
}
