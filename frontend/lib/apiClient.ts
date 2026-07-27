// Strip trailing slashes and any accidental "/api/v1" suffix that gets pasted
// into the Vercel env var. The correct value is just the host origin, e.g.
// "https://foresight-backend-p9dr.onrender.com" (no path). If someone sets it
// to "https://foresight-backend-p9dr.onrender.com/api/v1" the paths appended
// by service calls (e.g. "/api/v1/auth/me/") would double up to
// "/api/v1//api/v1/auth/me/" and produce 404s on every request.
const isServer = typeof window === 'undefined';
const rawApiUrl = isServer
  ? (process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  : ''; // Client-side MUST use relative URLs to hit Next.js proxy rewrites for same-domain cookies.

const API_BASE_URL = rawApiUrl
  .replace(/\/api\/v\d+\/?$/, '') // strip accidental /api/v1 (or /api/v2, etc.)
  .replace(/\/+$/, '');           // strip any remaining trailing slashes

/**
 * Field-level validation errors as returned by DRF serializers, e.g.
 * `{ "email": ["This field is required."], "non_field_errors": ["..."] }`.
 */
export type ApiFieldErrors = Record<string, string[]>;

/**
 * Thrown instead of `ApiError` when the backend never actually answered --
 * either `fetch` itself failed (connection refused, DNS, offline) or it
 * answered with a 5xx. Both mean "the API is having a bad day," not "the
 * request was invalid," so callers (error.tsx boundaries) can special-case
 * this into a distinct "Service Temporarily Unavailable" UI instead of the
 * generic error state a 400/404 gets.
 */
const SERVICE_UNAVAILABLE_MARKER = 'temporarily unavailable';

export class ServiceUnavailableError extends Error {
  constructor(
    message = `The service is ${SERVICE_UNAVAILABLE_MARKER}. Please try again shortly.`
  ) {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * error.tsx boundaries use this instead of `instanceof ServiceUnavailableError`
 * -- Next.js doesn't guarantee an error's prototype chain survives the trip
 * from a Server Component render into a Client Component error boundary, so
 * matching on the message text (kept in sync via `SERVICE_UNAVAILABLE_MARKER`
 * above) is the reliable signal.
 */
export function isServiceUnavailable(error: unknown): boolean {
  return error instanceof Error && error.message.includes(SERVICE_UNAVAILABLE_MARKER);
}

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: ApiFieldErrors;

  constructor(status: number, fieldErrors: ApiFieldErrors, message?: string) {
    super(
      message ??
        ApiError.summarize(fieldErrors) ??
        `Request failed with status ${status}`
    );
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  private static summarize(fieldErrors: ApiFieldErrors): string | undefined {
    const firstKey = Object.keys(fieldErrors)[0];
    return firstKey ? fieldErrors[firstKey]?.[0] : undefined;
  }
}

/**
 * DRF doesn't always return `{ field: string[] }` -- `{"detail": "Not found."}`
 * (404s, permission errors) and similar payloads use a bare string. Normalize
 * everything into `ApiFieldErrors` so callers can always safely index `[0]`
 * for the full message instead of silently getting its first character.
 */
function normalizeFieldErrors(payload: unknown): ApiFieldErrors {
  if (payload === null || payload === undefined) {
    return {};
  }

  if (typeof payload !== 'object') {
    return { non_field_errors: [String(payload)] };
  }

  const normalized: ApiFieldErrors = {};
  for (const [field, value] of Object.entries(
    payload as Record<string, unknown>
  )) {
    const targetField = field === 'detail' ? 'non_field_errors' : field;
    if (Array.isArray(value)) {
      normalized[targetField] = value.map((item) =>
        typeof item === 'string' ? item : String(item)
      );
    } else if (typeof value === 'string') {
      normalized[targetField] = [value];
    } else {
      normalized[targetField] = [String(value)];
    }
  }

  if (Object.keys(normalized).length === 0) {
    normalized.non_field_errors = [String(payload)];
  }

  return normalized;
}

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  idempotencyKey?: string;
  /** Request-scoped bearer token; never retained by the shared client. */
  authToken?: string;
  /**
   * Skip the global 401 -> unauthorized event (see `notifyUnauthorized`).
   * Set on the auth endpoints themselves (login/me) -- a failed login
   * attempt or an anonymous session check is an expected 401, not a
   * signal that a previously-valid session just expired.
   */
  skipAuthRedirect?: boolean;
};

/**
 * Dispatched on any non-auth request that comes back 401 -- context/auth-context.tsx
 * listens for this globally and treats it as "the session just expired",
 * clearing local state and redirecting to /login. Kept as a DOM event
 * (rather than importing React/router state here) so this client stays a
 * plain, framework-agnostic module usable from both Server Components and
 * client code.
 */
export const UNAUTHORIZED_EVENT = 'foresight:unauthorized';

function notifyUnauthorized(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
}

/**
 * 401s from these three endpoints are never worth a silent refresh-and-retry:
 * a failed login/register is a credentials problem, not an expired session,
 * and a 401 from the refresh call itself must not recursively try to
 * refresh again.
 */
const AUTH_ENDPOINTS_WITHOUT_REFRESH = new Set([
  '/api/v1/auth/login/',
  '/api/v1/auth/register/',
  '/api/v1/auth/refresh/',
]);

/** Shape returned by DRF's `core.pagination.StandardPagination` for every list endpoint. */
export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/**
 * Single, unified fetch-based client for all requests to the Django backend.
 * Centralizes base URL resolution, JSON (de)serialization, auth headers, and
 * DRF error-payload parsing so callers/components never touch `fetch` directly.
 */
class ApiClient {
  private readonly baseUrl: string;
  private refreshPromise: Promise<void> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  get<T>(path: string, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  delete<T>(path: string, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  /**
   * Calls POST /api/v1/auth/refresh/ (see backend/core/views.py::RefreshView),
   * deduped per tab so concurrent 401s never fire more than one refresh
   * request at once. Resolves regardless of whether the refresh actually
   * succeeded -- `request()`'s caller always retries the original request
   * once afterward either way, which is what makes the cross-tab
   * ROTATE_REFRESH_TOKENS/BLACKLIST_AFTER_ROTATION race safe (see
   * docs/superpowers/specs/2026-07-26-session-fix-and-settings-wiring-design.md):
   * cookies are shared across tabs, so even a failed refresh in *this* tab
   * can still be followed by a successful retry if another tab's refresh
   * already rotated the cookie in the meantime.
   *
   * Browser-only: see the `typeof window !== 'undefined'` guard in
   * `request()`'s 401-handling branch below for why this must never run
   * on the server.
   */
  private refreshSession(): Promise<void> {
    if (!this.refreshPromise) {
      this.refreshPromise = fetch(`${this.baseUrl}/api/v1/auth/refresh/`, {
        method: 'POST',
        credentials: 'include',
      })
        .catch(() => undefined)
        .then(() => undefined)
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    return this.refreshPromise;
  }

  private async request<T>(path: string, options: RequestOptions, attempt = 0): Promise<T> {
    const { body, idempotencyKey, authToken, skipAuthRedirect, headers, ...rest } = options;

    const requestHeaders = new Headers(headers);
    requestHeaders.set('Accept', 'application/json');
    if (body !== undefined) {
      requestHeaders.set('Content-Type', 'application/json');
    }
    if (authToken) {
      requestHeaders.set('Authorization', `Bearer ${authToken}`);
    }
    if (idempotencyKey) {
      requestHeaders.set('Idempotency-Key', idempotencyKey);
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...rest,
        // Required for the browser to send/receive the HttpOnly JWT cookies
        // (backend/core/views.py::LoginView) -- without this, a cross-origin
        // request neither attaches existing cookies nor lets the browser
        // store new ones from the response.
        credentials: 'include',
        headers: requestHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      // fetch() itself threw -- connection refused, DNS failure, offline.
      // The backend never answered at all, as distinct from it answering
      // with an error status (handled below).
      throw new ServiceUnavailableError(
        'Unable to reach the ForesightCS API. The service may be temporarily unavailable.'
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const payload = await response.json().catch(() => undefined);

    if (!response.ok) {
      // Refresh-and-retry only ever makes sense in the browser: it relies
      // on `credentials: 'include'` forwarding a real cookie jar, which
      // only exists client-side. On the Node.js server (Server Actions/
      // Server Components via serverApiClient.ts) there is no cookie jar
      // for `credentials: 'include'` to mean anything -- the refresh call
      // would go out with no cookies, always 401, and the retry would just
      // re-send the same already-expired Cookie header serverApiClient
      // forwarded, wasting two extra round trips for a guaranteed failure.
      // The browser is also the correct tenant-isolation boundary here (one
      // browser, one session), whereas the server handles many tenants'
      // requests concurrently -- so this must stay gated on `window`
      // rather than becoming some other server-side "is this a browser
      // request" heuristic. Server-side, a 401 falls straight through to
      // the same notifyUnauthorized()/ApiError handling as before this
      // retry logic existed.
      if (
        typeof window !== 'undefined' &&
        response.status === 401 &&
        attempt === 0 &&
        !AUTH_ENDPOINTS_WITHOUT_REFRESH.has(path)
      ) {
        await this.refreshSession();
        return this.request<T>(path, options, attempt + 1);
      }

      if (response.status === 401 && !skipAuthRedirect) {
        notifyUnauthorized();
      }
      if (response.status >= 500) {
        throw new ServiceUnavailableError(
          'The ForesightCS API returned a server error. The service may be temporarily unavailable.'
        );
      }
      throw new ApiError(response.status, normalizeFieldErrors(payload));
    }

    return payload as T;
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
