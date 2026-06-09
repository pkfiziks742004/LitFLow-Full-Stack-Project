import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';

export function createAdminJwt(adminUser) {
  return jwt.sign(
    {
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      type: 'admin'
    },
    env.adminJwtSecret,
    { expiresIn: env.adminJwtExpiresIn }
  );
}

export function verifyAdminJwt(token) {
  return jwt.verify(token, env.adminJwtSecret);
}

