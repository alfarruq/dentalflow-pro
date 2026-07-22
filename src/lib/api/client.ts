import { API_BASE_URL } from "@/config/env";

const ACCESS_TOKEN_KEY = "dentaflow-access-token";
const REFRESH_TOKEN_KEY = "dentaflow-refresh-token";

/**
 * Token persistence is intentionally funnelled through this single object so it
 * stays the *only* place that knows how tokens are stored. That keeps the future
 * migration to HttpOnly cookies to one file: the rest of the app only ever calls
 * getAccess/getRefresh/set/clear.
 *
 * "Remember me" selects the backing storage:
 *   - remember=true  → localStorage  (survives browser restart)
 *   - remember=false → sessionStorage (cleared when the tab closes)
 * Reads probe both so a session started either way keeps working.
 */
export const tokenStore = {
  getAccess: () =>
    localStorage.getItem(ACCESS_TOKEN_KEY) ?? sessionStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () =>
    localStorage.getItem(REFRESH_TOKEN_KEY) ?? sessionStorage.getItem(REFRESH_TOKEN_KEY),
  set(access: string, refresh: string, remember: boolean = true) {
    // Write to the chosen store and clear the other so tokens never live in both.
    const target = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    target.setItem(ACCESS_TOKEN_KEY, access);
    target.setItem(REFRESH_TOKEN_KEY, refresh);
    other.removeItem(ACCESS_TOKEN_KEY);
    other.removeItem(REFRESH_TOKEN_KEY);
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

/**
 * The logged-in user's own id, read from the access token's `user_id` claim
 * (confirmed present on this backend's JWTs). Not returned by /me/, and
 * needed for self-service PATCH /authentication/update/<id>/ calls — decoding
 * client-side is safe here since it's only used to pick the request URL, not
 * for any security decision (the backend independently authorizes the call).
 */
export function getCurrentUserId(): string | null {
  const token = tokenStore.getAccess();
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json) as { user_id?: string };
    return claims.user_id ?? null;
  } catch {
    return null;
  }
}

/** Normalized error shape for the backend's {message, message_key, errors} format. */
export class ApiError extends Error {
  status: number;
  messageKey?: string;
  errors?: Record<string, unknown>;

  constructor(status: number, message: string, messageKey?: string, errors?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.messageKey = messageKey;
    this.errors = errors;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Multipart upload — body must be a FormData instance. */
  formData?: FormData;
  /** Skip the Authorization header (login endpoint). */
  anonymous?: boolean;
  signal?: AbortSignal;
}

let onUnauthorized: (() => void) | null = null;

/** Registered once by the auth layer; called when the API returns 401. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, formData, anonymous, signal } = options;

  const headers: Record<string, string> = {};
  if (!anonymous) {
    const token = tokenStore.getAccess();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  if (body !== undefined && !formData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    signal,
  });

  if (response.status === 401 && !anonymous) {
    tokenStore.clear();
    onUnauthorized?.();
    throw new ApiError(401, "Unauthorized", "unauthorized");
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let data: unknown = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    // non-JSON body (e.g. HTML error page)
  }

  if (!response.ok) {
    const err = (data ?? {}) as { message?: string; message_key?: string; errors?: Record<string, unknown> };
    throw new ApiError(
      response.status,
      err.message || `So'rov xatosi (${response.status})`,
      err.message_key,
      err.errors,
    );
  }

  return data as T;
}
