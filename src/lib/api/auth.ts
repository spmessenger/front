import axios from "@/lib/axios";
import type {
  AvatarUploadPayload,
  ProfileType,
  YouTubeAccessContextType,
  YouTubeAccessTierType,
} from "@/lib/types";

export const AUTH_USERNAME_STORAGE_KEY = "messenger.auth.username";

export default class AuthApi {
  static login(email: string, verificationCode: string) {
    return axios.post("/api/login", { email, verification_code: verificationCode });
  }

  static register(email: string, verificationCode: string) {
    return axios.post("/api/register", { email, verification_code: verificationCode });
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
    avatar?: AvatarUploadPayload;
  }) {
    return axios.patch<ProfileType>("/api/profile", payload);
  }
}
