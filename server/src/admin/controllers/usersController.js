import { z } from 'zod';

import { createAdminLog } from '../repositories/adminLogsRepository.js';
import { listAnalyticsEvents, createManualPayment, listPayments } from '../repositories/systemRepository.js';
import {
  deleteUserForAdmin,
  findUserDetailsForAdmin,
  listUsersForAdmin
} from '../repositories/panelRepository.js';
import { updateUserById } from '../../repositories/usersRepository.js';
import { ApiError } from '../../utils/apiError.js';

function getIpAddress(req) {
  return req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip || 'unknown';
}

export const listUsersSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
    query: z.string().optional().default(''),
    plan: z.string().optional().default(''),
    status: z.string().optional().default('')
  })
};

export async function listAdminUsers(req, res) {
  const result = await listUsersForAdmin(req.query);
  res.json({ success: true, ...result });
}

export const userIdSchema = {
  params: z.object({
    userId: z.string().uuid()
  })
};

export async function getAdminUserDetails(req, res) {
  const user = await findUserDetailsForAdmin(req.params.userId);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  const [activity, payments] = await Promise.all([
    listAnalyticsEvents({ userId: req.params.userId, limit: 20 }),
    listPayments({ userId: req.params.userId, page: 1, pageSize: 20 })
  ]);

  res.json({
    success: true,
    user,
    recentActivity: activity,
    payments: payments.rows
  });
}

export const updateUserPlanSchema = {
  params: z.object({
    userId: z.string().uuid()
  }),
  body: z.object({
    plan: z.enum(['FREE', 'PRO']),
    addPaymentRecord: z.boolean().optional().default(false),
    amountInr: z.number().nonnegative().optional().default(0)
  })
};

export async function updateAdminUserPlan(req, res) {
  const user = await findUserDetailsForAdmin(req.params.userId);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  const updatedUser = await updateUserById(req.params.userId, {
    plan: req.body.plan,
    billing:
      req.body.plan === 'FREE'
        ? {
            ...(user.billing || {}),
            status: 'free'
          }
        : {
            ...(user.billing || {}),
            status: user.billing?.status || 'manual'
          }
  });

  if (req.body.addPaymentRecord && req.body.plan === 'PRO' && req.body.amountInr > 0) {
    await createManualPayment({
      userId: updatedUser.id,
      email: updatedUser.email,
      amountInr: req.body.amountInr,
      plan: 'PRO',
      status: 'manual',
      source: 'admin',
      notes: {
        updatedByAdminId: req.adminUser.id
      }
    });
  }

  await createAdminLog({
    adminId: req.adminUser.id,
    action: 'user_plan_updated',
    targetType: 'user',
    targetId: updatedUser.id,
    ipAddress: getIpAddress(req),
    metadata: {
      email: updatedUser.email,
      plan: updatedUser.plan
    }
  });

  res.json({
    success: true,
    user: updatedUser
  });
}

export const blockUserSchema = {
  params: z.object({
    userId: z.string().uuid()
  }),
  body: z.object({
    blocked: z.boolean()
  })
};

export async function toggleBlockUser(req, res) {
  const user = await findUserDetailsForAdmin(req.params.userId);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  const updatedUser = await updateUserById(req.params.userId, {
    isBlocked: req.body.blocked,
    status: req.body.blocked ? 'BLOCKED' : 'ACTIVE',
    blockedAt: req.body.blocked ? new Date() : null
  });

  await createAdminLog({
    adminId: req.adminUser.id,
    action: req.body.blocked ? 'user_blocked' : 'user_unblocked',
    targetType: 'user',
    targetId: updatedUser.id,
    ipAddress: getIpAddress(req),
    metadata: { email: updatedUser.email }
  });

  res.json({
    success: true,
    user: updatedUser
  });
}

export async function deleteAdminUser(req, res) {
  const user = await findUserDetailsForAdmin(req.params.userId);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  await deleteUserForAdmin(req.params.userId);
  await createAdminLog({
    adminId: req.adminUser.id,
    action: 'user_deleted',
    targetType: 'user',
    targetId: req.params.userId,
    ipAddress: getIpAddress(req),
    metadata: { email: user.email }
  });

  res.json({
    success: true,
    message: 'User deleted successfully.'
  });
}
