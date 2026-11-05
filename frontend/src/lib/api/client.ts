import { ApiError } from './errors';

/**
 * The single HTTP client used by the browser. It always calls the same-origin proxy
 * (`/api/v1/...`, forwarded by Next to the API), sends the session cookie and turns any
 * error into an `ApiError`.
 */
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  body?: unknown;
  formData?: FormData;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /**
   * When false, a 401 does NOT trigger the global "session expired" handling (used by the
   * login, register and "who am I" calls, where 401 is an expected answer).
   */
  redirectOn401?: boolean;
}

let unauthorizedHandler: (() => void) | null = null;

/** Registers what happens when any request answers 401 (clear session, go to login). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function apiUrl(path: string): string {
  const base = typeof window === 'undefined' ? 'http://localhost' : window.location.href;
  return new URL(`/api/v1${path}`, base).toString();
}

async function request<T>(method: Method, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData; // the browser sets the multipart boundary
  } else if (method !== 'GET') {
    // The API requires JSON on every state-changing request (CSRF protection).
    headers['Content-Type'] = 'application/json';
    if (options.body !== undefined) body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method,
      headers,
      body,
      credentials: 'include',
      cache: 'no-store',
      signal: options.signal,
    });
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') throw err;
    throw ApiError.network();
  }

  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = ApiError.fromResponse(response.status, data);
    if (response.status === 401 && options.redirectOn401 !== false) unauthorizedHandler?.();
    throw error;
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
  upload: <T>(path: string, formData: FormData, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, formData }),
};
