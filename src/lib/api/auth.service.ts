/**
 * Auth service — the single boundary between the app and the authentication
 * endpoints. Components and contexts call these functions; they never touch
 * apiFetch or tokenStore for auth directly. That keeps endpoint paths, request
 * shapes, and token side effects in one place (Separation of Concerns / DRY).
 */
import { apiFetch, tokenStore, getCurrentUserId, ApiError } from "@/lib/api/client";
import type { LoginResponseDto, UserMeDto, UserUpdateDto } from "@/lib/api/dto";

export interface LoginParams {
  username: string;
  password: string;
  /** When false, tokens are kept only for the tab session (see tokenStore). */
  remember?: boolean;
}

export interface AuthUser {
  name: string;
}

/** Map the backend /me/ payload to the minimal user the UI needs today. */
function toAuthUser(me: UserMeDto): AuthUser {
  return { name: me.full_name };
}

export const authService = {
  /**
   * Authenticate, persist the returned tokens, and resolve the current user.
   * Throws ApiError on invalid credentials or a network/server failure — the
   * caller decides how to surface it.
   */
  async login({ username, password, remember = true }: LoginParams): Promise<AuthUser> {
    const response = await apiFetch<LoginResponseDto>("/authentication/login/", {
      method: "POST",
      body: { username, password },
      anonymous: true,
    });
    tokenStore.set(response.result.access_token, response.result.refresh_token, remember);

    // The user's display name is a nice-to-have; a failure here must not fail
    // an otherwise-successful login. Fall back to the username.
    try {
      return await authService.getCurrentUser();
    } catch {
      return { name: username };
    }
  },

  /** Fetch the authenticated user. Relies on the Authorization header injected by apiFetch. */
  async getCurrentUser(): Promise<AuthUser> {
    const me = await apiFetch<UserMeDto>("/authentication/me/");
    return toAuthUser(me);
  },

  /** Full profile (specialty, phone, email, experience, biography) for the Profile page. */
  async getMyProfile(): Promise<UserMeDto> {
    return apiFetch<UserMeDto>("/authentication/me/");
  },

  /**
   * Save the logged-in user's own profile. The update endpoint is id-scoped
   * (also reused elsewhere for editing other records), so this resolves the
   * caller's own id from the access token rather than trusting a passed-in
   * value — "my profile" must always mean the currently authenticated user.
   */
  async updateMyProfile(data: UserUpdateDto): Promise<void> {
    const id = getCurrentUserId();
    if (!id) throw new ApiError(401, "Not authenticated", "unauthorized");
    await apiFetch(`/authentication/update/${id}/`, { method: "PATCH", body: data });
  },

  /**
   * Silent access-token refresh.
   *
   * NOT ENABLED YET: the backend refresh endpoint is still pending
   * (see BACKEND_SPEC.md §9 — POST /authentication/refresh/). Until it ships,
   * an expired access token results in logout-on-401 (see client.ts). This stub
   * marks the integration seam: when the endpoint lands, implement it here plus
   * a single-flight queue in client.ts, and nothing else in the app changes.
   */
  async refresh(): Promise<never> {
    throw new ApiError(501, "Token refresh is not implemented yet", "refresh_not_implemented");
  },

  /** Drop all tokens. Pure client-side; safe to call repeatedly. */
  logout(): void {
    tokenStore.clear();
  },
};
