import crypto from 'crypto';

import Razorpay from 'razorpay';

import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

let razorpay;

function getRazorpayClient() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new ApiError(503, 'Razorpay is not configured yet.');
  }

  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: env.razorpayKeyId,
      key_secret: env.razorpayKeySecret
    });
  }

  return razorpay;
}

export async function createProSubscriptionForUser(user) {
  if (!env.razorpayProPlanId) {
    throw new ApiError(503, 'Razorpay Pro plan ID is not configured.');
  }

  const userId = user.id || user._id;

  return getRazorpayClient().subscriptions.create({
    plan_id: env.razorpayProPlanId,
    total_count: env.razorpaySubscriptionCount,
    quantity: 1,
    customer_notify: 1,
    notes: {
      userId: userId.toString(),
      email: user.email,
      plan: 'PRO'
    }
  });
}

export function verifySubscriptionSignature({ paymentId, subscriptionId, signature }) {
  const digest = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest('hex');

  return digest === signature;
}

export async function fetchSubscription(subscriptionId) {
  return getRazorpayClient().subscriptions.fetch(subscriptionId);
}
