import { supabaseAdmin } from '../../config/supabase.js';
import { assertNoError, fromIsoDate, toIsoDate } from '../utils/db.js';

function normalizeAdmin(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    isActive: row.is_active,
    failedLoginAttempts: row.failed_login_attempts,
    lastFailedLoginAt: fromIsoDate(row.last_failed_login_at),
    lastLoginAt: fromIsoDate(row.last_login_at),
    createdAt: fromIsoDate(row.created_at),
    updatedAt: fromIsoDate(row.updated_at)
  };
}

export async function findAdminUserByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  assertNoError(error, 'Failed to load admin user.');
  return normalizeAdmin(data);
}

export async function findAdminUserById(id) {
  const { data, error } = await supabaseAdmin.from('admin_users').select('*').eq('id', id).maybeSingle();
  assertNoError(error, 'Failed to load admin user.');
  return normalizeAdmin(data);
}

export async function createAdminUser({ name, email, passwordHash, role = 'SUPER_ADMIN' }) {
  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .insert({
      name,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role,
      is_active: true
    })
    .select('*')
    .single();

  assertNoError(error, 'Failed to create admin user.');
  return normalizeAdmin(data);
}

export async function updateAdminUserById(id, patch) {
  const payload = {};

  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.passwordHash !== undefined) payload.password_hash = patch.passwordHash;
  if (patch.role !== undefined) payload.role = patch.role;
  if (patch.isActive !== undefined) payload.is_active = patch.isActive;
  if (patch.failedLoginAttempts !== undefined) payload.failed_login_attempts = patch.failedLoginAttempts;
  if (patch.lastFailedLoginAt !== undefined) payload.last_failed_login_at = toIsoDate(patch.lastFailedLoginAt);
  if (patch.lastLoginAt !== undefined) payload.last_login_at = toIsoDate(patch.lastLoginAt);

  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  assertNoError(error, 'Failed to update admin user.');
  return normalizeAdmin(data);
}

