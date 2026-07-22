import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Defaults to the local Django backend; override in .env.local (e.g. to an
  // ngrok tunnel) when the backend isn't running on this machine. Keeping the
  // browser on a single origin (localhost:8080) avoids CORS entirely — the
  // cross-origin hop happens server-to-server (Vite -> target), where CORS
  // doesn't apply.
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || "http://127.0.0.1:8000";

  return {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      // ngrok-skip-browser-warning: when proxyTarget is an ngrok tunnel, ngrok
      // otherwise serves an HTML interstitial instead of proxying through to
      // Django, which apiFetch silently swallows as JSON.parse failure — every
      // list endpoint would render empty with no visible error. Harmless
      // no-op against a plain local Django target.
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
        headers: { "ngrok-skip-browser-warning": "true" },
      },
      "/media": {
        target: proxyTarget,
        changeOrigin: true,
        headers: { "ngrok-skip-browser-warning": "true" },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  };
});
