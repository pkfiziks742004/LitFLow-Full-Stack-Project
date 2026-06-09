import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../utils/apiError.js';

function assertNoError(error, message) {
  if (error) {
    throw new ApiError(500, message, error.message);
  }
}

function normalizeSavedPaper(row) {
  if (!row) {
    return null;
  }

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
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null
  };
}

function toSavedPaperRow(userId, payload) {
  return {
    user_id: userId,
    paper_id: payload.paperId,
    title: payload.title,
    authors: payload.authors || [],
    year: payload.year ?? null,
    abstract: payload.abstract || '',
    venue: payload.venue || '',
    url: payload.url || '',
    pdf_url: payload.pdfUrl || '',
    fields_of_study: payload.fieldsOfStudy || [],
    summary: payload.summary || '',
    simplified_abstract: payload.simplifiedAbstract || '',
    updated_at: new Date().toISOString()
  };
}

export async function listSavedPapersByUserId(userId) {
  const { data, error } = await supabaseAdmin
    .from('saved_papers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  assertNoError(error, 'Failed to load saved papers.');
  return (data || []).map(normalizeSavedPaper);
}

export async function countSavedPapersByUserId(userId) {
  const { count, error } = await supabaseAdmin
    .from('saved_papers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  assertNoError(error, 'Failed to count saved papers.');
  return count || 0;
}

export async function findSavedPaperByUserAndPaperId(userId, paperId) {
  const { data, error } = await supabaseAdmin
    .from('saved_papers')
    .select('*')
    .eq('user_id', userId)
    .eq('paper_id', paperId)
    .maybeSingle();

  assertNoError(error, 'Failed to load saved paper.');
  return normalizeSavedPaper(data);
}

export async function upsertSavedPaperForUser(userId, payload) {
  const { data, error } = await supabaseAdmin
    .from('saved_papers')
    .upsert(toSavedPaperRow(userId, payload), {
      onConflict: 'user_id,paper_id'
    })
    .select('*')
    .single();

  assertNoError(error, 'Failed to save paper.');
  return normalizeSavedPaper(data);
}

export async function deleteSavedPaperByUserAndPaperId(userId, paperId) {
  const { error } = await supabaseAdmin
    .from('saved_papers')
    .delete()
    .eq('user_id', userId)
    .eq('paper_id', paperId);

  assertNoError(error, 'Failed to delete saved paper.');
}

export async function updateSavedPaperSummary(userId, paperId, summaryPayload) {
  const { data, error } = await supabaseAdmin
    .from('saved_papers')
    .update({
      summary: summaryPayload.summary || '',
      simplified_abstract: summaryPayload.simplifiedAbstract || '',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('paper_id', paperId)
    .select('*')
    .maybeSingle();

  assertNoError(error, 'Failed to update saved paper summary.');
  return normalizeSavedPaper(data);
}
