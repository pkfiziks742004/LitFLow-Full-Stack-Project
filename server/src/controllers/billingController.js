import { z } from 'zod';

import { logAnalyticsEvent } from '../admin/services/analyticsService.js';
import { getSiteSetting, upsertPayment } from '../admin/repositories/systemRepository.js';
import { env } from '../config/env.js';
import { PLAN_IDS } from '../constants/plans.js';
import { updateUserById } from '../repositories/usersRepository.js';
import {
  createProSubscriptionForUser,
  fetchSubscription,
  verifySubscriptionSignature
} from '../services/razorpayService.js';
import { getEffectivePlanCapabilities } from '../services/quotaService.js';
import { getPublicSiteConfig } from '../services/siteConfigService.js';
import { ApiError } from '../utils/apiError.js';

export async function getCheckoutConfig(_req, res) {
  const { siteName, branding, pricing } = await getPublicSiteConfig();

  res.json({
    success: true,
    siteName,
    branding,
    pricing,
    proFeatures: [
      'Unlimited literature searches',
      'Advanced author and keyword filters',
      'Unlimited saved papers',
      'AI summaries and simplified abstracts',
      'Ad-free workspace and graph export'
    ]
  });
}

export async function createSubscription(req, res) {
  const { pricing } = await getPublicSiteConfig();

  if (pricing.enabled === false) {
    throw new ApiError(403, 'Pricing is currently unavailable.');
  }

  if (!env.razorpayKeyId || !env.razorpayKeySecret || !env.razorpayProPlanId) {
    throw new ApiError(503, 'Pro upgrades are not available for this workspace right now.');
  }

  let subscription;

  try {
    subscription = await createProSubscriptionForUser(req.user);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(503, 'Pro upgrades are not available for this workspace right now.');
  }

  res.json({
    success: true,
    subscription,
    keyId: env.razorpayKeyId
  });
}

export const verifySubscriptionSchema = {
  body: z.object({
    razorpay_payment_id: z.string().min(1),
    razorpay_subscription_id: z.string().min(1),
    razorpay_signature: z.string().min(1)
  })
};

export async function verifySubscription(req, res) {
  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

  const isValid = verifySubscriptionSignature({
    paymentId: razorpay_payment_id,
    subscriptionId: razorpay_subscription_id,
    signature: razorpay_signature
  });

  if (!isValid) {
    throw new ApiError(400, 'Invalid Razorpay signature.');
  }

  const subscription = await fetchSubscription(razorpay_subscription_id);
  const pricingSetting = await getSiteSetting('pricing');
  const proPrice = Number(pricingSetting?.value?.pro || 0);

  const updatedUser = await updateUserById(req.user.id, {
    plan: PLAN_IDS.PRO,
    billing: {
      ...(req.user.billing || {}),
      razorpayCustomerId: subscription.customer_id || req.user.billing?.razorpayCustomerId,
      razorpaySubscriptionId: razorpay_subscription_id,
      razorpayPaymentId: razorpay_payment_id,
      status: subscription.status || 'active',
      currentPeriodEnd: subscription.current_end ? new Date(subscription.current_end * 1000) : undefined,
      upgradedAt: new Date()
    }
  });

  await upsertPayment({
    userId: updatedUser.id,
    email: updatedUser.email,
    razorpaySubscriptionId: razorpay_subscription_id,
    razorpayPaymentId: razorpay_payment_id,
    amountInr: proPrice,
    currency: 'INR',
    status: subscription.status || 'active',
    plan: 'PRO',
    source: 'razorpay',
    notes: {
      razorpaySignatureVerified: true
    },
    paidAt: new Date()
  });

  await logAnalyticsEvent({
    userId: updatedUser.id,
    eventType: 'subscription_upgraded',
    plan: 'PRO',
    metricValue: proPrice,
    payload: {
      amountInr: proPrice,
      razorpayPaymentId: razorpay_payment_id
    }
  });
  const planCapabilities = await getEffectivePlanCapabilities(updatedUser.plan);

  res.json({
    success: true,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      plan: updatedUser.plan,
      billing: updatedUser.billing
    },
    planCapabilities
  });
}

export async function syncSubscriptionStatus(req, res) {
  if (!req.user.billing?.razorpaySubscriptionId) {
    throw new ApiError(404, 'No subscription found for this account.');
  }

  const subscription = await fetchSubscription(req.user.billing.razorpaySubscriptionId);
  const activeStates = new Set(['authenticated', 'active', 'pending']);

  const updatedUser = await updateUserById(req.user.id, {
    plan: activeStates.has(subscription.status) ? PLAN_IDS.PRO : PLAN_IDS.FREE,
    billing: {
      ...(req.user.billing || {}),
      status: subscription.status,
      currentPeriodEnd: subscription.current_end ? new Date(subscription.current_end * 1000) : undefined
    }
  });

  if (req.user.billing?.razorpayPaymentId) {
    await upsertPayment({
      userId: updatedUser.id,
      email: updatedUser.email,
      razorpaySubscriptionId: req.user.billing?.razorpaySubscriptionId,
      razorpayPaymentId: req.user.billing?.razorpayPaymentId,
      amountInr: 0,
      currency: 'INR',
      status: subscription.status,
      plan: updatedUser.plan,
      source: 'razorpay',
      notes: {
        synced: true
      },
      paidAt: updatedUser.billing?.currentPeriodEnd ? new Date(updatedUser.billing.currentPeriodEnd) : new Date()
    });
  }

  res.json({
    success: true,
    status: subscription.status,
    plan: updatedUser.plan,
    billing: updatedUser.billing
  });
}
