import { ApiError } from '../utils/apiError.js';
import { isProduction } from '../config/env.js';

export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, 'Route not found.'));
}

export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const shouldHideInternalDetails = statusCode >= 500;
  const shouldExposeDetails = !isProduction && !shouldHideInternalDetails;

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message: shouldHideInternalDetails ? 'Internal server error.' : error.message || 'Internal server error.',
    details: shouldExposeDetails ? error.details || undefined : undefined
  });
}
