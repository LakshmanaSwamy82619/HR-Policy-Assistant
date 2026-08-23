import axios from "axios";

// Single source of truth for the backend origin. Set VITE_API_BASE_URL in
// a .env file for anything other than local development.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

const TOKEN_KEY = "hr_assistant_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 anywhere means the token is invalid or expired — bounce to login
// rather than letting every screen implement its own auth-failure handling.
let onUnauthorized = null;
export function registerUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(normalizeError(error));
  }
);

// Backend errors come back as { detail: "..." } (or a Pydantic validation
// array). Flatten to a single readable string so components never have to
// know the shape.
export function normalizeError(error) {
  if (error.response) {
    const detail = error.response.data?.detail;
    if (typeof detail === "string") {
      error.message = detail;
    } else if (Array.isArray(detail)) {
      error.message = detail.map((d) => d.msg).join(", ");
    } else if (!error.response.data) {
      error.message = `Request failed (${error.response.status})`;
    }
  } else if (error.request) {
    error.message = "Can't reach the server. Check your connection and try again.";
  }
  return error;
}

export default api;
