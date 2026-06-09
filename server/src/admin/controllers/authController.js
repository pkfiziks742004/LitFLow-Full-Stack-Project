import bcrypt from 'bcryptjs';
import { z } from 'zod';

import {
  findAdminUserByEmail,
  updateAdminUserById
} from '../repositories/adminUsersRepository.js';
import { createAdminLog } from '../repositories/adminLogsRepository.js';
import { ensureSeedAdminUser, matchesSeedAdminCredentials } from '../services/adminSeedService.js';
import { createAdminJwt } from '../services/adminTokenService.js';
import { ApiError } from '../../utils/apiError.js';

const ADMIN_LOGIN_MAX_ATTEMPTS = 5;
const ADMIN_LOGIN_LOCK_WINDOW_MS = 15 * 60 * 1000;

function getIpAddress(req) {
  return req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip || 'unknown';
}

function getRemainingLockMs(adminUser) {
  if (!adminUser?.lastFailedLoginAt || !adminUser?.failedLoginAttempts) {
    return 0;
  }

  const lockExpiresAt = adminUser.lastFailedLoginAt.getTime() + ADMIN_LOGIN_LOCK_WINDOW_MS;
  return Math.max(lockExpiresAt - Date.now(), 0);
}

function getLockoutMessage(remainingLockMs) {
  const remainingMinutes = Math.max(1, Math.ceil(remainingLockMs / 60_000));
  return `Too many failed admin login attempts. Try again in ${remainingMinutes} minute${
    remainingMinutes === 1 ? '' : 's'
  }.`;
}

export const adminLoginSchema = {
  body: z.object({
    email: z.string().email().transform((value) => value.toLowerCase()),
    password: z.string().min(8)
  })
};

export async function adminLogin(req, res) {
  const { email, password } = req.body;
  const canRecoverSeedAdmin = matchesSeedAdminCredentials(email, password);
  const adminUser = canRecoverSeedAdmin
    ? await ensureSeedAdminUser({ syncPassword: true, clearLock: true })
    : await findAdminUserByEmail(email);

  if (!adminUser) {
    await createAdminLog({
      action: 'admin_login_failed',
      status: 'failed',
      ipAddress: getIpAddress(req),
      metadata: { email, reason: 'not_found' }
    });

    throw new ApiError(401, 'Invalid admin credentials.');
  }

  if (!adminUser.isActive) {
    await createAdminLog({
      adminId: adminUser.id,
      action: 'admin_login_failed',
      status: 'failed',
      ipAddress: getIpAddress(req),
      metadata: { email, reason: 'inactive' }
    });

    throw new ApiError(403, 'Admin account is inactive.');
  }

  const remainingLockMs = getRemainingLockMs(adminUser);
  const previousFailedAttempts = remainingLockMs > 0 ? adminUser.failedLoginAttempts : 0;

  if (remainingLockMs > 0 && previousFailedAttempts >= ADMIN_LOGIN_MAX_ATTEMPTS) {
    await createAdminLog({
      adminId: adminUser.id,
      action: 'admin_login_failed',
      status: 'failed',
      ipAddress: getIpAddress(req),
      metadata: { email, reason: 'locked', retryAfterMs: remainingLockMs }
    });

    throw new ApiError(429, getLockoutMessage(remainingLockMs));
  }

  const isPasswordValid = await bcrypt.compare(password, adminUser.passwordHash);

  if (!isPasswordValid) {
    const failedLoginAttempts = previousFailedAttempts + 1;
    const lastFailedLoginAt = new Date();

    await updateAdminUserById(adminUser.id, {
      failedLoginAttempts,
      lastFailedLoginAt
    });

    await createAdminLog({
      adminId: adminUser.id,
      action: 'admin_login_failed',
      status: 'failed',
      ipAddress: getIpAddress(req),
      metadata: {
        email,
        reason: failedLoginAttempts >= ADMIN_LOGIN_MAX_ATTEMPTS ? 'locked_out' : 'password_mismatch',
        failedLoginAttempts
      }
    });

    if (failedLoginAttempts >= ADMIN_LOGIN_MAX_ATTEMPTS) {
      throw new ApiError(429, getLockoutMessage(ADMIN_LOGIN_LOCK_WINDOW_MS));
    }

    throw new ApiError(401, 'Invalid admin credentials.');
  }

  const updatedAdmin = await updateAdminUserById(adminUser.id, {
    failedLoginAttempts: 0,
    lastFailedLoginAt: null,
    lastLoginAt: new Date()
  });

  await createAdminLog({
    adminId: updatedAdmin.id,
    action: 'admin_login_success',
    ipAddress: getIpAddress(req),
    metadata: { email }
  });

  const token = createAdminJwt(updatedAdmin);

  res.json({
    success: true,
    token,
    adminUser: {
      id: updatedAdmin.id,
      name: updatedAdmin.name,
      email: updatedAdmin.email,
      role: updatedAdmin.role
    }
  });
}

export async function getAdminProfile(req, res) {
  res.json({
    success: true,
    adminUser: {
      id: req.adminUser.id,
      name: req.adminUser.name,
      email: req.adminUser.email,
      role: req.adminUser.role,
      lastLoginAt: req.adminUser.lastLoginAt
    }
  });
}
