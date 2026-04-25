import axios from "@/lib/axios";
import type {
  AvatarUploadPayload,
  ProfileType,
  YouTubeAccessContextType,
  YouTubeAccessTierType,
} from "@/lib/types";

export const AUTH_USERNAME_STORAGE_KEY = "messenger.auth.username";

export default class AuthApi {
  static login(username: string, password: string) {
    return axios.post("/api/login", { username, password });
  }

  static register(username: string, password: string) {
    return axios.post("/api/register", { username, password });
  }

  static getProfile() {
    return axios.get<ProfileType>("/api/profile");
  }

  static getYouTubeAccessContext() {
    return axios.get<YouTubeAccessContextType>("/api/youtube-access/context");
  }

  static getYouTubeAccessTiers() {
    return axios.get<YouTubeAccessTierType[]>("/api/youtube-access/tiers");
  }

  static completeMockBilling(tier: "free" | "premium" = "premium") {
    return axios.post<ProfileType>("/api/billing/mock/complete", { tier });
  }

  static setYouTubeAssistEnabled(enabled: boolean) {
    return axios.post<YouTubeAccessContextType>("/api/youtube-access/assisted-toggle", { enabled });
  }

  static updateProfile(payload: {
    username?: string;
    email?: string | null;
    avatar?: AvatarUploadPayload;
  }) {
    return axios.patch<ProfileType>("/api/profile", payload);
  }
}
