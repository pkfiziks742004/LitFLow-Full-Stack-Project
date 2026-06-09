import { z } from 'zod';

import { createAdminLog } from '../repositories/adminLogsRepository.js';
import { createManualPayment, deletePaymentById, getPaymentById, listPayments } from '../repositories/systemRepository.js';
import { findUserDetailsForAdmin } from '../repositories/panelRepository.js';
import { ApiError } from '../../utils/apiError.js';

function getIpAddress(req) {
  return req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip || 'unknown';
}

export const listPaymentsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: z.string().optional().default(''),
    source: z.string().optional().default('')
  })
};

export async function getAdminPayments(req, res) {
  const result = await listPayments(req.query);
  const totalRevenue = result.rows
    .filter((payment) => ['active', 'authenticated', 'paid', 'captured', 'manual'].includes(payment.status))
    .reduce((sum, payment) => sum + Number(payment.amountInr || 0), 0);

  res.json({
    success: true,
    ...result,
    metrics: {
      totalRevenue,
      activeSubscriptions: result.rows.filter((payment) => ['active', 'authenticated'].includes(payment.status)).length
    }
  });
}

export const manualPaymentSchema = {
  body: z.object({
    userId: z.string().uuid(),
    amountInr: z.number().positive(),
    plan: z.enum(['FREE', 'PRO']).default('PRO'),
    status: z.string().default('manual'),
    notes: z.record(z.any()).optional().default({})
  })
};

export async function createAdminManualPayment(req, res) {
  const user = await findUserDetailsForAdmin(req.body.userId);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  const payment = await createManualPayment({
    userId: user.id,
    email: user.email,
    amountInr: req.body.amountInr,
    plan: req.body.plan,
    status: req.body.status,
    source: 'admin',
    notes: req.body.notes,
    paidAt: new Date()
  });

  await createAdminLog({
    adminId: req.adminUser.id,
    action: 'manual_payment_created',
    targetType: 'payment',
    targetId: `${payment.id}`,
    ipAddress: getIpAddress(req),
    metadata: {
      userId: user.id,
      email: user.email,
      amountInr: payment.amountInr
    }
  });

  res.json({
    success: true,
    payment
  });
}

export const deletePaymentSchema = {
  params: z.object({
    id: z.coerce.number().int().positive()
  })
};

export async function removeAdminPayment(req, res) {
  const payment = await getPaymentById(req.params.id);

  if (!payment) {
    throw new ApiError(404, 'Payment not found.');
  }

  if (!['admin', 'manual'].includes(payment.source)) {
    throw new ApiError(400, 'Only admin-created manual payments can be deleted.');
  }

  await deletePaymentById(payment.id);

  await createAdminLog({
    adminId: req.adminUser.id,
    action: 'manual_payment_deleted',
    targetType: 'payment',
    targetId: `${payment.id}`,
    ipAddress: getIpAddress(req),
    metadata: {
      userId: payment.userId,
      email: payment.email,
      amountInr: payment.amountInr,
      source: payment.source,
      status: payment.status
    }
  });

  res.json({
    success: true,
    paymentId: payment.id
  });
}
