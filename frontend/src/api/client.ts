import type { Envelope, ErrorDetail, ErrorCode } from './types';
import { mockRequest } from './mock/handlers';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
const USE_MOCKS = (import.meta.env.VITE_USE_MOCKS ?? 'true') !== 'false';

/** Contract 7.2: one failure shape, with field-level detail the forms can map. */
export class TypedApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: ErrorDetail[];
  readonly requestId: string | undefined;

  constructor(status: number, code: ErrorCode, message: string, details: ErrorDetail[] = [], requestId?: string) {
    super(message);
    this.name = 'TypedApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  /** Message for a form field, addressed by the contract's `field` path. */
  fieldError(field: string): string | undefined {
    return this.details.find((d) => d.field === field || d.field.endsWith(`.${field}`))?.message;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isNotFound(): boolean {
    return this.status === 404;
  }
  get isConflict(): boolean {
    return this.status === 409;
  }
  get isValidation(): boolean {
    return this.status === 422;
  }
}

let accessToken: string | null = sessionStorage.getItem('sms.accessToken');

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (token) sessionStorage.setItem('sms.accessToken', token);
  else sessionStorage.removeItem('sms.accessToken');
}

export function getAccessToken(): string | null {
  return accessToken;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: Method;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** internal: prevents an infinite refresh loop */
  retried?: boolean;
  signal?: AbortSignal;
}

function buildPath(path: string, query: RequestOptions['query']): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * One typed client: base /api/v1, bearer token, a single refresh-and-retry on
 * 401, and TypedApiError carrying code, message and details[].
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<Envelope<T>> {
  const method = options.method ?? 'GET';
  const fullPath = buildPath(path, options.query);

  if (USE_MOCKS) {
    const result = await mockRequest(method, fullPath, options.body, accessToken);
    if (!result.ok) {
      if (result.status === 401 && !options.retried) {
        const refreshed = await mockRequest('POST', '/auth/refresh', null, accessToken);
        if (refreshed.ok && refreshed.status < 300) {
          setAccessToken((refreshed.body as Envelope<{ accessToken: string }>).data.accessToken);
          return apiRequest<T>(path, { ...options, retried: true });
        }
        setAccessToken(null);
      }
      throw new TypedApiError(
        result.status,
        result.body.error.code,
        result.body.error.message,
        result.body.error.details ?? [],
        result.body.error.requestId,
      );
    }
    return result.body as Envelope<T>;
  }

  const res = await fetch(`${BASE}${fullPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    credentials: 'include',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });

  if (res.status === 401 && !options.retried) {
    const refresh = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refresh.ok) {
      const payload = (await refresh.json()) as Envelope<{ accessToken: string }>;
      setAccessToken(payload.data.accessToken);
      return apiRequest<T>(path, { ...options, retried: true });
    }
    setAccessToken(null);
  }

  const text = await res.text();
  const json: unknown = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const env = json as { error?: { code: ErrorCode; message: string; details?: ErrorDetail[]; requestId?: string } } | null;
    throw new TypedApiError(
      res.status,
      env?.error?.code ?? 'INTERNAL_ERROR',
      env?.error?.message ?? 'The server could not complete the request.',
      env?.error?.details ?? [],
      env?.error?.requestId,
    );
  }

  return json as Envelope<T>;
}

export const API_BASE = BASE;
export const MOCKS_ENABLED = USE_MOCKS;
