import axios from "axios";
import { API_BASE_URL, API_KEY, USE_MOCK_DATA } from "@/lib/constants";
import type { ApiError } from "@/types/api";

// ── Axios instance with base config ──
// Route through Next.js /api proxy to avoid CORS entirely.
// next.config.ts rewrites /api/:path* → backend/:path*
const isServer = typeof window === "undefined";
const proxyBase = "/api"; // browser → Next.js proxy → backend
const directBase = API_BASE_URL; // server-side (SSR) → direct backend

export const apiClient = axios.create({
  baseURL: isServer ? directBase : proxyBase,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Attach API key to every request ──
apiClient.interceptors.request.use((config) => {
  if (API_KEY) {
    config.headers["X-API-Key"] = API_KEY;
  }
  return config;
});

// ── Normalize errors ──
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const data = error.response.data as ApiError;
      const message =
        typeof data.detail === "string"
          ? data.detail
          : data.detail?.[0]?.msg || "An unexpected error occurred";
      return Promise.reject(new Error(message));
    }
    if (error.request) {
      return Promise.reject(new Error("No response from server. Check if the backend is running."));
    }
    return Promise.reject(new Error(error.message || "Request failed"));
  }
);

// ── Helper: wrap API calls with mock data fallback ──
export async function apiCall<T>(
  fetcher: () => Promise<T>,
  mockFallback: () => T
): Promise<T> {
  if (USE_MOCK_DATA) {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
    return mockFallback();
  }
  return fetcher();
}

export default apiClient;
