import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { tokenStore, setUnauthorizedHandler } from "@/lib/api/client";
import { authService, type AuthUser, type LoginParams } from "@/lib/api/auth.service";

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  /** True during the initial "do we have a valid session?" check on load. */
  isLoading: boolean;
  login: (params: LoginParams) => Promise<boolean>;
  logout: () => void;
  /** Re-fetch the current user (e.g. after a profile update). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  login: async () => false,
  logout: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(tokenStore.getAccess()));
  const [user, setUser] = useState<AuthUser | null>(null);
  // Start loading only if a token is present and we still need to restore the user.
  const [isLoading, setIsLoading] = useState(() => Boolean(tokenStore.getAccess()));

  const logout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  // A 401 from any API call ends the session and sends the user to /login
  // (ProtectedRoute reacts to isAuthenticated). Registered once.
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await authService.getCurrentUser());
    } catch {
      // A 401 is already handled by the unauthorized handler above.
    }
  }, []);

  // Restore the session (display name) after a page reload, then clear loading.
  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    if (user) {
      setIsLoading(false);
      return;
    }
    authService
      .getCurrentUser()
      .then((u) => active && setUser(u))
      .catch(() => {
        // 401 handled by the unauthorized handler; other errors leave the user
        // authenticated (token still valid) with no cached display name.
      })
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [isAuthenticated, user]);

  const login = useCallback(async (params: LoginParams) => {
    try {
      const authedUser = await authService.login(params);
      setUser(authedUser);
      setIsAuthenticated(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
