// Typed fetch wrapper for the Flashform API (PRD §8, docs/api/auth.md).
//
// Teacher requests carry `Authorization: Bearer <access>`. On a 401 the wrapper refreshes
// the token pair once (one shared in-flight refresh for every concurrent request), stores
// the rotated pair and retries. If the refresh token is rejected, the session is over: the
// tokens are cleared and the browser goes to /login.
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
  tokenExpiry,
} from "./auth-tokens";
import type { ApiErrorBody, TokenPair } from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api").replace(
  /\/+$/,
  "",
);

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string[]>;
  /** Seconds to wait before retrying, on a 429. */
  readonly retryAfter: number | null;

  constructor(status: number, body: ApiErrorBody, retryAfter: number | null = null) {
    super(body.detail);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.fields = body.fields ?? {};
    this.retryAfter = retryAfter;
  }
}

/** The refresh token was rejected (or there is none): the teacher must log in again. */
export const SESSION_ENDED = "session_ended";

const sessionEnded = () =>
  new ApiError(401, { code: SESSION_ENDED, detail: "Your session has ended. Log in again." });

const networkError = () =>
  new ApiError(0, {
    code: "network_error",
    detail: "Can't reach Flashform. Check your connection and try again.",
  });

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = {
  method?: Method;
  body?: unknown;
  /** Send the teacher's access token and refresh it on a 401. Default true. */
  auth?: boolean;
  /** Go to /login when the session can't be refreshed. Default true. */
  redirectOnSessionEnd?: boolean;
  /** Extra request headers, e.g. `X-Participant-Token` on student endpoints. */
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

async function send(
  path: string,
  method: Method,
  body: unknown,
  accessToken: string | null,
  signal?: AbortSignal,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json", ...extraHeaders };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw networkError();
  }
}

function retryAfterSeconds(response: Response, detail: string): number | null {
  const header = Number(response.headers.get("Retry-After"));
  if (Number.isFinite(header) && header > 0) return Math.ceil(header);
  // Retry-After isn't CORS-exposed; DRF also puts the wait in the message.
  const match = /(\d+) seconds?/.exec(detail);
  return match ? Number(match[1]) : null;
}

async function toError(response: Response): Promise<ApiError> {
  const data: unknown = await response.json().catch(() => null);
  const body: ApiErrorBody =
    data && typeof data === "object" && "code" in data && "detail" in data
      ? (data as ApiErrorBody)
      : {
          code: response.status >= 500 ? "server_error" : "unknown_error",
          detail: "Something went wrong on our side. Try again in a moment.",
        };
  const retryAfter = response.status === 429 ? retryAfterSeconds(response, body.detail) : null;
  return new ApiError(response.status, body, retryAfter);
}

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) throw await toError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

let refreshing: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  // Tabs share the tokens, and two refreshes with the same token make one fail, so tabs
  // take turns. A tab that waited finds the pair already rotated and uses it.
  const before = getRefreshToken();
  const run = () => refreshWith(before);
  return typeof navigator !== "undefined" && navigator.locks
    ? navigator.locks.request("flashform.refresh", run)
    : run();
}

async function refreshWith(before: string | null): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) {
    clearTokens();
    throw sessionEnded();
  }
  const rotated = getAccessToken();
  if (refresh !== before && rotated) return rotated;

  const response = await send("/auth/refresh", "POST", { refresh }, null);
  if (response.ok) {
    const pair = (await response.json()) as TokenPair;
    setTokens(pair);
    return pair.access;
  }
  if (response.status === 400 || response.status === 401) {
    // Another tab may have rotated the pair while this request was in flight.
    const current = getRefreshToken();
    const access = getAccessToken();
    if (current && current !== refresh && access) return access;
    clearTokens();
    throw sessionEnded();
  }
  // 429 or 5xx: the refresh token may still be good, so keep it.
  throw await toError(response);
}

/** Refreshes the token pair. Concurrent callers share one request. */
function refreshAccessToken(): Promise<string> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

function goToLogin() {
  const { pathname, search } = window.location;
  if (pathname === "/login") return;
  window.location.replace(`/login?next=${encodeURIComponent(pathname + search)}`);
}

async function withSessionHandling<T>(redirect: boolean, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (redirect && error instanceof ApiError && error.code === SESSION_ENDED) goToLogin();
    throw error;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    auth = true,
    redirectOnSessionEnd = true,
    headers,
    signal,
  } = options;
  if (!auth) return parse<T>(await send(path, method, body, null, signal, headers));

  return withSessionHandling(redirectOnSessionEnd, async () => {
    const sent = getAccessToken();
    const first = await send(path, method, body, sent, signal, headers);
    if (first.status !== 401) return parse<T>(first);

    // If another request already refreshed, just use its token.
    const current = getAccessToken();
    const fresh = current && current !== sent ? current : await refreshAccessToken();
    const retry = await send(path, method, body, fresh, signal, headers);
    if (retry.status === 401) {
      clearTokens();
      throw sessionEnded();
    }
    return parse<T>(retry);
  });
}

/**
 * An access token that is valid for at least `minValiditySeconds` more, refreshing first
 * if needed. For the teacher WebSocket, which only checks the token at connect time (PRD §9).
 * `force` refreshes even when the token looks valid: after the server rejected it (4401).
 */
export function getFreshAccessToken({
  minValiditySeconds = 60,
  redirectOnSessionEnd = true,
  force = false,
}: {
  minValiditySeconds?: number;
  redirectOnSessionEnd?: boolean;
  force?: boolean;
} = {}): Promise<string> {
  return withSessionHandling(redirectOnSessionEnd, async () => {
    const access = getAccessToken();
    const exp = access ? tokenExpiry(access) : null;
    const valid = access && exp !== null && exp - Date.now() / 1000 > minValiditySeconds;
    if (valid && !force) return access;
    return refreshAccessToken();
  });
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};

/** A message to show for any error thrown by the API layer. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Try again.";
  if (error.code === "throttled") {
    return error.retryAfter
      ? `Too many attempts. Try again in ${error.retryAfter} seconds.`
      : "Too many attempts. Wait a minute and try again.";
  }
  return error.message;
}
