import { supabaseAdmin } from '../../config/supabase.js';
import { assertNoError, fromIsoDate, toIsoDate } from '../utils/db.js';

function normalizePayment(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    razorpaySubscriptionId: row.razorpay_subscription_id,
    razorpayPaymentId: row.razorpay_payment_id,
    amountInr: Number(row.amount_inr || 0),
    currency: row.currency,
    status: row.status,
    plan: row.plan,
    source: row.source,
    notes: row.notes || {},
    paidAt: fromIsoDate(row.paid_at),
    createdAt: fromIsoDate(row.created_at),
    updatedAt: fromIsoDate(row.updated_at)
  };
}

function normalizeAnalyticsRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type,
    keyword: row.keyword,
    paperId: row.paper_id,
    plan: row.plan,
    metricValue: Number(row.metric_value || 0),
    payload: row.payload || {},
    dateKey: row.date_key,
    createdAt: fromIsoDate(row.created_at)
  };
}

function normalizeFeature(row) {
  if (!row) return null;

  return {
    key: row.key,
    label: row.label,
    description: row.description,
    enabled: row.enabled,
    config: row.config || {},
    updatedAt: fromIsoDate(row.updated_at)
  };
}

function normalizeSetting(row) {
  if (!row) return null;

  return {
    key: row.key,
    value: row.value || {},
    updatedAt: fromIsoDate(row.updated_at)
  };
}

function normalizeContentPaper(row) {
  return {
    id: row.id,
    paperId: row.paper_id || '',
    title: row.title,
    authors: row.authors || [],
    year: row.year,
    abstract: row.abstract || '',
    venue: row.venue || '',
    url: row.url || '',
    pdfUrl: row.pdf_url || '',
    isTrending: row.is_trending,
    isFeatured: row.is_featured,
    source: row.source,
    notes: row.notes || '',
    createdAt: fromIsoDate(row.created_at),
    updatedAt: fromIsoDate(row.updated_at)
  };
}

function normalizeSavedPaper(row) {
  return {
    id: row.id,
    userId: row.user_id,
    paperId: row.paper_id,
    title: row.title,
    authors: row.authors || [],
    year: row.year,
    abstract: row.abstract || '',
    venue: row.venue || '',
    url: row.url || '',
    pdfUrl: row.pdf_url || '',
    fieldsOfStudy: row.fields_of_study || [],
    summary: row.summary || '',
    simplifiedAbstract: row.simplified_abstract || '',
    createdAt: fromIsoDate(row.created_at),
    updatedAt: fromIsoDate(row.updated_at)
  };
}

export async function createAnalyticsEvent(entry) {
  const { data, error } = await supabaseAdmin
    .from('analytics_data')
    .insert({
      user_id: entry.userId || null,
      event_type: entry.eventType,
      keyword: entry.keyword || null,
      paper_id: entry.paperId || null,
      plan: entry.plan || null,
      metric_value: entry.metricValue ?? 1,
      payload: entry.payload || {},
      date_key: entry.dateKey || new Date().toISOString().slice(0, 10)
    })
    .select('*')
    .single();

  assertNoError(error, 'Failed to create analytics event.');
  return normalizeAnalyticsRow(data);
}

export async function listAnalyticsEvents(filters = {}) {
  let query = supabaseAdmin.from('analytics_data').select('*').order('created_at', { ascending: false });

  if (filters.eventType) query = query.eq('event_type', filters.eventType);
  if (filters.limit) query = query.limit(filters.limit);
  if (filters.fromDate) query = query.gte('date_key', filters.fromDate);
  if (filters.toDate) query = query.lte('date_key', filters.toDate);
  if (filters.userId) query = query.eq('user_id', filters.userId);

  const { data, error } = await query;
  assertNoError(error, 'Failed to list analytics events.');
  return (data || []).map(normalizeAnalyticsRow);
}

export async function upsertPayment(entry) {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .upsert(
      {
        user_id: entry.userId || null,
        email: entry.email || null,
        razorpay_subscription_id: entry.razorpaySubscriptionId || null,
        razorpay_payment_id: entry.razorpayPaymentId || null,
        amount_inr: entry.amountInr ?? 0,
        currency: entry.currency || 'INR',
        status: entry.status || 'pending',
        plan: entry.plan || 'PRO',
        source: entry.source || 'razorpay',
        notes: entry.notes || {},
        paid_at: toIsoDate(entry.paidAt)
      },
      { onConflict: 'razorpay_payment_id' }
    )
    .select('*')
    .single();

  assertNoError(error, 'Failed to save payment.');
  return normalizePayment(data);
}

export async function createManualPayment(entry) {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .insert({
      user_id: entry.userId || null,
      email: entry.email || null,
      amount_inr: entry.amountInr ?? 0,
      currency: entry.currency || 'INR',
      status: entry.status || 'manual',
      plan: entry.plan || 'PRO',
      source: entry.source || 'manual',
      notes: entry.notes || {},
      paid_at: toIsoDate(entry.paidAt || new Date())
    })
    .select('*')
    .single();

  assertNoError(error, 'Failed to create manual payment.');
  return normalizePayment(data);
}

export async function listPayments({ page = 1, pageSize = 20, status = '', source = '', userId = '' }) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('payments')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status) query = query.eq('status', status);
  if (source) query = query.eq('source', source);
  if (userId) query = query.eq('user_id', userId);

  const { data, error, count } = await query;
  assertNoError(error, 'Failed to list payments.');

  return {
    rows: (data || []).map(normalizePayment),
    count: count || 0
  };
}

export async function getPaymentById(id) {
  const { data, error } = await supabaseAdmin.from('payments').select('*').eq('id', id).maybeSingle();
  assertNoError(error, 'Failed to load payment.');
  return normalizePayment(data);
}

export async function deletePaymentById(id) {
  const { error } = await supabaseAdmin.from('payments').delete().eq('id', id);
  assertNoError(error, 'Failed to delete payment.');
}

export async function listFeatureControls() {
  const { data, error } = await supabaseAdmin.from('feature_controls').select('*').order('key');
  assertNoError(error, 'Failed to load feature controls.');
  return (data || []).map(normalizeFeature).filter(Boolean);
}

export async function updateFeatureControl(key, patch) {
  const { data, error } = await supabaseAdmin
    .from('feature_controls')
    .update({
      enabled: patch.enabled,
      config: patch.config || {}
    })
    .eq('key', key)
    .select('*')
    .single();

  assertNoError(error, 'Failed to update feature control.');
  return normalizeFeature(data);
}

export async function listSiteSettings() {
  const { data, error } = await supabaseAdmin.from('site_settings').select('*').order('key');
  assertNoError(error, 'Failed to load site settings.');
  return (data || []).map(normalizeSetting).filter(Boolean);
}

export async function getSiteSetting(key) {
  const { data, error } = await supabaseAdmin.from('site_settings').select('*').eq('key', key).maybeSingle();
  assertNoError(error, 'Failed to load site setting.');
  return normalizeSetting(data);
}

export async function upsertSiteSetting(key, value) {
  const { data, error } = await supabaseAdmin
    .from('site_settings')
    .upsert({ key, value }, { onConflict: 'key' })
    .select('*')
    .single();

  assertNoError(error, 'Failed to update site setting.');
  return normalizeSetting(data);
}

export async function deleteSiteSetting(key) {
  const { error } = await supabaseAdmin.from('site_settings').delete().eq('key', key);
  assertNoError(error, 'Failed to delete site setting.');
}

export async function listContentPapers({ page = 1, pageSize = 20, featuredOnly = false, trendingOnly = false }) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('content_papers')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (featuredOnly) query = query.eq('is_featured', true);
  if (trendingOnly) query = query.eq('is_trending', true);

  const { data, error, count } = await query;
  assertNoError(error, 'Failed to load content papers.');
  return {
    rows: (data || []).map(normalizeContentPaper),
    count: count || 0
  };
}

export async function upsertContentPaper(payload) {
  const { data, error } = await supabaseAdmin
    .from('content_papers')
    .upsert(
      {
        id: payload.id || undefined,
        paper_id: payload.paperId || null,
        title: payload.title,
        authors: payload.authors || [],
        year: payload.year ?? null,
        abstract: payload.abstract || '',
        venue: payload.venue || '',
        url: payload.url || '',
        pdf_url: payload.pdfUrl || '',
        is_trending: Boolean(payload.isTrending),
        is_featured: Boolean(payload.isFeatured),
        source: payload.source || 'manual',
        notes: payload.notes || ''
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  assertNoError(error, 'Failed to save content paper.');
  return normalizeContentPaper(data);
}

export async function deleteContentPaper(id) {
  const { error } = await supabaseAdmin.from('content_papers').delete().eq('id', id);
  assertNoError(error, 'Failed to delete content paper.');
}

export async function listSavedPapersForAdmin({ page = 1, pageSize = 20 }) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabaseAdmin
    .from('saved_papers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  assertNoError(error, 'Failed to load saved papers.');
  return {
    rows: (data || []).map(normalizeSavedPaper),
    count: count || 0
  };
}

export async function deleteSavedPaperById(id) {
  const { error } = await supabaseAdmin.from('saved_papers').delete().eq('id', id);
  assertNoError(error, 'Failed to delete saved paper.');
}
