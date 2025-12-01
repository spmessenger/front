import axios from "@/lib/axios";

export default class AuthApi {
  static login(username: string, password: string) {
    return axios.post("/api/login", { username, password });
  }

  static register(username: string, password: string) {
    return axios.post("/api/register", { username, password });
  }
}
