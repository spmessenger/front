import type { AxiosError } from "axios";

type ApiErrorDetail = {
  en?: string;
};

export function extractApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  const axiosError = error as AxiosError<{ detail?: ApiErrorDetail | string }>;
  const detail = axiosError.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (detail && typeof detail === "object" && detail.en?.trim()) {
    return detail.en;
  }

  return fallbackMessage;
}
