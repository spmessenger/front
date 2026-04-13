import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/lib/config";

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const instance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

instance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const requestConfig = error.config as RetryableRequestConfig | undefined;

    if (error.response?.status === 401 && requestConfig && !requestConfig._retry) {
      requestConfig._retry = true;

      try {
        await instance.post("/api/refresh");
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
