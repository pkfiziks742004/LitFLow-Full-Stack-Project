import { supabaseAdmin } from '../../config/supabase.js';
import { assertNoError, fromIsoDate } from '../utils/db.js';

function normalizeUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    plan: row.plan,
    status: row.status,
    isBlocked: row.is_blocked,
    blockedAt: fromIsoDate(row.blocked_at),
    lastLoginAt: fromIsoDate(row.last_login_at),
    searchUsage: row.search_usage || null,
    billing: row.billing || null,
    createdAt: fromIsoDate(row.created_at),
    updatedAt: fromIsoDate(row.updated_at)
  };
}

export async function listUsersForAdmin({ page = 1, pageSize = 20, query = '', plan = '', status = '' }) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let supabaseQuery = supabaseAdmin
    .from('users')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (query) {
    supabaseQuery = supabaseQuery.ilike('email', `%${query}%`);
  }

  if (plan) {
    supabaseQuery = supabaseQuery.eq('plan', plan);
  }

  if (status) {
    if (status === 'BLOCKED') {
      supabaseQuery = supabaseQuery.eq('is_blocked', true);
    } else {
      supabaseQuery = supabaseQuery.eq('status', status);
    }
  }

  const { data, error, count } = await supabaseQuery;
  assertNoError(error, 'Failed to load users.');

  return {
    rows: (data || []).map(normalizeUser),
    count: count || 0
  };
}

export async function findUserDetailsForAdmin(userId) {
  const { data, error } = await supabaseAdmin.from('users').select('*').eq('id', userId).maybeSingle();
  assertNoError(error, 'Failed to load user details.');
  return normalizeUser(data);
}

export async function deleteUserForAdmin(userId) {
  const { error } = await supabaseAdmin.from('users').delete().eq('id', userId);
  assertNoError(error, 'Failed to delete user.');
}

export async function getAllUsersLite() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id,email,plan,status,is_blocked,last_login_at,created_at,search_usage,billing');

  assertNoError(error, 'Failed to load user metrics.');
  return (data || []).map(normalizeUser);
}

export async function getSavedPaperCounts() {
  const { data, error } = await supabaseAdmin.from('saved_papers').select('paper_id,title');
  assertNoError(error, 'Failed to load saved paper analytics.');
  return data || [];
}

export async function getPaymentsLite() {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });
  assertNoError(error, 'Failed to load payment metrics.');
  return data || [];
}
