import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AuthLoadingScreen } from "@/components/AuthLoadingScreen";

/** Gate for authenticated areas. Sends guests to /login. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  // Wait for the initial session check so a valid, reloaded session isn't
  // briefly kicked to /login before the token is confirmed.
  if (isLoading) return <AuthLoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
