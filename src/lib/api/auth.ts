import axios from "@/lib/axios";
import type { ProfileType } from "@/lib/types";

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

  static updateProfile(username: string) {
    return axios.patch<ProfileType>("/api/profile", { username });
  }
}
