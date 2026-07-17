import { API_BASE_URL } from "@/config/env";

const ACCESS_TOKEN_KEY = "dentaflow-access-token";
const REFRESH_TOKEN_KEY = "dentaflow-refresh-token";

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

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
