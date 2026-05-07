import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/lib/config";

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type AuthResponseBody = {
  auth?: {
    access_token?: string;
    refresh_token?: string;
  };
};

export const ACCESS_TOKEN_STORAGE_KEY = "messenger.auth.accessToken";
const REFRESH_TOKEN_STORAGE_KEY = "messenger.auth.refreshToken";

const AUTH_REFRESH_EXCLUDED_PATHS = new Set([
  "/api/login",
  "/api/register",
  "/api/refresh",
]);

function getRequestPath(config: InternalAxiosRequestConfig): string {
  if (!config.url) {
    return "";
  }

  try {
    return new URL(config.url, config.baseURL).pathname;
  } catch {
    return config.url;
  }
}

const instance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

function isAuthResponseBody(data: unknown): data is AuthResponseBody {
  return typeof data === "object" && data !== null && "auth" in data;
}

function persistAuthTokens(data: unknown) {
  if (typeof window === "undefined" || !isAuthResponseBody(data)) {
    return;
  }

  const { access_token: accessToken, refresh_token: refreshToken } =
    data.auth ?? {};

  if (accessToken) {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  }

  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  }
}

function getStoredToken(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(key);
}

instance.interceptors.request.use((config) => {
  const accessToken = getStoredToken(ACCESS_TOKEN_STORAGE_KEY);
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  const requestPath = getRequestPath(config);
  const refreshToken = getStoredToken(REFRESH_TOKEN_STORAGE_KEY);
  if (requestPath === "/api/refresh" && refreshToken) {
    config.headers["X-Refresh-Token"] = refreshToken;
  }

  return config;
});

instance.interceptors.response.use(
  (response) => {
    persistAuthTokens(response.data);
    return response;
  },
  async (error: AxiosError) => {
    const requestConfig = error.config as RetryableRequestConfig | undefined;
    const requestPath = requestConfig ? getRequestPath(requestConfig) : "";

    if (
      error.response?.status === 401 &&
      requestConfig &&
      !requestConfig._retry &&
      !AUTH_REFRESH_EXCLUDED_PATHS.has(requestPath)
    ) {
      requestConfig._retry = true;

      try {
        await instance.request({
          method: "post",
          url: "/api/refresh",
          _retry: true,
        } as RetryableRequestConfig);
        return instance(requestConfig);
      } catch (refreshError) {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default instance;
