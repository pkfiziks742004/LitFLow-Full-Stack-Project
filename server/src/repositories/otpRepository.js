import { supabaseAdmin } from '../config/supabase.js';
import { ApiError } from '../utils/apiError.js';

function assertNoError(error, message) {
  if (error) {
    throw new ApiError(500, message, error.message);
  }
}

function normalizeOtp(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    otpHash: row.otp_hash,
    expiresAt: new Date(row.expires_at),
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    lastSentAt: row.last_sent_at ? new Date(row.last_sent_at) : null,
    resendCount: row.resend_count,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null
  };
}

export async function findOtpByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from('otp_verification')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  assertNoError(error, 'Failed to load OTP record.');
  return normalizeOtp(data);
}

export async function upsertOtpRecord(payload) {
  const { data, error } = await supabaseAdmin
    .from('otp_verification')
    .upsert(
      {
        email: payload.email.toLowerCase(),
        otp_hash: payload.otpHash,
        expires_at: new Date(payload.expiresAt).toISOString(),
        attempts: payload.attempts,
        max_attempts: payload.maxAttempts,
        last_sent_at: new Date(payload.lastSentAt).toISOString(),
        resend_count: payload.resendCount,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: 'email'
      }
    )
    .select('*')
    .single();

  assertNoError(error, 'Failed to save OTP record.');
  return normalizeOtp(data);
}

export async function updateOtpAttempts(id, attempts) {
  const { data, error } = await supabaseAdmin
    .from('otp_verification')
    .update({
      attempts,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single();

  assertNoError(error, 'Failed to update OTP attempts.');
  return normalizeOtp(data);
}

export async function deleteOtpById(id) {
  const { error } = await supabaseAdmin.from('otp_verification').delete().eq('id', id);
  assertNoError(error, 'Failed to delete OTP record.');
}

