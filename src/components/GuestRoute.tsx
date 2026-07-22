import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLoadingScreen } from "@/components/AuthLoadingScreen";

/**
 * Gate for guest-only pages (e.g. /login). Redirects already-authenticated
 * users to the app so they never see the login form while signed in.
 */
export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <AuthLoadingScreen />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}
