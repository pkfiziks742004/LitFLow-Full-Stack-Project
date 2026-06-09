import { z } from 'zod';

import { findOtpByEmail, upsertOtpRecord, updateOtpAttempts, deleteOtpById } from '../repositories/otpRepository.js';
import { logAnalyticsEvent } from '../admin/services/analyticsService.js';
import { findOrCreateUserByEmail } from '../repositories/usersRepository.js';
import { sendOtpEmail } from '../services/emailService.js';
import { compareOtp, generateOtp, hashOtp } from '../services/otpService.js';
import { getEffectivePlanCapabilities, getQuotaSnapshot } from '../services/quotaService.js';
import { createJwt } from '../services/tokenService.js';
import { ApiError } from '../utils/apiError.js';

const OTP_RESEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_OTP_REQUESTS_PER_WINDOW = 5;

export const sendOtpSchema = {
  body: z.object({
    email: z.string().email().transform((value) => value.toLowerCase())
  })
};

export async function sendOtp(req, res) {
  const { email } = req.body;
  const existingOtp = await findOtpByEmail(email);
  const resendWindowStartedAt = existingOtp?.updatedAt || existingOtp?.createdAt || existingOtp?.lastSentAt;
  const isWithinResendWindow =
    resendWindowStartedAt && Date.now() - new Date(resendWindowStartedAt).getTime() < OTP_RESEND_WINDOW_MS;
  const nextResendCount = isWithinResendWindow ? (existingOtp?.resendCount || 0) + 1 : 1;

  if (existingOtp?.lastSentAt && Date.now() - new Date(existingOtp.lastSentAt).getTime() < 60_000) {
    throw new ApiError(429, 'Please wait at least 60 seconds before requesting another OTP.');
  }

  if (nextResendCount > MAX_OTP_REQUESTS_PER_WINDOW) {
    throw new ApiError(429, 'Too many OTP requests for this email. Please wait one hour before trying again.');
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await upsertOtpRecord({
    email,
    otpHash,
    expiresAt,
    attempts: 0,
    maxAttempts: 5,
    lastSentAt: new Date(),
    resendCount: nextResendCount
  });

  await logAnalyticsEvent({
    eventType: 'otp_request',
    keyword: null,
    payload: {
      email
    }
  });

  let previewOtp = null;
  let deliveryMode = 'email';

  try {
    const delivery = await sendOtpEmail({ email, otp });
    deliveryMode = delivery?.mode || 'email';

    if (deliveryMode === 'preview' && req.app.get('env') !== 'production') {
      previewOtp = otp;
    }
  } catch (error) {
    if (req.app.get('env') === 'production') {
      throw error;
    }

    console.warn('OTP email delivery failed in non-production mode. Returning preview OTP instead.', error);
    deliveryMode = 'preview';
    previewOtp = otp;
  }

  res.json({
    success: true,
    message: previewOtp ? 'OTP generated in preview mode.' : 'OTP sent successfully.',
    expiresInSeconds: 300,
    deliveryMode,
    previewOtp
  });
}

export const verifyOtpSchema = {
  body: z.object({
    email: z.string().email().transform((value) => value.toLowerCase()),
    otp: z.string().regex(/^\d{6}$/)
  })
};

export async function verifyOtp(req, res) {
  const { email, otp } = req.body;
  const otpRecord = await findOtpByEmail(email);

  if (!otpRecord) {
    await logAnalyticsEvent({
      eventType: 'otp_verify_failure',
      payload: {
        email,
        reason: 'not_found'
      }
    });
    throw new ApiError(400, 'OTP not found. Request a new code and try again.');
  }

  if (otpRecord.expiresAt.getTime() < Date.now()) {
    await deleteOtpById(otpRecord.id);
    await logAnalyticsEvent({
      eventType: 'otp_verify_failure',
      payload: {
        email,
        reason: 'expired'
      }
    });
    throw new ApiError(410, 'OTP expired. Request a new code.');
  }

  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    await logAnalyticsEvent({
      eventType: 'otp_verify_failure',
      payload: {
        email,
        reason: 'attempt_limit'
      }
    });
    throw new ApiError(429, 'Too many invalid OTP attempts. Request a new code.');
  }

  const isMatch = await compareOtp(otp, otpRecord.otpHash);

  if (!isMatch) {
    await updateOtpAttempts(otpRecord.id, otpRecord.attempts + 1);
    await logAnalyticsEvent({
      eventType: 'otp_verify_failure',
      payload: {
        email,
        reason: 'invalid'
      }
    });
    throw new ApiError(400, 'Invalid OTP.');
  }

  const user = await findOrCreateUserByEmail(email);

  await deleteOtpById(otpRecord.id);
  await logAnalyticsEvent({
    userId: user.id,
    eventType: 'otp_verify_success',
    plan: user.plan,
    payload: { email }
  });
  await logAnalyticsEvent({
    userId: user.id,
    eventType: 'user_login',
    plan: user.plan,
    payload: { email }
  });

  const token = createJwt(user);
  const planCapabilities = await getEffectivePlanCapabilities(user.plan);

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan,
      billing: user.billing || null
    },
    quota: getQuotaSnapshot({ user }),
    planCapabilities
  });
}
