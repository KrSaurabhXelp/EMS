import axios from "axios";

// Default fallback points to active ngrok URL or localhost
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://unwed-carried-overrun.ngrok-free.dev/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

// Automatically inject JWT token from localStorage if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
