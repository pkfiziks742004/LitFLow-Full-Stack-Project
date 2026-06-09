import { ApiError } from '../../utils/apiError.js';

export function assertNoError(error, message) {
  if (error) {
    throw new ApiError(500, message, error.message);
  }
}

export function toIsoDate(value) {
  return value ? new Date(value).toISOString() : null;
}

export function fromIsoDate(value) {
  return value ? new Date(value) : null;
}

