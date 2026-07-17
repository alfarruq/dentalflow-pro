import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { apiFetch, tokenStore, setUnauthorizedHandler } from "@/lib/api/client";
import type { LoginResponseDto, UserMeDto } from "@/lib/api/dto";

interface AuthContextType {
  isAuthenticated: boolean;
  user: { name: string } | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: async () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(tokenStore.getAccess()));
  const [user, setUser] = useState<{ name: string } | null>(null);

  const logout = useCallback(() => {
    tokenStore.clear();
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  // A 401 from any API call ends the session and sends the user to /login
  // (ProtectedRoute reacts to isAuthenticated).
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // Restore the display name after a page reload.
  useEffect(() => {
    if (!isAuthenticated || user) return;
    apiFetch<UserMeDto>("/authentication/me/")
      .then((me) => setUser({ name: me.full_name }))
      .catch(() => {
        // 401 is already handled by the unauthorized handler.
      });
  }, [isAuthenticated, user]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await apiFetch<LoginResponseDto>("/authentication/login/", {
        method: "POST",
        body: { username, password },
        anonymous: true,
      });
      tokenStore.set(response.result.access_token, response.result.refresh_token);
      setIsAuthenticated(true);
      try {
        const me = await apiFetch<UserMeDto>("/authentication/me/");
        setUser({ name: me.full_name });
      } catch {
        setUser({ name: username });
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
