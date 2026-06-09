import { supabaseAdmin } from '../../config/supabase.js';
import { assertNoError, fromIsoDate } from '../utils/db.js';

function normalizeLog(row) {
  return {
    id: row.id,
    adminId: row.admin_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    status: row.status,
    ipAddress: row.ip_address,
    metadata: row.metadata || {},
    createdAt: fromIsoDate(row.created_at)
  };
}

export async function createAdminLog(entry) {
  const { data, error } = await supabaseAdmin
    .from('admin_logs')
    .insert({
      admin_id: entry.adminId || null,
      action: entry.action,
      target_type: entry.targetType || null,
      target_id: entry.targetId || null,
      status: entry.status || 'success',
      ip_address: entry.ipAddress || null,
      metadata: entry.metadata || {}
    })
    .select('*')
    .single();

  assertNoError(error, 'Failed to create admin log.');
  return normalizeLog(data);
}

export async function listAdminLogs({ page = 1, pageSize = 20, action = '', status = '' }) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('admin_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (action) query = query.ilike('action', `%${action}%`);
  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  assertNoError(error, 'Failed to list admin logs.');

  return {
    rows: (data || []).map(normalizeLog),
    count: count || 0
  };
}

