import bcrypt from 'bcryptjs';

import { env } from '../../config/env.js';
import {
  createAdminUser,
  findAdminUserByEmail,
  updateAdminUserById
} from '../repositories/adminUsersRepository.js';

export function isSeedAdminEmail(email = '') {
  return email.trim().toLowerCase() === env.adminSeedEmail.toLowerCase();
}

export function matchesSeedAdminCredentials(email = '', password = '') {
  return env.adminSeedRecoveryEnabled && isSeedAdminEmail(email) && password === env.adminSeedPassword;
}

export async function ensureSeedAdminUser({ syncPassword = true, clearLock = false } = {}) {
  const normalizedEmail = env.adminSeedEmail.toLowerCase();
  const existingAdmin = await findAdminUserByEmail(normalizedEmail);
  const passwordHash = syncPassword ? await bcrypt.hash(env.adminSeedPassword, 12) : undefined;

  if (!existingAdmin) {
    return createAdminUser({
      name: env.adminSeedName,
      email: normalizedEmail,
      passwordHash: passwordHash || (await bcrypt.hash(env.adminSeedPassword, 12)),
      role: 'SUPER_ADMIN'
    });
  }

  const patch = {};

  if (existingAdmin.name !== env.adminSeedName) patch.name = env.adminSeedName;
  if (existingAdmin.role !== 'SUPER_ADMIN') patch.role = 'SUPER_ADMIN';
  if (!existingAdmin.isActive) patch.isActive = true;
  if (syncPassword) patch.passwordHash = passwordHash;
  if (clearLock) {
    patch.failedLoginAttempts = 0;
    patch.lastFailedLoginAt = null;
  }

  if (Object.keys(patch).length === 0) {
    return existingAdmin;
  }

  return updateAdminUserById(existingAdmin.id, patch);
}
