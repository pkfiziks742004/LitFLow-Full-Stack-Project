import { findAdminUserById } from '../repositories/adminUsersRepository.js';
import { verifyAdminJwt } from '../services/adminTokenService.js';
import { ApiError } from '../../utils/apiError.js';

function parseBearerToken(header = '') {
  if (!header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice(7).trim();
}

export async function requireAdminAuth(req, _res, next) {
  try {
    const token = parseBearerToken(req.headers.authorization);

    if (!token) {
      throw new ApiError(401, 'Admin authentication required.');
    }

    const payload = verifyAdminJwt(token);

    if (payload.type !== 'admin') {
      throw new ApiError(401, 'Invalid admin token.');
    }

    const adminUser = await findAdminUserById(payload.sub);

    if (!adminUser || !adminUser.isActive) {
      throw new ApiError(403, 'Admin account is inactive.');
    }

    req.adminUser = adminUser;
    next();
  } catch (error) {
    next(error.statusCode ? error : new ApiError(401, 'Invalid or expired admin token.'));
  }
}

