import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { findUserById } from '../repositories/usersRepository.js';
import { ApiError } from '../utils/apiError.js';

function parseBearerToken(header = '') {
  if (!header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice(7).trim();
}

async function resolveUserFromRequest(req, strict) {
  const token = parseBearerToken(req.headers.authorization);

  if (!token) {
    if (strict) {
      throw new ApiError(401, 'Authentication required.');
    }

    req.user = null;
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await findUserById(payload.sub);

    if (!user) {
      throw new ApiError(401, 'Account not found.');
    }

    if (user.isBlocked) {
      throw new ApiError(403, 'This account has been blocked by an administrator.');
    }

    req.user = user;
  } catch (error) {
    if (strict) {
      if (error?.statusCode) {
        throw error;
      }

      throw new ApiError(401, 'Invalid or expired token.');
    }

    req.user = null;
  }
}

export function requireAuth(req, res, next) {
  resolveUserFromRequest(req, true).then(() => next()).catch(next);
}

export function attachUserIfPresent(req, res, next) {
  resolveUserFromRequest(req, false).then(() => next()).catch(next);
}
