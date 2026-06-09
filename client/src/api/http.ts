function getDefaultApiBaseUrl() {
  return '/api';
}

function normalizeApiBaseUrl(value: string | undefined, fallbackPath: string) {
  const resolved = value?.trim() || fallbackPath;
  return resolved.replace(/\/$/, '');
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL, getDefaultApiBaseUrl());

type RequestOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
  headers?: Record<string, string>;
  cache?: RequestCache;
};

export class ApiRequestError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    cache: method === 'GET' ? options.cache || 'no-store' : options.cache,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  let payload: unknown = null;
  let responseText = '';

  try {
    if (contentType.includes('application/json')) {
      payload = await response.json();
    } else {
      responseText = await response.text();
    }
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: string }).message)
        : responseText
          ? `Request failed with status ${response.status}: ${responseText.slice(0, 120)}`
        : `Request failed with status ${response.status}`;

    throw new ApiRequestError(message, response.status, payload || responseText || null);
  }

  if (!contentType.includes('application/json')) {
    throw new ApiRequestError(
      'Unexpected API response. Please make sure the backend server is running on port 5000.',
      response.status,
      responseText || null,
    );
  }

  return payload as T;
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
