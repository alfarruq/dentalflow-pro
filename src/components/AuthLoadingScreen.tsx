import { Loader2 } from "lucide-react";

/** Full-screen spinner shown while the initial session check runs. */
export function AuthLoadingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
