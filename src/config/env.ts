/**
 * Runtime configuration. In dev the Vite proxy forwards /api and /media to the
 * local Django backend; in production nginx serves both apps on one origin, so
 * relative URLs work everywhere. Override with VITE_API_URL when the API lives
 * on a different origin.
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? "/api/v1";
