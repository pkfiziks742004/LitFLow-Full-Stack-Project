import { DEFAULT_PLAN } from '../constants/plans.js';
import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../utils/apiError.js';

function assertNoError(error, message) {
  if (error) {
    throw new ApiError(500, message, error.message);
  }
}

function normalizeUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    _id: row.id,
    email: row.email,
    plan: row.plan || DEFAULT_PLAN,
    status: row.status || 'ACTIVE',
    isBlocked: Boolean(row.is_blocked),
    blockedAt: row.blocked_at ? new Date(row.blocked_at) : null,
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : null,
    searchUsage: row.search_usage || null,
    billing: row.billing || null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null
  };
}

function toUserPatch(patch) {
  const payload = {
    updated_at: new Date().toISOString()
  };

  if (patch.email !== undefined) {
    payload.email = patch.email;
  }

  if (patch.plan !== undefined) {
    payload.plan = patch.plan;
  }

  if (patch.status !== undefined) {
    payload.status = patch.status;
  }

  if (patch.isBlocked !== undefined) {
    payload.is_blocked = patch.isBlocked;
  }

  if (patch.blockedAt !== undefined) {
    payload.blocked_at = patch.blockedAt ? new Date(patch.blockedAt).toISOString() : null;
  }

  if (patch.lastLoginAt !== undefined) {
    payload.last_login_at = patch.lastLoginAt ? new Date(patch.lastLoginAt).toISOString() : null;
  }

  if (patch.searchUsage !== undefined) {
    payload.search_usage = patch.searchUsage;
  }

  if (patch.billing !== undefined) {
    payload.billing = patch.billing;
  }

  return payload;
}

export async function findUserById(userId) {
  const { data, error } = await supabaseAdmin.from('users').select('*').eq('id', userId).maybeSingle();
  assertNoError(error, 'Failed to load user.');
  return normalizeUser(data);
}

export async function findUserByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  assertNoError(error, 'Failed to load user by email.');
  return normalizeUser(data);
}

export async function createUser({ email, plan = DEFAULT_PLAN, lastLoginAt = new Date() }) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      email: email.toLowerCase(),
      plan,
      status: 'ACTIVE',
      is_blocked: false,
      last_login_at: new Date(lastLoginAt).toISOString(),
      search_usage: null,
      billing: null
    })
    .select('*')
    .single();

  assertNoError(error, 'Failed to create user.');
  return normalizeUser(data);
}

export async function updateUserById(userId, patch) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .update(toUserPatch(patch))
    .eq('id', userId)
    .select('*')
    .single();

  assertNoError(error, 'Failed to update user.');
  return normalizeUser(data);
}

export async function findOrCreateUserByEmail(email) {
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    return updateUserById(existingUser.id, {
      lastLoginAt: new Date()
    });
  }

  return createUser({
    email,
    plan: DEFAULT_PLAN,
    lastLoginAt: new Date()
  });
}
